import React, { useRef, useEffect, useState, useContext } from "react";
import * as d3 from "d3";
import { InteractionContext } from "./InteractionContext";

const LineOverlay = () => {
  const { 
    hoveredSankey,
    dayToStates,
    dayToCities
  } = useContext(InteractionContext);
  
  const [lines, setLines] = useState([]);
  const svgRef = useRef(null);

  // This effect runs whenever the Sankey hover state changes
  useEffect(() => {
    // Clear lines if nothing is hovered
    if (!hoveredSankey) {
      setLines([]);
      return;
    }

    // Detailed diagnostics of hoveredSankey
    console.log("LINE OVERLAY - DETAILED HOVERED SANKEY DIAGNOSTICS:");
    console.log("=======================================================");
    console.log("FULL hoveredSankey object:", hoveredSankey);
    console.log("hoveredSankey.layer:", hoveredSankey.layer);
    console.log("hoveredSankey.name:", hoveredSankey.name);
    console.log("hoveredSankey.index:", hoveredSankey.index);
    console.log("hoveredSankey.connectedCities:", hoveredSankey.connectedCities);
    console.log("hoveredSankey.connectedDays:", hoveredSankey.connectedDays);
    console.log("connectedDays length:", hoveredSankey.connectedDays ? hoveredSankey.connectedDays.length : 0);
    console.log("connectedDays type:", hoveredSankey.connectedDays ? typeof hoveredSankey.connectedDays : "undefined");
    console.log("Is connectedDays array?", hoveredSankey.connectedDays ? Array.isArray(hoveredSankey.connectedDays) : "N/A");
    
    // NEW CODE: Calculate days to highlight based on dayToStates/dayToCities
    console.log("CALCULATING DAYS TO HIGHLIGHT USING TIME HISTOGRAM APPROACH:");
    console.log("=======================================================");
    
    // Collect days that should be highlighted based on the Sankey node
    const daysToHighlight = new Set();
    
    if (hoveredSankey.layer === 0) {
      // State node - use dayToStates
      console.log(`Finding days for state: ${hoveredSankey.name}`);
      
      if (dayToStates && Object.keys(dayToStates).length > 0) {
        // Check each day in dayToStates to see if it contains this state
        Object.entries(dayToStates).forEach(([dayNum, states]) => {
          if (states && states.has(hoveredSankey.name)) {
            // Convert dayNum to date string format used by time bars
            const date = new Date(+dayNum);
            const dateStr = d3.timeFormat("%Y-%m-%d")(date);
            daysToHighlight.add(dateStr);
          }
        });
        
        console.log(`Found ${daysToHighlight.size} days for state ${hoveredSankey.name}`);
        console.log("First 10 days:", Array.from(daysToHighlight).slice(0, 10));
        
        // Log time bar IDs we should connect to
        console.log("Time bar IDs to connect to:", 
          Array.from(daysToHighlight).slice(0, 10).map(day => `time-bar-${day}`)
        );
      } else {
        console.log("ERROR: dayToStates is empty or undefined");
      }
    } else if (hoveredSankey.layer === 1) {
      // City node - use dayToCities
      console.log(`Finding days for city: ${hoveredSankey.name}`);
      
      if (dayToCities && Object.keys(dayToCities).length > 0) {
        // Check each day in dayToCities to see if it contains this city
        Object.entries(dayToCities).forEach(([dayNum, cities]) => {
          if (cities && cities.has(hoveredSankey.name)) {
            // Convert dayNum to date string format used by time bars
            const date = new Date(+dayNum);
            const dateStr = d3.timeFormat("%Y-%m-%d")(date);
            daysToHighlight.add(dateStr);
          }
        });
        
        console.log(`Found ${daysToHighlight.size} days for city ${hoveredSankey.name}`);
        console.log("First 10 days:", Array.from(daysToHighlight).slice(0, 10));
        
        // Log time bar IDs we should connect to
        console.log("Time bar IDs to connect to:", 
          Array.from(daysToHighlight).slice(0, 10).map(day => `time-bar-${day}`)
        );
      } else {
        console.log("ERROR: dayToCities is empty or undefined");
      }
    }
    
    console.log("=======================================================");
    
    // Original code continues...
    console.log("OVERLAY DEBUG: hoveredSankey =", hoveredSankey);
    console.log("OVERLAY DEBUG: connectedDays =", hoveredSankey.connectedDays);
    
    // First, find the source element (Sankey node)
    const sourceEl = document.getElementById(`sankey-node-${hoveredSankey.name}`);
    if (!sourceEl) {
      console.error(`ERROR: Can't find Sankey node element with ID 'sankey-node-${hoveredSankey.name}'`);
      return;
    }

    const sourceRect = sourceEl.getBoundingClientRect();
    const sourceCenter = {
      x: sourceRect.left + sourceRect.width / 2,
      y: sourceRect.top + sourceRect.height / 2
    };

    // Only create specific connections, no fallbacks
    let specificLines = [];
    
    // 2. First, connect to cities if available
    if (hoveredSankey.connectedCities && Array.isArray(hoveredSankey.connectedCities) && 
        hoveredSankey.connectedCities.length > 0) {
      
      let validCityConnections = 0;
      
      hoveredSankey.connectedCities.forEach(city => {
        // Skip if city name is not a string or is empty
        if (typeof city !== 'string' || !city.trim()) {
          return;
        }
        
        const cityId = `geo-circle-${city}`;
        const cityEl = document.getElementById(cityId);
        
        // Only proceed if element exists and has proper dimensions
        if (cityEl && cityEl.tagName.toLowerCase() === 'circle') {
          const cityRect = cityEl.getBoundingClientRect();
          
          // Verify we have a valid rectangle with dimensions
          if (cityRect && cityRect.width > 0 && cityRect.height > 0) {
            const cityCenter = {
              x: cityRect.left + cityRect.width / 2,
              y: cityRect.top + cityRect.height / 2
            };
            
            // Only add if coordinates are valid numbers
            if (!isNaN(cityCenter.x) && !isNaN(cityCenter.y) && 
                !isNaN(sourceCenter.x) && !isNaN(sourceCenter.y)) {
              
              specificLines.push({
                from: sourceCenter,
                to: cityCenter,
                type: "city"
              });
              
              validCityConnections++;
            }
          }
        }
      });
      
      console.log(`Created ${validCityConnections} validated city connections`);
    }
    
    // 3. Now handle time bar connections - use our calculated days approach
    let timeBarConnections = 0;
    const MAX_CONNECTIONS = 50;
    
    // Get all available days to connect to
    const allDaysToTry = new Set();
    
    // First try days from our calculated approach
    if (daysToHighlight.size > 0) {
      daysToHighlight.forEach(day => allDaysToTry.add(day));
    }
    
    // Then try days from hoveredSankey.connectedDays if available
    if (hoveredSankey.connectedDays && hoveredSankey.connectedDays.length > 0) {
      hoveredSankey.connectedDays.forEach(day => allDaysToTry.add(day));
    }
    
    console.log(`Total unique days to try connecting: ${allDaysToTry.size}`);
    
    // Convert to array and limit connections
    const daysArray = Array.from(allDaysToTry).slice(0, MAX_CONNECTIONS);
    
    // Only connect to actual time bar elements with careful validation
    daysArray.forEach(dayStr => {
      // Verify the dayStr has the right format (YYYY-MM-DD)
      if (!/^\d{4}-\d{2}-\d{2}$/.test(dayStr)) {
        console.log(`Skipping invalid date format: ${dayStr}`);
        return; // Skip this iteration
      }
      
      const timeBarId = `time-bar-${dayStr}`;
      const barEl = document.getElementById(timeBarId);
      
      // Strict validation of element
      if (barEl && barEl.classList.contains('time-histogram-bar')) {
        const barRect = barEl.getBoundingClientRect();
        
        // Only proceed if we got a valid rectangle with non-zero dimensions
        if (barRect && barRect.width > 0 && barRect.height > 0) {
          const barCenter = {
            x: barRect.left + barRect.width / 2,
            y: barRect.top + barRect.height / 2
          };
          
          // Only add the line if the coordinates are valid numbers
          if (!isNaN(barCenter.x) && !isNaN(barCenter.y) && 
              !isNaN(sourceCenter.x) && !isNaN(sourceCenter.y)) {
            
            specificLines.push({
              from: sourceCenter,
              to: barCenter,
              type: "time"
            });
            
            timeBarConnections++;
          }
        }
      }
    });
    
    console.log(`Created ${timeBarConnections} specific time bar connections`);
    console.log(`Total connections: ${specificLines.length}`);
    
    // Final safety filter - remove any connections that might be to container elements
    const timeGraphEl = document.getElementById("time-graph");
    
    if (timeGraphEl) {
      const graphRect = timeGraphEl.getBoundingClientRect();
      const graphCenter = {
        x: graphRect.left + graphRect.width / 2,
        y: graphRect.top + graphRect.height / 2
      };
      
      // Filter out any connections that appear to be connecting to the time graph center
      const safeConnections = specificLines.filter(line => {
        // If this is a time connection
        if (line.type === "time") {
          // Calculate distance to graph center
          const distanceToCenter = Math.sqrt(
            Math.pow(line.to.x - graphCenter.x, 2) + 
            Math.pow(line.to.y - graphCenter.y, 2)
          );
          
          // If it's too close to the center (likely a fallback), filter it out
          if (distanceToCenter < 40) {
            console.log("Removed a suspected fallback connection to time graph");
            return false;
          }
        }
        
        return true;
      });
      
      // Log how many connections were removed as suspected fallbacks
      if (safeConnections.length < specificLines.length) {
        console.log(`Removed ${specificLines.length - safeConnections.length} suspected fallback connections`);
      }
      
      // Set the final safe connections
      setLines(safeConnections);
    } else {
      // If we can't find the time graph, just use the connections as is
      setLines(specificLines);
    }
  }, [hoveredSankey, dayToStates, dayToCities]);

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
        zIndex: 10000
      }}
    >
      {lines.map((line, idx) => {
        // New aesthetic styling - thin blue lines with subtle styling
        let strokeColor, strokeWidth, dashArray, opacity;
        
        // Use a consistent color palette based on blue
        switch(line.type) {
          case "city":
            strokeColor = "rgba(65, 105, 225, 0.7)"; // Royal blue with transparency
            strokeWidth = 0.8;
            dashArray = "3,3";
            opacity = 0.7;
            break;
          case "time":
            strokeColor = "rgba(30, 144, 255, 0.8)"; // Dodger blue with transparency
            strokeWidth = 0.8;
            dashArray = "none"; // Solid line for time connections
            opacity = 0.7;
            break;
          case "city-to-time":
            strokeColor = "rgba(70, 130, 180, 0.7)"; // Steel blue with transparency
            strokeWidth = 0.8;
            dashArray = "2,2";
            opacity = 0.7;
            break;
          default:
            strokeColor = "rgba(95, 158, 160, 0.5)"; // Cadet blue with transparency
            strokeWidth = 0.8;
            dashArray = "2,2";
            opacity = 0.5;
        }
        
        // Calculate a gentle curve for the line
        // This creates a simple curved path instead of a straight line
        const dx = line.to.x - line.from.x;
        const dy = line.to.y - line.from.y;
        const controlX = line.from.x + dx * 0.5;
        const controlY = line.from.y + dy * 0.5;
        
        // Path with gentle curve
        const path = `M${line.from.x},${line.from.y} Q${controlX},${controlY} ${line.to.x},${line.to.y}`;
        
        return (
          <path
          key={idx}
            d={path}
            stroke={strokeColor}
            strokeWidth={strokeWidth}
            strokeDasharray={dashArray}
            strokeOpacity={opacity}
            fill="none"
          />
        );
      })}
    </svg>
  );
};

export default LineOverlay;
