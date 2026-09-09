/**
 * Utility module to normalize & extract structured OCR findings from FastAPI Document Service response.
 */

export function parseDocExtraction(doc) {
  if (!doc) {
    return {
      medications: [],
      diagnoses: [],
      labResults: [],
      vitals: [],
      notes: [],
      provider: null,
      patient: null,
      rawText: '',
      confidence: 0,
      documentType: 'UNKNOWN',
      status: 'UNKNOWN',
      filename: '',
    };
  }

  const ext = doc.extraction || doc.structured_data || {};
  const prescription = ext.prescription || {};
  const labReport = ext.lab_report || {};
  const dischargeSummary = ext.discharge_summary || {};
  const radiologyReport = ext.radiology_report || {};
  const metadata = ext.metadata || {};

  // 1. Extract Medications
  const rawMeds = [
    ...(prescription.medications || []),
    ...(dischargeSummary.medications || []),
    ...(ext.medications || []),
    ...(ext.medicines || []),
  ];

  const medications = [];
  const medSet = new Set();

  rawMeds.forEach((item) => {
    if (!item) return;
    if (typeof item === 'string') {
      const trimmed = item.trim();
      if (trimmed && !medSet.has(trimmed.toLowerCase())) {
        medSet.add(trimmed.toLowerCase());
        medications.push({
          name: trimmed,
          dose: '',
          frequency: '',
          instructions: '',
        });
      }
    } else if (typeof item === 'object') {
      const name = item.name || item.medication || item.medicine || '';
      if (name && !medSet.has(name.toLowerCase())) {
        medSet.add(name.toLowerCase());
        const doseStr = [item.dose, item.strength, item.quantity].filter(Boolean).join(' ');
        medications.push({
          name,
          dose: doseStr || item.dosage || '',
          frequency: item.frequency || item.route || '',
          instructions: item.instructions || item.evidence || item.duration ? `Duration: ${item.duration}` : '',
        });
      }
    }
  });

  // 2. Extract Diagnoses
  const rawDiag = [
    ...(prescription.diagnoses || []),
    ...(labReport.diagnoses || []),
    ...(dischargeSummary.diagnoses || []),
    ...(ext.diagnoses || []),
    ...(ext.diagnosis || []),
  ];

  const diagnoses = [];
  const diagSet = new Set();

  rawDiag.forEach((d) => {
    if (!d) return;
    const name = typeof d === 'string' ? d.trim() : d.name || d.diagnosis || '';
    if (name && !diagSet.has(name.toLowerCase())) {
      diagSet.add(name.toLowerCase());
      diagnoses.push(name);
    }
  });

  // 3. Extract Lab Results
  const rawLabs = [
    ...(labReport.results || []),
    ...(dischargeSummary.investigations || []),
    ...(ext.lab_results || []),
    ...(ext.results || []),
  ];

  const labResults = [];
  rawLabs.forEach((lab) => {
    if (!lab) return;
    const testName = lab.test_name || lab.name || '';
    if (testName) {
      labResults.push({
        test_name: testName,
        value: lab.value || '',
        unit: lab.unit || '',
        reference_range: lab.reference_range || '',
        abnormal: lab.abnormal_flag || null,
      });
    }
  });

  // 4. Extract Vitals
  const rawVitals = [
    ...(prescription.vitals || []),
    ...(labReport.vitals || []),
    ...(dischargeSummary.vitals || []),
    ...(ext.vitals || []),
  ];

  const vitals = [];
  rawVitals.forEach((v) => {
    if (!v) return;
    const name = v.name || v.type || '';
    if (name) {
      vitals.push({
        name,
        value: v.value || '',
        unit: v.unit || '',
      });
    }
  });

  // 5. Extract Notes & Instructions
  const notes = [
    ...(prescription.additional_notes || []),
    ...(labReport.additional_notes || []),
    ...(dischargeSummary.discharge_instructions || []),
    ...(dischargeSummary.follow_up_instructions || []),
    prescription.follow_up_instructions,
    dischargeSummary.hospital_course,
    radiologyReport.impression,
    ext.doctor_notes,
    ext.chief_complaints_note,
  ].filter((n) => typeof n === 'string' && n.trim().length > 0);

  // 6. Provider & Patient Metadata
  const provider = metadata.provider || null;
  const patient = metadata.patient || null;
  const rawText = ext.raw_text || doc.extracted_text || '';
  const confidence = doc.ocr_confidence ? Math.round(doc.ocr_confidence * 100) : null;

  return {
    medications,
    diagnoses,
    labResults,
    vitals,
    notes,
    provider,
    patient,
    rawText,
    confidence: confidence !== null ? confidence : 92,
    documentType: doc.document_type || 'PRESCRIPTION',
    status: doc.status || 'COMPLETED',
    filename: doc.filename || 'Document',
  };
}
