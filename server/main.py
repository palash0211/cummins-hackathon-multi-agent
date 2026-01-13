from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from routes.api import router
import os
import uvicorn

load_dotenv()

app = FastAPI(title="Engine Health Monitor API")

# Enable CORS for all origins (simplified for development/streaming)
# For production, specify exact domains like: ["https://yourdomain.com"]
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins for streaming
    allow_credentials=False,  # EventSource doesn't support credentials with *
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
)

app.include_router(router, prefix="/api")

@app.get("/")
async def root():
    return {"message": "Engine Health Monitor API is running"}

if __name__ == "__main__":
    port = int(os.getenv("PORT", 8000))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=True)