// Polyfill para compatibilidad Chrome/Firefox
if (typeof browser === "undefined") {
  var browser = chrome;
}

chrome.action.onClicked.addListener((tab) => {
  if (tab.url.startsWith('https://www.youtube.com/watch')) {
    chrome.tabs.sendMessage(tab.id, { action: 'start' });
  }
});
