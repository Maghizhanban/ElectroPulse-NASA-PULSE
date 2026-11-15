#!/usr/bin/env python3
"""
ingest_nasa_hrp_portfolio.py
Ingests official NASA Human Research Program (HRP) Human Physiology Risks
from https://www.nasa.gov/hrp/risks/#Human-Physiology into P.U.L.S.E.
"""

import os
import json
import re

base_dir = os.path.abspath(os.path.dirname(__file__))
engines_dir = os.path.join(base_dir, '..', 'client', 'src', 'engines')
knowledge_json_path = os.path.join(engines_dir, 'trained_pdf_knowledge.json')

with open('nasa_hrp_human_physiology_risks.json', 'r', encoding='utf-8') as f:
    risks = json.load(f)

# Anatomical 3D SomatoScan mapping for each NASA HRP Risk
ANATOMY_MAPPING = {
    "Risk of Altered Immune System Responses": {"target": "spleen", "system": "lymphatic"},
    "Risk of Altered Sensorimotor and Vestibular Function": {"target": "brain", "system": "nervous"},
    "Risk of Cardiovascular Adaptations": {"target": "heart", "system": "cardiac"},
    "Risk of Decompression Sickness": {"target": "lungs", "system": "respiratory"},
    "Risk of Host-Microorganism Interactions": {"target": "stomach", "system": "digestive"},
    "Risk of Hypoxia": {"target": "lungs", "system": "respiratory"},
    "Risk of Inadequate Food and Nutrition": {"target": "liver", "system": "digestive"},
    "Risk of Injury and Compromised Performance from Spacewalks": {"target": "soleus", "system": "muscular"},
    "Risk of Reduced Cardiorespiratory and Musculoskeletal Fitness": {"target": "soleus", "system": "muscular"},
    "Risk of Spaceflight Associated Neuro-ocular Syndrome (SANS)": {"target": "optic nerve", "system": "sensory"},
    "Risk of Spaceflight-Induced Bone Changes": {"target": "lumbar", "system": "skeletal"},
    "Risk of Behavioral Changes and Psychiatric Disorders": {"target": "brain", "system": "nervous"},
    "Risk of Inadequate Teamwork": {"target": "brain", "system": "nervous"},
    "Risk of Inadequate Sleep and Irregular Schedules": {"target": "brain", "system": "nervous"},
    "Risk of Inadequate Systems Operations Support": {"target": "brain", "system": "nervous"},
    "Risk of Injury from Dynamic Loads": {"target": "lumbar", "system": "skeletal"},
    "Risk of Radiation-Induced Cancers": {"target": "brain", "system": "nervous"}
}

# Load existing knowledge
with open(knowledge_json_path, 'r', encoding='utf-8') as kf:
    existing_knowledge = json.load(kf)

base_id = len(existing_knowledge.get("knowledgeChunks", []))
new_chunks_count = 0

print(f"\n[NASA HRP INGESTOR] Ingesting Human Physiology Risk Portfolio...")
for r in risks:
    title = r.get("risk_title", "").strip()
    desc = r.get("theory_description", "").strip()
    if not title or title.startswith("National Aeronautics"):
        continue

    mapping = ANATOMY_MAPPING.get(title, {"target": "brain", "system": "nervous"})
    content = f"NASA Human Research Program Official Risk: {title}. Core Mechanism: {desc}"

    existing_knowledge["knowledgeChunks"].append({
        "id": base_id + new_chunks_count + 1,
        "file": "NASA-HRP-RISK-PORTFOLIO",
        "page": f"HRP Risk #{new_chunks_count+1}",
        "content": content,
        "clinicalMetadata": {
            "standards": [f"NASA-HRP-{title.split()[-1].upper()}"],
            "thresholds": [],
            "anatomy": [mapping["target"]],
            "system": mapping["system"],
            "risk_title": title
        }
    })
    new_chunks_count += 1
    print(f"  • Ingested: {title} -> Target: {mapping['target']} ({mapping['system']})")

existing_knowledge["metadata"]["totalChunks"] = len(existing_knowledge["knowledgeChunks"])
existing_knowledge["metadata"]["lastTrainedSource"] = "NASA HRP Risk Portfolio (https://www.nasa.gov/hrp/risks/#Human-Physiology)"

with open(knowledge_json_path, 'w', encoding='utf-8') as out_f:
    json.dump(existing_knowledge, out_f, indent=2)

print(f"\n[NASA HRP INGESTOR] ✓ Successfully integrated all {new_chunks_count} NASA Human Research Program risks into P.U.L.S.E.!")
