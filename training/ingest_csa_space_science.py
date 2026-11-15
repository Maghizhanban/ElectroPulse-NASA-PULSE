#!/usr/bin/env python3
"""
ingest_csa_space_science.py
Ingests Canadian Space Agency (CSA) space medicine theories from
https://www.asc-csa.gc.ca/eng/iss/science/why-do-we-conduct-science-experiments-in-space.asp
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

csa_science_chunks = [
    {
        "content": "CSA Accelerated Aging Model of Microgravity: Weightlessness changes the human body in ways directly analogous to accelerated physiological aging and extreme sedentary decubitus. Spaceflight accelerates arterial stiffening, insulin resistance, bone mineral density loss (osteopenia), and vestibular balance impairment, providing a compressed clinical model for terrestrial degenerative disease.",
        "metadata": {
            "standards": ["CSA-ACCELERATED-AGING-MODEL"],
            "thresholds": [],
            "anatomy": ["heart", "bone", "brain"],
            "system": "cardiac",
            "topic": "Microgravity Accelerated Aging Analogy"
        }
    },
    {
        "content": "Deep-Space Exploration Multi-Stress Risk Matrix: Moon and Mars transit profiles induce compounded hazards: (1) prolonged microgravity, (2) elevated unshielded galactic cosmic ray/neutron exposure, (3) extreme isolation and psychological confinement, (4) two-way communication latency (5 to 22 minutes each way), and (5) total inability to evacuate or receive Earth medical resupply, mandating fully autonomous edge AI medical monitoring.",
        "metadata": {
            "standards": ["CSA-DEEP-SPACE-RISK-MATRIX", "EXMC-AUTONOMOUS-TIER"],
            "thresholds": ["5 to 22 min communication latency"],
            "anatomy": ["brain"],
            "system": "nervous",
            "topic": "Deep Space Medical Independence Mandate"
        }
    },
    {
        "content": "Canadian ISS Multi-Organ Physiological Investigations: Target organ systems scrutinized by CSA clinical studies include: (1) Bones (trabecular demineralization and osteoporotic microarchitecture loss), (2) Cardiovascular (arterial wall remodeling, endothelial vascular stiffness), and (3) Brain and Vestibular (post-flight balance recovery and neuro-vestibular reweighting).",
        "metadata": {
            "standards": ["CSA-ISS-ORGAN-TARGETS"],
            "thresholds": [],
            "anatomy": ["bone", "heart", "brain"],
            "system": "skeletal",
            "topic": "CSA Targeted Organ Vulnerabilities"
        }
    }
]

print(f"\n[CSA SPACE SCIENCE INGESTOR] Ingesting CSA Space Medicine Theories...")

for idx, c in enumerate(csa_science_chunks):
    existing_knowledge["knowledgeChunks"].append({
        "id": base_id + idx + 1,
        "file": "CSA-WHY-DO-WE-CONDUCT-SCIENCE-2026",
        "page": f"CSA Science Theory #{idx+1}",
        "content": c["content"],
        "clinicalMetadata": c["metadata"]
    })
    print(f"  • Ingested: {c['metadata']['topic']}")

existing_knowledge["metadata"]["totalChunks"] = len(existing_knowledge["knowledgeChunks"])
existing_knowledge["metadata"]["lastTrainedSource"] = "Canadian Space Agency Science (https://www.asc-csa.gc.ca/eng/iss/science/why-do-we-conduct-science-experiments-in-space.asp)"

with open(knowledge_json_path, 'w', encoding='utf-8') as out_f:
    json.dump(existing_knowledge, out_f, indent=2)

print(f"\n[CSA SPACE SCIENCE INGESTOR] ✓ Successfully integrated CSA space medicine theories into P.U.L.S.E.!")
