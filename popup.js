document.addEventListener("DOMContentLoaded", () => {
  // get elements from the DOM
  const toggleNotifications = document.getElementById("toggleNotifications");
  const toggleDarkMode = document.getElementById("toggleDarkMode");
  const checkSiteButton = document.getElementById("check-site");
  const reportSiteButton = document.getElementById("report-site");
  const toggleExtraInfoButton = document.getElementById("toggle-extra-info");
  const extraInfoDiv = document.getElementById("extra-info");

  // elements for risk breakdown
  const riskLevelElement = document.getElementById("risk-level");
  const domainNameElement = document.getElementById("domain-name");
  const domainAgeElement = document.getElementById("domain-age");
  const connectionSecurityElement = document.getElementById("connection-security");

  // default preferences
  const defaultPreferences = {
    notificationsEnabled: true,
  };

  // notifications toggle
  if (toggleNotifications) {
    toggleNotifications.addEventListener("change", (e) => {
      const isChecked = e.target.checked;
      chrome.storage.sync.set(
        { userPreferences: { ...defaultPreferences, notificationsEnabled: isChecked } },
        () => {
          console.log(`Notifications enabled: ${isChecked}`);
        }
      );
    });
    chrome.storage.sync.get("userPreferences", (data) => {
      const prefs = data.userPreferences || defaultPreferences;
      toggleNotifications.checked = prefs.notificationsEnabled;
    });
  } else {
    console.error("Element with ID 'toggleNotifications' not found.");
  }

  // dark mode toggle
  if (toggleDarkMode) {
    chrome.storage.sync.get("darkModeEnabled", (data) => {
      const darkModeEnabled = data.darkModeEnabled || false;
      toggleDarkMode.checked = darkModeEnabled;
      setDarkMode(darkModeEnabled);
    });
    toggleDarkMode.addEventListener("change", (e) => {
      const enabled = e.target.checked;
      setDarkMode(enabled);
      chrome.storage.sync.set({ darkModeEnabled: enabled });
    });
  } else {
    console.error("Element with ID 'toggleDarkMode' not found.");
  }

  // toggle extra info expand/collapse
  if (toggleExtraInfoButton && extraInfoDiv) {
    toggleExtraInfoButton.addEventListener("click", () => {
      if (extraInfoDiv.style.display === "none" || extraInfoDiv.style.display === "") {
        extraInfoDiv.style.display = "block";
        toggleExtraInfoButton.textContent = "Hide Details";
      } else {
        extraInfoDiv.style.display = "none";
        toggleExtraInfoButton.textContent = "Show Details";
      }
    });
  }

  // analyse current site button
  if (checkSiteButton) {
    checkSiteButton.addEventListener("click", () => {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        const url = tabs[0].url;
        chrome.runtime.sendMessage({ action: "analyzeUrl", url }, (response) => {
          if (chrome.runtime.lastError) {
            console.error("sendMessage error:", chrome.runtime.lastError.message);
            riskLevelElement.textContent = "Error";
            return;
          }
          // update overall risk level
          riskLevelElement.textContent = response.riskLevel || "Unknown";

          // update breakdown details if available
          if (response.breakdown) {
            domainNameElement.textContent = "Domain Name: " + response.breakdown.domainName;
            domainAgeElement.textContent = "Domain Age: " + response.breakdown.domainAge;
            connectionSecurityElement.textContent = "Connection Security: " + response.breakdown.connectionSecurity;
            document.getElementById("certificate-info").textContent = "SSL Certificate: " + response.breakdown.certificateInfo;
            document.getElementById("domain-reputation").textContent = "Domain Reputation: " + response.breakdown.domainReputation;
            // make the "Show Details" button visible now that we have details
            toggleExtraInfoButton.style.display = "block";
          } else {
            domainNameElement.textContent = "";
            domainAgeElement.textContent = "";
            connectionSecurityElement.textContent = "";
            document.getElementById("certificate-info").textContent = "";
            document.getElementById("domain-reputation").textContent = "";
            toggleExtraInfoButton.style.display = "none";
          }
        });
      });
    });
  }

  // report site button
  if (reportSiteButton) {
    reportSiteButton.addEventListener("click", () => {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        const url = tabs[0].url;
        chrome.runtime.sendMessage({ action: "reportSite", url }, (response) => {
          if (response.success) alert("Site reported successfully!");
        });
      });
    });
  }
  // trigger the in-page notification every 30 minutes (for testing, set to 10 seconds)
  setInterval(() => {
    chrome.storage.sync.get("userPreferences", (data) => {
      const prefs = data.userPreferences || defaultPreferences;
      if (prefs.notificationsEnabled) {
        showInPageNotification(getRandomTip());
      }
    });
  }, 10000);

  // function to enable/disable dark mode
  function setDarkMode(enabled) {
    if (enabled) {
      document.body.classList.add("dark-mode");
    } else {
      document.body.classList.remove("dark-mode");
    }
  }
});
