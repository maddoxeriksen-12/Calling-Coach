import os
import json
from openai import OpenAI

client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

POST_CALL_SCORING_PROMPT = """You are a strict sales coach evaluating a salesperson's performance in a practice call.

PRODUCT CONTEXT:
USPs: {usps_json}
Key Terms: {terms_json}

PERSONALITY TYPE: {personality_type}

FULL TRANSCRIPT:
{transcript}

Evaluate the salesperson's performance across these 6 dimensions on a 0-100 scale. Be CRITICAL — most salespeople should score between 40-75. Only give 80+ for genuinely excellent performance.

Return a JSON object with:

1. "term_understanding" (0-100): Did they correctly use and explain product terminology? Did they misuse any terms? Could they define concepts when challenged?

2. "description_breadth" (0-100): How thoroughly did they cover the product's features and benefits? Did they address multiple USPs or just repeat one? Did they connect features to customer value?

3. "conciseness" (0-100): Were their answers crisp and to-the-point? Penalize heavily for rambling, filler words, circular explanations, and unnecessarily long responses. A score of 90+ means every word earned its place.

4. "objection_handling" (0-100): How well did they respond to pushback? Did they acknowledge the objection before countering? Did they provide evidence? Did they stay confident under pressure?

5. "usp_framing" (0-100): Did they tailor the USP presentation to this specific buyer personality? A skeptic needs proof, an executive needs brevity, an analyst needs data. Did they adapt?

6. "confidence" (0-100): Did they sound knowledgeable and assured? Penalize for excessive hedging ("I think maybe...", "I'm not sure but..."), filler words, and backing down too easily.

7. "overall" (0-100): Weighted average of all dimensions, with extra weight on the weakest areas.

8. "per_answer_feedback": An array of objects for each Q&A exchange, each with:
   - "question": The prospect's question
   - "answer_summary": Brief summary of the salesperson's answer
   - "score": 0-100 for that specific answer
   - "feedback": 1-2 sentences of specific, actionable feedback
   - "improvement": What they should say instead (brief example)

9. "strengths": Array of 2-3 specific things they did well
10. "improvements": Array of 3-5 specific things to work on, ordered by priority
11. "rambling_instances": Number of times they rambled or were too wordy

Return ONLY valid JSON."""


def score_full_session(transcript: list, product_data: dict, personality_type: str) -> dict:
    transcript_text = ""
    for msg in transcript:
        role = msg.get("role", "unknown")
        content = msg.get("content", msg.get("message", ""))
        transcript_text += f"{role.upper()}: {content}\n"

    prompt = POST_CALL_SCORING_PROMPT.format(
        usps_json=json.dumps(product_data.get("extracted_usps", []), indent=2),
        terms_json=json.dumps(product_data.get("key_terms", []), indent=2),
        personality_type=personality_type,
        transcript=transcript_text,
    )

    response = client.chat.completions.create(
        model="gpt-4o",
        messages=[
            {"role": "system", "content": "You are a strict sales performance evaluator. Return only valid JSON."},
            {"role": "user", "content": prompt},
        ],
        temperature=0.3,
        response_format={"type": "json_object"},
    )
    return json.loads(response.choices[0].message.content)
