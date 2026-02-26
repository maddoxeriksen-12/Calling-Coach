import os
import json
from openai import OpenAI

_client = None

def get_client():
    global _client
    if _client is None:
        _client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
    return _client

EXTRACTION_PROMPT = """You are a sales training expert. Analyze the following product documentation and extract structured information for sales coaching.

Return a JSON object with exactly these keys:

1. "usps": An array of objects, each with:
   - "title": Short USP name
   - "description": 2-3 sentence description of the USP
   - "proof_points": Array of specific facts/stats that support this USP
   - "differentiation": What makes this different from competitors

2. "key_terms": An array of objects, each with:
   - "term": The technical term or product-specific vocabulary
   - "definition": Clear definition a salesperson should know
   - "usage_example": Example of how to use this term in a sales conversation

3. "common_objections": An array of objects, each with:
   - "objection": The likely customer pushback
   - "related_usp": Which USP this objection targets
   - "recommended_response": A strong rebuttal framework

4. "client_frames": An object with keys for each buyer type, each containing an array of positioning tips:
   - "skeptical_buyer": How to frame USPs for skeptics
   - "analytical_decision_maker": How to frame for data-driven buyers
   - "busy_executive": How to frame for time-pressed executives
   - "friendly_non_committal": How to frame for agreeable but evasive buyers
   - "technical_expert": How to frame for technical audiences
   - "price_focused_negotiator": How to frame for cost-conscious buyers

Be thorough. Extract every meaningful USP and term. Product documentation follows:

---
{document_text}
---

Return ONLY valid JSON, no markdown fences."""


def extract_usps(document_text: str) -> dict:
    response = get_client().chat.completions.create(
        model="gpt-4o",
        messages=[
            {"role": "system", "content": "You return only valid JSON."},
            {"role": "user", "content": EXTRACTION_PROMPT.format(document_text=document_text)},
        ],
        temperature=0.2,
        response_format={"type": "json_object"},
    )
    return json.loads(response.choices[0].message.content)
