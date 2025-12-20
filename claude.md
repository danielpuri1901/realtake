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

## Core Features

### Phase 1: Foundation ✅
- [x] Chrome extension scaffold
- [x] Smart product detection from URL/title
- [x] Marketing buzzword stripping
- [x] Context menu (right-click support)
- [x] FastAPI backend with /research endpoint

### Phase 2: Reddit Integration (Current)
1. **Reddit API Setup**
   - PRAW integration
   - Search: `"{product}" (review OR worth it OR recommend OR experience)`

2. **Smart Subreddit Targeting**
   - Detect product category → search relevant subreddits
   - SaaS: r/SaaS, r/software, r/selfhosted, r/Entrepreneur
   - Gaming: r/gaming, r/cloudgaming, r/pcgaming, r/patientgamers
   - Productivity: r/productivity, r/NotionSo, r/ObsidianMD

3. **Return Real Discussions**
   - Top posts mentioning the product
   - Upvote counts, comment counts
   - Direct links to discussions

### Phase 3: Opinion Analysis
1. **Structured Output**
   ```
   RealTake: GeForce Now
   ─────────────────────
   📊 47 discussions, 234 comments analyzed

   ✅ WORKS FOR:
   • Steam cloud saves sync perfectly (12 mentions)
   • Great for non-competitive games (8 mentions)

   ⚠️ WATCH OUT FOR:
   • Input lag on competitive FPS (15 mentions)
   • Game library rotates (7 mentions)

   🔄 ALTERNATIVES MENTIONED:
   • Xbox Cloud Gaming (7 mentions)
   • Shadow PC (4 mentions)

   💬 TOP COMMENT:
   "Been using it for 6 months, perfect for RPGs..."
   — u/gamer123 (+847 upvotes)
   ```

2. **Sentiment Categorization**
   - Positive use cases ("works great for...")
   - Limitations ("doesn't work with...")
   - Alternatives ("I switched to...")
   - Long-term experience ("after 6 months...")

### Phase 4: Polish
- Caching (24hr for same product)
- Loading states
- Error handling
- Extension icon/branding

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
