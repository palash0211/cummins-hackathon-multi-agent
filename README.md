# Engine Health Monitor - AI-Powered Fleet Management System

A multi-agent AI system that monitors Cummins diesel engine parts usage and automatically creates prioritized service tickets to prevent downtime and save costs.

## Demo

The system features:
- Real-time fleet monitoring with AI agents
- Automatic risk assessment and diagnosis
- Smart ticket generation with cost savings calculation
- Live agent activity feed showing AI decision-making process

## Architecture

### Multi-Agent System
1. **Monitor Agent** - Analyzes parts usage and categorizes by risk level
2. **Diagnosis Agent** - Evaluates critical/warning parts and recommends actions
3. **Dispatch Agent** - Creates prioritized service tickets with downtime prevention metrics

### Tech Stack
- **Backend**: Python 3.12+ with FastAPI
- **Frontend**: React 18 with Vite and TailwindCSS
- **AI/LLM**: Claude 3.5 Haiku via OpenRouter API
- **Database**: Google Sheets API (MCP integration)
- **Real-time**: Server-Sent Events (SSE) for streaming updates

## Quick Start

### Prerequisites
- Python 3.8+
- Node.js 16+
- OpenRouter API key (free tier available)
- Google Cloud account (optional, for Sheets integration)

### Backend Setup

1. Navigate to the server directory:
```bash
cd engine-health-monitor/server
```

2. Create and activate virtual environment:
```bash
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

3. Install dependencies:
```bash
pip install -r requirements.txt
```

4. Configure environment variables in `.env`:
```env
PORT=8000
OPENROUTER_API_KEY=sk-or-v1-your-api-key-here
GOOGLE_SHEET_ID=your-sheet-id-here
GOOGLE_SERVICE_ACCOUNT_FILE=service-account.json
```

5. Start the backend server:
```bash
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

The API will be available at `http://localhost:8000`

### Frontend Setup

1. Navigate to the client directory:
```bash
cd engine-health-monitor/client
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm run dev
```

The frontend will be available at `http://localhost:5173`

## API Configuration

### OpenRouter API (Required for AI Features)
1. Sign up at [openrouter.ai](https://openrouter.ai)
2. Get your free API key
3. Add to `.env` file

### Google Sheets API (Optional)
1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a new project
3. Enable Google Sheets API
4. Create a service account and download JSON credentials
5. Share your Google Sheet with the service account email
6. Add credentials to server directory as `service-account.json`

### Google Sheets Structure

Create two sheets in your Google Spreadsheet:

**Sheet 1: fleet_parts**
| truck_id | part_name | current_hours | max_hours | last_service | status |
|----------|-----------|---------------|-----------|--------------|--------|
| TRK-045  | Fuel Filter | 480 | 500 | 2024-12-01 | |
| TRK-102  | Turbo | 1800 | 2000 | 2024-11-20 | |

**Sheet 2: service_tickets**
| ticket_id | truck_id | part_name | priority | action | created_at | status |
|-----------|----------|-----------|----------|--------|------------|--------|

## Usage

1. Open the application at `http://localhost:5173`
2. Click "Run Fleet Check" to start the AI analysis
3. Watch the Agent Feed as AI agents:
   - Fetch and analyze fleet data
   - Identify critical and warning parts
   - Generate maintenance recommendations
   - Create prioritized service tickets
4. View generated tickets with priority levels and cost savings
5. Monitor fleet parts status in the dashboard

## Features

### Dashboard
- Real-time fleet statistics
- Critical parts monitoring
- Active ticket tracking
- Potential savings calculation

### Agent Activity Feed
- Live streaming of agent decisions
- Step-by-step processing visualization
- Color-coded status updates

### Service Tickets
- Priority-based ticket creation (URGENT/HIGH/MEDIUM)
- Downtime prevention metrics
- Detailed action recommendations
- Timestamp tracking

### Fleet Status Table
- Usage percentage visualization
- Color-coded risk levels
- Service history tracking

## API Endpoints

- `GET /api/health` - Health check
- `GET /api/stats` - Dashboard statistics
- `GET /api/fleet-data` - Current fleet parts data
- `GET /api/tickets` - Service tickets list
- `POST /api/check-fleet` - Run complete fleet analysis
- `GET /api/check-fleet-stream` - Stream fleet analysis (SSE)

## Mock Mode

The system runs in mock mode when API keys are not configured, perfect for:
- Development and testing
- Demonstrations
- Learning the system

Mock mode provides realistic sample data and AI responses.

## Project Structure

```
engine-health-monitor/
├── server/                    # Python FastAPI Backend
│   ├── main.py               # FastAPI server entry
│   ├── requirements.txt      # Python dependencies
│   ├── .env                  # Environment variables
│   ├── agents/               # AI agent implementations
│   │   ├── monitor_agent.py
│   │   ├── diagnosis_agent.py
│   │   └── dispatch_agent.py
│   ├── services/             # External service integrations
│   │   ├── llm_service.py   # OpenRouter/Claude integration
│   │   └── sheets_service.py # Google Sheets integration
│   └── routes/               # API route definitions
│       └── api.py
│
├── client/                    # React Frontend
│   ├── src/
│   │   ├── components/       # React components
│   │   │   ├── Dashboard.jsx
│   │   │   ├── AgentFeed.jsx
│   │   │   └── TicketList.jsx
│   │   ├── App.jsx           # Main app component
│   │   ├── main.jsx          # Entry point
│   │   └── index.css         # Global styles with Tailwind
│   ├── package.json
│   ├── vite.config.js
│   └── tailwind.config.js
│
└── README.md
```

## Business Impact

- **Downtime Prevention**: Each prevented breakdown saves $760/day
- **Predictive Maintenance**: Identify issues before failures occur
- **Resource Optimization**: Prioritize maintenance by urgency
- **Cost Savings**: Track and display potential savings in real-time

## Hackathon Highlights

This project demonstrates:
- Multi-agent AI collaboration using Claude 3.5
- MCP integration with Google Sheets
- Real-time streaming updates
- Practical business value with measurable ROI
- Clean, modern UI with TailwindCSS
- Production-ready error handling

## Troubleshooting

### Backend Issues
- Ensure Python 3.8+ is installed
- Check virtual environment is activated
- Verify all dependencies are installed
- Check `.env` file configuration

### Frontend Issues
- Clear browser cache
- Check Node.js version (16+)
- Ensure backend is running on port 8000
- Check for CORS errors in browser console

### API Issues
- Verify OpenRouter API key is valid
- Check Google Sheets permissions
- Ensure service account has sheet access

## Future Enhancements

- Historical trend analysis
- Mobile app integration
- Email/SMS notifications
- Advanced predictive models
- Multi-fleet management
- Cost optimization algorithms

## License

MIT License - Feel free to use this project for your hackathon or as a learning resource.

## Acknowledgments

Built for the Cummins Engine Health Monitoring Hackathon using:
- Claude 3.5 Haiku for intelligent agent processing
- OpenRouter for LLM API access
- Google Sheets for data persistence
- FastAPI and React for robust full-stack implementation