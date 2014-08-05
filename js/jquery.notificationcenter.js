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

			nc.x = 0;
			nc.notifs = {};
			nc._name = "notificationcenter";
			nc._defaults = {
				center_element:		"#notificationcenterpanel",
				body_element:		"#noticationcentermain",
				toggle_button:		"#notificationcentericon",
				add_panel:		true,
				notification_offset:	0,
				display_time:		5000,
				types:			[{
					type: 'system',
					img: 'fa fa-cogs',
					imgtype: 'class',
					bgcolor: '#222',
					color: '#fff'
				}],
				type_max_display:	5,
				truncate_message:	0,
				header_output:		'{icon} {type} {count}',
				counter:		true,
				title_counter:		true,
				default_notifs:		[],
				faye:			false,
				ajax:			false,
				ajax_checkTime:		5000,
				alert_hidden:		true,
				alert_hidden_sound:	'',
				store_callback:		false
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
				updatetitle();
			};

			nc.slide = function(callback, notif) {
				if (is_open()) {
					$(nc.options.center_element).css({
						zIndex: nc.options.zIndex.panel
					});
					$(nc.options.toggle_button).css({
						zIndex: nc.options.zIndex.button
					});

					$(nc.options.toggle_button).removeClass('close').addClass('open');

					$(nc.options.body_element).animate({
						right: '0px'
					}, {
						duration: 500,
						complete: function() {
							$('#notificationcenteroverlay').remove();
							$(nc.options.center_element).hide();
							if (typeof callback === 'function')
								callback(notif);
						}
					});
				} else {
					if (nc.options.counter) {
						$(nc.options.toggle_button).removeAttr('data-counter');
						if (nc.options.title_counter)
							updatetitle();
					}

					$(nc.options.center_element).show();
					nc.options.zIndex.panel = $(nc.options.center_element).css('zIndex');
					nc.options.zIndex.button = $(nc.options.toggle_button).css('zIndex');

					$(nc.options.toggle_button).removeClass('open').addClass('close');

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

					$(nc.options.body_element).animate({
						right: $(nc.options.center_element).outerWidth()
					}, {
						duration: 500,
						complete: function() {
							$(nc.options.center_element).css({
								zIndex: 1002
							});
							$(nc.options.toggle_button).css({
								zIndex: 1002
							});
						}
					});
				}
			};

					
			nc.faye = function(faye) {
				var client = new Faye.Client(faye.server);
				var subscription = client.subscribe(faye.channel, function(message) {
					nc.newAlert(message.text, message.type, true, message.callback, message.time);
				});
			}

			nc.ajax = function(ajaxobj, checktime) {
				if (typeof checktime === 'undefined' || !checktime)
					checktime = nc._defaults.ajax_checkTime;

				setInterval(function() {
					$.ajax(ajaxobj).done(function(data) {
						if (data) {
							if ($.isArray(data)) {
								$.each(data, function(k, v) {
									if ($.isArray(v))
										nc.newAlert(v[0], v[1], true, v[2], v[3]);
									else
										nc.newAlert(v.text, v.type, true, v.callback, v.time);
								});
							}
						}
					});
				}, checktime);
			};

			nc.alert = function(text, type) {
				if (typeof type === 'undefined')
					type = 'system';

				var notifnumber = $('.notificationul').find('li').length + 1;
				var notiftype = (typeof nc.types[type] !== 'undefined')?nc.types[type]:nc.types['system'];
				var textstr = text;

				if (notiftype.truncate_message)
					textstr = truncatemsg(text, notiftype.truncate_message);

				if ($('.notificationul').length === 0) {
					$(nc.options.body_element).prepend('<ul class="notificationul"></ul>');

					$('.notificationul').css({
						top: nc.options.notification_offset
					});
				}

				$('.notificationul').prepend('<li id="box' + notifnumber + '"><div class="notification">' + closenotif() + '<div class="iconnotif"><div class="iconnotifimg">' + notiftype.icon + '</div></div><div class="contentnotif">' + textstr + '</div></div></li>');

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
				}, nc.options.display_time, '#box' + notifnumber);

				$('#box' + notifnumber + ' .closenotif').on('click', function() {
					$(this).parents('li').css({
						right: '-' + $('#box' + notifnumber).outerWidth() + 20 + 'px'
					}).fadeOut(500, function() {
						$(this).remove();
					});
				});

				if (notiftype.alert_hidden)
					notiftype.snd.play();
			};

			nc.newAlert = function(text, type, displayNotification, callback, time) {
				if (typeof displayNotification === 'undefined')
					displayNotification = true;

				if (typeof callback === 'undefined')
					callback = false;

				var notifnumber = getNotifNum();

				if (!is_open() && displayNotification) {
					nc.alert(text, type);

					if (nc.options.counter) {
						if ($(nc.options.toggle_button).attr('data-counter') === undefined) {
							$(nc.options.toggle_button).attr('data-counter', 1);
							if (nc.options.title_counter)
								updatetitle();
						} else {
							var counter = parseInt($(nc.options.toggle_button).attr('data-counter')) + 1;

							$(nc.options.toggle_button).attr('data-counter', counter);
							if (nc.options.title_counter)
								updatetitle();
						}
					}
				}

				if (jQuery().livestamp && typeof time === 'undefined') {
					var date = new Date();
					time = Math.round(date.getTime() / 1000);
				}

				notifcenterbox(type, text, time, notifnumber, callback);
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
					$(watchele).on('mouseover', function() {
						clearTimeout(timer);
						seconds++;
					});

					$(watchele).on('mouseout', function() {
						counter();
					});
				}
			}

			function prevent_default(e) {
				e.preventDefault();
			}

			function disable_scroll() {
				$(document).on('touchmove', prevent_default);
			}

			function enable_scroll() {
				$(document).unbind('touchmove', prevent_default);
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

				if (nc.options.add_panel &&
					$(nc.options.center_element).length === 0)
						$(nc.element).prepend('<div id="' + nc.options.center_element.replace('#', '') + '"></div>');

				// Line it up with body_element
				var bposition = $(nc.options.body_element).position();
				$(nc.options.center_element).hide();
				$(nc.options.center_element).css({
					position: 'absolute',
					top: bposition.top,
					right: '0px'
				});

				// Make sure body element has position: absolute or relative
				var bodyPos = $(nc.options.body_element).css('position');
				if (bodyPos != 'relative' ||
				    bodyPos != 'absolute')
					bodyPos = 'absolute';

				$(nc.options.body_element).css({
					position: bodyPos,
					top: bposition.top,
					right: '0px',
					width: '100%',
					height: '100%',
					overflow: 'auto'
				});

				$(nc.options.toggle_button).addClass('notificationcentericon');

				if (window.HTMLAudioElement &&
				    nc.options.alert_hidden)
					nc._defaults['snd'] = new Audio('');
				else
					nc._defaults['alert_hidden'] = false;

				nc.captureTitle()
				bindings();
				buildTypes();

				if (nc.options.default_notifs.length > 0) {
					$(nc.options.default_notifs).each(function(index, item) {
						var type = item.type;

						$(item.values).each(function(i, notif) {
							nc.newAlert(notif.text, type, false, notif.callback, notif.time);
						});
					});
				}

				if (nc.options.faye !== false)
					nc.faye(nc.options.faye);

				if (nc.options.ajax !== false)
					nc.ajax(nc.options.ajax, nc.options.ajax_checkTime);
			}

			function buildTypes() {
				nc.types = {};

				$.each(nc.options.types, function(k, v) {
					nc.types[v.type] = getnotiftype(v.type);
				});

				$.each(nc.options.types, function(k, v) {
					nc.types[v.type] = getnotiftype(v.type);
				});
			}

			function bindings() {
				$(nc.options.toggle_button).on('click', function() {
					nc.slide();
					return false;
				});

				$(nc.options.body_element).on('scroll', function(e) {
					$('.notificationul').css({
						top: nc.options.notification_offset + e.target.scrollTop
					});
				});
			}

			function is_open() {
				return $(nc.options.center_element).is(':visible');
			}

			function updatetitle() {
				var title = nc.options.title;
				var count = parseInt($(nc.options.toggle_button).attr('data-counter')) || false;

				if (count)
					title = "(" + count + ") " + title;

				document.title = title;
			}

			function getnotiftype(type) {
				var index = inArray(type, nc.options.types);
				var notiftype;

				if (index !== false)
					notiftype = nc.options.types[index];
				else
					notiftype = nc._default.types[0];

				notiftype['index'] = index;

				if (typeof notiftype.bgcolor === 'undefined')
					notiftype['bgcolor'] = nc._defaults.types[0].bgcolor

				if (typeof notiftype.color === 'undefined')
					notiftype['color']  = nc._defaults.types[0].bgcolor;

				if (typeof notiftype.imgtype === 'undefined')
					notiftype['imgtype'] = 'image';

				if (typeof notiftype.truncate_message === 'undefined')
					notiftype['truncate_message'] = nc.options.truncate_message;

				if (typeof notiftype.header_output === 'undefined')
					notiftype['header_output'] = nc.options.header_output;

				if (typeof notiftype.type_max_display === 'undefined')
					notiftype['type_max_display'] = nc.options.type_max_display;

				if (typeof notiftype.alert_hidden === 'undefined')
					notiftype['alert_hidden'] = nc.options.alert_hidden;

				if (typeof notiftype.alert_hidden_sound === 'undefined')
					notiftype['alert_hidden_sound'] = nc.options.alert_hidden_sound;

				notiftype['snd'] = setSound(notiftype);

				if (notiftype.imgtype == 'class')
					notiftype['icon'] = '<i class="' + notiftype.img + '"></i>';
				else
					notiftype['icon'] = '<img src="' + notiftype.img + '">';

				return notiftype;
			}

			function setSound(notiftype) {
				if (nc._defaults.alert_hidden === true &&
				    notiftype.alert_hidden === true) {
					if (nc._defaults.snd.canPlayType('audio/ogg'))
						return new Audio(notiftype.alert_hidden_sound + '.ogg');
					else if (nc._defaults.snd.canPlayType('audio/mp3'))
						return new Audio(notiftype.alert_hidden_sound + '.mp3');
				}

				return false;
			}

			// WhiteSpace/LineTerminator as defined in ES5.1 plus Unicode characters in the Space, Separator category.
			function getTrimmableCharacters() {
				return '\u0009\u000A\u000B\u000C\u000D\u0020\u00A0\u1680\u180E\u2000\u2001\u2002\u2003\u2004\u2005\u2006\u2007\u2008\u2009\u200A\u202F\u205F\u2028\u2029\u3000\uFEFF';
			}

			function truncateOnWord(str, limit) {
				var reg = RegExp('(?=[' + getTrimmableCharacters() + '])');
				var words = str.split(reg);
				var count = 0;

				return words.filter(function(word) {
					count += word.length;
					return count <= limit;
				}).join('');
			}

			function truncatemsg(msg, length) {
				var mlength = msg.length;
				var ellipse = '&hellip;';
				var tmsg = msg;

				if (mlength > length)
					tmsg = truncateOnWord(msg, length) + ellipse;

				return tmsg;
			}

			function notifcenterbox(type, text, time, number, callback) {
				nc.notifs[number] = {
					type: type,
					text: text,
					time: time,
					callback: callback
				}

				var notiftype = nc.types[type];
				var textstr = text;

				if (notiftype.truncate_message)
					textstr = truncatemsg(text, notiftype.truncate_message);

				if ($(nc.options.center_element + ' .center' + type).length === 0)
					centerHeader(notiftype);

				var str = '<li id="notif' + number + '"><div class="notifcenterbox">' + closenotif() + textstr;

				if (time)
					str += '<br><small data-livestamp="' + time + '"></small>';

				str += '</div></li>';

				$(nc.options.center_element + ' .center' + type + ' ul').prepend(str);

				$('#notif' + number + ' .closenotif').on('click', function() {
					removeNotif($(this).parents('li'));
				});

				if (typeof callback === 'function') {
					$('#notif' + number).on('click', function() {
						nc.slide(callback, nc.notifs[number]);
					});

					$('#notif' + number).css({
						cursor: 'pointer'
					});
				}

				hideNotifs(type);
			}

			function centerHeader(notiftype) {
				var s = nc.options.header_output
					.replace(/\{icon\}/gi, function(m, n) {
                                        	return notiftype.icon;
                                	})
					.replace(/\{type\}/gi, function(m, n) {
                                        	return notiftype.type;
                                	})
					.replace(/\{count\}/gi, function(m, n) {
                                        	return '<div class="notiftypecount"></div>';
                                	});

				$(nc.options.center_element).prepend('<div class="centerlist center' + notiftype.type + '"><div class="centerheader" style="background-color: ' + notiftype.bgcolor + '; color: ' + notiftype.color + ';">' + s + closenotif() + '</div><ul></ul></div>');

				$(nc.options.center_element).find('.centerlist.center' + notiftype.type).find('.closenotif').on('click', function() {
					removeNotifType(notiftype.type);
				});
			}

			function closenotif() {
				return '<div class="closenotif"><i class="fa fa-times"></i></div>';
			}

			function hideNotifs(type) {
				var notifications = $(nc.options.center_element + ' .center' + type + ' ul li');
				var count = notifications.length;
				var notiftype = nc.types[type];

				$(nc.options.center_element + ' .center' + type).find('.notiftypecount').text('(' + count + ')');

				if (notiftype.type_max_display > 0) {
					var notifno = 0;
					$.each(notifications, function(k, v) {
						if (notifno < notiftype.type_max_display)
							$(notifications[k]).show();
						else
							$(notifications[k]).hide();	

						notifno++;
					});
				}

				if (typeof nc.options.store_callback === 'function')
					nc.options.store_callback(nc.notifs);
			}

			function removeNotifType(type) {
				$(nc.options.center_element).find('.centerlist.center' + type).find('li').each(function() {
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
