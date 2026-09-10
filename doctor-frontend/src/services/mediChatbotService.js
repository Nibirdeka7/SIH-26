// Medi AI Chatbot Service with Google Gemini Flash model support
// Reads API key from localStorage or Vite environment variable.
// Provides intelligent clinical fallback when API key is not yet configured.

const GEMINI_MODEL = 'gemini-1.5-flash';

export const mediChatbotService = {
  getApiKey() {
    return (
      localStorage.getItem('gemini_api_key') ||
      import.meta.env.VITE_GEMINI_API_KEY ||
      ''
    );
  },

  setApiKey(key) {
    if (!key) {
      localStorage.removeItem('gemini_api_key');
    } else {
      localStorage.setItem('gemini_api_key', key.trim());
    }
  },

  async askChatbot({ message, patientContext = null, chatHistory = [] }) {
    const apiKey = this.getApiKey();

    if (apiKey) {
      try {
        const systemPrompt = `You are Medi AI, an expert clinical AI co-pilot powered by ${GEMINI_MODEL} for licensed physicians in an outpatient/hospital setting. 
Provide concise, clinically rigorous, and evidence-based guidance.
Cover pharmacology (indications, contraindications, dosages, interactions), symptom differential diagnosis, and patient report interpretations.
Keep replies structured using markdown with bullet points when listing differential diagnoses or medications.
${
  patientContext
    ? `\nCURRENT PATIENT CONTEXT:\n- Patient: ${patientContext.name || 'Unknown'} (${patientContext.age || '—'} yrs, ${patientContext.gender || '—'})\n- Reason / Complaint: ${patientContext.reason || '—'}\n- Reports / Findings: ${JSON.stringify(patientContext.reports || [])}\n- Active Prescriptions: ${JSON.stringify(patientContext.prescriptions || [])}`
    : ''
}`;

        const contents = [];

        // Add previous chat history (user / model turns)
        chatHistory.slice(-6).forEach((turn) => {
          contents.push({
            role: turn.sender === 'doctor' ? 'user' : 'model',
            parts: [{ text: turn.text }],
          });
        });

        // Add current user prompt with system context
        contents.push({
          role: 'user',
          parts: [{ text: `${systemPrompt}\n\nDOCTOR QUERY: ${message}` }],
        });

        const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`;

        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents,
            generationConfig: {
              temperature: 0.25,
              maxOutputTokens: 900,
            },
          }),
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData?.error?.message || `Gemini API error (Status ${res.status})`);
        }

        const data = await res.json();
        const replyText =
          data?.candidates?.[0]?.content?.parts?.[0]?.text ||
          'No output generated from Gemini Flash.';

        return {
          reply: replyText,
          source: 'gemini_flash_live',
        };
      } catch (err) {
        console.warn('[MediChatbot] Gemini live call failed, falling back to clinical responder:', err);
        return {
          reply: `${this.generateClinicalFallback(message, patientContext)}\n\n*(Note: Gemini live request failed: ${err.message}. Using built-in clinical fallback. Verify your API key.)*`,
          source: 'fallback',
        };
      }
    }

    // When API Key is not yet added
    await new Promise((r) => setTimeout(r, 650)); // simulate brief natural typing delay
    return {
      reply: this.generateClinicalFallback(message, patientContext),
      source: 'mock_knowledge_base',
    };
  },

  generateClinicalFallback(query, patientContext) {
    const q = query.toLowerCase();

    // 1. Patient-specific context queries
    if (patientContext && (q.includes('this patient') || q.includes('report') || q.includes('summary') || q.includes('symptom') || q.includes('patient'))) {
      const pName = patientContext.name || 'the patient';
      const reason = patientContext.reason || 'presenting symptoms';
      return `### 📋 Clinical Summary for ${pName}

- **Demographics:** ${patientContext.age || '—'} yrs, ${patientContext.gender === 'M' ? 'Male' : 'Female'}
- **Chief Complaint:** ${reason}
- **Assessment:** Patient is under evaluation for ${reason}. Clinical observations indicate correlation with pre-consult interview records.
- **Recommended Next Steps:**
  1. Correlate with recent laboratory investigations (CBC, Metabolic Panel).
  2. Rule out contraindications before initiating NSAIDs or beta-blockers.
  3. Verify vitals during physical examination.`;
    }

    // 2. Pharmacology / Medicine queries
    if (q.includes('metformin') || q.includes('diabetes') || q.includes('sugar')) {
      return `### 💊 Metformin Pharmacology & Interactions

- **Class:** Biguanide antihyperglycemic.
- **First-Line Indication:** Type 2 Diabetes Mellitus.
- **Key Contraindications:**
  - Severe renal impairment (eGFR < 30 mL/min/1.73 m²).
  - Acute or chronic metabolic acidosis (including diabetic ketoacidosis).
- **Notable Interactions:**
  - **Iodinated Radiopaque Contrast Media:** Discontinue at or before the imaging procedure and withhold for 48 hours to avoid lactic acidosis risk.
  - **Alcohol:** Potentiates effect of metformin on lactate metabolism.
- **Dosage Guidance:** Start 500 mg PO QD or BID with meals; titrate gradually up to max 2000–2550 mg/day in divided doses.`;
    }

    if (q.includes('chest pain') || q.includes('cardiac') || q.includes('angina') || q.includes('heart')) {
      return `### 🫀 Acute Chest Pain Differential Diagnosis & Triage

- **Primary Emergencies to Rule Out:**
  1. **Acute Coronary Syndrome (ACS):** Unstable Angina, NSTEMI, STEMI.
  2. **Aortic Dissection:** Tearing pain radiating to back, pulse asymmetry.
  3. **Pulmonary Embolism (PE):** Pleuritic pain, dyspnea, tachycardia (check Wells score).
  4. **Tension Pneumothorax:** Unilateral absent breath sounds, tracheal deviation.
- **Immediate Diagnostic Protocol:**
  - 12-Lead ECG within 10 minutes.
  - High-sensitivity Troponin-I / T.
  - Continuous cardiac monitoring and supplemental O2 if SaO2 < 90%.`;
    }

    if (q.includes('antibiotic') || q.includes('fever') || q.includes('cough') || q.includes('pharyngitis')) {
      return `### 🩺 Upper Respiratory & Pharyngitis Clinical Protocol

- **Centor Criteria Assessment:** Evaluate for absence of cough, tonsillar exudates, tender anterior cervical lymphadenopathy, fever > 38°C.
- **Viral vs. Bacterial:** Viral etiology (Rhinovirus, Adenovirus) accounts for >70% of adult cases; routine empirical antibiotics discouraged without positive rapid antigen / culture.
- **First-line if Group A Strep Confirmed:**
  - **Amoxicillin:** 500 mg PO BID or 1000 mg PO QD for 10 days.
  - **Penicillin-Allergic:** Azithromycin 500 mg Day 1, then 250 mg Days 2–5, or Cephalexin (if non-anaphylactic allergy).`;
    }

    if (q.includes('hypertension') || q.includes('bp') || q.includes('pressure')) {
      return `### 🩺 Hypertension Management Guidelines

- **First-Line Monotherapy Options:**
  - **ACEi / ARB:** Enalapril, Ramipril, or Telmisartan (preferred in diabetic nephropathy).
  - **Calcium Channel Blocker (CCB):** Amlodipine 5–10 mg QD.
  - **Thiazide-like Diuretic:** Chlorthalidone 12.5–25 mg QD.
- **Blood Pressure Target:** < 130/80 mmHg for most adult patients with confirmed hypertension.
- **Monitoring:** Check serum creatinine and potassium 2–4 weeks after initiating ACEi/ARB therapy.`;
    }

    // Default medical guidance reply
    return `### 🩺 Medi AI Clinical Response

**Analysis for:** "${query}"

- **Clinical Perspective:** Evidence-based clinical guidelines recommend evaluating patient age, renal clearance (eGFR), and drug allergy profile before initiating treatment.
- **Diagnostic Considerations:**
  - Review baseline laboratory biomarkers (complete blood count, metabolic profile).
  - Cross-check potential cytochrome P450 interactions with existing prescriptions.
- **Patient Safety Alert:** Monitor for acute adverse reactions or hypersensitivity during the initial 48 hours of pharmacotherapy.

*(You can set your Gemini Flash API key in the top settings of this chatbot panel for live Gemini inference.)*`;
  },
};

