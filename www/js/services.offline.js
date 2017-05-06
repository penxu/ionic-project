angular.module('services.offline', ['ionic', 'ngCordova', 'services.helper'])

/**************************************************
// offline services
**************************************************/
.factory('$offline', function($cordovaSQLite, $ionicLoading, $q, $http, $localStorage, SERVER, $helper, $ionicModal, $cordovaFileTransfer, $rootScope, $cordovaZip, $translate) {

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


    var checkUndefined = function(params) {
        Object.keys(params).map(function(objectKey, index) {
            var value = params[objectKey];
            if (typeof value == "undefined" || value == null) {
                params[objectKey] = '';
            }
        });
    };


    var emptyTozero = function(str) {
        return str != '' ? str : 0;
    };

    var encodePreSku = function(json_array) {
        var sku = '';
        var spec_array = JSON.parse(json_array);
        for (var i = 0; i < spec_array.length; i++) {
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

        if (offline.db != null) {
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
        $helper.showLoading(600000);
        var defer = $q.defer();
        if (offline.db == null) offline.openDb();
        console.log('ready to post');
        $http.post(SERVER.http + $localStorage.get('activate').prefix + $localStorage.get('activate').path + SERVER.subdomain + SERVER.apiPath + 'api/get-offline-data', offline.serialize(params), {
            timeout: 300000
        }).success(function(data) {

            // console.log('hide loading');
            try {
                var res = angular.fromJson(data);
                console.log('already get offline data~');
                if (res.status == 'Y') {
                    offline.db.sqlBatch(res.data, function() {
                        defer.resolve();
                    }, function(err) {
                        defer.reject(err);
                    });
                } else {
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
    offline.getOfflinePhoto = function(params) {
        console.log('into photo function');
        // $helper.showLoading(180000);
        var defer = $q.defer();
        // var url = 'http://sandbox.gardengallery.posify.me//data/product-image/1';
        var url = SERVER.http + $localStorage.get('activate').prefix + $localStorage.get('activate').path + SERVER.subdomain + '/data/product-image/' + $localStorage.get('user').shop_id;
        console.log('link : ' + url);
        var targetPath = $helper.getRootPath() + secondPath + 'photo.zip';
        var unzipPath = $helper.getRootPath() + secondPath;
        var trustHosts = true;
        var options = {};
        $cordovaFileTransfer.download(url, targetPath, options, trustHosts)
            .then(function(result) {

                console.log('download photo finish');
                console.log('zip file path:' + targetPath);
                console.log('unzip path:' + unzipPath);
                $cordovaZip
                    .unzip(
                        targetPath, // https://github.com/MobileChromeApps/zip/blob/master/tests/tests.js#L32
                        unzipPath // https://github.com/MobileChromeApps/zip/blob/master/tests/tests.js#L45
                    ).then(function() {
                        $ionicLoading.hide();
                        //console.log('success unzip');
                        //$helper.clearCache(targetPath);
                        $helper.toast('Download data success!', 'short', 'bottom');
                        $localStorage.set('update_time', $rootScope.newUpdateTime);
                        console.log($rootScope.newUpdateTime);
                    }, function(status) {
                        $ionicLoading.hide();
                        $helper.toast('unzip status: ' + status, 'short', 'top');
                    }, function(progressEvent) {
                        $ionicLoading.hide();
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
            for (var i = 0; i < res.rows.length; i++) {
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
            for (var i = 0; i < res.rows.length; i++) {
                ret.data.push(offline.getCategoryNestedData(res.rows.item(i), params.locale));
            }
            console.log('finish loop tks func');
            defer.resolve(ret);
        }, function(err) {
            console.log(err);
            defer.reject(err);
        });

        return defer.promise;

    };

    offline.getMemberList = function(params) {

        var defer = $q.defer();
        if (offline.db == null) offline.openDb();
        //console.log('into phi func');
        var additional_sql = '';
        if (typeof params.keyword != "undefined" && params.keyword != null) {
            additional_sql = additional_sql + ' where FIRST_NAME like "%' + params.keyword + '%"';
            additional_sql = additional_sql + ' or LAST_NAME like "%' + params.keyword + '%"';
            additional_sql = additional_sql + ' or MOBILE like "%' + params.keyword + '%"';
            additional_sql = additional_sql + ' or EMAIL like "%' + params.keyword + '%"';
        }

        var offset = 0;
        var limit = 20;

        if (typeof params.limit_from != "undefined") {
            offset = params.limit_from;
        }
        if (typeof params.limit != "undefined") {
            limit = params.limit;
        }

        offline.db.executeSql(
            'SELECT * FROM "MEMBER_PROFILE"' + additional_sql, [

            ],
            function(res) {
                var ret = {
                    status: 'Y',
                    msg: '',

                    member: {
                        count: res.rows.length,
                        list: []
                    }

                };
                //console.log(res);
                for (var i = offset; i < offset + limit && i < res.rows.length; i++) {
                    record = res.rows.item(i);
                    checkUndefined(record);
                    var member_info = {
                        user_id: record.USER_ID,
                        member_id: record.ID,
                        first_name: record.FIRST_NAME,
                        last_name: record.LAST_NAME,
                        //grade : record.
                        //VIP_LEVEL : 
                        //discount:
                        gender: record.GENDER,
                        country_code: record.COUNTRY_CODE,
                        mobile: record.MOBILE,
                        email: record.EMAIL,
                        birthday: record.BIRTHDAY,
                        nationality_id: record.NATIONALITY,
                        num_family: record.NUM_FAMILY,
                        occupation: record.OCCUPATION,
                        prefer_currency: record.PREFER_CURRENCY,

                    };
                    ret.member.list.push(member_info);
                }
                defer.resolve(ret);
            },
            function(err) {
                console.log('reject phi func');
                defer.reject(err);
            }
        );
        console.log('finish loop');
        return defer.promise;

    };

    offline.getInvoiceList = function(params) {

        var defer = $q.defer();
        if (offline.db == null) offline.openDb();
        var status_sql = "";
        if (typeof params.status != "undefined" && params.status != []) {
            status_sql = status_sql + " where (";
            for (var ii = 0; ii < params.status.length; ii++) {
                if (ii != 0) {
                    status_sql = status_sql + " OR ";
                }
                status_sql = status_sql + "INVOICE.STATUS = " + params.status[ii];

            }
            status_sql = status_sql + ")";

        } else {
            status_sql = " where INVOICE.STATUS = 0";
        }

        offline.db.executeSql(
            'SELECT * from INVOICE left join (select INVOICE_ID, count(*) as ITEM_COUNT , sum(UNIT_PRICE*QTY) as ITEM_TOTAL  from INVOICE_ITEM group by INVOICE_ID) as IITEM on IITEM.INVOICE_ID = INVOICE.ID' + status_sql, [],
            function(res) {
                var ret = {
                    status: 'Y',
                    msg: '',
                    data: {
                        count: res.rows.length,
                        list: []
                    }
                };
                var invoice_charge_index = 0;
                for (var i = 0; i < res.rows.length; i++) {
                    var record = res.rows.item(i);
                    checkUndefined(record);
                    var inv_info = {
                        id: record.ID,
                        invoice_no: '',
                        item_count: emptyTozero(record.ITEM_COUNT),
                        currency: record.CURRENCY,
                        gender: emptyTozero(record.GENDER),
                        billing_last_name: record.BILLING_LAST_NAME,
                        price: emptyTozero(record.ITEM_TOTAL),
                        status_num: emptyTozero(record.STATUS),
                        invoice_date: record.INVOICE_DATE,
                        bill_to: record.BILLING_FIRST_NAME + ' ' + record.BILLING_LAST_NAME,
                        member_mobile: record.BILLING_COUNTRY_CODE + ' ' + record.BILLING_MOBILE,
                        delivery_type: record.DELIVERY_TYPE,
                        check_out_warehouse: emptyTozero(record.CHECK_OUT_WAREHOUSE_ID),
                        pick_up_warehouse_id: emptyTozero(record.PICK_UP_WAREHOUSE_ID),
                        expected_delivery_date: record.EXPECTED_DELIVERY_DATE,
                        name: 'Offline Visitor',
                        user_id: emptyTozero(record.USER_ID),
                        member_id: 0,
                        vip_level: 0,
                        member_profile: []
                    };
                    ret.data.list.push(inv_info);
                    if (inv_info.bill_to != ' ') {
                        inv_info.name = inv_info.bill_to;
                    }


                    var iid = record.ID;
                    offline.db.executeSql(
                        'SELECT * from INVOICE_CHARGES where INVOICE_ID=?', [iid],
                        function(inv_charge) {

                            var baseDiscount = 0;
                            var baseCharge = 0;
                            var baseTotal = ret.data.list[invoice_charge_index].price;

                            for (var j = 0; j < inv_charge.rows.length; j++) {
                                var invoice_charge = inv_charge.rows.item(j);
                                checkUndefined(invoice_charge);
                                if (invoice_charge.VALUE_TYPE == 'percent') {
                                    if (invoice_charge.SIGN == '+') {
                                        var totalFlag = baseTotal;
                                        baseTotal *= 1 + Number(invoice_charge.VALUE) / 100;
                                        baseCharge += baseTotal - totalFlag;
                                    } else {
                                        var totalFlag = baseTotal;
                                        baseTotal *= 1 - Number(invoice_charge.VALUE) / 100;
                                        baseDiscount += totalFlag - baseTotal;
                                    }
                                }

                            }

                            for (var j = 0; j < inv_charge.rows.length; j++) {
                                var invoice_charge = inv_charge.rows.item(j);
                                checkUndefined(invoice_charge);
                                if (invoice_charge.VALUE_TYPE != 'percent') {
                                    if (invoice_charge.SIGN == '+') {
                                        var totalFlag = baseTotal;
                                        baseTotal += Number(invoice_charge.VALUE);
                                        baseCharge += baseTotal - totalFlag;
                                    } else {
                                        var totalFlag = baseTotal;
                                        baseTotal -= Number(invoice_charge.VALUE);
                                        baseDiscount += totalFlag - baseTotal;
                                    }
                                }

                            }

                            ret.data.list[invoice_charge_index++].price = baseTotal;

                            if (res.rows.length == ret.data.list.length) {
                                defer.resolve(ret);
                            }

                        },
                        function(err) {
                            defer.reject(err);
                        });

                }
                if (res.rows.length == ret.data.list.length) {
                    console.log(ret);
                    defer.resolve(ret);
                }

            },
            function(err) {
                defer.reject(err);
            });

        return defer.promise;

    };

    offline.getInvoiceDetail = function(params) {

        var defer = $q.defer();
        if (offline.db == null) offline.openDb();
        offline.db.executeSql(
            'SELECT * from INVOICE left join (select INVOICE_ID, count(*) as ITEM_COUNT , sum(UNIT_PRICE*QTY) as ITEM_TOTAL  from INVOICE_ITEM group by INVOICE_ID) as IITEM on IITEM.INVOICE_ID = INVOICE.ID where INVOICE.ID = ?', [params.invoice_id],
            function(res) {

                var record = res.rows.item(0);
                checkUndefined(record);
                var ret = {
                    status: 'Y',
                    msg: '',
                    data: {
                        id: record.ID,
                        invoice_no: record.INVOICE_NO,
                        currency: record.CURRENCY,
                        gender: record.GENDER,
                        billing_area_id: emptyTozero(record.BILLING_AREA_ID),
                        billing_region_id: emptyTozero(record.BILLING_REGION_ID),
                        billing_district_id: emptyTozero(record.BILLING_DISTRICT_ID),
                        billing_country_id: emptyTozero(record.BILLING_COUNTRY_ID),
                        billing_address_1: record.BILLING_ADDRESS_1,
                        billing_address_2: record.BILLING_ADDRESS_2,
                        billing_address_3: record.BILLING_ADDRESS_3,
                        billing_address_4: record.BILLING_ADDRESS_4,
                        billing_first_name: record.BILLING_FIRST_NAME,
                        billing_last_name: record.BILLING_LAST_NAME,
                        billing_contact: record.BILLING_FIRST_NAME + ' ' + record.BILLING_LAST_NAME,
                        billing_email: record.BILLING_EMAIL,
                        billing_mobile: record.BILLING_COUNTRY_CODE + ' ' + record.BILLING_MOBILE,

                        pick_up_contact: record.BILLING_FIRST_NAME + ' ' + record.BILLING_LAST_NAME,
                        pick_up_first_name: record.BILLING_FIRST_NAME,
                        pick_up_last_name: record.BILLING_LAST_NAME,
                        pick_up_country_code: record.BILLING_COUNTRY_CODE,
                        pick_up_mobile: record.BILLING_MOBILE,
                        pick_up_email: record.BILLING_EMAIL,

                        shipping_area_id: emptyTozero(record.SHIPPING_AREA_ID),
                        shipping_region_id: emptyTozero(record.SHIPPING_REGION_ID),
                        shipping_district_id: emptyTozero(record.SHIPPING_DISTRICT_ID),
                        shipping_country_id: emptyTozero(record.SHIPPING_COUNTRY_ID),
                        shipping_address_1: record.BILLING_ADDRESS_1,
                        shipping_address_2: record.BILLING_ADDRESS_2,
                        shipping_address_3: record.BILLING_ADDRESS_3,
                        shipping_address_4: record.BILLING_ADDRESS_4,
                        shipping_first_name: record.SHIPPING_FIRST_NAME,
                        shipping_last_name: record.SHIPPING_LAST_NAME,
                        shipping_contact: record.SHIPPING_FIRST_NAME + ' ' + record.SHIPPING_LAST_NAME,
                        shipping_email: record.SHIPPING_EMAIL,
                        shipping_mobile: record.SHIPPING_COUNTRY_CODE + ' ' + record.SHIPPING_MOBILE,

                        currency: record.CURRENCY,
                        item_count: record.ITEM_COUNT,
                        item_total: emptyTozero(record.ITEM_TOTAL),
                        pay_method: record.PAY_METHOD,
                        status_num: emptyTozero(record.STATUS),

                        deposit: emptyTozero(record.PAYED_AMOUNT),
                        payment_type: record.PAYMENT_TYPE,
                        payed_amount: emptyTozero(record.PAYED_AMOUNT),

                        delivery_type: record.DELIVERY_TYPE,
                        remark: record.REMARK,
                        products: [],

                        invoice_date: record.INVOICE_DATE,
                        check_out_warehouse: emptyTozero(record.CHECK_OUT_WAREHOUSE_ID),
                        pick_up_warehouse_id: emptyTozero(record.PICK_UP_WAREHOUSE_ID),
                        pick_up_site: record.PICK_UP_SITE,
                        expected_delivery_date: record.EXPECTED_DELIVERY_DATE,
                        invoice_charges: [],

                        delivery_total: emptyTozero(record.DELIVERY_TOTAL),
                        refund_total: emptyTozero(record.REFUND_TOTAL),
                        refund: emptyTozero(record.REFUND_TOTAL),
                        grand_total: emptyTozero(record.ITEM_TOTAL),

                        customer_name: 'Visitor',
                        customer_info: {
                            account_no: 'visitor',
                            user_id: 0,
                            customer_name: '',
                            customer_first_name: '',
                            customer_last_name: '',
                            customer_email: '',
                            customer_country_code: '',
                            customer_mobile: '',
                            vip_level: ''
                        }
                    }
                };
                offline.db.executeSql(
                    'SELECT * from INVOICE_ITEM left join (select PRODUCT.ID, PRODUCT.NAME_EN_US, PRODUCT.NAME_ZH_HK, PRODUCT.NAME_ZH_CN, PRODUCT.HIGHLIGHT_EN_US,PRODUCT.HIGHLIGHT_ZH_HK, PRODUCT.HIGHLIGHT_ZH_CN, PRODUCT.CODE, PRODUCT.WEIGHT, PRODUCT.VOLUME, PRODUCT.REMARK, PM.ID as PHOTO_ID from PRODUCT LEFT JOIN (SELECT MIN(ID) as ID,PRODUCT_ID FROM PRODUCT_MEDIA group by PRODUCT_ID) as PM on PRODUCT.ID = PM.PRODUCT_ID) as FP on INVOICE_ITEM.PRODUCT_ID = FP.ID where INVOICE_ID=?', [record.ID],
                    function(inv_item) {

                        ret.data.item_count = inv_item.rows.length;

                        for (var i = 0; i < inv_item.rows.length; i++) {

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
                                id: invoice_item.PRODUCT_ID,
                                item_id: invoice_item.ID,
                                name: invoice_item['NAME_' + params.locale],
                                highlight: invoice_item['HIGHLIGHT_' + params.locale],
                                photo: photo_url,
                                qty: emptyTozero(invoice_item.QTY),
                                buy_qty: emptyTozero(invoice_item.QTY),
                                sku_no: invoice_item.SKU_NO,
                                code: invoice_item.CODE,
                                option: [],
                                currency: invoice_item.CURRENCY,
                                o_price: emptyTozero(invoice_item.UNIT_PRICE),
                                unit_price: emptyTozero(invoice_item.UNIT_PRICE),
                                actual_unit_price: emptyTozero(invoice_item.UNIT_PRICE),
                                sub_total: emptyTozero(invoice_item.UNIT_PRICE * invoice_item.QTY),
                                //buy_sub_total
                                //actual sub total
                                weight: invoice_item.WEIGHT,
                                volumn: invoice_item.VOLUMN,
                                remark: invoice_item.REMARK,
                            };

                            ret.data.products.push(product_info);


                        }

                        var baseDiscount = 0;
                        var baseCharge = 0;
                        var baseTotal = record.ITEM_TOTAL;

                        offline.db.executeSql(
                            'SELECT * from INVOICE_CHARGES where INVOICE_ID=?', [record.ID],
                            function(inv_charge) {

                                for (var i = 0; i < inv_charge.rows.length; i++) {
                                    var invoice_charge = inv_charge.rows.item(i);
                                    checkUndefined(invoice_charge);

                                    var charge_info = {
                                        title_EN_US: invoice_charge.NAME_EN_US,
                                        title_ZH_HK: invoice_charge.NAME_ZH_HK,
                                        title_ZH_CN: invoice_charge.NAME_ZH_CN,
                                        sign: invoice_charge.SIGN,
                                        type: invoice_charge.TYPE,
                                        value_type: invoice_charge.VALUE_TYPE,
                                        value: invoice_charge.VALUE,

                                    };
                                    ret.data.invoice_charges.push(charge_info);

                                }

                                for (var i = 0; i < inv_charge.rows.length; i++) {
                                    var invoice_charge = inv_charge.rows.item(i);
                                    checkUndefined(invoice_charge);
                                    if (invoice_charge.VALUE_TYPE == 'percent') {
                                        if (invoice_charge.SIGN == '+') {
                                            var totalFlag = baseTotal;
                                            baseTotal *= 1 + Number(invoice_charge.VALUE) / 100;
                                            baseCharge += baseTotal - totalFlag;
                                        } else {
                                            var totalFlag = baseTotal;
                                            baseTotal *= 1 - Number(invoice_charge.VALUE) / 100;
                                            baseDiscount += totalFlag - baseTotal;
                                        }
                                    }

                                }

                                for (var i = 0; i < inv_charge.rows.length; i++) {
                                    var invoice_charge = inv_charge.rows.item(i);
                                    checkUndefined(invoice_charge);
                                    if (invoice_charge.VALUE_TYPE != 'percent') {
                                        if (invoice_charge.SIGN == '+') {
                                            var totalFlag = baseTotal;
                                            baseTotal += Number(invoice_charge.VALUE);
                                            baseCharge += baseTotal - totalFlag;
                                        } else {
                                            var totalFlag = baseTotal;
                                            baseTotal -= Number(invoice_charge.VALUE);
                                            baseDiscount += totalFlag - baseTotal;
                                        }
                                    }

                                }

                                ret.data.grand_total = baseTotal;


                                defer.resolve(ret);

                            },
                            function(err) {
                                defer.reject(err);
                            });


                        //defer.resolve(ret); 

                    },
                    function(err) {
                        defer.reject(err);
                    });

            },
            function(err) {
                defer.reject(err);
            });

        return defer.promise;

    };

    offline.newCart = function(params) {
        var defer = $q.defer();
        if (offline.db == null) offline.openDb();
        var time_now = new Date();
        var timestamp = time_now.getTime();
        var beautiful_time = '' + time_now.getFullYear() + '-' + (time_now.getMonth() + 1) + '-' + time_now.getDate() + ' ' + time_now.getHours() + ':' + time_now.getMinutes() + ':' + time_now.getSeconds();

        if (typeof params.user_id != "undefined" && params.user_id != null) {
            offline.db.executeSql(
                'SELECT * FROM MEMBER_PROFILE where USER_ID = ?', [params.user_id],
                function(member_res_original) {

                    if (member_res_original.rows.length != 0) {
                        ret = {
                            status: 'Y',
                            msg: ''
                        }
                        member_res = member_res_original.rows.item(0);
                        checkUndefined(member_res);
                        offline.db.executeSql(
                            'INSERT INTO INVOICE (CREATE_DATE, UPDATE_DATE, INVOICE_DATE, STATUS, BILLING_FIRST_NAME, BILLING_LAST_NAME, GENDER, CHECK_OUT_WAREHOUSE_ID, USER_ID, BILLING_EMAIL, BILLING_COUNTRY_CODE, BILLING_MOBILE) VALUES (?,?,?, ?, ?, ?,?,?,?, ?, ?, ?)', [timestamp, timestamp, beautiful_time, 0, member_res.FIRST_NAME, member_res.LAST_NAME, member_res.GENDER, params.check_out_warehouse_id, params.user_id, member_res.EMAIL, member_res.COUNTRY, member_res.MOBILE],
                            function(tx, res) {
                                var ret = {
                                    status: 'Y',
                                    msg: '',
                                    invoice_id: tx.insertId,
                                    billing_last_name: member_res.LAST_NAME,
                                    gender: member_res.GENDER,
                                };


                                defer.resolve(ret);

                            },
                            function(err) {
                                defer.reject(err);
                            });
                    } else {
                        ret = {
                            status: 'E',
                            msg: 'no such member'
                        }
                        defer.resolve(ret);
                    }


                },
                function(err) {
                    defer.reject(err);
                });

        } else {
            offline.db.executeSql(
                'INSERT INTO INVOICE (CREATE_DATE, UPDATE_DATE, INVOICE_DATE, STATUS, BILLING_LAST_NAME, GENDER, CHECK_OUT_WAREHOUSE_ID) VALUES (?, ?,?,?,?, ?, ?)', [timestamp, timestamp, beautiful_time, 0, params.billing_last_name, params.gender, params.check_out_warehouse_id],
                function(tx, res) {
                    var ret = {
                        status: 'Y',
                        msg: '',
                        invoice_id: tx.insertId,
                        billing_last_name: params.billing_last_name,
                        gender: params.gender,
                    };


                    defer.resolve(ret);

                },
                function(err) {
                    defer.reject(err);
                });
        }



        return defer.promise;
    };

    offline.setCart = function(params) {
        var defer = $q.defer();
        switch (params.action) {
            case 'read':
                offline.getInvoiceDetail({

                    invoice_id: params.invoice_id

                }).then(function(ret) {

                    defer.resolve(ret);

                });
                break;
            case 'add':
                offline.addToCart({

                    params: params



                }).then(function(ret) {

                    offline.getInvoiceDetail({

                        invoice_id: params.invoice_id

                    }).then(function(ret) {

                        defer.resolve(ret);

                    });

                });


                break;
            case 'update':
                offline.updateCart({

                    params: params



                }).then(function(ret) {

                    offline.getInvoiceDetail({

                        invoice_id: params.invoice_id

                    }).then(function(ret) {

                        defer.resolve(ret);

                    });

                });

                break;
            case 'remove':
                offline.removeFromCart({

                    params: params



                }).then(function(ret) {

                    offline.getInvoiceDetail({

                        invoice_id: params.invoice_id

                    }).then(function(ret) {

                        defer.resolve(ret);

                    });

                });
                break;
            case 'empty':
                break;
            case 'delete':
                offline.deleteCart({

                    params: params



                }).then(function(ret) {

                    defer.resolve(ret);


                });

                break;
            case 'address':

                offline.addressCart({

                    params: params



                }).then(function(ret) {

                    offline.getInvoiceDetail({

                        invoice_id: params.invoice_id

                    }).then(function(ret) {

                        defer.resolve(ret);

                    });

                });


                break;
        }
        return defer.promise;
    };

    offline.addToCart = function(o_params) {
        var defer = $q.defer();
        if (offline.db == null) offline.openDb();
        var time_now = new Date();
        var timestamp = time_now.getTime();
        var params = o_params.params;
        var sku = '';
        if (typeof params.spec != "undefined") {

            sku = encodePreSku(params.spec);
        }
        sku = sku + 'P' + params.product_id.toString(16);
        if (typeof params.sku_no != "undefined") {
            sku = params.sku_no;
        }



        offline.db.executeSql('SELECT * FROM "PRODUCT_SKU_INFO" WHERE "SKU_NO" = ?', [sku], function(find_sku_res) {


            if (find_sku_res.rows.length != 0) {
                var sku_inf = find_sku_res.rows.item(0);
                offline.db.executeSql('SELECT * FROM "INVOICE_ITEM" WHERE "INVOICE_ID" = ? AND "PRODUCT_ID" = ? and "SKU_NO" = ?', [params.invoice_id, params.product_id, sku], function(res) {

                    var ret = {
                        status: 'Y',
                        msg: ''
                    }

                    if (false) {
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
                    } else {
                        //console.log('enter else');
                        offline.db.executeSql('INSERT INTO "INVOICE_ITEM" (CREATE_DATE, UPDATE_DATE, INVOICE_ID, PRODUCT_ID, UNIT_PRICE, QTY, SKU_NO, STATUS) VALUES(?,?,?,?,?,?,?,?)', [timestamp, timestamp, params.invoice_id, params.product_id, sku_inf.PRICE, params.qty, sku, 0], function(tx, add_res) {
                            //console.log(add_res);
                            //console.log('added');
                            //update stock
                            var ret = {
                                status: 'Y',
                                msg: '',
                                item_id: tx.insertId
                            }

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
            } else {
                var ret = {
                    status: 'E',
                    msg: 'sku not found'
                }
                defer.resolve(ret);
            }

        }, function(err) {
            //console.log(err);
            defer.reject(err);
        });

        return defer.promise;
    };

    offline.updateCart = function(o_params) {
        var defer = $q.defer();
        if (offline.db == null) offline.openDb();
        var time_now = new Date();
        var timestamp = time_now.getTime();
        var params = o_params.params;
        var sku = '';
        if (typeof params.spec != "undefined") {

            sku = encodePreSku(params.spec);
        }
        sku = sku + 'P' + params.product_id.toString(16);
        if (typeof params.sku_no != "undefined") {
            sku = params.sku_no;
        }



        offline.db.executeSql('SELECT * FROM "PRODUCT_SKU_INFO" WHERE "SKU_NO" = ?', [sku], function(find_sku_res) {


            if (find_sku_res.rows.length != 0) {
                var sku_inf = find_sku_res.rows.item(0);

                var exec_sql = 'SELECT * FROM "INVOICE_ITEM" WHERE "INVOICE_ID" = ' + params.invoice_id + ' AND "PRODUCT_ID" = ' + params.product_id + ' and "SKU_NO" = ' + sku + '';

                if (typeof params.item_id != "undefined") {
                    exec_sql = 'SELECT * FROM "INVOICE_ITEM" WHERE "ID" = ' + params.item_id;
                }

                offline.db.executeSql(exec_sql, [], function(res) {

                    var ret = {
                        status: 'Y',
                        msg: ''
                    }

                    if (res.rows.length != 0) {
                        var record = res.rows.item(0);
                        checkUndefined(record);
                        offline.db.executeSql('UPDATE "INVOICE_ITEM" set "QTY" = ? where ID = ?', [params.qty, record.ID], function(update_res) {
                            //console.log('updated');
                            //update stock
                            offline.db.executeSql('UPDATE "PRODUCT_STOCK" set "QTY" = "QTY" - ? where SKU_NO = ? and WAREHOUSE_ID = ?', [params.qty - record.QTY, sku, params.warehouse_id], function(update_stock_res) {
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
                    } else {
                        //console.log('enter else');
                        offline.db.executeSql('INSERT INTO "INVOICE_ITEM" (CREATE_DATE, UPDATE_DATE, INVOICE_ID, PRODUCT_ID, UNIT_PRICE, QTY, SKU_NO, STATUS) VALUES(?,?,?,?,?,?,?,?)', [timestamp, timestamp, params.invoice_id, params.product_id, sku_inf.PRICE, params.qty, sku, 0], function(tx, add_res) {
                            //console.log(add_res);
                            //console.log('added');
                            //update stock
                            var ret = {
                                status: 'Y',
                                msg: '',
                                item_id: tx.insertId
                            }

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
            } else {
                var ret = {
                    status: 'E',
                    msg: 'sku not found'
                }
                defer.resolve(ret);
            }

        }, function(err) {
            //console.log(err);
            defer.reject(err);
        });

        return defer.promise;
    };

    offline.removeFromCart = function(o_params) {
        var defer = $q.defer();
        if (offline.db == null) offline.openDb();
        var time_now = new Date();
        var timestamp = time_now.getTime();
        var params = o_params.params;
        var sku = '';
        if (typeof params.spec != "undefined") {

            sku = encodePreSku(params.spec);
        }
        sku = sku + 'P' + params.product_id.toString(16);
        if (typeof params.sku_no != "undefined") {
            sku = params.sku_no;
        }



        offline.db.executeSql('SELECT * FROM "PRODUCT_SKU_INFO" WHERE "SKU_NO" = ?', [sku], function(find_sku_res) {


            if (find_sku_res.rows.length != 0) {
                var sku_inf = find_sku_res.rows.item(0);

                var exec_sql = 'SELECT * FROM "INVOICE_ITEM" WHERE "INVOICE_ID" = ' + params.invoice_id + ' AND "PRODUCT_ID" = ' + params.product_id + ' and "SKU_NO" = ' + sku + '';

                if (typeof params.item_id != "undefined") {
                    exec_sql = 'SELECT * FROM "INVOICE_ITEM" WHERE "ID" = ' + params.item_id;
                }


                offline.db.executeSql(exec_sql, [], function(res) {

                    var ret = {
                        status: 'Y',
                        msg: ''
                    }

                    if (res.rows.length != 0) {
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



                    } else {
                        //console.log('enter else');
                        ret.status = 'E';
                        defer.resolve(ret);
                    }


                }, function(err) {
                    //console.log(err);
                    defer.reject(err);
                });
            } else {
                var ret = {
                    status: 'E',
                    msg: 'sku not found'
                }
                defer.resolve(ret);
            }

        }, function(err) {
            //console.log(err);
            defer.reject(err);
        });

        return defer.promise;
    };

    offline.deleteCart = function(o_params) {
        var defer = $q.defer();
        if (offline.db == null) offline.openDb();
        var time_now = new Date();
        var timestamp = time_now.getTime();
        var params = o_params.params;

        offline.db.executeSql('SELECT * FROM INVOICE_ITEM where INVOICE_ID = ?', [params.invoice_id], function(item_res) {

            for (var ii = 0; ii < item_res.rows.length; ii++) {
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
                    status: 'Y',
                    msg: ''
                }


                offline.db.executeSql('DELETE FROM "INVOICE_CHARGES" where INVOICE_ID = ?', [params.invoice_id], function(res) {


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

    offline.addressCart = function(o_params) {
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
        if (params.delivery_type == 'pick up') {
            b_fn = params.pick_up_first_name;
            b_ln = params.pick_up_last_name;
            b_country_code = params.pick_up_country_code;
            b_mobile = params.pick_up_mobile;
            b_email = params.pick_up_email;
        }
        offline.db.executeSql('UPDATE "INVOICE" set BILLING_FIRST_NAME = ?, BILLING_LAST_NAME = ?, BILLING_EMAIL = ?, BILLING_COUNTRY_CODE = ?, BILLING_MOBILE = ?, REMARK = ?, DELIVERY_TYPE = ?, PAYMENT_TYPE = ?, PAYED_AMOUNT = ?, PICK_UP_WAREHOUSE_ID = ?, PICK_UP_SITE = ? where ID = ?', [b_fn, b_ln, b_email, b_country_code, b_mobile, params.remark, params.delivery_type, params.payment_type, params.payed_amount, pick_warehouse_id, params.pick_up_site, params.invoice_id], function(res) {
            //console.log('good sql');
            var ret = {
                    status: 'Y',
                    msg: ''
                }
                // defer.resolve(ret); 

            offline.db.executeSql('DELETE FROM "INVOICE_CHARGES" where INVOICE_ID = ?', [params.invoice_id], function(res) {

                var ret = {
                    status: 'Y',
                    msg: '',
                }

                if (typeof params.invoice_charges != "undefined") {
                    var charge_array = JSON.parse(params.invoice_charges);
                    for (var c = 0; c < charge_array.length; c++) {
                        offline.db.executeSql('INSERT INTO "INVOICE_CHARGES" (CREATE_DATE, UPDATE_DATE, INVOICE_ID, NAME_EN_US, NAME_ZH_HK, NAME_ZH_CN, SIGN, TYPE,VALUE_TYPE,VALUE) VALUES(?,?,?,?,?,?,?,?,?,?)', [timestamp, timestamp, params.invoice_id, charge_array[c].title_EN_US, charge_array[c].title_ZH_HK, charge_array[c].title_ZH_CN, charge_array[c].sign, charge_array[c].type, charge_array[c].value_type, charge_array[c].value], function(charge_res) {

                            if (c == charge_array.length) {
                                defer.resolve(ret);
                            }


                        }, function(err) {
                            //console.log('error');
                            //console.log(err);
                            defer.reject(err);
                        });
                    }
                    if (charge_array.length == 0) {
                        defer.resolve(ret);
                    }
                } else {
                    defer.resolve(ret);
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

    offline.checkOut = function(params) {
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
        if (params.delivery_type == 'pick up') {
            b_fn = params.pick_up_first_name;
            b_ln = params.pick_up_last_name;
            b_country_code = params.pick_up_country_code;
            b_mobile = params.pick_up_mobile;
            b_email = params.pick_up_email;
        }
        var invoice_no = 'OFFLINE-' + time_now.getMonth() + time_now.getDate() + params.invoice_id;
        var qr = new QRious({ value: invoice_no });
        var invoice_no_qr = qr.toDataURL();

        offline.db.executeSql('UPDATE "INVOICE" set BILLING_FIRST_NAME = ?, BILLING_LAST_NAME = ?, BILLING_EMAIL = ?, BILLING_COUNTRY_CODE = ?, BILLING_MOBILE = ?, REMARK = ?, DELIVERY_TYPE = ?, PAYMENT_TYPE = ?, PAYED_AMOUNT = ?, PAY_METHOD = ?, INVOICE_NO = ?, PICK_UP_WAREHOUSE_ID = ?, PICK_UP_SITE = ? where ID = ?', [b_fn, b_ln, b_email, b_country_code, b_mobile, params.remark, params.delivery_type, params.payment_type, params.payed_amount, params.pay_method, invoice_no, pick_warehouse_id, params.pick_up_site, params.invoice_id],
            function(res) {

                var ret = {
                    status: 'Y',
                    msg: '',
                    invoice_id: params.invoice_id,
                    invoice_no: invoice_no,
                    pdf: pdfPath,
                    data: []
                }

                offline.db.executeSql('DELETE FROM "INVOICE_CHARGES" where INVOICE_ID = ?', [params.invoice_id], function(res) {

                    // var ret = {
                    //     status : 'Y',
                    //     msg : '',
                    //     invoice_id : params.invoice_id,
                    //     invoice_no : invoice_no,
                    //     pdf : $helper.getRootPath() + '/invoice.pdf'
                    // }

                    if (typeof params.invoice_charges != "undefined") {
                        var charge_array = JSON.parse(params.invoice_charges);
                        for (var c = 0; c < charge_array.length; c++) {
                            offline.db.executeSql('INSERT INTO "INVOICE_CHARGES" (CREATE_DATE, UPDATE_DATE, INVOICE_ID, NAME_EN_US, NAME_ZH_HK, NAME_ZH_CN, SIGN, TYPE,VALUE_TYPE,VALUE) VALUES(?,?,?,?,?,?,?,?,?,?)', [timestamp, timestamp, params.invoice_id, charge_array[c].title_EN_US, charge_array[c].title_ZH_HK, charge_array[c].title_ZH_CN, charge_array[c].sign, charge_array[c].type, charge_array[c].value_type, charge_array[c].value], function(charge_res) {
                                console.log(c);
                                if (c == charge_array.length) {
                                    offline.getInvoiceDetail(params).then(function(detail_ret) {
                                        console.log(JSON.stringify(detail_ret));
                                        ret.data = detail_ret.data;

                                        var products = [];
                                        var i = 1;

                                        angular.forEach(detail_ret.data.products, function(p) {

                                            var dis = '';
                                            if ((p.o_price - p.unit_price) / p.o_price == 0) {
                                                dis = '- ';
                                            } else {
                                                dis = (p.o_price - p.unit_price) / p.o_price + '%';
                                            }
                                            products.push({
                                                ITEM_NO: i,
                                                PRODUCT_CODE: p.code,
                                                PRODUCT_NAME: p.name,
                                                QTY: p.buy_qty,
                                                UNIT_PRICE: p.unit_price,
                                                DISCOUNT: dis,
                                                SUB_TOTAL: '$' + p.sub_total.toFixed(2)
                                            });
                                            i++;
                                        });

                                        var charges = [];
                                        angular.forEach(detail_ret.data.invoice_charges, function(c) {
                                            var charge_value = '';
                                            if (c.sign == '+') {
                                                if (c.value_type == 'value') {
                                                    charge_value = '$' + c.value.toFixed(2);
                                                } else {
                                                    charge_value = c.value.toFixed(2) + '%';
                                                }
                                            } else {
                                                if (c.value_type == 'value') {
                                                    charge_value = '($' + c.value.toFixed(2) + ')';
                                                } else {
                                                    charge_value = '(' + c.value.toFixed(2) + '%)';
                                                }
                                            }
                                            charges.push({
                                                CHARGE_NAME: c.title_EN_US,
                                                CHARGE_VALUE: charge_value,
                                                CHARGE_VALUE_TYPE: c.value_type,
                                                CHARGE_SIGN: c.sign
                                            });
                                        });

                                        offline.invoicePdf({
                                            size: '80mm', // '80mm',
                                            images: {
                                                COMPANY_LOGO: 'data:image/png;base64,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',
                                                INVOICE_QR: invoice_no_qr,
                                                SHOP_QR: 'data:image/png;base64,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'
                                            },
                                            data: {
                                                INVOICE_NO: detail_ret.data.invoice_no,
                                                MEMBER_CLASS: detail_ret.data.customer_info.account_no,
                                                INVOICE_DATE: detail_ret.data.invoice_date,
                                                CUSTOMER_DETAIL: detail_ret.data.customer_info.customer_name + '<br /> \
                                                                Tel: ' + detail_ret.data.customer_info.customer_country_code + ' ' + detail_ret.data.customer_info.customer_mobile + '<br /> \
                                                                Email: ' + detail_ret.data.customer_info.customer_email + '<br />',
                                                DELIVERY_ADDRESS: detail_ret.data.customer_info.shipping_address_1,
                                                SALESMAN: 'Sales',
                                                PRODUCT_ITEM: products,
                                                CHARGE_ITEM: charges,
                                                PAYMENT_METHOD: detail_ret.data.pay_method,
                                                REMARKS: detail_ret.data.remark,
                                                ITEM_TOTAL: '$' + detail_ret.data.item_total.toFixed(2),
                                                GRAND_TOTAL: '$' + detail_ret.data.grand_total.toFixed(2),
                                                SHOP_NAME: 'MushroomHK-MK',
                                                SHOP_TEL: '2625 1162',
                                                SHOP_EMAIL: 'info@mushroom.hk',
                                            }

                                        }).then(function(res) {
                                            defer.resolve(res);

                                        }).catch(function(err) {
                                            alert('fail');
                                        });
                                    });
                                }
                            }, function(err) {
                                //console.log('error');
                                //console.log(err);
                                defer.reject(err);
                            });
                        }
                        if (charge_array.length == 0) {

                            offline.getInvoiceDetail(params).then(function(detail_ret) {
                                console.log(JSON.stringify(detail_ret));
                                ret.data = detail_ret.data;

                                var products = [];
                                var i = 1;

                                angular.forEach(detail_ret.data.products, function(p) {

                                    var dis = '';
                                    if ((p.o_price - p.unit_price) / p.o_price == 0) {
                                        dis = '- ';
                                    } else {
                                        dis = (p.o_price - p.unit_price) / p.o_price + '%';
                                    }
                                    products.push({
                                        ITEM_NO: i,
                                        PRODUCT_CODE: p.code,
                                        PRODUCT_NAME: p.name,
                                        QTY: p.buy_qty,
                                        UNIT_PRICE: p.unit_price,
                                        DISCOUNT: dis,
                                        SUB_TOTAL: '$' + p.sub_total.toFixed(2)
                                    });
                                    i++;
                                });

                                var charges = [];
                                angular.forEach(detail_ret.data.invoice_charges, function(c) {
                                    var charge_value = '';
                                    if (c.sign == '+') {
                                        if (c.value_type == 'value') {
                                            charge_value = '$' + c.value.toFixed(2);
                                        } else {
                                            charge_value = c.value.toFixed(2) + '%';
                                        }
                                    } else {
                                        if (c.value_type == 'value') {
                                            charge_value = '($' + c.value.toFixed(2) + ')';
                                        } else {
                                            charge_value = '(' + c.value.toFixed(2) + '%)';
                                        }
                                    }
                                    charges.push({
                                        CHARGE_NAME: c.title_EN_US,
                                        CHARGE_VALUE: charge_value,
                                        CHARGE_VALUE_TYPE: c.value_type,
                                        CHARGE_SIGN: c.sign
                                    });
                                });

                                offline.invoicePdf({
                                    size: '80mm', // '80mm',
                                    images: {
                                        COMPANY_LOGO: 'data:image/png;base64,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',
                                        INVOICE_QR: invoice_no_qr,
                                        SHOP_QR: 'data:image/png;base64,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'
                                    },
                                    data: {
                                        INVOICE_NO: detail_ret.data.invoice_no,
                                        MEMBER_CLASS: detail_ret.data.customer_info.account_no,
                                        INVOICE_DATE: detail_ret.data.invoice_date,
                                        CUSTOMER_DETAIL: detail_ret.data.customer_info.customer_name + '<br /> \
                                                                Tel: ' + detail_ret.data.customer_info.customer_country_code + ' ' + detail_ret.data.customer_info.customer_mobile + '<br /> \
                                                                Email: ' + detail_ret.data.customer_info.customer_email + '<br />',
                                        DELIVERY_ADDRESS: detail_ret.data.customer_info.shipping_address_1,
                                        SALESMAN: 'Sales',
                                        PRODUCT_ITEM: products,
                                        CHARGE_ITEM: charges,
                                        PAYMENT_METHOD: detail_ret.data.pay_method,
                                        REMARKS: detail_ret.data.remark,
                                        ITEM_TOTAL: '$' + detail_ret.data.item_total.toFixed(2),
                                        GRAND_TOTAL: '$' + detail_ret.data.grand_total.toFixed(2),
                                        SHOP_NAME: 'MushroomHK-MK',
                                        SHOP_TEL: '2625 1162',
                                        SHOP_EMAIL: 'info@mushroom.hk',
                                    }

                                }).then(function(res) {
                                    defer.resolve(res);

                                }).catch(function(err) {
                                    alert('fail');
                                });
                            });
                        }

                    } else {
                        offline.getInvoiceDetail(params).then(function(detail_ret) {
                            console.log(JSON.stringify(detail_ret));
                            ret.data = detail_ret.data;

                            var products = [];
                            var i = 1;

                            angular.forEach(detail_ret.data.products, function(p) {

                                var dis = '';
                                if ((p.o_price - p.unit_price) / p.o_price == 0) {
                                    dis = '- ';
                                } else {
                                    dis = (p.o_price - p.unit_price) / p.o_price + '%';
                                }
                                products.push({
                                    ITEM_NO: i,
                                    PRODUCT_CODE: p.code,
                                    PRODUCT_NAME: p.name,
                                    QTY: p.buy_qty,
                                    UNIT_PRICE: p.unit_price,
                                    DISCOUNT: dis,
                                    SUB_TOTAL: '$' + p.sub_total.toFixed(2)
                                });
                                i++;
                            });

                            var charges = [];
                            angular.forEach(detail_ret.data.invoice_charges, function(c) {
                                var charge_value = '';
                                if (c.sign == '+') {
                                    if (c.value_type == 'value') {
                                        charge_value = '$' + c.value.toFixed(2);
                                    } else {
                                        charge_value = c.value.toFixed(2) + '%';
                                    }
                                } else {
                                    if (c.value_type == 'value') {
                                        charge_value = '($' + c.value.toFixed(2) + ')';
                                    } else {
                                        charge_value = '(' + c.value.toFixed(2) + '%)';
                                    }
                                }
                                charges.push({
                                    CHARGE_NAME: c.title_EN_US,
                                    CHARGE_VALUE: charge_value,
                                    CHARGE_VALUE_TYPE: c.value_type,
                                    CHARGE_SIGN: c.sign
                                });
                            });

                            offline.invoicePdf({
                                size: '80mm', // '80mm',
                                images: {
                                    COMPANY_LOGO: 'data:image/png;base64,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',
                                    INVOICE_QR: invoice_no_qr,
                                    SHOP_QR: 'data:image/png;base64,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'
                                },
                                data: {
                                    INVOICE_NO: detail_ret.data.invoice_no,
                                    MEMBER_CLASS: detail_ret.data.customer_info.account_no,
                                    INVOICE_DATE: detail_ret.data.invoice_date,
                                    CUSTOMER_DETAIL: detail_ret.data.customer_info.customer_name + '<br /> \
                                                                Tel: ' + detail_ret.data.customer_info.customer_country_code + ' ' + detail_ret.data.customer_info.customer_mobile + '<br /> \
                                                                Email: ' + detail_ret.data.customer_info.customer_email + '<br />',
                                    DELIVERY_ADDRESS: detail_ret.data.customer_info.shipping_address_1,
                                    SALESMAN: 'Sales',
                                    PRODUCT_ITEM: products,
                                    CHARGE_ITEM: charges,
                                    PAYMENT_METHOD: detail_ret.data.pay_method,
                                    REMARKS: detail_ret.data.remark,
                                    ITEM_TOTAL: '$' + detail_ret.data.item_total.toFixed(2),
                                    GRAND_TOTAL: '$' + detail_ret.data.grand_total.toFixed(2),
                                    SHOP_NAME: 'MushroomHK-MK',
                                    SHOP_TEL: '2625 1162',
                                    SHOP_EMAIL: 'info@mushroom.hk',
                                }

                            }).then(function(res) {
                                defer.resolve(res);

                            }).catch(function(err) {
                                alert('fail');
                            });
                        });
                    }
                }, function(err) {
                    //console.log(err);
                    defer.reject(err);
                });
            },
            function(err) {
                //console.log(err);
                defer.reject(err);
            });
        return defer.promise;
    }

    offline.confirmPayment = function(params) {
        var defer = $q.defer();
        if (offline.db == null) offline.openDb();

        checkUndefined(params);
        //console.log('in confirm');
        offline.db.executeSql('UPDATE "INVOICE" set STATUS = ? where ID = ?', [1, params.invoice_id], function(res) {

            var ret = {
                status: 'Y',
                msg: '',
                invoice_id: params.invoice_id,
            }

            //console.log(ret);
            defer.resolve(ret);
        }, function(err) {
            //console.log(err);
            defer.reject(err);
        });
        return defer.promise;
    }

    offline.getProductList = function(params) {

        var defer = $q.defer();
        if (offline.db == null) offline.openDb();
        var cat_param = "";
        if (params.category_ids && Array.isArray(params.category_ids)) {

            cat_param = cat_param + " AND (";
            for (var n = 0; n < params.category_ids.length; n++) {
                if (n != 0) {
                    cat_param = cat_param + ' OR '
                }
                cat_param = cat_param + "CATEGORY_IDS LIKE '%," + params.category_ids[n] + ",%'";

            }
            cat_param = cat_param + ')';
        }
        var search = "";
        console.log(params.keyword);
        if (typeof params.keyword != "undefined" && params.keyword != null) {
            search = search + " AND (";
            search = search + "NAME_EN_US LIKE '%" + params.keyword + "%' OR ";
            search = search + "NAME_ZH_HK LIKE '%" + params.keyword + "%' OR ";
            search = search + "NAME_ZH_CN LIKE '%" + params.keyword + "%')";

        }
        var limit_from = 0;
        var limit = 20;
        if (typeof params.limit_from != "undefined" && params.limit_from != null) {
            limit_from = params.limit_from;
        }
        if (typeof params.limit != "undefined" && params.limit != null) {
            limit = params.limit;
        }
        //console.log('!!!!!!!!');
        //console.log(params);
        //console.log(cat_param);
        //console.log(search);

        console.log('SELECT * from PRODUCT LEFT JOIN (SELECT MIN(ID) as ID,PRODUCT_ID FROM PRODUCT_MEDIA group by PRODUCT_ID) as PM on PRODUCT.ID = PM.PRODUCT_ID where PRODUCT.ENABLE_FOR_POS = 1 ' + cat_param + search + ' ORDER BY PRODUCT.SORTING DESC, PRODUCT.ID DESC LIMIT ? OFFSET ? ');
        offline.db.executeSql(
            'SELECT PRODUCT.*, PRODUCT_MEDIA.ID AS MEDIA_ID FROM PRODUCT LEFT OUTER JOIN PRODUCT_MEDIA ON PRODUCT.ID = PRODUCT_MEDIA.PRODUCT_ID WHERE PRODUCT.ENABLE_FOR_POS = 1 ' + cat_param + search + ' GROUP BY PRODUCT.ID ORDER BY PRODUCT.SORTING DESC, PRODUCT.ID DESC', [],
            //         offline.db.executeSql(
            //             'SELECT * from PRODUCT LEFT JOIN (SELECT MIN(ID) as ID,PRODUCT_ID FROM PRODUCT_MEDIA group by PRODUCT_ID) as PM on PRODUCT.ID = PM.PRODUCT_ID where PRODUCT.ENABLE_FOR_POS = 1 ' + cat_param + search + ' ORDER BY PRODUCT.SORTING DESC, PRODUCT.ID DESC', [],
            function(res) {
                console.log(res);
                var ret = {
                    status: 'Y',
                    msg: '',
                    data: {
                        advertisements: {
                            count: 0,
                            list: []
                        },
                        products: {
                            count: res.rows.length,
                            list: []
                        }

                    }
                };
                //console.log('cao~~~'+res.rows.length);
                for (var i = limit_from; i < limit + limit_from && i < res.rows.length; i++) {

                    var record = res.rows.item(i);
                    var photo_url = $helper.getRootPath() + secondPath + record.MEDIA_ID;

                    checkUndefined(record);
                    var product_info = {
                        id: record.ID,
                        code: record.CODE,
                        gift: record.GIFT,
                        category_ids: record.CATEGORY_IDS.substring(1, record.CATEGORY_IDS.length - 1).split(","),
                        name: record['NAME_' + params.locale],
                        highlight: record['HIGHLIGHT_' + params.locale],
                        photo: photo_url,
                        currency: record.CURRENCY,
                        price: record.OFF_PRICE,
                        //specifications : offline.getProductSpec(record.ID),
                        //original_price : offline.getProductPrice(record.ID, record.CURRENCY),
                        qty: record.QTY,
                        presale_qty: record.PRESALE_QTY,
                        sorting: record.SORTING,
                        enabled: record.ENABLED,
                        enable_for_pos: record.ENABLE_FOR_POS,
                        show_price: record.SHOP_PRICE,
                        specifications: JSON.parse(record.SPEC_FOR_OFFLINE)
                    };
                    //SERVER.http + $localStorage.get('activate').prefix + $localStorage.get('activate').path + SERVER.subdomain +

                    ret.data.products.list.push(product_info);





                }
                defer.resolve(ret);
                //console.log('return la');
            },
            function(err) {
                console.log(err);
                defer.reject(err);
            });

        return defer.promise;

    };


    offline.getProductDetail = function(params) {

        var defer = $q.defer();
        if (offline.db == null) offline.openDb();
        var cat_param = "";

        offline.db.executeSql(
            'SELECT * from PRODUCT LEFT JOIN (SELECT ID, PRODUCT_ID FROM PRODUCT_MEDIA) as PM on PRODUCT.ID = PM.PRODUCT_ID where PRODUCT.ID = ? ', [params.product_id],
            function(res) {

                var record = res.rows.item(0);
                checkUndefined(record);
                var ret = {
                    status: 'Y',
                    msg: '',
                    data: {
                        id: record.PRODUCT_ID,
                        code: record.CODE,
                        gift: record.GIFT,
                        //shop_name
                        category_ids: record.CATEGORY_IDS.substring(1, record.CATEGORY_IDS.length - 1).split(","),
                        name: record['NAME_' + params.locale],
                        name_en_us: record.NAME_EN_US,
                        name_zh_hk: record.NAME_ZH_HK,
                        name_zh_cn: record.NAME_ZH_CN,

                        highlight: record['HIGHLIGHT_' + params.locale],
                        highlight_en_us: record.HIGHLIGHT_EN_US,
                        highlight_zh_hk: record.HIGHLIGHT_ZH_HK,
                        highlight_zh_cn: record.HIGHLIGHT_ZH_CN,

                        content: record['CONTENT_' + params.locale],
                        content_en_us: record.CONTENT_EN_US,
                        content_zh_hk: record.CONTENT_ZH_HK,
                        content_zh_cn: record.CONTENT_ZH_CN,
                        photos: [],
                        currency: record.CURRENCY,
                        price: record.OFF_PRICE,
                        //specifications : offline.getProductSpec(record.ID),
                        //original_price : offline.getProductPrice(record.ID, record.CURRENCY),
                        qty: record.QTY,
                        sorting: record.SORTING,
                        enabled: record.ENABLED,
                        enable_for_pos: record.ENABLE_FOR_POS,
                        show_price: record.SHOP_PRICE,
                        remark: record.REMARK,
                        specifications: JSON.parse(record.SPEC_FOR_OFFLINE)

                    }
                };
                for (var i = 0; i < res.rows.length; i++) {

                    var record = res.rows.item(i);
                    var photo_url = $helper.getRootPath() + secondPath + record.ID;

                    ret.data.photos.push(photo_url);

                }

                defer.resolve(ret);
                //console.log('return la');
            },
            function(err) {
                defer.reject(err);
            });

        return defer.promise;

    };

    offline.getSKUInfo = function(params) {

        var defer = $q.defer();
        if (offline.db == null) offline.openDb();
        var cat_param = "";

        var sku = '';
        if (typeof params.spec != "undefined") {

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
        if (typeof params.sku_no != "undefined") {
            sku = params.sku_no;
        }
        //console.log(sku);

        offline.db.executeSql(
            'SELECT * from ((select * from PRODUCT_SKU_INFO where SKU_NO = ?) as F_SKU left join (select ID, NAME_EN_US, NAME_ZH_HK, NAME_ZH_CN from PRODUCT) as SHORT_P on F_SKU.PRODUCT_ID = SHORT_P.ID) as PSI left join (select * from PRODUCT_STOCK where PRODUCT_STOCK.WAREHOUSE_ID = ?) as F_PS on F_PS.SKU_NO = PSI.SKU_NO', [sku, params.warehouse_id],
            function(res) {
                var record = res.rows.item(0);
                checkUndefined(record);

                var ret = {
                    status: 'Y',
                    msg: '',
                    product_id: record.PRODUCT_ID,
                    product_name: record['NAME_' + params.locale],
                    remarks: '------',
                    reserved_amount: 0,
                    local_qty: emptyTozero(record.QTY),
                    local_pending_in: emptyTozero(record.PENDING_IN),
                    local_pending_out: emptyTozero(record.PENDING_OUT),
                    local_warehouse_id: emptyTozero(record.WAREHOUSE_ID),
                    local_warehouse_name: 'Offline',
                    local_warehouse_location: '',
                    global_qty: emptyTozero(record.QTY),
                    price: record.PRICE,
                    original_price: record.ORIGINAL_PRICE,
                    data: []
                };
                //console.log(ret);
                defer.resolve(ret);
                //console.log('return la');
            },
            function(err) {
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

    offline.getInvoiceTemplateChargeItem = function(type) {

        var defer = $q.defer();

        window.resolveLocalFileSystemURL(cordova.file.applicationDirectory + 'www/templates/tpl.invoice-pdf.' + type + '.charge-item.html', function(fileEntry) {
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
                    offline.getInvoiceTemplateChargeItem(params.size).then(function(chargeItem) {
                        offline.getInvoiceTemplate(params.size).then(function(template) {
                            var pdf = template.replace(/{{ 'CSS' \| TEMPLATE }}/g, css);
                            console.log('2');
                            var imagesReg = /{{ '(\w+)' \| IMAGE }}/g;
                            var translateReg = /{{ '(\w+)' \| TRANSLATE }}/g;
                            var dataReg = /{{ '(\w+)' \| DATA }}/g;
                            var productItemReg = /{{ '(\w+)' \| PRODUCT_ITEM }}/g;
                            var chargeItemReg = /{{ '(\w+)' \| CHARGE_ITEM }}/g;

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
                            for (var i = 0; i < params.data.PRODUCT_ITEM.length; i++) {
                                products += productItem.replace(productItemReg, function(match, param, offset, string) {
                                    return params.data.PRODUCT_ITEM[i][param];
                                });
                                console.log('product:');
                                console.log(products);
                            }

                            var charges = '';
                            console.log('4');
                            console.log(params.data.CHARGE_ITEM);
                            for (var i = 0; i < params.data.CHARGE_ITEM.length; i++) {
                                charges += chargeItem.replace(chargeItemReg, function(match, param, offset, string) {
                                    return params.data.CHARGE_ITEM[i][param];
                                });
                                console.log('product:');
                                console.log(charges);
                            }

                            var page1 = page1.replace(/{{ 'PRODUCT_ITEM' \| TEMPLATE }}/g, products);
                            var page1 = page1.replace(/{{ 'CHARGE_ITEM' \| TEMPLATE }}/g, charges);

                            var page1 = page1.replace(/{{ 'CURRENT_PAGE' \| PAGE }}/g, '1');
                            var page1 = page1.replace(/{{ 'TOTAL_PAGE' \| PAGE }}/g, '2');

                            pdf = pdf.replace(/{{ 'BODY' \| TEMPLATE }}/g, page1);
                            // cordova.file.applicationStorageDirectory
                            /*window.html2pdf.create(pdf, pdfPath,
                                function(status) {
                                    defer.resolve(status);
                                },
                                function(status) {
                                    defer.reject(status);
                                }
                            );
                            */
                            defer.resolve({
                                css: css,
                                body: page1,
                                pdf: pdf
                            });
                            /*console.log(cordova.file.applicationStorageDirectory + 'test.pdf');
                            window.html2pdf.create(pdf, cordova.file.applicationStorageDirectory + 'test.pdf', function(status) {
                                defer.resolve({
                                    status: status,
                                    css: css,
                                    body: page1,
                                    pdf: pdf
                                });
                            });*/

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
