// Listen for phishing warning messages from background.js
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'showPhishingWarning') {
    // Send message back to background to create a Chrome notification
    chrome.runtime.sendMessage({
      action: 'createNotification',
      title: '⚠ Phishing Alert',
      message: 'This website matches a known phishing domain! Please leave immediately for your safety.'
    });
  }
});
