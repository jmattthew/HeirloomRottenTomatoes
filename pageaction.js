function send_for_help() {
	chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
		chrome.tabs.sendMessage(tabs[0].id, {showAbout: 'show'}, function(response) {
		});
	});
}

document.getElementById('about_link').addEventListener('click', send_for_help);
