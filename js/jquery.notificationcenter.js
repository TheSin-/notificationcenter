/*
 *  Project: NotificationCenter
 *  Description: notificationcenter is a jQuery version of the Apple OS X
 *  Notification Center. I've attempted to copy everything I can from the OS X
 *  verison in 10.9.  Icons, colors, sounds, visuals, interactions, functions.
 *  Author: Mathieu BUONOMO / Justin F. Hallett
 *  License: Permission is hereby granted, free of charge, to any person obtaining
 *  a copy of this software and associated documentation files (the
 *  'Software'), to deal in the Software without restriction, including
 *  without limitation the rights to use, copy, modify, merge, publish,
 *  distribute, sublicense, and/or sell copies of the Software, and to
 *  permit persons to whom the Software is furnished to do so, subject to
 *  the following conditions:
 *
 *  The above copyright notice and this permission notice shall be
 *  included in all copies or substantial portions of the Software.
 *
 *  THE SOFTWARE IS PROVIDED 'AS IS', WITHOUT WARRANTY OF ANY KIND,
 *  EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
 *  MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
 *  NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE
 *  LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION
 *  OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION
 *  WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */
/*jshint browser:true, jquery:true */
/* global Faye */
;(function($) {
	'use strict';
	$.extend({
		/*jshint supernew:true */
		notificationcenter: new function() {
			var nc = this;

			nc._name = 'notificationcenter';
			nc._version = '0.0.3';

			nc.x = 0;
			nc.init = false;
			nc.open = false;
			nc.mobile = false;
			nc.notifs = {};
			nc._defaults = {
				center_element      : '#notificationcenterpanel',
				body_element        : '#noticationcentermain',
				toggle_button       : '#notificationcentericon',
				add_panel           : true,
				notification_offset : 0,
				display_time        : 5000,
				types: [{
					type: 'system',
					img: 'fa fa-cogs',
					imgtype: 'class'
				}],
				type_max_display    : 5,
				truncate_message    : 0,
				header_output       : '{icon} {type} {count}',
				counter             : true,
				title_counter       : true,
				default_notifs      : [],
				faye                : false,
				ajax                : false,
				ajax_checkTime      : 5000,
				alert_hidden        : true,
				alert_hidden_sound  : '',
				store_callback      : false,

				overlay             : true,
				overlay_z_index     : 1001,
				// change this option & nc.css.panelNotifTime to use a different time plugins
				center_time_attr    : 'data-livestamp',

				lang : {
					no_notifications : 'No New Notifications',
					delete           : 'Delete', // mobile Delete button
					close            : 'Close',  // Close notification button
				}

			};

			nc.options = {};

			nc.css = {
				// notificationcenter panel
				panelOpen      : 'notificationopen',
				panelClosed    : 'notificationclose',
				panelToggle    : 'notificationcentericon',
				panelOverlay   : 'notificationcenteroverlay',
				panelEmpty     : 'nonew',
				panelGroup     : 'centerlist',
				panelGroupPfx  : 'center', // group prefix e.g. "centerinvite", "centercalendar"...
				panelGroupHdr  : 'centerheader',
				panelGroupNum  : 'notiftypecount',
				panelGroupX    : 'closenotif',
				panelGroupXBtn : 'fa fa-times', // non-moblile delete icon (font-awesome)
				panelGroupXBM  : 'delete-btn',  // mobile delete button
				panelNotifId   : 'notif', // id prefix added to LI
				panelNotifBox  : 'notifcenterbox',
				panelNotifText : 'notiftext',
				panelNotifTime : 'notiftime',
				// notifications
				notifUl        : 'notificationul',
				notifIdPfx     : 'box', // notification ID prefix (on LI)
				notifDiv       : 'notification',
				notifIcon      : 'iconnotif',
				notifIconImg   : 'iconnotifimg',
				notifContent   : 'contentnotif',
				notifBtnWrap   : 'buttonnotif', // wraps close & callback buttons
				notifBtn       : 'btn',
				notifBtnClose  : 'close',
				callbackBtn    : 'action'
			};

			/* public methods */
			nc.construct = function(settings) {
				return this.each(function() {
					nc.element = this;

					// merge & extend config options
					nc.options = $.extend( {}, nc._defaults, settings );
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

					if (typeof nc.options.store_callback === 'function' && nc.notifs.length > 0) {
						nc.options.store_callback(nc.notifs);
					}
				});
			};

			nc.captureTitle = function(title) {
				if (typeof title === 'undefined') {
					title = document.title.replace(/^\([0-9]+\) /, '');
				}
				nc.options.title = title;
				updatetitle();
			};

			nc.slide = function(callback, notif) {
				var $centerElm = $(nc.options.center_element),
					$bodyElm = $(nc.options.body_element),
					$toggleBtn = $(nc.options.toggle_button);

				if (nc.open) {
					$centerElm.css({
						zIndex: nc.options.zIndex.panel
					});
					$toggleBtn.css({
						zIndex: nc.options.zIndex.button
					});

					$bodyElm.animate({
						right: '0px'
					}, 'slow', function() {
						nc.open = false;
						$centerElm.css('visibility', 'hidden');
						$toggleBtn
							.removeClass(nc.css.panelClosed)
							.addClass(nc.css.panelOpen);

						$('#' + nc.css.panelOverlay).remove();
						if (typeof callback === 'function') {
							callback(notif);
							removeNotif( $('#' + nc.css.panelNotifId + notif.id) );
						}
					});

					$('.' + nc.css.notifUl).animate({
						right: '0px'
					}, 'slow');
				} else {
					$.each(nc.notifs, function(k, notif) {
						notif['new'] = false;
					});

					if (nc.options.counter) {
						notifcount();
					}

					if (typeof nc.options.store_callback === 'function' && nc.init === true) {
						nc.options.store_callback(nc.notifs);
					}
					nc.options.zIndex.panel = $centerElm.css('zIndex');
					nc.options.zIndex.button = $toggleBtn.css('zIndex');

					// Safety add an overlay over document to remove
					// event control, only notifier panel has control
					if ( nc.options.overlay ) {
						$('<div id="' + nc.css.panelOverlay + '" style="z-index:' + nc.options.overlay_z_index + '"></div>')
							.appendTo('body')
							.on('click', function() {
								nc.slide();
								return false;
							});
					}

					$centerElm.css('visibility', 'visible');
					$bodyElm.animate({
						right: $centerElm.outerWidth()
					}, 'slow', function() {
						nc.open = true;
						$toggleBtn
							.removeClass(nc.css.panelOpen)
							.addClass(nc.css.panelClosed);

						$centerElm.css({
							zIndex: nc.options.overlay_z_index + 1
						});
						$toggleBtn.css({
							zIndex: nc.options.overlay_z_index + 1
						});
					});

					$('.' + nc.css.notifUl).animate({
						right: $centerElm.outerWidth()
					}, 'slow');
				}
			};

			nc.faye = function(faye) {
				if ( Faye ) {
					var client = new Faye.Client(faye.server);
					var subscription = client.subscribe(faye.channel, function(message) {
						nc.newAlert(message.text, message.type, true, message.callback, message.time, message['new']);
					});
				}
			};

			nc.ajax = function(ajaxobj, checktime) {
				if (typeof checktime === 'undefined' || !checktime) {
					checktime = nc._defaults.ajax_checkTime;
				}

				setInterval(function() {
					$.ajax(ajaxobj).done(function(data) {
						if (data) {
							if ($.isArray(data)) {
								$.each(data, function(k, v) {
									var text = '',
										type = 'system',
										time = ( new Date() ).getTime() / 1000,
										callback = false,
										newnotif = true;
									if ($.isArray(v)) {
										if (typeof v[0] !== 'undefined') {
											text = v[0];
										}
										if (typeof v[1] !== 'undefined') {
											type = v[1];
										}
										if (typeof v[2] !== 'undefined') {
											callback = v[2];
										}
										if (typeof v[3] !== 'undefined') {
											time = v[3];
										}
										if (typeof v[4] !== 'undefined') {
											newnotif = v[4];
										}
									} else {
										if (typeof v.text !== 'undefined') {
											text = v.text;
										}
										if (typeof v.type !== 'undefined') {
											type = v.type;
										}
										if (typeof v.callback !== 'undefined') {
											callback = v.callback;
										}
										if (typeof v.time !== 'undefined') {
											time = v.time;
										}
										if (typeof v['new'] !== 'undefined') {
											newnotif = v['new'];
										}
									}

									nc.newAlert(text, type, true, callback, time, newnotif);
								});
							}
						}
					});
				}, checktime);
			};

			nc.alert = function(text, type, callback, notificationtype, notifnumber) {
				var notiftype, textstr, title, notification, callbackbtn, notif, $box,
					removenotif = true;

				if (typeof type === 'undefined') {
					type = 'system';
				}

				if (typeof notifnumber === 'undefined') {
					notifnumber = $('.' + nc.css.notifUl).children('li').length + 1;
					removenotif = false;
				}

				notiftype = (typeof nc.types[type] !== 'undefined') ? nc.types[type] : nc.types.system;

				if (typeof notificationtype === 'undefined') {
					notificationtype = notiftype.notificationtype || 'banner';
				}

				textstr = '';
				title = '';
				if (typeof text === 'object') {
					textstr = text.text;
					title = '<h3>' + text.title + '</h3>';
				} else {
					textstr = text;
				}

				if (notiftype.truncate_message) {
					textstr = truncatemsg(textstr, notiftype.truncate_message);
				}

				notification = '<li id="' + nc.css.notifIdPfx + notifnumber + '"><div class="' + nc.css.notifDiv + '">' +
					'<div class="' + nc.css.notifIcon + '"><div class="' + nc.css.notifIconImg + '">' +
					notiftype.icon + '</div></div><div class="' + nc.css.notifContent + '">' + title + textstr + '</div>';
				if (notificationtype !== 'banner') {
					notiftype.display_time = 0;
					callbackbtn = '';
					if (typeof callback === 'function') {
						callbackbtn = '<a href="#" class="' + nc.css.notifBtn + ' ' + nc.css.callbackBtn + '">' +
							notificationtype + '</a>';
					}
					notification += '<div class="' + nc.css.notifBtnWrap + '">' +
						'<a href="#" class="' + nc.css.notifBtn + ' ' + nc.css.notifBtnClose + '">' +
						nc.options.lang.close + '</a>' + callbackbtn + '</div>';
				}
				notification += '</div></li>';

				$('.' + nc.css.notifUl).prepend(notification);
				$box = $('#' + nc.css.notifIdPfx + notifnumber);

				$box
					.css({
						'top': '-' + ( $box.outerHeight(true) + nc.options.notification_offset ) + 'px',
						'right': 0
					})
					.show()
					.animate({
						'top': 0
					}, 'slow');

				if (notiftype.display_time) {
					ncTimeout(function() {
						var $box = $('#' + nc.css.notifIdPfx + notifnumber);
						$box.animate({
							right: '-' + $box.outerWidth(true) + 'px',
							opacity: 0
						}, 'slow', function() {
							$(this).remove();
						});
					}, notiftype.display_time, $box);
				}

				notif = {
					'text': text,
					'type': type,
					'callback': callback
				};
				if (typeof nc.notifs[notifnumber] !== 'undefined') {
					notif = nc.notifs[notifnumber];
				}

				if (notificationtype !== 'banner') {
					$box.css({
						cursor: 'initial'
					});

					// FIXME (change to poof effect)
					$box.find('.' + nc.css.notifBtnClose).on('click', function() {
						var $box = $('#' + nc.css.notifIdPfx + notifnumber)
						$box.animate({
							right: '-' + $box.outerWidth(true) + 'px',
							opacity: 0
						}, 'slow', function() {
							$(this).remove();

							if (removenotif) {
								removeNotif(
									$(nc.options.center_element)
										.find('.' + nc.css.panelGroup + '.' + nc.css.panelGroupPfx + notif.type)
										.find('#' + nc.css.panelNotifId + notif.id)
								);
							}
						});

						return false;
					});

					if (typeof callback === 'function') {
						$box.find('.' + nc.css.callbackBtn).on('click', function() {
							var $box = $('#' + nc.css.notifIdPfx + notifnumber);
							$box.animate({
								right: '-' + $box.outerWidth(true) + 'px',
								opacity: 0
							}, 'slow', function() {
								$(this).remove();

								callback(notif);

								if (removenotif) {
									removeNotif(
										$(nc.options.center_element)
											.find('.' + nc.css.panelGroup + '.' + nc.css.panelGroupPfx + notif.type)
											.find('#' + nc.css.panelNotifId + notif.id)
									);
								}
							});

							return false;
						});
					}
				} else {
					$box.on('click', function() {
						var $box = $(this);
						$box.animate({
							right: '-' + $box.outerWidth(true) + 'px',
							opacity: 0
						}, 'slow', function() {
							$(this).remove();

							if (typeof callback === 'function') {
								callback(notif);
							}

							if (removenotif) {
								removeNotif(
									$(nc.options.center_element)
										.find('.' + nc.css.panelGroup + '.' + nc.css.panelGroupPfx + notif.type)
										.find('#' + nc.css.panelNotifId + notif.id)
								);
							}
						});
					});
				}

				if (notiftype.alert_hidden && document[nc.options.hiddentype]) {
					notiftype.snd.play();
				}
			};

			nc.newAlert = function(text, type, showNotification, callback, time, newnotif) {
				var notiftype, notifnumber;
				if (typeof showNotification === 'undefined') {
					showNotification = true;
				}
				if (typeof callback === 'undefined') {
					callback = false;
				} else if (typeof callback !== 'function') {
					// callbacks stored in database as a string
					eval('callback = ' + callback);
				}
				if (typeof newnotif === 'undefined') {
					newnotif = true;
				}
				if (callback == 'false') {
					callback = false;
				}
				if (typeof time !== 'number') {
					time = parseFloat(time) || false;
				}
				if (time < 1 || time === '0' || time === '' || typeof time === 'undefined') {
					time = false;
				}
				if (newnotif == 'false') {
					newnotif = false;
				} else if (newnotif == 'true') {
					newnotif = true;
				}

				notiftype = ( typeof nc.types[type] !== 'undefined' ) ? nc.types[type] : nc.types.system;
				type = notiftype.type;

				if (notiftype.display_time === 0 && showNotification) {
					nc.alert(text, type, callback, 'snooze');
					return;
				}

				notifnumber = getNotifNum();

				if (jQuery().livestamp && time === false) {
					time = Math.round( ( new Date() ).getTime() / 1000);
				}

				notifcenterbox(type, text, time, notifnumber, callback, newnotif);

				if (!nc.open && nc.options.counter) {
					notifcount();
				}

				if (showNotification) {
					nc.alert(text, type, callback, 'banner', notifnumber);
				}

				if (nc.open) {
					nc.notifs[notifnumber]['new'] = false;
				}
			};

			/* private functions */
			// Helpers
			function inArray(needle, haystack) {
				var i,
					length = haystack.length;
				for (i = 0; i < length; i++) {
					if (haystack[i].type === needle) {
						return i;
					}
				}
				return false;
			}

			function ncTimeout(func, timeout, watchele) {
				var timer,
					seconds = timeout / 1000,
					done = false,

				counter = function() {
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
				};

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
				$(document).on('touchmove.notificationcenter', prevent_default);
			}

			function enable_scroll() {
				$(document).off('touchmove.notificationcenter', prevent_default);
			}

			// Plugin Functions
			function setup() {
				var bposition, bodyPos,
					$bodyElm = $(nc.options.body_element);

				if (typeof $.mobile !== 'undefined') {
					if ($.mobile.support.touch) {
						nc.mobile = true;
					}
				}

				if (typeof document.hidden !== 'undefined') {
					nc.options.hiddentype = 'hidden';
				} else if (typeof document.mozHidden !== 'undefined') {
					nc.options.hiddentype = 'mozHidden';
				} else if (typeof document.msHidden !== 'undefined') {
					nc.options.hiddentype = 'msHidden';
				} else if (typeof document.webkitHidden !== 'undefined') {
					nc.options.hiddentype = 'webkitHidden';
				}

				if (nc.options.add_panel && $(nc.options.center_element).length === 0) {
					$bodyElm.before('<div id="' + nc.options.center_element.replace('#', '') + '">' +
						'<div class="' + nc.css.panelEmpty + '"><div>' + nc.options.lang.no_notifications + '</div></div></div>');
				}

				// Line it up with body_element
				bposition = $bodyElm.position();
				$(nc.options.center_element).css({
					top: bposition.top
				});

				// Make sure body element has position: absolute or relative
				bodyPos = $bodyElm.css('position');
				if (bodyPos !== 'relative' && bodyPos !== 'absolute') {
					bodyPos = 'absolute';
					$bodyElm.css({
						position: 'absolute',
						top: bposition.top
					});
				}

				$bodyElm.css({
					right: '0px',
					width: '100%',
					height: '100%',
					overflow: 'auto'
				});

				if ($('.' + nc.css.notifUl).length === 0) {
					$(nc.element).prepend('<ul class="' + nc.css.notifUl + '"></ul>');

					$('.' + nc.css.notifUl).css({
						'padding-top': nc.options.notification_offset
					});

					$(document).trigger('scroll');
				}

				$(nc.options.toggle_button).addClass(nc.css.panelToggle);

				if (window.HTMLAudioElement && nc.options.alert_hidden) {
					nc._defaults.snd = new Audio('');
				} else {
					nc._defaults.alert_hidden = false;
				}

				nc.captureTitle();
				bindings();
				buildTypes();

				if (nc.options.default_notifs.length > 0) {
					$(nc.options.default_notifs).each(function(index, item) {
						var type = item.type;

						$(item.values).each(function(i, notif) {
							nc.newAlert(notif.text, type, false, notif.callback, notif.time, notif['new']);
						});
					});
				}

				if (nc.options.faye !== false) {
					nc.faye(nc.options.faye);
				}

				if (nc.options.ajax !== false) {
					nc.ajax(nc.options.ajax, nc.options.ajax_checkTime);
				}
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

			var pinchToZoomCheckTimer,
				mobilewindow = {
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

				if (nc.mobile) {
					$(document).on('resize scroll', function (e) {
						mobilewindow.doc = $(document).outerWidth();

						clearTimeout(pinchToZoomCheckTimer);
						pinchToZoomCheckTimer = setTimeout(function () {
							mobilewindow.top = window.pageYOffset;
							mobilewindow.left = window.pageXOffset;
							mobilewindow.view = window.innerWidth;
							$(nc.options.body_element).trigger('mobilechange');
						}, 50);
					});
				}

				$(nc.options.body_element).on('scroll mobilechange', function(e) {
					var ulright,
						ultop = nc.options.notification_offset - e.target.scrollTop;
					if (e.target.scrollTop > nc.options.notification_offset || mobilewindow.top > nc.options.notification_offset) {
						ultop = 0; // mobilewindow.top - nc.options.notification_offset;
					}

					ulright = (mobilewindow.doc - mobilewindow.view) - mobilewindow.left;

					if (nc.open) {
						ulright += $(nc.options.panel_element).outerWidth();
					}

					$('.' + nc.css.notifUl).css({
						'padding-top': ultop,
						'right': ulright
					});
				});
			}

			function notifcount() {
				var counter = 0;
				$.each(nc.notifs, function(k, notif) {
					if (notif['new'] === true) {
						counter++;
					}
				});

				if (counter > 0) {
					$(nc.options.toggle_button).attr('data-counter', counter);
				} else {
					$(nc.options.toggle_button).removeAttr('data-counter');
				}

				if (nc.options.title_counter) {
					updatetitle();
				}
			}

			function updatetitle() {
				var title = nc.options.title,
					count = parseInt( $(nc.options.toggle_button).attr('data-counter'), 10 ) || false;
				if (count) {
					title = '(' + count + ') ' + title;
				}
				document.title = title;
			}

			function getnotiftype(type) {
				var notiftype,
					index = inArray(type, nc.options.types);

				if (index !== false) {
					notiftype = nc.options.types[index];
				} else {
					notiftype = nc._default.types[0];
				}

				notiftype.index = index;

				if (typeof notiftype.bgcolor === 'undefined') {
					notiftype.bgcolor = false;
				}
				if (typeof notiftype.color === 'undefined') {
					notiftype.color  = false;
				}
				if (typeof notiftype.imgtype === 'undefined') {
					notiftype.imgtype = 'image';
				}
				if (typeof notiftype.truncate_message === 'undefined') {
					notiftype.truncate_message = nc.options.truncate_message;
				}
				if (typeof notiftype.header_output === 'undefined') {
					notiftype.header_output = nc.options.header_output;
				}
				if (typeof notiftype.display_time === 'undefined') {
					notiftype.display_time = nc.options.display_time;
				}
				if (typeof notiftype.type_max_display === 'undefined') {
					notiftype.type_max_display = nc.options.type_max_display;
				}
				if (typeof notiftype.alert_hidden === 'undefined') {
					notiftype.alert_hidden = nc.options.alert_hidden;
				}
				if (typeof notiftype.alert_hidden_sound === 'undefined') {
					notiftype.alert_hidden_sound = nc.options.alert_hidden_sound;
				}

				notiftype.snd = setSound(notiftype);

				if (notiftype.imgtype == 'class') {
					notiftype.icon = '<i class="' + notiftype.img + '"></i>';
				} else {
					notiftype.icon = '<img src="' + notiftype.img + '">';
				}

				return notiftype;
			}

			function setSound(notiftype) {
				if (nc._defaults.alert_hidden === true && notiftype.alert_hidden === true) {
					if (nc._defaults.snd.canPlayType('audio/ogg')) {
						return new Audio(notiftype.alert_hidden_sound + '.ogg');
					} else if (nc._defaults.snd.canPlayType('audio/mp3')) {
						return new Audio(notiftype.alert_hidden_sound + '.mp3');
					}
				}
				return false;
			}

			// WhiteSpace/LineTerminator as defined in ES5.1 plus Unicode characters in the Space, Separator category.
			function getTrimmableCharacters() {
				return '\u0009\u000A\u000B\u000C\u000D\u0020\u00A0\u1680\u180E\u2000\u2001\u2002\u2003\u2004\u2005' +
					'\u2006\u2007\u2008\u2009\u200A\u202F\u205F\u2028\u2029\u3000\uFEFF';
			}

			function truncateOnWord(str, limit) {
				var reg = new RegExp('(?=[' + getTrimmableCharacters() + '])'),
					words = str.split(reg),
					count = 0;

				return words.filter(function(word) {
					count += word.length;
					return count <= limit;
				}).join('');
			}

			function truncatemsg(msg, length) {
				var ellipse = '&hellip;',
					tmsg = msg;

				if (msg.length > length) {
					tmsg = truncateOnWord(msg, length) + ellipse;
				}

				return tmsg;
			}

			function notifcenterbox(type, text, time, number, callback, newnotif) {
				nc.notifs[number] = {
					new: newnotif,
					id: number,
					type: type,
					text: text,
					time: time,
					callback: ( callback || '' ).toString().replace( /\s+/g, ' ' )
				};

				var str,
					$centerElm = $(nc.options.center_element),
					title = '',
					textstr = '',
					notiftype = ( typeof nc.types[type] !== 'undefined' ) ? nc.types[type] : nc.types.system;
				if (typeof text === 'object') {
					textstr = text.text;
					title = '<h3>' + text.title + '</h3>';
				} else {
					textstr = text;
				}

				if (notiftype.truncate_message) {
					textstr = truncatemsg(textstr, notiftype.truncate_message);
				}

				if ($centerElm.find('.' + nc.css.panelGroupPfx + type).length === 0) {
					centerHeader(notiftype);
				}

				str = '<li id="' + nc.css.panelNotifId + number + '">';
				if (nc.mobile === true) {
					str += closenotif(nc.mobile);
				}
				str += '<div class="' + nc.css.panelNotifBox + '">' +
					'<div class="' + nc.css.panelNotifText + '">' + title + textstr + '</div>';

				if (time) {
					str += '<div class="' + nc.css.panelNotifTime + '">' +
						'<span ' + nc.options.center_time_attr + '="' + time + '"></span></div>';
				}

				str += '</div></li>';

				$centerElm.find('.' + nc.css.panelGroupPfx + type + ' ul').prepend(str);

				if (nc.mobile === true) {
					$('#' + nc.css.panelNotifId + number + ' .' + nc.css.panelNotifBox)
						.on('touchstart', function(e) {
							$(this).css('left', '0px');
							nc.x = e.originalEvent.pageX;
						})
						.on('touchmove', function(e) {
							var change = e.originalEvent.pageX - nc.x;
							change = Math.min(Math.max(-100, change), 0);
							e.currentTarget.style.left = change + 'px';
							if (change < -10) {
								disable_scroll();
							}
						})
						.on('touchend', function(e) {
							var left = parseInt( e.currentTarget.style.left, 10 );
							e.currentTarget.style.left = ( left > -50 ? '0px' : '-100px' );
							enable_scroll();
						});

					$('#' + nc.css.panelNotifId + number + ' .' + nc.css.panelGroupXBM).on('vclick', function(e) {
						e.preventDefault();
						removeNotif($(this).parents('li'));
					});
				} else if (typeof callback !== 'function') {
					$('#' + nc.css.panelNotifId + number).on('click', function() {
						removeNotif($(this));
					});
				}

				if (typeof callback === 'function') {
					$('#' + nc.css.panelNotifId + number).on('click', function(e) {
						nc.slide(callback, nc.notifs[number]);
					});
				}

				hideNotifs(type);
			}

			function centerHeader(notiftype) {
				var style = '',
					$centerElm = $(nc.options.center_element),
					headerTxt = nc.options.header_output
					.replace(/\{icon\}/gi, function(m, n) {
						return notiftype.icon;
					})
					.replace(/\{type\}/gi, function(m, n) {
						return notiftype.type;
					})
					.replace(/\{count\}/gi, function(m, n) {
						return '<div class="' + nc.css.panelGroupNum + '"></div>';
					});

				if (notiftype.bgcolor !== false) {
					style = 'background:' + notiftype.bgcolor + ';';
				}
				if (notiftype.color !== false) {
					style += 'color:' + notiftype.color + ';';
				}
				$centerElm.prepend(
					'<div class="' + nc.css.panelGroup + ' ' + nc.css.panelGroupPfx + notiftype.type + '">' +
					'<div class="' + nc.css.panelGroupHdr + '"' + ( style ? ' style="' + style + '"' : '' ) + '>' +
					headerTxt + closenotif() +
					'</div><ul></ul></div>'
				);

				$centerElm
					.find('.' + nc.css.panelGroup + '.' + nc.css.panelGroupPfx + notiftype.type)
					.find('.' + nc.css.panelGroupX)
					.on('click', function() {
						removeNotifType(notiftype.type);
					});
			}

			function closenotif(mobile) {
				if (typeof mobile === 'undefined') {
					mobile = false;
				}
				return mobile === true ?
					// nc.css mobile classes to add: behind & ui-btn?
					'<div class="behind"><span class="ui-btn ' + nc.css.panelGroupXBM + '">' +
					'<a href="#" class="' + nc.css.panelGroupXBM + '">' + nc.options.lang.delete + '</a></span></div>' :
					'<div class="' + nc.css.panelGroupX + '"><i class="' + nc.css.panelGroupXBtn + '"></i></div>';
			}

			function hideNotifs(type) {
				var notifno,
					$notifications = $(nc.options.center_element + ' .' + nc.css.panelGroupPfx + type + ' ul li'),
					count = $notifications.length,
					notiftype = ( typeof nc.types[type] !== 'undefined' ) ? nc.types[type] : nc.types.system;

				$(nc.options.center_element + ' .' + nc.css.panelGroupPfx + type).find('.' + nc.css.panelGroupNum).text('(' + count + ')');

				if (notiftype.type_max_display > 0) {
					notifno = 0;
					$notifications.each(function(index, el) {
						if (notifno < notiftype.type_max_display) {
							$(el).show();
						} else {
							$(el).hide();
						}
						notifno++;
					});
				}

				if (typeof nc.options.store_callback === 'function' && nc.init === true) {
					nc.options.store_callback(nc.notifs);
				}

				if (count <= 0) {
					$(nc.options.center_element + ' .' + nc.css.panelGroupPfx + type).fadeOut('slow', function() {
						$(this).remove();

						checkNoNew();
					});
				}

				checkNoNew();
			}

			function checkNoNew() {
				if ($(nc.options.center_element).find('ul').length > 0) {
					$(nc.options.center_element + ' .' + nc.css.panelEmpty).hide();
				} else {
					$(nc.options.center_element + ' .' + nc.css.panelEmpty).show();
				}
			}

			function removeNotifType(type) {
				$(nc.options.center_element)
					.find('.' + nc.css.panelGroup + '.' + nc.css.panelGroupPfx + type)
					.find('li')
					.each(function() {
						removeNotif(this);
					});
			}

			function removeNotif(notif) {
				var type,
					notifnumber = ( $(notif).attr('id') || '' ).replace( nc.css.panelNotifId, '' );

				if (typeof nc.notifs[notifnumber] !== 'undefined') {
					type = nc.notifs[notifnumber].type;

					delete nc.notifs[notifnumber];

					$(notif).fadeOut('slow', function() {
						$(this).remove();
						hideNotifs(type);
					});

					if (nc.options.counter) {
						notifcount();
					}
				}
			}

			function getNotifNum() {
				var notifnumber = false;
				while (!notifnumber || typeof nc.notifs[notifnumber] !== 'undefined') {
					notifnumber = Math.floor(Math.random() * 1199999);
				}
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
