#!/usr/bin/env python3
"""
pulse_llm.py
Optional local LLM bridge (Ollama-compatible /api/chat). OFF unless PULSE_LLM_MODEL is set.

Role: answer open-ended questions that none of the clinical intents cover ("what's a good way to
stay motivated on a long transit?"). It is never used for measurements, diagnoses or protocols -
those always come from the deterministic engines.

Guard rails (applied in code, not just in the prompt):
  * the model only sees a compact FACTS block built from live engine output;
  * a reply containing any number that is not in the FACTS / question is discarded;
  * a reply that looks like a medication dose is discarded.
When anything fails the caller falls back to an honest "I can't help with that" - never a guess.

Offline-first: set PULSE_LLM_URL / PULSE_LLM_MODEL to a model already pulled onto the vehicle.
"""

import json
import os
import re
import time
import urllib.error
import urllib.request
from typing import Any, Dict, Optional

_NUM = re.compile(r"\d+(?:\.\d+)?")
_DOSE = re.compile(r"\b\d+(?:\.\d+)?\s*(mg|mcg|µg|ml|mL|g|iu|units?|tablets?|pills?|capsules?)\b|\bdose of\b", re.I)

SYSTEM = (
    "You are P.U.L.S.E., an on-board medical assistant for a spacecraft crew with no real-time link to Earth. "
    "Answer in at most 60 words, plain spoken English, persona: {persona}. "
    "Use ONLY the FACTS block for anything about the crew member's body, vitals or the cabin. "
    "If the FACTS do not contain it, say you do not have that data. "
    "Never give medication names with doses, never diagnose, never invent numbers. "
    "For anything urgent, tell the crew member to use the flagged protocol or contact the flight surgeon."
)


class LLMBridge:
    def __init__(self, url: Optional[str] = None, model: Optional[str] = None, timeout: float = 10.0):
        self.url = (url or os.environ.get("PULSE_LLM_URL") or "http://127.0.0.1:11434").rstrip("/")
        self.model = model if model is not None else os.environ.get("PULSE_LLM_MODEL")
        self.timeout = timeout
        self._ok: Optional[bool] = None
        self._checked = 0.0

    @property
    def enabled(self) -> bool:
        return bool(self.model)

    def available(self) -> bool:
        if not self.enabled:
            return False
        if self._ok is not None and time.time() - self._checked < 30.0:
            return self._ok
        try:
            with urllib.request.urlopen(f"{self.url}/api/tags", timeout=2.0) as r:
                self._ok = r.status == 200
        except Exception:
            self._ok = False
        self._checked = time.time()
        return bool(self._ok)

    @staticmethod
    def grounded(reply: str, facts_text: str, question: str) -> bool:
        allowed = set(_NUM.findall(facts_text)) | set(_NUM.findall(question))
        if any(n not in allowed for n in _NUM.findall(reply)):
            return False
        return not _DOSE.search(reply)

    def answer(self, question: str, facts: Dict[str, Any], persona: str = "jarvis") -> Optional[str]:
        if not self.available():
            return None
        facts_text = json.dumps(facts, separators=(",", ":"), default=str)
        body = {
            "model": self.model,
            "stream": False,
            "options": {"temperature": 0.2, "num_predict": 140},
            "messages": [
                {"role": "system", "content": SYSTEM.format(persona=persona)},
                {"role": "user", "content": f"FACTS: {facts_text}\n\nQUESTION: {question}"},
            ],
        }
        try:
            req = urllib.request.Request(f"{self.url}/api/chat", data=json.dumps(body).encode(),
                                         headers={"Content-Type": "application/json"})
            with urllib.request.urlopen(req, timeout=self.timeout) as r:
                reply = (json.loads(r.read().decode()).get("message", {}).get("content") or "").strip()
        except (urllib.error.URLError, TimeoutError, ValueError, OSError):
            self._ok = False
            self._checked = time.time()
            return None
        if not reply or not self.grounded(reply, facts_text, question):
            return None
        return reply
