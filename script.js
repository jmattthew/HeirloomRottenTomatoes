/*

Open-source, copyright free, non-commercial.  Make it better!  Images files are the property of Rotten Tomatoes.  

	TO-DO LIST:
	
	* warn user and fail gracefully if RT changes its code
	* scrape any movie ratings existing in RT user account and import
	* allow users to compare similarity with each other
	* stats/graphs about similarity score 
		* e.g. bell-curve of similarity of all critics

*/

// script-wide vars
var storage = chrome.storage.local;
var pageFilmIndex = 0;
var scrapeMovie = true;
var pageFilmPath = '';
var pageFilmName = '';
var pageFilmReleaseDate = '';
var ratingsArray = new Array();
var criticsArray = new Array();
var pagesToScrape = 20;
var scrapeCounter = 1;
var dataVersion = 4; // current version of data table:  when storage methods change, this allows some old versions to be detected and fixed
var totalUserRatings = 0;
// these are IDs that are subject to change if RT updates their code
var loginRT = '#header-logout-link'; 
var starWidgetRT= '#movie_rating_widget .stars';
var allCriticsFreshnessScoreRT = '#all-critics-meter';










/////////////////////////
//        ACTION       //
/////////////////////////

// while any ajax is loading, hide triggers
// everything has to happen inside of the load data callback function 
// because it's asynchronous with the rest of the code
storage.get('ratings', function(items) {
	insert_styles();
	insert_widget_holder();
	create_ratings_table(items.ratings);
	insert_score_widget();
	add_score_widget_events();
	if($('.meter_box').length>0) { // if this page contains a film 
		pageFilmName = $('.movie_title span')[0].innerHTML;
		pageFilmPath = location.pathname;
		pageFilmReleaseDate = $('.movie_info .right_col span span').eq(0).attr('content');
		add_pageFilm();
		fix_old_version();
		insert_meter_widget();
		insert_distribution_widget();
		insert_rating_widget();
		match_rating_widgets();
		add_rating_widget_events();
		insert_extras();
		add_extras_events();
		// have we scraped this film before?
		if(scrapeMovie) {
			$.ajax({
				// find out how many pages to scrape
				url: pageFilmPath + 'reviews/?page=1&sort=name',
				cache: false,
				dataType: 'html',
				success: function(response) {
					var $el = $('<div>').html(response);
					$el = $el.find('.scroller').eq(0).children().first();
					var txt = $el.html();
					if(!txt) txt = 'of 0';
					pagesToScrape = parseInt(txt.substring(txt.indexOf('of ')+3, txt.length));
					// create deferred ajax calls
					var deferreds = scrape_rt_ratings();
					// scrape away
					$.when.apply(null, deferreds).done(function() {
						fill_critics_array();
						update_score_widget();
						update_meter_widget();
						update_distribution_widget();
						save_to_storage();
						$('#rating_widget').css('display','block');
						$('#updating').css('display','none');
					});
				},
			});
		} else {
			fill_critics_array();
			update_score_widget();
			update_meter_widget();
			update_distribution_widget();
			$('#rating_widget').css('display','block');
			$('#updating').css('display','none');	
		}
	} else {
		fill_critics_array();
		update_score_widget();
	}
});















/////////////////////////
//       PRIMARY       //
//      FUNCTIONS      //
/////////////////////////

function insert_styles() {
	var txt = '';
	txt +=  '<style type="text/css">\n';
	txt += '#widget_holder 						{ position:fixed; right: 0; top:75px; background-color: #FFFFFF; border-top: 2px solid #FF0000; border-bottom: 2px solid #FF0000; border-left: 2px solid #FF0000;'; 
	txt += 												'padding-bottom:5px; border-radius:4px 0px 0px 4px; z-index:1; -webkit-box-shadow:6px 6px 8px rgba(0, 0, 0, 0.47); }\n';
	txt += '#widgets_col1 						{ float:left; width:186px; }\n';
	txt += '#widgets_col2 						{ float:left; width:0px; height:0px; background-color:rgb(241, 241, 241); overflow-y:auto; overflow-x:hidden; ';
	txt += 												'-webkit-transition-property:width; -webkit-transition-duration:.3s; -webkit-transition-timing-function:ease; }\n';
	txt += '#widgets_col2 div 					{ padding:5px; }\n';
	txt += '.rated_movie						{ white-space:nowrap; }\n';
	txt += '#import_raw							{ position:relative; opacity:0; z-index:1; }\n';
	txt += '#fake_import						{ position:relative; top:-26px; }\n';
	txt += '#widgets_footer						{ clear:both; margin:0px 0px 0px 10px; font-size: 10px; padding-top:5px; border-top: 1px solid rgb(214, 214, 214); }';
	txt += '#widgets_footer a 					{ font-weight:bold; margin-right:20px; }\n';
	txt += '#swe_erase 							{ float:right; color: rgb(228, 0, 0); margin-right:10px !important; }\n';
	txt += '.exporter							{ -webkit-box-align: center; text-align: center; color: buttontext; padding: 2px 6px 3px; border: 2px outset buttonface; ';
	txt += 												'background-color: buttonface; box-sizing: border-box; -webkit-appearance: push-button; white-space: pre; -webkit-rtl-ordering: logical; ';
	txt += 												'-webkit-user-select: text; font: -webkit-small-control; display: inline-block; -webkit-writing-mode: horizontal-tb; }\n';
	txt += '.exporter:hover		 				{ text-decoration:none; }\n';
	
	txt += '.hover_tip_L 						{ opacity:.9; background:transparent url(' + chrome.extension.getURL('images/tipRight.png') + ') no-repeat 123px 8px;'; 
	txt += 												'margin-right:4px; position:absolute; padding-right:5px; z-index:65531; display:none; left:-130px; }\n';
	txt += '.hover_tip_L > span 				{ background-color:#333; color:white; display:block; max-width:115px; padding:2px 4px; border-radius:4px; -webkit-border-radius:4px; }\n';

	txt += '#meter_widget						{ position:relative; float:left; }\n';
	txt += '#meter_title						{ display:block; margin:0px 0px 0px 10px; padding-top: 6px; text-decoration:none; cursor:text; }\n';
	txt += '#meter_title div					{ display:inline; text-transform: uppercase; font-weight: bold; font-size:10px; color: #556F1E; }\n';
	txt += '#meter_title .hover_tip_L 			{ top: -2px; }\n';
	txt += '#meter_title:after 					{ content: url(' + chrome.extension.getURL('images/help.png') + '); padding-left: 2px; vertical-align: middle; }\n';
	txt += '#meter_title:hover p				{ display:block; }\n';
	txt += '#adjusted_tomato					{ float:left; margin:0px 0px 6px 6px; width:50px; height:50px; background:url(' + chrome.extension.getURL('images/meter.png') + ') left top no-repeat; }\n';
	txt += '#adjusted_score						{ float:left; margin-top:15px; margin-left:3px; font-size: 48px; color:#506A16; font-family: Arial, Helvetica, sans-serif; font-weight:bold; }\n';
	txt += '#adjusted_percent					{ float:left; margin-top:6px; font-size: 24px; color:#506A16; font-family: Arial, Helvetica, sans-serif; font-weight:bold; }\n';

	txt += '#distribution_widget				{ position:relative; float:left; }\n';
	txt += '#distribution_title					{ display:block; width:176px; float:left; margin:0px 0px 0px 10px; padding-top:6px; border-top:1px solid rgb(214, 214, 214); text-decoration:none; cursor:text; }\n';
	txt += '#distribution_title div				{ display:inline; text-transform: uppercase; font-weight: bold; font-size:10px; color: #556F1E; }\n';
	txt += '#distribution_title .hover_tip_L 	{ top: -2px; }\n';
	txt += '#distribution_title:after 			{ content: url(' + chrome.extension.getURL('images/help.png') + '); padding-left: 2px; vertical-align: middle; }\n';
	txt += '#distribution_title:hover p			{ display:block; }\n';
	txt += '#dist_holder						{ display:block; position:relative; width:170px; height:35px; margin-top:24px; margin-left:10px; margin-bottom:5px; background:url(' + chrome.extension.getURL('images/distribution_bg.png') + ') left top no-repeat;}\n';
	txt += '#dist_holder div					{ display:block; float:left; width:29px; height:0px; margin-right:5px; margin-top:0px; background-color:rgba(110, 168, 64, 0.64); }\n';
	
	txt += '#rating_widget						{ display:none; float:left; position:relative; margin-left:10px; zoom:1; overflow:hidden; }\n';
	txt += '#rating_title						{ display:block; width:176px; float:left; margin:0px 0px 0px 10px; padding-top:6px; border-top:1px solid rgb(214, 214, 214); text-decoration:none; cursor:text; }\n';
	txt += '#rating_title div					{ display:inline; text-transform: uppercase; font-weight: bold; font-size:10px; color: #556F1E; }\n';
	txt += '#rating_title .hover_tip_L 			{ top: 152px; }\n';
	txt += '#rating_title:after 				{ content: url(' + chrome.extension.getURL('images/help.png') + '); padding-left: 2px; vertical-align: middle; }\n';
	txt += '#rating_title:hover p				{ display:block; }\n';
	txt += '#updating 							{ position:relative; float: left; margin:0px 0px 10px 10px; overflow:hidden; color:#000; display:block; }\n';

	txt += '#rating_widget ul 					{ width:176px; margin:0; padding:0; }\n';
	txt += '#rating_widget li 					{ display:inline; list-style:none; }\n';
	txt += '#rating_widget li a, #rating_widget b { background:url(' + chrome.extension.getURL('images/star_rate.png') + ') left top repeat-x; }\n';
	txt += '#rating_widget li a 				{ float:right; margin:0 80px 0 -160px; width:96px; height:16px; background-position:left 16px; color:#000; text-decoration:none; }\n';
	txt += '#rating_widget li a:hover			{ background-position:left -32px; }\n';
	txt += '#rating_widget b 					{ position:absolute; z-index:-1; width:96px; height:16px; background-position:left -16px; }\n';
	txt += '#rating_widget div b 				{ left:0px; bottom:0px; background-position:left top; }\n';
	txt += '#rating_widget li a span 			{ position:absolute; left:-300px; }\n';
	txt += '#rating_widget li a:hover span 		{ left:106px; width:100%; }\n';
	txt += 'li a#star_a_0	 					{ background-position:left -48px; }\n';
	txt += 'li a#star_a_0:hover					{ background-position:left -64px; }\n';

	txt += '#score_widget						{ height:0px; float:left; overflow:hidden; margin-top:10px; -webkit-transition-property:height; -webkit-transition-duration:.3s; -webkit-transition-timing-function:ease;}\n';
	txt += '#score_title						{ display:block; float:left; margin:0px 0px 0px 10px; padding-top:6px; border-top:1px solid rgb(214, 214, 214); text-decoration:none; cursor:text; }\n';
	txt += '#score_title div					{ display:inline; text-transform: uppercase; font-weight: bold; font-size:10px; color: #556F1E; }\n';
	txt += '#score_title .hover_tip_L 			{ top: 128px; }\n';
	txt += '#score_title:after 					{ content: url(' + chrome.extension.getURL('images/help.png') + '); padding-left: 2px; vertical-align: middle; }\n';
	txt += '#score_title:hover p				{ display:block; }\n';
	txt += '#score_filter						{ float:left; text-transform: uppercase; font-weight: bold; font-size:10px; color:#3c7ee2; padding:7px 21px 0px 21px; border-top:1px solid rgb(214, 214, 214); ';
	txt += 												'text-decoration:none; }\n';

	txt += '#critic_rows 						{ height: 100px; overflow:scroll; float:left; }\n';
	txt += '#critic_rows div.row_wrapper		{ float:left; }\n';
	txt += '#critic_rows a						{ display:block; float:left; overflow:hidden; width:91px; white-space:nowrap; margin-left:10px; margin-bottom:2px; }\n';
	txt += '#critic_rows div.tiny_meter			{ float:left; padding:0px; background:url(' + chrome.extension.getURL('images/tiny_meter.png') + ') no-repeat top right; width:12px;';
	txt += 												'margin-left:5px; height:12px; overflow:hidden; }\n';
	txt += '#critic_rows div.fresh	 			{ background-position:left -12px; }\n';
	txt += '#critic_rows div.rotten 			{ background-position:left -24px; }\n';
	txt += '#critic_rows div.unrated 			{ display:none; }\n';
	txt += '#critic_rows div.med 				{ opacity:.8; }\n';
	txt += '#critic_rows div.low 				{ opacity:.6; }\n';
	txt += '#critic_rows div.non 				{ opacity:.4; }\n';
	txt += '#critic_rows div.shown	 			{ display:block; }\n';
	txt += '#critic_rows div.score				{ float:left; overflow:hidden; margin-left:2px; width:32px; text-align:right; font-weight:bold; }\n';
	txt += '#critic_rows div.count				{ float:left; width:22px; overflow:hidden; margin-right:-45px; margin-left:5px; font-size:9px }\n';
	txt += '#critic_rows div.noratings			{ margin-left:10px; margin-bottom:2px; font-weight:normal; width:155px; text-align:left; }\n';

	txt += '</style>';
	txt += '<div id="emptyPlaceholder2"></div>';
	$('#emptyPlaceholder').after(txt);
}

function insert_widget_holder() {
	var txt = '';
	txt += '<div id="widget_holder">';
		txt += '<div id="widgets_col1">';
		txt += '</div>'
		txt += '<div id="widgets_footer">';
			txt += '<a href="#" id="swe_size">open</a>';
			txt += '<a href="#" id="swe_erase">erase</a>';
		txt += '</div>';
	txt += '</div>';
	$('#emptyPlaceholder2').after(txt);	
}

function create_ratings_table(ratingsData) {
	// check validity of ratingsData
	var validData = false;
	if(ratingsData) {
		if(ratingsData.length>0) {
			if(ratingsData[0].length>0) {
				if(ratingsData[0][0].length>0) {
					if(ratingsData[0][0][0]) {
						ratingsArray = ratingsData;
						validData = true;
					}
				}
			}
		}
	}
	if(validData) {
		sanitize_ratings_array();	
	} else {
		// construct fresh Array
		ratingsArray = new Array();
		ratingsArray[0] = new Array();
		ratingsArray[0][0] = new Array();
		ratingsArray[0][0][0] = dataVersion; // current version of data table
		ratingsArray[0][1] = new Array();
		ratingsArray[0][1][0] = 'you'; // critic name
		ratingsArray[0][1][1] = 'n/a'; // critic path
		ratingsArray[0][1][2] = 0; // legacy
		ratingsArray[0][1][3] = 0; // legacy
	}
}

function sanitize_ratings_array() {
	for(var i=0; i<ratingsArray.length; i++) { // 
		// check for fouled up rows
		if(ratingsArray[i]) {
			for(var j=0, jl=ratingsArray[i].length; j<jl; j++) {
				// check for foulded up "cells"
				if(ratingsArray[i][j]) {
				} else {
					ratingsArray[i][j] = new Array();				
				}
			}
		} else {
			ratingsArray.splice(i,1);
			i-=1;
		}
	}
	for(var j=2, jl=ratingsArray[0].length; j<jl; j++) {
		// check for fouled up columns
		if(ratingsArray[0][j]) {
			var criticName = ratingsArray[0][j][0];
			if(!criticName || criticName=='' || criticName==0) {
				// delete column
				for(var i=0, il=ratingsArray.length; i<il; i++) {
					ratingsArray[i].splice(j,1);
				}
			}
		} else {
			// delete column
			for(var i=0, il=ratingsArray.length; i<il; i++) {
				ratingsArray[i].splice(j,1);
			}			
		}
	}
}

function insert_score_widget() {
	var txt = '';
	txt += '<div id="score_widget">';
		txt += '<a href="#" id="score_title" onclick="return false;">';
			txt += '<div>Critics like you</div>';
			txt += '<p class="hover_tip_L"><span>Tomato icon shows this critic\'s ratings for this movie. ';
			txt += 'The % is this critic\'s similarity to you based on the (number) of movies you have both rated. More shows critics that haven\'t rated this movie.</span></p>';
		txt += '</a>';
		txt += '<a href="#" id="score_filter"><span>more</span></a>';
		txt += '<div id="critic_rows">';
		txt += '</div>'
	txt += '</div>'
	// check if we're on a film page or not
	$('#widgets_col1').html(txt);
}

function add_score_widget_events() {
	$('#swe_size').click(function(event) {
		resize_score_widget();
		return false;
	});
	$('#swe_erase').click(function(event) {
		erase_data();
		return false;
	});
	$('#score_filter').click(function(event) {
		apply_critic_filter();
		return false;
	});	
}

function add_pageFilm() {
	for(var i=1, il=ratingsArray.length; i<il; i++) {
		// search for this film in the array
		if(ratingsArray[i][0][1] == pageFilmPath) {
			pageFilmIndex = i;
			var dY = pageFilmReleaseDate.substring(0,4);
			var dM = (pageFilmReleaseDate.substring(5,7))-1;
			var dD = pageFilmReleaseDate.substring(8,10);
			var rDate = new Date(dY,dM,dD,0,0,0,0);	
			var today = new Date();
			var lastWeekMS = today.getTime();
			var lwDate = new Date();
			lwDate.setDate(lwDate.getDate()-7)
			// rescrape movie unless release date was at least a week ago 
			if(rDate<lwDate) {
				scrapeMovie = false;
			}
		}
	}
	// if this film not found, add new row to the array
	if(pageFilmIndex < 1) {
		pageFilmIndex = ratingsArray.length;
		ratingsArray[pageFilmIndex] = new Array();
		for(var j=0, jl=ratingsArray[0].length; j<jl; j++) {
			ratingsArray[pageFilmIndex][j] = new Array;
		}
		ratingsArray[pageFilmIndex][0][0] = pageFilmName;
		ratingsArray[pageFilmIndex][0][1] = pageFilmPath;
		ratingsArray[pageFilmIndex][0][2] = 0; // legacy
		ratingsArray[pageFilmIndex][1][0] = 0; // you have't rated yet
		ratingsArray[pageFilmIndex][1][1] = 0; // legacy
		ratingsArray[pageFilmIndex][1][2] = 'n/a'; // there's no link to your review
	}	
}

function fix_old_version() {
	if(ratingsArray[0][0][0] != dataVersion) {
		// fix older version that didn't record the path to each movie review
		if(!ratingsArray[pageFilmIndex][1][2]) {
			ratingsArray[pageFilmIndex][1][2] = 'n/a';
			scrapeMovie = true; // old version, so re-scrape this film
		}
		// fix older version that incorrectly calculated comparison score
		if(ratingsArray[0][1][2] > 0) {
			for(var j=1, jl=ratingsArray[0].length; j<jl; j++) {
				ratingsArray[0][j][2] = 0;
				ratingsArray[0][j][3] = 0;
				for(var i=1, il=ratingsArray.length; i<il; i++) {
					ratingsArray[i][j][1] = 0;
				}
			}
			save_to_storage();
		}
	}
}

function insert_meter_widget() {
	var txt = '';
	txt += '<div id="meter_widget">';
		txt += '<a href="#" id="meter_title" onclick="return false;">';
			txt += '<div>Smarter Tomatometer</div>';
			txt += '<p class="hover_tip_L"><span>Critics who agree with you are given high weighting, while critics who disagree with you are given low weighting.</span></p>';
		txt += '</a>';
		txt += '<div id="adjusted_tomato"></div>';
		txt += '<div id="adjusted_score">?</div>';
		txt += '<div id="adjusted_percent">%</div>';
		txt += '<div style="clear:both;"></div>';
	txt += '</div>';
	$('#widgets_col1').prepend(txt);	
}

function insert_distribution_widget() {
	var txt = '';
	txt += '<div id="distribution_widget">';
		txt += '<a href="#" id="distribution_title" onclick="return false;">';
			txt += '<div>Distribution of Ratings</div>';
			txt += '<p class="hover_tip_L"><span>Count of critics that gave each number of stars, weighted by each critic\'s similarity to you.</span></p>';
		txt += '</a>';
		txt += '<div id="dist_holder">';
			txt += '<div id="dist_s0"></div>';
			txt += '<div id="dist_s1"></div>';
			txt += '<div id="dist_s2"></div>';
			txt += '<div id="dist_s3"></div>';
			txt += '<div id="dist_s4"></div>';
		txt += '</div>';
	txt += '</div>';
	$('#meter_widget').after(txt);	
}

function insert_rating_widget() {
	var txt = '';
	txt += '<a href="#" id="rating_title" onclick="return false;">';
		txt += '<div>Your Rating</div>';
		txt += '<p class="hover_tip_L"><span>Rate more movies to improve the accuracy of the tomatometer and your list of similar critics.</span></p>';
	txt += '</a>';
	txt += '<div id="updating">gathering ratings...</div>';
	txt += '<div id="rating_widget">';
		txt += '<div><b></b></div>';
		txt += '<ul>';
			txt += '<li><a href="#" id="star_a_5"><span id="star_5">best</span></a></li>';
			txt += '<li><a href="#" id="star_a_4"><span id="star_4">good</span></a></li>';
			txt += '<li><a href="#" id="star_a_3"><span id="star_3">okay</span></a></li>';
			txt += '<li><a href="#" id="star_a_2"><span id="star_2">bad</span></a></li>';
			txt += '<li><a href="#" id="star_a_1"><span id="star_1">worst</span></a></li>';
			txt += '<li><a href="#" id="star_a_0"><span id="star_0">not rated</span></a></li>';
		txt += '</ul>';
	txt += '</div>';
	$('#distribution_widget').after(txt);
}

function match_rating_widgets() {
	var el = $(loginRT);
	if(el.length>0) { // logged in to RT
		var rtWidget = $(starWidgetRT).eq(0);
		var rtStars = $(rtWidget).attr('class');
		rtStars = rtStars.substring(rtStars.indexOf('score')+5,rtStars.length);
		var num = Math.round(parseInt(rtStars)/10);
		if(num>0 && num != ratingsArray[pageFilmIndex][1][0]) { // if RT rating exists, override local rating if necessary
			save_rating(num);
			update_rating_widget(num);
			fill_critics_array();
			update_score_widget();
			update_meter_widget();
			update_distribution_widget();
			save_to_storage();
		} else { // RT rating doesn't exist
			if(ratingsArray[pageFilmIndex][1][0]>0) { // if local rating exists
				// update local widget
				num = ratingsArray[pageFilmIndex][1][0];
				$('#star_' + num).after('<b id="user_rating"></b>');
				// update RT widget
				simulate_rt_widget_click(num);
			}	
		}
	}
}

function update_rating_widget(star) {
	if('#user_rating') {
		$('#user_rating').remove();
	}
	$('#star_' + star).after('<b id="user_rating"></b>');		
}

function add_rating_widget_events() {
	// add events for each star in the widget
	for(var x=0, xl=6; x<xl; x++) {
		$('#star_a_'+x).click({ x:x }, function(event) {
			// save data and update
			var num = event.data.x;
			save_rating(num);
			update_rating_widget(num);
			fill_critics_array();
			update_score_widget();
			update_meter_widget();
			update_distribution_widget();
			save_to_storage();
			var el = $(loginRT); 
			if(el.length==0) { 
				// not logged in on RT
				doLogInWarn();
			} else {
				// logged in on RT
				// so simulate click on RT
				simulate_rt_widget_click(num)
			}
			return false;
		});
	}
	
	// add new event to RT's native rating widget
	// will execute whether real or simulated click
	var rtWidget = $(starWidgetRT).eq(0);
	$(rtWidget).click(function(event) {
		var el = $(loginRT);
		if(el.length==0) { 
			// not logged in on RT
			doLogInWarn();
		}
		// check class for how many stars were clicked and whether to save locally
		$(this).removeClass('score');
		var num = 0;
		var simulated = false;
		var classList = $(this).attr('class').split(/\s+/);
		$.each(classList, function(index, item) {
			if(item.indexOf('score')>-1) {
				var stars = item.substring(5,item.length);
				num = Math.round(parseInt(stars)/10);
			}
			if(item.indexOf('simulated')>-1) {
				simulated = true;
			}
		});
		if(!simulated) {
			// save and update
			save_rating(num);
			update_rating_widget(num);
			fill_critics_array();
			update_score_widget();
			update_meter_widget();
			update_distribution_widget();
			save_to_storage();
		}
		$(this).removeClass('simulated');
	});
}

function doLogInWarn() {
	var txt = '';
	txt += 'Hey, whoa! \n\nSince you\'re not logged-in, your ratings will only be stored in this widget and not in Rotten Tomatoes\'s widget.';
	txt += 'That could get confusing, so I recommend that you log-in now. \n\nThis message is displayed once per session.';
	var c = readCookie('loginwarning');
	if(c!='yes') {
		alert(txt);
		document.cookie = 'loginwarning=yes';
	}
}

function insert_extras() {
	$('#swe_size').after('<a href="#" id="swe_extras">extras</a>');
	$('#swe_extras').click(function(event) {
		update_rated_movies();
		resize_extras_widget();
		return false;	
	});
	var txt = '';
	txt += '<div id="widgets_col2">';
		txt += '<div>';
			txt += '<p>';
				txt += '<span>Import/Export options are<br>below these movies you\'ve rated:</span>';
			txt += '</p>';
			txt += '<div id="rated_movies">';
			txt += '</div>';
			txt += '<p>';
				txt += '<span>Export critic similiarity list.</span>';
			txt += '</p>';
			txt += '<p>';
				txt += '<a href="#" class="exporter" id="export_critics">Save Critics</a>';
			txt += '</p><p>&nbsp;</p>';
			txt += '<p>';
				txt += '<span>Transfer your ratings between computers.</span>';
			txt += '</p>';
			txt += '<p>';
				txt += '<a href="#" class="exporter" id="export_raw">Export Raw File</a>';
			txt += '</p>';
			txt += '<p>';
				txt += '<input type="file" id="import_raw" name="files[]" accept="application/octet-stream" />';
				txt += '<output id="list_ratings"></output>';
			txt += '</p>';
			txt += '<p>';
				txt += '<input type="button" id="fake_import" name="fake_import" value="Import Raw File" />';
			txt += '</p>';
			txt += '<p>';
				txt += '<span>Export a comparison of every critic with every other critic, given the movies you\'ve rated so far.  The report will contain all critic-pairs who have rated at least one movie in common.'; 
				txt += ' WARNING:  This may generate a very large file and may take one or more minutes to complete.</span>';
			txt += '</p>';
			txt += '<p>';
				txt += '<a href="#" class="exporter" id="compare_all">Export Comparison</a>';
			txt += '</p><p>&nbsp;</p>';
		txt += '</div>';
	txt += '</div>'
	$('#widgets_col1').after(txt);
}

function add_extras_events() {
	$('#import_raw').change(function(event) {
		import_raw_data(event);
	});
	$('#export_raw').click(function(event) {
		if(!$(this).attr('download')) { // no download link so create then simulate click
			export_data(JSON.stringify(ratingsArray),'my_heirloom_rotten_tomatoes_data.bin','application/octet-stream',this);
		}
	});
	$('#export_critics').click(function(event) {
		var theData = 'critic name,similarity to you,count of films you both rated,bayesian sort\n';
		var tempStr = '';
		for(var x=0,xl=criticsArray.length; x<xl; x++) {
			tempStr = criticsArray[x][0];
			tempStr = tempStr.replace(/,/g,'');
			theData += '"' + tempStr + '",' + criticsArray[x][3] + ',' + criticsArray[x][4] + ',' + criticsArray[x][5] + '\n';
		}
		if(!$(this).attr('download')) { // no download link so create then simulate click
			export_data(theData,'my_top_critics.csv','text/plain',this);	
		}
	});
	$('#compare_all').click(function(event) {
		compare_all(this);
//		get_pearsons(this);
	});
}

function compare_all(el) {
	if(!$(el).attr('download')) { // no download link so do calculation
		console.log('no downlaod attr');
		var theData = 'critic A name,critic B name,common films,difference\n';
		var avgArray = new Array();
		var jl=ratingsArray[0].length;
		var il=ratingsArray.length;
		// find the average rating for this film
		for(var i=1; i<il; i++) {
			var ratingsCount = 0;
			var sumRatings = 0;
			for(var j=1; j<jl; j++) {
				var rating = widenRating(ratingsArray[i][j][0],1,5);
				if(rating>0) { // if this critic rated this film
					sumRatings += rating;
					ratingsCount++;
				}
			}
			avgArray[i] = sumRatings/ratingsCount;
		}
		// compare critics
		for(var jA=1; jA<jl; jA++) { // factorially iterate critics
			for(var jB=jA; jB<jl; jB++) { 
				var nameA = ratingsArray[0][jA][0];
				var nameB = ratingsArray[0][jB][0];
				nameA = nameA.replace(/,/g,''); // strip commas
				nameB = nameB.replace(/,/g,'');
				var commonFilmsCount = 0;
				var sumSquareDiff = 0;
				for(var i=1; i<il; i++) {
					var ratingA = widenRating(ratingsArray[i][jA][0],1,5); // min 1, max 5
					var ratingB = widenRating(ratingsArray[i][jB][0],1,5);
					if(ratingA>0 && ratingB>0) { // if both critics rated this movie
						// find how far critic's rating is from the average rating
						ratingA = avgArray[i] - ratingA; // min -4, max 4
						ratingB = avgArray[i] - ratingB;
						// then difference from each other
						sumSquareDiff += Math.pow(ratingA-ratingB,2) // max 16
						commonFilmsCount++;
	
						// testing
						if(nameA.indexOf('Emanuel Levy')>-1) {
							if(nameB.indexOf('James Berardinelli')>-1) {
								var title = ratingsArray[i][0][0];
								if(title) {
									title = title.replace(/,/g,''); // strip commas
								}
								theData += title + ',' + ratingsArray[i][jA][0] + ',' + ratingsArray[i][jB][0] + ',' + avgArray[i] + '\n';	
							}
						}	
	
					}
				}
/*
				// find norm of distance between critics
				var similarity = sumSquareDiff/commonFilmsCount; // average, max 16
				similarity = Math.sqrt(similarity); // max 4
				similarity = 1-(similarity/4); // %
				if(commonFilmsCount>4) { // throw out pairings where data set is too small
					if(nameA != nameB) { // throw out matching pair
						theData += nameA + ',' + nameB + ',' + commonFilmsCount + ',' + similarity + '\n';
					}
				}
*/
			}
		}
		console.log('calculations complete');
		export_data(theData,'all_critics_compared.csv','text/plain',el);	// no download link so create it and simulate a click
		return false;
	}
}

function get_pearsons(el) {
	if(!$(el).attr('download')) { // no download link so do calculation
		console.log('no downlaod attr');
		// pearsons r calculation
		var theData = 'critic A name,critic B name,correl,count,average difference,,title,A rating,B rating,\n';
		var tempArray = new Array();
		var pairCount = 0;
		var jl=ratingsArray[0].length;
		var il=ratingsArray.length;
		for(var jA=1; jA<jl; jA++) { // factorially iterate critics
			for(var jB=jA; jB<jl; jB++) { 
				var nameA = ratingsArray[0][jA][0];
				var nameB = ratingsArray[0][jB][0];
				tempArray[pairCount] = new Array();
				tempArray[pairCount][0] = nameA;
				tempArray[pairCount][1] = nameB;
				// get mean of ratings of critic A and critic B
				var commonFilmsCount = 0;
				var sumRatingsA = 0;
				var sumRatingsB = 0;
				for(var i=1; i<il; i++) {
					var ratingA = widenRating(ratingsArray[i][jA][0],1,5);
					var ratingB = widenRating(ratingsArray[i][jB][0],1,5);
					if(ratingA && ratingB) { // if both critics rated this movie
						if(ratingA>0 && ratingB>0) { 
							sumRatingsA += ratingA;
							sumRatingsB += ratingB;
							commonFilmsCount++;
						}
					}
				}
				var meanA = sumRatingsA/commonFilmsCount;
				var meanB = sumRatingsB/commonFilmsCount;
				// get sum of square of deviation from mean of each rating for criticA and critic B, and
				// get sum of product of critic A deviation and critic B deviation				
				var sumSquareDevA = 0;
				var sumSquareDevB = 0;
				var sumProdDev = 0;
				var sumDiff = 0;
				for(var i=1; i<il; i++) {
					var ratingA = widenRating(ratingsArray[i][jA][0],1,5);
					var ratingB = widenRating(ratingsArray[i][jB][0],1,5);
					if(ratingA && ratingB) { // if both critics rated this movie
						if(ratingA>0 && ratingB>0) { 
							var devA = ratingA - meanA;
							var devB = ratingB - meanB;
							sumSquareDevA += Math.pow(devA,2);
							sumSquareDevB += Math.pow(devB,2);
							sumProdDev += devA * devB;		
							sumDiff += Math.abs(ratingA - ratingB);
/*	
							// testing
							if(nameA.indexOf('Ali Gray')>-1) {
								if(nameB.indexOf('Cole Smithey')>-1) {
									theData += ',,,,,,' + ratingsArray[i][0][0] + ',' + ratingA + ',' + ratingB + '\n';	
								}
							}	
*/	
						}
					}
				}
				pearsonsR = sumProdDev / Math.sqrt( sumSquareDevA * sumSquareDevB );
				averageDifference = sumDiff / commonFilmsCount;
				averageDifference = 1-(averageDifference/4)
				tempArray[pairCount][2] = pearsonsR;
				tempArray[pairCount][3] = commonFilmsCount;
				tempArray[pairCount][4] = averageDifference;
				pairCount++;
			}
		}
		for(var x=0; x<pairCount; x++) {
			var nameA = tempArray[x][0];
			nameA = nameA.replace(/,/g,'');
			var nameB = tempArray[x][1];
			nameB = nameB.replace(/,/g,'');
			var correl = tempArray[x][2];
			var commonFilmsCount = tempArray[x][3];
			var averageDifference = tempArray[x][4];
			if(commonFilmsCount>4) { // throw out pairings where data set is too small
				if(nameA != nameB) { // throw out matching pair
					theData += nameA + ',' + nameB + ',' + correl + ',' + commonFilmsCount + ',' + averageDifference + '\n';
				}
			}
		}
		console.log('calculations complete');
		export_data(theData,'all_critics_pearson.csv','text/plain',el);	// no download link so create it and simulate a click
		return false;
	}
}

function scrape_rt_ratings() {
	var deferreds = [];
	for(var p=1, pl=pagesToScrape; p<=pl; p++) {
		// load each page of ratings
		deferreds.push(
			$.ajax({
				// obviously this will fail if RT changes their navigation conventions
				url: pageFilmPath + 'reviews/?page=' + p + '&sort=name',
				cache: false,
				dataType: 'html',			
				success: function(response) {
					var $el = $('<div>').html(response);
					$el = $el.find('#reviews').find('.media_block_content');
					// cycle through all critics on page
					for(var y=0, yl=$el.length; y<yl; y++) {
						var criticName = $el.eq(y).find('.criticinfo').find('a').html();
						if(!criticName) { criticName = '(unknown)'; }
						var criticPath = $el.eq(y).find('.criticinfo').find('a').attr('href');
						var reviewPath = $el.eq(y).find('.reviewsnippet').find('p').eq(1).find('a').attr('href');
						var ratingEL = $el.eq(y).find('.tmeterfield').find('div')[0];
						var criticRating = sanitize_rating(ratingEL);
						var newCritic = true;
						// cycle through critics in ratings table
						//  j = existing critic, J = new critic
						//  i = existing film, I = new film					
						//	    j1 j2 
						//	i1   *  *   
						//	i2   *  *   
						for(var j=2, jl=ratingsArray[0].length; j<jl; j++) {
							if(criticPath == ratingsArray[0][j][1]) { // if match found 
								// add data 
								ratingsArray[pageFilmIndex][j][0] = criticRating;
								ratingsArray[pageFilmIndex][j][1] = 0; // legacy
								ratingsArray[pageFilmIndex][j][2] = reviewPath;
								newCritic = false;
								//	    j1 j2
								//	i1   *  *   
								//	i2   *  *   
								//	I3   	*	
							}
						}	
						if(newCritic) {	// add new critic and data to ratings table
							var columns = ratingsArray[0].length;
							
							// add new column (header)
							ratingsArray[0][columns] = new Array();
							ratingsArray[0][columns][0] = criticName;
							ratingsArray[0][columns][1] = criticPath;			
							ratingsArray[0][columns][2] = 0; // legacy			
							ratingsArray[0][columns][3] = 0; // legacy	
							for(var i=1, il=ratingsArray.length; i<il; i++) { 
								for(var j=2, jl=columns; j<jl; j++) {
									if(!ratingsArray[i][j][0]) { // fill in empty cells of existing columns
										ratingsArray[i][j][0] = 0; // no rating yet
										ratingsArray[i][j][1] = 0; // 0
										ratingsArray[i][j][2] = ''; // no review link yet
										//	    j1 j2  
										//	i1   *  *  
										//	i2   *  *  
										//	I3   *	* 										
									}
								}
								// add new column (cell for each row)
								ratingsArray[i][columns] = new Array();
								ratingsArray[i][columns][0] = 0; // no rating yet
								ratingsArray[i][columns][1] = 0; // legacy
								ratingsArray[i][columns][2] = ''; // no review link yet
								//	    j1 j2 J3 
								//	i1   *  *  * 
								//	i2   *  *  * 
								//	I3   *  *  *											
							}
							// add new row (last cell in new row & column for each critic
							ratingsArray[pageFilmIndex][columns][0] = criticRating;
							ratingsArray[pageFilmIndex][columns][1] = 0; // legacy
							ratingsArray[pageFilmIndex][columns][2] = reviewPath; // no comparison yet
							//	    j1 j2 J3 
							//	i1   *  *  * 
							//	i2   *  *  * 
							//	I3   *  *  *											
							//	I4         *											
						}
					}
					var txt = 'step ' + scrapeCounter + ' of ' + pagesToScrape + '...';
					scrapeCounter++;
					$('#updating').html(txt);						
				}
			})
		);
	}	
	return deferreds;	
}

function fill_critics_array() {
	// copy values to critics array for sorting
	for(j=2,jl=ratingsArray[0].length; j<jl; j++) {
		var x = j-2;
		criticsArray[x] = new Array();
		var critic = criticsArray[x];
		// 0 = name
		critic[0] = ratingsArray[0][j][0];
		// 1 = rating
		if(pageFilmIndex>0) {
			critic[1] = ratingsArray[pageFilmIndex][j][0]; 
		} else {
			critic[1] = ''; 	
		}
		// 2 = link
		if(ratingsArray[pageFilmIndex][j][2] && pageFilmIndex>0) {
			critic[2] = ratingsArray[pageFilmIndex][j][2]; 
		} else {
			critic[2] = ratingsArray[0][j][1]; 
		}	
		// compute comparison of user vs. each critic for each film 
		var count = 0;
		var total = 0;
		for(i=1,il=ratingsArray.length; i<il; i++) {
			// if film was rated by both user and critic
			var userRating = ratingsArray[i][1][0];
			var criticRating = ratingsArray[i][j][0];
			if(j==2 && userRating>0) {
				totalUserRatings++; // controls display of help messages
			}
			if(criticRating>0 && userRating>0) {
				count++;
				// compute user vs. critic average similarity
				total += getRatingsComparison(i,j,1);
			}
		}
		if(count>0) {
			// 3 = similarity score
			critic[3] = total/count;
		} else {
			critic[3] = .5; // no films in common, so assume 50% similarity
		}
		// 4 = films in common
		critic[4] = count;
	}
	// get average similarity score and count across all critics
	var avgScore = 0;
	var avgCount = 0;
	for(x=0,xl=criticsArray.length; x<xl; x++) {
		avgScore += criticsArray[x][3];
		avgCount += Math.pow(criticsArray[x][4],3); // see below
	}
	avgScore = avgScore/criticsArray.length;
	avgCount = avgCount/criticsArray.length;
	// calculate sort score using modified bayesian formula
	for(x=0,xl=criticsArray.length; x<xl; x++) {
		var score = criticsArray[x][3];
		var count = Math.pow(criticsArray[x][4],3); // this modification couses low count critics score worse
		// original bayes formula from:  http://www.andymoore.ca/2010/02/bayesian-ratings-your-salvation-for-user-generated-content
		criticsArray[x][5] = ( (avgCount * avgScore) + (count * score) ) / (avgCount + count);
		// this modification moves critics with low count & low score to the bottom
		if(Math.pow(count,3)<avgCount) {
			criticsArray[x][5] = criticsArray[x][5]-1; 
		}
	}
	// sort array decending based on sort column
	criticsArray.sort(function(a, b) {
		var aSort = a[5];
		var bSort = b[5];
		return bSort-aSort;
	});	
}

function getRatingsComparison(filmIndex, aCriticIndex, bCriticIndex) {
	var float = 0;
	var cR = ratingsArray[filmIndex][aCriticIndex][0];
	var uR = ratingsArray[filmIndex][bCriticIndex][0];
	// widen scale so that "very bad" & "bad" 
	// are more similar than "bad" & "okay", etc.
	cR = widenRating(cR,1,5);
	uR = widenRating(uR,1,5);
	// compare them
	float = Math.abs(cR-uR);
	float = (4-float)/4;
	return float;
}

function widenRating(num,lowest,highest) {
	// widends distance of value from center point between lowest possible and highest possible values
	//	*   *   *   *   *   *   *   *   *
	//	* *   *   *     *     *   *   * *
	//	**  *    *      *      *    *  **
	num = parseFloat(num);
	if(isNaN(num) || num<lowest || num>highest) { // sanitize, convert bad ratings to unrated
		return 0;
	} else {
		var center = (highest-lowest)/2;
		num = num-lowest;
		highest = highest-lowest;
		if(num<center) {
			num = (Math.pow(num,2))/highest;
		}
		if(num>center) {
			num = highest-num;
			num = (Math.pow(num,2))/highest;
			num = highest-num;
		}
		num = num+lowest;	
		return num;
	}
}

function update_score_widget() {
	var txt = '';
	if(totalUserRatings==0) {
		$('#score_title').css('display','none');	
		$('#score_filter').css('display','none');	
		txt += '<div class="noratings">';
		txt += 'This space is empty because you haven\'t rated any movies yet.<br><br>';
		if(pageFilmIndex>0) {
			txt += 'To rate movies, use the rating widget in this sidebar or use Rotten Tomatoes rating widget.';
		} else {
			txt += 'Just navigate to any movie and you\'ll find a rating widget.';
		}
		txt += '</div>';
	} else if(totalUserRatings==1) {
		$('#score_title').css('display','none');	
		$('#score_filter').css('display','none');	
		txt += '<div class="noratings">';
		txt += 'Okay, rate just one more movie to find your top critics. <br><br>Accuracy starts low and improves with every movie you rate. ';
		txt += 'Get fastest results by rating movies where you disagree with most critics<br><br>';	
		txt += '</div>';
	} else {
		$('#score_title').css('display','block');	
		$('#score_filter').css('display','block');	
		for(x=0,xl=criticsArray.length; x<xl; x++) {
			var critic = criticsArray[x]
			// 0 = name
			// 1 = rating
			// 2 = link
			// 3 = similarity score
			// 4 = films in common
			var rated = '';
			var tinyMeter = '';
			if(pageFilmIndex>0) { // film page
				if(!critic[1] || critic[1]=='') { 
					rated = ' unrated';
				} else if(critic[1]>2.9) { 
					tinyMeter = ' fresh';
				} else if(critic[1]<=2.9) {
					tinyMeter = ' rotten';
				}
			}
			var similarity = '';
			if(critic[3]<0.5) { 	
				similarity = ' non' 
			} else if(critic[3]<0.6) { 
				similarity = ' low' 
			} else if(critic[3]<0.7) { 
				similarity = ' med' 
			}
			txt += '<div class="row_wrapper' + rated + similarity + '">';
				txt += '<a target="_blank" href="' + critic[2] + '" title="' + critic[0] + '">' + critic[0] + '</a>';
				txt += '<div class="tiny_meter' + tinyMeter + '" title="' + critic[1] + '"></div>';
				txt += '<div class="score">' + Math.round(critic[3]*100) + '%</div>';
				txt += '<div class="count">(' + critic[4] + ')</span></div>';
			txt += '</div>';
		}
		// format look when not a film page
		if(pageFilmIndex==0) {
			$('#score_title').css('border','0px');
			$('#score_widget').css('margin-top','0px');
			$('#widgets_footer').css('border','0px');
			$('#score_filter').css('display','none');
		} 
	}
	$('#critic_rows').html(txt);
	$('#score_widget').css('height','124px');
	$('#swe_size').html('close');
}

function update_meter_widget() {
	var count = 0; // all critics - count
	var freshTotal = 0; // critics who rated this fresh - total of sort scores
	var freshCount = 0; // critics who rated this fresh - count
	var sortTotal = 0; // all critics - total of sort scores
	var ratingsTotal = 0; // all critics - total of ratings
	var avgFreshness = 0; // weighted % critics who rated this fresh 
	var avgRating = 0; // all critics - average rating
	// calculate smart freshness
	// cycle through critics
	for(x=0,xl=criticsArray.length; x<xl; x++) {
		// if film was rated
		if(criticsArray[x][1]>0 && criticsArray[x][1]!='') {
			// critic count as a fraction based on their sort score
			var sortScore = criticsArray[x][5];
			if(sortScore>0) {
				sortScore = Math.pow(sortScore,10); // very heavily weighting the most similar critics
			} else {	
				sortScore = Math.pow(sortScore,10) * -1; 
			}
			var rating = parseFloat(criticsArray[x][1]);
			// rated fresh?
			if(rating>2.9) { 
				freshTotal += sortScore; 
				freshCount++;
			}
			sortTotal += sortScore;
			ratingsTotal += parseFloat(criticsArray[x][1]);
			count++;
		}
	}
	// save smart meter score
	avgRating = ratingsTotal/count;
	if(sortTotal>0) {
		avgFreshness = freshTotal/sortTotal;
	} else {
		var temp = $(allCriticsFreshnessScoreRT).html();
		avgFreshness = parseInt(temp)/100;
	}
	var txt = '';
	if(!isNaN(parseInt(avgFreshness))) {
		txt = Math.round((avgFreshness)*100).toString();
	} else {
		txt = '?';	
	}
	$('#adjusted_score').html(txt);
	if(txt != '?') {
		if(avgFreshness>=.6) {
			$('#adjusted_tomato').css('background-position-y','-50px')
		} else {
			$('#adjusted_tomato').css('background-position-y','-100px')
		}
	}
}

function update_distribution_widget() {
	// calculate distribution of ratings per stars 1-5
	var starColumns = new Array(5);
	for(x=0,xl=starColumns.length; x<xl; x++) {
		starColumns[x]=0;
	}
	// cycle through critics
//	var debug = '';
	for(x=0,xl=criticsArray.length; x<xl; x++) {
		// if film was rated
		if(criticsArray[x][1]>0 && criticsArray[x][1]!='') {
			// critic counts as a fraction based on their sort score
			var sortScore = criticsArray[x][5]*100;
			if(sortScore>0) {
				sortScore = Math.pow(sortScore,10); // very heavily weighting the most similar critics
			} else {	
				sortScore = Math.pow(sortScore,10) * -1; 
			}
			var rating = parseFloat(criticsArray[x][1]);
			rating = parseInt(Math.round(rating-1));
			starColumns[rating] += sortScore;
		}
	}
//	console.debug(debug);
	var colMax = Math.max.apply(Math, starColumns);
	for(x=0,xl=starColumns.length; x<xl; x++) {
		starColumns[x] = starColumns[x]/colMax;
		starColumns[x] = Math.round(starColumns[x]*35);
		$('#dist_s' + x).css('height',starColumns[x]);
		$('#dist_s' + x).css('margin-top',35-starColumns[x]);
	}
}

function save_rating(star) {
	ratingsArray[pageFilmIndex][1][0] = parseInt(star);
}

function sanitize_rating(el) {
	// depends on RT maintaining its element ID conventions
	var txt = '';
	var rating = 0;
	if(el.getAttribute('tip')) { 
		// complex ratings
		txt = el.getAttribute('tip');
		txt = txt.substring(txt.indexOf('Score: ')+7,txt.length);
		var fraction = txt.split('/');
		if(fraction.length==2) {
			// franction scores, e.g. 3.5/4
			rating = parseFloat(fraction[0]) / parseFloat(fraction[1]);
			rating = rating*5;
		} else {
			// letter ratings
			switch(fraction[0]) {
				case 'A+': 
					rating = 5;
            		break;
				case 'A': 
					rating = 5;
            		break;
				case 'A-': 
					rating = 4.5;
            		break;			
				case 'B+': 
					rating = 4.5;
            		break;			
				case 'B': 
					rating = 4;
            		break;			
				case 'B-': 
					rating = 3.5;
            		break;			
				case 'C+': 
					rating = 3.5;
            		break;			
				case 'C': 
					rating = 3;
            		break;			
				case 'C-': 
					rating = 2.5;
            		break;			
				case 'D+': 
					rating = 2.5;
            		break;			
				case 'D': 
					rating = 2;
            		break;			
				case 'D-': 
					rating = 1.5;
            		break;			
				case 'F+': 
					rating = 1.5;
            		break;			
				case 'F': 
					rating = 1;
            		break;			
				case 'F-': 
					rating = 1;
            		break;			
			}
		}
	} else {
		// boolean ratings
		// note that this script interprets a "fresh" rating as "good" rather than "best"
		// and "rotton" as "bad" rather than "worst"
		if(el.getAttribute('class').indexOf('fresh') > -1) {
			rating = 4; 
		} else {
			rating = 2;
		}	
	}
	return rating;
}

function simulate_rt_widget_click(star) {
	var rtWidget = $(starWidgetRT).eq(0); 
	// record that this is a simulated click
	$(rtWidget).addClass('simulated');			
	// record new rating (used by local rating widget)
	var str = (star*10).toString();
	if(str==0) { str = '00'; }
	str = 'score'+str;
	$(rtWidget).removeClass('score score00 score05 score10 score15 score20 score25 score30 score35 score40 score45 score50').addClass(str);
	// find rt widget position accounting for scroll
	var cX = rtWidget[0].getBoundingClientRect().left;
	cX += ((star*28)-8);
	// simulate click on RT's star rating tool
	var eventObj = document.createEvent('MouseEvents');
	eventObj.initMouseEvent( 'click', true, true, window, 1, 0, 0, cX, 263, false, false, true, false, 0, null );
	rtWidget[0].dispatchEvent(eventObj);
}

function save_to_storage() {
	// everything has to happen inside of the save data callback function 
	// because it's asynchronous with the rest of the code
	storage.set({'ratings': ratingsArray}, function() {	
	});
}

function resize_score_widget() {
	var now = $('#swe_size').html();
	if(now.indexOf('close') >- 1) {
		$('#score_widget').css('height','0px');
		$('#swe_size').html('open');
		$('#widgets_col2').css('width','0px');
		$('#widgets_col2').css('height','0px');
		$('#swe_extras').html('extras');
	} else {
		$('#widgets_col2').css('height','253px');
		$('#score_widget').css('height','124px');
		$('#swe_size').html('close');		
	}
}

function resize_extras_widget() {
	var now = $('#swe_extras').html();
	if(now.indexOf('hide') > -1) {
		$('#widgets_col2').css('width','0px');
		$('#widgets_col2').css('height','0px');
		$('#swe_extras').html('extras');
	} else {
		$('#widgets_col2').css('width','200px');
		$('#widgets_col2').css('height','317px');
		$('#score_widget').css('height','124px');
		$('#swe_extras').html('hide');
		$('#swe_size').html('close');		
	}	
}

function update_rated_movies() {
	var now = $('#swe_extras').html();
	if(now.indexOf('hide') == -1) {
		var txt = '';
		for(var i=1,il=ratingsArray.length; i<il; i++) {
			if(ratingsArray[i][1][0]>0) {
				txt += '<p class="rated_movie"><span>(' + ratingsArray[i][1][0] + ')&nbsp;</span><a target="_blank" href="'+  ratingsArray[i][0][1] + '">' + ratingsArray[i][0][0] + '</a></p>';	
			}
		}
		$('#rated_movies').html(txt);
	}
}

function apply_critic_filter() {
	var now = $('#score_filter').html();
	if(now.indexOf('more')>-1) {
		$('#score_filter').html('less');
		$('#score_filter').css('padding','7px 22px 0px 22px');
		$('#critic_rows').find('.unrated').toggleClass('shown');
		$('#critic_rows').find('.shown').toggleClass('unrated');
	} else {
		$('#score_filter').html('more');
		$('#score_filter').css('padding','7px 21px 0px 21px');
		$('#critic_rows').find('.shown').toggleClass('unrated');
		$('#critic_rows').find('.unrated').toggleClass('shown');
	}
}

function erase_data() {
	var erase = prompt('Type "ok" then press "ok" to permanently erase all of your saved ratings forever.','')
	if(erase == 'ok') {
		ratingsArray = null;
		storage.set({'ratings': ratingsArray}, function() {	
		});
		location.reload();
	} else {
		alert('You didn\'t type "ok", so data was NOT erased.');	
	}
}

function export_data(theData,name,mime,el) {
	window.webkitRequestFileSystem(window.TEMPORARY, 1024*1024, function(fs) {
		var created = false;
		console.log('webkitRequestFileSystem');
		// check for existence of file
		var dirReader = fs.root.createReader();
		dirReader.readEntries(function(entries) {
			console.log('reading');
			for (var i = 0, entry; entry = entries[i]; ++i) {
				if (entry.name==name) {
					console.log(name + ' exists');
					entry.remove(function() {	
						console.log('removed');
						createTheFile(fs,theData,name,mime,el);
						created = true;
					}, exportErrorHandler);
				}
			}
			if(!created) {
				createTheFile(fs,theData,name,mime,el);
			}
		}, exportErrorHandler);        
	}, exportErrorHandler);      
}

function createTheFile(fs,theData,name,mime,el) {
	fs.root.getFile(name, {create: true, exclusive: true}, function(fileEntry) {
		console.log('getting file')
		fileEntry.createWriter(function(fileWriter) {
			console.log('create writer')
			var blob = new Blob([theData], {type: mime});
			fileWriter.addEventListener("writeend", function() {
				// navigate to file, will download
				console.log('Writing');
				var theURL = fileEntry.toURL();
				$(el).attr('href',theURL);
				$(el).attr('download',name);
				console.log('download attr set');
				// simulate click
				var eventObj = document.createEvent('MouseEvents');
				eventObj.initMouseEvent( 'click', true, true, window, 1, 0, 0, 0, 0, false, false, true, false, 0, null );
				el.dispatchEvent(eventObj);					
			}, false);
		fileWriter.write(blob);
		}, exportErrorHandler);
	}, exportErrorHandler); 
}

function exportErrorHandler(e) {
  var msg = '';
  switch (e.code) {
    case FileError.QUOTA_EXCEEDED_ERR:
      msg = 'QUOTA_EXCEEDED_ERR';
      break;
    case FileError.NOT_FOUND_ERR:
      msg = 'NOT_FOUND_ERR';
      break;
    case FileError.SECURITY_ERR:
      msg = 'SECURITY_ERR';
      break;
    case FileError.INVALID_MODIFICATION_ERR:
      msg = 'INVALID_MODIFICATION_ERR';
      break;
    case FileError.INVALID_STATE_ERR:
      msg = 'INVALID_STATE_ERR';
      break;
    default:
      msg = 'Unknown Error';
      break;
  };
  console.log('Export error: ' + msg);
}

function import_raw_data(event) {
	var input, file, reader;
	input = $('#import_raw');
	file = event.target.files[0];
	reader = new FileReader();
	reader.onload = receivedText;
	reader.readAsText(file);
//	reader.readAsBinaryString(file);
	function receivedText() {
		var tempArray = JSON.parse(reader.result);
		create_ratings_table(tempArray);
		save_to_storage();
		location.reload();
	};
}

function readCookie(name) {
	var nameEQ = name + "=";
	var ca = document.cookie.split(';');
	for(var i=0;i < ca.length;i++) {
		var c = ca[i];
		while (c.charAt(0)==' ') c = c.substring(1,c.length);
		if (c.indexOf(nameEQ) == 0) return c.substring(nameEQ.length,c.length);
	}
	return null;
}













/////////////////////////
//        DATA         //
//      STRUCTURE      //
/////////////////////////

/* 
	rows (films) are primary array: 		[i]
	columsn (critics) are secondary array: 	[i][j]
	cells (data) are terciary array:		[i][j][k]
	first row has (critic) headers:			[0][j][k]
	first column has (film) headers:		[i][0][k]
	second column has user ratings:			[i][1][k]
	subsequent columns have critic ratings
	-----------------------------------------------------------------------------------------------------
	|              (empty)               | user:  "you", "n/a", "0", "0" | critic:  name, path, "0", "0" | --> 
	-----------------------------------------------------------------------------------------------------
	| film name, film path, release date |       rating, "0", "n/a"      |   rating, "0", review link    | -->
	-----------------------------------------------------------------------------------------------------
	| film name, film path, release data |       rating, "0", "n/a"      |   rating, "0", review link    | -->
	-----------------------------------------------------------------------------------------------------
*/

/*
	// useful?
	$(document).ajaxStart(function() {
	});
	$(document).ajaxStop(function() {
	});
*/













