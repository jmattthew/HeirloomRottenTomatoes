/*

Open-source, copyright free, non-commercial.  Make it better!  tiny_meter.png file is the property of Rotten Tomatoes.  

	TO-DO LIST:
	* warn user and fail gracefully if RT changes its code
	* make it work for tv pages
		needs an entirely separate ratings & critics database
		season to season graph would be cool
	* allow users to compare similarity with each other
	* stats/graphs about similarity score 
		* e.g. bell-curve of similarity of all critics

*/














/////////////////////////   ////   ////   ////   ////   ////
//                     //   ////   ////   ////   ////   ////
//       GLOBAL        /////   ////   ////   ////   ////   ////
//      VARIABLES      /////   ////   ////   ////   ////   ////
//                     //   ////   ////   ////   ////   ////
/////////////////////////   ////   ////   ////   ////   ////










// open a messaging port to the event page
// this will prevent the eventPage from suspending
var messagePort = chrome.runtime.connect({name: 'readiness'});

var storage = chrome.storage.local;
var userIDRT = '';
var firstRun = '';
var frPrivacy = 'NON';
var frMoviesCount = 0;
var frMoviesImported = 0;
var frRatingsCount = 0;
var frRatingsImported = 0;
var frImportMessage = '';
var frContinueImport = true;
var frUserRatingsArray = [];
var frCallsCriticRatings = [];
var frCallsTotalPages = [];
var frPercent = 0;
var frStatusTitle = '';
var pageFilmIndex = 0;
var pageFilmPath = '';
var pageFilmName = '';
var pageFilmReleaseDate = '';
var ratingsArray = [];
var criticsArray = [];
var favoritesArray = [];
var pagesScraped = 1;
var totalUserRatings = 0;
var dataReadyTimer = 0;
var updatingTimer = 0;
var starMatchTimer = 0;
var scrapeErrors = '';

// Rotten Tomatoes' element IDs that are subject to change
// if and when RT updates their code
var userRatingsLink = '#headerUserSection .ratings a';
var userRatings = '.media-body';
var userPrivacySetting = '.content_body input';
var userPrivacyAlert = '#headerUserSection .name a';
var freshPick = '#header-certified-fresh-picks a';
var loginLinkRT = '#header-top-bar-login'; 
var starWidgetRT = '#rating_widget .stars';
var allCriticsFreshnessScoreRT = '#all-critics-meter';
var scorePanel = '#scorePanel';
var reviewsPageCount = '.pageInfo';
var reviewsList = '#reviews';
var audienceBox = '.audience-info';
var criticsCount = '#criticHeaders';
var annoyingHeader = '.leaderboard_wrapper';










/////////////////////////   ////   ////   ////   ////   ////
//                     //   ////   ////   ////   ////   ////
//       ACTION        /////   ////   ////   ////   ////   ////
//       ON LOAD       /////   ////   ////   ////   ////   ////
//                     //   ////   ////   ////   ////   ////
/////////////////////////   ////   ////   ////   ////   ////










fix_annoying_header();
messagePort.postMessage({status: 'sendFirstRun'});
messagePort.onMessage.addListener(function(msg) {
	if(msg.firstRun) {
		firstRun = msg.firstRun;
		messagePort.postMessage({status: 'sendRatingsArray'});
	}
	if(msg.data) {
		ratingsArray = msg.data;
		firstRun_check();
		if($(scorePanel).length>0 && location.pathname.indexOf('/tv/')<0) { 
			// this is a movie listing
			insert_critics_widget();
			insert_rating_widget();
			var totalPages = find_total_pages();
			show_update_status(totalPages);
			ratingsArray_add_this_movie();
			// create array of ajax calls to be made
			var concurrentCalls = [];
			// each scrape call updates the ratingsArray & criticsArray
			add_scrape_calls(concurrentCalls,totalPages,pageFilmPath,pageFilmIndex);
			// concurrently execute the calls 
			$.when.apply(null, concurrentCalls).done(function() {
				criticsArray_add_existing();
				criticsArray_update();
				insert_heirloom_info();
				insert_distribution_widget();
				insert_extras();
				rating_widget_events_match();
				update_critics_widget();
				update_meter_widget();
				update_distribution_widget();
				add_heirloom_info_events();
				add_critics_widget_events();
				add_rating_widget_events();
				add_extras_events();
				$('#rating_widget_HRT UL').css('visibility','visible');
				$('#updating').css('display','none');
				clearInterval(updatingTimer);
			}).fail(function() {
				$('#updating').html('Could not gather critic reviews. Please try again.<br>Rotten Tomatoes returned this error message:<br>' + scrapeErrors);
				clearInterval(updatingTimer);
			});
		}
	}
});










/////////////////////////   ////   ////   ////   ////   ////
//                     //   ////   ////   ////   ////   ////
//    DOM INSERTION    /////   ////   ////   ////   ////   ////
//      FUNCTIONS      /////   ////   ////   ////   ////   ////
//                     //   ////   ////   ////   ////   ////
/////////////////////////   ////   ////   ////   ////   ////










function insert_critics_widget() {
	var txt = '';
	txt += '<div id="critics_widget">';
		txt += '<a href="#" id="critics_title" onclick="return false;">';
			txt += '<div>Critics reviews, ordered by similarity to you</div>';
			txt += '<p class="hover_tip_L">';
			txt += '<span>';
			txt += 'Critics are ranked based on the (number) of movies you have both rated and how similar your ratings are. <br><br>Marking your favorite critics will not change their rank.';
			txt += '</span></p>';
		txt += '</a>';
		txt += '<a href="#" id="critics_filter"><span>show all critics</span></a>';
		txt += '<div id="updating"></div>';
		txt += '<div id="critics_rows" class="cr_empty">';
		txt += '</div>'
	txt += '</div>'
	// check if we're on a film page or not
	$('#scorePanel').after(txt);
	$('#movie_videos').css('overflow','scroll')
}

function insert_heirloom_info() {
	var txt = '';
	txt += '<li class="pull-left">&nbsp;|&nbsp;</li>';
	txt += '<li class="pull-left critics-score active">';
		txt += '<a href="#" onclick="return false" id="heirloom_tab" class="articleLink unstyled smaller gray">Similar</a></li>';
	$('#scorePanel').find('ul:first').find('li:last').after(txt);
	$('#scorePanel').find('ul:first').find('li:first').toggleClass('active');
	var $el = $('#all-critics-numbers').clone(true);
	$($el).attr('id','heirloom-critics-numbers');
	$('#all-critics-numbers').parent().append($el);
	$('#all-critics-numbers').toggleClass('active');
}

function insert_distribution_widget() {
	var txt = '';
	txt += '<div id="distribution_widget">';
		txt += '<div id="dist_holder">';
			txt += '<div id="dist_s0"></div>';
			txt += '<div id="dist_s1"></div>';
			txt += '<div id="dist_s2"></div>';
			txt += '<div id="dist_s3"></div>';
			txt += '<div id="dist_s4"></div>';
		txt += '</div>';
	txt += '</div>';
	var el = $('#heirloom-critics-numbers').find('.tomato-info');
	$(el).find('div:first').remove();
	$(el).prepend(txt);
}

function insert_rating_widget() {
	var txt = '';
	txt += '<a href="#" id="rating_title" onclick="return false;">';
		txt += '<div>Your Rating</div>';
		txt += '<p class="hover_tip_L">';
		txt += '<span>Rate more movies to improve the accuracy of the tomatometer ';
		txt += 'and your list of similar critics.</span></p>';
	txt += '</a>';
	txt += '<div id="rating_widget_HRT">';
//	txt += '<div><b></b></div>';
	txt += '<ul>';
		txt += '<li><a href="#" id="star_a_5"><span id="star_5">best</span></a></li>';
		txt += '<li><a href="#" id="star_a_4"><span id="star_4">good</span></a></li>';
		txt += '<li><a href="#" id="star_a_3"><span id="star_3">okay</span></a></li>';
		txt += '<li><a href="#" id="star_a_2"><span id="star_2">bad</span></a></li>';
		txt += '<li><a href="#" id="star_a_1"><span id="star_1">worst</span></a></li>';
		txt += '<li><a href="#" id="star_a_0"><span id="star_0">not rated</span></a></li>';
	txt += '</ul>';

	txt += '</div>';
	$(audienceBox).after(txt);
}

function insert_extras() {
	var txt = '';
	txt += '<div><a href="#" id="hrt_aboutLink">Heirloom App Extras</a></div>';
	var el = $('#heirloom-critics-numbers');
	$(el).find('#scoreStats').append(txt);
}










/////////////////////////   ////   ////   ////   ////   ////
//                     //   ////   ////   ////   ////   ////
//     BIND EVENTS     /////   ////   ////   ////   ////   ////
//     TO INSETIONS    /////   ////   ////   ////   ////   ////
//                     //   ////   ////   ////   ////   ////
/////////////////////////   ////   ////   ////   ////   ////










function add_heirloom_info_events() {
	$('#heirloom_tab').click(function(event) {
		$('#scorePanel').find('ul:first').find('li').removeClass('active');
		$('#scorePanel').find('ul:first').find('li:last').addClass('active');
		$('#all-critics-numbers').removeClass('active');
		$('#top-critics-numbers').removeClass('active');
		$('#heirloom-critics-numbers').addClass('active');
	});
}

function add_critics_widget_events() {
	$('#critics_filter').click(function(event) {
		apply_critic_filter();
		return false;
	});	
	$('.critic_heart').click(function(event) {
		var match = false;
		var id = $(this).attr('id');
		var id = id.substring(4,id.length);
		$(this).toggleClass('favorite_critic');
		for(x=0,xl=favoritesArray.length; x<xl; x++) {
			if(favoritesArray[x]==id) {
				favoritesArray.splice(x,1);
				match = true;
				break;
			}
		}
		if(!match) {
			favoritesArray[favoritesArray.length] = id;
		}

		storage.set({'favorites': favoritesArray}, function() {	
		});

		return false;
	});

	$('#noratings_import').click(function(event) {
		firstRun = 'firstRun'; 
		messagePort.postMessage({firstRun: firstRun}); 
		firstRun_check();
		return false;
	});
}

function add_rating_widget_events() {
	// add events for each star in the widget
	for(var x=0, xl=6; x<xl; x++) {
		$('#star_a_'+x).click({ x:x }, function(event) {
			// save data and update
			var num = event.data.x;
			rating_widget_events_save(num);
			rating_widget_events_update(num);
			criticsArray_update();
			update_critics_widget();
			update_meter_widget();
			update_distribution_widget();
			save_to_storage();
			// logged in on RT
			// so simulate click on RT
			simulate_rt_widget_click(num)
			return false;
		});
	}
	
	// add new event to RT's native rating widget
	// will execute whether real or simulated click
	var rtWidget = $(starWidgetRT).eq(0);
	$(rtWidget).click(function(event) {
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
			rating_widget_events_save(num);
			rating_widget_events_update(num);
			criticsArray_update();
			update_critics_widget();
			update_meter_widget();
			update_distribution_widget();
			save_to_storage();
		}
		$(this).removeClass('simulated');
	});
}

function rating_widget_events_match() {
	var num = ratingsArray[pageFilmIndex][1];
	rating_widget_events_update(num);
	// logged in to RT

	// RT doesn't pull in its user rating record 
	// until well after the page loads,
	// so we have to listen for it
	MutationObserver = window.MutationObserver || window.WebKitMutationObserver;
	var observer = new MutationObserver(function(mutations, observer) {
		var rtWidget = $(starWidgetRT).eq(0);
		var rtStars = $(rtWidget).attr('class');
		num = 0;
		if(rtStars.indexOf('score')>-1) {
			rtStars = rtStars.substring(rtStars.indexOf('score')+5,rtStars.length);
			num = Math.round(parseInt(rtStars)/10);			
		}
		if(num>0 && num != ratingsArray[pageFilmIndex][1]) { 
			// RT rating exists and doesn't match local rating
			// override local
			rating_widget_events_save(num);
			rating_widget_events_update(num);
			criticsArray_update();
			update_critics_widget();
			update_meter_widget();
			update_distribution_widget();
			save_to_storage();
		} else { 
			if(ratingsArray[pageFilmIndex][1]>0) { 
				// RT rating doesn't exist but local rating does
				// so update RT widget
				simulate_rt_widget_click(num);
			}	
		}
		observer.disconnect();
	});
	var el = document.getElementById('rating_widget');
	observer.observe(el, {
	  subtree: true,
	  attributes: true
	});
}

function rating_widget_events_update(star) {
	if('#user_rating') {
		$('#user_rating').remove();
	}
	if(star>0) {
		$('#star_' + star).after('<i id="user_rating"></i>');
	}
}

function rating_widget_events_save(star) {
	ratingsArray[pageFilmIndex][1] = parseInt(star);
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

function add_extras_events() {
	var appVersion = chrome.runtime.getManifest().version;
	// overlay box with extras
	$('#hrt_aboutLink').click(function(event) {
		$('BODY').append($('<div>',{ id: 'hrt_modalClickZone' }));
		$('BODY').append($('<div>',{ id: 'hrt_modal', style: 'width: 530px;' }));
		$('#hrt_modal').append($('<div>', { id: 'hrt_modalInner', style: 'height: 400px;'}));
		$('#hrt_modalInner').append($('<strong>', { text: 'Thanks for Using Heirloom Rotten Tomatoes - Version ' + appVersion + '!', style: 'text-align:center; padding-bottom:10px;' }));
		$('#hrt_modalInner').append($('<strong>', { text: 'Information the app collects:' }));
		$('#hrt_modalInner').append($('<span>', { text: 'This app only saves ratings data to your computer. Your movie ratings and the pages that you visit are 100% private to your computer and never transmitted. The app never accesses nor stores any login info.  It uses a Google Analytics cookie to send anonymous information to the developer such as app usage and critic ranking.' }));
		$('#hrt_modalInner').append($('<strong>', { text: 'This is an open-source, fan supported project:' }));
		$('#hrt_modalInner').append($('<span>', { text: 'Neither this browser app nor it\'s developer are affiliated with or supported by Rotten Tomatoes in any way. To report an issue or make a nice comment, tweet ' }));
		$('#hrt_modalInner').find('span:last').append($('<a>', { href: 'http://twitter.com/mattthew', target: '_blank', text: '@mattthew' }));
		$('#hrt_modalInner').append($('<span>', { text: 'If you want to send me a few pennies worth of Bitcoin, ' }));
		$('#hrt_modalInner').find('span:last').append($('<a>', { href: 'http://mattthew.tip.me', target: '_blank', text: 'go for it!' }));
		$('#hrt_modalInner').append($('<strong>', { text: 'Import your past ratings from your Rotten Tomatoes account:' }));
		$('#hrt_modalInner').append($('<a>', { href: '#', text: 'import now', id: 'hrt_import_ratings' }));
		$('#hrt_modalInner').append($('<strong>'));
		$('#hrt_modalInner').append($('<strong>', { text: 'About your movie ratings:' }));
		$('#hrt_modalInner').append($('<span>', { id: 'hrt_ratings_table' }));
		$('#hrt_modalInner').append($('<span>', { text: 'Positivity: 0% means that you gave every movie a 1 star; rating, while 100% means that you gave every movie a 5 star; rating.  For comparison, 3 out of 4 critics on Rotten Tomatoes are between 61-80% positive.' }));
		$('#hrt_modalInner').append($('<span>', { text: 'Variation:  0% means that you gave every movie the same rating (whether high or low), while 100% means you are equally as likely to give any rating.  For comparison, 2 out of 3 critics on Rotten Tomatoes have 51-70% variation in their ratings.' }));
		$('#hrt_modalInner').append($('<strong>'));
		$('#hrt_modalInner').append($('<strong>', { text: 'Your ' + totalUserRatings + ' movie ratings:' }));
		$('#hrt_modalInner').append($('<div>', { id: 'hrt_rated_movies' }));
		$('#hrt_modalInner').append($('<strong>'));
		$('#hrt_modalInner').append($('<strong>', { text: 'Experimental features:' }));
		$('#hrt_modalInner').append($('<a>', { href: '#', text: 'export list of critics with their similarity to you', id: 'export_critics' }));
		$('#hrt_modalInner').append($('<strong>'));
		$('#hrt_modalInner').append($('<a>', { href: '#', text: 'export raw data file', id: 'export_raw' }));
		$('#hrt_modalInner').append($('<strong>'));
		$('#hrt_modalInner').append($('<input>', { type: 'file', id: 'import_raw' }));
		$('#hrt_modalInner').append($('<output>', { id: 'list_ratings' }));
		$('#hrt_modalInner').append($('<input>', { type: 'button', id: 'fake_import', name: 'fake_import', value: 'import raw data file' }));
		$('#hrt_modalInner').append($('<strong>'));
		$('#hrt_modalInner').append($('<span>', { text: 'Export a comparison of every critic with every other critic, given the movies you\'ve rated so far. The report only contains critic-pairs who have rated at least 10 movies in common, so you need to have rate many movies to get useful results. WARNING:  This may generate a very large file and Chrome will hang for one or more minutes. ' }));
		$('#hrt_modalInner').find('span:last').append($('<a>', { href: '#', text: 'Try experimental report.', id: 'extras_events_compareAll' }));
		$('#hrt_modalInner').append($('<strong>'));
		$('#hrt_modalInner').append($('<span>', { text: 'Export a histogram of ratings for each critic, based on the movies you\'ve rated so far.  For each critic, this lists the count of their ratings in each of the five star levels.' }));
		$('#hrt_modalInner').find('span:last').append($('<a>', { href: '#', text: 'Try experimental report.', id: 'extras_events_histograms' }));
		$('#hrt_modalInner').append($('<strong>'));
		$('#hrt_modalInner').find('strong:last').append($('<a>', { href: '#', text: 'erase your data', id: 'hrt_erase', style: 'color:red;' }));

		// insert list of the user's ratings
		var tempArray = ratingsArray.slice(0);
		tempArray.sort(function(a, b) {
			var aSort = a[1];
			var bSort = b[1];
			return bSort-aSort;
		});			
		var count1 = 0;
		var count2 = 0;
		var count3 = 0;
		var count4 = 0;
		var count5 = 0;
		var countTotal = 0;
		var list = '';
		for(var i=1,il=tempArray.length; i<il; i++) {
			if(tempArray[i][1]>0) {
				// user rated this movie
				switch(tempArray[i][1]) {
					case 1:
						count1++;
						break
					case 2:
						count2++;
						break
					case 3:
						count3++;
						break
					case 4:
						count4++;
						break
					case 5:
						count5++;
						break				
				}
				countTotal++;
				list += '<span style="margin-bottom:0px;">(' + tempArray[i][1] + ' stars)&nbsp;';
				list += '<a target="_blank" href="'+  tempArray[i][0][1] + '">' + tempArray[i][0][0] + '</a></span>';
			}
		}
		$('#hrt_rated_movies').html(list);
		var table = '';
		var positivity = 0;
		var positivity = ((count5/countTotal)*5) + ((count4/countTotal)*4) + ((count3/countTotal)*3) + ((count2/countTotal)*2) + ((count1/countTotal)*1) - (1);
		positivity = Math.round((positivity/4)*100);
		var variance = 0;
		variance += Math.pow(((count5/countTotal)-0.2),2);
		variance += Math.pow(((count4/countTotal)-0.2),2);
		variance += Math.pow(((count3/countTotal)-0.2),2);
		variance += Math.pow(((count2/countTotal)-0.2),2);
		variance += Math.pow(((count1/countTotal)-0.2),2);
		variance = variance/5;
		var stdev = Math.sqrt(variance);
		console.log(stdev)
		var variation = Math.round(((0.4472-stdev)/0.45)*100);
		table += 'Total ratings: ' + countTotal + '<br>';
		table += 'positivity: ' + positivity + '%<br>';
		table += 'variation: ' + variation + '%<br>';
		table += '5&#9733; ratings: ' + count5 + '<br>';
		table += '4&#9733; ratings: ' + count4 + '<br>';
		table += '3&#9733; ratings: ' + count3 + '<br>';
		table += '2&#9733; ratings: ' + count2 + '<br>';
		table += '1&#9733; ratings: ' + count1 + '<br>';
		$('#hrt_ratings_table').html(table)

		positionModal(530);

		// bindings
		$('#hrt_modalClickZone').click(function(event) {
			$('#hrt_modal').remove();
			$('#hrt_modalClickZone').remove();
			$('BODY').off('keyup');
		});
		$('BODY').keyup(function(event) {
			$('#hrt_modal').remove();
			$('#hrt_modalClickZone').remove();
			$('BODY').off('keyup');
		});

		$('#hrt_erase').click(function(event) {
			erase_data();
			return false;
		});

		$('#hrt_import_ratings').click(function(event) {
			$('#hrt_modal').remove();
			$('#hrt_modalClickZone').remove();
			$('BODY').off('keyup');
			firstRun = 'firstRun';
			messagePort.postMessage({firstRun: firstRun});
			firstRun_check();
			return false;
		});

		$('#import_raw').change(function(event) {
			import_raw_data(event);
		});

		$('#export_raw').click(function(event) {
			if(!$(this).attr('download')) { // no download link so create then simulate click
				export_data(JSON.stringify(ratingsArray),'my_heirloom_rotten_tomatoes_data.txt','application/octet-stream',this);
			}
		});

		$('#export_critics').click(function(event) {
			var theData = 'critic name,similarity to you,count of films you both rated,bayesian sort\n';
			var tempStr = '';
			for(var x=0,xl=criticsArray.length; x<xl; x++) {
				tempStr = criticsArray[x][0];
				tempStr = tempStr.replace(/,/g,'');
				theData += '"' + tempStr + '",' + criticsArray[x][5] + ',' + criticsArray[x][4] + ',' + criticsArray[x][6] + '\n';
			}
			if(!$(this).attr('download')) { // no download link so create then simulate click
				export_data(theData,'my_top_critics.csv','text/plain',this);	
			}
		});

		$('#compare_all').click(function(event) {
			extras_events_compareAll(this);
	//		extras_events_getPearsons(this);
		});

		$('#extras_events_histograms').click(function(event) {
			extras_events_histograms(this);
		});

		return false;
	});
}

function extras_events_compareAll(el) {
	if(!$(el).attr('download')) { // no download link so do calculation
		var theData = 'critic A name,critic B name,common films,difference\n';
		var avgArray = [];
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
					if(ratingA>0 && ratingB>0) { // if both critics rated this movie
						var ratingA = widenRating(ratingsArray[i][jA][0],1,5); // min 1, max 5
						var ratingB = widenRating(ratingsArray[i][jB][0],1,5);
						// find how far critic's rating is from the average rating
						ratingA = avgArray[i] - ratingA; // min -4, max 4
						ratingB = avgArray[i] - ratingB;
						// then difference from each other
						sumSquareDiff += Math.pow(ratingA-ratingB,2) // max 16
						commonFilmsCount++;

						/*	
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
						*/	
	
					}
				}

				// find norm of distance between critics
				var similarity = sumSquareDiff/commonFilmsCount; // average, max 16
				similarity = Math.sqrt(similarity); // max 4
				similarity = 1-(similarity/4); // %
				if(commonFilmsCount>9) { 
					// only include pairings where data set is big enough
					theData += nameA + ',' + nameB + ',' + commonFilmsCount + ',' + similarity + '\n';
				}
			}
		}
		export_data(theData,'all_critics_compared.csv','text/plain',el);	// no download link so create it and simulate a click
		return false;
	}
}

function extras_events_histograms(el) {
	if(!$(el).attr('download')) { // no download link so do 
		var theData = 'critic name,critic link,1,2,3,4,5,\n';
		for(var j=1, jl=ratingsArray[0].length; j<jl; j++) {
			// for each critic
			var count1 = 0;
			var count2 = 0;
			var count3 = 0;
			var count4 = 0;
			var count5 = 0;
			for(var i=1, il=ratingsArray.length; i<il; i++) {
				var rating = Math.round(ratingsArray[i][j]);
				switch(rating) {
					case 1:
						count1++;
						break
					case 2:
						count2++;
						break
					case 3:
						count3++;
						break
					case 4:
						count4++;
						break
					case 5:
						count5++;
						break
				}
			}
			var name = ratingsArray[0][j][0];
			name = name.replace(/,/g,''); // strip commas
			var link = ratingsArray[0][j][1];
			link = link.replace(/,/g,''); // strip commas
			theData += name + ',' + link + ',' + count1 + ',' + count2 + ',' + count3 + ',' + count4 + ',' + count5 + '\n';
		}
		export_data(theData,'critics_rating_histogram.csv','text/plain',el);	// no download link so create it and simulate a click
		return false;
	}
}

function extras_events_getPearsons(el) {
	if(!$(el).attr('download')) { // no download link so do calculation
		// pearsons r calculation
		var theData = 'critic A name,critic B name,correl,count,average difference,,title,A rating,B rating,\n';
		var tempArray = [];
		var pairCount = 0;
		var jl=ratingsArray[0].length;
		var il=ratingsArray.length;
		for(var jA=1; jA<jl; jA++) { // factorially iterate critics
			for(var jB=jA; jB<jl; jB++) { 
				var nameA = ratingsArray[0][jA][0];
				var nameB = ratingsArray[0][jB][0];
				tempArray[pairCount] = [];
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
		export_data(theData,'all_critics_pearson.csv','text/plain',el);	// no download link so create it and simulate a click
		return false;
	}
}










/////////////////////////   ////   ////   ////   ////   ////
//                     //   ////   ////   ////   ////   ////
//    CRITIC DATA      /////   ////   ////   ////   ////   ////
// SCRAPING FUNCTIONS  /////   ////   ////   ////   ////   ////
//                     //   ////   ////   ////   ////   ////
/////////////////////////   ////   ////   ////   ////   ////










function find_total_pages() {
	// find total pages to scrape
	var totalPages = 1;
	var temp = '';
	temp = $(criticsCount).find('a').eq(0).html();
	if(temp) {
		totalPages = Math.ceil(parseInt(temp.substring(temp.indexOf('(')+1,temp.length-1))/20);
	}
	return totalPages;
}

function ratingsArray_add_this_movie() {
	var yearHTML = $('.movie_title span span').html();
	var el = $('.movie_title span').clone();
	$(el).find('span').remove();
	pageFilmName = $(el).html() + yearHTML;
	pageFilmName = pageFilmName.replace(/\s+/g,' ');
	pageFilmName = pageFilmName.replace(/^\s/g,'');
	pageFilmPath = location.pathname;
	pageFilmReleaseDate = $('.movie_info .dl-horizontal dd').eq(4).attr('content');
	for(var i=1, il=ratingsArray.length; i<il; i++) {
		// search for this film in the array
		if(ratingsArray[i][0][1] == pageFilmPath) {
			pageFilmIndex = i;
			/*
			var dY = pageFilmReleaseDate.substring(0,4);
			var dM = (pageFilmReleaseDate.substring(5,7))-1;
			var dD = pageFilmReleaseDate.substring(8,10);
			var releaseDate = new Date(dY,dM,dD,0,0,0,0);	
			var today = new Date();
			var lastWeekMS = today.getTime();
			var lwDate = new Date();
			lwDate.setDate(lwDate.getDate()-7)
			*/
			break;
		}
	}
	// if this film not found, add new row to the array
	if(pageFilmIndex < 1) {
		pageFilmIndex = ratingsArray.length;
		ratingsArray[pageFilmIndex] = [];
		for(var j=0, jl=ratingsArray[0].length; j<jl; j++) {
			// add blank cell for every critic
			ratingsArray[pageFilmIndex][j] = 0;
		}
		ratingsArray[pageFilmIndex][0] = [];
		ratingsArray[pageFilmIndex][0][0] = pageFilmName;
		ratingsArray[pageFilmIndex][0][1] = pageFilmPath;
		ratingsArray[pageFilmIndex][0][2] = 0; // legacy
	}	
}

function add_scrape_calls(calls,totalPages,path,index) {
	for(var page=0; page<totalPages; page++) {
		var urlPage = page+1;
		calls.push(
			$.ajax({
				url: path + 'reviews/?page=' + urlPage + '&sort=name',
				cache: false,
				dataType: 'html',
			}).done(function(response) {
				var $el = $('<div>').html(response);
				$el = $el.find(reviewsList);
				$el = $el.find('tr');
				// for each critic on this page
				if($el.length>0) {
					for(var y=0, yl=$el.length; y<yl; y++) {
						var criticName = $el.eq(y).find('a').eq(0).html();
						var criticPath = $el.eq(y).find('a').eq(0).attr('href');
						if(!criticName) { criticName = '(unknown)'; }
						if(!criticPath) { criticPath = ''; }
				 		if(criticName.indexOf('Full Review')>-1) {
				 			// this review comes from a publication rather than a critic 
				 			criticName = $el.eq(y).find('em').eq(0).html();
				 			criticPath = criticPath.substring(0,criticPath.indexOf('/',7));
							if(!criticName) { criticName = '(unknown)'; }
							if(!criticPath) { criticPath = ''; }
				 		}
						criticPath = criticPath.replace(/\/critic\//g,'');
						var reviewBlurb = $el.eq(y).find('p').eq(0).html();
						var reviewPath = $el.eq(y).find('a').eq(1).attr('href');
						var ratingEL = $el.eq(y).find('td').eq(3).find('div');
						var criticRating = sanitize_rating(ratingEL);

						// find matching critic in ratingsArray
						var newCritic = true;
						for(var j=2, jl=ratingsArray[0].length; j<jl; j++) {
							if(criticPath == ratingsArray[0][j][1]) {
								ratingsArray[index][j] = criticRating;
								newCritic = false;
							}
						}	
						if(newCritic) {	
							var columns = ratingsArray[0].length;
							// add new column to header row
							ratingsArray[0][columns] = [];
							ratingsArray[0][columns][0] = criticName;
							ratingsArray[0][columns][1] = criticPath;
							ratingsArray[0][columns][2] = 0; // legacy			
							ratingsArray[0][columns][3] = 0; // legacy
							for(var i=1, il=ratingsArray.length; i<il; i++) { 
								// for each film row
								// add new cell to end
								ratingsArray[i][columns] = 0;
							}
							// for this film, set critic rating
							ratingsArray[index][columns] = criticRating;
						}

						var num = criticsArray.length; 
						criticsArray[num] = [];	
						criticsArray[num][0] = criticName;
						criticsArray[num][1] = criticRating;
						criticsArray[num][2] = reviewPath;
						criticsArray[num][3] = reviewBlurb;
					}
				}
				pagesScraped++;
				frRatingsImported++;
				frPercent = Math.round((frRatingsImported/frRatingsCount)*100);
				frStatusTitle = path.substring(3,path.length-1);
				frStatusTitle = frStatusTitle.replace(/_/g,' ');
			}).error(function(xhr, ajaxOptions, thrownError){
				scrapeErrors += 'reviews page ' + pagesScraped + ': ' + xhr.status + ' (' + thrownError + ')';
				pagesScraped++;
			})
		);
	};
}

function criticsArray_add_existing() {
	// at this point criticsArray only contains critic who rated this film
	// so add the other critics
	for(j=2,jl=ratingsArray[0].length; j<jl; j++) {
		var match = false;
		for(y=0,yl=criticsArray.length; y<yl; y++) {
			if(criticsArray[y][0]==ratingsArray[0][j][0]) {
				match = true;
				break;
			}
		}
		if(!match) {
			var num = criticsArray.length;
			criticsArray[num] = [];
			criticsArray[num][0] = ratingsArray[0][j][0]; // name
			criticsArray[num][1] = 0; // no rating
			criticsArray[num][2] = ''; // no review path
			criticsArray[num][3] = ''; // no review blurb
		}
	}
}

function criticsArray_update() {
	// for each critic 
	for(j=2,jl=ratingsArray[0].length; j<jl; j++) {
		var count = 0;
		var total = 0;
		// for each film
		for(i=1,il=ratingsArray.length; i<il; i++) {
			// if film was rated by both user and critic
			// compute user vs. critic average similarity
			var userRating = ratingsArray[i][1];
			var criticRating = ratingsArray[i][j];
			if(criticRating > 0 && userRating > 0) {
				count++;
				total += criticsArray_compareRatings(i,j,1);
			}
		}
		// find match in criticsArray
		for(y=0,yl=criticsArray.length; y<yl; y++) {
			if(criticsArray[y][0]==ratingsArray[0][j][0]) {
				criticsArray[y][4] = count;
				if(count>0) {
					criticsArray[y][5] = total/count;
				} else {
					// critic has no films in common with user
					// so asign the average similarity
					criticsArray[y][5] = .64;
				}
			}
		}
	}
	// get average similarity score and count across all critics
	var avgScore = 0;
	var avgCount = 0;
	for(y=0,yl=criticsArray.length; y<yl; y++) {
		avgCount += Math.pow(criticsArray[y][4],3); // see below
		avgScore += criticsArray[y][5];
	}
	avgCount = avgCount/criticsArray.length;
	avgScore = avgScore/criticsArray.length;
	// calculate sort score using modified bayesian formula
	for(y=0,yl=criticsArray.length; y<yl; y++) {
		var count = Math.pow(criticsArray[y][4],3); 
		var score = criticsArray[y][5];
		// 6 = baysian sort score
		// user power of 3 causes low count critics to score worse
		// the original bayes formula I modified:  
		// http://www.andymoore.ca/2010/02/bayesian-ratings-your-salvation-for-user-generated-content
		criticsArray[y][6] = ( (avgCount * avgScore) + (count * score) ) / (avgCount + count);
		// news move critics with low count & low score to the bottom
		if(Math.pow(count,3)<avgCount) {
			criticsArray[y][6] = criticsArray[y][6]/10; 
		}
	}
	// now sort criticsArray decending based on baysian score
	criticsArray.sort(function(a, b) {
		var aSort = a[6];
		var bSort = b[6];
		return bSort-aSort;
	});	
}

function criticsArray_compareRatings(filmIndex, aCriticIndex, bCriticIndex) {
	var float = 0;
	var cR = ratingsArray[filmIndex][aCriticIndex];
	var uR = ratingsArray[filmIndex][bCriticIndex];
	// widen scale so that "very bad" & "bad" 
	// are more similar than "bad" & "okay", etc.
	cR = criticsArray_widenRating(cR,1,5);
	uR = criticsArray_widenRating(uR,1,5);

	// compare them
	float = Math.abs(cR-uR);
	float = (4-float)/4;
	return float;
}

function criticsArray_widenRating(num,lowest,highest) {
	// widends distance of value from center point 
	// between lowest and highest possible values
	// the effect is that a 1 vs. 2 star ratings pair 
	// (i.e. "very bad" vs. "bad") is considered more 
	// similar than a 2 vs. 3 star ratings pair
	// (i.e. "bad" vs. "okay")
	//	*   *   *   *   *   *   *   *   *
	//	* *   *   *     *     *   *   * *
	//	**  *    *      *      *    *  **
	num = parseFloat(num);
	if(isNaN(num) || num<lowest || num>highest) { 
		// sanitize, convert bad ratings to unrated
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










/////////////////////////   ////   ////   ////   ////   ////
//                     //   ////   ////   ////   ////   ////
//      FIRST RUN      /////   ////   ////   ////   ////   ////
//      FUNCTIONS      /////   ////   ////   ////   ////   ////
//                     //   ////   ////   ////   ////   ////
/////////////////////////   ////   ////   ////   ////   ////










function fix_annoying_header() {
	$(annoyingHeader).css('min-height','0px');
	$(annoyingHeader).css('padding','0px');
}

function firstRun_check() {
	firstRun += ' ';
	if(firstRun.indexOf('firstRun')>-1) {
		firstRun_userIDRT();
		if(userIDRT.length>1) {
			var hasRatings = firstRun_getRatings();
			var ratingsArePublic = false;
			// ajax is asynchronous
			$.ajax({
				url: '/user/id/' + userIDRT + '/ratings',
				cache: false,
				dataType: 'html'
			}).done(function(response) {
				ratingsArePublic = true;
				firstRun_selectModal(hasRatings,ratingsArePublic);
			}).error(function(xhr, ajaxOptions, thrownError){
				firstRun_selectModal(hasRatings,ratingsArePublic);
			});	
		} else {
			firstRun_showModal('requestLogin');
		}
	}
}

function firstRun_userIDRT() {
	userIDRT = $(userRatingsLink).eq(0).attr('href');
	userIDRT = userIDRT.substring(userIDRT.indexOf('id/')+3,userIDRT.length);
	userIDRT = userIDRT.substring(0,userIDRT.indexOf('/ratings'));
}

function firstRun_selectModal(hasRatings,ratingsArePublic) {
	if(hasRatings && ratingsArePublic) {
		firstRun_showModal('requestImport');
	} else if(hasRatings && !ratingsArePublic) {
		firstRun_showModal('requestPublicRatings');
	} else if(!hasRatings) {
		firstRun_showModal('noRatings');
	}
}

function firstRun_getRatings() {
	var hasRatings = false;
	var txt = $(userRatingsLink)[0].lastChild.nodeValue;
	txt = txt.substring(0,txt.indexOf('Ratings')-1);
	if(parseInt(txt)>1) {
		hasRatings = true;
	}
	return hasRatings;
}

function firstRun_showModal(modalType) {
	var appVersion = chrome.runtime.getManifest().version;
	$('BODY').append($('<div>',{ id: 'hrt_modalClickZone' }));
	$('BODY').append($('<div>',{ id: 'hrt_modal', style: 'width: 450px;' }));
	$('#hrt_modal').append($('<div>', { id: 'hrt_modalInner'}));
	$('#hrt_modalInner').append($('<strong>', { text: 'Thanks for Using Heirloom Rotten Tomatoes!', style: 'text-align:center; padding-bottom:10px;' }));
	var firstRunSubheader = '';
	var firstRunIntro = '';
	if(ratingsArray.length > 1) {
		// existing app user
		firstRunSubheader = 'New Feature for version '+ appVersion +'!';
		firstRunIntro = 'Now you can import all the ratings from your Rotten Tomatoes account. If you rated some movies before installing this app, importing those ratings will make the app more accurate.';
	} else {
		// new app install
		firstRunSubheader = 'Getting Started:';
		firstRunIntro = 'To show you the critics who are like you, this app needs to know your ratings of a few movies. If you have already rated movies on Rotten Tomatoes, you can import your ratings.';
	}
	$('#hrt_modalInner').append($('<strong>', { text: firstRunSubheader }));
	$('#hrt_modalInner').append($('<span>', { text: firstRunIntro }));

	if(modalType == 'requestImport') {

		$('#hrt_modalInner').append($('<a>', { href: '#', text: 'Okay, import ratings', id: 'firstRun_button_importRatings', class: 'button' }));
		$('#hrt_modalInner').append($('<a>', { href: '#', text: 'Skip import', id: 'firstRun_button_dismissFirstRun', class: 'button' }));

	} else if(modalType == 'requestPublicRatings') {

		$('#hrt_modalInner').append($('<span>', { text: 'Your ratings are currently set to "private".  In order to import, the app will need to set them to "public" for a few seconds, then revert them to your original setting.', class: 'instruction' }));
		$('#hrt_modalInner').append($('<a>', { href: '#', text: 'Okay, import ratings', id: 'firstRun_button_setRatingsPublic', class: 'button' }));
		$('#hrt_modalInner').append($('<a>', { href: '#', text: 'Skip import', id: 'firstRun_button_dismissFirstRun', class: 'button' }));

	} else if(modalType == 'noRatings') {

		$('#hrt_modalInner').append($('<span>', { text: 'Sorry! You haven\'t rated enough movies to import.  In the future, all movies you rate will be saved to your account.', class: 'instruction' }));
		$('#hrt_modalInner').append($('<a>', { href: '#', text: 'Close this message', id: 'firstRun_button_dismissFirstRun', class: 'button' }));

	} else if(modalType == 'requestLogin') {

		$('#hrt_modalInner').append($('<span>', { text: 'To begin, you\'ll need to sign into your account (but this app never sees your email address or password).', class: 'instruction' }));
		$('#hrt_modalInner').append($('<a>', { href: '#', text: 'Sign in', id: 'firstRun_button_signIn', class: 'button' }));	
		$('#hrt_modalInner').append($('<a>', { href: '#', text: 'Skip import', id: 'firstRun_button_dismissFirstRun', class: 'button' }));

	} else if(modalType == 'importing') {

		$('#hrt_modalInner').append($('<span>', { class: 'instruction', id: 'firstRun_importMessage' }));

		$('#hrt_modalInner').append($('<div>', { id: 'firstRun_statusTitle' }));

		$('#hrt_modalInner').append($('<div>', { id: 'firstRun_StatusBarHolder' }));

		$('#firstRun_StatusBarHolder').append($('<div>', { id: 'firstRun_StatusBar' }));

		$('#hrt_modalInner').append($('<a>', { href: '#', text: 'Stop Importing', id: 'firstRun_button_stopImport', class: 'button' }));

		var frTimer = setInterval(function() {
			$('#firstRun_importMessage').html(frImportMessage);
			var width = frPercent + '%';
			$('#firstRun_StatusBar').css('width', width);
			$('#firstRun_statusTitle').html(frStatusTitle);
		}, 250);

	} else if(modalType == 'complete') {

		if(frMoviesCount > 0) {
			$('#hrt_modalInner').append($('<span>', { text: 'Finished!  Successfully imported ' + frMoviesCount + ' movie past ratings previously unknown to this app.  Your future ratings are imported automatically.  Visit any movie page to see the results of the import.', class: 'instruction' }));
		} else {
			$('#hrt_modalInner').append($('<span>', { text: 'The app successfully imported your past movie ratings, however, they were all already known to the app.  At least you\'re no longer living in doubt!', class: 'instruction' }));
		}
		$('#hrt_modalInner').append($('<a>', { href: '#', text: 'Close', id: 'firstRun_button_close', class: 'button' }));

	} else if(modalType == 'error') {

		if(frContinueImport) {
			$('#hrt_modalInner').append($('<span>', { text: 'Sorry!  The app was unable to import your ratings, most likely, due to internet connection issues.  The error messages was: ' + frImportMessage + '.  Would you like to try again?', class: 'instruction' }));
			$('#hrt_modalInner').append($('<a>', { href: '#', text: 'Okay, try again', id: 'firstRun_button_importRatings', class: 'button' }));
			$('#hrt_modalInner').append($('<a>', { href: '#', text: 'Skip import', id: 'firstRun_button_dismissFirstRun', class: 'button' }));
		} else {
			$('#hrt_modalInner').append($('<span>', { text: 'You have cancelled the import.  Your future ratings will be imported automatically, and you can retry importing past ratings at any time by using the "Extras" page.  Visit any movie page now to see the results of the import.', class: 'instruction' }));
			$('#hrt_modalInner').append($('<a>', { href: '#', text: 'Close', id: 'firstRun_button_close', class: 'button' }));
		}

	}
	positionModal(450);
	firstRun_assignEvents();	
}

function positionModal(modalWidth) {
	var docWidth = $( window ).width();
	var docHeight = $( window ).height();
	$('#hrt_modalClickZone').css('height',docHeight + 'px');
	$('#hrt_modalClickZone').css('width',docWidth + 'px');
	var x = parseInt((docWidth-modalWidth)/2);
	var y = parseInt((docHeight-$('#hrt_modal').height())/2);
	$('#hrt_modal').css('top',y + 'px'); 
	$('#hrt_modal').css('left',x + 'px');
}

function firstRun_assignEvents() {
	// buttons may or may not exist

	$('#firstRun_button_dismissFirstRun').click(function(event) {
		$('#hrt_modal').remove();
		$('#hrt_modalClickZone').remove();

		firstRun = 'dismiss';
		storage.set({'firstRun': firstRun}, function() {
			messagePort.postMessage({firstRun: firstRun});
		});
		return false;

	});

	$('#firstRun_button_signIn').click(function(event) {
		$('#hrt_modal').remove();
		$('#hrt_modalClickZone').remove();
		// simulate click
		var el = $(loginLinkRT);
		var eventObj = document.createEvent('MouseEvents');
		eventObj.initMouseEvent( 'click', true, true, window, 1, 0, 0, 0, 0, false, false, false, false, 0, null );
		el[0].dispatchEvent(eventObj);
		// if user logs in via email, 
		// page will reload and check firstRun
		// if user logs in via Facebook, 
		// no reload, so check firstRun periodically 
		var fbTimer = setInterval(function() {
			var loggedIn = firstRun_getLogin();
			if(loggedIn) {
				clearInterval(fbTimer);
				firstRun_check();
			}
		},500);
		return false;
	});

	$('#firstRun_button_setRatingsPublic').click(function(event) {
		$('#hrt_modal').remove();
		$('#hrt_modalClickZone').remove();
		firstRun_showModal('importing');
		firstRun = 'privacyUpdate';
		$('body').append($('<iframe>',{ id: 'hrt_privacyModal', style: 'display:block; width:800px; height:800px;' }));
		$('#hrt_privacyModal').load(function(){
			if(firstRun.indexOf('privacyUpdate')>-1) {
				frPrivacy = firstRun_getPrivacySetting();
				firstRun = 'importing';
				firstRun_setPrivacy('ALL');
			} else if(firstRun.indexOf('importing')>-1) {
				firstRun_importUserRatings();
				firstRun = 'reverting';
				firstRun_setPrivacy(frPrivacy);
			} else if(firstRun.indexOf('reverting')>-1) {
				$('#hrt_privacyModal').remove();
			}
		});
		$('#hrt_privacyModal').attr('src','http://www.rottentomatoes.com/user/account/profile_preferences/');
		return false;
	});

	$('#firstRun_button_importRatings').click(function(event) {
		$('#hrt_modal').remove();
		$('#hrt_modalClickZone').remove();
		firstRun_showModal('importing');
		firstRun_importUserRatings();
		return false;
	});

	$('#firstRun_button_stopImport').click(function(event) {
		frContinueImport = false;
		for(var x=0, xl=frCallsTotalPages.length; x<xl; x++) {
			if(!frCallsTotalPages[x].status) {
				frCallsTotalPages[x].abort();
			}
		}
		for(var x=0, xl=frCallsCriticRatings.length; x<xl; x++) {
			if(!frCallsCriticRatings[x].status) {
				frCallsCriticRatings[x].abort();
			}
		}
		return false;
	});

	$('#firstRun_button_close').click(function(event) {
		$('#hrt_modal').remove();
		$('#hrt_modalClickZone').remove();
		return false;
	});
}

function firstRun_setPrivacy(val) {
	var privacyFrame = $('#hrt_privacyModal').contents();
	var inputs = $(privacyFrame).find(userPrivacySetting);
	for(var x=0, xl=inputs.length; x<xl; x++) {
		var el = $(inputs).eq(x);
		if($(el).attr('value').indexOf('email')<0) {
			if($(el).attr('value').indexOf(val)>-1) {
				$(el).attr('checked','checked');
			} else {
				$(el).removeAttr('checked');				
			}
		}
	}
	// simulate click on form button
	// I don't know why, but jquery .submit() doesn't work
	var submitButton = $(inputs).eq(0).parent().find('button');
	var eventObj = document.createEvent('MouseEvents');
	eventObj.initMouseEvent( 'click', true, true, window, 1, 0, 0, 0, 0, false, false, false, false, 0, null );
	submitButton[0].dispatchEvent(eventObj);
}

function firstRun_getPrivacySetting() {
	var privacyFrame = $('#hrt_privacyModal').contents();
	var currentPrivacy = 'NON';
	var inputs = $(privacyFrame).find(userPrivacySetting);
	for(var x=0, xl=inputs.length; x<xl; x++) {
		var el = $(inputs).eq(x);
		if($(el).attr('value').indexOf('email')<0) {
			if($(el).attr('checked')=='checked') {
				currentPrivacy = $(el).attr('value');
			}
		}
	}
	return currentPrivacy;
}

function firstRun_importUserRatings() {
	// ajax is asynchronous
	$.ajax({
		url: '/user/id/' + userIDRT + '/ratings',
		cache: false,
		dataType: 'html'
	}).done(function(response) {
		var $el = $('<div>').html(response);
		$el = $el.find(userRatings);
		// get user's ratings
		for(x=0, xl=$el.length; x<xl; x++) {
			var filmPath = $el.eq(x).find('.media-heading a').attr('href');
			if(!filmPath) { continue; }
			if(filmPath.indexOf('/m/')<0) { continue; }
			var filmName = $el.eq(x).find('.media-heading a').html();
			var stars = $el.eq(x).find('.glyphicon').length;
			if($el.eq(x).html().search(/\u00BD/)>-1) {
				// app interprets 1/2 stars as full stars
				stars++;
			}
			// search for movie in ratingsArray
			// add to array if new
			match = false;
			for(var i=1,il=ratingsArray.length; i<il; i++) {
				if(ratingsArray[i][0][1]==filmPath) {
					match = true;
					break;
				}
			}
			if(!match) {
				frUserRatingsArray[frMoviesCount] = [];
				frUserRatingsArray[frMoviesCount][0] = filmName;
				frUserRatingsArray[frMoviesCount][1] = filmPath;
				frUserRatingsArray[frMoviesCount][2] = stars;
				frMoviesCount++;
			}
		}

		// get critics' ratings
		if(frContinueImport) {
			firstRun_scrape_critic_ratings();
		}
	}).error(function(xhr, ajaxOptions, thrownError){
		frImportMessage = xhr.status + ' (' + thrownError + ')';
		$('#hrt_modal').remove();
		$('#hrt_modalClickZone').remove();
		firstRun_showModal(error);
	});	
}

function firstRun_scrape_critic_ratings() {
	frImportMessage = 'The app is now importing your ratings...';
	$('#firstRun_StatusBarHolder').css('display','block');
	$('#firstRun_statusTitle').css('display','block');

	// create array of ajax calls to be made
	// that will find total pages of reviews for each movie
	// for each movie
	for(x=0; x<frMoviesCount; x++) {
		frCallsTotalPages.push(
			$.ajax({
				url: frUserRatingsArray[x][1],
				cache: false,
				dataType: 'html',
			}).done(function(response) {
				var $el = $('<div>').html(response);
				var temp = $el.find(criticsCount).find('a').eq(0).html();
				var totalPages = 0;
				if(temp) {
					totalPages = Math.ceil(parseInt(temp.substring(temp.indexOf('(')+1,temp.length-1))/20);
				}
				// find movie in frUserRatingsArray to add totalPages
				var filmPath = this.url.substring(0,this.url.indexOf('?'));
				for(var y=0, yl=frUserRatingsArray.length; y<yl; y++) {
					if(frUserRatingsArray[y][1]==filmPath) {
						frUserRatingsArray[y][3] = totalPages;
						break;
					}
				}
				frMoviesImported += 1;
				frRatingsCount += totalPages;
				frPercent = Math.round((frMoviesImported/frMoviesCount)*100);
				frStatusTitle = filmPath.substring(3,filmPath.length-1);
				frStatusTitle = frStatusTitle.replace(/_/g,' ');
			}).error(function(xhr, ajaxOptions, thrownError){
				frImportMessage = xhr.status + ' (' + thrownError + ')';
				$('#hrt_modal').remove();
				$('#hrt_modalClickZone').remove();
				firstRun_showModal('error');
			})
		);
	}

	// concurrently execute the totalPages calls 
	$.when.apply(null, frCallsTotalPages).done(function() {
		frImportMessage = 'Found your ratings for ' + frMoviesCount + ' movies previously unknown to this app.  Now importing every critics\'s rating of each movie.  This could take up to a few minutes depending on your connection speed.' ;
		// may have been set by earlier if this is a movie page
		frRatingsImported = 0;
		for(x=0; x<frMoviesCount; x++) {
			var criticPercent = 0;
			// add new row to ratingsArray
			var num = ratingsArray.length;
			ratingsArray[num] = [];
			ratingsArray[num][0] = [];
			ratingsArray[num][0][0] = frUserRatingsArray[x][0] // filmName;
			ratingsArray[num][0][1] = frUserRatingsArray[x][1] // filmPath;
			ratingsArray[num][0][2] = 0; // legacy
			ratingsArray[num][1] = frUserRatingsArray[x][2]; // user rating
			// each scrape call updates the ratingsArray & criticsArray
			add_scrape_calls(frCallsCriticRatings,frUserRatingsArray[x][3],frUserRatingsArray[x][1],num);
		}

		// concurrently execute criticRatings calls
		$.when.apply(null, frCallsCriticRatings).done(function() {

			save_to_storage();
			firstRun = frMoviesCount + '';
			storage.set({'firstRun': firstRun}, function() {
				messagePort.postMessage({firstRun: firstRun });
			});

			if($(scorePanel).length>0 && location.pathname.indexOf('/tv/')<0) { 
				// this is a movie listing
				criticsArray_update();
				update_critics_widget();
				update_meter_widget();
				update_distribution_widget();
			}
			clearInterval('frTimer');
			$('#hrt_modal').remove();
			$('#hrt_modalClickZone').remove();
			firstRun_showModal('complete');
		}).fail(function() {
			clearInterval('frTimer');
			$('#hrt_modal').remove();
			$('#hrt_modalClickZone').remove();
			frImportMessage = scrapeErrors;
			firstRun_showModal('error');
		});
	}).fail(function() {
		clearInterval('frTimer');
		$('#hrt_modal').remove();
		$('#hrt_modalClickZone').remove();
		frImportMessage = scrapeErrors;
		firstRun_showModal('error');
	});

}










/////////////////////////   ////   ////   ////   ////   ////
//                     //   ////   ////   ////   ////   ////
//        MISC         /////   ////   ////   ////   ////   ////
//      FUNCTIONS      /////   ////   ////   ////   ////   ////
//                     //   ////   ////   ////   ////   ////
/////////////////////////   ////   ////   ////   ////   ////










function save_to_storage() {
	storage.set({'ratings': ratingsArray}, function() {
		messagePort.postMessage({ratingsData: ratingsArray});
	});
}

function show_update_status(totalPages) {
	updatingTimer = setInterval(function() {
		var txt = 'gathering ratings, step ' + pagesScraped + ' of ' + totalPages + '...';
		$('#updating').html(txt);
	},250);
}

function update_critics_widget() {
	var txt = '';
	// count user ratings
	for(i=1,il=ratingsArray.length; i<il; i++) {
		if(ratingsArray[i][1] > 0) {
			totalUserRatings++;
		}
	}
	if(totalUserRatings<1) {
		$('#critics_filter').css('display','none');	
		txt += '<div class="noratings">';
		txt += 'Thanks for installing the Heirloom Rotten Tomatoes app! This space is empty because you haven\'t used the app to rate any movies yet. To get started, you can <a href="#" id="noratings_import">import past ratings</a> from your Rotten Tomatoes account or start ratings movies now.  Just search for a recent movie that you loved and click on one of the stars next to "YOUR RATING" above. <br><br>If you are not logged-in, Rotten Tomatoes will display a login pop-up.';
		txt += '</div>';
	} else if(totalUserRatings<2) {
		$('#critics_filter').css('display','none');	
		txt += '<div class="noratings">';
		txt += 'Great! Now just rate just one more movie to see the list of critics ordered by their similarity to you. The more movies you rate, the more accurate the list will become. For fastest results, start by rating a few movies that critics loved but you hated (or visa versa).';	
		txt += '</div>';
	} else {
		$('#critics_title').css('display','block');	
		$('#critics_filter').css('display','block');
		$('#critics_rows').addClass('cr_empty');
		$('#critics_rows').addClass('cr_filled');
		for(y=0,yl=criticsArray.length; y<yl; y++) {
			var critic = criticsArray[y];
			var rated = '';
			var tinyMeter = '';
			if(pageFilmIndex>0) { // film page
				if(critic[1] == 0) { 
					rated = ' unrated';
				} else if(critic[1]>2.9) { 
					tinyMeter = ' fresh';
				} else if(critic[1]<=2.9) {
					tinyMeter = ' rotten';
				}
			}
			var similarity = ' ful';
			if(critic[5] < 0.5) { 	
				similarity = ' non' 
			} else if(critic[5]<0.6) { 
				similarity = ' low' 
			} else if(critic[5]<0.7) { 
				similarity = ' med' 
			}
			var blurb = '<i>(hasn\'t written a review for this movie)</i>';
			if(critic[3] != '') {
				blurb = critic[3];
			}
			var urlTxt = critic[0];
			urlTxt = urlTxt.replace(/\./g,'');
			urlTxt = urlTxt.replace(/ /g,'-');

			txt += '<div class="row_wrapper' + rated + '">';
				txt += '<div class="tiny_meter' + tinyMeter + '" title="' + critic[1] + '"></div>';
				txt += '<a target="_blank" href="' + critic[2] + '" class="review">' + blurb + '</a>';
				txt += '<a target="_blank" href="../../critic/' + urlTxt + '" class="name'  + similarity + '">' + critic[0] + '</a>';
				txt += '<a class="critic_heart" href="#" id="fav_' + urlTxt + '" onclick="return false;"></a>';
				txt += '<div class="score">' + Math.round(critic[5]*100) + '%</div>';
				txt += '<div class="count">(' + critic[4] + ')</div>';
			txt += '</div>';
		}
		// send data to the persistent eventPage for analytics
		messagePort.postMessage({criticsData: criticsArray});
	}
	$('#critics_rows').html(txt);

	// shade rows
	shade_critic_rows();
	// update critic hearts
	storage.get('favorites', function(items) {
		if(items.favorites) {
			favoritesArray = items.favorites;
		}
		for(x=0,xl=favoritesArray.length; x<xl; x++) {
			$('#fav_' + favoritesArray[x]).toggleClass('favorite_critic');
		}
	});
	$('#hrt_size').html('close');
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
			var sortScore = criticsArray[x][6];
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
	var el = $('#heirloom-critics-numbers');
	$(el).find('.meter-value').find('span').html(txt);
	$(el).find('.meter-tomato').removeClass('certified');
	$(el).find('.meter-tomato').removeClass('fresh');
	$(el).find('.meter-tomato').removeClass('rotten');
	if(txt != '?') {
		if(avgFreshness>=.8) {
			$(el).find('.meter-tomato').addClass('certified');
		} else if(avgFreshness>=.6) {
			$(el).find('.meter-tomato').addClass('fresh');
		} else {
			$(el).find('.meter-tomato').addClass('rotten');
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
	for(x=0,xl=criticsArray.length; x<xl; x++) {
		// if film was rated
		if(criticsArray[x][1]>0 && criticsArray[x][1]!='') {
			// critic counts as a fraction based on their sort score
			var sortScore = criticsArray[x][6]*100; // [6] is baysian score
			if(sortScore>0) {
				sortScore = Math.pow(sortScore,10); // very heavily weighting the most similar critics
			} else {	
				sortScore = Math.pow(sortScore,10) * -1; 
			}
			var rating = parseFloat(criticsArray[x][1]);
			rating = parseInt(Math.round(rating-1));
			if(rating>4) { rating = 4; } // rotten tomato bug
			starColumns[rating] += sortScore;
		}
	}
	var colMax = Math.max.apply(Math, starColumns);
	for(x=0,xl=starColumns.length; x<xl; x++) {
		starColumns[x] = starColumns[x]/colMax;
		starColumns[x] = Math.round(starColumns[x]*35);
		$('#dist_s' + x).css('height',starColumns[x]);
		$('#dist_s' + x).css('margin-top',35-starColumns[x]);
	}
	var el = $('#heirloom-critics-numbers');
	$(el).find('#scoreStats').find('div:first').remove();
	$(el).find('#scoreStats').find('div').eq(1).remove();
	$(el).find('#scoreStats').find('div').eq(1).remove();
}

function sanitize_rating(el) {
	// depends on RT maintaining its element ID conventions
	var txt = '';
	var rating = 0;
	if($(el).attr('tip')) { 
		// complex ratings
		txt = $(el).attr('tip');
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
		if($(el).attr('class').indexOf('fresh') > -1) {
			rating = 4; 
		} else {
			rating = 2;
		}	
	}
	return rating;
}

function apply_critic_filter() {
	var now = $('#critics_filter').html();
	if(now.indexOf('show')>-1) {
		$('#critics_filter').html('hide extra critics');
		$('#critics_rows').find('.unrated').toggleClass('shown');
		$('#critics_rows').find('.shown').toggleClass('unrated');
	} else {
		$('#critics_filter').html('show every critic');
		$('#critics_rows').find('.shown').toggleClass('unrated');
		$('#critics_rows').find('.unrated').toggleClass('shown');
	}
	shade_critic_rows();
}

function shade_critic_rows() {
	var num = 0;
	$('.row_wrapper').each( function(x, el) {
		if($(el).hasClass('odd')) {
			$(el).toggleClass('odd');
		}
		if($(el).hasClass('unrated')) {
			num++;
		}
		if(num%2 == 0) {
			$(el).toggleClass('odd');
		}
		num++;
	});
}

function erase_data() {
	var erase = prompt('Type "ok" then press "ok" to permanently erase all of your saved ratings forever.','')
	if(erase == 'ok') {
		ratingsArray = [];
		storage.set({'ratings': ratingsArray}, function() {
			messagePort.postMessage({ratingsData: ratingsArray});
			location.reload();
		});
	} else {
		alert('You didn\'t type "ok", so data was NOT erased.');	
	}
}

function export_data(theData,name,mime,el) {
	window.webkitRequestFileSystem(window.TEMPORARY, 1024*1024, function(fs) {
		var created = false;
		// check for existence of file
		var dirReader = fs.root.createReader();
		dirReader.readEntries(function(entries) {
			for (var i = 0, entry; entry = entries[i]; ++i) {
				if (entry.name==name) {
					entry.remove(function() {	
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
		fileEntry.createWriter(function(fileWriter) {
			var blob = new Blob([theData], {type: mime});
			fileWriter.addEventListener("writeend", function() {
				// navigate to file, will download
				var theURL = fileEntry.toURL();
				$(el).attr('href',theURL);
				$(el).attr('download',name);
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
	var file, reader;
	file = event.target.files[0];
	reader = new FileReader();
	reader.onload = receivedText;
	reader.readAsText(file);
//	reader.readAsBinaryString(file);
	function receivedText() {
		var storageData = JSON.parse(reader.result);
		ratingsArray = storageData;
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










/////////////////////////   ////   ////   ////   ////   ////
//                     //   ////   ////   ////   ////   ////
//   DATA STRUCTURE    /////   ////   ////   ////   ////   ////
//      VERSION 5      /////   ////   ////   ////   ////   ////
//                     //   ////   ////   ////   ////   ////
/////////////////////////   ////   ////   ////   ////   ////










/* 

ratingsArray structure

	ratingsArray[0] = header row
		ratingsArray[0][0] = first column: dataVersion
		ratingsArray[0][1] = second column: user info
		ratingsArray[0][j] = subsequent columns: critic info
			ratingsArray[0][j][k] =
				0 = critic name
				1 = critic url path
				2 = (unused)
				3 = (unused)

	ratingsArray[i] = subsequent rows: movie ratings 
		ratingsArray[i][0] = first column: movie info 
			ratingsArray[i][0][k] = 
				0 = film name
				1 = film path
				2 = (unused)

		ratingsArray[i][1] = second column: user's ratings 
		ratingsArray[i][j] = subsequent columns: critics' ratings 
			ratingsArray[i][j] = rating of this film
	
criticsArray structure

	criticsArray[y] = each row:  a critic
		0 = criticName;
		1 = criticRating;
		2 = reviewPath;
		3 = reviewBlurb;
		4 = films on common with user
		5 = similarity scrore to user
		6 = baysian sort score

*/









