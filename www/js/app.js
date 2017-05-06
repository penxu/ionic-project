// Ionic Starter App

// angular.module is a global place for creating, registering and retrieving Angular modules
// 'starter' is the name of this angular module example (also set in a <body> attribute in index.html)
// the 2nd parameter is an array of 'requires'
angular.module('starter', [
    'ionic',
    'ngCordova',
    'ngFileUpload',
    'ionic-datepicker',
    'pascalprecht.translate',
    'services.localstorage',
    'services.helper',
    'services.api',
    'services.offline',
    'controllers.splash',
    'controllers.activate',
    'controllers.login',
    'controllers.home'
])


.run(function($ionicPlatform, $state, $rootScope, $helper, $ionicHistory, $translate, $timeout) {
    $ionicPlatform.ready(function() {
        if (window.cordova && window.cordova.plugins.Keyboard) {
            // Hide the accessory bar by default (remove this to show the accessory bar above the keyboard
            // for form inputs)
            cordova.plugins.Keyboard.hideKeyboardAccessoryBar(true);

            // Don't remove this line unless you know what you are doing. It stops the viewport
            // from snapping when text inputs are focused. Ionic handles this internally for
            // a much nicer keyboard experience.
            //  cordova.plugins.Keyboard.disableScroll(true);
            cordova.plugins.Keyboard.disableScroll(false);
        }
        if (window.StatusBar) {
            StatusBar.styleDefault();
        }

        // handle android back
        $ionicPlatform.registerBackButtonAction(function(e) {
            if ($rootScope.backButtonPressedOnceToExit) {
                ionic.Platform.exitApp();
            } else if ($ionicHistory.backView()) {
                if ($rootScope.goBack != undefined) {
                    $rootScope.goBack();
                } else {
                    $ionicHistory.goBack();
                }
            } else {
                $rootScope.backButtonPressedOnceToExit = true;
                $helper.toast($translate.instant('PRESS_ONCE_MORE_TO_EXIT'), 'short', 'bottom');
                setTimeout(function() {
                    $rootScope.backButtonPressedOnceToExit = false;
                }, 2000);
            }
            e.preventDefault();
            return false;
        }, 101);
    });
})

.config(function($stateProvider, $urlRouterProvider, $ionicConfigProvider, $translateProvider, $httpProvider, ionicDatePickerProvider) {
    var datePickerObj = {
        inputDate: new Date(),
        titleLabel: 'Select a Date',
        setLabel: 'Set',
        todayLabel: 'Today',
        closeLabel: 'Close',
        mondayFirst: false,
        weeksList: ["S", "M", "T", "W", "T", "F", "S"],
        monthsList: ["Jan", "Feb", "March", "April", "May", "June", "July", "Aug", "Sept", "Oct", "Nov", "Dec"],
        templateType: 'popup',
        from: new Date().setMonth(new Date().getMonth() - 12),
        to: new Date(),
        showTodayButton: true,
        dateFormat: 'dd MMMM yyyy',
        closeOnSelect: false,
        disableWeekdays: []
    };
    ionicDatePickerProvider.configDatePicker(datePickerObj);
    // Instantly remove jank scroll.
    //$ionicConfigProvider.scrolling.jsScrolling(false);

    // Or for only a single platform, use
    //   if (ionic.Platform.isAndroid())
    //   {
    //     $ionicConfigProvider.scrolling.jsScrolling(false);
    //   }

    // config $httpProvider
    $httpProvider.defaults.headers.post['Content-Type'] = 'application/x-www-form-urlencoded; charset=UTF-8';

    // Ionic uses AngularUI Router which uses the concept of states
    // Learn more here: https://github.com/angular-ui/ui-router
    // Set up the various states which the app can be in.
    // Each state's controller can be found in controllers.js
    $stateProvider

    // splash screen for initialization
        .state('splash', {
        url: '/',
        templateUrl: 'templates/splash.html',
        controller: 'splashCtrl'
    })

    // activate
    .state('activate', {
        url: '/activate',
        templateUrl: 'templates/activate.html',
        controller: 'activateCtrl'
    })

    // login
    .state('login', {
        url: '/login',
        templateUrl: 'templates/login.html',
        controller: 'loginCtrl'
    })

    // home
    .state('home', {
        url: '/home',
        templateUrl: 'templates/home.html',
        controller: 'homeCtrl'
    });



    // if none of the above states are matched, use this as the fallback
    $urlRouterProvider.otherwise('/');

    // initial angular-translate i18n
    $translateProvider.useSanitizeValueStrategy('escape');
    $translateProvider.useStaticFilesLoader({
        prefix: 'i18n/',
        suffix: '.json'
    });
    $translateProvider.preferredLanguage('EN_US');
    $translateProvider.fallbackLanguage('EN_US');

    // disable default transition in favor NativePageTransitions
    //$ionicConfigProvider.views.transition('none');
    $ionicConfigProvider.backButton.text('').icon('ion-ios-arrow-back');

    // config tabs and navigation bar to be consistent between iOS and Android
    $ionicConfigProvider.tabs.style('standard');
    $ionicConfigProvider.tabs.position('bottom');
    $ionicConfigProvider.navBar.alignTitle('center');
    $ionicConfigProvider.scrolling.jsScrolling(false);

    // disable default transition in favor NativePageTransitions
    $ionicConfigProvider.views.transition('none');

})

//.constant('SERVER', {
//  domain: 'http://sandbox.gardengallery.posify.me/',
//  apiPath: 'index.php?r=',
//  appId: '888888',
//  languages: ['EN_US', 'ZH_HK', 'ZH_CN']
//});

.constant('SERVER', {
    http: 'http://',
    subdomain: '.posify.me/',
    apiPath: 'index.php?r=',
    languages: ['EN_US', 'ZH_HK', 'ZH_CN']
});
