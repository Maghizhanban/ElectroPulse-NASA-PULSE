#!/usr/bin/env python3
"""
pulse_memory_store.py
Persistent Astronaut Episodic & Longitudinal Medical Memory
Powered by OpenJarvis Local-First Memory Architecture
Team: ElectroPulse | AI Assistant: P.U.L.S.E.
NASA International Space Apps Challenge 2026
"""

import os
import json
import math
import sqlite3
import time
from datetime import datetime
from typing import Dict, List, Any, Optional

class PulseMemoryStore:
    CREW_ALIASES = {
        "rostova": "elena",
        "elena": "elena",
        "cdr elena rostova": "elena",
        "ares-lead": "elena",
        "chen": "marcus",
        "marcus": "marcus",
        "dr. marcus chen": "marcus",
        "bio-surgeon": "marcus",
        "sarah": "sarah",
        "vance": "sarah",
        "cdr sarah vance": "sarah",
        "cdr-vance-04": "sarah",
        "vanguard-eva": "sarah",
        "eva-specialist": "sarah"
    }

    def __init__(self, db_path: Optional[str] = None):
        if db_path is None:
            base_dir = os.path.abspath(os.path.dirname(__file__))
            db_path = os.path.join(base_dir, 'pulse_astronaut_memory.db')
        self.db_path = db_path
        self._init_db()

    def _canonicalize_crew_id(self, crew_id: Optional[str]) -> str:
        """Transparently resolves astronaut callsigns, titles, and surnames to canonical IDs."""
        if not crew_id:
            return "elena"
        clean = str(crew_id).strip().lower()
        if clean in self.CREW_ALIASES:
            return self.CREW_ALIASES[clean]
        for alias_key, canonical in self.CREW_ALIASES.items():
            if alias_key in clean:
                return canonical
        return clean

    def _get_conn(self):
        conn = sqlite3.connect(self.db_path, timeout=60.0)
        conn.execute("PRAGMA journal_mode=WAL;")
        conn.execute("PRAGMA busy_timeout=60000;")
        return conn

    def _init_db(self):
        conn = self._get_conn()
        cur = conn.cursor()
        
        # Crew longitudinal profiles
        cur.execute('''
            CREATE TABLE IF NOT EXISTS crew_profiles (
                crew_id TEXT PRIMARY KEY,
                name TEXT,
                callsign TEXT,
                role TEXT,
                baseline_vitals TEXT,
                risk_factors TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')

        # Episodic conversation traces & medical interventions
        cur.execute('''
            CREATE TABLE IF NOT EXISTS interaction_traces (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                crew_id TEXT,
                query TEXT,
                thought_chain TEXT,
                tools_used TEXT,
                response TEXT,
                vitals_context TEXT,
                timestamp REAL
            )
        ''')

        # Longitudinal physiological telemetry snapshots
        cur.execute('''
            CREATE TABLE IF NOT EXISTS telemetry_snapshots (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                crew_id TEXT,
                mission_day REAL,
                hr REAL,
                bp_systolic REAL,
                bp_diastolic REAL,
                onsd REAL,
                entropy REAL,
                radiation_usv REAL,
                anomaly_score REAL,
                timestamp REAL
            )
        ''')

        # Compound B-Tree indexes for fast time-series retrieval
        cur.execute('''
            CREATE INDEX IF NOT EXISTS idx_telemetry_crew_timestamp 
            ON telemetry_snapshots (crew_id, timestamp DESC)
        ''')
        cur.execute('''
            CREATE INDEX IF NOT EXISTS idx_telemetry_crew_mission 
            ON telemetry_snapshots (crew_id, mission_day DESC)
        ''')

        # Ensure canonical flight profile for CDR Sarah Vance
        cur.execute('''
            UPDATE crew_profiles 
            SET name = 'CDR Sarah Vance', role = 'Flight Systems & EVA Specialist'
            WHERE crew_id = 'sarah' AND name != 'CDR Sarah Vance'
        ''')

        conn.commit()
        conn.close()

        # Seed default astronaut baselines if empty
        self._seed_default_profiles()
        # Seed default longitudinal telemetry baselines if empty
        self._seed_default_telemetry()

    def _seed_default_profiles(self):
        default_crew = [
            {
                "crew_id": "elena",
                "name": "CDR Elena Rostova",
                "callsign": "Ares-Lead",
                "role": "Mission Commander",
                "baseline_vitals": json.dumps({"hr": 68, "bp": "118/76", "onsd": 4.65, "entropy": 0.76}),
                "risk_factors": json.dumps(["SANS Ocular Edema", "Cephalad Fluid Shift", "Elevated ICP"])
            },
            {
                "crew_id": "marcus",
                "name": "Dr. Marcus Chen",
                "callsign": "Bio-Surgeon",
                "role": "Flight Medical Officer",
                "baseline_vitals": json.dumps({"hr": 74, "bp": "122/80", "onsd": 4.55, "entropy": 0.72}),
                "risk_factors": json.dumps(["Trabecular Bone Demineralization", "Lumbar Spine Elongation", "Hypercalciuria"])
            },
            {
                "crew_id": "sarah",
                "name": "CDR Sarah Vance",
                "callsign": "Vanguard-EVA",
                "role": "Flight Systems & EVA Specialist",
                "baseline_vitals": json.dumps({"hr": 82, "bp": "126/82", "onsd": 4.70, "entropy": 0.52}),
                "risk_factors": json.dumps(["Psychomotor Fatigue", "Circadian Disruption", "Acute High-LET Radiation Exposure"])
            }
        ]

        conn = self._get_conn()
        cur = conn.cursor()
        for c in default_crew:
            cur.execute('''
                INSERT OR IGNORE INTO crew_profiles (crew_id, name, callsign, role, baseline_vitals, risk_factors)
                VALUES (?, ?, ?, ?, ?, ?)
            ''', (c["crew_id"], c["name"], c["callsign"], c["role"], c["baseline_vitals"], c["risk_factors"]))
        conn.commit()
        conn.close()

    def _seed_default_telemetry(self):
        """Seeds realistic 24-hour longitudinal baseline telemetry if table is empty."""
        conn = self._get_conn()
        cur = conn.cursor()
        try:
            cur.execute("SELECT COUNT(*) FROM telemetry_snapshots")
            count = cur.fetchone()[0]
            if count > 0:
                return

            now = time.time()
            base_mission_day = 142.0

            seed_specs = [
                {
                    "crew_id": "elena",
                    "base_hr": 71.0, "hr_var": 3.0,
                    "sys_bp": 120.0, "dia_bp": 80.0,
                    "onsd_base": 5.75, "onsd_var": 0.08, # SANS risk trajectory
                    "entropy_base": 0.74, "entropy_var": 0.03,
                    "rad_base": 18.4,
                    "anomaly_base": 0.06
                },
                {
                    "crew_id": "marcus",
                    "base_hr": 68.0, "hr_var": 2.5,
                    "sys_bp": 118.0, "dia_bp": 76.0,
                    "onsd_base": 4.88, "onsd_var": 0.05,
                    "entropy_base": 0.81, "entropy_var": 0.02,
                    "rad_base": 19.1,
                    "anomaly_base": 0.04
                },
                {
                    "crew_id": "sarah",
                    "base_hr": 78.0, "hr_var": 4.0,
                    "sys_bp": 126.0, "dia_bp": 84.0,
                    "onsd_base": 4.95, "onsd_var": 0.06,
                    "entropy_base": 0.54, "entropy_var": 0.04, # Fatigue trajectory
                    "rad_base": 22.5,
                    "anomaly_base": 0.12
                }
            ]

            for spec in seed_specs:
                cid = spec["crew_id"]
                for i in range(12):
                    # 12 snapshots, 2 hours apart over preceding 24h
                    t_offset = (11 - i) * 7200.0
                    ts = now - t_offset
                    mday = base_mission_day + (ts - (now - 86400.0)) / 86400.0

                    hr = round(spec["base_hr"] + math.sin(i * 0.8) * spec["hr_var"], 1)
                    sys_bp = round(spec["sys_bp"] + math.cos(i * 0.6) * 2.0, 1)
                    dia_bp = round(spec["dia_bp"] + math.sin(i * 0.5) * 1.5, 1)
                    onsd = round(spec["onsd_base"] + math.sin(i * 0.4) * spec["onsd_var"], 2)
                    entropy = round(spec["entropy_base"] + math.cos(i * 0.9) * spec["entropy_var"], 3)
                    rad = round(spec["rad_base"] + (i * 0.1), 2)
                    anom = round(spec["anomaly_base"] + math.sin(i * 0.5) * 0.02, 3)

                    cur.execute('''
                        INSERT INTO telemetry_snapshots (
                            crew_id, mission_day, hr, bp_systolic, bp_diastolic,
                            onsd, entropy, radiation_usv, anomaly_score, timestamp
                        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    ''', (cid, mday, hr, sys_bp, dia_bp, onsd, entropy, rad, anom, ts))

            conn.commit()
        finally:
            conn.close()

    def log_interaction(self, crew_id: str, query: str, thought_chain: str, tools_used: List[str], response: str, vitals_context: Dict[str, Any]):
        c_id = self._canonicalize_crew_id(crew_id)
        conn = self._get_conn()
        cur = conn.cursor()
        cur.execute('''
            INSERT INTO interaction_traces (crew_id, query, thought_chain, tools_used, response, vitals_context, timestamp)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        ''', (c_id, query, thought_chain, json.dumps(tools_used), response, json.dumps(vitals_context), time.time()))
        conn.commit()
        conn.close()

    def get_recent_traces(self, crew_id: str, limit: int = 5) -> List[Dict[str, Any]]:
        c_id = self._canonicalize_crew_id(crew_id)
        conn = self._get_conn()
        cur = conn.cursor()
        cur.execute('''
            SELECT query, response, tools_used, timestamp
            FROM interaction_traces
            WHERE (crew_id = ? OR crew_id = ?)
            ORDER BY timestamp DESC
            LIMIT ?
        ''', (c_id, str(crew_id).lower(), limit))
        rows = cur.fetchall()
        conn.close()
        return [{"query": r[0], "response": r[1], "tools_used": json.loads(r[2]), "timestamp": r[3]} for r in rows]

    def get_crew_profile(self, crew_id: str) -> Optional[Dict[str, Any]]:
        c_id = self._canonicalize_crew_id(crew_id)
        conn = self._get_conn()
        cur = conn.cursor()
        cur.execute('SELECT crew_id, name, callsign, role, baseline_vitals, risk_factors FROM crew_profiles WHERE crew_id = ?', (c_id,))
        row = cur.fetchone()
        conn.close()
        if row:
            return {
                "crew_id": row[0],
                "name": row[1],
                "callsign": row[2],
                "role": row[3],
                "baseline_vitals": json.loads(row[4]),
                "risk_factors": json.loads(row[5])
            }
        return None

    def get_all_crew_profiles(self) -> List[Dict[str, Any]]:
        """Returns all configured astronaut flight profiles."""
        conn = self._get_conn()
        cur = conn.cursor()
        cur.execute('SELECT crew_id, name, callsign, role, baseline_vitals, risk_factors FROM crew_profiles ORDER BY crew_id')
        rows = cur.fetchall()
        conn.close()
        return [
            {
                "crew_id": r[0],
                "name": r[1],
                "callsign": r[2],
                "role": r[3],
                "baseline_vitals": json.loads(r[4]) if isinstance(r[4], str) else r[4],
                "risk_factors": json.loads(r[5]) if isinstance(r[5], str) else r[5]
            }
            for r in rows
        ]

    # =========================================================================
    # TELEMETRY SNAPSHOT PERSISTENCE METHODS (Feature 6)
    # =========================================================================

    def log_telemetry_snapshot(
        self,
        crew_id: str,
        vitals: Dict[str, Any],
        timestamp: Optional[Any] = None
    ) -> int:
        """
        Persists a normalized physiological telemetry snapshot into SQLite.
        Robustly parses various field names (e.g. 'bp': '120/80', 'radiation', 'onsd').
        Returns the integer primary key of the newly inserted record.
        """
        c_id = self._canonicalize_crew_id(crew_id)
        v = vitals or {}

        # 1. Normalize timestamp
        if timestamp is None:
            raw_ts = v.get('timestamp')
            if raw_ts is not None:
                try:
                    ts = float(raw_ts)
                except (ValueError, TypeError):
                    try:
                        ts = datetime.fromisoformat(str(raw_ts).replace('Z', '+00:00')).timestamp()
                    except Exception:
                        ts = time.time()
            else:
                ts = time.time()
        elif isinstance(timestamp, (int, float)):
            ts = float(timestamp)
        elif isinstance(timestamp, str):
            try:
                ts = float(timestamp)
            except ValueError:
                try:
                    ts = datetime.fromisoformat(timestamp.replace('Z', '+00:00')).timestamp()
                except Exception:
                    ts = time.time()
        else:
            ts = time.time()

        # 2. Normalize mission_day
        m_day = v.get('mission_day') or v.get('sol') or v.get('day')
        if m_day is None:
            m_day = 142.0 + (ts - 1700000000.0) / 86400.0
        else:
            try:
                m_day = float(m_day)
            except (ValueError, TypeError):
                m_day = 142.0

        # 3. Normalize Heart Rate
        try:
            hr = float(v.get('hr') or v.get('heart_rate') or v.get('heart_rate_bpm') or 70.0)
        except (ValueError, TypeError):
            hr = 70.0

        # 4. Normalize Blood Pressure (support "120/80" string or discrete fields)
        bp_sys = v.get('bp_systolic') or v.get('systolic_bp') or v.get('systolic_bp_mmhg') or v.get('sbp')
        bp_dia = v.get('bp_diastolic') or v.get('diastolic_bp') or v.get('diastolic_bp_mmhg') or v.get('dbp')

        if bp_sys is None or bp_dia is None:
            bp_raw = str(v.get('bp') or v.get('blood_pressure') or '120/80')
            if '/' in bp_raw:
                parts = bp_raw.split('/')
                try:
                    bp_sys = float(parts[0].strip())
                    bp_dia = float(parts[1].strip())
                except Exception:
                    bp_sys, bp_dia = 120.0, 80.0
            else:
                bp_sys, bp_dia = 120.0, 80.0
        else:
            try:
                bp_sys = float(bp_sys)
                bp_dia = float(bp_dia)
            except Exception:
                bp_sys, bp_dia = 120.0, 80.0

        # 5. Normalize ONSD
        try:
            onsd = float(v.get('onsd') or v.get('measured_onsd_mm') or v.get('onsd_mm') or 4.65)
        except (ValueError, TypeError):
            onsd = 4.65

        # 6. Normalize Entropy
        try:
            entropy = float(v.get('entropy') or v.get('keystroke_entropy') or v.get('shannon_entropy') or 0.74)
        except (ValueError, TypeError):
            entropy = 0.74

        # 7. Normalize Radiation (uSv/h)
        try:
            rad = float(v.get('radiation_usv') or v.get('radiation') or v.get('radiation_dose_rate_usv_hr') or v.get('rad') or 18.4)
        except (ValueError, TypeError):
            rad = 18.4

        # 8. Normalize Anomaly / Drift Score
        anom = v.get('anomaly_score') or v.get('reconstruction_loss') or v.get('drift_score') or v.get('driftScore')
        if anom is None:
            # Deterministic biophysical risk index
            d_hr = abs(hr - 70.0) / 30.0
            d_onsd = max(0.0, (onsd - 4.65) / 1.5)
            d_bp = abs(bp_sys - 120.0) / 30.0
            d_ent = max(0.0, (0.75 - entropy) / 0.35)
            d_rad = max(0.0, (rad - 20.0) / 80.0)
            anom = min(1.0, round(0.25 * d_hr + 0.30 * d_onsd + 0.15 * d_bp + 0.15 * d_ent + 0.15 * d_rad, 4))
        else:
            try:
                anom = float(anom)
            except (ValueError, TypeError):
                anom = 0.05

        conn = self._get_conn()
        cur = conn.cursor()
        try:
            cur.execute('''
                INSERT INTO telemetry_snapshots (
                    crew_id, mission_day, hr, bp_systolic, bp_diastolic,
                    onsd, entropy, radiation_usv, anomaly_score, timestamp
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''', (c_id, m_day, hr, bp_sys, bp_dia, onsd, entropy, rad, anom, ts))
            conn.commit()
            inserted_id = cur.lastrowid
        finally:
            conn.close()

        return inserted_id

    def get_telemetry_history(
        self,
        crew_id: str,
        limit: int = 50,
        start_time: Optional[float] = None,
        end_time: Optional[float] = None,
        order: str = "DESC"
    ) -> List[Dict[str, Any]]:
        """
        Retrieves longitudinal telemetry snapshots for an astronaut.
        Supports crew_id alias matching and time-range filtering.
        """
        c_id = self._canonicalize_crew_id(crew_id)
        raw_id = str(crew_id).strip().lower()

        conn = self._get_conn()
        cur = conn.cursor()
        try:
            query = '''
                SELECT id, crew_id, mission_day, hr, bp_systolic, bp_diastolic,
                       onsd, entropy, radiation_usv, anomaly_score, timestamp
                FROM telemetry_snapshots
                WHERE (crew_id = ? OR crew_id = ?)
            '''
            params: List[Any] = [c_id, raw_id]

            if start_time is not None:
                query += ' AND timestamp >= ?'
                params.append(float(start_time))
            if end_time is not None:
                query += ' AND timestamp <= ?'
                params.append(float(end_time))

            order_dir = "ASC" if str(order).upper() == "ASC" else "DESC"
            query += f' ORDER BY timestamp {order_dir} LIMIT ?'
            params.append(max(1, int(limit)))

            cur.execute(query, tuple(params))
            rows = cur.fetchall()
        finally:
            conn.close()

        return [
            {
                "id": r[0],
                "crew_id": r[1],
                "mission_day": round(r[2], 2),
                "hr": r[3],
                "bp_systolic": r[4],
                "bp_diastolic": r[5],
                "bp": f"{int(r[4])}/{int(r[5])}",
                "onsd": r[6],
                "entropy": r[7],
                "radiation_usv": r[8],
                "anomaly_score": r[9],
                "timestamp": r[10]
            }
            for r in rows
        ]

    def get_latest_telemetry(self, crew_id: str) -> Optional[Dict[str, Any]]:
        """Returns the single most recent telemetry snapshot for an astronaut."""
        history = self.get_telemetry_history(crew_id, limit=1, order="DESC")
        return history[0] if history else None

    def get_telemetry_summary_stats(self, crew_id: str, count: int = 20, hours: float = 24.0) -> Dict[str, Any]:
        """
        Computes running summary statistics over the last N records for engine calculations.
        """
        now = time.time()
        start_t = now - (hours * 3600.0) if hours else None
        records = self.get_telemetry_history(crew_id, limit=count, start_time=start_t, order="DESC")
        if not records:
            # Fall back to unconstrained limit if time filter returned none
            records = self.get_telemetry_history(crew_id, limit=count, order="DESC")

        if not records:
            return {
                "count": 0,
                "avg_hr": 70.0, "min_hr": 70.0, "max_hr": 70.0,
                "avg_onsd": 4.65, "max_onsd": 4.65,
                "avg_entropy": 0.74, "min_entropy": 0.74,
                "avg_radiation": 18.4, "avg_anomaly": 0.05,
                "latest_mission_day": 142.0
            }

        n = len(records)
        return {
            "count": n,
            "avg_hr": round(sum(r["hr"] for r in records) / n, 1),
            "min_hr": min(r["hr"] for r in records),
            "max_hr": max(r["hr"] for r in records),
            "avg_onsd": round(sum(r["onsd"] for r in records) / n, 2),
            "max_onsd": max(r["onsd"] for r in records),
            "avg_entropy": round(sum(r["entropy"] for r in records) / n, 3),
            "min_entropy": min(r["entropy"] for r in records),
            "avg_radiation": round(sum(r["radiation_usv"] for r in records) / n, 2),
            "avg_anomaly": round(sum(r["anomaly_score"] for r in records) / n, 3),
            "latest_mission_day": records[0]["mission_day"]
        }
