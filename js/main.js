(function ($) {
	"use strict";

    jQuery(document).ready(function($){


        $(".embed-responsive iframe").addClass("embed-responsive-item");
        $(".carousel-inner .item:first-child").addClass("active");
        
        $('[data-toggle="tooltip"]').tooltip();

		
		//Fixed nav on scroll
		$(document).on('scroll',function(e){
			var scrollTop = $(document).scrollTop();
			if(scrollTop > $('nav').height()){
				$('nav').removeClass('navbar-default').addClass('navbar-fixed-top');
			}
			else {
				$('nav').removeClass('navbar-fixed-top').addClass('navbar-default');
			}
		});
		
		
		//About us Image
		$(function(){
			$("#big-image img:eq(0)").nextAll().hide();
			$(".small-images img").on('click',function(e){
				var index = $(this).index();
				$("#big-image img").eq(index).show().siblings().hide();
			});
		});
		
		//Numaric Counter
		$('.counter').counterUp({
          delay: 10,
          time: 1000
        });	
		
		//search popup box
		$("#addClass").on('click',function () {
          $('#qnimate').addClass('popup-box-on');
        });
          
        $("#removeClass").on('click',function () {
          $('#qnimate').removeClass('popup-box-on');
        });
		
		
		//Portfolio Popup
		$('.magnific-popup').magnificPopup({type:'image'});
			
		//Video popup
		$('.popup-youtube').magnificPopup({
			type: 'iframe'
		})
		
		
        //WOW js
		new WOW().init();


    });
	
	
	
	
	
	


    jQuery(window).on('load',function(){
		
		//Preloader
		//$('.preloader').delay(500).fadeOut('slow');
		//$('body').delay(500).css({'overflow':'visible'});
		$('body').css({ 'overflow': 'visible' });
	});

	$("li.dropdown").click(function (e) {
		$(this).toggleClass("open");
	});


}(jQuery));	