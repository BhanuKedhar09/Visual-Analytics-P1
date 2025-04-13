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
  const { circleFilters, setCircleFilters, droppedItem, setDroppedItem } = useContext(InteractionContext);
  const svgRef = useRef(null);
  const [filteredData, setFilteredData] = useState(null);
  const [updateCounter, setUpdateCounter] = useState(0); // Force re-render counter

  // NEW: Direct observer for droppedItem changes
  useEffect(() => {
    if (!droppedItem) return;
    
    console.log("DIRECT OBSERVATION - Received droppedItem:", droppedItem);
    
    // Check if this is a dragend action
    if (droppedItem.action === "dragend") {
      console.log("DIRECT OBSERVATION - Drag ended, clearing filter");
      setCircleFilters(null);
      setDroppedItem(null);
      return;
    }
    
    // Only process drops intended for this component
    if (droppedItem.dropZone !== "circle-bipartite") return;
    
    // Extract the node data
    const nodeData = droppedItem.data;
    
    // Process the drop based on node type
    if (nodeData.type === "geoCircle" && nodeData.city) {
      console.log("DIRECT OBSERVATION - Setting filter for city:", nodeData.city);
      
      // Create and apply the filter
      const filter = {
        type: "city",
        value: nodeData.city,
        label: `City: ${nodeData.city}`,
        timestamp: droppedItem.timestamp
      };
      
      // Set the filter
      setCircleFilters(filter);
      
      // Clear the droppedItem to prepare for the next drop
      setTimeout(() => {
        setDroppedItem(null);
      }, 100);
    }
  }, [droppedItem, setCircleFilters, setDroppedItem]);

  // Create custom drop handler for debugging
  const customDropHandler = (nodeData, containerBox, dropZone) => {
    // FOCUSED DEBUG: Log exactly what's being dropped
    console.log("DROPPED DATA:", {
      type: nodeData.type,
      city: nodeData.city,
      state: nodeData.state,
      fullData: nodeData
    });

    if (dropZone?.id !== "circle-bipartite") {
      return;
    }

    // CRITICAL FIX: Apply filter directly with the component's context reference
    // instead of creating a new handler with potentially different references
    if (nodeData.type === "geoCircle" && nodeData.city) {
      console.log("DIRECT FILTER APPLICATION - Bypassing drop handler layers");
      
      // Use the same format as the button for consistency
      const filter = {
        type: "city",
        value: nodeData.city,
        label: `City: ${nodeData.city}`
      };
      
      console.log("DIRECT FILTER - Setting:", filter);
      
      // Use the component's reference to setCircleFilters directly
      setCircleFilters(filter);
      
      // Add a timeout to check if the filter was applied
      setTimeout(() => {
        console.log("CHECKING FILTER STATE AFTER DROP:", circleFilters);
        
        // If filter wasn't applied, try again with force update
        if (!circleFilters || circleFilters.value !== nodeData.city) {
          console.log("EMERGENCY RETRY - Filter didn't apply, trying again");
          const retryFilter = {
            type: "city",
            value: nodeData.city,
            label: `City: ${nodeData.city}`,
            _forceUpdate: Date.now() // Add unique property to force state change
          };
          setCircleFilters(retryFilter);
          
          // Force a counter update to ensure re-render
          setUpdateCounter(prev => prev + 500);
        }
      }, 100);
      
      return;
    }

    // If we get here, fall back to the standard handler
    console.log("USING STANDARD HANDLER - NOT RECOMMENDED");
    const handler = createDropHandler({
      setCircleFilters: (filterData) => {
        console.log("CIRCLE FILTER BEING SET:", filterData);
        setCircleFilters(filterData);
      },
    });

    // Call the handler
    handler(nodeData, containerBox, dropZone);
  };

  // Simplified filtering approach focused on direct field access
  useEffect(() => {
    // Only log when filter changes
    if (circleFilters) {
      console.log("FILTER APPLIED:", circleFilters);
    } else if (circleFilters === null) {
      console.log("FILTER CLEARED");
    }
    
    // If no data or no filter, use all data
    if (!data || data.length === 0 || !circleFilters) {
      setFilteredData(data);
      return;
    }
    
    // For city filtering - the most common case
    if (circleFilters.type === "city") {
      const cityName = circleFilters.value;
      
      // Try with the exact city name as-is
      let cityMatches = data.filter(d => 
        (d.city === cityName) || (d.Location === cityName)
      );
      
      // If no exact matches, try case-insensitive
      if (cityMatches.length === 0) {
        const normalizedCityName = cityName.toLowerCase().trim();
        
        cityMatches = data.filter(d => 
          (d.city && d.city.toLowerCase().trim() === normalizedCityName) || 
          (d.Location && d.Location.toLowerCase().trim() === normalizedCityName)
        );
      }
      
      // If we found matches, use them
      if (cityMatches.length > 0) {
        setFilteredData(cityMatches);
      } else {
        // As a last resort, show all data
        setFilteredData(data);
      }
    } else {
      // Fallback to standard filtering for other types
      setFilteredData(data);
    }
    
    // Force redraw by incrementing counter
    setUpdateCounter(prev => prev + 1);
  }, [data, circleFilters]);

  // Add a global dragend listener to ensure we catch all drag operations
  useEffect(() => {
    const handleGlobalDragEnd = (e) => {
      console.log("GLOBAL DRAG END DETECTED");
      
      // If we have an active filter and the drag ends anywhere,
      // check if it's outside our component and clear the filter
      if (circleFilters) {
        // Get our component's boundaries
        const componentRect = document.getElementById(id)?.getBoundingClientRect();
        
        if (componentRect) {
          // Check if the drag ended outside our component
          if (
            e.clientX < componentRect.left || 
            e.clientX > componentRect.right ||
            e.clientY < componentRect.top || 
            e.clientY > componentRect.bottom
          ) {
            console.log("GLOBAL DRAG END - Outside component, clearing filter");
            setCircleFilters(null);
          }
        }
      }
    };
    
    // Add the global event listener
    document.addEventListener('dragend', handleGlobalDragEnd);
    
    // Remove the listener when component unmounts
    return () => {
      document.removeEventListener('dragend', handleGlobalDragEnd);
    };
  }, [id, circleFilters, setCircleFilters]);

  // Single render effect that handles visualization updates
  useEffect(() => {
    // Skip if no data
    if (!data || data.length === 0) {
      return;
    }
    
    // Use filtered data if available, otherwise use full dataset
    const dataToUse = filteredData || data;

    try {
      // Get a reference to the SVG element
      const svg = d3.select(svgRef.current);
      // Clear any existing content
      svg.selectAll("*").remove();
      
      // Set up the SVG viewport
      svg
        .attr("viewBox", [-width / 2, -height / 2, width, height])
        .attr("preserveAspectRatio", "xMidYMid meet");

      // 1) Aggregate transactions by (City, Merchant) => frequency
      const pairCount = d3.rollup(
        dataToUse,
        (v) => v.length,
        (d) => d.Location || d.city || "Unknown",  // city
        (d) => d.MerchantID // merchant
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

      const cities = Array.from(citySet).sort(); // optional sort for stable layout
      const merchants = Array.from(merchantSet).sort();

      // FOCUSED DEBUG: Log filtered cities and links 
      if (circleFilters && circleFilters.type === "city") {
        console.log("AFTER FILTERING - Cities found:", cities);
        console.log("AFTER FILTERING - Links found:", links.length);
      }

      console.log(
        `CircleBipartite: Found ${cities.length} cities and ${merchants.length} merchants`
      );
      console.log(`CircleBipartite: Generated ${links.length} links`);
      
      // Debug: Show the actual city and merchant values found
      console.log("Cities found:", cities);
      console.log("First 5 links:", links.slice(0, 5));

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

      // Add filter indicator if filters are applied
      if (circleFilters) {
        svg
          .append("text")
          .attr("x", -width / 2 + 10)
          .attr("y", -height / 2 + 20)
          .attr("fill", "#333")
          .style("font-size", "12px")
          .style("font-weight", "bold")
          .text(`Filtered by: ${circleFilters.label}`);

        // Add reset button
        svg
          .append("text")
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
      const nodeGroup = svg
        .append("g")
        .attr("stroke", "#fff")
        .attr("stroke-width", 1.5);

      // Create a set of nodes that have connections
      const connectedNodesSet = new Set();
      links.forEach(link => {
        connectedNodesSet.add(link.city);
        connectedNodesSet.add(link.mer);
      });

      // Filter nodes to only include those with connections
      const connectedNodes = nodes.filter(node => connectedNodesSet.has(node.id));

      nodeGroup
        .selectAll("circle")
        .data(connectedNodes)
        .enter()
        .append("circle")
        .attr("r", 6)
        .attr("cx", (d) => nodeMap[d.id].x)
        .attr("cy", (d) => nodeMap[d.id].y)
        .attr("fill", (d) => (d.type === "city" ? "#4E79A7" : "#F28E2B"));

      // 8) Labels
      const labelGroup = svg
        .append("g")
        .attr("font-size", 10)
        .attr("fill", "#333");

      labelGroup
        .selectAll("text")
        .data(connectedNodes)
        .enter()
        .append("text")
        .text((d) => d.id)
        .attr("x", (d) => nodeMap[d.id].x)
        .attr("y", (d) => nodeMap[d.id].y)
        .attr("dx", 8)
        .attr("dy", "0.35em");
    } catch (error) {
      console.error("Error rendering Circle Bipartite:", error);
    }
  }, [filteredData, data, width, height, innerRadius, outerRadius, minFreq, circleFilters, setCircleFilters, updateCounter]);

  // Setup drop zone event handlers
  const handleDragOver = (e) => {
    e.preventDefault();
  };

  // NEW: Handle elements being dragged out of the component
  const handleDragLeave = (e) => {
    // Make sure it's actually leaving the component (not just entering a child element)
    if (e.currentTarget === e.target) {
      console.log("DRAG LEAVE - Element dragged out of CircleBipartite");
      
      // Clear the filter when element is dragged away
      if (circleFilters) {
        console.log("DRAG LEAVE - Clearing filters");
        setCircleFilters(null);
      }
    }
  };

  return (
    <div
      id={id}
      className={className}
      style={{ width: "100%", height: "100%" }}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={(e) => {
        e.preventDefault();
        console.log("DROP EVENT START - Container received drop");

        try {
          // Capture the drop zone element
          const dropZone = e.currentTarget;
          console.log("DROP EVENT - Target ID:", dropZone.id);
          
          // Get the bounding box for positioning
          const containerBox = svgRef.current.getBoundingClientRect();
          
          // Try to get the JSON data
          const jsonData = e.dataTransfer.getData("application/json");
          
          if (jsonData) {
            try {
              // Parse the JSON data
              const nodeData = JSON.parse(jsonData);
              console.log("DROP EVENT - Parsed node data:", { 
                type: nodeData.type, 
                city: nodeData.city,
                state: nodeData.state
              });
              
              // DIRECT HANDLING FOR GEO CIRCLES: Bypass the handler chain
              if (nodeData.type === "geoCircle" && nodeData.city) {
                console.log("DROP EVENT - Direct handling of geoCircle");
                
                // Create filter directly from the node data
                const filter = {
                  type: "city",
                  value: nodeData.city,
                  label: `City: ${nodeData.city}`,
                  _directDrop: true, // Special flag to identify this source
                  _timestamp: Date.now()
                };
                
                // Use the direct component reference to setCircleFilters
                console.log("DROP EVENT - Direct filter application:", filter);
                setCircleFilters(filter);
                
                // Force update counter to trigger re-render
                setUpdateCounter(prev => prev + 1000);
                
                return;
              }
              
              // If not a geoCircle, pass to the standard handler path
              customDropHandler(nodeData, containerBox, dropZone);
            } catch (parseError) {
              console.error("DROP EVENT ERROR - Failed to parse JSON:", parseError);
            }
          } else {
            console.log("DROP EVENT - No JSON data found in drop event");
            
            // Check for other formats
            const availableTypes = Array.from(e.dataTransfer.types || []);
            console.log("DROP EVENT - Available data types:", availableTypes);
            
            if (availableTypes.includes('text/plain')) {
              console.log("DROP EVENT - Text data:", e.dataTransfer.getData('text/plain'));
            }
          }
        } catch (error) {
          console.error("DROP EVENT ERROR - General error in drop handler:", error);
        }
      }}
    >
      {/* Simple SVG element without a key to prevent remounting */}
      <svg ref={svgRef} style={{ width: "100%", height: "100%" }} />
      
      {circleFilters && (
        <div
          style={{
            position: "absolute",
            top: 10,
            right: 10,
            background: "rgba(255,255,255,0.8)",
            padding: "5px 10px",
            borderRadius: "5px",
            fontSize: "12px",
            display: "flex",
            alignItems: "center",
            gap: "5px",
          }}
        >
          <span>{circleFilters.label}</span>
          <button
            onClick={() => setCircleFilters(null)}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              color: "#f44336",
              fontWeight: "bold",
              fontSize: "14px",
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
