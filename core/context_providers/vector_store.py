import os
import chromadb
from pypdf import PdfReader
from docx import Document
from core.context import ContextProvider

class VectorStoreContextProvider(ContextProvider):
    """
    Provides context by performing a semantic search over a local ChromaDB instance.
    (Evolution of the old RAGManager).
    """
    def __init__(self, db_path="local_rag_db"):
        # We will use the new userdata/ location for the db_path
        _user_profile = os.environ.get("USERPROFILE", os.path.expanduser("~"))
        self.db_path = os.path.join(_user_profile, "LocAi", "userdata", "local_rag_db")
        self.client = chromadb.PersistentClient(path=self.db_path)
        # We don't initialize a single collection anymore, we get it dynamically
        self.default_collection = self.client.get_or_create_collection(name="locai_docs")

    def get_collection(self, project_id: str = None):
        if not project_id:
            return self.default_collection
        # ChromaDB collection names must be valid alphanumeric
        safe_id = "".join(c if c.isalnum() else "_" for c in project_id)
        return self.client.get_or_create_collection(name=f"project_{safe_id}")

    def read_pdf(self, file_path):
        text = ""
        try:
            reader = PdfReader(file_path)
            for page in reader.pages:
                extracted = page.extract_text()
                if extracted:
                    text += extracted + "\n"
        except Exception as e:
            print(f"Error reading PDF: {e}")
        return text

    def read_docx(self, file_path):
        text = ""
        try:
            doc = Document(file_path)
            for para in doc.paragraphs:
                text += para.text + "\n"
        except Exception as e:
            print(f"Error reading DOCX: {e}")
        return text

    def read_txt(self, file_path):
        try:
            with open(file_path, "r", encoding="utf-8") as f:
                return f.read()
        except Exception as e:
            print(f"Error reading text file: {e}")
            return ""

    def add_document(self, file_path, project_id: str = None):
        if not os.path.exists(file_path):
            raise FileNotFoundError(f"Could not find file: {file_path}")

        ext = os.path.splitext(file_path)[1].lower()
        if ext == ".pdf":
            text = self.read_pdf(file_path)
        elif ext in [".docx", ".doc"]:
            text = self.read_docx(file_path)
        elif ext in [".txt", ".md", ".csv", ".json", ".py", ".js", ".html", ".css"]:
            text = self.read_txt(file_path)
        else:
            raise ValueError(f"Unsupported file type: {ext}")

        if not text.strip():
            return 0

        # Simple overlap chunking
        chunks = self.chunk_text(text, chunk_size=1000, overlap=200)
        
        if not chunks:
            return 0
            
        # Add to ChromaDB
        ids = [f"{os.path.basename(file_path)}_{i}" for i in range(len(chunks))]
        metadatas = [{"source": file_path} for _ in chunks]
        
        collection = self.get_collection(project_id)
        collection.add(
            documents=chunks,
            metadatas=metadatas,
            ids=ids
        )
        return len(chunks)

    def chunk_text(self, text, chunk_size=1000, overlap=200):
        chunks = []
        start = 0
        while start < len(text):
            end = start + chunk_size
            chunks.append(text[start:end])
            start += chunk_size - overlap
        return chunks

    def get_context(self, query: str, project_id: str = None) -> list[str]:
        collection = self.get_collection(project_id)
        # Prevent querying empty DB
        if collection.count() == 0:
            return []
            
        results = collection.query(
            query_texts=[query],
            n_results=3
        )
        
        if not results['documents'] or not results['documents'][0]:
            return []
            
        return results['documents'][0]
