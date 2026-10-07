# HueViVu AI Service

Optional Python service boundary for AI/ML workloads.

- FastAPI owns RAG retrieval, YOLO/computer-vision inference, and other Python-native ML workloads.
- The Next.js app remains the business API and UI.
- Set AI_SERVICE_URL in the web app to enable calls through src/lib/ai/service.ts.
- Run locally with: uvicorn main:app --reload --port 8000

The endpoints are contract-first. No vector database or YOLO model is bundled yet, so the service is safe to deploy without an external ML stack.
