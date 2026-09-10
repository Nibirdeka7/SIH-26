import React, { useState } from 'react';
import { ClipboardList, CheckCircle, Stethoscope, AlertTriangle, ArrowRight, ShieldCheck, Sparkles } from 'lucide-react';
import { summaryService } from '../services/summary_api';

export default function SummaryReviewCard({ summaryData, sessionId, onConfirmAndGenerateTicket, targetLanguage = 'hi' }) {
  const [confirming, setConfirming] = useState(false);

  if (!summaryData) return null;

  const handleConfirm = async () => {
    setConfirming(true);
    try {
      if (summaryData.summary_id) {
        await summaryService.confirmSummary(summaryData.summary_id, true);
      }
      if (onConfirmAndGenerateTicket) {
        onConfirmAndGenerateTicket(summaryData);
      }
    } catch (err) {
      console.error('Confirm error:', err);
      if (onConfirmAndGenerateTicket) {
        onConfirmAndGenerateTicket(summaryData);
      }
    } finally {
      setConfirming(false);
    }
  };

  const triageCategory = summaryData.triage_category || summaryData.priority || 'P3_ROUTINE';
  const recommendedSpecialty = summaryData.recommended_specialty || summaryData.specialty || 'General Medicine';

  return (
    <div className="glass-panel" style={{ padding: '24px', maxWidth: '780px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', borderBottom: '1px solid var(--border-glass)', paddingBottom: '14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ padding: '10px', borderRadius: '12px', background: 'rgba(16, 185, 129, 0.2)', border: '1px solid var(--primary-500)' }}>
            <ClipboardList size={24} color="var(--primary-500)" />
          </div>
          <div>
            <h2 style={{ fontSize: '1.25rem' }}>Bilingual Clinical Summary Review</h2>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Review your recorded medical intake before generating your OPD Ticket</p>
          </div>
        </div>

        {/* Priority Badge */}
        <div
          style={{
            padding: '8px 16px',
            borderRadius: '20px',
            fontWeight: '800',
            fontSize: '0.85rem',
            background:
              triageCategory === 'P1_CRITICAL'
                ? 'rgba(239, 68, 68, 0.25)'
                : triageCategory === 'P2_URGENT'
                ? 'rgba(245, 158, 11, 0.25)'
                : 'rgba(16, 185, 129, 0.25)',
            border: `1px solid ${
              triageCategory === 'P1_CRITICAL'
                ? 'var(--danger-500)'
                : triageCategory === 'P2_URGENT'
                ? 'var(--warning-500)'
                : 'var(--primary-500)'
            }`,
            color: '#ffffff',
          }}
        >
          {triageCategory.replace('_', ' ')}
        </div>
      </div>

      {/* Summary Content Body */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
        {/* Recommended Specialty Card */}
        <div style={{ background: 'rgba(0, 0, 0, 0.3)', border: '1px solid var(--border-glass)', borderRadius: 'var(--radius-md)', padding: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--cyan-500)', fontSize: '0.85rem', fontWeight: '700', textTransform: 'uppercase', marginBottom: '6px' }}>
            <Stethoscope size={16} />
            <span>Assigned OPD Department</span>
          </div>
          <h3 style={{ fontSize: '1.2rem', color: '#ffffff' }}>{recommendedSpecialty}</h3>
        </div>

        {/* Chief Complaint */}
        <div style={{ background: 'rgba(0, 0, 0, 0.3)', border: '1px solid var(--border-glass)', borderRadius: 'var(--radius-md)', padding: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--primary-500)', fontSize: '0.85rem', fontWeight: '700', textTransform: 'uppercase', marginBottom: '6px' }}>
            <Sparkles size={16} />
            <span>Chief Symptoms Reported</span>
          </div>
          <p style={{ fontSize: '0.95rem', color: 'var(--text-main)' }}>
            {summaryData.chief_complaint || summaryData.narrative_en || 'Intake conversation completed.'}
          </p>
        </div>
      </div>

      {/* Translated Patient Narrative */}
      {summaryData.narrative_target && (
        <div style={{ background: 'rgba(15, 23, 42, 0.6)', border: '1px solid var(--border-glass)', borderRadius: 'var(--radius-md)', padding: '16px', marginBottom: '20px' }}>
          <h4 style={{ fontSize: '0.85rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '8px' }}>
            Patient Explanation ({targetLanguage.toUpperCase()}):
          </h4>
          <p style={{ fontSize: '1rem', color: '#ffffff', lineHeight: '1.6' }}>{summaryData.narrative_target}</p>
        </div>
      )}

      {/* Confirmation CTA */}
      <div style={{ textAlign: 'center', marginTop: '24px' }}>
        <button
          onClick={handleConfirm}
          disabled={confirming}
          className="btn-primary"
          style={{ width: '100%', padding: '16px', fontSize: '1.1rem' }}
        >
          <ShieldCheck size={22} />
          <span>Confirm Intake & Print Queue Ticket</span>
        </button>
      </div>
    </div>
  );
}
