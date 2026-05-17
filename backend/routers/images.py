import os
import secrets
import time
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import FileResponse
from sqlmodel import Session, select, col

from ..database import engine
from ..models.image_preset import ImagePreset, ImagePresetRead, ImagePresetCreate, ImagePresetUpdate
from ..models.generated_image import GeneratedImage, GeneratedImageRead
from ..services import openrouter_image_client, kie_client
from pydantic import BaseModel

router = APIRouter(prefix="/api", tags=["images"])


def get_session():
    with Session(engine) as session:
        yield session


# ── Image Presets ────────────────────────────────────────────────────────────


@router.get("/image-presets", response_model=List[ImagePresetRead])
def list_image_presets(category: Optional[str] = None, session: Session = Depends(get_session)):
    query = select(ImagePreset).order_by(col(ImagePreset.order_index), col(ImagePreset.name))
    if category:
        query = query.where(ImagePreset.category == category)
    return session.exec(query).all()


@router.post("/image-presets", response_model=ImagePresetRead, status_code=201)
def create_image_preset(data: ImagePresetCreate, session: Session = Depends(get_session)):
    preset = ImagePreset(**data.model_dump())
    session.add(preset)
    session.commit()
    session.refresh(preset)
    return preset


@router.put("/image-presets/{preset_id}", response_model=ImagePresetRead)
def update_image_preset(preset_id: int, data: ImagePresetUpdate, session: Session = Depends(get_session)):
    preset = session.get(ImagePreset, preset_id)
    if not preset:
        raise HTTPException(404, "Preset not found")
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(preset, field, value)
    session.add(preset)
    session.commit()
    session.refresh(preset)
    return preset


@router.delete("/image-presets/{preset_id}", status_code=204)
def delete_image_preset(preset_id: int, session: Session = Depends(get_session)):
    preset = session.get(ImagePreset, preset_id)
    if not preset:
        raise HTTPException(404, "Preset not found")
    session.delete(preset)
    session.commit()


# ── Image Generation ─────────────────────────────────────────────────────────


class ImageGenerateRequest(BaseModel):
    prompt: str
    provider: str = "openrouter"         # "openrouter" | "kie_ai"
    model: str = "black-forest-labs/flux-schnell"
    # OpenRouter-specific
    width: int = 1024
    height: int = 1024
    negative_prompt: str = ""
    guidance_scale: Optional[float] = None
    steps: Optional[int] = None
    seed: Optional[int] = None
    image_ref_b64: Optional[str] = None  # base64 data URI (OpenRouter only)
    # Kie.ai-specific
    aspect_ratio: str = "1:1"
    safety_tolerance: int = 6
    input_image_url: Optional[str] = None  # public URL (Kie.ai only)
    # Common
    preset_id: Optional[int] = None


@router.post("/projects/{project_id}/images/generate", response_model=GeneratedImageRead, status_code=201)
def generate_image(
    project_id: int,
    req: ImageGenerateRequest,
    session: Session = Depends(get_session),
):
    # Resolve preset — prepend/append prompt parts
    full_prompt = req.prompt.strip()
    full_negative = req.negative_prompt.strip()

    if req.preset_id:
        preset = session.get(ImagePreset, req.preset_id)
        if preset:
            parts = []
            if preset.prompt_prefix:
                parts.append(preset.prompt_prefix.strip(", "))
            parts.append(full_prompt)
            if preset.prompt_suffix:
                parts.append(preset.prompt_suffix.strip(", "))
            full_prompt = ", ".join(p for p in parts if p)

            if not full_negative and preset.negative_prompt:
                full_negative = preset.negative_prompt

    # Determine stored dimensions for metadata
    stored_width = req.width
    stored_height = req.height
    if req.provider == "kie_ai":
        # Derive approximate dimensions from aspect ratio for storage
        ratio_dims = {
            "1:1": (1024, 1024), "16:9": (1024, 576), "9:16": (576, 1024),
            "4:3": (1024, 768), "3:4": (768, 1024), "21:9": (1024, 439),
        }
        stored_width, stored_height = ratio_dims.get(req.aspect_ratio, (1024, 1024))

    # Generate the image bytes
    try:
        if req.provider == "kie_ai":
            image_bytes = kie_client.generate_image(
                prompt=full_prompt,
                model=req.model,
                aspect_ratio=req.aspect_ratio,
                safety_tolerance=req.safety_tolerance,
                input_image_url=req.input_image_url,
            )
        else:
            image_bytes = openrouter_image_client.generate_image(
                prompt=full_prompt,
                model=req.model,
                width=req.width,
                height=req.height,
                negative_prompt=full_negative,
                seed=req.seed,
                guidance_scale=req.guidance_scale,
                steps=req.steps,
                image_url=req.image_ref_b64,
            )
    except Exception as exc:
        raise HTTPException(502, f"Image generation failed: {exc}") from exc

    # Save to disk
    img_dir = f"data/images/{project_id}"
    os.makedirs(img_dir, exist_ok=True)
    filename = f"img_{int(time.time())}_{secrets.token_hex(4)}.png"
    filepath = os.path.join(img_dir, filename)
    with open(filepath, "wb") as f:
        f.write(image_bytes)

    # Save metadata to DB
    record = GeneratedImage(
        project_id=project_id,
        filename=filename,
        prompt=full_prompt,
        negative_prompt=full_negative,
        model=req.model,
        provider=req.provider,
        width=stored_width,
        height=stored_height,
        seed=req.seed,
        preset_id=req.preset_id,
        is_avatar=False,
    )
    session.add(record)
    session.commit()
    session.refresh(record)
    return record


# ── Image Gallery ─────────────────────────────────────────────────────────────


@router.get("/projects/{project_id}/images", response_model=List[GeneratedImageRead])
def list_images(project_id: int, session: Session = Depends(get_session)):
    images = session.exec(
        select(GeneratedImage)
        .where(GeneratedImage.project_id == project_id)
        .order_by(col(GeneratedImage.created_at).desc())
    ).all()
    return images


@router.get("/images/file/{image_id}")
def serve_image(image_id: int, session: Session = Depends(get_session)):
    img = session.get(GeneratedImage, image_id)
    if not img:
        raise HTTPException(404, "Image not found")
    path = f"data/images/{img.project_id}/{img.filename}"
    if not os.path.exists(path):
        raise HTTPException(404, "Image file not found on disk")
    return FileResponse(path, media_type="image/png")


@router.delete("/images/{image_id}", status_code=204)
def delete_image(image_id: int, session: Session = Depends(get_session)):
    img = session.get(GeneratedImage, image_id)
    if not img:
        raise HTTPException(404, "Image not found")
    # Remove file from disk
    path = f"data/images/{img.project_id}/{img.filename}"
    try:
        os.remove(path)
    except FileNotFoundError:
        pass
    session.delete(img)
    session.commit()


@router.put("/images/{image_id}/set-avatar")
def set_avatar(image_id: int, session: Session = Depends(get_session)):
    img = session.get(GeneratedImage, image_id)
    if not img:
        raise HTTPException(404, "Image not found")
    # Clear all avatars for this project, then set this one
    all_imgs = session.exec(
        select(GeneratedImage).where(GeneratedImage.project_id == img.project_id)
    ).all()
    for other in all_imgs:
        other.is_avatar = False
        session.add(other)
    img.is_avatar = True
    session.add(img)
    session.commit()
    return {"ok": True}


# ── Kie.ai Credit Balance ─────────────────────────────────────────────────────


@router.get("/images/kie-balance")
def get_kie_balance():
    try:
        balance = kie_client.get_credit_balance()
        return {"balance": balance}
    except Exception as exc:
        raise HTTPException(502, f"Failed to fetch Kie.ai balance: {exc}") from exc
