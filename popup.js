document.addEventListener("DOMContentLoaded", () => {
  const toggleNotifications = document.getElementById("toggleNotifications");
  const toggleBlocking = document.getElementById("toggleBlocking");
  const checkSiteButton = document.getElementById("check-site");
  const reportSiteButton = document.getElementById("report-site");

  // Default preferences
  const userPreferences = {
    notificationsEnabled: true,
    blockingEnabled: true,
  };

  // Ensure elements exist before adding event listeners
  if (toggleNotifications) {
    toggleNotifications.addEventListener("change", (e) => {
      const isChecked = e.target.checked;
      chrome.storage.sync.set(
        {
          userPreferences: {
            ...userPreferences,
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
      const prefs = data.userPreferences || userPreferences;
      toggleNotifications.checked = prefs.notificationsEnabled;
    });
  } else {
    console.error("Element with ID 'toggleNotifications' not found.");
  }

  if (toggleBlocking) {
    toggleBlocking.addEventListener("change", (e) => {
      const isChecked = e.target.checked;
      chrome.storage.sync.set(
        {
          userPreferences: {
            ...userPreferences,
            blockingEnabled: isChecked,
          },
        },
        () => {
          console.log(`Blocking enabled: ${isChecked}`);
        }
      );
    });

    // Load initial blocking state
    chrome.storage.sync.get("userPreferences", (data) => {
      const prefs = data.userPreferences || userPreferences;
      toggleBlocking.checked = prefs.blockingEnabled;
    });
  } else {
    console.error("Element with ID 'toggleBlocking' not found.");
  }

  // Analyze current site
  if (checkSiteButton) {
    checkSiteButton.addEventListener("click", () => {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        const url = tabs[0].url;
        chrome.runtime.sendMessage({ action: "analyzeUrl", url }, (response) => {
          document.getElementById("risk-level").textContent = response.riskLevel || "Unknown";
        });
      });
    });
  }

  // Report suspicious site
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
});
