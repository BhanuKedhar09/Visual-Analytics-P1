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
  
  // NEW: Node queue for tracking dropped items
  const [nodeQueue, setNodeQueue] = useState([]);

  // Process queue changes to update filters
  useEffect(() => {
    console.log("NODE QUEUE UPDATED:", nodeQueue);
    
    if (nodeQueue.length === 0) {
      // Empty queue, clear filters
      setCircleFilters(null);
    } else {
      // Generate filter from the queue
      // For now, we'll just use the last item added to match previous behavior
      const lastNode = nodeQueue[nodeQueue.length - 1];
      
      // Create a filter from the last node
      const newFilter = {
        type: lastNode.type === "geoCircle" ? "city" : lastNode.type,
        value: lastNode.type === "geoCircle" ? lastNode.city : lastNode.name,
        label: `${lastNode.type === "geoCircle" ? "City" : "Node"}: ${lastNode.type === "geoCircle" ? lastNode.city : lastNode.name}`,
        timestamp: Date.now(),
        nodeQueueIndex: nodeQueue.length - 1 // Store the index for reference
      };
      
      console.log("SETTING FILTER FROM QUEUE:", newFilter);
      setCircleFilters(newFilter);
    }
  }, [nodeQueue, setCircleFilters]);

  // NEW: Direct observer for droppedItem changes, now updating the queue
  useEffect(() => {
    if (!droppedItem) return;
    
    console.log("DIRECT OBSERVATION - Received droppedItem:", droppedItem);
    
    // Check if this is a dragend action
    if (droppedItem.action === "dragend") {
      console.log("DIRECT OBSERVATION - Drag ended for item:", droppedItem.data);
      
      // Remove this item from the queue
      if (droppedItem.data && droppedItem.data.city) {
        setNodeQueue(prev => 
          prev.filter(item => 
            !(item.type === "geoCircle" && item.city === droppedItem.data.city)
          )
        );
      }
      
      // Clear the droppedItem 
      setDroppedItem(null);
      return;
    }
    
    // Only process drops intended for this component
    if (droppedItem.dropZone !== "circle-bipartite") return;
    
    // Extract the node data
    const nodeData = droppedItem.data;
    
    // Process the drop based on node type
    if (nodeData.type === "geoCircle" && nodeData.city) {
      console.log("DIRECT OBSERVATION - Adding to queue:", nodeData.city);
      
      // Add to the node queue
      addToNodeQueue(nodeData);
      
      // Clear the droppedItem to prepare for the next drop
      setTimeout(() => {
        setDroppedItem(null);
      }, 100);
    }
  }, [droppedItem, setDroppedItem]);

  // Helper function to add a node to the queue if not already present
  const addToNodeQueue = (nodeData) => {
    setNodeQueue(prev => {
      // Check if this node is already in the queue
      const exists = prev.some(item => 
        (item.type === nodeData.type) && 
        (item.type === "geoCircle" ? item.city === nodeData.city : item.name === nodeData.name)
      );
      
      if (!exists) {
        return [...prev, nodeData];
      }
      return prev;
    });
  };

  // Create custom drop handler for debugging, now using the queue
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
      console.log("DIRECT FILTER APPLICATION - Adding to queue");
      
      // Add to the node queue
      addToNodeQueue(nodeData);
      
      // Force a counter update to ensure re-render
      setUpdateCounter(prev => prev + 500);
      
      return;
    }

    // If we get here, fall back to the standard handler
    console.log("USING STANDARD HANDLER - NOT RECOMMENDED");
    const handler = createDropHandler({
      setCircleFilters: (filterData) => {
        console.log("CIRCLE FILTER BEING SET FROM HANDLER:", filterData);
        
        // Add the equivalent node to our queue
        const nodeEquivalent = {
          type: filterData.type === "city" ? "geoCircle" : filterData.type,
          ...(filterData.type === "city" ? { city: filterData.value } : { name: filterData.value })
        };
        
        addToNodeQueue(nodeEquivalent);
      },
    });

    // Call the handler
    handler(nodeData, containerBox, dropZone);
  };

  // Simplified filtering approach that uses all nodes in the queue
useEffect(() => {
    // Only log when filter changes
    if (circleFilters) {
      console.log("FILTER APPLIED:", circleFilters);
    } else if (circleFilters === null) {
      console.log("FILTER CLEARED");
    }
    
    console.log("FILTERING WITH NODE QUEUE:", nodeQueue);
    
    // If no data or empty queue, use all data
    if (!data || data.length === 0 || nodeQueue.length === 0) {
    setFilteredData(data);
    return;
  }

    // Filter data based on all nodes in the queue (OR logic - match any node)
    let filteredResults = [];
    
    // Process each node in the queue 
    nodeQueue.forEach(node => {
      // For geoCircle nodes (cities)
      if (node.type === "geoCircle" && node.city) {
        const cityName = node.city;
        
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
        
        // Add matches to results
        if (cityMatches.length > 0) {
          filteredResults.push(...cityMatches);
        }
      }
      // For other node types (to be expanded as needed)
      else if (node.type && node.name) {
        // Handle other node types here
        console.log("Filtering for non-city node:", node);
      }
    });
    
    // Remove duplicates (in case a record matches multiple filters)
    const uniqueResults = Array.from(new Set(filteredResults.map(JSON.stringify)))
      .map(JSON.parse);
    
    console.log(`FILTER RESULTS: Found ${uniqueResults.length} matching records from ${nodeQueue.length} filters`);
    
    // If we found matches, use them
    if (uniqueResults.length > 0) {
      setFilteredData(uniqueResults);
    } else {
      // As a last resort, show all data
      setFilteredData(data);
    }
    
    // Force redraw by incrementing counter
    setUpdateCounter(prev => prev + 1);
  }, [data, nodeQueue]); // Note: changed dependency from circleFilters to nodeQueue

  // Add a global dragend listener to ensure we catch all drag operations
  useEffect(() => {
    const handleGlobalDragEnd = (e) => {
      console.log("GLOBAL DRAG END DETECTED");
      
      // We rely on the droppedItem event to handle queue updates
      // No need to clear here
    };
    
    // Add the global event listener
    document.addEventListener('dragend', handleGlobalDragEnd);
    
    // Remove the listener when component unmounts
    return () => {
      document.removeEventListener('dragend', handleGlobalDragEnd);
    };
  }, [id]);

  // Handle drag leave - don't clear, just log
  const handleDragLeave = (e) => {
    // Make sure it's actually leaving the component (not just entering a child element)
    if (e.currentTarget === e.target) {
      console.log("DRAG LEAVE - Element dragged out of CircleBipartite");
      // We'll let the dragend event handle this
    }
  };

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
      if (circleFilters) {
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

      // Create connectedNodes list with city and merchant nodes
      const connectedNodesSet = new Set();
      links.forEach(link => {
        connectedNodesSet.add(link.city);
        connectedNodesSet.add(link.mer);
      });

      // Create nodes that have connections
      const connectedCities = cities
        .filter(city => connectedNodesSet.has(city))
        .map(city => ({
          id: city,
          type: "city",
          group: 1
        }));

      const connectedMerchants = merchants
        .filter(merchant => connectedNodesSet.has(merchant))
        .map(merchant => ({
          id: merchant,
        type: "merchant",
          group: 2
        }));

      // Combine all connected nodes
      const connectedNodes = [...connectedCities, ...connectedMerchants];

      // Transform links to the format needed for d3 force simulation
      const forceLinks = links.map(link => ({
        source: link.city,
        target: link.mer,
        value: link.freq
      }));

      // Link thickness scale
    const maxFreq = d3.max(links, (d) => d.freq) || 1;
    const linkWidthScale = d3.scaleSqrt().domain([1, maxFreq]).range([0.5, 4]);

      // Set up node radius scale based on connections
      const nodeConnections = {};
      links.forEach(link => {
        nodeConnections[link.city] = (nodeConnections[link.city] || 0) + 1;
        nodeConnections[link.mer] = (nodeConnections[link.mer] || 0) + 1;
      });
      
      const maxConnections = Math.max(...Object.values(nodeConnections));
      const nodeRadiusScale = d3.scaleSqrt()
        .domain([1, maxConnections])
        .range([4, 12]);

      // Create force simulation
      const simulation = d3.forceSimulation(connectedNodes)
        .force("link", d3.forceLink(forceLinks)
          .id(d => d.id)
          .distance(d => 100 / Math.sqrt(d.value)) // Stronger links are shorter
        )
        .force("charge", d3.forceManyBody()
          .strength(d => d.type === "city" ? -200 : -100)
        )
        .force("center", d3.forceCenter(0, 0))
        .force("collide", d3.forceCollide().radius(d => {
          const radius = nodeRadiusScale(nodeConnections[d.id] || 1);
          return radius + 2; // Add padding
        }))
        .force("x", d3.forceX().strength(0.05))
        .force("y", d3.forceY().strength(0.05));

    // Add filter indicator if filters are applied
    if (circleFilters) {
      svg
        .append("text")
        .attr("x", -width / 2 + 10)
        .attr("y", -height / 2 + 20)
        .attr("fill", "#333")
        .style("font-size", "12px")
        .style("font-weight", "bold")
          .text(nodeQueue.length > 1 
            ? `Filtered by ${nodeQueue.length} items` 
            : `Filtered by: ${circleFilters.label}`);

      // Add reset button
      svg
        .append("text")
        .attr("x", -width / 2 + 10)
        .attr("y", -height / 2 + 40)
        .attr("fill", "#f44336")
        .style("font-size", "10px")
        .style("cursor", "pointer")
          .text(nodeQueue.length > 1 ? "× Clear all filters" : "× Clear filter")
          .on("click", () => {
            setCircleFilters(null);
            setNodeQueue([]); // Also clear the queue
          });
      }

      // Create element groups
      const link = svg.append("g")
      .attr("stroke", "#999")
        .attr("stroke-opacity", 0.6)
      .selectAll("line")
        .data(forceLinks)
      .enter()
      .append("line")
        .attr("stroke-width", d => linkWidthScale(d.value));

      // Create node elements
      const node = svg.append("g")
      .attr("stroke", "#fff")
        .attr("stroke-width", 1.5)
      .selectAll("circle")
        .data(connectedNodes)
      .enter()
      .append("circle")
        .attr("r", d => nodeRadiusScale(nodeConnections[d.id] || 1))
        .attr("fill", d => d.type === "city" ? "#4E79A7" : "#F28E2B")
        .call(drag(simulation));

      // Add labels with dynamic offset based on node size
      const label = svg.append("g")
      .attr("font-size", 10)
        .attr("fill", "#333")
      .selectAll("text")
        .data(connectedNodes)
      .enter()
      .append("text")
        .text(d => d.id)
        .attr("dy", "0.35em")
        .style("pointer-events", "none");

      // Set up hover highlighting for connected nodes
      node.on("mouseover", function(event, d) {
        // Find connected links
        link
          .style("stroke", l => (l.source.id === d.id || l.target.id === d.id) ? "#d62728" : "#999")
          .style("stroke-opacity", l => (l.source.id === d.id || l.target.id === d.id) ? 1 : 0.2);
          
        // Highlight connected nodes
        node
          .style("opacity", n => (n.id === d.id || 
                                forceLinks.some(l => 
                                  (l.source.id === d.id && l.target.id === n.id) || 
                                  (l.target.id === d.id && l.source.id === n.id)
                                )) ? 1 : 0.2);
          
        // Highlight relevant labels
        label
          .style("opacity", n => (n.id === d.id || 
                                forceLinks.some(l => 
                                  (l.source.id === d.id && l.target.id === n.id) || 
                                  (l.target.id === d.id && l.source.id === n.id)
                                )) ? 1 : 0.2);
      })
      .on("mouseout", function() {
        // Reset styles
        link.style("stroke", "#999").style("stroke-opacity", 0.6);
        node.style("opacity", 1);
        label.style("opacity", 1);
      });

      // Define drag behavior for nodes
      function drag(simulation) {
        function dragstarted(event) {
          if (!event.active) simulation.alphaTarget(0.3).restart();
          event.subject.fx = event.subject.x;
          event.subject.fy = event.subject.y;
        }
        
        function dragged(event) {
          event.subject.fx = event.x;
          event.subject.fy = event.y;
        }
        
        function dragended(event) {
          if (!event.active) simulation.alphaTarget(0);
          event.subject.fx = null;
          event.subject.fy = null;
        }
        
        return d3.drag()
          .on("start", dragstarted)
          .on("drag", dragged)
          .on("end", dragended);
      }

      // Update positions on each tick of the simulation
      simulation.on("tick", () => {
        link
          .attr("x1", d => d.source.x)
          .attr("y1", d => d.source.y)
          .attr("x2", d => d.target.x)
          .attr("y2", d => d.target.y);

        node
          .attr("cx", d => d.x)
          .attr("cy", d => d.y);

        label
          .attr("x", d => d.x + nodeRadiusScale(nodeConnections[d.id] || 1) + 2)
          .attr("y", d => d.y);
      });
      
      // Optional: Run the simulation for a fixed number of ticks
      // to stabilize before rendering
      simulation.tick(100);
    } catch (error) {
      console.error("Error rendering Circle Bipartite:", error);
    }
  }, [filteredData, data, width, height, minFreq, circleFilters, setCircleFilters, updateCounter]);

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
                
                // Simply add to the node queue
                addToNodeQueue(nodeData);
                
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
      
      {/* Display active filters based on the node queue */}
      {nodeQueue.length > 0 && (
        <div
          style={{
            position: "absolute",
            top: 10,
            right: 10,
            display: "flex",
            flexDirection: "column",
            gap: "5px",
            alignItems: "flex-end"
          }}
        >
          {nodeQueue.map((node, index) => {
            // Create label for the filter badge
            const label = node.type === "geoCircle" 
              ? `City: ${node.city}` 
              : `${node.type}: ${node.name}`;
            
            return (
              <div
                key={`node-${index}`}
                style={{
            background: "rgba(255,255,255,0.8)",
            padding: "5px 10px",
            borderRadius: "5px",
            fontSize: "12px",
            display: "flex",
            alignItems: "center",
            gap: "5px",
          }}
        >
                <span>{label}</span>
          <button
                  onClick={() => {
                    // Remove this node from the queue
                    setNodeQueue(prev => 
                      prev.filter((_, i) => i !== index)
                    );
                  }}
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
            );
          })}
          
          {nodeQueue.length > 1 && (
            <button
              onClick={() => setNodeQueue([])}
              style={{
                background: "rgba(255,255,255,0.8)",
                border: "none",
                padding: "3px 8px",
                borderRadius: "5px",
                marginTop: "5px",
                cursor: "pointer",
                fontSize: "10px",
                color: "#f44336",
              }}
            >
              Clear All Filters
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export default CircleBipartite;