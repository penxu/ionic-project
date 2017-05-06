angular.module('directives.common', [])

/**************************************************
// [A] prevent-side-menu-drag
// to stop some element trigger side menu from drag
**************************************************/

.directive('preventSideMenuDrag', function($ionicGesture, $ionicSideMenuDelegate) {

	return {
		restrict	:	'A',
		link		:	function(scope, elem) {
			$ionicGesture.on('touch', function() {
				$ionicSideMenuDelegate.canDragContent(false);
			}, elem);
			$ionicGesture.on('release', function() {
				$ionicSideMenuDelegate.canDragContent(true);
			}, elem);
		}
	};

})

/**************************************************
// [A] hide-tabs
// hide the tab group for some specific view
**************************************************/

.directive('hideTabs', function() {

	return {
		restrict	:	'A',
		link		:	function(scope, elem) {
			scope.$on('$ionicView.enter', function() {
				// find if hide-tabs exists on current tab-content
				var activeTab = document.querySelectorAll('.tab-content[nav-view="active"]');
				if (activeTab[0].querySelectorAll('[hide-tabs]').length == 1)
				{
					angular.element(document).find('ion-tabs').removeClass('tabs-item-hide').addClass('tabs-item-hide');
				}
			});

			scope.$on('$destroy', function() {
				// find if hide-tabs is the last one on current tab-content
				var activeTab = document.querySelectorAll('.tab-content[nav-view="active"]');
				if (activeTab[0].querySelectorAll('[hide-tabs]').length == 1)
				{
					angular.element(document).find('ion-tabs').removeClass('tabs-item-hide');
				}
			});
		}
	};

});

