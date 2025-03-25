import React, { useContext } from "react";
import { InteractionContext, LinkDisplayMode } from "./InteractionContext";

const LinkModeToggle = () => {
  const { linkDisplayMode, setLinkDisplayMode } = useContext(InteractionContext);

  const handleModeChange = (mode) => {
    setLinkDisplayMode(mode);
  };

  return (
    <div 
      style={{
        display: "flex",
        alignItems: "center",
        background: "#f0f0f0",
        padding: "8px 12px",
        borderRadius: "6px",
        boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
        marginLeft: "10px"
      }}
    >
      <span style={{ marginRight: "10px", fontWeight: "bold", fontSize: "14px" }}>
        Links:
      </span>
      <div style={{ display: "flex", borderRadius: "4px", overflow: "hidden" }}>
        <button
          onClick={() => handleModeChange(LinkDisplayMode.HIGHLIGHT_ONLY)}
          style={{
            padding: "6px 10px",
            background: linkDisplayMode === LinkDisplayMode.HIGHLIGHT_ONLY ? "#4E79A7" : "#e0e0e0",
            color: linkDisplayMode === LinkDisplayMode.HIGHLIGHT_ONLY ? "white" : "black",
            border: "none",
            cursor: "pointer",
            fontSize: "13px",
            fontWeight: linkDisplayMode === LinkDisplayMode.HIGHLIGHT_ONLY ? "bold" : "normal",
            borderRight: "1px solid #ccc"
          }}
          title="Only highlight elements without drawing connecting lines"
        >
          Highlight
        </button>
        
        <button
          onClick={() => handleModeChange(LinkDisplayMode.DIRECT_LINKS)}
          style={{
            padding: "6px 10px",
            background: linkDisplayMode === LinkDisplayMode.DIRECT_LINKS ? "#4E79A7" : "#e0e0e0",
            color: linkDisplayMode === LinkDisplayMode.DIRECT_LINKS ? "white" : "black",
            border: "none",
            cursor: "pointer",
            fontSize: "13px",
            fontWeight: linkDisplayMode === LinkDisplayMode.DIRECT_LINKS ? "bold" : "normal",
            borderRight: "1px solid #ccc"
          }}
          title="Draw direct links between related elements"
        >
          Links
        </button>
        
        <button
          onClick={() => handleModeChange(LinkDisplayMode.LOOP_LINKS)}
          style={{
            padding: "6px 10px",
            background: linkDisplayMode === LinkDisplayMode.LOOP_LINKS ? "#4E79A7" : "#e0e0e0",
            color: linkDisplayMode === LinkDisplayMode.LOOP_LINKS ? "white" : "black",
            border: "none",
            cursor: "pointer",
            fontSize: "13px",
            fontWeight: linkDisplayMode === LinkDisplayMode.LOOP_LINKS ? "bold" : "normal"
          }}
          title="Show circular connections between all related elements"
        >
          Loop
        </button>
      </div>
    </div>
  );
};

export default LinkModeToggle; 