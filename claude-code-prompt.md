# Claude Code Prompt: Engine Parts Health Monitor

## Project Overview

Build a **multi-agent system** called "Engine Parts Health Monitor" for Cummins diesel engines. The system monitors fleet engine parts usage hours and automatically creates service tickets when parts need attention.

This is for a hackathon project demonstrating:
- Multi-agent collaboration (4 specialized agents)
- MCP (Model Context Protocol) integration with Google Sheets
- Real-time AI decision making
- Web scraping & external data enrichment
- Intelligent report generation

---

## Tech Stack

- **Backend:** Python + FastAPI
- **Frontend:** React + Vite + TailwindCSS
- **LLM:** OpenRouter API with nvidia/nemotron-3-nano-30b-a3b:free model
- **Web Scraping:** BeautifulSoup4, Requests, SerpAPI (Google Search)
- **Database/MCP:** Google Sheets API (read fleet data, write service tickets)
- **Package Manager:** pip (backend), npm (frontend)

---

## Project Structure

```
engine-health-monitor/
├── server/
│   ├── main.py                  # FastAPI server entry
│   ├── requirements.txt
│   ├── .env
│   ├── services/
│   │   ├── llm_service.py       # OpenRouter API wrapper (Claude via OpenAI SDK)
│   │   └── sheets_service.py    # Google Sheets API wrapper
│   ├── agents/
│   │   ├── monitor_agent.py     # Checks parts usage
│   │   ├── research_agent.py    # Scrapes web for part info, recalls, prices
│   │   ├── diagnosis_agent.py   # Recommends actions with web data
│   │   └── dispatch_agent.py    # Creates detailed tickets with market insights
│   └── routes/
│       └── api.py               # API endpoints
│
├── client/
│   ├── src/
│   │   ├── App.jsx
│   │   ├── main.jsx
│   │   ├── index.css
│   │   └── components/
│   │       ├── Dashboard.jsx     # Main dashboard
│   │       ├── AgentFeed.jsx     # Shows agent reasoning
│   │       └── TicketList.jsx    # Shows generated tickets
│   ├── package.json
│   ├── vite.config.js
│   └── tailwind.config.js
│
└── README.md
```

---

## Backend Requirements

### 1. FastAPI Server (`server/main.py`)

```python
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from routes.api import router
import os

load_dotenv()

app = FastAPI()

# Enable CORS for localhost:5173 (Vite dev server)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router, prefix="/api")

if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)
```

### 2. LLM Service (`server/services/llm_service.py`)

**IMPORTANT: Uses OpenRouter API with Claude SDK via OpenAI SDK**

```python
from openai import OpenAI
import os
import json

# Initialize OpenRouter client with Claude models
client = OpenAI(
    api_key=os.getenv("OPENROUTER_API_KEY"),
    base_url="https://openrouter.ai/api/v1"
)

async def run_agent(system_prompt: str, user_message: str) -> str:
    """
    Run an agent using OpenRouter API (Claude models)
    
    Args:
        system_prompt: System instruction for the agent
        user_message: User input/data to process
    
    Returns:
        Agent response as string
    """
    response = client.chat.completions.create(
        model="claude-3-5-haiku-20241022",  # Claude via OpenRouter
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_message}
        ],
        temperature=0.7,
        max_tokens=1024
    )
    
    return response.choices[0].message.content

def parse_json(text: str) -> dict:
    """Parse JSON from LLM response, stripping markdown if needed"""
    cleaned = text.replace("```json\n", "").replace("```\n", "").replace("```", "").strip()
    return json.loads(cleaned)
```

### 3. Google Sheets Service (`server/services/sheets_service.py`)

```python
from google.oauth2.service_account import Credentials
from google.auth.transport.requests import Request
from googleapiclient.discovery import build
import os
import json
from typing import List, Dict

# Load service account credentials
SCOPES = ['https://www.googleapis.com/auth/spreadsheets']
SERVICE_ACCOUNT_FILE = os.getenv("GOOGLE_SERVICE_ACCOUNT_FILE", "service-account.json")
SHEET_ID = os.getenv("GOOGLE_SHEET_ID")

credentials = Credentials.from_service_account_file(
    SERVICE_ACCOUNT_FILE, scopes=SCOPES
)
sheets_service = build('sheets', 'v4', credentials=credentials)

async def get_fleet_parts() -> List[Dict]:
    """Read fleet parts data from Google Sheet"""
    result = sheets_service.spreadsheets().values().get(
        spreadsheetId=SHEET_ID,
        range="fleet_parts!A2:F"
    ).execute()
    
    values = result.get('values', [])
    headers = ["truck_id", "part_name", "current_hours", "max_hours", "last_service", "status"]
    
    return [dict(zip(headers, row)) for row in values if row]

async def write_service_tickets(tickets: List[Dict]) -> None:
    """Write service tickets to Google Sheet"""
    values = []
    for ticket in tickets:
        values.append([
            ticket.get("ticket_id"),
            ticket.get("truck_id"),
            ticket.get("part_name"),
            ticket.get("priority"),
            ticket.get("action"),
            ticket.get("created_at"),
            "pending"
        ])
    
    sheets_service.spreadsheets().values().append(
        spreadsheetId=SHEET_ID,
        range="service_tickets!A:G",
        valueInputOption="USER_ENTERED",
        body={"values": values}
    ).execute()
```

**Sheet 1: fleet_parts**
| truck_id | part_name | current_hours | max_hours | last_service |
|----------|-----------|---------------|-----------|--------------|
| TRK-045 | Fuel Filter | 480 | 500 | 2024-12-01 |
| TRK-045 | Oil | 230 | 250 | 2024-12-15 |
| TRK-102 | Turbo | 1800 | 2000 | 2024-11-20 |
| TRK-078 | Air Filter | 390 | 400 | 2024-12-10 |
| TRK-091 | Coolant | 450 | 500 | 2024-12-05 |

**Sheet 2: service_tickets**
| ticket_id | truck_id | part_name | priority | action | created_at | status |

### 4. Four Intelligent Agents (Using LLM via OpenRouter + Web Research)

#### Monitor Agent (`server/agents/monitor_agent.py`)
```python
from services.llm_service import run_agent, parse_json
from typing import Dict, List

MONITOR_SYSTEM_PROMPT = """You are a Fleet Monitor Agent for Cummins diesel engines.
Analyze parts data and categorize by usage percentage:
- CRITICAL: >90% usage
- WARNING: 80-90% usage  
- OK: <80% usage

Respond ONLY in valid JSON:
{
  "critical": [{"truck_id": "", "part": "", "usage_percent": 0, "current_hours": 0, "max_hours": 0}],
  "warning": [...],
  "ok": [...]
}"""

async def analyze_fleet(parts_data: List[Dict]) -> Dict:
    """Analyze fleet parts usage using LLM"""
    user_message = f"Analyze this fleet parts data:\n{str(parts_data)}"
    response = await run_agent(MONITOR_SYSTEM_PROMPT, user_message)
    return parse_json(response)
```

#### Research Agent (`server/agents/research_agent.py`) - **NEW!**
```python
from services.llm_service import run_agent, parse_json
import requests
from bs4 import BeautifulSoup
from typing import Dict, List
import os

RESEARCH_SYSTEM_PROMPT = """You are a Research Agent specializing in automotive parts intelligence.
Given part names, provide comprehensive market intelligence:
- Current recall status
- Average market price
- Common failure patterns
- Recommended suppliers
- Critical maintenance tips

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
      "maintenance_tips": "...",
      "urgency_multiplier": 1.0-2.0
    }
  ]
}"""

async def research_parts(parts_list: List[Dict]) -> Dict:
    """Research parts using web scraping and AI analysis"""
    # Extract unique part names
    part_names = list(set([p.get("part") for p in parts_list]))
    
    # Simulate web scraping (in production, use real APIs)
    web_data = await scrape_part_info(part_names)
    
    # Use LLM to analyze and synthesize research
    user_message = f"""Research these Cummins engine parts and provide market intelligence:
Parts to research: {part_names}

Web data gathered:
{str(web_data)}

Analyze for recalls, pricing, failure patterns, and maintenance recommendations."""
    
    response = await run_agent(RESEARCH_SYSTEM_PROMPT, user_message)
    return parse_json(response)

async def scrape_part_info(part_names: List[str]) -> Dict:
    """Scrape web for part information (simplified for demo)"""
    # In production, integrate with:
    # - NHTSA Recall API
    # - Parts pricing APIs
    # - Maintenance forums/databases
    
    research_data = {
        "recall_database": "NHTSA database checked",
        "pricing_sources": ["AutoZone", "O'Reilly", "NAPA"],
        "forums_checked": ["Cummins Forum", "Diesel Place"],
        "parts": []
    }
    
    for part in part_names:
        # Simulate API calls (replace with real scraping)
        research_data["parts"].append({
            "name": part,
            "sources_checked": 5,
            "data_freshness": "2024-01-12"
        })
    
    return research_data
```

#### Enhanced Diagnosis Agent (`server/agents/diagnosis_agent.py`)
```python
from services.llm_service import run_agent, parse_json
from typing import Dict

DIAGNOSIS_SYSTEM_PROMPT = """You are a Diagnosis Agent for Cummins diesel engines with access to market intelligence.
For each critical/warning part, recommend action considering:
- Usage percentage
- Recall status
- Market pricing
- Failure patterns
- Supplier availability

Actions:
- REPLACE_NOW: Immediate replacement (recalls, >95% usage, known failures)
- SERVICE_SOON: Schedule within 48 hours (80-95% usage)
- MONITOR: Watch closely (<80% usage)

Respond ONLY in valid JSON:
{
  "recommendations": [
    {
      "truck_id": "",
      "part": "",
      "action": "",
      "reason": "",
      "urgency_score": 1-10,
      "web_insights": "",
      "cost_estimate": ""
    }
  ]
}"""

async def diagnose_issues(critical_parts: list, warning_parts: list, research_data: Dict) -> Dict:
    """Generate diagnosis with web-enriched data"""
    parts_to_diagnose = {
        "critical": critical_parts,
        "warning": warning_parts,
        "research_insights": research_data
    }
    user_message = f"""Diagnose these parts with market intelligence:
{str(parts_to_diagnose)}

Consider recall status, pricing, and failure patterns in your recommendations."""
    response = await run_agent(DIAGNOSIS_SYSTEM_PROMPT, user_message)
    return parse_json(response)
```

#### Enhanced Dispatch Agent (`server/agents/dispatch_agent.py`)
```python
from services.llm_service import run_agent, parse_json
from typing import Dict
from datetime import datetime

DISPATCH_SYSTEM_PROMPT = """You are a Dispatch Agent for fleet management with market intelligence.
Create detailed service tickets from diagnosis recommendations.
Assign priority: URGENT, HIGH, MEDIUM

Include:
- Part details and urgency
- Market price estimates
- Recall information
- Supplier recommendations
- Downtime prevention savings ($760/day per truck)

Respond ONLY in valid JSON:
{
  "tickets": [
    {
      "ticket_id": "TKT-001",
      "truck_id": "",
      "part_name": "",
      "priority": "URGENT|HIGH|MEDIUM",
      "action": "",
      "reason": "",
      "web_insights": "",
      "cost_estimate": "",
      "recommended_suppliers": [],
      "estimated_downtime_saved": 0
    }
  ],
  "summary": {
    "total_tickets": 0,
    "urgent_count": 0,
    "total_cost_estimate": "",
    "potential_savings": 0,
    "parts_under_recall": 0
  }
}"""

async def create_tickets(recommendations: Dict) -> Dict:
    """Create detailed tickets with market intelligence"""
    user_message = f"""Create comprehensive service tickets with market data:
{str(recommendations)}

Include pricing, suppliers, and recall information in each ticket."""
    response = await run_agent(DISPATCH_SYSTEM_PROMPT, user_message)
    result = parse_json(response)
    
    # Add creation timestamp
    for ticket in result.get("tickets", []):
        ticket["created_at"] = datetime.now().isoformat()
    
    return result
```

### 5. API Routes (`server/routes/api.py`)

```python
from fastapi import APIRouter
from services import sheets_service
from agents import monitor_agent, diagnosis_agent, dispatch_agent

router = APIRouter()

@router.post("/check-fleet")
async def check_fleet():
    """
    Orchestrates all 4 agents in sequence:
    1. Monitor Agent analyzes parts usage
    2. Research Agent scrapes web for part intelligence
    3. Diagnosis Agent recommends actions with market data
    4. Dispatch Agent creates detailed tickets
    """
    try:
        # Get fleet data
        fleet_data = await sheets_service.get_fleet_parts()
        
        # Run Monitor Agent
        monitoring_result = await monitor_agent.analyze_fleet(fleet_data)
        
        # Run Research Agent (NEW!)
        critical_and_warning = monitoring_result.get("critical", []) + monitoring_result.get("warning", [])
        research_result = await research_agent.research_parts(critical_and_warning)
        
        # Run Diagnosis Agent (with research data)
        diagnosis_result = await diagnosis_agent.diagnose_issues(
            monitoring_result.get("critical", []),
            monitoring_result.get("warning", []),
            research_result
        )
        
        # Run Dispatch Agent
        dispatch_result = await dispatch_agent.create_tickets(diagnosis_result)
        
        # Write tickets to Google Sheet
        await sheets_service.write_service_tickets(dispatch_result.get("tickets", []))
        
        return {
            "status": "success",
            "monitoring": monitoring_result,
            "research": research_result,
            "diagnosis": diagnosis_result,
            "dispatch": dispatch_result
        }
    except Exception as e:
        return {"status": "error", "message": str(e)}

@router.get("/fleet-data")
async def get_fleet_data():
    """Returns current fleet parts data from Google Sheet"""
    return await sheets_service.get_fleet_parts()

@router.get("/tickets")
async def get_tickets():
    """Returns all service tickets from Google Sheet"""
    # Implement reading from service_tickets sheet
    pass
```

---

## Frontend Requirements

### 1. Dashboard (`client/src/components/Dashboard.jsx`)

Main component with:
- "Run Fleet Check" button
- Fleet health summary cards
- Agent activity feed
- Service tickets table

### 2. Agent Feed (`client/src/components/AgentFeed.jsx`)

Shows real-time agent activity with web research:
```
🔍 Monitor Agent analyzing fleet...
   → Found 3 critical, 2 warning parts

🌐 Research Agent investigating web sources...
   → Checking NHTSA recall database
   → Fetching market prices from 3 suppliers
   → Analyzing maintenance forums
   → Found 1 active recall for Fuel Filter
   → Market price range: $45-$89

🔧 Diagnosis Agent thinking with market data...
   → Fuel Filter: REPLACE_NOW (recall #2024-045 + 96% usage)
   → Oil: SERVICE_SOON (48hr window, $35-$50)

📋 Dispatch Agent creating tickets...
   → 2 URGENT tickets created
   → Total cost estimate: $280-$420
   → Potential savings: $2,280
   → 1 part under active recall
```

### 3. Summary Cards

Display:
- Trucks Scanned: X
- Critical Parts: X
- Parts Under Recall: X
- Web Sources Checked: X
- Tickets Created: X
- Total Cost Estimate: $X-$Y
- Downtime Prevented: $X,XXX

### 4. Styling

Use TailwindCSS with:
- Dark theme (bg-gray-900)
- Green for OK, Yellow for Warning, Red for Critical
- Cards with rounded corners and shadows

---

## Environment Variables

**server/.env**
```
PORT=8000
OPENROUTER_API_KEY=sk-or-v1-xxxxx
GOOGLE_SHEET_ID=your-sheet-id-here
GOOGLE_SERVICE_ACCOUNT_FILE=service-account.json
```

**Note:** Download `service-account.json` from Google Cloud Console and place in server/ directory

---

## Package Dependencies

**server/requirements.txt**
```
fastapi==0.104.1
uvicorn==0.24.0
python-dotenv==1.0.0
openai==1.12.0
google-auth==2.25.2
google-auth-oauthlib==1.2.0
google-auth-httplib2==0.2.0
google-api-python-client==2.108.0
pydantic==2.5.0
beautifulsoup4==4.12.2
requests==2.31.0
httpx==0.25.2
lxml==4.9.3
```

**client/package.json**
```json
{
  "name": "engine-health-client",
  "scripts": {
    "dev": "vite",
    "build": "vite build"
  },
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "axios": "^1.6.0",
    "lucide-react": "^0.263.1"
  },
  "devDependencies": {
    "@vitejs/plugin-react": "^4.2.0",
    "vite": "^5.0.0",
    "tailwindcss": "^3.4.0",
    "autoprefixer": "^10.4.16",
    "postcss": "^8.4.32"
  }
}
```

---

## Enhanced Agent Chain Flow with Web Intelligence

```
1. User clicks "Run Fleet Check"
              ↓
2. Backend fetches parts data from Google Sheet
              ↓
3. Monitor Agent analyzes → returns {critical, warning, ok}
              ↓
4. Research Agent scrapes web sources:
   • NHTSA Recall Database
   • Parts pricing APIs (AutoZone, O'Reilly)
   • Maintenance forums
   • Supplier databases
   → returns {parts_research with recalls, prices, failure patterns}
              ↓
5. Diagnosis Agent processes critical/warning + research data
   → returns {recommendations with web insights}
              ↓
6. Dispatch Agent creates tickets with market intelligence
   → returns {tickets with pricing, suppliers, recall info, summary}
              ↓
7. Backend writes enriched tickets to Google Sheet
              ↓
8. Frontend displays results with detailed agent feed animation
```

---

## Important Implementation Notes

1. **JSON Parsing:** LLM responses may have markdown. Strip ```json and ``` before parsing:
```python
def parse_json(text: str) -> dict:
    cleaned = text.replace("```json\n", "").replace("```\n", "").replace("```", "").strip()
    return json.loads(cleaned)
```

2. **Error Handling:** Wrap all agent calls in try-catch. If JSON parsing fails, retry once.

3. **Google Sheets Auth:** Use service account JSON credentials file. Share the Google Sheet with the service account email.

4. **CORS:** FastAPI handles CORS with CORSMiddleware for localhost:5173 (Vite dev server).

5. **Date Formatting:** Use ISO format for dates in tickets.

6. **Multi-Agent Architecture:** 
   - 4 specialized agents: Monitor → Research → Diagnosis → Dispatch
   - Research agent scrapes web for real-time market intelligence
   - All agents use **LLM via OpenRouter API**
   - Pass system prompts to define agent roles
   - Chain agents in sequence for intelligent decision-making
   - Each agent outputs validated JSON for the next agent
   - Web data enriches recommendations with pricing, recalls, suppliers

---

## Sample Mock Data (For Testing Without Google Sheets)

```javascript
const mockPartsData = [
  { truck_id: "TRK-045", part_name: "Fuel Filter", current_hours: 480, max_hours: 500, last_service: "2024-12-01" },
  { truck_id: "TRK-045", part_name: "Oil", current_hours: 230, max_hours: 250, last_service: "2024-12-15" },
  { truck_id: "TRK-102", part_name: "Turbo", current_hours: 1800, max_hours: 2000, last_service: "2024-11-20" },
  { truck_id: "TRK-078", part_name: "Air Filter", current_hours: 390, max_hours: 400, last_service: "2024-12-10" },
  { truck_id: "TRK-091", part_name: "Coolant", current_hours: 450, max_hours: 500, last_service: "2024-12-05" },
  { truck_id: "TRK-091", part_name: "Battery", current_hours: 700, max_hours: 1000, last_service: "2024-10-15" },
  { truck_id: "TRK-102", part_name: "Brake Pads", current_hours: 850, max_hours: 1000, last_service: "2024-09-20" }
];
```

---

## Build Steps

1. Create project structure
2. Set up backend with Express
3. Implement Google Sheets service
4. Implement LLM service with OpenRouter
5. Create 3 agents with prompts
6. Create API routes
7. Build React frontend
8. Add TailwindCSS styling
9. Connect frontend to backend
10. Test full flow

---

## Success Criteria

- [ ] All 4 agents communicate in sequence
- [ ] Research agent successfully scrapes web data
- [ ] Tickets include market pricing and recall information
- [ ] Data reads from Google Sheet
- [ ] Enriched tickets write to Google Sheet
- [ ] Frontend shows detailed agent reasoning with web insights
- [ ] Summary shows cost estimates and recall alerts
- [ ] No hardcoded data (except mock fallback)

Build this complete project now. Start with the backend, then frontend.
