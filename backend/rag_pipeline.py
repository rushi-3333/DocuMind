import os
import json
import re
import time
import uuid
from pathlib import Path

import numpy as np
from dotenv import load_dotenv
from pypdf import PdfReader
from qdrant_client import QdrantClient
from qdrant_client.models import Distance, PointStruct, VectorParams
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_google_genai import GoogleGenerativeAIEmbeddings, ChatGoogleGenerativeAI

from prompts import QA_SYSTEM_PROMPT, QA_USER_PROMPT, TOPIC_EXTRACTION_PROMPT

load_dotenv(Path(__file__).parent / ".env")

VECTORSTORE_PATH = Path(__file__).parent / "vectorstore"
COLLECTION_PREFIX = "pdf_chunks"
CHUNK_SIZE = 400
CHUNK_OVERLAP = 40
MAX_PDF_PAGES = 50
MAX_PDF_CHARS = 120_000
EMBEDDING_MODEL = os.getenv("GEMINI_EMBEDDING_MODEL", "models/gemini-embedding-001")
LLM_MODEL = os.getenv("GEMINI_LLM_MODEL", "gemini-2.5-flash-lite")


class RAGPipeline:
    def __init__(self):
        api_key = os.getenv("GOOGLE_API_KEY")
        if not api_key or api_key == "your_gemini_api_key_here":
            raise ValueError(
                "GOOGLE_API_KEY is missing. Copy .env.example to .env and add your Gemini API key."
            )

        self.embeddings = GoogleGenerativeAIEmbeddings(
            model=EMBEDDING_MODEL,
            google_api_key=api_key,
        )
        self.llm = ChatGoogleGenerativeAI(
            model=LLM_MODEL,
            google_api_key=api_key,
            temperature=0.1,
        )
        self.text_splitter = RecursiveCharacterTextSplitter(
            chunk_size=CHUNK_SIZE,
            chunk_overlap=CHUNK_OVERLAP,
            separators=["\n\n", "\n", ". ", " ", ""],
        )
        VECTORSTORE_PATH.mkdir(parents=True, exist_ok=True)
        self.qdrant = QdrantClient(path=str(VECTORSTORE_PATH))
        self.sessions: dict[str, dict] = {}

    def extract_text_from_pdf(self, file_path: str) -> tuple[str, list[str], int]:
        reader = PdfReader(file_path)
        page_count = len(reader.pages)

        if page_count > MAX_PDF_PAGES:
            raise ValueError(
                f"PDF has {page_count} pages. This app supports PDFs up to {MAX_PDF_PAGES} pages."
            )

        pages = []
        for page in reader.pages:
            text = page.extract_text()
            pages.append(text.strip() if text else "")

        full_text = "\n\n".join(pages).strip()
        if not full_text:
            raise ValueError("Could not extract text from PDF. The file may be scanned or image-based.")

        if len(full_text) > MAX_PDF_CHARS:
            raise ValueError(
                f"PDF text is too long ({len(full_text):,} characters). "
                f"Maximum supported is {MAX_PDF_CHARS:,} characters."
            )

        return full_text, pages, page_count

    def chunk_text(self, text: str) -> list[str]:
        return self.text_splitter.split_text(text)

    def _ensure_collection(self, vector_size: int, session_id: str) -> str:
        collection = f"{COLLECTION_PREFIX}_{session_id}"
        if not self.qdrant.collection_exists(collection):
            self.qdrant.create_collection(
                collection_name=collection,
                vectors_config=VectorParams(size=vector_size, distance=Distance.COSINE),
            )
        return collection

    def embed_and_store(self, chunks: list[str], session_id: str) -> str:
        vectors = self.embeddings.embed_documents(chunks)
        if not vectors:
            raise ValueError("Failed to generate embeddings.")

        vector_size = len(vectors[0])
        collection = self._ensure_collection(vector_size, session_id)

        points = [
            PointStruct(
                id=str(uuid.uuid4()),
                vector=vector,
                payload={"text": chunk, "index": idx},
            )
            for idx, (chunk, vector) in enumerate(zip(chunks, vectors))
        ]

        self.qdrant.upsert(collection_name=collection, points=points)
        return collection

    def retrieve(self, collection: str, query: str, top_k: int = 4) -> list[dict]:
        query_vector = self.embeddings.embed_query(query)
        results = self.qdrant.query_points(
            collection_name=collection,
            query=query_vector,
            limit=top_k,
        )
        return [
            {
                "text": point.payload["text"],
                "score": round(point.score, 4),
                "index": point.payload.get("index", 0),
            }
            for point in results.points
        ]

    def _invoke_llm_with_retry(self, prompt: str, max_retries: int = 3) -> str:
        last_error = None
        for attempt in range(max_retries):
            try:
                response = self.llm.invoke(prompt)
                return response.content if hasattr(response, "content") else str(response)
            except Exception as exc:
                last_error = exc
                error_text = str(exc)
                if "429" not in error_text and "quota" not in error_text.lower():
                    raise
                if attempt < max_retries - 1:
                    time.sleep(35 * (attempt + 1))
                    continue
                raise ValueError(
                    "Gemini API quota exceeded. Wait 1–2 minutes and try again."
                ) from exc
        raise last_error

    def _parse_json_response(self, content: str) -> dict:
        content = content.strip()
        if content.startswith("```"):
            content = re.sub(r"^```(?:json)?\n?", "", content)
            content = re.sub(r"\n?```$", "", content)

        try:
            return json.loads(content)
        except json.JSONDecodeError:
            match = re.search(r"\{.*\}", content, re.DOTALL)
            if match:
                return json.loads(match.group())
            return {"topics": []}

    def extract_topics(self, text: str) -> list[dict]:
        excerpt = text[:3000]
        prompt = TOPIC_EXTRACTION_PROMPT.format(excerpt=excerpt)
        content = self._invoke_llm_with_retry(prompt)
        result = self._parse_json_response(content)
        topics = result.get("topics", [])
        return [
            {"name": t.get("name", "Topic"), "weight": min(100, max(1, int(t.get("weight", 50))))}
            for t in topics[:6]
        ]

    def build_page_stats(self, pages: list[str]) -> list[dict]:
        return [
            {
                "page": idx + 1,
                "words": len(page.split()) if page else 0,
                "chars": len(page),
            }
            for idx, page in enumerate(pages)
        ]

    def process_pdf(self, file_path: str, file_name: str) -> dict:
        session_id = str(uuid.uuid4())[:8]
        full_text, pages, page_count = self.extract_text_from_pdf(file_path)
        chunks = self.chunk_text(full_text)
        collection = self.embed_and_store(chunks, session_id)
        topics = self.extract_topics(full_text)
        page_stats = self.build_page_stats(pages)
        word_count = len(full_text.split())

        self.sessions[session_id] = {
            "collection": collection,
            "file_name": file_name,
            "page_count": page_count,
            "word_count": word_count,
            "chunk_count": len(chunks),
        }

        return {
            "session_id": session_id,
            "file_name": file_name,
            "page_count": page_count,
            "word_count": word_count,
            "char_count": len(full_text),
            "chunk_count": len(chunks),
            "preview": full_text[:280] + ("..." if len(full_text) > 280 else ""),
            "topics": topics,
            "page_stats": page_stats,
        }

    def answer_question(self, session_id: str, question: str) -> dict:
        session = self.sessions.get(session_id)
        if not session:
            raise ValueError("Session expired or not found. Please upload the PDF again.")

        question = question.strip()
        if not question:
            raise ValueError("Please enter a question.")

        hits = self.retrieve(session["collection"], question, top_k=4)
        if not hits:
            return {
                "answer": "I could not find relevant information in the uploaded PDF.",
                "sources": [],
            }

        context = "\n\n---\n\n".join(
            f"[Chunk {h['index'] + 1}, relevance {h['score']:.2f}]\n{h['text']}"
            for h in hits
        )

        prompt = (
            QA_SYSTEM_PROMPT
            + "\n\n"
            + QA_USER_PROMPT.format(
                document_title=session["file_name"],
                retrieved_context=context,
                question=question,
            )
        )

        answer = self._invoke_llm_with_retry(prompt).strip()
        sources = [
            {
                "chunk": h["index"] + 1,
                "score": h["score"],
                "excerpt": h["text"][:160] + ("..." if len(h["text"]) > 160 else ""),
            }
            for h in hits
        ]

        return {"answer": answer, "sources": sources}
