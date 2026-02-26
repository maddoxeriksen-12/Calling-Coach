import os
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session as DBSession
from PyPDF2 import PdfReader
import io

from database import get_db
from models import Product, User
from auth import get_current_user
from services.usps_extractor import extract_usps

router = APIRouter(prefix="/products", tags=["products"])


def parse_upload(file_bytes: bytes, filename: str) -> str:
    if filename.lower().endswith(".pdf"):
        reader = PdfReader(io.BytesIO(file_bytes))
        return "\n".join(page.extract_text() or "" for page in reader.pages)
    return file_bytes.decode("utf-8", errors="replace")


@router.post("/upload")
async def upload_product(
    name: str = Form(...),
    file: UploadFile = File(...),
    db: DBSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    contents = await file.read()
    if len(contents) > 10 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="File too large (max 10MB)")

    raw_text = parse_upload(contents, file.filename)
    if len(raw_text.strip()) < 50:
        raise HTTPException(status_code=400, detail="Document too short to extract USPs from")

    extracted = extract_usps(raw_text)

    product = Product(
        user_id=user.id,
        name=name,
        raw_text=raw_text,
        extracted_usps=extracted.get("usps", []),
        key_terms=extracted.get("key_terms", []),
        common_objections=extracted.get("common_objections", []),
        client_frames=extracted.get("client_frames", {}),
    )
    db.add(product)
    db.commit()
    db.refresh(product)
    return {
        "id": product.id,
        "name": product.name,
        "usps_count": len(product.extracted_usps),
        "terms_count": len(product.key_terms),
        "objections_count": len(product.common_objections),
    }


@router.get("/")
def list_products(
    db: DBSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    products = db.query(Product).filter(Product.user_id == user.id).order_by(Product.created_at.desc()).all()
    return [
        {
            "id": p.id,
            "name": p.name,
            "usps_count": len(p.extracted_usps or []),
            "terms_count": len(p.key_terms or []),
            "created_at": p.created_at.isoformat(),
        }
        for p in products
    ]


@router.get("/{product_id}")
def get_product(
    product_id: int,
    db: DBSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    product = db.query(Product).filter(Product.id == product_id, Product.user_id == user.id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    return {
        "id": product.id,
        "name": product.name,
        "extracted_usps": product.extracted_usps,
        "key_terms": product.key_terms,
        "common_objections": product.common_objections,
        "client_frames": product.client_frames,
        "created_at": product.created_at.isoformat(),
    }


@router.delete("/{product_id}")
def delete_product(
    product_id: int,
    db: DBSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    product = db.query(Product).filter(Product.id == product_id, Product.user_id == user.id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    db.delete(product)
    db.commit()
    return {"detail": "Product deleted"}
