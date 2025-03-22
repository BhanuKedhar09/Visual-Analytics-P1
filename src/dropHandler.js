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
    console.log(
      "Common dropHandler received:",
      nodeData,
      containerBox,
      dropZone
    );
    if (!dropZone) {
      console.log("No drop zone detected—resetting all highlights.");
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
      // setSankeyHighlightedState(null);
      // setSankeyHighlightedCity(null);
      if (nodeData.type === "geoCircle") {
        // console.log("GeoMap circle dropped on geo-map. Setting map highlights");
        setHighlightedState(nodeData.state);
        setHighlightedCity(nodeData.city);
      } else if (nodeData.type === "sankey") {
        // For other types (e.g., from Sankey), use layer property.
        if (nodeData.layer === 0) {
          console.log("Setting map highlightedState =>", nodeData.name);
          setHighlightedState(nodeData.name);
        } else if (nodeData.layer === 1) {
          console.log("Setting map highlightedCity =>", nodeData.name);
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
        console.log(
          "GeoMap circle dropped on time-graph. Setting timeHighlightedCity =>",
          nodeData.city
        );
        setTimeHighlightedCity(nodeData.city);
      } else {
        if (nodeData.layer === 0) {
          console.log("Setting timeHighlightedState =>", nodeData.name);
          setTimeHighlightedState(nodeData.name);
        } else if (nodeData.layer === 1) {
          console.log("Setting timeHighlightedCity =>", nodeData.name);
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
        console.log(
          "GeoMap circle dropped on sankey. Setting sankey highlights =>",
          nodeData.state_full,
          nodeData.city
        );
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
