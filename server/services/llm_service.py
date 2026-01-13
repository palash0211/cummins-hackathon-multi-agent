from openai import OpenAI
import os
import json
import httpx
from typing import Dict, Any
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Global client variable
client = None

# Initialize OpenRouter client with Claude models
def get_llm_client():
    """Get or initialize OpenRouter client"""
    global client
    if client is not None:
        return client

    api_key = os.getenv("OPENROUTER_API_KEY")
    if not api_key or api_key == "sk-or-v1-your-api-key-here":
        print("Warning: OpenRouter API key not configured. Using mock responses.")
        return None

    print(f"OpenRouter API key configured: sk-or-v1-...{api_key[-8:]}")  # Show last 8 chars for confirmation

    # Create HTTP client with SSL verification disabled (for development)
    http_client = httpx.Client(verify=False)
    
    client = OpenAI(
        api_key=api_key,
        base_url="https://openrouter.ai/api/v1",
        http_client=http_client
    )
    return client

async def run_agent(system_prompt: str, user_message: str, stream_callback=None) -> str:
    """
    Run an agent using OpenRouter API (Claude models)

    Args:
        system_prompt: System instruction for the agent
        user_message: User input/data to process
        stream_callback: Async callback function(text_chunk) for streaming tokens

    Returns:
        Agent response as string
    """
    llm_client = get_llm_client()
    if not llm_client:
        # Return mock response for testing
        print("⚠️  Using MOCK response (no API key configured)")
        return generate_mock_response(system_prompt, user_message)

    try:
        print(f"🤖 Calling OpenRouter API with model: nvidia/nemotron-3-nano-30b-a3b:free")
        print(f"📡 Base URL: https://openrouter.ai/api/v1")
        
        # If streaming is requested
        if stream_callback:
            response_stream = llm_client.chat.completions.create(
                model="nvidia/nemotron-3-nano-30b-a3b:free",
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_message}
                ],
                temperature=0.7,
                max_tokens=2048,
                timeout=30.0,
                stream=True
            )
            
            full_content = ""
            for chunk in response_stream:
                if chunk.choices and chunk.choices[0].delta.content:
                    content_chunk = chunk.choices[0].delta.content
                    full_content += content_chunk
                    await stream_callback(content_chunk)
            
            print(f"✅ OpenRouter stream complete. Total length: {len(full_content)}")
            return full_content

        # Non-streaming fallback
        response = llm_client.chat.completions.create(
            model="nvidia/nemotron-3-nano-30b-a3b:free",  # Free Nvidia model via OpenRouter
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_message}
            ],
            temperature=0.7,
            max_tokens=2048,  # Increased from 1024
            timeout=30.0  # Add timeout
        )

        print(f"✅ OpenRouter API call successful")
        content = response.choices[0].message.content
        
        # Check for empty response
        if not content or len(content.strip()) == 0:
            print(f"⚠️  Empty response from API, using fallback")
            return generate_mock_response(system_prompt, user_message)
        
        print(f"📝 Response length: {len(content)} characters")
        print(f"📄 Full response: {content[:500]}...")  # Print first 500 chars
        return content
    except Exception as e:
        import traceback
        print(f"❌ Error calling OpenRouter API: {type(e).__name__}: {e}")
        print(f"📋 Full traceback:")
        traceback.print_exc()
        print(f"🔄 Falling back to mock response")
        # Fallback to mock response
        return generate_mock_response(system_prompt, user_message)

def parse_json(text: str) -> dict:
    """Parse JSON from LLM response, stripping markdown if needed"""
    print(f"🔍 Parsing JSON from text (length: {len(text)})")
    
    # Remove markdown code blocks if present
    cleaned = text
    if "```json" in text:
        cleaned = text.split("```json")[1].split("```")[0]
    elif "```" in text:
        cleaned = text.split("```")[1].split("```")[0]

    cleaned = cleaned.strip()

    try:
        result = json.loads(cleaned)
        print(f"✅ JSON parsed successfully")
        return result
    except json.JSONDecodeError as e:
        print(f"❌ Error parsing JSON: {e}")
        print(f"📋 Full text being parsed:")
        print(cleaned)
        print(f"📏 Text length: {len(cleaned)}")
        # Return a default structure to prevent crashes
        return {}

def generate_mock_response(system_prompt: str, user_message: str) -> str:
    """Generate mock responses for testing without API key - analyzes actual data"""

    # Monitor Agent mock response - ACTUALLY ANALYZE THE DATA
    if "Fleet Monitor Agent" in system_prompt:
        # Extract the actual fleet data from the user message
        try:
            # Parse the data from user_message
            import re
            data_match = re.search(r'\[.*\]', user_message, re.DOTALL)
            if data_match:
                import ast
                fleet_data = ast.literal_eval(data_match.group())

                critical = []
                warning = []
                ok = []

                # Actually analyze each part
                for part in fleet_data:
                    usage_percent = part.get('usage_percent', 0)

                    part_info = {
                        "truck_id": part.get('truck_id', ''),
                        "part": part.get('part_name', ''),
                        "usage_percent": usage_percent,
                        "current_hours": part.get('current_hours', 0),
                        "max_hours": part.get('max_hours', 0)
                    }

                    # Categorize based on ACTUAL usage
                    if usage_percent > 90:
                        critical.append(part_info)
                    elif usage_percent >= 80:
                        warning.append(part_info)
                    else:
                        ok.append(part_info)

                return json.dumps({
                    "critical": critical,
                    "warning": warning,
                    "ok": ok
                })
        except Exception as e:
            print(f"Error parsing fleet data: {e}")

        # Fallback if parsing fails
        return json.dumps({
            "critical": [],
            "warning": [],
            "ok": []
        })

    # Diagnosis Agent mock response - ANALYZE ACTUAL DATA
    elif "Diagnosis Agent" in system_prompt:
        try:
            # Parse the critical and warning parts from user message
            import re
            critical_match = re.search(r'CRITICAL PARTS.*?:\s*(\[.*?\])', user_message, re.DOTALL)
            warning_match = re.search(r'WARNING PARTS.*?:\s*(\[.*?\])', user_message, re.DOTALL)

            recommendations = []

            if critical_match:
                import ast
                critical_parts = ast.literal_eval(critical_match.group(1))
                for part in critical_parts:
                    recommendations.append({
                        "truck_id": part.get("truck_id", ""),
                        "part": part.get("part", ""),
                        "action": "REPLACE_NOW",
                        "reason": f"At {part.get('usage_percent', 0)}% usage - critical failure risk. Immediate replacement required to prevent breakdown",
                        "urgency_score": 10
                    })

            if warning_match:
                import ast
                warning_parts = ast.literal_eval(warning_match.group(1))
                for part in warning_parts:
                    recommendations.append({
                        "truck_id": part.get("truck_id", ""),
                        "part": part.get("part", ""),
                        "action": "SERVICE_SOON",
                        "reason": f"At {part.get('usage_percent', 0)}% usage - schedule service within 48 hours to prevent failure",
                        "urgency_score": 7
                    })

            return json.dumps({"recommendations": recommendations})
        except Exception as e:
            print(f"Error in diagnosis mock: {e}")
            return json.dumps({"recommendations": []})

    # Dispatch Agent mock response - CREATE TICKETS FROM ACTUAL RECOMMENDATIONS
    elif "Dispatch Agent" in system_prompt:
        try:
            # Parse recommendations from user message (it's sent as a list)
            import re
            import ast
            # The dispatch agent sends just the list, not wrapped in JSON
            rec_match = re.search(r'\[.*?\]', user_message, re.DOTALL)

            tickets = []
            urgent_count = 0
            high_count = 0
            total_downtime = 0

            if rec_match:
                recommendations = ast.literal_eval(rec_match.group(0))

                for i, rec in enumerate(recommendations):
                    urgency = rec.get("urgency_score", 5)

                    # Determine priority based on action
                    if rec.get("action") == "REPLACE_NOW":
                        priority = "URGENT"
                        downtime = 2.5
                        urgent_count += 1
                    elif rec.get("action") == "SERVICE_SOON":
                        priority = "HIGH"
                        downtime = 1.5
                        high_count += 1
                    else:
                        priority = "MEDIUM"
                        downtime = 0.5

                    tickets.append({
                        "ticket_id": f"TKT-{str(i+1).zfill(3)}",
                        "truck_id": rec.get("truck_id", ""),
                        "part_name": rec.get("part", ""),
                        "priority": priority,
                        "action": rec.get("action", ""),
                        "reason": rec.get("reason", ""),
                        "estimated_downtime_saved": downtime
                    })

                    total_downtime += downtime

            return json.dumps({
                "tickets": tickets,
                "summary": {
                    "total_tickets": len(tickets),
                    "urgent_count": urgent_count,
                    "high_count": high_count,
                    "potential_savings": int(total_downtime * 760)  # $760/day
                }
            })
        except Exception as e:
            print(f"Error in dispatch mock: {e}")
            return json.dumps({"tickets": [], "summary": {"total_tickets": 0, "urgent_count": 0, "potential_savings": 0}})

    # Default response
    return json.dumps({"status": "mock_response", "message": "No API key configured"})