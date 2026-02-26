import os
from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env"))

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from database import engine, Base
from auth import router as auth_router
from routers.products import router as products_router
from routers.sessions import router as sessions_router
from routers.scores import router as scores_router
from routers.webhook import router as webhook_router

Base.metadata.create_all(bind=engine)

app = FastAPI(title="Calling Coach API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)
app.include_router(products_router)
app.include_router(sessions_router)
app.include_router(scores_router)
app.include_router(webhook_router)


@app.get("/health")
def health():
    return {"status": "ok"}
