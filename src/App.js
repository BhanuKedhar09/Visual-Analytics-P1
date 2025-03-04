// App.js
import React from "react";
import "./App.css";
import { DataProvider } from "./DataLoader";
import { InteractionProvider } from "./InteractionContext";
import TimeHistogram from "./TimeHistogram";
import GeographicHeatmap from "./GeographicHeatmap";
import SankeyFourColumns from "./SankeyFourColumns";
import ResetSelectionsButton from "./ResetSelectionsButton";
import SleekWidget from "./SleekWidget";
import CircleBipartite from "./CircleBipartite";
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
          {/* Place the Reset Button somewhere visible */}
          <div
            style={{ position: "absolute", top: 10, right: 10, zIndex: 1000 }}
          >
            <ResetSelectionsButton />
          </div>
          <SleekWidget
            title="Stacked Chart"
            initialWidth={1110}
            initialHeight={300}
            initialX={0}
            initialY={0}
          >
            <TimeHistogram
              id="time-graph"
              className="drop-zone"
              width={1110}
              height={300}
            />
          </SleekWidget>
          <SleekWidget
            title="Geographic Heatmap"
            initialWidth={500}
            initialHeight={400}
            initialX={0}
            initialY={320}
          >
            <GeographicHeatmap
              id="geo-map"
              className="drop-zone"
              width={500}
              height={400}
            />
          </SleekWidget>
          <SleekWidget
            title="Radial Network"
            initialWidth={600}
            initialHeight={600}
            initialX={510}
            initialY={320}
          >
            <CircleBipartite
              width={600}
              height={550}
              innerRadius={150}
              outerRadius={250}
              minFreq={2} // or 3 or 5
            />
          </SleekWidget>
          <SleekWidget
            title="State → City → Occupation → Merchant"
            initialWidth={440}
            initialHeight={950}
            initialX={1120}
            initialY={1}
          >
            <SankeyFourColumns
              minFlow={2}
              maxMerchants={30}
              nodeWidthPx={10}
              nodePaddingPx={20}
            />
          </SleekWidget>
        </div>
      </InteractionProvider>
    </DataProvider>
  );
}

export default App;
