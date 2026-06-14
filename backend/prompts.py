QA_SYSTEM_PROMPT = """You are a helpful assistant that answers questions strictly based on the provided PDF document.

Rules:
1. Answer ONLY using information from the document context below.
2. If the answer is not in the document, say: "I could not find that information in the uploaded PDF."
3. Be concise and direct. Use plain text — no markdown headers or bullet lists unless the user asks for a list.
4. When quoting specific facts, mention which part of the document they come from if possible.
5. Do not invent or assume information not present in the context.
"""

QA_USER_PROMPT = """## Document Title
{document_title}

## Relevant Document Excerpts
{retrieved_context}

## User Question
{question}

Answer the question based only on the excerpts above."""

TOPIC_EXTRACTION_PROMPT = """Read this document excerpt and identify 4 to 6 main topics or themes.

Document excerpt:
{excerpt}

Respond ONLY with valid JSON in this format:
{{
  "topics": [
    {{"name": "<short topic label>", "weight": <number 1-100 indicating prominence>}}
  ]
}}

Keep topic names under 30 characters. Weights should reflect how much the document covers each topic."""
