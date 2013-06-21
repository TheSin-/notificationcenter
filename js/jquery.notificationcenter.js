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

    var current_notif = [],
        pluginName = "notificationcenter",
        defaults = {
            centerElement : "#notificationcenterpanel",
            bodyElement : "#noticationcentermain",
            toggleButton : "#notificationcentericon",
            addPanel : true,
            displayTime : 5000,
            types : [],
            counter : true,
            title_counter: true,
            default_notifs : [],
            faye:false,
            alert_hidden:true,
            alert_hidden_sound:''
        };

    function inArray(needle, haystack) {
        var length = haystack.length,
            i = 0;
        for (i; i < length; i+=1) {
            if (haystack[i].type === needle) {
                return i;
            }
        }
        return false;
    }

    var hidden, visibilityChange;

    function notification_changementVisibilite() {
    }



    function Plugin( element, options ) {
        this.element = element;

        this.options = $.extend( {}, defaults, options) ;
        
        this._defaults = defaults;
        this._name = pluginName;
        this.current_notif = current_notif;
        
        this.init();
    }

    Plugin.prototype.init = function () {

        this.listener(this.element, this.options);
        this.createCenter(this.element, this.options);

        if(this.options.addPanel){
            var id = this.options.centerElement.replace('#', '');
            $('body').prepend('<div id="'+id+'" class="notificationcentercontainer"></div>');
        }

        $(this.options.toggleButton).addClass('notificationcentericon');

        if (this.options.default_notifs.length > 0) {
            var centerElm = this.options.centerElement,
                types = this.options.types;

            $(this.options.default_notifs).each(function(index, item){
                var type = item.type;

                if($(centerElm+' .center'+type).length === 0){

                    var i = inArray(type, types);

                    if(i !== false){
                        var bgcolor  = (types[i].bgcolor === undefined)?'#FF00FF':types[i].bgcolor,
                            color  = (types[i].color === undefined)?'#000000':types[i].color;
                        $(centerElm).prepend('<div class="centerlist center'+type+'"><div class="centerheader" style="background-color:'+bgcolor+';color:'+color+';background-image:url('+types[index].img+')">'+types[index].type+'</div><ul></ul></div>');
                    } else {
                        $(centerElm).prepend('<div class="centerlist center'+type+'"><div class="centerheader"></div><ul></ul></div>');
                    }
                }

                $(item.values).each(function(i,notif){
                    $(centerElm+' .center'+type+' ul').prepend('<li><div class="notifcenterbox"><div class="closenotif">x</div>'+ notif.text +' '+'<br /><small data-livestamp="'+notif.time+'"></small></div></li>');

                });
            });

            if (typeof document.hidden !== "undefined") {
              hidden = "hidden";
              visibilityChange = "visibilitychange";
              visibilityState = "visibilityState";
            } else if (typeof document.mozHidden !== "undefined") {
              hidden = "mozHidden";
              visibilityChange = "mozvisibilitychange";
              visibilityState = "mozVisibilityState";
            } else if (typeof document.msHidden !== "undefined") {
              hidden = "msHidden";
              visibilityChange = "msvisibilitychange";
              visibilityState = "msVisibilityState";
            } else if (typeof document.webkitHidden !== "undefined") {
              hidden = "webkitHidden";
              visibilityChange = "webkitvisibilitychange";
              visibilityState = "webkitVisibilityState";
            }
            document.addEventListener(visibilityChange, notification_changementVisibilite, false);


        }

        if (this.options.faye !== false) {

            var client = new Faye.Client(this.options.faye.server);
            var subscription = client.subscribe(this.options.faye.chanel, function(message) {
                    $('body').notificationcenter('newAlert', message.text, message.type);
            });            
        }


    };

    Plugin.prototype.createCenter = function(el, options) {

    };


   Plugin.prototype.listener = function(el, options) {

            $(options.toggleButton+'.open').on('click',function(){
                if($(this).hasClass('open')){
                    $(this).removeClass('open').addClass('close');
                    $('.notificationcentercontainer').animate({right:'+=300'}, 500);
                    if(options.counter){
                        $(options.toggleButton).removeAttr('data-counter');
                        if(options.title_counter) {
                            document.title = document.title.replace(/^\([0-9]+\)/, '');
                        }
                    }
                } else {
                    $(this).removeClass('close').addClass('open');
                    $('.notificationcentercontainer').animate({right:'-=300'}, 500);
                }
                return false;
            });

    };

    Plugin.prototype.slide = function(){
        var pos = parseInt($('.notificationcentercontainer').css('right'));
        if(pos >= 0){
            $(this.options.toggleButton).removeClass('close').addClass('open');
            $('.notificationcentercontainer').animate({right:'-=300'}, 500);
        }else{
            if(this.options.counter){
                $(this.options.toggleButton).removeAttr('data-counter');
            }
            $(this.options.toggleButton).removeClass('open').addClass('close');
            $('.notificationcentercontainer').animate({right:'+=300'}, 500);
        }
    };

    Plugin.prototype.newAlert = function(text, type){

        if($(this.options.toggleButton).hasClass('open')) {
            if ($('.notificationul').length === 0){
                $('body').prepend('<ul class="notificationul"></ul>');
            }

            var randomnumber = Math.floor(Math.random()*1199999),
                index = inArray(type, this.options.types),
                html = '';
            this.current_notif.push(randomnumber);

            if(index !== false){
    html = '<li id="box'+randomnumber+'"><div class="notification"><div class="closenotif">x</div><div class="iconnotif"><div class="iconnotifimg"><img src="'+this.options.types[index].img+'" /></div></div><div class="contentnotif">'+text+'</div></div></li>';

            } else {
    html = '<li id="box'+randomnumber+'"><div class="notification"><div class="closenotif">x</div><div class="iconnotif"></div><div class="contentnotif">'+text+'</div></div></li>';
            }

            $('.notificationul').prepend(html);

            $('#box'+randomnumber).css({'right':'30px', 'position':'relative'}).fadeIn(500);

            window.setTimeout(function(){
                    $('#box'+randomnumber).css('right', '-450px').fadeOut(500, function(){
                        $(this).remove();
                    });
                },this.options.displayTime);

            var title = document.title;
            var til = title.replace(/^\([0-9]+\)/, '');

            if(this.options.counter){
                if($(this.options.toggleButton).attr('data-counter') === undefined){
                    $(this.options.toggleButton).attr('data-counter', 1);
                    if (this.options.title_counter){
                        document.title = "(1) "+til;
                    }
                }else{
                    var counter = parseInt($(this.options.toggleButton).attr('data-counter'))+1;
                    $(this.options.toggleButton).attr('data-counter', counter);
                    if (this.options.title_counter){
                        document.title = "("+counter+") "+til;
                    }
                }
            }

            if(this.options.alert_hidden && document[hidden]){
                if (window.HTMLAudioElement) {
                    var snd = new Audio('');
                    
                    if(snd.canPlayType('audio/ogg')) {
                        snd = new Audio(this.options.alert_hidden_sound+'.ogg');
                    }
                    else if(snd.canPlayType('audio/mp3')) {
                        snd = new Audio(this.options.alert_hidden_sound+'.mp3');
                    }
                    
                    snd.play();
                }
            }
        }
        if($(this.options.centerElement+' .center'+type).length === 0){
            var index = inArray(type, this.options.types);
            if(index !== false){
                var bgcolor  = (this.options.types[index].bgcolor === undefined)?'#FF00FF':this.options.types[index].bgcolor;
                var color  = (this.options.types[index].color === undefined)?'#000000':this.options.types[index].color;
                $(this.options.centerElement).prepend('<div class="centerlist center'+type+'"><div class="centerheader" style="background-color:'+bgcolor+';color:'+color+';background-image:url('+this.options.types[index].img+')">'+this.options.types[index].type+'</div><ul></ul></div>');
            } else {
                $(this.options.centerElement).prepend('<div class="centerlist center'+type+'"><div class="centerheader"></div><ul></ul></div>');
            }
        }

        if(jQuery().livestamp){
            var date = new Date(),
                time = Math.round(date.getTime()/1000);
            $(this.options.centerElement+' .center'+type+' ul').prepend('<li><div class="notifcenterbox"><div class="closenotif">x</div>'+ text +' '+'<br /><small data-livestamp="'+time+'"></small></div></li>');
        }else {
            $(this.options.centerElement+' .center'+type+' ul').prepend('<li><div class="notifcenterbox"><div class="closenotif">x</div>'+ text +' '+'<br /></div></li>');
        }

        $('.closenotif').on('click', function(){
            $(this).parents('li').css('right', '-450px').fadeOut(500, function(){

                if ($(this).parents('ul').find('li').length == 1) {
                    $(this).parents('.centerlist').remove();
                }

                $(this).remove();

            });
        });

    };

    $.fn[pluginName] = function ( options ) {

        var args = arguments;

        if (options === undefined || typeof options === 'object') {
            return this.each(function () {

                if (!$.data(this, 'plugin_' + pluginName)) {

                    $.data(this, 'plugin_' + pluginName, new Plugin( this, options ));

                }
            });

        } else if (typeof options === 'string' && options[0] !== '_' && options !== 'init') {

            var returns;

            this.each(function () {
                var instance = $.data(this, 'plugin_' + pluginName);

                if (instance instanceof Plugin && typeof instance[options] === 'function') {

                    returns = instance[options].apply( instance, Array.prototype.slice.call( args, 1 ) );
                }

                if (options === 'destroy') {
                  $.data(this, 'plugin_' + pluginName, null);
                }
            });

            return returns !== undefined ? returns : this;
        }
    };

}(jQuery, window, document));



