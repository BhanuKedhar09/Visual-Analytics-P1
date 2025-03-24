import React, { useContext, useEffect, useState, useRef } from "react";
import { InteractionContext } from "./InteractionContext";
import * as d3 from "d3";

// Helper function to compute an element's center given its id.
function getElementCenter(id) {
  const el = document.getElementById(id);
  if (!el) {
    console.log(`Element with id ${id} not found`);
    return null;
  }
  const rect = el.getBoundingClientRect();
  return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
}

const LineOverlay = () => {
  const { 
    hoveredSankey,
    dayToStates,
    dayToCities,
    dayToOccupations,
    dayToMerchants 
  } = useContext(InteractionContext);
  
  const [lines, setLines] = useState([]);
  const svgRef = useRef(null);

  // This effect runs whenever the Sankey hover state changes
  useEffect(() => {
    // Clear lines if nothing is hovered
    if (!hoveredSankey) {
      console.log("DEBUG: No sankey node hovered, clearing lines");
      setLines([]);
      return;
    }

    console.log("=====================================================");
    console.log("DEBUG - LineOverlay: Sankey node hovered!", hoveredSankey);
    console.log("Layer:", hoveredSankey.layer, "Name:", hoveredSankey.name);
    
    if (hoveredSankey.connectedCities) {
      console.log("Connected cities:", hoveredSankey.connectedCities);
    } else {
      console.error("ERROR: connectedCities is missing in hoveredSankey!");
    }
    
    if (hoveredSankey.connectedDays) {
      console.log("Connected days:", hoveredSankey.connectedDays);
    } else {
      console.error("ERROR: connectedDays is missing in hoveredSankey!");
    }
    
    // Log day mappings 
    console.log("dayToStates available:", Object.keys(dayToStates || {}).length);
    console.log("dayToCities available:", Object.keys(dayToCities || {}).length);

    // First, find the source element (Sankey node)
    const sourceEl = document.getElementById(`sankey-node-${hoveredSankey.name}`);
    if (!sourceEl) {
      console.error(`ERROR: Can't find Sankey node element with ID 'sankey-node-${hoveredSankey.name}'`);
      // List all elements with ids starting with 'sankey-node-'
      const allSankeyNodes = Array.from(document.querySelectorAll('[id^="sankey-node-"]'));
      console.log("Available sankey nodes:", allSankeyNodes.map(el => el.id));
      return;
    }

    console.log("SUCCESS: Found source Sankey node element:", sourceEl.id);
    const sourceRect = sourceEl.getBoundingClientRect();
    const sourceCenter = {
      x: sourceRect.left + sourceRect.width / 2,
      y: sourceRect.top + sourceRect.height / 2
    };
    console.log("Source center position:", sourceCenter);

    let newLines = [];
    let connectedCityElements = [];

    // 1. Connect to cities
    if (hoveredSankey.connectedCities && hoveredSankey.connectedCities.length > 0) {
      console.log(`Trying to connect to ${hoveredSankey.connectedCities.length} cities...`);
      hoveredSankey.connectedCities.forEach(city => {
        console.log(`Looking for city element with ID 'geo-circle-${city}'`);
        const targetEl = document.getElementById(`geo-circle-${city}`);
        if (targetEl) {
          console.log(`SUCCESS: Found city circle for ${city}`);
          const targetRect = targetEl.getBoundingClientRect();
          const cityCenter = {
            x: targetRect.left + targetRect.width / 2,
            y: targetRect.top + targetRect.height / 2
          };
          
          // Store references to connected city elements for later
          connectedCityElements.push({
            city: city,
            center: cityCenter
          });
          
          // Add Sankey -> City line
          newLines.push({
            from: sourceCenter,
            to: cityCenter,
            type: "city"
          });
          console.log(`Added line: Sankey -> City (${city})`);
        } else {
          console.error(`ERROR: Could not find geo-circle-${city} element`);
          // List all geo circles to see what's available
          const allGeoCircles = Array.from(document.querySelectorAll('[id^="geo-circle-"]'));
          console.log("Available geo circles:", allGeoCircles.map(el => el.id).slice(0, 10), "...");
        }
      });
    } else {
      console.log("No connected cities to draw lines to");
    }

    // 2. Find matching time bars
    const allTimeBars = document.querySelectorAll('.time-histogram-bar');
    console.log(`Found ${allTimeBars.length} time histogram bars total`);
    
    if (allTimeBars.length > 0) {
      // Convert the bars to an array for easier processing
      const barsArray = Array.from(allTimeBars);
      console.log("Bar attributes example:", barsArray[0].getAttribute('data-date'));
      
      // Create a function to check if a time bar should be connected
      const shouldConnect = (bar) => {
        // Get the date information from the bar
        const dateStr = bar.getAttribute('data-date');
        if (!dateStr) {
          console.log("No data-date attribute on bar", bar.id);
          return false;
        }
        
        // Convert to a date for comparison
        const date = new Date(dateStr);
        const timestamp = +date;
        
        // Different logic based on layer
        if (hoveredSankey.layer === 0) { // State node
          // Find all days that have this state
          for (const [dayNum, states] of Object.entries(dayToStates || {})) {
            if (+dayNum === timestamp && states.has && states.has(hoveredSankey.name)) {
              console.log(`Match for state ${hoveredSankey.name} on date ${dateStr}`);
              return true;
            }
          }
        } 
        else if (hoveredSankey.layer === 1) { // City node
          // Find all days that have this city
          for (const [dayNum, cities] of Object.entries(dayToCities || {})) {
            if (+dayNum === timestamp && cities.has && cities.has(hoveredSankey.name)) {
              console.log(`Match for city ${hoveredSankey.name} on date ${dateStr}`);
              return true;
            }
          }
        }
        
        // Try another approach - check against connectedDays directly
        if (hoveredSankey.connectedDays && hoveredSankey.connectedDays.includes(dateStr)) {
          console.log(`Direct match with connectedDays for date ${dateStr}`);
          return true;
        }
        
        return false;
      };
      
      // Find matching bars
      const matchingBars = barsArray.filter(shouldConnect);
      console.log(`Found ${matchingBars.length} matching time bars`);
      
      if (matchingBars.length > 0) {
        console.log("First matching bar info:", matchingBars[0].id, matchingBars[0].getAttribute('data-date'));
        
        // If we have connected cities, connect each city to each matching time bar
        if (connectedCityElements.length > 0) {
          console.log(`Connecting ${connectedCityElements.length} cities to ${matchingBars.length} time bars`);
          connectedCityElements.forEach(cityElement => {
            matchingBars.forEach(bar => {
              const rect = bar.getBoundingClientRect();
              const barCenter = {
                x: rect.left + rect.width / 2,
                y: rect.top + rect.height / 2
              };
              
              // Add City -> Time bar line
              newLines.push({
                from: cityElement.center,
                to: barCenter,
                type: "city-to-time"
              });
              console.log(`Added line: City ${cityElement.city} -> Time bar`);
            });
          });
        }
        
        // Also connect directly from Sankey to time bars
        matchingBars.forEach(bar => {
          const rect = bar.getBoundingClientRect();
          const barCenter = {
            x: rect.left + rect.width / 2,
            y: rect.top + rect.height / 2
          };
          
          newLines.push({
            from: sourceCenter,
            to: barCenter,
            type: "time"
          });
          console.log(`Added line: Sankey -> Time bar`);
        });
      }
      // Fallback if no specific bars found but we should have some
      else if (hoveredSankey.connectedDays && hoveredSankey.connectedDays.length > 0) {
        console.log("No matching time bars found despite having connected days, using fallback");
        const timeGraph = document.getElementById("time-graph");
        if (timeGraph) {
          console.log("Found time-graph container for fallback");
          const rect = timeGraph.getBoundingClientRect();
          const timeCenter = {
            x: rect.left + rect.width / 2,
            y: rect.top + rect.height / 2
          };
          
          // Direct connection from Sankey to time graph
          newLines.push({
            from: sourceCenter,
            to: timeCenter,
            type: "time-fallback"
          });
          console.log("Added fallback line: Sankey -> Time graph container");
          
          // Also connect from cities to time graph if we have cities
          if (connectedCityElements.length > 0) {
            connectedCityElements.forEach(cityElement => {
              newLines.push({
                from: cityElement.center,
                to: timeCenter,
                type: "city-to-time-fallback"
              });
              console.log(`Added fallback line: City ${cityElement.city} -> Time graph container`);
            });
          }
        } else {
          console.error("ERROR: Could not find time-graph element for fallback");
        }
      }
    } else {
      console.error("ERROR: No time histogram bars found in the document");
    }
    
    console.log(`FINAL: Creating ${newLines.length} connection lines`);
    
    // IMPORTANT FALLBACK: Even if we didn't find any matching elements to draw lines to,
    // always add at least one line from the Sankey node to the time graph area
    if (newLines.length === 0) {
      console.log("WARNING: No lines created - adding emergency fallback line");
      
      // Try to find the time-graph element
      const timeGraph = document.getElementById("time-graph");
      if (timeGraph) {
        const timeRect = timeGraph.getBoundingClientRect();
        const timeCenter = {
          x: timeRect.left + timeRect.width / 2,
          y: timeRect.top + timeRect.height / 2
        };
        
        // Add a direct fallback line
        newLines.push({
          from: sourceCenter,
          to: timeCenter,
          type: "emergency-fallback"
        });
        console.log("Added emergency fallback line");
      }
    }
    
    console.log("=====================================================");
    setLines(newLines);
  }, [hoveredSankey, dayToStates, dayToCities, dayToOccupations, dayToMerchants]);

  // Log whenever the lines state changes
  useEffect(() => {
    console.log(`LineOverlay: lines state updated, now has ${lines.length} lines`);
  }, [lines]);

  // This will handle the SVG update whenever the window changes size
  useEffect(() => {
    const handleResize = () => {
      const svgEl = svgRef.current;
      if (svgEl) {
        svgEl.setAttribute('width', window.innerWidth);
        svgEl.setAttribute('height', window.innerHeight);
      }
    };
    
    window.addEventListener('resize', handleResize);
    handleResize(); // Initial size setup
    
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <svg
      ref={svgRef}
      style={{
        position: "fixed", 
        top: 0,
        left: 0,
        width: "100vw", 
        height: "100vh",
        pointerEvents: "none",
        zIndex: 9999, // Super high z-index to ensure it's visible above everything
      }}
    >
      <defs>
        <marker
          id="arrowhead"
          markerWidth="10"
          markerHeight="7"
          refX="0"
          refY="3.5"
          orient="auto"
        >
          <polygon points="0 0, 10 3.5, 0 7" fill="red" />
        </marker>
      </defs>
      {lines.map((line, idx) => {
        // Determine the color and style based on the line type
        let strokeColor, strokeWidth, dashArray;
        
        switch(line.type) {
          case "city":
            strokeColor = "rgba(255, 0, 0, 0.7)";
            strokeWidth = 2;
            dashArray = "8,4";
            break;
          case "time":
            strokeColor = "red";
            strokeWidth = 2;
            dashArray = "6,3";
            break;
          case "city-to-time":
            strokeColor = "purple";
            strokeWidth = 2;
            dashArray = "4,2";
            break;
          case "time-fallback":
            strokeColor = "orange";
            strokeWidth = 2;
            dashArray = "5,5";
            break;
          case "city-to-time-fallback":
            strokeColor = "blue";
            strokeWidth = 2;
            dashArray = "4,4";
            break;
          case "emergency-fallback":
            strokeColor = "#ff00ff"; // Bright magenta
            strokeWidth = 5;
            dashArray = "10,5";
            break;
          default:
            strokeColor = "gray";
            strokeWidth = 1;
            dashArray = "2,2";
        }
        
        return (
          <line
            key={idx}
            x1={line.from.x}
            y1={line.from.y}
            x2={line.to.x}
            y2={line.to.y}
            stroke={strokeColor}
            strokeWidth={strokeWidth}
            strokeDasharray={dashArray}
            className="connection-line"
          >
            <animate
              attributeName="stroke-dashoffset"
              from="24"
              to="0"
              dur="1s"
              repeatCount="indefinite"
            />
          </line>
        );
      })}
    </svg>
  );
};

export default LineOverlay;
