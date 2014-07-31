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
	var notifs = {};
	var pluginName = "notificationcenter";
	var defaults = {
		centerElement:		"#notificationcenterpanel",
		bodyElement:		"#noticationcentermain",
		toggleButton:		"#notificationcentericon",
		addPanel:		true,
		notification_offset:	0,
		displayTime:		5000,
		types:			[{
						type: 'system',
						img: 'fa fa-cogs',
						imgtype: 'class',
						bgcolor: '#222',
						color: '#fff'
					}],
		typeMaxDisplay:		5,
		counter:		true,
		title_counter:		true,
		default_notifs:		[],
		faye:			false,
		ajax:			false,
		ajax_checkTime:		5000,
		alert_hidden:		true,
		alert_hidden_sound:	''
	};

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

		if (typeof document.hidden !== "undefined")
			nc.hiddentype = "hidden";
		else if (typeof document.mozHidden !== "undefined")
			nc.hiddentype = "mozHidden";
		else if (typeof document.msHidden !== "undefined")
			nc.hiddentype = "msHidden";
		else if (typeof document.webkitHidden !== "undefined")
			nc.hiddentype = "webkitHidden";

		nc._defaults = defaults;
		nc._name = pluginName;
		nc.notifs = notifs;
        
		nc.init();
	}

	// Start helper prototypes
	Plugin.prototype.indexOfBy = function(obj, name, value) {
		$.each(obj, function(k, v) {
			if (v[name] == value)
				return k;
		});

		return false;
	};

	Plugin.prototype.lengthBy = function(obj, name, value) {
		var count = 0;

		$.each(obj, function(k, v) {
			if (v[name] == value)
				count++;
		});

		return count;
	};

	Array.prototype.inArray = function(needle) {
		var length = this.length;

		for (var i = 0; i < length; i++) {
			if (this[i].type === needle)
				return i;
		}

		return false;
	};

	// Start Prototypes
	Plugin.prototype.init = function () {
		if (nc.options.addPanel &&
		    $(nc.options.centerElement).length === 0)
			$('body').prepend('<div id="' + nc.options.centerElement.replace('#', '') + '"></div>');

		// Line it up with bodyElement
		var bposition = $(nc.options.bodyElement).position();
		$(nc.options.centerElement).hide();
		$(nc.options.centerElement).css({
			position: 'absolute',
			top: bposition.top,
			right: 0
		});

		// Make sure body element has position: absolute or relative
		var bodyPos = $(nc.options.bodyElement).css('position');
		if (bodyPos != 'relative' ||
		    bodyPos != 'absolute')
			bodyPos = 'absolute';
		$(nc.options.bodyElement).css({
			position: bodyPos,
			top: bposition.top,
			right: 0,
			width: '100%',
			height: '100%',
			overflow: 'auto'
		});

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

		nc.captureTitle()
		nc.listener();

		if (nc.options.default_notifs.length > 0) {
			$(nc.options.default_notifs).each(function(index, item) {
				var type = item.type;

				$(item.values).each(function(i, notif) {
					// notif.time
					nc.newAlert(notif.text, type, true);
				});
			});
		}

		if (nc.options.faye !== false) {
			var client = new Faye.Client(nc.options.faye.server);
			var subscription = client.subscribe(nc.options.faye.channel, function(message) {
				nc.newAlert(message.text, message.type);
			});            
		}

		if (nc.options.ajax !== false) {
			nc.ajaxAlerts(nc.options.ajax, nc.options.ajax_checkTime);
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

	Plugin.prototype.notifcenterbox = function(type, text, time, number) {
		nc.notifs[number] = {
			type: type,
			text: text,
			time: time
		}

		if ($(nc.options.centerElement + ' .center' + type).length === 0) {
			var index = nc.options.types.inArray(type);

			nc.centerHeader(type, index);
		}

		var str = '<li id="notif' + number + '"><div class="notifcenterbox">' + nc.closenotif() + text;

		if (time)
			str += '<br><small data-livestamp="' + time + '"></small>';

		str += '</div></li>';

		$(nc.options.centerElement + ' .center' + type + ' ul').prepend(str);

		$('#notif' + number + ' .closenotif').on('click', function() {
			nc.removeNotif($(this).parents('li'));
		});

		nc.hideNotifs(type);
	}


	Plugin.prototype.centerHeader = function(type, index) {
		var string = '';
		var icon = '<i class="' + nc._defaults.types[0].img + '"></i>';
		var bgcolor  = (index === false || typeof nc.options.types[index].bgcolor === 'undefined')?nc._defaults.types[0].bgcolor:nc.options.types[index].bgcolor;
		var color  = (index === false || typeof nc.options.types[index].color === 'undefined')?nc._defaults.types[0].bgcolor:nc.options.types[index].color;

		if (index !== false) {
			if (nc.options.types[index].imgtype == 'class')
				icon = '<i class="' + nc.options.types[index].img + '"></i>';
			else
				icon = '<img src="' + nc.options.types[index].img + '">';
		}

		$(nc.options.centerElement).prepend('<div class="centerlist center' + type + '"><div class="centerheader" style="background-color: ' + bgcolor + '; color: ' + color + ';">' + icon + type + nc.closenotif() + '</div><ul></ul></div>');

		$(nc.options.centerElement).find('.centerlist.center' + type).find('.closenotif').on('click', function() {
			nc.removeNotifType(type);
		});
	};

	Plugin.prototype.closenotif = function() {
		return '<div class="closenotif"><i class="fa fa-times"></i></div>';
	}

	Plugin.prototype.captureTitle = function(title) {
		if (typeof title === 'undefined')
			title = document.title.replace(/^\([0-9]+\) /, '');

		nc.options.title = title;
	};

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

	Plugin.prototype.ajaxAlerts = function(ajaxobj, checktime) {
		if (typeof checktime === 'undefined' || !checktime)
			checktime = nc._defaults.ajax_checkTime;

		setInterval(function() {
			$.ajax(ajaxobj).done(function(data) {
				if (data) {
					if ($.isArray(data)) {
						$.each(data, function(k, v) {
							if ($.isArray(v))
								nc.newAlert(v[0], v[1]);
							else
								nc.newAlert(v.text, v.type);
						});
					}
					
				}
			});
		}, checktime);
	};

	Plugin.prototype.hideNotifs = function(type) {
		if (nc.options.typeMaxDisplay > 0) {
			var notifications = $(nc.options.centerElement + ' .center' + type + ' ul li');
			var count = notifications.length;

			var notifno = 0;
			$.each(notifications, function(k, v) {
				if (notifno < nc.options.typeMaxDisplay)
					$(notifications[k]).show();
				else
					$(notifications[k]).hide();	

				notifno++;
			});
		}
	};

	Plugin.prototype.removeNotifType = function(type) {
		$(nc.options.centerElement).find('.centerlist.center' + type).find('li').each(function() {
			nc.removeNotif(this);
		});
	};

	Plugin.prototype.removeNotif = function(notif) {
		var notifnumber = $(notif).attr('id');
		notifnumber = notifnumber.replace('notif', '');

		$(notif).css({
			right: '-450px'
		}).fadeOut(500, function() {
			if ($(notif).parents('ul').find('li').length <= 1)
				$(notif).parents('.centerlist').remove();

			$(this).remove();

			nc.hideNotifs(type);
		});

		var type = nc.notifs[notifnumber].type;

		delete nc.notifs[notifnumber];
	};

	Plugin.prototype.getNotifNum = function() {
		var notifnumber = false;
		while(!notifnumber || typeof nc.notifs[notifnumber] !== 'undefined')
			notifnumber = Math.floor(Math.random() * 1199999);

		nc.notifs[notifnumber] = {};

		return notifnumber;
	};

	Plugin.prototype.newAlert = function(text, type, displayNotification) {
		if (typeof displayNotification === 'undefined')
			displayNotification = false;

		var notifnumber = nc.getNotifNum();

		if (!nc.is_open() && !displayNotification) {
			if ($('.notificationul').length === 0) {
				$(nc.options.bodyElement).prepend('<ul class="notificationul"></ul>');

				$('.notificationul').css({
					top: nc.options.notification_offset
				});
			}

			var index = nc.options.types.inArray(type);
			var icon = '<i class="' + nc._defaults.types[0].img + '"></i>';

			if (index !== false) {
				if (nc.options.types[index].imgtype == 'class')
					icon = '<i class="' + nc.options.types[index].img + '"></i>';
				else
					icon = '<img src="' + nc.options.types[index].img + '">';
			}

			$('.notificationul').prepend('<li id="box' + notifnumber + '"><div class="notification">' + nc.closenotif() + '<div class="iconnotif"><div class="iconnotifimg">' + icon + '</div></div><div class="contentnotif">' + text + '</div></div></li>');

			$('#box' + notifnumber).css({
				right: '0px',
				position: 'relative'
			}).fadeIn(500);

			window.setTimeout(function() {
				$('#box' + notifnumber).css({
					right: '-450px'
				}).fadeOut(500, function() {
					$(this).remove();
				});
			}, nc.options.displayTime);

			$('#box' + notifnumber + ' .closenotif').on('click', function() {
				$(this).parents('li').css({
					right: '-450px'
				}).fadeOut(500, function() {
					$(this).remove();
				});
			});

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

		var time = 0;
		if (jQuery().livestamp) {
			var date = new Date();
			time = Math.round(date.getTime() / 1000);
		}

		nc.notifcenterbox(type, text, time, notifnumber);
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
