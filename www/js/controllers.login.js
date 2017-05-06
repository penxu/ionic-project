angular.module('controllers.login', [
    'ionic',
    'pascalprecht.translate',
    'ngMessages',
    'services.localstorage',
    'services.helper',
    'services.api',
    'directives.common',
    'directives.ubeing'
])

.controller('loginCtrl', function($scope, $rootScope, $localStorage, $translate, $helper, $ionicLoading, $api, $ionicPopup, $ionicScrollDelegate) {

    // login
    $scope.login = function(form) {
        if (!form.$valid) {
            // angular.forEach(document.getElementsByClassName('error-container'), function(el) {
            //   if (angular.element(el).text().trim() != '')
            //   {
            //     $ionicScrollDelegate.$getByHandle('form-error').scrollTo(0, el.getBoundingClientRect().top, true);
            //   }
            // });
        } else {
            $scope.user.submitting = true;
            $api.login({
                token: $localStorage.get('settings').token,
                locale: $localStorage.get('settings').locale,
                login: $scope.user.login,
                password: $scope.user.password,
                device_type: $localStorage.get('settings').device_type,
                device_token: $localStorage.get('settings').device_token
            }).then(function(res) {
                $scope.user.submitting = false;
                if (res.status == 'Y') {
                    // save returned user info
                    if ($localStorage.get('settings').warehouse_lock) {
                        var warehouse_id = $localStorage.get('settings').warehouse_id;
                        $api.settings({
                            token: $localStorage.get('settings').token,
                            locale: $localStorage.get('settings').locale,
                            warehouse_id: warehouse_id,
                        }).then(function(res) {
                            if (res.status == 'Y') {} else {
                                $helper.toast(res.msg, 'short', 'top');
                            }
                        }).catch(function(err) {
                            $helper.toast(err, 'long', 'top');
                        });
                    } else {
                        var warehouse_id = res.warehouse_id;
                    }

                    $localStorage.set('user', {
                        id: res.user_id,
                        name: res.name,
                        shop_id: res.shop_id,
                        level: res.user_level,
                        login: $scope.user.login,
                        password: $scope.user.password,
                        warehouse_id: warehouse_id,
                        isLogin: true,
                        invoice_prefix: res.invoice_prefix
                    });

                    // save returned option list
                    var warehouse = [];
                    for (var i = 0; i < res.options.length; i++) {
                        warehouse.push({
                            id: res.options[i].warehouse_id,
                            code: res.options[i].warehouse_code,
                            name: res.options[i].warehouse_name
                        });
                    }
                    // save returned warehouse list (for inventory)
                    var inventory_warehouse = [];
                    for (var i = 0; i < res.warehouses.length; i++) {
                        inventory_warehouse.push({
                            id: res.warehouses[i].warehouse_id,
                            code: res.warehouses[i].warehouse_code,
                            name: res.warehouses[i].warehouse_name
                        });
                    }
                    $localStorage.set('inventory_warehouse', inventory_warehouse);


                    $localStorage.set('warehouse', warehouse);
                    $localStorage.set('loginUsername', res.login);
                    $localStorage.set('currency', res.android_currencies_list);
                    // save returned contact title
                    var titles = [];
                    var title_translate = [];
                    for (var i = 0; i < res.contact_title.length; i++) {
                        titles.push(res.contact_title[i]);
                        title_translate[res.contact_title[i].title_id] = res.contact_title[i];
                    }


                    $localStorage.set('titles', titles);
                    $localStorage.set('title_translate', title_translate);

                    var remarks = [];
                    for (var i = 0; i < res.remarks.length; i++) {
                        remarks.push(res.remarks[i].title);
                    }

                    $localStorage.set('remarks', remarks);
                    $helper.navForth('home', null, 'slide-left-right');
                    $rootScope.firstInit();
                    if (res.charges == null) {
                        res.charges = [];
                    }
                    $localStorage.set('charges', res.charges);
                    $helper.judgeUpdate(res.last_update);


                } else {
                    $helper.toast(res.msg, 'short', 'top');
                }
            }).catch(function(err) {
                console.log(err);
                $scope.user.submitting = false;
                $helper.toast(err, 'long', 'bottom');
            });
        }
    };

    // forgot password
    $scope.forgotPassword = function() {
        $ionicModal.fromTemplateUrl('templates/client.forgot-password.html', {
            scope: $scope,
            animation: 'slide-in-up'
        }).then(function(modal) {
            $scope.modal = modal;
            modal.show();
        });
    };
    $scope.cancelForgotPassword = function() {
        $scope.modal.hide();
    };
    $scope.clientForgotPassword = function(form) {
        if (!form.$valid) {
            angular.forEach(document.getElementsByClassName('error-container'), function(el) {
                if (angular.element(el).text().trim() != '') {
                    $ionicScrollDelegate.$getByHandle('form-error').scrollTo(0, el.getBoundingClientRect().top, true);
                }
            });
        } else {
            $scope.forgot.submitting = true;
            $api.forgotPassword({
                token: $localStorage.get('settings').token,
                locale: $localStorage.get('settings').locale,
                login: $scope.forgot.login
            }).then(function(res) {
                $scope.forgot.submitting = false;
                if (res.status == 'Y') {
                    $scope.modal.hide();
                } else {
                    $helper.toast($translate.instant(res.msg), 'short', 'bottom');
                }
            }).catch(function(err) {
                $scope.forgot.submitting = false;
                $helper.toast(err, 'long', 'bottom');
            });
        }
    };


    $scope.getCountry = function() {


        $api.getCountry({
            token: $localStorage.get('settings').token,
            locale: $localStorage.get('settings').locale,
        }).then(function(res) {
            if (res.status == 'Y') {
                var countrys = [];
                var regions = [
                    []
                ];
                var districts = [
                    []
                ];
                var areas = [
                    []
                ];
                for (var i = 0; i < res.data.length; i++) {
                    var country = res.data[i];
                    countrys[i] = country;
                    var region_list = country.regions;
                    regions[country.id] = [];
                    for (var j = 0; j < region_list.length; j++) {
                        var region = region_list[j];
                        regions[country.id][j] = region;
                        var district_list = region.districts;
                        districts[region.id] = [];
                        for (var k = 0; k < district_list.length; k++) {
                            var district = district_list[k];
                            districts[region.id][k] = district;
                            var area_list = district.areas;
                            areas[district.id] = [];
                            for (var m = 0; m < area_list.length; m++) {
                                var area = area_list[m];
                                areas[district.id][m] = area;
                            }
                        }
                    }
                }
                // save returned country info
                $localStorage.set('country', {
                    countrys: countrys,
                    regions: regions,
                    districts: districts,
                    areas: areas
                });
            } else {
                $helper.toast(res.msg, 'short', 'bottom');
            }
        }).catch(function(err) {
            $helper.toast(err, 'long', 'bottom');
        });


    };

    // save username
    $scope.saveUsername = function() {

        if ($scope.user.rememberUserName) {
            $localStorage.set('saveUserName', '1');
            console.log('is true');

        } else {
            $localStorage.set('saveUserName', '0');
            console.log('is false');

        }
    };

    /**************************************************
    // initialize view
    **************************************************/

    $scope.init = function() {

        var user = $localStorage.get('user');
        if ($localStorage.get('saveUserName') === null) {
            $localStorage.set('saveUserName', '0');
        }
        $scope.user = {
            login: user.login,
            password: user.password,
            submitting: false,
            rememberUserName: $localStorage.get('saveUserName') == '1'
        };


        if ($localStorage.get('saveUserName') == '1') {
            $scope.user.login = $localStorage.get('loginUsername');
        } else {
            $scope.user.login = user.login;
        }

        $scope.forgot = {
            login: '',
            submitting: false
        };

        $scope.shop_icon = $localStorage.get('activate').shop_icon;
    };


    $scope.backToActivate = function() {
        console.log('activate gate');
        $localStorage.set('activate', null);
        // var activate = $localStorage.get('activate');
        // activate.prefix = '';
        // activate.path = 'www';
        // $localStorage.set('activate',activate);

        $helper.toast('developer gate!', 'short', 'bottom');
        $helper.navForth('splash', null, 'slide-left-right');
        console.log('activate gate 2');
    };

    /**************************************************
    // event handlers
    **************************************************/

    // go back
    $scope.goBack = function() {};
    /**************************************************
    // finally
    **************************************************/

    // make the view re-init data on enter
    $scope.$on('$ionicView.enter', function() {
        $rootScope.goBack = $scope.goBack;
        $scope.init();
        $scope.getCountry();
    });

})

;
