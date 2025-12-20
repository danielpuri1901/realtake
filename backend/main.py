from fastapi import FastAPI

app = FastAPI()


@app.get("/")
def root():
    """Health check endpoint - just confirms the server is running."""
    return {"status": "ok", "message": "ResearchBuddy API is running"}


@app.get("/research")
def research(query: str):
    """
    Research a product/software.

    For now, returns dummy data. Later, this will search Reddit.

    Args:
        query: The product name to research (e.g., "AirPods Pro")
    """
    return {
        "query": query,
        "status": "success",
        "data": {
            "summary": f"Research results for '{query}' will appear here",
            "reddit_discussions": 0,
            "comments_analyzed": 0,
        }
    }
