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
 * Simple approach: for SaaS, the domain name IS the product name.
 */
function extractProductName(url, title) {
  try {
    const urlObj = new URL(url);
    const hostname = urlObj.hostname.replace("www.", "");

    // For most SaaS sites, just use the domain name
    // mailgun.com -> "Mailgun", n8n.io -> "n8n", notion.so -> "Notion"
    const companyName = extractCompanyName(hostname);

    // Special case: Amazon product pages - use the title
    if (/amazon\.(com|co\.uk|ca|de)/.test(hostname) && title) {
      return extractFromTitle(title);
    }

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
 * Extract just the product name from marketing fluff.
 * "N8n AI Workflow Automation Platform" -> "N8n"
 * "GeForce Now Cloud Gaming" -> "GeForce Now"
 * "Slack Team Communication Tool" -> "Slack"
 */
function simplifyTitle(title) {
  // Generic words that are never the product name
  const genericWords = new Set([
    // Marketing fluff
    "ai", "platform", "software", "tool", "tools", "solution", "solutions", "app", "application",
    "automation", "workflow", "management", "system", "service", "services", "cloud", "online",
    "team", "business", "enterprise", "pro", "professional", "premium", "free", "the", "best",
    "top", "leading", "powerful", "simple", "easy", "fast", "secure", "modern", "new",
    "communication", "collaboration", "productivity", "analytics", "data", "customer", "sales",
    "marketing", "crm", "erp", "saas", "b2b", "b2c", "for", "and", "with", "your",
    // Common prefixes/suffixes
    "official", "welcome", "home", "homepage", "proactive", "ultimate", "advanced", "smart",
    "intelligent", "revolutionary", "innovative", "cutting-edge", "world-class", "enterprise-grade",
    "next-gen", "best-in-class", "industry-leading", "seamless", "robust",
    // Integration/connection words
    "integration", "integrations", "connect", "api", "apis", "open", "source", "opensource",
  ]);

  const words = title.split(/\s+/);
  const productWords = [];

  for (const word of words) {
    // Clean the word of punctuation for checking
    const cleanWord = word.replace(/[^a-zA-Z0-9]/g, "").toLowerCase();

    // Skip empty words (pure punctuation like "&", "-", "|")
    if (cleanWord.length === 0) {
      continue;
    }
    // Skip generic words
    if (genericWords.has(cleanWord)) {
      continue;
    }
    // Skip very short words (unless it's the first/only word)
    if (cleanWord.length <= 2 && productWords.length > 0) {
      continue;
    }
    // Keep this word as part of product name
    productWords.push(word);
    // Most product names are 1-2 words, stop after 2 meaningful words
    if (productWords.length >= 2) {
      break;
    }
  }

  // If we extracted nothing, find the first non-generic word
  if (productWords.length === 0) {
    for (const word of words) {
      const cleanWord = word.replace(/[^a-zA-Z0-9]/g, "").toLowerCase();
      if (cleanWord.length > 0 && !genericWords.has(cleanWord)) {
        productWords.push(word);
        break;
      }
    }
  }

  // Last resort: just return the first word with actual letters
  if (productWords.length === 0 && words.length > 0) {
    for (const word of words) {
      const cleanWord = word.replace(/[^a-zA-Z0-9]/g, "");
      if (cleanWord.length > 0) {
        productWords.push(cleanWord);
        break;
      }
    }
  }

  return productWords.join(" ");
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
  if (!data.posts || data.posts.length === 0) {
    resultsDiv.innerHTML = `<p class="no-results">No Reddit discussions found for "${data.query}"</p>`;
    return;
  }

  // Build verdict section
  const verdictClass = data.verdict.includes("recommended") ? "positive" :
                       data.verdict.includes("negative") ? "negative" : "neutral";

  // Build pros list
  const prosHtml = data.pros && data.pros.length > 0
    ? data.pros.map(pro => `<li>${escapeHtml(pro)}</li>`).join("")
    : "<li class='empty'>No clear pros found</li>";

  // Build cons list
  const consHtml = data.cons && data.cons.length > 0
    ? data.cons.map(con => `<li>${escapeHtml(con)}</li>`).join("")
    : "<li class='empty'>No clear cons found</li>";

  // Build alternatives
  const altHtml = data.alternatives && data.alternatives.length > 0
    ? data.alternatives.map(alt => `<span class="alt-tag">${escapeHtml(alt)}</span>`).join("")
    : "<span class='empty'>None mentioned</span>";

  // Build top comment
  const topCommentHtml = data.top_comment
    ? `<div class="top-comment">
         <div class="comment-body">"${escapeHtml(truncate(data.top_comment.body, 500))}"</div>
         <div class="comment-meta">— u/${data.top_comment.author} (▲ ${formatNumber(data.top_comment.score)})</div>
       </div>`
    : "";

  // Build discussions with best comments (primary content)
  const discussionsHtml = data.posts.map(post => {
    const bestComment = post.best_comment;
    const commentHtml = bestComment
      ? `<div class="best-answer">
           <div class="best-answer-label">Best answer:</div>
           <div class="best-answer-body">"${escapeHtml(truncate(bestComment.body, 300))}"</div>
           <div class="best-answer-meta">— u/${bestComment.author} (▲ ${formatNumber(bestComment.score)})</div>
         </div>`
      : `<div class="no-answer">Click to see ${post.num_comments} comments</div>`;

    return `
      <a href="${post.url}" target="_blank" class="discussion-card">
        <div class="discussion-question">${escapeHtml(post.title)}</div>
        <div class="discussion-meta">
          <span class="subreddit">r/${post.subreddit}</span>
          <span class="dot">•</span>
          <span class="score">▲ ${formatNumber(post.score)}</span>
          <span class="dot">•</span>
          <span class="comments">${post.num_comments} comments</span>
        </div>
        ${commentHtml}
      </a>
    `;
  }).join("");

  resultsDiv.innerHTML = `
    <div class="analysis-section">
      <div class="verdict ${verdictClass}">${data.verdict}</div>
      <div class="stats">${data.posts_analyzed} posts, ${data.comments_analyzed} comments analyzed</div>
    </div>

    <div class="section">
      <div class="section-title">What people are saying</div>
      <div class="discussions-list">${discussionsHtml}</div>
    </div>

    <div class="section">
      <div class="section-title pros-title">✓ Pros</div>
      <ul class="pros-list">${prosHtml}</ul>
    </div>

    <div class="section">
      <div class="section-title cons-title">✗ Cons</div>
      <ul class="cons-list">${consHtml}</ul>
    </div>

    <div class="section">
      <div class="section-title">Alternatives mentioned</div>
      <div class="alternatives">${altHtml}</div>
    </div>
  `;
}

function truncate(text, maxLength) {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + "...";
}

function formatNumber(num) {
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + "k";
  }
  return num.toString();
}

function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

function showError(message) {
  errorDiv.textContent = message;
  errorDiv.classList.remove("hidden");
}

function hideError() {
  errorDiv.classList.add("hidden");
}
