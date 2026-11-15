#!/usr/bin/env python3
"""
test_adversarial_m2.py
Milestone M2 Adversarial Stress Testing & Empirical Challenger Suite
NASA International Space Apps Challenge 2026 - P.U.L.S.E. Flight Surgeon Core

Challenge Areas:
1. API Contract Robustness & Malformed Input Handling
2. SQL Injection Resistance & Database Integrity Verification
3. Medical Device Plugin Rapid Cycling & Tamper Diagnostics
4. Mathematical Engine Boundary Testing (ZeroDivisionError, NaN, Inf, Overflow)
5. SQLite High-Concurrency Stress & Connection Leak Detection
6. Live HTTP Endpoint Resilience
"""

import os
import sys
import time
import json
import math
import zlib
import sqlite3
import threading
import requests
from typing import Dict, Any, List

# Ensure local imports
base_dir = os.path.abspath(os.path.dirname(__file__))
if base_dir not in sys.path:
    sys.path.insert(0, base_dir)

from pulse_memory_store import PulseMemoryStore
from pulse_jarvis_agent import PulseJarvisAgent

class AdversarialTestSuite:
    def __init__(self):
        self.store = PulseMemoryStore()
        self.agent = PulseJarvisAgent()
        self.total_assertions = 0
        self.passed_assertions = 0
        self.failed_assertions = 0
        self.vulnerabilities_found = []

    def check(self, name: str, condition: bool, details: str = ""):
        self.total_assertions += 1
        if condition:
            self.passed_assertions += 1
            print(f"  [PASS] {name} {details}")
        else:
            self.failed_assertions += 1
            err = f"  [FAIL] {name} - {details}"
            print(err)
            self.vulnerabilities_found.append(f"{name}: {details}")

    def run_all(self):
        print("=" * 75)
        print("STARTING EMPIRICAL ADVERSARIAL STRESS TEST SUITE (MILESTONE M2)")
        print("=" * 75)

        self.test_sql_injection_resilience()
        self.test_api_contract_unknown_and_malformed()
        self.test_plugin_rapid_cycling_and_tampering()
        self.test_mathematical_engine_bounds()
        self.test_sqlite_concurrency_and_connection_exhaustion()
        self.test_live_http_robustness()

        print("\n" + "=" * 75)
        print(f"ADVERSARIAL SUITE SUMMARY: {self.passed_assertions}/{self.total_assertions} PASSED")
        if self.failed_assertions == 0:
            print("VERDICT: ZERO CRITICAL VULNERABILITIES IDENTIFIED -> ALL RESILIENCE CRITERIA MET")
        else:
            print(f"VERDICT: {self.failed_assertions} DEFICIENCIES DETECTED:")
            for v in self.vulnerabilities_found:
                print(f"  * {v}")
        print("=" * 75)
        return self.failed_assertions == 0

    # =========================================================================
    # 1. SQL INJECTION RESILIENCE & DATABASE INTEGRITY
    # =========================================================================
    def test_sql_injection_resilience(self):
        print("\n--- 1. SQL Injection Vectors & Database Schema Integrity ---")

        sqli_payloads = [
            "' OR 1=1 --",
            "'; DROP TABLE telemetry_snapshots; --",
            "' UNION SELECT 1,2,3,4,5,6,7,8,9,10,11 --",
            "admin'--",
            "' OR 'x'='x",
            "1; SELECT pg_sleep(5); --",
            "' AND (SELECT COUNT(*) FROM crew_profiles) > 0 --",
            "\" OR \"\"=\""
        ]

        # 1.1 Inquire / Query SQLi
        for payload in sqli_payloads:
            try:
                res = self.agent.process_inquiry(query=f"Check status {payload}", crew_id="elena")
                self.check(f"SQLi payload in inquiry query safely processed", res is not None and "speechText" in res)
            except Exception as e:
                self.check(f"SQLi in inquiry query raised unexpected exception: {e}", False)

        # 1.2 Crew ID SQLi in Memory Store
        for payload in sqli_payloads:
            try:
                history = self.store.get_telemetry_history(crew_id=payload, limit=10)
                self.check(f"SQLi in crew_id history query", isinstance(history, list))
            except Exception as e:
                self.check(f"SQLi in crew_id history crashed: {e}", False)

        # 1.3 Crew ID SQLi in Profile Lookup
        for payload in sqli_payloads:
            try:
                prof = self.store.get_crew_profile(crew_id=payload)
                self.check(f"SQLi in crew_id profile lookup handled gracefully", prof is None or isinstance(prof, dict))
            except Exception as e:
                self.check(f"SQLi in crew_id profile lookup crashed: {e}", False)

        # 1.4 SQLi in Telemetry Insertion
        for payload in sqli_payloads:
            try:
                row_id = self.store.log_telemetry_snapshot(crew_id=payload, vitals={"hr": 70, "bp": "120/80"})
                self.check(f"SQLi crew_id in telemetry insertion parameterized", row_id > 0)
            except Exception as e:
                self.check(f"SQLi in telemetry insert failed: {e}", False)

        # 1.5 Order clause tampering in get_telemetry_history
        order_payloads = ["DESC; DROP TABLE crew_profiles;", "ASC, (SELECT 1 FROM crew_profiles)", "INVALID_ORDER", ""]
        for o_pay in order_payloads:
            try:
                hist = self.store.get_telemetry_history("elena", limit=5, order=o_pay)
                self.check(f"Order clause injection '{o_pay[:15]}' sanitized", isinstance(hist, list))
            except Exception as e:
                self.check(f"Order clause injection failed: {e}", False)

        # 1.6 Verify Table Exists & SQLite Integrity Check
        conn = sqlite3.connect(self.store.db_path)
        cur = conn.cursor()
        cur.execute("PRAGMA integrity_check")
        integrity = cur.fetchone()[0]
        self.check("SQLite PRAGMA integrity_check == 'ok'", integrity == "ok", f"Got: {integrity}")

        cur.execute("SELECT COUNT(*) FROM telemetry_snapshots")
        t_count = cur.fetchone()[0]
        self.check("telemetry_snapshots table intact (not dropped)", t_count > 0, f"Count: {t_count}")

        cur.execute("SELECT COUNT(*) FROM crew_profiles")
        c_count = cur.fetchone()[0]
        self.check("crew_profiles table intact (not dropped)", c_count >= 3, f"Count: {c_count}")
        conn.close()

    # =========================================================================
    # 2. API CONTRACT ROBUSTNESS & MALFORMED INPUTS
    # =========================================================================
    def test_api_contract_unknown_and_malformed(self):
        print("\n--- 2. API Contract Robustness & Malformed Inputs ---")

        # 2.1 Unknown Crew IDs
        unknown_ids = ["unknown_astronaut_xyz", "spock", "hal_9000", "", "   ", None, "A" * 5000]
        for uid in unknown_ids:
            try:
                # Should not raise uncaught exception
                res = self.agent.process_inquiry("Report vitals", crew_id=uid)
                self.check(f"Unknown crew_id '{str(uid)[:10]}' handled in inquiry", res is not None and "speechText" in res)
            except Exception as e:
                self.check(f"Unknown crew_id '{str(uid)[:10]}' crashed in inquiry: {e}", False)

            # Latest telemetry for unknown astronaut should return None
            latest = self.store.get_latest_telemetry(crew_id=uid or "nobody")
            self.check(f"Latest telemetry for unknown crew_id '{str(uid)[:10]}' is None or Dict", latest is None or isinstance(latest, dict))

        # 2.2 Malformed Telemetry Dictionaries
        malformed_snapshots = [
            {},  # completely empty
            {"hr": "seventy", "bp": "invalid", "onsd": "five"},  # non-numeric strings
            {"hr": None, "bp": None, "onsd": None, "radiation": None},  # explicit Nones
            {"bp": "120"},  # single number blood pressure
            {"bp": "120/80/60"},  # three-part blood pressure
            {"bp": "/80"},  # missing systolic
            {"bp": "120/"},  # missing diastolic
            {"timestamp": "corrupted-date-xyz-2026"},  # invalid timestamp format
            {"mission_day": "flight_day_42"},  # non-numeric mission day
            {"anomaly_score": "outlier"},  # non-numeric anomaly
            {"hr": -999.0, "onsd": -50.0, "radiation": -100.0},  # negative values
            {"hr": 99999999.0, "onsd": 50000.0, "radiation": 1e6}  # extreme positive values
        ]

        for idx, snap in enumerate(malformed_snapshots):
            try:
                row_id = self.store.log_telemetry_snapshot("elena", snap)
                self.check(f"Malformed telemetry case #{idx+1} normalized without crash", row_id > 0, f"Row ID: {row_id}")
            except Exception as e:
                self.check(f"Malformed telemetry case #{idx+1} crashed: {e}", False)

        # 2.3 Malformed Interventions
        malformed_interventions = [
            {"action": "", "protocol": "", "params": None},
            {"action": "Unknown countermeasure with symbols !@#$%^&*()", "protocol": "CUSTOM", "params": {}},
            {"action": "A" * 1000, "protocol": "LONG", "params": {"dosage": "50mg"}}
        ]
        for idx, mi in enumerate(malformed_interventions):
            try:
                res = self.agent.execute_intervention("elena", mi["action"], mi["protocol"], mi["params"])
                self.check(f"Malformed intervention #{idx+1} executed safely", res.get("success") is True)
            except Exception as e:
                self.check(f"Malformed intervention #{idx+1} crashed: {e}", False)

    # =========================================================================
    # 3. MEDICAL DEVICE PLUGIN TRANSITIONS & CRC TAMPERING
    # =========================================================================
    def test_plugin_rapid_cycling_and_tampering(self):
        print("\n--- 3. Medical Device Plugin Transitions & CRC Diagnostics ---")

        # 3.1 Initial State Check
        initial = self.agent.tool_plugin("/plugin", {}, "elena", action="list")
        self.check("Initial active plugin count == 5", initial["activeCount"] == 5)

        # 3.2 Rapid Unload / Load Cycling (100 transitions)
        plugin_keys = list(self.agent.plugin_registry.keys())
        cycle_success = True
        for i in range(50):
            # Unload all
            for p in plugin_keys:
                self.agent.tool_plugin(f"/plugin unload {p}", {}, "elena", action="unload", plugin_id=p)
            mid = self.agent.tool_plugin("/plugin", {}, "elena", action="list")
            if mid["activeCount"] != 0:
                cycle_success = False

            # Reload all
            for p in plugin_keys:
                self.agent.tool_plugin(f"/plugin load {p}", {}, "elena", action="load", plugin_id=p)
            end = self.agent.tool_plugin("/plugin", {}, "elena", action="list")
            if end["activeCount"] != 5:
                cycle_success = False

        self.check("50 consecutive full unload/load cycles maintain exact activeCount integrity", cycle_success)

        # 3.3 Unknown Plugin IDs
        unknown_pids = ["warp_drive", "stasis_pod", "", None, "1234", "' OR 1=1"]
        for upid in unknown_pids:
            try:
                res_u = self.agent.tool_plugin(f"/plugin unload {upid}", {}, "elena", action="unload", plugin_id=upid)
                self.check(f"Unload unknown plugin '{upid}' handled safely", res_u["activeCount"] == 5)
                res_l = self.agent.tool_plugin(f"/plugin load {upid}", {}, "elena", action="load", plugin_id=upid)
                self.check(f"Load unknown plugin '{upid}' handled safely", res_l["activeCount"] == 5)
            except Exception as e:
                self.check(f"Unknown plugin id '{upid}' crashed: {e}", False)

        # 3.4 CRC-32 Checksum Calculation & Tamper Sensitivity
        p_data = self.agent.plugin_registry["pocus_ultrasound"]
        orig_bus = p_data["hardwareBus"]
        orig_rate = p_data["samplingRate"]
        orig_crc = hex(zlib.crc32(f"pocus_ultrasound:{orig_bus}:{orig_rate}".encode('utf-8')))

        # Tamper hardware bus metadata
        p_data["hardwareBus"] = "COMPROMISED_UNSHIELDED_BUS"
        tampered_crc = hex(zlib.crc32(f"pocus_ultrasound:{p_data['hardwareBus']}:{orig_rate}".encode('utf-8')))
        self.check("CRC-32 checksum differs on metadata alteration", orig_crc != tampered_crc, f"Orig: {orig_crc}, Tampered: {tampered_crc}")

        # Restore
        p_data["hardwareBus"] = orig_bus
        restored_crc = hex(zlib.crc32(f"pocus_ultrasound:{orig_bus}:{orig_rate}".encode('utf-8')))
        self.check("CRC-32 restored to original value after metadata correction", orig_crc == restored_crc)

        # 3.5 Diagnostic Self-Test & Reset
        p_data["error_count"] = 5
        p_data["calibrated"] = False
        v_res = self.agent.tool_plugin("/plugin verify", {}, "elena", action="verify")
        self.check("Verify action resets error_count to 0", p_data["error_count"] == 0)
        self.check("Verify action sets calibrated to True", p_data["calibrated"] is True)
        self.check("Verify returns status code 'PLUGIN_VERIFIED'", v_res["status"] == "PLUGIN_VERIFIED")

    # =========================================================================
    # 4. MATHEMATICAL ENGINE BOUNDARY TESTING (ZeroDivision, NaN, Inf)
    # =========================================================================
    def test_mathematical_engine_bounds(self):
        print("\n--- 4. Mathematical Engine Boundary Testing ---")

        boundary_telemetries = [
            # Case 1: Absolute Zeros across all sensors
            {"hr": 0.0, "onsd": 0.0, "radiation_usv": 0.0, "entropy": 0.0, "cabin_co2": 0.0, "mission_day": 0.0},
            # Case 2: Extreme Negative numbers
            {"hr": -100.0, "onsd": -10.0, "radiation_usv": -50.0, "entropy": -2.0, "cabin_co2": -5.0, "mission_day": -100.0},
            # Case 3: Extreme High / Hyper-Pathological values
            {"hr": 280.0, "onsd": 15.0, "radiation_usv": 10000.0, "entropy": 10.0, "cabin_co2": 50.0, "mission_day": 10000.0},
            # Case 4: Fractional / Sub-normal values
            {"hr": 0.0001, "onsd": 0.0001, "radiation_usv": 0.0001, "entropy": 0.0001, "cabin_co2": 0.0001, "mission_day": 0.1},
            # Case 5: Standard nominal values
            {"hr": 70.0, "onsd": 4.65, "radiation_usv": 18.4, "entropy": 0.74, "cabin_co2": 2.5, "mission_day": 180.0}
        ]

        def assert_finite(val, label):
            if isinstance(val, (int, float)):
                if math.isnan(val) or math.isinf(val):
                    return False
            elif isinstance(val, dict):
                for k, v in val.items():
                    if not assert_finite(v, f"{label}.{k}"):
                        return False
            elif isinstance(val, list):
                for i, v in enumerate(val):
                    if not assert_finite(v, f"{label}[{i}]"):
                        return False
            return True

        for idx, t in enumerate(boundary_telemetries):
            print(f"  Testing Boundary Matrix #{idx+1}: hr={t['hr']}, onsd={t['onsd']}, rad={t['radiation_usv']}, ent={t['entropy']}")

            # 4.1 /learn Boundary Check
            try:
                res_learn = self.agent.tool_learn("/learn", t, "elena")
                lm = res_learn.get("learningMetrics", {})
                self.check(f"Learn #{idx+1} status", res_learn.get("status") == "LEARNING_CONSOLIDATED")
                self.check(f"Learn #{idx+1} finite metrics (no NaN/Inf)", assert_finite(lm, "learningMetrics"))
                self.check(f"Learn #{idx+1} Borbely tau bounded (14-24h)", 14.0 <= lm.get("borbelyDecayTau", 0) <= 24.0, f"Tau: {lm.get('borbelyDecayTau')}")
            except Exception as e:
                self.check(f"Learn #{idx+1} raised exception: {e}", False)

            # 4.2 /boost Boundary Check
            try:
                res_boost = self.agent.tool_boost("/boost", t, "elena")
                bm = res_boost.get("boostMetrics", {})
                self.check(f"Boost #{idx+1} status", res_boost.get("status") == "BOOST_ENGAGED")
                self.check(f"Boost #{idx+1} engineLatencyMs > 0", bm.get("engineLatencyMs", 0) > 0)
                self.check(f"Boost #{idx+1} finite metrics", assert_finite(bm, "boostMetrics"))
            except Exception as e:
                self.check(f"Boost #{idx+1} raised exception: {e}", False)

            # 4.3 /teamwork Boundary Check
            try:
                res_team = self.agent.tool_teamwork("/teamwork", t, "elena")
                tm = res_team.get("teamMetrics", {})
                self.check(f"Teamwork #{idx+1} status", res_team.get("status") == "TEAMWORK_SYNCHRONIZED")
                self.check(f"Teamwork #{idx+1} stress in [0, 100]", 0.0 <= tm.get("collectiveAutonomicStressIndex", -1) <= 100.0)
                self.check(f"Teamwork #{idx+1} margin days >= 45", tm.get("eclssConsumableMarginDays", 0) >= 45)
                self.check(f"Teamwork #{idx+1} finite metrics", assert_finite(tm, "teamMetrics"))
            except Exception as e:
                self.check(f"Teamwork #{idx+1} raised exception: {e}", False)

            # 4.4 /goal Boundary Check
            try:
                res_goal = self.agent.tool_goal("/goal", t, "elena")
                self.check(f"Goal #{idx+1} status", res_goal.get("status") == "GOALS_EVALUATED")
                self.check(f"Goal #{idx+1} composite score in [0, 100]", 0.0 <= res_goal.get("compositeHealthScorePct", -1) <= 100.0)
                self.check(f"Goal #{idx+1} finite output", assert_finite(res_goal, "goal"))
            except Exception as e:
                self.check(f"Goal #{idx+1} raised exception: {e}", False)

            # 4.5 /swarm Boundary Check
            try:
                res_swarm = self.agent.tool_swarm("/swarm", t, "elena")
                self.check(f"Swarm #{idx+1} status", res_swarm.get("status") == "SWARM_CONSENSUS_REACHED")
                self.check(f"Swarm #{idx+1} aggregate confidence in [0, 100]", 0.0 <= res_swarm.get("aggregateConfidencePct", -1) <= 100.0)
                self.check(f"Swarm #{idx+1} finite output", assert_finite(res_swarm, "swarm"))
            except Exception as e:
                self.check(f"Swarm #{idx+1} raised exception: {e}", False)

    # =========================================================================
    # 5. SQLITE CONCURRENCY & CONNECTION LEAK DETECTION
    # =========================================================================
    def test_sqlite_concurrency_and_connection_exhaustion(self):
        print("\n--- 5. SQLite High-Concurrency Stress & Resource Exhaustion ---")

        # 5.1 Sequential 500-snapshot write burst
        t0 = time.time()
        for i in range(250):
            self.store.log_telemetry_snapshot("rostova", {"hr": 70 + (i % 20), "bp": "120/80", "radiation": 20.0})
            self.store.log_telemetry_snapshot("chen", {"hr": 65 + (i % 15), "bp": "118/76", "radiation": 19.0})
        t_write = time.time() - t0
        self.check("500 sequential snapshots logged cleanly", True, f"Elapsed: {t_write:.2f}s ({500/t_write:.0f} ops/s)")

        # 5.2 Concurrent Multi-Threaded Stress Test
        num_threads = 10
        ops_per_thread = 50
        errors = []

        def worker_task(thread_id: int):
            for op in range(ops_per_thread):
                try:
                    # Alternating write and read
                    cid = "elena" if op % 2 == 0 else "marcus"
                    self.store.log_telemetry_snapshot(cid, {"hr": 72.0 + thread_id, "bp": "122/80"})
                    _ = self.store.get_telemetry_history(cid, limit=5)
                    _ = self.store.get_telemetry_summary_stats(cid, count=10)
                except Exception as ex:
                    errors.append(f"Thread {thread_id} op {op} failed: {ex}")

        threads = [threading.Thread(target=worker_task, args=(i,)) for i in range(num_threads)]
        t0 = time.time()
        for t in threads:
            t.start()
        for t in threads:
            t.join()
        t_concurrent = time.time() - t0

        self.check("Concurrent 10-thread database load (1,500 total queries) zero lock errors", len(errors) == 0, f"Errors: {len(errors)}, Time: {t_concurrent:.2f}s")

        # 5.3 Database Integrity Post-Stress
        conn = sqlite3.connect(self.store.db_path)
        cur = conn.cursor()
        cur.execute("PRAGMA integrity_check")
        res = cur.fetchone()[0]
        self.check("Post-concurrency PRAGMA integrity_check == 'ok'", res == "ok")
        conn.close()

    # =========================================================================
    # 6. LIVE HTTP ENDPOINT RESILIENCE
    # =========================================================================
    def test_live_http_robustness(self):
        print("\n--- 6. Live HTTP FastAPI Server Resilience (Port 8845) ---")
        base_url = "http://127.0.0.1:8845"

        # Check server is online
        try:
            r = requests.get(f"{base_url}/api/pulse/status", timeout=5)
            self.check("Live server is reachable", r.status_code == 200)
        except Exception as e:
            self.check("Live server reachable on port 8845", False, f"Connection error: {e}")
            return

        # 6.1 Empty Query Handling
        r = requests.post(f"{base_url}/api/pulse/inquire", json={"query": ""})
        self.check("Empty query returns HTTP 400 Bad Request", r.status_code == 400)

        # 6.2 Unknown Astronaut Profile
        r = requests.get(f"{base_url}/api/pulse/profile/nonexistent_astronaut_99")
        self.check("Nonexistent astronaut profile returns HTTP 404", r.status_code == 404)

        # 6.3 Unknown Astronaut Latest Telemetry
        r = requests.get(f"{base_url}/api/pulse/telemetry/latest/nonexistent_astronaut_99")
        self.check("Nonexistent astronaut latest telemetry returns HTTP 404", r.status_code == 404)

        # 6.4 SQLi in HTTP Endpoints
        r_sqli_prof = requests.get(f"{base_url}/api/pulse/profile/'%20OR%201=1%20--")
        self.check("SQLi in GET profile URL handled cleanly (HTTP 404)", r_sqli_prof.status_code == 404)

        # Query with an SQLi payload that was never inserted as a crew_id
        r_sqli_hist = requests.get(f"{base_url}/api/pulse/telemetry/history/'%20OR%20999=999%20--?limit=5")
        self.check("SQLi in GET history URL does not leak rows (HTTP 200 with empty list)", r_sqli_hist.status_code == 200 and r_sqli_hist.json()["count"] == 0)

        # 6.5 POST /api/pulse/intervene with Aliased Fields (CinematicHoloHud compatibility)
        hud_payload = {
            "astronaut_id": "rostova",
            "protocol_code": "WF-NASA-SANS-01",
            "action": "Chibis-M LBNP Decompression",
            "biomarkers": {"hr": 84.0, "onsd": 5.85}
        }
        r_hud = requests.post(f"{base_url}/api/pulse/intervene", json=hud_payload)
        self.check("HoloHud intervention schema returns HTTP 200", r_hud.status_code == 200)
        hud_json = r_hud.json()
        self.check("HoloHud intervention success == True", hud_json.get("success") is True)
        self.check("HoloHud intervention protocol matches", hud_json.get("protocol") == "WF-NASA-SANS-01")

        # 6.6 Rapid-Fire Request Burst (50 requests to /api/pulse/status & /api/pulse/plugin)
        burst_success = True
        for _ in range(25):
            r1 = requests.get(f"{base_url}/api/pulse/status")
            r2 = requests.post(f"{base_url}/api/pulse/plugin", json={"query": "/plugin", "crew_id": "elena"})
            if r1.status_code != 200 or r2.status_code != 200:
                burst_success = False
                break
        self.check("50-request rapid-fire HTTP burst completed with 100% HTTP 200", burst_success)

if __name__ == "__main__":
    suite = AdversarialTestSuite()
    success = suite.run_all()
    sys.exit(0 if success else 1)
