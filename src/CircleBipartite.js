// CircleBipartite.js
import React, { useRef, useEffect, useContext, useState } from "react";
import * as d3 from "d3";
import { DataContext } from "./DataLoader";
import { InteractionContext } from "./InteractionContext";
import { createDropHandler } from "./dropHandler";

/**
 * A bipartite "two-ring" circular layout:
 * - City nodes on an inner circle (radius=200).
 * - Merchant nodes on an outer circle (radius=300).
 * - Link thickness scaled by transaction frequency.
 *
 * No force simulation. We manually compute (x,y) for each node in a circle.
 */
function CircleBipartite({
  width = 600,
  height = 600,
  innerRadius = 200,
  outerRadius = 300,
  minFreq = 2, // hide city-merchant pairs with freq < minFreq
  id = "circle-bipartite", // Add ID for drop zone
  className = "drop-zone", // Add class for drop zone
}) {
  const { data } = useContext(DataContext);
  const { circleFilters, setCircleFilters } = useContext(InteractionContext);
  const svgRef = useRef(null);
  const [filteredData, setFilteredData] = useState(null);
  
  // Create custom drop handler for debugging
  const customDropHandler = (nodeData, containerBox, dropZone) => {
    console.log("CircleBipartite: Element dropped with data:", nodeData);
    console.log("CircleBipartite: Drop zone:", dropZone?.id);
    
    if (dropZone?.id !== "circle-bipartite") {
      console.log("CircleBipartite: Drop rejected - not dropped on circle bipartite");
      return;
    }
    
    // Create the handler from dropHandler.js
    const handler = createDropHandler({
      setCircleFilters
    });
    
    // Call the handler
    handler(nodeData, containerBox, dropZone);
  };
  
  // Process filters and update filteredData
  useEffect(() => {
    if (!data || data.length === 0) return;
    
    if (!circleFilters) {
      // No filters, use all data
      setFilteredData(data);
      return;
    }
    
    console.log("CircleBipartite: Applying filter:", circleFilters);
    
    // Apply filter based on its type
    let filtered = data;
    
    switch(circleFilters.type) {
      case "city":
        console.log(`CircleBipartite: Filtering by city: ${circleFilters.value}`);
        filtered = data.filter(d => d.Location === circleFilters.value);
        break;
      case "state":
        console.log(`CircleBipartite: Filtering by state: ${circleFilters.value}`);
        filtered = data.filter(d => d.state_id === circleFilters.value);
        break;
      case "merchant":
        console.log(`CircleBipartite: Filtering by merchant: ${circleFilters.value}`);
        filtered = data.filter(d => d.MerchantID === circleFilters.value);
        break;
      case "occupation":
        console.log(`CircleBipartite: Filtering by occupation: ${circleFilters.value}`);
        filtered = data.filter(d => d.CustomerOccupation === circleFilters.value);
        break;
      case "date":
        if (circleFilters.value instanceof Date) {
          // Convert transaction date to day number
          const filterDayNum = +d3.timeDay(circleFilters.value);
          console.log(`CircleBipartite: Filtering by date: ${circleFilters.value.toLocaleDateString()} (day number: ${filterDayNum})`);
          
          filtered = data.filter(d => {
            const txDate = new Date(d.TransactionDate);
            const txDayNum = +d3.timeDay(txDate);
            return txDayNum === filterDayNum;
          });
        }
        break;
      default:
        console.log(`CircleBipartite: Unknown filter type: ${circleFilters.type}`);
        // Use all data if filter type is unknown
        filtered = data;
    }
    
    console.log(`CircleBipartite: Applied ${circleFilters.type} filter, data size: ${filtered.length}`);
    if (filtered.length === 0) {
      console.log("CircleBipartite: Warning - filter resulted in empty dataset");
    } else {
      console.log("CircleBipartite: Sample filtered data:", filtered.slice(0, 3));
    }
    
    setFilteredData(filtered);
  }, [data, circleFilters]);

  // Main visualization effect
  useEffect(() => {
    const dataToUse = filteredData || data;
    if (!dataToUse || dataToUse.length === 0) return;

    console.log(`CircleBipartite: Rendering with ${dataToUse.length} records`);

    // 1) Aggregate transactions by (City, Merchant) => frequency
    const pairCount = d3.rollup(
      dataToUse,
      (v) => v.length,
      (d) => d.Location,     // city
      (d) => d.MerchantID    // merchant
    );

    // Build sets for city, merchant
    const citySet = new Set();
    const merchantSet = new Set();
    const links = [];

    // Also track each city->merchant freq
    for (const [city, merchantsMap] of pairCount.entries()) {
      citySet.add(city);
      for (const [mer, freq] of merchantsMap.entries()) {
        merchantSet.add(mer);
        if (freq >= minFreq) {
          links.push({ city, mer, freq });
        }
      }
    }

    const cities = Array.from(citySet).sort();    // optional sort for stable layout
    const merchants = Array.from(merchantSet).sort();

    console.log(`CircleBipartite: Found ${cities.length} cities and ${merchants.length} merchants`);
    console.log(`CircleBipartite: Generated ${links.length} links`);

    // 2) We'll place city nodes on an inner circle, merchant nodes on an outer circle
    //    We store node objects with (x, y, radius, angle)
    const cityNodes = cities.map((c, i) => {
      const angle = (2 * Math.PI * i) / cities.length; // distribute evenly
      return {
        id: c,
        type: "city",
        angle,
        r: innerRadius,
      };
    });

    const merchantNodes = merchants.map((m, i) => {
      const angle = (2 * Math.PI * i) / merchants.length; // distribute evenly
      return {
        id: m,
        type: "merchant",
        angle,
        r: outerRadius,
      };
    });

    // Combine
    const nodes = [...cityNodes, ...merchantNodes];

    // 3) Link thickness scale
    const maxFreq = d3.max(links, (d) => d.freq) || 1;
    const linkWidthScale = d3.scaleSqrt().domain([1, maxFreq]).range([0.5, 4]);

    // 4) For quick lookup of node coords
    //    We'll store them in a map: nodeMap[nodeID] => { x, y }
    const nodeMap = {};
    // Convert polar to Cartesian
    nodes.forEach((nd) => {
      const x = nd.r * Math.cos(nd.angle);
      const y = nd.r * Math.sin(nd.angle);
      nodeMap[nd.id] = { ...nd, x, y };
    });

    // 5) Setup the SVG
    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    svg
      .attr("viewBox", [-width / 2, -height / 2, width, height])
      .attr("preserveAspectRatio", "xMidYMid meet");
      
    // Add filter indicator if filters are applied
    if (circleFilters) {
      svg.append("text")
        .attr("x", -width / 2 + 10)
        .attr("y", -height / 2 + 20)
        .attr("fill", "#333")
        .style("font-size", "12px")
        .style("font-weight", "bold")
        .text(`Filtered by: ${circleFilters.label}`);
      
      // Add reset button
      svg.append("text")
        .attr("x", -width / 2 + 10)
        .attr("y", -height / 2 + 40)
        .attr("fill", "#f44336")
        .style("font-size", "10px")
        .style("cursor", "pointer")
        .text("× Clear filter")
        .on("click", () => setCircleFilters(null));
    }

    // 6) Draw links
    const linkGroup = svg
      .append("g")
      .attr("stroke", "#999")
      .attr("stroke-opacity", 0.6);

    linkGroup
      .selectAll("line")
      .data(links)
      .enter()
      .append("line")
      .attr("stroke-width", (d) => linkWidthScale(d.freq))
      .attr("x1", (d) => nodeMap[d.city].x)
      .attr("y1", (d) => nodeMap[d.city].y)
      .attr("x2", (d) => nodeMap[d.mer].x)
      .attr("y2", (d) => nodeMap[d.mer].y);

    // 7) Draw nodes
    const nodeGroup = svg.append("g").attr("stroke", "#fff").attr("stroke-width", 1.5);

    nodeGroup
      .selectAll("circle")
      .data(nodes)
      .enter()
      .append("circle")
      .attr("r", 6)
      .attr("cx", (d) => nodeMap[d.id].x)
      .attr("cy", (d) => nodeMap[d.id].y)
      .attr("fill", (d) => (d.type === "city" ? "#4E79A7" : "#F28E2B"));

    // 8) Labels (optional, can be cluttered)
    const labelGroup = svg.append("g").attr("font-size", 10).attr("fill", "#333");

    labelGroup
      .selectAll("text")
      .data(nodes)
      .enter()
      .append("text")
      .text((d) => d.id)
      .attr("x", (d) => nodeMap[d.id].x)
      .attr("y", (d) => nodeMap[d.id].y)
      .attr("dx", 8)
      .attr("dy", "0.35em");

    // Drop zone indicator that appears when dragging starts
    const dropZoneOverlay = svg.append("rect")
      .attr("x", -width / 2)
      .attr("y", -height / 2)
      .attr("width", width)
      .attr("height", height)
      .attr("fill", "none")
      .attr("stroke", "#3498db")
      .attr("stroke-width", 3)
      .attr("stroke-dasharray", "10,5")
      .attr("rx", 10)
      .attr("ry", 10)
      .attr("opacity", 0);
      
    // Show drop zone when dragging starts (global event handled by App)
    const handleDragStart = (e) => {
      // Check if this is a filter drag by looking for dataTransfer data
      const dragData = e.dataTransfer?.getData("application/json");
      let isFilterDrag = false;
      
      if (dragData) {
        try {
          const data = JSON.parse(dragData);
          // If this is a filter drag operation, show the drop zone
          isFilterDrag = data.dragAction === "filter";
        } catch (err) {
          // If parsing fails, assume it's not a filter drag
          console.error("Error parsing drag data:", err);
        }
      }
      
      // Only show the visual feedback if it's a filter drag
      if (isFilterDrag) {
        dropZoneOverlay.transition().duration(300).attr("opacity", 0.5);
      } else {
        // For regular copy operations, don't show the blue outline
        dropZoneOverlay.attr("opacity", 0);
      }
    };
    
    const handleDragEnd = () => {
      dropZoneOverlay.transition().duration(300).attr("opacity", 0);
    };
    
    document.addEventListener("dragstart", handleDragStart);
    document.addEventListener("dragend", handleDragEnd);

    // No force simulation => no tick updates needed
    return () => {
      document.removeEventListener("dragstart", handleDragStart);
      document.removeEventListener("dragend", handleDragEnd);
    };
  }, [filteredData, data, width, height, innerRadius, outerRadius, minFreq, circleFilters, setCircleFilters]);

  // Setup drop zone event handlers
  const handleDragOver = (e) => {
    e.preventDefault();
  };
  
  return (
    <div 
      id={id}
      className={className}
      style={{ width: "100%", height: "100%" }}
      onDragOver={handleDragOver}
      onDrop={(e) => {
        e.preventDefault();
        console.log("DROP EVENT TRIGGERED on CircleBipartite");
        
        // Debug all available data transfer types
        const types = e.dataTransfer.types || [];
        console.log("Available dataTransfer types:", Array.from(types));
        
        // Extract data from the drop event
        try {
          const containerBox = svgRef.current.getBoundingClientRect();
          const dropZone = e.currentTarget;
          
          console.log("Drop zone found:", dropZone.id);
          
          // Try to get data from dataTransfer
          let jsonData = null;
          try {
            jsonData = e.dataTransfer.getData("application/json");
            console.log("CircleBipartite: Raw JSON data received:", jsonData);
          } catch (jsonError) {
            console.error("Error getting JSON data:", jsonError);
          }
          
          if (jsonData) {
            try {
              const nodeData = JSON.parse(jsonData);
              console.log("CircleBipartite: Successfully parsed node data:", nodeData);
              console.log("Node data type:", nodeData.type);
              console.log("Node data dragAction:", nodeData.dragAction);
              customDropHandler(nodeData, containerBox, dropZone);
            } catch (parseError) {
              console.error("Error parsing JSON:", parseError);
              console.log("Invalid JSON data:", jsonData);
            }
          } else {
            console.log("CircleBipartite: No JSON data found in drop event");
            console.log("dataTransfer object:", e.dataTransfer);
            
            // Try other formats as fallback
            if (e.dataTransfer.getData("text")) {
              console.log("Text data found:", e.dataTransfer.getData("text"));
            }
          }
        } catch (error) {
          console.error("Error handling drop in CircleBipartite:", error);
        }
      }}
    >
      <svg ref={svgRef} style={{ width: "100%", height: "100%" }} />
      {circleFilters && (
        <div style={{
          position: "absolute",
          top: 10,
          right: 10,
          background: "rgba(255,255,255,0.8)",
          padding: "5px 10px",
          borderRadius: "5px",
          fontSize: "12px",
          display: "flex",
          alignItems: "center",
          gap: "5px"
        }}>
          <span>{circleFilters.label}</span>
          <button
            onClick={() => setCircleFilters(null)}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              color: "#f44336",
              fontWeight: "bold",
              fontSize: "14px"
            }}
          >
            ×
          </button>
        </div>
      )}
    </div>
  );
}

export default CircleBipartite;