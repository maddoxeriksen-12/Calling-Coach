import json
from fastapi import APIRouter, Request
from sqlalchemy.orm import Session as DBSession

from database import SessionLocal
from models import Session, Score, AnswerScore, Product
from services.scoring import score_full_session

router = APIRouter(prefix="/webhook", tags=["webhook"])


def get_db_session() -> DBSession:
    return SessionLocal()


@router.post("/vapi")
async def vapi_webhook(request: Request):
    body = await request.json()
    message = body.get("message", {})
    msg_type = message.get("type", "")

    if msg_type == "tool-calls":
        return handle_tool_calls(message)
    elif msg_type == "end-of-call-report":
        handle_end_of_call(message)
        return {"status": "ok"}
    elif msg_type == "transcript":
        handle_transcript(message)
        return {"status": "ok"}
    elif msg_type == "status-update":
        handle_status_update(message)
        return {"status": "ok"}

    return {"status": "ok"}


def handle_tool_calls(message: dict) -> dict:
    tool_calls = message.get("toolCallList", [])
    results = []

    for tool_call in tool_calls:
        fn_name = tool_call.get("function", {}).get("name", "")
        arguments = tool_call.get("function", {}).get("arguments", {})
        if isinstance(arguments, str):
            arguments = json.loads(arguments)
        tool_call_id = tool_call.get("id", "")

        if fn_name == "score_response":
            save_answer_score(message, arguments)
            results.append({
                "name": fn_name,
                "toolCallId": tool_call_id,
                "result": json.dumps({"status": "scored", "message": "Score recorded. Continue the conversation."}),
            })
        else:
            results.append({
                "name": fn_name,
                "toolCallId": tool_call_id,
                "result": json.dumps({"status": "unknown_tool"}),
            })

    return {"results": results}


def save_answer_score(message: dict, arguments: dict):
    call_id = message.get("call", {}).get("id")
    if not call_id:
        return

    db = get_db_session()
    try:
        session = db.query(Session).filter(Session.vapi_call_id == call_id).first()
        if not session:
            return

        answer_score = AnswerScore(
            session_id=session.id,
            question=arguments.get("question", ""),
            answer_summary=arguments.get("answer_summary", ""),
            term_accuracy=arguments.get("term_accuracy", 0),
            conciseness=arguments.get("conciseness", 0),
            framing_quality=arguments.get("framing_quality", 0),
            feedback=arguments.get("feedback", ""),
        )
        db.add(answer_score)
        db.commit()
    finally:
        db.close()


def handle_transcript(message: dict):
    call_id = message.get("call", {}).get("id")
    transcript = message.get("artifact", {}).get("transcript", "")
    if not call_id or not transcript:
        return

    db = get_db_session()
    try:
        session = db.query(Session).filter(Session.vapi_call_id == call_id).first()
        if session:
            current = session.transcript or []
            current.append({"role": message.get("role", "unknown"), "content": transcript})
            session.transcript = current
            db.commit()
    finally:
        db.close()


def handle_status_update(message: dict):
    call_id = message.get("call", {}).get("id")
    status = message.get("status")
    if not call_id or not status:
        return

    db = get_db_session()
    try:
        session = db.query(Session).filter(Session.vapi_call_id == call_id).first()
        if session:
            if status == "in-progress":
                session.status = "active"
            elif status == "ended":
                session.status = "completed"
            db.commit()
    finally:
        db.close()


def handle_end_of_call(message: dict):
    call_id = message.get("call", {}).get("id")
    if not call_id:
        return

    db = get_db_session()
    try:
        session = db.query(Session).filter(Session.vapi_call_id == call_id).first()
        if not session:
            return

        messages = message.get("artifact", {}).get("messages", [])
        if messages:
            session.transcript = messages
        session.status = "completed"
        db.commit()

        product = db.query(Product).filter(Product.id == session.product_id).first()
        if not product:
            return

        product_data = {
            "extracted_usps": product.extracted_usps or [],
            "key_terms": product.key_terms or [],
        }

        scores_result = score_full_session(messages, product_data, session.personality_type)

        existing_score = db.query(Score).filter(Score.session_id == session.id).first()
        if existing_score:
            return

        score = Score(
            session_id=session.id,
            term_understanding=scores_result.get("term_understanding", 0),
            description_breadth=scores_result.get("description_breadth", 0),
            conciseness=scores_result.get("conciseness", 0),
            objection_handling=scores_result.get("objection_handling", 0),
            usp_framing=scores_result.get("usp_framing", 0),
            confidence=scores_result.get("confidence", 0),
            overall=scores_result.get("overall", 0),
            detailed_feedback={
                "per_answer_feedback": scores_result.get("per_answer_feedback", []),
                "strengths": scores_result.get("strengths", []),
                "improvements": scores_result.get("improvements", []),
                "rambling_instances": scores_result.get("rambling_instances", 0),
            },
        )
        db.add(score)
        db.commit()
    finally:
        db.close()
