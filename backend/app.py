import shutil
import uuid
from pathlib import Path

from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from pdf_engine import PDFEngine

app = FastAPI(title="DocuMind", version="2.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

UPLOADS_DIR = Path(__file__).parent / "uploads"
UPLOADS_DIR.mkdir(parents=True, exist_ok=True)

engine = None


def get_engine() -> PDFEngine:
    global engine
    if engine is None:
        engine = PDFEngine()
    return engine


class AskRequest(BaseModel):
    session_id: str
    question: str


@app.get("/")
def root():
    return {"message": "DocuMind API", "docs": "/docs"}


@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/api/upload")
async def upload_pdf(file: UploadFile = File(...)):
    if not file.filename:
        raise HTTPException(status_code=400, detail="No file provided.")

    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are supported.")

    file_id = str(uuid.uuid4())
    save_path = UPLOADS_DIR / f"{file_id}.pdf"

    try:
        with save_path.open("wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        result = get_engine().upload_pdf(str(save_path), file.filename)
        return {"success": True, "data": result}

    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception as exc:
        msg = str(exc)
        if "429" in msg or "quota" in msg.lower():
            raise HTTPException(
                status_code=429,
                detail=(
                    "Gemini API quota exceeded. Wait 1–2 minutes and try again. "
                    "If this keeps happening, check usage at https://ai.dev/rate-limit"
                ),
            ) from exc
        raise HTTPException(status_code=500, detail=f"Upload failed: {exc}") from exc
    finally:
        if save_path.exists():
            save_path.unlink()


@app.post("/api/ask")
async def ask_question(body: AskRequest):
    try:
        result = get_engine().ask(body.session_id, body.question)
        return {"success": True, "data": result}
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception as exc:
        msg = str(exc)
        if "429" in msg or "quota" in msg.lower():
            raise HTTPException(
                status_code=429,
                detail="Gemini API quota exceeded. Wait 1–2 minutes and try again.",
            ) from exc
        raise HTTPException(status_code=500, detail=f"Question failed: {exc}") from exc


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("app:app", host="0.0.0.0", port=8000, reload=True)
