# RealTake

A Chrome extension prototype that retrieves Reddit discussions about software and subscriptions.
The extension sends research requests to a local Python backend and displays discussion results.

## Repository map

- [`extension/`](extension/) contains the Chrome Manifest V3 extension.
- [`backend/`](backend/) contains the FastAPI backend.
- [`claude.md`](claude.md) records the original design and unfinished work.

The extension is configured to reach `http://localhost:8000`.
The backend uses FastAPI with Uvicorn.
HTTPX handles HTTP requests.

## Status

This is a prototype.
The project notes list unfinished error handling and deployment work.
This repository does not establish a Chrome Web Store release or current Reddit API availability.

Inspect the backend configuration and extension permissions before running it.
