# RealTake - Real Opinions for Digital Purchases

## The Problem We Solve

**SaaS, subscriptions, and digital products have no built-in review system.**

| Product Type | Has Reviews? | Reality |
|--------------|--------------|---------|
| Amazon/Physical | Yes (but often fake) | Solved (Fakespot, etc.) |
| **SaaS** | No - just testimonials | **Unsolved** |
| **Subscriptions** | No | **Unsolved** |
| **Games/Digital** | Steam (curated) | **Partially solved** |

When evaluating Notion vs Obsidian, GeForce Now vs Xbox Cloud, or any SaaS tool - you get:
- Marketing pages with cherry-picked testimonials
- G2/Capterra reviews (pay-to-play, often incentivized)
- **Reddit** - where real, unfiltered opinions live

**RealTake surfaces Reddit opinions instantly when you're on a product page.**

## Our Differentiation

We are NOT competing with:
- Fakespot/ReviewMeta (Amazon fake review detection)
- Honey/Rakuten (shopping & coupons)
- Pigeon (generic Reddit summaries for any page)

We ARE building:
- **Niche focus**: SaaS, subscriptions, digital products, games
- **Purchase-decision framing**: "Is this worth it?" not just "what do people say?"
- **Smart subreddit targeting**: r/SaaS, r/software, r/gaming, r/cloudgaming, etc.
- **Structured output**: Pros, Cons, Alternatives, Dealbreakers

## Target Users

- Developer evaluating tools (Cursor vs Copilot vs Windsurf)
- Gamer considering subscriptions (GeForce Now vs Xbox Cloud vs PS Plus)
- Business person looking at SaaS (Notion vs Obsidian vs Roam)
- Anyone buying something **without a review system built-in**

## Tech Stack

### Browser Extension (Chrome/Manifest V3)
- **Language:** JavaScript (TypeScript later)
- **UI:** Vanilla CSS
- **Features:** Auto-detect product, context menu, smart title parsing

### Python Backend
- **Framework:** FastAPI
- **Reddit:** PRAW (Python Reddit API Wrapper)
- **NLP:** spaCy or NLTK for sentiment/categorization
- **ML:** scikit-learn for comment quality scoring (later)

### Deployment
- **Backend:** Railway, Render, or Fly.io
- **Extension:** Chrome Web Store

## Progress Checklist

### COMPLETED ✅

**Extension (Chrome Manifest V3)**
- [x] manifest.json with permissions (activeTab, contextMenus, storage)
- [x] popup.html/css/js - main UI
- [x] service-worker.js - context menu (right-click to research)
- [x] Auto-detect product from current page URL
- [x] Smart product name extraction from domain (n8n.io → "N8n")
- [x] Discussion cards with best comments per post
- [x] Click-through to Reddit threads

**Backend (FastAPI)**
- [x] /research endpoint
- [x] Reddit public JSON API (no auth required)
- [x] Multiple search queries with variations ("Basic-fit", "Basic fit")
- [x] Search with opinion keywords (worth, review, experience, recommend)
- [x] Comment quality scoring (personal experience, specifics, verdicts)
- [x] Best comment extraction per post
- [x] Name variation handling (hyphens, spaces)
- [x] Deduplication of posts
- [x] Pros/cons extraction (basic)
- [x] Alternatives extraction (capitalized product names)
- [x] Verdict generation (positive/negative/mixed)

### TODO - Polish Before Launch 🔧

**Backend Improvements**
- [ ] Remove debug logging (clean output)
- [ ] Improve pros/cons extraction (often shows "No clear pros/cons")
- [ ] Better verdict accuracy
- [ ] Error handling (timeouts, rate limits)
- [ ] Add request caching (don't hit Reddit for same query twice)

**Extension Improvements**
- [ ] Add extension icon (16x16, 48x48, 128x128)
- [ ] Loading spinner/skeleton UI
- [ ] Error states (no results, API down)
- [ ] "Search again" button
- [ ] Keyboard shortcut to open

**UI Polish**
- [ ] Better empty states
- [ ] Truncate long titles gracefully
- [ ] Mobile-friendly popup width

### TODO - Deployment 🚀

**Backend Deployment**
- [ ] Deploy to Railway/Render/Fly.io
- [ ] Update extension API_URL from localhost to production
- [ ] Add environment variables for config
- [ ] Set up CORS for production domain

**Chrome Web Store**
- [ ] Create developer account ($5 one-time fee)
- [ ] Create promotional images (440x280, 1280x800)
- [ ] Write store description
- [ ] Privacy policy (required)
- [ ] Submit for review

### FUTURE FEATURES 🔮

- [ ] Google Custom Search API (better Reddit discovery)
- [ ] Subreddit-specific targeting (r/SaaS, r/software)
- [ ] User accounts / history
- [ ] Firefox extension
- [ ] Safari extension

## Project Structure

```
realtake/
├── extension/           # Chrome extension
│   ├── manifest.json
│   ├── popup.html/css/js
│   └── service-worker.js
│
├── backend/             # Python API
│   ├── main.py
│   ├── requirements.txt
│   └── reddit/          # Reddit integration (coming)
│
└── CLAUDE.md
```

## Resources

### Reddit API
- Get credentials: https://www.reddit.com/prefs/apps
- PRAW docs: https://praw.readthedocs.io/

### Subreddit Research
- r/SaaS, r/software, r/selfhosted
- r/gaming, r/cloudgaming, r/pcgaming
- r/productivity, r/Entrepreneur

## Competitive Landscape

| Competitor | Focus | Our Advantage |
|------------|-------|---------------|
| Pigeon | Generic Reddit summaries | We're niche (SaaS/digital only) |
| Find on Reddit | Just finds threads | We analyze & structure output |
| G2/Capterra | B2B reviews (incentivized) | We surface raw Reddit opinions |
| Fakespot | Amazon fake reviews | Different market entirely |

## Success Metrics

- Can detect product name correctly on 90%+ of SaaS pricing pages
- Returns relevant Reddit discussions in <3 seconds
- Structured output helps user make decision faster than manual Reddit search
