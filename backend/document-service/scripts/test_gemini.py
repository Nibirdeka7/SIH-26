import asyncio

from app.ai.providers.gemini import GeminiProvider


async def main() -> None:
    provider = GeminiProvider()

    result = await provider.analyze_document(
            document_type="LAB_REPORT",
            text="""
            Patient Name: Rahul Sharma
    
            Date: 12/08/2026
    
            Hemoglobin: 13.5 g/dL
            WBC: 7,800 cells/uL
            Platelet Count: 2.45 lakh/uL
            Fasting Blood Glucose: 112 mg/dL
    
            Diagnosis:
            Type 2 Diabetes Mellitus
    
            Medication:
            Metformin 500 mg tablet twice daily after meals.
            """,
        )

    print("\n--- Gemini Response ---")
    print(result["text"])
    print("\n--- Model ---")
    print(result["model"])


if __name__ == "__main__":
    asyncio.run(main())