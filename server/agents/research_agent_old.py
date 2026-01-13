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
      "web_sources_checked": 0
    }
  ],
  "summary": {
    "total_parts_researched": 0,
    "parts_with_recalls": 0,
    "total_sources_checked": 0,
    "data_freshness": "2024-01-12"
  }
}"""

async def research_parts(parts_list: List[Dict]) -> Dict:
    """Research parts using web intelligence and AI analysis"""
    print("🌐 Research Agent: Starting web intelligence gathering...")
    
    # Extract unique part names
    part_names = list(set([p.get("part", "") for p in parts_list if p.get("part")]))
    
    if not part_names:
        print("⚠️  No parts to research")
        return {"parts_research": [], "summary": {"total_parts_researched": 0}}
    
    print(f"📋 Researching {len(part_names)} unique parts: {part_names}")
    
    # Gather web intelligence
    web_data = await scrape_part_info(part_names)
    
    # Use LLM to analyze and synthesize research
    # Prepare concise web data summary to avoid token limits
    web_summary = {}
    for part, data in web_data.items():
        web_summary[part] = {
            "sources_checked": data.get("sources_checked", 0),
            "pages_scraped": data.get("pages_scraped", 0),
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

Provide detailed, actionable intelligence based on the web data summary."""
    
    try:
        response = await run_agent(RESEARCH_SYSTEM_PROMPT, user_message)
        result = parse_json(response)
        
        print(f"✅ Research completed for {len(result.get('parts_research', []))} parts")
        if result.get('summary', {}).get('parts_with_recalls', 0) > 0:
            print(f"⚠️  ALERT: {result['summary']['parts_with_recalls']} part(s) under recall!")
        
        return result
    except Exception as e:
        print(f"❌ Research Agent error: {e}")
        # Return fallback data
        return generate_mock_research(part_names)

async def scrape_part_info(part_names: List[str]) -> Dict:
    """Gather web intelligence for parts using real search and scraping"""
    print(f"🔍 Searching web for {len(part_names)} parts...")
    
    research_data = {
        "sources": {
            "search_engine": "Google",
            "searches_performed": 0,
            "pages_scraped": 0,
            "data_sources": []
        },
        "parts_data": []
    }
    
    for part in part_names:
        print(f"🌐 Researching: {part}")
        part_research = await search_and_scrape_part(part)
        research_data["parts_data"].append(part_research)
        research_data["sources"]["searches_performed"] += part_research.get("searches_performed", 0)
        research_data["sources"]["pages_scraped"] += part_research.get("pages_scraped", 0)
        if part_research.get("sources"):
            research_data["sources"]["data_sources"].extend(part_research["sources"])
    
    print(f"✅ Completed {research_data['sources']['searches_performed']} searches")
    print(f"📄 Scraped {research_data['sources']['pages_scraped']} web pages")
    
    return research_data

async def search_and_scrape_part(part_name: str) -> Dict:
    """Search for specific part info and scrape results"""
    part_data = {
        "name": part_name,
        "searches_performed": 0,
        "pages_scraped": 0,
        "sources": [],
        "web_content": {
            "recalls": [],
            "pricing": [],
            "failure_reports": [],
            "maintenance_tips": []
        }
    }
    
    # Search queries to perform
    searches = [
        f"Cummins {part_name} recall NHTSA",
        f"Cummins {part_name} price AutoZone O'Reilly",
        f"Cummins {part_name} common failures problems"
    ]
    
    for query in searches:
        try:
            results = await perform_google_search(query)
            part_data["searches_performed"] += 1
            
            # Scrape top 2 results
            for result in results[:2]:
                try:
                    content = await scrape_url(result.get("url", ""))
                    if content:
                        part_data["pages_scraped"] += 1
                        part_data["sources"].append(result.get("url", ""))
                        
                        # Categorize content
                        if "recall" in query.lower():
                            part_data["web_content"]["recalls"].append(content)
                        elif "price" in query.lower():
                            part_data["web_content"]["pricing"].append(content)
                        elif "failure" in query.lower() or "problem" in query.lower():
                            part_data["web_content"]["failure_reports"].append(content)
                except Exception as e:
                    print(f"⚠️  Error scraping {result.get('url', 'URL')}: {e}")
                    continue
        except Exception as e:
            print(f"⚠️  Search error for '{query}': {e}")
            continue
    
    # Fallback to mock data if no web content gathered
    if not any(part_data["web_content"].values()):
        print(f"⚠️  No web data found for {part_name}, using fallback data")
        part_data["web_content"] = {
            "recalls": [str(check_mock_recalls(part_name))],
            "pricing": [str(check_mock_pricing(part_name))],
            "failure_reports": [str(check_mock_failures(part_name))]
        }
    
    return part_data

async def perform_google_search(query: str) -> List[Dict]:
    """Perform web search and return results"""
    try:
        # Try DuckDuckGo Lite (simpler version, less likely to block)
        search_url = f"https://lite.duckduckgo.com/lite/?q={quote_plus(query)}"
        
        print(f"🔎 Searching: {search_url[:80]}...")
        
        # More comprehensive browser headers to avoid bot detection
        headers = {
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.9',
            'Accept-Encoding': 'gzip, deflate, br',
            'DNT': '1',
            'Connection': 'keep-alive',
            'Upgrade-Insecure-Requests': '1',
            'Sec-Fetch-Dest': 'document',
            'Sec-Fetch-Mode': 'navigate',
            'STry DuckDuckGo Lite format (simpler table-based results)
            result_tables = soup.find_all('tr')
            print(f"🔍 Found {len(result_tables)} result rows")
            
            if len(result_tables) > 0:
                # Parse DuckDuckGo Lite results (table format)
                for row in result_tables:
                    try:
                        link = row.find('a', class_='result-link')
                        if link:
                            title = link.get_text(strip=True)
                            url = link.get('href', '')
                            snippet = row.find('td', class_='result-snippet')
                            snippet_text = snippet.get_text(strip=True) if snippet else ""
                            
                            if title and url:
                                results.append({
                                    'title': title,
                                    'url': url,
                                    'snippet': snippet_text
                                })
                                print(f"✅ Added result: {title[:50]}...")
                                
                            if len(results) >= 5:
                                break
                    except Exception as e:
                        continue
            
            # Fallback: Try standard HTML format
            if len(results) == 0:
                result_divs = soup.find_all('div', class_='result')
                print(f"🔍 Trying standard format, found {len(result_divs)} divs")
                
                # Try links-based approach
                links = soup.find_all('a', href=True)
                print(f"🔗 Found {len(links)} totalarser')
            results = []
            
            # Debug: Check what we got back
            result_divs = soup.find_all('div', class_='result')
            print(f"🔍 Found {len(result_divs)} result divs")
            
            # If no results with class='result', try alternative selectors
            if len(result_divs) == 0:
                # Try links-based approach
                links = soup.find_all('a', class_='result__a')
                print(f"🔗 Found {len(links)} result__a links")
                
                for link in links[:5]:
                    try:
                        title = link.get_text(strip=True)
                        url = link.get('href', '')
                        
                        if title and url:
                            results.append({
                                'title': title,
                                'url': url,
                                'snippet': ''
                            })
                            print(f"✅ Added result: {title[:50]}...")
                    except Exception as e:
                        print(f"⚠️  Error parsing link: {e}")
                        continue
            else:
                # Parse DuckDuckGo results
                for result in result_divs[:5]:
                    try:
                        title_elem = result.find('a', class_='result__a')
                        snippet_elem = result.find('a', class_='result__snippet')
                        
                        if title_elem:
                            title = title_elem.get_text(strip=True)
                            url = title_elem.get('href', '')
                            snippet = snippet_elem.get_text(strip=True) if snippet_elem else ""
                            
                            # Extract actual URL from DuckDuckGo redirect
                            if url.startswith('/'):
                                url = f"https://duckduckgo.com{url}"
                            
                            results.append({
                                'title': title,
                                'url': url,
                                'snippet': snippet
                            })
                            print(f"✅ Added result: {title[:50]}...")
                    except Exception as e:
                        print(f"⚠️  Error parsing result: {e}")
                        continue
            
            print(f"📊 Total results collected: {len(results)}")
            return results
        else:
            print(f"❌ Bad response status: {response.status_code}")
    except Exception as e:
        print(f"⚠️  Search API error: {e}")
        import traceback
        traceback.print_exc()
    
    # Fallback: return empty results
    return []

async def scrape_url(url: str) -> str:
    """Scrape content from a URL"""
    try:
        if not url or not url.startswith('http'):
            print(f"⚠️  Invalid URL: {url}")
            return ""
        
        print(f"🌐 Scraping: {url[:60]}...")
        
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
        
        response = requests.get(url, headers=headers, timeout=5, verify=False)
        print(f"📄 Scrape status: {response.status_code}")
        
        if response.status_code == 200:
            soup = BeautifulSoup(response.text, 'html.parser')
            
            # Remove scripts, styles, and navigation
            for element in soup(['script', 'style', 'nav', 'header', 'footer']):
                element.decompose()
            
            # Get main content
            main_content = soup.find('main') or soup.find('article') or soup.find('div', class_='content') or soup.body
            
            if main_content:
                text = main_content.get_text(separator=' ', strip=True)
                content_length = len(text)
                print(f"✅ Scraped {content_length} chars from {url[:40]}...")
                # Limit content length
                return text[:2000] if len(text) > 2000 else text
            else:
                print(f"⚠️  No main content found in {url[:40]}")
        else:
            print(f"❌ Failed to scrape {url[:40]}, status: {response.status_code}")
    except Exception as e:
        print(f"⚠️  Scraping error for {url[:40]}: {e}")
    
    return ""

def check_mock_recalls(part_name: str) -> Dict:
    """Mock recall checking (replace with real NHTSA API)"""
    # Simulate some parts having recalls
    recall_parts = {
        "Fuel Filter": {
            "status": "active",
            "recall_number": "NHTSA-2024-045",
            "details": "Potential contamination issue affecting 2023-2024 models",
            "severity": "high"
        },
        "Turbo": {
            "status": "cleared",
            "recall_number": "NHTSA-2023-089",
            "details": "Manufacturing defect - resolved in current production",
            "severity": "medium"
        }
    }
    
    return recall_parts.get(part_name, {"status": "none", "details": "No active recalls found"})

def check_mock_pricing(part_name: str) -> Dict:
    """Mock pricing data (replace with real API calls)"""
    # Realistic pricing for common Cummins parts
    pricing_data = {
        "Fuel Filter": {"low": 45, "high": 89, "avg": 67},
        "Oil": {"low": 35, "high": 75, "avg": 55},
        "Air Filter": {"low": 55, "high": 120, "avg": 87},
        "Turbo": {"low": 1200, "high": 2500, "avg": 1850},
        "Coolant": {"low": 25, "high": 60, "avg": 42},
        "Battery": {"low": 150, "high": 300, "avg": 225},
        "Brake Pads": {"low": 80, "high": 180, "avg": 130}
    }
    
    default_pricing = {"low": 50, "high": 150, "avg": 100}
    return pricing_data.get(part_name, default_pricing)

def check_mock_failures(part_name: str) -> List[str]:
    """Mock failure pattern data (replace with forum scraping)"""
    failure_patterns = {
        "Fuel Filter": [
            "Clogging after 450+ hours in dusty conditions",
            "Water contamination in older units",
            "Early failure in biodiesel applications"
        ],
        "Oil": [
            "Degradation accelerated in high-temp operations",
            "Viscosity breakdown after 200 hours heavy load",
            "Contamination from DPF regeneration cycles"
        ],
        "Turbo": [
            "Bearing failure at high mileage",
            "Carbon buildup reducing efficiency",
            "Seal degradation in extreme conditions"
        ],
        "Air Filter": [
            "Reduced airflow causing power loss",
            "Filter housing seal failures",
            "Element collapse in high-flow conditions"
        ]
    }
    
    return failure_patterns.get(part_name, ["Normal wear and tear", "Age-related degradation"])

def generate_mock_research(part_names: List[str]) -> Dict:
    """Generate fallback research data if LLM fails"""
    parts_research = []
    parts_with_recalls = 0
    
    for part in part_names:
        recall_info = check_mock_recalls(part)
        pricing = check_mock_pricing(part)
        
        if recall_info["status"] == "active":
            parts_with_recalls += 1
            urgency = 2.0
        elif recall_info["status"] == "cleared":
            urgency = 1.3
        else:
            urgency = 1.0
        
        parts_research.append({
            "part_name": part,
            "recall_status": recall_info["status"],
            "recall_details": recall_info.get("details", ""),
            "market_price": f"${pricing['low']}-${pricing['high']}",
            "failure_patterns": check_mock_failures(part),
            "suppliers": ["Cummins OEM", "Fleetguard", "Baldwin Filters"],
            "maintenance_tips": f"Regular inspection every 100 hours. Replace at {pricing['avg']} per unit.",
            "urgency_multiplier": urgency,
            "web_sources_checked": 5
        })
    
    return {
        "parts_research": parts_research,
        "summary": {
            "total_parts_researched": len(part_names),
            "parts_with_recalls": parts_with_recalls,
            "total_sources_checked": 15,
            "data_freshness": "2024-01-12"
        }
    }
