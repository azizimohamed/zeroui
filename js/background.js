(() => {
  "use strict";

  const browserAPI =
    typeof browser === "object" && typeof browser.runtime === "object"
      ? browser
      : chrome;

  const storage = browserAPI.storage.sync || browserAPI.storage.local;

  const DEFAULT_SETTINGS = {
    enabled: true,
    hide_images: false,
    hide_backgrounds: false,
    hide_favicon: true,
    hide_icons: true,
    hide_emojis: true,
    hide_buttons: false,
  };

  // ============================================================
  // Settings
  // ============================================================

  /**
   * Get settings.
   *
   * chrome.storage.get(defaults) automatically fills in
   * settings that don't exist yet.
   */
  function getSettings(callback) {
    storage.get(DEFAULT_SETTINGS, (settings) => {
      if (browserAPI.runtime.lastError) {
        console.error(
          "ZeroUI: failed to load settings",
          browserAPI.runtime.lastError,
        );

        callback({ ...DEFAULT_SETTINGS });

        return;
      }

      callback(settings);
    });
  }

  /**
   * Save settings.
   */
  function saveSettings(settings, callback = () => {}) {
    storage.set(settings, () => {
      if (browserAPI.runtime.lastError) {
        console.error(
          "ZeroUI: failed to save settings",
          browserAPI.runtime.lastError,
        );

        callback(false);
        return;
      }

      callback(true);
    });
  }

  // ============================================================
  // Initialize settings
  // ============================================================

  function initializeSettings() {
    getSettings((settings) => {
      // Write the complete settings object back to storage.
      // This also adds any newly introduced settings.
      saveSettings({
        ...DEFAULT_SETTINGS,
        ...settings,
      });
    });
  }

  // ============================================================
  // Installation
  // ============================================================

  browserAPI.runtime.onInstalled.addListener((details) => {
    if (details.reason === "install") {
      initializeSettings();
    }

    if (details.reason === "update") {
      initializeSettings();
    }
  });

  // ============================================================
  // Startup
  // ============================================================

  browserAPI.runtime.onStartup.addListener(() => {
    initializeSettings();
  });

  // Also initialize immediately.
  initializeSettings();

  // ============================================================
  // Settings changes
  // ============================================================

  browserAPI.storage.onChanged.addListener((changes, areaName) => {
    // Ignore changes from another storage area.
    if (areaName !== "sync" && areaName !== "local") {
      return;
    }

    const changedKeys = Object.keys(changes);

    if (changedKeys.length === 0) {
      return;
    }
  });
})();
