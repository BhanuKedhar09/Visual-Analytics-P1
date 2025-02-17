// RadialNetworkPlaceholder.js
import React from 'react';

function RadialNetworkPlaceholder({ width, height }) {
  return (
    <div style={{ width, height, border: '2px dashed #999', 
      display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <h3>Radial Network Goes Here</h3>
    </div>
  );
}

export default RadialNetworkPlaceholder;