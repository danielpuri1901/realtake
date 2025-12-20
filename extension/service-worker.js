/**
 * Service Worker for Reddit Check
 *
 * This runs in the background and handles:
 * - Creating the right-click context menu
 * - Responding to menu clicks
 */

// Create context menu when extension is installed
chrome.runtime.onInstalled.addListener(() => {
  // Menu item that appears when you right-click on a page
  chrome.contextMenus.create({
    id: "reddit-check-page",
    title: "Reddit Check this page",
    contexts: ["page"]  // Shows when right-clicking on the page background
  });

  // Menu item that appears when you right-click on selected text
  chrome.contextMenus.create({
    id: "reddit-check-selection",
    title: 'Reddit Check "%s"',  // %s gets replaced with selected text
    contexts: ["selection"]  // Shows when text is selected
  });

  console.log("Reddit Check: Context menus created");
});

// Handle context menu clicks
chrome.contextMenus.onClicked.addListener((info, tab) => {
  let query = "";
  let source = "";
  let url = "";

  if (info.menuItemId === "reddit-check-selection") {
    // User selected text and right-clicked
    query = info.selectionText;
    source = "selection";
  } else if (info.menuItemId === "reddit-check-page") {
    // User right-clicked on page - we'll use the page title + URL
    query = tab.title || "";
    url = tab.url || "";
    source = "page";
  }

  if (query) {
    // Store the query, source, and URL so the popup can read it
    chrome.storage.local.set({
      pendingQuery: query,
      pendingSource: source,
      pendingUrl: url
    }, () => {
      // Open the popup
      // Note: We can't directly open the popup from service worker,
      // so we open it in a new tab or use action.openPopup (Chrome 99+)
      chrome.action.openPopup();
    });
  }
});
