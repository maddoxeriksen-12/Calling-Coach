import datetime
from sqlalchemy import Column, Integer, String, Float, Text, DateTime, ForeignKey, JSON
from sqlalchemy.orm import relationship
from database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    password_hash = Column(String, nullable=False)
    name = Column(String, nullable=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    products = relationship("Product", back_populates="user")
    sessions = relationship("Session", back_populates="user")


class Product(Base):
    __tablename__ = "products"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    name = Column(String, nullable=False)
    raw_text = Column(Text, nullable=False)
    extracted_usps = Column(JSON, default=list)
    key_terms = Column(JSON, default=list)
    common_objections = Column(JSON, default=list)
    client_frames = Column(JSON, default=dict)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    user = relationship("User", back_populates="products")
    sessions = relationship("Session", back_populates="product")


class Session(Base):
    __tablename__ = "sessions"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False)
    personality_type = Column(String, nullable=False)
    vapi_call_id = Column(String, nullable=True)
    transcript = Column(JSON, default=list)
    status = Column(String, default="pending")
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    user = relationship("User", back_populates="sessions")
    product = relationship("Product", back_populates="sessions")
    scores = relationship("Score", back_populates="session", uselist=False)
    answer_scores = relationship("AnswerScore", back_populates="session")


class Score(Base):
    __tablename__ = "scores"

    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(Integer, ForeignKey("sessions.id"), unique=True, nullable=False)
    term_understanding = Column(Float, default=0)
    description_breadth = Column(Float, default=0)
    conciseness = Column(Float, default=0)
    objection_handling = Column(Float, default=0)
    usp_framing = Column(Float, default=0)
    confidence = Column(Float, default=0)
    overall = Column(Float, default=0)
    detailed_feedback = Column(JSON, default=dict)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    session = relationship("Session", back_populates="scores")


class AnswerScore(Base):
    __tablename__ = "answer_scores"

    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(Integer, ForeignKey("sessions.id"), nullable=False)
    question = Column(Text, nullable=False)
    answer_summary = Column(Text, nullable=False)
    term_accuracy = Column(Float, default=0)
    conciseness = Column(Float, default=0)
    framing_quality = Column(Float, default=0)
    feedback = Column(Text, default="")
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    session = relationship("Session", back_populates="answer_scores")
