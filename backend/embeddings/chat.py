from typing import Any

from llama_index.llms.ollama import Ollama

llm = Ollama(
    model="llama3.1:8b",
    request_timeout=300.0,
)


def answer_with_context(query: str, chunks: list[dict[str, Any]]) -> str:
    context = "\n\n---\n\n".join(
        f"Source: {chunk['metadata'].get('file_name')}\n\n{chunk['text']}"
        for chunk in chunks
    )

    prompt = f"""
You are a helpful assistant answering questions using the user's Obsidian notes.

Use only the context below. If the answer is not in the context, say you don't know based on the notes.

Context:
{context}

Question:
{query}

Answer:
"""

    response = llm.complete(prompt)
    return str(response)
