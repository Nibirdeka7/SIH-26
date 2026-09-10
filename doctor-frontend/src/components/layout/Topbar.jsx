import React from 'react';
import { useAuth } from '../../context/AuthContext.jsx';

export default function Topbar() {
  const { doctor, logout } = useAuth();
  return (
    <header
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '0.9rem 1.5rem',
        borderBottom: '1px solid var(--border)',
        background: '#fff',
        position: 'sticky',
        top: 0,
        zIndex: 10,
      }}
    >
      <div style={{ fontWeight: 600 }}>Welcome, Dr. {doctor?.name || '—'}</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <span style={{ fontSize: '0.85rem', color: 'var(--muted)' }}>
          {doctor?.medicalRegistrationId ? `Reg. No: ${doctor.medicalRegistrationId}` : ''}
        </span>
        <button className="btn-secondary" onClick={logout}>Logout</button>
      </div>
    </header>
  );
}
