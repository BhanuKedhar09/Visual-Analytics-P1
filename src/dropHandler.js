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
  // New: Circle Bipartite filter setter
  setCircleFilters = () => {}, // Default empty function if not provided
}) {
  return function handleDrop(nodeData, containerBox, dropZone) {
    console.log("dropHandler: handleDrop called with nodeData:", nodeData);
    console.log("dropHandler: dropZone:", dropZone?.id);
    
    if (!dropZone) {
      console.log("dropHandler: No drop zone found, clearing highlights");
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
    // New condition for CircleBipartite
    else if (dropZone.id === "circle-bipartite") {
      console.log("dropHandler: Processing drop on CircleBipartite");
      
      // Clear other highlights if needed
      setHighlightedState(null);
      setHighlightedCity(null);
      setTimeHighlightedState(null);
      setTimeHighlightedCity(null);
      setSankeyHighlightedState(null);
      setSankeyHighlightedCity(null);

      // Apply filter based on node type
      try {
        if (nodeData.type === "geoCircle") {
          // Filter by city
          console.log("dropHandler: Setting circle filter to city:", nodeData.city);
          setCircleFilters({
            type: "city",
            value: nodeData.city,
            label: `City: ${nodeData.city}`
          });
        } else if (nodeData.type === "sankeyNode") {
          if (nodeData.layer === 0) {
            // Filter by state
            console.log("dropHandler: Setting circle filter to state:", nodeData.name);
            setCircleFilters({
              type: "state",
              value: nodeData.name,
              label: `State: ${nodeData.name}`
            });
          } else if (nodeData.layer === 1) {
            // Filter by city from Sankey
            console.log("dropHandler: Setting circle filter to city from Sankey:", nodeData.name);
            setCircleFilters({
              type: "city",
              value: nodeData.name,
              label: `City: ${nodeData.name}`
            });
          } else if (nodeData.layer === 2) {
            // Filter by occupation
            console.log("dropHandler: Setting circle filter to occupation:", nodeData.name);
            setCircleFilters({
              type: "occupation",
              value: nodeData.name,
              label: `Occupation: ${nodeData.name}`
            });
          } else if (nodeData.layer === 3) {
            // Filter by merchant
            console.log("dropHandler: Setting circle filter to merchant:", nodeData.name);
            setCircleFilters({
              type: "merchant",
              value: nodeData.name,
              label: `Merchant: ${nodeData.name}`
            });
          }
        } else if (nodeData.type === "timeBar") {
          // Filter by date
          const dateStr = nodeData.date ? nodeData.date.toLocaleDateString() : "Unknown date";
          console.log("dropHandler: Setting circle filter to date:", dateStr);
          setCircleFilters({
            type: "date",
            value: nodeData.date,
            label: `Date: ${dateStr}`
          });
        } else {
          console.log("dropHandler: Unknown node type:", nodeData.type);
        }
      } catch (error) {
        console.error("Error setting circle filters:", error);
        console.log("Problem nodeData:", nodeData);
      }
    } else {
      console.log("dropHandler: Unknown drop zone ID:", dropZone.id);
    }
  };
}
