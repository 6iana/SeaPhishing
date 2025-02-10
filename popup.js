document.addEventListener("DOMContentLoaded", () => {
  // Get elements from the DOM
  const toggleNotifications = document.getElementById("toggleNotifications");
  const toggleDarkMode = document.getElementById("toggleDarkMode");
  const checkSiteButton = document.getElementById("check-site");
  const reportSiteButton = document.getElementById("report-site");
  const toggleExtraInfoButton = document.getElementById("toggle-extra-info");
  const extraInfoDiv = document.getElementById("extra-info");

  // Elements for risk breakdown
  const riskLevelElement = document.getElementById("risk-level");
  const domainNameElement = document.getElementById("domain-name");
  const domainAgeElement = document.getElementById("domain-age");
  const connectionSecurityElement = document.getElementById("connection-security");

  // Default preferences
  const defaultPreferences = {
    notificationsEnabled: true,
  };

  // Notifications toggle
  if (toggleNotifications) {
    toggleNotifications.addEventListener("change", (e) => {
      const isChecked = e.target.checked;
      chrome.storage.sync.set(
        {
          userPreferences: {
            ...defaultPreferences,
            notificationsEnabled: isChecked,
          },
        },
        () => {
          console.log(`Notifications enabled: ${isChecked}`);
        }
      );
    });

    // Load initial notifications state
    chrome.storage.sync.get("userPreferences", (data) => {
      const prefs = data.userPreferences || defaultPreferences;
      toggleNotifications.checked = prefs.notificationsEnabled;
    });
  } else {
    console.error("Element with ID 'toggleNotifications' not found.");
  }

  // Dark mode toggle
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

  // Toggle extra info expand/collapse
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

  // Analyze current site button
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
          // Update overall risk level
          riskLevelElement.textContent = response.riskLevel || "Unknown";
  
          // Update breakdown details if available
          if (response.breakdown) {
            domainNameElement.textContent = "Domain Name: " + response.breakdown.domainName;
            domainAgeElement.textContent = "Domain Age: " + response.breakdown.domainAge;
            connectionSecurityElement.textContent = "Connection Security: " + response.breakdown.connectionSecurity;
            document.getElementById("certificate-info").textContent = "SSL Certificate: " + response.breakdown.certificateInfo;
            document.getElementById("domain-reputation").textContent = "Domain Reputation: " + response.breakdown.domainReputation;
            // Make the "Show Details" button visible now that we have details
            toggleExtraInfoButton.style.display = "block";
          } else {
            domainNameElement.textContent = "";
            domainAgeElement.textContent = "";
            connectionSecurityElement.textContent = "";
            document.getElementById("certificate-info").textContent = "";
            document.getElementById("domain-reputation").textContent = "";
            // Optionally hide the button if no details are available
            toggleExtraInfoButton.style.display = "none";
          }
        });
      });
    });
  }
  

  // Report suspicious site button
  if (reportSiteButton) {
    reportSiteButton.addEventListener("click", () => {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        const url = tabs[0].url;
        chrome.runtime.sendMessage({ action: "reportSite", url }, () => {
          alert("Site reported successfully!");
        });
      });
    });
  }

  // Function to enable/disable dark mode
  function setDarkMode(enabled) {
    if (enabled) {
      document.body.classList.add("dark-mode");
    } else {
      document.body.classList.remove("dark-mode");
    }
  }
});
