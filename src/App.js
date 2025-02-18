// // App.js
// import React, { useContext, useState } from 'react';
// import './App.css';
// import { DataProvider } from './DataLoader';
// import { InteractionProvider, InteractionContext } from './InteractionContext';
// import TimeHistogram from './TimeHistogram';
// import GeographicHeatmap from './GeographicHeatmap';
// import RadialNetworkPlaceholder from './RadialNetworkPlaceholder';
// import AIChatPlaceholder from './AIChatPlaceholder';
// import SleekWidget from './SleekWidget';

// function App() {
//   const [showAIChat, setShowAIChat] = useState(true);
//   const [showStackedChart, setShowStackedChart] = useState(true);
//   const [showMap, setShowMap] = useState(true);
//   const [showRadial, setShowRadial] = useState(true);

//   return (
//     <DataProvider>
//       <InteractionProvider>
//         <div className="App" style={{ width: '100%', height: '100vh', position: 'relative', padding: '10px' }}>
//           <h1>My Visual Analytics App</h1>

//           {/* The reset button in the top-right */}
//           <div style={{ position: 'absolute', top: 10, right: 10 }}>
//             <ResetSelectionsButton />
//           </div>

//           {showAIChat && (
//             <SleekWidget
//               title="AI Chat"
//               initialWidth={400}
//               initialHeight={850}
//               initialX={20}
//               initialY={0}
//               onClose={() => setShowAIChat(false)}
//             >
//               <AIChatPlaceholder />
//             </SleekWidget>
//           )}

//           {showStackedChart && (
//             <SleekWidget
//               title="Stacked Chart"
//               initialWidth={1000}
//               initialHeight={300}
//               initialX={440}
//               initialY={0}
//               onClose={() => setShowStackedChart(false)}
//             >
//               <TimeHistogram />
//             </SleekWidget>
//           )}

//           {showMap && (
//             <SleekWidget
//               title="Geographic Heatmap"
//               initialWidth={600}
//               initialHeight={400}
//               initialX={440}
//               initialY={320}
//               onClose={() => setShowMap(false)}
//             >
//               <GeographicHeatmap />
//             </SleekWidget>
//           )}

//           {showRadial && (
//             <SleekWidget
//               title="Radial Network"
//               initialWidth={600}
//               initialHeight={400}
//               initialX={1060}
//               initialY={320}
//               onClose={() => setShowRadial(false)}
//             >
//               <RadialNetworkPlaceholder />
//             </SleekWidget>
//           )}
//         </div>
//       </InteractionProvider>
//     </DataProvider>
//   );
// }

// // A small component to call resetSelections()
// function ResetSelectionsButton() {
//   const { resetSelections } = useContext(InteractionContext);
//   return (
//     <button onClick={resetSelections}>
//       Reset Selections
//     </button>
//   );
// }

// export default App;



// App.js
import React, { useContext } from 'react';
import './App.css';
import { DataProvider } from './DataLoader';
import { InteractionProvider, InteractionContext } from './InteractionContext';
import TimeHistogram from './TimeHistogram';
import GeographicHeatmap from './GeographicHeatmap';
import RadialNetworkPlaceholder from './RadialNetworkPlaceholder';
import AIChatPlaceholder from './AIChatPlaceholder';
import SleekWidget from './SleekWidget';

function App() {
  return (
    <DataProvider>
      <InteractionProvider>
        <div className="App" style={{ width: '100%', height: '100vh', position: 'relative', padding: '10px' }}>
          <h1>My Visual Analytics App</h1>

          {/* Reset button top-right */}
          <div style={{ position: 'absolute', top: 10, right: 10 }}>
            <ResetSelectionsButton />
          </div>

          {/* AI Chat Widget */}
          <SleekWidget
            title="AI Chat"
            initialWidth={400}
            initialHeight={850}
            initialX={20}
            initialY={0}
          >
            <AIChatPlaceholder />
          </SleekWidget>

          {/* Stacked Chart Widget */}
          <SleekWidget
            title="Stacked Chart"
            initialWidth={1000}
            initialHeight={300}
            initialX={440}
            initialY={0}
          >
            <TimeHistogram />
          </SleekWidget>

          {/* Geographic Heatmap Widget */}
          <SleekWidget
            title="Geographic Heatmap"
            initialWidth={600}
            initialHeight={400}
            initialX={440}
            initialY={320}
          >
            <GeographicHeatmap />
          </SleekWidget>

          {/* Radial Network Widget */}
          <SleekWidget
            title="Radial Network"
            initialWidth={600}
            initialHeight={400}
            initialX={1060}
            initialY={320}
          >
            <RadialNetworkPlaceholder />
          </SleekWidget>
        </div>
      </InteractionProvider>
    </DataProvider>
  );
}

function ResetSelectionsButton() {
  const { resetSelections } = useContext(InteractionContext);
  return (
    <button onClick={resetSelections}>
      Reset Selections
    </button>
  );
}

export default App;