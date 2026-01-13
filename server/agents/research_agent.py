from services.llm_service import run_agent, parse_json
import requests
from bs4 import BeautifulSoup
from typing import Dict, List
import os
import json
from urllib.parse import quote_plus
import warnings
from urllib3.exceptions import InsecureRequestWarning
import time
import random

# Suppress SSL warnings for development
warnings.filterwarnings('ignore', category=InsecureRequestWarning)

# Create a session for reusing connections
session = requests.Session()

RESEARCH_SYSTEM_PROMPT = """You are a Research Agent specializing in automotive parts intelligence for Cummins diesel engines.
Given part names, provide comprehensive market intelligence based on web research data.

Analyze for:
- Recall status (active/none/cleared)
- Market pricing estimates
- Common failure patterns
- Recommended suppliers
- Critical maintenance tips
- Urgency multiplier based on external factors

Respond ONLY in valid JSON:
{
  "parts_research": [
    {
      "part_name": "",
      "recall_status": "active|none|cleared",
      "recall_details": "",
      "market_price": "$X-$Y",
      "failure_patterns": ["pattern1", "pattern2"],
      "suppliers": ["supplier1", "supplier2"],
      "maintenance_tips": "",
      "urgency_multiplier": 1.0,
      "web_sources_checked": 0,
      "sources_scraped": []
    }
  ],
  "summary": {
    "total_parts_researched": 0,
    "parts_with_recalls": 0,
    "total_sources_checked": 0,
    "data_freshness": "2024-01-12"
  }
}"""

async def research_parts(parts_list: List[Dict], stream_callback=None) -> Dict:
    """Research parts using web intelligence and AI analysis"""
    print("🌐 Research Agent: Starting web intelligence gathering...")
    if stream_callback:
        await stream_callback({"step": "research_agent", "status": "started", "message": "Starting web intelligence gathering..."})
    
    # Extract unique part names
    part_names = list(set([p.get("part", "") for p in parts_list if p.get("part")]))
    
    if not part_names:
        print("⚠️  No parts to research")
        return {"parts_research": [], "summary": {"total_parts_researched": 0}}
    
    print(f"📋 Researching {len(part_names)} unique parts: {part_names}")
    
    # Gather web intelligence
    web_data = await scrape_part_info(part_names, stream_callback)
    
    # Use LLM to analyze and synthesize research
    # Prepare concise web data summary to avoid token limits
    web_summary = {}
    for part, data in web_data.items():
        web_summary[part] = {
            "sources_checked": data.get("sources_checked", 0),
            "pages_scraped": data.get("pages_scraped", 0),
            "sources_scraped": data.get("sources_scraped", []),
            "has_recalls": len(data.get("web_content", {}).get("recalls", [])) > 0,
            "has_pricing": len(data.get("web_content", {}).get("pricing", [])) > 0,
            "has_failures": len(data.get("web_content", {}).get("failure_reports", [])) > 0,
            # Include first 300 chars of each content type
            "recall_snippet": data.get("web_content", {}).get("recalls", [""])[0][:300] if data.get("web_content", {}).get("recalls") else "",
            "pricing_snippet": data.get("web_content", {}).get("pricing", [""])[0][:300] if data.get("web_content", {}).get("pricing") else "",
            "failure_snippet": data.get("web_content", {}).get("failure_reports", [""])[0][:300] if data.get("web_content", {}).get("failure_reports") else ""
        }
    
    user_message = f"""Research these Cummins engine parts and provide comprehensive market intelligence:

Parts to research: {part_names}

Web intelligence gathered (summary):
{json.dumps(web_summary, indent=2)}

For each part, analyze:
1. Recall status (check for NHTSA recalls, manufacturer bulletins)
2. Market pricing (average from multiple suppliers)
3. Common failure patterns (from maintenance databases)
4. Recommended suppliers (reputable sources)
5. Critical maintenance tips
6. Urgency multiplier (1.0-2.0 based on external risk factors)

IMPORTANT: Include the sources_scraped array from the web summary in your response for each part."""
    
    try:
        # Wrap the stream_callback to define the event type for thinking tokens
        async def thinking_callback(token):
            if stream_callback:
                await stream_callback({"step": "research_agent", "status": "thinking", "token": token})

        response = await run_agent(RESEARCH_SYSTEM_PROMPT, user_message, stream_callback=thinking_callback)
        result = parse_json(response)
        
        # Merge sources_scraped from web_data into LLM result
        if result.get('parts_research'):
            for part_result in result['parts_research']:
                part_name = part_result.get('part_name')
                if part_name in web_data:
                    part_result['sources_scraped'] = web_data[part_name].get('sources_scraped', [])
        
        print(f"✅ Research completed for {len(result.get('parts_research', []))} parts")
        if stream_callback:
            await stream_callback({"step": "research_agent", "status": "completed", "message": f"Research completed for {len(result.get('parts_research', []))} parts"})

        if result.get('summary', {}).get('parts_with_recalls', 0) > 0:
            print(f"⚠️  ALERT: {result['summary']['parts_with_recalls']} part(s) under recall!")
        
        return result
    except Exception as e:
        print(f"❌ Research Agent error: {e}")
        if stream_callback:
            await stream_callback({"step": "error", "message": str(e)})
        return {"parts_research": [], "summary": {"total_parts_researched": 0, "error": str(e)}}

async def scrape_part_info(part_names: List[str], stream_callback=None) -> Dict:
    """Gather web intelligence for parts using multiple search strategies"""
    print(f"🔍 Searching web for {len(part_names)} parts...")
    
    results = {}
    total_searches = 0
    total_pages_scraped = 0
    
    for part_name in part_names:
        print(f"🌐 Researching: {part_name}")
        if stream_callback:
            await stream_callback({"step": "research_agent", "status": "searching", "message": f"Searching web for {part_name}..."})
            
        part_data = await search_and_scrape_part(part_name, stream_callback)
        results[part_name] = part_data
        total_searches += part_data.get("searches_performed", 0)
        total_pages_scraped += part_data.get("pages_scraped", 0)
    
    print(f"✅ Completed {total_searches} searches")
    print(f"📄 Scraped {total_pages_scraped} web pages")
    
    return results

async def search_and_scrape_part(part_name: str, stream_callback=None) -> Dict:
    """Search and scrape information for a specific part"""
    part_data = {
        "part_name": part_name,
        "searches_performed": 0,
        "pages_scraped": 0,
        "sources_checked": 0,
        "sources": [],
        "sources_scraped": [],  # Track actual scraped sources with metadata
        "web_content": {
            "recalls": [],
            "pricing": [],
            "failure_reports": [],
            "maintenance_tips": []
        }
    }
    
    # Search queries to perform with categories
    searches = [
        {"query": f"Cummins {part_name} recall NHTSA", "category": "Safety Recalls", "type": "recalls"},
        {"query": f"Cummins {part_name} price AutoZone O'Reilly", "category": "Market Pricing", "type": "pricing"},
        {"query": f"Cummins {part_name} common failures problems", "category": "Failure Analysis", "type": "failure_reports"}
    ]
    
    for search_info in searches:
        query = search_info["query"]
        category = search_info["category"]
        content_type = search_info["type"]
        
        try:
            results = await perform_search(query)
            part_data["searches_performed"] += 1
            part_data["sources_checked"] += len(results)
            
            # Scrape top 2 results
            for result in results[:2]:
                try:
                    url = result.get("url", "")
                    content = await scrape_url(url)
                    if content:
                        part_data["pages_scraped"] += 1
                        part_data["sources"].append(url)
                        
                        # Stream the update
                        if stream_callback:
                            snippet = content[:100].replace('\n', ' ')
                            await stream_callback({
                                "step": "research_agent", 
                                "status": "scraped", 
                                "message": f"Scraped {len(content)} chars from {url}\nPreview: \"{snippet}...\"",
                                "snippet": snippet
                            })

                        # Track source with metadata
                        source_metadata = {
                            "category": category,
                            "description": result.get("title", url.split("//")[1].split("/")[0] if "//" in url else url),
                            "url": url
                        }
                        part_data["sources_scraped"].append(source_metadata)
                        
                        # Categorize content
                        part_data["web_content"][content_type].append(content)
                except Exception as e:
                    print(f"⚠️  Error scraping {result.get('url', 'URL')[:40]}: {e}")
                    continue
        except Exception as e:
            print(f"⚠️  Search error for '{query[:40]}': {e}")
            continue
    
    # Check if we got any data
    if part_data["pages_scraped"] == 0:
        print(f"⚠️  No web data found for {part_name}")
    
    return part_data

async def perform_search(query: str) -> List[Dict]:
    """Perform web search using multiple strategies"""
    
    # Strategy 1: Try Brave Search API if configured
    brave_api_key = os.getenv("BRAVE_API_KEY")
    if brave_api_key and brave_api_key != "your-brave-api-key-here":
        try:
            results = await search_with_brave(query, brave_api_key)
            if results:
                print(f"✅ Brave Search: {len(results)} results")
                return results
        except Exception as e:
            print(f"⚠️  Brave failed: {e}")
    
    # Strategy 2: Try SerpAPI if configured  
    serpapi_key = os.getenv("SERPAPI_KEY")
    if serpapi_key and serpapi_key != "your-serpapi-key-here":
        try:
            results = await search_with_serpapi(query, serpapi_key)
            if results:
                print(f"✅ SerpAPI: {len(results)} results")
                return results
        except Exception as e:
            print(f"⚠️  SerpAPI failed: {e}")
    
    # Strategy 3: Direct website scraping (most reliable for demo)
    try:
        results = await direct_website_search(query)
        if results:
            print(f"✅ Direct search: {len(results)} results")
            return results
    except Exception as e:
        print(f"⚠️  Direct search failed: {e}")
    
    print(f"❌ All search strategies failed for: {query[:50]}")
    return []

async def search_with_brave(query: str, api_key: str) -> List[Dict]:
    """Search using Brave Search API"""
    url = "https://api.search.brave.com/res/v1/web/search"
    headers = {
        "Accept": "application/json",
        "Accept-Encoding": "gzip",
        "X-Subscription-Token": api_key
    }
    params = {"q": query, "count": 5}
    
    response = requests.get(url, headers=headers, params=params, timeout=10)
    if response.status_code == 200:
        data = response.json()
        results = []
        for item in data.get("web", {}).get("results", [])[:5]:
            results.append({
                "title": item.get("title", ""),
                "url": item.get("url", ""),
                "snippet": item.get("description", "")
            })
        return results
    return []

async def search_with_serpapi(query: str, api_key: str) -> List[Dict]:
    """Search using SerpAPI"""
    url = "https://serpapi.com/search"
    params = {
        "q": query,
        "api_key": api_key,
        "num": 5
    }
    
    response = requests.get(url, params=params, timeout=10)
    if response.status_code == 200:
        data = response.json()
        results = []
        for item in data.get("organic_results", [])[:5]:
            results.append({
                "title": item.get("title", ""),
                "url": item.get("link", ""),
                "snippet": item.get("snippet", "")
            })
        return results
    return []

async def direct_website_search(query: str) -> List[Dict]:
    """Direct website scraping for specific domains"""
    results = []
    
    # For recalls, go directly to NHTSA
    if "recall" in query.lower() and "NHTSA" in query:
        part_name = query.split("Cummins")[1].split("recall")[0].strip()
        nhtsa_url = f"https://www.nhtsa.gov/recalls"
        results.append({
            "title": f"NHTSA Recalls - {part_name}",
            "url": nhtsa_url,
            "snippet": f"Official NHTSA recall database for {part_name}"
        })
    
    # For pricing, use known auto parts sites
    if "price" in query.lower():
        part_name = query.split("Cummins")[1].split("price")[0].strip()
        results.extend([
            {
                "title": f"AutoZone - Cummins {part_name}",
                "url": f"https://www.autozone.com/search?searchText=Cummins+{quote_plus(part_name)}",
                "snippet": f"AutoZone pricing for Cummins {part_name}"
            },
            {
                "title": f"O'Reilly Auto Parts - {part_name}",
                "url": f"https://www.oreillyauto.com/search?q=Cummins+{quote_plus(part_name)}",
                "snippet": f"O'Reilly pricing for Cummins {part_name}"
            }
        ])
    
    # For failures/problems, use forums
    if "failure" in query.lower() or "problem" in query.lower():
        part_name = query.split("Cummins")[1].split("common")[0].strip()
        results.append({
            "title": f"Cummins Forum - {part_name} Issues",
            "url": f"https://www.cumminsforum.com/search/?q={quote_plus(part_name)}+problems",
            "snippet": f"Community discussions about {part_name} failures and problems"
        })
    
    return results

async def scrape_url(url: str) -> str:
    """Scrape content from a URL"""
    try:
        if not url or not url.startswith('http'):
            return ""
        
        print(f"🌐 Scraping: {url[:60]}...")
        
        # Add delay to be polite
        time.sleep(random.uniform(0.3, 0.8))
        
        headers = {
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
        }
        
        response = session.get(url, headers=headers, timeout=8, verify=False)
        print(f"📄 Status: {response.status_code}")
        
        if response.status_code == 200:
            soup = BeautifulSoup(response.text, 'html.parser')
            
            # Remove scripts, styles, and navigation
            for element in soup(['script', 'style', 'nav', 'header', 'footer']):
                element.decompose()
            
            # Get main content
            main_content = soup.find('main') or soup.find('article') or soup.find('div', class_='content') or soup.body
            
            if main_content:
                text = main_content.get_text(separator=' ', strip=True)
                print(f"✅ Scraped {len(text)} chars")
                return text[:2000] if len(text) > 2000 else text
        
    except Exception as e:
        print(f"⚠️  Scrape error: {str(e)[:50]}")
    
    return ""
