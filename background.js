const API_KEY = "AAIzaSyBAbXoevPsW_tfvPcPRxcCfMxt8g6vTilk";
const API_URL = `https://safebrowsing.googleapis.com/v4/threatMatches:find?key=${API_KEY}`;

// WHOIS API key for domain age and reputation lookup (e.g., WhoisXML API)
const WHOIS_API_KEY = "at_IJFXpXmHI7SuvLUZkxrSCLndogJkI"; // Replace with your actual WHOIS API key

// Default user preferences
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
    removeRuleIds: [1],
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

/*---------------------------------------------------------
  Domain Age & Reputation Lookup Using WhoisXML API
---------------------------------------------------------*/

// Retrieve domain age using WHOIS API
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

// Retrieve domain reputation using WHOIS API
async function getDomainReputation(domain) {
  // Hypothetical endpoint for domain reputation lookup
  const reputationUrl = `https://www.whoisxmlapi.com/domainreputationserver/DomainReputationService?apiKey=${WHOIS_API_KEY}&domainName=${domain}&outputFormat=JSON`;
  try {
    const response = await fetch(reputationUrl);
    const data = await response.json();
    // Adjust the parsing logic as per the actual API response structure.
    if (data && data.DomainReputation) {
      // For example, the API might return a reputation score or a text label
      return data.DomainReputation; // e.g., "Good", "Poor", or a numeric score
    } else {
      return "Unknown";
    }
  } catch (error) {
    console.error("Error fetching domain reputation:", error);
    return "Unknown";
  }
}

/*---------------------------------------------------
  Risk Analysis & Report Breakdown Functionality
---------------------------------------------------*/
async function analyzeUrl(url) {
  // Parse the URL to extract components
  const parsedUrl = new URL(url);
  const domain = parsedUrl.hostname;
  const connectionSecurity = url.startsWith("https") ? "Secure" : "Not Secure";
  
  // Additional SSL certificate information
  const certificateInfo = connectionSecurity === "Secure" ? "Valid SSL Certificate" : "No SSL Certificate";

  // Calculate risk factors using dummy logic:
  // 1. Domain Name Risk: if the domain contains suspicious keywords, assign higher risk.
  const domainNameRisk = (domain.includes("phish") || domain.includes("scam")) ? 50 : 0;
  
  // 2. Connection Security Risk: if the URL is not secure, add risk.
  const connectionRisk = url.startsWith("https") ? 0 : 30;
  
  // 3. Domain Age Risk: Get the actual domain age using the WHOIS API
  const domainAgeString = await getDomainAge(domain);
  
  // Determine domain age risk based on the retrieved age
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
  
  // 4. Domain Reputation Risk: Optionally, you could adjust risk based on reputation.
  const domainReputation = await getDomainReputation(domain);
  // For example, if reputation is "Poor", add extra risk.
  let reputationRisk = 0;
  if (domainReputation.toLowerCase() === "poor") {
    reputationRisk = 30;
  }
  
  // Compute the overall risk percentage and cap it at 100%
  let totalRisk = domainNameRisk + connectionRisk + domainAgeRisk + reputationRisk;
  if (totalRisk > 100) totalRisk = 100;
  
  // Simulate a delay (for demonstration)
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

// Listen for messages from the popup to analyze the current site URL
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "analyzeUrl") {
    // Handle URL analysis
    (async () => {
      try {
        const result = await analyzeUrl(message.url);
        sendResponse(result);
      } catch (error) {
        console.error("Error analyzing URL:", error);
        sendResponse({ riskLevel: "Unknown", breakdown: {} });
      }
    })();
    return true; // Indicate asynchronous response
  } else if (message.action === "reportSite") {
    // Handle website reporting
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
    return true; // Indicate asynchronous response
  }
});


