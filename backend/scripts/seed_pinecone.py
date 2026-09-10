import os
import json
import logging
from dotenv import load_dotenv

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")
logger = logging.getLogger(__name__)

# Load env from conversation-service
load_dotenv(os.path.join(os.path.dirname(__file__), "../conversation-service/.env"))

CLINICAL_KNOWLEDGE_DOCUMENTS = [
    {
        "id": "cardiac-triage-protocol",
        "category": "cardiology",
        "title": "Emergency Cardiac Intake & SOCRATES Protocol",
        "content": "CARDIAC EMERGENCY TRIAGE: Red flags include acute substernal chest pain, heavy pressure or squeezing sensation, radiation to left shoulder, arm, neck, or jaw, accompanied by diaphoresis, dyspnea, or presyncope. SOCRATES Questions: Site (substernal), Onset (sudden vs gradual with physical exertion), Character (crushing/heavy pressure), Radiation (left arm, jaw), Associations (sweating, nausea), Timing (sustained > 20 mins indicates acute coronary syndrome), Exacerbation (worse with exertion), Severity (8-10). Emergency Action: Immediate triage red-flag alert, ECG within 10 minutes, direct transfer to Emergency Bay.",
    },
    {
        "id": "respiratory-triage-protocol",
        "category": "pulmonology",
        "title": "Respiratory Distress & Asthma Intake Protocol",
        "content": "RESPIRATORY EMERGENCY TRIAGE: Red flags include inability to complete full sentences in one breath, accessory muscle use, central cyanosis, stridor, altered mental status, SpO2 < 92%. SOCRATES Questions: Onset (acute allergic airway obstruction vs gradual pulmonary infection), Character (tightness in chest, wheezing sound, inability to catch breath), Associations (productive cough, hemoptysis, fever, leg swelling PE risk). Emergency Action: High-flow oxygenation, nebulization readiness, urgent physician review.",
    },
    {
        "id": "neuro-stroke-protocol",
        "category": "neurology",
        "title": "Acute Neurological & FAST Stroke Protocol",
        "content": "NEUROLOGICAL EMERGENCY TRIAGE: Screen for FAST stroke signs: Facial asymmetry/droop, Arm weakness/drift, Speech slurring/aphasia, Time of onset. Thunderclap headache (sudden peak within 1 minute) suggests subarachnoid hemorrhage (SAH). Emergency Action: Urgent CT head scan, immediate emergency stroke alert.",
    },
    {
        "id": "ayush-dashavidha-protocol",
        "category": "ayush",
        "title": "AYUSH Dashavidha Pariksha Clinical Framework",
        "content": "AYUSH DASHAVIDHA PARIKSHA (10-FOLD CLINICAL EXAMINATION): 1. Dushya: Examination of affected tissues (Dhatus) and humors (Doshas). 2. Desha: Geographical habitat and anatomical site of disease. 3. Bala: Patient's physical strength and immunity (Ojas). 4. Kala: Seasonal variation and diurnal time of symptom onset. 5. Anala: Digestive fire capacity (Agni: Manda, Tikshna, Vishama, Sama). 6. Prakriti: Baseline dosha constitution (Vata, Pitta, Kapha). 7. Vaya: Age group classification (Bala, Madhya, Vriddha). 8. Satmya: Environmental and dietary habituation. 9. Sattva: Psychological strength and mental resilience. 10. Ahara: Food intake capacity and metabolic power.",
    },
    {
        "id": "gastro-abdominal-protocol",
        "category": "gastroenterology",
        "title": "Acute Abdominal Pain & GI Bleed Protocol",
        "content": "GASTROENTEROLOGY TRIAGE: Evaluate site (epigastric, RUQ, RLQ appendicitis), onset (sudden perforation vs colicky), character (burning ulcer vs cramping bowel), radiation (back for pancreatitis), associations (vomiting blood/hematemesis, melena, jaundice, fever). Red flags: rigid abdomen, hematemesis, hemodynamic instability.",
    },
    {
        "id": "pediatric-fever-protocol",
        "category": "pediatrics",
        "title": "Pediatric Acute Fever & Seizure Risk",
        "content": "PEDIATRIC TRIAGE: High fever in children requires evaluation for febrile seizures, lethargy, poor feeding, neck stiffness (meningitis), rash (petechiae/purpura). Ask onset duration, hydration status (wet diapers), activity level.",
    }
]


def seed_pinecone():
    gemini_key = os.getenv("GEMINI_API_KEY")
    pinecone_key = os.getenv("PINECONE_API_KEY")
    index_name = os.getenv("PINECONE_INDEX_NAME", "sih")

    if not gemini_key or not pinecone_key:
        logger.warning("Missing GEMINI_API_KEY or PINECONE_API_KEY. Skipping live Pinecone indexing.")
        return

    try:
        from google import genai
        from pinecone import Pinecone

        gemini_client = genai.Client(api_key=gemini_key)
        pc = Pinecone(api_key=pinecone_key)

        index = pc.Index(index_name)
        logger.info(f"Indexing {len(CLINICAL_KNOWLEDGE_DOCUMENTS)} clinical protocols into Pinecone index '{index_name}'...")

        vectors = []
        for doc in CLINICAL_KNOWLEDGE_DOCUMENTS:
            res = gemini_client.models.embed_content(
                model="models/gemini-embedding-001",
                contents=doc["content"],
            )
            vals = res.embeddings[0].values[:1024]
            mag = sum(x*x for x in vals) ** 0.5
            norm_vec = [x/mag for x in vals]

            vectors.append({
                "id": doc["id"],
                "values": norm_vec,
                "metadata": {
                    "category": doc["category"],
                    "title": doc["title"],
                    "content": doc["content"],
                }
            })

        index.upsert(vectors=vectors, namespace="triage-kb")
        logger.info(f"Successfully seeded {len(vectors)} clinical protocols into Pinecone 'sih' index under namespace 'triage-kb'!")

    except Exception as e:
        logger.error(f"Error seeding Pinecone: {e}")


if __name__ == "__main__":
    seed_pinecone()
