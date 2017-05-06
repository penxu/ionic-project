angular.module('services.api', ['services.localstorage', 'ngFileUpload', 'services.helper', 'services.offline'])

/**************************************************
// Get access token
**************************************************/
.factory('$api', function($q, $http, $localStorage, SERVER, Upload,$ionicLoading, $helper, $rootScope, $offline, $filter, $timeout, $translate) {


    var afterSuccess = function(res){
        if(res.status=='E' && res.msg==$filter('translate')('ACCESS_DENINED')){
            $rootScope.logout();           
        }
    };

    // initialize $api config
    var api = {
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
        },
        timeout: 10000,
        long_timeout:20000
    };

    /**************************************************
    // api/auth
    **************************************************/
    api.auth = function() {

        var defer = $q.defer();

        $http.post(SERVER.http + $localStorage.get('activate').prefix + $localStorage.get('activate').path + SERVER.subdomain + SERVER.apiPath + 'api/auth', api.serialize({
            locale: $localStorage.get('settings').locale,
            app_id: $localStorage.get('activate').passcode
        }), { timeout: defer.promise }).success(function(data) {
            try {
                var res = angular.fromJson(data);
                if (res.status == 'Y') {
                    defer.resolve(res);
                } else {
                    defer.reject(res.msg);
                }
            } catch (err) {
                defer.reject(err);
            }
        }).error(function(err) {
            defer.reject(err);
        });
        $timeout(function() {
            defer.reject($translate.instant('TIME_OUT')); // this aborts the request!
        }, api.long_timeout);         


        return defer.promise;

    };


    /**************************************************
    // api/activate
    **************************************************/
    api.activation = function(params) {
        $helper.showLoading();
        var defer = $q.defer();

        $http.post(SERVER.http + $localStorage.get('activate').path + SERVER.subdomain + SERVER.apiPath + 'api/activation', api.serialize(params), { timeout: defer.promise }).success(function(data) {
            try {
                defer.resolve(angular.fromJson(data));
            } catch (err) {
                defer.reject(err);
            }
            $helper.hideLoading();
        }).error(function(err) {
            defer.reject(err);
            $helper.hideLoading();
        });
        
        $timeout(function() {
            defer.reject($translate.instant('TIME_OUT')); // this aborts the request!
            $helper.hideLoading();
        }, api.timeout);        

        return defer.promise;

    };
    /**************************************************
    // api/login
    **************************************************/
    api.login = function(params) {
        var defer = $q.defer();

        $http.post(SERVER.http + $localStorage.get('activate').prefix + $localStorage.get('activate').path + SERVER.subdomain + SERVER.apiPath + 'api/login', api.serialize(params), { timeout: defer.promise }).success(function(data) {
            try {
                defer.resolve(angular.fromJson(data));
            } catch (err) {
                defer.reject(err);
            }
            afterSuccess(angular.fromJson(data));
        }).error(function(err) {
            defer.reject(err);
        });

        $timeout(function() {
            defer.reject($translate.instant('TIME_OUT')); // this aborts the request!
        }, api.long_timeout);          

        return defer.promise;

    };

    /**************************************************
    // api/get-option
    **************************************************/
    api.getOption = function(params) {

        var defer = $q.defer();

        $http.post(SERVER.http + $localStorage.get('activate').prefix + $localStorage.get('activate').path + SERVER.subdomain + SERVER.apiPath + 'api/get-option', api.serialize(params), { timeout: defer.promise }).success(function(data) {
            try {
                defer.resolve(angular.fromJson(data));
            } catch (err) {
                defer.reject(err);
            }
            afterSuccess(angular.fromJson(data));
        }).error(function(err) {
            defer.reject(err);
        });

        return defer.promise;

    };

    /**************************************************
    // api/data-uri-to-blob
    **************************************************/
    api.dataURItoBlob = function(dataURI, callback) {
        // convert base64 to raw binary data held in a string
        // doesn't handle URLEncoded DataURIs - see SO answer #6850276 for code that does this
        var byteString = atob(dataURI.split(',')[1]);

        // separate out the mime component
        var mimeString = dataURI.split(',')[0].split(':')[1].split(';')[0]

        // write the bytes of the string to an ArrayBuffer
        var ab = new ArrayBuffer(byteString.length);
        var ia = new Uint8Array(ab);
        for (var i = 0; i < byteString.length; i++) {
            ia[i] = byteString.charCodeAt(i);
        }

        // write the ArrayBuffer to a blob, and you're done
        var bb = new Blob([ab]);
        return bb;
    }


    /**************************************************
    // api/upload-media
    **************************************************/
    api.uploadMedia = function(image, params, onSuccess, onError) {

        //     var png;
        //     fetch(image)
        //     .then(res => res.blob())
        //     .then(blob => {
        //       var fd = new FormData();
        //       fd.append('file', blob, 'file');
        //       fd.append('token',params.token);
        //       fd.append('locale',params.locale);
        //       fd.append('invoice_id',params.invoice_id);
        //       fd.append('type',params.type);
        //       fd.append('sign_type',params.sign_type);
        //       var ans = fetch(SERVER.http + $localStorage.get('activate').prefix + $localStorage.get('activate').path + SERVER.subdomain + SERVER.apiPath + 'api/upload-media', {method: 'POST', body: fd});
        //       console.log(ans);
        //
        //     });

        console.log(image);
        console.log(params);
        var imgData = JSON.stringify(image.replace(/^data:image\/(png|jpg);base64,/, ''));
        Upload.upload({
            url: SERVER.http + $localStorage.get('activate').prefix + $localStorage.get('activate').path + SERVER.subdomain + SERVER.apiPath + 'api/upload-media',
            data: { file: api.dataURItoBlob(image), 'token': params.token, 'locale': params.locale, 'invoice_id': params.invoice_id, 'type': params.type, 'sign_type': params.sign_type }
        }).then(function(resp) {
            console.log(resp);

        }, function(resp) {
            console.log('Error status: ' + resp.status);
        }, function(evt) {
            var progressPercentage = parseInt(100.0 * evt.loaded / evt.total);
        });


        //phone
        // 		console.log('cp1');
        // 		console.log(FileUploadOptions);
        // 		var options = new FileUploadOptions();
        // 		console.log('cp2');
        // 		options.fileKey = 'file';
        // 		options.fileName = 'temp.jpg';
        // 		options.params = params;
        //
        // 		var ft = new FileTransfer();
        // 		ft.upload(image, encodeURI(SERVER.http + $localStorage.get('activate').prefix + $localStorage.get('activate').path + SERVER.subdomain + SERVER.apiPath + 'api/upload-media'), function(data) {
        // 			onSuccess(angular.fromJson(data.response));
        // 		}, onError, options);





    };

    /**************************************************
    // api/get-invoice-list-pos
    **************************************************/
    api.getInvoiceList = function(params) {
        $helper.showLoading();
        var defer = $q.defer();
        if(true){
            $http.post(SERVER.http + $localStorage.get('activate').prefix + $localStorage.get('activate').path + SERVER.subdomain + SERVER.apiPath + 'api/get-invoice-list-pos', api.serialize(params), { timeout: defer.promise }).success(function(data) {
                $helper.hideLoading();
                try {
                    defer.resolve(angular.fromJson(data));
                } catch (err) {
                    defer.reject(err);
                }
                afterSuccess(angular.fromJson(data));
            }).error(function(err) {
                $helper.hideLoading();
                defer.reject(err);
            });
        }else{
            console.log('info offline invoicelist');
            $offline.getInvoiceList(params).then(function(res) {
                defer.resolve(res);
                $helper.hideLoading();
            }).catch(function(err) {
                defer.reject(err);
                $helper.hideLoading();
            });  
        }

        $timeout(function() {
            defer.reject($translate.instant('TIME_OUT')); // this aborts the request!
            $helper.hideLoading();
        }, api.timeout); 

        return defer.promise;
    };

    /**************************************************
    // api/get-invoice-detail-pos
    **************************************************/
    api.getInvoiceDetail = function(params) {

        var defer = $q.defer();
        if(true){
            $http.post(SERVER.http + $localStorage.get('activate').prefix + $localStorage.get('activate').path + SERVER.subdomain + SERVER.apiPath + 'api/get-invoice-detail-pos', api.serialize(params), { timeout: defer.promise }).success(function(data) {
                try {
                    defer.resolve(angular.fromJson(data));
                } catch (err) {
                    defer.reject(err);
                }
                afterSuccess(angular.fromJson(data));
            }).error(function(err) {
                defer.reject(err);
            });
        }else{
            console.log('info offline invoice detial');
            $offline.getInvoiceDetail(params).then(function(res) {
                defer.resolve(res);
            }).catch(function(err) {
                defer.reject(err);
            }); 
        }

        $timeout(function() {
            defer.reject($translate.instant('TIME_OUT')); // this aborts the request!
        }, api.timeout);        

        return defer.promise;

    };

    /**************************************************
	// api/get-stock-in-record
	**************************************************/
    api.getPendingInList = function(params) {

        var defer = $q.defer();

        $http.post(SERVER.http + $localStorage.get('activate').prefix + $localStorage.get('activate').path + SERVER.subdomain + SERVER.apiPath + 'api/get-stock-in-record', api.serialize(params), { timeout: defer.promise }).success(function(data) {
            try {
                defer.resolve(angular.fromJson(data));
            } catch (err) {
                defer.reject(err);
            }
            afterSuccess(angular.fromJson(data));
        }).error(function(err) {
            defer.reject(err);
        });
        $timeout(function() {
            defer.reject($translate.instant('TIME_OUT')); // this aborts the request!
        }, api.timeout); 


        return defer.promise;

    };

    api.getPendingIn= function(params) {

        var defer = $q.defer();

        $http.post(SERVER.http + $localStorage.get('activate').prefix + $localStorage.get('activate').path + SERVER.subdomain + SERVER.apiPath + 'api/get-stock-in', api.serialize(params), { timeout: defer.promise }).success(function(data) {
            try {
                defer.resolve(angular.fromJson(data));
            } catch (err) {
                defer.reject(err);
            }
            afterSuccess(angular.fromJson(data));
        }).error(function(err) {
            defer.reject(err);
        });
        $timeout(function() {
            defer.reject($translate.instant('TIME_OUT')); // this aborts the request!
        }, api.timeout); 


        return defer.promise;

    };    

    /**************************************************
    // api/get-stock-out-record
    **************************************************/
    api.getPendingOutList = function(params) {

        var defer = $q.defer();

        $http.post(SERVER.http + $localStorage.get('activate').prefix + $localStorage.get('activate').path + SERVER.subdomain + SERVER.apiPath + 'api/get-stock-out-record', api.serialize(params)).success(function(data) {
            try {
                defer.resolve(angular.fromJson(data));
            } catch (err) {
                defer.reject(err);
            }
            afterSuccess(angular.fromJson(data));
        }).error(function(err) {
            defer.reject(err);
        });
        $timeout(function() {
            defer.reject($translate.instant('TIME_OUT')); // this aborts the request!
        }, api.timeout);         

        return defer.promise;

    };

    /**************************************************
    // api/get-invoice-pdf
    **************************************************/
    api.getInvoicePdf = function(params) {

        return SERVER.domain + 'backend/web/index.php?r=order/invoice-pdf&' + api.serialize(params);

    };

    /**************************************************
    // api/get-category
    **************************************************/
    api.getCategory = function(params) {
        $helper.showLoading();
        var defer = $q.defer();
        if($rootScope.networkResult){
            console.log('online category');
            $http.post(SERVER.http + $localStorage.get('activate').prefix + $localStorage.get('activate').path + SERVER.subdomain + SERVER.apiPath + 'api/get-category', api.serialize(params), { timeout: defer.promise }).success(function(data) {                
                try {
                    defer.resolve(angular.fromJson(data));
                } catch (err) {
                    defer.reject(err);
                }
                $helper.hideLoading();
                afterSuccess(angular.fromJson(data));
            }).error(function(err) {
                defer.reject(err);
                $helper.hideLoading();
            });
        }else{
            console.log('info offline category');
            $offline.getCategory(params).then(function(res) {
                defer.resolve(res);
                $helper.hideLoading();
            }).catch(function(err) {
                defer.reject(err);
                $helper.hideLoading();
            });            
        }     

        $timeout(function() {
            $helper.hideLoading();
            defer.reject($translate.instant('TIME_OUT')); // this aborts the request!
        }, api.timeout);          

        return defer.promise;

    };

    /**************************************************
	// api/get-member-list
	**************************************************/
    api.getMemberList = function(params) {
        $helper.showLoading();
        var defer = $q.defer();
        if(true){
            console.log('online getmemberlist');
            $http.post(SERVER.http + $localStorage.get('activate').prefix + $localStorage.get('activate').path + SERVER.subdomain + SERVER.apiPath + 'api/get-member-list', api.serialize(params), { timeout: defer.promise }).success(function(data) {
                try {
                    defer.resolve(angular.fromJson(data));
                } catch (err) {
                    defer.reject(err);
                }
                $helper.hideLoading();
                afterSuccess(angular.fromJson(data));
            }).error(function(err) {
                defer.reject(err);
            });
        }else{
            console.log('offline getmemberList');
            $offline.getMemberList(params).then(function(res) {
                defer.resolve(res);
                $helper.hideLoading();
            }).catch(function(err) {
                defer.reject(err);
                $helper.hideLoading();
            }); 
        }
        $timeout(function() {
            $helper.hideLoading();
            defer.reject($translate.instant('TIME_OUT')); // this aborts the request!
        }, api.timeout); 

        return defer.promise;

    };

    /**************************************************
	// api/get-member-profile
	**************************************************/
    api.getMemberProfile = function(params) {

        var defer = $q.defer();

        $http.post(SERVER.http + $localStorage.get('activate').prefix + $localStorage.get('activate').path + SERVER.subdomain + SERVER.apiPath + 'api/get-member-profile', api.serialize(params), { timeout: defer.promise }).success(function(data) {
            try {
                defer.resolve(angular.fromJson(data));
            } catch (err) {
                defer.reject(err);
            }
            afterSuccess(angular.fromJson(data));
        }).error(function(err) {
            defer.reject(err);
        });
        $timeout(function() {
            defer.reject($translate.instant('TIME_OUT')); // this aborts the request!
        }, api.timeout);         

        return defer.promise;

    };
    /**************************************************
    // api/get-product-list
    **************************************************/
    api.getProductList = function(params) {
        $helper.showLoading(api.long_timeout);
        var defer = $q.defer();
        if($rootScope.networkResult){
            $http.post(SERVER.http + $localStorage.get('activate').prefix + $localStorage.get('activate').path + SERVER.subdomain + SERVER.apiPath + 'api/get-product-list', api.serialize(params), { timeout: defer.promise }).success(function(data) {
                try {
                    defer.resolve(angular.fromJson(data));
                } catch (err) {
                    defer.reject(err);
                }
                $helper.hideLoading();
                afterSuccess(angular.fromJson(data));
            }).error(function(err) {
                defer.reject(err);
                $helper.hideLoading();
            });
        }else{
            console.log('offline get product list');
            $offline.getProductList(params).then(function(res) {                
                defer.resolve(res);
                $helper.hideLoading();
            }).catch(function(err) {
                defer.reject(err);
                $helper.hideLoading();
            });  
        }

        $timeout(function() {
            $helper.hideLoading();
            defer.reject($translate.instant('TIME_OUT')); // this aborts the request!
        }, api.long_timeout); 

        return defer.promise;

    };

    /**************************************************
    // api/get-product-detail
    **************************************************/
    api.getProductDetail = function(params) {
        // $helper.showLoading();
        var defer = $q.defer();
        if($rootScope.networkResult){
            $http.post(SERVER.http + $localStorage.get('activate').prefix + $localStorage.get('activate').path + SERVER.subdomain + SERVER.apiPath + 'api/get-product-detail', api.serialize(params), { timeout: defer.promise }).success(function(data) {
                try {
                    defer.resolve(angular.fromJson(data));
                } catch (err) {
                    defer.reject(err);
                }
                $helper.hideLoading();
                afterSuccess(angular.fromJson(data));
            }).error(function(err) {
                defer.reject(err);
                $helper.hideLoading();
            });
        }else{
            console.log('offline get product list');
            $offline.getProductDetail(params).then(function(res) {                
                defer.resolve(res);
                $helper.hideLoading();
            }).catch(function(err) {
                defer.reject(err);
                $helper.hideLoading();
            });  
        }        

        $timeout(function() {
            $helper.hideLoading();
            defer.reject($translate.instant('TIME_OUT')); // this aborts the request!
        }, api.timeout);         

        return defer.promise;

    };

    /**************************************************
    // api/set-cart
    **************************************************/
    api.setCart = function(params) {
        $helper.showLoading();
        var defer = $q.defer();
        if(true){
            $http.post(SERVER.http + $localStorage.get('activate').prefix + $localStorage.get('activate').path + SERVER.subdomain + SERVER.apiPath + 'api/set-cart-p-o-s', api.serialize(params), { timeout: defer.promise }).success(function(data) {
                $helper.hideLoading();
                try {
                    defer.resolve(angular.fromJson(data));
                } catch (err) {
                    defer.reject(err);
                }
                afterSuccess(angular.fromJson(data));
            }).error(function(err) {
                $helper.hideLoading();
                defer.reject(err);
            });
        }else{
            console.log('offline get product list');
            $offline.setCart(params).then(function(res) {                
                defer.resolve(res);
                $helper.hideLoading();
            }).catch(function(err) {
                defer.reject(err);
                $helper.hideLoading();
            });  
        }
        $timeout(function() {
            $helper.hideLoading();
            defer.reject($translate.instant('TIME_OUT')); // this aborts the request!
        }, api.timeout);  

        return defer.promise;

    };

    /**************************************************
    // api/new-cart
    **************************************************/
    api.newCart = function(params) {
        $helper.showLoading();
        var defer = $q.defer();
        if(true){
            $http.post(SERVER.http + $localStorage.get('activate').prefix + $localStorage.get('activate').path + SERVER.subdomain + SERVER.apiPath + 'api/new-cart', api.serialize(params), { timeout: defer.promise }).success(function(data) {                
                try {
                    defer.resolve(angular.fromJson(data));
                } catch (err) {
                    defer.reject(err);
                }
                $helper.hideLoading();
                afterSuccess(angular.fromJson(data));
            }).error(function(err) {
                $helper.hideLoading();
                defer.reject(err);
            });         
        }else{
            console.log('offline get product list');
            $offline.newCart(params).then(function(res) {                
                defer.resolve(res);
                $helper.hideLoading();
            }).catch(function(err) {
                defer.reject(err);
                $helper.hideLoading();
            });  
        }
        $timeout(function() {
            $helper.hideLoading();
            defer.reject($translate.instant('TIME_OUT')); // this aborts the request!
        }, api.timeout);          


        return defer.promise;

    };
    /**************************************************
    // api/get-stock-out-record
    **************************************************/
    api.getStockoutRecord = function(params) {

        var defer = $q.defer();

        $http.post(SERVER.http + $localStorage.get('activate').prefix + $localStorage.get('activate').path + SERVER.subdomain + SERVER.apiPath + 'api/get-stock-out-record', api.serialize(params), { timeout: defer.promise }).success(function(data) {
            try {
                defer.resolve(angular.fromJson(data));
            } catch (err) {
                defer.reject(err);
            }
            afterSuccess(angular.fromJson(data));
        }).error(function(err) {
            defer.reject(err);
        });
        $timeout(function() {
            defer.reject($translate.instant('TIME_OUT')); // this aborts the request!
        }, api.timeout);
        return defer.promise;

    };

    /**************************************************
    // api/get-stock-out-record
    **************************************************/
    api.getStockout = function(params) {

        var defer = $q.defer();

        $http.post(SERVER.http + $localStorage.get('activate').prefix + $localStorage.get('activate').path + SERVER.subdomain + SERVER.apiPath + 'api/get-stock-out', api.serialize(params), { timeout: defer.promise }).success(function(data) {
            try {
                defer.resolve(angular.fromJson(data));
            } catch (err) {
                defer.reject(err);
            }
            afterSuccess(angular.fromJson(data));
        }).error(function(err) {
            defer.reject(err);
        });
        $timeout(function() {
            defer.reject($translate.instant('TIME_OUT')); // this aborts the request!
        }, api.timeout);
        return defer.promise;

    };    

    /**************************************************
    // api/get-stock-out-record
    **************************************************/
    api.getSKUInfo = function(params) {

        var defer = $q.defer();
        if($rootScope.networkResult){
            $http.post(SERVER.http + $localStorage.get('activate').prefix + $localStorage.get('activate').path + SERVER.subdomain + SERVER.apiPath + 'api/get-sku-info', api.serialize(params), { timeout: defer.promise }).success(function(data) {
                try {
                    defer.resolve(angular.fromJson(data));
                } catch (err) {
                    defer.reject(err);
                }
                afterSuccess(angular.fromJson(data));
            }).error(function(err) {
                defer.reject(err);
            });
        }else{
            console.log('offline get product list');
            $offline.getSKUInfo(params).then(function(res) {                
                defer.resolve(res);
            }).catch(function(err) {
                defer.reject(err);
            });  
        }     
        $timeout(function() {
            defer.reject($translate.instant('TIME_OUT')); // this aborts the request!
        }, api.timeout);           

        return defer.promise;

    };
    /**************************************************
	// api/refund
	**************************************************/
    api.refund = function(params) {

        var defer = $q.defer();

        $http.post(SERVER.http + $localStorage.get('activate').prefix + $localStorage.get('activate').path + SERVER.subdomain + SERVER.apiPath + 'api/refund', api.serialize(params), { timeout: defer.promise }).success(function(data) {
            try {
                defer.resolve(angular.fromJson(data));
            } catch (err) {
                defer.reject(err);
            }
            afterSuccess(angular.fromJson(data));
        }).error(function(err) {
            defer.reject(err);
        });
        $timeout(function() {
            defer.reject($translate.instant('TIME_OUT')); // this aborts the request!
        }, api.timeout);        

        return defer.promise;

    };

    /**************************************************
	// api/confirmPickUp
	**************************************************/
    api.confirmPickUp = function(params) {

        var defer = $q.defer();

        $http.post(SERVER.http + $localStorage.get('activate').prefix + $localStorage.get('activate').path + SERVER.subdomain + SERVER.apiPath + 'api/confirm-pick-up', api.serialize(params), { timeout: defer.promise }).success(function(data) {
            try {
                defer.resolve(angular.fromJson(data));
            } catch (err) {
                defer.reject(err);
            }
            afterSuccess(angular.fromJson(data));
        }).error(function(err) {
            defer.reject(err);
        });
        $timeout(function() {
            defer.reject($translate.instant('TIME_OUT')); // this aborts the request!
        }, api.timeout);        

        return defer.promise;

    };

    /**************************************************
    // api/get-Country
    **************************************************/
    api.getCountry = function(params) {

        var defer = $q.defer();

        $http.post(SERVER.http + $localStorage.get('activate').prefix + $localStorage.get('activate').path + SERVER.subdomain + SERVER.apiPath + 'api/get-country', api.serialize(params), { timeout: defer.promise }).success(function(data) {
            try {
                defer.resolve(angular.fromJson(data));
            } catch (err) {
                defer.reject(err);
            }
            afterSuccess(angular.fromJson(data));
        }).error(function(err) {
            defer.reject(err);
        });
        $timeout(function() {
            defer.reject($translate.instant('TIME_OUT')); // this aborts the request!
        }, api.timeout);        

        return defer.promise;

    };
    /**************************************************
    // api/set-member-profile
    **************************************************/
    api.setMemberProfile = function(params) {

        var defer = $q.defer();

        $http.post(SERVER.http + $localStorage.get('activate').prefix + $localStorage.get('activate').path + SERVER.subdomain + SERVER.apiPath + 'api/set-member-profile', api.serialize(params), { timeout: defer.promise }).success(function(data) {
            try {
                defer.resolve(angular.fromJson(data));
            } catch (err) {
                defer.reject(err);
            }
            afterSuccess(angular.fromJson(data));
        }).error(function(err) {
            defer.reject(err);
        });
        $timeout(function() {
            defer.reject($translate.instant('TIME_OUT')); // this aborts the request!
        }, api.timeout);        

        return defer.promise;

    };

    /**************************************************
    // api/get-stock-out-record
    **************************************************/
    api.getCountry = function(params) {

        var defer = $q.defer();

        $http.post(SERVER.http + $localStorage.get('activate').prefix + $localStorage.get('activate').path + SERVER.subdomain + SERVER.apiPath + 'api/get-country', api.serialize(params), { timeout: defer.promise }).success(function(data) {
            try {
                defer.resolve(angular.fromJson(data));
            } catch (err) {
                defer.reject(err);
            }
            afterSuccess(angular.fromJson(data));
        }).error(function(err) {
            defer.reject(err);
        });
        $timeout(function() {
            defer.reject($translate.instant('TIME_OUT')); // this aborts the request!
        }, api.timeout);        

        return defer.promise;

    };

    /**************************************************
    // api/get-dial-code
    **************************************************/
    api.getDialCode = function(params) {

        var defer = $q.defer();

        $http.post(SERVER.http + $localStorage.get('activate').prefix + $localStorage.get('activate').path + SERVER.subdomain + SERVER.apiPath + 'api/get-dial-code', api.serialize(params), { timeout: defer.promise }).success(function(data) {
            try {
                defer.resolve(angular.fromJson(data));
            } catch (err) {
                defer.reject(err);
            }
            afterSuccess(angular.fromJson(data));
        }).error(function(err) {
            defer.reject(err);
        });
        $timeout(function() {
            defer.reject($translate.instant('TIME_OUT')); // this aborts the request!
        }, api.timeout);        

        return defer.promise;

    };


    /**************************************************
    // api/get-member
    **************************************************/
    api.newMember = function(params) {

        var defer = $q.defer();

        $http.post(SERVER.http + $localStorage.get('activate').prefix + $localStorage.get('activate').path + SERVER.subdomain + SERVER.apiPath + 'api/new-member', api.serialize(params), { timeout: defer.promise }).success(function(data) {
            try {
                defer.resolve(angular.fromJson(data));
            } catch (err) {
                defer.reject(err);
            }
            afterSuccess(angular.fromJson(data));
        }).error(function(err) {
            defer.reject(err);
        });
        $timeout(function() {
            defer.reject($translate.instant('TIME_OUT')); // this aborts the request!
        }, api.timeout);        

        return defer.promise;

    };


    /**************************************************
    // api/confirm-payment
    **************************************************/
    api.confirmPayment = function(params) {

        var defer = $q.defer();
        if(true){   
            $http.post(SERVER.http + $localStorage.get('activate').prefix + $localStorage.get('activate').path + SERVER.subdomain + SERVER.apiPath + 'api/confirm-payment', api.serialize(params), { timeout: defer.promise }).success(function(data) {
                try {
                    defer.resolve(angular.fromJson(data));
                } catch (err) {
                    defer.reject(err);
                }
                afterSuccess(angular.fromJson(data));
            }).error(function(err) {
                defer.reject(err);
            });
        }else{
            $offline.confirmPayment(params).then(function(res){
                defer.resolve(angular.fromJson(res));
            }).catch(function(err){
                defer.reject(err);
            });
        }
        $timeout(function() {
            defer.reject($translate.instant('TIME_OUT')); // this aborts the request!
        }, api.timeout);        
        return defer.promise;

    };

    /**************************************************
    // api/confirm-payment
    **************************************************/
    api.checkOut = function(params) {
        $helper.showLoading();
        var defer = $q.defer();
        if(true){        
            $http.post(SERVER.http + $localStorage.get('activate').prefix + $localStorage.get('activate').path + SERVER.subdomain + SERVER.apiPath + 'api/checkout-pos', api.serialize(params), { timeout: defer.promise }).success(function(data) {
                try {
                    defer.resolve(angular.fromJson(data));
                } catch (err) {
                    defer.reject(err);
                }
                $helper.hideLoading();
                afterSuccess(angular.fromJson(data));
            }).error(function(err) {
                defer.reject(err);
            });   
        }else{
            $offline.checkOut(params).then(function(res){
                defer.resolve(angular.fromJson(res));
                $helper.hideLoading();
            }).catch(function(err){
                defer.reject(err);
                $helper.hideLoading();
            });
        }
        $timeout(function() {
            $helper.hideLoading();
            defer.reject($translate.instant('TIME_OUT')); // this aborts the request!
        }, api.timeout);        
        return defer.promise;
    };


    api.settings = function(params) {

        var defer = $q.defer();

        $http.post(SERVER.http + $localStorage.get('activate').prefix + $localStorage.get('activate').path + SERVER.subdomain + SERVER.apiPath + 'api/settings', api.serialize(params), { timeout: defer.promise }).success(function(data) {
            try {
                defer.resolve(angular.fromJson(data));
            } catch (err) {
                defer.reject(err);
            }
            afterSuccess(angular.fromJson(data));
        }).error(function(err) {
            defer.reject(err);
        });
        $timeout(function() {
            defer.reject($translate.instant('TIME_OUT')); // this aborts the request!
        }, api.timeout);        

        return defer.promise;

    };

    /**************************************************
    // api/change-warehouse
    **************************************************/
    api.cloudPrint = function(params) {
        var defer = $q.defer();
        $http.post(SERVER.http + $localStorage.get('activate').prefix + $localStorage.get('activate').path + SERVER.subdomain + SERVER.apiPath + 'api/cloud-print', api.serialize(params)).success(function(data) {
            try {
                defer.resolve(angular.fromJson(data));
            } catch (err) {
                defer.reject(err);
            }
            afterSuccess(angular.fromJson(data));
        }).error(function(err) {
            defer.reject(err);
        });
        return defer.promise;
    };

    api.epsonPrint = function(invoice_id) {
        var defer = $q.defer();
        if(true){
            var loadUrl = SERVER.http + $localStorage.get('activate').prefix + $localStorage.get('activate').path + SERVER.subdomain + SERVER.apiPath + 'api/epson-print' + '&token=' + $localStorage.get('settings').token + '&locale=' + $localStorage.get('settings').locale + '&invoice_id=' + invoice_id + '&ipaddress=' + $localStorage.get('settings').epson_ip_address + '&port=' + $localStorage.get('settings').epson_port + '&deviceid=' + $localStorage.get('settings').epson_device_id;
            var ref = cordova.InAppBrowser.open(loadUrl, '_blank', 'location=yes');
            console.log(SERVER.http + $localStorage.get('activate').prefix + $localStorage.get('activate').path + SERVER.subdomain + SERVER.apiPath + 'api/epson-print' + '&token=' + $localStorage.get('settings').token + '&locale=' + $localStorage.get('settings').locale + '&invoice_id=' + invoice_id + '&ipaddress=' + $localStorage.get('settings').epson_ip_address + '&port=' + $localStorage.get('settings').epson_port + '&deviceid=' + $localStorage.get('settings').epson_device_id);

        }else{
            console.log('offline epsonPrint');
            
        }
    };






	/****************************************************************************************************
	// api/stock-check
	**************************************************/
	api.stockCheck = function(params) {

		var defer = $q.defer();

		$http.post(SERVER.http + $localStorage.get('activate').prefix + $localStorage.get('activate').path + SERVER.subdomain + SERVER.apiPath + 'api/stock-check', api.serialize(params), { timeout: defer.promise }).success(function(data) {
			try
			{
				defer.resolve(angular.fromJson(data));
			}
			catch (err)
			{
				defer.reject(err);
			}
		}).error(function(err) {
			defer.reject(err);
		});
        $timeout(function() {
            defer.reject($translate.instant('TIME_OUT')); // this aborts the request!
        }, api.timeout);        

		return defer.promise;

	};

	/**************************************************
	// api/stock-out
	**************************************************/
	api.stockOut = function(params) {

		var defer = $q.defer();

		$http.post(SERVER.http + $localStorage.get('activate').prefix + $localStorage.get('activate').path + SERVER.subdomain + SERVER.apiPath + 'api/stock-out', api.serialize(params), { timeout: defer.promise }).success(function(data) {
			try
			{
				defer.resolve(angular.fromJson(data));
			}
			catch (err)
			{
				defer.reject(err);
			}
		}).error(function(err) {
			defer.reject(err);
		});
        $timeout(function() {
            defer.reject($translate.instant('TIME_OUT')); // this aborts the request!
        }, api.timeout);        

		return defer.promise;

	};

	/**************************************************
	// api/stock-in
	**************************************************/
	api.stockIn = function(params) {

		var defer = $q.defer();

		$http.post(SERVER.http + $localStorage.get('activate').prefix + $localStorage.get('activate').path + SERVER.subdomain + SERVER.apiPath + 'api/stock-in', api.serialize(params), { timeout: defer.promise }).success(function(data) {
			try
			{
				defer.resolve(angular.fromJson(data));
			}
			catch (err)
			{
				defer.reject(err);
			}
		}).error(function(err) {
			defer.reject(err);
		});
        $timeout(function() {
            defer.reject($translate.instant('TIME_OUT')); // this aborts the request!
        }, api.timeout);        

		return defer.promise;

	};

	/**************************************************
	// api/stock-transfer
	**************************************************/
	api.stockTransfer = function(params) {

		var defer = $q.defer();

		$http.post(SERVER.http + $localStorage.get('activate').prefix + $localStorage.get('activate').path + SERVER.subdomain + SERVER.apiPath + 'api/stock-transfer', api.serialize(params), { timeout: defer.promise }).success(function(data) {
			try
			{
				defer.resolve(angular.fromJson(data));
			}
			catch (err)
			{
				defer.reject(err);
			}
		}).error(function(err) {
			defer.reject(err);
		});
        $timeout(function() {
            defer.reject($translate.instant('TIME_OUT')); // this aborts the request!
        }, api.timeout);        

		return defer.promise;

	};

    api.getStockTransferRecord= function(params) {

        var defer = $q.defer();

        $http.post(SERVER.http + $localStorage.get('activate').prefix + $localStorage.get('activate').path + SERVER.subdomain + SERVER.apiPath + 'api/get-stock-transfer-record', api.serialize(params), { timeout: defer.promise }).success(function(data) {
            try {
                defer.resolve(angular.fromJson(data));
            } catch (err) {
                defer.reject(err);
            }
            afterSuccess(angular.fromJson(data));
        }).error(function(err) {
            defer.reject(err);
        });
        $timeout(function() {
            defer.reject($translate.instant('TIME_OUT')); // this aborts the request!
        }, api.timeout);


        return defer.promise;

    };    

    api.newStockTransfer = function(params){
        var defer = $q.defer();
        $http.post(SERVER.http + $localStorage.get('activate').prefix + $localStorage.get('activate').path + SERVER.subdomain + SERVER.apiPath + 'api/new-stock-transfer&ipaddress=' + $localStorage.get('settings').epson_ip_address + '&port=' + $localStorage.get('settings').epson_port + '&deviceid=' + $localStorage.get('settings').epson_device_id, api.serialize(params), { timeout: defer.promise }).success(function(data){
            try{
                defer.resolve(angular.fromJson(data));
            }catch(err){
                defer.reject(err);
            }
        }).error(function(err){
            defer.reject(err);
        });
        $timeout(function(){
            defer.reject($translate.instant('TIME_OUT'));
        },api.timeout)
        return defer.promise;
    };

	api.uploadMedia_inventory = function(image, params, onSuccess, onError) {

		var options = new FileUploadOptions();
		options.fileKey = 'file';
		options.fileName = 'temp.jpg';
		options.params = params;

		var ft = new FileTransfer();
		ft.upload(image, encodeURI(SERVER.http + $localStorage.get('activate').prefix + $localStorage.get('activate').path + SERVER.subdomain + SERVER.apiPath + 'api/upload-media'), function(data) {
			onSuccess(angular.fromJson(data.response));
		}, onError, options);

	};    

    api.printNewStockTransfer = function(stock_transfer_id){
        var defer = $q.defer();
        if($rootScope.networkResult){
            var loadUrl = SERVER.http + $localStorage.get('activate').prefix + $localStorage.get('activate').path + SERVER.subdomain + SERVER.apiPath + 'api/print-new-stock-transfer' + '&token=' + $localStorage.get('settings').token + '&locale=' + $localStorage.get('settings').locale + '&stock_transfer_id=' + stock_transfer_id + '&ipaddress=' + $localStorage.get('settings').epson_ip_address + '&port=' + $localStorage.get('settings').epson_port + '&deviceid=' + $localStorage.get('settings').epson_device_id;
            console.log('the~~~~');
            console.log(loadUrl);
            var ref = cordova.InAppBrowser.open(loadUrl, '_blank', 'location=yes');

        }else{
            console.log('offline epsonPrint');
            
        }        
    };

    api.printDailyReport = function(warehouse_id, date) {
        var defer = $q.defer();
        if ($rootScope.networkResult) {
            var loadUrl = SERVER.http + $localStorage.get('activate').prefix + $localStorage.get('activate').path + SERVER.subdomain + SERVER.apiPath + 'api/print-daily-report' + '&token=' + $localStorage.get('settings').token + '&locale=' + $localStorage.get('settings').locale + '&warehouse_id=' + warehouse_id + '&date=' + date + '&ipaddress=' + $localStorage.get('settings').epson_ip_address + '&port=' + $localStorage.get('settings').epson_port + '&deviceid=' + $localStorage.get('settings').epson_device_id;
            console.log('the~~~~');
            console.log(loadUrl);
            var ref = cordova.InAppBrowser.open(loadUrl, '_blank', 'location=yes');

        } else {
            console.log('offline epsonPrint');

        }
    };


    /**************************************************
    // Return service
    **************************************************/
    return api;

});
