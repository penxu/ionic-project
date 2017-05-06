angular.module('controllers.splash', [
    'ionic',
    'pascalprecht.translate',
    'services.localstorage',
    'services.helper',
    'services.api',
    'directives.common',
    'directives.ubeing',
    'services.offline'
])

.controller('splashCtrl', function($scope, $rootScope, $localStorage, $translate, $helper, $ionicLoading, $api, $ionicHistory, $ionicModal, $filter, $ionicPopup, $offline, $timeout, $window, $ionicPopover, SERVER) {

    /**************************************************
    // initialize view
    **************************************************/

    $rootScope.choosePayment = function(paymentInfo) {
        $rootScope.currentPayment = paymentInfo;
        $rootScope.popOverOperation.popoverBack();
    };

    $rootScope.chooseOrderType = function(orderType) {
        $rootScope.currentOrderType = orderType;
        $rootScope.popOverOperation.popoverBack();
    };

    $rootScope.setPaymentList = function(){
        $rootScope.choosePaymentList = [
            { id: 1, name: 'cash', code: $translate.instant('CASH'), image:'img/2.0icon/icon-pay/cash.png' },
            { id: 2, name: 'aliPay', code: $translate.instant('ALIPAY'), image:'img/2.0icon/icon-pay/cash.png' },
            { id: 3, name: 'amex', code: $translate.instant('AMEX'), image:'img/2.0icon/icon-pay/cash.png' },
            { id: 4, name: 'android', code: $translate.instant('ANDROID'), image:'img/2.0icon/icon-pay/cash.png' },
            { id: 5, name: 'apple', code: $translate.instant('APPLE'), image:'img/2.0icon/icon-pay/cash.png' },
            { id: 6, name: 'mastercard', code: $translate.instant('MASTER'), image:'img/2.0icon/icon-pay/cash.png' },
            { id: 7, name: 'Octopussmalllogo', code: $translate.instant('OPMLG'), image:'img/2.0icon/icon-pay/cash.png' },
            { id: 8, name: 'paypal', code: $translate.instant('PAYPAL'), image:'img/2.0icon/icon-pay/cash.png' },
            { id: 9, name: 'visa', code: $translate.instant('VISA'), image:'img/2.0icon/icon-pay/cash.png' },
            { id: 10, name: 'wechat', code: $translate.instant('WECHAT'), image:'img/2.0icon/icon-pay/cash.png' }
        ];
    };


    $scope.init = function() {

        

        $rootScope.chooseOrderTypeList = [
            { id: 1, name: 'dinein', code: 'Dine In' },
            { id: 2, name: 'takeaway', code: 'Take Away' }
        ];
        if (!$rootScope.currentOrderType) {
            $rootScope.currentOrderType = { id: 1, name: 'Dine In', code: 'Dine In' };
        }

        // get app status
        if (ionic.Platform.isIOS()) {
            $rootScope.platform = 'ios';
        } else if (ionic.Platform.isAndroid()) {
            $rootScope.platform = 'android';
        } else if (ionic.Platform.isWindowsPhone()) {
            $rootScope.platform = 'window';
        } else {
            $rootScope.platform = 'web';
        }

        // detect network info
        console.log('1');
        $helper.watchNetwork();
        if ($localStorage.get('offline') == undefined) {
            $localStorage.set('offline', 'online');
        }
        $rootScope.isOffline = $localStorage.get('offline') == 'offline' ? true : false;
        $rootScope.networkResult = !$rootScope.isOffline && $rootScope.networkStatus;
        // TODO: check network availibility
        $rootScope.online = true;

        // disable back to splash page
        $ionicHistory.nextViewOptions({ disableBack: true });
        console.log('2');
        // initialize app status from server
        if ($localStorage.get('settings') === null) {
            $localStorage.set('settings', {
                token: null,
                locale: 'EN_US',
                device_type: '',
                device_token: '',
                warehouse_lock: false,
                warehouse_id: '',
                cloud_lock: false,
                cloud_address: '',
                epson_ip_address: '192.168.200.39',
                epson_port: '8008',
                epson_device_id: 'local_printer',
                printer_type: 'EPSON thermal printer'
            });
        }
        $translate.use($localStorage.get('settings').locale);
        console.log('3');
        // initialize user
        if ($localStorage.get('user') === null) {
            $localStorage.set('user', {
                id: null,
                name: null,
                shop_id: null,
                level: null,
                login: '',
                password: '',
                warehouse_id: '',
                isLogin: false,
                invoice_prefix: ''
            });
        }

        console.log('4');
        if ($localStorage.get('activate') === null) {
            $localStorage.set('activate', {
                status: false,
                path: 'www',
                prefix: '',
                passcode: '',
                shop_icon: ''
            });
        }

        /**************************************************
        // switch sandbox
        **************************************************/
        if ($localStorage.get('activate').prefix == '') {
            $rootScope.sandboxCheckbox = false;
        } else {
            $rootScope.sandboxCheckbox = true;
        }
        console.log('check sandbox production :' + $rootScope.sandboxCheckbox);

        console.log('5');
        //get dial code
        if ($localStorage.get('dial') === null) {
            console.log('ready to get dial!!');
            $api.getDialCode({}).then(function(res) {
                console.log(res);
                if (res.status == 'Y') {
                    var dial_list = res.data;
                    $localStorage.set('dial', {
                        dial_list: dial_list,
                    });

                } else {}
            }).catch(function(err) {
                console.log(err);
                $helper.toast(err, 'long', 'bottom');
            });
        }
        console.log('6');
        // display loading indicator
        $ionicLoading.show({
            template: '<ion-spinner icon="lines"></ion-spinner>',
            noBackdrop: true
        });
        console.log('7');
        var activate = $localStorage.get('activate');
        console.log($rootScope.networkResult);
        if ($rootScope.networkResult) {
            if (activate.status) {
                // initial data & api token & auto login
                console.log('before auth');
                var api_auth = function() {
                    $api.auth().then(function(res) {
                        if (res.status == 'Y') {
                            console.log('into auth');
                            var settings = $localStorage.get('settings');
                            settings.token = res.token;
                            $localStorage.set('settings', settings);

                            // auto login if user saved password
                            var user = $localStorage.get('user');
                            if (user.id != null) {
                                console.log('before login');
                                $api.login({
                                    token: settings.token,
                                    locale: settings.locale,
                                    login: user.login,
                                    password: user.password,
                                    device_type: settings.device_type,
                                    device_token: settings.device_token
                                }).then(function(res) {
                                    if (res.status == 'Y') {
                                        // save returned user info
                                        console.log('login success');
                                        console.log(res);
                                        user.level = res.user_level;
                                        user.shop_id = res.shop_id;
                                        user.isLogin = true;
                                        user.name = res.name;
                                        user.invoice_prefix = res.invoice_prefix;
                                        $localStorage.set('user', user);
                                        console.log('set user' + $localStorage.get('user'));

                                        // save returned warehouse list
                                        var warehouse = [];
                                        console.log('generate warehouse');
                                        for (var i = 0; i < res.options.length; i++) {
                                            warehouse.push({
                                                id: res.options[i].warehouse_id,
                                                code: res.options[i].warehouse_code,
                                                name: res.options[i].warehouse_name
                                            });
                                        }
                                        console.log('set warehouse');
                                        $localStorage.set('warehouse', warehouse);
                                        var inventory_warehouse = [];
                                        for (var i = 0; i < res.warehouses.length; i++) {
                                            inventory_warehouse.push({
                                                id: res.warehouses[i].warehouse_id,
                                                code: res.warehouses[i].warehouse_code,
                                                name: res.warehouses[i].warehouse_name
                                            });
                                        }
                                        $localStorage.set('inventory_warehouse', inventory_warehouse);

                                        $ionicLoading.hide();
                                        $rootScope.firstInit();
                                        $helper.judgeUpdate(res.last_update);
                                        $helper.navForth('home', null, 'slide-left-right');
                                    } else {
                                        // auto login failed, mark the user as un-logged
                                        user.isLogin = false;
                                        $localStorage.set('user', user);
                                        $ionicLoading.hide();
                                        $helper.navForth('login', null, 'slide-left-right');
                                    }
                                }).catch(function(err) {
                                    user.isLogin = false;
                                    $localStorage.set('user', user);
                                    $ionicLoading.hide();
                                    $helper.navForth('login', null, 'slide-left-right');
                                    console.log('catch login err');
                                    $helper.toast(err, 'long', 'bottom');
                                });
                            } else {
                                if (user != null) {
                                    // auto login failed, mark the user as un-logged
                                    user.isLogin = false;
                                    $localStorage.set('user', user);
                                }

                                $ionicLoading.hide();
                                $helper.navForth('login', null, 'slide-left-right');
                            }
                        } else {
                            $helper.toast(res.msg, 'short', 'bottom');
                            $ionicLoading.hide();
                            $ionicPopup.alert({
                                template: $filter('translate')('NETWORK_UNSTEADY_RETRY')
                            }).then(function(res) {
                                $ionicLoading.show({
                                    template: '<ion-spinner icon="lines"></ion-spinner>',
                                    noBackdrop: true
                                });
                                api_auth();
                            });
                        }
                    }).catch(function(err) {
                        $helper.toast(err, 'long', 'bottom');
                        $ionicLoading.hide();
                        $ionicPopup.alert({
                            template: $filter('translate')('NETWORK_UNSTEADY_RETRY')
                        }).then(function(res) {
                            $ionicLoading.show({
                                template: '<ion-spinner icon="lines"></ion-spinner>',
                                noBackdrop: true
                            });
                            api_auth();
                        });
                    });
                };
                api_auth();
            } else {
                $ionicLoading.hide();
                $helper.navForth('activate', null, 'slide-left-right');
            }
        } else {
            if (activate.status) {
                var user = $localStorage.get('user');
                console.log('0');
                if (user.id != null) {
                    console.log('1');
                    $ionicLoading.hide();
                    $rootScope.offlineFirstInit();
                    $helper.navForth('home', null, 'slide-left-right');
                } else {
                    console.log('2');
                    if (user != null) {
                        console.log('3');
                        user.isLogin = false;
                        $localStorage.set('user', user);
                    }
                    $ionicLoading.hide();
                    $helper.navForth('login', null, 'slide-left-right');
                    $helper.toast($filter('translate')('NETWORK_CONTINUE'));
                }
            } else {
                console.log('3');
                $ionicLoading.hide();
                $helper.navForth('activate', null, 'slide-left-right');
                $helper.toast($filter('translate')('NETWORK_CONTINUE'));
            }
        }            

        console.log($rootScope.networkResult);

    };

    /**************************************************
    // event handlers
    **************************************************/

    /**************************************************
    // finally
    **************************************************/
    $rootScope.firstInit = function() {
        $rootScope.shop_icon = $localStorage.get('activate').shop_icon;
        $rootScope.user_name = $localStorage.get('user').login;
        var settings = $localStorage.get('settings');
        $rootScope.currentLang = settings.locale;
        $rootScope.printerType = settings.printer_type;
        $rootScope.epsonIpAddress = settings.epson_ip_address;
        $rootScope.epsonPort = settings.epson_port;
        $rootScope.epsonDeviceId = settings.epson_device_id;
        console.log($rootScope.epsonIpAddress);
        angular.forEach($localStorage.get('warehouse'), function(val) {
            if ($localStorage.get('user').warehouse_id == val.id) {
                $rootScope.warehouse_name = val.name;
            }
        });

        // switch language
        $rootScope.switchLanguage = function(lang) {
            var settings = $localStorage.get('settings');
            settings.locale = lang;
            $localStorage.set('settings', settings);
            $translate.use(lang);
            $rootScope.currentLang = lang;
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
                    $rootScope.$broadcast('changeLanguage', { obj: lang });
                } else {
                    $helper.toast(res.msg, 'short', 'bottom');
                }
            }).catch(function(err) {
                $helper.toast(err, 'long', 'bottom');
            });
        };
        // load invoice detail
        $rootScope.popUpSetting = function() {
            console.log('check sandboxCheckbox :' + $rootScope.sandboxCheckbox);
            $rootScope.hideMenu();
            $rootScope.settingConfig = {
                title: 'SETTINGS',
                back: function() {
                    $rootScope.settingModal.hide();
                    $rootScope.settingModal.remove();
                }
            };
            $rootScope.langs = SERVER.languages;
            $ionicModal.fromTemplateUrl('templates/modal.setting.html', {
                scope: $rootScope,
                animation: 'slide-in-up'
            }).then(function(modal) {
                $rootScope.settingModal = modal;
                modal.show();
            });

        };
        $rootScope.warehouseCheckbox = $localStorage.get('settings').warehouse_lock;
        $rootScope.warehouseLock = function(value) {
            var settings = $localStorage.get('settings');
            settings.warehouse_lock = value;
            $localStorage.set('settings', settings);
            $rootScope.warehouseCheckbox = value;
            console.log($rootScope.warehouseCheckbox);
        };

        $rootScope.selectWarehouse = function(war_name) {
            if (!$localStorage.get('settings').warehouse_lock) {
                angular.forEach($localStorage.get('warehouse'), function(val) {
                    if (war_name == val.name) {
                        var user = $localStorage.get('user');
                        user.warehouse_id = val.id;
                        $localStorage.set('user', user);
                        var setting = $localStorage.get('settings');
                        setting.warehouse_id = val.id;
                        $localStorage.set('settings', setting);
                        $api.settings({
                            token: $localStorage.get('settings').token,
                            locale: $localStorage.get('settings').locale,
                            warehouse_id: val.id,
                        }).then(function(res) {
                            if (res.status == 'Y') {} else {
                                $helper.toast(res.msg, 'short', 'bottom');
                            }
                        }).catch(function(err) {
                            $helper.toast(err, 'long', 'bottom');
                        });

                    }
                });
                angular.forEach($localStorage.get('warehouse'), function(val) {
                    if ($localStorage.get('user').warehouse_id == val.id) {
                        $rootScope.warehouse_name = val.name;
                    }
                });
                $rootScope.showWarehouseModal.hide();
                $rootScope.showWarehouseModal.remove();
                $rootScope.currentInvoiceId = null;
                $helper.navForth('home', null, 'slide-left-right');
            }

        }

        $rootScope.showWarehouse = function() {
            if (!$localStorage.get('settings').warehouse_lock) {
                $rootScope.warehouseList = [];
                angular.forEach($localStorage.get('warehouse'), function(val) {
                    $rootScope.warehouseList.push(val.name);
                });
                $rootScope.warehouseConfig = {
                    title: 'SELECT_WAREHOUSE',
                    back: function() {
                        $rootScope.showWarehouseModal.hide();
                        $rootScope.showWarehouseModal.remove();
                    }
                };
                $ionicModal.fromTemplateUrl('templates/modal.select-warehouse.html', {
                    scope: $rootScope,
                    animation: 'slide-in-up'
                }).then(function(modal) {
                    $rootScope.showWarehouseModal = modal;
                    $rootScope.showWarehouseModal.show();
                });
            }

        }

        $rootScope.showPrinter = function() {

            $rootScope.printerList = [];
            $rootScope.printerList.push('Other');
            $rootScope.printerList.push('EPSON thermal printer');

            $rootScope.printerConfig = {
                title: 'SELECT_PRINTER',
                back: function() {
                    $rootScope.showWarehouseModal.hide();
                    $rootScope.showWarehouseModal.remove();
                }
            };
            $ionicModal.fromTemplateUrl('templates/modal.select-printer.html', {
                scope: $rootScope,
                animation: 'slide-in-up'
            }).then(function(modal) {
                $rootScope.showWarehouseModal = modal;
                $rootScope.showWarehouseModal.show();
            });

        }

        $rootScope.changeEpsonIpAddr = function(addr) {
            var settings = $localStorage.get('settings');
            settings.epson_ip_address = addr;
            $localStorage.set('settings', settings);
            $rootScope.epsonIpAddress = addr;
            console.log($rootScope.epsonIpAddress);
        };


        $rootScope.changeEpsonPort = function(addr) {
            var settings = $localStorage.get('settings');
            settings.epson_port = addr;
            $localStorage.set('settings', settings);
            $rootScope.epsonPort = addr;
            console.log($rootScope.epsonPort);
        };


        $rootScope.changeEpsonDeviceId = function(addr) {
            var settings = $localStorage.get('settings');
            settings.epson_device_id = addr;
            $localStorage.set('settings', settings);
            $rootScope.epsonDeviceId = addr;
            console.log($rootScope.epsonDeviceId);
        };

        $rootScope.selectPrinter = function(printer) {

            var settings = $localStorage.get('settings');
            settings.printer_type = printer;
            $localStorage.set('settings', settings);
            $rootScope.printerType = printer;
            console.log($rootScope.printerType);

            $rootScope.showWarehouseModal.hide();
            $rootScope.showWarehouseModal.remove();

        }

        //cloud print  
        $rootScope.cloudPrint = $localStorage.get('settings').cloud_lock;

        $rootScope.switchCloudPrint = function(value) {
            var settings = $localStorage.get('settings');
            settings.cloud_lock = value;
            $localStorage.set('settings', settings);
            $rootScope.cloudPrint = value;
            console.log($rootScope.cloudPrint);
        };

        $rootScope.cloudPrintAddress = $localStorage.get('settings').cloud_address == ' ' ? '' : $localStorage.get('settings').cloud_address;

        $rootScope.changePrintAddr = function(addr) {
            var settings = $localStorage.get('settings');
            settings.cloud_address = addr;
            $localStorage.set('settings', settings);
            $rootScope.cloudPrintAddress = addr;
            console.log($rootScope.cloudPrintAddress);
        };

        $rootScope.logout = function() {
            console.log('log out');
            var user = $localStorage.get('user');
            user.id = null;
            user.isLogin = false;
            $localStorage.set('user', {});
            $helper.showLoading();
            $api.auth().then(function(res) {
                $helper.hideLoading();
                if (res.status == 'Y') {
                    var settings = $localStorage.get('settings');
                    settings.token = res.token;
                    $rootScope.currentInvoiceId = null;
                    $localStorage.set('settings', settings);
                    $rootScope.hideMenu();
                    $helper.navForth('login', null, 'slide-left-right');
                } else {
                    $helper.toast(res.msg, 'short', 'bottom');
                }
            }).catch(function(err) {
                $helper.hideLoading();
                $helper.toast(err, 'long', 'bottom');
            });
        };

        $rootScope.switchSandbox = function(sandbox) {
            // var content = sandbox?'CHANGE_SANDBOX':'CHANGE_PRODUCTION';           
            // $helper.popConfirm($filter('translate')('REMIND'),$filter('translate')(content),function(res){
            //     if(res){
            console.log('into meme~~');
            var activate = $localStorage.get('activate');
            if (sandbox) {
                activate.prefix = 'sandbox.';
            } else {
                activate.prefix = '';
            }
            $localStorage.set('activate', activate);
            $rootScope.sandboxCheckbox = sandbox;
            $rootScope.logout();
            $rootScope.settingModal.hide();
            $rootScope.settingModal.remove();
            $rootScope.clearCart();
            // }else{
            //     $scope.sandboxCheckbox = !$scope.sandboxCheckbox;
            // }
            // });
        };



        /**************************************************
        // switch offline
        **************************************************/


        /**
         * switch offline mode
         */
        $rootScope.switchOffline = function(isOnline) {
            if((!$rootScope.isOffline&&isOnline) || ($rootScope.isOffline&&!isOnline)) return;
            var str = isOnline ? 'SWITCH_ONLINE' : 'SWITCH_OFFLINE';
            $ionicPopup.confirm({
                title: 'Remind',
                template: $filter('translate')(str)
            }).then(function(res) {
                if (res) {
                    var offlineStatus = $localStorage.get('offline');
                    $localStorage.set('offline', isOnline ? 'online' : 'offline');
                    $rootScope.isOffline = !isOnline;
                    $rootScope.networkResult = !$rootScope.isOffline && $rootScope.networkStatus;
                    console.log('network result : ' + $rootScope.networkResult);
                    $helper.navForth('home', null, 'slide-left-right');
                    $rootScope.currentInvoiceId = null;
                }
            });
        };


        $rootScope.downloadData = function(remindStr) {
            $ionicPopup.confirm({
                title: $translate.instant('REMIND'),
                template: $translate.instant(remindStr)
            }).then(function(res) {
                if (res) {
                    // data
                    $offline.getOfflineData({
                        token: $localStorage.get('settings').token,
                        locale: $localStorage.get('settings').locale,
                        category: 'POS',
                        type: 'SQLite'
                    }).then(function(res) {
                        console.log('deploy data success!!!');

                        //photo
                        $offline.getOfflinePhoto({
                            token: $localStorage.get('settings').token,
                            locale: $localStorage.get('settings').locale,
                        }).then(function(res) {
                            console.log('deploy photos success!!!');
                        }).catch(function(err) {
                            console.log('catch getOfflinePhoto error!!!');
                            $helper.toast(err, 'short', 'bottom');
                        });
                    }).catch(function(err) {
                        console.log('catch get OfflineData error!!!');
                        console.log(err);
                        $helper.toast(err, 'short', 'bottom');
                    });
                }
            });
        };
    };


    $rootScope.offlineFirstInit = function() {
        $rootScope.shop_icon = $localStorage.get('activate').shop_icon;
        $rootScope.user_name = $localStorage.get('user').login;
        $rootScope.currentLang = $localStorage.get('settings').locale;
        $rootScope.printerType = $localStorage.get('settings').printer_type;
        $rootScope.epsonIpAddress = $localStorage.get('settings').epson_ip_address;
        $rootScope.epsonPort = $localStorage.get('settings').epson_port;
        $rootScope.epsonDeviceId = $localStorage.get('settings').epson_device_id;
        console.log($rootScope.epsonIpAddress);
        angular.forEach($localStorage.get('warehouse'), function(val) {
            if ($localStorage.get('user').warehouse_id == val.id) {
                $rootScope.warehouse_name = val.name;
            }
        });
        // switch language
        $rootScope.switchLanguage = function(lang) {
            var settings = $localStorage.get('settings');
            settings.locale = lang;
            $localStorage.set('settings', settings);
            $translate.use(lang);
            $rootScope.currentLang = lang;

        };
        // load invoice detail
        $rootScope.popUpSetting = function() {

            $rootScope.settingConfig = {
                title: 'SETTINGS',
                back: function() {
                    $rootScope.popUpModal.hide();
                    $rootScope.popUpModal.remove();
                }
            };

            $ionicModal.fromTemplateUrl('templates/modal.setting.html', {
                scope: $rootScope,
                animation: 'slide-in-up'
            }).then(function(modal) {
                $rootScope.popUpModal = modal;
                modal.show();
            });

        };
        $rootScope.warehouseCheckbox = $localStorage.get('settings').warehouse_lock;
        $rootScope.warehouseLock = function(value) {
            var settings = $localStorage.get('settings');
            settings.warehouse_lock = value;
            $localStorage.set('settings', settings);
            $rootScope.warehouseCheckbox = value;
            console.log($rootScope.warehouseCheckbox);
        };

        $rootScope.selectWarehouse = function(war_name) {
            if (!$localStorage.get('settings').warehouse_lock) {
                angular.forEach($localStorage.get('warehouse'), function(val) {
                    if (war_name == val.name) {
                        var user = $localStorage.get('user');
                        user.warehouse_id = val.id;
                        $localStorage.set('user', user);
                        var setting = $localStorage.get('settings');
                        setting.warehouse_id = val.id;
                        $localStorage.set('settings', setting);
                        $api.settings({
                            token: $localStorage.get('settings').token,
                            locale: $localStorage.get('settings').locale,
                            warehouse_id: val.id,
                        }).then(function(res) {
                            if (res.status == 'Y') {} else {
                                $helper.toast(res.msg, 'short', 'bottom');
                            }
                        }).catch(function(err) {
                            $helper.toast(err, 'long', 'bottom');
                        });

                    }
                });
                angular.forEach($localStorage.get('warehouse'), function(val) {
                    if ($localStorage.get('user').warehouse_id == val.id) {
                        $rootScope.warehouse_name = val.name;
                    }
                });
                $rootScope.showWarehouseModal.hide();
                $rootScope.showWarehouseModal.remove();
                $rootScope.currentInvoiceId = null;
                $helper.navForth('home', null, 'slide-left-right');
            }

        }

        $rootScope.showWarehouse = function() {
            if (!$localStorage.get('settings').warehouse_lock) {
                $rootScope.warehouseList = [];
                angular.forEach($localStorage.get('warehouse'), function(val) {
                    $rootScope.warehouseList.push(val.name);
                });
                $rootScope.warehouseConfig = {
                    title: 'SELECT_WAREHOUSE',
                    back: function() {
                        $rootScope.showWarehouseModal.hide();
                        $rootScope.showWarehouseModal.remove();
                    }
                };
                $ionicModal.fromTemplateUrl('templates/modal.select-warehouse.html', {
                    scope: $rootScope,
                    animation: 'slide-in-up'
                }).then(function(modal) {
                    $rootScope.showWarehouseModal = modal;
                    $rootScope.showWarehouseModal.show();
                });
            }

        }

        $rootScope.showPrinter = function() {

            $rootScope.printerList = [];
            $rootScope.printerList.push('Other');
            $rootScope.printerList.push('EPSON thermal printer');

            $rootScope.printerConfig = {
                title: 'SELECT_PRINTER',
                back: function() {
                    $rootScope.showWarehouseModal.hide();
                    $rootScope.showWarehouseModal.remove();
                }
            };
            $ionicModal.fromTemplateUrl('templates/modal.select-printer.html', {
                scope: $rootScope,
                animation: 'slide-in-up'
            }).then(function(modal) {
                $rootScope.showWarehouseModal = modal;
                $rootScope.showWarehouseModal.show();
            });

        }

        $rootScope.changeEpsonIpAddr = function(addr) {
            var settings = $localStorage.get('settings');
            settings.epson_ip_address = addr;
            $localStorage.set('settings', settings);
            $rootScope.epsonIpAddress = addr;
            console.log($rootScope.epsonIpAddress);
        };


        $rootScope.changeEpsonPort = function(addr) {
            var settings = $localStorage.get('settings');
            settings.epson_port = addr;
            $localStorage.set('settings', settings);
            $rootScope.epsonPort = addr;
            console.log($rootScope.epsonPort);
        };


        $rootScope.changeEpsonDeviceId = function(addr) {
            var settings = $localStorage.get('settings');
            settings.epson_device_id = addr;
            $localStorage.set('settings', settings);
            $rootScope.epsonDeviceId = addr;
            console.log($rootScope.epsonDeviceId);
        };

        $rootScope.selectPrinter = function(printer) {

            var settings = $localStorage.get('settings');
            settings.printer_type = printer;
            $localStorage.set('settings', settings);
            $rootScope.printerType = printer;
            console.log($rootScope.printerType);

            $rootScope.showWarehouseModal.hide();
            $rootScope.showWarehouseModal.remove();

        }

        //cloud print  
        $rootScope.cloudPrint = $localStorage.get('settings').cloud_lock;

        $rootScope.switchCloudPrint = function(value) {
            var settings = $localStorage.get('settings');
            settings.cloud_lock = value;
            $localStorage.set('settings', settings);
            $rootScope.cloudPrint = value;
            console.log($rootScope.cloudPrint);
        };

        $rootScope.cloudPrintAddress = $localStorage.get('settings').cloud_address == ' ' ? '' : $localStorage.get('settings').cloud_address;

        $rootScope.changePrintAddr = function(addr) {
            var settings = $localStorage.get('settings');
            settings.cloud_address = addr;
            $localStorage.set('settings', settings);
            $rootScope.cloudPrintAddress = addr;
            console.log($rootScope.cloudPrintAddress);
        };

        $rootScope.logout = function(hideModalFunc) {
            console.log('log out');
            var user = $localStorage.get('user');
            user.id = null;
            user.isLogin = false;
            $localStorage.set('user', {});
            $helper.showLoading();
            $api.auth().then(function(res) {
                $helper.hideLoading();
                if (res.status == 'Y') {
                    var settings = $localStorage.get('settings');
                    settings.token = res.token;
                    $rootScope.currentInvoiceId = null;
                    $localStorage.set('settings', settings);
                    $helper.navForth('login', null, 'slide-left-right');
                } else {
                    $helper.toast(res.msg, 'short', 'bottom');
                }
            }).catch(function(err) {
                $helper.hideLoading();
                $helper.toast(err, 'long', 'bottom');
            });

        };


        /**************************************************
        // switch sandbox
        **************************************************/
        if ($localStorage.get('activate').prefix == '') {
            $rootScope.sandboxCheckbox = false;
        } else {
            $rootScope.sandboxCheckbox = true;
        }
        $rootScope.switchSandbox = function(sandbox) {
            console.log('into meme~~');
            var activate = $localStorage.get('activate');
            if (sandbox) {
                activate.prefix = 'sandbox.';
            } else {
                activate.prefix = '';
            }
            $localStorage.set('activate', activate);
            $rootScope.sandboxCheckbox = sandbox;
            $rootScope.logout();
            $rootScope.settingModal.hide();
            $rootScope.settingModal.remove();
        };



        /**************************************************
        // switch offline
        **************************************************/


        /**
         * switch offline mode
         */
        $rootScope.switchOffline = function() {
            var str = $rootScope.isOffline ? 'SWITCH_ONLINE' : 'SWITCH_OFFLINE';
            $ionicPopup.confirm({
                title: 'Remind',
                template: $filter('translate')(str)
            }).then(function(res) {
                if (res) {
                    var offlineStatus = $localStorage.get('offline');
                    $localStorage.set('offline', offlineStatus == 'online' ? 'offline' : 'online');
                    $rootScope.isOffline = !$rootScope.isOffline;
                    $rootScope.networkResult = !$rootScope.isOffline && $rootScope.networkStatus;
                    console.log('network result : ' + $rootScope.networkResult);
                    $helper.navForth('home', null, 'slide-left-right');
                }
            });
        };

        $rootScope.downloadData = function(remindStr) {
            $ionicPopup.confirm({
                title: 'Remind',
                template: $translate.instant(remindStr)
            }).then(function(res) {
                if (res) {
                    // data
                    $offline.getOfflineData({
                        token: $localStorage.get('settings').token,
                        locale: $localStorage.get('settings').locale,
                        category: 'POS',
                        type: 'SQLite'
                    }).then(function(res) {
                        console.log('deploy data success!!!');

                        //photo
                        $offline.getOfflinePhoto({
                            token: $localStorage.get('settings').token,
                            locale: $localStorage.get('settings').locale,
                        }).then(function(res) {
                            console.log('deploy photos success!!!');
                        }).catch(function(err) {
                            console.log('error!!!');
                            $helper.toast(err, 'short', 'bottom');
                        });
                    }).catch(function(err) {
                        console.log('error!!!');
                        console.log(err);
                        $helper.toast(err, 'short', 'bottom');
                    });
                }
            });
        };

    };

    $rootScope.popoverMenu = function($event) {
        $ionicPopover.fromTemplateUrl('templates/popover.setting.html', {
            scope: $rootScope
        }).then(function(popover) {
            $rootScope.menuPopover = popover;
            popover.show($event);
        });
    };

    $rootScope.hideMenu = function() {
        if ($rootScope.menuPopover) {
            $rootScope.menuPopover.hide();
            $rootScope.menuPopover.remove();
        }
    };

    $rootScope.popOverOperation = {
        popUpMemberList: function() {
            $rootScope.hideMenu();
            $rootScope.proccessMenuMemberDetail = function(memberID) {
                $localStorage.set('memberProfile', {
                    member_id: memberID
                });
                $rootScope.loadCustomerDetail('init');
                console.log("change member id:" + memberID);
                $ionicModal.fromTemplateUrl('templates/modal.member-detail.html', {
                    scope: $rootScope
                }).then(function(modal) {
                    $rootScope.memberDetailModal = modal;
                    $rootScope.memberDetailModalBack = function() {
                        $rootScope.memberDetailModal.hide();
                        $rootScope.memberDetailModal.remove();
                    };
                    console.log('ohohohohohoho');
                    modal.show();
                });
            };
            $rootScope.searchButtonBar = {
                // searchHints: $translate.instant('SEARCH_PRODUCT_HINTS'),
                searchHints: $filter('translate')('SEARCH_CUSTOMER_HINTS'),
                searchKeyword: '',
                searchFor: function(keyword) {
                    $rootScope.loadMenuCustomerList('refresh', keyword);
                },
                back: function() {
                    $rootScope.memberModal.hide();
                    $rootScope.memberModal.remove();
                },
                scanQR: function() {
                    document.addEventListener("deviceready", function() {
                        $helper.scan(function(scanData) {
                            if (scanData.cancelled == 0) {
                                $scope.loadMenuCustomerList('refresh', scanData.text);
                            }
                        });
                    }, false);
                }
            };
            $ionicModal.fromTemplateUrl('templates/modal.member-list.html', {
                scope: $rootScope,
                animation: 'slide-in-up'
            }).then(function(modal) {
                $rootScope.memberModal = modal;
                modal.show();
            });
        },
        popoverMemberList: function($event) {
            $rootScope.isMemberDetail = false;
            $rootScope.customerSearchBar.searchKeyword = '';
            $ionicPopover.fromTemplateUrl('templates/popover.member-list.html', {
                scope: $rootScope
            }).then(function(popover) {
                $rootScope.memberPopover = popover;
                popover.show($event);
            });
        },
        popoverPaymentType: function($event) {
            console.log($rootScope.choosePaymentList);
            $ionicPopover.fromTemplateUrl('templates/popover.select-payment-type.html', {
                scope: $rootScope
            }).then(function(popover) {
                $rootScope.memberPopover = popover;
                $rootScope.setPaymentList();
                popover.show($event);
            });
        },
        popoverOrderType: function($event) {
            $ionicPopover.fromTemplateUrl('templates/popover.select-order-type.html', {
                scope: $rootScope
            }).then(function(popover) {
                $rootScope.memberPopover = popover;
                popover.show($event);
            });
        },
        processMemberDetail: function(memberID) {
            $rootScope.isMemberDetail = true;
            $rootScope.memberID = memberID;
            $localStorage.set('memberProfile', {
                member_id: memberID
            });
            $rootScope.loadCustomerDetail('init');
            console.log("change member id:" + memberID);
        },
        memberBack: function() {
            $rootScope.isMemberDetail = false;
            $localStorage.set('memberProfile', {
                member_id: ''
            });
        },
        popoverBack: function() {
            $rootScope.memberPopover.hide();
            $rootScope.memberPopover.remove();
        }
    };

    $rootScope.orderHistoryOperation = {
        popUpOrderHistory: function() {
            $rootScope.hideMenu();
            $rootScope.loadOrderHistory('refresh');
            $rootScope.searchButtonBar = {
                searchHints: $filter('translate')('SEARCH_INVOICE_HINTS'),
                searchKeyword: '',
                searchFor: function(keyword) {
                    $rootScope.loadOrderHistory('refresh', keyword);
                },
                back: function() {
                    $rootScope.historyModal.hide();
                    $rootScope.historyModal.remove();
                },
                scanQR: function() {
                    document.addEventListener("deviceready", function() {
                        $helper.scan(function(scanData) {
                            if (scanData.cancelled == 0) {
                                $scope.loadOrderHistory('refresh', scanData.text);
                            }
                        });
                    }, false);
                }
            };
            $ionicModal.fromTemplateUrl('templates/modal.order-history.html', {
                scope: $rootScope,
                animation: 'slide-in-up'
            }).then(function(modal) {
                $rootScope.historyModal = modal;
                modal.show();
            });
        },
        back: function() {
            $rootScope.historyModal.hide();
            $rootScope.historyModal.remove();
        }
    };

    $rootScope.pickUpOperation = {
        popUpPickUp: function() {
            $rootScope.hideMenu();
            $rootScope.loadPickUpList('refresh');
            $rootScope.searchButtonBar = {
                searchHints: $filter('translate')('SEARCH_INVOICE_HINTS'),
                searchKeyword: '',
                searchFor: function(keyword) {
                    $rootScope.loadPickUpList('refresh', keyword);
                },
                back: function() {
                    $rootScope.pickUpModal.hide();
                    $rootScope.pickUpModal.remove();
                },
                scanQR: function() {
                    document.addEventListener("deviceready", function() {
                        $helper.scan(function(scanData) {
                            if (scanData.cancelled == 0) {
                                $scope.loadPickUpList('refresh', scanData.text);
                            }
                        });
                    }, false);
                }
            };
            $ionicModal.fromTemplateUrl('templates/modal.pick-up.html', {
                scope: $rootScope,
                animation: 'slide-in-up'
            }).then(function(modal) {
                $rootScope.pickUpModal = modal;
                modal.show();
            });
        },
        back: function() {
            $rootScope.pickUpModal.hide();
            $rootScope.pickUpModal.remove();
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
                if (mode != 'more' || $rootScope.customerList == undefined) {
                    $rootScope.customerList = [];
                }
                $rootScope.customerCount = res.member.count;
                for (var i = 0; i < res.member.list.length; i++) {
                    $rootScope.customerList.push(res.member.list[i]);
                }
            } else {
                $helper.toast(res.msg, 'short', 'bottom');
            }
            if (mode == 'refresh') {
                $rootScope.$broadcast('scroll.refreshComplete');
            }
            if (mode == 'more') {
                $rootScope.$broadcast('scroll.infiniteScrollComplete');
            }
        }).catch(function(err) {
            $helper.toast(err, 'long', 'bottom');
            if (mode == 'refresh') {
                $rootScope.$broadcast('scroll.refreshComplete');
            }
            if (mode == 'more') {
                $rootScope.$broadcast('scroll.infiniteScrollComplete');
            }
        });

    };

    $rootScope.loadMenuCustomerList = function(mode, keyword) {
        console.log('load customer list!!!' + mode + ',' + keyword);
        if (mode != 'more' || $rootScope.menuCustomerList == undefined) {
            $scope.menuCustomerLimitFrom = 0;
            $scope.menuCustomerLimit = 20;
            $scope.rootScope = 0;
        } else {
            $scope.menuCustomerLimitFrom += 20;
        }

        $api.getMemberList({
            token: $localStorage.get('settings').token,
            locale: $localStorage.get('settings').locale,
            keyword: keyword != undefined ? keyword : null,
            limit_from: $scope.menuCustomerLimitFrom,
            limit: $scope.menuCustomerLimit
        }).then(function(res) {
            if (res.status == 'Y') {
                if (mode != 'more' || $rootScope.menuCustomerList == undefined) {
                    $rootScope.menuCustomerList = [];
                }
                $rootScope.menuCustomerCount = res.member.count;
                for (var i = 0; i < res.member.list.length; i++) {
                    $rootScope.menuCustomerList.push(res.member.list[i]);
                }
            } else {
                $helper.toast(res.msg, 'short', 'bottom');
            }
            if (mode == 'refresh') {
                $rootScope.$broadcast('scroll.refreshComplete');
            }
            if (mode == 'more') {
                $rootScope.$broadcast('scroll.infiniteScrollComplete');
            }
        }).catch(function(err) {
            $helper.toast(err, 'long', 'bottom');
            if (mode == 'refresh') {
                $rootScope.$broadcast('scroll.refreshComplete');
            }
            if (mode == 'more') {
                $rootScope.$broadcast('scroll.infiniteScrollComplete');
            }
        });

    };

    $rootScope.loadcartList = function(mode) {
        $scope.cartLimit = 20;
        $rootScope.cartCount = 0;
        $rootScope.cartList = [];
        if (mode != 'more' || $rootScope.cartList == undefined) {
            $scope.cartLimitFrom = 0;
        } else {
            $scope.cartLimitFrom += 20;
        }
        $scope.customerID = 1;
        $scope.customerID = $localStorage.get('memberProfile');
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
                $rootScope.cartCount = res.data.count;
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
            if (mode == 'refresh') {
                $scope.$broadcast('scroll.refreshComplete');
            }
            if (mode == 'more') {
                $scope.$broadcast('scroll.infiniteScrollComplete');
            }
        });
    };

    var loadCustomerDetail = function(mode) {

        if (mode != 'more' || $rootScope.cartList == undefined) {
            $scope.cartLimitFrom = 0;
            $scope.cartLimit = 20;
            $rootScope.cartCount = 0;
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
                $scope.customerDetail = res.data;
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
                        $rootScope.cartCount = res.data.count;
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
                    if (mode == 'refresh') {
                        $scope.$broadcast('scroll.refreshComplete');
                    }
                    if (mode == 'more') {
                        $scope.$broadcast('scroll.infiniteScrollComplete');
                    }
                });
            } else {
                $helper.toast(res.msg, 'short', 'bottom');
            }
        }).catch(function(err) {
            $helper.toast(err, 'long', 'bottom');
        });
    };

    $rootScope.loadPickUpList = function(mode, keyword) {
        if (mode != 'more' || $scope.pickUpList == undefined) {
            $scope.pickUpLimitFrom = 0;
            $scope.pickUpLimit = 20;
            $rootScope.pickUpCount = 0;
        } else {
            $scope.pickUpLimitFrom += 20;
        }

        $scope.status = 2;
        $api.getInvoiceList({
            token: $localStorage.get('settings').token,
            locale: $localStorage.get('settings').locale,
            keyword: keyword != undefined ? keyword : null,
            limit_from: $scope.pickUpLimitFrom,
            limit: $scope.pickUpLimit,
            status: $scope.status,
            pick_up_warehouse_id: $localStorage.get('user').warehouse_id
        }).then(function(res) {
            if (res.status == 'Y') {
                if (mode != 'more' || $rootScope.pickUpList == undefined) {
                    $rootScope.pickUpList = [];
                }
                $rootScope.pickUpCount = res.data.count;
                for (var i = 0; i < res.data.list.length; i++) {
                    $rootScope.pickUpList.push(res.data.list[i]);
                }
            } else {
                $helper.toast(res.msg, 'short', 'bottom');
            }
            if (mode == 'refresh') {
                $rootScope.$broadcast('scroll.refreshComplete');
            }
            if (mode == 'more') {
                $rootScope.$broadcast('scroll.infiniteScrollComplete');
            }
        }).catch(function(err) {
            $helper.toast(err, 'long', 'bottom');
            if (mode == 'refresh') {
                $rootScope.$broadcast('scroll.refreshComplete');
            }
            if (mode == 'more') {
                $rootScope.$broadcast('scroll.infiniteScrollComplete');
            }
        });

    };

    $rootScope.loadOrderHistory = function(mode, keyword) {
        console.log('mode: ' + mode + ' ,keyword : ' + keyword);
        if (mode != 'more' || $rootScope.orderHistoryList == undefined) {
            $scope.invoiceLimitFrom = 0;
            $scope.invoiceLimit = 20;
            $rootScope.invoiceCount = 0;
        } else {
            $scope.invoiceLimitFrom += 20;
        }
        $scope.status = [2, 3, 4, 5];
        $api.getInvoiceList({
            token: $localStorage.get('settings').token,
            locale: $localStorage.get('settings').locale,
            keyword: keyword != undefined ? keyword : null,
            limit_from: $scope.invoiceLimitFrom,
            limit: $scope.invoiceLimit,
            // warehouse_id: $localStorage.get('user').warehouse_id,
            status: $scope.status
        }).then(function(res) {
            if (res.status == 'Y') {
                if (mode != 'more' || $rootScope.orderHistoryList == undefined) {
                    $rootScope.orderHistoryList = [];
                }
                $rootScope.invoiceCount = res.data.count;
                for (var i = 0; i < res.data.list.length; i++) {
                    $rootScope.orderHistoryList.push(res.data.list[i]);
                }
            } else {
                $helper.toast(res.msg, 'short', 'bottom');
            }
            if (mode == 'refresh') {
                $rootScope.$broadcast('scroll.refreshComplete');
            }
            if (mode == 'more') {
                $rootScope.$broadcast('scroll.infiniteScrollComplete');
            }
        }).catch(function(err) {
            $helper.toast(err, 'long', 'bottom');
            if (mode == 'refresh') {
                $rootScope.$broadcast('scroll.refreshComplete');
            }
            if (mode == 'more') {
                $rootScope.$broadcast('scroll.infiniteScrollComplete');
            }
        });

    };

    // load invoice detail
    $rootScope.loadInvoiceDetail = function(ionvice) {

        $rootScope.printInvoiceId = ionvice.id;
        $rootScope.pdfUrl = ionvice.pdf;
        if ($rootScope.platform == 'web') {
            $rootScope.pdfUrl = $sce.trustAsResourceUrl(ionvice.pdf);
        }
        console.log($scope.pdfUrl);
        $rootScope.viewInvoiceC = {
            mode: 'orderHistory',
            back: function() {
                $scope.processCheckoutModal.hide();
                $scope.processCheckoutModal.remove();
            }
        };
        $ionicModal.fromTemplateUrl('templates/modal.view-invoice.html', {
            scope: $rootScope,
            animation: 'slide-in-up'
        }).then(function(modal) {
            $scope.processCheckoutModal = modal;
            modal.show();
        });

    };

    // print invoice
    $rootScope.printHistory = function() {

        if ($rootScope.platform == 'web') {
            window.open($scope.pdfUrl, '_system', 'location=yes');
        } else {
            $api.epsonPrint($rootScope.printInvoiceId);
        }
    };

    // $rootScope.loadInvoiceList = function(mode, keyword) {
    //     console.log('invoice list mode: '+mode + 'keyword : '+keyword);
    //     if (mode != 'more' || $scope.orderHistory == undefined) {
    //         $scope.invoiceLimitFrom = 0;
    //         $scope.invoiceLimit = 20;
    //         $rootScope.invoiceCount = 0;
    //         $rootScope.orderHistory = [];
    //     } else {
    //         $scope.invoiceLimitFrom += 20;
    //     }
    //     $scope.status = [2, 3, 4, 5];
    //     $api.getInvoiceList({
    //         token: $localStorage.get('settings').token,
    //         locale: $localStorage.get('settings').locale,
    //         keyword: keyword != undefined ? keyword : null,
    //         limit_from: $scope.invoiceLimitFrom,
    //         limit: $scope.invoiceLimit,
    //         // warehouse_id: $localStorage.get('user').warehouse_id,
    //         status: $scope.status
    //     }).then(function(res) {
    //         if (res.status == 'Y') {
    //             $rootScope.invoiceCount = res.data.count;
    //             for (var i = 0; i < res.data.list.length; i++) {
    //                 $scope.orderHistory.push(res.data.list[i]);
    //             }
    //         } else {
    //             $helper.toast(res.msg, 'short', 'bottom');
    //         }
    //         if (mode == 'refresh') {
    //             $scope.$broadcast('scroll.refreshComplete');
    //         }
    //         if (mode == 'more') {
    //             $scope.$broadcast('scroll.infiniteScrollComplete');
    //         }
    //     }).catch(function(err) {
    //         $helper.toast(err, 'long', 'bottom');
    //         if (mode == 'refresh') {
    //             $scope.$broadcast('scroll.refreshComplete');
    //         }
    //         if (mode == 'more') {
    //             $scope.$broadcast('scroll.infiniteScrollComplete');
    //         }
    //     });

    // };    


    $rootScope.dineIn = function() {
        console.log('....');
        $rootScope.isDineIn = !$rootScope.isDineIn;
    };


    $scope.$on('$ionicView.loaded', function() {
        $rootScope.isDineIn = true;
    });
    $scope.$on('$ionicView.enter', function() {
        // $timeout($scope.init,1000);
        $scope.init();

    });


});
