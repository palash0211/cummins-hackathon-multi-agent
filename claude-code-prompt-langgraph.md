# Claude Code Prompt: Engine Parts Health Monitor (LangGraph Multi-Agent)

## Project Overview

Build a **multi-agent orchestration system** called "Engine Parts Health Monitor" for Cummins diesel engines using **LangGraph** for agent orchestration. The system demonstrates how multiple AI agents collaborate, pass state, and make decisions together.

**Key Hackathon Differentiator:** This project showcases **LangGraph's orchestration** with a clear visual flow of agents communicating through a state graph.

---

## Tech Stack

- **Backend:** Python + FastAPI
- **Agent Orchestration:** LangGraph (from LangChain)
- **LLM:** OpenRouter API with `nvidia/nemotron-3-nano-30b-a3b:free` model
- **Database/MCP:** Google Sheets API (read fleet data, write service tickets)
- **Frontend:** React + Vite + TailwindCSS
- **Package Manager:** pip (backend), npm (frontend)

---

## Project Structure

```
engine-health-monitor/
├── backend/
│   ├── main.py                  # FastAPI server entry
│   ├── requirements.txt
│   ├── .env
│   ├── agents/
│   │   ├── __init__.py
│   │   ├── monitor_agent.py     # Checks parts usage
│   │   ├── diagnosis_agent.py   # Recommends actions
│   │   └── dispatch_agent.py    # Creates tickets
│   ├── orchestrator/
│   │   ├── __init__.py
│   │   ├── graph.py             # LangGraph orchestration (MAIN FOCUS)
│   │   └── state.py             # Shared state definition
│   ├── services/
│   │   ├── __init__.py
│   │   ├── llm_service.py       # OpenRouter LLM wrapper
│   │   └── sheets_service.py    # Google Sheets API wrapper
│   └── models/
│       ├── __init__.py
│       └── schemas.py           # Pydantic models
│
├── frontend/
│   ├── src/
│   │   ├── App.jsx
│   │   ├── main.jsx
│   │   ├── index.css
│   │   └── components/
│   │       ├── Dashboard.jsx
│   │       ├── OrchestrationFlow.jsx  # Visualize agent graph
│   │       ├── AgentFeed.jsx
│   │       └── TicketList.jsx
│   ├── package.json
│   └── vite.config.js
│
└── README.md
```

---

## Backend Requirements

### 1. Dependencies (`backend/requirements.txt`)

```
fastapi==0.109.0
uvicorn==0.27.0
python-dotenv==1.0.0
langchain==0.3.14
langgraph==0.2.61
langchain-openai==0.3.0
gspread==6.0.0
google-auth==2.27.0
pydantic==2.5.0
httpx==0.26.0
```

### 2. FastAPI Server (`backend/main.py`)

```python
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from orchestrator.graph import run_fleet_check_workflow
from services.sheets_service import get_parts_data, save_tickets

load_dotenv()

app = FastAPI(title="Engine Health Monitor")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def root():
    return {"status": "Engine Health Monitor API running"}

@app.post("/api/check-fleet")
async def check_fleet():
    """Main endpoint - triggers the LangGraph orchestration"""
    try:
        # Get data from Google Sheets
        parts_data = await get_parts_data()
        
        # Run LangGraph workflow (THIS IS THE ORCHESTRATION!)
        result = await run_fleet_check_workflow(parts_data)
        
        # Save tickets to Google Sheets
        if result.get("tickets"):
            await save_tickets(result["tickets"])
        
        return {
            "success": True,
            "workflow_trace": result["workflow_trace"],  # Shows agent flow
            "monitor_result": result["monitor_result"],
            "diagnosis_result": result["diagnosis_result"],
            "dispatch_result": result["dispatch_result"],
            "summary": result["summary"]
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/fleet-data")
async def get_fleet():
    """Get current fleet parts data"""
    data = await get_parts_data()
    return {"parts": data}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
```

---

## LangGraph Orchestration (CORE FEATURE)

### 3. State Definition (`backend/orchestrator/state.py`)

```python
from typing import TypedDict, List, Optional, Annotated
from operator import add

class PartData(TypedDict):
    truck_id: str
    part_name: str
    current_hours: int
    max_hours: int
    last_service: str

class CriticalPart(TypedDict):
    truck_id: str
    part: str
    usage_percent: float
    current_hours: int
    max_hours: int

class Recommendation(TypedDict):
    truck_id: str
    part: str
    action: str  # REPLACE_NOW, SERVICE_SOON, MONITOR
    reason: str
    urgency_score: int

class ServiceTicket(TypedDict):
    ticket_id: str
    truck_id: str
    part: str
    priority: str  # URGENT, HIGH, MEDIUM
    action: str
    reason: str
    estimated_downtime_saved: float

# Main State that flows through the graph
class FleetHealthState(TypedDict):
    # Input
    parts_data: List[PartData]
    
    # Monitor Agent Output
    critical_parts: List[CriticalPart]
    warning_parts: List[CriticalPart]
    ok_parts: List[CriticalPart]
    
    # Diagnosis Agent Output
    recommendations: List[Recommendation]
    
    # Dispatch Agent Output
    tickets: List[ServiceTicket]
    
    # Summary
    total_trucks_scanned: int
    total_critical: int
    total_tickets: int
    potential_savings: float
    
    # Orchestration Tracking (for visualization)
    workflow_trace: Annotated[List[str], add]  # Accumulates agent steps
    current_agent: str
    errors: List[str]
```

### 4. LangGraph Workflow (`backend/orchestrator/graph.py`)

**THIS IS THE MAIN ORCHESTRATION FILE - MOST IMPORTANT!**

```python
from langgraph.graph import StateGraph, END
from orchestrator.state import FleetHealthState
from agents.monitor_agent import monitor_node
from agents.diagnosis_agent import diagnosis_node
from agents.dispatch_agent import dispatch_node
from typing import Literal

def should_continue_to_diagnosis(state: FleetHealthState) -> Literal["diagnosis", "end"]:
    """
    Conditional edge: Only proceed to diagnosis if there are critical/warning parts.
    This demonstrates LangGraph's routing capability.
    """
    if state["critical_parts"] or state["warning_parts"]:
        return "diagnosis"
    return "end"

def should_continue_to_dispatch(state: FleetHealthState) -> Literal["dispatch", "end"]:
    """
    Conditional edge: Only create tickets if there are recommendations.
    """
    if state["recommendations"]:
        return "dispatch"
    return "end"

def create_fleet_health_graph() -> StateGraph:
    """
    Creates the LangGraph workflow for fleet health monitoring.
    
    Graph Flow:
    
        ┌─────────────┐
        │   START     │
        └──────┬──────┘
               │
               ▼
        ┌─────────────┐
        │   MONITOR   │  ← Analyzes all parts
        │    AGENT    │
        └──────┬──────┘
               │
               ▼
        ┌─────────────┐     No issues
        │  Decision   │─────────────────┐
        │   Point 1   │                 │
        └──────┬──────┘                 │
               │ Has issues             │
               ▼                        │
        ┌─────────────┐                 │
        │  DIAGNOSIS  │  ← Recommends   │
        │    AGENT    │    actions      │
        └──────┬──────┘                 │
               │                        │
               ▼                        │
        ┌─────────────┐     No action   │
        │  Decision   │─────────────────┤
        │   Point 2   │                 │
        └──────┬──────┘                 │
               │ Has recommendations    │
               ▼                        │
        ┌─────────────┐                 │
        │  DISPATCH   │  ← Creates      │
        │    AGENT    │    tickets      │
        └──────┬──────┘                 │
               │                        │
               ▼                        │
        ┌─────────────┐                 │
        │    END      │◄────────────────┘
        └─────────────┘
    """
    
    # Create the graph with our state
    workflow = StateGraph(FleetHealthState)
    
    # Add nodes (agents)
    workflow.add_node("monitor", monitor_node)
    workflow.add_node("diagnosis", diagnosis_node)
    workflow.add_node("dispatch", dispatch_node)
    
    # Set entry point
    workflow.set_entry_point("monitor")
    
    # Add conditional edges (THIS IS THE ORCHESTRATION LOGIC!)
    workflow.add_conditional_edges(
        "monitor",
        should_continue_to_diagnosis,
        {
            "diagnosis": "diagnosis",
            "end": END
        }
    )
    
    workflow.add_conditional_edges(
        "diagnosis",
        should_continue_to_dispatch,
        {
            "dispatch": "dispatch",
            "end": END
        }
    )
    
    # Dispatch always ends
    workflow.add_edge("dispatch", END)
    
    return workflow.compile()

# Create the compiled graph
fleet_health_graph = create_fleet_health_graph()

async def run_fleet_check_workflow(parts_data: list) -> dict:
    """
    Execute the full workflow and return results.
    """
    # Initialize state
    initial_state: FleetHealthState = {
        "parts_data": parts_data,
        "critical_parts": [],
        "warning_parts": [],
        "ok_parts": [],
        "recommendations": [],
        "tickets": [],
        "total_trucks_scanned": 0,
        "total_critical": 0,
        "total_tickets": 0,
        "potential_savings": 0.0,
        "workflow_trace": ["🚀 Workflow started"],
        "current_agent": "initializing",
        "errors": []
    }
    
    # Run the graph
    final_state = await fleet_health_graph.ainvoke(initial_state)
    
    return {
        "workflow_trace": final_state["workflow_trace"],
        "monitor_result": {
            "critical": final_state["critical_parts"],
            "warning": final_state["warning_parts"],
            "ok": final_state["ok_parts"]
        },
        "diagnosis_result": {
            "recommendations": final_state["recommendations"]
        },
        "dispatch_result": {
            "tickets": final_state["tickets"]
        },
        "summary": {
            "trucks_scanned": final_state["total_trucks_scanned"],
            "critical_count": final_state["total_critical"],
            "tickets_created": final_state["total_tickets"],
            "potential_savings": final_state["potential_savings"]
        }
    }
```

---

## Agent Implementations

### 5. Monitor Agent (`backend/agents/monitor_agent.py`)

```python
from orchestrator.state import FleetHealthState
from services.llm_service import call_llm
import json

MONITOR_SYSTEM_PROMPT = """You are a Fleet Monitor Agent for Cummins diesel engines.

Analyze the parts data and categorize each part by usage percentage:
- CRITICAL: >90% usage (needs immediate attention)
- WARNING: 80-90% usage (schedule soon)
- OK: <80% usage (no action needed)

Calculate usage_percent = (current_hours / max_hours) * 100

Respond ONLY with valid JSON, no markdown:
{
  "critical": [{"truck_id": "", "part": "", "usage_percent": 0, "current_hours": 0, "max_hours": 0}],
  "warning": [{"truck_id": "", "part": "", "usage_percent": 0, "current_hours": 0, "max_hours": 0}],
  "ok": [{"truck_id": "", "part": "", "usage_percent": 0, "current_hours": 0, "max_hours": 0}]
}"""

async def monitor_node(state: FleetHealthState) -> dict:
    """
    Monitor Agent Node - Analyzes parts and categorizes by severity.
    """
    parts_data = state["parts_data"]
    
    # Call LLM
    user_message = f"Analyze this fleet parts data:\n{json.dumps(parts_data, indent=2)}"
    response = await call_llm(MONITOR_SYSTEM_PROMPT, user_message)
    
    # Parse response
    result = json.loads(response)
    
    # Count unique trucks
    all_trucks = set(p["truck_id"] for p in parts_data)
    
    return {
        "critical_parts": result.get("critical", []),
        "warning_parts": result.get("warning", []),
        "ok_parts": result.get("ok", []),
        "total_trucks_scanned": len(all_trucks),
        "total_critical": len(result.get("critical", [])),
        "workflow_trace": [f"🔍 Monitor Agent: Found {len(result.get('critical', []))} critical, {len(result.get('warning', []))} warning parts"],
        "current_agent": "monitor_complete"
    }
```

### 6. Diagnosis Agent (`backend/agents/diagnosis_agent.py`)

```python
from orchestrator.state import FleetHealthState
from services.llm_service import call_llm
import json

DIAGNOSIS_SYSTEM_PROMPT = """You are a Diagnosis Agent for Cummins diesel engines.

For each critical/warning part, recommend an action:
- REPLACE_NOW: Immediate replacement needed (risk of failure)
- SERVICE_SOON: Schedule within 48 hours
- MONITOR: Watch closely, no immediate action

Consider these risks:
- Fuel filter near limit = engine damage risk
- Oil near limit = component wear
- Air filter clog = power loss
- Turbo issues = major repair costs

Respond ONLY with valid JSON, no markdown:
{
  "recommendations": [
    {"truck_id": "", "part": "", "action": "REPLACE_NOW|SERVICE_SOON|MONITOR", "reason": "", "urgency_score": 1-10}
  ]
}"""

async def diagnosis_node(state: FleetHealthState) -> dict:
    """
    Diagnosis Agent Node - Recommends actions based on analysis.
    """
    critical = state["critical_parts"]
    warning = state["warning_parts"]
    
    input_data = {
        "critical_parts": critical,
        "warning_parts": warning
    }
    
    user_message = f"Diagnose these parts and recommend actions:\n{json.dumps(input_data, indent=2)}"
    response = await call_llm(DIAGNOSIS_SYSTEM_PROMPT, user_message)
    
    result = json.loads(response)
    recommendations = result.get("recommendations", [])
    
    return {
        "recommendations": recommendations,
        "workflow_trace": [f"🔧 Diagnosis Agent: Generated {len(recommendations)} recommendations"],
        "current_agent": "diagnosis_complete"
    }
```

### 7. Dispatch Agent (`backend/agents/dispatch_agent.py`)

```python
from orchestrator.state import FleetHealthState
from services.llm_service import call_llm
import json
from datetime import datetime

DISPATCH_SYSTEM_PROMPT = """You are a Dispatch Agent for fleet service management.

Create service tickets from the recommendations.
- Assign priority: URGENT (urgency_score >= 8), HIGH (5-7), MEDIUM (< 5)
- Calculate downtime prevention savings: $760/day per truck prevented from breaking down
- Generate ticket IDs like TKT-001, TKT-002, etc.

Respond ONLY with valid JSON, no markdown:
{
  "tickets": [
    {
      "ticket_id": "TKT-001",
      "truck_id": "",
      "part": "",
      "priority": "URGENT|HIGH|MEDIUM",
      "action": "",
      "reason": "",
      "estimated_downtime_saved": 760
    }
  ],
  "total_potential_savings": 0
}"""

async def dispatch_node(state: FleetHealthState) -> dict:
    """
    Dispatch Agent Node - Creates service tickets.
    """
    recommendations = state["recommendations"]
    
    user_message = f"Create service tickets for these recommendations:\n{json.dumps(recommendations, indent=2)}"
    response = await call_llm(DISPATCH_SYSTEM_PROMPT, user_message)
    
    result = json.loads(response)
    tickets = result.get("tickets", [])
    savings = result.get("total_potential_savings", len(tickets) * 760)
    
    return {
        "tickets": tickets,
        "total_tickets": len(tickets),
        "potential_savings": savings,
        "workflow_trace": [f"📋 Dispatch Agent: Created {len(tickets)} tickets | Potential savings: ${savings}"],
        "current_agent": "dispatch_complete"
    }
```

---

## Services

### 8. LLM Service (`backend/services/llm_service.py`)

```python
import os
import httpx
import json

OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY")
MODEL = "nvidia/nemotron-3-nano-30b-a3b:free"

async def call_llm(system_prompt: str, user_message: str) -> str:
    """
    Call OpenRouter API with the free NVIDIA model.
    Returns the LLM response text.
    """
    async with httpx.AsyncClient() as client:
        response = await client.post(
            "https://openrouter.ai/api/v1/chat/completions",
            headers={
                "Authorization": f"Bearer {OPENROUTER_API_KEY}",
                "Content-Type": "application/json",
                "HTTP-Referer": "https://engine-health-monitor.com",
                "X-Title": "Engine Health Monitor"
            },
            json={
                "model": MODEL,
                "messages": [
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_message}
                ],
                "temperature": 0.7
            },
            timeout=60.0
        )
        
        result = response.json()
        content = result["choices"][0]["message"]["content"]
        
        # Clean markdown if present
        content = content.strip()
        if content.startswith("```json"):
            content = content[7:]
        if content.startswith("```"):
            content = content[3:]
        if content.endswith("```"):
            content = content[:-3]
        
        return content.strip()
```

### 9. Google Sheets Service (`backend/services/sheets_service.py`)

```python
import os
import gspread
from google.oauth2.service_account import Credentials
import json

SCOPES = [
    'https://www.googleapis.com/auth/spreadsheets',
    'https://www.googleapis.com/auth/drive'
]

def get_sheets_client():
    """Initialize Google Sheets client."""
    creds_json = os.getenv("GOOGLE_CREDENTIALS_JSON")
    creds_dict = json.loads(creds_json)
    creds = Credentials.from_service_account_info(creds_dict, scopes=SCOPES)
    return gspread.authorize(creds)

async def get_parts_data() -> list:
    """Read fleet parts data from Google Sheet."""
    try:
        client = get_sheets_client()
        sheet = client.open_by_key(os.getenv("GOOGLE_SHEET_ID"))
        worksheet = sheet.worksheet("fleet_parts")
        records = worksheet.get_all_records()
        return records
    except Exception as e:
        # Return mock data if sheets fails
        print(f"Sheets error: {e}, using mock data")
        return get_mock_data()

async def save_tickets(tickets: list):
    """Write service tickets to Google Sheet."""
    try:
        client = get_sheets_client()
        sheet = client.open_by_key(os.getenv("GOOGLE_SHEET_ID"))
        worksheet = sheet.worksheet("service_tickets")
        
        for ticket in tickets:
            worksheet.append_row([
                ticket.get("ticket_id", ""),
                ticket.get("truck_id", ""),
                ticket.get("part", ""),
                ticket.get("priority", ""),
                ticket.get("action", ""),
                ticket.get("reason", ""),
                str(ticket.get("estimated_downtime_saved", 0))
            ])
    except Exception as e:
        print(f"Error saving tickets: {e}")

def get_mock_data() -> list:
    """Mock data for testing without Google Sheets."""
    return [
        {"truck_id": "TRK-045", "part_name": "Fuel Filter", "current_hours": 480, "max_hours": 500, "last_service": "2024-12-01"},
        {"truck_id": "TRK-045", "part_name": "Oil", "current_hours": 230, "max_hours": 250, "last_service": "2024-12-15"},
        {"truck_id": "TRK-102", "part_name": "Turbo", "current_hours": 1800, "max_hours": 2000, "last_service": "2024-11-20"},
        {"truck_id": "TRK-078", "part_name": "Air Filter", "current_hours": 390, "max_hours": 400, "last_service": "2024-12-10"},
        {"truck_id": "TRK-091", "part_name": "Coolant", "current_hours": 450, "max_hours": 500, "last_service": "2024-12-05"},
        {"truck_id": "TRK-091", "part_name": "Battery", "current_hours": 700, "max_hours": 1000, "last_service": "2024-10-15"},
        {"truck_id": "TRK-102", "part_name": "Brake Pads", "current_hours": 850, "max_hours": 1000, "last_service": "2024-09-20"}
    ]
```

---

## Environment Variables

**backend/.env**
```
OPENROUTER_API_KEY=sk-or-v1-xxxxx
GOOGLE_SHEET_ID=your-sheet-id-here
GOOGLE_CREDENTIALS_JSON={"type": "service_account", "project_id": "...", ...}
```

---

## Frontend - Orchestration Visualization

### 10. Orchestration Flow Component (`frontend/src/components/OrchestrationFlow.jsx`)

**This component visualizes the LangGraph workflow!**

```jsx
import React from 'react';
import { CheckCircle, Circle, ArrowRight, AlertTriangle, Wrench, FileText } from 'lucide-react';

const agents = [
  { id: 'monitor', name: 'Monitor Agent', icon: AlertTriangle, color: 'blue' },
  { id: 'diagnosis', name: 'Diagnosis Agent', icon: Wrench, color: 'yellow' },
  { id: 'dispatch', name: 'Dispatch Agent', icon: FileText, color: 'green' }
];

export default function OrchestrationFlow({ workflowTrace, currentAgent }) {
  const getAgentStatus = (agentId) => {
    if (!workflowTrace) return 'pending';
    const agentTraces = workflowTrace.filter(t => t.toLowerCase().includes(agentId));
    if (agentTraces.length > 0) return 'complete';
    if (currentAgent === agentId) return 'active';
    return 'pending';
  };

  return (
    <div className="bg-gray-800 rounded-lg p-6 mb-6">
      <h3 className="text-lg font-semibold text-white mb-4">
        🔄 LangGraph Orchestration Flow
      </h3>
      
      <div className="flex items-center justify-between">
        {agents.map((agent, index) => (
          <React.Fragment key={agent.id}>
            <div className={`flex flex-col items-center p-4 rounded-lg ${
              getAgentStatus(agent.id) === 'complete' ? 'bg-green-900/50' :
              getAgentStatus(agent.id) === 'active' ? 'bg-blue-900/50 animate-pulse' :
              'bg-gray-700/50'
            }`}>
              <agent.icon className={`w-8 h-8 mb-2 ${
                getAgentStatus(agent.id) === 'complete' ? 'text-green-400' :
                getAgentStatus(agent.id) === 'active' ? 'text-blue-400' :
                'text-gray-500'
              }`} />
              <span className="text-sm text-white">{agent.name}</span>
              {getAgentStatus(agent.id) === 'complete' && (
                <CheckCircle className="w-4 h-4 text-green-400 mt-1" />
              )}
            </div>
            
            {index < agents.length - 1 && (
              <ArrowRight className="w-6 h-6 text-gray-500 mx-2" />
            )}
          </React.Fragment>
        ))}
      </div>
      
      {/* Workflow Trace Log */}
      <div className="mt-4 bg-gray-900 rounded p-3 max-h-40 overflow-y-auto">
        {workflowTrace?.map((trace, i) => (
          <div key={i} className="text-sm text-gray-300 py-1">
            {trace}
          </div>
        ))}
      </div>
    </div>
  );
}
```

### 11. Main Dashboard (`frontend/src/components/Dashboard.jsx`)

```jsx
import React, { useState } from 'react';
import axios from 'axios';
import OrchestrationFlow from './OrchestrationFlow';
import { Play, Loader } from 'lucide-react';

export default function Dashboard() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const runFleetCheck = async () => {
    setLoading(true);
    try {
      const response = await axios.post('http://localhost:8000/api/check-fleet');
      setResult(response.data);
    } catch (error) {
      console.error('Error:', error);
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gray-900 p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold text-white mb-2">
          🔧 Engine Parts Health Monitor
        </h1>
        <p className="text-gray-400 mb-6">
          Multi-Agent System powered by LangGraph Orchestration
        </p>

        <button
          onClick={runFleetCheck}
          disabled={loading}
          className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg flex items-center gap-2 mb-6"
        >
          {loading ? <Loader className="animate-spin" /> : <Play />}
          {loading ? 'Running Agents...' : 'Run Fleet Check'}
        </button>

        {result && (
          <>
            {/* Orchestration Visualization */}
            <OrchestrationFlow 
              workflowTrace={result.workflow_trace}
              currentAgent={result.current_agent}
            />

            {/* Summary Cards */}
            <div className="grid grid-cols-4 gap-4 mb-6">
              <div className="bg-gray-800 p-4 rounded-lg">
                <div className="text-2xl font-bold text-white">
                  {result.summary?.trucks_scanned || 0}
                </div>
                <div className="text-gray-400">Trucks Scanned</div>
              </div>
              <div className="bg-red-900/50 p-4 rounded-lg">
                <div className="text-2xl font-bold text-red-400">
                  {result.summary?.critical_count || 0}
                </div>
                <div className="text-gray-400">Critical Parts</div>
              </div>
              <div className="bg-yellow-900/50 p-4 rounded-lg">
                <div className="text-2xl font-bold text-yellow-400">
                  {result.summary?.tickets_created || 0}
                </div>
                <div className="text-gray-400">Tickets Created</div>
              </div>
              <div className="bg-green-900/50 p-4 rounded-lg">
                <div className="text-2xl font-bold text-green-400">
                  ${result.summary?.potential_savings?.toLocaleString() || 0}
                </div>
                <div className="text-gray-400">Savings</div>
              </div>
            </div>

            {/* Tickets Table */}
            {result.dispatch_result?.tickets?.length > 0 && (
              <div className="bg-gray-800 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-white mb-4">
                  📋 Service Tickets
                </h3>
                <table className="w-full text-left">
                  <thead>
                    <tr className="text-gray-400 border-b border-gray-700">
                      <th className="pb-2">Ticket</th>
                      <th className="pb-2">Truck</th>
                      <th className="pb-2">Part</th>
                      <th className="pb-2">Priority</th>
                      <th className="pb-2">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.dispatch_result.tickets.map((ticket, i) => (
                      <tr key={i} className="text-white border-b border-gray-700">
                        <td className="py-2">{ticket.ticket_id}</td>
                        <td>{ticket.truck_id}</td>
                        <td>{ticket.part}</td>
                        <td>
                          <span className={`px-2 py-1 rounded text-xs ${
                            ticket.priority === 'URGENT' ? 'bg-red-600' :
                            ticket.priority === 'HIGH' ? 'bg-yellow-600' :
                            'bg-blue-600'
                          }`}>
                            {ticket.priority}
                          </span>
                        </td>
                        <td>{ticket.action}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
```

---

## Google Sheet Structure

**Sheet 1: fleet_parts**
| truck_id | part_name | current_hours | max_hours | last_service |
|----------|-----------|---------------|-----------|--------------|
| TRK-045 | Fuel Filter | 480 | 500 | 2024-12-01 |
| TRK-045 | Oil | 230 | 250 | 2024-12-15 |
| TRK-102 | Turbo | 1800 | 2000 | 2024-11-20 |

**Sheet 2: service_tickets**
| ticket_id | truck_id | part_name | priority | action | reason | estimated_downtime_saved |

---

## LangGraph Flow Diagram (For Presentation)

```
                    ┌─────────────────────────────────────┐
                    │         LANGGRAPH WORKFLOW          │
                    └─────────────────────────────────────┘
                                      │
                                      ▼
                    ┌─────────────────────────────────────┐
                    │          📊 MONITOR AGENT           │
                    │   "Analyze fleet parts data"        │
                    │   Output: critical, warning, ok     │
                    └─────────────────┬───────────────────┘
                                      │
                          ┌───────────┴───────────┐
                          ▼                       ▼
                   Has Issues?              No Issues
                          │                       │
                          ▼                       ▼
                    ┌─────────────┐         ┌─────────┐
                    │  DIAGNOSIS  │         │   END   │
                    │    AGENT    │         │  (skip) │
                    └──────┬──────┘         └─────────┘
                           │
                           ▼
                    ┌─────────────────────────────────────┐
                    │          🔧 DIAGNOSIS AGENT         │
                    │   "Recommend: REPLACE/SERVICE"      │
                    │   Output: recommendations[]         │
                    └─────────────────┬───────────────────┘
                                      │
                          ┌───────────┴───────────┐
                          ▼                       ▼
                 Has Actions?             No Actions
                          │                       │
                          ▼                       ▼
                    ┌─────────────┐         ┌─────────┐
                    │  DISPATCH   │         │   END   │
                    │    AGENT    │         │  (skip) │
                    └──────┬──────┘         └─────────┘
                           │
                           ▼
                    ┌─────────────────────────────────────┐
                    │          📋 DISPATCH AGENT          │
                    │   "Create service tickets"          │
                    │   Output: tickets[], savings        │
                    └─────────────────┬───────────────────┘
                                      │
                                      ▼
                    ┌─────────────────────────────────────┐
                    │              ✅ END                  │
                    │   Return full state to frontend     │
                    └─────────────────────────────────────┘
```

---

## Build Commands

```bash
# Backend
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000

# Frontend
cd frontend
npm install
npm run dev
```

---

## Demo Script (60 seconds)

> "This is Engine Health Monitor - a multi-agent system using LangGraph orchestration."
>
> *clicks Run Fleet Check*
>
> "Watch the orchestration flow - Monitor Agent analyzes parts, passes state to Diagnosis Agent, which creates recommendations for Dispatch Agent."
>
> "LangGraph handles the conditional routing - if no issues found, it skips unnecessary agents."
>
> "Result: 3 service tickets created, $2,280 in downtime prevented."

---

## What Makes This Win?

1. **LangGraph Orchestration** - Clear visual flow of agents
2. **Conditional Routing** - Smart decisions on when to skip agents
3. **State Management** - Shared state flows through the graph
4. **MCP Integration** - Google Sheets as data source
5. **Real Business Value** - Cost savings calculation
6. **Free LLM** - No API costs with OpenRouter

Build this project now. Start with backend orchestrator/graph.py as it's the core feature.
