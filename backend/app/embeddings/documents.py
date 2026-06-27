from llama_index.core import SimpleDirectoryReader
from llama_index.core.schema import Document


def load_documents_from_vault(path: str) -> list[Document]:
    return SimpleDirectoryReader(
        path,
        recursive=True,
        required_exts=[".md"],
    ).load_data()


def load_documents_from_paths(paths: list[str]) -> list[Document]:
    return SimpleDirectoryReader(
        input_files=[str(path) for path in paths],
        required_exts=[".md"],
    ).load_data()
