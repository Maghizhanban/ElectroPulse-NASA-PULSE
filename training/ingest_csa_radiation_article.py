#!/usr/bin/env python3
"""
ingest_csa_radiation_article.py
Ingests Canadian Space Agency (CSA) CANS Active Neutron Spectrometer
research from https://www.asc-csa.gc.ca/eng/news/articles/2026/2026-02-26-monitoring-radiation-astronaut-health.asp
into P.U.L.S.E.
"""

import os
import json

base_dir = os.path.abspath(os.path.dirname(__file__))
engines_dir = os.path.join(base_dir, '..', 'client', 'src', 'engines')
knowledge_json_path = os.path.join(engines_dir, 'trained_pdf_knowledge.json')

with open(knowledge_json_path, 'r', encoding='utf-8') as kf:
    existing_knowledge = json.load(kf)

base_id = len(existing_knowledge.get("knowledgeChunks", []))

csa_chunks = [
    {
        "content": "Canadian Space Agency (CSA) CANS (Canadian Active Neutron Spectrometer) Operational Mission: Compact, autonomous instrument developed with Bubble Technology Industries to measure high-risk neutron radiation exposure in deep space missions to the Moon and Mars.",
        "metadata": {
            "standards": ["CSA-CANS-2026", "ISS-RADI-N2", "MOSFET-EVARM"],
            "thresholds": ["~30% total ISS radiation is secondary neutrons"],
            "anatomy": ["brain", "heart"],
            "system": "nervous",
            "topic": "Autonomous Active Neutron Dosimetry"
        }
    },
    {
        "content": "Secondary Neutron Radiotoxicity in Spaceflight: Neutron radiation contributes to approximately 30% of total astronaut radiation dose inside space habitats. High-energy GCR particles collide with spacecraft aluminum shielding, creating high-LET secondary neutron cascades that cause severe biological tissue damage and double-strand DNA breaks requiring continuous autonomous monitoring.",
        "metadata": {
            "standards": ["CSA-NEUTRON-DOSIMETRY"],
            "thresholds": ["30% neutron fraction"],
            "anatomy": ["brain", "heart", "bone"],
            "system": "nervous",
            "topic": "Secondary Neutron Particle Cascade"
        }
    },
    {
        "content": "Canadian Active Neutron Spectrometer (CANS) Autonomous Capabilities: Successor to Canadian bubble detectors, MOSFET, EVARM, and Radi-N/Radi-N2 experiments. Unlike passive bubble detectors requiring manual post-EVA bubble counting, CANS operates continuously and autonomously on spacecraft hulls, streaming real-time neutron energy spectra into astronaut clinical monitoring systems.",
        "metadata": {
            "standards": ["CSA-CANS-AUTONOMOUS-SPEC"],
            "thresholds": [],
            "anatomy": ["brain"],
            "system": "nervous",
            "topic": "Continuous Autonomous Dosimetry"
        }
    }
]

print(f"\n[CSA RADIATION INGESTOR] Ingesting Canadian Active Neutron Spectrometer (CANS) Intelligence...")

for idx, c in enumerate(csa_chunks):
    existing_knowledge["knowledgeChunks"].append({
        "id": base_id + idx + 1,
        "file": "CSA-CANS-RADIATION-2026",
        "page": f"CSA CANS Section #{idx+1}",
        "content": c["content"],
        "clinicalMetadata": c["metadata"]
    })
    print(f"  • Ingested: {c['metadata']['topic']}")

existing_knowledge["metadata"]["totalChunks"] = len(existing_knowledge["knowledgeChunks"])
existing_knowledge["metadata"]["lastTrainedSource"] = "Canadian Space Agency (https://www.asc-csa.gc.ca/eng/news/articles/2026/2026-02-26-monitoring-radiation-astronaut-health.asp)"

with open(knowledge_json_path, 'w', encoding='utf-8') as out_f:
    json.dump(existing_knowledge, out_f, indent=2)

print(f"\n[CSA RADIATION INGESTOR] ✓ Successfully integrated CANS Active Neutron Spectrometer intelligence into P.U.L.S.E.!")
