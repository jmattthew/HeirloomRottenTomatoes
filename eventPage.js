var _gaq = _gaq || [];
_gaq.push(['_setAccount', 'UA-56019471-1']);
_gaq.push(['_trackPageview']);

(function() {
  var ga = document.createElement('script'); ga.type = 'text/javascript'; ga.async = true;
  ga.src = 'https://ssl.google-analytics.com/ga.js';
  var s = document.getElementsByTagName('script')[0]; s.parentNode.insertBefore(ga, s);
})();

var sessionLogged = false;

// recieve critics ranking from the content script
chrome.runtime.onMessage.addListener(
	function(request, sender, sendResponse) {
		var critics = request.data;
		// push name and rank of top 10 critics to gAnalytics 
		// (10 because trackEvent throttles to 1/sec. after 10 pushes)
		if(!sessionLogged) {
			// push to track event only once per session
			for(var x=0, xl=critics.length; (x<xl) && (x<10); x++) {
				var cName = critics[x][0];
				var cRank = Math.round(critics[x][6]*10000);
				_gaq.push(['_trackEvent', 'critics', 'rank', cName, cRank]);
			}
			sessionLogged = true;
		}
		
		/*
		// pass message back to content script
		if (request.data.length > 0) {
			sendResponse({tenfour: 'recieved'});
		}
		*/
	});

