from services.llm_service import run_agent, parse_json
from typing import Dict, List

MONITOR_SYSTEM_PROMPT = """You are a Fleet Monitor Agent for Cummins diesel engines.

Analyze the parts data and identify:
1. Parts at >90% usage (CRITICAL)
2. Parts at 80-90% usage (WARNING)
3. Parts at <80% usage (OK)

Calculate usage percentage as: (current_hours / max_hours) * 100

Respond ONLY in valid JSON format:
{
  "critical": [{"truck_id": "", "part": "", "usage_percent": 0, "current_hours": 0, "max_hours": 0}],
  "warning": [{"truck_id": "", "part": "", "usage_percent": 0, "current_hours": 0, "max_hours": 0}],
  "ok": [{"truck_id": "", "part": "", "usage_percent": 0, "current_hours": 0, "max_hours": 0}]
}

Important: Convert all hour values to integers before calculations."""

async def analyze_fleet(parts_data: List[Dict]) -> Dict:
    """Analyze fleet parts usage using Claude via OpenRouter"""
    # Convert string values to integers for calculation
    processed_data = []
    for part in parts_data:
        try:
            current = int(part.get("current_hours", 0))
            max_hours = int(part.get("max_hours", 1))
            usage_percent = (current / max_hours) * 100 if max_hours > 0 else 0

            processed_data.append({
                "truck_id": part.get("truck_id", ""),
                "part_name": part.get("part_name", ""),
                "current_hours": current,
                "max_hours": max_hours,
                "usage_percent": round(usage_percent, 1),
                "last_service": part.get("last_service", "")
            })
        except (ValueError, TypeError) as e:
            print(f"Error processing part data: {e}")
            continue

    user_message = f"""Analyze this fleet parts data and categorize by usage percentage:
{str(processed_data)}

Remember to:
- CRITICAL: >90% usage
- WARNING: 80-90% usage
- OK: <80% usage"""

    try:
        response = await run_agent(MONITOR_SYSTEM_PROMPT, user_message)
        result = parse_json(response)

        # Ensure the response has the expected structure
        if not result:
            result = {"critical": [], "warning": [], "ok": []}

        # Add default keys if missing
        if "critical" not in result:
            result["critical"] = []
        if "warning" not in result:
            result["warning"] = []
        if "ok" not in result:
            result["ok"] = []

        return result
    except Exception as e:
        print(f"Error in monitor agent: {e}")
        # Return empty categories on error
        return {"critical": [], "warning": [], "ok": []}