# Embeddings Folder

This folder contains indexing, retrieval, and LLM integration code.

Suggested split for this folder:

- `config.py` for embedding model, LLM, and Chroma path setup.
- `documents.py` for loading markdown files into documents.
- `chunking.py` for turning documents into chunked nodes.
- `store.py` for Chroma collection lookup and persistence helpers.
- `indexing.py` for index-building functions that combine prepared nodes with storage.
- `retriever.py` for loading an index and retrieving chunks.
- `responder.py` for generating answers from retrieved chunks.
- `pipeline.py` for explicit step-by-step helpers the service layer can orchestrate.

Put these kinds of items here:

- Chroma collection management.
- LlamaIndex setup.
- Document loading and chunk generation.
- Retrieval helpers.
- Response generation from retrieved context.

Avoid putting these here:

- Route definitions.
- Direct SQL queries.
- App-wide configuration that is unrelated to embeddings.
