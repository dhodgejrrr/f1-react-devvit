import './index.css';

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';

// Simple initialization without complex dependencies
const initializeApp = () => {
  console.log('main.tsx: initializeApp called');
  
  let rootElement = document.getElementById('root');
  
  if (!rootElement) {
    console.error('Root element not found, creating one');
    // Create and append to body directly
    rootElement = document.createElement('div');
    rootElement.id = 'app-root';
    rootElement.style.width = '100%';
    rootElement.style.height = '100vh';
    rootElement.style.position = 'absolute';
    rootElement.style.top = '0';
    rootElement.style.left = '0';
    
    // Clear body and add our element
    document.body.innerHTML = '';
    document.body.appendChild(rootElement);
    console.log('Created new root element and appended to body');
  }
  
  console.log('main.tsx: Root element available, creating React root');
  renderApp(rootElement);
};

const renderApp = (rootElement: HTMLElement) => {
  try {
    // Create React root and render app
    createRoot(rootElement).render(
      <StrictMode>
        <App />
      </StrictMode>
    );
    console.log('main.tsx: React app rendered successfully');
  } catch (error) {
    console.error('main.tsx: Error rendering React app:', error);
    document.body.innerHTML = '<div style="color: white; font-size: 20px; padding: 20px;">ERROR RENDERING REACT APP: ' + error + '</div>';
  }
};

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  console.log('main.tsx: DOM is loading, adding DOMContentLoaded listener');
  document.addEventListener('DOMContentLoaded', initializeApp);
} else {
  console.log('main.tsx: DOM already loaded, initializing immediately');
  initializeApp();
}
