angular.module('directives.ubeing', ['services.helper'])

/**************************************************
// <u-box> is the div wrapper with grey border and back white background color by default
// it provides a header and content section
// the header contains a title plus an action button on the right
// the content are available for any content or directives
//
// attributes:
//  box-theme (optional)	:	Theme of box
//  header-icon				:	Header title
//  header-title (required)	:	Header title
//  group-header			:	remove corresponding margin for group header
//  group-body				:	remove corresponding margin for group body
//  group-footer			:	remove corresponding margin for group footer
//  action-title (optional)	:	Action button title
//  action-icon (optional)	:	ion ionic class
//  click-event				:	click event link to parent controller scope
//  state-go				:	go to state
//  int-url					:	open in-app url
//  right-text				:	open in-app url
**************************************************/

.directive('uBox', function($helper, $timeout) {

	var directive = {};

	// signifies that directive is Element directive
	directive.restrict = 'E';

	// template replaces the complete element with its content
	//directive.template = '';

	// scope is used to distinguish each element based on criteria.
	// setting true means it is a child scope, not isolate
	directive.scope = true;

	// link function is retained for re-use. Angular calls it once when html page is load.
	directive.link = function(scope, elem, attr) {

		var theme = 'default';
		if (attr.boxTheme != undefined) theme = attr.boxTheme;

		elem.addClass('box-' + theme);

		if (attr.groupHeader != undefined)	elem.addClass('box-group-header');
		if (attr.groupBody != undefined)	elem.addClass('box-group-body');
		if (attr.groupFooter != undefined)	elem.addClass('box-group-footer');

		attr.$observe('headerTitle', function(title) {
			if (title != undefined)
			{
				elem.find('h5').remove();
				if (elem.html().trim() == '')
				{
					elem.prepend('<h5 class="border-clear">' + title + '&nbsp;</h5>');
				}
				else
				{
					elem.prepend('<h5>' + title + '&nbsp;</h5>');
				}

				attr.$observe('headerIcon', function(icon) {
					if (icon != undefined)
					{
						elem.find('h5').prepend('<span class="left"><i class="header-icon ' + icon + '"></i></span>');
						elem.find('h5').addClass('with-icon');
					}
				});

				if (attr.actionTitle != undefined)
				{
					elem.find('h5').append('<span class="right">' + attr.actionTitle + '</span>');

					attr.$observe('actionIcon', function(icon) {
						if (icon != undefined)
						{
							elem.find('h5').find('span').append('<i class="' + icon + '"></i>');
						}
					});

					attr.$observe('clickEvent', function(event) {
						if (event != undefined)
						{
							elem.find('h5').bind('click', function() {
								scope.$apply(event);
							});
						}
					});
				}

				if (attr.rightText != undefined)
				{
					elem.find('h5').append('<span class="right highlight">' + attr.rightText + '</span>');

					attr.$observe('rightText', function(text) {
						angular.element(elem.find('h5')[0].querySelector('.right')).text(text);
					});

					attr.$observe('clickEvent', function(event) {
						if (event != undefined)
						{
							elem.find('h5').bind('click', function() {
								scope.$apply(event);
							});
						}
					});
				}
			}
		});

		attr.$observe('stateGo', function(state) {
			if (state != undefined)
			{
				if (attr.data != undefined)
				{
					elem.bind('click', function() {
						$helper.navForth(state, angular.fromJson(attr.data), 'fade');
					});
				}
				else
				{
					elem.bind('click', function() {
						$helper.navForth(state, null, 'fade');
					});
				}
			}
		});
	};

	return directive;

})

/**************************************************
// <u-grid> is the div wrapper to present a grid style information
// it wrap the child <div> into grid presentation
// current support for 'magazine' style (for YouShop)
//
// attributes:
//  grid-theme (optional)	:	theme of the grid
//  grid-style				:	style of the grid
//  cell-height				:	Height of cell in px
//  cell-count				:	Number of cell being initialize
//  col-num					:	Number of cell per row
//  no-border				:	if the grid should not display border
**************************************************/

.directive('uGrid', function() {

	var directive = {};

	// signifies that directive is Element directive
	directive.restrict = 'E';

	// template replaces the complete element with its content
	//directive.template = '';

	// scope is used to distinguish each element based on criteria.
	// setting true means it is a child scope, not isolate
	directive.scope = true;

	// link function is retained for re-use. Angular calls it once when html page is load.
	directive.link = function(scope, elem, attr) {

		var theme = 'default';
		if (attr.gridTheme != undefined) theme = attr.gridTheme;

		elem.addClass('grid-' + theme);

		// since the cells are created by ng-repeat,
		// we need to watch when all cells are complete creation
		// and then link the <u-grid> directive
		var watchIt = scope.$watch(function() {
			// check if all <div> (cell) are generated
			return elem.find('div').length === attr.cellCount;
		}, function() {
			switch (attr.gridStyle)
			{
				// +--------+----+----+
				// |        |    |    |
				// |        |    |    |
				// |        +----+----+
				// |        |    |    |
				// |        |    |    |
				// +--------+----+----+
				case 'magazine':
					angular.forEach(elem.find('div'), function(child, i) {
						var col = angular.element(child);
						col.css('float', 'left');
						if (i == 0)
						{
							col.css('width', '50%').css('height', attr.cellHeight * 2 + 'px');
							if (attr.noBorder == undefined)
							{
								col.addClass('grid-border-right-' + theme);
							}
						}
						else
						{
							col.css('width', '25%').css('height', attr.cellHeight + 'px');
							if (attr.noBorder == undefined)
							{
								if (i == 1)	col.addClass('grid-border-right-' + theme).addClass('grid-border-bottom-' + theme);
								if (i == 2)	col.addClass('grid-border-bottom-' + theme);
								if (i == 3)	col.addClass('grid-border-right-' + theme);
							}
						}
					});
					elem.append('<div class="clear"></div>');
					break;
				// +----+----+----+----+
				// |    |    |    |    |
				// |    |    |    |    |
				// +----+----+----+----+
				// |    |    |    |    |
				// |    |    |    |    |
				// +----+----+----+----+
				case 'title':
					angular.forEach(elem.find('div'), function(child, i) {
						var col = angular.element(child);
						col.css('float', 'left');
						col.css('width', 'calc(100% / ' + attr.colNum + ')').css('height', attr.cellHeight + 'px');
						if (attr.noBorder == undefined)
						{
							if (i % attr.colNum != attr.colNum - 1) col.addClass('grid-border-right-' + theme);
							if (i <= attr.cellCount - attr.colNum) col.addClass('grid-border-bottom-' + theme);
						}
					});
					elem.append('<div class="clear"></div>');
					break;
			}

			// unregister the watch for performance, since
			// the init function only need to be called once
			watchIt();
		});
	};

	return directive;

})

/**************************************************
// <u-thumb> is the div wrapper to wrap a image and title
// it also provide a click event
//
// attributes:
//  thumb-theme (optional)	:	theme of the thumb
//  thumb-src				:	image src
//  thumb-width				:	image width in pixel
//  thumb-height			:	image height in pixel
//  thumb-circle			:	image circle
//  thumb-title				:	tile of the image
//  click-event				:	click event link to parent controller scope
**************************************************/

.directive('uThumb', function() {

	var directive = {};

	// signifies that directive is Element directive
	directive.restrict = 'E';

	// template replaces the complete element with its content
	//directive.template = '';

	// scope is used to distinguish each element based on criteria.
	// setting true means it is a child scope, not isolate
	directive.scope = true;

	// link function is retained for re-use. Angular calls it once when html page is load.
	directive.link = function(scope, elem, attr) {

		var theme = 'default';
		if (attr.thumbTheme != undefined) theme = attr.thumbTheme;

		elem.addClass('thumb-' + theme);

		attr.$observe('thumbSrc', function(src) {
			if (src != undefined)
			{
				if (attr.thumbWidth != undefined && attr.thumbHeight != undefined)
				{
					elem.append('<div class="img-wrapper" style="width:' + attr.thumbWidth + 'px; height:' + attr.thumbHeight + 'px;"><span></span><img' + (attr.thumbCircle != undefined ? ' class="img-circle"' : '') + ' style="width:' + attr.thumbWidth + 'px; height:' + attr.thumbHeight + 'px;" src="' + src + '" /></div>');
				}
				else
				{
					elem.append('<div class="img-wrapper"><span></span><img' + (attr.thumbCircle != undefined ? ' class="img-circle"' : '') + ' src="' + src + '" /></div>');
				}
			}

			// append title after image is observed (loaded)
			if (attr.thumbWidth != undefined && attr.thumbHeight != undefined)
			{
				if (elem.html().trim() != '')
				{
					elem.append('<div class="thumb-title" style="padding-left:' + attr.thumbWidth + 'px;">' + attr.thumbTitle + '</div>');
				}
				else
				{
					elem.append('<div class="thumb-title" style="padding-left:' + attr.thumbWidth + 'px;">' + attr.thumbTitle + '</div>');
				}

				if (attr.thumbSubTitle != undefined)
				{
					elem.append('<div class="thumb-sub-title" style="padding-left:' + attr.thumbWidth + 'px;">' + attr.thumbSubTitle + '</div>');
				}

				if (attr.thumbHighlight != undefined)
				{
					elem.append('<div class="thumb-highlight" style="padding-left:' + attr.thumbWidth + 'px;">' + attr.thumbHighlight + '</div>');
				}
			}
			else
			{
				elem.append('<div class="thumb-title">' + attr.thumbTitle + '</div>');

				if (attr.thumbSubTitle != undefined)
				{
					elem.append('<div class="thumb-sub-title">' + attr.thumbSubTitle + '</div>');
				}

				if (attr.thumbHighlight != undefined)
				{
					elem.append('<div class="thumb-highlight">' + attr.thumbHighlight + '</div>');
				}
			}
			elem.append('<div class="clear"></div>');
		});

		attr.$observe('clickEvent', function(event) {
			if (event != undefined)
			{
				elem.bind('click', function(){
					scope.$apply(event);
				});
			}
		});
	};

	return directive;

})

/**************************************************
// <u-desc> is the div wrapper to wrap title and description
// it also provide a click event
//
// attributes:
//  desc-theme (optional)	:	theme of the thumb
//  desc-title				:	tile of the description
//  desc-title-icon			:	icon for title
//  desc-detail				:	detail of the description
//  desc-detail-align		:	detail of the description
//  desc-detail-highlight	:	detail of the description
//  click-event				:	click event link to parent controller scope
**************************************************/

.directive('uDesc', function() {

	var directive = {};

	// signifies that directive is Element directive
	directive.restrict = 'E';

	// template replaces the complete element with its content
	//directive.template = '';

	// scope is used to distinguish each element based on criteria.
	// setting true means it is a child scope, not isolate
	directive.scope = true;

	// link function is retained for re-use. Angular calls it once when html page is load.
	directive.link = function(scope, elem, attr) {

		var theme = 'default';
		if (attr.descTheme != undefined) theme = attr.descTheme;

		elem.addClass('desc-' + theme);

		attr.$observe('descDetail', function(detail) {
			if (detail != undefined)
			{
				elem.empty();

				elem.append('<div class="desc-detail' + (attr.descDetailAlign != undefined ? ' text-' + attr.descDetailAlign : '') + (attr.descDetailHighlight != undefined ? ' highlight' : '') + '"><span>' + detail + '</span></div>');

				if (attr.descTitleIcon != undefined)
				{
					elem.append('<div class="desc-title"><span><i class="' + attr.descTitleIcon + '"></i> ' + attr.descTitle + '</span></div>');
				}
				else
				{
					elem.append('<div class="desc-title"><span>' + attr.descTitle + '</span></div>');
				}
				elem.append('<div class="clear"></div>');
			}
		});

		attr.$observe('clickEvent', function(event) {
			if (event != undefined)
			{
				elem.bind('click', function(){
					scope.$apply(event);
				});
			}
		});
	};

	return directive;

})

/**************************************************
// <u-nav-search> is the directive wrapped inside <ion-nav-buttons side="!!right!!">,
// it include a search box and allow user to input some keyword(s) to search
//
// attributes:
//  search-theme (optional) : theme of the search
//  search-placeholder      : hint-text for the search input box
//  search-pad-left				  :	padding left for one icon width
//  search-pad-right				:	padding right for one icon width
//  search-event			    	:	search event link to parent controller scope
**************************************************/
.directive('uNavSearch', function() {

	var directive = {};

	// signifies that directive is Element directive
	directive.restrict = 'E';

	// template replaces the complete element with its content
	directive.template = '<div>'
		+ '	<form ng-submit="searchEvent({ keyword : keyword })">'
		+ '		<i class="pull-left icon placeholder-icon ion-android-search"></i>'
		+ '		<i class="pull-right icon placeholder-icon ion-close-round clear-text" ng-click="keyword=\'\'"></i>'
		+ '		<input type="search" ng-model="keyword" />'
		+ '		<button type="submit">Search</button>'
		+ '	</form>'
		+ '</div>';

	// scope is used to distinguish each element based on criteria.
	// setting true means it is a child scope, not isolate
	directive.scope = {
		searchEvent	:	'&',
		cancelEvent	:	'&'
	};

	// link function is retained for re-use. Angular calls it once when html page is load.
	directive.link = function(scope, elem, attr) {

		var theme = 'default';
		if (attr.searchTheme != undefined) theme = attr.searchTheme;

		angular.forEach(theme.split(' '), function(val) {
			elem.addClass('search-' + val);
		});

		// makeups
		if (attr.searchPadLeft != undefined)
		{
			if (attr.searchPadRight != undefined)
			{
				// padding both left and right
				elem.find('div').css('width', 'calc(100% - 90px)');
				elem.find('div').css('left', '45px');
			}
			else
			{
				// padding only left
				elem.find('div').css('width', 'calc(100% - 55px)');
				elem.find('div').css('left', '45px');
			}
		}
		else
		{
			if (attr.searchPadRight != undefined)
			{
				// padding only right
				elem.find('div').css('width', 'calc(100% - 55px)');
				elem.find('div').css('right', '45px');
			}
			else
			{
				// no padding
				elem.find('div').css('width', 'calc(100% - 20px)');
				elem.find('div').css('left', '10px');
			}
		}
		elem.find('div').find('form').find('input').attr('placeholder', attr.searchPlaceholder);

		elem.find('div').find('form').bind('submit', function() {
			elem.find('div').find('form').find('input')[0].blur();
		});

	};

	return directive;
});

