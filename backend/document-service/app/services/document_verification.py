from dataclasses import dataclass

from app.schemas.document import DocumentType

DOCUMENT_TYPE_SIGNALS = {
    DocumentType.PRESCRIPTION: {
        "prescription": 5,
        "rx": 4,
        "prescribed": 4,
        "dosage": 3,
        "dose": 3,
        "frequency": 2,
        "tablet": 2,
        "capsule": 2,
    },
    DocumentType.LAB_REPORT: {
        "laboratory": 5,
        "lab report": 5,
        "reference range": 5,
        "specimen": 4,
        "hemoglobin": 3,
        "blood test": 3,
        "test result": 3,
        "units": 2,
    },
    DocumentType.DISCHARGE_SUMMARY: {
        "discharge summary": 6,
        "discharge date": 5,
        "admission date": 4,
        "hospital course": 5,
        "discharge instructions": 5,
        "condition at discharge": 5,
        "follow-up": 2,
    },
    DocumentType.RADIOLOGY_REPORT: {
        "radiology": 5,
        "x-ray": 5,
        "xray": 5,
        "mri": 5,
        "ct scan": 5,
        "computed tomography": 5,
        "ultrasound": 5,
        "impression": 3,
        "technique": 2,
        "radiologist": 4,
    },
}



@dataclass(frozen=True)
class VerificationResult:
    is_medical_document: bool
    document_type: DocumentType
    confidence: float
    reason: str | None = None


class DocumentVerificationService:
    """
    Determines whether a technically valid document is a medical document
    and identifies its broad document category.
    """

    def verify_text(self, text: str) -> VerificationResult:
        if not text or not text.strip():
            return VerificationResult(
                is_medical_document=False,
                document_type=DocumentType.UNKNOWN,
                confidence=0.0,
                reason="Document contains no readable text.",
            )

        normalized_text = " ".join(text.lower().split())

        document_type, confidence = self._classify_document_type(
            normalized_text
        )

        if document_type == DocumentType.UNKNOWN:
            return VerificationResult(
                is_medical_document=False,
                document_type=DocumentType.UNKNOWN,
                confidence=confidence,
                reason=(
                    "Document could not be confidently identified "
                    "as a supported medical document."
                ),
            )

        return VerificationResult(
            is_medical_document=True,
            document_type=document_type,
            confidence=confidence,
        )

    @staticmethod
    def _classify_document_type(
        text: str,
    ) -> tuple[DocumentType, float]:
        scores: dict[DocumentType, int] = {
            document_type: 0
            for document_type in DOCUMENT_TYPE_SIGNALS
        }

        for document_type, signals in DOCUMENT_TYPE_SIGNALS.items():
            for keyword, weight in signals.items():
                if keyword in text:
                    scores[document_type] += weight

        ranked = sorted(
            scores.items(),
            key=lambda item: item[1],
            reverse=True,
        )

        best_type, best_score = ranked[0]

        if best_score == 0:
            return DocumentType.UNKNOWN, 0.0

        second_score = ranked[1][1]

        # Require a meaningful score and separation
        # from the second-best classification.
        if best_score < 5:
            return DocumentType.UNKNOWN, 0.0

        if best_score == second_score:
            return DocumentType.UNKNOWN, 0.0

        confidence = min(
            best_score / (best_score + second_score + 1),
            0.99,
        )

        return best_type, confidence