import React, { useState } from 'react';

export const F1LightsTest: React.FC = () => {
  const [showTest, setShowTest] = useState(false);

  if (!showTest) {
    return (
      <button
        onClick={() => setShowTest(true)}
        style={{
          position: 'fixed',
          bottom: '60px',
          left: '16px',
          zIndex: 9998,
          backgroundColor: 'rgba(255, 0, 0, 0.8)',
          color: 'white',
          border: '1px solid white',
          padding: '8px',
          fontSize: '12px',
          cursor: 'pointer'
        }}
      >
        🔴 Test F1 Lights
      </button>
    );
  }

  return (
    <div style={{
      position: 'fixed',
      top: '16px',
      left: '16px',
      right: '16px',
      zIndex: 9998,
      backgroundColor: 'rgba(0, 0, 0, 0.9)',
      color: 'white',
      border: '2px solid red',
      padding: '16px',
      fontSize: '12px',
      fontFamily: 'monospace'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
        <span>F1 Lights Responsive Test</span>
        <button
          onClick={() => setShowTest(false)}
          style={{
            backgroundColor: 'transparent',
            color: 'white',
            border: '1px solid white',
            padding: '2px 6px',
            cursor: 'pointer'
          }}
        >
          ✕
        </button>
      </div>
      
      <div style={{ marginBottom: '16px' }}>
        <div style={{ fontSize: '11px', marginBottom: '8px' }}>
          Screen: {window.innerWidth}px × {window.innerHeight}px
        </div>
        <div style={{ fontSize: '11px', marginBottom: '8px' }}>
          Available for lights: {window.innerWidth - 64}px (minus padding)
        </div>
        <div style={{ fontSize: '11px', marginBottom: '8px' }}>
          Calculated light size: {Math.min(80, Math.max(30, (window.innerWidth - 64 - 64) / 5))}px
        </div>
      </div>

      <div style={{ marginBottom: '16px' }}>
        <div style={{ fontSize: '11px', marginBottom: '8px', color: '#ffff00' }}>
          Test F1 Lights (should never wrap):
        </div>
        <div className="f1-lights-responsive" style={{ 
          backgroundColor: '#333', 
          border: '1px solid #666',
          margin: '0 -16px' // Extend to container edges
        }}>
          {Array.from({ length: 5 }, (_, index) => (
            <div
              key={index}
              className="f1-light-responsive"
              style={{
                backgroundColor: index < 3 ? '#ff0000' : '#333333',
                boxShadow: index < 3 ? '0 0 10px #ff0000' : 'none'
              }}
            />
          ))}
        </div>
      </div>

      <div style={{ fontSize: '10px', color: '#ccc' }}>
        ✓ Lights should fit horizontally without wrapping<br/>
        ✓ Should scale down on smaller screens<br/>
        ✓ Should maintain aspect ratio<br/>
        ✓ Should have consistent gaps
      </div>
    </div>
  );
};