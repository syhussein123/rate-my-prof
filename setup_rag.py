from dotenv import load_dotenv
load_dotenv()
from pinecone import Pinecone, ServerlessSpec
from openai import OpenAI
import google.generativeai as genai
import os
import json

# Initialize Pinecone
pc = Pinecone(api_key=os.getenv("PINECONE_API_KEY"))

genai.configure(api_key=os.getenv("GEMINI_API_KEY"))


# Create a Pinecone index
pc.create_index(
    name="rag",
    dimension=768,
    metric="cosine",
    spec=ServerlessSpec(cloud="aws", region="us-east-1"),
)

# Load the review data
data = json.load(open("reviews.json"))

processed_data = []
#client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
#hf_embeddings = HuggingFaceEmbeddings(model_name="sentence-transformers/all-MiniLM-L6-v2")

for review in data['reviews']:
    result = genai.embed_content(
        model="models/text-embedding-004",
        content=review['review'],
        task_type="retrieval_document",
        title="Embedding of single string")
    embeddings = result['embedding']
    
    processed_data.append({
        "values": embeddings,
        "id": review['professor'],
        "metadata":{
            'review': review['review'],
            'subject': review['subject'],
            'stars': review['stars'],
        }
    })

# Insert the embeddings into the Pinecone index
index = pc.Index("rag")
upsert_response = index.upsert(
    vectors=processed_data,
    namespace="ns1",
)
print(f"Upserted count: {upsert_response['upserted_count']}")

# Print index statistics
print(index.describe_index_stats())
