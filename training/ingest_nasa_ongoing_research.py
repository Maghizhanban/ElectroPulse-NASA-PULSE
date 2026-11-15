#!/usr/bin/env python3
"""
ingest_nasa_ongoing_research.py
Ingests active NASA Human Research Program (HRP) experiments and countermeasures
from https://www.nasa.gov/hrp/ongoing-hrp-research/ into P.U.L.S.E.
"""

import os
import json
import re

base_dir = os.path.abspath(os.path.dirname(__file__))
engines_dir = os.path.join(base_dir, '..', 'client', 'src', 'engines')
knowledge_json_path = os.path.join(engines_dir, 'trained_pdf_knowledge.json')

with open('nasa_hrp_ongoing_research_raw.html', 'r', encoding='utf-8') as f:
    html = f.read()

# Extract headings and content paragraphs
pattern = r'<h[345][^>]*>(.*?)</h[345]>[\s\S]*?<p[^>]*>(.*?)</p>'
matches = re.findall(pattern, html)

research_studies = []
for t_html, p_html in matches:
    t = re.sub(r'<[^>]+>', '', t_html).strip()
    p = re.sub(r'<[^>]+>', '', p_html).strip()
    if len(t) > 3 and len(p) > 20 and not any(w in t.lower() for w in ['subscribe', 'footer', 'share', 'cookie', 'newsletter', 'suggested', 'who we are', 'view our']):
        research_studies.append({"study": t, "summary": p})

# Anatomical & Countermeasure Mapping for each study
STUDY_MAPPINGS = {
    "Immune Biomarkers": {"target": "spleen", "system": "lymphatic", "category": "Immune Surveillance"},
    "Artemis II Standard Measures": {"target": "brain", "system": "nervous", "category": "Deep Space Baseline"},
    "B-Complex": {"target": "optic nerve", "system": "sensory", "category": "SANS Metabolic Countermeasure"},
    "Brain Fluid Pressure": {"target": "brain", "system": "nervous", "category": "Intracranial ICP Dynamics"},
    "CIPHER": {"target": "heart", "system": "cardiac", "category": "Integrated Human Multi-System Protocol"},
    "Simulating Manual Piloting for Moon Landings": {"target": "brain", "system": "nervous", "category": "Sensorimotor Adaptation"},
    "Spacecraft Occupant Protection": {"target": "lumbar", "system": "skeletal", "category": "Dynamic Load Attenuation"},
    "Spinal Fluid Biomarkers": {"target": "brain", "system": "nervous", "category": "Neuro-Axonal Biomarkers"},
    "Standard Measures": {"target": "heart", "system": "cardiac", "category": "Physiological Setpoints"},
    "Thigh Cuff": {"target": "soleus", "system": "venous", "category": "Cephalad Venous Occlusion Countermeasure"},
    "Venous Haemostasis": {"target": "internal jugular vein", "system": "venous", "category": "Thrombosis & Stasis Monitoring"},
    "Zero T2": {"target": "soleus", "system": "muscular", "category": "Compact Deep-Space Resistive Exercise"},
    "Altered Immunity": {"target": "spleen", "system": "lymphatic", "category": "Cytokine & Viral Profiling"},
    "Food Acceptability": {"target": "stomach", "system": "digestive", "category": "Nutritional Satiety"},
    "Food Physiology": {"target": "liver", "system": "digestive", "category": "Metabolic Optimization"},
    "Omics Archive": {"target": "blood", "system": "arterial", "category": "GeneLab Multi-Omics"},
    "Space Gardening": {"target": "brain", "system": "nervous", "category": "Biophilic Psychological Countermeasure"},
    "Spinal Health": {"target": "lumbar", "system": "skeletal", "category": "Paraspinal Morphometry & Disc Protection"},
    "Tempus Pro": {"target": "brain", "system": "nervous", "category": "ExMC Autonomous Clinical Telemedicine"}
}

# Load existing knowledge base
with open(knowledge_json_path, 'r', encoding='utf-8') as kf:
    existing_knowledge = json.load(kf)

base_id = len(existing_knowledge.get("knowledgeChunks", []))
new_chunks_count = 0

print(f"\n[NASA ONGOING RESEARCH INGESTOR] Ingesting NASA HRP Clinical Studies...")
for r in research_studies:
    title = r["study"]
    desc = r["summary"]
    mapping = STUDY_MAPPINGS.get(title, {"target": "brain", "system": "nervous", "category": "HRP Clinical Investigation"})

    content = f"NASA HRP Active Investigation: {title} ({mapping['category']}). Description: {desc}"

    existing_knowledge["knowledgeChunks"].append({
        "id": base_id + new_chunks_count + 1,
        "file": "NASA-HRP-ONGOING-RESEARCH",
        "page": f"HRP Study: {title}",
        "content": content,
        "clinicalMetadata": {
            "standards": [f"NASA-HRP-EXP-{title.split()[0].upper()}"],
            "thresholds": [],
            "anatomy": [mapping["target"]],
            "system": mapping["system"],
            "category": mapping["category"],
            "study_title": title
        }
    })
    new_chunks_count += 1
    print(f"  • Ingested: {title.ljust(35)} -> Target: {mapping['target']} ({mapping['system']})")

existing_knowledge["metadata"]["totalChunks"] = len(existing_knowledge["knowledgeChunks"])
existing_knowledge["metadata"]["lastTrainedSource"] = "NASA HRP Ongoing Research (https://www.nasa.gov/hrp/ongoing-hrp-research/)"

with open(knowledge_json_path, 'w', encoding='utf-8') as out_f:
    json.dump(existing_knowledge, out_f, indent=2)

print(f"\n[NASA ONGOING RESEARCH INGESTOR] ✓ Successfully integrated all {new_chunks_count} active NASA HRP studies into P.U.L.S.E.!")
