// API Keys
const GOOGLE_API_KEY = "AAIzaSyBAbXoevPsW_tfvPcPRxcCfMxt8g6vTilk";
const WHOIS_API_KEY = "at_7sWxjcWKqZQoReHwtu8BacrpreX53";
const THREATFOX_API_KEY = "9587774f7a5eeba17212e6fac0a38b62a07499f9e3af704c";

// Default user preferences
let userPreferences = {
  notificationsEnabled: true,
  blockingEnabled: true,
};

// Safety tip messages shown periodically
const phishingTips = [
  "Always verify the sender's email address before clicking any link.",
  "Hover over links to see the real URL before clicking.",
  "Be cautious with urgent requests for personal information.",
  "Check for HTTPS and a padlock icon before entering sensitive data.",
  "Keep your browser updated to minimize security vulnerabilities.",
  "Use a password manager to generate and store complex passwords.",
  "Enable multi-factor authentication for extra security."
];

// Get a random tip from the list
function getRandomTip() {
  return phishingTips[Math.floor(Math.random() * phishingTips.length)];
}

// Inject an in-page notification box into the active tab
function showInPageNotification(message) {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (tabs[0]) {
      chrome.scripting.executeScript({
        target: { tabId: tabs[0].id },
        func: (msg) => {
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

// Setup on extension install
chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.sync.set({ userPreferences }, () => {
    console.log("Default preferences saved:", userPreferences);
  });
  fetchThreatFoxPhishingDomains();
});

// Create alarms: one for refreshing phishing domains, one for showing tips
chrome.alarms.create("refreshThreatFoxDomains", { periodInMinutes: 720 }); // every 12 hours
chrome.alarms.create("phishingTipAlarm", { periodInMinutes: 0.166667 }); // every 30 minutes

// Alarm listeners
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === "refreshThreatFoxDomains") {
    fetchThreatFoxPhishingDomains();
  } else if (alarm.name === "phishingTipAlarm") {
    chrome.storage.sync.get('userPreferences', (data) => {
      if (data.userPreferences && data.userPreferences.notificationsEnabled) {
        const tip = getRandomTip();
        showInPageNotification(tip);
      }
    });
  }
});

// Fetch phishing domains from ThreatFox API
async function fetchThreatFoxPhishingDomains() {
  const response = await fetch("https://threatfox-api.abuse.ch/api/v1/", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      query: "get_iocs",
      api_key: THREATFOX_API_KEY,
      ioc_type: "url",
      malware: "phishing"
    })
  });

  const data = await response.json();
  const phishingDomains = new Set();

  if (data && data.data) {
    data.data.forEach((entry) => {
      if (entry.ioc.startsWith("http://") || entry.ioc.startsWith("https://")) {
        try {
          const url = new URL(entry.ioc);
          phishingDomains.add(url.hostname);
        } catch (e) {
          console.warn("Invalid URL in ThreatFox feed:", entry.ioc);
        }
      }
    });
  }

  chrome.storage.local.set({ phishingDomains: Array.from(phishingDomains) }, () => {
    console.log("ThreatFox domains stored locally.");
  });
}

// WHOIS API: Get domain age
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

// WHOIS API: Get domain reputation
async function getDomainReputation(domain) {
  const reputationUrl = `https://www.whoisxmlapi.com/domainreputationserver/DomainReputationService?apiKey=${WHOIS_API_KEY}&domainName=${domain}&outputFormat=JSON`;
  try {
    const response = await fetch(reputationUrl);
    const contentType = response.headers.get('content-type');
    const text = await response.text();

    if (contentType && contentType.includes('application/json')) {
      const data = JSON.parse(text);
      if (data && data.DomainReputation) {
        return data.DomainReputation;
      } else {
        return "Unknown";
      }
    } else {
      console.warn("WHOIS reputation API returned non-JSON:", text);
      return "Unavailable";
    }
  } catch (error) {
    console.error("Error fetching domain reputation:", error);
    return "Unknown";
  }
}

// Main risk analysis function
async function analyseUrl(url, tabId) {
  const parsedUrl = new URL(url);
  const domain = parsedUrl.hostname;
  const connectionSecurity = url.startsWith("https") ? "Secure" : "Not Secure";
  const certificateInfo = connectionSecurity === "Secure" ? "Valid SSL Certificate" : "No SSL Certificate";

  let domainNameRisk = (domain.includes("phish") || domain.includes("scam")) ? 50 : 0;
  let connectionRisk = url.startsWith("https") ? 0 : 30;
  let domainAgeString = await getDomainAge(domain);
  let domainAgeRisk = domainAgeString === "Unknown" ? 40 : (parseInt(domainAgeString) < 2 ? 40 : 10);
  let domainReputation = await getDomainReputation(domain);
  let reputationRisk = (domainReputation.toLowerCase() === "poor") ? 30 : 0;

  let totalRisk = domainNameRisk + connectionRisk + domainAgeRisk + reputationRisk;
  if (totalRisk > 100) totalRisk = 100;

  // Check if the domain is in ThreatFox list and show notification
  const localData = await new Promise(resolve => {
    chrome.storage.local.get("phishingDomains", resolve);
  });
  const threatFoxDomains = localData.phishingDomains || [];
  if (threatFoxDomains.includes(domain)) {
    totalRisk = 100;
    chrome.notifications.create({
      type: "basic",
      iconUrl: "icons/icon48.png",
      title: "⚠ Phishing Warning",
      message: "The website you are about to access is a phishing website!",
      priority: 2
    });
  }

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

// Automatically analyse every tab when it finishes loading
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url) {
    analyseUrl(tab.url, tabId);
  }
});

// Handle incoming messages from the popup or other parts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "analyseUrl") {
    (async () => {
      try {
        const result = await analyseUrl(message.url, sender.tab ? sender.tab.id : null);
        sendResponse(result);
      } catch (error) {
        console.error("Error analysing URL:", error);
        sendResponse({ riskLevel: "Unknown", breakdown: {} });
      }
    })();
    return true; // async response
  } else if (message.action === "reportSite") {
    const reportedUrl = message.url;
    chrome.storage.local.get({ reportedSites: [] }, (result) => {
      const reportedSites = result.reportedSites;
      reportedSites.push({ url: reportedUrl, reportedAt: new Date().toISOString() });
      chrome.storage.local.set({ reportedSites }, () => {
        console.log("Reported sites updated:", reportedSites);
        sendResponse({ success: true });
      });
    });
    return true;
  } else if (message.action === 'createNotification') {
    chrome.notifications.create({
      type: 'basic',
      iconUrl: 'icons/icon48.png',
      title: message.title,
      message: message.message,
      priority: 2
    });
  }
});
