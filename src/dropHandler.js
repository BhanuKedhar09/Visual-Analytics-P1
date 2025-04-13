import { InteractionContext } from "./InteractionContext";
import { useContext } from "react";

// Note: Since drop handling needs access to the context setters,
// we implement a function that accepts the context setters as parameters
// and returns a drop handler. This way, each component can call this
// function with its context values.
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
  // New: Circle Bipartite filter setter (passed in from the component)
  setCircleFilters = () => {}, // Default to empty function if not provided
  // NEW: Direct dropped item state setter
  setDroppedItem = () => {}, // Default to empty function if not provided
}) {
  return function handleDrop(nodeData, containerBox, dropZone) {
    // FOCUSED DEBUG: Log the node data and drop zone at entry point
    if (dropZone?.id === "circle-bipartite") {
      console.log("DROP HANDLER ENTRY:", { 
        nodeType: nodeData.type,
        hasCity: !!nodeData.city,
        city: nodeData.city,
        dropZoneId: dropZone?.id
      });
    }
    
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
      // Clear any time graph and sankey highlights
      setTimeHighlightedState(null);
      setTimeHighlightedCity(null);
      setSankeyHighlightedState(null);
      setSankeyHighlightedCity(null);
      if (nodeData.type === "sankeyNode") {
        if (nodeData.layer === 0) {
          setHighlightedState(nodeData.name);
        } else if (nodeData.layer === 1) {
          setHighlightedCity(nodeData.name);
        }
      }
    } else if (dropZone.id === "time-graph") {
      setHighlightedState(null);
      setHighlightedCity(null);
      setTimeHighlightedState(null);
      setTimeHighlightedCity(null);
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
    // Process drop for CircleBipartite view
    else if (dropZone.id === "circle-bipartite") {
      console.log("DROP HANDLER - Setting droppedItem for CircleBipartite");
      
      // Clear other highlights if needed
      setHighlightedState(null);
      setHighlightedCity(null);
      setTimeHighlightedState(null);
      setTimeHighlightedCity(null);
      setSankeyHighlightedState(null);
      setSankeyHighlightedCity(null);

      // NEW: Simply update the droppedItem state directly
      // with the raw nodeData - let CircleBipartite handle filtering
      setDroppedItem({
        data: nodeData,
        dropZone: "circle-bipartite",
        timestamp: Date.now()
      });
      
      // Original filter logic kept for backward compatibility
      try {
        if (nodeData.type === "geoCircle") {
          // FOCUSED DEBUG: Log the exact city value we're filtering by
          console.log("SETTING FILTER - City value:", nodeData.city);
          
          const filter = {
            type: "city",
            value: nodeData.city,
            label: `City: ${nodeData.city}`,
            _updatedAt: Date.now()
          };
          
          console.log("FINAL FILTER OBJECT:", filter);
          setCircleFilters(filter);
        } else if (nodeData.type === "sankeyNode") {
          if (nodeData.layer === 0) {
            setCircleFilters({
              type: "state",
              value: nodeData.name,
              label: `State: ${nodeData.name}`,
              _updatedAt: Date.now()
            });
          } else if (nodeData.layer === 1) {
            setCircleFilters({
              type: "city",
              value: nodeData.name,
              label: `City: ${nodeData.name}`,
              _updatedAt: Date.now()
            });
          } else if (nodeData.layer === 2) {
            setCircleFilters({
              type: "occupation",
              value: nodeData.name,
              label: `Occupation: ${nodeData.name}`,
              _updatedAt: Date.now()
            });
          } else if (nodeData.layer === 3) {
            setCircleFilters({
              type: "merchant",
              value: nodeData.name,
              label: `Merchant: ${nodeData.name}`,
              _updatedAt: Date.now()
            });
          }
        } else if (nodeData.type === "timeBar") {
          const dateStr = nodeData.date ? nodeData.date.toLocaleDateString() : "Unknown date";
          setCircleFilters({
            type: "date",
            value: nodeData.date,
            label: `Date: ${dateStr}`,
            _updatedAt: Date.now()
          });
        } else {
          console.log("Unknown node type:", nodeData.type);
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