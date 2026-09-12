import pytest
from fastapi.testclient import TestClient
from io import BytesIO
from PIL import Image
from unittest.mock import AsyncMock

from app.main import app
from app.schemas.document import DocumentType
from app.ai.agents.vision_extraction_agent import VisionAgentResult

client = TestClient(app)

def _sample_png() -> bytes:
    buf = BytesIO()
    Image.new("RGB", (20, 20), "white").save(buf, format="PNG")
    return buf.getvalue()

def test_health_endpoint():
    res = client.get("/api/v1/health")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "ok"

def test_get_documents_empty():
    res = client.get("/api/v1/documents?session_id=nonexistent_session")
    assert res.status_code == 200
    data = res.json()
    assert data["total_documents"] == 0
    assert data["documents"] == []

def test_upload_documents_mocked(monkeypatch):
    from app.api.v1.endpoints.documents import pipeline

    vision_mock = AsyncMock()
    vision_mock.analyze.return_value = VisionAgentResult(
        is_medical_document=True,
        document_type=DocumentType.PRESCRIPTION.value,
        data={
            "patient": {"name": "Aman Verma"},
            "medications": [{"name": "Azithromycin", "dose": "500mg"}],
            "diagnoses": [], "symptoms": [], "allergies": [], "vitals": [],
            "clinical_findings": [], "imaging_findings": [],
            "extraction_summary": {"needs_review": False, "review_reasons": []},
        },
        extraction_confidence=0.92,
        needs_review=False,
        review_reasons=[],
        attempts=1,
    )
    monkeypatch.setattr(pipeline, "_get_vision_agent", lambda: vision_mock)

    files = {"files": ("rx.png", _sample_png(), "image/png")}
    data = {"session_id": "mock_test_session"}
    res = client.post("/api/v1/documents", files=files, data=data)

    assert res.status_code == 200
    res_data = res.json()
    assert res_data["successful"] == 1
    assert res_data["failed"] == 0
    assert res_data["documents"][0]["filename"] == "rx.png"
    assert res_data["documents"][0]["status"] == "COMPLETED"

    get_res = client.get("/api/v1/documents?session_id=mock_test_session")
    assert get_res.status_code == 200
    docs = get_res.json()["documents"]
    assert len(docs) >= 1
