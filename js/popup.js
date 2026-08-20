
(() => {
  ("use strict");

  const browserAPI =
    typeof browser === "object" && typeof browser.runtime === "object"
      ? browser
      : chrome;

  const storage = browserAPI.storage.sync || browserAPI.storage.local;

  const htmlElement = document.documentElement;

  function loadSettings(callback) {
    storage.get(null, (settings) => {
      if (browserAPI.runtime.lastError) {
        storage = browserAPI.storage.local;

        storage.get(null, (localSettings) => {
          callback(localSettings || {});
        });

        return;
      }

      callback(settings || {});
    });
  }

  // ============================================================
  // Save one setting
  // ============================================================

  function saveSetting(settingName, value) {
    storage.set(
      {
        [settingName]: value,
      },
      () => {
        if (browserAPI.runtime.lastError) {
          storage = browserAPI.storage.local;

          storage.set({
            [settingName]: value,
          });
        }
      },
    );
  }

  // ============================================================
  // Apply stored settings to popup
  // ============================================================

  function applySettings(settings) {
    const checkboxes = document.querySelectorAll(
      '#options input[type="checkbox"]',
    );

    checkboxes.forEach((checkbox) => {
      const settingName = checkbox.id;

      if (Object.prototype.hasOwnProperty.call(settings, settingName)) {
        checkbox.checked = Boolean(settings[settingName]);
      }
    });

    if (Object.prototype.hasOwnProperty.call(settings, "enabled")){
      htmlElement.setAttribute("zeroui_on", Boolean(settings.enabled));
    }
  }

  function initializeCheckboxes() {
    const checkboxes = document.querySelectorAll(
      '#options input[type="checkbox"]',
    );

    checkboxes.forEach((checkbox) => {
      checkbox.addEventListener("change", () => {
        const settingName = checkbox.id;

        saveSetting(settingName, checkbox.checked);
      });
    });
  }

  function initialize() {
    loadSettings((settings) => {
      applySettings(settings);
      initializeCheckboxes();
    });
  }
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initialize);
  } else {
    initialize();
  }

  // Main ON/OFF switch
  const extensionToggle = document.getElementById("zeroui_on");

  extensionToggle.addEventListener("change", function () {
    setExtensionEnabled(this.checked);
  });

  /**
   * Enables or disables the extension.
   */
  function setExtensionEnabled(isEnabled) {
    htmlElement.setAttribute("zeroui_on", isEnabled);
    saveSetting("enabled", isEnabled);
  }

  // "Off" button simply toggles the main switch.
  document.getElementById("off").addEventListener("click", () => {
    extensionToggle.click();
  });
})
();