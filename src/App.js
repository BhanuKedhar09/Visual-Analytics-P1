// App.js
import React, { useState } from 'react';
import './App.css';
// import DataStatus from './DataStatus';
import TimeHistogram from './TimeHistogram';
import GeographicHeatmap from './GeographicHeatmap';
import SleekWidget from './SleekWidget';
import AIChatPlaceholder from './AIChatPlaceholder';
import RadialNetworkPlaceholder from './RadialNetworkPlaceholder';

function App() {
  const [showAIChat, setShowAIChat] = useState(true);
  const [showStackedChart, setShowStackedChart] = useState(true);
  const [showMap, setShowMap] = useState(true);
  const [showRadial, setShowRadial] = useState(true);

  return (
    <div className="App" style={{ width: '100%', height: '100vh', position: 'relative', padding: '10px' }}>
      <h1>My Visual Analytics App</h1>
      {/* <DataStatus /> */}

      {/* AI Chat on the left */}
      {showAIChat && (
        <SleekWidget
          title="AI Chat"
          initialWidth={400}
          initialHeight={850}
          initialX={20}
          initialY={0}
          onClose={() => setShowAIChat(false)}
        >
          <AIChatPlaceholder />
        </SleekWidget>
      )}

      {/* Stacked Chart top-right */}
      {showStackedChart && (
        <SleekWidget
          title="Stacked Chart"
          initialWidth={1000}
          initialHeight={300}
          initialX={440}
          initialY={0}
          onClose={() => setShowStackedChart(false)}
        >
          <TimeHistogram />
        </SleekWidget>
      )}

      {/* Map in the middle (below the chart) */}
      {showMap && (
        <SleekWidget
          title="Geographic Heatmap"
          initialWidth={600}
          initialHeight={400}
          initialX={440}
          initialY={320}
          onClose={() => setShowMap(false)}
        >
          <GeographicHeatmap />
        </SleekWidget>
      )}

      {/* Radial Network bottom-right */}
      {showRadial && (
        <SleekWidget
          title="Radial Network"
          initialWidth={600}
          initialHeight={400}
          initialX={1060}
          initialY={320}
          onClose={() => setShowRadial(false)}
        >
          <RadialNetworkPlaceholder />
        </SleekWidget>
      )}
    </div>
  );
}

export default App;

