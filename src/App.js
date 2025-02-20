// App.js (updated with RadialNetwork)
import React from "react";
import "./App.css";
import { DataProvider } from "./DataLoader";
import { InteractionProvider } from "./InteractionContext";
import TimeHistogram from "./TimeHistogram";
import GeographicHeatmap from "./GeographicHeatmap";
// import RadialNetwork from "./RadialNetwork"; // Updated component
import AIChatPlaceholder from "./AIChatPlaceholder";
import SleekWidget from "./SleekWidget";
import RadialNetwork from "./RadialNetwork";
import BipartiteForceNetwork from "./BipartiteForceNetwork";
import CircleBipartite from "./CircleBipartite";
// import FourLevelSankey from "./FourLevelSankey";
// import TwoLevelSankey from "./TwoLevelSankey";
// import BasicSankey from "./BasicSankey";
// import StateCitySankey from "./StateCitySankey";
// import StateCitySankeyDebug from "./StateCitySankeyDebug";
// import StateCitySankeyTwoColumns from "./StateCitySankeyTwoColumns";
import StateCitySankeySorted from "./StateCitySankeySorted";
import SankeyFourColumns from "./SankeyFourColumns";

function App() {
  return (
    <DataProvider>
      <InteractionProvider>
        <div
          className="App"
          style={{
            width: "100%",
            height: "100vh",
            position: "relative",
            padding: "10px",
          }}
        >
          <h1>My Visual Analytics App</h1>
          {/* Reset button top-right */}
          <div style={{ position: "absolute", bottom: 50, left: 10 }}>
            <ResetSelectionsButton />
          </div>
          <SleekWidget
            title="AI Chat"
            initialWidth={400}
            initialHeight={850}
            initialX={20}
            initialY={0}
          >
            <AIChatPlaceholder />
          </SleekWidget>
          <SleekWidget
            title="Stacked Chart"
            initialWidth={1000}
            initialHeight={300}
            initialX={440}
            initialY={0}
          >
            <TimeHistogram />
          </SleekWidget>
          <SleekWidget
            title="Geographic Heatmap"
            initialWidth={500}
            initialHeight={400}
            initialX={440}
            initialY={320}
          >
            <GeographicHeatmap />
          </SleekWidget>
          <SleekWidget
            title="Radial Network"
            initialWidth={600}
            initialHeight={600}
            initialX={950}
            initialY={320}
          >
            <CircleBipartite
              width={600}
              height={600}
              innerRadius={200}
              outerRadius={300}
              minFreq={2} // or 3 or 5
            />
          </SleekWidget>
          <SleekWidget
            title="State → City → Occupation → Merchant"
            initialWidth={440}
            initialHeight={950}
            initialX={1450}
            initialY={1}
          >
            <SankeyFourColumns
              minFlow={2}
              maxMerchants={30} // instead of 20
              nodeWidthPx={10}
              nodePaddingPx={20}
            />
          </SleekWidget>
        </div>
      </InteractionProvider>
    </DataProvider>
  );
}

function ResetSelectionsButton() {
  // If you wish to add reset functionality for interactions later
  // you can include it here using the InteractionContext.
  return <button onClick={() => {}}>Reset Selections</button>;
}

export default App;
