import React from 'react';
import { formatDateTime } from '../../utils/dateFormat';

export default function PatientHistoryTable({ visits = [] }) {
  if (!visits.length) return <p style={{ color: 'var(--muted)' }}>No prior visits recorded.</p>;
  return (
    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
      <thead>
        <tr style={{ textAlign: 'left', borderBottom: '1px solid var(--border)' }}>
          <th style={{ padding: '0.5rem' }}>Date</th>
          <th style={{ padding: '0.5rem' }}>Doctor</th>
          <th style={{ padding: '0.5rem' }}>Diagnosis</th>
          <th style={{ padding: '0.5rem' }}>Status</th>
        </tr>
      </thead>
      <tbody>
        {visits.map((v) => (
          <tr key={v.id} style={{ borderBottom: '1px solid var(--border)' }}>
            <td style={{ padding: '0.5rem' }}>{formatDateTime(v.checkedInAt)}</td>
            <td style={{ padding: '0.5rem' }}>{v.doctorName}</td>
            <td style={{ padding: '0.5rem' }}>{v.diagnosisSummary || '—'}</td>
            <td style={{ padding: '0.5rem' }}>
              <span className={`badge ${v.status === 'checked_in' ? 'badge-checked-in' : 'badge-pending'}`}>
                {v.status}
              </span>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
