import React from 'react';
import { formatDateTime } from '../../utils/dateFormat';

export default function PrescriptionList({ prescriptions = [] }) {
  if (!prescriptions.length) return <p style={{ color: 'var(--muted)' }}>No prescriptions on file.</p>;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
      {prescriptions.map((p) => (
        <div key={p.id} className="panel">
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <strong>{p.prescribedBy}</strong>
            <span style={{ color: 'var(--muted)', fontSize: '0.85rem' }}>{formatDateTime(p.date)}</span>
          </div>
          <ul style={{ marginTop: '0.5rem' }}>
            {p.medicines.map((m, idx) => (
              <li key={idx}>{m.name} — {m.dosage} — {m.duration}</li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}
