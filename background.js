// Placeholder API key for Google Safe Browsing or other service
const API_KEY = "AIzaSyBAbXoevPsW_tfvPcPRxcCfMxt8g6vTilk";
const API_URL = `https://safebrowsing.googleapis.com/v4/threatMatches:find?key=${API_KEY}`;

// Default user preferences
let userPreferences = {
  notificationsEnabled: true,
  blockingEnabled: true,
};

// Load user preferences on extension installation
chrome.runtime.onInstalled.addListener(() => {
  console.log("Anti-Phishing Extension installed!");
  chrome.storage.sync.set({ userPreferences }, () => {
    console.log("Default preferences saved:", userPreferences);
  });
});

// Listen for user preference changes
chrome.storage.onChanged.addListener((changes) => {
  if (changes.userPreferences) {
    userPreferences = changes.userPreferences.newValue;
    console.log("User preferences updated:", userPreferences);
  }
});

// Dynamically add a rule to block phishing URLs
chrome.declarativeNetRequest.updateDynamicRules(
  {
    addRules: [
      {
        id: 1,
        priority: 1,
        action: { type: "block" },
        condition: {
          urlFilter: "*suspicious-site.com*",
          resourceTypes: ["main_frame"],
        },
      },
    ],
    removeRuleIds: [1], // Replace any existing rule with the same ID
  },
  () => {
    console.log("Dynamic rules updated.");
  }
);

// Handle notifications for phishing warnings
chrome.declarativeNetRequest.onRuleMatchedDebug.addListener((info) => {
  if (userPreferences.notificationsEnabled) {
    chrome.notifications.create({
      type: "basic",
      iconUrl: "icons/icon48.png",
      title: "Phishing Alert!",
      message: `The site (${info.url}) matches a known phishing pattern.`,
    });
  }
});
