from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import require_roles
from app.models.knowledge import KnowledgeBase
from app.models.event import Event
from app.services.gemini_service import gemini_service
from pydantic import BaseModel

router = APIRouter(prefix="/knowledge", tags=["Knowledge Base (RAG)"])


class KnowledgeItemCreate(BaseModel):
    event_id: int
    title: str
    content: str
    category: Optional[str] = "FAQ"


class KnowledgeItemResponse(BaseModel):
    id: int
    event_id: int
    title: str
    content: str
    category: Optional[str] = "FAQ"
    status: str = "INDEXED"
    dimensions: int = 768
    created_at: Optional[str] = None

    class Config:
        from_attributes = True


@router.get("/{event_id}", response_model=List[KnowledgeItemResponse])
async def get_knowledge_items(
    event_id: int,
    db: AsyncSession = Depends(get_db)
):
    """Retrieve all knowledge base items for an event."""
    stmt = select(KnowledgeBase).where(KnowledgeBase.event_id == event_id).order_by(KnowledgeBase.id.desc())
    res = await db.execute(stmt)
    items = res.scalars().all()

    response_items = []
    for item in items:
        created_str = item.created_at.isoformat() if hasattr(item, 'created_at') and item.created_at else None
        dims = len(item.embedding) if item.embedding else 768
        response_items.append(
            KnowledgeItemResponse(
                id=item.id,
                event_id=item.event_id,
                title=item.title,
                content=item.content,
                category=getattr(item, 'category', 'FAQ') or 'FAQ',
                status="INDEXED" if item.embedding else "PENDING",
                dimensions=dims,
                created_at=created_str
            )
        )
    return response_items


@router.post("", response_model=KnowledgeItemResponse, status_code=status.HTTP_201_CREATED,
             dependencies=[Depends(require_roles(["ADMIN", "STAFF", "EVENT_MANAGER"]))])
async def create_knowledge_item(
    payload: KnowledgeItemCreate,
    db: AsyncSession = Depends(get_db)
):
    """Create a new knowledge chunk, vectorize with Gemini embedding, and store in pgvector."""
    event = await db.get(Event, payload.event_id)
    if not event:
        # Create default event 1 if not existing
        event = Event(
            id=payload.event_id,
            title="EventHub AI Summit 2026",
            description="Leading AI Summit in Vietnam",
            location="GEM Center, HCMC",
            status="UPCOMING"
        )
        db.add(event)
        await db.flush()

    # Generate vector embedding using Gemini
    embedding = await gemini_service.generate_embedding(payload.content)

    item = KnowledgeBase(
        event_id=payload.event_id,
        title=payload.title.strip(),
        content=payload.content.strip(),
        embedding=embedding
    )
    db.add(item)
    await db.commit()
    await db.refresh(item)

    return KnowledgeItemResponse(
        id=item.id,
        event_id=item.event_id,
        title=item.title,
        content=item.content,
        category=payload.category or "FAQ",
        status="INDEXED",
        dimensions=len(embedding) if embedding else 768,
        created_at=item.created_at.isoformat() if hasattr(item, 'created_at') and item.created_at else None
    )


@router.post("/upload", response_model=KnowledgeItemResponse, status_code=status.HTTP_201_CREATED,
             dependencies=[Depends(require_roles(["ADMIN", "STAFF", "EVENT_MANAGER"]))])
async def upload_knowledge_file(
    event_id: int = Form(1),
    category: str = Form("FAQ"),
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db)
):
    """Upload a file (.pdf, .txt, .md), extract text content, vectorize, and save."""
    content_bytes = await file.read()
    try:
        content_text = content_bytes.decode("utf-8")
    except UnicodeDecodeError:
        content_text = content_bytes.decode("latin-1", errors="ignore")

    content_snippet = content_text[:3000] if content_text.strip() else f"[File: {file.filename}]"
    embedding = await gemini_service.generate_embedding(content_snippet)

    item = KnowledgeBase(
        event_id=event_id,
        title=file.filename,
        content=content_snippet,
        embedding=embedding
    )
    db.add(item)
    await db.commit()
    await db.refresh(item)

    return KnowledgeItemResponse(
        id=item.id,
        event_id=item.event_id,
        title=item.title,
        content=item.content,
        category=category,
        status="INDEXED",
        dimensions=len(embedding) if embedding else 768,
        created_at=item.created_at.isoformat() if hasattr(item, 'created_at') and item.created_at else None
    )


@router.delete("/{id}", status_code=status.HTTP_204_NO_CONTENT,
               dependencies=[Depends(require_roles(["ADMIN", "STAFF", "EVENT_MANAGER"]))])
async def delete_knowledge_item(
    id: int,
    db: AsyncSession = Depends(get_db)
):
    """Delete a knowledge item by ID."""
    item = await db.get(KnowledgeBase, id)
    if item:
        await db.delete(item)
        await db.commit()
    return None
