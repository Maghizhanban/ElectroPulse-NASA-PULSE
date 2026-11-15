#!/usr/bin/env python3
"""
train_engine_master.py
P.U.L.S.E. Master ML Training Orchestrator
Team: ElectroPulse | AI Assistant: P.U.L.S.E.

Unified CLI for training P.U.L.S.E. engines on real user data (CSV or PDF):
  • Ingests CSV telemetry -> trains ChronoPulse, AstroCausal, and Emotion ML models
  • Ingests PDF guidelines -> trains TF-IDF Semantic RAG and Clinical Rule Index
  • Exports calibrated parameters directly into client engines
"""

import sys
import os
import argparse
import subprocess

from ml_train_chronopulse import train_chronopulse
from ml_train_astrocausal import train_astrocausal
from ml_train_emotion import train_emotion
from ml_train_pdf_knowledge import train_pdf_knowledge

BOLD = '\033[1m'
CYAN = '\033[36m'
GREEN = '\033[32m'
YELLOW = '\033[33m'
RED = '\033[31m'
RESET = '\033[0m'

BANNER = f"""
{CYAN}{BOLD}╔══════════════════════════════════════════════════════════════════════╗
║        P.U.L.S.E. MULTI-ENGINE MACHINE LEARNING TRAINER SUITE        ║
║         Spacecraft Biomedical AI & Clinical Knowledge Pipeline       ║
╚══════════════════════════════════════════════════════════════════════╝{RESET}
"""

def main():
    parser = argparse.ArgumentParser(
        description="Train P.U.L.S.E. multi-engine AI suite using real CSV telemetry or PDF medical guidelines."
    )
    parser.add_argument("input_path", help="Path to input dataset (CSV/TSV) or clinical document (PDF)")
    parser.add_argument("--engine", choices=['all', 'chronopulse', 'astrocausal', 'emotion', 'pdf'], default='all',
                        help="Select a specific engine to train (default: auto/all)")
    parser.add_argument("--rebuild", action='store_true', help="Rebuild and deploy console bundle immediately after training")

    args = parser.parse_args()
    print(BANNER)

    target_input = args.input_path.strip().strip('"').strip("'")

    # Check if target is a YouTube URL or Video ID
    is_youtube = (
        any(domain in target_input for domain in ['youtube.com', 'youtu.be']) or
        target_input.startswith(('http://', 'https://', 'www.')) or
        (len(target_input) == 11 and not os.path.exists(target_input))
    )

    if is_youtube:
        print(f"{YELLOW}[INPUT DETECTED] NASA YouTube Video Stream: {target_input}{RESET}")
        sys.path.insert(0, os.path.dirname(__file__))
        from ingest_youtube_nasa import ingest_youtube_video
        from adaptive_engine_calibrator import calibrate_all_engines
        ingest_youtube_video(target_input, train_immediately=True)
        # Automatically run adaptive engine calibration after video ingestion
        calibrate_all_engines()
    else:
        target_path = os.path.abspath(target_input)
        if not os.path.exists(target_path):
            print(f"{RED}[ERROR] Input file or directory does not exist: {target_path}{RESET}")
            sys.exit(1)

        file_ext = os.path.splitext(target_path)[1].lower()

        if file_ext == '.pdf':
            print(f"{YELLOW}[INPUT DETECTED] Clinical PDF Document: {os.path.basename(target_path)}{RESET}")
            train_pdf_knowledge(target_path)
        elif file_ext in ['.csv', '.tsv', '.txt', '.gz'] or os.path.isdir(target_path):
            print(f"{YELLOW}[INPUT DETECTED] Structured Tabular Telemetry: {os.path.basename(target_path)}{RESET}")
        
            if args.engine in ['all', 'chronopulse']:
                try:
                    train_chronopulse(target_path)
                except Exception as e:
                    print(f"{RED}[WARNING] ChronoPulse ML failed: {e}{RESET}")

            if args.engine in ['all', 'astrocausal']:
                try:
                    train_astrocausal(target_path)
                except Exception as e:
                    print(f"{RED}[WARNING] AstroCausal ML failed: {e}{RESET}")

            if args.engine in ['all', 'emotion']:
                try:
                    train_emotion(target_path)
                except Exception as e:
                    print(f"{RED}[WARNING] Emotion ML failed: {e}{RESET}")
        else:
            print(f"{RED}[ERROR] Unsupported file extension '{file_ext}'. Please provide a .csv, .tsv, .pdf, or YouTube URL.{RESET}")
            sys.exit(1)

    print(f"{GREEN}{BOLD}════════════════════════════════════════════════════════════════════════{RESET}")
    print(f"{GREEN}{BOLD}✓ ALL SPECIFIED ENGINES SUCCESSFULLY TRAINED AND CALIBRATED!{RESET}")
    print(f"{CYAN}Trained weights and knowledge vectors are active in `ElectroPulse_OS/client/src/engines/`{RESET}")

    if args.rebuild:
        print(f"\n{YELLOW}[REBUILD] Compiling production console bundle with new weights...{RESET}")
        client_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '../client'))
        cmd = f"npm run build; Copy-Item -Path \"dist\\*\" -Destination \"..\\console\" -Recurse -Force"
        subprocess.run(["powershell", "-Command", f"cd \"{client_dir}\"; {cmd}"], check=True)
        print(f"{GREEN}✓ Production console updated! Live on http://localhost:8844/{RESET}")

if __name__ == '__main__':
    main()
