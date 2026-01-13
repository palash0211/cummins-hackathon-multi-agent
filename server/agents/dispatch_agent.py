from services.llm_service import run_agent, parse_json
from typing import Dict, List
from datetime import datetime
import random

DISPATCH_SYSTEM_PROMPT = """You are a Dispatch Agent for fleet management.

Create service tickets from diagnosis recommendations with these priorities:
- URGENT: Parts needing REPLACE_NOW (urgency 9-10)
- HIGH: Parts needing SERVICE_SOON (urgency 6-8)
- MEDIUM: Parts needing MONITOR (urgency 1-5)

Calculate downtime prevention:
- Each truck breakdown = $760/day lost revenue
- URGENT tickets prevent 2-3 days downtime
- HIGH tickets prevent 1-2 days downtime
- MEDIUM tickets prevent 0.5-1 day downtime

Generate ticket IDs in format: TKT-XXX (where XXX is a number)

Respond ONLY in valid JSON format:
{
  "tickets": [
    {
      "ticket_id": "TKT-001",
      "truck_id": "",
      "part_name": "",
      "priority": "URGENT|HIGH|MEDIUM",
      "action": "",
      "reason": "",
      "estimated_downtime_saved": 0
    }
  ],
  "summary": {
    "total_tickets": 0,
    "urgent_count": 0,
    "high_count": 0,
    "medium_count": 0,
    "potential_savings": 0
  }
}"""

async def create_tickets(recommendations: Dict) -> Dict:
    """Create service tickets using Claude via OpenRouter"""
    recommendations_list = recommendations.get("recommendations", [])

    if not recommendations_list:
        return {
            "tickets": [],
            "summary": {
                "total_tickets": 0,
                "urgent_count": 0,
                "high_count": 0,
                "medium_count": 0,
                "potential_savings": 0
            }
        }

    user_message = f"""Create service tickets from these diagnosis recommendations:

{str(recommendations_list)}

For each recommendation:
1. Generate a unique ticket ID
2. Set priority based on urgency score
3. Include clear action and reason
4. Calculate estimated downtime saved
5. Calculate total potential savings ($760/day per truck)"""

    try:
        response = await run_agent(DISPATCH_SYSTEM_PROMPT, user_message)
        result = parse_json(response)

        # Ensure the response has the expected structure
        if not result or "tickets" not in result:
            # Generate default tickets
            result = generate_default_tickets(recommendations_list)

        # Add creation timestamp to each ticket
        for ticket in result.get("tickets", []):
            if "created_at" not in ticket:
                ticket["created_at"] = datetime.now().isoformat()

        return result
    except Exception as e:
        print(f"Error in dispatch agent: {e}")
        # Generate default tickets on error
        return generate_default_tickets(recommendations_list)

def generate_default_tickets(recommendations: List[Dict]) -> Dict:
    """Generate default tickets when API fails"""
    tickets = []
    urgent_count = 0
    high_count = 0
    medium_count = 0
    total_savings = 0

    for i, rec in enumerate(recommendations):
        urgency = rec.get("urgency_score", 5)
        action = rec.get("action", "SERVICE_SOON")

        # Determine priority based on urgency score
        if urgency >= 9:
            priority = "URGENT"
            downtime_saved = 2.5
            urgent_count += 1
        elif urgency >= 6:
            priority = "HIGH"
            downtime_saved = 1.5
            high_count += 1
        else:
            priority = "MEDIUM"
            downtime_saved = 0.75
            medium_count += 1

        ticket = {
            "ticket_id": f"TKT-{str(i+1).zfill(3)}",
            "truck_id": rec.get("truck_id", ""),
            "part_name": rec.get("part", ""),
            "priority": priority,
            "action": rec.get("action", "SERVICE_SOON"),
            "reason": rec.get("reason", "Maintenance required based on usage"),
            "estimated_downtime_saved": downtime_saved,
            "created_at": datetime.now().isoformat()
        }

        tickets.append(ticket)
        total_savings += downtime_saved * 760

    return {
        "tickets": tickets,
        "summary": {
            "total_tickets": len(tickets),
            "urgent_count": urgent_count,
            "high_count": high_count,
            "medium_count": medium_count,
            "potential_savings": int(total_savings)
        }
    }