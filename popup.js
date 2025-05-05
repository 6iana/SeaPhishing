document.addEventListener('DOMContentLoaded', () => {
  const darkModeToggle = document.getElementById('toggleDarkMode');
  const bellIcon = document.getElementById('notificationBell');
  const checkButton = document.getElementById('check-site');
  const reportButton = document.getElementById('report-site');
  const extraInfoSection = document.getElementById('extra-info');
  const toggleExtraInfoButton = document.getElementById('toggle-extra-info');

  // Load user preferences (dark mode, notifications)
  chrome.storage.sync.get('userPreferences', (data) => {
    const prefs = data.userPreferences || { darkMode: false, notificationsEnabled: true };
    darkModeToggle.checked = prefs.darkMode;
    updateBellIcon(prefs.notificationsEnabled);
    if (prefs.darkMode) {
      document.body.classList.add('dark-mode');
    }
  });

  // Handle dark mode toggle switch
  darkModeToggle.addEventListener('change', () => {
    chrome.storage.sync.get('userPreferences', (data) => {
      const prefs = data.userPreferences || { darkMode: false, notificationsEnabled: true };
      prefs.darkMode = darkModeToggle.checked;
      chrome.storage.sync.set({ userPreferences: prefs }, () => {
        document.body.classList.toggle('dark-mode', prefs.darkMode);
      });
    });
  });

  // Helper function to dim or brighten bell icon
  function updateBellIcon(enabled) {
    bellIcon.style.opacity = enabled ? '1.0' : '0.4';
  }

  // Handle notification bell click to enable/disable tips
  bellIcon.addEventListener('click', () => {
    chrome.storage.sync.get('userPreferences', (data) => {
      const prefs = data.userPreferences || { notificationsEnabled: true };
      prefs.notificationsEnabled = !prefs.notificationsEnabled;

      chrome.storage.sync.set({ userPreferences: prefs }, () => {
        console.log('Notifications toggled:', prefs.notificationsEnabled);
        updateBellIcon(prefs.notificationsEnabled);
      });
    });
  });

  // Handle "Analyse Current Site" button click
  checkButton.addEventListener('click', () => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const currentTab = tabs[0];
      if (currentTab) {
        chrome.runtime.sendMessage({ action: 'analyseUrl', url: currentTab.url }, (result) => {
          document.getElementById('risk-level').textContent = result.riskLevel;
          document.getElementById('connection-security-main').textContent = result.breakdown.connectionSecurity;
          // Populate hidden extra info section
          document.getElementById('domain-name').textContent = 'Domain: ' + result.breakdown.domainName;
          document.getElementById('domain-age').textContent = 'Domain Age: ' + result.breakdown.domainAge;
          document.getElementById('domain-reputation').textContent = 'Domain Reputation: ' + result.breakdown.domainReputation;
          document.getElementById('connection-security').textContent = 'Connection Security: ' + result.breakdown.connectionSecurity;
          document.getElementById('certificate-info').textContent = 'Certificate Info: ' + result.breakdown.certificateInfo;

          toggleExtraInfoButton.style.display = 'block';
        });
      }
    });
  });

  // Toggle the visibility of extra details section
  toggleExtraInfoButton.addEventListener('click', () => {
    if (extraInfoSection.style.display === 'none' || extraInfoSection.style.display === '') {
      extraInfoSection.style.display = 'block';
      toggleExtraInfoButton.textContent = 'Hide Details';
    } else {
      extraInfoSection.style.display = 'none';
      toggleExtraInfoButton.textContent = 'Show Details';
    }
  });

  // Handle "Report this website" button click
  reportButton.addEventListener('click', () => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const currentTab = tabs[0];
      if (currentTab) {
        chrome.runtime.sendMessage({ action: 'reportSite', url: currentTab.url }, (response) => {
          if (response.success) {
            alert('Site reported successfully!');
          }
        });
      }
    });
  });
});
