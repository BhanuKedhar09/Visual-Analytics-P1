// DropZone.js
import React, { useState, useEffect, useContext } from "react";
import * as d3 from "d3";
import { DataContext } from "./DataLoader";
import SankeyDiagram from "./SankeyDiagram";
function DropZone() {
  const [droppedItems, setDroppedItems] = useState([]);
  const [sankeyData, setSankeyData] = useState(null);
  const { data } = useContext(DataContext);
  const handleDrop = (event) => {
    event.preventDefault();
    const itemData = JSON.parse(event.dataTransfer.getData("text/plain"));
    setDroppedItems((prev) => {
      const updatedItems = [...prev, itemData];
      return updatedItems;
    });
  };

  const handleDragOver = (event) => {
    event.preventDefault();
  };

  useEffect(() => {
    if (droppedItems.length >= 2 && data) {
      const preparedData = prepareSankeyData(droppedItems, data);
      setSankeyData(preparedData);
    } else {
      setSankeyData(null);
    }
  }, [droppedItems, data]);

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        border: "2px dashed #ccc",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        position: "relative"
      }}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
    >
      {sankeyData ? (
        <SankeyDiagram sankeyData={sankeyData} width={800} height={600} />
      ) : droppedItems.length === 0 ? (
        <p>Drag elements here</p>
      ) : (
        <p>{droppedItems.length} items dropped. Compose your new view here.</p>
      )}
      {droppedItems.map((item, index) => (
        <div
          key={index}
          style={{
            position: "absolute",
            top: 10,
            left: 10 + index * 50,
            padding: 5,
            background: "lightgray",
            border: "1px solid black",
          }}
        >
          {item.type}: {item.value}
        </div>
      ))}
    </div>
  );
}
function prepareSankeyData(droppedItems, data) {
  // Determine the valid layers from the dropped items
  const validLayers = new Set();
  droppedItems.forEach((item) => {
    if (item.type === "state") validLayers.add(0);
    if (item.type === "city") validLayers.add(1);
  });

  // If there are no valid layers or less than two items, return early
  if (validLayers.size === 0 || droppedItems.length < 2) {
    return { nodes: [], links: [] };
  }

  // Find the highest valid layer
  let maxLayer = Math.max(...validLayers);

  // Build the filter from the dropped items
  const filter = {};
  droppedItems.forEach((item) => {
    if (item.type === "state") {
      filter.state = item.value;
    } else if (item.type === "city") {
      filter.city = item.value;
    }
  });

  // Filter the data based on the filter
  const filteredData = data.filter((d) => {
    if (filter.state && d.state_id !== filter.state) return false;
    if (filter.city && d.Location !== filter.city) return false;
    return true;
  });

  // Set the dimensions for the Sankey diagram
  const layers = maxLayer + 1;

  // Create a nodes array for the Sankey diagram
  const nodes = [];
  // Create links array for the Sankey diagram
  const links = [];
  // Set an empty filter to be updated
  const partialFilter = {};
  // Iterate through the layers
  for (let layer = 0; layer < layers; layer++) {
    // Switch based on the layer
    switch (layer) {
      case 0:
        // Get the values for layer 0
        let values0 = filteredData.map((d) => d.state_id);
        // If there is any dropped filter on this layer
        if (filter.state) {
          // Remove the other values of the current layer
          values0 = values0.filter((d) => d === filter.state);
        }
        // Remove the duplicates
        values0 = [...new Set(values0)];
        // Create the nodes
        values0.forEach((d) => {
          nodes.push({ id: d, layer: layer, name: d });
        });
        // If this is the last layer, skip the rest of the logic
        if (layer === maxLayer) break;
        // Update the filter for the next layer
        partialFilter.state = values0;
        break;
      case 1:
        // If there is not previous layer, skip the logic
        if (!partialFilter.state) break;
        // Get the values for layer 1
        let values1 = filteredData
          .filter((d) => partialFilter.state.includes(d.state_id))
          .map((d) => d.Location);
        // If there is any dropped filter on this layer
        if (filter.city) {
          // Remove the other values of the current layer
          values1 = values1.filter((d) => d === filter.city);
        }
        // Remove the duplicates
        values1 = [...new Set(values1)];
        // Create the nodes
        values1.forEach((d) => {
          nodes.push({ id: d, layer: layer, name: d });
        });
        // If this is the last layer, skip the rest of the logic
        if (layer === maxLayer) break;
        // Update the filter for the next layer
        partialFilter.city = values1;
        break;
    }
  }

  // Create the links array
  for (let layer = 0; layer < layers; layer++) {
    // Get the nodes of the current layer
    const layerNodes = nodes.filter((d) => d.layer === layer);
    // If this is the last layer, skip the logic
    if (layer === maxLayer) break;
    // Get the next layer
    const nextLayerNodes = nodes.filter((d) => d.layer === layer + 1);
    // If there is no next layer, skip the logic
    if (nextLayerNodes.length === 0) break;
    // Iterate through the nodes of the current layer
    layerNodes.forEach((source) => {
      // If the current source is a state
      if (source.layer === 0) {
        // Get the connected values
        const connected = filteredData
          .filter((d) => d.state_id === source.name)
          .map((d) => d.Location);
        // Iterate through the possible destination nodes
        nextLayerNodes.forEach((target) => {
          // If the target is connected to the source
          if (connected.includes(target.name)) {
            // Filter the data that matches the current link
            const matchedTransactions = filteredData.filter(
              (d) => d.state_id === source.name && d.Location === target.name
            );
            // Add the link
            links.push({
              source: source.id,
              target: target.id,
              value: matchedTransactions.length,
            });
          }
        });
      }
    });
  }
  // Return the nodes and links
  return { nodes, links };
}
export default DropZone;
