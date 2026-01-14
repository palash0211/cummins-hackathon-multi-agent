from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from services import sheets_service
from agents import monitor_agent, diagnosis_agent, dispatch_agent, research_agent
import json
import asyncio
from typing import AsyncGenerator

router = APIRouter()

@router.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "service": "Engine Health Monitor API"}

@router.get("/check-fleet-stream")
async def check_fleet_stream():
    """
    Streaming multi-agent orchestration using OpenAI SDK.
    Returns Server-Sent Events (SSE) with live agent reasoning.
    """
    from openai import AsyncOpenAI
    import os
    import httpx
    
    # Create custom HTTP client with SSL verification disabled (for corporate proxies)
    http_client = httpx.AsyncClient(
        verify=False,
        headers={
            "HTTP-Referer": "https://cummins-engine-monitor.app",
            "X-Title": "Cummins Fleet Monitor"
        }
    )
    
    client = AsyncOpenAI(
        api_key=os.getenv("OPENAI_API_KEY"),
        base_url=os.getenv("OPENAI_BASE_URL", "https://api.openai.com/v1"),
        http_client=http_client
    )

    async def stream_agent_orchestration():
        try:
            # Fetch fleet data
            yield f"data: {json.dumps({'type': 'agent_update', 'agent': 'system', 'message': '🔍 Fetching fleet data...'})}\n\n"
            fleet_data = await sheets_service.get_fleet_parts()
            yield f"data: {json.dumps({'type': 'agent_update', 'agent': 'system', 'message': f'✓ Loaded {len(fleet_data)} parts from fleet'})}\n\n"
            
            # Prepare compact data for agents
            parts_summary = []
            for part in fleet_data[:10]:  # Limit to avoid overload
                try:
                    current = int(part.get("current_hours", 0))
                    max_hours = int(part.get("max_hours", 1))
                    usage = round((current / max_hours * 100), 1) if max_hours > 0 else 0
                    parts_summary.append({
                        "truck": part.get("truck_id"),
                        "part": part.get("part_name"),
                        "usage": usage,
                        "hours": f"{current}/{max_hours}"
                    })
                except:
                    continue
            
            # Agent 1: Monitor Agent - Stream analysis
            yield f"data: {json.dumps({'type': 'agent_update', 'agent': 'monitor_agent', 'message': '🔎 Monitor Agent analyzing fleet health...'})}\n\n"
            
            monitor_prompt = f"""You are a Fleet Monitor Agent. Analyze these parts and identify critical issues (>90% usage).
Be concise and actionable. Parts data: {json.dumps(parts_summary)}

Provide a brief summary of critical parts found."""

            stream = await client.chat.completions.create(
                model=os.getenv("OPENAI_MODEL", "gpt-4"),
                messages=[{"role": "user", "content": monitor_prompt}],
                stream=True,
                max_tokens=500
            )
            
            monitor_response = ""
            async for chunk in stream:
                if chunk.choices[0].delta.content:
                    content = chunk.choices[0].delta.content
                    monitor_response += content
                    yield f"data: {json.dumps({'type': 'agent_update', 'agent': 'monitor_agent', 'message': content})}\n\n"
            
            yield f"data: {json.dumps({'type': 'agent_complete', 'agent': 'monitor_agent', 'summary': monitor_response[:200]})}\n\n"
            
            # Agent 2: Research Agent
            yield f"data: {json.dumps({'type': 'agent_update', 'agent': 'research_agent', 'message': '🌐 Research Agent checking market data...'})}\n\n"
            
            research_prompt = f"""You are a Research Agent. Based on this monitor report: "{monitor_response[:300]}"

Provide brief market insights and replacement part recommendations. Be concise."""

            stream = await client.chat.completions.create(
                model=os.getenv("OPENAI_MODEL", "gpt-4"),
                messages=[{"role": "user", "content": research_prompt}],
                stream=True,
                max_tokens=400
            )
            
            research_response = ""
            async for chunk in stream:
                if chunk.choices[0].delta.content:
                    content = chunk.choices[0].delta.content
                    research_response += content
                    yield f"data: {json.dumps({'type': 'agent_update', 'agent': 'research_agent', 'message': content})}\n\n"
            
            yield f"data: {json.dumps({'type': 'agent_complete', 'agent': 'research_agent', 'summary': research_response[:200]})}\n\n"
            
            # Agent 3: Diagnosis Agent
            yield f"data: {json.dumps({'type': 'agent_update', 'agent': 'diagnosis_agent', 'message': '⚕️ Diagnosis Agent generating recommendations...'})}\n\n"
            
            diagnosis_prompt = f"""You are a Diagnosis Agent. Based on:
Monitor: {monitor_response[:200]}
Research: {research_response[:200]}

Provide 2-3 priority action items. Be concise and specific."""

            stream = await client.chat.completions.create(
                model=os.getenv("OPENAI_MODEL", "gpt-4"),
                messages=[{"role": "user", "content": diagnosis_prompt}],
                stream=True,
                max_tokens=300
            )
            
            diagnosis_response = ""
            async for chunk in stream:
                if chunk.choices[0].delta.content:
                    content = chunk.choices[0].delta.content
                    diagnosis_response += content
                    yield f"data: {json.dumps({'type': 'agent_update', 'agent': 'diagnosis_agent', 'message': content})}\n\n"
            
            yield f"data: {json.dumps({'type': 'agent_complete', 'agent': 'diagnosis_agent', 'summary': diagnosis_response[:200]})}\n\n"
            
            # Agent 4: Dispatch Agent
            yield f"data: {json.dumps({'type': 'agent_update', 'agent': 'dispatch_agent', 'message': '📋 Dispatch Agent creating service tickets...'})}\n\n"
            
            dispatch_prompt = f"""You are a Dispatch Agent. Based on diagnosis: "{diagnosis_response[:200]}"

Create service tickets in JSON format. Each ticket should have:
- truck_id: the truck identifier
- part_name: the part that needs attention
- priority: "urgent", "high", or "medium"
- description: brief action needed
- estimated_cost: number (estimated repair cost)

Return ONLY a JSON array with 2-3 tickets. Example format:
[{{"truck_id": "TRK-001", "part_name": "Air Filter", "priority": "urgent", "description": "Replace immediately", "estimated_cost": 250}}]"""

            stream = await client.chat.completions.create(
                model=os.getenv("OPENAI_MODEL", "gpt-4"),
                messages=[{"role": "user", "content": dispatch_prompt}],
                stream=True,
                max_tokens=500
            )
            
            dispatch_response = ""
            async for chunk in stream:
                if chunk.choices[0].delta.content:
                    content = chunk.choices[0].delta.content
                    dispatch_response += content
                    yield f"data: {json.dumps({'type': 'agent_update', 'agent': 'dispatch_agent', 'message': content})}\n\n"
            
            yield f"data: {json.dumps({'type': 'agent_complete', 'agent': 'dispatch_agent'})}\n\n"
            
            # Parse tickets from dispatch response and save to sheet
            tickets = []
            try:
                # Extract JSON from response (handle markdown code blocks)
                import re
                json_match = re.search(r'\[\s*\{.*?\}\s*\]', dispatch_response, re.DOTALL)
                if json_match:
                    tickets_data = json.loads(json_match.group(0))
                    
                    # Create proper ticket format with all required fields
                    for idx, ticket in enumerate(tickets_data[:3]):  # Limit to 3 tickets
                        tickets.append({
                            "ticket_id": f"TKT-{len(await sheets_service.get_service_tickets()) + idx + 1:04d}",
                            "truck_id": ticket.get("truck_id", "TRK-000"),
                            "part_name": ticket.get("part_name", "Unknown Part"),
                            "priority": ticket.get("priority", "medium"),
                            "description": ticket.get("description", "Maintenance required"),
                            "estimated_cost": ticket.get("estimated_cost", 0),
                            "status": "pending",
                            "created_at": "2024-01-14"
                        })
                    
                    # Save tickets to Google Sheet
                    if tickets:
                        await sheets_service.write_service_tickets(tickets)
                        yield f"data: {json.dumps({'type': 'agent_update', 'agent': 'system', 'message': f'✓ Created {len(tickets)} service tickets'})}\n\n"
                        yield f"data: {json.dumps({'type': 'tickets_created', 'tickets': tickets})}\n\n"
                
            except Exception as e:
                print(f"[WARN] Could not parse tickets: {e}", flush=True)
                # Create fallback tickets from parts_summary
                for idx, part in enumerate(parts_summary[:3]):
                    if part.get("usage", 0) > 85:
                        tickets.append({
                            "ticket_id": f"TKT-{len(await sheets_service.get_service_tickets()) + idx + 1:04d}",
                            "truck_id": part.get("truck", "TRK-000"),
                            "part_name": part.get("part", "Unknown Part"),
                            "priority": "urgent" if part.get("usage", 0) > 90 else "high",
                            "description": f"Part at {part.get('usage')}% usage - {part.get('hours')} hours",
                            "estimated_cost": 500,
                            "status": "pending",
                            "created_at": "2024-01-14"
                        })
                
                if tickets:
                    await sheets_service.write_service_tickets(tickets)
                    yield f"data: {json.dumps({'type': 'tickets_created', 'tickets': tickets})}\n\n"
            
            # Completion
            yield f"data: {json.dumps({'type': 'complete', 'message': '✅ Multi-agent orchestration complete'})}\n\n"
            
        except Exception as e:
            error_msg = f"Error in orchestration: {str(e)}"
            print(f"[ERROR] {error_msg}", flush=True)
            import traceback
            traceback.print_exc()
            yield f"data: {json.dumps({'type': 'error', 'message': error_msg})}\n\n"

    return StreamingResponse(stream_agent_orchestration(), media_type="text/event-stream")

@router.post("/check-fleet")
async def check_fleet():
    """
    Orchestrates all 4 agents in sequence:
    1. Monitor Agent analyzes parts usage
    2. Research Agent scrapes web for intelligence
    3. Diagnosis Agent recommends with market data
    4. Dispatch Agent creates detailed tickets
    """
    try:
        response_data = {
            "status": "processing",
            "steps": []
        }

        # Step 1: Get fleet data
        response_data["steps"].append({"step": "fetching_data", "status": "started", "agent": "system"})
        fleet_data = await sheets_service.get_fleet_parts()
        response_data["steps"][-1]["status"] = "completed"
        response_data["steps"][-1]["data_count"] = len(fleet_data)

        # Step 2: Run Monitor Agent
        response_data["steps"].append({"step": "monitor_agent", "status": "started", "agent": "Monitor Agent"})
        monitoring_result = await monitor_agent.analyze_fleet(fleet_data)
        response_data["steps"][-1]["status"] = "completed"
        response_data["steps"][-1]["result"] = {
            "critical_count": len(monitoring_result.get("critical", [])),
            "warning_count": len(monitoring_result.get("warning", [])),
            "ok_count": len(monitoring_result.get("ok", [])),
            "critical_parts": monitoring_result.get("critical", [])[:3]
        }

        # Step 3: Run Research Agent (NEW!)
        critical_and_warning = monitoring_result.get("critical", []) + monitoring_result.get("warning", [])
        response_data["steps"].append({"step": "research_agent", "status": "started", "agent": "Research Agent"})
        research_result = await research_agent.research_parts(critical_and_warning)
        response_data["steps"][-1]["status"] = "completed"
        response_data["steps"][-1]["result"] = {
            "parts_researched": research_result.get("summary", {}).get("total_parts_researched", 0),
            "parts_with_recalls": research_result.get("summary", {}).get("parts_with_recalls", 0),
            "sources_checked": research_result.get("summary", {}).get("total_sources_checked", 0),
            "research_data": research_result.get("parts_research", [])[:3]
        }

        # Step 4: Run Diagnosis Agent
        response_data["steps"].append({"step": "diagnosis_agent", "status": "started", "agent": "Diagnosis Agent"})
        diagnosis_result = await diagnosis_agent.diagnose_issues(
            monitoring_result.get("critical", []),
            monitoring_result.get("warning", []),
            research_result
        )
        response_data["steps"][-1]["status"] = "completed"
        response_data["steps"][-1]["recommendations_count"] = len(
            diagnosis_result.get("recommendations", [])
        )

        # Step 4: Run Dispatch Agent
        response_data["steps"].append({"step": "dispatch_agent", "status": "started", "agent": "Dispatch Agent"})
        dispatch_result = await dispatch_agent.create_tickets(diagnosis_result)
        response_data["steps"][-1]["status"] = "completed"
        response_data["steps"][-1]["result"] = {
            "tickets_created": len(dispatch_result.get("tickets", [])),
            "urgent_count": dispatch_result.get("summary", {}).get("urgent_count", 0),
            "potential_savings": dispatch_result.get("summary", {}).get("potential_savings", 0)
        }

        # Step 5: Write tickets to Google Sheet
        response_data["steps"].append({"step": "save_tickets", "status": "started", "agent": "system"})
        tickets = dispatch_result.get("tickets", [])
        if tickets:
            await sheets_service.write_service_tickets(tickets)
        response_data["steps"][-1]["status"] = "completed"

        # Final response
        return {
            "status": "success",
            "monitoring": monitoring_result,
            "research": research_result,
            "diagnosis": diagnosis_result,
            "dispatch": dispatch_result,
            "steps": response_data["steps"]
        }

    except Exception as e:
        import traceback
        print(f"[ERROR] check-fleet endpoint failed: {str(e)}", flush=True)
        print(traceback.format_exc(), flush=True)
        raise HTTPException(status_code=500, detail=f"Fleet check failed: {str(e)}")



@router.get("/fleet-data")
async def get_fleet_data():
    """Returns current fleet parts data from Google Sheet"""
    try:
        data = await sheets_service.get_fleet_parts()
        return {
            "status": "success",
            "count": len(data),
            "data": data
        }
    except Exception as e:
        import traceback
        print(f"[ERROR] fleet-data endpoint failed: {str(e)}", flush=True)
        print(traceback.format_exc(), flush=True)
        raise HTTPException(status_code=500, detail=f"Failed to fetch fleet data: {str(e)}")

@router.get("/tickets")
async def get_tickets():
    """Returns all service tickets from Google Sheet"""
    try:
        tickets = await sheets_service.get_service_tickets()
        return {
            "status": "success",
            "count": len(tickets),
            "data": tickets
        }
    except Exception as e:
        import traceback
        print(f"[ERROR] tickets endpoint failed: {str(e)}", flush=True)
        print(traceback.format_exc(), flush=True)
        raise HTTPException(status_code=500, detail=f"Failed to fetch tickets: {str(e)}")

@router.get("/stats")
async def get_stats():
    """Get dashboard statistics"""
    try:
        # Get fleet data
        fleet_data = await sheets_service.get_fleet_parts()
        tickets = await sheets_service.get_service_tickets()

        # Calculate stats
        total_trucks = len(set(part["truck_id"] for part in fleet_data))
        total_parts = len(fleet_data)

        # Calculate critical parts (>90% usage)
        critical_count = 0
        warning_count = 0
        for part in fleet_data:
            try:
                current = int(part.get("current_hours", 0))
                max_hours = int(part.get("max_hours", 1))
                usage_percent = (current / max_hours) * 100 if max_hours > 0 else 0

                if usage_percent > 90:
                    critical_count += 1
                elif usage_percent > 80:
                    warning_count += 1
            except (ValueError, TypeError):
                continue

        return {
            "status": "success",
            "stats": {
                "total_trucks": total_trucks,
                "total_parts": total_parts,
                "critical_parts": critical_count,
                "warning_parts": warning_count,
                "total_tickets": len(tickets),
                "pending_tickets": len([t for t in tickets if t.get("status") == "pending"]),
                "completed_tickets": len([t for t in tickets if t.get("status") == "completed"])
            }
        }
    except Exception as e:
        import traceback
        print(f"[ERROR] stats endpoint failed: {str(e)}", flush=True)
        print(traceback.format_exc(), flush=True)
        raise HTTPException(status_code=500, detail=f"Failed to calculate stats: {str(e)}")

@router.post("/generate-random-data")
async def generate_random_data():
    """Generate random fleet data for demo purposes"""
    try:
        # Import the functions from sheets_service
        from services.sheets_service import generate_random_fleet_data

        # Generate new random data (tickets are cleared inside the function)
        new_data = generate_random_fleet_data()

        return {
            "status": "success",
            "message": f"Generated {len(new_data)} random fleet parts",
            "data_count": len(new_data),
            "tickets_cleared": True
        }
    except Exception as e:
        import traceback
        print(f"[ERROR] generate-random-data endpoint failed: {str(e)}", flush=True)
        print(traceback.format_exc(), flush=True)
        raise HTTPException(status_code=500, detail=f"Failed to generate random data: {str(e)}")

@router.post("/reset-data")
async def reset_data():
    """Reset to default fleet data"""
    try:
        # Import the function from sheets_service
        from services.sheets_service import reset_to_default_data

        # Reset to default data
        default_data = reset_to_default_data()

        return {
            "status": "success",
            "message": "Reset to default fleet data",
            "data_count": len(default_data),
            "tickets_cleared": True
        }
    except Exception as e:
        import traceback
        print(f"[ERROR] reset-data endpoint failed: {str(e)}", flush=True)
        print(traceback.format_exc(), flush=True)
        raise HTTPException(status_code=500, detail=f"Failed to reset data: {str(e)}")
