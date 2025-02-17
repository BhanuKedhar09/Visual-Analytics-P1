// AIChatPlaceholder.js
import React from 'react';

function AIChatPlaceholder({ width, height }) {
  return (
    <div style={{ width, height, border: '2px dashed #999', 
      display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <h3>AI Chat Goes Here</h3>
    </div>
  );
}

export default AIChatPlaceholder;