import React, { useState } from 'react';

// Read-only viewer for raw uploaded reports/scans/lab documents,
// kept in its own panel/tab so it doesn't clutter the AI summary view.
export default function ReportViewer({ reports = [] }) {
  const [activeIndex, setActiveIndex] = useState(0);
  if (!reports.length) return <p style={{ color: 'var(--muted)' }}>No reports uploaded by this patient yet.</p>;
  const active = reports[activeIndex];

  return (
    <div>
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
        {reports.map((r, i) => (
          <button
            key={r.id}
            onClick={() => setActiveIndex(i)}
            className={i === activeIndex ? 'btn-primary' : 'btn-secondary'}
            style={{ fontSize: '0.8rem' }}
          >
            {r.title} · {new Date(r.uploadedAt).toLocaleDateString('en-IN')}
          </button>
        ))}
      </div>
      <div className="panel">
        {active.fileType === 'image' ? (
          <img src={active.fileUrl} alt={active.title} style={{ maxWidth: '100%', borderRadius: 8 }} />
        ) : (
          <iframe title={active.title} src={active.fileUrl} style={{ width: '100%', height: 500, border: 'none' }} />
        )}
      </div>
    </div>
  );
}
