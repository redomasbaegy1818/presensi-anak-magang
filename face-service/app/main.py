from fastapi import FastAPI

app = FastAPI(
    title="Magang Presensi Face Service",
    docs_url=None,
    redoc_url=None,
    openapi_url=None,
)


@app.get("/health")
def health():
    return {
        "status": "ok",
        "service": "magang-presensi-face-service",
        "scrfdConfigured": False,
        "recognitionConfigured": False,
    }
