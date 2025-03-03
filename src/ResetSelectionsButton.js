// ResetSelectionsButton.js
import React, { useContext } from "react";
import { InteractionContext } from "./InteractionContext";
import * as d3 from "d3";

function ResetSelectionsButton() {
  const { resetSelections } = useContext(InteractionContext);

  const handleReset = () => {
    // Reset all interaction states
    resetSelections();
    // Remove any cloned nodes created via drag-drop
    d3.select("body").selectAll(".cloned-node-div").remove();
    d3.selectAll(".copied-node-container").each(function(d) {
      if (d && d.originalNode) {
        d3.select(d.originalNode).style("opacity", null);
      }
    });
    d3.select("body").selectAll(".copied-node-container").remove();
  };

  return (
    <button onClick={handleReset} style={{ padding: "10px", fontSize: "16px" }}>
      Reset Selections
    </button>
  );
}

export default ResetSelectionsButton;