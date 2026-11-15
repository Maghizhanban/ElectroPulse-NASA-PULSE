#!/usr/bin/env python3
"""
test_m2_backend.py
Comprehensive Verification Suite for Milestone M2 (Backend & OpenJarvis Enhancement)
Covers Features 4, 5, 6, 7:
1. SQLite Telemetry Persistence & Seeding (pulse_memory_store.py)
2. OpenJarvis Autonomous Clinical Countermeasure Engine (pulse_jarvis_agent.py - execute_intervention)
3. NASA Medical Device Plugin Ecosystem (pulse_jarvis_agent.py - tool_plugin)
4. Dynamic Mathematical Slash Commands (/learn, /boost, /teamwork, /goal, /swarm)
5. FastAPI Server Integration & Endpoints (pulse_server.py)
6. Live HTTP Round-Trip Server Verification
"""

import os
import sys
import time
import json
import subprocess
import requests

# Ensure imports resolve
base_dir = os.path.abspath(os.path.dirname(__file__))
if base_dir not in sys.path:
    sys.path.insert(0, base_dir)

from pulse_memory_store import PulseMemoryStore
from pulse_jarvis_agent import PulseJarvisAgent

def run_tests():
    print("=" * 70)
    print("STARTING MILESTONE M2 COMPREHENSIVE VERIFICATION SUITE")
    print("=" * 70)

    total_tests = 0
    passed_tests = 0

    def assert_test(name, condition, details=""):
        nonlocal total_tests, passed_tests
        total_tests += 1
        if condition:
            passed_tests += 1
            print(f"[PASS] {name} {details}")
        else:
            print(f"[FAIL] {name} {details}")
            raise AssertionError(f"Test failed: {name} - {details}")

    # =========================================================================
    # TIER 1: SQLite Telemetry Persistence & Crew Memory Store
    # =========================================================================
    print("\n--- TIER 1: SQLite Telemetry Persistence (Feature 6) ---")
    store = PulseMemoryStore()

    # 1.1 Table & Index Verification
    import sqlite3
    conn = sqlite3.connect(store.db_path)
    cur = conn.cursor()
    cur.execute("SELECT name FROM sqlite_master WHERE type='index'")
    indexes = [r[0] for r in cur.fetchall()]
    assert_test("Compound index idx_telemetry_crew_timestamp", "idx_telemetry_crew_timestamp" in indexes)
    assert_test("Compound index idx_telemetry_crew_mission", "idx_telemetry_crew_mission" in indexes)
    conn.close()

    # 1.2 Default Telemetry Seeding
    hist_elena = store.get_telemetry_history("elena", limit=20)
    assert_test("Default telemetry seeding (Elena >= 12)", len(hist_elena) >= 12, f"Count: {len(hist_elena)}")

    # 1.3 Crew ID Alias Canonicalization
    assert_test("Alias 'rostova' -> 'elena'", store._canonicalize_crew_id("rostova") == "elena")
    assert_test("Alias 'chen' -> 'marcus'", store._canonicalize_crew_id("chen") == "marcus")
    assert_test("Alias 'cdr-vance-04' -> 'sarah'", store._canonicalize_crew_id("cdr-vance-04") == "sarah")
    assert_test("Alias 'vance' -> 'sarah'", store._canonicalize_crew_id("vance") == "sarah")

    # 1.4 Profile Sanitization
    p_sarah = store.get_crew_profile("sarah")
    assert_test("Sanitized CDR Sarah Vance (no Connor)", p_sarah is not None and "Connor" not in p_sarah["name"])
    assert_test("Sarah callsign Vanguard-EVA", p_sarah["callsign"] == "Vanguard-EVA")

    # 1.5 Query via Alias
    hist_alias = store.get_telemetry_history("rostova", limit=5)
    assert_test("History query via alias 'rostova'", len(hist_alias) == 5)

    # 1.6 Log Telemetry Snapshot with String BP and Radiation Aliases
    test_snapshot = {
        "hr": 86.4,
        "bp": "128/84",
        "onsd": 5.91,
        "entropy": 0.69,
        "radiation": 28.5,
        "mission_day": 145.2
    }
    row_id = store.log_telemetry_snapshot("rostova", test_snapshot)
    assert_test("Log telemetry snapshot row_id > 0", row_id > 0, f"Row ID: {row_id}")

    # 1.7 Latest Telemetry Retrieval
    latest = store.get_latest_telemetry("elena")
    assert_test("Retrieve latest snapshot HR matches", latest["hr"] == 86.4)
    assert_test("Retrieve latest snapshot BP matches", latest["bp"] == "128/84")
    assert_test("Retrieve latest snapshot systolic matches", latest["bp_systolic"] == 128.0)
    assert_test("Retrieve latest snapshot diastolic matches", latest["bp_diastolic"] == 84.0)
    assert_test("Retrieve latest snapshot radiation matches", latest["radiation_usv"] == 28.5)

    # 1.8 Telemetry Summary Stats
    stats = store.get_telemetry_summary_stats("elena", count=15)
    assert_test("Summary stats calculated", stats["count"] >= 13)
    assert_test("Summary stats avg_hr exists", 50.0 < stats["avg_hr"] < 120.0, f"Avg HR: {stats['avg_hr']}")

    # =========================================================================
    # TIER 2: OpenJarvis Clinical Countermeasures (Feature 5)
    # =========================================================================
    print("\n--- TIER 2: Clinical Countermeasures / Interventions (Feature 5) ---")
    agent = PulseJarvisAgent()

    # 2.1 SANS / LBNP Intervention
    int_sans = agent.execute_intervention(
        crew_id="rostova",
        action="Execute Chibis-M LBNP Protocol (-45 mmHg)",
        parameters={"hr": 74, "onsd": 5.82}
    )
    assert_test("SANS Intervention success", int_sans["success"] is True)
    assert_test("SANS Intervention ID format", "INT-" in int_sans["intervention_id"] and "ELENA" in int_sans["intervention_id"])
    assert_test("SANS Protocol code WF-NASA-SANS-01", int_sans["protocol"] == "WF-NASA-SANS-01")
    assert_test("SANS Target focus optic nerve", int_sans["targetFocus"] == "optic nerve")
    assert_test("SANS ExMC Level IV verification", "LEVEL-IV" in int_sans["verification"])

    # 2.2 Radiation Storm Shelter Intervention
    int_rad = agent.execute_intervention(
        crew_id="elena",
        action="Solar Particle Event Storm Bunker Ingress",
        parameters={"radiation": 48.0}
    )
    assert_test("Radiation Intervention success", int_rad["success"] is True)
    assert_test("Radiation Protocol code WF-NASA-RAD-SPE-02", int_rad["protocol"] == "WF-NASA-RAD-SPE-02")
    assert_test("Radiation Target focus brain", int_rad["targetFocus"] == "brain")

    # 2.3 Bone / ARED Intervention
    int_bone = agent.execute_intervention(
        crew_id="marcus",
        action="ARED Axial Compressive Loading Countermeasure",
        parameters={"hr": 110}
    )
    assert_test("Bone Protocol code WF-NASA-BONE-03", int_bone["protocol"] == "WF-NASA-BONE-03")
    assert_test("Bone Target focus lumbar", int_bone["targetFocus"] == "lumbar")

    # 2.4 Episodic Memory Logging for Interventions
    traces = store.get_recent_traces("elena", limit=3)
    assert_test("Intervention logged in interaction_traces", len(traces) >= 2)
    assert_test("Intervention trace contains INTERVENTION keyword", any("INTERVENTION" in t["query"] for t in traces))

    # =========================================================================
    # TIER 3: Medical Device Plugin Ecosystem (Feature 4)
    # =========================================================================
    print("\n--- TIER 3: Medical Device Plugin Ecosystem (Feature 4) ---")

    # 3.1 List Plugins
    p_list = agent.tool_plugin("/plugin list", telemetry={"hr": 74, "onsd": 4.8, "radiation": 20.0})
    assert_test("Plugin list activeCount == 5", p_list["activeCount"] == 5)
    assert_test("Plugin list totalCount == 5", p_list["totalCount"] == 5)
    plugin_ids = [p["id"] for p in p_list["plugins"]]
    expected_ids = ["pocus_ultrasound", "astroskin_bioharness", "chibis_lbnp", "rk4_pharmacosim", "eclss_scrubber"]
    assert_test("All 5 certified flight instruments present", all(pid in plugin_ids for pid in expected_ids))

    # 3.2 Telemetry Reflection into Plugins
    pocus_p = next(p for p in p_list["plugins"] if p["id"] == "pocus_ultrasound")
    assert_test("POCUS reflects live ONSD (4.8mm)", pocus_p["telemetryMetrics"]["measuredOnsdMm"] == 4.8)
    astro_p = next(p for p in p_list["plugins"] if p["id"] == "astroskin_bioharness")
    assert_test("AstroSkin reflects live HR (74bpm)", astro_p["telemetryMetrics"]["liveHeartRateBpm"] == 74.0)

    # 3.3 Diagnostic Verification & CRC-32 Checksums
    p_verify = agent.tool_plugin("/plugin verify", telemetry={}, action="verify")
    assert_test("Plugin verify status code", p_verify["status"] == "PLUGIN_VERIFIED")
    for p in p_verify["plugins"]:
        assert_test(f"CRC-32 checksum valid for {p['id']}", p["crc32Checksum"].startswith("0x") and len(p["crc32Checksum"]) > 3)

    # 3.4 Load & Unload State Transitions
    p_unload = agent.tool_plugin("/plugin unload", telemetry={}, action="unload", plugin_id="chibis_lbnp")
    assert_test("Plugin unload transition", p_unload["status"] == "PLUGIN_DEACTIVATED")
    assert_test("Active count decremented to 4", p_unload["activeCount"] == 4)

    p_load = agent.tool_plugin("/plugin load", telemetry={}, action="load", plugin_id="chibis_lbnp")
    assert_test("Plugin load transition", p_load["status"] == "PLUGIN_ACTIVATED")
    assert_test("Active count restored to 5", p_load["activeCount"] == 5)

    # =========================================================================
    # TIER 4: Dynamic Deterministic Slash Commands (Feature 7)
    # =========================================================================
    print("\n--- TIER 4: Dynamic Mathematical Slash Commands (Feature 7) ---")

    # 4.1 /learn - Dynamic Dirichlet Bayesian Adaptation & Shannon Entropy
    learn_res = agent.tool_learn("/learn", telemetry={"hr": 84, "onsd": 5.75, "radiation": 38.0, "entropy": 0.62})
    lm = learn_res["learningMetrics"]
    assert_test("Dynamic uncertainty reduction > 0%", lm["epistemicUncertaintyReductionPct"] > 0)
    assert_test("Shannon entropy calculated (bits)", lm["shannonEntropyBits"] > 0)
    assert_test("Dynamic Borbély sleep decay constant Tau (14-24h)", 14.0 <= lm["borbelyDecayTau"] <= 24.0, f"Tau: {lm['borbelyDecayTau']}")
    assert_test("Dirichlet priors updated dynamically", len(lm["dirichletPriorsUpdated"]) >= 5)

    # 4.2 /boost - Micro-benchmark Latency Measurement & Throughput Speedup
    boost_res = agent.tool_boost("/boost", telemetry={"hr": 78, "onsd": 4.9})
    bm = boost_res["boostMetrics"]
    assert_test("Engine latency is real positive float (ms)", 0.05 <= bm["engineLatencyMs"] <= 5.0, f"Latency: {bm['engineLatencyMs']} ms")
    assert_test("Speedup factor dynamically calculated", "x" in bm["speedupFactor"])
    assert_test("Somatic mesh pipeline throughput", bm["meshPipelineTrianglesSec"] == 4800000)

    # 4.3 /teamwork - Dynamic Crew Roster & Autonomic Stress Aggregation
    team_res = agent.tool_teamwork("/teamwork", telemetry={"hr": 76, "entropy": 0.73, "mission_day": 185.0})
    tm = team_res["teamMetrics"]
    assert_test("Dynamic crew size >= 3", tm["crewSize"] >= 3)
    assert_test("Collective autonomic stress calculated", 0.0 <= tm["collectiveAutonomicStressIndex"] <= 100.0)
    assert_test("Stress variance calculated", tm["stressVariance"] >= 0.0)
    assert_test("Deep space uplink latency calculated (> 200s)", tm["mccHoustonUplinkLatencySec"] > 200)
    assert_test("ECLSS consumable margin days calculated (> 45d)", tm["eclssConsumableMarginDays"] >= 45)

    # 4.4 /goal - NASA Human Research Program Target Compliance
    goal_res = agent.tool_goal("/goal", telemetry={"hr": 72, "onsd": 4.65, "radiation": 19.5, "mission_day": 185.0})
    assert_test("5 NASA HRP goals evaluated", len(goal_res["goals"]) == 5)
    assert_test("Composite health score calculated", 80.0 <= goal_res["compositeHealthScorePct"] <= 100.0)
    assert_test("On track count evaluated", goal_res["onTrackCount"] >= 3)

    # 4.5 /swarm - Multi-Engine Byzantine Consensus
    swarm_res = agent.tool_swarm("/swarm", telemetry={"hr": 72, "onsd": 4.65, "radiation": 18.4, "cabin_co2": 2.5})
    assert_test("Swarm evaluates 6 specialized AI modules", len(swarm_res["agents"]) == 6)
    assert_test("Swarm aggregate confidence > 85%", swarm_res["aggregateConfidencePct"] > 85.0)
    assert_test("Swarm consensus verdict reached", swarm_res["consensusVerdict"] in [
        "NOMINAL_MAINTENANCE_CONFIRMED", "AUTONOMOUS_INTERVENTION_MANDATED", "SPLIT_CONSENSUS_ESCALATE_TO_FLIGHT_SURGEON"
    ])

    # 4.6 Swarm Acute Pathological Reaction (Ensure Genuine Non-Mock Behavior)
    swarm_acute = agent.tool_swarm("/swarm", telemetry={"hr": 105, "onsd": 6.2, "radiation": 55.0, "cabin_co2": 4.5})
    assert_test("Acute inputs trigger intervention votes", swarm_acute["nominalVotes"] < 6, f"Nominal votes: {swarm_acute['nominalVotes']}")

    # 4.7 Natural Language Inquiry Router Routing
    inq_plugin = agent.process_inquiry("/plugin list", crew_id="elena")
    assert_test("Inquiry routes /plugin", inq_plugin.get("command") == "/plugin")
    inq_intervene = agent.process_inquiry("/intervene chibis lbnp decompression", crew_id="elena")
    assert_test("Inquiry routes /intervene", inq_intervene.get("status") == "EXECUTED")

    # =========================================================================
    # TIER 5: Live HTTP FastAPI Server Endpoints
    # =========================================================================
    print("\n--- TIER 5: Live HTTP FastAPI Server Round-Trip (Features 4, 5, 6) ---")
    server_port = 8846
    root_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
    env = os.environ.copy()
    env["PYTHONPATH"] = root_dir + os.pathsep + env.get("PYTHONPATH", "")
    cmd = [sys.executable, "-m", "uvicorn", "ElectroPulse_OS.agent.pulse_server:app", "--host", "127.0.0.1", "--port", str(server_port)]
    proc = subprocess.Popen(cmd, cwd=root_dir, env=env)
    for _ in range(20):
        try:
            r = requests.get(f"http://127.0.0.1:{server_port}/api/pulse/status", timeout=1)
            if r.status_code == 200:
                break
        except Exception:
            time.sleep(0.5)

    base_url = f"http://127.0.0.1:{server_port}"
    try:
        # 5.1 GET /api/pulse/status
        r_status = requests.get(f"{base_url}/api/pulse/status", timeout=5)
        assert_test("Live GET /api/pulse/status HTTP 200", r_status.status_code == 200)
        d_status = r_status.json()
        assert_test("Sanitized agent description in live server", "P.U.L.S.E. Autonomous Flight Surgeon Medical Guardian" in d_status["agent"])
        assert_test("No pop-culture JARVIS-Class in agent description", "JARVIS-Class" not in d_status["agent"])

        # 5.2 POST /api/pulse/intervene (CinematicHoloHud schema)
        r_int_holo = requests.post(f"{base_url}/api/pulse/intervene", json={
            "astronaut_id": "rostova",
            "protocol_code": "NASA-HRP-2026-AUTONOMOUS",
            "action": "Execute Chibis-M LBNP Protocol (-45 mmHg)",
            "biomarkers": {"hr": 72, "onsd": 5.85}
        }, timeout=5)
        assert_test("Live POST /api/pulse/intervene (HoloHud alias) HTTP 200", r_int_holo.status_code == 200)
        d_int_holo = r_int_holo.json()
        assert_test("Intervention execution confirmed", d_int_holo["success"] is True and "INT-" in d_int_holo["intervention_id"])

        # 5.3 POST /api/pulse/intervene (Standard schema)
        r_int_std = requests.post(f"{base_url}/api/pulse/intervene", json={
            "crew_id": "elena",
            "action": "Solar Particle Event Aft Shelter Ingress",
            "parameters": {"radiation": 44.0}
        }, timeout=5)
        assert_test("Live POST /api/pulse/intervene (Standard schema) HTTP 200", r_int_std.status_code == 200)
        assert_test("Radiation protocol assigned", r_int_std.json()["protocol"] == "WF-NASA-RAD-SPE-02")

        # 5.4 POST /api/pulse/plugin
        r_plug = requests.post(f"{base_url}/api/pulse/plugin", json={
            "query": "/plugin list",
            "telemetry": {"hr": 73, "onsd": 4.7}
        }, timeout=5)
        assert_test("Live POST /api/pulse/plugin HTTP 200", r_plug.status_code == 200)
        assert_test("Live plugin activeCount == 5", r_plug.json()["activeCount"] == 5)

        # 5.5 POST /api/pulse/telemetry (Ingest Snapshot)
        r_tel_post = requests.post(f"{base_url}/api/pulse/telemetry", json={
            "crew_id": "rostova",
            "hr": 81.2,
            "bp": "122/80",
            "onsd": 5.68,
            "entropy": 0.72,
            "radiation_usv": 21.4
        }, timeout=5)
        assert_test("Live POST /api/pulse/telemetry HTTP 200", r_tel_post.status_code == 200)
        assert_test("Live telemetry recorded status", r_tel_post.json()["status"] == "RECORDED")

        # 5.6 GET /api/pulse/telemetry/latest/{crew_id}
        r_tel_lat = requests.get(f"{base_url}/api/pulse/telemetry/latest/elena", timeout=5)
        assert_test("Live GET /api/pulse/telemetry/latest/elena HTTP 200", r_tel_lat.status_code == 200)
        assert_test("Latest telemetry HR matches ingested value", r_tel_lat.json()["latest"]["hr"] == 81.2)

        # 5.7 GET /api/pulse/telemetry/history/{crew_id}
        r_tel_hist = requests.get(f"{base_url}/api/pulse/telemetry/history/rostova?limit=5", timeout=5)
        assert_test("Live GET /api/pulse/telemetry/history/rostova HTTP 200", r_tel_hist.status_code == 200)
        assert_test("Telemetry history returns items", r_tel_hist.json()["count"] >= 1)

        # 5.8 GET /api/pulse/profile/{crew_id} (Enhanced with Telemetry)
        r_prof = requests.get(f"{base_url}/api/pulse/profile/rostova", timeout=5)
        assert_test("Live GET /api/pulse/profile/rostova HTTP 200", r_prof.status_code == 200)
        d_prof = r_prof.json()
        assert_test("Profile contains baseline data", d_prof["profile"]["name"] == "CDR Elena Rostova")
        assert_test("Profile contains recent interactions", len(d_prof["recentInteractions"]) > 0)
        assert_test("Profile contains latest telemetry snapshot", d_prof["latestTelemetry"] is not None)

        # 5.9 Slash Command Endpoints
        for cmd_name, path, expected_status in [
            ("/learn", "/api/pulse/learn", "LEARNING_CONSOLIDATED"),
            ("/boost", "/api/pulse/boost", "BOOST_ENGAGED"),
            ("/teamwork", "/api/pulse/teamwork", "TEAMWORK_SYNCHRONIZED"),
            ("/goal", "/api/pulse/goal", "GOALS_EVALUATED"),
            ("/swarm", "/api/pulse/swarm", "SWARM_CONSENSUS_REACHED")
        ]:
            r_slash = requests.post(f"{base_url}{path}", json={"query": cmd_name, "telemetry": {"hr": 74}}, timeout=5)
            assert_test(f"Live POST {path} HTTP 200", r_slash.status_code == 200)
            assert_test(f"Live {path} status matches '{expected_status}'", r_slash.json()["status"] == expected_status)

    finally:
        proc.terminate()
        try:
            proc.wait(timeout=3)
        except subprocess.TimeoutExpired:
            proc.kill()

    print("\n" + "=" * 70)
    print(f"ALL TESTS PASSED: {passed_tests}/{total_tests} (100% SUCCESS RATE)")
    print("=" * 70)
    return True

if __name__ == "__main__":
    success = run_tests()
    sys.exit(0 if success else 1)
