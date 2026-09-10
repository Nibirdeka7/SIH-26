import React from 'react';
export default function Loader({ label = 'Loading…' }) {
  return <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--muted)' }}>{label}</div>;
}
