angular.module('controllers.home', [
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
    'ionic-datepicker',
])



.controller('homeCtrl', function($scope, $rootScope, $offline, $localStorage, $cordovaFileOpener2, $filter, $translate, $helper, $ionicLoading, $api, $ionicPopup, $ionicModal, $ionicScrollDelegate, $sce, ionicDatePicker, $timeout, $ionicPopover, $ionicSlideBoxDelegate) {

    /**************************************************
    // initialize view
    **************************************************/

    $rootScope.$watch('networkResult', function(newValue, oldValue) {
        $scope.init();
    });

    $rootScope.$watch('currentLang', function(newValue, oldValue) {
        $rootScope.setPaymentList();
        console.log($rootScope.currentPayment);
        for (var i = 0; i < $rootScope.choosePaymentList.length; i++) {
            if ($rootScope.choosePaymentList[i].id == $rootScope.currentPayment.id) {
                $rootScope.currentPayment = $rootScope.choosePaymentList[i];
                return;
            }
        }
    });

    $scope.loadCategories = function(mode) {
        $rootScope.rootCategory = [];
        $api.getCategory({
            token: $localStorage.get('settings').token,
            locale: $localStorage.get('settings').locale,
            //      shop_id: $localStorage.get('settings').shop_id
        }).then(function(res) {
            if (res.status == 'Y') {
                $scope.categories = [];
                for (var i = 0; i < res.data.length; i++) {
                    if (res.data[i].enabled != '0' && res.data[i].product_count != '0')
                        $scope.categories.push(res.data[i]);
                }
                $rootScope.rootCategory = $scope.categories;
                if ($scope.categories.length > 0) {
                    $scope.loadProductList('init', $scope.categories[0].id, null, $scope.categories[0].name);
                }
                // $scope.categories = res.data;
            } else {
                $helper.toast(res.msg, 'short', 'bottom');
            }
            if (mode == 'refresh') {
                $scope.$broadcast('scroll.refreshComplete');
            }
        }).catch(function(err) {
            $helper.toast(err, 'long', 'bottom');
            if (mode == 'refresh') {
                $scope.$broadcast('scroll.refreshComplete');
            }
        });

    };

    $scope.loadCategory = function(categoryId, categoryName, children) {
        console.log('load category : ');
        console.log(categoryId + ' , ' + categoryName + ' , ' + children);
        $scope.categoriesStack.push($scope.categories);
        $scope.inRootCategory = false;
        $scope.currentCategoryStack.push({ id: categoryId, name: categoryName });
        if (children.length) {
            $scope.categories = children;
            $scope.categories = [];
            for (var i = 0; i < children.length; i++) {
                if (children[i].enabled != '0' && children[i].product_count != '0')
                    $scope.categories.push(children[i]);
            }
        } else {

            $scope.loadProductList('init', categoryId, null);
        }

    };

    $scope.productSortBy = function(orderBy) {
        if ($scope.currentOrderBy == orderBy) return;
        $scope.currentOrderBy = orderBy;
        $scope.loadProductList('refresh', $scope.currentCategory.id, $scope.searchButtonBar.homeSearchKeyword);
    };

    // load product list
    $scope.loadProductList = function(mode, categoryId, keyword, categoryName) {
        if (keyword != null)
            console.log('load product keyword:' + keyword + ', length:' + keyword.length);
        /*if (keyword != null && keyword.length == 0) {
            $helper.toast($translate.instant('SEARCH_PRODUCT_HINTS'), 'short', 'bottom');
            if (mode == 'refresh') {
                $scope.$broadcast('scroll.refreshComplete');
            }
            return;
        }*/
        if (!categoryId && !keyword) {
            $rootScope.homeSearchButtonBar.homeSearchClear();
            return;
        }

        if ($scope.cartDisplay == 'max')
            $scope.cartDisplay = 'normal';
        if (categoryName) {
            $scope.categoriesTitle = categoryName;
        }
        if ($rootScope.posting == true) {
            return;
        } else {
            $rootScope.posting = true;
        }
        if (mode != 'more' || $scope.products == undefined) {
            $scope.productLimitFrom = 0;
            $scope.productLimit = 12;
            $scope.productCount = 0;
        } else {
            $scope.productLimitFrom += $scope.productLimit;
            console.log('more');
        }
        $scope.currentCategory = {};
        $scope.currentCategory.id = categoryId;
        $scope.isSearching = true;
        $api.getProductList({
            token: $localStorage.get('settings').token,
            locale: $localStorage.get('settings').locale,
            category_ids: categoryId != undefined ? [categoryId] : null,
            keyword: (keyword != undefined && keyword != '') ? keyword : null,
            limit_from: $scope.productLimitFrom,
            limit: $scope.productLimit,
            calling_from: 'pos',
            warehouse_id: $localStorage.get('user').warehouse_id,
            order_by: $scope.currentOrderBy == null ? 0 : $scope.currentOrderBy
        }).then(function(res) {
            console.log(res);
            if (mode != 'more' || $scope.products == undefined) {
                $scope.products = [];
            }
            $rootScope.posting = false;
            $scope.isSearching = false;
            console.log('product list data:');
            if (res.status == 'Y') {
                if (res.cart != null) {
                    $scope.cart = res.cart.data;
                    // $scope.calculateCharge();
                    // $scope.cart.temp_grand_total = $scope.cart.grand_total;
                    $scope.productCount = res.data.products.count;
                    for (var i = 0; i < res.data.products.list.length; i++) {
                        $scope.products.push(res.data.products.list[i]);
                    }
                    $scope.loadProductDetail(res.data.products.list[0].id, res.sku_no);
                    $scope.homeSearchButtonBar.homeSearchKeyword = '';
                    // $scope.searchButtonBar.focus();
                } else {
                    $scope.productCount = res.data.products.count;
                    // for (var i = 0; i < res.data.products.list.length; i++) {
                    //     $scope.products.push(res.data.products.list[i]);
                    // }
                    angular.forEach(res.data.products.list, function(product) {
                        product.haveSpec = false;
                        angular.forEach(product.specifications, function(spec) {
                            if (spec.enabled && spec.selectible && spec.options.length) {
                                product.haveSpec = true;
                            }
                        });
                        $scope.products.push(product);
                    });
                    if (keyword == null) {
                        $scope.currentProducts = [];
                        $scope.currentProducts = $scope.products;
                    }
                }
            } else {
                $helper.toast(res.msg, 'short', 'bottom');
            }
            if (mode == 'refresh') {
                $scope.$broadcast('scroll.refreshComplete');
            }
            if (mode == 'more') {
                $scope.$broadcast('scroll.infiniteScrollComplete');
            }

        }).catch(function(err) {
            console.log(err);
            $scope.isSearching = false;
            $rootScope.posting = false;
            $helper.toast(err, 'long', 'bottom');
            if (mode == 'refresh') {
                $scope.$broadcast('scroll.refreshComplete');
            }
            if (mode == 'more') {
                $scope.$broadcast('scroll.infiniteScrollComplete');
            }
        });

        $scope.salesState = 'product-list';

    };

    // load product detail
    $scope.loadProductDetail = function(productId, sku) {
        $api.getProductDetail({
            token: $localStorage.get('settings').token,
            locale: $localStorage.get('settings').locale,
            product_id: productId
        }).then(function(res) {
            if (res.status == 'Y') {
                $scope.product = res.data;
                $scope.bigPhoto = $scope.product.photos[0];
                // TODO: handle qty & options
                $scope.product.addQty = 1;
                $scope.product.minAddQty = 1;
                $scope.product.addOptions = {};
                $scope.product.presaleQty = res.data.qty;
                if (sku == null) {
                    var i = 0;
                    angular.forEach($scope.product.specifications, function(spec) {
                        if (spec.enabled && spec.selectible && spec.options.length) {
                            console.log(spec);
                            $scope.product.addOptions[i] = {
                                dictionary: spec.dictionary,
                                option: spec.options[0].id
                            };
                        }
                        i++;
                    });
                } else {
                    $scope.decodeSKU(sku);
                }
                $scope.getSKUInfo();
            } else {
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
        if ($scope.product == null) {
            $scope.product = {};
            $scope.product.addOptions = {};
        }
        for (var i = 0; i < len - 1; i++) {
            var tokens = attribute[i].split("Y");
            var dict_id = parseInt(tokens[0].split("X")[1], 16);
            var opt_id = parseInt(tokens[1], 16);
            $scope.product.addOptions[i] = {
                dictionary: dict_id,
                option: opt_id
            };
        }
        $scope.product.id = parseInt(attribute[len - 1].split("P")[1], 16);
    };


    // choose sku
    $scope.chooseSKU = function(spec_id, dict_id, opt_id) {

        $scope.product.addOptions[spec_id] = {
            dictionary: dict_id,
            option: opt_id
        };
        console.log($scope.product.addOptions);
        console.log($scope.product.selectSpecifications);
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
            if (res.status == 'Y') {
                // TODO: handle qty & options
                $scope.product.addQty = 1;
                $scope.product.minAddQty = 1;
                $scope.product.sku_data = res;
                $scope.product.qty = res.local_qty;
                $scope.product.maxAddQty = res.local_qty - ($scope.product.presaleQty < 0 ? $scope.product.presaleQty : 0);
                $scope.product.reserve = res.reserved_amount;
                $scope.product.pending_out = res.local_pending_out;
                $scope.product.price = res.price;
                $scope.product.original_price = res.original_price;
                $scope.product.sku_no = res.sku;
                $scope.product.data = res.data;
                $scope.product.name = res.product_name;
                $scope.product.remarks = res.remarks;
                $scope.loadCart();
            } else {
                $helper.toast(res.msg, 'short', 'bottom');
            }
        }).catch(function(err) {
            $helper.toast(err, 'long', 'bottom');
        });
    };

    //search customer
    $scope.newCartCustomerSearchEvent = function(customerKeyword) {
        $rootScope.customerKeyword = customerKeyword;
        $scope.newCartModal.hide();
        $scope.newCartModal.remove();
        $helper.navForth('tab.customer', null, 'slide-left-right');
    };

    //search customer
    $scope.checkoutCustomerSearchEvent = function(customerKeyword) {
        console.log('ho~~~~~~~~~', customerKeyword.customerKeyword);
        if (customerKeyword.customerKeyword != null && customerKeyword.customerKeyword != '') {
            $scope.loadCustomerList('init', customerKeyword.customerKeyword);
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
        } else {
            $helper.toast($filter('translate')('MISSING_INPUT'), 'short', 'bottom');
        }

    };

    //confirm change member
    $scope.confirmChangeMember = function(user_id) {
        checkUndefined();
        $api.setCart({
            token: $localStorage.get('settings').token,
            locale: $localStorage.get('settings').locale,
            warehouse_id: $localStorage.get('user').warehouse_id,
            action: 'address',
            invoice_id: $rootScope.currentInvoiceId,
            billing_country_id: $scope.deliveryTypeData.billingCountry,
            billing_region_id: $scope.deliveryTypeData.billingRegion,
            billing_district_id: $scope.deliveryTypeData.billingDistrict,
            billing_area_id: $scope.deliveryTypeData.billingArea,
            billing_address_1: $scope.deliveryTypeData.billingAddress1,
            billing_address_2: $scope.deliveryTypeData.billingAddress2,
            billing_address_3: $scope.deliveryTypeData.billingAddress3,
            billing_address_4: $scope.deliveryTypeData.billingAddress4,
            billing_first_name: $scope.deliveryTypeData.billingFirstName,
            billing_last_name: $scope.deliveryTypeData.billingLastName,
            billing_email: $scope.deliveryTypeData.billingEmail,
            billing_country_code: $scope.deliveryTypeData.billingCountryCode,
            billing_mobile: $scope.deliveryTypeData.billingMobile,
            shipping_country_id: $scope.deliveryTypeData.shippingCountry,
            shipping_region_id: $scope.deliveryTypeData.shippingRegion,
            shipping_district_id: $scope.deliveryTypeData.shippingDistrict,
            shipping_area_id: $scope.deliveryTypeData.shippingArea,
            shipping_address_1: $scope.deliveryTypeData.shippingAddress1,
            shipping_address_2: $scope.deliveryTypeData.shippingAddress2,
            shipping_address_3: $scope.deliveryTypeData.shippingAddress3,
            shipping_address_4: $scope.deliveryTypeData.shippingAddress4,
            shipping_first_name: $scope.deliveryTypeData.shippingFirstName,
            shipping_last_name: $scope.deliveryTypeData.shippingLastName,
            shipping_email: $scope.deliveryTypeData.shippingEmail,
            shipping_country_code: $scope.deliveryTypeData.shippingCountryCode,
            shipping_mobile: $scope.deliveryTypeData.shippingMobile,
            pay_method: $scope.paymentMethodData.pay_method,
            remark: $scope.deliveryTypeData.remark,
            delivery_type: $scope.deliveryTypeData.deliveryType,
            carry_up: $scope.deliveryTypeData.carryUpFloor,
            pick_up_warehouse_id: $scope.deliveryTypeData.pickUpLocation,
            payment_type: $scope.paymentTypeData.payment_type,
            payed_amount: $scope.paymentTypeData.payed_amount,
            user_id: user_id,
            pick_up_country_code: $scope.deliveryTypeData.pickUpCountryCode,
            pick_up_mobile: $scope.deliveryTypeData.pickUpMobile,
            pick_up_first_name: $scope.deliveryTypeData.pickUpFirstName,
            pick_up_last_name: $scope.deliveryTypeData.pickUpLastName,
            pick_up_email: $scope.deliveryTypeData.pickUpEmail,
            custom_discount: $scope.deliveryTypeData.specialDiscount,
            other_charge: $scope.deliveryTypeData.specialServiceCharge,
            expected_delivery_date: $scope.deliveryTypeData.deliveryDate,
            item_total: $scope.deliveryTypeData.item_total,
            invoice_charges: angular.toJson($scope.cart.invoice_charges)
        }).then(function(res) {
            if (res.status == 'Y') {
                //$scope.loadCart();
                $scope.cart = res.data;
                $scope.calculateCharge();
                $scope.loadCheckout();
                $scope.searchMemberModal.hide();
                $scope.searchMemberModal.remove();
                $scope.deliveryTypeData.user_id = user_id;
                $scope.customerTab = false;
            } else {
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
            if (res.status == 'Y') {
                console.log(res);
                $scope.cart = res.data;
                //check o_price null
                for (var i = 0; i < $scope.cart.products.length; i++) {
                    var oPrice = $scope.cart.products[i].o_price;
                    if (oPrice == null || oPrice == '') {
                        $scope.cart.products[i].o_price = $scope.cart.products[i].unit_price;
                    }
                }
                $scope.cart.temp_grand_total = $scope.cart.grand_total;
                $scope.calculateCharge();
            } else {
                $helper.toast(res.msg, 'short', 'bottom');
                // $helper.navForth('tab.sales-saved', { saveCart: true }, 'slide-left-right');

            }
        }).catch(function(err) {
            $helper.toast(err, 'long', 'bottom');
            // $helper.navForth('tab.sales-saved', { saveCart: true }, 'slide-left-right');
        });

    };


    //load pending out
    $scope.showPOut = function(sku) {

        $scope.viewPOut = {
            back: function() {
                $scope.POutModal.hide();
                $scope.POutModal.remove();
            }
        };
        $scope.loadOutList('init', null, sku);
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

        if (mode != 'more' || $scope.outList == undefined) {
            $scope.outLimitFrom = 0;
            $scope.outLimit = 20;
            $scope.outCount = 0;
            $scope.outList = [];
        } else {
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
            if (res.status == 'Y') {
                $scope.outCount = res.data.count;
                for (var i = 0; i < res.data.length; i++) {
                    $scope.outList.push(res.data[i]);
                }
            } else {
                $helper.toast(res.msg, 'short', 'bottom');
            }
            if (mode == 'refresh') {
                $scope.$broadcast('scroll.refreshComplete');
            }
            if (mode == 'more') {
                $scope.$broadcast('scroll.infiniteScrollComplete');
            }
        }).catch(function(err) {
            $helper.toast(err, 'long', 'bottom');
            if (mode == 'refresh') {
                $scope.$broadcast('scroll.refreshComplete');
            }
            if (mode == 'more') {
                $scope.$broadcast('scroll.infiniteScrollComplete');
            }
        });

    };

    $scope.stockLookUp = function(sku) {
        if (sku != null) {
            $scope.decodeSKU(sku);
            $scope.getSKUInfo();
        }
        $scope.viewPOut = {
            back: function() {
                $scope.LookupModal.hide();
                $scope.LookupModal.remove();
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

    $scope.openReserveBox = function(record) {

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

    $scope.confirmReserveItem = function() {
        if ($scope.reserve.addQty == null) {
            $helper.toast($filter('translate')('INVALID_QUANTITY'), 'short', 'bottom');
            return;
        }
        $api.setCart({
            token: $localStorage.get('settings').token,
            locale: $localStorage.get('settings').locale,
            warehouse_id: $scope.reserve.warehouse_id,
            action: 'add',
            invoice_id: $rootScope.currentInvoiceId,
            product_id: $scope.product.id,
            qty: $scope.reserve.addQty,
            sku_no: $scope.product.sku_no,
            currency: $scope.product.currency,
            invoice_charges: angular.toJson($scope.cart.invoice_charges)
        }).then(function(res) {
            if (res.status == 'Y') {
                // TODO: handle qty & options
                //$scope.loadCart();
                $scope.cart = res.data;
                $scope.calculateCharge();
                $scope.loadProductDetail($scope.product.id, $scope.product.sku_no)
                $scope.ReserveBoxModal.hide();
                $scope.ReserveBoxModal.remove();
                $scope.LookupModal.hide();
                $scope.LookupModal.remove();
            } else {
                $helper.toast(res.msg, 'short', 'bottom');
            }
        }).catch(function(err) {
            $helper.toast(err, 'long', 'bottom');
        });

    }

    $rootScope.clearCart = function() {
        console.log('ready call clearCart');
        if ($scope.cart && $scope.cart.products.length > 0) {
            // $helper.toast($translate.instant('CLEAR_CART_SUCCESS'), 'short', 'bottom');
        }
        $scope.can_add = true;
        $rootScope.currentInvoiceId = null;
        $scope.cart = { "item_total": 0, "discount_total": 0, "delivery_total": 0, "service_total": 0, "temp_grand_total": 0, "products": [] };
    }

    $scope.init = function() {
        $scope.imgList = ['http://www.icons101.com/icon_ico/id_78425/IceCream_Cone.ico', 'data:image/png;base64,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', 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQ4GyMU3emKj7Z96dsKQ2DjXdxg2tsltSKcz_A3mfmLemxg-b2YMg', 'http://individual.icons-land.com/IconsPreview/3D-Food/PNG/256x256/Seafood_Shrimp.png'];
        // $scope.paymentList = ['ali','amex','android','apple','mastercard','Octopussmalllogo','paypal','visa','wechat'];

        // $scope.paymentTitleList = ['aliPay','amex','android','apple','master','Opmlg','paypal','visa','wechat'];

        $rootScope.setPaymentList();
        if (!$rootScope.currentPayment) {
            $rootScope.currentPayment = { id: 1, name: 'cash', code: $filter('translate')('CASH') };
        }
        $scope.cartDisplay = 'normal';

        $scope.dial_list = $localStorage.get('dial').dial_list;
        $scope.locale = $localStorage.get('settings').locale;
        $scope.title_translate = $localStorage.get('title_translate');
        $scope.checkoutReg = false;
        $scope.bigPhoto = '';
        $scope.customerTab = false;
        $scope.deliveryTypeTab = false;
        $scope.paymentTypeTab = false;
        $scope.paymentMethodTab = false;
        $scope.otherTypeTab = false;
        $scope.abs = Math.abs;
        $scope.can_add = true;
        $scope.partial_pick = false;
        $scope.inRootCategory = true;
        $scope.displayConfig = {
            category: {
                min: [0, 1, 2, 3, 4],
                normal: [0, 1, 2],
                max: [0]
            }
        };
        $scope.isSearching = false;

        console.log($rootScope.platform);
        if ($rootScope.platform == 'web') {
            $scope.loadCategories('init');
            $rootScope.loadCustomerList('init');
            $rootScope.loadMenuCustomerList('refresh');
        } else {
            if ($rootScope.networkResult) {
                $scope.loadCategories('init');
                $rootScope.loadCustomerList('init');
                $rootScope.loadMenuCustomerList('refresh');
            } else {
                document.addEventListener('deviceready', function() {
                    $scope.loadCategories('init');
                    $rootScope.loadCustomerList('init');
                    $rootScope.loadMenuCustomerList('refresh');
                });
            }
        }

        $rootScope.homeSearchButtonBar = {
            // searchHints: $translate.instant('SEARCH_PRODUCT_HINTS'),
            homeSearchHints: $filter('translate')('SEARCH_PRODUCT_HINTS'),
            homeSearchKeyword: null,
            homeSearchFor: function(keyword) {
                $scope.loadProductList('refresh', null, keyword);
            },
            homeSearchClear: function(keyword) {
                $rootScope.homeSearchButtonBar.homeSearchKeyword = null;
                $scope.products = $scope.currentProducts;
            }
        };

        $rootScope.customerSearchBar = {
            searchHints: $translate.instant('SEARCH_CUSTOMER_HINTS'),
            searchKeyword: '',
            searchFor: function(keyword) {
                console.log('search for');
                $scope.loadCustomerList('refresh', keyword);
            },
            scanQR: function() {
                document.addEventListener("deviceready", function() {

                    $helper.scan(function(scanData) {
                        if (scanData.cancelled == 0) {
                            $scope.loadCustomerList('refresh', scanData.text);
                        }
                    });
                }, false);
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

    // add to cart
    $scope.addToCartByQR = function(sku) {
        console.log('addToCartByQR :' + sku);

        $api.setCart({
            token: $localStorage.get('settings').token,
            locale: $localStorage.get('settings').locale,
            warehouse_id: $localStorage.get('user').warehouse_id,
            action: 'add',
            invoice_id: $rootScope.currentInvoiceId,
            product_id: '0',
            qty: '1',
            sku_no: sku
        }).then(function(res) {
            if (res.status == 'Y') {
                console.log(res);
                $scope.loadCart();
            } else {
                $helper.toast(res.msg, 'short', 'bottom');
            }
        }).catch(function(err) {
            $helper.toast(err, 'long', 'bottom');
        });

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
        $scope.searchButtonBar.homeSearchKeyword = null;

        switch ($scope.salesState) {
            case 'category':
                $scope.categories = $scope.categoriesStack.pop();
                $scope.currentCategoryStack.pop();
                break;
            case 'product-list':
                $scope.categories = $scope.categoriesStack.pop();
                $scope.currentCategoryStack.pop();
                if ($scope.categories == undefined) {
                    console.log('category = undefined !!!!!');
                    $scope.categories = $rootScope.rootCategory;
                    $scope.currentCategoryStack = [{ id: null, name: $translate.instant('CATEGORIES') }];
                }
                $scope.salesState = 'category';
                $scope.products = null;
                break;

            case 'product-detail':
                $scope.salesState = 'product-list';
                if ($scope.products == null) {
                    $scope.salesState = 'category';
                }
                break;
            case 'checkout':
                break;
        }

        console.log('category length: ');
        console.log($scope.categoriesStack.length);
        $scope.inRootCategory = $scope.categoriesStack.length < 1 ? true : false;
    };

    // plus add to cart qty
    $scope.plusAddQty = function() {
        console.log('plus add sku:' + $scope.editSku + ', item:' + $scope.editItemId);
        $scope.cartItem.qty++;
        $api.setCart({
            token: $localStorage.get('settings').token,
            locale: $localStorage.get('settings').locale,
            warehouse_id: $localStorage.get('user').warehouse_id,
            action: 'update',
            invoice_id: $rootScope.currentInvoiceId,
            product_id: $scope.cartItem.id,
            item_id: $scope.editItemId ? $scope.editItemId : $scope.cartItem.item_id,
            sku_no: $scope.editSku ? $scope.editSku : $scope.cartItem.sku_no,
            qty: $scope.cartItem.qty
        }).then(function(res) {
            if (res.status == 'Y') {
                $scope.cart = res.data;
                for (var i = 0; i < res.data.products.length; i++) {
                    if ($scope.editItemId == res.data.products[i].item_id) {
                        $scope.cartItem.qty = res.data.products[i].qty;
                    }
                }
                $scope.cart.temp_grand_total = $scope.cart.grand_total;
                $scope.calculateCharge();
            } else {
                $scope.cartItem.qty--;
                $helper.toast(res.msg, 'short', 'bottom');
            }
        }).catch(function(err) {
            $scope.cartItem.qty--;
            $helper.toast(err, 'long', 'bottom');
        });
    };

    // minus add to cart qty
    $scope.minusAddQty = function() {
        console.log('minus add sku:' + $scope.editSku + ', item:' + $scope.editItemId);

        $scope.cartItem.qty--;
        $api.setCart({
            token: $localStorage.get('settings').token,
            locale: $localStorage.get('settings').locale,
            warehouse_id: $localStorage.get('user').warehouse_id,
            action: 'update',
            invoice_id: $rootScope.currentInvoiceId,
            product_id: $scope.cartItem.id,
            item_id: $scope.editItemId ? $scope.editItemId : $scope.cartItem.item_id,
            sku_no: $scope.editSku ? $scope.editSku : $scope.cartItem.sku_no,
            qty: $scope.cartItem.qty
        }).then(function(res) {
            if (res.status == 'Y') {
                $scope.cart = res.data;
                for (var i = 0; i < res.data.products.length; i++) {
                    if ($scope.editItemId == res.data.products[i].item_id) {
                        $scope.cartItem.qty = res.data.products[i].qty;
                    }
                }
                $scope.cart.temp_grand_total = $scope.cart.grand_total;
                $scope.calculateCharge();
            } else {
                $scope.cartItem.qty++;
                $helper.toast(res.msg, 'short', 'bottom');
            }
        }).catch(function(err) {
            $scope.cartItem.qty++;
            $helper.toast(err, 'long', 'bottom');
        });
    };



    // check addQTY
    $scope.checkAddQty = function() {
        console.log('max: ' + $scope.product.maxAddQty);
        console.log($scope.product.addQty);
        console.log($scope.product.minAddQty);
        // if ($scope.product.addQty > $scope.product.maxAddQty) {
        //     $scope.product.addQty = $scope.product.maxAddQty;
        // }
        if ($scope.product.addQty == null) {

        }
    };

    // check addQty of reserve
    $scope.checkreserveAddQty = function() {
        if ($scope.reserve.addQty > $scope.reserve.qty) {
            $scope.reserve.addQty = $scope.reserve.qty;
        }
        if ($scope.reserve.addQty == null) {

        }
    };

    $scope.addToCart = function(product, $event) {
        if (!$scope.can_add) {
            console.log('add to cart is loading, cannot add');
            return;
        }
        $scope.can_add = false;
        $scope.addOptions = {};
        var i = 0;
        angular.forEach(product.specifications, function(spec) {
            if (spec.enabled && spec.selectible && spec.options.length) {
                console.log(spec);
                $scope.addOptions[i] = {
                    dictionary: spec.dictionary,
                    option: spec.options[0].id
                };
            }
            i++;
        });
        var spec = [];
        angular.forEach($scope.addOptions, function(opt) {
            spec.push(opt);
        });
        console.log(product);
        console.log(spec.length);
        if ($rootScope.currentInvoiceId) {
            $api.setCart({
                token: $localStorage.get('settings').token,
                locale: $localStorage.get('settings').locale,
                warehouse_id: $localStorage.get('user').warehouse_id,
                action: 'add',
                invoice_id: $rootScope.currentInvoiceId,
                product_id: product.id,
                qty: product.qty ? product.qty : 1,
                spec: JSON.stringify(spec),
                // currency: $scope.product.currency,
                invoice_charges: angular.toJson($scope.cart.invoice_charges)
            }).then(function(res) {
                if (res.status == 'Y') {
                    console.log(res);
                    $scope.cart = res.data;
                    $scope.cart.temp_grand_total = $scope.cart.grand_total;
                    $scope.calculateCharge();
                    for (var i = 0; i < $scope.cart.products.length; i++) {
                        //add to cart 后调出 edit cart
                        if ($scope.cart.products[i].item_id == res.item_id) {
                            $scope.cart.products[i].specifications = product.specifications;
                            if (spec.length > 0) {
                                console.log('editCartItem :' + i);
                                $scope.editCartItem($scope.cart.products[i], $event);
                                return;
                            }
                        }
                    }
                    $scope.can_add = true;
                    /*******TODO*******/
                    var item = document.getElementById('buy-cart');
                    console.log(item);
                    var len = item.scrollHeight +80;
                      item.scrollTop = 500;
                    console.log(item.scrollHeight,999);
                    console.log(item.scrollTop,1111);


                } else {
                    $helper.toast(res.msg, 'short', 'bottom');
                    $scope.can_add = true;
                }

            }).catch(function(err) {
                $scope.can_add = true;
                $helper.toast(err, 'long', 'bottom');
            });
        } else {
            $api.newCart({
                token: $localStorage.get('settings').token,
                locale: $localStorage.get('settings').locale
            }).then(function(res) {
                if (res.status == 'Y') {
                    $rootScope.currentInvoiceId = res.invoice_id;
                    $api.setCart({
                        token: $localStorage.get('settings').token,
                        locale: $localStorage.get('settings').locale,
                        warehouse_id: $localStorage.get('user').warehouse_id,
                        action: 'add',
                        invoice_id: $rootScope.currentInvoiceId,
                        product_id: product.id,
                        qty: 1,
                        spec: JSON.stringify(spec),
                        // currency: $scope.product.currency,
                        invoice_charges: angular.toJson($scope.cart.invoice_charges)
                    }).then(function(res) {
                        if (res.status == 'Y') {
                            console.log(res);
                            $scope.cart = res.data;
                            $scope.cart.temp_grand_total = $scope.cart.grand_total;
                            $scope.calculateCharge();
                            for (var i = 0; i < $scope.cart.products.length; i++) {
                                //add to cart 后调出 edit cart
                                if ($scope.cart.products[i].item_id == res.item_id) {
                                    $scope.cart.products[i].specifications = product.specifications;
                                    if (spec.length > 0) {
                                        console.log('editCartItem :' + i);
                                        $scope.editCartItem($scope.cart.products[i], $event);
                                        return;
                                    }
                                }
                            }
                            $scope.can_add = true;




                        } else {
                            $helper.toast(res.msg, 'short', 'bottom');
                            $scope.can_add = true;
                        }

                    }).catch(function(err) {
                        $scope.can_add = true;
                        $helper.toast(err, 'long', 'bottom');
                    });
                } else {
                    $helper.toast(res.msg, 'short', 'bottom');
                }
            }).catch(function(err) {
                $helper.toast(err, 'long', 'bottom');
            });
        }



    };

    // save cart
    $scope.saveCart = function() {
        $helper.navForth('tab.sales-saved', { saveCart: true }, 'slide-left-right');
        // $timeout(function(){$rootScope.currentInvoiceId = null},1000);
    };

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
            countryCode: '852',
            mobile: ''
        };
        $ionicModal.fromTemplateUrl('templates/modal.new-cart.html', {
            scope: $scope,
            animation: 'slide-in-up'
        }).then(function(modal) {
            $scope.newCartModal = modal;
            modal.show();
            // $scope.saveCart();
        });

    };

    $scope.newCartScan = function() {
        document.addEventListener("deviceready", function() {

            $helper.scan(function(scanData) {
                if (scanData.cancelled == 0) {
                    console.log(scanData.text);

                    $rootScope.customerScanKeyword = scanData.text;
                    $scope.newCartModal.hide();
                    $scope.newCartModal.remove();
                    $helper.navForth('tab.customer', null, 'slide-left-right');
                }
            });
        }, false);

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
                countryCode: '852',
                mobile: ''
            };

    };


    $scope.cancelNewCart = function() {

        $scope.newCartModal.hide();
        $scope.newCartModal.remove();

    };


    $scope.confirmNewCart = function(mode) {
        if (mode == 'VISITOR') {
            $api.newCart({
                token: $localStorage.get('settings').token,
                locale: $localStorage.get('settings').locale,
                billing_last_name: $scope.newVisitor.lastName,
                gender: $scope.newVisitor.titleId,
                check_out_warehouse_id: $localStorage.get('user').warehouse_id
            }).then(function(res) {
                if (res.status == 'Y') {
                    $scope.newCartModal.hide();
                    $scope.newCartModal.remove();
                    $rootScope.currentInvoiceId = res.invoice_id;
                    $scope.loadCart();
                    if ($scope.salesState == 'checkout') {
                        $scope.salesState = $scope.salesState_beforeCheckOut;
                    }
                } else {
                    $helper.toast(res.msg, 'short', 'bottom');
                }
            }).catch(function(err) {
                $helper.toast(err, 'long', 'bottom');
            });
        }
        if (mode == 'MEMBER') {
            $api.newMember({
                token: $localStorage.get('settings').token,
                locale: $localStorage.get('settings').locale,
                first_name: $scope.newMember.firstName,
                last_name: $scope.newMember.lastName,
                email: $scope.newMember.email,
                country_code: $scope.newMember.countryCode,
                mobile: $scope.newMember.mobile,
            }).then(function(res) {
                if (res.status == 'Y') {
                    $api.newCart({
                        token: $localStorage.get('settings').token,
                        locale: $localStorage.get('settings').locale,
                        user_id: res.user_id,
                        check_out_warehouse_id: $localStorage.get('user').warehouse_id
                    }).then(function(res) {
                        if (res.status == 'Y') {
                            $scope.newCartModal.hide();
                            $scope.newCartModal.remove();
                            $rootScope.currentInvoiceId = res.invoice_id;
                            $scope.loadCart();
                            if ($scope.salesState == 'checkout') {
                                $scope.salesState = $scope.salesState_beforeCheckOut;
                            }
                        } else {
                            $helper.toast(res.msg, 'short', 'bottom');
                        }
                    }).catch(function(err) {
                        $helper.toast(err, 'long', 'bottom');
                    });
                } else {
                    $helper.toast(res.msg, 'short', 'bottom');
                }
            }).catch(function(err) {
                $helper.toast(err, 'long', 'bottom');
            });


        }
    };

    //choose new member code
    $scope.selectNewMemberDial = function() {
        if ($rootScope.countryCodeList == null) {
            $rootScope.countryCodeList = [];
            var list = $localStorage.get('dial').dial_list;
            for (var i = 0; i < list.length; i++) {
                var title = list[i];
                $rootScope.countryCodeList.push({
                    name: title.country_name,
                    value: title.dial_code,
                    checked: title.dial_code == $scope.newMember.countryCode,
                    data: title
                });
            }
        }
        $scope.countryOptions = $rootScope.countryCodeList.slice(0, 10);
        var limit = 0;
        var dialList = $localStorage.get('dial').dial_list;
        $helper.countryCodePick({
            scope: $scope,
            title: 'SELECT_COUNTRY_CODE',
            options: $scope.countryOptions,
            multiple: false,
            template: 'templates/common.country-code-picker.html',
            confirmCallback: function(selectedObjs) {
                $scope.newMember.countryCode = selectedObjs[0].value;
            },
            loadMoreFunc: function() {
                $scope.$broadcast('scroll.infiniteScrollComplete');
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
    $scope.checkoutRegisterSubmit = function(form) {
        //console.log($scope.newMember);
        if (form.$valid) {
            $api.newMember({
                token: $localStorage.get('settings').token,
                locale: $localStorage.get('settings').locale,
                first_name: $scope.newMember.firstName,
                last_name: $scope.newMember.lastName,
                email: $scope.newMember.email,
                country_code: $scope.newMember.countryCode,
                mobile: $scope.newMember.mobile,
            }).then(function(res) {
                if (res.status == 'Y') {
                    checkUndefined();
                    $api.setCart({
                        token: $localStorage.get('settings').token,
                        locale: $localStorage.get('settings').locale,
                        warehouse_id: $localStorage.get('user').warehouse_id,
                        action: 'address',
                        invoice_id: $rootScope.currentInvoiceId,
                        billing_country_id: $scope.deliveryTypeData.billingCountry,
                        billing_region_id: $scope.deliveryTypeData.billingRegion,
                        billing_district_id: $scope.deliveryTypeData.billingDistrict,
                        billing_area_id: $scope.deliveryTypeData.billingArea,
                        billing_address_1: $scope.deliveryTypeData.billingAddress1,
                        billing_address_2: $scope.deliveryTypeData.billingAddress2,
                        billing_address_3: $scope.deliveryTypeData.billingAddress3,
                        billing_address_4: $scope.deliveryTypeData.billingAddress4,
                        billing_first_name: $scope.deliveryTypeData.billingFirstName,
                        billing_last_name: $scope.deliveryTypeData.billingLastName,
                        billing_email: $scope.deliveryTypeData.billingEmail,
                        billing_country_code: $scope.deliveryTypeData.billingCountryCode,
                        billing_mobile: $scope.deliveryTypeData.billingMobile,
                        shipping_country_id: $scope.deliveryTypeData.shippingCountry,
                        shipping_region_id: $scope.deliveryTypeData.shippingRegion,
                        shipping_district_id: $scope.deliveryTypeData.shippingDistrict,
                        shipping_area_id: $scope.deliveryTypeData.shippingArea,
                        shipping_address_1: $scope.deliveryTypeData.shippingAddress1,
                        shipping_address_2: $scope.deliveryTypeData.shippingAddress2,
                        shipping_address_3: $scope.deliveryTypeData.shippingAddress3,
                        shipping_address_4: $scope.deliveryTypeData.shippingAddress4,
                        shipping_first_name: $scope.deliveryTypeData.shippingFirstName,
                        shipping_last_name: $scope.deliveryTypeData.shippingLastName,
                        shipping_email: $scope.deliveryTypeData.shippingEmail,
                        shipping_country_code: $scope.deliveryTypeData.shippingCountryCode,
                        shipping_mobile: $scope.deliveryTypeData.shippingMobile,
                        pay_method: $scope.paymentMethodData.pay_method,
                        remark: $scope.deliveryTypeData.remark,
                        delivery_type: $scope.deliveryTypeData.deliveryType,
                        carry_up: $scope.deliveryTypeData.carryUpFloor,
                        pick_up_warehouse_id: $scope.deliveryTypeData.pickUpLocation,
                        payment_type: $scope.paymentTypeData.payment_type,
                        payed_amount: $scope.paymentTypeData.payed_amount,
                        user_id: res.user_id,
                        pick_up_country_code: $scope.deliveryTypeData.pickUpCountryCode,
                        pick_up_mobile: $scope.deliveryTypeData.pickUpMobile,
                        pick_up_first_name: $scope.deliveryTypeData.pickUpFirstName,
                        pick_up_last_name: $scope.deliveryTypeData.pickUpLastName,
                        pick_up_email: $scope.deliveryTypeData.pickUpEmail,
                        custom_discount: $scope.deliveryTypeData.specialDiscount,
                        other_charge: $scope.deliveryTypeData.specialServiceCharge,
                        expected_delivery_date: $scope.deliveryTypeData.deliveryDate,
                        invoice_charges: angular.toJson($scope.cart.invoice_charges)
                    }).then(function(res) {
                        if (res.status == 'Y') {
                            //$scope.loadCart();
                            $scope.cart = res.data;
                            $scope.calculateCharge();
                            $scope.loadCheckout();
                            $scope.checkoutReg = !$scope.checkoutReg;
                            $scope.customerTab = false;

                        } else {
                            $helper.toast(res.msg, 'short', 'bottom');
                        }
                    }).catch(function(err) {
                        $helper.toast(err, 'long', 'bottom');
                    });
                } else {
                    $helper.toast(res.msg, 'short', 'bottom');
                }
            }).catch(function(err) {
                $helper.toast(err, 'long', 'bottom');
            });
        }

    };

    $scope.editCartItem = function(item, $event) {
        $scope.cartItem = item;
        if (!$scope.editSku) {
            $scope.editSku = item.sku_no;
        }
        if (!$scope.editItemId) {
            $scope.editItemId = item.item_id;
        }
        console.log('edit cart sku:' + $scope.editSku + ', item:' + $scope.editItemId);
        if (!item.specifications) {
            $api.getProductDetail({
                token: $localStorage.get('settings').token,
                locale: $localStorage.get('settings').locale,
                product_id: item.id
            }).then(function(res) {
                if (res.status == 'Y') {
                    $scope.cartItem.specifications = res.data.specifications;
                    $scope.product = res.data;
                    $scope.product.addOptions = {};
                    $scope.selectSpecifications = [];
                    var i = 0;
                    angular.forEach($scope.product.specifications, function(spec) {
                        if (spec.enabled && spec.selectible && spec.options.length) {
                            angular.forEach(spec.options, function(opt) {
                                angular.forEach(item.options[i].options, function(option) {
                                    if (option == opt.name) {
                                        console.log(opt.name);
                                        opt.selected = true;
                                    }
                                });
                            });
                            $scope.selectSpecifications.push(spec);

                            $scope.product.addOptions[i] = {
                                dictionary: spec.dictionary,
                                option: spec.options[0].id
                            };
                            i++;
                        }
                    });
                    console.log($scope.product.addOptions);
                    console.log($scope.product.specifications);

                    $scope.editSku = null;
                    $scope.editItemId = null;
                    $scope.can_add = true;
                    if ($event != undefined) {
                        if ($scope.cartDisplay != 'normal') {
                            $scope.cartDisplay = 'normal';
                            $timeout(function() {
                                $scope.popoverEditCart($event);
                            }, 600);
                        } else {
                            $scope.popoverEditCart($event);
                        }
                    }
                } else {
                    $helper.toast(res.msg, 'short', 'bottom');
                }
            }).catch(function(err) {
                $helper.toast(err, 'long', 'bottom');
            });
        } else {
            $scope.cartItem.specifications = item.specifications;
            $scope.product = item;
            $scope.product.addOptions = {};
            $scope.selectSpecifications = [];
            var i = 0;
            angular.forEach($scope.product.specifications, function(spec) {
                if (spec.enabled && spec.selectible && spec.options.length) {
                    angular.forEach(spec.options, function(opt) {
                        angular.forEach(item.options[i].options, function(option) {
                            if (option == opt.name) {
                                console.log(opt.name);
                                opt.selected = true;
                            }
                        });
                    });
                    $scope.selectSpecifications.push(spec);

                    $scope.product.addOptions[i] = {
                        dictionary: spec.dictionary,
                        option: spec.options[0].id
                    };
                    i++;
                }
            });
            console.log($scope.product.addOptions);
            console.log($scope.product.specifications);

            $scope.editSku = null;
            $scope.editItemId = null;
            $scope.can_add = true;
            if ($event != undefined) {
                if ($scope.cartDisplay != 'normal') {
                    $scope.cartDisplay = 'normal';
                    $timeout(function() {
                        $scope.popoverEditCart($event);
                    }, 600);
                } else {
                    $scope.popoverEditCart($event);
                }
            }
        }

    };

    // choose sku
    $scope.chooseSKU = function(spec_id, dict_id, opt_id) {

        $scope.product.addOptions[spec_id] = {
            dictionary: dict_id,
            option: opt_id
        };
        console.log($scope.product.addOptions);
        console.log($scope.selectSpecifications);
        $scope.getSKUInfo();
    };

    $scope.editCartOptions = function(item, spec_id, dict_id, opt_id) {
        if (!$scope.editSku) {
            $scope.editSku = item.sku_no;
        }
        if (!$scope.editItemId) {
            $scope.editItemId = item.item_id;
        }
        console.log($scope.product.addOptions);
        console.log('edit options sku:' + $scope.editSku + ', item:' + $scope.editItemId);

        $scope.product.addOptions[spec_id] = {
            dictionary: dict_id,
            option: opt_id
        };
        console.log($scope.product.addOptions);
        console.log('spec_id:' + spec_id + ', dict_id:' + dict_id + ', opt_id:' + opt_id);
        angular.forEach($scope.selectSpecifications[spec_id].options, function(option) {
            option.selected = false;
            if (option.id == opt_id) {
                option.selected = true;
            }
        });
        console.log($scope.selectSpecifications);
        var spec = [];
        angular.forEach($scope.product.addOptions, function(opt) {
            spec.push(opt);
        });
        $api.setCart({
            token: $localStorage.get('settings').token,
            locale: $localStorage.get('settings').locale,
            warehouse_id: $localStorage.get('user').warehouse_id,
            action: 'remove',
            invoice_id: $rootScope.currentInvoiceId,
            product_id: item.id,
            item_id: $scope.editItemId,
            sku_no: $scope.editSku
        }).then(function(res) {
            if (res.status == 'Y') {
                $api.setCart({
                    token: $localStorage.get('settings').token,
                    locale: $localStorage.get('settings').locale,
                    warehouse_id: $localStorage.get('user').warehouse_id,
                    action: 'add',
                    invoice_id: $rootScope.currentInvoiceId,
                    product_id: item.id,
                    qty: $scope.cartItem.qty,
                    spec: JSON.stringify(spec),
                    // currency: $scope.product.currency,
                    invoice_charges: angular.toJson($scope.cart.invoice_charges)
                }).then(function(res) {
                    if (res.status == 'Y') {
                        $scope.editSku = res.sku;
                        $scope.editItemId = res.item_id;
                        console.log(res);
                        console.log('addToCart sku:' + $scope.editSku + ', item:' + $scope.editItemId);
                        $scope.cart = res.data;
                        $scope.can_add = true;
                        for (var i = 0; i < $scope.cart.products.length; i++) {
                            //add to cart 后调出 edit cart
                            if ($scope.cart.products[i].id == item.id) {
                                $scope.cart.products[i].specifications = item.specifications;
                                // $scope.editCartItem($scope.cart.products[i], $event);
                            }
                        }
                        for (var i = 0; i < res.data.products.length; i++) {
                            if ($scope.editItemId == res.data.products[i].item_id) {
                                $scope.cartItem.qty = res.data.products[i].qty;
                            }
                        }
                        $scope.cart.temp_grand_total = $scope.cart.grand_total;
                        $scope.calculateCharge();
                    } else {
                        $helper.toast(res.msg, 'short', 'bottom');
                        $scope.can_add = true;
                    }

                }).catch(function(err) {
                    $scope.can_add = true;
                    $helper.toast(err, 'long', 'bottom');
                });
            } else {
                $helper.toast(res.msg, 'short', 'bottom');
            }
        }).catch(function(err) {
            $helper.toast(err, 'long', 'bottom');
        });

    };

    $scope.popoverEditCart = function($event) {
        console.log('show edit cart');
        $ionicPopover.fromTemplateUrl('templates/popover.edit-cart.html', {
            scope: $scope
        }).then(function(popover) {
            $scope.slectIndex = 0;
            $scope.popover = popover;
            $scope.popover.show($event);
            $scope.popoverBack = function() {
                if ($scope.popover) {
                    $scope.popover.hide();
                    $scope.popover.remove();
                }
            };
        });
    };


    $scope.changeTotal = function(option) {
        console.log(option);
    };

    $scope.cartQtychange = function() {
        checkQty();
    };
    $scope.plusCartItemQty = function() {
        if (!angular.isNumber($scope.cartItem.qty)) return;
        $scope.cartItem.qty++;

        // if ($scope.cartItem.qty > $scope.cartItem.maxQty) {
        //     $scope.cartItem.qty = $scope.cartItem.maxQty;
        // } else {
        //     $scope.cartItem.avbl_qty--;
        // }
        // $scope.cartItem.avbl_qty = $scope.cartItem.avbl_qty_ref - $scope.cartItem.qty + $scope.cartItem.qty_ref;
        checkQty();
    };

    $scope.minusCartItemQty = function() {
        if (!angular.isNumber($scope.cartItem.qty)) return;
        $scope.cartItem.qty--;

        // if ($scope.cartItem.qty < $scope.cartItem.minQty) {
        //     $scope.cartItem.qty = $scope.cartItem.minQty;

        // } else {
        //     $scope.cartItem.avbl_qty++;
        // }
        // $scope.cartItem.avbl_qty = $scope.cartItem.avbl_qty_ref - $scope.cartItem.qty + $scope.cartItem.qty_ref;
        checkQty();
    };

    var checkQty = function() {
        if ($scope.cartItem.qty == null) return;
        if ($scope.cartItem.qty > $scope.cartItem.maxQty) {
            $scope.cartItem.qty = $scope.cartItem.maxQty;
        } else {
            if ($scope.cartItem.qty < $scope.cartItem.minQty) {
                $scope.cartItem.qty = $scope.cartItem.minQty;
            }
        }
        $scope.cartItem.avbl_qty = $scope.cartItem.avbl_qty_ref - $scope.cartItem.qty + $scope.cartItem.qty_ref;
        console.log($scope.cartItem.qty);
    };

    $scope.confirmDeleteEditCartItem = function(item) {
        console.log(item);
        $helper.popConfirm($filter('translate')('REMIND'), $filter('translate')('DELETE_CART_MSG'), function(res) {
            if (res) {
                $scope.deleteEditCartItem(item);
            }
        });
    };

    $scope.deleteEditCartItem = function(item) {
        if (!$scope.editSku) {
            $scope.editSku = item.sku_no;
        }
        if (!$scope.editItemId) {
            $scope.editItemId = item.item_id;
        }
        console.log('rm sku:' + $scope.editSku + ', item:' + $scope.editItemId);
        if (item != null) {
            $scope.cartItem.id = item.id;
            $scope.cartItem.skuNo = item.sku_no;
        }
        $api.setCart({
            token: $localStorage.get('settings').token,
            locale: $localStorage.get('settings').locale,
            warehouse_id: $localStorage.get('user').warehouse_id,
            action: 'remove',
            invoice_id: $rootScope.currentInvoiceId,
            item_id: $scope.editItemId,
            product_id: item.id,
            sku_no: $scope.editSku
        }).then(function(res) {
            if (res.status == 'Y') {
                // $scope.loadProductDetail($scope.cartItem.id, $scope.cartItem.skuNo);
                $scope.loadCart();
                $scope.popoverBack();
            } else {
                $helper.toast(res.msg, 'short', 'bottom');
            }
        }).catch(function(err) {
            $helper.toast(err, 'long', 'bottom');
        });
    };

    $scope.resetCartItem = function(item, spec, option) {
        option.selected = false;
        spec.options[0].selected = true;
        console.log(spec);
        console.log(option);
        console.log($scope.addOptions);
        console.log($scope.selectSpecifications);

        // reset options by select and generate spec
        $scope.addOptions = {};
        var i = 0;
        angular.forEach($scope.selectSpecifications, function(selectSpec) {
            angular.forEach(selectSpec.options, function(opt) {
                if (opt.selected == true) {
                    $scope.addOptions[i] = {
                        dictionary: selectSpec.dictionary,
                        option: opt.id
                    };
                }
                i++;
            });
        });
        var spec = [];
        angular.forEach($scope.addOptions, function(opt) {
            spec.push(opt);
        });
        console.log(spec);

        if (!$scope.editSku) {
            $scope.editSku = item.sku_no;
        }
        if (!$scope.editItemId) {
            $scope.editItemId = item.item_id;
        }
        console.log('reset sku:' + $scope.editSku + ', item:' + $scope.editItemId);
        $api.setCart({
            token: $localStorage.get('settings').token,
            locale: $localStorage.get('settings').locale,
            warehouse_id: $localStorage.get('user').warehouse_id,
            action: 'remove',
            invoice_id: $rootScope.currentInvoiceId,
            item_id: $scope.editItemId,
            product_id: item.id,
            sku_no: $scope.editSku
        }).then(function(res) {
            if (res.status == 'Y') {
                // $scope.loadProductDetail($scope.cartItem.id, $scope.cartItem.skuNo);
                // $scope.popoverBack();
                // $scope.addToCart(item);

                $api.setCart({
                    token: $localStorage.get('settings').token,
                    locale: $localStorage.get('settings').locale,
                    warehouse_id: $localStorage.get('user').warehouse_id,
                    action: 'add',
                    invoice_id: $rootScope.currentInvoiceId,
                    product_id: item.id,
                    qty: $scope.cartItem.qty,
                    spec: JSON.stringify(spec),
                    // currency: $scope.product.currency,
                    invoice_charges: angular.toJson($scope.cart.invoice_charges)
                }).then(function(res) {
                    if (res.status == 'Y') {
                        $scope.editSku = res.sku;
                        $scope.editItemId = res.item_id;
                        console.log(res);
                        console.log('addToCart sku:' + $scope.editSku + ', item:' + $scope.editItemId);
                        $scope.cart = res.data;
                        $scope.can_add = true;
                        for (var i = 0; i < $scope.cart.products.length; i++) {
                            //add to cart 后调出 edit cart
                            if ($scope.cart.products[i].id == item.id) {
                                $scope.cart.products[i].specifications = item.specifications;
                                // $scope.editCartItem($scope.cart.products[i], $event);
                            }
                        }
                        for (var i = 0; i < res.data.products.length; i++) {
                            if ($scope.editItemId == res.data.products[i].item_id) {
                                $scope.cartItem.qty = res.data.products[i].qty;
                            }
                        }
                        $scope.cart.temp_grand_total = $scope.cart.grand_total;
                        $scope.calculateCharge();
                    } else {
                        $helper.toast(res.msg, 'short', 'bottom');
                        $scope.can_add = true;
                    }

                }).catch(function(err) {
                    $scope.can_add = true;
                    $helper.toast(err, 'long', 'bottom');
                });

            } else {
                $helper.toast(res.msg, 'short', 'bottom');
            }
        }).catch(function(err) {
            $helper.toast(err, 'long', 'bottom');
        });
    }

    $scope.confirmEditCartItem = function() {

        if ($scope.cartItem.qty == undefined || ($scope.cartItem.qty > $scope.cartItem.maxQty)) {
            console.log('confirm edit');
            $helper.toast($filter('translate')('QTY_LACK'), 'short', 'top');
            return;
        }
        $api.setCart({
            token: $localStorage.get('settings').token,
            locale: $localStorage.get('settings').locale,
            warehouse_id: $localStorage.get('user').warehouse_id,
            action: 'update',
            invoice_id: $rootScope.currentInvoiceId,
            product_id: $scope.cartItem.id,
            item_id: $scope.cartItem.item_id,
            sku_no: $scope.cartItem.skuNo,
            qty: $scope.cartItem.qty,
            invoice_charges: angular.toJson($scope.cart.invoice_charges)
        }).then(function(res) {
            if (res.status == 'Y') {
                $scope.editCartItemModal.hide();
                $scope.editCartItemModal.remove();
                $scope.loadProductDetail($scope.cartItem.id, $scope.cartItem.skuNo);
                //$scope.loadCart();
                $scope.cart = res.data;
                $scope.calculateCharge();
            } else {
                $helper.toast(res.msg, 'short', 'bottom');
            }
        }).catch(function(err) {
            $helper.toast(err, 'long', 'bottom');
        });

    };


    //update the shipping area

    $scope.updateShipping = function() {



    };

    //shpping same as billing
    $scope.ShippingSameAsBilling = function() {
        if ($scope.deliveryTypeData.sameAsBilling) {
            $scope.deliveryTypeData.shippingCountry = $scope.deliveryTypeData.billingCountry;
            $scope.deliveryTypeData.shippingRegion = $scope.deliveryTypeData.billingRegion;
            $scope.deliveryTypeData.shippingDistrict = $scope.deliveryTypeData.billingDistrict;
            $scope.deliveryTypeData.shippingArea = $scope.deliveryTypeData.billingArea;
            $scope.deliveryTypeData.shippingCountry_name = $scope.deliveryTypeData.billingCountry_name;
            $scope.deliveryTypeData.shippingRegion_name = $scope.deliveryTypeData.billingRegion_name;
            $scope.deliveryTypeData.shippingDistrict_name = $scope.deliveryTypeData.billingDistrict_name;
            $scope.deliveryTypeData.shippingArea_name = $scope.deliveryTypeData.billingArea_name;
            $scope.deliveryTypeData.shippingAddress1 = $scope.deliveryTypeData.billingAddress1;
            $scope.deliveryTypeData.shippingAddress2 = $scope.deliveryTypeData.billingAddress2;
            $scope.deliveryTypeData.shippingAddress3 = $scope.deliveryTypeData.billingAddress3;
            $scope.deliveryTypeData.shippingAddress4 = $scope.deliveryTypeData.billingAddress4;
            $scope.deliveryTypeData.shippingFirstName = $scope.deliveryTypeData.billingFirstName;
            $scope.deliveryTypeData.shippingLastName = $scope.deliveryTypeData.billingLastName;
            $scope.deliveryTypeData.shippingEmail = $scope.deliveryTypeData.billingEmail;
            $scope.deliveryTypeData.shippingCountryCode = $scope.deliveryTypeData.billingCountryCode;
            $scope.deliveryTypeData.shippingMobile = $scope.deliveryTypeData.billingMobile;
            $scope.updateCart();
        }
    }

    // process checkout
    $scope.processCheckout = function() {
        console.log('ready call checkout');
        console.log($scope.cart.products);
        console.log($scope.cart.invoice_charges);
        if ($scope.cart.products.length < 1) {
            $helper.toast($translate.instant('THIS_CART_IS_EMPTY'), 'short', 'bottom');
            return;
        }
        var buf_pay_method = 'Cash';
        $api.checkOut({
            token: $localStorage.get('settings').token,
            locale: $localStorage.get('settings').locale,
            warehouse_id: $localStorage.get('user').warehouse_id,
            //       action: 'address',
            invoice_id: $rootScope.currentInvoiceId,
            pay_method: $scope.currentPayment.code,
            remark: $rootScope.currentOrderType.code,
            invoice_charges: angular.toJson($scope.cart.invoice_charges)
                /*,
                            billing_first_name: typeof $scope.deliveryTypeData.billingFirstName !== "undefined" ? $scope.deliveryTypeData.billingFirstName : '',
                            billing_last_name: typeof $scope.deliveryTypeData.billingLastName !== "undefined" ? $scope.deliveryTypeData.billingLastName : '',
                            billing_country_id: $scope.deliveryTypeData.billingCountry,
                            billing_region_id: $scope.deliveryTypeData.billingRegion,
                            billing_district_id: $scope.deliveryTypeData.billingDistrict,
                            billing_area_id: $scope.deliveryTypeData.billingArea,
                            billing_address_1: $scope.deliveryTypeData.billingAddress1,
                            billing_address_2: $scope.deliveryTypeData.billingAddress2,
                            billing_address_3: $scope.deliveryTypeData.billingAddress3,
                            billing_address_4: $scope.deliveryTypeData.billingAddress4,
                            billing_first_name: typeof $scope.deliveryTypeData.billingFirstName !== "undefined" ? $scope.deliveryTypeData.billingFirstName : '',
                            billing_last_name: typeof $scope.deliveryTypeData.billingLastName !== "undefined" ? $scope.deliveryTypeData.billingLastName : '',
                            billing_email: typeof $scope.deliveryTypeData.billingEmail !== "undefined" ? $scope.deliveryTypeData.billingEmail : '',
                            billing_country_code: typeof $scope.deliveryTypeData.billingCountryCode !== "undefined" ? $scope.deliveryTypeData.billingCountryCode : '',
                            billing_mobile: typeof $scope.deliveryTypeData.billingMobile !== "undefined" ? $scope.deliveryTypeData.billingMobile : '',
                            shipping_country_id: $scope.deliveryTypeData.shippingCountry,
                            shipping_region_id: $scope.deliveryTypeData.shippingRegion,
                            shipping_district_id: $scope.deliveryTypeData.shippingDistrict,
                            shipping_area_id: $scope.deliveryTypeData.shippingArea,
                            shipping_address_1: $scope.deliveryTypeData.shippingAddress1,
                            shipping_address_2: $scope.deliveryTypeData.shippingAddress2,
                            shipping_address_3: $scope.deliveryTypeData.shippingAddress3,
                            shipping_address_4: $scope.deliveryTypeData.shippingAddress4,
                            shipping_first_name: typeof $scope.deliveryTypeData.shippingFirstName !== "undefined" ? $scope.deliveryTypeData.shippingFirstName : '',
                            shipping_last_name: typeof $scope.deliveryTypeData.shippingLastName !== "undefined" ? $scope.deliveryTypeData.shippingLastName : '',
                            shipping_email: typeof $scope.deliveryTypeData.shippingEmail !== "undefined" ? $scope.deliveryTypeData.shippingEmail : '',
                            shipping_country_code: typeof $scope.deliveryTypeData.shippingCountryCode !== "undefined" ? $scope.deliveryTypeData.shippingCountryCode : '',
                            shipping_mobile: typeof $scope.deliveryTypeData.shippingMobile !== "undefined" ? $scope.deliveryTypeData.shippingMobile : '',
                            remark: $scope.deliveryTypeData.remark,
                            delivery_type: $scope.deliveryTypeData.deliveryType,
                            carry_up: $scope.deliveryTypeData.carryUpFloor,
                            pick_up_warehouse_id: $scope.deliveryTypeData.pickUpLocation,
                            payment_type: $scope.paymentTypeData.payment_type,
                            payed_amount: $scope.paymentTypeData.payed_amount,
                            user_id: $scope.deliveryTypeData.user_id,
                            pick_up_country_code: $scope.deliveryTypeData.pickUpCountryCode,
                            pick_up_mobile: $scope.deliveryTypeData.pickUpMobile,
                            pick_up_first_name: $scope.deliveryTypeData.pickUpFirstName,
                            pick_up_last_name: $scope.deliveryTypeData.pickUpLastName,
                            pick_up_email: $scope.deliveryTypeData.pickUpEmail,
                            custom_discount: $scope.deliveryTypeData.specialDiscount,
                            other_charge: $scope.deliveryTypeData.specialServiceCharge,
                            expected_delivery_date: $scope.deliveryTypeData.deliveryDate,
                            invoice_charges: angular.toJson($scope.cart.invoice_charges)*/
        }).then(function(res) {
            console.log('process : ');
            console.log(JSON.stringify(res));
            if (res.status == 'Y') {
                $scope.pdfUrl = res.pdf;
                if ($rootScope.platform == 'web') {
                    $scope.pdfUrl = $sce.trustAsResourceUrl($scope.pdfUrl);
                }
                console.log($scope.pdfUrl);

                var products = [];
                var i = 1;

                angular.forEach($scope.cart.products, function(p) {
                    var options = ',';

                    angular.forEach(p.options, function(opt) {});
                    for (var i = p.options.length - 1; i >= 0; i--) {
                        if (i < p.options.length - 1)
                            options = options + ',';
                        options = options + p.options[i].title + ':' + p.options[i].options[0];
                    }
                    if (options.length == 1) {
                        options = '';
                    }
                    var dis = '';
                    if ((p.o_price - p.unit_price) / p.o_price == 0) {
                        dis = '- ';
                    } else {
                        dis = (p.o_price - p.unit_price) / p.o_price + '%';
                    }
                    products.push({
                        ITEM_NO: i,
                        PRODUCT_CODE: p.code,
                        PRODUCT_NAME: p.name + options,
                        QTY: p.buy_qty,
                        UNIT_PRICE: p.unit_price,
                        DISCOUNT: dis,
                        SUB_TOTAL: '$' + p.sub_total.toFixed(2)
                    });
                    i++;
                });
                console.log($scope.cart.invoice_charges);

                var charges = [];
                angular.forEach($scope.cart.invoice_charges, function(c) {
                    var charge_value = '';
                    if (c.sign == '+') {
                        if (c.value_type == 'value') {
                            charge_value = '$' + c.value;
                        } else {
                            charge_value = c.value + '%';
                        }
                    } else {
                        if (c.value_type == 'value') {
                            charge_value = '($' + c.value + ')';
                        } else {
                            charge_value = '(' + c.value + '%)';
                        }
                    }
                    charges.push({
                        CHARGE_NAME: c.title_EN_US,
                        CHARGE_VALUE: charge_value,
                        CHARGE_VALUE_TYPE: c.value_type,
                        CHARGE_SIGN: c.sign
                    });
                });
                var qr = new QRious({ value: res.data.invoice_no });
                var invoice_no_qr = qr.toDataURL();
                var currentTime = new Date();

                console.log(invoice_no_qr);
                console.log($scope.yyyymmdd(currentTime));
                console.log($scope.cart.ticket_num);
                console.log(products);
                console.log(charges);

                $offline.invoicePdf({
                    size: '80mm', // '80mm',
                    images: {
                        COMPANY_LOGO: 'data:image/png;base64,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',
                        INVOICE_QR: invoice_no_qr,
                        SHOP_QR: 'data:image/png;base64,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'
                    },
                    data: {
                        INVOICE_NO: res.data.invoice_no,
                        MEMBER_CLASS: $scope.cart.customer_name,
                        INVOICE_DATE: $scope.yyyymmdd(currentTime),
                        TICKET_NO: $scope.cart.ticket_num,
                        CUSTOMER_DETAIL: '',
                        DELIVERY_ADDRESS: '',
                        SALESMAN: 'Sales',
                        PRODUCT_ITEM: products,
                        CHARGE_ITEM: charges,
                        PAYMENT_METHOD: $scope.currentPayment.code,
                        REMARKS: $rootScope.currentOrderType.code,
                        ITEM_TOTAL: '$' + $scope.cart.item_total.toFixed(2),
                        GRAND_TOTAL: '$' + $scope.cart.temp_grand_total.toFixed(2),
                        SHOP_NAME: 'MushroomHK-MK',
                        SHOP_TEL: '2625 1162',
                        SHOP_EMAIL: 'info@mushroom.hk',
                    }

                }).then(function(res) {
                    console.log(res);
                    $scope.iframeUrl = 'templates/tpl.invoice-pdf.80mm.print.html';
                    $scope.css = res.css;
                    $scope.body = res.body;
                    $scope.viewInvoiceC = {
                        iframe: null,
                        innerDoc: null,
                        css: res.css,
                        body: res.body,
                        back: function() {
                            $scope.iframeModal.hide();
                            $scope.iframeModal.remove();
                        },
                        print: function() {
                            $scope.viewInvoiceC.iframe.contentWindow.print($localStorage.get('settings').epson_ip_address, $localStorage.get('settings').epson_port, $localStorage.get('settings').epson_device_id);
                        }
                    };
                    $ionicModal.fromTemplateUrl('templates/modal.iframe.html', {
                        scope: $scope,
                        animation: 'slide-in-up'
                    }).then(function(modal) {
                        $scope.iframeModal = modal;
                        modal.show().then(function() {
                            $scope.viewInvoiceC.iframe = document.getElementById('iframe-printer');
                            $scope.viewInvoiceC.innerDoc = $scope.viewInvoiceC.iframe.contentDocument || $scope.viewInvoiceC.iframe.contentWindow.document;
                            $scope.viewInvoiceC.innerDoc.getElementById('css-wrapper').innerHTML = $scope.viewInvoiceC.css;
                            $scope.viewInvoiceC.innerDoc.getElementById('html-wrapper').innerHTML = $scope.viewInvoiceC.body;
                            /*var iframe = document.getElementById('iframe-printer');
                            var innerDoc = iframe.contentDocument || iframe.contentWindow.document;
                            console.log(innerDoc.getElementById('css-wrapper').innerHTML);
                            innerDoc.getElementById('css-wrapper').innerHTML = res.css;
                            console.log(innerDoc.getElementById('html-wrapper').innerHTML);
                            innerDoc.getElementById('html-wrapper').innerHTML = res.body;
                            iframe.contentWindow.print('192.168.200.39', '8008', 'local_printer');*/
                            $scope.viewInvoiceC.iframe.contentWindow.print($localStorage.get('settings').epson_ip_address, $localStorage.get('settings').epson_port, $localStorage.get('settings').epson_device_id);
                        });
                    });
                }).catch(function(err) {
                    alert('fail');
                });
            } else {
                $helper.toast(res.msg, 'short', 'bottom');
            }
            // if ($rootScope.networkResult) {
            //     if (res.status == 'Y') {
            //         $scope.pdfUrl = res.pdf;
            //         if ($rootScope.platform == 'web') {
            //             $scope.pdfUrl = $sce.trustAsResourceUrl($scope.pdfUrl);
            //         }
            //         console.log($scope.pdfUrl);

            //         $scope.popConfirmDialog();
            //         $api.epsonPrint($rootScope.currentInvoiceId);
            //     } else {
            //         $helper.toast(res.msg, 'short', 'bottom');
            //     }
            // } else {
            //     $scope.iframeUrl = 'templates/tpl.invoice-pdf.80mm.print.html';
            //     $scope.css = res.css;
            //     $scope.body = res.body;
            //     $scope.viewInvoiceC = {
            //         iframe: null,
            //         innerDoc: null,
            //         css: res.css,
            //         body: res.body,
            //         mode: dine_in,
            //         back: function() {
            //             $scope.iframeModal.hide();
            //             $scope.iframeModal.remove();
            //         }
            //     };
            //     $ionicModal.fromTemplateUrl('templates/modal.iframe.html', {
            //         scope: $scope,
            //         animation: 'slide-in-up'
            //     }).then(function(modal) {
            //         $scope.iframeModal = modal;
            //         modal.show().then(function() {
            //             $scope.viewInvoiceC.iframe = document.getElementById('iframe-printer');
            //             $scope.viewInvoiceC.innerDoc = $scope.viewInvoiceC.iframe.contentDocument || $scope.viewInvoiceC.iframe.contentWindow.document;
            //             $scope.viewInvoiceC.innerDoc.getElementById('css-wrapper').innerHTML = $scope.viewInvoiceC.css;
            //             $scope.viewInvoiceC.innerDoc.getElementById('html-wrapper').innerHTML = $scope.viewInvoiceC.body;
            //             /*var iframe = document.getElementById('iframe-printer');
            //             var innerDoc = iframe.contentDocument || iframe.contentWindow.document;
            //             console.log(innerDoc.getElementById('css-wrapper').innerHTML);
            //             innerDoc.getElementById('css-wrapper').innerHTML = res.css;
            //             console.log(innerDoc.getElementById('html-wrapper').innerHTML);
            //             innerDoc.getElementById('html-wrapper').innerHTML = res.body;
            //             iframe.contentWindow.print('192.168.200.39', '8008', 'local_printer');*/
            //         });
            //     });
            //     // $scope.paymentMethodData.pay_method = buf_pay_method;
            // }

        }).catch(function(err) {
            console.log(err);
            $helper.toast(err, 'long', 'bottom');
        });
    };

    $scope.yyyymmdd = function(dateIn) {
        var yyyy = dateIn.getFullYear();
        var mm = dateIn.getMonth() + 1; // getMonth() is zero-based
        var dd = dateIn.getDate();
        var hh = dateIn.getHours();
        var min = dateIn.getMinutes();
        var ss = dateIn.getSeconds();
        return String(yyyy + '-' + mm + '-' + dd + ' ' + hh + ':' + min + ':' + ss); // Leading zeros for mm and dd
    };

    // load invoice detail
    $scope.loadOutDetail = function(pdf) {

        $scope.pdfUrl = pdf;
        if ($rootScope.platform == 'web') {
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

    $scope.printerConfig = {
        popPrinterList: function() {
            $ionicModal.fromTemplateUrl('templates/modal.select-printer.html', {
                scope: $scope,
                animation: 'slide-in-right'
            }).then(function(modal) {

                if (!$scope.printerList) {
                    $scope.printerList = [];
                    $scope.printerList.push($translate.instant('OTHER'));
                    $scope.printerList.push($translate.instant('EPSON_THERMAL_PRINTER'));
                    $scope.printerList.push($translate.instant('SKIP_PRINT'));
                }
                $scope.processModal = modal;

                modal.show();
            });
        },
        back: function() {

            $scope.processModal.hide();
            $scope.processModal.remove();
        },
    };

    $scope.selectPrinter = function(printer) {
        if (printer == $translate.instant('SKIP_PRINT')) {
            $scope.printerConfig.back();
            $scope.popConfirmDialog();
            return;
        }
        var settings = $localStorage.get('settings');
        settings.printer_type = printer;
        $localStorage.set('settings', settings);
        $scope.printerType = printer;
        console.log($scope.printerType);
        $scope.printerConfig.back();
        $scope.popConfirmDialog();

        if ($localStorage.get('settings').printer_type == $translate.instant('OTHER')) {
            // helper print
            $helper.print($scope.pdfUrl);

        } else {
            // epson print
            if ($rootScope.networkResult) {
                $api.epsonPrint($scope.currentInvoiceId);

            } else {
                $scope.viewInvoiceC.iframe.contentWindow.print($localStorage.get('settings').epson_ip_address, $localStorage.get('settings').epson_port, $localStorage.get('settings').epson_device_id);
                // $scope.viewInvoiceC.iframe.contentWindow.print('192.168.200.39', '8008', 'local_printer');
            }

        }
    };

    // print invoice
    $scope.printHistory = function() {

        if ($rootScope.platform == 'web') {

            $scope.popConfirmDialog();

            window.open($scope.pdfUrl, '_system', 'location=yes');
        } else {
            // TODO: handle app printing
            if ($localStorage.get('settings').cloud_address != '' && $localStorage.get('settings').cloud_lock) {
                // cloud print
                console.log('cloud print :' + $rootScope.currentInvoiceId);

                $scope.popConfirmDialog();
                $ionicLoading.show({
                    template: '<ion-spinner icon="lines"></ion-spinner>',
                    noBackdrop: false
                });

                $api.cloudPrint({
                    token: $localStorage.get('settings').token,
                    locale: $localStorage.get('settings').locale,
                    warehouse_id: $localStorage.get('user').warehouse_id,
                    calling_from: 'pos',
                    invoice_id: $rootScope.currentInvoiceId,
                    email_address: $localStorage.get('settings').cloud_address
                }).then(function(res) {
                    if (res.status == 'Y') {
                        $ionicLoading.hide();
                    } else {
                        $helper.toast(res.msg, 'short', 'bottom');
                    }
                }).catch(function(err) {
                    $helper.toast(err, 'long', 'bottom');
                });

            } else {
                $scope.printerConfig.popPrinterList();
            }
        }

    };

    $rootScope.loadCustomerList = function(mode, keyword) {
        console.log('load customer list!!!' + mode + ',' + keyword);
        if (mode != 'more' || $rootScope.customerList == undefined) {
            $scope.customerLimitFrom = 0;
            $scope.customerLimit = 20;
            $rootScope.customerCount = 0;
        } else {
            $scope.customerLimitFrom += 20;
        }

        $api.getMemberList({
            token: $localStorage.get('settings').token,
            locale: $localStorage.get('settings').locale,
            keyword: keyword != undefined ? keyword : null,
            limit_from: $scope.customerLimitFrom,
            limit: $scope.customerLimit
        }).then(function(res) {
            if (res.status == 'Y') {
                $rootScope.isMemberDetail = false;
                if (mode != 'more' || $rootScope.customerList == undefined) {
                    $rootScope.customerList = [];
                }
                $rootScope.customerCount = res.member.count;
                for (var i = 0; i < res.member.list.length; i++) {
                    res.member.list[i].prefix = $localStorage.get('user').invoice_prefix;
                    $rootScope.customerList.push(res.member.list[i]);
                }
            } else {
                $helper.toast(res.msg, 'short', 'bottom');
            }
            if (mode == 'refresh') {
                $scope.$broadcast('scroll.refreshComplete');
            }
            if (mode == 'more') {
                $scope.$broadcast('scroll.infiniteScrollComplete');
            }
        }).catch(function(err) {
            $helper.toast(err, 'long', 'bottom');
            if (mode == 'refresh') {
                $scope.$broadcast('scroll.refreshComplete');
            }
            if (mode == 'more') {
                $scope.$broadcast('scroll.infiniteScrollComplete');
            }
        });

    };

    $rootScope.loadCustomerDetail = function(mode) {

        if (mode != 'more' || $scope.cartList == undefined) {
            $scope.cartLimitFrom = 0;
            $scope.cartLimit = 20;
            $scope.cartCount = 0;
            $rootScope.cartList = [];
        } else {
            $scope.cartLimitFrom += 20;
        }
        $scope.customerID = 1;
        $api.getMemberProfile({
            token: $localStorage.get('settings').token,
            locale: $localStorage.get('settings').locale,
            member_id: $localStorage.get('memberProfile').member_id
        }).then(function(res) {
            if (res.status == 'Y') {
                $helper.checkUndefined(res.data);
                $rootScope.customerDetail = res.data;
                $rootScope.customerDetail.prefix = $localStorage.get('user').invoice_prefix;
                $scope.customerID = res.data.user_id;
                $scope.status = [2, 3, 4, 5];
                $api.getInvoiceList({
                    token: $localStorage.get('settings').token,
                    locale: $localStorage.get('settings').locale,
                    user_id: $scope.customerID,
                    limit_from: $scope.cartLimitFrom,
                    limit: $scope.cartLimit,
                    status: $scope.status
                }).then(function(res) {
                    if (res.status == 'Y') {
                        $scope.cartCount = res.data.count;
                        for (var i = 0; i < res.data.list.length; i++) {
                            $rootScope.cartList.push(res.data.list[i]);
                        }
                    } else {
                        $helper.toast(res.msg, 'short', 'bottom');
                    }
                    if (mode == 'refresh') {
                        $scope.$broadcast('scroll.refreshComplete');
                    }
                    if (mode == 'more') {
                        $scope.$broadcast('scroll.infiniteScrollComplete');
                    }
                }).catch(function(err) {
                    $helper.toast(err, 'long', 'bottom');
                });
            } else {
                $helper.toast(res.msg, 'short', 'bottom');
                if (mode == 'refresh') {
                    $scope.$broadcast('scroll.refreshComplete');
                }
                if (mode == 'more') {
                    $scope.$broadcast('scroll.infiniteScrollComplete');
                }
            }
        }).catch(function(err) {
            $helper.toast(err, 'long', 'bottom');
        });

    };

    //change big photo in shop detail
    $scope.changeBigPhoto = function(photo) {
        $scope.bigPhoto = photo;
    };
    $scope.confirmPayment = function() {

        $api.confirmPayment({
            token: $localStorage.get('settings').token,
            locale: $localStorage.get('settings').locale,
            invoice_id: $rootScope.currentInvoiceId,
        }).then(function(res) {
            if (res.status == 'Y') {
                $rootScope.currentInvoiceId = null;
                $scope.viewConfirmBox.back();
                $rootScope.clearCart();

            } else {
                $helper.toast(res.msg, 'short', 'bottom');
            }
        }).catch(function(err) {
            $helper.toast(err, 'long', 'bottom');
        });


    };
    //click pay and print
    $scope.payAndPrint = function() {
        // if ($rootScope.platform != 'web')
        $scope.printHistory();
    };

    $scope.popConfirmDialog = function() {
        if ($scope.cart.products.length > 0) {
            $scope.viewConfirmBox = {
                back: function() {
                    $scope.ConfirmBoxModal.hide();
                    $scope.ConfirmBoxModal.remove();
                }
            };
            $ionicModal.fromTemplateUrl('templates/modal.confirm-box.html', {
                scope: $scope,
                animation: 'slide-in-up'
            }).then(function(modal) {
                $scope.ConfirmBoxModal = modal;
                modal.show();
            });
        } else {
            $helper.toast($translate.instant('THIS_CART_IS_EMPTY'), 'short', 'bottom');
        }

    };
    //function copy from controller.pickup

    $scope.myDate = $filter('date')(new Date(), 'yyyy-MM-dd HH:mm:ss');

    $scope.processPickup = function(invoice_id) {
        $api.getInvoiceDetail({
            token: $localStorage.get('settings').token,
            locale: $localStorage.get('settings').locale,
            invoice_id: invoice_id
        }).then(function(res) {
            if (res.status == 'Y') {
                $scope.invoiceDetail = res.data;
                $scope.productDetail = [];
                for (var i = 0; i < res.data.products.length; i++) {
                    $scope.productDetail.push(res.data.products[i]);
                    $scope.productDetail[i].actual_pickup_qty = $scope.productDetail[i].can_pick_qty;
                }
            } else {
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
            canvasback: function() {
                console.log('back');
                $scope.drawingCanvasModal.hide();
                $scope.drawingCanvasModal.remove();
            },
            drawCanvas: function() {
                if ($scope.drawingCanvasModal != null) {
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
            next: function() {

                $scope.processCheckoutModal.hide();
                $scope.processCheckoutModal.remove();

                $scope.signaturepng = $scope.signaturePad.toDataURL('image/png');
                $scope.drawingCanvasModal.hide();
                $scope.drawingCanvasModal.remove();
                $scope.productjson = [];
                angular.forEach($scope.invoiceDetail.products, function(spec) {
                    if (spec.checkboxValue) {
                        $scope.productjson.push({ "sku_no": spec.sku_no, "qty": spec.actual_pickup_qty });
                    }
                });



                $api.confirmPickUp({
                    token: $localStorage.get('settings').token,
                    locale: $localStorage.get('settings').locale,
                    warehouse_id: $localStorage.get('user').warehouse_id,
                    invoice_id: invoice_id,
                    products: JSON.stringify($scope.productjson)
                }).then(function(res) {
                    if (res.status == 'Y') {

                        $scope.viewInvoice.back();


                    } else {
                        $helper.toast(res.msg, 'short', 'bottom');

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

                }).catch(function(err) {
                    $helper.toast(err, 'long', 'bottom');
                });


                //upload photo

                $api.uploadMedia($scope.signaturepng, {
                    token: $localStorage.get('settings').token,
                    locale: $localStorage.get('settings').locale,
                    invoice_id: invoice_id,
                    type: 'photo',
                    sign_type: 'pick up'
                }).then(function(res) {
                    if (res.status == 'Y') {


                    } else {
                        $helper.toast(res.msg, 'short', 'bottom');
                    }
                }).catch(function(err) {
                    $helper.toast(err, 'long', 'bottom');
                });

                $scope.processCheckoutModal.hide();
                $scope.processCheckoutModal.remove();


            }
        };


        $ionicModal.fromTemplateUrl('templates/modal.view-invoice-change.html', {
            scope: $scope,
            animation: 'slide-in-up'
        }).then(function(modal) {
            $scope.processPickUpModal = modal;

            $scope.partial_pick = true;
            modal.show();

        });
    };

    $scope.minus = function(product, qty, zero) {
        if (qty > zero) {
            product.actual_pickup_qty = product.actual_pickup_qty - 1;

        }
    };

    $scope.add = function(product, qty, max) {
        if (qty < max) {
            product.actual_pickup_qty = product.actual_pickup_qty + 1;
            console.log('+');
        }
    };

    $scope.confirm_button = false;
    $scope.can_confirm = $scope.confirm_button;
    $scope.confirm_count = 0;

    $scope.change_button = function(value) {


        if ($scope.confirm_button == false && value == true) {
            $scope.confirm_count = $scope.confirm_count + 1;
            $scope.confirm_button = true;

        } else if ($scope.confirm_button == true && value == false) {
            $scope.confirm_count = $scope.confirm_count - 1;
            if ($scope.confirm_count == 0)
                $scope.confirm_button = false;

        } else if ($scope.confirm_button == true && value == true) {
            $scope.confirm_count = $scope.confirm_count + 1;

        }
        $scope.can_confirm = $scope.confirm_button;

    };

    $scope.checkQty = function(product, qty, max) {
        if (qty < 0)
            product.actual_pickup_qty = 0;
        else if (qty > max)
            product.actual_pickup_qty = max;


    };

    $scope.partialPickUp = function() {
        $scope.processPickup($rootScope.currentInvoiceId);
    };

    //update the amount on the right
    $scope.updateAmount = function(field) {

        switch (field) {
            case 'carryUp':
                break;
            case '':
        }

    };


    var checkUndefined = function() {
        Object.keys($scope.deliveryTypeData).map(function(objectKey, index) {
            var value = $scope.deliveryTypeData[objectKey];
            if (typeof value == "undefined") {
                $scope.deliveryTypeData[objectKey] = '';
            }
        });
    };

    $scope.popUpDate = function() {
        var isEn = $localStorage.get('settings').locale == 'EN_US';
        var ipObj1 = {

            callback: function(val) { //Mandatory
                var dateObj = new Date(val);
                console.log('Return value from the datepicker popup is : ' + val, dateObj);
                month = '' + (dateObj.getMonth() + 1),
                    day = '' + dateObj.getDate(),
                    year = dateObj.getFullYear();
                if (month.length < 2) month = '0' + month;
                if (day.length < 2) day = '0' + day;
                $scope.deliveryTypeData.deliveryDate = [year, month, day].join('-');
                $scope.selectHour($scope.deliveryTypeData.deliveryDate);
            },
            currentYear: new Date().getFullYear(),
            inputDate: new Date(),
            mondayFirst: true,
            closeOnSelect: false,
            templateType: 'popup',
            weeksList: isEn ? ["S", "M", "T", "W", "T", "F", "S"] : ["日", "一", "二", "三", "四", "五", "六"],
            monthsList: isEn ? ["Jan", "Feb", "March", "April", "May", "June", "July", "Aug", "Sept", "Oct", "Nov", "Dec"] : ["一月", "二月", "三月", "四月", "五月", "六月", "七月", "八月", "九月", "十月", "十一月", "十二月"],
            setLabel: $filter('translate')('CONFIRM'),
            todayLabel: $filter('translate')('TODAY'),
            closeLabel: $filter('translate')('CANCEL'),
            from: new Date().setMonth(new Date().getMonth() - 12),
            to: new Date()
        };
        ionicDatePicker.openDatePicker(ipObj1);
    };

    $scope.selectHour = function(dateStr) {
        $scope.from = 0;
        $scope.to = 0;
        $scope.hourInfo = [];
        for (var i = 0; i < 24; i++) {
            $scope.hourInfo.push({
                title: i < 10 ? '0' + i + ':00' : '' + i + ':00',
                value: i,
                checked: $scope.from == i
            });
        }
        $scope.hourPicker = {
            modalConfirm: function() {
                var hourStr = ($scope.from < 10 ? '0' + $scope.from : $scope.from) + ':00-' + ($scope.to < 10 ? '0' + $scope.to : $scope.to) + ':00'
                $scope.deliveryTypeData.deliveryDate = dateStr + ' ' + hourStr;
                $scope.processModal.hide();
                $scope.processModal.remove();
            },
            modalBack: function() {
                $scope.processModal.hide();
                $scope.processModal.remove();
            },
            chooseFrom: function(index) {
                $scope.from = index;
            },
            chooseTo: function(index) {
                $scope.to = index;
            },
        };
        $ionicModal.fromTemplateUrl('templates/modal.time-picker.html', {
            scope: $scope,
            animation: 'slide-in-up'
        }).then(function(modal) {
            $scope.processModal = modal;
            modal.show();
        });
    };



    $scope.popUpDiscount = function(productInfo) {
        $ionicModal.fromTemplateUrl('templates/modal.select-discount.html', {
            scope: $scope,
            animation: 'slide-in-up'
        }).then(function(modal) {
            $scope.currentDiscount = {};
            $scope.discountModal = modal;
            $scope.selectedProduct = productInfo;
            $scope.currentDiscount.val = Math.abs((productInfo.unit_price - productInfo.o_price) * 100 / productInfo.o_price);
            modal.show();
        });
    };



    $scope.cancelDiscount = function() {
        $scope.discountModal.hide();
        $scope.discountModal.remove();
    };

    $scope.saveDiscount = function(form) {
        if (!form.$valid) {

            angular.forEach(document.getElementsByClassName('error-container'), function(el) {
                if (angular.element(el).text().trim() != '') {
                    $ionicScrollDelegate.$getByHandle('form-error').scrollTo(0, el.getBoundingClientRect().top, true);
                }
            });
        } else {

            $api.setCart({
                token: $localStorage.get('settings').token,
                locale: $localStorage.get('settings').locale,
                warehouse_id: $localStorage.get('user').warehouse_id,
                action: 'update',
                qty: $scope.selectedProduct.qty,
                invoice_id: $rootScope.currentInvoiceId,
                extra_discount: $scope.currentDiscount.val,
                sku_no: $scope.selectedProduct.sku_no,
                invoice_charges: angular.toJson($scope.cart.invoice_charges)
            }).then(function(res) {
                if (res.status == 'Y') {
                    $scope.cart = res.data;
                    var tempTotal = 0;
                    for (var i = 0; i < $scope.cart.products.length; i++) {
                        tempTotal += $scope.cart.products[i].sub_total;
                    }
                    $scope.cart.item_total = tempTotal;
                    $scope.calculateCharge();
                } else {
                    $helper.toast(res.msg, 'long', 'bottom');
                }
            }).catch(function(err) {
                $helper.toast(err, 'long', 'bottom');
            });
            $scope.discountModal.hide();
            $scope.discountModal.remove();
        }

    };


    $scope.changeCharge = function(index) {
        var charge = $scope.otherCharges[index];



        for (var i = 0; i < $scope.cart.invoice_charges.length; i++) {
            var iCharge = $scope.cart.invoice_charges[i];
            if (iCharge.title_EN_US == charge.title_EN_US && iCharge.type == charge.type && iCharge.value_type == charge.value_type) {
                $scope.cart.invoice_charges[i].value = charge.value;
                break;
            }
        }
        $scope.calculateCharge();
    };

    $scope.clickChargeItem = function(index) {
        $scope.chargeStatus[index] = !$scope.chargeStatus[index];
        if ($scope.chargeStatus[index]) {
            $scope.cart.invoice_charges.push($scope.otherCharges[index]);
        } else {
            var char = $scope.otherCharges[index];
            for (var i = 0; i < $scope.cart.invoice_charges.length; i++) {
                var iChar = $scope.cart.invoice_charges[i];
                if (char.title_EN_US == iChar.title_EN_US && char.type == iChar.type && char.value_type == iChar.value_type) {
                    $scope.cart.invoice_charges.splice(i, 1);
                    break;
                }
            }
        }
        $scope.calculateCharge();

    };

    $scope.clickChargeInput = function(index) {
        console.log($scope.chargeStatus[index]);
        if ($scope.chargeStatus[index] == false) {
            $scope.clickChargeItem(index);
        }
    };

    $scope.calculateCharge = function() {
        var baseTotal = $scope.cart.item_total;
        var baseDiscount = 0;
        var baseCharge = 0;
        console.log('basetotal : ' + baseTotal);


        for (var i = 0; i < $scope.cart.invoice_charges.length; i++) {
            var charge = $scope.cart.invoice_charges[i];
            if (charge.value_type == 'percent') {
                if (charge.sign == '+') {
                    //service charge
                    var totalFlag = baseTotal;
                    baseTotal *= 1 + Number(charge.value) / 100;
                    baseCharge += baseTotal - totalFlag;
                } else if (charge.sign == '-') {
                    //discount

                    var totalFlag = baseTotal;
                    baseTotal *= 1 - Number(charge.value) / 100;
                    baseDiscount += totalFlag - baseTotal;
                }
            }
        }

        for (var i = 0; i < $scope.cart.invoice_charges.length; i++) {
            var charge = $scope.cart.invoice_charges[i];
            if (charge.value_type != 'percent') {

                if (charge.sign == '+') {
                    //service charge
                    var totalFlag = baseTotal;
                    baseTotal += Number(charge.value);
                    baseCharge += baseTotal - totalFlag;

                } else if (charge.sign == '-') {
                    //discount
                    var totalFlag = baseTotal;
                    baseTotal -= Number(charge.value);
                    baseDiscount += totalFlag - baseTotal;
                }
            }
        }

        if ($scope.cart.delivery_type == 'shipping') {
            $scope.cart.service_total = baseCharge + $scope.cart.carry_up * 100;
        } else {
            $scope.cart.service_total = baseCharge;
        }
        $scope.cart.discount_total = baseDiscount;
        // console.log('计完chargeList  baseTotal：' + baseTotal + '    delivery_total: ' + $scope.cart.delivery_total + '    refund_total: ' + $scope.cart.refund_total + '     service_total: ' + $scope.cart.service_total);
        $scope.cart.temp_grand_total = $scope.cart.item_total - $scope.cart.discount_total + Number($scope.cart.delivery_total) - Number($scope.cart.refund_total) + Number($scope.cart.service_total);

        if ($scope.cart.temp_grand_total < 0) {
            $scope.cart.temp_grand_total = 0;
        }
    };

    $scope.afterEditDiscountTotal = function() {
        $scope.cart.temp_grand_total = $scope.cart.item_total - $scope.cart.discount_total + Number($scope.cart.delivery_total) - Number($scope.cart.refund_total) + Number($scope.cart.service_total);
    };

    $scope.calculateOptions = function(option) {
        var baseTotal = $scope.cart.item_total;
        var baseDiscount = 0;
        var baseCharge = 0;
        console.log('basetotal : ' + baseTotal);
        console.log(option);

        if (option.selected) {
            if (option.sign == '+') {
                //service charge
                var totalFlag = baseTotal;
                $scope.cart.temp_grand_total += Number(option.value);
                $scope.cart.service_total += Number(option.value);

            } else if (option.sign == '-') {
                //discount
                var totalFlag = baseTotal;
                $scope.cart.temp_grand_total -= Number(option.value);
                $scope.cart.discount_total += Number(option.value);
            }
        } else {
            if (option.sign == '+') {
                //service charge
                var totalFlag = baseTotal;
                $scope.cart.temp_grand_total -= Number(option.value);
                $scope.cart.service_total += Number(option.value);

            } else if (option.sign == '-') {
                //discount
                var totalFlag = baseTotal;
                $scope.cart.temp_grand_total += Number(option.value);
                $scope.cart.discount_total += Number(option.value);
            }
        }

        if ($scope.cart.temp_grand_total < 0) {
            $scope.cart.temp_grand_total = 0;
        }
    };

    $scope.editInput = function() {};
    $scope.popCurrency = function() {
        var options = [];
        var currencyList = $localStorage.get('currency');
        angular.forEach(currencyList, function(dic) {
            options.push({
                name: dic.title,
                value: dic.title,
                checked: $scope.currencyData.currency == dic.title,
                data: dic
            });
        });
        $helper.picker({
            scope: $scope,
            title: 'SELECT_TITLE',
            options: options,
            multiple: false,
            confirmCallback: function(selectedObjs) {
                var selectObj = selectedObjs[0];
                $scope.currencyData.currency = selectObj.name;
                $scope.currencyData.value = selectObj.data.value;
                $scope.cart.currency = selectObj.name;
                if (selectObj.name != 'HKD') {
                    var currencyStr = '(' + selectObj.name + '): ' + $scope.cart.grand_total * Number(selectObj.data.value) + '\n';
                    if ($scope.deliveryTypeData.remark.startsWith('(') && $scope.deliveryTypeData.remark.includes('):')) {
                        var remarkList = $scope.deliveryTypeData.remark.split('\n');
                        if (remarkList.shift() != '') {
                            $scope.deliveryTypeData.remark = remarkList.join('\n');
                        } else {
                            $scope.deliveryTypeData.remark = '';
                        }
                    }
                    $scope.deliveryTypeData.remark = currencyStr + $scope.deliveryTypeData.remark;
                } else {
                    if ($scope.deliveryTypeData.remark.startsWith('(') && $scope.deliveryTypeData.remark.includes('):')) {
                        var remarkList = $scope.deliveryTypeData.remark.split('\n');
                        if (remarkList.shift() != '') {
                            $scope.deliveryTypeData.remark = remarkList.join('\n');
                        } else {
                            $scope.deliveryTypeData.remark = '';
                        }
                    }
                }
                $scope.cart.remark = $scope.deliveryTypeData.remark;
            }
        });

    };


    $scope.showPhotosGallery = function() {
        var photos = [];
        var photoIndex = 0;
        for (var i = 0; i < $scope.product.photos.length; i++) {
            if ($scope.product.photos[i] != '') {
                console.log($scope.product.photos[i].replace('/small/', '/large/'));
                photos.push($scope.product.photos[i].replace('/small/', '/large/'));
                if ($scope.bigPhoto == $scope.product.photos[i]) {
                    photoIndex = i;
                }
            }
        }
        $helper.gallery({
            scope: $scope,
            photos: photos,
            zoomMin: 1,
            activeSlide: photoIndex
        });
    };


    /* ------------     current cart function    -----------*/
    // current cart popover
    $scope.editDiscount = {
        // popoverEditDiscount: function($event) {
        //     $scope.tempDiscountString = $scope.cart.discount_total.toString();
        //     $scope.discountButtonList = [
        //         [{name:'1',value:1},{name:'2',value:2},{name:'3',value:3}],
        //         [{name:'4',value:4},{name:'5',value:5},{name:'6',value:6}],
        //         [{name:'7',value:7},{name:'8',value:8},{name:'9',value:9}],
        //         [{name:'.',value:'.'},{name:'0',value:0},{name:'X',value:'X'}],
        //         [{name:'Delete',value:'Delete'},{name:'$',value:'$'},{name:'%',value:'%'}]
        //     ];
        //     console.log($scope.discountButtonList);
        //     $ionicPopover.fromTemplateUrl('templates/popover.EditDiscount.html', {
        //     scope: $scope
        //     }).then(function(popover) {
        //     $scope.discountPopover = popover;
        //     popover.show($event);
        //     });
        // },
        // click: function(clickValue){
        //     switch (clickValue) {
        //         case 1:
        //         case 2:
        //         case 3:
        //         case 4:
        //         case 5:
        //         case 6:
        //         case 7:
        //         case 8:
        //         case 9:
        //         case 0:
        //             if($scope.tempDiscountString == '0') $scope.tempDiscountString = '';
        //             $scope.tempDiscountString = $scope.tempDiscountString.concat(clickValue.toString());
        //             break;
        //         case 'X':
        //             $scope.tempDiscountString = $scope.tempDiscountString.substring(0,$scope.tempDiscountString.length-1);
        //             if($scope.tempDiscountString == null || $scope.tempDiscountString == '') $scope.tempDiscountString = '0';
        //             break;
        //         case 'Delete':
        //             $scope.tempDiscountString = '0';
        //             break;
        //         case '.':
        //             if($scope.tempDiscountString.indexOf('.') == -1){
        //                 $scope.tempDiscountString = $scope.tempDiscountString.concat(clickValue);
        //             }
        //             break;
        //         case '$':
        //             $scope.cart.discount_total = Number($scope.tempDiscountString);
        //             $scope.afterEditDiscountTotal();
        //             $scope.discountPopover.hide();
        //             $scope.discountPopover.remove();
        //             break;
        //         case '%':
        //             $scope.cart.discount_total = Number($scope.tempDiscountString) * 0.01 * $scope.cart.item_total;
        //             $scope.afterEditDiscountTotal();
        //             $scope.discountPopover.hide();
        //             $scope.discountPopover.remove();
        //             break;
        //         default:
        //             break;
        //     }
        //     console.log('discount result: ' + $scope.tempDiscountString);
        // }
    };

    $scope.editOtherCharge = {
        popoverOtherCharge: function($event, isDiscount) {
            if ($scope.cart.products.length < 1) {
                $helper.toast($translate.instant('THIS_CART_IS_EMPTY'), 'short', 'bottom');
                return;
            }

            $scope.isDiscount = isDiscount;
            if ($scope.isDiscount) {
                $scope.popoverTitle = $translate.instant('DISCOUNT_TOTAL');
            } else {
                $scope.popoverTitle = $translate.instant('SERVICE_TOTAL');
            }
            console.log($scope.popoverTitle);

            $scope.chargeStatus = [];
            $scope.otherCharges = $localStorage.get('charges') != null ? $localStorage.get('charges') : [];
            console.log($scope.otherCharges);
            for (var index = 0; index < $scope.otherCharges.length; index++) {
                var charge = $scope.otherCharges[index];
                var trueTag = false;
                if ($scope.cart.invoice_charges == null) {
                    $scope.cart.invoice_charges = [];
                }
                for (var i = 0; i < $scope.cart.invoice_charges.length; i++) {
                    var iCharge = $scope.cart.invoice_charges[i];
                    if (iCharge.title_EN_US == charge.title_EN_US && iCharge.type == charge.type && iCharge.value_type == charge.value_type) {
                        $scope.otherCharges[index].value = iCharge.value;
                        $scope.chargeStatus.push(true);
                        trueTag = true;
                        break;
                    }
                }
                if (!trueTag) {
                    $scope.chargeStatus.push(false);
                }
            }
            $ionicPopover.fromTemplateUrl('templates/popover.other-charge.html', {
                scope: $scope
            }).then(function(popover) {
                $scope.otherChargePopover = popover;
                popover.show($event);
            });
        }
    };




    /**************************************************
    // finally
    **************************************************/

    $scope.$on('$ionicView.beforeLeave', function() {
        if ($scope.salesState == 'checkout') {
            console.log('leave check out load cart~');
            updateCartInCheckout();
        }
    });


    // make the view re-init data on enter
    $scope.$on('$ionicView.enter', function() {
        $scope.init();
    });

    $scope.$on('$ionicView.loaded', function() {
        $rootScope.clearCart();
    });

    $scope.resetCountry = function() {

    };

    $scope.activeSlide = function(index) { //点击时候触发
        $scope.slectIndex = index;
        $ionicSlideBoxDelegate.slide(index);
    };

    $scope.slideChanged = function(index) { //滑动时候触发
        console.log('slide~~~~' + index);
        $scope.slectIndex = index;
        //var scrollBar = document.getElementById('slide-title-bar');
        //console.log(scrollBar);
          setInterval(function () {
          var len = document.getElementById('slide-title-bar').scrollLeft                                                                                               ;
            console.log(document.getElementById('slide-title-bar').scrollLeft);
        },1000);


    };

    $scope.$on('changeLanguage', function(event, args) {

    });

}).filter('numberFixedLen', function() {
    return function(n, len) {
        var num = parseInt(n, 10);
        len = parseInt(len, 10);
        if (isNaN(num) || isNaN(len)) {
            return n;
        }
        num = '' + num;
        while (num.length < len) {
            num = '0' + num;
        }
        return num;
    };
}).filter('cartOptionsFormat', function() {
    return function(x) {
        var txt = '';
        if (x > 0) {
            txt = ', ';
        }
        return txt;
    };
});;
