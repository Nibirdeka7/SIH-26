import React, { useState } from 'react';
import { Target, HeartPulse, Flame, AlertCircle } from 'lucide-react';

const BODY_REGIONS = [
  { id: 'head', name: 'Head & Brain', icon: '🧠', quickSymptoms: 'Headache, Dizziness, Vision Blur' },
  { id: 'throat', name: 'Throat & Neck', icon: '🗣️', quickSymptoms: 'Sore Throat, Difficulty Swallowing, Stiffness' },
  { id: 'chest', name: 'Chest & Heart', icon: '🫀', quickSymptoms: 'Chest Pain, Tightness, Shortness of Breath' },
  { id: 'stomach', name: 'Abdomen & Stomach', icon: '🩺', quickSymptoms: 'Stomach Pain, Nausea, Vomiting, Acidity' },
  { id: 'back', name: 'Spine & Back', icon: '🦴', quickSymptoms: 'Lower Back Ache, Spinal Pain' },
  { id: 'limbs', name: 'Arms & Legs', icon: '🦵', quickSymptoms: 'Joint Pain, Swelling, Weakness' },
];

export default function SymptomBodyMap({ onSelectSymptomRegion }) {
  const [selectedRegion, setSelectedRegion] = useState(null);

  const handleRegionClick = (region) => {
    setSelectedRegion(region.id);
    if (onSelectSymptomRegion) {
      onSelectSymptomRegion(region);
    }
  };

  return (
    <div className="glass-panel" style={{ padding: '20px', height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Target size={20} color="var(--primary-500)" />
          <h3 style={{ fontSize: '1.1rem' }}>Interactive Body Map</h3>
        </div>
        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Tap area to target pain</span>
      </div>

      {/* SVG Body Diagram */}
      <div
        style={{
          position: 'relative',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          background: 'rgba(0, 0, 0, 0.2)',
          borderRadius: 'var(--radius-md)',
          padding: '16px',
          flex: 1,
          minHeight: '260px',
        }}
      >
        <svg viewBox="0 0 200 380" style={{ height: '280px', width: 'auto' }}>
          {/* Head */}
          <circle
            cx="100"
            cy="40"
            r="22"
            className={`body-part-btn ${selectedRegion === 'head' ? 'selected' : ''}`}
            fill="rgba(255, 255, 255, 0.1)"
            stroke="var(--border-glass)"
            strokeWidth="2"
            onClick={() => handleRegionClick(BODY_REGIONS[0])}
          />

          {/* Neck / Throat */}
          <rect
            x="92"
            y="65"
            width="16"
            height="18"
            rx="4"
            className={`body-part-btn ${selectedRegion === 'throat' ? 'selected' : ''}`}
            fill="rgba(255, 255, 255, 0.1)"
            stroke="var(--border-glass)"
            strokeWidth="2"
            onClick={() => handleRegionClick(BODY_REGIONS[1])}
          />

          {/* Chest */}
          <path
            d="M 68 86 Q 100 86 132 86 Q 136 135 130 145 Q 100 150 70 145 Z"
            className={`body-part-btn ${selectedRegion === 'chest' ? 'selected' : ''}`}
            fill="rgba(255, 255, 255, 0.1)"
            stroke="var(--border-glass)"
            strokeWidth="2"
            onClick={() => handleRegionClick(BODY_REGIONS[2])}
          />

          {/* Abdomen */}
          <path
            d="M 70 148 Q 100 152 130 148 Q 128 200 122 210 Q 100 215 78 210 Z"
            className={`body-part-btn ${selectedRegion === 'stomach' ? 'selected' : ''}`}
            fill="rgba(255, 255, 255, 0.1)"
            stroke="var(--border-glass)"
            strokeWidth="2"
            onClick={() => handleRegionClick(BODY_REGIONS[3])}
          />

          {/* Arms */}
          <path
            d="M 45 92 L 65 90 L 52 200 L 35 195 Z"
            className={`body-part-btn ${selectedRegion === 'limbs' ? 'selected' : ''}`}
            fill="rgba(255, 255, 255, 0.1)"
            stroke="var(--border-glass)"
            strokeWidth="2"
            onClick={() => handleRegionClick(BODY_REGIONS[5])}
          />
          <path
            d="M 155 92 L 135 90 L 148 200 L 165 195 Z"
            className={`body-part-btn ${selectedRegion === 'limbs' ? 'selected' : ''}`}
            fill="rgba(255, 255, 255, 0.1)"
            stroke="var(--border-glass)"
            strokeWidth="2"
            onClick={() => handleRegionClick(BODY_REGIONS[5])}
          />

          {/* Legs */}
          <path
            d="M 78 215 L 96 215 L 92 340 L 72 340 Z"
            className={`body-part-btn ${selectedRegion === 'limbs' ? 'selected' : ''}`}
            fill="rgba(255, 255, 255, 0.1)"
            stroke="var(--border-glass)"
            strokeWidth="2"
            onClick={() => handleRegionClick(BODY_REGIONS[5])}
          />
          <path
            d="M 104 215 L 122 215 L 128 340 L 108 340 Z"
            className={`body-part-btn ${selectedRegion === 'limbs' ? 'selected' : ''}`}
            fill="rgba(255, 255, 255, 0.1)"
            stroke="var(--border-glass)"
            strokeWidth="2"
            onClick={() => handleRegionClick(BODY_REGIONS[5])}
          />
        </svg>
      </div>

      {/* Quick Regions Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginTop: '14px' }}>
        {BODY_REGIONS.map((region) => (
          <button
            key={region.id}
            onClick={() => handleRegionClick(region)}
            style={{
              padding: '10px',
              borderRadius: 'var(--radius-sm)',
              background: selectedRegion === region.id ? 'rgba(16, 185, 129, 0.2)' : 'var(--bg-glass)',
              border: selectedRegion === region.id ? '1px solid var(--primary-500)' : '1px solid var(--border-glass)',
              color: 'var(--text-main)',
              fontSize: '0.85rem',
              textAlign: 'left',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <span style={{ fontSize: '1.1rem' }}>{region.icon}</span>
            <span style={{ fontWeight: '600' }}>{region.name}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
