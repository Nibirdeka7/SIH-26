# Detailed User Journeys

## 1. Patient Journey (Mobile App - React Native)

- **Step 1: Onboarding & Consent**
  - User downloads app.
  - Selects language (10+ Indian languages).
  - Logs in via ABHA ID / Aadhaar OTP (or registers as temporary guest).
  - Listens to audio-guided privacy policy.
  - Grants granular consent.

- **Step 2: Adaptive History Intake**
  - **Chief Complaint**: User speaks (e.g., "Chest pain") or taps on body-map icons.
  - **Dynamic Branching**: AI runs the **SOCRATES** framework. If pain is cardiac, it branches to cardiac ROS; if muscular, it skips cardiac questions.
  - **AYUSH Mode**: If toggled, AI asks the 10-point Dashavidha Pariksha (Prakriti, Vikriti, Agni, etc.).

- **Step 3: Document Digitization**
  - User clicks "Scan Documents" → Camera opens.
  - Takes photos of old prescriptions / lab reports.
  - AI performs OCR and extracts key values.
  - User confirms extracted text (editable).
  - System auto-highlights abnormal lab values.

- **Step 4: Summary Generation**
  - AI synthesizes voice history + documents.
  - Generates bilingual (Local Language + English) summary.
  - User listens to a voice recap for final confirmation.

- **Step 5: Submission**
  - User hits "Submit" → Data pushes to HIS.
  - Session data is wiped from the phone.
  - User receives a QR-code ticket for the queue.

---

## 2. Physician Journey (Web Dashboard - React)

- **Step 1: Queue View**
  - Doctor logs in.
  - Sees a live patient queue with "History Ready" status.

- **Step 2: Pre-Consult Review**
  - Doctor clicks a patient.
  - Opens the **Structured Summary Dashboard**:
    - **Left Panel**: HPI (SOCRATES) + Past History.
    - **Right Panel**: Timelined lab reports (with red flags for critical values).
    - **Top Banner**: Red-alert banner if AI detected emergency symptoms.

- **Step 3: Consultation**
  - Doctor reviews the entire case in under 30 seconds.
  - Conducts physical examination (hands-on).
  - Edits the AI-generated draft if needed (adds clinical notes).
  - Confirms the final diagnosis and treatment plan.

- **Step 4: Closure**
  - Saves the record.
  - Automatically syncs to the patient's ABHA Personal Health Record via FHIR.
