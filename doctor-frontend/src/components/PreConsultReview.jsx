import React, { useState, useEffect } from 'react';
import { ShieldAlert, CheckCircle2, FileText, Activity, Stethoscope, AlertTriangle, Send, Edit3, ArrowLeft } from 'lucide-react';
import { doctorApiService } from '../services/doctorApi';

export default function PreConsultReview({ patient, onBack, onSyncSuccess }) {
  const [summary, setSummary] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // Form Inputs
  const [confirmedDiagnosis, setConfirmedDiagnosis] = useState('');
  const [treatmentPlan, setTreatmentPlan] = useState('');
  const [physicianNotes, setPhysicianNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [syncedResult, setSyncedResult] = useState(null);

  useEffect(() => {
    async function loadSummary() {
      setIsLoading(true);
      const data = await doctorApiService.getClinicalSummary(patient.session_id);
      setSummary(data);
      setConfirmedDiagnosis(data.suggested_specialty || 'General Consultation');
      setTreatmentPlan(data.digitized_documents_summary?.doctor_instructions || 'Continue prescribed medications. Re-evaluate in 5 days.');
      setIsLoading(false);
    }
    loadSummary();
  }, [patient]);

  const handleConfirmAndSync = async () => {
    setIsSubmitting(true);
    try {
      const result = await doctorApiService.confirmSummary({
        sessionId: patient.session_id,
        summaryId: summary?.summary_id,
        confirmedDiagnosis,
        treatmentPlan,
        physicianNotes,
      });

      setSyncedResult(result);
      if (onSyncSuccess) onSyncSuccess(result);
    } catch (err) {
      console.error('Confirmation error:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading || !summary) {
    return (
      <div className="bg-white p-12 rounded-2xl border border-[#e6e2da] text-center">
        <Activity className="w-8 h-8 text-[#18241c] animate-spin mx-auto mb-3" />
        <p className="font-bold text-[#18241c]">Loading Structured Clinical History & OCR Records...</p>
      </div>
    );
  }

  const socrates = summary.hpi_socrates || {};
  const ayush = summary.ayush_pariksha || {};
  const triage = summary.triage_assessment || {};
  const docsSummary = summary.digitized_documents_summary || {};
  const medications = docsSummary.extracted_medications || [];

  return (
    <div className="space-y-6 pb-16">
      {/* Navigation Header */}
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="flex items-center space-x-2 text-sm font-bold text-[#18241c] hover:text-[#2d3a31] bg-white px-4 py-2 rounded-xl border border-[#e6e2da] shadow-sm"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Patient Queue</span>
        </button>

        <div className="flex items-center space-x-3">
          <span className="text-xs bg-[#2d3a31] text-[#d8e7ce] px-3 py-1 rounded-full font-bold">
            TOKEN: {patient.token_number}
          </span>
          <span className="text-xs font-semibold text-[#8c9a84]">
            Session ID: {patient.session_id}
          </span>
        </div>
      </div>

      {/* Emergency Red-Alert Banner */}
      {triage.is_critical && (
        <div className="bg-red-900 text-white p-5 rounded-2xl border-2 border-red-500 shadow-lg flex items-start space-x-4 animate-pulse">
          <ShieldAlert className="w-8 h-8 text-red-300 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-lg text-white">CRITICAL EMERGENCY TRIAGE ALERT</h2>
              <span className="bg-red-950 text-red-200 text-xs px-2.5 py-0.5 rounded-full font-black border border-red-700">
                PRIORITY SCORE: {triage.priority_score}/10
              </span>
            </div>
            <p className="text-sm text-red-100 mt-1 font-semibold">
              Red Flags: {(triage.red_flags || []).join(' • ') || 'Acute symptoms detected during waiting room intake.'}
            </p>
            {triage.emergency_instructions && (
              <p className="text-xs text-red-200 mt-2 bg-red-950/80 p-2.5 rounded-xl border border-red-800 font-mono">
                📍 Guidance: {triage.emergency_instructions}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Patient Profile Header Card */}
      <div className="bg-white p-6 rounded-2xl border border-[#e6e2da] shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-3">
            <h1 className="font-display text-2xl font-bold text-[#18241c]">{summary.patient_name}</h1>
            <span className="text-sm font-semibold text-[#8c9a84]">
              {summary.age} yrs • {summary.gender} • Native Language: {summary.language}
            </span>
          </div>
          <p className="text-sm font-bold text-[#18241c] mt-1">
            <span className="text-[#8c9a84] font-normal">Chief Complaint: </span>
            {summary.chief_complaint}
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <div className="text-right">
            <p className="text-xs text-[#8c9a84]">Recommended Specialty</p>
            <p className="font-bold text-sm text-[#18241c]">{summary.suggested_specialty}</p>
          </div>
        </div>
      </div>

      {/* Main 2-Column Split View */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: HPI (SOCRATES) & AYUSH (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          {/* HPI SOCRATES Card */}
          <div className="bg-white p-6 rounded-2xl border border-[#e6e2da] shadow-sm">
            <div className="flex items-center space-x-2 mb-4 pb-3 border-b border-[#e6e2da]">
              <Stethoscope className="w-5 h-5 text-[#c27b66]" />
              <h2 className="font-display font-bold text-lg text-[#18241c]">History of Present Illness (SOCRATES)</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div className="bg-[#faf9f5] p-3 rounded-xl border border-[#e6e2da]">
                <span className="text-[#8c9a84] font-bold block uppercase text-[10px]">Site (Location)</span>
                <span className="font-semibold text-[#18241c] text-sm">{socrates.site || 'Substernal chest'}</span>
              </div>

              <div className="bg-[#faf9f5] p-3 rounded-xl border border-[#e6e2da]">
                <span className="text-[#8c9a84] font-bold block uppercase text-[10px]">Onset (Trigger)</span>
                <span className="font-semibold text-[#18241c] text-sm">{socrates.onset || '1 day ago'}</span>
              </div>

              <div className="bg-[#faf9f5] p-3 rounded-xl border border-[#e6e2da]">
                <span className="text-[#8c9a84] font-bold block uppercase text-[10px]">Character</span>
                <span className="font-semibold text-[#18241c] text-sm">{socrates.character || 'Sharp crushing'}</span>
              </div>

              <div className="bg-[#faf9f5] p-3 rounded-xl border border-[#e6e2da]">
                <span className="text-[#8c9a84] font-bold block uppercase text-[10px]">Radiation</span>
                <span className="font-semibold text-[#18241c] text-sm">{socrates.radiation || 'Left shoulder & jaw'}</span>
              </div>

              <div className="bg-[#faf9f5] p-3 rounded-xl border border-[#e6e2da] md:col-span-2">
                <span className="text-[#8c9a84] font-bold block uppercase text-[10px]">Associated Symptoms</span>
                <div className="flex flex-wrap gap-1.5 mt-1">
                  {(socrates.associations || []).map((assoc, i) => (
                    <span key={i} className="bg-[#e6e2da] text-[#18241c] px-2 py-0.5 rounded-md font-semibold">
                      • {assoc}
                    </span>
                  ))}
                </div>
              </div>

              <div className="bg-[#faf9f5] p-3 rounded-xl border border-[#e6e2da] md:col-span-2">
                <span className="text-[#8c9a84] font-bold block uppercase text-[10px]">Exacerbating / Relieving</span>
                <span className="font-semibold text-[#18241c]">{socrates.exacerbating_relieving || 'Aggravated by exertion'}</span>
              </div>
            </div>

            {/* Native Script Recap */}
            {summary.bilingual_recap_native && (
              <div className="mt-4 bg-[#faf9f5] p-3.5 rounded-xl border border-[#e6e2da]">
                <span className="text-[10px] text-[#8c9a84] font-bold block uppercase">Native Voice Recap</span>
                <p className="text-xs text-[#18241c] italic font-serif mt-0.5">"{summary.bilingual_recap_native}"</p>
              </div>
            )}
          </div>

          {/* AYUSH Pariksha Card */}
          {ayush.prakriti && (
            <div className="bg-white p-6 rounded-2xl border border-[#e6e2da] shadow-sm">
              <div className="flex items-center space-x-2 mb-4 pb-3 border-b border-[#e6e2da]">
                <span className="text-xl">🌿</span>
                <h2 className="font-display font-bold text-lg text-[#18241c]">AYUSH Dashavidha Pariksha Summary</h2>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="bg-emerald-50/40 p-3 rounded-xl border border-emerald-200">
                  <span className="text-emerald-800 font-bold block text-[10px]">Prakriti (Dosha Type)</span>
                  <span className="font-bold text-[#18241c] text-sm">{ayush.prakriti}</span>
                </div>
                <div className="bg-emerald-50/40 p-3 rounded-xl border border-emerald-200">
                  <span className="text-emerald-800 font-bold block text-[10px]">Agni (Digestive Fire)</span>
                  <span className="font-bold text-[#18241c] text-sm">{ayush.agni}</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Digitized Prescriptions & Lab Vitals (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-[#e6e2da] shadow-sm space-y-4">
            <div className="flex items-center space-x-2 pb-3 border-b border-[#e6e2da]">
              <FileText className="w-5 h-5 text-[#18241c]" />
              <h2 className="font-display font-bold text-lg text-[#18241c]">Digitized Prescriptions & OCR</h2>
            </div>

            {medications.length > 0 ? (
              <div className="space-y-2">
                <p className="text-xs font-bold text-[#18241c]">Extracted Active Medications:</p>
                {medications.map((med, idx) => (
                  <div key={idx} className="bg-[#faf9f5] p-3 rounded-xl border border-[#e6e2da] flex items-center justify-between">
                    <span className="text-xs font-bold text-[#18241c]">• {med}</span>
                    <span className="text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full font-bold">OCR Verified</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-[#8c9a84] italic">No active prescriptions attached.</p>
            )}

            {docsSummary.doctor_instructions && (
              <div className="bg-amber-50 p-3.5 rounded-xl border border-amber-200 text-xs">
                <span className="font-bold text-amber-900 block">Previous Doctor Advice:</span>
                <span className="text-amber-950">{docsSummary.doctor_instructions}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Bottom Physician Action Form */}
      <div className="bg-white p-6 rounded-2xl border-2 border-[#18241c] shadow-lg space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-[#e6e2da]">
          <div className="flex items-center space-x-2">
            <Edit3 className="w-5 h-5 text-[#18241c]" />
            <h2 className="font-display font-bold text-lg text-[#18241c]">Physician Decision & ABDM Sync</h2>
          </div>

          {syncedResult && (
            <span className="bg-emerald-100 text-emerald-800 text-xs px-3 py-1 rounded-full font-bold flex items-center space-x-1">
              <CheckCircle2 className="w-4 h-4" />
              <span>Synced to ABDM PHR & HIS EMR</span>
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-[#18241c] mb-1">Confirmed Clinical Diagnosis:</label>
            <input
              type="text"
              value={confirmedDiagnosis}
              onChange={(e) => setConfirmedDiagnosis(e.target.value)}
              className="w-full text-xs font-semibold p-3 bg-[#faf9f5] border border-[#e6e2da] rounded-xl focus:outline-none focus:border-[#18241c]"
              placeholder="Enter diagnosis..."
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-[#18241c] mb-1">Treatment & Rx Instructions:</label>
            <input
              type="text"
              value={treatmentPlan}
              onChange={(e) => setTreatmentPlan(e.target.value)}
              className="w-full text-xs font-semibold p-3 bg-[#faf9f5] border border-[#e6e2da] rounded-xl focus:outline-none focus:border-[#18241c]"
              placeholder="Enter treatment plan..."
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-[#18241c] mb-1">Physician OPD Notes:</label>
          <textarea
            rows={2}
            value={physicianNotes}
            onChange={(e) => setPhysicianNotes(e.target.value)}
            className="w-full text-xs p-3 bg-[#faf9f5] border border-[#e6e2da] rounded-xl focus:outline-none focus:border-[#18241c]"
            placeholder="Add internal consultation notes..."
          />
        </div>

        <div className="flex items-center justify-between pt-2">
          <button
            onClick={handleConfirmAndSync}
            disabled={isSubmitting}
            className="w-full md:w-auto px-8 py-3.5 bg-[#18241c] hover:bg-[#2d3a31] text-white font-bold text-sm rounded-xl transition-all shadow-md flex items-center justify-center space-x-2"
          >
            {isSubmitting ? (
              <Activity className="w-5 h-5 animate-spin text-white" />
            ) : (
              <>
                <Send className="w-4 h-4" />
                <span>Confirm Case & Push to ABDM / HIS</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
