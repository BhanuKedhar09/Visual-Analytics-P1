// dropHandler.js
import { InteractionContext } from "./InteractionContext";
import { useContext } from "react";

// Note: Since drop handling needs access to the context setters, we implement
// a function that accepts the context setters as parameters and returns a drop handler.
// This way, each component can call this function with its context values.

export function createDropHandler({
  // Map view highlight setters:
  setHighlightedState,
  setHighlightedCity,
  // Time graph highlight setters:
  setTimeHighlightedState,
  setTimeHighlightedCity,
  sankeyHighlightedState,
  setSankeyHighlightedState,
  sankeyHighlightedCity,
  setSankeyHighlightedCity,
}) {
  return function handleDrop(nodeData, containerBox, dropZone) {
    if (!dropZone) {
      setHighlightedState(null);
      setHighlightedCity(null);
      setTimeHighlightedState(null);
      setTimeHighlightedCity(null);
      setSankeyHighlightedState(null);
      setSankeyHighlightedCity(null);
      return;
    }

    // Use dropZone.id to determine which view is the target.
    if (dropZone.id === "geo-map") {
      // Clear any time graph highlights
      setTimeHighlightedState(null);
      setTimeHighlightedCity(null);
      // Clear any sankey highlights
      setSankeyHighlightedState(null);
      setSankeyHighlightedCity(null);
      if (nodeData.type === "sankeyNode") {
        // For other types (e.g., from Sankey), use layer property.
        if (nodeData.layer === 0) {
          setHighlightedState(nodeData.name);
        } else if (nodeData.layer === 1) {
          setHighlightedCity(nodeData.name);
        }
      }
    } else if (dropZone.id === "time-graph") {
      // Clear map highlights
      setHighlightedState(null);
      setHighlightedCity(null);
      setTimeHighlightedState(null);
      setTimeHighlightedCity(null);
    //   setSankeyHighlightedState(null);
      setSankeyHighlightedState(null);
      setSankeyHighlightedCity(null);
      if (nodeData.type === "geoCircle") {
        setTimeHighlightedCity(nodeData.city);
      } else {
        if (nodeData.layer === 0) {
          setTimeHighlightedState(nodeData.name);
        } else if (nodeData.layer === 1) {
          setTimeHighlightedCity(nodeData.name);
        }
      }
    } else if (dropZone.id === "sankey") {
      // Clear other highlights if needed
      setHighlightedState(null);
      setHighlightedCity(null);
      setTimeHighlightedState(null);
      setTimeHighlightedCity(null);
      setSankeyHighlightedState(null);
      setSankeyHighlightedCity(null);
      if (nodeData.type === "geoCircle") {
        setSankeyHighlightedState(nodeData.state);
        setSankeyHighlightedCity(nodeData.city);
      } else {
        if (nodeData.layer === 0) {
          setSankeyHighlightedState(nodeData.name);
        } else if (nodeData.layer === 1) {
          setSankeyHighlightedCity(nodeData.name);
        }
      }
    }
  };
}
