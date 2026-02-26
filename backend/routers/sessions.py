import os
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session as DBSession

from database import get_db
from models import Session, Product, Score, AnswerScore, User
from auth import get_current_user
from services.personality import (
    get_personality,
    get_all_personalities,
    build_system_prompt,
    PERSONALITIES,
)

router = APIRouter(prefix="/sessions", tags=["sessions"])

VAPI_PRIVATE_KEY = os.getenv("VAPI_PRIVATE_KEY", "")

def get_webhook_base_url() -> str:
    explicit = os.getenv("WEBHOOK_BASE_URL")
    if explicit:
        return explicit.rstrip("/")
    railway_domain = os.getenv("RAILWAY_PUBLIC_DOMAIN")
    if railway_domain:
        return f"https://{railway_domain}"
    return "https://your-server.com"


class CreateSessionRequest(BaseModel):
    product_id: int
    personality_type: str


@router.get("/personalities")
def list_personalities():
    return get_all_personalities()


@router.post("/")
def create_session(
    req: CreateSessionRequest,
    db: DBSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    product = db.query(Product).filter(Product.id == req.product_id, Product.user_id == user.id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    if req.personality_type not in PERSONALITIES:
        raise HTTPException(status_code=400, detail=f"Invalid personality type. Choose from: {list(PERSONALITIES.keys())}")

    session = Session(
        user_id=user.id,
        product_id=req.product_id,
        personality_type=req.personality_type,
        status="pending",
    )
    db.add(session)
    db.commit()
    db.refresh(session)

    personality = get_personality(req.personality_type)
    product_data = {
        "extracted_usps": product.extracted_usps or [],
        "key_terms": product.key_terms or [],
        "common_objections": product.common_objections or [],
        "client_frames": product.client_frames or {},
    }
    system_prompt = build_system_prompt(req.personality_type, product_data)

    vapi_config = {
        "model": {
            "provider": "openai",
            "model": "gpt-4o",
            "messages": [{"role": "system", "content": system_prompt}],
            "tools": [
                {
                    "type": "function",
                    "function": {
                        "name": "score_response",
                        "description": "Score the salesperson's response after each Q&A exchange. Call this after every answer they give.",
                        "parameters": {
                            "type": "object",
                            "properties": {
                                "question": {
                                    "type": "string",
                                    "description": "The question or objection you asked",
                                },
                                "answer_summary": {
                                    "type": "string",
                                    "description": "Brief summary of the salesperson's answer",
                                },
                                "term_accuracy": {
                                    "type": "number",
                                    "description": "Score 0-100 for correct use of product terminology",
                                },
                                "conciseness": {
                                    "type": "number",
                                    "description": "Score 0-100 for answer brevity and clarity. Penalize rambling.",
                                },
                                "framing_quality": {
                                    "type": "number",
                                    "description": "Score 0-100 for how well the answer was framed for this buyer personality",
                                },
                                "feedback": {
                                    "type": "string",
                                    "description": "One sentence of specific feedback on this answer",
                                },
                            },
                            "required": ["question", "answer_summary", "term_accuracy", "conciseness", "framing_quality", "feedback"],
                        },
                    },
                }
            ],
        },
        "voice": {
            "provider": "11labs",
            "voiceId": "burt",
        },
        "firstMessage": f"Hey, thanks for jumping on this call. I've got a few minutes — tell me what you've got. What is this product and why should I care?",
        "serverUrl": f"{get_webhook_base_url()}/webhook/vapi",
        "serverMessages": ["end-of-call-report", "tool-calls", "transcript", "status-update"],
        "stopSpeakingPlan": personality["vapi_stop_speaking_plan"],
        "endCallPhrases": ["goodbye", "end the session", "that's all"],
        "metadata": {
            "session_id": session.id,
        },
    }

    return {
        "session_id": session.id,
        "vapi_config": vapi_config,
        "personality": {
            "type": req.personality_type,
            "label": personality["label"],
            "description": personality["description"],
        },
    }


class UpdateCallIdRequest(BaseModel):
    vapi_call_id: str


@router.patch("/{session_id}/call-id")
def update_call_id(
    session_id: int,
    req: UpdateCallIdRequest,
    db: DBSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    session = db.query(Session).filter(Session.id == session_id, Session.user_id == user.id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    session.vapi_call_id = req.vapi_call_id
    session.status = "active"
    db.commit()
    return {"status": "updated"}


@router.get("/")
def list_sessions(
    db: DBSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    sessions = (
        db.query(Session)
        .filter(Session.user_id == user.id)
        .order_by(Session.created_at.desc())
        .all()
    )
    results = []
    for s in sessions:
        score = db.query(Score).filter(Score.session_id == s.id).first()
        product = db.query(Product).filter(Product.id == s.product_id).first()
        results.append({
            "id": s.id,
            "product_name": product.name if product else "Unknown",
            "personality_type": s.personality_type,
            "status": s.status,
            "overall_score": score.overall if score else None,
            "created_at": s.created_at.isoformat(),
        })
    return results


@router.get("/{session_id}")
def get_session(
    session_id: int,
    db: DBSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    session = db.query(Session).filter(Session.id == session_id, Session.user_id == user.id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    score = db.query(Score).filter(Score.session_id == session.id).first()
    answer_scores = db.query(AnswerScore).filter(AnswerScore.session_id == session.id).order_by(AnswerScore.created_at).all()
    product = db.query(Product).filter(Product.id == session.product_id).first()

    return {
        "id": session.id,
        "product_name": product.name if product else "Unknown",
        "personality_type": session.personality_type,
        "status": session.status,
        "transcript": session.transcript,
        "created_at": session.created_at.isoformat(),
        "scores": {
            "term_understanding": score.term_understanding,
            "description_breadth": score.description_breadth,
            "conciseness": score.conciseness,
            "objection_handling": score.objection_handling,
            "usp_framing": score.usp_framing,
            "confidence": score.confidence,
            "overall": score.overall,
            "detailed_feedback": score.detailed_feedback,
        } if score else None,
        "answer_scores": [
            {
                "question": a.question,
                "answer_summary": a.answer_summary,
                "term_accuracy": a.term_accuracy,
                "conciseness": a.conciseness,
                "framing_quality": a.framing_quality,
                "feedback": a.feedback,
            }
            for a in answer_scores
        ],
    }
