/*
 *  Project: NotificationCenter
 *  Description: Trying to implement a simple notification center like Facebook or like Apple in the last version of it's OS
 *  Author: Mathieu BUONOMO
 *  License: Permission is hereby granted, free of charge, to any person obtaining
 *  a copy of this software and associated documentation files (the
 *  "Software"), to deal in the Software without restriction, including
 *  without limitation the rights to use, copy, modify, merge, publish,
 *  distribute, sublicense, and/or sell copies of the Software, and to
 *  permit persons to whom the Software is furnished to do so, subject to
 *  the following conditions:
 *  
 *  The above copyright notice and this permission notice shall be
 *  included in all copies or substantial portions of the Software.
 *  
 *  THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
 *  EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
 *  MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
 *  NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE
 *  LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION
 *  OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION
 *  WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */
; (function ($, window, document, undefined) {
	var current_notif = [];
	var pluginName = "notificationcenter";
	var defaults = {
		centerElement:		"#notificationcenterpanel",
		bodyElement:		"#noticationcentermain",
		toggleButton:		"#notificationcentericon",
		addPanel:		true,
		displayTime:		5000,
		types:			[],
		counter:		true,
		title_counter:		true,
		default_notifs:		[],
		faye:			false,
		ajax:			false,
		checkTime:		5000,
		alert_hidden:		true,
		alert_hidden_sound:	''
	};

	var hiddentype;
	if (typeof document.hidden !== "undefined")
		hiddentype = "hidden";
	else if (typeof document.mozHidden !== "undefined")
		hiddentype = "mozHidden";
	else if (typeof document.msHidden !== "undefined")
		hiddentype = "msHidden";
	else if (typeof document.webkitHidden !== "undefined")
		hiddentype = "webkitHidden";
	else
		hiddentype = false;

	function inArray(needle, haystack) {
		var length = haystack.length;

		for (var i = 0; i < length; i++) {
			if (haystack[i].type === needle)
				return i;
		}

		return false;
	}

	var nc;
	function Plugin(element, options) {
		nc = this;
		nc.element = element;

		nc.options = $.extend( {}, defaults, options) ;
		nc.options.zIndex = {
			panel: 0,
			button: 0
		};

		nc.options.title = document.title;
		nc.snd = false;
		nc.hiddentype = false;
        
		nc._defaults = defaults;
		nc._name = pluginName;
		nc.current_notif = current_notif;
        
		nc.init();
	}

	// Start Prototypes
	Plugin.prototype.init = function () {
		if (nc.options.addPanel) {
			var id = nc.options.centerElement.replace('#', '');
			$('body').prepend('<div id="'+id+'"></div>');

			// Line it up with bodyElement
			var bposition = $(nc.options.bodyElement).position();
			$(nc.options.centerElement).hide();
			$(nc.options.centerElement).css({
				position: 'absolute',
				top: bposition.top,
				right: 0
			});
		}

		$(nc.options.toggleButton).addClass('notificationcentericon');

		if (window.HTMLAudioElement &&
		    nc.options.alert_hidden_sound &&
		    nc.options.alert_hidden) {
			var snd = new Audio('');
                    
			if (snd.canPlayType('audio/ogg'))
				nc.snd = new Audio(nc.options.alert_hidden_sound + '.ogg');
			else if (snd.canPlayType('audio/mp3'))
				nc.snd = new Audio(nc.options.alert_hidden_sound + '.mp3');
			else
				nc.snd = false;
		}

		nc.listener();

		if (nc.options.default_notifs.length > 0) {
			var centerElm = nc.options.centerElement;
			var types = nc.options.types;

			$(nc.options.default_notifs).each(function(index, item) {
				var type = item.type;

				if ($(centerElm+' .center'+type).length === 0) {
					var i = inArray(type, types);

					if (i !== false) {
						var bgcolor = (types[i].bgcolor === undefined)?'#FF00FF':types[i].bgcolor;
						var color = (types[i].color === undefined)?'#000000':types[i].color;

						$(centerElm).prepend('<div class="centerlist center' + type + '"><div class="centerheader" style="background-color:' + bgcolor + ';color:' + color + ';background-image:url(' + types[index].img + ')">' + types[index].type + '</div><ul></ul></div>');
					} else {
						$(centerElm).prepend('<div class="centerlist center' + type + '"><div class="centerheader"></div><ul></ul></div>');
					}
				}

				$(item.values).each(function(i,notif) {
					$(centerElm + ' .center' + type + ' ul').prepend(nc.notifcenterbox(notif.text, notif.time));
				});
			});
		}

		if (nc.options.faye !== false) {
			var subscription = client.subscribe(nc.options.faye.chanel, function(message) {
				nc.newAlert(message.text, message.type);
			});            
		}
	};

	Plugin.prototype.listener = function() {
		$(nc.options.toggleButton).on('click', function() {
			nc.slide();
			return false;
		});
	};

	Plugin.prototype.is_open = function() {
		if ($(nc.options.centerElement).is(':visible'))
			return true;
		else
			return false;
	};

	Plugin.prototype.updatetitle = function() {
		var title = nc.options.title;
		var count = parseInt($(nc.options.toggleButton).attr('data-counter')) || false;

		if (count)
			title = "(" + count + ") " + title;

		document.title = title;
	}

	Plugin.prototype.notifcenterbox = function(notiftext, notiftime) {
		var str = '<li><div class="notifcenterbox">' + nc.closenotif() + notiftext;

		if (notiftime)
			str += '<br><small data-livestamp="' + notiftime + '"></small>';

		str += '</div></li>';

		return str;
	}

	Plugin.prototype.closenotif = function() {
		return '<div class="closenotif"><i class="fa fa-times"></i></div>';
	}

	Plugin.prototype.slide = function() {
		if (nc.is_open()) {
			$(nc.options.centerElement).css({
				zIndex: nc.options.zIndex.panel
			});
			$(nc.options.toggleButton).css({
				zIndex: nc.options.zIndex.button
			});

			$(nc.options.toggleButton).removeClass('close').addClass('open');

			$(nc.options.bodyElement).animate({
				right: 0
			}, {
				duration: 500,
				complete: function() {
					$('#notificationcenteroverlay').remove();
					$(nc.options.centerElement).hide();
				}
			});
		} else {
			if (nc.options.counter) {
				$(nc.options.toggleButton).removeAttr('data-counter');
				if (nc.options.title_counter)
					nc.updatetitle();
			}

			$(nc.options.centerElement).show();
			nc.options.zIndex.panel = $(nc.options.centerElement).css('zIndex');
			nc.options.zIndex.button = $(nc.options.toggleButton).css('zIndex');

			$(nc.options.toggleButton).removeClass('open').addClass('close');
			$(nc.options.bodyElement).animate({
				right: 300
			}, {
				duration: 500,
				complete: function() {
					$(nc.options.centerElement).css({
						zIndex: 1002
					});
					$(nc.options.toggleButton).css({
						zIndex: 1002
					});
				}
			});

			// Safety add an overlay over document to remove
			// event control, only notifier panel has control
			$('body').append('<div id="notificationcenteroverlay"></div>');
			$('#notificationcenteroverlay').css({
				'zIndex': 1001,
				'position': 'absolute',
				'top': 0,
				'left': 0,
				'height': '100%',
				'width': '100%'
			});

			$('#notificationcenteroverlay').on('click', function() {
				nc.slide();
				return false;
			});
		}
	};

	Plugin.prototype.newAlert = function(text, type) {
		if (!nc.is_open()) {
			if ($('.notificationul').length === 0) {
				$('body').prepend('<ul class="notificationul"></ul>');

				// Line it up with bodyElement
				var bposition = $(nc.options.bodyElement).position();
				$('.notificationul').css({
					top: bposition.top
				});
			}

			var randomnumber = Math.floor(Math.random() * 1199999);
			var index = inArray(type, nc.options.types);
			var html = '';

			nc.current_notif.push(randomnumber);

			if (index !== false)
				html = '<li id="box' + randomnumber + '"><div class="notification">' + nc.closenotif() + '<div class="iconnotif"><div class="iconnotifimg"><img src="' + nc.options.types[index].img + '" /></div></div><div class="contentnotif">' + text + '</div></div></li>';
			else
				html = '<li id="box' + randomnumber + '"><div class="notification">' + nc.closenotif() + '<div class="iconnotif"></div><div class="contentnotif">' + text + '</div></div></li>';

			$('.notificationul').prepend(html);

			$('#box'+randomnumber).css({
				right: '30px',
				position: 'relative'
			}).fadeIn(500);

			window.setTimeout(function() {
				$('#box' + randomnumber).css({
					right: '-450px'
				}).fadeOut(500, function() {
					$(this).remove();
				});
			}, nc.options.displayTime);

			if (nc.options.counter) {
				if ($(nc.options.toggleButton).attr('data-counter') === undefined) {
					$(nc.options.toggleButton).attr('data-counter', 1);
					if (nc.options.title_counter)
						nc.updatetitle();
				} else {
					var counter = parseInt($(nc.options.toggleButton).attr('data-counter')) + 1;

					$(nc.options.toggleButton).attr('data-counter', counter);
					if (nc.options.title_counter)
						nc.updatetitle();
				}
			}

			if (nc.options.alert_hidden &&
			    document[nc.hiddentype] &&
			    nc.snd)
				nc.snd.play();
		}

		if ($(nc.options.centerElement + ' .center' + type).length === 0) {
			var index = inArray(type, nc.options.types);

			if (index !== false) {
				var bgcolor  = (nc.options.types[index].bgcolor === undefined)?'#FF00FF':nc.options.types[index].bgcolor;
				var color  = (nc.options.types[index].color === undefined)?'#000000':nc.options.types[index].color;

				$(nc.options.centerElement).prepend('<div class="centerlist center' + type + '"><div class="centerheader" style="background-color: ' + bgcolor + '; color: ' + color + '; background-image: url(' + nc.options.types[index].img + ')">' + nc.options.types[index].type + '</div><ul></ul></div>');
			} else {
				$(nc.options.centerElement).prepend('<div class="centerlist center' + type + '"><div class="centerheader"></div><ul></ul></div>');
			}
		}

		var time = 0;
		if (jQuery().livestamp) {
			var date = new Date();
			time = Math.round(date.getTime() / 1000);
		}

		$(nc.options.centerElement + ' .center' + type + ' ul').prepend(nc.notifcenterbox(text, time));

		$('.closenotif').on('click', function() {
			$(this).parents('li').css({
				right: '-450px'
			}).fadeOut(500, function() {
				if ($(this).parents('ul').find('li').length == 1)
					$(this).parents('.centerlist').remove();

				$(this).remove();
			});
		});
	};

	$.fn[pluginName] = function(options) {
		var args = arguments;

		if (options === undefined ||
		    typeof options === 'object') {
			return this.each(function() {
				if (!$.data(this, 'plugin_' + pluginName))
					$.data(this, 'plugin_' + pluginName, new Plugin(this, options));
			});
		} else if (typeof options === 'string' &&
		    options[0] !== '_' &&
		    options !== 'init') {
			var returns;

			this.each(function() {
				var instance = $.data(this, 'plugin_' + pluginName);

				if (instance instanceof Plugin &&
				    typeof instance[options] === 'function')
					returns = instance[options].apply(instance, Array.prototype.slice.call(args, 1));

				if (options === 'destroy')
					$.data(this, 'plugin_' + pluginName, null);
			});

			return returns !== undefined ? returns : this;
		}
	};
}(jQuery, window, document));
