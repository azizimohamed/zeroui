(() => {
  "use strict";

  const browserApi =
    typeof browser === "object" && typeof browser.runtime === "object"
      ? browser
      : chrome;

  const storage =
    typeof browserApi.storage.sync === "object"
      ? browserApi.storage.sync
      : browserApi.storage.local;

  const rootElement = document.documentElement;
  const emojiRegex = /\p{Extended_Pictographic}/gu;
  const originalTextCache = new Map();

  let faviconObserver = null;

  /**
   * Starts observing favicon changes.
   *
   */
  function startFaviconObserver() {
    if (faviconObserver) {
      return;
    }

    faviconObserver = new MutationObserver(() => {
      hideFavicon();
    });

    faviconObserver.observe(document.documentElement, {
      childList: true,
      subtree: true,
    });
  }

  /**
   * Stops observing favicon changes.
   *
   */
  function stopFaviconObserver() {
    if (!faviconObserver) {
      return;
    }

    faviconObserver.disconnect();
    faviconObserver = null;
  }

  /**
   * Hides the favicon by replacing it with a blank icon and observing for changes.
   * If the favicon is changed, it will be replaced again with the blank icon.
   */
  function hideFavicon() {
    startFaviconObserver();

    document
      .querySelectorAll('link[rel*="icon"]:not([data-zeroui-favicon])')
      .forEach((icon) => {
        if (!icon.dataset.zerouiOriginalRel) {
          icon.dataset.zerouiOriginalRel = icon.getAttribute("rel");
        }

        icon.setAttribute("rel", "zeroui-disabled-icon");
      });

    let blankIcon = document.querySelector('link[data-zeroui-favicon="true"]');

    if (!blankIcon) {
      blankIcon = document.createElement("link");

      blankIcon.rel = "icon";
      blankIcon.type = "image/png";
      blankIcon.dataset.zerouiFavicon = "true";

      blankIcon.href =
        "data:image/png;base64," +
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=";

      document.head.appendChild(blankIcon);
    }
  }

  /**
   * Restores the original favicon by removing the blank icon and restoring the original rel attributes.
   */
  function showFavicon() {
    stopFaviconObserver();

    document
      .querySelectorAll("link[data-zeroui-original-rel]")
      .forEach((icon) => {
        icon.setAttribute("rel", icon.dataset.zerouiOriginalRel);

        delete icon.dataset.zerouiOriginalRel;
      });

    document
      .querySelectorAll('link[data-zeroui-favicon="true"]')
      .forEach((icon) => {
        icon.remove();
      });
  }

  /**
   * removes emojis from all text nodes in the document and caches the original text for restoration later.
   */
  function removeEmojis() {
    const walker = document.createTreeWalker(
      rootElement,
      NodeFilter.SHOW_TEXT,
      null,
    );

    let currentNode;
    while ((currentNode = walker.nextNode())) {
      const originalText = currentNode.nodeValue;

      // Only process if the text actually contains emojis
      if (emojiRegex.test(originalText)) {
        // Save original text if not already cached
        if (!originalTextCache.has(currentNode)) {
          originalTextCache.set(currentNode, originalText);
        }
        // Strip emojis
        currentNode.nodeValue = originalText.replace(emojiRegex, "");
      }
    }
  }

  /**
   * Restores the original text for all text nodes that had emojis removed, using the cached values.
   */
  function unremoveEmojis() {
    // Restore text for every saved node
    originalTextCache.forEach((originalText, textNode) => {
      // Check if the node is still in the document
      if (textNode.parentNode) {
        textNode.nodeValue = originalText;
      }
    });

    // Clear cache after restoration
    originalTextCache.clear();
  }

  /**
   * Apply all "hide*" settings as attributes on <html>.
   */
  function applyHideSettings(settings) {
    Object.keys(settings).forEach((key) => {
      if (key.includes("hide")) {
        rootElement.setAttribute(key, settings[key]);
      }
    });

    if (settings.hide_favicon === true) {
      hideFavicon();
    }

    if (settings.hide_emojis === true) {
      removeEmojis();
    }
  }

  /**
   * Remove all "hide*" attributes from <html>.
   */
  function removeHideSettings(settings) {
    Object.keys(settings).forEach((key) => {
      if (key.includes("hide")) {
        rootElement.removeAttribute(key);
      }
    });
  }

  /**
   * Read from the preferred storage area.
   * Falls back to local storage when the preferred area fails.
   */
  function getStorageValue(callback, key = null, args = []) {
    storage.get(key, (result) => {
      if (!browserApi.runtime.lastError) {
        callback(result, ...args);
        return;
      }

      browserApi.storage.local.get(key, (localResult) => {
        callback(localResult, ...args);
      });
    });
  }

  function initialize(settings) {
    if (settings.enabled === true) {
      applyHideSettings(settings);
    }
  }

  /**
   * Handle storage changes.
   */
  function handleStorageChanges(changes) {
    if (Object.prototype.hasOwnProperty.call(changes, "enabled")) {
      if (changes.enabled.newValue) {
        getStorageValue(applyHideSettings);
      } else {
        getStorageValue(removeHideSettings);

        unremoveEmojis();
        showFavicon();
      }

      return;
    }

    if (Object.prototype.hasOwnProperty.call(changes, "hide_favicon")) {
      if (changes.hide_favicon.newValue) {
        hideFavicon();
      } else {
        showFavicon();
      }

      return;
    }

    if (Object.prototype.hasOwnProperty.call(changes, "hide_emojis")) {
      if (changes.hide_emojis.newValue) {
        removeEmojis();
      } else {
        unremoveEmojis();
      }

      return;
    }

    Object.keys(changes).forEach((key) => {
      if (key.includes("hide")) {
        rootElement.setAttribute(key, changes[key].newValue);
      }
    });
  }

  /**
   * Start the extension and listen for setting changes.
   */
  function start() {
    getStorageValue(initialize);

    browserApi.storage.onChanged.addListener(handleStorageChanges);
  }

  if (document.ZeroUiRunning) {
    return;
  }

  document.ZeroUiRunning = true;

  if (window === window.parent) {
    start();
    return;
  }
})();
