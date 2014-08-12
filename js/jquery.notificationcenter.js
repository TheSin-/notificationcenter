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
			nc.init = false;
			nc.mobile = false;
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

					nc.init = true;

					if (typeof nc.options.store_callback === 'function')
						nc.options.store_callback(nc.notifs);
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
					}, 'slow', function() {
						$('#notificationcenteroverlay').remove();
						$(nc.options.center_element).hide();
						if (typeof callback === 'function') {
							callback(notif);
							removeNotif($('#notif' + notif.id));
						}
					});
				} else {
					$('.notificationul li').each(function() {
						$(this).remove();
					});

					$.each(nc.notifs, function(k, notif) {
						notif.new = false;
					});

					if (nc.options.counter)
						notifcount();

					if (typeof nc.options.store_callback === 'function' && nc.init === true)
						nc.options.store_callback(nc.notifs);
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
					}, 'slow', function() {
						$(nc.options.center_element).css({
							zIndex: 1002
						});
						$(nc.options.toggle_button).css({
							zIndex: 1002
						});
					});
				}
			};

					
			nc.faye = function(faye) {
				var client = new Faye.Client(faye.server);
				var subscription = client.subscribe(faye.channel, function(message) {
					nc.newAlert(message.text, message.type, true, message.callback, message.time, message.new);
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
									var text = '';
									var type = 'system';
									var time = date.getTime()/1000;
									var callback = false;
									var newnotif = true;
									if ($.isArray(v)) {
										if (typeof v[0] !== 'undefined')
											text = v[0];
										if (typeof v[1] !== 'undefined')
											type = v[1];
										if (typeof v[2] !== 'undefined')
											callback = v[2];
										if (typeof v[3] !== 'undefined')
											time = v[3];
										if (typeof v[4] !== 'undefined')
											newnotif = v[4];
									} else {
										if (typeof v.text !== 'undefined')
											text = v.text;
										if (typeof v.type !== 'undefined')
											type = v.type;
										if (typeof v.callback !== 'undefined')
											callback = v.callback;
										if (typeof v.time !== 'undefined')
											time = v.time;
										if (typeof v.new !== 'undefined')
											newnotif = v.new;
									}

									nc.newAlert(text, type, true, callback, time, newnotif);
								});
							}
						}
					});
				}, checktime);
			};

			nc.alert = function(text, type, callback, notifnumber) {
				if (typeof type === 'undefined')
					type = 'system';

				var removenotif = true;
				if (typeof notifnumber === 'undefined') {
					notifnumber = $('.notificationul').find('li').length + 1;
					removenotif = false;
				}

				var notiftype = (typeof nc.types[type] !== 'undefined')?nc.types[type]:nc.types['system'];

				var textstr = '';
				var title = '';
				if (typeof text === 'object') {
					textstr = text.text;
					title = '<h3>' + text.title + '</h3>';
				} else {
					textstr = text;
				}

				if (notiftype.truncate_message)
					textstr = truncatemsg(textstr, notiftype.truncate_message);

				if ($('.notificationul').length === 0) {
					$(nc.element).prepend('<ul class="notificationul"></ul>');

					$('.notificationul').css({
						'padding-top': nc.options.notification_offset
					});

					$(window).trigger("scroll")
				}

				$('.notificationul').prepend('<li id="box' + notifnumber + '"><div class="notification"><div class="iconnotif"><div class="iconnotifimg">' + notiftype.icon + '</div></div><div class="contentnotif">' + title + textstr + '</div></div></li>');

				$('#box' + notifnumber).css({
					'top': '-' + ($('#box' + notifnumber).outerHeight(true) + nc.options.notification_offset) + 'px',
					'right': 0
				}).show();

				$('#box' + notifnumber).animate({
					'top': 0
				}, 'slow');

				if (notiftype.display_time) {
					ncTimeout(function() {
						$('#box' + notifnumber).animate({
							right: '-' + $('#box' + notifnumber).outerWidth(true) + 'px'
						}, 'slow', function() {
							$(this).remove();
						});
					}, notiftype.display_time, '#box' + notifnumber);
				}

				var notif = {};
				if (typeof nc.notifs[notifnumber] !== 'undefined')
					notif = nc.notifs[notifnumber];

				$('#box' + notifnumber).on('click', function() {
					$(this).animate({
						right: '-' + $('#box' + notifnumber).outerWidth(true) + 'px'
					}, 'slow', function() {
						$(this).remove();

						if (typeof callback === 'function')
							callback(notif);

						if (removenotif)
							removeNotif($(nc.options.center_element).find('.centerlist.center' + notif.type).find('#notif' + notif.id));
					});
				});

				if (notiftype.alert_hidden &&
				    document[nc.options.hiddentype])
					notiftype.snd.play();
			};

			nc.newAlert = function(text, type, showNotification, callback, time, newnotif) {
				if (typeof showNotification === 'undefined')
					showNotification = true;

				if (typeof callback === 'undefined')
					callback = false;
				else if (typeof callback !== 'function')
					eval('callback = ' + callback);

				if (typeof newnotif === 'undefined')
					newnotif = true;

				if (callback == 'false')
					callback = false;

				if (typeof time !== 'number')
					time = parseFloat(time) || false;

				if (time < 1 || time == '0' || time == '' ||
				    typeof time === 'undefined')
					time = false;

				if (newnotif == 'false')
					newnotif = false;
				else if (newnotif == 'true')
					newnotif = true;

				if (is_open())
					newnotif = false;

				var notiftype = (typeof nc.types[type] !== 'undefined')?nc.types[type]:nc.types['system'];
				type = notiftype.type;

				if (notiftype.display_time === 0 && 
				    showNotification) {
					nc.alert(text, type, callback);
					return;
				}

				var notifnumber = getNotifNum();

				if (jQuery().livestamp && time === false) {
					var date = new Date();
					time = Math.round(date.getTime() / 1000);
				}

				notifcenterbox(type, text, time, notifnumber, callback, newnotif);

				if (nc.options.counter)
					notifcount();

				if (!is_open() && showNotification)
					nc.alert(text, type, callback, notifnumber);
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
				if (typeof $.mobile !== 'undefined')
					if ($.mobile.support.touch)
						nc.mobile = true;

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
						$(nc.element).prepend('<div id="' + nc.options.center_element.replace('#', '') + '"><div class="nonew"><div>No New Notifications</div></div></div>');

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
				if (bodyPos != 'relative' &&
				    bodyPos != 'absolute') {
					bodyPos = 'absolute';
					$(nc.options.body_element).css({
						position: 'absolute',
						top: bposition.top
					});
				}

				$(nc.options.body_element).css({
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
							nc.newAlert(notif.text, type, false, notif.callback, notif.time, notif.new);
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

			var pinchToZoomCheckTimer;
			var mobilewindow = {
				top: 0,
				left: 0,
				doc: 0,
				view: 0
			};
			function bindings() {
				$(nc.options.toggle_button).on('click', function() {
					nc.slide();
					return false;
				});

				$(window).on("resize scroll", function (e) {
					mobilewindow.doc = $(document).outerWidth();

					clearTimeout(pinchToZoomCheckTimer);
					pinchToZoomCheckTimer = setTimeout(function () {
						mobilewindow.top = window.pageYOffset;
						mobilewindow.left = window.pageXOffset;
						mobilewindow.view = window.innerWidth;
						$(nc.options.body_element).trigger('mobilechange');
					}, 50);
				});

				$(nc.options.body_element).on('scroll mobilechange', function(e) {
					var ultop = 0;
					if (e.target.scrollTop > nc.options.notification_offset ||
					    mobilewindow.top > nc.options.notification_offset)
						ultop = mobilewindow.top - nc.options.notification_offset;

					var ulright = (mobilewindow.doc - mobilewindow.view) - mobilewindow.left;

					if (is_open)
						ulright += $(nc.options.panel_element).outerWidth();
					
					$('.notificationul').css({
						'top': ultop,
						'right': ulright
					});
				});
			}

			function is_open() {
				return $(nc.options.center_element).is(':visible');
			}

			function notifcount() {
				var counter = 0;
				$.each(nc.notifs, function(k, notif) {
					if (notif.new === true)
						counter++;
				});

				if (counter > 0)
					$(nc.options.toggle_button).attr('data-counter', counter);
				else
					$(nc.options.toggle_button).removeAttr('data-counter');

				if (nc.options.title_counter)
					updatetitle();
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

				if (typeof notiftype.display_time === 'undefined')
					notiftype['display_time'] = nc.options.display_time;

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

			function notifcenterbox(type, text, time, number, callback, newnotif) {
				nc.notifs[number] = {
					new: newnotif,
					id: number,
					type: type,
					text: text,
					time: time,
					callback: callback.toString()
				}

				var notiftype = (typeof nc.types[type] !== 'undefined')?nc.types[type]:nc.types['system'];
				var title = '';
				var textstr = '';
				if (typeof text === 'object') {
					textstr = text.text;
					title = text.title;
				} else {
					textstr = text;
				}

				if (notiftype.truncate_message)
					textstr = truncatemsg(textstr, notiftype.truncate_message);

				if ($(nc.options.center_element + ' .center' + type).length === 0)
					centerHeader(notiftype);

				var str = '';
				if (nc.mobile === true)
					str = '<li id="notif' + number + '">' + closenotif(nc.mobile) + '<div class="notifcenterbox">' + textstr;
				else
					str = '<li id="notif' + number + '"><div class="notifcenterbox">' + closenotif() + textstr;

				if (time)
					str += '<br><small data-livestamp="' + time + '"></small>';

				str += '</div></li>';

				$(nc.options.center_element + ' .center' + type + ' ul').prepend(str);

				if (nc.mobile === true) {
					$('#notif' + number + ' .notifcenterbox').on('touchstart', function(e) {
						$(this).css('left', '0px');
						nc.x = e.originalEvent.pageX;
					}).on('touchmove', function(e) {
						var change = e.originalEvent.pageX - nc.x;
						change = Math.min(Math.max(-100, change), 0);
						e.currentTarget.style.left = change + 'px';
						if (change < -10)
							disable_scroll();
					}).on('touchend', function(e) {
						var left = parseInt(e.currentTarget.style.left);
						var new_left = (left > -50 ? '0px' : '-100px');
						e.currentTarget.style.left = new_left;
						enable_scroll();
					});

					$('#notif' + number + ' .delete-btn').on('vclick', function(e) {
						e.preventDefault()
						removeNotif($(this).parents('li'));
					});
				} else {
					$('#notif' + number + ' .closenotif').on('click', function() {
						$(this).parents('li').unbind();
						removeNotif($(this).parents('li'));
					});
				}

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

			function closenotif(mobile) {
				var closenotif = '';

				if (typeof mobile === 'undefined')
					mobile = false;

				if (mobile === true)
					closenotif = '<div class="behind"><span class="ui-btn delete-btn"><a href="#" class="delete-btn">Delete</a></span></div>';
				else
					closenotif = '<div class="closenotif"><i class="fa fa-times"></i></div>';

				return closenotif;
			}

			function hideNotifs(type) {
				var notifications = $(nc.options.center_element + ' .center' + type + ' ul li');
				var count = notifications.length;
				var notiftype = (typeof nc.types[type] !== 'undefined')?nc.types[type]:nc.types['system'];

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

				if (typeof nc.options.store_callback === 'function' && nc.init === true)
					nc.options.store_callback(nc.notifs);

				if (count <= 0) {
					$(nc.options.center_element + ' .center' + type).fadeOut('slow', function() {
						$(this).remove();

						checkNoNew();
					});
				}

				checkNoNew();
			}

			function checkNoNew() {
				if ($(nc.options.center_element).find('ul').length > 0)
					$(nc.options.center_element + ' .nonew').hide();
				else
					$(nc.options.center_element + ' .nonew').show();
			}

			function removeNotifType(type) {
				$(nc.options.center_element).find('.centerlist.center' + type).find('li').each(function() {
					removeNotif(this);
				});
			}

			function removeNotif(notif) {
				var notifnumber = $(notif).attr('id');
				notifnumber = notifnumber.replace('notif', '');

				if (typeof nc.notifs[notifnumber] !== 'undefined') {
					var type = nc.notifs[notifnumber].type;

					delete nc.notifs[notifnumber];

					$(notif).fadeOut('slow', function() {
						$(this).remove();

						hideNotifs(type);
					});

					if (nc.options.counter)
						notifcount();
				}
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
