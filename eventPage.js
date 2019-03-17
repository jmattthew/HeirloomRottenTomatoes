/////////////////////////
//                     //
//       GLOBAL        //
//      VARIABLES      //
//                     //
/////////////////////////

var storage = chrome.storage.local;
var epRatingsArray = new Array(); // the eventPages' copy of ratingsArray
var dataReady = false;
var sessionLogged = false;
var firstRun = '';
// when storage methods change, this variable
// allows some older versions to be detected and fixed
var dataVersion = 6;
var appVersion = chrome.runtime.getManifest().version;
var previousVersion = appVersion;
console.log('loaded ' + previousVersion);
var messagePort = chrome.runtime.connect({name: 'readiness'});










/////////////////////////
//                     //
//        ACTION       //
//                     //
/////////////////////////

// insert Google Analytics
(function(i,s,o,g,r,a,m){i['GoogleAnalyticsObject']=r;i[r]=i[r]||function(){
(i[r].q=i[r].q||[]).push(arguments)},i[r].l=1*new Date();a=s.createElement(o),
m=s.getElementsByTagName(o)[0];a.async=1;a.src=g;m.parentNode.insertBefore(a,m)
})(window,document,'script','https://www.google-analytics.com/analytics.js','ga'); // Note: https protocol here

ga('create', 'UA-56019471-1', 'auto');
ga('set', 'checkProtocolTask', function(){}); // Removes failing protocol check. @see: http://stackoverflow.com/a/22152353/1958200
ga('require', 'displayfeatures');
ga('send', 'pageview', '/pageaction.html');
/*
// syntax for sending events
ga('send', {
  hitType: 'event',
  eventCategory: 'object interacted with',
  eventAction: 'type of interaction',
  eventLabel: 'further categorize',
  eventValue: 'numeric value of interaction'
});
*/


// send data version to analytics
ga('send', {
  hitType: 'event',
  eventCategory: 'eventPage',
  eventAction: 'eventPage loaded',
  eventLabel: 'installed version',
  eventValue: appVersion
});
console.log('app version sent to gA: ' + appVersion);


// getting storage for the eventPage (ratings & firstRun)
// so that it only needs to be retreived once per session
// note:  storage call is asychronous
storage.get(['ratings','firstRun'], function(items) {
	console.log('storage loaded');
	epRatingsArray_create(items.ratings);
	if(!items.firstRun) {
		firstRun = 'firstRun';
	} else {
		firstRun = items.firstRun;
	}
	dataReady = true;
});

// onInstalled
chrome.runtime.onInstalled.addListener(function(details) {
	if(details.reason == 'install' || details.reason == 'update'){
		// show the update message
		previousVersion = details.previousVersion;
		console.log('updated ' + previousVersion);
	}
	chrome.declarativeContent.onPageChanged.removeRules(undefined, function() {
		chrome.declarativeContent.onPageChanged.addRules([
			{
				conditions: [
					new chrome.declarativeContent.PageStateMatcher({
						pageUrl: { urlContains: 'rottentomatoes.com' },
					})
				],
				actions: [
					new chrome.declarativeContent.ShowPageAction()
				]
			}
		]);
	});
});

// onConnect
chrome.runtime.onConnect.addListener(function(messagePort) {
	console.assert(messagePort.name == 'readiness');
	messagePort.onMessage.addListener(function(msg) {
		// listen for readiness message from the content script
		// and deliver the firstRun status
		if(msg.status == 'sendFirstRun') {
			console.log('firstRun requested');
			messagePort.postMessage({firstRun: [firstRun,previousVersion]});
			console.log('firstRun sent to content script');
		}
		// deliver data when firstRun response received
		if(msg.status == 'sendRatingsArray' && dataReady) {
			messagePort.postMessage({data: epRatingsArray});
			console.log('epRatingsArray sent to content script');
		}
		// content script saved ratingsArray so
		// update eventPages's copy
		if(msg.ratingsData && dataReady) {
			epRatingsArray = msg.ratingsData;
			if(epRatingsArray.length<1) {
				// data erased
				epRatingsArray_create(0);
				console.log('all data erased');
			}
		}
		// content script saved firstRun so
		// update firstRun here
		if(msg.firstRun) {
			firstRun = msg.firstRun[0];
			ga('send', {
			  hitType: 'event',
			  eventCategory: 'firstRun',
			  eventAction: 'import',
			  eventLabel: firstRun[0],
			  eventValue: firstRun[1]
			});
			console.log('firstRun data sent to gA');
			console.log('firstRun: ' + firstRun[0] + ':' + firstRun[1]);
		}
		// push name and rank of top 5 critics to gA
		if(msg.criticsData && !sessionLogged) {
			sessionLogged = true;
			var critics = msg.criticsData;
			for(var x=0, xl=critics.length; (x<xl) && (x<5); x++) {
				var cName = critics[x][0];
				var cSimilarity = Math.round(critics[x][7]*10000);
				var cCount = critics[x][6];
				ga('send', {
				  hitType: 'event',
				  eventCategory: 'critics',
				  eventAction: cName,
				  eventLabel: cSimilarity,
				  eventValue: cCount
				});
			}
			console.log('critics data sent to gA');
		}
		// push name of favorited critics to gA
		if(msg.favorited) {
			ga('send', {
			  hitType: 'event',
			  eventCategory: 'critics',
			  eventAction: 'favorited',
			  eventLabel: msg.favorited
			});
			console.log('favorited data sent to gA: ' + msg.favorited);
		}
		// push about modal event to gA
		if(msg.aboutModal) {
			ga('send', {
			  hitType: 'event',
			  eventCategory: 'about modal',
			  eventAction: msg.aboutModal,
			  eventLabel: msg.aboutModal
			});
			console.log('about modal data sent to gA: ' + msg.aboutModal);
		}
		// push name of noteworthy films to gA
		if(msg.noteworthy) {
			ga('send', {
			  hitType: 'event',
			  eventCategory: 'films',
			  eventAction: msg.noteworthy[0],
			  eventLabel: msg.noteworthy[1]
			});
			console.log('noteworthy film data sent to gA: ' + msg.noteworthy);
		}
		if(msg.installMessageSeen) {
			previousVersion = appVersion;
			console.log('update message seen and dismissed');
			console.log(previousVersion);
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
			if(storageData[0].length>0) { // row has a "column"
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
		console.log('storage data is valid');
		epRatingsArray_fix_legacy();
	} else {
		console.log('no valid data from storage');
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
		// versions <= 3 or really buggy
		// probably noone still has one, but anywho:
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
		// 5 also removes '/critic/' from the critic path to save space
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
	if(epRatingsArray[0][0][0] < 6) {
		// version 6 adds the top critic flag, but nothing needs to be done about that
		// version 6 also adds back '/critic/' to solve bug where
		// publications links were broken.  Can't fix those links, but they will be
		// overwritten in time
		for(var j=1, jl=epRatingsArray[0].length; j<jl; j++) {
			epRatingsArray[0][j][1] = '/critic/' + epRatingsArray[0][j][1];
		}
		wasLegacy = true;
	}

	wasLegacy = true;
	if(wasLegacy) {
		epRatingsArray[0][0][0] = dataVersion;
		storage.set({'ratings': epRatingsArray}, function() {
		});
	}
}
