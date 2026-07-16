import logging
import urllib.parse
from datetime import datetime
import time
from typing import Any, Dict, List, Optional
import httpx
import feedparser

from app.config import get_settings

logger = logging.getLogger("app.services.rss")
settings = get_settings()

class RSSNewsService:
    """Service to fetch and parse adverse media news articles from Google News RSS feed."""

    def __init__(self) -> None:
        self.base_url = settings.google_news_rss
        self.headers = {
            "User-Agent": settings.user_agent
        }
        self.timeout = 10.0  # seconds

    def _build_url(self, query: str) -> str:
        """Converts raw search query into encoded Google News RSS URL."""
        encoded_query = urllib.parse.quote_plus(query)
        # Default query suffixes to search global English news
        return f"{self.base_url}?q={encoded_query}&hl=en-US&gl=US&ceid=US:en"

    def fetch_articles(self, query: str, limit: int = 15) -> List[Dict[str, Any]]:
        """Fetches and parses RSS feed items for a given search query.
        
        Returns:
            List[Dict[str, Any]]: List of normalized article objects.
        """
        url = self._build_url(query)
        logger.info("Fetching adverse media for query: '%s' from URL: %s", query, url)
        
        start_time = time.time()
        try:
            with httpx.Client(headers=self.headers, timeout=self.timeout) as client:
                response = client.get(url)
                
                # Check for rate limiting or other non-200 responses
                if response.status_code == 429:
                    logger.warning("Google News rate limit (429) hit during RSS fetch.")
                    return []
                elif response.status_code != 200:
                    logger.error("HTTP error during RSS fetch. Status: %s", response.status_code)
                    return []
                
                xml_content = response.text
                
        except httpx.ConnectError as e:
            logger.error("Network connection failure (no internet): %s", str(e))
            return []
        except httpx.TimeoutException as e:
            logger.error("Timeout connecting to RSS feed service after %.1fs: %s", self.timeout, str(e))
            return []
        except Exception as e:
            logger.error("Unexpected network error during RSS retrieval: %s", str(e))
            return []
            
        logger.debug("Successfully downloaded XML in %.2fs", time.time() - start_time)

        try:
            # Parse XML feed safely
            feed = feedparser.parse(xml_content)
            
            if feed.bozo:
                logger.warning("Feedparser flagged XML bozo exception (invalid or malformed XML syntax). Attempting recovery.")
                
            articles: List[Dict[str, Any]] = []
            
            for entry in feed.entries[:limit]:
                # Extract news source title if nested in source tag
                source_title = "Google News"
                if hasattr(entry, "source") and entry.source and "title" in entry.source:
                    source_title = entry.source.title
                elif "source" in entry:
                    source_title = entry.source.get("title", "Google News")

                # Extract publish date
                published_str = ""
                if hasattr(entry, "published"):
                    published_str = entry.published
                elif "published" in entry:
                    published_str = entry["published"]
                
                # Parse standard RSS publish date format to ISO-8601 if possible
                published_iso = None
                if published_str:
                    try:
                        # RFC 822 / 2822 date formats (e.g. 'Tue, 14 Jul 2026 12:00:00 GMT')
                        parsed_struct = feedparser._parse_date(published_str)
                        if parsed_struct:
                            published_iso = datetime(*parsed_struct[:6]).isoformat()
                    except Exception:
                        pass
                
                # Fallback to current time if parsing fails
                if not published_iso:
                    published_iso = datetime.utcnow().isoformat()

                article = {
                    "title": getattr(entry, "title", "No Title").strip(),
                    "description": getattr(entry, "summary", "").strip(),
                    "link": getattr(entry, "link", "").strip(),
                    "source": source_title.strip(),
                    "published_at": published_iso
                }
                
                articles.append(article)
                
            logger.info("Found %d articles for query: '%s'", len(articles), query)
            return articles

        except Exception as e:
            logger.error("Error parsing downloaded XML structures: %s", str(e))
            return []
