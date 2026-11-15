#!/usr/bin/env python3
"""
pulse_server.py
FastAPI Bridge Service for OpenJarvis P.U.L.S.E. Autonomous Medical Agent
Runs on http://127.0.0.1:8845 alongside the ElectroPulse console (port 8844)
Team: ElectroPulse | AI Assistant: P.U.L.S.E.
NASA International Space Apps Challenge 2026
"""

import os
import sys
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Dict, Any, Optional

try:
    from pulse_jarvis_agent import PulseJarvisAgent
except ImportError:
    from ElectroPulse_OS.agent.pulse_jarvis_agent import PulseJarvisAgent

app = FastAPI(
    title="P.U.L.S.E. OpenJarvis Medical Core",
    description="Stanford OpenJarvis-powered Autonomous Medical AI Agent for Space Missions",
    version="2.5.0"
)

# Enable CORS for the React Console running on port 8844 or any local dev port
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

agent = PulseJarvisAgent()

# -----------------------------------------------------------------------------
# Request Schemas
# -----------------------------------------------------------------------------

class InquiryRequest(BaseModel):
    query: Optional[str] = ""
    crew_id: Optional[str] = "elena"
    telemetry: Optional[Dict[str, Any]] = None
    persona: Optional[str] = None       # "jarvis" | "tars" | "friday"
    honesty: Optional[int] = None       # TARS-style honesty 0-100 (delivery only, never hides caution/critical facts)
    humor: Optional[int] = None         # 0-100

class ScenarioRequest(BaseModel):
    crew_id: Optional[str] = "elena"
    scenario: Optional[str] = "NOMINAL"  # NOMINAL | SANS_FLUID_SHIFT | CABIN_HYPERCAPNIA | SOLAR_PARTICLE_EVENT | COGNITIVE_EXHAUSTION
    ramp_s: Optional[float] = None

class InterveneRequest(BaseModel):
    crew_id: Optional[str] = None
    astronaut_id: Optional[str] = None  # CinematicHoloHud alias
    action: Optional[str] = "Autonomous Countermeasure Execution"
    parameters: Optional[Dict[str, Any]] = None
    protocol_code: Optional[str] = None  # CinematicHoloHud alias
    protocol: Optional[str] = None
    biomarkers: Optional[Dict[str, Any]] = None  # CinematicHoloHud alias
    telemetry: Optional[Dict[str, Any]] = None

class PluginRequest(BaseModel):
    query: Optional[str] = "/plugin"
    crew_id: Optional[str] = "elena"
    telemetry: Optional[Dict[str, Any]] = None
    action: Optional[str] = None  # "list", "load", "unload", "verify", "status"
    plugin_id: Optional[str] = None

class TelemetrySnapshotRequest(BaseModel):
    crew_id: Optional[str] = "elena"
    vitals: Optional[Dict[str, Any]] = None
    hr: Optional[float] = None
    bp: Optional[str] = None
    bp_systolic: Optional[float] = None
    bp_diastolic: Optional[float] = None
    onsd: Optional[float] = None
    entropy: Optional[float] = None
    radiation_usv: Optional[float] = None
    radiation: Optional[float] = None
    anomaly_score: Optional[float] = None
    mission_day: Optional[float] = None
    timestamp: Optional[float] = None

# -----------------------------------------------------------------------------
# Core Status & Inquire Endpoints
# -----------------------------------------------------------------------------

@app.get("/api/pulse/status")
def get_status():
    return {
        "status": "ONLINE",
        "agent": "P.U.L.S.E. Autonomous Flight Surgeon Medical Guardian",
        "framework": "Stanford OpenJarvis Local-First Multi-Engine Architecture",
        "enginesLoaded": [
            "SomatoScan 3D Atlas Engine",
            "AstroCausal Dirichlet Bayesian Engine",
            "ChronoPulse Welford Autoencoder",
            "Emotion Affective Engine",
            "NASA HRP & CSA RAG Knowledge Base",
            "Autonomous Medical Swarm Engine",
            "Medical Device Plugin Bus"
        ],
        "compliance": "NASA-STD-3001 Vol 1 & 2 / ExMC Level IV/V Autonomous Care"
    }

@app.post("/api/pulse/inquire")
def inquire(req: InquiryRequest):
    q = (req.query or "").strip()
    if not q:
        raise HTTPException(status_code=400, detail="Query cannot be empty.")
    try:
        response = agent.process_inquiry(
            q, crew_id=req.crew_id or "elena", telemetry=req.telemetry,
            persona=req.persona, honesty=req.honesty, humor=req.humor,
        )
        return response
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# -----------------------------------------------------------------------------
# Live Reactive Core: snapshot, proactive alerts, scenario injection (Feature: reactive demo)
# -----------------------------------------------------------------------------

@app.get("/api/pulse/snapshot/{crew_id}")
def snapshot_endpoint(crew_id: str):
    """Current live telemetry + engine findings for a crew member, without going through dialogue."""
    try:
        return agent.brain.snapshot(crew_id)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/pulse/alerts/{crew_id}")
def alerts_endpoint(crew_id: str):
    """
    Poll for proactive alerts (and recoveries) since the last check. Intended to be polled every
    few seconds by the console so P.U.L.S.E. can speak up without being asked.
    """
    try:
        return {"crew_id": agent.memory._canonicalize_crew_id(crew_id), "alerts": agent.brain.check_alerts(crew_id)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/pulse/scenario")
def scenario_endpoint(req: ScenarioRequest):
    """
    Demo / training control: ramps the simulated telemetry into a scenario over time instead of
    jumping instantly, so the reactive core can be shown catching a condition as it develops.
    Has no effect once real device data is flowing for this crew member (see TelemetryFeed.device_active).
    """
    try:
        c_id = agent.memory._canonicalize_crew_id(req.crew_id or "elena")
        feed = agent.brain.feed(c_id)
        if not feed.simulate or feed.device_active():
            return {"status": "IGNORED_LIVE_DEVICE_DATA", "crew_id": c_id, "scenario": feed.scenario_state()}
        state = feed.set_scenario(req.scenario or "NOMINAL", ramp_s=req.ramp_s)
        return {"status": "SCENARIO_SET", "crew_id": c_id, "scenario": state}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# -----------------------------------------------------------------------------
# Dynamic Slash Command Endpoints (Features 4, 7)
# -----------------------------------------------------------------------------

@app.post("/api/pulse/learn")
def learn_endpoint(req: Optional[InquiryRequest] = None):
    telemetry = req.telemetry if req else {}
    query = req.query if req and req.query else "/learn"
    crew_id = req.crew_id if req and req.crew_id else "elena"
    return agent.tool_learn(query, telemetry or {}, crew_id=crew_id)

@app.post("/api/pulse/boost")
def boost_endpoint(req: Optional[InquiryRequest] = None):
    telemetry = req.telemetry if req else {}
    query = req.query if req and req.query else "/boost"
    crew_id = req.crew_id if req and req.crew_id else "elena"
    return agent.tool_boost(query, telemetry or {}, crew_id=crew_id)

@app.post("/api/pulse/teamwork")
def teamwork_endpoint(req: Optional[InquiryRequest] = None):
    telemetry = req.telemetry if req else {}
    query = req.query if req and req.query else "/teamwork"
    crew_id = req.crew_id if req and req.crew_id else "elena"
    return agent.tool_teamwork(query, telemetry or {}, crew_id=crew_id)

@app.post("/api/pulse/migrate-workflows")
def migrate_workflows_endpoint(req: Optional[InquiryRequest] = None):
    telemetry = req.telemetry if req else {}
    query = req.query if req and req.query else "/migrate-workflows"
    crew_id = req.crew_id if req and req.crew_id else "elena"
    return agent.tool_migrate_workflows(query, telemetry or {}, crew_id=crew_id)

@app.post("/api/pulse/goal")
def goal_endpoint(req: Optional[InquiryRequest] = None):
    telemetry = req.telemetry if req else {}
    query = req.query if req and req.query else "/goal"
    crew_id = req.crew_id if req and req.crew_id else "elena"
    return agent.tool_goal(query, telemetry or {}, crew_id=crew_id)

@app.post("/api/pulse/swarm")
def swarm_endpoint(req: Optional[InquiryRequest] = None):
    telemetry = req.telemetry if req else {}
    query = req.query if req and req.query else "/swarm"
    crew_id = req.crew_id if req and req.crew_id else "elena"
    return agent.tool_swarm(query, telemetry or {}, crew_id=crew_id)

# -----------------------------------------------------------------------------
# Clinical Countermeasure Intervention Endpoint (Feature 5)
# -----------------------------------------------------------------------------

@app.post("/api/pulse/intervene")
def intervene_endpoint(req: Optional[InterveneRequest] = None):
    """
    Executes autonomous NASA clinical countermeasure protocol.
    Accepts both CinematicHoloHud.tsx schema and PROJECT.md standard schema.
    """
    try:
        crew_id = (req.crew_id if req and req.crew_id else None) or (req.astronaut_id if req and req.astronaut_id else "elena")
        action = (req.action if req and req.action else "Autonomous Countermeasure Execution")
        protocol = (req.protocol if req and req.protocol else None) or (req.protocol_code if req and req.protocol_code else "NASA-HRP-2026-AUTONOMOUS")
        parameters = (req.parameters if req and req.parameters else None) or (req.biomarkers if req and req.biomarkers else None) or (req.telemetry if req and req.telemetry else {})

        return agent.execute_intervention(
            crew_id=crew_id,
            action=action,
            protocol=protocol,
            parameters=parameters
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# -----------------------------------------------------------------------------
# Medical Device Plugin Endpoint (Feature 4)
# -----------------------------------------------------------------------------

@app.post("/api/pulse/plugin")
def plugin_endpoint(req: Optional[PluginRequest] = None):
    """
    NASA Medical Device Plugin Ecosystem.
    Manages discovery, verification, loading, and diagnostics for edge instruments.
    """
    try:
        telemetry = req.telemetry if req and req.telemetry else {}
        query = req.query if req and req.query else "/plugin"
        crew_id = req.crew_id if req and req.crew_id else "elena"
        action = req.action if req and req.action else None
        plugin_id = req.plugin_id if req and req.plugin_id else None

        return agent.tool_plugin(query, telemetry, crew_id=crew_id, action=action, plugin_id=plugin_id)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# -----------------------------------------------------------------------------
# Longitudinal Telemetry Persistence Endpoints (Feature 6)
# -----------------------------------------------------------------------------

@app.post("/api/pulse/telemetry")
def record_telemetry_endpoint(req: TelemetrySnapshotRequest):
    """
    Ingests and persists a physiological telemetry packet into SQLite memory.
    Supports either nested `vitals: {...}` or top-level vital attributes.
    """
    try:
        vitals_payload = dict(req.vitals) if req.vitals else {}
        for field in ['hr', 'bp', 'bp_systolic', 'bp_diastolic', 'onsd', 'entropy', 'radiation_usv', 'radiation', 'anomaly_score', 'mission_day', 'timestamp']:
            val = getattr(req, field)
            if val is not None and field not in vitals_payload:
                vitals_payload[field] = val

        result = agent.record_telemetry(req.crew_id or "elena", vitals_payload, timestamp=req.timestamp)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/pulse/telemetry/history/{crew_id}")
def get_telemetry_history_endpoint(crew_id: str, limit: int = 50, order: str = "desc"):
    """
    Returns longitudinal physiological telemetry snapshots for an astronaut.
    """
    try:
        history = agent.get_telemetry_history(crew_id, limit=limit)
        if order.lower() == "asc":
            history = list(reversed(history))
        return {
            "crew_id": agent.memory._canonicalize_crew_id(crew_id),
            "count": len(history),
            "history": history
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/pulse/telemetry/latest/{crew_id}")
def get_latest_telemetry_endpoint(crew_id: str):
    """
    Returns the most recent physiological telemetry snapshot for an astronaut.
    """
    try:
        c_id = agent.memory._canonicalize_crew_id(crew_id)
        latest = agent.get_latest_telemetry(c_id)
        if not latest:
            profile = agent.memory.get_crew_profile(c_id)
            if not profile:
                raise HTTPException(status_code=404, detail="Astronaut profile or telemetry not found.")
            return {
                "crew_id": c_id,
                "status": "BASELINE_DEFAULT",
                "latest": profile["baseline_vitals"]
            }
        return {
            "crew_id": c_id,
            "status": "RECORDED",
            "latest": latest
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# -----------------------------------------------------------------------------
# Astronaut Profile Endpoint (with Recent Telemetry Context)
# -----------------------------------------------------------------------------

@app.get("/api/pulse/profile/{crew_id}")
def get_profile(crew_id: str):
    c_id = agent.memory._canonicalize_crew_id(crew_id)
    profile = agent.memory.get_crew_profile(c_id)
    if not profile:
        raise HTTPException(status_code=404, detail="Astronaut profile not found.")
    traces = agent.memory.get_recent_traces(c_id, limit=5)
    latest_tel = agent.get_latest_telemetry(c_id)
    return {
        "profile": profile,
        "recentInteractions": traces,
        "latestTelemetry": latest_tel
    }

if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PULSE_PORT", "8845"))
    print(f"\n[P.U.L.S.E. OPENJARVIS SERVER] Initializing on http://127.0.0.1:{port}...")
    uvicorn.run(app, host="127.0.0.1", port=port, log_level="info")
