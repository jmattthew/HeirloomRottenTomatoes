/*

Open-source, copyright free, non-commercial.  Make it better!  Images files are the property of Rotten Tomatoes.  

	TO-DO LIST:
	
	* warn user and fail gracefully if RT changes its code
	* make it work for tv pages
	* scrape any movie ratings existing in RT user account and import
	* allow users to compare similarity with each other
	* stats/graphs about similarity score 
		* e.g. bell-curve of similarity of all critics

*/














/////////////////////////
//                     //
//       GLOBAL        //
//      VARIABLES      //
//                     //
/////////////////////////

var storage = chrome.storage.local;
var pageFilmIndex = 0;
var pageFilmPath = '';
var pageFilmName = '';
var pageFilmReleaseDate = '';
var ratingsArray = new Array();
var criticsArray = new Array();
var favoritesArray = new Array();
var pagesScraped = 1;
var totalPages = 1;
var totalUserRatings = 0;
var updatingTimer = 0;
var starMatchTimer = 0;

// when storage methods change, this variable
// allows some older versions to be detected and fixed
var dataVersion = 5; 

// Rotten Tomatoes' element IDs that are subject to change
// if and when RT updates their code
var loginRT = '#header-top-bar-logout'; 
var starWidgetRT = '#rating_widget .stars';
var allCriticsFreshnessScoreRT = '#all-critics-meter';
var scorePanel = '#scorePanel';
var reviewsPageCount = '.pageInfo';
var reviewsList = '#reviews';
var audienceBox = '.audience-info';
var criticsCount = '#criticHeaders';












/////////////////////////
//                     //
//        ACTION       //
//                     //
/////////////////////////

// all the action happens within the storage.get call back
// because it's asyncronous

storage.get('ratings', function(items) {
	fix_annoying_header();
	ratingsArray_create(items.ratings);
	if($(scorePanel).length>0) { // this is a movie listing
		insert_critics_widget();
		insert_rating_widget();
		show_update_status();
		find_total_pages();
		ratingsArray_add_this_movie();
		// create array of ajax calls to be made
		var concurrentCalls = scrape_pages_update_arrays();
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
		});
	}
});













/////////////////////////
//                     //
//    DOM INSERTION    //
//      FUNCTIONS      //
//                     //
/////////////////////////

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
		txt += '<a href="#" onclick="return false" id="heirloom_tab" class="articleLink unstyled smaller gray">Similar Critics</a></li>';
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












/////////////////////////
//                     //
//  EVENTS FUNCTIONS   //
// FOR INSERTED STUFF  //
//                     //
/////////////////////////

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
	var el = $(loginRT);
	if(el.length>0) {
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
	// overlay box with extras
	$('#hrt_aboutLink').click(function(event) {
		$('BODY').append($('<div>',{ id: 'hrt_aboutClickZone' }));
		$('BODY').append($('<div>',{ id: 'hrt_aboutModal' }));
		$('#hrt_aboutModal').append($('<div>', { id: 'hrt_aboutModalInner'}));
		$('#hrt_aboutModalInner').append($('<strong>', { text: 'Thanks for using the Heirloom App!', style: 'text-align:center; padding-bottom:10px;' }));
		$('#hrt_aboutModalInner').append($('<strong>', { text: 'Information the app collects:' }));
		$('#hrt_aboutModalInner').append($('<span>', { text: 'This app only saves ratings data to your computer. Your movie ratings and the pages that you visit are 100% private to your computer and never transmitted. The app never accesses nor stores any login info.  It uses a Google Analytics cookie to send anonymous app usage information to the developer.' }));
		$('#hrt_aboutModalInner').append($('<strong>', { text: 'This is an open-source, fan supported project:' }));
		$('#hrt_aboutModalInner').append($('<span>', { text: 'Neither this browser app nor it\'s developer are affiliated with or supported by Rotten Tomatoes in any way. To report an issue or make a nice comment, tweet ' }));
		$('#hrt_aboutModalInner').find('span:last').append($('<a>', { href: 'http://twitter.com/mattthew', target: '_blank', text: '@mattthew' }));
		$('#hrt_aboutModalInner').append($('<span>', { text: 'If you want to send me a few pennies worth of Bitcoin, ' }));
		$('#hrt_aboutModalInner').find('span:last').append($('<a>', { href: 'http://mattthew.tip.me', target: '_blank', text: 'go for it!' }));
		$('#hrt_aboutModalInner').append($('<strong>', { text: 'Your movie ratings:' }));
		$('#hrt_aboutModalInner').append($('<div>', { id: 'rated_movies' }));
		$('#hrt_aboutModalInner').append($('<strong>'));
		$('#hrt_aboutModalInner').append($('<strong>', { text: 'Experimental features:' }));
		$('#hrt_aboutModalInner').append($('<strong>'));
		$('#hrt_aboutModalInner').append($('<a>', { href: '#', text: 'export list of critics with their similarity to you', id: 'export_critics' }));
		$('#hrt_aboutModalInner').append($('<strong>'));
		$('#hrt_aboutModalInner').append($('<a>', { href: '#', text: 'export raw data file', id: 'export_raw' }));
		$('#hrt_aboutModalInner').append($('<strong>'));
		$('#hrt_aboutModalInner').append($('<input>', { type: 'file', id: 'import_raw' }));
		$('#hrt_aboutModalInner').append($('<output>', { id: 'list_ratings' }));
		$('#hrt_aboutModalInner').append($('<input>', { type: 'button', id: 'fake_import', name: 'fake_import', value: 'import raw data file' }));
		$('#hrt_aboutModalInner').append($('<strong>'));
		$('#hrt_aboutModalInner').append($('<span>', { text: 'Export a comparison of every critic with every other critic, given the movies you\'ve rated so far. The report will contain all critic-pairs who have rated at least one movie in common. WARNING:  This may generate a very large file and Chrome will hang for one or more minutes. ' }));
		$('#hrt_aboutModalInner').find('span:last').append($('<a>', { href: '#', text: 'Try experimental report.', id: 'extras_events_compareAll' }));
		$('#hrt_aboutModalInner').append($('<strong>'));
		$('#hrt_aboutModalInner').find('strong:last').append($('<a>', { href: '#', text: 'erase your data', id: 'hrt_erase', style: 'color:red;' }));

		// insert list of the user's ratings
		var txt = '';
		for(var i=1,il=ratingsArray.length; i<il; i++) {
			if(ratingsArray[i][1]>0) {
				txt += '<span style="margin-bottom:0px;">(' + ratingsArray[i][1] + ' stars)&nbsp;';
				txt += '<a target="_blank" href="'+  ratingsArray[i][0][1] + '">' + ratingsArray[i][0][0] + '</a></span>';
			}
		}
		$('#rated_movies').html(txt);

		// position it
	    var docWidth = $( window ).width();
    	var docHeight = $( window ).height();
    	$('#hrt_aboutClickZone').css('height',docHeight + 'px');
    	$('#hrt_aboutClickZone').css('width',docWidth + 'px');
    	var x = parseInt((docWidth-530)/2);
    	var y = parseInt((docHeight-$('#hrt_aboutModal').height())/2);
		$('#hrt_aboutModal').css('top',y + 'px'); 
		$('#hrt_aboutModal').css('left',x + 'px');

		// bindings
		$('#hrt_aboutClickZone').click(function(event) {
			$('#hrt_aboutModal').remove();
			$('#hrt_aboutClickZone').remove();
			$('BODY').off('keyup');
		});
		$('BODY').keyup(function(event) {
			$('#hrt_aboutModal').remove();
			$('#hrt_aboutClickZone').remove();
			$('BODY').off('keyup');
		});

		$('#hrt_erase').click(function(event) {
			erase_data();
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
				theData += '"' + tempStr + '",' + criticsArray[x][3] + ',' + criticsArray[x][4] + ',' + criticsArray[x][6] + '\n';
			}
			if(!$(this).attr('download')) { // no download link so create then simulate click
				export_data(theData,'my_top_critics.csv','text/plain',this);	
			}
		});
		$('#compare_all').click(function(event) {
			extras_events_compareAll(this);
	//		extras_events_getPearsons(this);
		});

		return false;
	});
}

function extras_events_compareAll(el) {
	if(!$(el).attr('download')) { // no download link so do calculation
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
		export_data(theData,'all_critics_compared.csv','text/plain',el);	// no download link so create it and simulate a click
		return false;
	}
}

function extras_events_getPearsons(el) {
	if(!$(el).attr('download')) { // no download link so do calculation
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
		export_data(theData,'all_critics_pearson.csv','text/plain',el);	// no download link so create it and simulate a click
		return false;
	}
}













/////////////////////////
//                     //
//    RATINGS DATA     //
// RETRIEVAL FUNCTIONS //
//                     //
/////////////////////////

function ratingsArray_create(storageData) {
	// check validity of storageData (storage.items.ratings)
	var validData = false;
	if(storageData) { // data exists
		if(storageData.length>0) { // it's an array
			if(storageData[0].length>0) { // we a "column"
				if(storageData[0][0].length>0) { // 1st cell has an array
					if(storageData[0][0][0]) { // that array has data
						ratingsArray = storageData;
						validData = true;
					}
				}
			}
		}
	}
	if(validData) {
		ratingsArray_fix_legacy();
	} else {
		// no valid data, so construct fresh Array
		ratingsArray = new Array();
		// header row
		ratingsArray[0] = new Array();
			// header "column"
			ratingsArray[0][0] = new Array();
				ratingsArray[0][0][0] = dataVersion; 
			// first critic column (user)
			ratingsArray[0][1] = new Array();
				ratingsArray[0][1][0] = 'you'; // critic name
				ratingsArray[0][1][1] = 'n/a'; // critic path
				ratingsArray[0][1][2] = 0; // legacy
				ratingsArray[0][1][3] = 0; // legacy
	}
}

function ratingsArray_fix_legacy() {
	var wasLegacy = false;
	if(ratingsArray[0][0][0] < 4) { 
		// fix really old buggy versions
		for(var i=0, il=ratingsArray.length; i<il; i++) { // 
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
		// an older version incorrectly calculated comparison score
		if(ratingsArray[0][1][2] > 0) {
			for(var j=1, jl=ratingsArray[0].length; j<jl; j++) {
				ratingsArray[0][j][2] = 0;
				ratingsArray[0][j][3] = 0;
				for(var i=1, il=ratingsArray.length; i<il; i++) {
					ratingsArray[i][j][1] = 0;
				}
			}
		}
		wasLegacy = true;
	}
	if(ratingsArray[0][0][0] < 5) {
		// version 4 saved paths to critic reviews
		// but that takes up too much storage space 
		// 5 also saves space on the critic path
		for(var i=0, il=ratingsArray.length; i<il; i++) {
			for(var j=1, jl=ratingsArray[0].length; j<jl; j++) {
				if(i==0) {
					if(!ratingsArray[0][j][1]) {
						// somehow a null value snuck in to review with no name
						ratingsArray[0][j][1] = '';
					} else {
						ratingsArray[0][j][1] = ratingsArray[0][j][1].replace(/\/critic\//g,'');
					}
				} else {
					var tempReview = ratingsArray[i][j][0];
					if(tempReview >= 0) {
					} else {
						tempReview = 0;
					}
					ratingsArray[i][j] = tempReview;
				}
			}
		}
		// remove duplicates
		for(var x=1, xl=ratingsArray[0].length; x<xl; x++) {
			for(var y=x+1, yl=ratingsArray[0].length; y<yl; y++) {
				if(ratingsArray[0][x][0]==ratingsArray[0][y][0]) {
					for(var i=0, il=ratingsArray.length; i<il; i++) {
						ratingsArray[i].splice(y,1);
						yl--;
						xl--;
					}
					break;
				}
			}
		}
		wasLegacy = true;
	}
	if(wasLegacy) {
		ratingsArray[0][0][0] = dataVersion; 
		save_to_storage();		
	}
}

function find_total_pages() {
	// find total pages to scrape
	var temp = '';
	temp = $(criticsCount).find('a').eq(0).html();
	if(temp) {
		totalPages = Math.ceil(parseInt(temp.substring(temp.indexOf('(')+1,temp.length-1))/20);
	}
}

function ratingsArray_add_this_movie() {
	pageFilmName = $('.movie_title span')[0].innerHTML;
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
		}
	}
	// if this film not found, add new row to the array
	if(pageFilmIndex < 1) {
		pageFilmIndex = ratingsArray.length;
		ratingsArray[pageFilmIndex] = new Array();
		for(var j=0, jl=ratingsArray[0].length; j<jl; j++) {
			// add blank cell for every critic
			ratingsArray[pageFilmIndex][j] = 0;
		}
		ratingsArray[pageFilmIndex][0] = new Array();
		ratingsArray[pageFilmIndex][0][0] = pageFilmName;
		ratingsArray[pageFilmIndex][0][1] = pageFilmPath;
		ratingsArray[pageFilmIndex][0][2] = 0; // legacy
	}	
}

function scrape_pages_update_arrays() {
	var calls = [];
	for(var page=0; page<totalPages; page++) {
		calls.push(
			$.ajax({
				url: pageFilmPath + 'reviews/?page=' + page + '&sort=name',
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
						if(!criticName) { criticName = '(unknown)'; }
						var criticPath = $el.eq(y).find('a').eq(0).attr('href');
						criticPath = criticPath.replace(/\/critic\//g,'');
						var reviewBlurb = $el.eq(y).find('p').eq(0).html();
						var reviewPath = $el.eq(y).find('a').eq(1).attr('href');
						var ratingEL = $el.eq(y).find('td').eq(3).find('div');
						var criticRating = sanitize_rating(ratingEL);
						// find matching critic in ratingsArray
						var newCritic = true;
						for(var j=2, jl=ratingsArray[0].length; j<jl; j++) {
							if(criticPath == ratingsArray[0][j][1]) {
								// note that when saving to storage:
								// the blurb and review path will be discarded
								ratingsArray[pageFilmIndex][j] = criticRating;
								newCritic = false;
							}
						}	
						if(newCritic) {	
							var columns = ratingsArray[0].length;
							// add new column to header row
							ratingsArray[0][columns] = new Array();
							ratingsArray[0][columns][0] = criticName;
							ratingsArray[0][columns][1] = criticPath;
							ratingsArray[0][columns][2] = 0; // legacy			
							ratingsArray[0][columns][3] = 0; // legacy	
							for(var i=1, il=ratingsArray.length; i<il; i++) { 
								// for each film row
								// add new cell to end
								ratingsArray[i][columns] = 0;
							}
							// and for this film only
							ratingsArray[pageFilmIndex][columns] = criticRating;
						}
						var num = criticsArray.length; 
						criticsArray[num] = new Array();
						criticsArray[num][0] = criticName;
						criticsArray[num][1] = criticRating;
						criticsArray[num][2] = reviewPath;
						criticsArray[num][3] = reviewBlurb;
					}
				}
				pagesScraped++;
			})
		);
	};
	return calls;
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
			criticsArray[num] = new Array();
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
					criticsArray[y][5] = .6; // no films in common, so assume 60% similarity
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

function save_to_storage() {
	storage.set({'ratings': ratingsArray}, function() {	
	});
}











/////////////////////////
//                     //
//        MISC         //
//      FUNCTIONS      //
//                     //
/////////////////////////

function fix_annoying_header() {
	$('.leaderboard_wrapper').css('min-height','0px');
	$('.leaderboard_wrapper').css('padding','0px');
}

function show_update_status() {
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
		if(totalUserRatings>1){
			break;
		}
	}

	if(totalUserRatings==0) {
		$('#critics_filter').css('display','none');	
		txt += '<div class="noratings">';
		txt += 'Thanks for installing the Heirloom Rotten Tomatoes app! This space is empty because you haven\'t used the app to rate any movies yet. To get started, search for a recent movie that you loved and click on one of the stars next to "YOUR RATING" above. <br><br>If you are not logged-in, Rotten Tomatoes will display a login pop-up.';
		txt += '</div>';
	} else if(totalUserRatings==1) {
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
			var critic = criticsArray[y]
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
			var similarity = '';
			if(critic[5] < 0.5) { 	
				similarity = ' non' 
			} else if(critic[5]<0.6) { 
				similarity = ' low' 
			} else if(critic[5]<0.7) { 
				similarity = ' med' 
			}
			var blurb = '<i>(hasn\'t rated this movie)</i>';
			if(critic[3] != '') {
				blurb = critic[3];
			}
			var urlTxt = critic[0];
			urlTxt = urlTxt.replace(/\./g,'');
			urlTxt = urlTxt.replace(/ /g,'-');

			txt += '<div class="row_wrapper' + rated + similarity + '">';
				txt += '<div class="tiny_meter' + tinyMeter + '" title="' + critic[1] + '"></div>';
				txt += '<a target="_blank" href="' + critic[2] + '" class="review">' + blurb + '</a>';
				txt += '<a target="_blank" href="../../critic/' + urlTxt + '" class="name">' + critic[0] + '</a>';
				txt += '<a class="critic_heart" href="#" id="fav_' + urlTxt + '" onclick="return false;"></a>';
				txt += '<div class="score">' + Math.round(critic[6]*100) + '%</div>';
				txt += '<div class="count">(' + critic[4] + ')</div>';
			txt += '</div>';
		}
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
		ratingsArray_create(storageData);
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
//                     //
//        DATA         //
//      STRUCTURE      //
//      VERSION 5      //
//                     //
/////////////////////////

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









