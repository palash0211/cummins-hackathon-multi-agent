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
    Streaming version of check-fleet.
    Returns Server-Sent Events (SSE) for real-time updates.
    """
    q = asyncio.Queue()

    async def event_generator():
        while True:
            data = await q.get()
            if data is None:  # Done signal
                break
            # SSE format: data: <json>\n\n
            yield f"data: {json.dumps(data)}\n\n"

    async def run_workflow():
        try:
            # Step 1: Get fleet data
            await q.put({"type": "step", "step": "fetching_data", "status": "started", "message": "Fetching fleet data..."})
            fleet_data = await sheets_service.get_fleet_parts()
            await q.put({"type": "step", "step": "fetching_data", "status": "completed", "message": f"Fetched {len(fleet_data)} records"})

            # Step 2: Monitor Agent
            await q.put({"type": "step", "step": "monitor_agent", "status": "started", "message": "Analyzing fleet health..."})
            monitoring_result = await monitor_agent.analyze_fleet(fleet_data)
            await q.put({"type": "step", "step": "monitor_agent", "status": "completed", 
                "message": f"Found {len(monitoring_result.get('critical', []))} critical issues"})
            
            # Step 3: Research Agent
            critical_and_warning = monitoring_result.get("critical", []) + monitoring_result.get("warning", [])
            await q.put({"type": "step", "step": "research_agent", "status": "started", "message": "Initiating web research..."})
            
            # Define callback for research agent
            async def research_callback(data):
                # Simply forward the data from agent to queue
                # We might want to tag it for the frontend
                await q.put({"type": "agent_update", "agent": "research_agent", "data": data})

            research_result = await research_agent.research_parts(critical_and_warning, stream_callback=research_callback)
            
            await q.put({"type": "step", "step": "research_agent", "status": "completed", 
                "message": f"Researched {research_result.get('summary', {}).get('total_parts_researched', 0)} parts"})

            # Step 4: Diagnosis Agent
            await q.put({"type": "step", "step": "diagnosis_agent", "status": "started", "message": "Generating diagnoses..."})
            diagnosis_result = await diagnosis_agent.diagnose_issues(
                monitoring_result.get("critical", []),
                monitoring_result.get("warning", []),
                research_result
            )
            await q.put({"type": "step", "step": "diagnosis_agent", "status": "completed", 
                "message": f"Generated {len(diagnosis_result.get('recommendations', []))} recommendations"})

            # Step 5: Dispatch Agent
            await q.put({"type": "step", "step": "dispatch_agent", "status": "started", "message": "Creating service tickets..."})
            dispatch_result = await dispatch_agent.create_tickets(diagnosis_result)
            await q.put({"type": "step", "step": "dispatch_agent", "status": "completed", 
                "message": f"Created {len(dispatch_result.get('tickets', []))} tickets"})

            # Step 6: Save Tickets
            await q.put({"type": "step", "step": "save_tickets", "status": "started", "message": "Syncing with external systems..."})
            tickets = dispatch_result.get("tickets", [])
            if tickets:
                await sheets_service.write_service_tickets(tickets)
            await q.put({"type": "step", "step": "save_tickets", "status": "completed", "message": "Sync complete"})

            # Final Result Payload
            final_payload = {
                "monitoring": monitoring_result,
                "research": research_result,
                "diagnosis": diagnosis_result,
                "dispatch": dispatch_result
            }
            await q.put({"type": "complete", "data": final_payload})

        except Exception as e:
            await q.put({"type": "error", "message": str(e)})
        finally:
            await q.put(None)  # Signal generator to stop

    # Start the workflow in background
    asyncio.create_task(run_workflow())

    return StreamingResponse(event_generator(), media_type="text/event-stream")

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
        print(f"Error in check-fleet: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/check-fleet-stream")
async def check_fleet_stream():
    """
    Stream the agent processing in real-time
    """
    async def generate() -> AsyncGenerator[str, None]:
        try:
            # Step 1: Fetching data
            yield f"data: {json.dumps({'step': 'fetching_data', 'status': 'started', 'message': 'Fetching fleet data from database...'})}\n\n"
            fleet_data = await sheets_service.get_fleet_parts()
            yield f"data: {json.dumps({'step': 'fetching_data', 'status': 'completed', 'message': f'Loaded {len(fleet_data)} parts from fleet database'})}\n\n"
            await asyncio.sleep(0.5)  # Small delay for visual effect

            # Step 2: Monitor Agent
            yield f"data: {json.dumps({'step': 'monitor_agent', 'status': 'started', 'message': 'Monitor Agent analyzing fleet parts usage...'})}\n\n"
            monitoring_result = await monitor_agent.analyze_fleet(fleet_data)
            critical_count = len(monitoring_result.get("critical", []))
            warning_count = len(monitoring_result.get("warning", []))
            yield f"data: {json.dumps({'step': 'monitor_agent', 'status': 'completed', 'message': f'Found {critical_count} critical, {warning_count} warning parts', 'data': monitoring_result})}\n\n"
            await asyncio.sleep(0.5)

            # Step 3: Diagnosis Agent
            yield f"data: {json.dumps({'step': 'diagnosis_agent', 'status': 'started', 'message': 'Diagnosis Agent evaluating risks and recommending actions...'})}\n\n"
            diagnosis_result = await diagnosis_agent.diagnose_issues(
                monitoring_result.get("critical", []),
                monitoring_result.get("warning", [])
            )
            rec_count = len(diagnosis_result.get("recommendations", []))
            yield f"data: {json.dumps({'step': 'diagnosis_agent', 'status': 'completed', 'message': f'Generated {rec_count} maintenance recommendations', 'data': diagnosis_result})}\n\n"
            await asyncio.sleep(0.5)

            # Step 4: Dispatch Agent
            yield f"data: {json.dumps({'step': 'dispatch_agent', 'status': 'started', 'message': 'Dispatch Agent creating service tickets...'})}\n\n"
            dispatch_result = await dispatch_agent.create_tickets(diagnosis_result)
            tickets_count = len(dispatch_result.get("tickets", []))
            savings = dispatch_result.get("summary", {}).get("potential_savings", 0)
            yield f"data: {json.dumps({'step': 'dispatch_agent', 'status': 'completed', 'message': f'Created {tickets_count} tickets, potential savings: ${savings:,}', 'data': dispatch_result})}\n\n"
            await asyncio.sleep(0.5)

            # Step 5: Save tickets
            yield f"data: {json.dumps({'step': 'save_tickets', 'status': 'started', 'message': 'Saving tickets to database...'})}\n\n"
            tickets = dispatch_result.get("tickets", [])
            if tickets:
                await sheets_service.write_service_tickets(tickets)
            yield f"data: {json.dumps({'step': 'save_tickets', 'status': 'completed', 'message': 'Tickets saved successfully'})}\n\n"

            # Final summary
            yield f"data: {json.dumps({'step': 'complete', 'status': 'completed', 'message': 'Fleet check complete!', 'summary': dispatch_result.get('summary', {})})}\n\n"

        except Exception as e:
            yield f"data: {json.dumps({'step': 'error', 'status': 'error', 'message': str(e)})}\n\n"

    return StreamingResponse(
        generate(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
        }
    )

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
        raise HTTPException(status_code=500, detail=str(e))

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
        raise HTTPException(status_code=500, detail=str(e))

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
        raise HTTPException(status_code=500, detail=str(e))
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
        raise HTTPException(status_code=500, detail=str(e))

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
        raise HTTPException(status_code=500, detail=str(e))
