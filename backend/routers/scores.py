from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func
from sqlalchemy.orm import Session as DBSession

from database import get_db
from models import Session, Score, User
from auth import get_current_user

router = APIRouter(prefix="/scores", tags=["scores"])


@router.get("/dashboard")
def get_dashboard(
    db: DBSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    sessions = (
        db.query(Session, Score)
        .join(Score, Score.session_id == Session.id)
        .filter(Session.user_id == user.id, Session.status == "completed")
        .order_by(Session.created_at.desc())
        .all()
    )

    if not sessions:
        return {
            "total_sessions": 0,
            "average_scores": None,
            "score_trend": [],
            "by_personality": {},
            "strongest_dimension": None,
            "weakest_dimension": None,
        }

    dimensions = [
        "term_understanding", "description_breadth", "conciseness",
        "objection_handling", "usp_framing", "confidence", "overall",
    ]

    totals = {d: 0 for d in dimensions}
    count = len(sessions)
    by_personality = {}
    trend = []

    for session, score in sessions:
        for d in dimensions:
            totals[d] += getattr(score, d, 0)

        pt = session.personality_type
        if pt not in by_personality:
            by_personality[pt] = {"count": 0, "total_overall": 0}
        by_personality[pt]["count"] += 1
        by_personality[pt]["total_overall"] += score.overall

        trend.append({
            "session_id": session.id,
            "date": session.created_at.isoformat(),
            "overall": score.overall,
            "personality": session.personality_type,
        })

    averages = {d: round(totals[d] / count, 1) for d in dimensions}

    score_dims = {k: v for k, v in averages.items() if k != "overall"}
    strongest = max(score_dims, key=score_dims.get) if score_dims else None
    weakest = min(score_dims, key=score_dims.get) if score_dims else None

    for pt in by_personality:
        by_personality[pt]["average_overall"] = round(
            by_personality[pt]["total_overall"] / by_personality[pt]["count"], 1
        )

    return {
        "total_sessions": count,
        "average_scores": averages,
        "score_trend": list(reversed(trend)),
        "by_personality": by_personality,
        "strongest_dimension": strongest,
        "weakest_dimension": weakest,
    }
