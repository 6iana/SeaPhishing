const API_KEY = "AAIzaSyBAbXoevPsW_tfvPcPRxcCfMxt8g6vTilk";
const API_URL = `https://safebrowsing.googleapis.com/v4/threatMatches:find?key=${API_KEY}`;

// WHOIS API key for domain age and reputation lookup
const WHOIS_API_KEY = "at_IJFXpXmHI7SuvLUZkxrSCLndogJkI";

// default user preferences
let userPreferences = {
  notificationsEnabled: true,
  blockingEnabled: true,
};

chrome.runtime.onInstalled.addListener(() => {
  console.log("Anti-Phishing Extension installed!");
  chrome.storage.sync.set({ userPreferences }, () => {
    console.log("Default preferences saved:", userPreferences);
  });
});

// listen for user preference changes
chrome.storage.onChanged.addListener((changes) => {
  if (changes.userPreferences) {
    userPreferences = changes.userPreferences.newValue;
    console.log("User preferences updated:", userPreferences);
  }
});

// dynamically add a rule to block phishing URLs
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
    removeRuleIds: [1],
  },
  () => {
    console.log("Dynamic rules updated.");
  }
);

// handles notifications for phishing warnings
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

// domain age & reputation lookup using WhoisXML API

// retrieving domain age using WHOIS API
async function getDomainAge(domain) {
  const whoisUrl = `https://www.whoisxmlapi.com/whoisserver/WhoisService?apiKey=${WHOIS_API_KEY}&domainName=${domain}&outputFormat=JSON`;
  try {
    const response = await fetch(whoisUrl);
    const data = await response.json();
    if (data && data.WhoisRecord && data.WhoisRecord.createdDateNormalized) {
      const creationDate = new Date(data.WhoisRecord.createdDateNormalized);
      const currentDate = new Date();
      let ageInYears = currentDate.getFullYear() - creationDate.getFullYear();
      const monthDiff = currentDate.getMonth() - creationDate.getMonth();
      if (monthDiff < 0 || (monthDiff === 0 && currentDate.getDate() < creationDate.getDate())) {
        ageInYears--;
      }
      return ageInYears + " years";
    } else {
      return "Unknown";
    }
  } catch (error) {
    console.error("Error fetching WHOIS data:", error);
    return "Unknown";
  }
}

// retrieve domain reputation using WHOIS API
async function getDomainReputation(domain) {
  const reputationUrl = `https://www.whoisxmlapi.com/domainreputationserver/DomainReputationService?apiKey=${WHOIS_API_KEY}&domainName=${domain}&outputFormat=JSON`;
  try {
    const response = await fetch(reputationUrl);
    const data = await response.json();
    if (data && data.DomainReputation) {
      return data.DomainReputation;
    } else {
      return "Unknown";
    }
  } catch (error) {
    console.error("Error fetching domain reputation:", error);
    return "Unknown";
  }
}

// risk analysis & report breakdown

async function analyzeUrl(url) {
  // parse the URL to extract components
  const parsedUrl = new URL(url);
  const domain = parsedUrl.hostname;
  const connectionSecurity = url.startsWith("https") ? "Secure" : "Not Secure";
  
  // additional SSL certificate information
  const certificateInfo = connectionSecurity === "Secure" ? "Valid SSL Certificate" : "No SSL Certificate";

  // calculating risk factors using dummy logic:
  // domain name risk
  const domainNameRisk = (domain.includes("phish") || domain.includes("scam")) ? 50 : 0;
  
  // connection security risk
  const connectionRisk = url.startsWith("https") ? 0 : 30;
  
  // domain age risk, gets the actual domain age using the WHOIS API
  const domainAgeString = await getDomainAge(domain);
  let domainAgeRisk = 10; // default low risk
  if (domainAgeString === "Unknown") {
    domainAgeRisk = 40;
  } else {
    const ageNumber = parseInt(domainAgeString);
    if (ageNumber < 2) {
      domainAgeRisk = 40;
    } else {
      domainAgeRisk = 10;
    }
  }
  
  // domain reputation risk
  const domainReputation = await getDomainReputation(domain);
  let reputationRisk = 0;
  if (domainReputation.toLowerCase() === "poor") {
    reputationRisk = 30;
  }
  
  // compute the overall risk percentage and cap it at 100%
  let totalRisk = domainNameRisk + connectionRisk + domainAgeRisk + reputationRisk;
  if (totalRisk > 100) totalRisk = 100;
  
  // simulating a delay
  await new Promise(resolve => setTimeout(resolve, 500));

  return {
    riskLevel: totalRisk + "%",
    breakdown: {
      domainName: domain,
      domainAge: domainAgeString,
      connectionSecurity: connectionSecurity,
      certificateInfo: certificateInfo,
      domainReputation: domainReputation
    }
  };
}

// custom in-page notification for phishing safety tips
const phishingTips = [
  "Always verify the sender's email address before clicking any link.",
  "Hover over links to see the real URL before clicking.",
  "Be cautious with urgent requests for personal information.",
  "Check for HTTPS and a padlock icon before entering sensitive data.",
  "Keep your browser updated to minimize security vulnerabilities.",
  "Use a password manager to generate and store complex passwords.",
  "Enable multi-factor authentication for extra security."
];

function getRandomTip() {
  return phishingTips[Math.floor(Math.random() * phishingTips.length)];
}

function showInPageNotification(message) {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (tabs[0]) {
      chrome.scripting.executeScript({
        target: { tabId: tabs[0].id },
        func: (msg) => {
          // Create or reuse an overlay element on the active page
          let overlay = document.getElementById("phishingTipOverlay");
          if (!overlay) {
            overlay = document.createElement("div");
            overlay.id = "phishingTipOverlay";
            overlay.style.position = "fixed";
            overlay.style.bottom = "20px";
            overlay.style.right = "20px";
            overlay.style.backgroundColor = "#2D2C2C";
            overlay.style.color = "#fff";
            overlay.style.padding = "15px";
            overlay.style.borderRadius = "5px";
            overlay.style.boxShadow = "0 2px 6px rgba(0,0,0,0.3)";
            overlay.style.zIndex = "10000";
            overlay.style.maxWidth = "300px";
            document.body.appendChild(overlay);
          }
          overlay.textContent = msg;
          overlay.style.display = "block";
          setTimeout(() => {
            overlay.style.display = "none";
          }, 5000);
        },
        args: [message]
      });
    }
  });
}

// an alarm to trigger the custom in-page notification.

chrome.alarms.create("phishingTipAlarm", { periodInMinutes: 0.1667 });

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === "phishingTipAlarm" && userPreferences.notificationsEnabled) {
    const tip = getRandomTip();
    showInPageNotification(tip);
  }
});

// message listener for popup communication
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "analyzeUrl") {
    (async () => {
      try {
        const result = await analyzeUrl(message.url);
        sendResponse(result);
      } catch (error) {
        console.error("Error analyzing URL:", error);
        sendResponse({ riskLevel: "Unknown", breakdown: {} });
      }
    })();
    return true; // indicates asynchronous response
  } else if (message.action === "reportSite") {
    const reportedUrl = message.url;
    chrome.storage.local.get({ reportedSites: [] }, (result) => {
      const reportedSites = result.reportedSites;
      reportedSites.push({
        url: reportedUrl,
        reportedAt: new Date().toISOString()
      });
      chrome.storage.local.set({ reportedSites: reportedSites }, () => {
        console.log("Reported sites updated:", reportedSites);
        sendResponse({ success: true });
      });
    });
    return true; // indicates asynchronous response
  }
});
