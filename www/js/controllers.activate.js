angular.module('controllers.activate', [
  'ionic',
  'pascalprecht.translate',
  'ngMessages',
  'services.localstorage',
  'services.helper',
  'services.api',
  'directives.common',
  'directives.ubeing'
])

.controller('activateCtrl', function($scope, $rootScope, $localStorage, $translate, $helper, $ionicLoading, $api, $ionicPopup, $ionicScrollDelegate, SERVER) {

  /**************************************************
  // initialize view
  **************************************************/

  $scope.init = function() {

    var user = $localStorage.get('user');
    $scope.user = {
      login: user.login,
      password: user.password,
      submitting: false
    };

    $scope.forgot = {
      login: '',
      submitting: false
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

  // login
  $scope.activate = function(form) {
    if (!form.$valid)
    {
      angular.forEach(document.getElementsByClassName('error-container'), function(el) {
        if (angular.element(el).text().trim() != '')
        {
          $ionicScrollDelegate.$getByHandle('form-error').scrollTo(0, el.getBoundingClientRect().top, true);
        }
      });
    }
    else
    {
      console.log('ready activate~~');
      $scope.user.submitting = true;
      console.log('net: '+$rootScope.networkResult);
      $api.activation({
        locale: $localStorage.get('settings').locale,
        app_id: $scope.user.app_id,
        app_name: $scope.user.app_name
      }).then(function(res) {
        $scope.user.submitting = false;
        console.log('finishi activate ~~');
        console.log(res);
        if (res.status == 'Y')
        {
          // save returned user info
          $localStorage.set('activate', {
          	status: true,
          	passcode: $scope.user.app_id,
          	prefix: '',
          	path: $scope.user.app_name,
          	shop_icon: res.shop_icon
          });
          // save returned warehouse list

          $helper.navForth('splash' ,null, 'slide-left-right');

        }
        else
        {
          $helper.toast(res.msg, 'short', 'top');
        }
      }).catch(function(err) {
        console.log(err);
        $scope.user.submitting = false;
        $helper.toast(err, 'long', 'top');
      });
    }
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
