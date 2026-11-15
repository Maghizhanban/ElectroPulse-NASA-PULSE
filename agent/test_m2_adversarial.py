#!/usr/bin/env python3
"""
test_m2_adversarial.py
Milestone M2 Adversarial Stress Testing & Empirical Vulnerability Suite
EMPIRICAL CHALLENGER 1 (Adversarial Stress Harness)

Validates robustness across:
- SQLite multi-threaded concurrency and database locking
- Extreme & corrupted telemetry inputs (negative vitals, extreme radiation, 0/negative entropy, NaN/Inf)
- Malformed payloads and type mismatches on all slash commands
- Boundary checking and SQL injection resistance on FastAPI HTTP endpoints
"""

import sys
import os
import json
import math
import time
import threading
import sqlite3
import concurrent.futures
import urllib.request
import urllib.error
from typing import Dict, Any, List

# Ensure agent module is in sys.path
AGENT_DIR = os.path.abspath(os.path.dirname(__file__))
if AGENT_DIR not in sys.path:
    sys.path.insert(0, AGENT_DIR)

from pulse_memory_store import PulseMemoryStore
from pulse_jarvis_agent import PulseJarvisAgent

BASE_URL = "http://127.0.0.1:8845"

class AdversarialRunner:
    def __init__(self):
        self.passed = 0
        self.failed = 0
        self.findings = []

    def report(self, condition: bool, test_name: str, detail: str = ""):
        if condition:
            self.passed += 1
            print(f"  [PASS] {test_name} {detail}")
        else:
            self.failed += 1
            msg = f"  [FAIL] {test_name} {detail}"
            print(msg)
            self.findings.append(msg)

    def print_section(self, title: str):
        print(f"\n{'='*70}\n{title}\n{'='*70}")

    def http_request(self, method: str, path: str, payload: Any = None) -> (int, Any):
        url = f"{BASE_URL}{path}"
        data = None
        headers = {}
        if payload is not None:
            data = json.dumps(payload).encode("utf-8")
            headers["Content-Type"] = "application/json"
        
        req = urllib.request.Request(url, data=data, headers=headers, method=method)
        try:
            with urllib.request.urlopen(req, timeout=10) as resp:
                status = resp.status
                body = resp.read().decode("utf-8")
                try:
                    return status, json.loads(body)
                except Exception:
                    return status, body
        except urllib.error.HTTPError as e:
            body = e.read().decode("utf-8")
            try:
                return e.code, json.loads(body)
            except Exception:
                return e.code, body
        except Exception as e:
            return 0, str(e)


def run_tests():
    runner = AdversarialRunner()
    agent = PulseJarvisAgent()
    store = PulseMemoryStore()

    # =========================================================================
    # TIER 1: SQLite High-Concurrency & Database Locking Stress Harness
    # =========================================================================
    runner.print_section("TIER 1: SQLite Multi-Threaded Concurrency & Locking Stress")

    NUM_THREADS = 40
    OPS_PER_THREAD = 15
    errors = []
    success_writes = 0
    success_reads = 0
    lock = threading.Lock()

    def concurrent_worker(worker_id: int):
        nonlocal success_writes, success_reads
        t_store = PulseMemoryStore()
        for i in range(OPS_PER_THREAD):
            op_type = i % 4
            try:
                if op_type == 0:
                    # Write telemetry snapshot
                    row_id = t_store.log_telemetry_snapshot(
                        crew_id="elena" if worker_id % 2 == 0 else "marcus",
                        vitals={"hr": 70.0 + (worker_id % 10), "onsd": 4.6 + (i * 0.05), "bp": "120/80"}
                    )
                    with lock:
                        success_writes += 1
                elif op_type == 1:
                    # Write interaction trace
                    t_store.log_interaction(
                        crew_id="sarah",
                        query=f"Stress query {worker_id}-{i}",
                        thought_chain="Stress testing",
                        tools_used=["stress_tool"],
                        response=f"Response {worker_id}-{i}",
                        vitals_context={"test": True}
                    )
                    with lock:
                        success_writes += 1
                elif op_type == 2:
                    # Read telemetry history
                    hist = t_store.get_telemetry_history("rostova", limit=10)
                    with lock:
                        success_reads += 1
                elif op_type == 3:
                    # Read summary stats
                    stats = t_store.get_telemetry_summary_stats("elena", count=10)
                    with lock:
                        success_reads += 1
            except Exception as e:
                with lock:
                    errors.append(f"Worker {worker_id} op {i} failed: {type(e).__name__}: {e}")

    t0 = time.time()
    with concurrent.futures.ThreadPoolExecutor(max_workers=NUM_THREADS) as executor:
        futures = [executor.submit(concurrent_worker, w_id) for w_id in range(NUM_THREADS)]
        concurrent.futures.wait(futures)
    duration = time.time() - t0

    total_ops = NUM_THREADS * OPS_PER_THREAD
    runner.report(len(errors) == 0, f"SQLite Concurrency (40 threads, {total_ops} ops)",
                  f"Errors: {len(errors)}, Writes: {success_writes}, Reads: {success_reads}, Duration: {duration:.2f}s")
    if errors:
        print("  Sample errors:", errors[:3])

    # =========================================================================
    # TIER 2: Telemetry Parser & Sanitizer Boundary Stress (PulseMemoryStore)
    # =========================================================================
    runner.print_section("TIER 2: Telemetry Normalization & Extreme Vitals Handling")

    # 2.1 None and empty vitals
    rid1 = store.log_telemetry_snapshot("elena", None)
    runner.report(rid1 > 0, "log_telemetry_snapshot handles vitals=None")
    
    rid2 = store.log_telemetry_snapshot("marcus", {})
    runner.report(rid2 > 0, "log_telemetry_snapshot handles vitals={}")

    # 2.2 Malformed blood pressure formats
    bp_tests = [
        ("120/80", 120.0, 80.0),
        (" 135 / 85 ", 135.0, 85.0),
        ("invalid", 120.0, 80.0), # fallback
        ("120/", 120.0, 80.0),     # partial fallback
        ("///", 120.0, 80.0),      # bad slash
        (12080, 120.0, 80.0)       # integer bp
    ]
    for raw_bp, exp_s, exp_d in bp_tests:
        rid = store.log_telemetry_snapshot("elena", {"bp": raw_bp})
        snap = store.get_telemetry_history("elena", limit=1)[0]
        runner.report(snap["bp_systolic"] == exp_s and snap["bp_diastolic"] == exp_d,
                      f"BP parsing '{raw_bp}'", f"-> {snap['bp_systolic']}/{snap['bp_diastolic']}")

    # 2.3 Extreme vitals
    extreme_cases = [
        {"name": "Negative HR (-50)", "vitals": {"hr": -50.0}, "check": lambda s: s["hr"] == -50.0},
        {"name": "Tachycardia HR (280)", "vitals": {"hr": 280.0}, "check": lambda s: s["hr"] == 280.0},
        {"name": "Zero HR (Asystole/0)", "vitals": {"hr": 0.0}, "check": lambda s: s["hr"] is not None},
        {"name": "Zero ONSD (0.0)", "vitals": {"onsd": 0.0}, "check": lambda s: s["onsd"] is not None},
        {"name": "Extreme Radiation (50000 uSv)", "vitals": {"radiation_usv": 50000.0}, "check": lambda s: s["radiation_usv"] == 50000.0},
        {"name": "Zero Radiation (0.0)", "vitals": {"radiation_usv": 0.0}, "check": lambda s: s["radiation_usv"] is not None},
        {"name": "Extreme Entropy (-5.0)", "vitals": {"entropy": -5.0}, "check": lambda s: s["entropy"] == -5.0},
        {"name": "Zero Entropy (0.0)", "vitals": {"entropy": 0.0}, "check": lambda s: s["entropy"] is not None},
    ]
    for case in extreme_cases:
        rid = store.log_telemetry_snapshot("elena", case["vitals"])
        snap = store.get_telemetry_history("elena", limit=1)[0]
        runner.report(case["check"](snap), f"Extreme telemetry: {case['name']}")

    # 2.4 Corrupted types (non-numeric strings)
    corrupted_cases = [
        {"hr": "seventy-five"},
        {"onsd": "four point five"},
        {"radiation": "high"},
        {"entropy": "unknown"},
        {"mission_day": "Day 42"}
    ]
    for c_vit in corrupted_cases:
        rid = store.log_telemetry_snapshot("sarah", c_vit)
        runner.report(rid > 0, f"Corrupted payload gracefully normalized: {list(c_vit.keys())[0]}")

    # 2.5 ISO vs Epoch timestamps
    store.log_telemetry_snapshot("elena", {"hr": 72.0}, timestamp="2026-11-14T12:00:00Z")
    snap_iso = store.get_telemetry_history("elena", limit=1)[0]
    runner.report(snap_iso["timestamp"] > 1700000000, "ISO-8601 string timestamp parsed")

    test_epoch_ts = 1763121600.0
    rid_epoch = store.log_telemetry_snapshot("elena", {"hr": 73.0}, timestamp=test_epoch_ts)
    conn = sqlite3.connect(store.db_path)
    cur = conn.cursor()
    cur.execute("SELECT timestamp FROM telemetry_snapshots WHERE id = ?", (rid_epoch,))
    stored_ts = cur.fetchone()[0]
    conn.close()
    runner.report(stored_ts == test_epoch_ts, "Epoch float timestamp preserved directly in SQLite", f"Stored: {stored_ts}")

    # =========================================================================
    # TIER 3: Dynamic Slash Commands Stress & Corrupted Payload Vulnerability
    # =========================================================================
    runner.print_section("TIER 3: Dynamic Slash Commands Math & Input Boundaries")

    # 3.1 /learn with extreme vitals and empty queries
    try:
        res_learn_empty = agent.tool_learn("", {}, "elena")
        runner.report(res_learn_empty["status"] == "LEARNING_CONSOLIDATED", "/learn empty query and empty telemetry")
    except Exception as e:
        runner.report(False, "/learn empty query", f"Exception: {e}")

    try:
        res_learn_extreme = agent.tool_learn(
            "/learn recalibrate",
            {"hr": 200.0, "onsd": 9.5, "radiation_usv": 10000.0, "entropy": -2.0, "cabin_co2": 15.0},
            "sarah"
        )
        lm = res_learn_extreme["learningMetrics"]
        runner.report(14.0 <= lm["borbelyDecayTau"] <= 24.0, "/learn Tau bounded under extreme inputs", f"Tau={lm['borbelyDecayTau']}")
        runner.report(2.5 <= lm["epistemicUncertaintyReductionPct"] <= 45.0, "/learn uncertainty reduction bounded", f"Reduction={lm['epistemicUncertaintyReductionPct']}%")
        runner.report(lm["shannonEntropyBits"] >= 0.0, "/learn Shannon entropy non-negative", f"Entropy={lm['shannonEntropyBits']}")
    except Exception as e:
        runner.report(False, "/learn extreme vitals", f"Exception: {e}")

    # 3.2 Slash commands with non-numeric / malformed telemetry (BUG DETECTION)
    malformed_telemetry = {"hr": "not_a_number", "onsd": None, "radiation": "extreme", "entropy": {}}

    for cmd_name, tool_func in [
        ("/boost", lambda t: agent.tool_boost("/boost", t, "marcus")),
        ("/learn", lambda t: agent.tool_learn("/learn", t, "elena")),
        ("/goal", lambda t: agent.tool_goal("/goal", t, "elena")),
        ("/swarm", lambda t: agent.tool_swarm("/swarm", t, "sarah")),
        ("/teamwork", lambda t: agent.tool_teamwork("/teamwork", t, "elena")),
        ("/plugin", lambda t: agent.tool_plugin("/plugin", t, "elena")),
    ]:
        try:
            res = tool_func(malformed_telemetry)
            runner.report(True, f"{cmd_name} input resilience to malformed telemetry", f"Status: {res.get('status')}")
        except Exception as e:
            runner.report(False, f"{cmd_name} input resilience to malformed telemetry", f"CRASH: {type(e).__name__}: {e}")

    # 3.3 /boost under normal extreme vitals
    try:
        res_boost_extreme = agent.tool_boost("/boost max", {"hr": 220.0, "onsd": 12.0, "cabin_co2": 25.0, "radiation": 500.0}, "elena")
        bm = res_boost_extreme["boostMetrics"]
        runner.report(bm["engineLatencyMs"] > 0, "/boost latency valid positive float", f"Latency: {bm['engineLatencyMs']} ms")
    except Exception as e:
        runner.report(False, "/boost extreme inputs", f"Exception: {e}")

    # 3.4 /teamwork physical boundary: negative mission day
    try:
        res_team_neg = agent.tool_teamwork("/teamwork", {"mission_day": -100.0}, "elena")
        tm = res_team_neg["teamMetrics"]
        # In deep space physics, distance and uplink latency must be non-negative
        is_physically_sound = (tm["interplanetaryDistanceAU"] >= 0.0 and tm["mccHoustonUplinkLatencySec"] >= 0)
        runner.report(is_physically_sound, "/teamwork physical boundary: distance/latency non-negative under negative mission day",
                      f"AU={tm['interplanetaryDistanceAU']}, Latency={tm['mccHoustonUplinkLatencySec']}s")
    except Exception as e:
        runner.report(False, "/teamwork negative mission day", f"Exception: {e}")

    # 3.5 /goal with extreme edge vitals
    try:
        res_goal_extreme = agent.tool_goal("/goal evaluate", {"hr": 0.0, "radiation": 10000.0, "mission_day": 1000.0, "entropy": 0.0}, "marcus")
        runner.report(res_goal_extreme["status"] == "GOALS_EVALUATED", "/goal executes under zero/extreme inputs")
        runner.report(len(res_goal_extreme["goals"]) == 5, "/goal returns all 5 HRP goals")
        runner.report(res_goal_extreme["compositeHealthScorePct"] >= 0.0, "/goal composite score non-negative", f"Score: {res_goal_extreme['compositeHealthScorePct']}%")
    except Exception as e:
        runner.report(False, "/goal extreme inputs", f"Exception: {e}")

    # 3.6 /swarm critical triage consensus
    try:
        res_swarm_critical = agent.tool_swarm("/swarm triage", {"hr": 160.0, "onsd": 7.2, "radiation": 250.0, "cabin_co2": 5.0, "entropy": 0.3}, "sarah")
        runner.report(res_swarm_critical["status"] == "SWARM_CONSENSUS_REACHED", "/swarm completes consensus under critical alerts")
        runner.report(res_swarm_critical["consensusVerdict"] == "AUTONOMOUS_INTERVENTION_MANDATED", "/swarm correctly mandates intervention for critical vitals", f"Verdict: {res_swarm_critical['consensusVerdict']}")
        runner.report(res_swarm_critical["nominalVotes"] <= 2, "/swarm nominal votes suppressed under multiple failures", f"Nominal votes: {res_swarm_critical['nominalVotes']}")
    except Exception as e:
        runner.report(False, "/swarm critical inputs", f"Exception: {e}")

    # 3.7 /plugin commands and unknown plugins
    try:
        res_plugin_unknown = agent.tool_plugin("query status", {}, plugin_id="non_existent_laser")
        runner.report(res_plugin_unknown["status"] == "PLUGIN_CATALOG_SYNC", "/plugin handles non-existent plugin target gracefully")
    except Exception as e:
        runner.report(False, "/plugin unknown target", f"Exception: {e}")

    try:
        res_plugin_bad_action = agent.tool_plugin("destroy all", {}, action="self_destruct")
        runner.report(res_plugin_bad_action["activeCount"] == 5, "/plugin rejects unauthorized action cleanly")
    except Exception as e:
        runner.report(False, "/plugin unauthorized action", f"Exception: {e}")

    # =========================================================================
    # TIER 4: Process Inquiry Slash Routing & Edge Query Robustness
    # =========================================================================
    runner.print_section("TIER 4: OpenJarvis Inquiry Parsing & Edge Routing")

    edge_queries = [
        ("Long query (10k chars)", "/learn " + ("a" * 10000)),
        ("Special chars & symbols", "/goal !@#$%^&*()_+~`|}{[]:;?><,./"),
        ("SQL injection attempt in query", "/teamwork '; DROP TABLE telemetry_snapshots; --"),
        ("XSS script injection in query", "/plugin <script>alert('pwned')</script>"),
        ("Unrecognized slash command", "/warp-drive-engage"),
        ("General inquiry with no telemetry", "Astronaut complains of cephalic headache and visual obscurations"),
        ("General inquiry with corrupted telemetry", "Check vitals")
    ]

    for label, q_text in edge_queries:
        try:
            t_data = {"hr": "not_a_number", "onsd": None} if "corrupted" in label else None
            res = agent.process_inquiry(q_text, crew_id="elena", telemetry=t_data)
            has_speech = bool(res.get("speechText"))
            runner.report(has_speech, f"process_inquiry: {label}", f"Responded with speech: {len(res.get('speechText', ''))} chars")
        except Exception as e:
            runner.report(False, f"process_inquiry: {label}", f"CRASH: {type(e).__name__}: {e}")

    # =========================================================================
    # TIER 5: Live HTTP FastAPI Endpoint Boundary & Security Audit (Port 8845)
    # =========================================================================
    runner.print_section("TIER 5: Live HTTP FastAPI Endpoint Boundaries & Security")

    # 5.1 POST /api/pulse/inquire boundaries
    s, r = runner.http_request("POST", "/api/pulse/inquire", {"query": ""})
    runner.report(s == 400, "POST /api/pulse/inquire empty query returns HTTP 400", f"Status: {s}")

    s, r = runner.http_request("POST", "/api/pulse/inquire", {"query": "   "})
    runner.report(s == 400, "POST /api/pulse/inquire whitespace query returns HTTP 400", f"Status: {s}")

    s, r = runner.http_request("POST", "/api/pulse/inquire", {"query": "/plugin list", "crew_id": "rostova"})
    runner.report(s == 200 and r.get("command") == "/plugin", "POST /api/pulse/inquire routes /plugin via HTTP 200")

    # Inquire with corrupted telemetry -> should not 500
    s, r = runner.http_request("POST", "/api/pulse/inquire", {
        "query": "Assess astronaut health",
        "crew_id": "elena",
        "telemetry": {"hr": "bad", "onsd": None}
    })
    runner.report(s != 500, "POST /api/pulse/inquire handles malformed telemetry without HTTP 500", f"Status: {s}")

    # 5.2 POST /api/pulse/intervene boundaries
    s, r = runner.http_request("POST", "/api/pulse/intervene", {})
    runner.report(s == 200 and r.get("success") is True, "POST /api/pulse/intervene empty payload defaults cleanly", f"Status: {s}")

    s, r = runner.http_request("POST", "/api/pulse/intervene", {
        "crew_id": "unknown_astronaut_99",
        "action": "Administer Cephalad Decompression",
        "parameters": {"hr": 80, "onsd": 5.8}
    })
    runner.report(s == 200 and r.get("protocol") == "WF-NASA-SANS-01", "POST /api/pulse/intervene SANS protocol mapping", f"Status: {s}")

    s, r = runner.http_request("POST", "/api/pulse/intervene", {
        "astronaut_id": "chen",
        "protocol_code": "WF-NASA-BONE-03",
        "action": "ARED High-Load Compressive Protocol"
    })
    runner.report(s == 200 and r.get("targetFocus") == "lumbar", "POST /api/pulse/intervene HoloHud aliases recognized", f"Focus: {r.get('targetFocus')}")

    # 5.3 POST /api/pulse/plugin boundaries
    s, r = runner.http_request("POST", "/api/pulse/plugin", {})
    runner.report(s == 200 and r.get("activeCount") == 5, "POST /api/pulse/plugin empty payload returns catalog", f"Active: {r.get('activeCount')}")

    s, r = runner.http_request("POST", "/api/pulse/plugin", {"action": "unload", "plugin_id": "pocus_ultrasound"})
    runner.report(s == 200 and r.get("activeCount") == 4, "POST /api/pulse/plugin unload pocus_ultrasound (4 active)", f"Active: {r.get('activeCount')}")

    s, r = runner.http_request("POST", "/api/pulse/plugin", {"action": "load", "plugin_id": "pocus_ultrasound"})
    runner.report(s == 200 and r.get("activeCount") == 5, "POST /api/pulse/plugin reload pocus_ultrasound (5 active)", f"Active: {r.get('activeCount')}")

    s, r = runner.http_request("POST", "/api/pulse/plugin", {"action": "verify"})
    runner.report(s == 200 and r.get("status") == "PLUGIN_VERIFIED", "POST /api/pulse/plugin verify diagnostics", f"Status: {r.get('status')}")

    # 5.4 POST /api/pulse/telemetry ingestion boundaries
    s, r = runner.http_request("POST", "/api/pulse/telemetry", {
        "crew_id": "rostova",
        "vitals": {"hr": 84.5, "bp": "128/82", "onsd": 4.95, "radiation_usv": 24.2}
    })
    runner.report(s == 200 and r.get("status") == "RECORDED", "POST /api/pulse/telemetry nested vitals ingested", f"Row ID: {r.get('id')}")

    s, r = runner.http_request("POST", "/api/pulse/telemetry", {
        "crew_id": "vance",
        "hr": 76.0,
        "bp": "118/74",
        "onsd": 4.70,
        "radiation": 20.1
    })
    runner.report(s == 200 and r.get("status") == "RECORDED", "POST /api/pulse/telemetry top-level vitals ingested", f"Row ID: {r.get('id')}")

    # 5.5 GET /api/pulse/telemetry/history boundaries
    s, r = runner.http_request("GET", "/api/pulse/telemetry/history/rostova?limit=10&order=asc")
    runner.report(s == 200 and len(r.get("history", [])) > 0, "GET /api/pulse/telemetry/history limit=10 order=asc", f"Count: {r.get('count')}")

    s, r = runner.http_request("GET", "/api/pulse/telemetry/history/rostova?limit=0")
    runner.report(s == 200 and len(r.get("history", [])) >= 1, "GET /api/pulse/telemetry/history limit=0 clamped to min 1")

    # SQL Injection attempt in history URL
    s, r = runner.http_request("GET", "/api/pulse/telemetry/history/elena%27%20OR%201=1;--")
    runner.report(s == 200, "SQL injection attempt in history URL safely handled without 500 error", f"Status: {s}")

    # 5.6 GET /api/pulse/telemetry/latest boundaries
    s, r = runner.http_request("GET", "/api/pulse/telemetry/latest/marcus")
    runner.report(s == 200 and r.get("latest") is not None, "GET /api/pulse/telemetry/latest/marcus returns snapshot")

    s, r = runner.http_request("GET", "/api/pulse/telemetry/latest/non_existent_crew_member")
    runner.report(s == 404, "GET /api/pulse/telemetry/latest for non-existent astronaut returns HTTP 404", f"Status: {s}")

    # 5.7 GET /api/pulse/profile boundaries
    s, r = runner.http_request("GET", "/api/pulse/profile/vance")
    runner.report(s == 200 and r.get("profile", {}).get("name") == "CDR Sarah Vance",
                  "GET /api/pulse/profile/vance returns sanitized CDR Sarah Vance", f"Name: {r.get('profile', {}).get('name')}")
    runner.report("Connor" not in str(r), "Zero pop-culture residue 'Connor' in Sarah profile payload")

    s, r = runner.http_request("GET", "/api/pulse/profile/non_existent_crew_member")
    runner.report(s == 404, "GET /api/pulse/profile for non-existent astronaut returns HTTP 404", f"Status: {s}")

    # =========================================================================
    # SUMMARY VERDICT
    # =========================================================================
    print(f"\n{'='*70}\nADVERSARIAL STRESS TEST SUMMARY\n{'='*70}")
    print(f"Total Tests Executed: {runner.passed + runner.failed}")
    print(f"Passed: {runner.passed}")
    print(f"Failed: {runner.failed}")
    if runner.failed == 0:
        print("\nALL ADVERSARIAL STRESS CHALLENGES PASSED EMPIRICALLY!")
        print("Verdict: APPROVE")
    else:
        print(f"\nVULNERABILITIES DETECTED: {runner.failed}")
        print("Verdict: REQUEST_CHANGES")
        for f in runner.findings:
            print(f"  • {f}")

    return runner.failed

if __name__ == "__main__":
    sys.exit(run_tests())
