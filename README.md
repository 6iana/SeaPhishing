
# SeaPhishing Chrome Extension

SeaPhishing is a Chrome extension designed to help users detect and avoid phishing websites by providing risk analysis, domain reputation checks, and alerts when known phishing domains are visited. It also offers periodic safety tips and allows users to report suspicious websites.

## Features

Checks domain age using WHOIS  
Checks domain reputation using WHOIS API  
Cross-checks against ThreatFox phishing database  
Displays phishing alerts through Chrome notifications  
Provides random phishing safety tips every ~30 minutes
Allows users to report suspicious websites (saved locally)  
Dark mode toggle and notification bell toggle

## Setup

1. Clone or download this repository.  
2. Open `chrome://extensions` in your Chrome browser.  
3. Enable Developer mode.  
4. Click 'Load unpacked' and select the folder containing this extension.

## How It Works

- On every page load, the extension analyses the current URL, calculates a risk score, and checks it against known phishing domains.
- If the domain is known as phishing, it immediately triggers a Chrome notification.
- Every ~10 seconds, it displays random safety tips in the corner of the page (if notifications are enabled).
- Users can toggle notifications using the bell icon in the popup.

## Developer Console Commands

If you want to inspect the stored phishing domains or reported sites while testing, open Chrome DevTools and run:

### View stored ThreatFox domains

```js
chrome.storage.local.get('phishingDomains', (data) => {
    console.log('ThreatFox domains:', data.phishingDomains);
});
```

### View reported suspicious websites

```js
chrome.storage.local.get('reportedSites', (data) => {
    console.log('Reported sites:', data.reportedSites);
});
```

## API Keys

This project requires valid API keys for:
- Google Safe Browsing
- WHOIS XML API
- ThreatFox API

These keys are currently hardcoded in the code (`background.js`) but should ideally be stored securely (not in production code) for real-world deployments.

## Known Limitations

- Hardcoded API keys (for demonstration purposes).
- The phishing tip notifications appear even if the user is on safe sites (this can be toggled off).
- Blocking rules currently use static examples; dynamic integration can be expanded.
- Extension works only in Chrome (or Chromium-based browsers).

## License

This project is developed for academic purposes.
