# ResearchBuddy - Smart Purchase Research Assistant

  ## Project Overview
  A Chrome extension + Python backend that helps users research products/software before buying. The killer feature: **searches Reddit for real human opinions** - not just Amazon reviews which can be
  fake. Answers the real question: "Does this actually get the job done?"

  Works for:
  - Physical products (Amazon, etc.)
  - Software/subscriptions (GeForce Now, VPNs, apps)
  - Services (anything people discuss on Reddit)

  ## Scope
  - **Platform:** Chrome extension
  - **AI approach:** Local models (scikit-learn, NLTK/spaCy)
  - **User system:** None (stateless tool)
  - **Timeline:** Side project over several weeks

  ## Tech Stack

  ### Browser Extension (Chrome/Manifest V3)
  - **Language:** TypeScript
  - **Build:** Vite or Webpack
  - **UI:** Vanilla CSS or Tailwind (keep it simple)

  ### Python Backend
  - **Framework:** FastAPI
  - **ML:** scikit-learn, pandas, numpy
  - **NLP:** NLTK or spaCy (for text processing)
  - **HTTP:** httpx or aiohttp (async scraping)
  - **Database:** SQLite (simple, file-based, no server needed)

  ### Deployment
  - **Backend:** Railway, Render, or Fly.io (free tiers available)
  - **Extension:** Chrome Web Store (or local dev)

  ## Core Features (Priority Order)

  ### Phase 1: Foundation (Week 1)
  1. **Chrome Extension Scaffold**
     - Manifest V3 setup
     - Works on ANY page (user can trigger research on any product/software)
     - Popup UI with search input + results display
     - Background service worker for API calls
     - Context menu: "Research this with ResearchBuddy"

  2. **Python Backend Scaffold**
     - FastAPI project structure
     - Basic endpoint: `/research` accepts product name/query
     - Docker setup for consistent dev environment

  ### Phase 2: Reddit Search - THE CORE FEATURE (Week 1-2)
  1. **Reddit API Integration**
     - Use Reddit API (free tier: 100 requests/min)
     - Or use Pushshift API for historical data
     - Search query: `"{product name}" (review OR worth it OR recommend OR experience)`

  2. **Smart Search Queries**
     - Auto-generate search variations:
       - "GeForce Now worth it"
       - "GeForce Now vs Shadow"
       - "GeForce Now steam cloud save"
       - "GeForce Now honest review reddit"
     - Target subreddits: r/buildapc, r/gaming, r/software, r/BuyItForLife, etc.

  3. **Comment Quality Scoring (Random Forest)**
     - Features:
       - Comment karma score
       - Account age
       - Comment length (detail = good)
       - Has specific details vs generic praise
       - Author's subreddit karma (domain expertise)
       - Upvote/downvote ratio
     - Filter out low-quality/joke comments
     - Surface the most helpful opinions

  4. **Extract Key Insights**
     - NLP to categorize comments:
       - "Works great for..." (positive use cases)
       - "Doesn't work with..." (limitations)
       - "I switched to..." (alternatives mentioned)
       - "After 6 months..." (long-term experience)
     - Answer common questions:
       - "Does it get the job done?" (overall sentiment)
       - "What are the dealbreakers?"
       - "What alternatives do people recommend?"

  ### Phase 3: Opinion Summarization (Week 2-3)
  1. **Aggregate Reddit Opinions**
     - Cluster similar opinions
     - Count frequency of pros/cons mentioned
     - Find consensus vs controversial points

  2. **Smart Summary Output**
     - Reddit Consensus (47 discussions, 234 comments analyzed)
     - WORKS FOR: Steam cloud saves sync perfectly (12 mentions)
     - WATCH OUT FOR: Input lag on competitive games (15 mentions)
     - ALTERNATIVES MENTIONED: Xbox Cloud Gaming (7 mentions)
     - MOST HELPFUL COMMENT with author and upvotes

  ### Phase 4: Amazon Integration (Week 3)
  1. **Detect Amazon Product Pages**
     - Content script recognizes Amazon URLs
     - Auto-extract product name for Reddit search

  2. **Fake Review Detection (Random Forest)**
     - Secondary feature (Reddit opinions are primary)
     - Quick trust score for Amazon reviews

  3. **Combine Sources**
     - Show both Reddit opinions AND Amazon review summary
     - Highlight discrepancies

  ### Phase 5: Polish & UX (Week 4)
  1. **Extension Popup UI**
     - Search bar: "What are you thinking of buying?"
     - Results tabs: Reddit | Amazon | Price
     - Expandable comment cards with source links

  2. **Quick Actions**
     - Right-click any product name → "Research on Reddit"
     - Keyboard shortcut to research selected text

  3. **Smart Caching**
     - Cache Reddit results for 24 hours

  ## Resources to Get Started

  ### Reddit API
  - Reddit API Docs: https://www.reddit.com/dev/api/
  - PRAW (Python Reddit API Wrapper): https://praw.readthedocs.io/
  - Get credentials: https://www.reddit.com/prefs/apps

  ### Browser Extensions
  - Chrome Extension Docs: https://developer.chrome.com/docs/extensions/mv3/
  - Plasmo Framework: https://docs.plasmo.com/

  ### FastAPI
  - FastAPI Tutorial: https://fastapi.tiangolo.com/tutorial/

  ### NLP & ML
  - NLTK Book: https://www.nltk.org/book/
  - TextBlob: https://textblob.readthedocs.io/
  - scikit-learn Random Forest docs

  ## Next Steps
  1. Get Reddit API access - Create app at reddit.com/prefs/apps
  2. Set up dev environment - Python 3.11+, Node 18+
  3. Create GitHub repo with project structure
  4. Week 1 goal: Extension popup + Reddit search working end-to-end
