# 🔧 Engine Parts Health Monitor — Complete 1-Day Build Plan

## 📋 Project Overview

**Goal:** Build a multi-agent system that monitors engine parts usage and creates service tickets automatically.

**Agents:**
| Agent | Role |
|-------|------|
| Monitor Agent | Checks parts approaching service limits |
| Diagnosis Agent | Recommends action based on usage |
| Dispatch Agent | Creates prioritized service tickets |

---

## 🛠️ Tech Stack (100% Free)

| Component | Tool | Free Tier |
|-----------|------|-----------|
| **Frontend** | React + Vite | ✅ Free |
| **Backend** | Python + FastAPI | ✅ Free |
| **LLM** | OpenRouter API (Claude-SDK https://platform.claude.com/docs/en/agent-sdk/python) | ✅ Free tier available |
| **Database/MCP** | Google Sheets API | ✅ 300 reads/min, unlimited/day |
| **Frontend Hosting** | Vercel | ✅ Free tier |
| **Backend Hosting** | Render | ✅ Free tier (750 hrs/month) |
| **Version Control** | GitHub | ✅ Free |

---

## 🔑 Getting Free Resources

### 1. OpenRouter API Key (Free Tier - Claude Models)
```
1. Go to: openrouter.ai
2. Create account with email
3. Get free API key → Save it!
4. Use Claude 3.5 Haiku for free tier access
5. Set OPENROUTER_API_KEY environment variable
```

### 2. Google Sheets API (Free)
```
1. Go to: console.cloud.google.com
2. Create new project: "engine-health-monitor"
3. Enable Google Sheets API
4. Create Service Account
5. Download JSON credentials → service-account.json
6. Create a Google Sheet & share with service account email
```

### 3. Vercel (Frontend - Free)
```
1. Go to: vercel.com
2. Sign up with GitHub
3. Connect your repo → Auto deploys!
```

### 4. Render (Backend - Free)
```
1. Go to: render.com
2. Sign up with GitHub
3. Create "Web Service" 
4. Connect repo → Select Python environment
```

---

## 📁 Project Structure

```
engine-health-monitor/
├── server/                    # Python FastAPI Backend
│   ├── main.py                # FastAPI server
│   ├── requirements.txt        # Python dependencies
│   ├── .env                   # Environment variables
│   ├── agents/
│   │   ├── monitor_agent.py
│   │   ├── diagnosis_agent.py
│   │   └── dispatch_agent.py
│   ├── services/
│   │   ├── llm_service.py    # OpenRouter API (Claude-SDK https://platform.claude.com/docs/en/agent-sdk/python)
│   │   └── sheets_service.py
│   ├── routes/
│   │   └── api.py
│   └── service-account.json   # Google Cloud credentials
│
├── client/                    # React Frontend
│   ├── src/
│   │   ├── components/
│   │   │   ├── Dashboard.jsx
│   │   │   ├── FleetStatus.jsx
│   │   │   └── AgentFeed.jsx
│   │   ├── App.jsx
│   │   └── main.jsx
│   ├── package.json
│   └── vite.config.js
│
└── README.md
```

---

## 📊 Google Sheet Structure (Your Database)

### Sheet 1: `fleet_parts`
| truck_id | part_name | current_hours | max_hours | last_service | status |
|----------|-----------|---------------|-----------|--------------|--------|
| TRK-045 | Fuel Filter | 480 | 500 | 2024-12-01 | - |
| TRK-045 | Oil | 230 | 250 | 2024-12-15 | - |
| TRK-102 | Turbo | 1800 | 2000 | 2024-11-20 | - |
| TRK-078 | Air Filter | 390 | 400 | 2024-12-10 | - |
| TRK-091 | Coolant | 450 | 500 | 2024-12-05 | - |

### Sheet 2: `service_tickets`
| ticket_id | truck_id | part_name | priority | action | created_at | status |
|-----------|----------|-----------|----------|--------|------------|--------|
| (agents will write here) |

---

## ⏰ Hour-by-Hour Schedule

### Hour 1: Setup (60 min)
- [ ] Create GitHub repo
- [ ] Get OpenRouter API key from openrouter.ai
- [ ] Set up Google Cloud project + Sheets API
- [ ] Create Google Sheet with sample data
- [ ] Initialize Python backend project with FastAPI

### Hour 2-3: Backend Core (120 min)
- [ ] Set up FastAPI server with CORS
- [ ] Create Google Sheets service (read/write)
- [ ] Create OpenRouter LLM service wrapper (Claude-SDK https://platform.claude.com/docs/en/agent-sdk/python)
- [ ] Build Monitor Agent with Claude
- [ ] Build Diagnosis Agent with Claude
- [ ] Build Dispatch Agent with Claude

### Hour 4-5: Agent Chain (120 min)
- [ ] Connect agents in sequence
- [ ] Test agent communication via OpenRouter
- [ ] Add response streaming
- [ ] Create API endpoint `/api/check-fleet`

### Hour 6: Frontend (60 min)
- [ ] Create React app with Vite
- [ ] Build Dashboard component
- [ ] Build Agent Feed (streaming text)
- [ ] Build Results display

### Hour 7: Connect & Polish (60 min)
- [ ] Connect frontend to backend
- [ ] Add loading states
- [ ] Test full flow
- [ ] Fix bugs

### Hour 8: Deploy (60 min)
- [ ] Deploy backend to Render
- [ ] Deploy frontend to Vercel
- [ ] Set environment variables
- [ ] Final testing

---

## 🔌 Key Code Snippets

### Environment Variables (.env)
```env
OPENROUTER_API_KEY=sk-or-v1-xxxxx
GOOGLE_SHEET_ID=your-sheet-id
GOOGLE_SERVICE_ACCOUNT_FILE=service-account.json
PORT=8000
```

### requirements.txt (Backend)
```
fastapi==0.104.1
uvicorn==0.24.0
python-dotenv==1.0.0
openai==1.12.0
google-auth==2.25.2
google-api-python-client==2.108.0
pydantic==2.5.0
```

### OpenRouter LLM Service (llm_service.py)
```python
from openai import OpenAI
import os

# OpenRouter API with Claude models
client = OpenAI(
    api_key=os.getenv("OPENROUTER_API_KEY"),
    base_url="https://openrouter.ai/api/v1"
)

async def run_agent(system_prompt: str, user_message: str) -> str:
    """Run agent using Claude via OpenRouter"""
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
```

### Monitor Agent Prompt (monitor_agent.py)
```python
MONITOR_SYSTEM_PROMPT = """You are a Fleet Monitor Agent for Cummins engine parts.

Analyze the parts data and identify:
1. Parts at >90% usage (CRITICAL)
2. Parts at >80% usage (WARNING)  
3. Parts at >70% usage (MONITOR)

Return JSON format:
{
  "critical": [...],
  "warning": [...],
  "ok": [...]
}"""
```

---

## 🎯 Multi-Agent Architecture

### Agent Chain Flow
```
1. User clicks "Run Fleet Check"
          ↓
2. Backend fetches parts data from Google Sheet
          ↓
3. Monitor Agent (Claude via OpenRouter) analyzes → returns {critical, warning, ok}
          ↓
4. Diagnosis Agent (Claude via OpenRouter) processes critical/warning → returns {recommendations}
          ↓
5. Dispatch Agent (Claude via OpenRouter) creates tickets → returns {tickets, summary}
          ↓
6. Backend writes tickets to Google Sheet
          ↓
7. Frontend displays results with agent feed animation
```

### Agent Communication
- All agents use **Claude 3.5 Haiku** via **OpenRouter API**
- Agents communicate through validated JSON payloads
- Each agent has a specific system prompt defining its role
- Chain agents in sequence for intelligent decision-making

---

## 🏆 Hackathon Winning Tips

### During Demo Say:
> "Cummins powers 300,000+ trucks. One engine failure costs $760/day. Watch our AI agents prevent that in seconds..."

### Show These Metrics:
```
┌─────────────────────────────┐
│  🚛 Fleet Health Summary    │
│                             │
│  Trucks Scanned: 12         │
│  Parts Critical: 3          │
│  Service Tickets: 2         │
│  Downtime Prevented: $2,280 │
└─────────────────────────────┘
```

### Emphasize:
- ✅ Multi-agent collaboration
- ✅ MCP integration (Google Sheets)
- ✅ Real business value ($$ saved)
- ✅ Scalable to enterprise

---

## 🔗 Useful Links

| Resource | URL |
|----------|-----|
| Claude API Docs | docs.anthropic.com |
| Anthropic SDK | npmjs.com/package/@anthropic-ai/sdk | https://platform.claude.com/docs/en/agent-sdk/python |
| Google Sheets API | developers.google.com/sheets/api |
| Vercel Deploy | vercel.com/docs |
| Render Deploy | render.com/docs |

---

## ⚠️ Common Pitfalls to Avoid

1. **CORS Issues** → Add CORSMiddleware in FastAPI
2. **API Key Exposed** → Use environment variables, never commit keys
3. **Sheet Permissions** → Share sheet with service account email
4. **Rate Limits** → OpenRouter free tier has usage limits (track API calls)
5. **Render Sleep** → Free tier sleeps after 15min inactivity (warn judges)
6. **Claude Token Limits** → Use Haiku model for lower token usage
7. **JSON Parsing** → Strip markdown from Claude responses before parsing

---

## ✅ Success Checklist

- [ ] Agents talk to each other
- [ ] Data reads from Google Sheet
- [ ] Tickets write to Google Sheet  
- [ ] Frontend shows streaming agent responses
- [ ] Deployed and accessible via URL
- [ ] Demo script ready
- [ ] Impact metrics displayed

**You've got this! 🚀**
