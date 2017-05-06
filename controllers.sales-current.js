angular.module('controllers.sales-current', [
  'ionic',
  'pascalprecht.translate',
  'ngMessages',
  'ngAnimate',
  'services.localstorage',
  'services.helper',
  'services.api',
  'directives.common',
  'directives.ubeing',
  'pdf',
])

.controller('salesCurrentCtrl', function($scope, $rootScope, $localStorage,$filter, $translate, $helper, $ionicLoading, $api, $ionicPopup, $ionicModal, $ionicScrollDelegate, $sce) {

  /**************************************************
  // initialize view
  **************************************************/

  $scope.loadCategories = function(mode) {
    $api.getCategory({
      token: $localStorage.get('settings').token,
      locale: $localStorage.get('settings').locale,
//      shop_id: $localStorage.get('settings').shop_id
    }).then(function(res) {
      if (res.status == 'Y')
      {
        $scope.categories = res.data;
      }
      else
      {
        $helper.toast(res.msg, 'short', 'bottom');
      }
      if (mode == 'refresh')
      {
        $scope.$broadcast('scroll.refreshComplete');
      }
    }).catch(function(err) {
      $helper.toast(err, 'long', 'bottom');
      if (mode == 'refresh')
      {
        $scope.$broadcast('scroll.refreshComplete');
      }
    });

  };

  $scope.loadCategory = function(categoryId, categoryName, children) {

    $scope.categoriesStack.push($scope.categories);
    $scope.currentCategoryStack.push({ id: categoryId, name: categoryName });
    if (children.length)
    {
      $scope.categories = children;
    }
    else
    {
      $scope.loadProductList('init', categoryId);
    }

  };

  // load product list
  $scope.loadProductList = function(mode, categoryId, keyword) {

    if (mode != 'more' || $scope.products == undefined)
    {
      $scope.productLimitFrom = 0;
      $scope.productLimit = 20;
      $scope.productCount = 0;
      $scope.products = [];
    }
    else
    {
      $scope.productLimitFrom += 20;
    }

    $api.getProductList({
      token: $localStorage.get('settings').token,
      locale: $localStorage.get('settings').locale,
      category_ids: keyword == undefined && categoryId != undefined ? [categoryId] : null,
      keyword: keyword != undefined ? keyword : null,
      limit_from: $scope.productLimitFrom,
      limit: $scope.productLimit,
      calling_from: 'pos'
    }).then(function(res) {
      if (res.status == 'Y')
      {
        $scope.productCount = res.data.products.count;
        for (var i = 0; i < res.data.products.list.length; i++)
        {
          $scope.products.push(res.data.products.list[i]);
        }
      }
      else
      {
        $helper.toast(res.msg, 'short', 'bottom');
      }
      if (mode == 'refresh')
      {
        $scope.$broadcast('scroll.refreshComplete');
      }
      if (mode == 'more')
      {
        $scope.$broadcast('scroll.infiniteScrollComplete');
      }
    }).catch(function(err) {
      $helper.toast(err, 'long', 'bottom');
      if (mode == 'refresh')
      {
        $scope.$broadcast('scroll.refreshComplete');
      }
      if (mode == 'more')
      {
        $scope.$broadcast('scroll.infiniteScrollComplete');
      }
    });

    $scope.salesState = 'product-list';

  };

  // load product detail
  $scope.loadProductDetail = function(productId,sku) {
    if($scope.editCartItemModal)
    {
      $scope.editCartItemModal.hide();
    }
    $api.getProductDetail({
      token: $localStorage.get('settings').token,
      locale: $localStorage.get('settings').locale,
      product_id: productId
    }).then(function(res) {
      if (res.status == 'Y')
      {
        $scope.product = res.data;
        $scope.bigPhoto = $scope.product.photos[0];
        // TODO: handle qty & options
        $scope.product.addQty = 1;
        $scope.product.minAddQty = 1;
        $scope.product.maxAddQty = 60;
        $scope.product.addOptions = {};
        if (sku==null)
        {
        var i = 0;
          angular.forEach($scope.product.specifications, function(spec) {
            if (spec.enabled && spec.selectible && spec.options.length)
            {
              console.log(spec);
              $scope.product.addOptions[i++] = {
                dictionary: spec.dictionary,
                 option: spec.options[0].id
              };
            }
          });
        }
        else
        {
          $scope.decodeSKU(sku);
        }
        $scope.getSKUInfo();

      }
      else
      {
        $helper.toast(res.msg, 'short', 'bottom');
      }
    }).catch(function(err) {
      $helper.toast(err, 'long', 'bottom');
    });

    $scope.salesState = 'product-detail';

  };
  //use sku to find out attribute, opt , id
  $scope.decodeSKU = function(sku) {

  var attribute = sku.split("-");
  var len = attribute.length;
  if ($scope.product == null)
  {
    $scope.product = {};
    $scope.product.addOptions = {};
  }
  for (var i=0;i<len-1;i++)
  {
    var tokens = attribute[i].split("Y");
    var dict_id = parseInt(tokens[0].split("X")[1],16);
    var opt_id  = parseInt(tokens[1],16);
    $scope.product.addOptions[i] = {
      dictionary: dict_id,
       option: opt_id
    };
  }
  $scope.product.id = parseInt(attribute[len-1].split("P")[1],16);
  };


  // choose sku
  $scope.chooseSKU = function(spec_id,dict_id,opt_id) {

    $scope.product.addOptions[spec_id] = {
       dictionary: dict_id,
       option: opt_id
    };
    $scope.getSKUInfo();
  };

  // get sku info
  $scope.getSKUInfo = function() {

    var spec = [];
    angular.forEach($scope.product.addOptions, function(opt) {
      spec.push(opt);
    });

    $api.getSKUInfo({
      token: $localStorage.get('settings').token,
      locale: $localStorage.get('settings').locale,
      warehouse_id: $localStorage.get('user').warehouse_id,
      invoice_id: $rootScope.currentInvoiceId,
      product_id: $scope.product.id,
      qty: $scope.product.addQty,
      spec: JSON.stringify(spec),
      currency: $scope.product.currency
    }).then(function(res) {
      if (res.status == 'Y')
      {
        // TODO: handle qty & options
        $scope.product.addQty = 1;
        $scope.product.minAddQty = 1;
        $scope.product.sku_data = res;
        $scope.product.maxAddQty = res.local_qty;
        $scope.product.qty      = res.local_qty;
        $scope.product.reserve  = res.reserved_amount;
        $scope.product.pending_out  = res.local_pending_out;
        $scope.product.price    = res.price;
        $scope.product.original_price = res.original_price;
        $scope.product.sku_no = res.sku;
        $scope.product.data = res.data;
        $scope.product.name = res.product_name;
        $scope.product.remarks = res.remarks;
        $scope.loadCart();
      }
      else
      {
        $helper.toast(res.msg, 'short', 'bottom');
      }
    }).catch(function(err) {
      $helper.toast(err, 'long', 'bottom');
    });
  };

  //search customer
  $scope.newCartCustomerSearchEvent = function(customerKeyword)
  {
    $rootScope.customerKeyword = customerKeyword;
    $scope.newCartModal.hide();
    $helper.navForth('tab.customer', null, 'slide-left-right');
  };

  //search customer
  $scope.checkoutCustomerSearchEvent = function(customerKeyword)
  {
    $scope.loadCustomerList('init',customerKeyword.customerKeyword);
    $scope.searchMember = {
      mode: 'directSales',
      back: function() {
        $scope.searchMemberModal.hide();
        $scope.searchMemberModal.remove();
      }
    };

    $ionicModal.fromTemplateUrl('templates/modal.customer.html', {
      scope: $scope,
      animation: 'slide-in-up'
    }).then(function(modal) {
      $scope.searchMemberModal = modal;
      modal.show();
    });
  };

  //confirm change member
  $scope.confirmChangeMember = function(user_id)
  {
            $api.setCart({
              token: $localStorage.get('settings').token,
              locale: $localStorage.get('settings').locale,
              warehouse_id: $localStorage.get('user').warehouse_id,
              action: 'address',
              invoice_id: $rootScope.currentInvoiceId,
              billing_country_id: $scope.deliveryTypeData.billingCountry,
              billing_region_id:  $scope.deliveryTypeData.billingRegion,
              billing_district_id:  $scope.deliveryTypeData.billingDistrict,
              billing_area_id:  $scope.deliveryTypeData.billingArea,
              billing_address_1:  $scope.deliveryTypeData.billingAddress1,
              billing_address_2:  $scope.deliveryTypeData.billingAddress2,
              billing_address_3:  $scope.deliveryTypeData.billingAddress3,
              billing_address_4:  $scope.deliveryTypeData.billingAddress4,
              billing_first_name: $scope.deliveryTypeData.billingFirstName,
              billing_last_name:  $scope.deliveryTypeData.billingLastName,
              billing_email:      $scope.deliveryTypeData.billingEmail,
              billing_country_code: $scope.deliveryTypeData.billingCountryCode,
              billing_mobile: $scope.deliveryTypeData.billingMobile,
              shipping_country_id:  $scope.deliveryTypeData.shippingCountry,
              shipping_region_id:   $scope.deliveryTypeData.shippingRegion,
              shipping_district_id: $scope.deliveryTypeData.shippingDistrict,
              shipping_area_id:     $scope.deliveryTypeData.shippingArea,
              shipping_address_1:   $scope.deliveryTypeData.shippingAddress1,
              shipping_address_2:   $scope.deliveryTypeData.shippingAddress2,
              shipping_address_3:   $scope.deliveryTypeData.shippingAddress3,
              shipping_address_4:   $scope.deliveryTypeData.shippingAddress4,
              shipping_first_name:  $scope.deliveryTypeData.shippingFirstName,
              shipping_last_name:   $scope.deliveryTypeData.shippingLastName,
              shipping_email:       $scope.deliveryTypeData.shippingEmail,
              shipping_country_code:  $scope.deliveryTypeData.shippingCountryCode,
              shipping_mobile:      $scope.deliveryTypeData.shippingMobile,
              pay_method:           $scope.paymentMethodData.pay_method,
              remark:               $scope.deliveryTypeData.remark,
              delivery_type:        $scope.deliveryTypeData.deliveryType,
              carry_up:             $scope.deliveryTypeData.carryUpFloor,
              pick_up_warehouse_id: $scope.deliveryTypeData.pickUpLocation,
              payment_type:         $scope.paymentTypeData.payment_type,
              payed_amount:         $scope.paymentTypeData.payed_amount,
              user_id:              user_id,
              pick_up_country_code: $scope.deliveryTypeData.pickUpCountryCode,
              pick_up_mobile:       $scope.deliveryTypeData.pickUpMobile,
              pick_up_first_name:   $scope.deliveryTypeData.pickUpFirstName,
              pick_up_last_name:    $scope.deliveryTypeData.pickUpLastName,
              pick_up_email:        $scope.deliveryTypeData.pickUpEmail,
              custom_discount:      $scope.deliveryTypeData.specialDiscount,
              other_charge:         $scope.deliveryTypeData.specialServiceCharge,
            }).then(function(res)
            {
              if (res.status == 'Y')
              {
                //$scope.loadCart();
                $scope.cart = res.data;
                $scope.loadCheckout();
                $scope.searchMemberModal.hide();
                $scope.searchMemberModal.remove();
                $scope.deliveryTypeData.user_id = user_id;
                $scope.customerTab =  false;
              }
              else
              {
                $helper.toast(res.msg, 'short', 'bottom');
              }
            }).catch(function(err) {
              $helper.toast(err, 'long', 'bottom');
            });
  };

  // load cart
  $scope.loadCart = function() {

    $api.setCart({
      token: $localStorage.get('settings').token,
      locale: $localStorage.get('settings').locale,
      warehouse_id: $localStorage.get('user').warehouse_id,
      action: 'read',
      invoice_id: $rootScope.currentInvoiceId
    }).then(function(res) {
      if (res.status == 'Y')
      {
        $scope.cart = res.data;
        //console.log($scope.cart);
      }
      else
      {
        $helper.toast(res.msg, 'short', 'bottom');
      }
    }).catch(function(err) {
      $helper.toast(err, 'long', 'bottom');
    });

  };


  //load pending out
  $scope.showPOut = function(sku){

    $scope.viewPOut = {
      back: function() {
        $scope.POutModal.hide();
      }
    };
    $scope.loadOutList('init',null,sku);
    $ionicModal.fromTemplateUrl('templates/modal.pending-out.html', {
      scope: $scope,
      animation: 'slide-in-up'
    }).then(function(modal) {
      $scope.POutModal = modal;
      modal.show();
    });
  };

  //load pending out list
  $scope.loadOutList = function(mode, keyword, sku) {

    if (mode != 'more' || $scope.outList == undefined)
    {
      $scope.outLimitFrom = 0;
      $scope.outLimit = 20;
      $scope.outCount = 0;
      $scope.outList = [];
    }
    else
    {
      $scope.outLimitFrom += 20;
    }
    $api.getStockoutRecord({
      token: $localStorage.get('settings').token,
      locale: $localStorage.get('settings').locale,
      limit_from: $scope.outLimitFrom,
      limit: $scope.outLimit,
      warehouse_id: $localStorage.get('user').warehouse_id,
      sku_no: sku,
    }).then(function(res) {
      if (res.status == 'Y')
      {
        $scope.outCount = res.data.count;
        for (var i = 0; i < res.data.length; i++)
        {
          $scope.outList.push(res.data[i]);
        }
      }
      else
      {
        $helper.toast(res.msg, 'short', 'bottom');
      }
      if (mode == 'refresh')
      {
        $scope.$broadcast('scroll.refreshComplete');
      }
      if (mode == 'more')
      {
        $scope.$broadcast('scroll.infiniteScrollComplete');
      }
    }).catch(function(err) {
      $helper.toast(err, 'long', 'bottom');
      if (mode == 'refresh')
      {
        $scope.$broadcast('scroll.refreshComplete');
      }
      if (mode == 'more')
      {
        $scope.$broadcast('scroll.infiniteScrollComplete');
      }
    });

  };

  $scope.stockLookUp = function(sku){
    if (sku != null)
    {
    $scope.decodeSKU(sku);
    $scope.getSKUInfo();
    }
    $scope.viewPOut = {
      back: function() {
        $scope.LookupModal.hide();
      }
    };
    //$scope.loadOutList('init',null,sku);
    $ionicModal.fromTemplateUrl('templates/modal.stock-look-up.html', {
      scope: $scope,
      animation: 'slide-in-up'
    }).then(function(modal) {
      $scope.LookupModal = modal;
      modal.show();
    });

  };

  //open reserve box

  $scope.openReserveBox = function(record){

    $scope.viewReserveBox = {
      back: function() {
        $scope.ReserveBoxModal.hide();
      }
    };
    $scope.reserve = record;
    $scope.reserve.addQty = 1;
    $ionicModal.fromTemplateUrl('templates/modal.reserve-box.html', {
      scope: $scope,
      animation: 'slide-in-up'
    }).then(function(modal) {
      $scope.ReserveBoxModal = modal;
      modal.show();
    });
  }

  // plus add to cart qty
  $scope.plusReserveQty = function() {

    $scope.reserve.addQty++;
    if ($scope.reserve.addQty > $scope.reserve.qty) $scope.reserve.addQty = $scope.reserve.qty;

  };

  // minus add to cart qty
  $scope.minusReserveQty = function() {

    $scope.reserve.addQty--;
    if ($scope.reserve.addQty < 1) $scope.reserve.addQty = 1;

  };

  $scope.confirmReserveItem = function()
  {
    $api.setCart({
      token: $localStorage.get('settings').token,
      locale: $localStorage.get('settings').locale,
      warehouse_id: $scope.reserve.warehouse_id,
      action: 'add',
      invoice_id: $rootScope.currentInvoiceId,
      product_id: $scope.product.id,
      qty: $scope.reserve.addQty,
      sku_no: $scope.product.sku_no,
      currency: $scope.product.currency
    }).then(function(res) {
      if (res.status == 'Y')
      {
        // TODO: handle qty & options
        //$scope.loadCart();
        $scope.cart = res.data;
        $scope.loadProductDetail($scope.product.id, $scope.product.sku_no)
        $scope.ReserveBoxModal.hide();
        $scope.LookupModal.hide();
      }
      else
      {
        $helper.toast(res.msg, 'short', 'bottom');
      }
    }).catch(function(err) {
      $helper.toast(err, 'long', 'bottom');
    });

  }

  $scope.init = function() {
    $scope.dial_list = $localStorage.get('dial').dial_list;
    $scope.checkoutReg = false;
    $scope.bigPhoto = '';
    $scope.customerTab =  false;
    $scope.deliveryTypeTab = false;
    $scope.paymentTypeTab = false;
    $scope.paymentMethodTab = false;
    $scope.otherTypeTab = false;
    $scope.abs = Math.abs;
    $scope.can_add = true;
    $scope.partial_pick = false;
    $scope.displayConfig = {
      category: {
        min: [0, 1, 2, 3, 4],
        normal: [0, 1, 2],
        max: [0]
      }
    };

    if ($rootScope.currentInvoiceId == undefined)
    {
      var alertPopup = $ionicPopup.alert({
        template: '<p class="text-center">' + $translate.instant('NO_CURRENT_CART') + '</p>',
        buttons: [
          {
            text: $translate.instant('CONFIRM'),
            type: 'button button-clear button-positive',
            onTap: function(e) {
              $scope.goBack();
              $helper.navForth('tab.sales-saved', null, 'slide-left-right');
            }
          }
        ]
      });
      return false;
    }

    $rootScope.showAccountPopover = false;

    $scope.salesTab = 'current';
    $scope.salesState = 'category';
    $scope.cartDisplay = 'normal';
    $scope.newCartVisitor = true;

    $scope.categoriesStack = [];
    $scope.currentCategoryStack = [{ id: null, name: $translate.instant('CATEGORIES') }];

    $scope.loadCategories('init');
    $scope.loadCart();

    $scope.searchButtonBar = {
      searchHints: $translate.instant('SEARCH_PRODUCT_HINTS'),
      searchKeyword: '',
      searchFor: function(keyword) {
        if ($scope.categoriesStack[$scope.categoriesStack.length - 1] != $scope.categories)
        {
          $scope.categoriesStack.push($scope.categories);
          $scope.currentCategoryStack.push({ id: null, name: $translate.instant('SEARCH_RESULT') });
        }
        $scope.loadProductList('refresh', null, keyword);
      }
    };

    $scope.checkout = {
      customerTab: false,
      deliveryTypeTab: false,
      paymentTypeTab: false,
      paymentMethodTab: false,
      otherTypeTab: false
    };

  };

  /**************************************************
  // event handlers
  **************************************************/

  // go back
  $scope.goBack = function() {
    $helper.navBack(-1, 'slide-left-right');
  };
  $scope.$on('$ionicView.enter', function() {
    $rootScope.goBack = $scope.goBack;
  });

  // product back
  $scope.productBack = function() {

    switch ($scope.salesState)
    {
      case 'category':
        $scope.categories = $scope.categoriesStack.pop();
        $scope.currentCategoryStack.pop();
        break;

      case 'product-list':
        $scope.categories = $scope.categoriesStack.pop();
        $scope.currentCategoryStack.pop();
        $scope.salesState = 'category';
        break;

      case 'product-detail':
        $scope.salesState = 'product-list';
        break;

      case 'checkout':
        break;
    }

  };

  // plus add to cart qty
  $scope.plusAddQty = function() {

    $scope.product.addQty++;
    if ($scope.product.addQty > $scope.product.maxAddQty) $scope.product.addQty = $scope.product.maxAddQty;

  };

  // minus add to cart qty
  $scope.minusAddQty = function() {

    $scope.product.addQty--;
    if ($scope.product.addQty < $scope.product.minAddQty) $scope.product.addQty = $scope.product.minAddQty;

  };

  // check to
  $scope.checkAddQty = function()
  {
    if ($scope.product.addQty > $scope.product.qty || $scope.product.addQty == null)
    {
      $scope.product.addQty = $scope.product.qty;
    }

  };

  // check addQTY
  $scope.checkAddQty = function()
  {
    if ($scope.product.addQty > $scope.product.qty || $scope.product.addQty == null)
    {
      $scope.product.addQty = $scope.product.qty;
    }
  };

  // check addQty of reserve
  $scope.checkreserveAddQty = function()
  {
    if ($scope.reserve.addQty > $scope.reserve.qty || $scope.reserve.addQty == null)
    {
      $scope.reserve.addQty = $scope.reserve.qty;
    }
  };

  // add to cart
  $scope.addToCart = function() {

    $scope.can_add = false;
    var spec = [];
    angular.forEach($scope.product.addOptions, function(opt) {
      spec.push(opt);
    });
    $api.setCart({
      token: $localStorage.get('settings').token,
      locale: $localStorage.get('settings').locale,
      warehouse_id: $localStorage.get('user').warehouse_id,
      action: 'add',
      invoice_id: $rootScope.currentInvoiceId,
      product_id: $scope.product.id,
      qty: $scope.product.addQty,
      spec: JSON.stringify(spec),
      currency: $scope.product.currency
    }).then(function(res) {
      if (res.status == 'Y')
      {
        console.log(res);
        // TODO: handle qty & options
        $scope.product.maxAddQty = $scope.product.maxAddQty - $scope.product.addQty;
        $scope.product.qty = $scope.product.maxAddQty;
        $scope.product.pending_out = $scope.product.pending_out + $scope.product.addQty;
        if ($scope.product.qty < 1)
        {
          $scope.product.addQty = 0;
        }
        else
        {
          $scope.product.addQty = 1;
        }
        $scope.product.minAddQty = 1;
        //$scope.loadCart();
        $scope.cart = res.data;
        $scope.can_add = true;
      }
      else
      {
        $helper.toast(res.msg, 'short', 'bottom');
      }
    }).catch(function(err) {
      $helper.toast(err, 'long', 'bottom');
    });

  };

  // save cart
  $scope.saveCart = function() {

    $helper.navForth('tab.sales-saved', null, 'slide-left-right');

  };

  // load checkout
  $scope.loadCheckout = function() {

    $scope.checkout.cartInfo = $scope.cart;
    console.log($scope.cart.reserved);
    $scope.deliveryTypeData = {};
    $scope.paymentTypeData = {};
    $scope.paymentMethodData = {};
    $scope.currencyData     = {};
    $scope.deliveryTypeData.deliveryType = ($scope.cart.reserved == 'N' ? 'direct sales' : 'pick up');
    $scope.deliveryTypeData.pickUpLocation = $scope.cart.pick_up_warehouse_id;
    $scope.deliveryTypeData.pickUpLocation_name = $scope.cart.pick_up_site;
    $scope.deliveryTypeData.pickUpFirstName = $scope.cart.pick_up_first_name;
    $scope.deliveryTypeData.pickUpLastName = $scope.cart.pick_up_last_name;
    $scope.deliveryTypeData.pickUpEmail = $scope.cart.pick_up_email;
    $scope.deliveryTypeData.pickUpCountryCode = $scope.cart.pick_up_country_code;
    $scope.deliveryTypeData.pickUpMobile  = $scope.cart.pick_up_mobile;
    $scope.deliveryTypeData.billingFirstName = $scope.cart.billing_first_name;
    $scope.deliveryTypeData.billingLastName = $scope.cart.billing_last_name;
    var mobile = $scope.cart.billing_mobile.split(" ");
    $scope.deliveryTypeData.billingCountryCode = mobile[0];
    $scope.deliveryTypeData.billingMobile = mobile[1];
    $scope.deliveryTypeData.billingEmail  = $scope.cart.billing_email;
    $scope.deliveryTypeData.billingAddress1 = $scope.cart.billing_address_1;
    $scope.deliveryTypeData.billingAddress2 = $scope.cart.billing_address_2;
    $scope.deliveryTypeData.billingAddress3 = $scope.cart.billing_address_3;
    $scope.deliveryTypeData.billingAddress4 = $scope.cart.billing_address_4;
    $scope.deliveryTypeData.billingCountry  = $scope.cart.billing_country_id;
    $scope.deliveryTypeData.billingRegion  = $scope.cart.billing_region_id;
    $scope.deliveryTypeData.billingDistrict  = $scope.cart.billing_district_id;
    $scope.deliveryTypeData.billingArea  = $scope.cart.billing_area_id;
    $scope.deliveryTypeData.billingCountry_name  = $scope.cart.billing_country;
    $scope.deliveryTypeData.billingRegion_name  = $scope.cart.billing_region;
    $scope.deliveryTypeData.billingDistrict_name  = $scope.cart.billing_district;
    $scope.deliveryTypeData.billingArea_name  = $scope.cart.billing_area;

    $scope.deliveryTypeData.shippingFirstName = $scope.cart.shipping_first_name;
    $scope.deliveryTypeData.shippingLastName = $scope.cart.shipping_last_name;
    var mobile = $scope.cart.shipping_mobile.split(" ");
    $scope.deliveryTypeData.shippingCountryCode = mobile[0];
    $scope.deliveryTypeData.shippingMobile = mobile[1];
    $scope.deliveryTypeData.shippingEmail  = $scope.cart.shipping_email;
    $scope.deliveryTypeData.shippingAddress1 = $scope.cart.shipping_address_1;
    $scope.deliveryTypeData.shippingAddress2 = $scope.cart.shipping_address_2;
    $scope.deliveryTypeData.shippingAddress3 = $scope.cart.shipping_address_3;
    $scope.deliveryTypeData.shippingAddress4 = $scope.cart.shipping_address_4;
    $scope.deliveryTypeData.shippingCountry  = $scope.cart.shipping_country_id;
    $scope.deliveryTypeData.shippingRegion  = $scope.cart.shipping_region_id;
    $scope.deliveryTypeData.shippingDistrict  = $scope.cart.shipping_district_id;
    $scope.deliveryTypeData.shippingArea  = $scope.cart.shipping_area_id;
    $scope.deliveryTypeData.shippingCountry_name  = $scope.cart.shipping_country;
    $scope.deliveryTypeData.shippingRegion_name  = $scope.cart.shipping_region;
    $scope.deliveryTypeData.shippingDistrict_name  = $scope.cart.shipping_district;
    $scope.deliveryTypeData.shippingArea_name  = $scope.cart.shipping_area;

    $scope.deliveryTypeData.carryUpFloor  = $scope.cart.carry_up;
    $scope.deliveryTypeData.user_id  = $scope.cart.user_id;
    $scope.deliveryTypeData.specialDiscount = $scope.cart.custom_discount;
    $scope.deliveryTypeData.specialServiceCharge = $scope.cart.other_charge;
    $scope.deliveryTypeData.remark  = $scope.cart.remark;

    $scope.paymentTypeData.payment_type  = $scope.cart.payment_type != '' ? $scope.cart.payment_type: 'full paid';
    $scope.paymentTypeData.payed_amount  = $scope.cart.payed_amount;

    $scope.paymentMethodData.pay_method  = $scope.cart.pay_method != ''? $scope.cart.pay_method: 'Cash';
    switch($scope.paymentMethodData.pay_method)
    {
      case 'Cash':
      case 'Credit Card':
      case 'EPS':
      case 'Bank Transfer':
      case 'AE':
      case 'CUP':
        break;
      default:
        $scope.paymentMethodData.other_pay_method = $scope.paymentMethodData.pay_method;
        $scope.paymentMethodData.pay_method = 'Other';
        break;

    }
    $scope.currencyData.currency  = $scope.cart.currency != ''? $scope.cart.currency : 'HKD';
    if ($localStorage.get('country') == null)
    {
        $api.getCountry({
          token: $localStorage.get('settings').token,
          locale: $localStorage.get('settings').locale,
        }).then(function(res) {
          if (res.status == 'Y')
          {
                var countrys = [];
                var regions  = [[]];
                var districts = [[]];
                var areas     = [[]];
                for (var i=0;i<res.data.length;i++)
                {
                  var country = res.data[i];
                  countrys[i] = country;
                  var region_list = country.regions;
                  regions[country.id] = [];
                  for (var j=0;j<region_list.length;j++)
                  {
                    var region = region_list[j];
                    regions[country.id][j] = region;
                    var district_list = region.districts;
                    districts[region.id] = [];
                    for (var k=0;k<district_list.length;k++)
                    {
                      var district = district_list[k];
                      districts[region.id][k] = district;
                      var area_list = district.areas;
                      areas[district.id] = [];
                      for (var m=0;m<area_list.length;m++)
                      {
                        var area = area_list[m];
                        areas[district.id][m]  = area;
                      }
                    }
                  }
                }
                // save returned country info
                $localStorage.set('country', {
                  countrys : countrys,
                  regions  :  regions,
                  districts : districts,
                  areas : areas
                });
          }
          else
          {
            $helper.toast(res.msg, 'short', 'bottom');
          }
        }).catch(function(err) {
          $helper.toast(err, 'long', 'bottom');
        });
    }
    $scope.countrylist = $localStorage.get('country').countrys;
    $scope.regionlist = $localStorage.get('country').regions;
    $scope.districtlist = $localStorage.get('country').districts;
    $scope.arealist = $localStorage.get('country').areas;
    $scope.salesState = 'checkout';

  };

  // choose billing dial
  $scope.selectBillingDial = function() {

    var options = [];
    angular.forEach($localStorage.get('dial').dial_list, function(title) {
      options.push({
        name: title.country_name,
        value: title.dial_code,
        checked: title.dial_code == $scope.deliveryTypeData.billingCountryCode,
        data: title
      });
    });
    $helper.picker({
      scope: $scope,
      title: 'SELECT_TITLE',
      options: options,
      multiple: false,
      confirmCallback: function(selectedObjs) {
        $scope.deliveryTypeData.billingCountryCode = selectedObjs[0].value;
      }
    });

  };

  // choose billing country
  $scope.selectBillingCountry = function() {

    var options = [];
    angular.forEach($scope.countrylist, function(title) {
      options.push({
        name: title.name,
        value: title.id,
        checked: title.id == $scope.deliveryTypeData.billingCountry,
        data: title
      });
    });
    $helper.picker({
      scope: $scope,
      title: 'SELECT_TITLE',
      options: options,
      multiple: false,
      confirmCallback: function(selectedObjs) {
        $scope.deliveryTypeData.billingCountry = selectedObjs[0].value;
        $scope.deliveryTypeData.billingCountry_name = selectedObjs[0].name;
        $scope.deliveryTypeData.billingRegion   = 0;
        $scope.deliveryTypeData.billingRegion_name = '';
        $scope.deliveryTypeData.billingDistrict   = 0;
        $scope.deliveryTypeData.billingDistrict_name = '';
        $scope.deliveryTypeData.billingArea   = 0;
        $scope.deliveryTypeData.billingArea_name = '';
      }
    });

  };

  // choose billing region
  $scope.selectBillingRegion = function() {
    var options = [];
    angular.forEach($scope.regionlist[$scope.deliveryTypeData.billingCountry], function(title) {
      options.push({
        name: title.name,
        value: title.id,
        checked: title.id == $scope.deliveryTypeData.billingRegion,
        data: title
      });
    });
    $helper.picker({
      scope: $scope,
      title: 'SELECT_TITLE',
      options: options,
      multiple: false,
      confirmCallback: function(selectedObjs) {
        $scope.deliveryTypeData.billingRegion = selectedObjs[0].value;
        $scope.deliveryTypeData.billingRegion_name = selectedObjs[0].name;
        $scope.deliveryTypeData.billingDistrict   = 0;
        $scope.deliveryTypeData.billingDistrict_name = '';
        $scope.deliveryTypeData.billingArea   = 0;
        $scope.deliveryTypeData.billingArea_name = '';
      }
    });

  };

  // choose billing district
  $scope.selectBillingDistrict = function() {

    var options = [];
    angular.forEach($scope.districtlist[$scope.deliveryTypeData.billingRegion], function(title) {
      options.push({
        name: title.name,
        value: title.id,
        checked: title.id == $scope.deliveryTypeData.billingDistrict,
        data: title
      });
    });
    $helper.picker({
      scope: $scope,
      title: 'SELECT_TITLE',
      options: options,
      multiple: false,
      confirmCallback: function(selectedObjs) {
        $scope.deliveryTypeData.billingDistrict = selectedObjs[0].value;
        $scope.deliveryTypeData.billingDistrict_name = selectedObjs[0].name;
        $scope.deliveryTypeData.billingArea   = 0;
        $scope.deliveryTypeData.billingArea_name = '';
      }
    });

  };

  // choose billing area
  $scope.selectBillingArea = function() {

    var options = [];
    angular.forEach($scope.arealist[$scope.deliveryTypeData.billingDistrict], function(title) {
      options.push({
        name: title.name,
        value: title.id,
        checked: title.id == $scope.deliveryTypeData.billingArea,
        data: title
      });
    });
    $helper.picker({
      scope: $scope,
      title: 'SELECT_TITLE',
      options: options,
      multiple: false,
      confirmCallback: function(selectedObjs) {
        $scope.deliveryTypeData.billingArea = selectedObjs[0].value;
        $scope.deliveryTypeData.billingArea_name = selectedObjs[0].name;
      }
    });

  };

  // choose shipping dial
  $scope.selectShippingDial = function() {

    var options = [];
    angular.forEach($localStorage.get('dial').dial_list, function(title) {
      options.push({
        name: title.country_name,
        value: title.dial_code,
        checked: title.dial_code == $scope.deliveryTypeData.shippingCountryCode,
        data: title
      });
    });
    $helper.picker({
      scope: $scope,
      title: 'SELECT_TITLE',
      options: options,
      multiple: false,
      confirmCallback: function(selectedObjs) {
        $scope.deliveryTypeData.shippingCountryCode = selectedObjs[0].value;
      }
    });

  };

  // choose shipping country
  $scope.selectShippingCountry = function() {

    var options = [];
    angular.forEach($scope.countrylist, function(title) {
      options.push({
        name: title.name,
        value: title.id,
        checked: title.id == $scope.deliveryTypeData.shippingCountry,
        data: title
      });
    });
    $helper.picker({
      scope: $scope,
      title: 'SELECT_TITLE',
      options: options,
      multiple: false,
      confirmCallback: function(selectedObjs) {
        $scope.deliveryTypeData.shippingCountry = selectedObjs[0].value;
        $scope.deliveryTypeData.shippingCountry_name = selectedObjs[0].name;
        $scope.deliveryTypeData.shippingRegion   = 0;
        $scope.deliveryTypeData.shippingRegion_name = '';
        $scope.deliveryTypeData.shippingDistrict   = 0;
        $scope.deliveryTypeData.shippingDistrict_name = '';
        $scope.deliveryTypeData.shippingArea   = 0;
        $scope.deliveryTypeData.shippingArea_name = '';
        $scope.updateCart();
      }
    });

  };

  // choose shipping region
  $scope.selectShippingRegion = function() {
    var options = [];
    angular.forEach($scope.regionlist[$scope.deliveryTypeData.shippingCountry], function(title) {
      options.push({
        name: title.name,
        value: title.id,
        checked: title.id == $scope.deliveryTypeData.shippingRegion,
        data: title
      });
    });
    $helper.picker({
      scope: $scope,
      title: 'SELECT_TITLE',
      options: options,
      multiple: false,
      confirmCallback: function(selectedObjs) {
        $scope.deliveryTypeData.shippingRegion = selectedObjs[0].value;
        $scope.deliveryTypeData.shippingRegion_name = selectedObjs[0].name;
        $scope.deliveryTypeData.shippingDistrict   = 0;
        $scope.deliveryTypeData.shippingDistrict_name = '';
        $scope.deliveryTypeData.shippingArea   = 0;
        $scope.deliveryTypeData.shippingArea_name = '';
        $scope.updateCart();
      }
    });

  };

  // choose shipping district
  $scope.selectShippingDistrict = function() {

    var options = [];
    angular.forEach($scope.districtlist[$scope.deliveryTypeData.shippingRegion], function(title) {
      options.push({
        name: title.name,
        value: title.id,
        checked: title.id == $scope.deliveryTypeData.shippingDistrict,
        data: title
      });
    });
    $helper.picker({
      scope: $scope,
      title: 'SELECT_TITLE',
      options: options,
      multiple: false,
      confirmCallback: function(selectedObjs) {
        $scope.deliveryTypeData.shippingDistrict = selectedObjs[0].value;
        $scope.deliveryTypeData.shippingDistrict_name = selectedObjs[0].name;
        $scope.deliveryTypeData.shippingArea   = 0;
        $scope.deliveryTypeData.shippingArea_name = '';
        $scope.updateCart();
      }
    });

  };

  // choose shipping area
  $scope.selectShippingArea = function() {

    var options = [];
    angular.forEach($scope.arealist[$scope.deliveryTypeData.shippingDistrict], function(title) {
      options.push({
        name: title.name,
        value: title.id,
        checked: title.id == $scope.deliveryTypeData.shippingArea,
        data: title
      });
    });
    $helper.picker({
      scope: $scope,
      title: 'SELECT_TITLE',
      options: options,
      multiple: false,
      confirmCallback: function(selectedObjs) {
        $scope.deliveryTypeData.shippingArea = selectedObjs[0].value;
        $scope.deliveryTypeData.shippingArea_name = selectedObjs[0].name;
        $scope.updateCart();
      }
    });

  };
  //choose pick up country code
  $scope.selectPickupDial = function() {

    var options = [];
    angular.forEach($localStorage.get('dial').dial_list, function(title) {
      options.push({
        name: title.country_name,
        value: title.dial_code,
        checked: title.dial_code == $scope.deliveryTypeData.pickUpCountryCode,
        data: title
      });
    });
    $helper.picker({
      scope: $scope,
      title: 'SELECT_TITLE',
      options: options,
      multiple: false,
      confirmCallback: function(selectedObjs) {
        $scope.deliveryTypeData.pickUpCountryCode = selectedObjs[0].value;
      }
    });

  };
  //choose pick up site
  $scope.selectPickupWH = function() {
    var options = [];
    angular.forEach($localStorage.get('warehouse'), function(title) {
      options.push({
        name: title.name,
        value: title.id,
        checked: title.id == $scope.deliveryTypeData.pickUpLocation,
        data: title
      });
    });
    $helper.picker({
      scope: $scope,
      title: 'SELECT_TITLE',
      options: options,
      multiple: false,
      confirmCallback: function(selectedObjs) {
        $scope.deliveryTypeData.pickUpLocation = selectedObjs[0].value;
        $scope.deliveryTypeData.pickUpLocation_name = selectedObjs[0].name;
      }
    });

  };
  //checkCarryUp
  $scope.checkCarryUp = function()
  {
    if ($scope.deliveryTypeData.carryUpFloor<0)
    {
      $scope.deliveryTypeData.carryUpFloor = 0;
    }
  }

  // expand cart
  $scope.expandCart = function() {

    if ($scope.cartDisplay == 'min') $scope.cartDisplay = 'normal';
    else if ($scope.cartDisplay == 'normal') $scope.cartDisplay = 'max';

  };

  // collapse cart
  $scope.collapseCart = function() {

    if ($scope.cartDisplay == 'max') $scope.cartDisplay = 'normal';
    else if ($scope.cartDisplay == 'normal') $scope.cartDisplay = 'min';

  };

  // new cart
  $scope.newCart = function() {

    $scope.newCartVisitor = true;
    $scope.newVisitor = {
      titleId: '',
      titleName: 'N/A',
      lastName: ''
    };
    $scope.newMember = {
      firstName: '',
      lastName: '',
      email: '',
      countryCode: '',
      mobile: ''
    };
    $ionicModal.fromTemplateUrl('templates/modal.new-cart.html', {
      scope: $scope,
      animation: 'slide-in-up'
    }).then(function(modal) {
      $scope.newCartModal = modal;
      modal.show();
    });

  };

  $scope.showNewCartRegisterForm = function() {
    $scope.newCartVisitor = false;
  };

  $scope.showCheckOutRegisterForm = function() {
    $scope.checkoutReg = !$scope.checkoutReg;
    if (!$scope.newMember)
    $scope.newMember = {
      firstName: '',
      lastName: '',
      email: '',
      countryCode: '',
      mobile: ''
    };
  };

  $scope.cancelNewCart = function() {

    $scope.newCartModal.hide();

  };

//   $scope.confirmNewCart = function(params) {
//
//     $scope.newCartModal.hide();
//
//   };
  $scope.confirmNewCart = function(mode) {

    if (mode == 'VISITOR')
    {
      $api.newCart({
        token: $localStorage.get('settings').token,
        locale: $localStorage.get('settings').locale,
        billing_last_name: $scope.newVisitor.lastName,
        gender: $scope.newVisitor.titleId,
        check_out_warehouse_id: $localStorage.get('user').warehouse_id
      }).then(function(res) {
        if (res.status == 'Y')
        {
          $scope.newCartModal.hide();
          $rootScope.currentInvoiceId = res.invoice_id;
          $scope.loadCart();
        }
        else
        {
          $helper.toast(res.msg, 'short', 'bottom');
        }
      }).catch(function(err) {
        $helper.toast(err, 'long', 'bottom');
      });
    }
    if (mode == 'MEMBER')
    {
      $api.newMember({
        token: $localStorage.get('settings').token,
        locale: $localStorage.get('settings').locale,
        first_name: $scope.newMember.firstName,
        last_name: $scope.newMember.lastName,
        email:     $scope.newMember.email,
        country_code: $scope.newMember.countryCode,
        mobile:     $scope.newMember.mobile,
      }).then(function(res) {
        if (res.status == 'Y')
        {

          $api.newCart({
            token: $localStorage.get('settings').token,
            locale: $localStorage.get('settings').locale,
            user_id: res.user_id,
            check_out_warehouse_id: $localStorage.get('user').warehouse_id
          }).then(function(res) {
            if (res.status == 'Y')
            {
              $scope.newCartModal.hide();
              $rootScope.currentInvoiceId = res.invoice_id;
              $scope.loadCart();
            }
            else
            {
              $helper.toast(res.msg, 'short', 'bottom');
            }
          }).catch(function(err) {
            $helper.toast(err, 'long', 'bottom');
          });
        }
        else
        {
          $helper.toast(res.msg, 'short', 'bottom');
        }
      }).catch(function(err) {
        $helper.toast(err, 'long', 'bottom');
      });


    }
  };

  //choose new member code
  $scope.selectNewMemberDial = function() {

    var options = [];
    angular.forEach($localStorage.get('dial').dial_list, function(title) {
      options.push({
        name: title.country_name,
        value: title.dial_code,
        checked: title.dial_code == $scope.newMember.countryCode,
        data: title
      });

    });
    $helper.picker({
      scope: $scope,
      title: 'SELECT_TITLE',
      options: options,
      multiple: false,
      confirmCallback: function(selectedObjs) {
        $scope.newMember.countryCode = selectedObjs[0].value;
      }
    });

  };

  $scope.selectTitle = function() {

    var options = [];
    angular.forEach($localStorage.get('titles'), function(title) {
      options.push({
        name: title['title_' + $translate.use()],
        value: title.title_id,
        checked: title.title_id == $scope.newVisitor.titleId,
        data: title
      });
    });
    console.log(options);
    $helper.picker({
      scope: $scope,
      title: 'SELECT_TITLE',
      options: options,
      multiple: false,
      confirmCallback: function(selectedObjs) {
        $scope.newVisitor.titleId = selectedObjs[0].value;
        $scope.newVisitor.titleName = selectedObjs[0].name;

      }
    });

  };
  //register when checkout
  $scope.checkoutRegisterSubmit = function()
  {
    //console.log($scope.newMember);
      $api.newMember({
        token: $localStorage.get('settings').token,
        locale: $localStorage.get('settings').locale,
        first_name: $scope.newMember.firstName,
        last_name: $scope.newMember.lastName,
        email:     $scope.newMember.email ,
        country_code: $scope.newMember.countryCode,
        mobile:     $scope.newMember.mobile,
      }).then(function(res) {
        if (res.status == 'Y')
        {
            $api.setCart({
              token: $localStorage.get('settings').token,
              locale: $localStorage.get('settings').locale,
              warehouse_id: $localStorage.get('user').warehouse_id,
              action: 'address',
              invoice_id: $rootScope.currentInvoiceId,
              billing_country_id: $scope.deliveryTypeData.billingCountry,
              billing_region_id:  $scope.deliveryTypeData.billingRegion,
              billing_district_id:  $scope.deliveryTypeData.billingDistrict,
              billing_area_id:  $scope.deliveryTypeData.billingArea,
              billing_address_1:  $scope.deliveryTypeData.billingAddress1,
              billing_address_2:  $scope.deliveryTypeData.billingAddress2,
              billing_address_3:  $scope.deliveryTypeData.billingAddress3,
              billing_address_4:  $scope.deliveryTypeData.billingAddress4,
              billing_first_name: $scope.deliveryTypeData.billingFirstName,
              billing_last_name:  $scope.deliveryTypeData.billingLastName,
              billing_email:      $scope.deliveryTypeData.billingEmail,
              billing_country_code: $scope.deliveryTypeData.billingCountryCode,
              billing_mobile: $scope.deliveryTypeData.billingMobile,
              shipping_country_id:  $scope.deliveryTypeData.shippingCountry,
              shipping_region_id:   $scope.deliveryTypeData.shippingRegion,
              shipping_district_id: $scope.deliveryTypeData.shippingDistrict,
              shipping_area_id:     $scope.deliveryTypeData.shippingArea,
              shipping_address_1:   $scope.deliveryTypeData.shippingAddress1,
              shipping_address_2:   $scope.deliveryTypeData.shippingAddress2,
              shipping_address_3:   $scope.deliveryTypeData.shippingAddress3,
              shipping_address_4:   $scope.deliveryTypeData.shippingAddress4,
              shipping_first_name:  $scope.deliveryTypeData.shippingFirstName,
              shipping_last_name:   $scope.deliveryTypeData.shippingLastName,
              shipping_email:       $scope.deliveryTypeData.shippingEmail,
              shipping_country_code:  $scope.deliveryTypeData.shippingCountryCode,
              shipping_mobile:      $scope.deliveryTypeData.shippingMobile,
              pay_method:           $scope.paymentMethodData.pay_method,
              remark:               $scope.deliveryTypeData.remark,
              delivery_type:        $scope.deliveryTypeData.deliveryType,
              carry_up:             $scope.deliveryTypeData.carryUpFloor,
              pick_up_warehouse_id: $scope.deliveryTypeData.pickUpLocation,
              payment_type:         $scope.paymentTypeData.payment_type,
              payed_amount:         $scope.paymentTypeData.payed_amount,
              user_id:              res.user_id,
              pick_up_country_code: $scope.deliveryTypeData.pickUpCountryCode,
              pick_up_mobile:       $scope.deliveryTypeData.pickUpMobile,
              pick_up_first_name:   $scope.deliveryTypeData.pickUpFirstName,
              pick_up_last_name:    $scope.deliveryTypeData.pickUpLastName,
              pick_up_email:        $scope.deliveryTypeData.pickUpEmail,
              custom_discount:      $scope.deliveryTypeData.specialDiscount,
              other_charge:         $scope.deliveryTypeData.specialServiceCharge,
            }).then(function(res)
            {
              if (res.status == 'Y')
              {
                //$scope.loadCart();
                $scope.cart = res.data;
                $scope.loadCheckout();
                $scope.checkoutReg = !$scope.checkoutReg;
                $scope.customerTab =  false;

              }
              else
              {
                $helper.toast(res.msg, 'short', 'bottom');
              }
            }).catch(function(err) {
              $helper.toast(err, 'long', 'bottom');
            });
        }
        else
        {
          $helper.toast(res.msg, 'short', 'bottom');
        }
      }).catch(function(err) {
        $helper.toast(err, 'long', 'bottom');
      });
  };
  // edit cart item
  $scope.editCartItem = function(item) {

    $api.getSKUInfo({
      token: $localStorage.get('settings').token,
      locale: $localStorage.get('settings').locale,
      product_id: item.id,
      sku_no: item.sku_no,
      warehouse_id: $localStorage.get('user').warehouse_id,
      invoice_id: $rootScope.currentInvoiceId,
    }).then(function(res) {
      if (res.status == 'Y')
      {
        $scope.cartItem = res;
        // TODO: handle qty & options
//        $scope.cartItem.qty = item.qty;
        $scope.cartItem.minQty = 1;
        $scope.cartItem.photo  = item.photo;
        $scope.cartItem.maxQty = res.local_qty + res.reserved_amount + item.qty;
        $scope.cartItem.avbl_qty = res.local_qty + item.qty;
        $scope.cartItem.qty = item.qty + res.reserved_amount;
        $scope.cartItem.id  = item.id;
        $scope.cartItem.skuNo = item.sku_no;
        $scope.cartItem.options = item.options;
        $scope.cartItem.currency = item.currency;

        $ionicModal.fromTemplateUrl('templates/modal.edit-cart-item.html', {
          scope: $scope,
          animation: 'slide-in-up'
        }).then(function(modal) {
          $scope.editCartItemModal = modal;
          modal.show();
        });
      }
      else
      {
        $helper.toast(res.msg, 'short', 'bottom');
      }
    }).catch(function(err) {
      $helper.toast(err, 'long', 'bottom');
    });

  };

  $scope.plusCartItemQty = function() {

    $scope.cartItem.qty++;
    if ($scope.cartItem.qty > $scope.cartItem.maxQty) $scope.cartItem.qty = $scope.cartItem.maxQty;

  };

  $scope.minusCartItemQty = function() {

    $scope.cartItem.qty--;
    if ($scope.cartItem.qty < $scope.cartItem.minQty) $scope.cartItem.qty = $scope.cartItem.minQty;

  };

  $scope.deleteEditCartItem = function(item) {

    if (item!=null)
    {
      $scope.cartItem.id = item.id;
      $scope.cartItem.skuNo = item.sku_no;
    }
    $api.setCart({
      token: $localStorage.get('settings').token,
      locale: $localStorage.get('settings').locale,
      warehouse_id: $localStorage.get('user').warehouse_id,
      action: 'remove',
      invoice_id: $rootScope.currentInvoiceId,
      product_id: $scope.cartItem.id,
      sku_no: $scope.cartItem.skuNo
    }).then(function(res) {
      if (res.status == 'Y')
      {
        $scope.editCartItemModal.hide();
        $scope.loadProductDetail($scope.cartItem.id,$scope.cartItem.skuNo);
        //$scope.loadCart();
        $scope.cart = res.data;

      }
      else
      {
        $helper.toast(res.msg, 'short', 'bottom');
      }
    }).catch(function(err) {
      $helper.toast(err, 'long', 'bottom');
    });

  };

  $scope.confirmEditCartItem = function() {

    $api.setCart({
      token: $localStorage.get('settings').token,
      locale: $localStorage.get('settings').locale,
      warehouse_id: $localStorage.get('user').warehouse_id,
      action: 'update',
      invoice_id: $rootScope.currentInvoiceId,
      product_id: $scope.cartItem.id,
      sku_no: $scope.cartItem.skuNo,
      qty: $scope.cartItem.qty
    }).then(function(res) {
      if (res.status == 'Y')
      {
        $scope.editCartItemModal.hide();
        $scope.loadProductDetail($scope.cartItem.id,$scope.cartItem.skuNo);
        //$scope.loadCart();
        $scope.cart = res.data;
      }
      else
      {
        $helper.toast(res.msg, 'short', 'bottom');
      }
    }).catch(function(err) {
      $helper.toast(err, 'long', 'bottom');
    });

  };

  $scope.cancelEditCartItem = function() {

    $scope.editCartItemModal.hide();

  };


  //update the shipping area

  $scope.updateShipping = function() {



  };

  //shpping same as billing
  $scope.ShippingSameAsBilling = function()
  {
    if($scope.deliveryTypeData.sameAsBilling)
    {
      $scope.deliveryTypeData.shippingCountry  =     $scope.deliveryTypeData.billingCountry;
      $scope.deliveryTypeData.shippingRegion   =      $scope.deliveryTypeData.billingRegion;
      $scope.deliveryTypeData.shippingDistrict =      $scope.deliveryTypeData.billingDistrict;
      $scope.deliveryTypeData.shippingArea     =      $scope.deliveryTypeData.billingArea;
      $scope.deliveryTypeData.shippingCountry_name  =     $scope.deliveryTypeData.billingCountry_name;
      $scope.deliveryTypeData.shippingRegion_name   =      $scope.deliveryTypeData.billingRegion_name;
      $scope.deliveryTypeData.shippingDistrict_name =      $scope.deliveryTypeData.billingDistrict_name;
      $scope.deliveryTypeData.shippingArea_name     =      $scope.deliveryTypeData.billingArea_name;
      $scope.deliveryTypeData.shippingAddress1 =      $scope.deliveryTypeData.billingAddress1;
      $scope.deliveryTypeData.shippingAddress2 =      $scope.deliveryTypeData.billingAddress2;
      $scope.deliveryTypeData.shippingAddress3 =      $scope.deliveryTypeData.billingAddress3;
      $scope.deliveryTypeData.shippingAddress4 =      $scope.deliveryTypeData.billingAddress4;
      $scope.deliveryTypeData.shippingFirstName =      $scope.deliveryTypeData.billingFirstName;
      $scope.deliveryTypeData.shippingLastName =      $scope.deliveryTypeData.billingLastName;
      $scope.deliveryTypeData.shippingEmail   =      $scope.deliveryTypeData.billingEmail;
      $scope.deliveryTypeData.shippingCountryCode =      $scope.deliveryTypeData.billingCountryCode;
      $scope.deliveryTypeData.shippingMobile =      $scope.deliveryTypeData.billingMobile;
      $scope.updateCart();
    }
  }

  // process checkout
  $scope.processCheckout = function() {

    $api.checkOut({
      token: $localStorage.get('settings').token,
      locale: $localStorage.get('settings').locale,
      warehouse_id: $localStorage.get('user').warehouse_id,
//       action: 'address',
      invoice_id: $rootScope.currentInvoiceId,
      billing_country_id: $scope.deliveryTypeData.billingCountry,
      billing_region_id:  $scope.deliveryTypeData.billingRegion,
      billing_district_id:  $scope.deliveryTypeData.billingDistrict,
      billing_area_id:  $scope.deliveryTypeData.billingArea,
      billing_address_1:  $scope.deliveryTypeData.billingAddress1,
      billing_address_2:  $scope.deliveryTypeData.billingAddress2,
      billing_address_3:  $scope.deliveryTypeData.billingAddress3,
      billing_address_4:  $scope.deliveryTypeData.billingAddress4,
      billing_first_name: $scope.deliveryTypeData.billingFirstName,
      billing_last_name:  $scope.deliveryTypeData.billingLastName,
      billing_email:      $scope.deliveryTypeData.billingEmail,
      billing_country_code: $scope.deliveryTypeData.billingCountryCode,
      billing_mobile: $scope.deliveryTypeData.billingMobile,
      shipping_country_id:  $scope.deliveryTypeData.shippingCountry,
      shipping_region_id:   $scope.deliveryTypeData.shippingRegion,
      shipping_district_id: $scope.deliveryTypeData.shippingDistrict,
      shipping_area_id:     $scope.deliveryTypeData.shippingArea,
      shipping_address_1:   $scope.deliveryTypeData.shippingAddress1,
      shipping_address_2:   $scope.deliveryTypeData.shippingAddress2,
      shipping_address_3:   $scope.deliveryTypeData.shippingAddress3,
      shipping_address_4:   $scope.deliveryTypeData.shippingAddress4,
      shipping_first_name:  $scope.deliveryTypeData.shippingFirstName,
      shipping_last_name:   $scope.deliveryTypeData.shippingLastName,
      shipping_email:       $scope.deliveryTypeData.shippingEmail,
      shipping_country_code:  $scope.deliveryTypeData.shippingCountryCode,
      shipping_mobile:      $scope.deliveryTypeData.shippingMobile,
      pay_method:           $scope.paymentMethodData.pay_method,
      remark:               $scope.deliveryTypeData.remark,
      delivery_type:        $scope.deliveryTypeData.deliveryType,
      carry_up:             $scope.deliveryTypeData.carryUpFloor,
      pick_up_warehouse_id: $scope.deliveryTypeData.pickUpLocation,
      payment_type:         $scope.paymentTypeData.payment_type,
      payed_amount:         $scope.paymentTypeData.payed_amount,
      user_id:              $scope.deliveryTypeData.user_id,
      pick_up_country_code: $scope.deliveryTypeData.pickUpCountryCode,
      pick_up_mobile:       $scope.deliveryTypeData.pickUpMobile,
      pick_up_first_name:   $scope.deliveryTypeData.pickUpFirstName,
      pick_up_last_name:    $scope.deliveryTypeData.pickUpLastName,
      pick_up_email:        $scope.deliveryTypeData.pickUpEmail,
      custom_discount:      $scope.deliveryTypeData.specialDiscount,
      other_charge:         $scope.deliveryTypeData.specialServiceCharge,
    }).then(function(res)
    {
      if (res.status == 'Y')
      {
        $scope.pdfUrl = res.pdf;
        if ($rootScope.platform == 'web')
        {
          $scope.pdfUrl = $sce.trustAsResourceUrl($scope.pdfUrl);
        }
        $scope.viewInvoiceC = {
          mode: $scope.deliveryTypeData.deliveryType,
          back: function() {
            $scope.processCheckoutModal.hide();
            $scope.processCheckoutModal.remove();
          }
        };
        $ionicModal.fromTemplateUrl('templates/modal.view-invoice.html', {
          scope: $scope,
          animation: 'slide-in-up'
        }).then(function(modal) {
          $scope.processCheckoutModal = modal;
          modal.show();
        });
      }
      else
      {
        $helper.toast(res.msg, 'short', 'bottom');
      }
    }).catch(function(err) {
      $helper.toast(err, 'long', 'bottom');
    });
  };
  // load invoice detail
  $scope.loadOutDetail = function(pdf) {

    $scope.pdfUrl = pdf;
    if ($rootScope.platform == 'web')
    {
      $scope.pdfUrl = $sce.trustAsResourceUrl($scope.pdfUrl);
    }
    $scope.viewInvoiceC = {
      mode: 'orderHistory',
      back: function() {
        $scope.processCheckoutModal.hide();
        $scope.processCheckoutModal.remove();
      }
    };
    $ionicModal.fromTemplateUrl('templates/modal.view-invoice.html', {
      scope: $scope,
      animation: 'slide-in-up'
    }).then(function(modal) {
      $scope.processCheckoutModal = modal;
      modal.show();
    });

  };

  // print invoice
  $scope.printHistory = function() {

    if ($rootScope.platform == 'web')
    {
      window.open($scope.pdfUrl, '_system', 'location=yes');
    }
    else
    {
      // TODO: handle app printing
    }

  };

  //search customer
  $scope.loadCustomerList = function(mode, keyword) {

    if (mode != 'more' || $scope.customerList == undefined)
    {
      $scope.customerLimitFrom = 0;
      $scope.customerLimit = 20;
      $scope.customerCount = 0;
      $scope.customerList = [];
    }
    else
    {
      $scope.customerLimitFrom += 20;
    }

    $api.getMemberList({
      token: $localStorage.get('settings').token,
      locale: $localStorage.get('settings').locale,
      keyword: keyword != undefined ? keyword : null,
      limit_from: $scope.customerLimitFrom,
      limit: $scope.customerLimit
    }).then(function(res) {
      if (res.status == 'Y')
      {
        $scope.customerCount = res.member.count;
        for (var i = 0; i < res.member.list.length; i++)
        {
          $scope.customerList.push(res.member.list[i]);
        }
      }
      else
      {
        $helper.toast(res.msg, 'short', 'bottom');
      }
      if (mode == 'refresh')
      {
        $scope.$broadcast('scroll.refreshComplete');
      }
      if (mode == 'more')
      {
        $scope.$broadcast('scroll.infiniteScrollComplete');
      }
    }).catch(function(err) {
      $helper.toast(err, 'long', 'bottom');
      if (mode == 'refresh')
      {
        $scope.$broadcast('scroll.refreshComplete');
      }
      if (mode == 'more')
      {
        $scope.$broadcast('scroll.infiniteScrollComplete');
      }
    });

  };

  //change big photo in shop detail
  $scope.changeBigPhoto = function(photo)
  {
    $scope.bigPhoto = photo;
  };
  $scope.ConfirmPayment = function()
  {

    $api.confirmPayment({
      token: $localStorage.get('settings').token,
      locale: $localStorage.get('settings').locale,
      invoice_id: $rootScope.currentInvoiceId,
    }).then(function(res) {
      if (res.status == 'Y')
      {
        $scope.viewConfirmBox.back();
        $scope.viewInvoiceC.back();
        $helper.navForth('tab.sales-saved', null, 'slide-left-right');
      }
      else
      {
        $helper.toast(res.msg, 'short', 'bottom');
      }
    }).catch(function(err) {
      $helper.toast(err, 'long', 'bottom');
    });


  };
  //click pay and print
  $scope.payAndPrint = function()
  {
    $scope.printHistory();
    $scope.viewConfirmBox = {
      back: function() {
        $scope.ConfirmBoxModal.hide();
      }
    };
    $ionicModal.fromTemplateUrl('templates/modal.confirm-box.html', {
      scope: $scope,
      animation: 'slide-in-up'
    }).then(function(modal) {
      $scope.ConfirmBoxModal = modal;
      modal.show();
    });
  };
//function copy from controller.pickup

  $scope.myDate = $filter('date')(new Date(), 'yyyy-MM-dd HH:mm:ss');

  $scope.processPickup = function(invoice_id) {

    $api.getInvoiceDetail({
       token: $localStorage.get('settings').token,
       locale: $localStorage.get('settings').locale,
       invoice_id: invoice_id
     }).then(function(res) {
      if (res.status == 'Y')
      {
        $scope.invoiceDetail = res.data;
        $scope.productDetail = [];
        for (var i = 0; i < res.data.products.length; i++)
        {
          $scope.productDetail.push(res.data.products[i]);
          $scope.productDetail[i].actual_pickup_qty = $scope.productDetail[i].can_pick_qty;
        }
      }
      else
      {
        $helper.toast(res.msg, 'short', 'bottom');
      }

    }).catch(function(err) {
      $helper.toast(err, 'long', 'bottom');
    });

    $scope.viewInvoice = {
      title: 'PICK_UP_ORDER',
      back: function() {
        $scope.processPickUpModal.hide();
        $scope.processPickUpModal.remove();
        //$scope.processCheckoutModal.show();
      },
      canvasback: function () {
        console.log('back');
        $scope.drawingCanvasModal.hide();
        $scope.drawingCanvasModal.remove();
      },
      drawCanvas: function (){
            if ($scope.drawingCanvasModal != null){
              $scope.drawingCanvasModal.remove();
            }
            $ionicModal.fromTemplateUrl('templates/modal.drawing-canvas.html', {
              scope: $scope,
              animation: 'slide-in-up',
              backdropClickToClose: false
            }).then(function(modal) {
              $scope.drawingCanvasModal = modal;
              modal.show();
              var canvas = document.getElementById('signatureCanvas');
              $scope.signaturePad = new SignaturePad(canvas);

              $scope.clearCanvas = function() {
                  signaturePad.clear();
              }

              $scope.saveCanvas = function() {
                  var sigImg = signaturePad.toDataURL();
                  $scope.signature = sigImg;
              }
            });

      },
      next: function(){

        $scope.processCheckoutModal.hide();
        $scope.processCheckoutModal.remove();
        $scope.signaturepng = $scope.signaturePad.toDataURL('image/png');
        $scope.productjson = [];
        angular.forEach($scope.invoiceDetail.products, function(spec) {
          if (spec.checkboxValue)
          {
            $scope.productjson.push({"sku_no": spec.sku_no ,"qty": spec.actual_pickup_qty});
          }
        });

        console.log('next');

        $api.confirmPickUp({
           token: $localStorage.get('settings').token,
           locale: $localStorage.get('settings').locale,
           warehouse_id: $localStorage.get('user').warehouse_id,
           invoice_id: invoice_id,
           products: JSON.stringify($scope.productjson)
        }).then(function(res) {
          if (res.status == 'Y')
          {

            $scope.viewInvoice.back();


          }
          else
          {
            $helper.toast(res.msg, 'short', 'bottom');
            console.log('else');
          }

        $scope.viewInvoiceC = {
          mode: $scope.deliveryTypeData.deliveryType,
          back: function() {
            console.log('hihihihihi');
            $scope.processCheckoutModal.hide();
            $scope.processCheckoutModal.remove();
          }
        };
        $ionicModal.fromTemplateUrl('templates/modal.view-invoice.html', {
          scope: $scope,
          animation: 'slide-in-up'
        }).then(function(modal) {
          $scope.processCheckoutModal = modal;
          console.log($scope.pdfUrl);

          modal.show();
        });

        }).catch(function(err) {
          $helper.toast(err, 'long', 'bottom');
        });

        $scope.processCheckoutModal.hide();
        $scope.processCheckoutModal.remove();
        $scope.drawingCanvasModal.hide();
        $scope.drawingCanvasModal.remove();

      }
    };


    $ionicModal.fromTemplateUrl('templates/modal.view-invoice-change.html', {
      scope: $scope,
      animation: 'slide-in-up'
    }).then(function(modal) {
      $scope.processPickUpModal = modal;
    });
  };

  $scope.minus = function(product, qty, zero){
    if (qty > zero)
    {
      product.actual_pickup_qty = product.actual_pickup_qty - 1;
      console.log('-');
    }
  };

  $scope.add = function(product, qty, max){
    if (qty < max)
    {
      product.actual_pickup_qty = product.actual_pickup_qty + 1;
      console.log('+');
    }
  };

  $scope.confirm_button = false;

  $scope.confirm_count = 0;

  $scope.change_button = function(value){

      console.log(value);
    if ($scope.confirm_button == false && value == true){
      $scope.confirm_count = $scope.confirm_count + 1;
      $scope.confirm_button = true;
      console.log($scope.confirm_button);
      console.log($scope.confirm_count);
    }

    else if ($scope.confirm_button == true && value == false){
      $scope.confirm_count = $scope.confirm_count - 1;
      if ($scope.confirm_count == 0)
        $scope.confirm_button = false;
      console.log($scope.confirm_button);
      console.log($scope.confirm_count);
    }

    else if ($scope.confirm_button == true && value == true){
      $scope.confirm_count = $scope.confirm_count + 1;
      console.log($scope.confirm_button);
      console.log($scope.confirm_count);
    }


  };

  $scope.checkQty = function(product, qty, max){
    if (qty < 0)
      product.actual_pickup_qty = 0;
    else if (qty > max)
      product.actual_pickup_qty = max;
    console.log(max);

  };

  $scope.partialPickUp = function()
  {
      $scope.processPickup($rootScope.currentInvoiceId);
  };

  //update the amount on the right
  $scope.updateAmount = function(field)
  {

    switch(field)
    {
      case 'carryUp':
        break;
      case '':
    }

  };

  //update saved detail
  // process checkout
  $scope.updateCart = function() {

    $api.setCart({
      token: $localStorage.get('settings').token,
      locale: $localStorage.get('settings').locale,
      warehouse_id: $localStorage.get('user').warehouse_id,
      action: 'address',
      invoice_id: $rootScope.currentInvoiceId,
      billing_country_id: $scope.deliveryTypeData.billingCountry,
      billing_region_id:  $scope.deliveryTypeData.billingRegion,
      billing_district_id:  $scope.deliveryTypeData.billingDistrict,
      billing_area_id:  $scope.deliveryTypeData.billingArea,
      billing_address_1:  $scope.deliveryTypeData.billingAddress1,
      billing_address_2:  $scope.deliveryTypeData.billingAddress2,
      billing_address_3:  $scope.deliveryTypeData.billingAddress3,
      billing_address_4:  $scope.deliveryTypeData.billingAddress4,
      billing_first_name: $scope.deliveryTypeData.billingFirstName,
      billing_last_name:  $scope.deliveryTypeData.billingLastName,
      billing_email:      $scope.deliveryTypeData.billingEmail,
      billing_country_code: $scope.deliveryTypeData.billingCountryCode,
      billing_mobile: $scope.deliveryTypeData.billingMobile,
      shipping_country_id:  $scope.deliveryTypeData.shippingCountry,
      shipping_region_id:   $scope.deliveryTypeData.shippingRegion,
      shipping_district_id: $scope.deliveryTypeData.shippingDistrict,
      shipping_area_id:     $scope.deliveryTypeData.shippingArea,
      shipping_address_1:   $scope.deliveryTypeData.shippingAddress1,
      shipping_address_2:   $scope.deliveryTypeData.shippingAddress2,
      shipping_address_3:   $scope.deliveryTypeData.shippingAddress3,
      shipping_address_4:   $scope.deliveryTypeData.shippingAddress4,
      shipping_first_name:  $scope.deliveryTypeData.shippingFirstName,
      shipping_last_name:   $scope.deliveryTypeData.shippingLastName,
      shipping_email:       $scope.deliveryTypeData.shippingEmail,
      shipping_country_code:  $scope.deliveryTypeData.shippingCountryCode,
      shipping_mobile:      $scope.deliveryTypeData.shippingMobile,
      pay_method:           $scope.paymentMethodData.pay_method,
      remark:               $scope.deliveryTypeData.remark,
      delivery_type:        $scope.deliveryTypeData.deliveryType,
      carry_up:             $scope.deliveryTypeData.carryUpFloor,
      pick_up_warehouse_id: $scope.deliveryTypeData.pickUpLocation,
      payment_type:         $scope.paymentTypeData.payment_type,
      payed_amount:         $scope.paymentTypeData.payed_amount,
      user_id:              $scope.deliveryTypeData.user_id,
      pick_up_country_code: $scope.deliveryTypeData.pickUpCountryCode,
      pick_up_mobile:       $scope.deliveryTypeData.pickUpMobile,
      pick_up_first_name:   $scope.deliveryTypeData.pickUpFirstName,
      pick_up_last_name:    $scope.deliveryTypeData.pickUpLastName,
      pick_up_email:        $scope.deliveryTypeData.pickUpEmail,
      custom_discount:      $scope.deliveryTypeData.specialDiscount,
      other_charge:         $scope.deliveryTypeData.specialServiceCharge,
    }).then(function(res)
    {
      if (res.status == 'Y')
      {
          $scope.cart = res.data;
      }
      else
      {
        $helper.toast(res.msg, 'short', 'bottom');
      }
    }).catch(function(err) {
      $helper.toast(err, 'long', 'bottom');
    });
  };

  /**************************************************
  // finally
  **************************************************/

  // make the view re-init data on enter
  $scope.$on('$ionicView.enter', function() {
    $scope.init();
  });

})

;
