import React from 'react';
import { useNavigate } from 'react-router-dom';
import { identifierLabel } from '../../utils/idValidators';
import { formatDateTime } from '../../utils/dateFormat';

// One row in the "today's patients" list on the dashboard. Deliberately
// dense (name, reason, id type, status) since a doctor is scanning a
// stack of these, not reading one at a time.
export default function PatientListItem({ patient }) {
  const navigate = useNavigate();
  const isCheckedIn = patient.status === 'checked_in';

  return (
    <button
      onClick={() => navigate(`/patient/${patient.id}`)}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        width: '100%',
        textAlign: 'left',
        background: '#fff',
        border: '1px solid var(--border)',
        borderRadius: 10,
        padding: '0.85rem 1rem',
        cursor: 'pointer',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', minWidth: 0 }}>
        <div
          aria-hidden
          style={{
            width: 38, height: 38, borderRadius: '50%',
            background: isCheckedIn ? '#e6f6f0' : '#f4f6f9',
            color: isCheckedIn ? 'var(--primary-dark)' : 'var(--muted)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontWeight: 700, fontSize: '0.9rem', flexShrink: 0,
          }}
        >
          {patient.name.split(' ').map((n) => n[0]).slice(0, 2).join('')}
        </div>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {patient.name}
            <span style={{ fontWeight: 400, color: 'var(--muted)', marginLeft: '0.5rem', fontSize: '0.8rem' }}>
              {patient.age}{patient.gender}
            </span>
          </div>
          <div style={{ fontSize: '0.82rem', color: 'var(--muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {patient.reason}
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexShrink: 0, marginLeft: '1rem' }}>
        <span style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>
          {identifierLabel(patient.identifierType)}: {patient.identifierValue}
        </span>
        {patient.hasAiSummary && (
          <span
            title="AI summary ready"
            style={{ fontSize: '0.75rem', background: '#eef3ff', color: '#3452c4', padding: '0.15rem 0.5rem', borderRadius: 999, fontWeight: 600 }}
          >
            AI summary
          </span>
        )}
        <span className={`badge ${isCheckedIn ? 'badge-checked-in' : 'badge-pending'}`}>
          {isCheckedIn ? `Checked-in · ${formatDateTime(patient.checkedInAt)}` : 'Waiting'}
        </span>
      </div>
    </button>
  );
}
