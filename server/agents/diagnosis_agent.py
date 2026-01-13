from services.llm_service import run_agent, parse_json
from typing import Dict, List

DIAGNOSIS_SYSTEM_PROMPT = """You are a Diagnosis Agent for Cummins diesel engines.

For each critical/warning part, recommend action based on these guidelines:
- REPLACE_NOW: Parts at >90% usage or with critical failure risk
- SERVICE_SOON: Parts at 80-90% usage, schedule within 48 hours
- MONITOR: Parts that need watching but not immediate action

Consider these critical risks:
- Fuel filter failure = immediate engine damage, contamination
- Oil degradation = accelerated component wear, engine seizure
- Air filter clog = power loss, increased fuel consumption
- Coolant issues = overheating, head gasket failure
- Turbo failure = catastrophic engine damage, power loss
- Transmission fluid = gear damage, complete transmission failure
- Brake pad wear = safety critical, accident risk

Respond ONLY in valid JSON format:
{
  "recommendations": [
    {
      "truck_id": "",
      "part": "",
      "action": "REPLACE_NOW|SERVICE_SOON|MONITOR",
      "reason": "",
      "urgency_score": 1-10
    }
  ]
}

Urgency scores:
- 9-10: REPLACE_NOW (immediate risk)
- 6-8: SERVICE_SOON (48hr window)
- 1-5: MONITOR (watch closely)"""

async def diagnose_issues(critical_parts: List[Dict], warning_parts: List[Dict], research_data: Dict = None) -> Dict:
    """Generate diagnosis recommendations with web-enriched data"""
    try:
        print("[DIAGNOSIS] Starting diagnosis analysis...", flush=True)
        print(f"[DIAGNOSIS] Critical parts: {len(critical_parts)}, Warning parts: {len(warning_parts)}", flush=True)
        
        parts_to_diagnose = {
            "critical": critical_parts,
            "warning": warning_parts
        }
        
        research_context = ""
        if research_data:
            print("[DIAGNOSIS] Adding research data context...", flush=True)
            research_context = f"""

MARKET INTELLIGENCE (from web research):
{str(research_data.get('parts_research', [])[:5])}

Consider recall status, pricing, and failure patterns in your recommendations."""

        user_message = f"""Diagnose these parts and recommend actions:

CRITICAL PARTS (>90% usage):
{str(critical_parts)}

WARNING PARTS (80-90% usage):
{str(warning_parts)}{research_context}

For each part, provide:
1. Specific action (REPLACE_NOW, SERVICE_SOON, or MONITOR)
2. Clear reason explaining the risk
3. Urgency score (1-10)"""

        print("[DIAGNOSIS] Calling LLM for diagnosis...", flush=True)
        response = await run_agent(DIAGNOSIS_SYSTEM_PROMPT, user_message)
        result = parse_json(response)

        # Ensure the response has the expected structure
        if not result or "recommendations" not in result:
            print("[DIAGNOSIS] Invalid response from LLM, generating defaults...", flush=True)
            # Generate default recommendations for critical parts
            default_recommendations = []
            for part in critical_parts:
                default_recommendations.append({
                    "truck_id": part.get("truck_id", ""),
                    "part": part.get("part", ""),
                    "action": "REPLACE_NOW",
                    "reason": f"Critical usage at {part.get('usage_percent', 0)}% - immediate service required",
                    "urgency_score": 9
                })
            for part in warning_parts:
                default_recommendations.append({
                    "truck_id": part.get("truck_id", ""),
                    "part": part.get("part", ""),
                    "action": "SERVICE_SOON",
                    "reason": f"High usage at {part.get('usage_percent', 0)}% - schedule service within 48 hours",
                    "urgency_score": 7
                })
            result = {"recommendations": default_recommendations}

        print(f"[DIAGNOSIS] Diagnosis complete - {len(result.get('recommendations', []))} recommendations generated", flush=True)
        return result
    except Exception as e:
        import traceback
        print(f"[ERROR DIAGNOSIS] Fatal error in diagnose_issues: {str(e)}", flush=True)
        print(f"[ERROR DIAGNOSIS] Traceback: {traceback.format_exc()}", flush=True)
        # Return empty recommendations on error
        return {"recommendations": []}