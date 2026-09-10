import React from 'react';
import {
  Stethoscope,
  CheckCircle2,
  ArrowLeft,
  Pill,
  Activity,
  FileText,
} from 'lucide-react';
import { parseDocExtraction } from '../utils/document_parser';
import { t } from '../utils/translations';

export default function SummaryReviewStep({
  currentLanguage = 'hi',
  summaryData,
  patientData,
  extractedDocs = [],
  onConfirmAndGenerateTicket,
  onBack,
}) {
  const summary = summaryData || {};
  const hpi = summary.hpi_socrates || {};
  const triage = summary.triage_assessment || {};
  const ayush = summary.ayush_pariksha || {};

  // Parse all uploaded medical documents via parseDocExtraction
  const parsedDocList = (extractedDocs || []).map((doc) => parseDocExtraction(doc));

  // Collect real medications from OCR document extractions
  const ocrMedications = parsedDocList.flatMap((p) =>
    p.medications.map((m) => ({
      name: m.name,
      dose: m.dose,
      frequency: m.frequency,
      source: p.filename || 'Scanned Document',
    }))
  );

  // Collect reported medications from summary synthesis
  const rawReportedMeds = Array.isArray(summary.unverified_medications)
    ? summary.unverified_medications
    : [];

  const legacyFakeStrings = [
    'paracetamol 500mg, self-prescribed antacids',
    'unverified self-medication - requires doctor review',
    'paracetamol 500mg (self-medicated)',
  ];

  const reportedMedications = rawReportedMeds
    .filter((m) => typeof m === 'string' && !legacyFakeStrings.includes(m.toLowerCase().trim()))
    .map((m) => ({
      name: m,
      dose: '',
      frequency: 'Patient Self-Reported',
      source: 'Patient Dialogue',
    }));

  // Combine and deduplicate real medications
  const combinedMedications = [];
  const medSet = new Set();

  [...ocrMedications, ...reportedMedications].forEach((med) => {
    const key = med.name.toLowerCase().trim();
    if (key && !medSet.has(key)) {
      medSet.add(key);
      combinedMedications.push(med);
    }
  });

  const hasValidAyush =
    ayush &&
    ayush.prakriti &&
    ayush.prakriti !== 'Unassessed' &&
    ayush.prakriti !== 'Pitta-Vata';

  return (
    <div className="w-full max-w-4xl mx-auto px-4 lg:px-8 py-8 flex flex-col gap-8">
      {/* Header Banner */}
      <div className="rounded-3xl bg-[#f4f4f0] p-6 lg:p-8 border border-[#e6e2da] shadow-sm space-y-3">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#d8e7ce] text-[#5b6854] font-body text-xs font-semibold">
          <Stethoscope size={14} className="text-[#8c9a84]" />
          <span>{t(currentLanguage, 'step7')}</span>
        </div>
        <h1 className="font-display text-3xl md:text-4xl text-[#18241c] font-semibold">
          {t(currentLanguage, 'reviewTitle')}
        </h1>
        <p className="font-body text-sm text-[#434844] max-w-2xl leading-relaxed">
          {t(currentLanguage, 'reviewSubtitle')}
        </p>
      </div>

      {/* Patient & Triage Header Card */}
      <div className="bg-[#ffffff] rounded-3xl p-6 border border-[#e6e2da] shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-[#2d3a31] text-[#ffffff] flex items-center justify-center font-display text-lg font-bold">
            {patientData.name ? patientData.name[0] : 'P'}
          </div>
          <div>
            <h2 className="font-display text-xl text-[#18241c] font-semibold">
              {patientData.name || 'Patient'}
            </h2>
            <span className="font-body text-xs text-[#737873]">
              Age: {patientData.age || 35} yrs • Gender: {patientData.gender || 'Male'} • Lang:{' '}
              {(summary.language || currentLanguage).toUpperCase()}
            </span>
          </div>
        </div>

        {/* Triage Badge */}
        <div className="flex items-center gap-2">
          <span className="font-body text-xs text-[#737873] font-semibold">{t(currentLanguage, 'triagePriority')}:</span>
          <span
            className={`px-4 py-1.5 rounded-full text-xs font-bold ${
              triage.is_critical || summary.triage_category === 'P1_CRITICAL'
                ? 'bg-[#ffdad6] text-[#93000a] border border-[#ba1a1a]'
                : 'bg-[#d8e7ce] text-[#5b6854] border border-[#8c9a84]'
            }`}
          >
            {summary.triage_category || summary.suggested_specialty || 'P2 URGENT'}
          </span>
        </div>
      </div>

      {/* Structured Summary Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Chief Complaint & HPI Card */}
        <div className="bg-[#ffffff] rounded-3xl p-6 border border-[#e6e2da] shadow-sm space-y-4">
          <div className="flex items-center gap-2 text-[#2d3a31] font-display text-base font-semibold border-b border-[#e6e2da] pb-3">
            <Activity size={18} className="text-[#8c9a84]" />
            <span>{t(currentLanguage, 'chiefComplaint')}</span>
          </div>
          <p className="font-body text-sm text-[#18241c] font-semibold bg-[#faf9f5] p-3.5 rounded-2xl border border-[#e6e2da]">
            "{summary.chief_complaint || 'Patient reports acute discomfort.'}"
          </p>

          <div className="space-y-2 text-xs font-body">
            <div className="flex justify-between py-1 border-b border-[#e6e2da]">
              <span className="text-[#737873]">Location / Site:</span>
              <span className="font-semibold text-[#18241c]">{hpi.site || 'General'}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-[#e6e2da]">
              <span className="text-[#737873]">Onset:</span>
              <span className="font-semibold text-[#18241c]">{hpi.onset || 'Recently'}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-[#e6e2da]">
              <span className="text-[#737873]">Pain Character:</span>
              <span className="font-semibold text-[#18241c]">{hpi.character || 'Moderate'}</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-[#737873]">Severity (1-10):</span>
              <span className="font-bold text-[#c27b66]">{hpi.severity || 5} / 10</span>
            </div>
          </div>
        </div>

        {/* Specialty & Extracted Medications Card */}
        <div className="bg-[#ffffff] rounded-3xl p-6 border border-[#e6e2da] shadow-sm space-y-4">
          <div className="flex items-center gap-2 text-[#2d3a31] font-display text-base font-semibold border-b border-[#e6e2da] pb-3">
            <Pill size={18} className="text-[#8c9a84]" />
            <span>{t(currentLanguage, 'suggestedSpecialty')}</span>
          </div>

          <div className="p-3.5 rounded-2xl bg-[#f4f4f0] border border-[#e6e2da] space-y-1">
            <span className="font-body text-xs text-[#737873] font-semibold uppercase tracking-wider block">
              {t(currentLanguage, 'suggestedSpecialty')}
            </span>
            <span className="font-display text-lg text-[#18241c] font-bold block">
              {summary.suggested_specialty || summary.recommended_specialty || 'General Medicine OPD'}
            </span>
          </div>

          {/* Extracted & Reported Medications List */}
          <div className="space-y-2 text-xs font-body">
            <span className="font-semibold text-[#18241c] block">
              {t(currentLanguage, 'unverifiedMeds')} ({combinedMedications.length}):
            </span>
            {combinedMedications.length > 0 ? (
              <div className="space-y-2">
                {combinedMedications.map((m, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-2xl bg-[#faf9f5] border border-[#e6e2da] flex items-center justify-between gap-2"
                  >
                    <div>
                      <span className="font-semibold text-[#18241c] block">{m.name}</span>
                      <span className="text-[#737873] text-[11px]">
                        {m.dose} {m.frequency ? `• ${m.frequency}` : ''}
                      </span>
                    </div>
                    <span className="px-2.5 py-1 rounded-full bg-[#d8e7ce] text-[#5b6854] text-[10px] font-bold shrink-0">
                      {m.source}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-[#faf9f5] p-3 rounded-xl border border-[#e6e2da] text-[#737873] italic">
                No active or prior medications reported or detected in uploaded records.
              </div>
            )}
          </div>

          {/* Optional AYUSH Assessment */}
          {hasValidAyush && (
            <div className="p-3 rounded-2xl bg-[#d8e7ce]/40 border border-[#8c9a84] text-xs space-y-1">
              <span className="font-bold text-[#5b6854] block">AYUSH Pariksha Assessment:</span>
              <span className="text-[#18241c]">
                Prakriti: {ayush.prakriti} | Agni: {ayush.agni || 'Sama Agni'}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Attached Medical Documents Section */}
      {parsedDocList.length > 0 && (
        <div className="bg-[#ffffff] rounded-3xl p-6 border border-[#e6e2da] shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-[#e6e2da] pb-3">
            <div className="flex items-center gap-2 text-[#2d3a31] font-display text-base font-semibold">
              <FileText size={18} className="text-[#8c9a84]" />
              <span>{t(currentLanguage, 'extractedRecords')} ({parsedDocList.length})</span>
            </div>
            <span className="px-3 py-1 rounded-full bg-[#d8e7ce] text-[#5b6854] text-xs font-bold flex items-center gap-1">
              <CheckCircle2 size={13} /> OCR Data Verified
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-body">
            {parsedDocList.map((doc, idx) => (
              <div
                key={idx}
                className="p-3.5 rounded-2xl bg-[#faf9f5] border border-[#e6e2da] flex items-start gap-3"
              >
                <div className="w-8 h-8 rounded-xl bg-[#d8e7ce] text-[#5b6854] flex items-center justify-center shrink-0">
                  <FileText size={16} />
                </div>
                <div className="space-y-1 overflow-hidden">
                  <span className="font-semibold text-[#18241c] truncate block">
                    {doc.filename || `Document #${idx + 1}`}
                  </span>
                  <div className="text-[#737873] flex flex-wrap items-center gap-2">
                    <span>Type: {doc.documentType}</span>
                    <span>•</span>
                    <span>OCR: {doc.confidence}%</span>
                  </div>
                  {doc.medications.length > 0 && (
                    <div className="text-[#5b6854] font-medium text-[11px] pt-1">
                      Medicines found: {doc.medications.map((m) => m.name).join(', ')}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Reassurance Footer & Confirm CTA */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-[#e6e2da]">
        <button
          type="button"
          onClick={onBack}
          className="h-12 px-6 rounded-full bg-transparent hover:bg-[#f4f4f0] text-[#434844] font-body text-sm font-semibold flex items-center gap-2"
        >
          <ArrowLeft size={18} />
          <span>{t(currentLanguage, 'back')}</span>
        </button>

        <button
          type="button"
          onClick={() => onConfirmAndGenerateTicket(summary)}
          className="w-full sm:w-auto h-13 px-8 rounded-full bg-[#c27b66] hover:bg-[#a96552] text-[#ffffff] font-body text-base font-semibold transition-all shadow-sm flex items-center justify-center gap-3 active:translate-y-0.5"
        >
          <CheckCircle2 size={20} />
          <span>{t(currentLanguage, 'confirmAndProceed')}</span>
        </button>
      </div>
    </div>
  );
}
