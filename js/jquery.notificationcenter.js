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
!(function($) {
	"use strict";
	$.extend({
		/*jshint supernew:true */
		notificationcenter: new function() {
			var nc = this;

			nc.notifs = {};
			nc._name = "notificationcenter";
			nc._defaults = {
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
			}

			/* public methods */
			nc.construct = function(settings) {
				return this.each(function() {
					nc.element = this;

					// merge & extend config options
					nc.options = $.extend( {}, nc._defaults, settings) ;
					nc.options.originalOptions = settings;

					nc.options.zIndex = {
						panel: 0,
						button: 0
					};
					nc.options.title = document.title;
					nc.options.snd = false;
					nc.options.hiddentype = false;

					setup();
				});
			};

			nc.captureTitle = function(title) {
				if (typeof title === 'undefined')
					title = document.title.replace(/^\([0-9]+\) /, '');

				nc.options.title = title;
			};

			nc.slide = function() {
				if (is_open()) {
					$(nc.options.centerElement).css({
						zIndex: nc.options.zIndex.panel
					});
					$(nc.options.toggleButton).css({
						zIndex: nc.options.zIndex.button
					});

					$(nc.options.toggleButton).removeClass('close').addClass('open');

					$(nc.options.bodyElement).animate({
						right: '0px'
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
							updatetitle();
					}

					$(nc.options.centerElement).show();
					nc.options.zIndex.panel = $(nc.options.centerElement).css('zIndex');
					nc.options.zIndex.button = $(nc.options.toggleButton).css('zIndex');

					$(nc.options.toggleButton).removeClass('open').addClass('close');
					$(nc.options.bodyElement).animate({
						right: $(nc.options.centerElement).outerWidth()
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

					
			nc.fayeAlert = function(faye) {
				var client = new Faye.Client(faye.server);
				var subscription = client.subscribe(faye.channel, function(message) {
					nc.newAlert(message.text, message.type);
				});
			}

			nc.ajaxAlert = function(ajaxobj, checktime) {
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

			nc.newAlert = function(text, type, displayNotification) {
				if (typeof displayNotification === 'undefined')
					displayNotification = false;

				var notifnumber = getNotifNum();

				if (!is_open() && !displayNotification) {
					if ($('.notificationul').length === 0) {
						$(nc.options.bodyElement).prepend('<ul class="notificationul"></ul>');

						$('.notificationul').css({
							top: nc.options.notification_offset
						});

						// Add top padding if panel isn't at the top
						var bposition = $(nc.options.bodyElement).position();
						if (bposition.top > 0)
							$('.notificationul').css({
								'padding-top': bposition.top
							});
					}

					var index = inArray(type, nc.options.types);
					var icon = '<i class="' + nc._defaults.types[0].img + '"></i>';

					if (index !== false) {
						if (nc.options.types[index].imgtype == 'class')
							icon = '<i class="' + nc.options.types[index].img + '"></i>';
						else
							icon = '<img src="' + nc.options.types[index].img + '">';
					}

					$('.notificationul').prepend('<li id="box' + notifnumber + '"><div class="notification">' + closenotif() + '<div class="iconnotif"><div class="iconnotifimg">' + icon + '</div></div><div class="contentnotif">' + text + '</div></div></li>');

					$('#box' + notifnumber).css({
						right: '0px',
						position: 'relative'
					}).fadeIn(500);

					ncTimeout(function() {
						$('#box' + notifnumber).css({
							right: '-' + $('#box' + notifnumber).outerWidth() + 20 + 'px'
						}).fadeOut(500, function() {
							$(this).remove();
						});
					}, nc.options.displayTime, '#box' + notifnumber);

					$('#box' + notifnumber + ' .closenotif').on('click', function() {
						$(this).parents('li').css({
							right: '-' + $('#box' + notifnumber).outerWidth() + 20 + 'px'
						}).fadeOut(500, function() {
							$(this).remove();
						});
					});

					if (nc.options.counter) {
						if ($(nc.options.toggleButton).attr('data-counter') === undefined) {
							$(nc.options.toggleButton).attr('data-counter', 1);
							if (nc.options.title_counter)
								updatetitle();
						} else {
							var counter = parseInt($(nc.options.toggleButton).attr('data-counter')) + 1;

							$(nc.options.toggleButton).attr('data-counter', counter);
							if (nc.options.title_counter)
								updatetitle();
						}
					}

					if (nc.options.alert_hidden &&
					    document[nc.options.hiddentype] &&
					    nc.options.snd)
						nc.options.snd.play();
				}

				var time = 0;
				if (jQuery().livestamp) {
					var date = new Date();
					time = Math.round(date.getTime() / 1000);
				}

				notifcenterbox(type, text, time, notifnumber);
			};

			/* private functions */
			// Helpers
			function inArray(needle, haystack) {
				var length = haystack.length;

				for (var i = 0; i < length; i++) {
					if (haystack[i].type === needle)
						return i;
				}

				return false;
			}

			function ncTimeout(func, timeout, watchele) {
				var seconds = timeout / 1000;
				var done = false;
				var timer;

				var counter = function() {
					if (!done) {
						seconds--;

						timer = setTimeout(function() {
							counter();
						}, 1000);
					}

					if (seconds < 1) {
						done = true;
						clearTimeout(timer);
						func();
					}
				}

				counter();

				if (typeof watchele !== 'undefined') {
					$(watchele).bind('mouseover', function() {
						clearTimeout(timer);
						seconds++;
					});

					$(watchele).bind('mouseout', function() {
						counter();
					});
				}
			}

			// Plugin Functions
			function setup() {
				if (typeof document.hidden !== "undefined")
					nc.options.hiddentype = "hidden";
				else if (typeof document.mozHidden !== "undefined")
					nc.options.hiddentype = "mozHidden";
				else if (typeof document.msHidden !== "undefined")
					nc.options.hiddentype = "msHidden";
				else if (typeof document.webkitHidden !== "undefined")
					nc.options.hiddentype = "webkitHidden";

				if (nc.options.addPanel &&
					$(nc.options.centerElement).length === 0)
						$(nc.element).prepend('<div id="' + nc.options.centerElement.replace('#', '') + '"></div>');

				// Line it up with bodyElement
				var bposition = $(nc.options.bodyElement).position();
				$(nc.options.centerElement).hide();
				$(nc.options.centerElement).css({
					position: 'absolute',
					top: bposition.top,
					right: '0px'
				});

				// Make sure body element has position: absolute or relative
				var bodyPos = $(nc.options.bodyElement).css('position');
				if (bodyPos != 'relative' ||
				    bodyPos != 'absolute')
					bodyPos = 'absolute';

				$(nc.options.bodyElement).css({
					position: bodyPos,
					top: bposition.top,
					right: '0px',
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
						nc.options.snd = new Audio(nc.options.alert_hidden_sound + '.ogg');
					else if (snd.canPlayType('audio/mp3'))
						nc.options.snd = new Audio(nc.options.alert_hidden_sound + '.mp3');
				}

				nc.captureTitle()
				bindings();

				if (nc.options.default_notifs.length > 0) {
					$(nc.options.default_notifs).each(function(index, item) {
						var type = item.type;

						$(item.values).each(function(i, notif) {
							// notif.time
							nc.newAlert(notif.text, type, true);
						});
					});
				}

				if (nc.options.faye !== false)
					nc.fayeAlert(nc.options.faye);

				if (nc.options.ajax !== false)
					nc.ajaxAlert(nc.options.ajax, nc.options.ajax_checkTime);
			}

			function bindings() {
				$(nc.options.toggleButton).on('click', function() {
					nc.slide();
					return false;
				});
			}

			function is_open() {
				return $(nc.options.centerElement).is(':visible');
			}

			function updatetitle() {
				var title = nc.options.title;
				var count = parseInt($(nc.options.toggleButton).attr('data-counter')) || false;

				if (count)
					title = "(" + count + ") " + title;

				document.title = title;
			}

			function notifcenterbox(type, text, time, number) {
				nc.notifs[number] = {
					type: type,
					text: text,
					time: time
				}

				if ($(nc.options.centerElement + ' .center' + type).length === 0) {
					var index = inArray(type, nc.options.types);

					centerHeader(type, index);
				}

				var str = '<li id="notif' + number + '"><div class="notifcenterbox">' + closenotif() + text;

				if (time)
					str += '<br><small data-livestamp="' + time + '"></small>';

				str += '</div></li>';

				$(nc.options.centerElement + ' .center' + type + ' ul').prepend(str);

				$('#notif' + number + ' .closenotif').on('click', function() {
					removeNotif($(this).parents('li'));
				});

				hideNotifs(type);
			}

			function centerHeader(type, index) {
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

				$(nc.options.centerElement).prepend('<div class="centerlist center' + type + '"><div class="centerheader" style="background-color: ' + bgcolor + '; color: ' + color + ';">' + icon + type + closenotif() + '</div><ul></ul></div>');

				$(nc.options.centerElement).find('.centerlist.center' + type).find('.closenotif').on('click', function() {
					removeNotifType(type);
				});
			}

			function closenotif() {
				return '<div class="closenotif"><i class="fa fa-times"></i></div>';
			}

			function hideNotifs(type) {
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
			}

			function removeNotifType(type) {
				$(nc.options.centerElement).find('.centerlist.center' + type).find('li').each(function() {
					removeNotif(this);
				});
			}

			function removeNotif (notif) {
				var notifnumber = $(notif).attr('id');
				notifnumber = notifnumber.replace('notif', '');

				$(notif).css({
					right: '-' + $(notif).outerWidth() + 20 + 'px'
				}).fadeOut(500, function() {
					if ($(notif).parents('ul').find('li').length <= 1)
						$(notif).parents('.centerlist').remove();

					$(this).remove();

					hideNotifs(type);
				});

				var type = nc.notifs[notifnumber].type;

				delete nc.notifs[notifnumber];
			}

			function getNotifNum() {
				var notifnumber = false;
				while(!notifnumber || typeof nc.notifs[notifnumber] !== 'undefined')
					notifnumber = Math.floor(Math.random() * 1199999);

				nc.notifs[notifnumber] = {};

				return notifnumber;
			}
		}()
	});

	// make shortcut
	var nc = $.notificationcenter;

	// extend plugin scope
	$.fn.extend({
		notificationcenter: nc.construct
	});
})(jQuery);
