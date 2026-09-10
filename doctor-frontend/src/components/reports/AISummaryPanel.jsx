import React, { useState } from 'react';
import { patientApi } from '../../api/patientApi';
import { formatDateTime } from '../../utils/dateFormat';

// Shows the AI-generated summary (from the voice interview + document
// analysis pipeline run on patient-mobile) and lets the doctor edit the
// text and/or attach their own remark before it's saved as final.
export default function AISummaryPanel({ patientId, summary, onSaved }) {
  const [editedText, setEditedText] = useState(summary?.summaryText || '');
  const [remark, setRemark] = useState('');
  const [saving, setSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  if (!summary) return <p style={{ color: 'var(--muted)' }}>No AI summary generated for this visit yet.</p>;

  const handleSave = async () => {
    setSaving(true);
    try {
      const { data } = await patientApi.updateAiSummary(patientId, {
        summaryText: editedText,
        doctorRemark: remark || undefined,
      });
      setIsEditing(false);
      setRemark('');
      onSaved?.(data);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="panel">
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
        <h4 style={{ margin: 0 }}>AI-Generated Summary</h4>
        <span style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>
          Generated {formatDateTime(summary.generatedAt)}
        </span>
      </div>

      <section style={{ marginBottom: '1rem' }}>
        <h5>Symptoms (voice interview)</h5>
        <p>{summary.symptomsNarrative}</p>
      </section>
      <section style={{ marginBottom: '1rem' }}>
        <h5>Document analysis findings</h5>
        <ul>
          {summary.documentFindings?.map((f, i) => <li key={i}>{f}</li>)}
        </ul>
      </section>
      <section style={{ marginBottom: '1rem' }}>
        <h5>Suggested diagnosis / triage</h5>
        <p>{summary.suggestedDiagnosis}</p>
      </section>

      <section>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h5 style={{ margin: 0 }}>Summary text (editable by doctor)</h5>
          {!isEditing && (
            <button className="btn-secondary" onClick={() => setIsEditing(true)}>Edit</button>
          )}
        </div>
        {isEditing ? (
          <>
            <textarea
              value={editedText}
              onChange={(e) => setEditedText(e.target.value)}
              rows={6}
              style={{ width: '100%', marginTop: '0.5rem', padding: '0.6rem', borderRadius: 8, border: '1px solid var(--border)' }}
            />
            <textarea
              value={remark}
              onChange={(e) => setRemark(e.target.value)}
              placeholder="Add your remark (visible to patient & future doctors)"
              rows={3}
              style={{ width: '100%', marginTop: '0.5rem', padding: '0.6rem', borderRadius: 8, border: '1px solid var(--border)' }}
            />
            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
              <button className="btn-primary" onClick={handleSave} disabled={saving}>
                {saving ? 'Saving…' : 'Save summary & remark'}
              </button>
              <button className="btn-secondary" onClick={() => setIsEditing(false)}>Cancel</button>
            </div>
          </>
        ) : (
          <p style={{ whiteSpace: 'pre-wrap' }}>{editedText}</p>
        )}
      </section>

      {summary.doctorRemarks?.length > 0 && (
        <section style={{ marginTop: '1rem', borderTop: '1px solid var(--border)', paddingTop: '0.75rem' }}>
          <h5>Prior doctor remarks</h5>
          {summary.doctorRemarks.map((r) => (
            <div key={r.id} style={{ marginBottom: '0.5rem' }}>
              <p style={{ margin: 0 }}>{r.text}</p>
              <span style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>
                — Dr. {r.doctorName}, {formatDateTime(r.createdAt)}
              </span>
            </div>
          ))}
        </section>
      )}
    </div>
  );
}
