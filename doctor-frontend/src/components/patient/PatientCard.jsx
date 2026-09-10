import React from 'react';

export default function PatientCard({ patient }) {
  if (!patient) return null;
  return (
    <div className="panel" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <div>
        <h3 style={{ margin: 0 }}>{patient.name}</h3>
        <p style={{ margin: '0.25rem 0', color: 'var(--muted)', fontSize: '0.9rem' }}>
          {patient.age} yrs • {patient.gender} • ABHA: {patient.abhaId || '—'}
        </p>
        <p style={{ margin: 0, color: 'var(--muted)', fontSize: '0.85rem' }}>
          Mobile: {patient.maskedMobile || '—'}
        </p>
      </div>
      <span className={`badge ${patient.checkedInToday ? 'badge-checked-in' : 'badge-pending'}`}>
        {patient.checkedInToday ? 'Checked-in today' : 'Not checked-in'}
      </span>
    </div>
  );
}
