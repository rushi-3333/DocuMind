from rag_pipeline import RAGPipeline


class PDFEngine:
    """Orchestrates PDF upload indexing and question answering."""

    def __init__(self):
        self.pipeline = RAGPipeline()

    def upload_pdf(self, file_path: str, file_name: str) -> dict:
        return self.pipeline.process_pdf(file_path, file_name)

    def ask(self, session_id: str, question: str) -> dict:
        return self.pipeline.answer_question(session_id, question)
