from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import httpx
import re
from collections import Counter

app = FastAPI(title="RealTake API", description="Real Reddit opinions for SaaS & subscriptions")

# Allow requests from Chrome extension
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, restrict this
    allow_methods=["GET"],
    allow_headers=["*"],
)

# Reddit public JSON endpoint
REDDIT_SEARCH_URL = "https://www.reddit.com/search.json"

# User-Agent is REQUIRED by Reddit - they block requests without it
HEADERS = {
    "User-Agent": "RealTake/0.1 (Chrome Extension for SaaS research)"
}

# Keywords for sentiment analysis
POSITIVE_KEYWORDS = [
    "love it", "worth it", "recommend", "great", "amazing", "excellent",
    "perfect", "best", "fantastic", "works great", "works well", "no issues",
    "happy with", "glad i", "definitely worth", "highly recommend", "game changer",
    "must have", "can't live without", "exceeded expectations"
]

NEGATIVE_KEYWORDS = [
    "not worth", "don't buy", "avoid", "terrible", "awful", "waste of money",
    "disappointing", "frustrated", "regret", "horrible", "useless", "broken",
    "doesn't work", "poor", "worst", "hate", "cancelled", "refund", "scam",
    "overpriced", "not recommended", "stay away"
]

# Patterns to find alternatives - capture up to 3 words (product names can be multi-word)
ALTERNATIVE_PATTERNS = [
    r"switched to ([A-Z][a-zA-Z0-9]*(?:\s+[A-Z][a-zA-Z0-9]*){0,2})",
    r"moved to ([A-Z][a-zA-Z0-9]*(?:\s+[A-Z][a-zA-Z0-9]*){0,2})",
    r"try ([A-Z][a-zA-Z0-9]*(?:\s+[A-Z][a-zA-Z0-9]*){0,2}) instead",
    r"use ([A-Z][a-zA-Z0-9]*(?:\s+[A-Z][a-zA-Z0-9]*){0,2}) instead",
    r"recommend ([A-Z][a-zA-Z0-9]*(?:\s+[A-Z][a-zA-Z0-9]*){0,2})",
    r"([A-Z][a-zA-Z0-9]*(?:\s+[A-Z][a-zA-Z0-9]*){0,2}) is better",
    r"prefer ([A-Z][a-zA-Z0-9]*(?:\s+[A-Z][a-zA-Z0-9]*){0,2}) over",
]

# Words that are never product names
NOT_PRODUCTS = {
    "i", "the", "a", "an", "it", "this", "that", "they", "them", "you", "we", "my", "your",
    "just", "maybe", "also", "actually", "really", "definitely", "probably", "personally",
    "something", "anything", "nothing", "everything", "everyone", "someone", "anyone",
    "here", "there", "now", "then", "today", "yesterday", "tomorrow", "always", "never",
    "yes", "no", "not", "but", "and", "or", "if", "so", "very", "much", "more", "less",
    "good", "bad", "great", "best", "better", "worse", "worst", "nice", "fine", "ok",
    "some", "any", "all", "most", "many", "few", "other", "another", "same", "different",
}

# Signals that indicate an insightful, personal comment
QUALITY_SIGNALS = {
    # Personal experience indicators
    "experience": [
        r"i have been using",
        r"i've been using",
        r"been using it for",
        r"after \d+ (month|year|week|day)",
        r"for \d+ (month|year|week|day)",
        r"my experience",
        r"in my opinion",
        r"personally",
    ],
    # Specific details (numbers, specs, prices)
    "specifics": [
        r"\$\d+",           # Prices
        r"\d+fps",          # Frame rates
        r"\d+p",            # Resolutions (1080p, 1440p)
        r"\d+gb",           # Memory/storage
        r"\d+hz",           # Refresh rates
        r"\d{4}x\d+",       # Resolutions (1920x1080)
    ],
    # Clear verdicts
    "verdict": [
        r"definitely worth",
        r"totally worth",
        r"absolutely worth",
        r"not worth",
        r"highly recommend",
        r"can't recommend",
        r"would recommend",
        r"wouldn't recommend",
        r"blown away",
        r"game changer",
        r"waste of money",
    ],
    # Comparison context
    "comparison": [
        r"compared to",
        r"vs\.?",
        r"instead of",
        r"better than",
        r"worse than",
        r"on the other hand",
        r"keep in mind",
    ],
}


@app.get("/")
def root():
    """Health check endpoint."""
    return {"status": "ok", "message": "RealTake API is running"}


def extract_product_name(query: str) -> str:
    """
    Extract the core product name from marketing fluff.
    "N8n AI Workflow Automation Platform" -> "n8n"
    "GeForce Now Cloud Gaming" -> "GeForce Now"
    "Slack Team Communication Tool" -> "Slack"
    """
    # Generic words that are never the product name
    generic_words = {
        # Intent words (what user typed)
        "pricing", "price", "cost", "review", "reviews", "worth", "alternative", "alternatives",
        # Marketing fluff (from page titles)
        "ai", "platform", "software", "tool", "tools", "solution", "solutions", "app", "application",
        "automation", "workflow", "management", "system", "service", "services", "cloud", "online",
        "team", "business", "enterprise", "pro", "professional", "premium", "free", "the", "best",
        "top", "leading", "powerful", "simple", "easy", "fast", "secure", "modern", "new",
        "communication", "collaboration", "productivity", "analytics", "data", "customer", "sales",
        "marketing", "crm", "erp", "saas", "b2b", "b2c",
    }

    words = query.split()
    product_words = []

    for word in words:
        # Skip generic words
        if word.lower() in generic_words:
            continue
        # Skip single letters or very short words (unless it's the first/only word)
        if len(word) <= 2 and product_words:
            continue
        # Keep this word as part of product name
        product_words.append(word)
        # Most product names are 1-2 words, stop after 2 meaningful words
        if len(product_words) >= 2:
            break

    # If we extracted nothing, just use the first word
    if not product_words and words:
        product_words = [words[0]]

    return " ".join(product_words)


@app.get("/research")
async def research(query: str, limit: int = 5):
    """
    Search Reddit for discussions and analyze sentiment about a product.

    Args:
        query: The product name to research (e.g., "GeForce Now")
        limit: Max number of posts to analyze (default 5)
    """
    # Extract just the product name from marketing fluff
    product_name = extract_product_name(query)

    print(f"DEBUG: Original query: '{query}', Product name: '{product_name}'")

    # Build name variations for matching later
    name_variations = [product_name.lower()]
    if "-" in product_name:
        name_variations.append(product_name.replace("-", " ").lower())
        name_variations.append(product_name.replace("-", "").lower())
    if " " in product_name:
        name_variations.append(product_name.replace(" ", "-").lower())
        name_variations.append(product_name.replace(" ", "").lower())
    name_variations = list(set(name_variations))

    print(f"DEBUG: Name variations: {name_variations}")

    all_posts = []

    # Multiple search queries - like what people search on Google
    search_queries = [
        f'"{product_name}" worth',           # "Basic-fit" worth
        f'"{product_name}" review',          # "Basic-fit" review
        f'"{product_name}" experience',      # "Basic-fit" experience
        f'"{product_name}" recommend',       # "Basic-fit" recommend
    ]
    # Also try without hyphen if applicable
    if "-" in product_name:
        alt_name = product_name.replace("-", " ")
        search_queries.extend([
            f'"{alt_name}" worth',
            f'"{alt_name}" review',
        ])

    print(f"DEBUG: Search queries: {search_queries}")

    try:
        async with httpx.AsyncClient() as client:
            for sq in search_queries:
                response = await client.get(
                    REDDIT_SEARCH_URL,
                    params={
                        "q": sq,
                        "sort": "relevance",
                        "t": "all",
                        "limit": 25,
                        "type": "link",
                    },
                    headers=HEADERS,
                    timeout=10.0,
                )
                if response.status_code == 200:
                    data = response.json()
                    all_posts.extend(data.get("data", {}).get("children", []))

            print(f"DEBUG: Total posts fetched: {len(all_posts)}")

        # Deduplicate by URL
        seen_urls = set()
        unique_posts = []
        for p in all_posts:
            url = p.get("data", {}).get("permalink", "")
            if url not in seen_urls:
                seen_urls.add(url)
                unique_posts.append(p)
        all_posts = unique_posts
        print(f"DEBUG: After dedup: {len(all_posts)} unique posts")

        # Use name_variations we built earlier for filtering
        query_variations = name_variations

        def is_useful_post(post_data):
            """Check if post is likely a useful discussion about the product."""
            title = post_data.get("title", "").lower()
            subreddit = post_data.get("subreddit", "").lower()
            num_comments = post_data.get("num_comments", 0)

            # Must mention the product in title OR be in product subreddit
            has_query = any(v in title for v in query_variations)
            # Also check subreddit name (r/basicfit, r/n8n, etc.)
            is_product_sub = any(v.replace(" ", "").replace("-", "") in subreddit for v in query_variations)

            # Must have at least 1 comment
            has_comments = num_comments >= 1

            return (has_query or is_product_sub) and has_comments

        # Debug: show first few post titles
        for i, p in enumerate(all_posts[:5]):
            d = p.get("data", {})
            print(f"DEBUG: Post {i+1}: r/{d.get('subreddit')} - {d.get('title')[:60]}... ({d.get('num_comments')} comments)")

        # Filter and sort by most comments first
        filtered_posts = [p for p in all_posts if is_useful_post(p.get("data", {}))]
        filtered_posts.sort(key=lambda p: p.get("data", {}).get("num_comments", 0), reverse=True)

        print(f"DEBUG: Found {len(filtered_posts)} relevant posts out of {len(all_posts)}")

        # Step 2: Fetch comments from filtered posts
        all_comments = []
        top_posts = []

        async with httpx.AsyncClient() as client:
            for post in filtered_posts[:limit]:
                post_data = post.get("data", {})
                permalink = post_data.get("permalink", "")

                top_posts.append({
                    "title": post_data.get("title", ""),
                    "subreddit": post_data.get("subreddit", ""),
                    "score": post_data.get("score", 0),
                    "num_comments": post_data.get("num_comments", 0),
                    "url": f"https://reddit.com{permalink}",
                })

                # Fetch comments for this post
                if permalink:
                    try:
                        comment_response = await client.get(
                            f"https://www.reddit.com{permalink}.json",
                            params={"limit": 30, "sort": "top"},
                            headers=HEADERS,
                            timeout=10.0,
                        )
                        if comment_response.status_code == 200:
                            comment_data = comment_response.json()
                            if len(comment_data) > 1:
                                comments = extract_comments(comment_data[1])
                                all_comments.extend(comments)

                                # Find best quality comment for THIS post
                                best_comment = find_best_comment(comments, name_variations)
                                if best_comment:
                                    top_posts[-1]["best_comment"] = best_comment
                    except:
                        pass  # Skip if we can't fetch comments

        # Step 3: Analyze all comments
        analysis = analyze_comments(all_comments, name_variations)

        return {
            "query": product_name,  # Show what we actually searched for
            "status": "success",
            "posts_analyzed": len(top_posts),
            "comments_analyzed": len(all_comments),
            "verdict": analysis["verdict"],
            "pros": analysis["pros"],
            "cons": analysis["cons"],
            "alternatives": analysis["alternatives"],
            "top_comment": analysis["top_comment"],
            "posts": top_posts,
        }

    except httpx.TimeoutException:
        raise HTTPException(status_code=504, detail="Reddit request timed out")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


def extract_comments(comment_data, depth=0, max_depth=2):
    """Recursively extract comments from Reddit's nested structure."""
    comments = []
    children = comment_data.get("data", {}).get("children", [])

    for child in children:
        if child.get("kind") != "t1":  # t1 = comment
            continue

        data = child.get("data", {})
        body = data.get("body", "")
        score = data.get("score", 0)

        if body and body != "[deleted]" and body != "[removed]":
            comments.append({
                "body": body,
                "score": score,
                "author": data.get("author", ""),
            })

        # Get replies (nested comments)
        if depth < max_depth:
            replies = data.get("replies", {})
            if isinstance(replies, dict):
                comments.extend(extract_comments(replies, depth + 1, max_depth))

    return comments


def find_best_comment(comments, name_variations):
    """Find the best quality comment from a list."""
    # Build all variations (lowercase, no spaces, no hyphens)
    query_variations = []
    for name in name_variations:
        name_lower = name.lower()
        query_variations.append(name_lower)
        query_variations.append(name_lower.replace(" ", ""))
        query_variations.append(name_lower.replace("-", ""))
        query_variations.append(name_lower.replace("-", " "))
    query_variations = list(set(query_variations))  # Dedupe

    best = None
    best_score = 0

    for comment in comments:
        body = comment["body"]
        body_lower = body.lower()

        # Must be relevant (mention the product)
        if not any(var in body_lower for var in query_variations):
            continue

        # Must be substantial
        if len(body) < 50:
            continue

        # Score it
        quality = score_comment_quality(body)

        # Combine quality score with upvote score (quality matters more)
        combined_score = quality * 2 + min(comment["score"], 100)

        if combined_score > best_score:
            best_score = combined_score
            best = {
                "body": body,
                "author": comment["author"],
                "score": comment["score"],
                "quality_score": quality,
            }

    return best


def score_comment_quality(text):
    """
    Score a comment's quality/insightfulness.
    Returns a score from 0-100 based on quality signals.
    """
    text_lower = text.lower()
    score = 0

    # Base score for length (sweet spot: 100-500 chars)
    length = len(text)
    if 100 <= length <= 500:
        score += 20
    elif 50 <= length <= 800:
        score += 10

    # Check for quality signals
    for signal_type, patterns in QUALITY_SIGNALS.items():
        for pattern in patterns:
            if re.search(pattern, text_lower):
                if signal_type == "experience":
                    score += 25  # Personal experience is very valuable
                elif signal_type == "specifics":
                    score += 15  # Specific numbers add credibility
                elif signal_type == "verdict":
                    score += 20  # Clear verdict is helpful
                elif signal_type == "comparison":
                    score += 10  # Comparisons add context
                break  # Only count each signal type once

    # Bonus for first-person pronouns (indicates personal experience)
    first_person = len(re.findall(r'\bi\b|\bmy\b|\bme\b', text_lower))
    score += min(first_person * 3, 15)

    return min(score, 100)


def analyze_comments(comments, name_variations):
    """Analyze comments for sentiment, pros, cons, and alternatives."""
    pros = []
    cons = []
    alternatives = Counter()
    positive_count = 0
    negative_count = 0
    top_comment = None
    best_quality_comment = None
    best_quality_score = 0

    # Build all variations (lowercase, no spaces, no hyphens)
    query_variations = []
    for name in name_variations:
        name_lower = name.lower()
        query_variations.append(name_lower)
        query_variations.append(name_lower.replace(" ", ""))
        query_variations.append(name_lower.replace("-", ""))
        query_variations.append(name_lower.replace("-", " "))
    query_variations = list(set(query_variations))  # Dedupe
    query_lower = name_variations[0].lower()  # Primary name for alternatives check

    def is_relevant(text):
        """Check if comment is actually about the product."""
        text_lower = text.lower()
        # Must mention the full product name or a known variation
        return any(var in text_lower for var in query_variations)

    for comment in comments:
        body = comment["body"]
        body_lower = body.lower()
        score = comment["score"]

        # Only analyze comments that are actually about the product
        relevant = is_relevant(body)

        if not relevant:
            continue

        # Score comment quality
        quality = score_comment_quality(body)

        # Track best quality comment (insightful + relevant)
        if quality > best_quality_score and len(body) > 50:
            best_quality_score = quality
            best_quality_comment = {**comment, "quality_score": quality}

        # Track top comment by upvotes (must be relevant)
        if top_comment is None or score > top_comment["score"]:
            if len(body) > 50:
                top_comment = comment

        # Check for positive sentiment
        for keyword in POSITIVE_KEYWORDS:
            if keyword in body_lower:
                positive_count += 1
                if len(pros) < 5:
                    sentence = extract_sentence_with_keyword(body, keyword)
                    if sentence and len(sentence) > 20:
                        pros.append({"text": sentence, "score": score})
                break

        # Check for negative sentiment
        for keyword in NEGATIVE_KEYWORDS:
            if keyword in body_lower:
                negative_count += 1
                if len(cons) < 5:
                    sentence = extract_sentence_with_keyword(body, keyword)
                    if sentence and len(sentence) > 20:
                        cons.append({"text": sentence, "score": score})
                break

        # Look for alternatives mentioned (in any comment)
        # Search original body (not lowercased) to find Capitalized Product Names
        for pattern in ALTERNATIVE_PATTERNS:
            matches = re.findall(pattern, body)
            for match in matches:
                match_clean = match.strip()
                # Skip if it's not a product (common word) or is the product we're researching
                if match_clean.lower() in NOT_PRODUCTS:
                    continue
                if match_clean.lower() == query_lower:
                    continue
                if len(match_clean) < 3:
                    continue
                # Keep original capitalization for display
                alternatives[match_clean] += 1

    # Determine overall verdict
    total = positive_count + negative_count
    if total == 0:
        verdict = "Not enough opinions to judge"
    elif positive_count > negative_count * 2:
        verdict = "Generally recommended"
    elif negative_count > positive_count * 2:
        verdict = "Mixed to negative reviews"
    elif positive_count > negative_count:
        verdict = "Mostly positive with some concerns"
    else:
        verdict = "Mixed opinions"

    # Sort pros/cons by score
    pros = sorted(pros, key=lambda x: x["score"], reverse=True)[:3]
    cons = sorted(cons, key=lambda x: x["score"], reverse=True)[:3]

    # Use best quality comment if it exists and is better than just upvotes
    featured_comment = best_quality_comment if best_quality_comment and best_quality_score >= 40 else top_comment

    return {
        "verdict": verdict,
        "pros": [p["text"] for p in pros],
        "cons": [c["text"] for c in cons],
        "alternatives": [alt for alt, count in alternatives.most_common(3)],
        "top_comment": featured_comment,
    }


def extract_sentence_with_keyword(text, keyword):
    """Extract the sentence containing the keyword."""
    sentences = re.split(r'[.!?]+', text)
    for sentence in sentences:
        if keyword in sentence.lower():
            cleaned = sentence.strip()[:200]
            # Filter out URLs, fragments, and junk
            if any(x in cleaned.lower() for x in ["http", ".com/", "/r/", "www.", "reddit.com"]):
                continue
            # Must be actual text, not just punctuation or short fragments
            if len(cleaned) < 15 or cleaned.count(" ") < 3:
                continue
            return cleaned
    return None
