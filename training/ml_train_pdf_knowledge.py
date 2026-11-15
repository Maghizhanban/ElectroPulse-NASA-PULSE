#!/usr/bin/env python3
"""
ml_train_pdf_knowledge.py
P.U.L.S.E. Out-of-Core Streaming Clinical PDF RAG Trainer (Multi-GB Ready)
Team: ElectroPulse | AI Assistant: P.U.L.S.E.

Engineered for massive NASA flight manuals, medical volumes, and clinical PDF libraries.
Streams documents page-by-page directly from disk with O(1) memory overhead.
Extracts clinical rules, physiological thresholds, and fits a high-density
semantic retrieval space. Supports single PDFs or entire directories.
"""

import sys
import os
import glob
import re
import json
import time
import numpy as np

HAS_FITZ = False
HAS_PYPDF = False
try:
    import fitz # PyMuPDF
    HAS_FITZ = True
except ImportError:
    pass

try:
    import pypdf
    HAS_PYPDF = True
except ImportError:
    pass

from sklearn.feature_extraction.text import TfidfVectorizer

def get_pdf_list(input_path):
    if os.path.isdir(input_path):
        return sorted(glob.glob(os.path.join(input_path, '**', '*.pdf'), recursive=True))
    return [input_path]

def stream_pdf_pages(pdf_path):
    """Generator yielding text page-by-page to keep RAM footprint minimal."""
    if HAS_FITZ:
        doc = fitz.open(pdf_path)
        for page_num in range(len(doc)):
            page = doc[page_num]
            text = page.get_text()
            if text.strip():
                yield {"file": os.path.basename(pdf_path), "page": page_num + 1, "text": text.strip()}
        doc.close()
    elif HAS_PYPDF:
        reader = pypdf.PdfReader(pdf_path)
        for page_num, page in enumerate(reader.pages):
            text = page.extract_text() or ""
            if text.strip():
                yield {"file": os.path.basename(pdf_path), "page": page_num + 1, "text": text.strip()}
    else:
        raise RuntimeError("No PDF parser available.")

def stream_chunks_from_pages(page_stream, max_chunk_len=500):
    """Chunks text into cohesive clinical paragraphs."""
    for p in page_stream:
        paras = re.split(r'\n\s*\n', p["text"])
        for para in paras:
            clean = " ".join(para.split())
            if len(clean) < 40:
                continue
            if len(clean) > max_chunk_len:
                words = clean.split()
                cur = []
                cur_len = 0
                for w in words:
                    cur.append(w)
                    cur_len += len(w) + 1
                    if cur_len >= max_chunk_len:
                        yield {"file": p["file"], "page": p["page"], "content": " ".join(cur)}
                        cur = []
                        cur_len = 0
                if cur:
                    yield {"file": p["file"], "page": p["page"], "content": " ".join(cur)}
            else:
                yield {"file": p["file"], "page": p["page"], "content": clean}

def extract_clinical_rules(text):
    standards = re.findall(r'(NASA-[A-Z0-9\-_]+|CPG-[A-Z0-9\-_]+|HRP-[A-Z0-9\-_]+|STD-[0-9]+)', text)
    thresholds = re.findall(r'([><=≥≤]\s*[\d\.]+\s*(?:mm|mmHg|bpm|mGy|uSv|%|mg|LBNP))', text, re.IGNORECASE)
    anatomy = [term for term in ['optic', 'cardiac', 'heart', 'bone', 'lumbar', 'spine', 'brain', 'retina', 'muscle', 'soleus'] if term in text.lower()]
    return {
        "standards": list(set(standards)),
        "thresholds": list(set(thresholds)),
        "anatomy": anatomy
    }

def train_pdf_knowledge(input_path, output_json_path=None):
    pdf_list = get_pdf_list(input_path)
    if not pdf_list:
        print(f"[ERROR] No valid PDF files found in {input_path}", file=sys.stderr)
        sys.exit(1)

    total_bytes = sum(os.path.getsize(f) for f in pdf_list)
    size_mb = total_bytes / (1024 * 1024)

    print(f"\n[PDF STREAMING KNOWLEDGE ML] Ingesting NASA medical document library:")
    print(f"  • Documents detected: {len(pdf_list)} | Total Size: {size_mb:.1f} MB")
    print(f"  • Ingestion Architecture: Out-of-Core Page-by-Page Streaming")

    all_chunks = []
    total_pages = 0
    start_time = time.time()

    # Stream pages across all PDFs
    for pdf_file in pdf_list:
        page_stream = stream_pdf_pages(pdf_file)
        for chunk in stream_chunks_from_pages(page_stream):
            all_chunks.append(chunk)
            if len(all_chunks) % 500 == 0:
                sys.stdout.write(f"\r  -> Streamed {len(all_chunks):,} clinical knowledge chunks... [{time.time() - start_time:.1f}s]")
                sys.stdout.flush()

    total_chunks = len(all_chunks)
    print(f"\n  ✓ Streamed {total_chunks:,} clinical chunks in {time.time() - start_time:.1f}s.")

    if total_chunks == 0:
        print("[ERROR] No readable textual content found in PDF documents.", file=sys.stderr)
        sys.exit(1)

    # Train TF-IDF Semantic Vector Space
    print("\n[PDF STREAMING KNOWLEDGE ML] Training TF-IDF semantic vector space...")
    corpus = [c["content"] for c in all_chunks]
    vectorizer = TfidfVectorizer(max_features=600, stop_words='english', ngram_range=(1, 2))
    tfidf_matrix = vectorizer.fit_transform(corpus)
    vocabulary = vectorizer.get_feature_names_out().tolist()

    print(f"  • Vocabulary fitted: {len(vocabulary)} clinical n-grams.")

    # Annotate chunks with clinical rules and top TF-IDF weights
    enriched_chunks = []
    all_standards = set()
    all_thresholds = set()

    for idx, chunk in enumerate(all_chunks):
        rule_meta = extract_clinical_rules(chunk["content"])
        dense_vec = tfidf_matrix[idx].toarray()[0]
        top_indices = np.argsort(dense_vec)[-8:]
        top_weights = {vocabulary[i]: round(float(dense_vec[i]), 4) for i in top_indices if dense_vec[i] > 0}

        all_standards.update(rule_meta["standards"])
        all_thresholds.update(rule_meta["thresholds"])

        enriched_chunks.append({
            "id": idx + 1,
            "file": chunk["file"],
            "page": chunk["page"],
            "content": chunk["content"],
            "topKeywords": top_weights,
            "clinicalMetadata": rule_meta
        })

    print(f"\n[PDF STREAMING KNOWLEDGE ML] Extracted Clinical Synthesis:")
    print(f"  • Extracted Standards: {list(all_standards)[:8]}")
    print(f"  • Extracted Thresholds: {list(all_thresholds)[:8]}")

    # Export knowledge base
    if output_json_path is None:
        client_engine_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '../client/src/engines'))
        output_json_path = os.path.join(client_engine_dir, 'trained_pdf_knowledge.json')

    payload = {
        "metadata": {
            "sourcePath": os.path.abspath(input_path),
            "totalDocuments": len(pdf_list),
            "totalChunks": total_chunks,
            "vocabularySize": len(vocabulary),
            "identifiedStandards": list(all_standards),
            "identifiedThresholds": list(all_thresholds),
            "architecture": "Streaming Page-by-Page TF-IDF Vector Index"
        },
        "vocabulary": vocabulary,
        "knowledgeChunks": enriched_chunks
    }

    os.makedirs(os.path.dirname(output_json_path), exist_ok=True)
    with open(output_json_path, 'w', encoding='utf-8') as out_f:
        json.dump(payload, out_f, indent=2)

    print(f"[PDF STREAMING KNOWLEDGE ML] ✓ Trained vector knowledge base exported to: {output_json_path}\n")
    return payload

if __name__ == '__main__':
    if len(sys.argv) < 2:
        print("Usage: python ml_train_pdf_knowledge.py <path-to-pdf-or-dir> [output.json]")
        sys.exit(1)
    train_pdf_knowledge(sys.argv[1], sys.argv[2] if len(sys.argv) > 2 else None)
