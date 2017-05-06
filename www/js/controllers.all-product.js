angular.module('controllers.all-product', [
  'ionic',
  'pascalprecht.translate',
  'ngMessages',
  'services.localstorage',
  'services.helper',
  'services.api',
  'directives.common',
  'directives.ubeing'
])

.controller('allProductCtrl', function($scope, $rootScope, $localStorage, $translate, $helper, $ionicLoading, $api, $ionicPopup, $ionicModal, $filter) {

    $scope.init = function(){
        $scope.salesState = '';
        console.log('into all product init');
        $rootScope.showAccountPopover = false;
        $scope.isSearching = false;
        // 0327 update
        $scope.salesTab = 'current';
        $scope.salesState = 'category';
        $scope.cartDisplay = 'normal';
        $scope.newCartVisitor = true;
        $scope.inRootCategory = true;
        $scope.categoriesStack = [];
        $scope.currentCategoryStack = [{ id: null, name: $translate.instant('CATEGORIES') }];
        $scope.loadCategories('init');
        $scope.searchButtonBar = {
            // searchHints: $translate.instant('SEARCH_PRODUCT_HINTS'),
            searchHints: $filter('translate')('SEARCH_PRODUCT_HINTS'),
            searchKeyword: '',
            searchFor: function(keyword) {
                // $scope.goBack = $scope.searchBack;
                if ($scope.categoriesStack[$scope.categoriesStack.length - 1] != $scope.categories) {
                    $scope.categoriesStack.push($scope.categories);
                    $scope.currentCategoryStack.push({ id: null, name: $translate.instant('SEARCH_RESULT') });
                }                
                $scope.loadProductList('refresh', null, keyword);
            },
            scanQR: function() {
                document.addEventListener("deviceready", function() {
                    $helper.scan(function(scanData) {
                        if (scanData.cancelled == 0) {
                            // $scope.goBack = $scope.searchBack;
                            $scope.loadProductList('refresh', null, scanData.text);
                        }
                    });

                }, false);
            },

        };

        // $scope.loadProductList('refresh');
    };


    $scope.searchBack = function(){
        $scope.searchButtonBar.searchKeyword = '';
        $scope.goBack = function() {
            $helper.navBack(-1, 'slide-left-right');
        };
        $scope.loadProductList('refresh');
    }

    $scope.productBack = function() {
        $scope.searchButtonBar.searchKeyword = null;
        console.log('state : '+$scope.salesState);
        switch ($scope.salesState) {
            case 'category':
                $scope.categories = $scope.categoriesStack.pop();
                $scope.currentCategoryStack.pop();
                if($scope.currentCategoryStack.length < 1){
                    console.log('call go back');
                    $rootScope.goBack();
                }                
                break;
            case 'product-list':
                $scope.categories = $scope.categoriesStack.pop();
                $scope.currentCategoryStack.pop();
                if ($scope.categories == undefined) {
                    console.log('category = undefined !!!!!');
                    $scope.categories = $rootScope.rootCategory;
                    $scope.currentCategoryStack = [{ id: null, name: $translate.instant('CATEGORIES') }];
                    console.log(angular.toJson($scope.currentCategoryStack));
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

            $scope.loadProductList('init', categoryId);
        }

    };  


  $scope.loadProductList = function(mode, categoryId, keyword) {
    console.log('load product list~~');
    if (mode != 'more' || $scope.products == undefined) {
        $scope.productLimitFrom = 0;
        $scope.productLimit = 12;
        $scope.productCount = 0;
        $scope.products = [];
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
        invoice_id: $rootScope.currentInvoiceId,
        warehouse_id: $localStorage.get('user').warehouse_id
    }).then(function(res) {
        $scope.isSearching = false;
        if (res.status == 'Y') {

            $scope.productCount = res.data.products.count;
            for (var i = 0; i < res.data.products.list.length; i++) {
                $scope.products.push(res.data.products.list[i]);
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
        if ($scope.editCartItemModal) {
            $scope.editCartItemModal.hide();
        }
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
                // $scope.loadCart();
            } else {
                $helper.toast(res.msg, 'short', 'bottom');
            }
        }).catch(function(err) {
            $helper.toast(err, 'long', 'bottom');
        });
    };  


    $scope.showPhotosGallery = function(){
        var photos = [];
        var photoIndex = 0;
        for (var i = 0; i < $scope.product.photos.length; i++) {
            if ($scope.product.photos[i] != '') {
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

    $scope.changeBigPhoto = function(photo) {
        $scope.bigPhoto = photo;
    };   


    $scope.stockLookUp = function(sku) {
        if (sku != null) {
            $scope.decodeSKU(sku);
            $scope.getSKUInfo();
        }
        $scope.viewPOut = {
            back: function() {
                $scope.LookupModal.hide();
            }
        };
        //$scope.loadOutList('init',null,sku);
        $ionicModal.fromTemplateUrl('templates/modal.stock-look-up-check.html', {
            scope: $scope,
            animation: 'slide-in-up'
        }).then(function(modal) {
            $scope.LookupModal = modal;
            modal.show();
        });

    };      

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


    $scope.goBack = function() {
        $helper.navBack(-1, 'slide-left-right');
    };
    $scope.$on('$ionicView.enter', function() {
        $rootScope.goBack = $scope.goBack;
    });  

    $scope.detailBack = function(){
      $scope.salesState = 'product-list';
    };

  /**************************************************
  // finally
  **************************************************/

  // make the view re-init data on enter
  $scope.$on('$ionicView.loaded', function() {
    $scope.init();
  });

//   $scope.$on('$ionicView.enter', function() {
//     $scope.init();
//   });  

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
});