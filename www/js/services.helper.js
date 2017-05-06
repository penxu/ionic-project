angular.module('services.helper', ['ionic', 'ngCordova'])

/**************************************************
// Helper services
**************************************************/
.factory('$helper', function($ionicLoading, $ionicPopup, $rootScope, $localStorage, $cordovaFileTransfer, $cordovaPrinter, $cordovaToast, $state, $ionicHistory, $ionicModal, $cordovaBarcodeScanner, $ionicSlideBoxDelegate, $ionicScrollDelegate, $q, $cordovaNetwork, $filter, $cordovaFile) {

    // initialize $helper config
    var helper = {};

    /**************************************************
    // convert Date() to dd-mm-YYYY string
    **************************************************/
    helper.toDateString = function(date) {

        return helper.pad(date.getDate(), 2) + '-' + helper.pad(date.getMonth() + 1, 2) + '-' + date.getFullYear();

    };

    /**************************************************
    // convert Date() to dd-mm-YYYY H:i string
    **************************************************/
    helper.toDateTimeString = function(date) {

        return helper.pad(date.getDate(), 2) + '-' + helper.pad(date.getMonth() + 1, 2) + '-' + date.getFullYear() + ' ' + helper.pad(date.getHours(), 2) + ':' + helper.pad(date.getMinutes(), 2);

    };

    /**************************************************
    // pad string
    **************************************************/
    helper.pad = function(n, width, z) {

        z = z || '0';
        n = n + '';
        return n.length >= width ? n : new Array(width - n.length + 1).join(z) + n;

    };

    /**************************************************
    // toast
    **************************************************/
    helper.toast = function(messsage, duration, location) {

        if (!ionic.Platform.isWebView()) {
            // $cordovaToast not working on web browser,
            // use $ionicLoading instead
            $ionicLoading.show({
                template: messsage,
                noBackdrop: true,
                duration: duration == 'short' ? 2000 : 5000
            });
        } else {
            $cordovaToast.show(messsage, duration, location)
                .then(function(success) {})
                .catch(function(error) {});
        }

    };

    /**************************************************
    // navigate forth
    // ref: http://plugins.telerik.com/cordova/plugin/native-page-transitions
    **************************************************/
    helper.navForth = function(view, data, animation, clearHistory) {
                console.log(view);

        if (clearHistory == true) {
            $ionicHistory.clearHistory();
            $ionicHistory.nextViewOptions({ disableBack: true });
        }

        $state.go(view, data);
        if (window.plugins != undefined) {
            switch (animation) {
                // Fade - iOS and Android only
                case 'fade':
                    window.plugins.nativepagetransitions.fade({
                            'duration': 400, // in milliseconds (ms), default 400
                            'iosdelay': 60, // ms to wait for the iOS webview to update before animation kicks in, default 60
                            'androiddelay': 70 // same as above but for Android, default 70
                        },
                        function(msg) {
                            // called when the animation has finished
                        },
                        function(msg) {
                            // called in case you pass in weird values
                            helper.toast(msg, 'long', 'bottom');
                        });
                    break;

                    // Fade - iOS and Android only
                case 'slide-bottom-up':
                    window.plugins.nativepagetransitions.slide({
                            'direction': 'up', // 'left|right|up|down', default 'left' (which is like 'next')
                            'duration': 200, // in milliseconds (ms), default 400
                            'slowdownfactor': 1, // overlap views (higher number is more) or no overlap (1), default 4
                            'iosdelay': 60, // ms to wait for the iOS webview to update before animation kicks in, default 60
                            'androiddelay': 70, // same as above but for Android, default 70
                            'winphonedelay': 200, // same as above but for Windows Phone, default 200,
                            'fixedPixelsTop': 0, // the number of pixels of your fixed header, default 0 (iOS and Android)
                            'fixedPixelsBottom': 0 // the number of pixels of your fixed footer (f.i. a tab bar), default 0 (iOS and Android)
                        },
                        function(msg) {
                            // called when the animation has finished
                        },
                        function(msg) {
                            // called in case you pass in weird values
                            helper.toast(msg, 'long', 'bottom');
                        });
                    break;

                    // Fade - iOS and Android only
                case 'slide-left-right':
                    window.plugins.nativepagetransitions.slide({
                            'direction': 'left', // 'left|right|up|down', default 'left' (which is like 'next')
                            'duration': 200, // in milliseconds (ms), default 400
                            'slowdownfactor': 1, // overlap views (higher number is more) or no overlap (1), default 4
                            'iosdelay': 60, // ms to wait for the iOS webview to update before animation kicks in, default 60
                            'androiddelay': 70, // same as above but for Android, default 70
                            'winphonedelay': 200, // same as above but for Windows Phone, default 200,
                            'fixedPixelsTop': 0, // the number of pixels of your fixed header, default 0 (iOS and Android)
                            'fixedPixelsBottom': 0 // the number of pixels of your fixed footer (f.i. a tab bar), default 0 (iOS and Android)
                        },
                        function(msg) {
                            // called when the animation has finished
                        },
                        function(msg) {
                            // called in case you pass in weird values
                            helper.toast(msg, 'long', 'bottom');
                        });
                    break;
            }
        }

    };

    /**************************************************
    // navigate back
    // ref: http://plugins.telerik.com/cordova/plugin/native-page-transitions
    **************************************************/
    helper.navBack = function(backCount, animation) {

        $ionicHistory.goBack(backCount);
        if (window.plugins != undefined) {
            switch (animation) {
                // Fade - iOS and Android only
                case 'slide-bottom-up':
                    window.plugins.nativepagetransitions.slide({
                            'direction': 'up', // 'left|right|up|down', default 'left' (which is like 'next')
                            'duration': 200, // in milliseconds (ms), default 400
                            'slowdownfactor': 1, // overlap views (higher number is more) or no overlap (1), default 4
                            'iosdelay': 60, // ms to wait for the iOS webview to update before animation kicks in, default 60
                            'androiddelay': 70, // same as above but for Android, default 70
                            'winphonedelay': 200, // same as above but for Windows Phone, default 200,
                            'fixedPixelsTop': 0, // the number of pixels of your fixed header, default 0 (iOS and Android)
                            'fixedPixelsBottom': 0 // the number of pixels of your fixed footer (f.i. a tab bar), default 0 (iOS and Android)
                        },
                        function(msg) {
                            // called when the animation has finished
                        },
                        function(msg) {
                            // called in case you pass in weird values
                            helper.toast(msg, 'long', 'bottom');
                        });
                    break;

                    // Fade - iOS and Android only
                case 'slide-left-right':
                    window.plugins.nativepagetransitions.slide({
                            'direction': 'right', // 'left|right|up|down', default 'left' (which is like 'next')
                            'duration': 200, // in milliseconds (ms), default 400
                            'slowdownfactor': 1, // overlap views (higher number is more) or no overlap (1), default 4
                            'iosdelay': 60, // ms to wait for the iOS webview to update before animation kicks in, default 60
                            'androiddelay': 70, // same as above but for Android, default 70
                            'winphonedelay': 200, // same as above but for Windows Phone, default 200,
                            'fixedPixelsTop': 0, // the number of pixels of your fixed header, default 0 (iOS and Android)
                            'fixedPixelsBottom': 0 // the number of pixels of your fixed footer (f.i. a tab bar), default 0 (iOS and Android)
                        },
                        function(msg) {
                            // called when the animation has finished
                        },
                        function(msg) {
                            // called in case you pass in weird values
                            helper.toast(msg, 'long', 'bottom');
                        });
                    break;
            }
        }

    };

    /**************************************************
    // picker
    // custom picker to work with ionic modal
    **************************************************/
    helper.picker = function(config) {

        // bind the options, confirm and cancel callback
        config.scope.pickerConfig = config;

        // function for check if multiple allowed
        config.scope.pickerConfig.checkMultiple = function(option) {
            console.log('picker config : ');
            console.log(config);
            if (!config.multiple) {
                angular.forEach(config.scope.pickerConfig.options, function(obj) {
                    obj.checked = obj.value === option.value;
                });
                config.scope.pickerConfig.confirmClick();
            }
            
        };

        // function when confirm button is clicked
        config.scope.pickerConfig.confirmClick = function() {
            var selectedObjs = [];
            angular.forEach(config.scope.pickerConfig.options, function(obj) {
                if (obj.checked) {
                    selectedObjs.push(obj);
                }
            });
            config.scope.picker.hide();
            config.scope.picker.remove();
            if (config.confirmCallback != undefined) {
                config.confirmCallback(selectedObjs, config.custParams);
            }
        };

        // function when cancel button is clicked
        config.scope.pickerConfig.cancelClick = function() {
            config.scope.picker.hide();
            config.scope.picker.remove();
            if (config.cancelCallback != undefined) {
                config.cancelCallback();
            }
        };

        // initialize $ionicModal for the picker
        $ionicModal.fromTemplateUrl(config.template == undefined ? 'templates/common.picker.html' : config.template, {
            scope: config.scope,
            animation: config.animation == undefined ? 'slide-in-up' : config.animation
        }).then(function(modal) {
            config.scope.picker = modal;
            config.scope.picker.show();
        });
    };

    /**************************************************
    // countrycode picker
    // custom picker to work with ionic modal
    **************************************************/
    helper.countryCodePick = function(config) {
        // bind the options, confirm and cancel callback
        config.scope.pickerConfig = config;
        // function for check if multiple allowed
        config.scope.pickerConfig.checkMultiple = function(option) {
            if (!config.multiple) {
                angular.forEach(config.scope.pickerConfig.options, function(obj) {
                    obj.checked = obj.value === option.value;
                });
            }
            config.scope.pickerConfig.confirmClick();
        };

        // function when confirm button is clicked
        config.scope.pickerConfig.confirmClick = function() {
            var selectedObjs = [];
            angular.forEach(config.scope.pickerConfig.options, function(obj) {
                if (obj.checked) {
                    selectedObjs.push(obj);
                }
            });
            config.scope.picker.hide();
            config.scope.picker.remove();
            if (config.confirmCallback != undefined) {
                config.confirmCallback(selectedObjs, config.custParams);
            }
        };

        config.scope.pickerConfig.loadMore = function() {
            if (config.loadMoreFunc != undefined) {
                config.scope.countryOptions = $rootScope.countryCodeList.slice(0, config.scope.countryOptions.length + 10);
                config.scope.pickerConfig.options = config.scope.countryOptions;
                config.loadMoreFunc();
            }
        };

        // function when cancel button is clicked
        config.scope.pickerConfig.cancelClick = function() {
            config.scope.picker.hide();
            config.scope.picker.remove();
            if (config.cancelCallback != undefined) {
                config.cancelCallback();
            }
        };

        // initialize $ionicModal for the picker
        $ionicModal.fromTemplateUrl(config.template == undefined ? 'templates/common.country-code-picker.html' : config.template, {
            scope: config.scope,
            animation: config.animation == undefined ? 'slide-in-up' : config.animation
        }).then(function(modal) {
            config.scope.picker = modal;
            config.scope.picker.show();
        });
    };



    /**************************************************
    // gallery
    // custom gallery to work with ionic modal
    **************************************************/
    helper.gallery = function(config) {

        // bind the options
        config.scope.galleryConfig = config;

        // close gallery modal
        config.scope.galleryConfig.closeGallery = function() {
            config.scope.gallery.hide();
            config.scope.gallery.remove();
        };

        // update slide status
        config.scope.galleryConfig.updateSlideStatus = function(slide) {
            var zoomFactor = $ionicScrollDelegate.$getByHandle('scrollHandle' + slide).getScrollPosition().zoom;
            if (zoomFactor == config.scope.galleryConfig.zoomMin) {
                $ionicSlideBoxDelegate.enableSlide(true);
            } else {
                $ionicSlideBoxDelegate.enableSlide(false);
            }
        };

        // initialize $ionicModal for the gallery
        console.log(config.scope.galleryConfig.photos);
        $ionicModal.fromTemplateUrl(config.template == undefined ? 'templates/common.gallery.html' : config.template, {
            scope: config.scope,
            animation: config.animation == undefined ? 'slide-in-up' : config.animation
        }).then(function(modal) {
            config.scope.gallery = modal;
            config.scope.gallery.show();
        });
    };

    /**************************************************
    // get picture from camera
    // ref: https://github.com/apache/cordova-plugin-camera
    **************************************************/
    helper.getPicture = function(sourceType) {

        var defer = $q.defer();

        navigator.camera.getPicture(
            // upload success from camera / photo album
            function(image) {
                defer.resolve(image);
            },
            // upload error from camera / photo album
            function(err) {
                defer.reject(err);
            },
            // camera options
            {
                quality: 20,
                destinationType: Camera.DestinationType.FILE_URI,
                sourceType: sourceType, // 0 = Photo Library, 1 = Camera, 2 = Saved Photo Album
                encodingType: 0, // 0 = JPG, 1 = PNG
                MediaType: 0, // 0 = PICTURE, 1 = VIDEO, 2 = ALLMEDIA
                correctOrientation: true,
                saveToPhotoAlbum: sourceType == 1 //true
            }
        );

        return defer.promise;
    };

    /**************************************************
    // tool box
    // show tool box modal
    **************************************************/
    helper.toolBox = function(action, scope, toolBoxId) {

        if (action == 'hide') {
            scope.toolBox.hide();
            scope.toolBox.remove();
        }

        if (action == 'show') {
            $ionicModal.fromTemplateUrl(toolBoxId, {
                scope: scope,
                animation: 'slide-in-up'
            }).then(function(modal) {
                scope.toolBox = modal;
                scope.toolBox.show();
            });
        }
    };

    /**************************************************
    // scanner 
    // scan 
    **************************************************/
    helper.scan = function(afterScan) {
        document.addEventListener("deviceready", function() {
            $cordovaBarcodeScanner
                .scan()
                .then(function(barcodeData) {
                    // Success! Barcode data is here
                    afterScan(barcodeData);
                }, function(error) {
                    // An error occurred
                    helper.toast(error, 'long', 'bottom');
                },
                {
                    "preferFrontCamera" : true, // iOS and Android
                    "showFlipCameraButton" : true, // iOS and Android
                    "prompt" : "Place a barcode inside the scan area", // supported on Android only
                    "formats" : "QR_CODE,PDF_417", // default: all but PDF_417 and RSS_EXPANDED
                    "orientation" : "landscape" // Android only (portrait|landscape), default unset so it rotates with the device
                });
        }, false);

    };

    helper.print = function(pdfUrl) {
        /*if ($cordovaPrinter.isAvailable()) {
            console.log('pdf : ' + pdfUrl);
            $cordovaPrinter.print(pdfUrl);
        } else {
            alert("Printing is not available on device");
        }*/

        if ($cordovaPrinter.isAvailable()) {
            $ionicLoading.show({
                template: '<ion-spinner icon="lines"></ion-spinner>',
                noBackdrop: true
            });
            if ($rootScope.platform == 'android') {

                var url = decodeURIComponent(pdfUrl);
                var targetPath = cordova.file.externalRootDirectory + "me.posify.pos.pad/download/checkout-invoice.pdf";
                var trustHosts = true;
                var options = {};

                console.log("Remote PDF path:" + url);
                console.log("Local PDF path:" + targetPath);
                console.log(cordova.file.externalRootDirectory);
                console.log(cordova.file.applicationStorageDirectory);

                $cordovaFileTransfer.download(url, targetPath, options, trustHosts)
                    .then(function(result) {
                        $ionicLoading.hide();
                        console.log("Print PDF path:" + result.nativeURL);

                        document.addEventListener("deviceready", function() {

                            window.plugins.PrintPDF.print({
                                data: result.nativeURL,
                                type: 'File',
                                title: 'CheckOut Invoice',
                                success: function() {
                                    console.log('Print Preview success');
                                },
                                error: function(data) {
                                    data = JSON.parse(data);
                                    console.log('Print failed: ' + data.error);
                                }
                            });

                        }, false);
                        // Success!
                    }, function(err) {
                        $ionicLoading.hide();
                        // Error
                        console.log(err);
                    }, function (progress) {
                        $timeout(function () {
                        $scope.downloadProgress = (progress.loaded / progress.total) * 100;
                        });
                    });

                // $cordovaFileTransfer.download(url, targetPath, options, trustHosts)
                //     .then(function(result) {
                //         $ionicLoading.hide();
                //         console.log("Print PDF path:" + result.nativeURL);

                //         document.addEventListener("deviceready", function() {

                //             window.plugins.PrintPDF.print({
                //                 data: result.nativeURL,
                //                 type: 'File',
                //                 title: 'CheckOut Invoice',
                //                 success: function() {
                //                     console.log('Print Preview success');
                //                 },
                //                 error: function(data) {
                //                     data = JSON.parse(data);
                //                     console.log('Print failed: ' + data.error);
                //                 }
                //             });

                //         }, false);
                //         // Success!
                //     }, function(err) {
                //         $ionicLoading.hide();
                //         // Error
                //         console.log(err);
                //     });
            } else {
                $ionicLoading.hide();
                $cordovaPrinter.print(pdfUrl);
            }

        } else {
            alert("Printing is not available on device");

        }
    };




    //pop up confirm
    helper.popConfirm = function(title, content, callBackFunc) {
        $ionicPopup.confirm({
            title: title,
            template: content
        }).then(function(res) {
            callBackFunc(res);
        });
    };


    /**************************************************
    // ionicLoading fucntion
    **************************************************/
    helper.showLoading = function(dura) {
        var time = dura;
        if (time == undefined) {
            time = 10000;
        }
        $ionicLoading.show({ duration: time }).then(function(){
            // helper.toast($filter('translate')('UNSTEADY_NETWORK'));
        });
    };

    helper.hideLoading = function() {
        $ionicLoading.hide();
    };

    /**************************************************
    // detect online info
    **************************************************/

    var afterWatch = function(type) {
        console.log('detect ' + type);
        if(!$localStorage.get('user').isLogin){
            return;
        }
        if (type == 'online') {
            $rootScope.networkStatus = true;
            if (!$rootScope.isOffline) {
                helper.popConfirm($filter('translate')('REMIND'), $filter('translate')('ONLINE_ASK'), function(res) {
                    if (res) {
                        $rootScope.networkResult = !$rootScope.isOffline && $rootScope.networkStatus; 
                        $rootScope.currentInvoiceId = null;               
                        if($localStorage.get('user').isLogin){
                            helper.navForth('tab.home', null, 'slide-left-right');
                        }                                
                    }
                });
            }
        } else if (type == 'offline') {
            $rootScope.networkStatus = false;
            if (!$rootScope.isOffline) {
                helper.toast($filter('translate')('OFFLINE_ASK'), 'short', 'top');
            }
            $rootScope.networkResult = !$rootScope.isOffline && $rootScope.networkStatus;  
            $rootScope.currentInvoiceId = null;          
            helper.navForth('tab.home', null, 'slide-left-right');  
        }
        
    };

    helper.watchNetwork = function() {
        $rootScope.networkStatus = navigator.onLine;
        console.log($rootScope.networkStatus);
        if ($rootScope.platform == 'ios' || $rootScope.platform == 'android' || $rootScope.platform == 'window') {
            console.log('is device');
            $rootScope.$on('$cordovaNetwork:online', function(event, networkState) {
                afterWatch('online');
            });
            $rootScope.$on('$cordovaNetwork:offline', function(event, networkState) {
                afterWatch('offline');
            });
        } else {
            console.log('is web');
            window.addEventListener("online", function() {
                afterWatch('online');
            }, false);
            window.addEventListener("offline", function() {
                afterWatch('offline');
            }, false);
        }
    };

    helper.getRootPath = function() {
        var targetPath;
        console.log('into store , platform is : ' + $rootScope.platform);
        if ($rootScope.platform == 'ios') {
            targetPath = cordova.file.documentsDirectory;
        } else if ($rootScope.platform == 'android') {
            targetPath = cordova.file.externalRootDirectory;
        } else if ($rootScope.platform == 'window') {
            targetPath = cordova.file.externalRootDirectory + 'localState/';
        } else {
            helper.toast('do not support the operatting system', 'short', 'top');
            return '';
        }
        return targetPath;
    };

    
    helper.clearCache = function(path) {
        var secondPath = 'product-media/';
        var filePath = path;
        if(filePath==null){
            filePath = helper.getRootPath + secondPath;
        }
        $cordovaFile.removeFile(filePath)
            .then(function(result) {
                alert("delete file success");
            }, function(err) {
                alert(JSON.stringify(err));
            });
    };

    helper.checkUndefined = function(dataDic) {
        Object.keys(dataDic).map(function(objectKey, index) {
            var value = dataDic[objectKey];
            if (typeof value == "undefined") {
                dataDic[objectKey] = '';
            }
        });
    };      

    helper.judgeUpdate = function(newStamp){
        var oldUpdateTime = $localStorage.get('update_time') != null ? $localStorage.get('update_time') : '';
        $rootScope.newUpdateTime = newStamp;
        if(oldUpdateTime != $rootScope.newUpdateTime){
            $rootScope.downloadData('UPDATE_DOWNLOAD_ASK');
        }
        console.log('old stamp: '+ oldUpdateTime + ' , new stamp: ' + $rootScope.newUpdateTime);
    };
    /**************************************************
    // Return service
    **************************************************/
    return helper;

});
