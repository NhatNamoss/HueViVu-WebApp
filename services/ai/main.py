from fastapi import FastAPI
from pydantic import BaseModel

app = FastAPI(title="HueViVu AI Service", version="1.0.0")

class RagSearchRequest(BaseModel):
    query: str
    top_k: int = 5

class VisionRequest(BaseModel):
    image_base64: str
    prompt: str = "Đây là gì?"

@app.get("/health")
def health():
    return {"status": "ok", "service": "huevivu-ai"}

@app.post("/v1/rag/search")
def rag_search(request: RagSearchRequest):
    return {"items": [], "query": request.query, "top_k": request.top_k}

@app.post("/v1/vision/detect")
def vision_detect(request: VisionRequest):
    return {"detections": [], "prompt": request.prompt}
