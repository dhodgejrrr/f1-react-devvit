import React, { useState, useEffect } from 'react';

interface ViewportInfo {
  width: number;
  height: number;
  orientation: 'portrait' | 'landscape';
  deviceType: 'mobile' | 'tablet' | 'desktop';
}

export const ResponsiveTest: React.FC = () => {
  const [viewport, setViewport] = useState<ViewportInfo>({
    width: 0,
    height: 0,
    orientation: 'portrait',
    deviceType: 'desktop'
  });

  const [showTest, setShowTest] = useState(false);

  useEffect(() => {
    const updateViewport = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      const orientation = width > height ? 'landscape' : 'portrait';
      
      let deviceType: 'mobile' | 'tablet' | 'desktop' = 'desktop';
      if (width < 481) deviceType = 'mobile';
      else if (width < 769) deviceType = 'tablet';

      setViewport({ width, height, orientation, deviceType });
    };

    updateViewport();
    window.addEventListener('resize', updateViewport);
    return () => window.removeEventListener('resize', updateViewport);
  }, []);

  if (!showTest) {
    return (
      <button
        onClick={() => setShowTest(true)}
        style={{
          position: 'fixed',
          bottom: '16px',
          left: '16px',
          zIndex: 9999,
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          color: 'white',
          border: '1px solid white',
          padding: '8px',
          fontSize: '12px',
          cursor: 'pointer'
        }}
      >
        📱 Test Responsive
      </button>
    );
  }

  return (
    <div style={{
      position: 'fixed',
      bottom: '16px',
      left: '16px',
      right: '16px',
      zIndex: 9999,
      backgroundColor: 'rgba(0, 0, 0, 0.9)',
      color: 'white',
      border: '1px solid white',
      padding: '16px',
      fontSize: '12px',
      fontFamily: 'monospace',
      maxWidth: '400px'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
        <span>Responsive Design Test</span>
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
      
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '11px' }}>
        <div>Width: {viewport.width}px</div>
        <div>Height: {viewport.height}px</div>
        <div>Orientation: {viewport.orientation}</div>
        <div>Device: {viewport.deviceType}</div>
      </div>

      <div style={{ marginTop: '12px', fontSize: '11px' }}>
        <div style={{ marginBottom: '4px' }}>Responsive Classes Active:</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
          {viewport.width < 481 && (
            <span style={{ backgroundColor: 'red', padding: '2px 4px', borderRadius: '2px' }}>
              Mobile
            </span>
          )}
          {viewport.width >= 481 && viewport.width < 769 && (
            <span style={{ backgroundColor: 'orange', padding: '2px 4px', borderRadius: '2px' }}>
              Tablet
            </span>
          )}
          {viewport.width >= 769 && (
            <span style={{ backgroundColor: 'green', padding: '2px 4px', borderRadius: '2px' }}>
              Desktop
            </span>
          )}
          {viewport.orientation === 'landscape' && viewport.height < 500 && (
            <span style={{ backgroundColor: 'blue', padding: '2px 4px', borderRadius: '2px' }}>
              Landscape-Small
            </span>
          )}
        </div>
      </div>

      <div style={{ marginTop: '12px', fontSize: '11px' }}>
        <div>Test Elements:</div>
        <div className="responsive-button" style={{ 
          backgroundColor: 'var(--color-green)', 
          color: 'var(--color-black)',
          marginTop: '4px',
          width: '100%'
        }}>
          Responsive Button
        </div>
        <div className="text-responsive-small" style={{ marginTop: '4px' }}>
          Responsive Text (Small)
        </div>
        <div className="f1-light-responsive" style={{ 
          marginTop: '4px',
          backgroundColor: '#ff0000',
          display: 'inline-block'
        }}></div>
      </div>
    </div>
  );
};