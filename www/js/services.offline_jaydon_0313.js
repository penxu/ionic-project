angular.module('services.offline', ['ionic', 'ngCordova', 'services.helper'])

/**************************************************
// offline services
**************************************************/
.factory('$offline', function($cordovaSQLite, $ionicLoading, $q, $http, $localStorage, SERVER, $helper, $cordovaFileTransfer, $rootScope, $cordovaZip, $translate) {

  var secondPath = 'product-media/';
  var pdfPath = '~/Documents/invoice.pdf';
  // initialize $offline config
  var offline = {
    db: null,
    serialize: function(obj, prefix) {
      var str = [];
      for (var p in obj) {
        if (obj.hasOwnProperty(p)) {
          var k = prefix ? prefix + '[' + p + ']' : p,
            v = obj[p];
          str.push(typeof v == 'object' ? this.serialize(v, k) : encodeURIComponent(k) + '=' + encodeURIComponent(v));
        }
      }
      return str.join('&');
    }
  };


  var checkUndefined = function(params){
      Object.keys(params).map(function(objectKey, index) {
          var value = params[objectKey];
          if(typeof value == "undefined" || value == null ) {
                  params[objectKey] = '';
          }
      });
  };
  
  
  var emptyTozero = function(str){
      return str != '' ? str : 0;
  };  

  var encodePreSku = function(json_array){
      var sku = '';
          var spec_array = JSON.parse(json_array);
          for (var i=0;i<spec_array.length;i++)
          {
              sku = sku + 'X' + spec_array[i].dictionary.toString(16);
              sku = sku + 'Y' + spec_array[i].option.toString(16);
              sku = sku + '-';
          }               
      return sku;
  };    

  /**************************************************
  // open database
  **************************************************/
  offline.openDb = function() {
    offline.db = window.sqlitePlugin.openDatabase({
      name: $localStorage.get('activate').prefix + $localStorage.get('activate').path + '.db',
      location: 'default'
    });

  };

  /**************************************************
  // close database
  **************************************************/
  offline.closeDb = function(params) {

    if (offline.db != null)
    {
      offline.db.close(
        function() {
          offline.db = null;
          console.log('database closed success');
        },
        function() {
          console.log('database closed fail');
        }
      );
    }
  };

  /**************************************************
  // get offline data
  **************************************************/
  offline.getOfflineData = function(params) {
      console.log('link : ');
      console.log(SERVER.http + $localStorage.get('activate').prefix + $localStorage.get('activate').path + SERVER.subdomain + SERVER.apiPath + 'api/get-offline-data');
      $helper.showLoading(180000);
      var defer = $q.defer();
      if (offline.db == null) offline.openDb();
      console.log('ready to post');
      $http.post(SERVER.http + $localStorage.get('activate').prefix + $localStorage.get('activate').path + SERVER.subdomain + SERVER.apiPath + 'api/get-offline-data', offline.serialize(params)).success(function(data) {
        
        // console.log('hide loading');
        try {
          var res = angular.fromJson(data);
          console.log('already get offline data~');
          if (res.status == 'Y')
          {
            offline.db.sqlBatch(res.data, function() {
              defer.resolve();
            }, function(err) {
              defer.reject(err);
            });
          }
          else
          {
            defer.reject(res.msg);
          }
        } catch (err) {
          defer.reject(err);
        }
      }).error(function(err) {
        console.log('request error');
        defer.reject(err);
      });

      return defer.promise;
  };


  /**************************************************
  // get offline data
  **************************************************/
  offline.getOfflinePhoto = function(params){
    console.log('into photo function');
      $helper.showLoading(180000);
      var defer = $q.defer();
      var url = 'http://sandbox.gardengallery.posify.me//data/product-image/1';
      
      var targetPath = $helper.getRootPath() + secondPath + 'photo.zip';
      var unzipPath = $helper.getRootPath() + secondPath;
      var trustHosts = true;
      var options = {};
      $cordovaFileTransfer.download(url, targetPath, options, trustHosts)
          .then(function(result) {
              $ionicLoading.hide();
              console.log('download photo finish');
              $cordovaZip
                .unzip(
                  targetPath, // https://github.com/MobileChromeApps/zip/blob/master/tests/tests.js#L32
                  unzipPath  // https://github.com/MobileChromeApps/zip/blob/master/tests/tests.js#L45
                ).then(function () {
                  console.log('success unzip');
                }, function () {
                  console.log('error unzip');
                }, function (progressEvent) {
                  // https://github.com/MobileChromeApps/zip#usage
                  console.log(progressEvent);
                });             
              // Success!
          }, function(err) {
              // Error
              $ionicLoading.hide();
          });
      return defer.promise;
  };  

  /**************************************************
  // offline api function
  **************************************************/
  offline.getCategoryNestedData = function(category, locale) {
    var data = {
      id: category.ID,
      type: category.TYPE,
      parent_id: category.PARENT_ID,
      name: category['NAME_' + locale],
      name_en_us: category.NAME_EN_US,
      name_zh_hk: category.NAME_ZH_HK,
      name_zh_cn: category.NAME_ZH_CN,
      sorting: category.SORTING,
      show_home: category.SHOW_HOME,
      product_count: category.PRODUCT_COUNT,
      enabled: category.ENABLED,
      theme: category.THEME,
      children: []
    };

    offline.db.executeSql('SELECT * FROM "PRODUCT_CATEGORY" WHERE "ENABLED" = 1 AND "PARENT_ID" = ? ORDER BY "SORTING" DESC', [category.ID], function(res) {
      for (var i = 0; i < res.rows.length; i++)
      {
        data.children.push(offline.getCategoryNestedData(res.rows.item(i), locale));
      }
    }, function(err) {
      console.log(err);
    });

    return data;
  };

  offline.getCategory = function(params) {

    var defer = $q.defer();
    if (offline.db == null) offline.openDb();
    console.log('into tks func');
    offline.db.executeSql('SELECT * FROM "PRODUCT_CATEGORY" WHERE "ENABLED" = 1 AND "PARENT_ID" = 0 ORDER BY "SORTING" DESC', [], function(res) {
      var ret = {
        status: 'Y',
        msg: '',
        data: []
      };
      console.log('before loop tks func');
      for (var i = 0; i < res.rows.length; i++)
      {
        ret.data.push(offline.getCategoryNestedData(res.rows.item(i), params.locale));
      }
      console.log('finish loop tks func');
      defer.resolve(ret);
    }, function(err) {
      console.log('error tks func');
      defer.reject(err);
    });

    return defer.promise;

  };

   offline.getMemberList = function(params){
        
        var defer = $q.defer();
        if (offline.db == null) offline.openDb();
        //console.log('into phi func');
        var additional_sql = '';
        if (typeof params.keyword != "undefined" && params.keyword != null)
        {
            additional_sql = additional_sql + ' where FIRST_NAME like "%' + params.keyword + '%"';
            additional_sql = additional_sql + ' or LAST_NAME like "%' + params.keyword + '%"';
            additional_sql = additional_sql + ' or MOBILE like "%' + params.keyword + '%"';
            additional_sql = additional_sql + ' or EMAIL like "%' + params.keyword + '%"';
        }
        
        var offset = 0;
        var limit = 20;
        
        if (typeof params.limit_from != "undefined")
        {
                offset = params.limit_from;
        }  
        if (typeof params.limit != "undefined")
        {
                limit = params.limit;
        }               
        
        offline.db.executeSql(
        'SELECT * FROM "MEMBER_PROFILE"' + additional_sql,
        [
                              
        ], function(res) {
          var ret = {
            status: 'Y',
            msg: '',
            
            member :  {
              count: res.rows.length,
              list: []
            }
            
          };
          //console.log(res);
          for (var i = offset; i < offset+limit && i < res.rows.length; i++){
          record = res.rows.item(i);
          checkUndefined(record);
          var member_info = {
              user_id : record.USER_ID,
              member_id : record.ID,
              first_name : record.FIRST_NAME,
              last_name : record.LAST_NAME,
              //grade : record.
              //VIP_LEVEL : 
              //discount:
              gender : record.GENDER,
              country_code : record.COUNTRY_CODE,
              mobile : record.MOBILE,
              email : record.EMAIL,
              birthday : record.BIRTHDAY,
              nationality_id : record.NATIONALITY,
              num_family : record.NUM_FAMILY,
              occupation : record.OCCUPATION,
              prefer_currency : record.PREFER_CURRENCY,
              
          };
          ret.member.list.push(member_info);
          }
          defer.resolve(ret);
        }, function(err) {
          console.log('reject phi func');
          defer.reject(err);
        }
      );
      console.log('finish loop');
      return defer.promise;
  
  };

    offline.getInvoiceList = function(params){
    
        var defer = $q.defer();
        if (offline.db == null) offline.openDb();
        offline.db.executeSql(
        'SELECT * from INVOICE left join (select INVOICE_ID, count(*) as ITEM_COUNT , sum(UNIT_PRICE*QTY) as ITEM_TOTAL  from INVOICE_ITEM group by INVOICE_ID) as IITEM on IITEM.INVOICE_ID = INVOICE.ID where INVOICE.STATUS = 0', [], function(res) {
             var ret = {
                status: 'Y',
                msg: '',
                data: {
                    count : res.rows.length,
                    list : []
                }                
            };
            var invoice_charge_index = 0;
            for (var i=0;i<res.rows.length;i++)
            {
                var record = res.rows.item(i);
                checkUndefined(record);
                var inv_info = {
                    id : record.ID,
                    invoice_no : '',
                    item_count : emptyTozero(record.ITEM_COUNT),
                    currency : record.CURRENCY,
                    gender  : emptyTozero(record.GENDER),
                    billing_last_name : record.BILLING_LAST_NAME,
                    price : emptyTozero(record.ITEM_TOTAL),
                    status_num : emptyTozero(record.STATUS),
                    invoice_date : record.INVOICE_DATE,
                    bill_to : record.BILLING_FIRST_NAME + ' ' + record.BILLING_LAST_NAME,
                    member_mobile : record.BILLING_COUNTRY_CODE + ' ' + record.BILLING_MOBILE,
                    delivery_type : record.DELIVERY_TYPE,
                    check_out_warehouse : emptyTozero(record.CHECK_OUT_WAREHOUSE_ID),
                    pick_up_warehouse_id : emptyTozero(record.PICK_UP_WAREHOUSE_ID),
                    expected_delivery_date : record.EXPECTED_DELIVERY_DATE,
                    name : 'Offline Visitor',
                    user_id : emptyTozero(record.USER_ID),
                    member_id : 0,
                    vip_level : 0,
                    member_profile : []
                };
                ret.data.list.push(inv_info);
                if (inv_info.bill_to != ' ')
                {
                    inv_info.name = inv_info.bill_to;
                }
                

                var iid = record.ID;
                offline.db.executeSql(
                'SELECT * from INVOICE_CHARGES where INVOICE_ID=?', [iid], function(inv_charge) {
                
                    var baseDiscount = 0;
                    var baseCharge = 0;
                    var baseTotal = ret.data.list[invoice_charge_index].price;
                                                       
                    for(var j = 0;j< inv_charge.rows.length;j++)
                    {                
                        var invoice_charge = inv_charge.rows.item(j);
                        checkUndefined(invoice_charge);
                        if (invoice_charge.VALUE_TYPE == 'percent')
                        {
                            if(invoice_charge.SIGN == '+')
                            {
                                var totalFlag = baseTotal;
                                baseTotal *= 1 +  Number(invoice_charge.VALUE) / 100;
                                baseCharge += baseTotal - totalFlag;
                            }
                            else
                            {
                                var totalFlag = baseTotal;
                                baseTotal *= 1 -  Number(invoice_charge.VALUE) / 100;
                                baseDiscount += totalFlag - baseTotal;                                
                            } 
                        }                        
                                                        
                    }
                    
                    for(var j = 0;j< inv_charge.rows.length;j++)
                    {                
                        var invoice_charge = inv_charge.rows.item(j);
                        checkUndefined(invoice_charge);
                        if (invoice_charge.VALUE_TYPE != 'percent')
                        {
                            if(invoice_charge.SIGN == '+')
                            {
                                var totalFlag = baseTotal;
                                baseTotal += Number(invoice_charge.VALUE);
                                baseCharge += baseTotal - totalFlag;
                            }
                            else
                            {
                                var totalFlag = baseTotal;
                                baseTotal -=  Number(invoice_charge.VALUE);
                                baseDiscount += totalFlag - baseTotal;                                
                            } 
                        }                        
                                                        
                    }                    

                    ret.data.list[invoice_charge_index++].price = baseTotal;               
                                
                    if (res.rows.length == ret.data.list.length)
                    {
                        defer.resolve(ret);
                    }                
                        
                }, function(err) {
                  defer.reject(err);
                });                 

            }
            if (res.rows.length == ret.data.list.length)
            {
                console.log(ret);
                defer.resolve(ret);
            }              

        }, function(err) {
          defer.reject(err);
        });
        
        return defer.promise;      
    
    };
    
    offline.getInvoiceDetail = function(params){
    
        var defer = $q.defer();
        if (offline.db == null) offline.openDb();
        offline.db.executeSql(
        'SELECT * from INVOICE left join (select INVOICE_ID, count(*) as ITEM_COUNT , sum(UNIT_PRICE*QTY) as ITEM_TOTAL  from INVOICE_ITEM group by INVOICE_ID) as IITEM on IITEM.INVOICE_ID = INVOICE.ID where INVOICE.ID = ?', [params.invoice_id], function(res) {
            
            var record = res.rows.item(0);
            checkUndefined(record);            
            var ret = {
                status: 'Y',
                msg: '',
                data: {                
                    id : record.ID,
                    invoice_no : record.INVOICE_NO,
                    currency : record.CURRENCY,
                    gender  : record.GENDER,
                    billing_area_id : emptyTozero(record.BILLING_AREA_ID),
                    billing_region_id : emptyTozero(record.BILLING_REGION_ID),
                    billing_district_id : emptyTozero(record.BILLING_DISTRICT_ID),
                    billing_country_id : emptyTozero(record.BILLING_COUNTRY_ID),
                    billing_address_1  : record.BILLING_ADDRESS_1, 
                    billing_address_2  : record.BILLING_ADDRESS_2,  
                    billing_address_3  : record.BILLING_ADDRESS_3,
                    billing_address_4  : record.BILLING_ADDRESS_4,
                    billing_first_name : record.BILLING_FIRST_NAME,
                    billing_last_name : record.BILLING_LAST_NAME,
                    billing_contact : record.BILLING_FIRST_NAME + ' ' + record.BILLING_LAST_NAME,
                    billing_email : record.BILLING_EMAIL,
                    billing_mobile : record.BILLING_COUNTRY_CODE + ' ' + record.BILLING_MOBILE,
                    
                    pick_up_contact : record.BILLING_FIRST_NAME + ' ' + record.BILLING_LAST_NAME,
                    pick_up_first_name :  record.BILLING_FIRST_NAME,
                    pick_up_last_name : record.BILLING_LAST_NAME,
                    pick_up_country_code : record.BILLING_COUNTRY_CODE,
                    pick_up_mobile : record.BILLING_MOBILE,
                    pick_up_email : record.BILLING_EMAIL,
                    
                    shipping_area_id : emptyTozero(record.SHIPPING_AREA_ID),
                    shipping_region_id : emptyTozero(record.SHIPPING_REGION_ID),
                    shipping_district_id : emptyTozero(record.SHIPPING_DISTRICT_ID),
                    shipping_country_id : emptyTozero(record.SHIPPING_COUNTRY_ID),
                    shipping_address_1  : record.BILLING_ADDRESS_1, 
                    shipping_address_2  : record.BILLING_ADDRESS_2,  
                    shipping_address_3  : record.BILLING_ADDRESS_3,
                    shipping_address_4  : record.BILLING_ADDRESS_4,
                    shipping_first_name : record.SHIPPING_FIRST_NAME,
                    shipping_last_name : record.SHIPPING_LAST_NAME,
                    shipping_contact : record.SHIPPING_FIRST_NAME + ' ' + record.SHIPPING_LAST_NAME,
                    shipping_email : record.SHIPPING_EMAIL,
                    shipping_mobile : record.SHIPPING_COUNTRY_CODE + ' ' + record.SHIPPING_MOBILE,
                                      
                    currency :  record.CURRENCY,
                    item_count : record.ITEM_COUNT,
                    item_total : emptyTozero(record.ITEM_TOTAL),
                    pay_method : record.PAY_METHOD,
                    status_num : emptyTozero(record.STATUS),
                    
                    deposit : emptyTozero(record.PAYED_AMOUNT),
                    payment_type : record.PAYMENT_TYPE,
                    payed_amount : emptyTozero(record.PAYED_AMOUNT),
                    
                    delivery_type : record.DELIVERY_TYPE,
                    remark : record.REMARK,
                    products : [],                    
                                                         
                    invoice_date : record.INVOICE_DATE,
                    check_out_warehouse : emptyTozero(record.CHECK_OUT_WAREHOUSE_ID),
                    pick_up_warehouse_id : emptyTozero(record.PICK_UP_WAREHOUSE_ID),
                    pick_up_site : record.PICK_UP_SITE,
                    expected_delivery_date : record.EXPECTED_DELIVERY_DATE,
                    invoice_charges : [],
                    
                    delivery_total : emptyTozero(record.DELIVERY_TOTAL),
                    refund_total : emptyTozero(record.REFUND_TOTAL),
                    refund : emptyTozero(record.REFUND_TOTAL),
                    grand_total : emptyTozero(record.ITEM_TOTAL),
                    
                    customer_name : 'Visitor',
                    customer_info : {
                        account_no : 'visitor',
                        user_id : 0,
                        customer_name : '',
                        customer_first_name : '',
                        customer_last_name  :  '',
                        customer_email  : '',
                        customer_country_code : '',
                        customer_mobile  : '',
                        vip_level         :   ''                    
                    }
                }                                                
            };
            offline.db.executeSql(
            'SELECT * from INVOICE_ITEM left join (select PRODUCT.ID, PRODUCT.NAME_EN_US, PRODUCT.NAME_ZH_HK, PRODUCT.NAME_ZH_CN, PRODUCT.HIGHLIGHT_EN_US,PRODUCT.HIGHLIGHT_ZH_HK, PRODUCT.HIGHLIGHT_ZH_CN, PRODUCT.CODE, PRODUCT.WEIGHT, PRODUCT.VOLUME, PRODUCT.REMARK, PM.ID as PHOTO_ID from PRODUCT LEFT JOIN (SELECT MIN(ID) as ID,PRODUCT_ID FROM PRODUCT_MEDIA group by PRODUCT_ID) as PM on PRODUCT.ID = PM.PRODUCT_ID) as FP on INVOICE_ITEM.PRODUCT_ID = FP.ID where INVOICE_ID=?', [record.ID], function(inv_item) {
            
                ret.data.item_count = inv_item.rows.length;
            
                for(var i = 0;i< inv_item.rows.length;i++)
                {
                
                    //ret.data.item_count = inv_item.rows.length;
//                     var product;
//                     var invoice_item = inv_item.rows.item(0);
//                     offline.db.executeSql(
//                     'SELECT * from PRODUCT where ID=?', [inv_item.rows.item(i).PRODUCT_ID], function(inv_item_pro) {
//                 
//                         product = inv_item_pro.rows.item(0);
//             
// 
//                     }, function(err) {
//                       defer.reject(err);
//                     });
                    var invoice_item = inv_item.rows.item(i);
                    checkUndefined(invoice_item);
                    var photo_url = $helper.getRootPath() + secondPath + invoice_item.PHOTO_ID;  
                      
                    var product_info = {
                        id : invoice_item.PRODUCT_ID,
                        name : invoice_item['NAME_'+params.locale],
                        highlight : invoice_item['HIGHLIGHT_'+params.locale],
                        photo : photo_url,
                        qty : emptyTozero(invoice_item.QTY),
                        buy_qty : emptyTozero(invoice_item.QTY),
                        sku_no : invoice_item.SKU_NO,
                        code : invoice_item.CODE,
                        option  : [],
                        currency : invoice_item.CURRENCY,
                        o_price : emptyTozero(invoice_item.UNIT_PRICE),
                        unit_price :  emptyTozero(invoice_item.UNIT_PRICE),
                        actual_unit_price :  emptyTozero(invoice_item.UNIT_PRICE),
                        sub_total : emptyTozero(invoice_item.UNIT_PRICE * invoice_item.QTY),
                        //buy_sub_total
                        //actual sub total
                        weight : invoice_item.WEIGHT,
                        volumn : invoice_item.VOLUMN,
                        remark : invoice_item.REMARK,                    
                    };  
                
                    ret.data.products.push(product_info);
                
                                 
                }
                
                var baseDiscount = 0;
                var baseCharge = 0;
                var baseTotal = record.ITEM_TOTAL;

                offline.db.executeSql(
                'SELECT * from INVOICE_CHARGES where INVOICE_ID=?', [record.ID], function(inv_charge) {
                       
                    for(var i = 0;i< inv_charge.rows.length;i++)
                    {                
                        var invoice_charge = inv_charge.rows.item(i);
                        checkUndefined(invoice_charge);
                     
                        var charge_info = {
                            title_EN_US : invoice_charge.NAME_EN_US,
                            title_ZH_HK : invoice_charge.NAME_ZH_HK,
                            title_ZH_CN : invoice_charge.NAME_ZH_CN,
                            sign        : invoice_charge.SIGN,
                            type        : invoice_charge.TYPE,
                            value_type        : invoice_charge.VALUE_TYPE,
                            value       :  invoice_charge.VALUE,  
                 
                        };              
                        ret.data.invoice_charges.push(charge_info);
                                                        
                    }
                
                    for(var i = 0;i< inv_charge.rows.length;i++)
                    {                
                        var invoice_charge = inv_charge.rows.item(i);
                        checkUndefined(invoice_charge);
                        if (invoice_charge.VALUE_TYPE == 'percent')
                        {
                            if(invoice_charge.SIGN == '+')
                            {
                                var totalFlag = baseTotal;
                                baseTotal *= 1 +  Number(invoice_charge.VALUE) / 100;
                                baseCharge += baseTotal - totalFlag;
                            }
                            else
                            {
                                var totalFlag = baseTotal;
                                baseTotal *= 1 -  Number(invoice_charge.VALUE) / 100;
                                baseDiscount += totalFlag - baseTotal;                                
                            } 
                        }                        
                                                        
                    }
                    
                    for(var i = 0;i< inv_charge.rows.length;i++)
                    {                
                        var invoice_charge = inv_charge.rows.item(i);
                        checkUndefined(invoice_charge);
                        if (invoice_charge.VALUE_TYPE != 'percent')
                        {
                            if(invoice_charge.SIGN == '+')
                            {
                                var totalFlag = baseTotal;
                                baseTotal += Number(invoice_charge.VALUE);
                                baseCharge += baseTotal - totalFlag;
                            }
                            else
                            {
                                var totalFlag = baseTotal;
                                baseTotal -=  Number(invoice_charge.VALUE);
                                baseDiscount += totalFlag - baseTotal;                                
                            } 
                        }                        
                                                        
                    }                    

                    ret.data.grand_total = baseTotal;
                
                
                    defer.resolve(ret); 
                        
                }, function(err) {
                  defer.reject(err);
                });  
                
                
                //defer.resolve(ret); 
                        
            }, function(err) {
              defer.reject(err);
            });                   
            
        }, function(err) {
          defer.reject(err);
        });
        
        return defer.promise;      
    
    };
    
    offline.newCart = function(params){
        var defer = $q.defer();
        if (offline.db == null) offline.openDb();
        var time_now = new Date();
        var timestamp = time_now.getTime();
        var beautiful_time = '' + time_now.getFullYear() + '-' + (time_now.getMonth()+1) + '-' + time_now.getDate() + ' ' +  time_now.getHours() + ':' + time_now.getMinutes() + ':' + time_now.getSeconds();
        
        if (typeof params.user_id != "undefined" && params.user_id != null)
        {
            offline.db.executeSql(
            'SELECT * FROM MEMBER_PROFILE where USER_ID = ?', 
            [params.user_id], function(member_res_original) {
                    
                if (member_res_original.rows.length != 0)
                {
                    ret = {
                        status : 'Y',
                        msg : ''
                    }
                    member_res = member_res_original.rows.item(0);
                    checkUndefined(member_res);
                    offline.db.executeSql(
                    'INSERT INTO INVOICE (CREATE_DATE, UPDATE_DATE, INVOICE_DATE, STATUS, BILLING_FIRST_NAME, BILLING_LAST_NAME, GENDER, CHECK_OUT_WAREHOUSE_ID, USER_ID, BILLING_EMAIL, BILLING_COUNTRY_CODE, BILLING_MOBILE) VALUES (?,?,?, ?, ?, ?,?,?,?, ?, ?, ?)', 
                    [timestamp, timestamp, beautiful_time, 0, member_res.FIRST_NAME, member_res.LAST_NAME, member_res.GENDER, params.check_out_warehouse_id, params.user_id, member_res.EMAIL, member_res.COUNTRY, member_res.MOBILE], function(tx, res) {
                        var ret = {
                            status: 'Y',
                            msg: '',
                            invoice_id : tx.insertId, 
                            billing_last_name :  member_res.LAST_NAME,
                            gender :  member_res.GENDER,           
                        };        
        
        
                        defer.resolve(ret);
            
                    }, function(err) {
                      defer.reject(err);
                    });                     
                }
                else
                {
                    ret = {
                        status : 'E',
                        msg : 'no such member'
                    }                    
                    defer.resolve(ret);
                }
       
            
            }, function(err) {
              defer.reject(err);
            });             
        
        }
        else
        {
            offline.db.executeSql(
            'INSERT INTO INVOICE (CREATE_DATE, UPDATE_DATE, INVOICE_DATE, STATUS, BILLING_LAST_NAME, GENDER, CHECK_OUT_WAREHOUSE_ID) VALUES (?, ?,?,?,?, ?, ?)', 
            [timestamp, timestamp, beautiful_time, 0, params.billing_last_name, params.gender, params.check_out_warehouse_id], function(tx, res) {
                var ret = {
                    status: 'Y',
                    msg: '',
                    invoice_id : tx.insertId, 
                    billing_last_name :  params.billing_last_name,
                    gender :  params.gender,           
                };        
        
        
                defer.resolve(ret);
            
            }, function(err) {
              defer.reject(err);
            });  
        }
        
        
              
        return defer.promise;  
    };    

    offline.setCart = function(params){
        var defer = $q.defer();
        switch(params.action)
        {
            case 'read':
                offline.getInvoiceDetail({
    
                invoice_id : params.invoice_id
    
                }).then(function(ret)
                {
                
                   defer.resolve(ret);  
                
                });
                break;
            case 'add':
                offline.addToCart({
                
                params : params
                
                
                
                }).then(function(ret)
                {
                
                offline.getInvoiceDetail({
    
                invoice_id : params.invoice_id
    
                }).then(function(ret)
                {
                
                   defer.resolve(ret);  
                
                });
                
                });
            
            
            break;
            case 'update':
                offline.updateCart({
                
                params : params
                
                
                
                }).then(function(ret)
                {
                
                offline.getInvoiceDetail({
    
                invoice_id : params.invoice_id
    
                }).then(function(ret)
                {
                
                   defer.resolve(ret);  
                
                });
                
                });            
            
            break;
            case 'remove':
                offline.removeFromCart({
                
                params : params
                
                
                
                }).then(function(ret)
                {
                
                offline.getInvoiceDetail({
    
                invoice_id : params.invoice_id
    
                }).then(function(ret)
                {
                
                   defer.resolve(ret);  
                
                });
                
                });             
            break;
            case 'empty':
            break;
            case 'delete':
                offline.deleteCart({
                
                params : params
                
                
                
                }).then(function(ret)
                {  
                
                   defer.resolve(ret);  
                          
                
                });             
            
            break;
            case 'address':
            
                offline.addressCart({
                
                params : params
                
                
                
                }).then(function(ret)
                {
                
                offline.getInvoiceDetail({
    
                invoice_id : params.invoice_id
    
                }).then(function(ret)
                {
                
                   defer.resolve(ret);  
                
                });
                
                });             
            
            
            break;
        }
        return defer.promise;   
    }; 
    
    offline.addToCart = function(o_params)
    {
        var defer = $q.defer();
        if (offline.db == null) offline.openDb();
        var time_now = new Date();
        var timestamp = time_now.getTime();
        var params = o_params.params;
        var sku = '';
        if (typeof params.spec != "undefined")
        {
            
            sku = encodePreSku(params.spec);           
        }
        sku = sku + 'P' + params.product_id.toString(16);
        if (typeof params.sku_no != "undefined")
        {
            sku = params.sku_no;
        }        
          


    offline.db.executeSql('SELECT * FROM "PRODUCT_SKU_INFO" WHERE "SKU_NO" = ?', [sku], function(find_sku_res) {


      if (find_sku_res.rows.length != 0)
      {
        var sku_inf = find_sku_res.rows.item(0);
        offline.db.executeSql('SELECT * FROM "INVOICE_ITEM" WHERE "INVOICE_ID" = ? AND "PRODUCT_ID" = ? and "SKU_NO" = ?', [params.invoice_id, params.product_id, sku], function(res) {

            var ret = {
                status : 'Y',
                msg : ''
            }
        
          if (res.rows.length != 0)
          {
            var record = res.rows.item(0);
            checkUndefined(record); 
            offline.db.executeSql('UPDATE "INVOICE_ITEM" set "QTY" = ? where ID = ?', [record.QTY + params.qty, record.ID], function(update_res) {
                //console.log('updated');
                //update stock
                offline.db.executeSql('UPDATE "PRODUCT_STOCK" set "QTY" = "QTY" - ? where SKU_NO = ? and WAREHOUSE_ID = ?', [params.qty, sku, params.warehouse_id], function(update_stock_res) {
                //console.log('updated');
                defer.resolve(ret); 
                }, function(err) {
          
                  //console.log(err);
                  defer.reject(err);
                });   
                              
            
            
            }, function(err) {
          
              //console.log(err);
              defer.reject(err);
            });   
            //defer.resolve(ret);        // if no need to update stock 
          }
          else
          { 
            //console.log('enter else');
            offline.db.executeSql('INSERT INTO "INVOICE_ITEM" (CREATE_DATE, UPDATE_DATE, INVOICE_ID, PRODUCT_ID, UNIT_PRICE, QTY, SKU_NO, STATUS) VALUES(?,?,?,?,?,?,?,?)', [timestamp,timestamp, params.invoice_id, params.product_id, sku_inf.PRICE, params.qty, sku ,0], function(add_res) {
                //console.log(add_res);
                //console.log('added');
                //update stock
                offline.db.executeSql('UPDATE "PRODUCT_STOCK" set "QTY" = "QTY" - ? where SKU_NO = ? and WAREHOUSE_ID = ?', [params.qty, sku, params.warehouse_id], function(update_stock_res) {
                //console.log('updated');
                defer.resolve(ret); 
                }, function(err) {
          
                  //console.log(err);
                  defer.reject(err);
                });              
            }, function(err) {
              //console.log('error');
              //console.log(err);
              defer.reject(err);
            });
            //defer.resolve(ret);    // if no need to update stock        
          }
        
      
        }, function(err) {
        //console.log(err);
          defer.reject(err);
        });
     }
     else
     {
            var ret = {
                status : 'E',
                msg : ''
            }
           defer.resolve(ret);        
     }   

    }, function(err) {
    //console.log(err);
      defer.reject(err);
    });
                
        return defer.promise;          
    };

    offline.updateCart = function(o_params)
    {
        var defer = $q.defer();
        if (offline.db == null) offline.openDb();
        var time_now = new Date();
        var timestamp = time_now.getTime();
        var params = o_params.params;
        var sku = '';
        if (typeof params.spec != "undefined")
        {
            
            sku = encodePreSku(params.spec);           
        }
        sku = sku + 'P' + params.product_id.toString(16); 
        if (typeof params.sku_no != "undefined")
        {
            sku = params.sku_no;
        }        
         
        

    offline.db.executeSql('SELECT * FROM "PRODUCT_SKU_INFO" WHERE "SKU_NO" = ?', [sku], function(find_sku_res) {


      if (find_sku_res.rows.length != 0)
      {
        var sku_inf = find_sku_res.rows.item(0);
        offline.db.executeSql('SELECT * FROM "INVOICE_ITEM" WHERE "INVOICE_ID" = ? AND "PRODUCT_ID" = ? and "SKU_NO" = ?', [params.invoice_id, params.product_id, sku], function(res) {

            var ret = {
                status : 'Y',
                msg : ''
            }
        
          if (res.rows.length != 0)
          {
            var record = res.rows.item(0);
            checkUndefined(record); 
            offline.db.executeSql('UPDATE "INVOICE_ITEM" set "QTY" = ? where ID = ?', [params.qty, record.ID], function(update_res) {
                //console.log('updated');
                //update stock
                offline.db.executeSql('UPDATE "PRODUCT_STOCK" set "QTY" = "QTY" - ? where SKU_NO = ? and WAREHOUSE_ID = ?', [params.qty - record.QTY , sku, params.warehouse_id], function(update_stock_res) {
                //console.log('updated');
                defer.resolve(ret); 
                }, function(err) {
          
                  //console.log(err);
                  defer.reject(err);
                });             
            
            
            }, function(err) {
          
              //console.log(err);
              defer.reject(err);
            });   
            defer.resolve(ret);         
          }
          else
          { 
            //console.log('enter else');
            offline.db.executeSql('INSERT INTO "INVOICE_ITEM" (CREATE_DATE, UPDATE_DATE, INVOICE_ID, PRODUCT_ID, UNIT_PRICE, QTY, SKU_NO, STATUS) VALUES(?,?,?,?,?,?,?,?)', [timestamp,timestamp, params.invoice_id, params.product_id, sku_inf.PRICE, params.qty, sku ,0], function(add_res) {
                //console.log(add_res);
                //console.log('added');
                //update stock
                offline.db.executeSql('UPDATE "PRODUCT_STOCK" set "QTY" = "QTY" - ? where SKU_NO = ? and WAREHOUSE_ID = ?', [params.qty, sku, params.warehouse_id], function(update_stock_res) {
                //console.log('updated');
                defer.resolve(ret); 
                }, function(err) {
          
                  //console.log(err);
                  defer.reject(err);
                }); 
            
            }, function(err) {
              //console.log('error');
              //console.log(err);
              defer.reject(err);
            });
            defer.resolve(ret);             
          }
        
      
        }, function(err) {
        //console.log(err);
          defer.reject(err);
        });
     }
     else
     {
            var ret = {
                status : 'E',
                msg : ''
            }
           defer.resolve(ret);        
     }   

    }, function(err) {
    //console.log(err);
      defer.reject(err);
    });
                
        return defer.promise;          
    };

    offline.removeFromCart = function(o_params)
    {
        var defer = $q.defer();
        if (offline.db == null) offline.openDb();
        var time_now = new Date();
        var timestamp = time_now.getTime();
        var params = o_params.params;
        var sku = '';
        if (typeof params.spec != "undefined")
        {
            
            sku = encodePreSku(params.spec);           
        }
        sku = sku + 'P' + params.product_id.toString(16); 
        if (typeof params.sku_no != "undefined")
        {
            sku = params.sku_no;
        }        
         
        

    offline.db.executeSql('SELECT * FROM "PRODUCT_SKU_INFO" WHERE "SKU_NO" = ?', [sku], function(find_sku_res) {


      if (find_sku_res.rows.length != 0)
      {
        var sku_inf = find_sku_res.rows.item(0);
        offline.db.executeSql('SELECT * FROM "INVOICE_ITEM" WHERE "INVOICE_ID" = ? AND "PRODUCT_ID" = ? and "SKU_NO" = ?', [params.invoice_id, params.product_id, sku], function(res) {

            var ret = {
                status : 'Y',
                msg : ''
            }
        
          if (res.rows.length != 0)
          {
            var record = res.rows.item(0);
            checkUndefined(record); 
            
            //update stock
            offline.db.executeSql('UPDATE "PRODUCT_STOCK" set "QTY" = "QTY" + ? where SKU_NO = ? and WAREHOUSE_ID = ?', [record.QTY, sku, params.warehouse_id], function(update_stock_res) {
            //console.log('updated');
            
                offline.db.executeSql('DELETE FROM "INVOICE_ITEM" where ID = ?', [record.ID], function(update_res) {
                    //console.log('updated');
            
                    defer.resolve(ret); 
            
                }, function(err) {
          
                  //console.log(err);
                  defer.reject(err);
                });             
            
                //defer.resolve(ret); //if no need to update stock
            }, function(err) {
      
              //console.log(err);
              defer.reject(err);
            });             
            
  
                    
          }
          else
          { 
            //console.log('enter else');
            ret.status = 'E';
            defer.resolve(ret);             
          }
        
      
        }, function(err) {
        //console.log(err);
          defer.reject(err);
        });
     }
     else
     {
            var ret = {
                status : 'E',
                msg : ''
            }
           defer.resolve(ret);        
     }   

    }, function(err) {
    //console.log(err);
      defer.reject(err);
    });
                
        return defer.promise;          
    };

    offline.deleteCart = function(o_params)
    {
        var defer = $q.defer();
        if (offline.db == null) offline.openDb();
        var time_now = new Date();
        var timestamp = time_now.getTime();
        var params = o_params.params;
        
        offline.db.executeSql('SELECT * FROM INVOICE_ITEM where INVOICE_ID = ?',
         [params.invoice_id], function(item_res) {
            
            for(var ii=0;ii<item_res.rows.length;ii++)
            {
                //update stock
                var item_record = item_res.rows.item(ii);
                checkUndefined(item_record);
                offline.db.executeSql('UPDATE "PRODUCT_STOCK" set "QTY" = "QTY" + ? where SKU_NO = ? and WAREHOUSE_ID = ?', [item_record.QTY, item_record.SKU_NO, params.warehouse_id], function(update_stock_res) {
                //console.log('updated');
                //defer.resolve(ret); 
                }, function(err) {
          
                  //console.log(err);
                  defer.reject(err);
                });                 
            }
    
            //console.log(ret);
            //defer.resolve(ret); 
        }, function(err) {
        //console.log(err);
          defer.reject(err);
        }); 


        offline.db.executeSql('DELETE FROM "INVOICE_ITEM" WHERE "INVOICE_ID" = ?', [params.invoice_id], function(res) {

            offline.db.executeSql('DELETE FROM "INVOICE" WHERE "ID" = ?', [params.invoice_id], function(res) {

                var ret = {
                    status : 'Y',
                    msg : ''
                }
                
                
                offline.db.executeSql('DELETE FROM "INVOICE_CHARGES" where INVOICE_ID = ?',
                 [params.invoice_id], function(res) {
      
            
                    //console.log(ret);
                    defer.resolve(ret); 
                }, function(err) {
                //console.log(err);
                  defer.reject(err);
                });                 
                
                
            }, function(err) {
            //console.log(err);
              defer.reject(err);
            });  



        }, function(err) {
        //console.log(err);
          defer.reject(err);
        }); 

     
       

                
        return defer.promise;          
    };
    
    offline.addressCart = function(o_params)
    {
        var defer = $q.defer();
        if (offline.db == null) offline.openDb();
        var time_now = new Date();
        var timestamp = time_now.getTime();
        var params = o_params.params;
        checkUndefined(params);
        //console.log('in address');
        //console.log(params);
        var b_fn = params.billing_first_name;
        var b_ln = params.billing_last_name;
        var b_country_code = params.billing_country_code;
        var b_mobile = params.billing_mobile;
        var b_email = params.billing_email;
        var pick_warehouse_id = params.pick_up_warehouse_id;
        if (params.delivery_type == 'pick up')
        {
            b_fn = params.pick_up_first_name;
            b_ln = params.pick_up_last_name;
            b_country_code = params.pick_up_country_code;
            b_mobile = params.pick_up_mobile;
            b_email = params.pick_up_email;            
        }
        offline.db.executeSql('UPDATE "INVOICE" set BILLING_FIRST_NAME = ?, BILLING_LAST_NAME = ?, BILLING_EMAIL = ?, BILLING_COUNTRY_CODE = ?, BILLING_MOBILE = ?, REMARK = ?, DELIVERY_TYPE = ?, PAYMENT_TYPE = ?, PAYED_AMOUNT = ?, PICK_UP_WAREHOUSE_ID = ?, PICK_UP_SITE = ? where ID = ?',
         [b_fn, b_ln,b_email,b_country_code,b_mobile,params.remark,params.delivery_type,params.payment_type,params.payed_amount, pick_warehouse_id, params.pick_up_site, params.invoice_id], function(res) {
            //console.log('good sql');
            var ret = {
                status : 'Y',
                msg : ''
            }
           // defer.resolve(ret); 
            
        offline.db.executeSql('DELETE FROM "INVOICE_CHARGES" where INVOICE_ID = ?',
         [params.invoice_id], function(res) {
            
            var ret = {
                status : 'Y',
                msg : '',
            }
            
            if (typeof params.invoice_charges != "undefined")
            {
                var charge_array = JSON.parse(params.invoice_charges);
                for (var c = 0;c < charge_array.length; c ++)
                {
                    offline.db.executeSql('INSERT INTO "INVOICE_CHARGES" (CREATE_DATE, UPDATE_DATE, INVOICE_ID, NAME_EN_US, NAME_ZH_HK, NAME_ZH_CN, SIGN, TYPE,VALUE_TYPE,VALUE) VALUES(?,?,?,?,?,?,?,?,?,?)', 
                    [timestamp,timestamp, params.invoice_id, charge_array[c].title_EN_US, charge_array[c].title_ZH_HK, charge_array[c].title_ZH_CN, charge_array[c].sign , charge_array[c].type, charge_array[c].value_type, charge_array[c].value], function(charge_res) {
                    
                    if (c == charge_array.length - 1)
                    {
                        defer.resolve(ret); 
                    }


                    }, function(err) {
                      //console.log('error');
                      //console.log(err);
                      defer.reject(err);
                    });                    
                }    
            }
            
            
            //console.log(ret);
            //defer.resolve(ret); 
        }, function(err) {
        //console.log(err);
          defer.reject(err);
        });              
            
            
            
        }, function(err) {
        //console.log(err);
          defer.reject(err);
        });          
        return defer.promise;
                
    }
    
    offline.checkOut = function(params)
    {
        var defer = $q.defer();
        if (offline.db == null) offline.openDb();
        var time_now = new Date();
        var timestamp = time_now.getTime();
        checkUndefined(params);
        //console.log('in checkout');
        var b_fn = params.billing_first_name;
        var b_ln = params.billing_last_name;
        var b_country_code = params.billing_country_code;
        var b_mobile = params.billing_mobile;
        var b_email = params.billing_email;
        var pick_warehouse_id = params.pick_up_warehouse_id;
        if (params.delivery_type == 'pick up')
        {
            b_fn = params.pick_up_first_name;
            b_ln = params.pick_up_last_name;
            b_country_code = params.pick_up_country_code;
            b_mobile = params.pick_up_mobile;
            b_email = params.pick_up_email;            
        }        
        var invoice_no = 'OFFLINE-' + time_now.getMonth() + time_now.getDate() + params.invoice_id;
        offline.db.executeSql('UPDATE "INVOICE" set BILLING_FIRST_NAME = ?, BILLING_LAST_NAME = ?, BILLING_EMAIL = ?, BILLING_COUNTRY_CODE = ?, BILLING_MOBILE = ?, REMARK = ?, DELIVERY_TYPE = ?, PAYMENT_TYPE = ?, PAYED_AMOUNT = ?, PAY_METHOD = ?, INVOICE_NO = ?, PICK_UP_WAREHOUSE_ID = ?, PICK_UP_SITE = ? where ID = ?',
         [b_fn, b_ln,b_email,b_country_code,b_mobile,params.remark,params.delivery_type,params.payment_type,params.payed_amount,params.pay_method, invoice_no,pick_warehouse_id, params.pick_up_site, params.invoice_id ], function(res) {
            
            var ret = {
                status : 'Y',
                msg : '',
                invoice_id : params.invoice_id,
                invoice_no : invoice_no,
                pdf : pdfPath,
                data: []
            }

            offline.db.executeSql('DELETE FROM "INVOICE_CHARGES" where INVOICE_ID = ?',
                [params.invoice_id], function(res) {
            
                // var ret = {
                //     status : 'Y',
                //     msg : '',
                //     invoice_id : params.invoice_id,
                //     invoice_no : invoice_no,
                //     pdf : $helper.getRootPath() + '/invoice.pdf'
                // }
            
            if (typeof params.invoice_charges != "undefined")
            {
                var charge_array = JSON.parse(params.invoice_charges);
                for (var c = 0;c < charge_array.length; c ++)
                {
                    offline.db.executeSql('INSERT INTO "INVOICE_CHARGES" (CREATE_DATE, UPDATE_DATE, INVOICE_ID, NAME_EN_US, NAME_ZH_HK, NAME_ZH_CN, SIGN, TYPE,VALUE_TYPE,VALUE) VALUES(?,?,?,?,?,?,?,?,?,?)', 
                    [timestamp,timestamp, params.invoice_id, charge_array[c].title_EN_US, charge_array[c].title_ZH_HK, charge_array[c].title_ZH_CN, charge_array[c].sign , charge_array[c].type, charge_array[c].value_type, charge_array[c].value], function(charge_res) {
                    
                    if (c == charge_array.length - 1)
                    {
                        //defer.resolve(ret); 
                        offline.getInvoiceDetail({
                            invoice_id : params.invoice_id
                        }).then(function(detail_ret)
                        {
                            console.log(detail_ret);
                            ret.data = detail_ret.data;

                            offline.invoicePdf({
                                size: 'A4', // '80mm',
                                images: {
                                  COMPANY_LOGO: '',
                                  INVOICE_QR: '',
                                  SHOP_QR: ''
                                },
                                data: {
                                  INVOICE_NO: 'T01-17010013',
                                  MEMBER_CLASS: 'Visitor',
                                  INVOICE_DATE: '2016-11-30 15:36:24',
                                  CUSTOMER_DETAIL: 'Belinda Koh<br /> \
                                    Tel: 852 35792912<br /> \
                                    Email: phi.leung@ubeing.me<br />',
                                  DELIVERY_ADDRESS: 'HQ Warehouse - Flat B 3/F Yeung Yiu Chung (No.8) Ind Bldg, 20 Wong Hoi Road, Kowloon Bay, Kowloon, New Territories, Hong Kong',
                                  SALESMAN: 'admin .',
                                  PRODUCT_ITEM: [
                                    {
                                      ITEM_NO: '1',
                                      PRODUCT_CODE: 'ACCNWTS4',
                                      PRODUCT_NAME: 'NEW STAR TOOLSET 4PCS',
                                      QTY: 1,
                                      UNIT_PRICE: '$498.00',
                                      DISCOUNT: '-',
                                      SUB_TOTAL:  '$498.00'
                                    },
                                    {
                                      ITEM_NO: '2',
                                      PRODUCT_CODE: 'GLA1290BLK',
                                      PRODUCT_NAME: 'TRITON PTS 2.0 (BLACK)',
                                      QTY: 1,
                                      UNIT_PRICE: '$4980.00',
                                      DISCOUNT: '-',
                                      SUB_TOTAL:  '$4980.00'
                                    }
                                  ],
                                  PAYMENT_METHOD: 'AE',
                                  REMARKS: 'please contact Ms Salde Molina for delivery arrangement',
                                  ITEM_TOTAL: '$5,478.00',
                                  SERVICE_TOTAL: '$0.00',
                                  DELIVERY_TOTAL: '$0.00',
                                  DISCOUNT_TOTAL: '$0.00',
                                  GRAND_TOTAL: '$5,478.00',
                                  SHOP_NAME: 'BarbecueInAll',
                                  SHOP_TEL: '2338 8256',
                                  SHOP_EMAIL: 'enquiry@bbqinall.com',
                                }

                              }).then(function(status) {
                                  console.log('offline pdf success');
                                  console.log(status);
                                  defer.resolve(ret);
                              }).catch(function(err) {
                                  defer.reject(err);
                              });
                              // defer.resolve(ret);
                        });                             
                    }
                    }, function(err) {
                      //console.log('error');
                      //console.log(err);
                      defer.reject(err);
                    });                    
                }    
            }        
                //console.log(ret);
             
                //defer.resolve(ret); 
            }, function(err) {
                //console.log(err);
                defer.reject(err);
            });            
            
//             console.log(ret);
//             defer.resolve(ret); 
        }, function(err) {
        //console.log(err);
          defer.reject(err);
        });          
        return defer.promise;        
    }

    offline.confirmPayment = function(params)
    {
        var defer = $q.defer();
        if (offline.db == null) offline.openDb();

        checkUndefined(params);
        //console.log('in confirm');
        offline.db.executeSql('UPDATE "INVOICE" set STATUS = ? where ID = ?',
         [1, params.invoice_id], function(res) {
            
            var ret = {
                status : 'Y',
                msg : '',
                invoice_id : params.invoice_id,
            }         
            
            //console.log(ret);
            defer.resolve(ret); 
        }, function(err) {
        //console.log(err);
          defer.reject(err);
        });          
        return defer.promise;        
    }
    
    offline.getProductList = function(params){
    
        var defer = $q.defer();
        if (offline.db == null) offline.openDb();
        var cat_param = "";
        if (params.category_ids && Array.isArray(params.category_ids)){
            
            cat_param = cat_param + " AND ("
            for(var n=0;n<params.category_ids.length;n++)
            {
                if (n!=0)
                {
                    cat_param = cat_param + ' OR '
                }
                cat_param = cat_param + "CATEGORY_IDS LIKE '%" + params.category_ids[n] + "%'";
                
            }
           cat_param = cat_param + ')'; 
        }
        offline.db.executeSql(
        'SELECT * from PRODUCT LEFT JOIN (SELECT MIN(ID) as ID,PRODUCT_ID FROM PRODUCT_MEDIA group by PRODUCT_ID) as PM on PRODUCT.ID = PM.PRODUCT_ID where PRODUCT.ENABLE_FOR_POS = 1 ' + cat_param + ' ORDER BY PRODUCT.SORTING DESC, PRODUCT.ID DESC LIMIT ? OFFSET ? ', [params.limit, params.limit_from], function(res) {
             var ret = {
                status: 'Y',
                msg: '',
                data: {
                    advertisements : {
                        count : 0,
                        list : []
                    },
                    products : {
                        count : res.rows.length,
                        list : []
                    }
                    
                }                
            };
            for (var i=0;i<res.rows.length;i++)
            {
              
                var record = res.rows.item(i);
                var photo_url = $helper.getRootPath() + secondPath + record.ID;  
                 
                checkUndefined(record);
                var product_info = {
                    id : record.PRODUCT_ID,
                    code : record.CODE,
                    gift : record.GIFT,
                    category_ids : record.CATEGORY_IDS.substring(1, record.CATEGORY_IDS.length - 1 ).split(","),
                    name : record['NAME_'+params.locale],
                    highlight : record['HIGHLIGHT_'+params.locale],
                    photo : photo_url,
                    currency : record.CURRENCY,
                    //price : offline.getProductPrice(record.ID, record.CURRENCY),
                    //specifications : offline.getProductSpec(record.ID),
                    //original_price : offline.getProductPrice(record.ID, record.CURRENCY),
                    qty : record.QTY,
                    sorting : record.SORTING,
                    enabled : record.ENABLED,
                    enable_for_pos : record.ENABLE_FOR_POS,
                    show_price : record.SHOP_PRICE
                };
                //SERVER.http + $localStorage.get('activate').prefix + $localStorage.get('activate').path + SERVER.subdomain +

              ret.data.products.list.push(product_info);   


                
                                                             
                
            }
            defer.resolve(ret);
            //console.log('return la');
        }, function(err) {
          defer.reject(err);
        });
        
        return defer.promise;      
    
    }; 
    
    
    offline.getProductDetail = function(params){
    
        var defer = $q.defer();
        if (offline.db == null) offline.openDb();
        var cat_param = "";

      offline.db.executeSql(
      'SELECT * from PRODUCT LEFT JOIN (SELECT ID, PRODUCT_ID FROM PRODUCT_MEDIA) as PM on PRODUCT.ID = PM.PRODUCT_ID where PRODUCT.ID = ? ', [params.product_id], function(res) {
            
            var record = res.rows.item(0);
            checkUndefined(record);
            var ret = {
              status: 'Y',
              msg: '',
              data: {
                  id : record.PRODUCT_ID,
                  code : record.CODE,
                  gift : record.GIFT,
                  //shop_name
                  category_ids : record.CATEGORY_IDS.substring(1, record.CATEGORY_IDS.length - 1 ).split(","),
                  name : record['NAME_'+params.locale],
                  name_en_us : record.NAME_EN_US,
                  name_zh_hk : record.NAME_ZH_HK,
                  name_zh_cn : record.NAME_ZH_CN,
                  
                  highlight : record['HIGHLIGHT_'+params.locale],
                  highlight_en_us : record.HIGHLIGHT_EN_US,
                  highlight_zh_hk : record.HIGHLIGHT_ZH_HK,
                  highlight_zh_cn : record.HIGHLIGHT_ZH_CN,
                  
                  content : record['CONTENT_'+params.locale],
                  content_en_us : record.CONTENT_EN_US,
                  content_zh_hk : record.CONTENT_ZH_HK,
                  content_zh_cn : record.CONTENT_ZH_CN,
                  photos : [],
                  currency : record.CURRENCY,
                  //price : offline.getProductPrice(record.ID, record.CURRENCY),
                  //specifications : offline.getProductSpec(record.ID),
                  //original_price : offline.getProductPrice(record.ID, record.CURRENCY),
                  qty : record.QTY,
                  sorting : record.SORTING,
                  enabled : record.ENABLED,
                  enable_for_pos : record.ENABLE_FOR_POS,
                  show_price : record.SHOP_PRICE,
                  remark : record.REMARK,
                  specifications : JSON.parse(record.SPEC_FOR_OFFLINE)
                  
              }                
          };
          for (var i=0;i<res.rows.length;i++)
          {
            
              var record = res.rows.item(i);
              var photo_url = $helper.getRootPath() + secondPath + record.ID;  

                ret.data.photos.push(photo_url);                                                              
                                
            }
               
            defer.resolve(ret);
            //console.log('return la');
        }, function(err) {
          defer.reject(err);
        });
        
        return defer.promise;      
    
    };
    
    offline.getSKUInfo = function(params){
    
        var defer = $q.defer();
        if (offline.db == null) offline.openDb();
        var cat_param = "";
        
        var sku = '';
        if (typeof params.spec != "undefined")
        {
            
//            var spec_array = JSON.parse(params.spec);
//             for (var i=0;i<spec_array.length;i++)
//             {
//                 sku = sku + 'X' + spec_array[i].dictionary.toString(16);
//                 sku = sku + 'Y' + spec_array[i].option.toString(16);
//                 sku = sku + '-';
//             }
            
            sku = encodePreSku(params.spec);
            
        }
        sku = sku + 'P' + params.product_id.toString(16);
        if (typeof params.sku_no != "undefined")
        {
            sku = params.sku_no;
        }
        //console.log(sku);
        
        offline.db.executeSql(
        'SELECT * from ((select * from PRODUCT_SKU_INFO where SKU_NO = ?) as F_SKU left join (select ID, NAME_EN_US, NAME_ZH_HK, NAME_ZH_CN from PRODUCT) as SHORT_P on F_SKU.PRODUCT_ID = SHORT_P.ID) as PSI left join (select * from PRODUCT_STOCK where PRODUCT_STOCK.WAREHOUSE_ID = ?) as F_PS on F_PS.SKU_NO = PSI.SKU_NO', [sku, params.warehouse_id], function(res) {
         var record = res.rows.item(0); 
        checkUndefined(record);  
        
        var ret = {
            status : 'Y',
            msg : '',
            product_id : record.PRODUCT_ID,
            product_name : record['NAME_'+params.locale],
            remarks : '------',
            reserved_amount : 0,
            local_qty : emptyTozero(record.QTY),
            local_pending_in : emptyTozero(record.PENDING_IN),
            local_pending_out : emptyTozero(record.PENDING_OUT),
            local_warehouse_id : emptyTozero(record.WAREHOUSE_ID),
            local_warehouse_name : 'Offline',
            local_warehouse_location : '',
            global_qty : emptyTozero(record.QTY),
            price : record.PRICE,
            original_price : record.ORIGINAL_PRICE,
            data : []       
        };
            //console.log(ret);
            defer.resolve(ret);
            //console.log('return la');
        }, function(err) {
        //console.log(err);
        //console.log('error la');
          defer.reject(err);
        });
        
        return defer.promise;      
    
    };    
    

  /**************************************************
  // offline/invoice-pdf
  **************************************************/
  offline.getInvoiceTemplateCss = function(type) {

    var defer = $q.defer();

    window.resolveLocalFileSystemURL(cordova.file.applicationDirectory + 'www/templates/tpl.invoice-pdf.' + type + '.css.html', function(fileEntry) {
      fileEntry.file(function(file) {
        var reader = new FileReader();
        reader.onloadend = function(e) {
          defer.resolve(this.result);
        }
        reader.readAsText(file);
      });
    }, function(err) {
      defer.reject(err);
    });

    return defer.promise;

  };

  offline.getInvoiceTemplateBody = function(type) {

    var defer = $q.defer();

    window.resolveLocalFileSystemURL(cordova.file.applicationDirectory + 'www/templates/tpl.invoice-pdf.' + type + '.body.html', function(fileEntry) {
      fileEntry.file(function(file) {
        var reader = new FileReader();
        reader.onloadend = function(e) {
          defer.resolve(this.result);
        }
        reader.readAsText(file);
      });
    }, function(err) {
      defer.reject(err);
    });

    return defer.promise;

  };

  offline.getInvoiceTemplateProductItem = function(type) {

    var defer = $q.defer();

    window.resolveLocalFileSystemURL(cordova.file.applicationDirectory + 'www/templates/tpl.invoice-pdf.' + type + '.product-item.html', function(fileEntry) {
      fileEntry.file(function(file) {
        var reader = new FileReader();
        reader.onloadend = function(e) {
          defer.resolve(this.result);
        }
        reader.readAsText(file);
      });
    }, function(err) {
      defer.reject(err);
    });

    return defer.promise;

  };

  offline.getInvoiceTemplate = function(type) {

    var defer = $q.defer();

    window.resolveLocalFileSystemURL(cordova.file.applicationDirectory + 'www/templates/tpl.invoice-pdf.' + type + '.html', function(fileEntry) {
      fileEntry.file(function(file) {
        var reader = new FileReader();
        reader.onloadend = function(e) {
          defer.resolve(this.result);
        }
        reader.readAsText(file);
      });
    }, function(err) {
      defer.reject(err);
    });

    return defer.promise;

  };

  offline.invoicePdf = function(params) {

    var defer = $q.defer();
    console.log(params);
    console.log('1');
    offline.getInvoiceTemplateCss(params.size).then(function(css) {
      offline.getInvoiceTemplateBody(params.size).then(function(body) {
        offline.getInvoiceTemplateProductItem(params.size).then(function(productItem) {
          offline.getInvoiceTemplate(params.size).then(function(template) {
            var pdf = template.replace(/{{ 'CSS' \| TEMPLATE }}/g, css);
            console.log('2');
            var imagesReg = /{{ '(\w+)' \| IMAGE }}/g;
            var translateReg = /{{ '(\w+)' \| TRANSLATE }}/g;
            var dataReg = /{{ '(\w+)' \| DATA }}/g;
            var productItemReg = /{{ '(\w+)' \| PRODUCT_ITEM }}/g;

            var page1 = body.replace(imagesReg, function(match, param, offset, string) {
              return params.images[param];
            });

            var page1 = page1.replace(translateReg, function(match, param, offset, string) {
              return $translate.instant(param);
            });

            var page1 = page1.replace(translateReg, function(match, param, offset, string) {
              return $translate.instant(param);
            });

            var page1 = page1.replace(dataReg, function(match, param, offset, string) {
              return params.data[param];
            });

            var products = '';
            console.log('3');
            console.log(params.data.PRODUCT_ITEM);
            for (var i = 0; i < params.data.PRODUCT_ITEM.length; i++)
            {
              products += productItem.replace(productItemReg, function(match, param, offset, string) {
                return params.data.PRODUCT_ITEM[i][param];
              });
              console.log('product:');
              console.log(products);
            }

            var page1 = page1.replace(/{{ 'PRODUCT_ITEM' \| TEMPLATE }}/g, products);

            var page1 = page1.replace(/{{ 'CURRENT_PAGE' \| PAGE }}/g, '1');
            var page1 = page1.replace(/{{ 'TOTAL_PAGE' \| PAGE }}/g, '2');

            pdf = pdf.replace(/{{ 'BODY' \| TEMPLATE }}/g, page1);
            // cordova.file.applicationStorageDirectory
            window.html2pdf.create(pdf, pdfPath, 
              function(status) {
                defer.resolve(status);
              },
              function(status) {
                defer.reject(status);
              }
            );
          }).catch(function(err) {
            defer.reject(err);
          });
        }).catch(function(err) {
          defer.reject(err);
        });
      }).catch(function(err) {
        defer.reject(err);
      });
    }).catch(function(err) {
      defer.reject(err);
    });

    return defer.promise;

  };  

  /**************************************************
  // Return service
  **************************************************/
  return offline;

});
