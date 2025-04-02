import React from "react";
import "./App.css";
import { DataProvider } from "./DataLoader";
import { InteractionProvider } from "./InteractionContext";
import { WindowProvider } from "./WindowContext";
import TimeHistogram from "./TimeHistogram";
import GeographicHeatmap from "./GeographicHeatmap";
import SankeyFourColumns from "./SankeyFourColumns";
import ResetSelectionsButton from "./ResetSelectionsButton";
import SleekWidget from "./SleekWidget";
import CircleBipartite from "./CircleBipartite";
import LineOverlay from "./LineOverlay";
import LinkModeToggle from "./LinkModeToggle";
import RelationshipLayerToggle from "./RelationshipLayerToggle";

function App() {
  return (
    <WindowProvider>
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
            {/* Controls area for buttons and toggles */}
            <div
              style={{ 
                position: "absolute", 
                top: 7, 
                right: 25, 
                zIndex: 1000, 
                display: "flex",
                alignItems: "center"
              }}
            >
              <LinkModeToggle />
              <ResetSelectionsButton />
            </div>
            <SleekWidget
              title="Stacked Chart"
              initialWidth={1210}
              initialHeight={300}
              initialX={0}
              initialY={610}
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
              initialWidth={600}
              initialHeight={500}
              initialX={610}
              initialY={0}
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
              initialX={0}
              initialY={0}            
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
              initialWidth={600}  //440
              initialHeight={1200} //950
              initialX={1220}
              initialY={1}
            >
              <SankeyFourColumns
                id="sankey"
                className="drop-zone"
                maxMerchants={40}
              />
            </SleekWidget>
            <LineOverlay /> {/* NEW: Overlay for drawing cross-view linking lines */}
            <RelationshipLayerToggle />
          </div>
        </InteractionProvider>
      </DataProvider>
    </WindowProvider>
  );
}

export default App;