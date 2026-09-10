import React from 'react';

// Small metric tile for the dashboard header row. Kept text-forward
// (big number + label) rather than decorative — doctors scan this in
// under a second between patients.
export default function StatCard({ label, value, tone = 'neutral' }) {
  const toneColor = {
    neutral: 'var(--text)',
    good: 'var(--primary)',
    warn: 'var(--warn)',
  }[tone];

  return (
    <div className="panel" style={{ flex: 1, minWidth: 130 }}>
      <div style={{ fontSize: '1.6rem', fontWeight: 700, color: toneColor, lineHeight: 1.1 }}>
        {value}
      </div>
      <div style={{ fontSize: '0.8rem', color: 'var(--muted)', marginTop: '0.25rem' }}>
        {label}
      </div>
    </div>
  );
}
