import json
from types import SimpleNamespace

import pytest

from app.ai.providers.vision.gemini_vision import (
    GeminiVisionProvider,
    VisionProviderError,
)
from app.ai.providers.gemini import GeminiProvider
from app.ai.providers.vision.prompts import (
    build_extraction_prompt,
    build_targeted_reextraction_prompt,
)


class _FakeAsyncModels:
    def __init__(self, response_text: str | None, raise_exc: Exception | None = None):
        self._response_text = response_text
        self._raise_exc = raise_exc
        self.last_call = None

    async def generate_content(self, *, model, contents):
        self.last_call = {"model": model, "contents": contents}
        if self._raise_exc:
            raise self._raise_exc
        return SimpleNamespace(text=self._response_text)


class _FakeAio:
    def __init__(self, models):
        self.models = models


class _FakeClient:
    def __init__(self, models):
        self.aio = _FakeAio(models)


def _make_provider(monkeypatch, response_text=None, raise_exc=None, api_key="test-key"):
    monkeypatch.setattr(
        "app.ai.providers.vision.gemini_vision.settings.GEMINI_API_KEY", api_key
    )
    monkeypatch.setattr(
        "app.ai.providers.vision.gemini_vision.settings.GEMINI_VISION_MODEL", "gemini-vision-test"
    )

    provider = GeminiVisionProvider()
    provider.client = _FakeClient(_FakeAsyncModels(response_text, raise_exc))
    return provider


def test_missing_api_key_raises_on_construction(monkeypatch):
    monkeypatch.setattr(
        "app.ai.providers.vision.gemini_vision.settings.GEMINI_API_KEY", None
    )

    with pytest.raises(ValueError):
        GeminiVisionProvider()


@pytest.mark.asyncio
async def test_inspect_parses_valid_json(monkeypatch):
    payload = {
        "is_medical_document": True,
        "likely_document_type": "PRESCRIPTION",
        "document_form": "HANDWRITTEN",
        "image_quality_sufficient": True,
        "has_tables_or_forms": False,
        "ambiguous_regions": [],
        "type_contradiction": None,
        "notes": None,
    }
    provider = _make_provider(monkeypatch, response_text=json.dumps(payload))

    result = await provider.inspect(image_data=b"fake-bytes", mime_type="image/png")

    assert result["is_medical_document"] is True
    assert result["likely_document_type"] == "PRESCRIPTION"

    # The original image bytes must reach the model call, not derived text.
    call = provider.client.aio.models.last_call
    assert call["model"] == "gemini-vision-test"


@pytest.mark.asyncio
async def test_extract_strips_markdown_fences(monkeypatch):
    payload = {"patient": {"name": "Jane Doe"}, "medications": []}
    fenced = "```json\n" + json.dumps(payload) + "\n```"
    provider = _make_provider(monkeypatch, response_text=fenced)

    result = await provider.extract(
        image_data=b"fake-bytes",
        mime_type="image/png",
        document_type="PRESCRIPTION",
        inspection={"likely_document_type": "PRESCRIPTION"},
    )

    assert result["patient"]["name"] == "Jane Doe"


@pytest.mark.asyncio
async def test_empty_image_data_rejected(monkeypatch):
    provider = _make_provider(monkeypatch, response_text="{}")

    with pytest.raises(VisionProviderError):
        await provider.inspect(image_data=b"", mime_type="image/png")


@pytest.mark.asyncio
async def test_empty_model_response_raises(monkeypatch):
    provider = _make_provider(monkeypatch, response_text="   ")

    with pytest.raises(VisionProviderError):
        await provider.inspect(image_data=b"fake-bytes", mime_type="image/png")


@pytest.mark.asyncio
async def test_malformed_json_raises(monkeypatch):
    provider = _make_provider(monkeypatch, response_text="not valid json{{{")

    with pytest.raises(VisionProviderError):
        await provider.extract(
            image_data=b"fake-bytes",
            mime_type="image/png",
            document_type="PRESCRIPTION",
            inspection={},
        )


@pytest.mark.asyncio
async def test_api_failure_becomes_provider_error(monkeypatch):
    provider = _make_provider(monkeypatch, raise_exc=RuntimeError("rate limited"))

    with pytest.raises(VisionProviderError):
        await provider.inspect(image_data=b"fake-bytes", mime_type="image/png")


@pytest.mark.asyncio
async def test_targeted_reextract_builds_review_prompt(monkeypatch):
    payload = {"medications": [{"name": "Metformin"}]}
    provider = _make_provider(monkeypatch, response_text=json.dumps(payload))

    await provider.targeted_reextract(
        image_data=b"fake-bytes",
        mime_type="image/png",
        document_type="PRESCRIPTION",
        review_issues=[{"field_path": "medications[0].name", "reason": "low confidence"}],
        previous_data={"medications": [{"name": None}]},
    )

    call = provider.client.aio.models.last_call
    prompt_text = call["contents"][1]
    assert "medications[0].name" in prompt_text
    assert "low confidence" in prompt_text


@pytest.mark.asyncio
async def test_extract_normalizes_invalid_verification_statuses_before_shared_guardrail(monkeypatch):
    payload = {
        "symptoms": [
            {
                "name": "Cough",
                "evidence": "Cough",
                "confidence": {
                    "extraction_confidence": 0.95,
                    "evidence_support": "explicit",
                    "verification_status": "VERIFIED",
                },
            }
        ],
        "medications": [
            {
                "name": "Metformin",
                "evidence": "Metf... 500 mg",
                "confidence": {
                    "extraction_confidence": 0.35,
                    "evidence_support": "illegible_handwriting",
                    "verification_status": "FULLY_VERIFIED",
                },
            }
        ],
    }
    provider = _make_provider(monkeypatch, response_text=json.dumps(payload))
    seen_by_guardrail = []

    def assert_canonical_statuses(data):
        seen_by_guardrail.extend(
            item["confidence"]["verification_status"]
            for collection in ("symptoms", "medications")
            for item in data[collection]
        )
        assert seen_by_guardrail == [
            "not_independently_verified",
            "needs_review",
        ]

    monkeypatch.setattr(GeminiProvider, "_validate_contract", assert_canonical_statuses)

    result = await provider.extract(
        image_data=b"fake-bytes",
        mime_type="image/png",
        document_type="PRESCRIPTION",
        inspection={},
    )

    assert result["symptoms"][0]["confidence"]["verification_status"] == "not_independently_verified"
    assert result["medications"][0]["confidence"]["verification_status"] == "needs_review"


def test_vision_prompts_specify_mapper_primitive_entity_fields():
    inspection = {"document_form": "HANDWRITTEN", "image_quality_sufficient": True}
    prompts = (
        build_extraction_prompt(document_type="PRESCRIPTION", inspection=inspection),
        build_targeted_reextraction_prompt(
            document_type="PRESCRIPTION",
            review_issues=[],
            previous_data={},
        ),
    )

    for prompt in prompts:
        assert "lab_results: test_name, value, unit" in prompt
        assert "diagnoses: name, code, code_system" in prompt
        assert "medications: name, generic_name, strength" in prompt
        assert 'Never wrap an individual field in {"value", "evidence", "verification"}' in prompt
        assert "FULLY_VERIFIED" in prompt
