/////////////////////////
//                     //
//       GLOBAL        //
//      VARIABLES      //
//                     //
/////////////////////////

var storage = chrome.storage.local;
var epRatingsArray = new Array();
var dataReady = false;
var sessionLogged = false;
// when storage methods change, this variable
// allows some older versions to be detected and fixed
var dataVersion = 5; 
var appVersion = chrome.runtime.getManifest().version;








/////////////////////////
//                     //
//        ACTION       //
//                     //
/////////////////////////

// insert Google Analytics
var _gaq = _gaq || [];
_gaq.push(['_setAccount', 'UA-56019471-1']);
_gaq.push(['_trackPageview']);

(function() {
  var ga = document.createElement('script'); ga.type = 'text/javascript'; ga.async = true;
  ga.src = 'https://ssl.google-analytics.com/ga.js';
  var s = document.getElementsByTagName('script')[0]; s.parentNode.insertBefore(ga, s);
})();

// push data version to analytics
_gaq.push(['_trackEvent', 'app data', 'installed version', appVersion]);
console.log('app version: ' + appVersion);


// getting storage from the persistent eventPage 
// so that it only needs to be retreived once per session
// note:  storage call is asychronous
storage.get('ratings', function(items) {
	console.log('storage loaded');
	epRatingsArray_create(items.ratings);
	dataReady = true;
});


// open a message port
var messagePort = chrome.runtime.connect({name: 'readiness'});
chrome.runtime.onConnect.addListener(function(messagePort) {
	console.assert(messagePort.name == 'readiness');
	messagePort.onMessage.addListener(function(msg) {
		// listen for readiness message from the content script
		// and deliver data when message received
		if (msg.status == 'ready' && dataReady) {
			messagePort.postMessage({data: epRatingsArray});
			console.log('epRatingsArray sent to content script');
		}
		// push name and rank of top 10 critics to gAnalytics 
		// (10 because trackEvent throttles to 1/sec. after 10 pushes)
		if(msg.data && !sessionLogged) {
			sessionLogged = true;
			var critics = msg.data;
			for(var x=0, xl=critics.length; (x<xl) && (x<10); x++) {
				var cName = critics[x][0];
				var cRank = Math.round(critics[x][6]*10000);
				_gaq.push(['_trackEvent', 'critics', 'rank', cName, cRank]);
			}
		}
	});
});








/////////////////////////
//                     //
//    RATINGS DATA     //
// RETRIEVAL FUNCTIONS //
//                     //
/////////////////////////

function epRatingsArray_create(storageData) {
	// check validity of storageData (storage.items.ratings)
	var validData = false;
	if(storageData) { // data exists
		if(storageData.length>0) { // it's an array
			if(storageData[0].length>0) { // we a "column"
				if(storageData[0][0].length>0) { // 1st cell has an array
					if(storageData[0][0][0]) { // that array has data
						epRatingsArray = storageData;
						validData = true;
					}
				}
			}
		}
	}
	if(validData) {
		epRatingsArray_fix_legacy();
	} else {
		// no valid data, so construct fresh Array
		epRatingsArray = new Array();
		// header row
		epRatingsArray[0] = new Array();
			// header "column"
			epRatingsArray[0][0] = new Array();
				epRatingsArray[0][0][0] = dataVersion; 
			// first critic column (user)
			epRatingsArray[0][1] = new Array();
				epRatingsArray[0][1][0] = 'you'; // critic name
				epRatingsArray[0][1][1] = 'n/a'; // critic path
				epRatingsArray[0][1][2] = 0; // legacy
				epRatingsArray[0][1][3] = 0; // legacy
	}
}

function epRatingsArray_fix_legacy() {
	var wasLegacy = false;
	if(epRatingsArray[0][0][0] < 4) { 
		// fix really old buggy versions
		for(var i=0, il=epRatingsArray.length; i<il; i++) { // 
			// check for fouled up rows
			if(epRatingsArray[i]) {
				for(var j=0, jl=epRatingsArray[i].length; j<jl; j++) {
					// check for foulded up "cells"
					if(epRatingsArray[i][j]) {
					} else {
						epRatingsArray[i][j] = new Array();	
					}
				}
			} else {
				epRatingsArray.splice(i,1);
				i-=1;
			}
		}
		for(var j=2, jl=epRatingsArray[0].length; j<jl; j++) {
			// check for fouled up columns
			if(epRatingsArray[0][j]) {
				var criticName = epRatingsArray[0][j][0];
				if(!criticName || criticName=='' || criticName==0) {
					// delete column
					for(var i=0, il=epRatingsArray.length; i<il; i++) {
						epRatingsArray[i].splice(j,1);
					}
				}
			} else {
				// delete column
				for(var i=0, il=epRatingsArray.length; i<il; i++) {
					epRatingsArray[i].splice(j,1);
				}			
			}
		}
		// an older version incorrectly calculated comparison score
		if(epRatingsArray[0][1][2] > 0) {
			for(var j=1, jl=epRatingsArray[0].length; j<jl; j++) {
				epRatingsArray[0][j][2] = 0;
				epRatingsArray[0][j][3] = 0;
				for(var i=1, il=epRatingsArray.length; i<il; i++) {
					epRatingsArray[i][j][1] = 0;
				}
			}
		}
		wasLegacy = true;
	}
	if(epRatingsArray[0][0][0] < 5) {
		// version 4 saved paths to critic reviews
		// but that takes up too much storage space 
		// 5 also saves space on the critic path
		for(var i=0, il=epRatingsArray.length; i<il; i++) {
			for(var j=1, jl=epRatingsArray[0].length; j<jl; j++) {
				if(i==0) {
					if(!epRatingsArray[0][j][1]) {
						// somehow a null value snuck in to review with no name
						epRatingsArray[0][j][1] = '';
					} else {
						epRatingsArray[0][j][1] = epRatingsArray[0][j][1].replace(/\/critic\//g,'');
					}
				} else {
					var tempReview = epRatingsArray[i][j][0];
					if(tempReview >= 0) {
					} else {
						tempReview = 0;
					}
					epRatingsArray[i][j] = tempReview;
				}
			}
		}
		// remove duplicates
		for(var x=1, xl=epRatingsArray[0].length; x<xl; x++) {
			for(var y=x+1, yl=epRatingsArray[0].length; y<yl; y++) {
				if(epRatingsArray[0][x][0]==epRatingsArray[0][y][0]) {
					for(var i=0, il=epRatingsArray.length; i<il; i++) {
						epRatingsArray[i].splice(y,1);
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
		epRatingsArray[0][0][0] = dataVersion; 
		save_to_storage();		
	}
}

