const API_URL = "http://localhost:8000";

// Get references to DOM elements
const queryInput = document.getElementById("query");
const searchBtn = document.getElementById("search-btn");
const resultsDiv = document.getElementById("results");
const errorDiv = document.getElementById("error");

// Check for pending query from context menu, otherwise auto-detect
initializeQuery();

// Handle search button click
searchBtn.addEventListener("click", handleSearch);

// Also search when Enter is pressed
queryInput.addEventListener("keypress", (e) => {
  if (e.key === "Enter") {
    handleSearch();
  }
});

/**
 * Initialize the query input.
 * First checks if there's a pending query from context menu,
 * otherwise falls back to auto-detection from the current page.
 */
function initializeQuery() {
  // Check for pending query from context menu
  chrome.storage.local.get(["pendingQuery", "pendingSource", "pendingUrl"], (result) => {
    if (result.pendingQuery) {
      let query = result.pendingQuery;
      let source = result.pendingSource || "selection";

      // If it came from page context, use full smart detection (URL + title)
      if (source === "page" && result.pendingUrl) {
        query = extractProductName(result.pendingUrl, result.pendingQuery) || query;
      } else if (source === "page") {
        // Fallback to just cleaning if no URL
        query = cleanTitle(query);
        query = simplifyTitle(query);
      }

      queryInput.value = query;
      resultsDiv.innerHTML = `<p style="color: #6b7280; font-size: 12px;">From ${source}: "${query}"</p>`;

      // Clear the pending data so it doesn't persist
      chrome.storage.local.remove(["pendingQuery", "pendingSource", "pendingUrl"]);
    } else {
      // No pending query, auto-detect from page
      autoDetectProduct();
    }
  });
}

/**
 * Tries to extract a product name from the current tab's URL and title.
 * This is the "smart" part - we look for clues about what product the user is viewing.
 */
function autoDetectProduct() {
  // Use chrome.tabs API to get current tab info
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (!tabs[0]) return;

    const tab = tabs[0];
    const url = tab.url || "";
    const title = tab.title || "";

    // Try to extract a meaningful product name
    const detected = extractProductName(url, title);

    if (detected) {
      queryInput.value = detected;
      // Show where we detected it from
      resultsDiv.innerHTML = `<p style="color: #6b7280; font-size: 12px;">Detected: "${detected}" from page</p>`;
    }
  });
}

/**
 * Extract product name from URL and title.
 * This uses simple heuristics - we can make it smarter over time.
 */
function extractProductName(url, title) {
  try {
    const urlObj = new URL(url);
    const hostname = urlObj.hostname.replace("www.", "");

    // Strategy 1: Known sites with product info in URL
    // Example: nvidia.com/geforce-now -> "GeForce Now"
    const urlPatterns = [
      { match: /geforce-now/i, name: "GeForce Now" },
      { match: /amazon\.com.*\/dp\//i, name: extractFromTitle(title) },
      { match: /netflix\.com/i, name: "Netflix" },
      // Add more patterns as needed
    ];

    for (const pattern of urlPatterns) {
      if (pattern.match.test(url)) {
        return pattern.name;
      }
    }

    // Strategy 2: For SaaS/product sites, combine company name with product
    // Example: semactic.com with title "The reference GEO tool" -> "Semactic GEO tool"
    const companyName = extractCompanyName(hostname);
    const cleanedTitle = title ? cleanTitle(title) : null;

    if (companyName && cleanedTitle) {
      // Check if title is generic (doesn't contain company name already)
      if (!cleanedTitle.toLowerCase().includes(companyName.toLowerCase())) {
        // Combine: "Semactic" + "GEO tool" = "Semactic GEO tool"
        const simplifiedTitle = simplifyTitle(cleanedTitle);
        return `${companyName} ${simplifiedTitle}`;
      }
    }

    // Strategy 3: Just use cleaned title
    if (cleanedTitle) {
      return cleanedTitle;
    }

    // Fallback: use company name alone
    return companyName;
  } catch (e) {
    return null;
  }
}

/**
 * Extract company name from hostname.
 * "semactic.com" -> "Semactic"
 * "sub.example.co.uk" -> "Example"
 */
function extractCompanyName(hostname) {
  // Remove common TLDs and subdomains
  const parts = hostname.split(".");

  // Handle cases like "co.uk", "com.au"
  const commonSuffixes = ["com", "co", "org", "net", "io", "ai", "app", "dev"];

  // Find the main company name (usually first non-suffix part from the end)
  for (let i = parts.length - 2; i >= 0; i--) {
    if (!commonSuffixes.includes(parts[i])) {
      // Capitalize first letter
      return parts[i].charAt(0).toUpperCase() + parts[i].slice(1);
    }
  }

  return parts[0];
}

/**
 * Simplify generic titles by removing filler/marketing words.
 * "Proactive Customer Success & Churn Prediction for SaaS" -> "Churn Prediction"
 */
function simplifyTitle(title) {
  let simplified = title;

  // Remove leading articles and generic words
  const fillerPrefixes = [
    "The reference ", "The best ", "The #1 ", "The ", "A ", "An ",
    "Official ", "Welcome to ", "Home - ", "Homepage - ",
    "Proactive ", "Ultimate ", "Advanced ", "Smart ", "Intelligent ",
  ];

  for (const filler of fillerPrefixes) {
    if (simplified.toLowerCase().startsWith(filler.toLowerCase())) {
      simplified = simplified.slice(filler.length);
    }
  }

  // Remove marketing buzzwords entirely
  const buzzwords = [
    "Customer Success", "World-Class", "Enterprise-Grade", "Next-Gen",
    "AI-Powered", "Revolutionary", "Innovative", "Cutting-Edge",
    "Best-in-Class", "Industry-Leading", "Seamless", "Robust",
  ];

  for (const buzz of buzzwords) {
    // Remove buzzword and any following " & " or ", "
    const patterns = [
      new RegExp(buzz + " & ", "gi"),
      new RegExp(buzz + ", ", "gi"),
      new RegExp(" & " + buzz, "gi"),
      new RegExp(", " + buzz, "gi"),
      new RegExp(buzz, "gi"),
    ];
    for (const pattern of patterns) {
      simplified = simplified.replace(pattern, "");
    }
  }

  // Remove trailing generic phrases
  const trailingSuffixes = [
    " for SaaS", " for Teams", " for Business", " for Enterprise",
    " for Startups", " for Everyone", " Platform", " Software",
    " Solution", " Solutions", " Tool", " Tools",
  ];

  for (const suffix of trailingSuffixes) {
    if (simplified.toLowerCase().endsWith(suffix.toLowerCase())) {
      simplified = simplified.slice(0, -suffix.length);
    }
  }

  // Clean up any leftover artifacts
  simplified = simplified
    .replace(/\s+/g, " ")      // Multiple spaces -> single space
    .replace(/^[\s&,]+/, "")   // Leading separators
    .replace(/[\s&,]+$/, "")   // Trailing separators
    .trim();

  // If result is too long (>40 chars), just take first few words
  if (simplified.length > 40) {
    const words = simplified.split(" ");
    simplified = words.slice(0, 3).join(" ");
  }

  return simplified;
}

/**
 * Clean a page title to extract just the product name.
 * "GeForce NOW Cloud Gaming | NVIDIA" -> "GeForce NOW Cloud Gaming"
 */
function cleanTitle(title) {
  let cleaned = title;

  // Remove common prefixes (like "Amazon.com: ")
  const prefixes = ["Amazon.com: ", "Amazon.co.uk: ", "Amazon.ca: "];
  for (const prefix of prefixes) {
    if (cleaned.startsWith(prefix)) {
      cleaned = cleaned.slice(prefix.length);
      break;
    }
  }

  // Remove common separators and everything after them
  const separators = [" | ", " - ", " – ", " — ", " :: "];

  for (const sep of separators) {
    if (cleaned.includes(sep)) {
      // Take the first part (usually the product name)
      const parts = cleaned.split(sep);
      return parts[0].trim();
    }
  }

  // If no separator, return the title as-is (truncated if too long)
  return cleaned.length > 50 ? cleaned.substring(0, 50) : cleaned;
}

/**
 * Extract product name from Amazon-style titles.
 * Amazon titles are long, so we take the first meaningful chunk.
 */
function extractFromTitle(title) {
  // Amazon titles: "Product Name, Details, More Details..."
  const parts = title.split(",");
  if (parts.length > 0) {
    return parts[0].trim();
  }
  return title;
}

async function handleSearch() {
  const query = queryInput.value.trim();

  // Validate input
  if (!query) {
    showError("Please enter a product or software name");
    return;
  }

  // Clear previous results and errors
  resultsDiv.innerHTML = "";
  hideError();

  // Disable button while loading
  searchBtn.disabled = true;
  searchBtn.textContent = "Searching...";

  try {
    // Make request to our backend
    const response = await fetch(`${API_URL}/research?query=${encodeURIComponent(query)}`);

    if (!response.ok) {
      throw new Error(`Server error: ${response.status}`);
    }

    const data = await response.json();
    displayResults(data);

  } catch (err) {
    showError(`Failed to research: ${err.message}`);
  } finally {
    // Re-enable button
    searchBtn.disabled = false;
    searchBtn.textContent = "Research";
  }
}

function displayResults(data) {
  resultsDiv.innerHTML = `
    <p><strong>Query:</strong> ${data.query}</p>
    <p><strong>Status:</strong> ${data.status}</p>
    <p><strong>Summary:</strong> ${data.data.summary}</p>
    <p style="color: #6b7280; font-size: 12px; margin-top: 8px;">
      Reddit integration coming soon...
    </p>
  `;
}

function showError(message) {
  errorDiv.textContent = message;
  errorDiv.classList.remove("hidden");
}

function hideError() {
  errorDiv.classList.add("hidden");
}
