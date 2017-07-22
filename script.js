/*

Open-source, copyright free, non-commercial.  Make it better!
tiny_meter.png & meter_sprite.png files are the property of Rotten Tomatoes.

	TO-DO LIST:
	* make it work for tv pages
		needs an entirely separate ratings & critics database
		season to season graph would be cool
	* allow users to compare similarity with each other
	* stats/graphs about similarity score
		* e.g. bell-curve of similarity of all critics

*/










/////////////////////////   ////   ////   ////   ////   ////
//                     //   ////   ////   ////   ////   ////
//   DATA STRUCTURE    /////   ////   ////   ////   ////   ////
//      VERSION 6      /////   ////   ////   ////   ////   ////
//                     //   ////   ////   ////   ////   ////
/////////////////////////   ////   ////   ////   ////   ////










/*

ratingsArray
============

Saved to local storage.  Contains all critics this user has ever encountered.

Structure:

	ratingsArray[0] = header row
		ratingsArray[0][0] = first column: dataVersion
		ratingsArray[0][1] = second column: user info
		ratingsArray[0][j] = subsequent columns: critic info
			ratingsArray[0][j][k] =
				0 = critic name
				1 = critic url path
				2 = top critic flag
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




criticsArray
============

Temporary data for this page.  Only contains critics of this film.

Structure:

	criticsArray[y] = each row:  a critic
		0 = criticName;
		1 = criticPath;
		2 = criticIsTop;
		3 = criticRating;
		4 = reviewPath;
		5 = reviewBlurb;
		6 = films on common with user
		7 = similarity scrore to user
		8 = baysian sort score

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
var debug = '';
var storage = chrome.storage.local;
var appVersion = chrome.runtime.getManifest().version;
var userIDRT = '';
var pageFilmIndex = 0;
var pageFilmPath = '';
var pageFilmName = '';
var ratingsArray = [];
var criticsArray = [];
var favoritesArray = [];
var pagesScraped = 1;
var totalUserRatings = 0;
var dataReadyTimer = 0;
var updatingTimer = 0;
var starMatchTimer = 0;
var loginTimer = 0;
var scrapeErrors = '';
var toolTipData = [];
var hasScrolledReviews = false;

// firstRun data
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

// score panel info
var spAllScore = 0;
var spAllCount = 0;
var spTopScore = 0;
var spTopCount = 0;
var spAudienceScore = 0;
var spAudienceCount = '';
var spAudienceAverage = 0;
var spConsensus = '';
var spSynopsis = '';

// Rotten Tomatoes' element IDs that are subject to change
// if and when RT updates their code
var userLoginArea = '#navbar .header_links';
var userRatingsLink = '#headerUserSection .ratings a';
var elUserRatingRow = '.media-body';
var elUserRatingFilmLink = '.media-heading a';
var elUserRatingStars = '.glyphicon-star';
var userPrivacySetting = '.content_body input';
var userPrivacyAlert = '#headerUserSection .name a';
var freshPick = '#header-certified-fresh-picks a';
var loginLinkRT = '#header-top-bar-login';
var ratingWidgetTarget = '#topSection';
var starWidgetRT = '#rating_widget_desktop .rating-stars';
var poster = '#movie-image-section div';
var elScorePanel = '#scorePanel';
var reviewsPageCount = '.pageInfo';
var criticsCount = '#criticHeaders';
var elReviewsScrapeLink = '#criticHeaders a:nth-child(1)';
var elReviewsListRow = '.review_table_row';
var elReviewBlurb = '.the_review';
var elReviewPath = '.review_desc a';
var elReviewIcon = '.review_icon';
var elAnnoyingHeader1 = '.leaderboard_wrapper';
var elAnnoyingHeader2 = '#header-main';
var elCriticName = '.critic_name a:nth-child(1)';
var elCriticPub = '.critic_name em';
var elCriticIsTop = '.top_critic';
var elAllScore = '#all-critics-numbers .meter-value span';
var elAllCount = '#all-critics-numbers #scoreStats div:nth-child(2) span:nth-child(2)';
var elTopScore = '#top-critics-numbers .meter-value span';
var elTopCount = '#top-critics-numbers #scoreStats div:nth-child(2) span:nth-child(2)';
var elAudienceScore = '.audience-score .meter-value span';
var elAudienceCount = '.audience-info div:nth-child(2) span';
var elAudienceAverage = '.audience-info div:nth-child(1) span';
var elConsensus = '.critic_consensus';
var elConsensusJunk = '.superPageFontColor';
var elSynopsis = '#movieSynopsis';
var elPageFilmName = '#movie-title';








/////////////////////////   ////   ////   ////   ////   ////
//                     //   ////   ////   ////   ////   ////
//       ACTION        /////   ////   ////   ////   ////   ////
//       ON LOAD       /////   ////   ////   ////   ////   ////
//                     //   ////   ////   ////   ////   ////
/////////////////////////   ////   ////   ////   ////   ////





chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
	show_about_modal();
});

messagePort.postMessage({status: 'sendFirstRun'});
messagePort.onMessage.addListener(function(msg) {
	if(msg.firstRun) {
		firstRun = msg.firstRun[0];
		var previousVersion = msg.firstRun[1];
		if(previousVersion != appVersion) {
			appUdate_showModal(previousVersion);
		}
		messagePort.postMessage({status: 'sendRatingsArray'});
	}
	if(msg.data) {
		ratingsArray = msg.data;
		firstRun_check(true);
		if($(elScorePanel).length>0 && location.pathname.indexOf('/tv/')<0 && $(elPageFilmName).length>0) {
			// this is a movie listing
			fix_annoying_header();
			get_score_panel_data();
			var fadeTime = 250;
			$(elScorePanel).find('div').css('transition','opacity ' + fadeTime + 'ms');
			$(elScorePanel).find('div').css('opacity','0');
			var t1 = setTimeout(function(){
				// wait for fadeout to finish
				replace_score_panel();
				insert_critics_widget();
				insert_rating_widget();
				var totalPages = find_total_pages();
				show_update_status(totalPages);
				ratingsArray_add_this_movie();
				// create array of ajax calls to be made
				var concurrentCalls = [];
				// each scrape call updates the ratingsArray & criticsArray
				var scrapePath = $(elReviewsScrapeLink).attr('href');
				if(scrapePath) {
					scrapePath = 'https://www.rottentomatoes.com' + scrapePath;
					scrapePath = scrapePath.replace('/reviews','');
				} else {
					scrapePath = pageFilmPath;
				}
				add_scrape_calls(concurrentCalls,totalPages,scrapePath,pageFilmIndex);
				// concurrently execute the calls
				$.when.apply(null, concurrentCalls).done(function() {
					criticsArray_add_existing();
					criticsArray_update();
					rating_widget_events_match();
					update_critics_widget();
					update_tomatometer();
					add_score_panel_events();
					add_critics_widget_events();
					add_rating_widget_events();
					add_extras_events();
					$('#hrt_rating_widget UL').css('visibility','visible');
					$('#hrt_updating').css('display','none');
					clearInterval(updatingTimer);
				}).fail(function() {
					$('#hrt_updating').html('Could not gather critic reviews. Please try again.<br>Rotten Tomatoes returned this error message:<br>' + scrapeErrors);
					clearInterval(updatingTimer);
				});
			},fadeTime);
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
	txt += '<div id="hrt_critics_widget">';
		txt += '<div id="hrt_critics_title">';
			txt += '<div>Critics reviews, ranked by similarity to you</div>';
		txt += '</div>';
		txt += '<a href="#" id="hrt_critics_filter"><span>show all critics</span></a>';
		txt += '<div id="hrt_updating"></div>';
		txt += '<div id="hrt_critics_rows" class="hrt_cr_empty">';
		txt += '</div>'
	txt += '</div>'
	$('#hrt_score_panel').after(txt);
}

function get_score_panel_data() {
	spAllScore = parseInt($(elAllScore).html());
	spAllCount = parseInt($(elAllCount).html());
	spTopScore = parseInt($(elTopScore).html());
	spTopCount = parseInt($(elTopCount).html());
	var txt = $(elAudienceScore).html();
	spAudienceScore = parseInt(txt.substring(0,txt.length-1));
	if($(elAudienceCount).length>0) {
		// movie is released
		if($(elAudienceCount)[0].nextSibling) {
			spAudienceCount = $(elAudienceCount)[0].nextSibling.nodeValue;
		}
		spAudienceCount = spAudienceCount.replace(/\s/g,'');
		if($(elAudienceAverage)[0].nextSibling) {
			txt = $(elAudienceAverage)[0].nextSibling.nodeValue;
		}
		txt = txt.replace(/\s/g,'');
		var fraction = txt.split('/');
		if(fraction.length==2) {
			var dividend = parseFloat(fraction[0]);
			var divisor = parseFloat(fraction[1]);
			if(divisor > 0) {
				spAudienceAverage = (dividend/divisor)*100;
			}
		}
	} else {
		// movie not yet released ("want to see")
		spAudienceAverage = '-1';
		if($(elAudienceAverage)[0].nextSibling) {
			spAudienceCount = $(elAudienceAverage)[0].nextSibling.nodeValue;
		}
		spAudienceCount = spAudienceCount.replace(/\s/g,'');
	}
	var el = $(elConsensus);
	$(el).find(elConsensusJunk).remove();
	spConsensus = $(el).html();
	spSynopsis = $(elSynopsis).html();
}

function replace_score_panel() {
	var audienceScoreIcon = 'popular';
	if(spAudienceAverage<0) {
		audienceScoreIcon = 'wanttosee';
	} else {
		if(spAudienceScore/100 < .6) {
			audienceScoreIcon = 'unpopular';
		}
	}
	var allScoreIcon = 'fresh';
	if(spAllScore/100 < .6) {
		allScoreIcon = 'rotten';
	}
	var topScoreIcon = 'fresh';
	if(spTopScore/100 < .6) {
		topScoreIcon = 'rotten';
	}
    var txt = '';
	txt += '<div id="hrt_tooltip"><span></span></div>';
	txt += '<div id="hrt_score_panel">';
		txt += '<div id="hrt_your_critics">';
			txt += '<div class="hrt_score_panel_title has_tip">All critics:</div>';
			if(Number.isNaN(spAllCount) || Number.isNaN(spAllScore)) {
				// tomatometer not available in all critics section
				txt += '<div class="hrt_score_panel_box">';
						txt += '<span>No consensus yet</span>';
				txt += '</div>';
			} else {
				txt += '<div class="hrt_score_panel_box">';
					txt += '<div class="hrt_score_panel_meter has_tip hrt_' + allScoreIcon + '">';
						txt += '<div></div><div>' + spAllScore + '</div><div>%</div>';
					txt += '</div>';
				txt += '</div>';
				txt += '<div class="hrt_score_panel_ratings">';
					txt += '<div class="hrt_histogram has_tip">';
						txt += '<div class="hrt_h0"><div></div></div>';
						txt += '<div class="hrt_h1"><div></div></div>';
						txt += '<div class="hrt_h2"><div></div></div>';
						txt += '<div class="hrt_h3"><div></div></div>';
						txt += '<div class="hrt_h4"><div></div></div>';
					txt += '</div>';
				txt += '</div>';
				txt += '<div class="hrt_score_panel_count">(' + spAllCount + ' critics)</div>';
			}
		txt += '</div><!--';
		txt += '--><div id="hrt_top_critics">';
			txt += '<div class="hrt_score_panel_title has_tip">Top critics:</div>';
			if(Number.isNaN(spTopCount) || Number.isNaN(spTopScore)) {
				// tomatometer not availablle in top critics section
				txt += '<div class="hrt_score_panel_box">';
						txt += '<span>No consensus yet</span>';
				txt += '</div>';
			} else {
				txt += '<div class="hrt_score_panel_box">';
					txt += '<div class="hrt_score_panel_meter has_tip hrt_'+ topScoreIcon +'">';
						txt += '<div></div><div>' + spTopScore + '</div><div>%</div>';
					txt += '</div>';
				txt += '</div>';
				txt += '<div class="hrt_score_panel_ratings">';
					txt += '<div class="hrt_histogram has_tip">';
						txt += '<div class="hrt_h0"><div></div></div>';
						txt += '<div class="hrt_h1"><div></div></div>';
						txt += '<div class="hrt_h2"><div></div></div>';
						txt += '<div class="hrt_h3"><div></div></div>';
						txt += '<div class="hrt_h4"><div></div></div>';
					txt += '</div>';
				txt += '</div>';
				txt += '<div class="hrt_score_panel_count">(' + spTopCount + ' critics)</div>';
			}
		txt += '</div><!--';
		txt += '--><div id="hrt_audiences">';
			txt += '<div class="hrt_score_panel_title has_tip">Audiences:</div>';
			txt += '<div class="hrt_score_panel_box">';
				txt += '<div class="hrt_score_panel_meter has_tip hrt_' + audienceScoreIcon + '">';
					txt += '<div></div><div>' + spAudienceScore + '</div><div>%</div>';
				txt += '</div>';
			txt += '</div>';
			txt += '<div class="hrt_score_panel_ratings">';
			if(spAudienceAverage>-1) {
				txt += '<div><div style="width:' + spAudienceAverage + '%;"></div></div>';
			} else {
				txt += '<span class="hrt_want">Want to see</span>'
			}
			txt += '</div>';
			txt += '<div class="hrt_score_panel_count">(' + spAudienceCount + ' users)</div>';
		txt += '</div><!--';
		txt += '--><div id="hrt_rateit">';
			txt += '<div class="hrt_score_panel_title has_tip">Rate this movie:</div>';
			txt += '<div class="hrt_score_panel_box"></div>';
			txt += '<div class="hrt_score_panel_count">Heirloom Installed!</div>';
			txt += '<a id="hrt_aboutLink" href="#">Extras &amp; Help</a>';
		txt += '</div><!--';
		txt += '--><div id="hrt_consensus">';
			txt += '<span><span>Consensus:&nbsp;&nbsp;</span>' + spConsensus + '</span>';
		txt += '</div><!--';
		txt += '--><div id="hrt_movie_synopsis">';
			txt += '<span><span>Synopsis:&nbsp;&nbsp;</span>' + spSynopsis + '</span>';
		txt += '</div>';
	txt += '</div>';
	$(poster).css('height','750px');
	$(poster).css('transition','background-color 250ms');
	$(poster).css('background-color','rgb(232, 232, 229)');
	$(elScorePanel).css({
		'padding' : '0'
	});
	$(elScorePanel).html(txt);
	var t = setTimeout(function(){
		// delay needed for DOM change to complete
		$('#hrt_score_panel').css('transition','opacity 250ms');
		$('#hrt_score_panel').css('opacity','1');
	},10);
}

function insert_rating_widget() {
	var txt = '';
	txt += '<div id="hrt_rating_widget">';
	txt += '<ul>';
		txt += '<li><a href="#" id="star_a_5"><span id="star_5">best</span></a></li>';
		txt += '<li><a href="#" id="star_a_4"><span id="star_4">good</span></a></li>';
		txt += '<li><a href="#" id="star_a_3"><span id="star_3">okay</span></a></li>';
		txt += '<li><a href="#" id="star_a_2"><span id="star_2">bad</span></a></li>';
		txt += '<li><a href="#" id="star_a_1"><span id="star_1">worst</span></a></li>';
		txt += '<li><a href="#" id="star_a_0"><span id="star_0">not rated</span></a></li>';
	txt += '</ul>';
	txt += '</div>';
	$('#hrt_rateit .hrt_score_panel_box').html(txt);
}










/////////////////////////   ////   ////   ////   ////   ////
//                     //   ////   ////   ////   ////   ////
//     BIND EVENTS     /////   ////   ////   ////   ////   ////
//     TO INSERTIONS    /////   ////   ////   ////   ////   ////
//                     //   ////   ////   ////   ////   ////
/////////////////////////   ////   ////   ////   ////   ////










function add_score_panel_events() {

	toolTipData[0] = new Object;
	toolTipData[0].target = '#hrt_your_critics .hrt_score_panel_title';
	toolTipData[0].html = '<strong>Your critics:</strong> more weight is given to the opinions of those critics who are similar to you, based on your ratings of the same films. Unweighted score: ' + spAllScore + '%';
	toolTipData[0].left = 0;
	toolTipData[0].top = 15;
	toolTipData[0].width = 110;

	toolTipData[1] = new Object;
	toolTipData[1].target = '#hrt_top_critics .hrt_score_panel_title';
	toolTipData[1].html = '<strong>Top critics</strong> are chosen by Rotten Tomatoes, and their opinions may or may not be similar to yours.';
	toolTipData[1].left = 0;
	toolTipData[1].top = 15;
	toolTipData[1].width = 110;

	toolTipData[2] = new Object;
	toolTipData[2].target = '#hrt_audiences .hrt_score_panel_title';
	toolTipData[2].html = '<strong>Audiences</strong> are visitors to Rotten Tomatoes who have rated or reviewed this film.';
	toolTipData[2].left = 0;
	toolTipData[2].top = 15;
	toolTipData[2].width = 110;

	toolTipData[3] = new Object;
	toolTipData[3].target = '#hrt_rateit .hrt_score_panel_title';
	toolTipData[3].html = '<strong>Rate this film</strong> to improve the accuracy of the \'Your Critics\' meter &amp ranking.';
	toolTipData[3].left = 0;
	toolTipData[3].top = 15;
	toolTipData[3].width = 110;

	toolTipData[4] = new Object;
	toolTipData[4].target = '.hrt_histogram';
	toolTipData[4].html = 'Shows the distribution of critics\' ratings, from 1-start to 5-star.  Each column shows the percentage of critics who gave that rating.';
	toolTipData[4].left = 0;
	toolTipData[4].top = 55;
	toolTipData[4].width = 110;

	toolTipData[5] = new Object;
	toolTipData[5].target = '.hrt_score_panel_box .hrt_fresh';
	toolTipData[5].html = '<strong>Fresh:</strong> most critics think this film is \'okay\' or better.';
	toolTipData[5].left = 5;
	toolTipData[5].top = 20;
	toolTipData[5].width = 110;

	toolTipData[6] = new Object;
	toolTipData[6].target = '.hrt_score_panel_box .hrt_rotten';
	toolTipData[6].html = '<strong>Rotten:</strong> few critics think this film is \'okay\' or better.';
	toolTipData[6].left = 5;
	toolTipData[6].top = 20;
	toolTipData[6].width = 110;

	toolTipData[7] = new Object;
	toolTipData[7].target = '.hrt_score_panel_box .hrt_middling';
	toolTipData[7].html = '<strong>Passable:</strong> while most critics think this film is at least \'okay\', very few think it is \'great\'.';
	toolTipData[7].left = 6;
	toolTipData[7].top = 20;
	toolTipData[7].width = 110;

	toolTipData[8] = new Object;
	toolTipData[8].target = '.hrt_score_panel_box .hrt_controversial';
	toolTipData[8].html = '<strong>Dividing:</strong> despite the % score, most critics have a strong opinion and disagree with each other.';
	toolTipData[8].left = 6;
	toolTipData[8].top = 20;
	toolTipData[8].width = 110;

	toolTipData[9] = new Object;
	toolTipData[9].target = '.hrt_score_panel_box .hrt_amazing';
	toolTipData[9].html = '<strong>Amazing:</strong> an exceptionally high percentage of critics think this film is great.';
	toolTipData[9].left = 6;
	toolTipData[9].top = 20;
	toolTipData[9].width = 110;

	toolTipData[10] = new Object;
	toolTipData[10].target = '.hrt_score_panel_box .hrt_popular';
	toolTipData[10].html = '<strong>Popular:</strong> at least 60% of RT voters think this film is \'okay\' or better.';
	toolTipData[10].left = 6;
	toolTipData[10].top = 20;
	toolTipData[10].width = 110;

	toolTipData[11] = new Object;
	toolTipData[11].target = '.hrt_score_panel_box .hrt_unpopular';
	toolTipData[11].html = '<strong>Unpopular:</strong> less than 60% of RT voters think this film is \'okay\' or better.';
	toolTipData[11].left = 6;
	toolTipData[11].top = 20;
	toolTipData[11].width = 110;

	toolTipData[12] = new Object;
	toolTipData[12].target = '.hrt_score_panel_box .hrt_wanttosee';
	toolTipData[12].html = '<strong>Want to see:</strong> the percentage of RT voters who say they want to see this film.';
	toolTipData[12].left = 6;
	toolTipData[12].top = 20;
	toolTipData[12].width = 110;

	toolTipData[13] = new Object;
	toolTipData[13].target = '#hrt_critics_widget';
	toolTipData[13].html = 'A critic\'s ranking is based on the number of films you\'ve both rated, and how the critic\'s your ratings of those films are to your ratings. Click on the heart icon to favorite critics so that you can easily find their reviews of other films.';
	toolTipData[13].left = 170;
	toolTipData[13].top = -140;
	toolTipData[13].width = 160;

	for(var i=0,il=toolTipData.length; i<il; i++) {
		$(toolTipData[i].target).data('html',toolTipData[i].html);
		$(toolTipData[i].target).data('left',toolTipData[i].left);
		$(toolTipData[i].target).data('top',toolTipData[i].top);
		$(toolTipData[i].target).data('width',toolTipData[i].width);
		$(toolTipData[i].target).mouseenter(function(event) {
			$('#hrt_tooltip span').html($(this).data('html'));
			var el = $(this);
			var left = $(el).data('left');
			var top = $(el).data('top');
			var width = $(el).data('width');
			// we need to set this first because it changes the element's height
			$('#hrt_tooltip').css('width',width);
			$('#hrt_tooltip').css({
				'left'  : $(el).position().left - left,
				'top'   : $(el).position().top - top - $('#hrt_tooltip').height()
			});
			$('#hrt_tooltip').addClass('hrt_shown');
		});
		$(toolTipData[i].target).mouseleave(function(event) {
			$('#hrt_tooltip').removeClass('hrt_shown');
		});
	}

}

function add_critics_widget_events() {
	$('#hrt_critics_rows').scroll(function(event) {
		// this allows the entire page to be scrolled
		// if the mouse is over the reviews area
		// by forcing the user to scroll twice
		if(!hasScrolledReviews) {
			$('#hrt_critics_rows').css('overflow-y','hidden');
			hasScrolledReviews = true;
			var t = setTimeout(function() {
				$('#hrt_critics_rows').css('overflow-y','scroll');
			},500);
		}
	});
	$('#hrt_critics_rows').mouseleave(function(event) {
		hasScrolledReviews = false;
	});

	$('#hrt_critics_filter').click(function(event) {
		apply_critic_filter();
		return false;
	});

	$('.hrt_critic_heart').click(function(event) {
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

		// send data to the eventPage for gA
		messagePort.postMessage({favorited: id});

		return false;
	});

	$('#hrt_noratings_import').click(function(event) {
		firstRun = 'firstRun';
		messagePort.postMessage({ firstRun: [firstRun,null] });
		firstRun_check(false);
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
			update_tomatometer();
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
		var rtStars = $(rtWidget)[0].style.width;
		var num = Math.round(parseInt(rtStars)/20);
		var simulated = false;
		var classList = $(this).attr('class').split(/\s+/);
		$.each(classList, function(index, item) {
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
			update_tomatometer();
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
	var observer = new MutationObserver(function(mutations, observer) {
		if($(starWidgetRT)[0] instanceof Node) {
			var rtWidget = $(starWidgetRT);
			var rtStars = $(rtWidget)[0].style.width;
			var num = Math.round(parseInt(rtStars)/20);
			if(num>0 && num != ratingsArray[pageFilmIndex][1]) {
				// RT rating exists and doesn't match local rating
				// override local
				rating_widget_events_save(num);
				rating_widget_events_update(num);
				criticsArray_update();
				update_critics_widget();
				update_tomatometer();
				save_to_storage();
			} else {
				if(ratingsArray[pageFilmIndex][1]>0) {
					// RT rating doesn't exist but local rating does
					// so update RT widget
					simulate_rt_widget_click(num);
				}
			}
			observer.disconnect();
		}
	});
	var observationTarget = $(ratingWidgetTarget)[0];
	observer.observe(observationTarget, {
		childList: true,
		subtree: true
	});
}

function rating_widget_events_update(star) {
	if('#user_rating') {
		$('#user_rating').remove();
	}
	if(star>0) {
		$('#star_' + star).after('<i id="user_rating"></i>');
		$('#hrt_rateit .hrt_score_panel_title').html('Your rating:');
	} else {
		$('#hrt_rateit .hrt_score_panel_title').html('Rate this movie:');
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
	var str = (star*20).toString();
	str += '%';
	$(rtWidget).css('width','str');
	// find rt widget position accounting for scroll
	var clientX = rtWidget[0].getBoundingClientRect().left;
	clientX += ((star*26)-8);
	// simulate click on RT's star rating tool
	var event = new MouseEvent('click', {
		'view': window,
		'bubbles': true,
		'cancelable': true,
    	'clientX': clientX,
		'clientY': 263,
		'button': 0,
		'relatedTarget': null
	});
	rtWidget[0].dispatchEvent(event);
}

function add_extras_events() {
	// overlay box with extras
	$('#hrt_aboutLink, .has_tip').click(function(event) {
		show_about_modal();
		return false;
	});
}

function show_about_modal() {
	// send data to the eventPage for gA
	messagePort.postMessage({aboutModal: 'opened'});
	$('BODY').append($('<div>',{ id: 'hrt_modalClickZone' }));
	$('BODY').append($('<div>',{ id: 'hrt_modal' }));
	$('#hrt_modal').append($('<div>', { id: 'hrt_modalInner', style: 'height: 80vh' }));
	$('#hrt_modalInner').append($('<strong>', { text: 'Thanks for Using Heirloom Rotten Tomatoes - Version ' + appVersion + '!', style: 'text-align:center; padding-bottom:10px;' }));
	$('#hrt_modalInner').append($('<span>', { text: 'To report an problem or to make a nice comment, tweet ' }));
	$('#hrt_modalInner').find('span:last').append($('<a>', { href: 'https://twitter.com/messages/compose?recipient_id=3084491', target: '_blank', text: '@mattthew' }));
	$('#hrt_modalInner').append($('<strong>', { text: 'Your reviews keep this project alive!' }));
	$('#hrt_modalInner').append($('<span>', { text: 'This free app is an open-source, fan supported, labor of love. To show your support, please ' }));
	$('#hrt_modalInner').find('span:last').append($('<a>', { href: 'https://chrome.google.com/webstore/detail/heirloom-rotten-tomatoes/ckmbpodfggiamhcmpilepdccpdnpfofd/reviews', target: '_blank', text: 'add a review' }));
	$('#hrt_modalInner').find('span:last').append('. Thanks! ');
	$('#hrt_modalInner').find('span:last').append(' Neither this browser app nor it\'s developer are affiliated with or supported by Rotten Tomatoes in any way.');
	$('#hrt_modalInner').append($('<strong>', { text: 'Import ratings from your account:' }));
	$('#hrt_modalInner').append($('<span>', { text: 'If you\'ve rated any movies on Rotten Tomatoes before installing this app, ' }));
	$('#hrt_modalInner').find('span:last').append($('<a>', { href: '#', text: 'import your ratings now', id: 'hrt_import_ratings' }));
	$('#hrt_modalInner').find('span:last').append(' to improve the accuracy of the app.');
	$('#hrt_modalInner').append($('<strong>', { text: 'Information this app collects:' }));
	$('#hrt_modalInner').append($('<span>', { text: 'This app only saves ratings data to your computer. Your movie ratings are 100% private to your computer and never transmitted. The app never accesses nor stores any login info.  The app never transmits personally identifiable information about the pages that you visit.  The app does use a Google Analytics cookie to send anonymous aggregated information to the developer.  This anonymous information includes:  how often the app is used and installed, movies with interesting Tomatometer scores, critics who have high similarity to many app users.' }));
	$('#hrt_modalInner').append($('<div>', { id: 'hrt_rated_movies' }));
	$('#hrt_modalInner').append($('<strong>'));
	$('#hrt_modalInner').append($('<strong>', { text: 'Experimental features:' }));
	$('#hrt_modalInner').append($('<a>', { href: '#', text: 'export list of critics with their similarity to you', id: 'export_critics' }));
	$('#hrt_modalInner').append($('<strong>'));
	$('#hrt_modalInner').append($('<a>', { href: '#', text: 'export raw data file', id: 'export_raw' }));
	$('#hrt_modalInner').append($('<strong>'));
	$('#hrt_modalInner').append($('<input>', { type: 'file', id: 'hrt_import_raw' }));
	$('#hrt_modalInner').append($('<output>', { id: 'list_ratings' }));
	$('#hrt_modalInner').append($('<input>', { type: 'button', id: 'hrt_fake_import', name: 'fake_import', value: 'import raw data file' }));
	$('#hrt_modalInner').append($('<strong>'));
	$('#hrt_modalInner').append($('<span>', { text: 'Export a comparison of every critic with every other critic, given the movies you\'ve rated so far. The report only contains critic-pairs who have rated at least 10 movies in common, so you need to have rate many movies to get useful results. WARNING:  This may generate a very large file and Chrome will hang for one or more minutes. ' }));
	$('#hrt_modalInner').find('span:last').append($('<a>', { href: '#', text: 'Try experimental report.', id: 'extras_events_compareAll' }));
	$('#hrt_modalInner').append($('<strong>'));
	$('#hrt_modalInner').append($('<span>', { text: 'Export a histogram of ratings for each critic, based on the movies you\'ve rated so far.  For each critic, this lists the count of their ratings in each of the five star levels.' }));
	$('#hrt_modalInner').find('span:last').append($('<a>', { href: '#', text: 'Try experimental report.', id: 'extras_events_histograms' }));
	$('#hrt_modalInner').append($('<strong>'));
	$('#hrt_modalInner').find('strong:last').append($('<a>', { href: '#', text: 'erase your data', id: 'hrt_erase', style: 'color:red;' }));

	// insert summary and list of the user's ratings
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
	list += '<span style="margin-bottom:0px;">Your &#11089; Rating, (Average Critic Rating), Movie Title</span>'
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
			var average = 0;
			var total = 0;
			for(var j=2, jl=tempArray[0].length; j<jl; j++) {
				if(tempArray[i][j]>0) {
					average += tempArray[i][j];
					total++;
				}
			}
			if(total>0) {
				average = average/total
			} else {
				average = 0;
			}
			average = Math.round(average*10)/10;
			var avT = average + '';
			if(avT.indexOf('.')<0) { avT += '.0'; }
			list += '<span style="margin-bottom:0px;">' + tempArray[i][1] + ',&nbsp;(' + avT + '),&nbsp;';
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
	var variation = Math.round(((0.4472-stdev)/0.45)*100);
	table += '<span>';
	table += '&#11089;&#11089;&#11089;&#11089;&#11089;:&nbsp;&nbsp;' + count5 + '<br>';
	table += '&#11089;&#11089;&#11089;&#11089;:&nbsp;&nbsp;' + count4 + '<br>';
	table += '&#11089;&#11089;&#11089;:&nbsp;&nbsp;' + count3 + '<br>';
	table += '&#11089;&#11089;:&nbsp;&nbsp;' + count2 + '<br>';
	table += '&#11089;:&nbsp;&nbsp;' + count1 + '<br>';
	table += 'Your positivity:&nbsp;' + positivity + '%&nbsp;&nbsp;<i>(most critics score 60-80%)</i><br>';
	table += 'Your variation:&nbsp;' + variation + '%&nbsp;&nbsp;<i>(most critics score 50-70%)</i><br>';
	table += '</span>';
	table += '<span>If you rated every movie as five stars, your ratings positivity would be 100% and your ratings variation would be 0%.  If you rated every movie as one star, positivity would be 0% and variation 0%.  If each of the star categories above had the same count of movies, your rating variation would be 100%.</span>';
	$('#hrt_rated_movies').prepend(table);
	$('#hrt_rated_movies').prepend('<strong>You\'ve rated ' + countTotal + ' movies:</strong>');
	$('#hrt_modalInner').append($('<span>', { text: '' }));
	$('#hrt_modalInner').append($('<span>', { text: '' }));

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
		messagePort.postMessage({ firstRun: [firstRun,null] });
		firstRun_check(false);
		return false;
	});

	$('#hrt_import_raw').change(function(event) {
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
			tempStr = tempStr.replace(/,/g,''); // comma in critic name would screw up the csv file
			theData += '"' + tempStr + '",' + criticsArray[x][7] + ',' + criticsArray[x][6] + ',' + criticsArray[x][8] + '\n';
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
	var yearText = $(elPageFilmName).find('span').text();
	yearText = yearText.replace(/\s+/g,'');
	var el = $(elPageFilmName).clone();
	$(el).find('span').remove();
	pageFilmName = $(el).text() + ' ' + yearText;
	pageFilmName = pageFilmName.replace(/\s+/g,' ');
	pageFilmName = pageFilmName.replace(/^\s/g,'');
	pageFilmPath = location.pathname;
	if(pageFilmPath.charAt(pageFilmPath.length-1)!='/') {
		// coud happen if someone manually enters url
		pageFilmPath = pageFilmPath + '/';
	}
	for(var i=1, il=ratingsArray.length; i<il; i++) {
		// search for this film in the array
		if(ratingsArray[i][0][1] == pageFilmPath) {
			pageFilmIndex = i;
			break;
		}
	}
	if(pageFilmIndex < 1) {
		// film not found so add new row to the array
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
				var el = $('<div>').html(response);
				el = $(el).find(elReviewsListRow);
				// for each critic on this page
				if($(el).length>0) {
					for(var y=0, yl=$(el).length; y<yl; y++) {
						var criticRow = $(el).eq(y);
						var criticName = '(unknown)';
						var criticPath = '';
						var criticIsTop = false;
						var reviewBlurb = '';
						var reviewPath = '';
						if($(criticRow).find(elCriticName).length>0) {
							criticName = $(criticRow).find(elCriticName).text();
							criticPath = $(criticRow).find(elCriticName).attr('href');
							if($(criticRow).find(elCriticIsTop).length>0) {
								if($(criticRow).find(elCriticIsTop).html().indexOf('Top Critic')>0) {
									criticIsTop = true;
								}
							}
							if(criticPath.indexOf('/critic/')<0 && $(criticRow).find(elCriticPub).length>0) {
					 			// this review comes from a publication rather than a critic (usually 20th century movie)
					 			criticName = $(elCriticPub).text();
					 			criticPath = $(elCriticPub).parent().attr('href');
							}
						}
						if($(criticRow).find(elReviewBlurb).length>0) {
							reviewBlurb = $(criticRow).find(elReviewBlurb).eq(0).text();
						}
						if($(criticRow).find(elReviewPath).length>0) {
							reviewPath = $(criticRow).find(elReviewPath).eq(0).attr('href');
						} else {
							reviewPath = criticPath;
						}
						var criticRating = covertRatingToFiveStars($(criticRow));

						// adding data to criticsArray
						var num = criticsArray.length;
						criticsArray[num] = [];
						criticsArray[num][0] = criticName;
						criticsArray[num][1] = criticPath;
						criticsArray[num][2] = criticIsTop;
						criticsArray[num][3] = criticRating;
						criticsArray[num][4] = reviewPath;
						criticsArray[num][5] = reviewBlurb;

						// search for this critic in the ratingsArray
						var criticColumn = ratingsArray[0].length;
						for(var j=2, jl=ratingsArray[0].length; j<jl; j++) {
							// cycling through ratingsArray to find matching critic
							// in past HRT versions, '/critic/' was stripped from the path
							if(ratingsArray[0][j][1].indexOf(criticPath)>-1) {
								criticColumn = j;
								break;
							}
						}

						if(criticColumn == ratingsArray[0].length) {
							// add empty column if needed
							ratingsArray[0][criticColumn] = [];
							for(var i=1, il=ratingsArray.length; i<il; i++) {
								// for each film row add new cell to end
								ratingsArray[i][criticColumn] = 0;
							}
						}

						// note we are always overwriting data for this critic
						// in case their isTop status changes
						ratingsArray[0][criticColumn][0] = criticName;
						ratingsArray[0][criticColumn][1] = criticPath;
						ratingsArray[0][criticColumn][2] = criticIsTop;
						ratingsArray[0][criticColumn][3] = 0; // legacy
						// add or overwrite critic rating's for this film
						ratingsArray[index][criticColumn] = criticRating;
					}
				}
				if(pagesScraped < totalPages) {
					pagesScraped++;
				}
				frRatingsImported++;
				frPercent = Math.round((frRatingsImported/frRatingsCount)*100);
				frStatusTitle = path.substring(3,path.length-1);
				frStatusTitle = frStatusTitle.replace(/_/g,' ');
			}).fail(function(xhr, ajaxOptions, thrownError){
				scrapeErrors += 'reviews page ' + pagesScraped + ': ' + xhr.status + ' (' + thrownError + ')';
				if(pagesScraped < totalPages) {
					pagesScraped++;
				}
			})
		);
	};
}

function criticsArray_add_existing() {
	// at this point criticsArray only contains critic who rated this film
	// now add the critics who didn't rate this film
	for(j=2,jl=ratingsArray[0].length; j<jl; j++) {
		var match = false;
		for(y=0,yl=criticsArray.length; y<yl; y++) {
			// if critic path matches
			if(ratingsArray[0][j][1].indexOf(criticsArray[y][1])>-1) {
				match = true;
				break;
			}
		}
		if(!match) {
			var num = criticsArray.length;
			criticsArray[num] = [];
			criticsArray[num][0] = ratingsArray[0][j][0]; // critic name
			criticsArray[num][1] = ratingsArray[0][j][1]; // critic path
			criticsArray[num][2] = ratingsArray[0][j][2]; // top critic flag
			criticsArray[num][3] = 0; // no rating exists
			criticsArray[num][4] = ''; // no review path exists
			criticsArray[num][5] = ''; // no review blurb exists
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
			// if critic path matches
			if(ratingsArray[0][j][1].indexOf(criticsArray[y][1])>-1) {
				criticsArray[y][6] = count;
				if(count>0) {
					criticsArray[y][7] = total/count;
				} else {
					// critic has no films in common with user
					// so asign the average similarity
					criticsArray[y][7] = .64;
				}
			}
		}
	}
	// get average similarity score and count across all critics
	var avgScore = 0;
	var avgCount = 0;
	for(y=0,yl=criticsArray.length; y<yl; y++) {
		avgCount += Math.pow(criticsArray[y][6],3); // see below
		avgScore += criticsArray[y][7];
	}
	avgCount = avgCount/criticsArray.length;
	avgScore = avgScore/criticsArray.length;
	// calculate sort score using modified bayesian formula
	for(y=0,yl=criticsArray.length; y<yl; y++) {
		var count = Math.pow(criticsArray[y][6],3);
		var score = criticsArray[y][7];
		// [8] = baysian sort score
		// using power of 3 causes low count critics to score worse
		// the original bayes formula I modified:
		// http://www.andymoore.ca/2010/02/bayesian-ratings-your-salvation-for-user-generated-content
		var baysianCountScore = ( (avgCount * avgScore) + (count * score) ) / (avgCount + count);
		if(Number.isNaN(baysianCountScore)) {
			// when user has no ratings in common with any critics (e.g. on install)
			baysianCountScore = 1;
		}
		criticsArray[y][8] = baysianCountScore;
		// reduce the score of critics with low count of similar films
		if(Math.pow(count,3)<avgCount) {
			criticsArray[y][8] = criticsArray[y][8]/10;
		}
	}
	// now sort criticsArray decending based on baysian score
	criticsArray.sort(function(a, b) {
		var aSort = a[8];
		var bSort = b[8];
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
		// strip badly formatted ratings
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










function firstRun_check(doWait) {
	firstRun += ' ';
	if(firstRun.indexOf('firstRun')>-1) {
		if($(userRatingsLink)[0] instanceof Node) {
			// user is logged in
			firstRun_afterLogin();
		} else {
			if(doWait) {
	 			// RT doesn't pull in user login status
				// until well after the page loads,
				// so we have to listen for it
				var observer2 = new MutationObserver(function(mutations, observer) {
					if($(userRatingsLink)[0] instanceof Node) {
						firstRun_afterLogin();
						clearTimeout(loginTimer);
						observer2.disconnect();
					}
				});
				var observationTarget = $(userLoginArea)[0];
				observer2.observe(observationTarget, {
					childList: true,
					subtree: true
				});
				// wait a bit to see if the mutation occurs, then give up
				loginTimer = setTimeout(function(){
					$('#hrt_modal').remove();
					firstRun_showModal('requestLogin');
					observer2.disconnect();
				},10000);
			} else {
				// assume logged out and don't wait for confirmation
				firstRun_showModal('requestLogin');
			}
		}
	}
}

function firstRun_afterLogin() {
	userIDRT = $(userRatingsLink).eq(0).attr('href');
	if(typeof userIDRT == 'undefined') { userIDRT = ''; }
	userIDRT = userIDRT.substring(userIDRT.indexOf('id/')+3,userIDRT.length);
	userIDRT = userIDRT.substring(0,userIDRT.indexOf('/ratings'));
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
	}).fail(function(xhr, ajaxOptions, thrownError){
		firstRun_selectModal(hasRatings,ratingsArePublic);
	});
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
	var txt = $(userRatingsLink + ' .count').html();
	if(parseInt(txt)>1) {
		hasRatings = true;
	}
	return hasRatings;
}

function appUdate_showModal(previousVersion) {
	if(previousVersion.substring(0,1) != '3') {
		// message for upgrade to version 3.x
		$('BODY').append($('<div>',{ id: 'hrt_modalClickZone' }));
		$('BODY').append($('<div>',{ id: 'hrt_modal', class: 'app_update_modal_v3' }));
		$('#hrt_modal').append($('<div>', { id: 'hrt_modalInner' }));
		$('#hrt_modalInner').append($('<strong>', { text: 'You\'ve upgraded to version 3 of Heirloom Rotten Tomatoes!', style: 'text-align:center; padding-bottom:10px;' }));
		var html = '';
		html += '<strong>What\'s new:</strong>';
		html += '<ul>';
			html += '<li>New and improved layout & design.</li>';
			html += '<li>Find the movie\'s synopsis next to the TomatoMeter.</li>';
			html += '<li>Three extra TomatoMeter icons:</li>';
		html += '</ul>';
		html += '<span class="icon_info"><div class="hrt_icon"><div class="hrt_middling"></div></div>';
		html += '<div class="hrt_icon_caption"><b>Passable:&nbsp;&nbsp;</b>A movie that has earned a "tomato" even though most critics think it\'s only "okay" rather than "good" or "great".</div></span>'
		html += '<span class="icon_info"><div class="hrt_icon"><div class="hrt_controversial"></div></div>';
		html += '<div class="hrt_icon_caption"><b>Dividing:&nbsp;&nbsp;</b>A movie that many critics this is good but just as many think is bad.  Which side of the fence are you on?</div></span>'
		html += '<span class="icon_info"><div class="hrt_icon"><div class="hrt_amazing"></div></div>';
		html += '<div class="hrt_icon_caption"><b>Amazing:&nbsp;&nbsp;</b>A movie that an exceptionally high percentage of critics think is great. A higher standard than "certified".</div></span>'
		$('#hrt_modalInner').append(html);
		$('#hrt_modalInner').append($('<a>', { href: '#', text: 'Got it!', id: 'firstRun_button_close', class: 'button' }));

		// binding events
		$('#firstRun_button_close').click(function(event) {
			$('#hrt_modal').remove();
			$('#hrt_modalClickZone').remove();
			return false;
		});

	}
}

function firstRun_showModal(modalType) {
	$('BODY').append($('<div>',{ id: 'hrt_modalClickZone' }));
	$('BODY').append($('<div>',{ id: 'hrt_modal' }));
	$('#hrt_modal').append($('<div>', { id: 'hrt_modalInner' }));
	$('#hrt_modalInner').append($('<strong>', { text: 'Thanks for Using Heirloom Rotten Tomatoes!', style: 'text-align:center; padding-bottom:10px;' }));
	var firstRunSubheader = '';
	var firstRunIntro = '';
	if(ratingsArray.length > 1) {
		// existing app user
		firstRunSubheader = 'This is version '+ appVersion;
		firstRunIntro = 'You can import all the ratings from your Rotten Tomatoes account. If you rated some movies before installing this app, importing those ratings will make the app more accurate.  This process may take up to a few minutes depending on your connection speed and number of ratings.  You can pause and resume at any time.';
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

		$('#hrt_modalInner').append($('<div>', { id: 'hrt_firstRun_statusTitle' }));

		$('#hrt_modalInner').append($('<div>', { id: 'hrt_firstRun_statusBarHolder' }));

		$('#hrt_firstRun_statusBarHolder').append($('<div>', { id: 'hrt_firstRun_statusBar' }));

		$('#hrt_modalInner').append($('<a>', { href: '#', text: 'Stop Importing', id: 'firstRun_button_stopImport', class: 'button' }));

		var frTimer = setInterval(function() {
			$('#firstRun_importMessage').html(frImportMessage);
			var width = frPercent + '%';
			$('#hrt_firstRun_statusBar').css('width', width);
			$('#hrt_firstRun_statusTitle').html(frStatusTitle);
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
	firstRun_assignEvents();
}

function firstRun_assignEvents() {
	// buttons may or may not exist

	$('#firstRun_button_dismissFirstRun').click(function(event) {
		$('#hrt_modal').remove();
		$('#hrt_modalClickZone').remove();

		firstRun = 'dismiss';
		storage.set({'firstRun': firstRun}, function() {
			messagePort.postMessage({ firstRun: [firstRun,null] });
		});
		return false;

	});

	$('#firstRun_button_signIn').click(function(event) {
		$('#hrt_modal').remove();
		$('#hrt_modalClickZone').remove();
		// simulate click
		var el = $(loginLinkRT);
		var eventObj = document.createEvent('MouseEvents');
		var event = new MouseEvent('click', {
			'view': window,
			'bubbles': true,
			'cancelable': true,
			'button': 0,
			'relatedTarget': null
		});
		el[0].dispatchEvent(event);
		firstRun_check(true);
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
		$('#hrt_privacyModal').attr('src','https://www.rottentomatoes.com/user/account/profile_preferences/');
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
		var event = new MouseEvent('click', {
			'view': window,
			'bubbles': true,
			'cancelable': true,
			'button': 0,
			'relatedTarget': null
		});
	submitButton[0].dispatchEvent(event);
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
		var el = $('<div>').html(response);
		el = $(el).find(elUserRatingRow);
		// get user's ratings
		for(x=0, xl=$(el).length; x<xl; x++) {
			var filmPath = $(el).eq(x).find(elUserRatingFilmLink).attr('href');
			if(!filmPath) { continue; }
			if(filmPath.indexOf('/m/')<0) { continue; } // is a film
			var filmName = $(el).eq(x).find(elUserRatingFilmLink).html();
			var stars = $(el).eq(x).find(elUserRatingStars).length;
			if($(el).eq(x).html().search(/\u00BD/)>-1) {
				// this app interprets 1/2 stars as full stars
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
	}).fail(function(xhr, ajaxOptions, thrownError){
		frImportMessage = xhr.status + ' (' + thrownError + ')';
		$('#hrt_modal').remove();
		$('#hrt_modalClickZone').remove();
		firstRun_showModal(error);
	});
}

function firstRun_scrape_critic_ratings() {
	frImportMessage = 'The app is now importing your ratings...';
	$('#hrt_firstRun_statusBarHolder').css('display','block');
	$('#hrt_firstRun_statusTitle').css('display','block');

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
				var el = $('<div>').html(response);
				var temp = $(el).find(criticsCount).find('a').eq(0).html();
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
			}).fail(function(xhr, ajaxOptions, thrownError){
				frImportMessage = xhr.status + ' (' + thrownError + ')';
				$('#hrt_modal').remove();
				$('#hrt_modalClickZone').remove();
				firstRun_showModal('error');
			})
		);
	}

	// concurrently execute the totalPages calls
	$.when.apply(null, frCallsTotalPages).done(function() {
		frImportMessage = 'Found your ratings for ' + frMoviesCount + ' movies previously unknown to this app.  Now importing every critics\'s rating of each movie.' ;
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
			firstRun = 'ratings found';
			storage.set({'firstRun': firstRun}, function() {
				messagePort.postMessage({ firstRun: [firstRun,frMoviesCount] });
			});

			if($(elScorePanel).length>0 && location.pathname.indexOf('/tv/')<0 && $(elPageFilmName).length>0) {
				// this is a movie listing
				criticsArray_update();
				update_critics_widget();
				update_tomatometer();
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










function fix_annoying_header() {
	$(elAnnoyingHeader1).css({
		'min-height' : 0,
		'paddding' : 0
	});
	$(elAnnoyingHeader2)[0].style.setProperty('margin-top', '0', 'important' );
}

function save_to_storage() {
	storage.set({'ratings': ratingsArray}, function() {
		messagePort.postMessage({ratingsData: ratingsArray});
	});
}

function show_update_status(totalPages) {
	updatingTimer = setInterval(function() {
		var txt = 'gathering ratings, step ' + pagesScraped + ' of ' + totalPages + '...';
		$('#hrt_updating').html(txt);
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
		$('#hrt_critics_filter').css('display','none');
		txt += '<div class="hrt_noratings">';
		txt += 'Thanks for installing the Heirloom Rotten Tomatoes app! This space is empty because you haven\'t used the app to rate any movies yet. To see reviews and critics of this movie ranked by similarity to you, rate any movie now or <a href="#" id="hrt_noratings_import">import your ratings</a> from your Rotten Tomatoes account. To rate a movie now, just search for the last movie that you saw, then click on a star in the "RATE THIS MOVIE" section above. <br><br>If you are not logged-in, Rotten Tomatoes will display a login pop-up.';
		txt += '</div>';
	} else if(totalUserRatings<2) {
		$('#hrt_critics_filter').css('display','none');
		txt += '<div class="hrt_noratings">';
		txt += 'Great! Now just rate just one more movie to see the list of critics ordered by their similarity to you. <br><br>For best results, start by rating movies that were released in the past five years.  Also, rate any movies that the critics hated but you loved (or visa versa).  <br><br>The more movies you rate, the more accurate the list and the TomatoMeter will become!';
		txt += '</div>';
	} else {
		$('#hrt_critics_title').css('display','block');
		$('#hrt_critics_filter').css('display','block');
		$('#hrt_critics_rows').addClass('hrt_cr_empty');
		$('#hrt_critics_rows').addClass('hrt_cr_filled');
		for(y=0,yl=criticsArray.length; y<yl; y++) {
			var critic = criticsArray[y];
			var rated = '';
			var tinyMeter = '';
			if(pageFilmIndex>0) { // film page
				if(critic[3] == 0) {
					rated = 'hrt_unrated';
				} else if(critic[3]>=3) {
					tinyMeter = 'hrt_fresh';
				} else if(critic[3]<3) {
					tinyMeter = 'hrt_rotten';
				}
			}
			var similarity = 'hrt_ful';
			if(critic[7] < 0.5) {
				similarity = 'hrt_non'
			} else if(critic[7]<0.6) {
				similarity = ' hrt_low'
			} else if(critic[7]<0.7) {
				similarity = 'hrt_med'
			}
			var blurb = '<i>(hasn\'t written a review for this movie)</i>';
			if(critic[5] != '') {
				blurb = critic[5];
			}

			var urlTxt = critic[0];
			urlTxt = urlTxt.replace(/\./g,'');
			urlTxt = urlTxt.replace(/ /g,'-');

			var isTopTxt = '';
			if (critic[2]) {
				isTopTxt = 'Top Critic';
			}

			txt += '<div class="hrt_row_wrapper ' + rated + '">';
				txt += '<div class="hrt_tiny_meter ' + tinyMeter + '" title="Rating"><span>' + critic[3].toFixed(1) + '</span></div>';
				txt += '<a target="_blank" href="' + critic[4] + '" title="Link to full review" class="hrt_review">' + blurb + '</a>';
				txt += '<a target="_blank" href="' + critic[1] + '" class="hrt_name ' + similarity + '" title="Link to critic\'s page on Rotten Tomatoes">';
					txt += '<div>' + critic[0] + '</div><div class="hrt_is_top">' + isTopTxt + '</div></a>';
				txt += '<a class="hrt_critic_heart" href="#" id="fav_' + urlTxt + '" title="Click to add this critic as a favorite"></a>';
				txt += '<div class="hrt_score" title="Your similarity level with this critic">' + Math.round(critic[7]*100) + '%</div>';
				txt += '<div class="hrt_count" title="Count of movies that both you and this critic have rated">(' + critic[6] + ')</div>';
			txt += '</div>';
		}
		// send data to the eventPage for gA
		messagePort.postMessage({criticsData: criticsArray});
	}
	$('#hrt_critics_rows').html(txt);

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

function update_tomatometer() {
	// update percent score of your critics section,
	// calculate histogram of star ratings (1-5), and update icons
	// for your critics & top critics sections
	var allCount = 0; // count of all critics' ratings
	var allCountFresh = 0; // count of all critic's fresh ratings
	var allFreshness = 0; // unweighted % of all critics who rated this fresh
	var allHist = [0,0,0,0,0];
	var allSumSort = 0; // sum of sort scores
	var allSumSortFresh = 0; // sum of sort scores for critics who rated fresh
	var allWeightedFreshness = 0; // weighted % of all critics who rated this fresh
	var allHistWeighted = [0,0,0,0,0];

	var topCount = 0; // count of top critics' ratings
	var topCountFresh = 0; // count of top critics' fresh ratings
	var topFreshness = 0; // unweighted % of top critics who rated this fresh
	var topHist = [0,0,0,0,0];
	var topSumSort = 0; // sum of top sort scores
	var topSumSortFresh = 0; // sum of top sort scores for critics who rated fresh
	var topWeightedFreshness = 0; // weighted % of top critics who rated this fresh
	var topHistWeighted = [0,0,0,0,0];

	// calculate histograms
	for(x=0,xl=criticsArray.length; x<xl; x++) {
		// cycling through critics
		if(criticsArray[x][3]>0) {
			// this critic rated this film
			var rating = criticsArray[x][3];
			var sortScore = criticsArray[x][8];
			// ratings are very heavily weighted based on their sort score
			if(sortScore>0) {
				sortScore = Math.pow(sortScore,10);
			} else {
				sortScore = Math.pow(sortScore,10) * -1;
			}

			if(criticsArray[x][2]) {
				// only top critics
				topCount += 1;
				topSumSort += sortScore;
				if(rating>=3) {
					// rated fresh
					topCountFresh += 1;
					topSumSortFresh += sortScore;
				}
				topHist[Math.round(rating-1)] += 1;
				topHistWeighted[Math.round(rating-1)] += sortScore;
			} else {
				// all critics
				allCount += 1;
				allSumSort += sortScore;
				if(rating>=3) {
					// rated fresh
					allCountFresh += 1;
					allSumSortFresh += sortScore;
				}
				allHist[Math.round(rating-1)] += 1;
				allHistWeighted[Math.round(rating-1)] += sortScore;
			}
		}
	}

	// calculate meter score
	if(allCount>0) {
		allFreshness = allCountFresh/allCount;
	} else {
		// use from RT
		allFreshness = spAllScore/100;
	}
	if(allSumSort>0) {
		allWeightedFreshness = allSumSortFresh/allSumSort;
	} else {
		// use from RT
		allWeightedFreshness = spAllScore/100;
	}
	if(topCount>0) {
		topFreshness = topCountFresh/topCount;
	} else {
		// use from RT
		topFreshness = spTopScore/100;
	}
	if(topSumSort>0) {
		topWeightedFreshness = topSumSortFresh/topSumSort;
	} else {
		// use from RT
		topWeightedFreshness = spTopScore/100;
	}

	// normalize histogram columns and update
	var maxAll = Math.max.apply(Math, allHist);
	var maxAllW = Math.max.apply(Math, allHistWeighted);
	var maxTop = Math.max.apply(Math, topHist);
	var maxTopW = Math.max.apply(Math, topHistWeighted);
	for(x=0,xl=allHist.length; x<xl; x++) {
		allHist[x] = (allHist[x]/maxAll)*100;
		allHistWeighted[x] = (allHistWeighted[x]/maxAllW)*100;
		topHist[x] = (topHist[x]/maxTop)*100;
		topHistWeighted[x] = (topHistWeighted[x]/maxTopW)*100;
	}

	// determine freshness icons
	var allScoreIcon = 'hrt_fresh';
	var topScoreIcon = 'hrt_fresh';
	// rotten
	// same way are RT calculates it
	if(allWeightedFreshness < .6) {
		allScoreIcon = 'hrt_rotten';
	}
	if(topFreshness < .6) {
		topScoreIcon = 'hrt_rotten';
	}
	// middling
	// close ratio of good and bad, but a high % of neutral compared to good+great
	// OR high ratio % of neutral compared to any other column
	if( ( allHistWeighted[1]/allHistWeighted[3] <= 1.25 && allHistWeighted[1]/allHistWeighted[3] >= 0.8 && allHistWeighted[2]/(allHistWeighted[3]+allHistWeighted[4]) > 0.7 ) ||
		( Math.max(allHistWeighted[0],allHistWeighted[1],allHistWeighted[3],allHistWeighted[4])/allHistWeighted[2] <= 0.5 ) ) {
		allScoreIcon = 'hrt_middling';
	}
	if( ( topHist[1]/topHist[3] <= 1.25 && topHist[1]/topHist[3] >= 0.8 && topHist[2]/(topHist[3]+topHist[4]) > 0.7 ) ||
		( Math.max(topHist[0],topHist[1],topHist[3],topHist[4])/topHist[2] <= 0.5 ) ) {
		topScoreIcon = 'hrt_middling';
	}
	// controversial
	// close ratio of good and bad, more good than neutral, and more bad than neutral
	if( allHistWeighted[1]/allHistWeighted[3] <= 1.25 && allHistWeighted[1]/allHistWeighted[3] >= 0.8 && allHistWeighted[3] >= allHistWeighted[2] && allHistWeighted[1] >= allHistWeighted[2] ) {
		allScoreIcon = 'hrt_controversial';
	}
	if( topHist[1]/topHist[3] <= 1.25 && topHist[1]/topHist[3] >= 0.8 && topHist[3] >= topHist[2] && topHist[1] >= topHist[2] ) {
		topScoreIcon = 'hrt_controversial';
	}
	// amazing
	// rated more good than bad, and have a high % of great compared to good
	if( allHistWeighted[1] <= allHistWeighted[3] && allHistWeighted[4]/allHistWeighted[3] >= 0.5 ) {
		allScoreIcon = 'hrt_amazing';
	}
	if( topHist[1] <= topHist[3] && topHist[4]/topHist[3] >= 0.5 ) {
		topScoreIcon = 'hrt_amazing';
	}

	// update DOM
	for(x=0,xl=allHist.length; x<xl; x++) {
		// display weighted ratings for all critics
		$('#hrt_your_critics .hrt_h' + x + ' div').css({
			'opacity' : 1,
			'height' : allHistWeighted[x] + '%',
			'top' : 100-allHistWeighted[x] + '%'
		});
		// display unweighted ratings for top critics
		// matches RT except when conversion to 5-star scale differs
		$('#hrt_top_critics .hrt_h' + x + ' div').css({
			'opacity' : 1,
			'height' : topHist[x] + '%',
			'top' : 100-topHist[x] + '%'
		});
	}
	$('.hrt_score_panel_meter div').css('transition','opacity 250ms');
	$('.hrt_score_panel_meter div').css('opacity','0');
	var txt = '';
	txt = Math.round((allWeightedFreshness)*100).toString();
	$('#hrt_your_critics .hrt_score_panel_meter div').eq(1).html(txt);
	txt = Math.round((topWeightedFreshness)*100).toString();
	//	$('#hrt_top_critics .hrt_score_panel_meter div').eq(1).html(txt);
	//	leaving top as original from RT
	$('.hrt_score_panel_meter').removeClass('hrt_fresh hrt_rotten hrt_middling hrt_controversial hrt_amazing');
	$('#hrt_your_critics .hrt_score_panel_meter').addClass(allScoreIcon);
	$('#hrt_top_critics .hrt_score_panel_meter').addClass(topScoreIcon);
	$('.hrt_score_panel_meter div').css('transition','opacity 250ms 250ms');
	$('.hrt_score_panel_meter div').css('opacity','1');
	$('#hrt_your_critics .hrt_score_panel_title').html('Your critics:');

	// send data to the eventPage for
	if( allHist[1]/allHist[3] <= 1.25 && allHist[1]/allHist[3] >= 0.8 && allHist[3] >= allHist[2] && allHist[1] >= allHist[2] ) {
		if(allHist[2]/allHist[1] <= 0.5 || allHist[2]/allHist[3] <= 0.5) {
			if(spAllCount >= 70 ) {
				// critics very divided
				messagePort.postMessage({ noteworthy: ['controversial',pageFilmName] });
			}
		}
	}
	if( spAllScore/spAudienceScore <= 0.33 || spAllScore/spAudienceScore >= 3 ) {
		if(spAllCount >= 70 ) {
			// critics and audiences disagree
			messagePort.postMessage({ noteworthy: ['critics vs audiences',pageFilmName] });
		}
	}
	if( allFreshness/topFreshness <= 0.5 || allFreshness/topFreshness >= 2 ) {
		if(spAllCount >= 70 ) {
			// regular and top critics disagree
			messagePort.postMessage({ noteworthy: ['all vs top critics',pageFilmName] });
		}
	}
}

function covertRatingToFiveStars(el) {
	// This is not meant to match how Rotten Tomatoes coverts ratings.
	// This is my opinion.  Conversion is subjective.
	var txt = '';
	var rating = 0;
	var elPath = $(el).find(elReviewPath);
	if($(elPath).length>0) {
		// link was found
		if($(elPath)[0].nextSibling) {
			// link and rating were found
			txt = $(elPath)[0].nextSibling.nodeValue;
		}
	}
	if(txt.indexOf('Score:')>-1) {
		// a rating was found
		txt = txt.substring(txt.indexOf('Score: ')+7,txt.length);
		txt = txt.replace(' minus','-'); // 'B minus' becomes 'B-'
		txt = txt.replace(' plus','-');
		txt = txt.replace(' out of ','/');
		txt = txt.replace(/\s+$/g,'');
		var fraction = txt.split('/');
		if(fraction.length==2) {
			// fraction rating
			var dividend = parseFloat(fraction[0]);
			var divisor = parseFloat(fraction[1]);
			if(divisor > 0) {
				if(dividend > divisor) {
					dividend = divisor;
				}
				// conversion of the fraction to a 5-star scale
				// is different for each initial star scale (divisor)
				var lowCompression = 0;
				var highCompression = 1;
				if(divisor == 2) {
					lowCompression = 0.14;
					highCompression = 0.99;
				} else if(divisor == 3) {
					lowCompression = -0.08;
					highCompression = 0.80;
				} else if(divisor == 4) {
					lowCompression = 0.06;
					highCompression = 0.99;
				}
				rating = ( ( ( (dividend/divisor) - lowCompression ) * highCompression ) * 5 )
			}
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
		// Sometimes there's no rating, so we go with the
		// value of the fresh/rotten icon.
		var theClass = $(el).find(elReviewIcon).attr('class');
		if(!theClass) {
			// no rating found, so this critic is ignored (rating=0)
		} else {
			if(theClass.indexOf('fresh') > -1) {
				rating = 4; // "fresh" = "good" not "best"
			} else {
				rating = 2; // "rotten" = "bad" not "worst"
			}
		}
	}
	return rating;
}

function apply_critic_filter() {
	var now = $('#hrt_critics_filter').html();
	if(now.indexOf('show')>-1) {
		$('#hrt_critics_filter').html('hide extra critics');
		$('#hrt_critics_rows').find('.hrt_unrated').toggleClass('hrt_shown');
		$('#hrt_critics_rows').find('.hrt_shown').toggleClass('hrt_unrated');
	} else {
		$('#hrt_critics_filter').html('show every critic');
		$('#hrt_critics_rows').find('.hrt_shown').toggleClass('hrt_unrated');
		$('#hrt_critics_rows').find('.hrt_unrated').toggleClass('hrt_shown');
	}
	shade_critic_rows();
}

function shade_critic_rows() {
	var num = 0;
	$('.hrt_row_wrapper').each( function(x, el) {
		if($(el).hasClass('hrt_odd')) {
			$(el).toggleClass('hrt_odd');
		}
		if($(el).hasClass('hrt_unrated')) {
			num++;
		}
		if(num%2 == 0) {
			$(el).toggleClass('hrt_odd');
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
				var event = new MouseEvent('click', {
					'view': window,
					'bubbles': true,
					'cancelable': true,
					'button': 0,
					'relatedTarget': null
				});
				el.dispatchEvent(event);
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









