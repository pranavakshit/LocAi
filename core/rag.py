import os
import chromadb
from pypdf import PdfReader
from docx import Document

class RAGManager:
    def __init__(self, db_path="local_rag_db"):
        self.db_path = db_path
        self.client = chromadb.PersistentClient(path=self.db_path)
        self.collection = self.client.get_or_create_collection(name="locai_docs")

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

    def add_document(self, file_path):
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
        
        self.collection.add(
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

    def query(self, query_text, n_results=3):
        # Prevent querying empty DB
        if self.collection.count() == 0:
            return []
            
        results = self.collection.query(
            query_texts=[query_text],
            n_results=n_results
        )
        
        if not results['documents'] or not results['documents'][0]:
            return []
            
        return results['documents'][0]
