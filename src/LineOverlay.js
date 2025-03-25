import React, { useRef, useEffect, useState, useContext } from "react";
import * as d3 from "d3";
import { InteractionContext, LinkDisplayMode } from "./InteractionContext";

const LineOverlay = () => {
  const { 
    hoveredSankey,
    hoveredCity,
    dayToStates,
    dayToCities,
    cityToDaysGlobal,
    linkDisplayMode
  } = useContext(InteractionContext);
  
  const [lines, setLines] = useState([]);
  const svgRef = useRef(null);

  // This effect runs whenever the hover state or link mode changes
  useEffect(() => {
    // Clear lines if in HIGHLIGHT_ONLY mode
    if (linkDisplayMode === LinkDisplayMode.HIGHLIGHT_ONLY) {
      setLines([]);
      return;
    }
    
    // Initialize empty lines array
    let newLines = [];
    
    // CASE 1: Handle city hover from the map (create direct connections from city to time bars)
    if (hoveredCity && !hoveredSankey && linkDisplayMode !== LinkDisplayMode.HIGHLIGHT_ONLY) {
      console.log(`LINES: Creating connections for hovered city on map: ${hoveredCity}`);
      
      // Find the geo circle element for this city
      const sourceEl = document.getElementById(`geo-circle-${hoveredCity}`);
      if (sourceEl) {
        const sourceRect = sourceEl.getBoundingClientRect();
        const sourceCenter = {
          x: sourceRect.left + sourceRect.width / 2,
          y: sourceRect.top + sourceRect.height / 2
        };
        
        // Get the days associated with this city from cityToDaysGlobal
        const cityDays = cityToDaysGlobal[hoveredCity];
        if (cityDays && cityDays.size > 0) {
          console.log(`Found ${cityDays.size} days for city ${hoveredCity} in cityToDaysGlobal`);
          
          // Convert day numbers to date strings and connect to time bars
          // Limit to max 10 connections for performance
          let connectedBars = 0;
          const maxConnections = 10;
          
          // Convert Set to Array for easier manipulation
          Array.from(cityDays).slice(0, maxConnections).forEach(dayNum => {
            // Convert dayNum to date string format used by time bars
            const date = new Date(+dayNum);
            const dateStr = d3.timeFormat("%Y-%m-%d")(date);
            const timeBarId = `time-bar-${dateStr}`;
            
            const barEl = document.getElementById(timeBarId);
            if (barEl) {
              connectedBars++;
              
              const barRect = barEl.getBoundingClientRect();
              const barCenter = {
                x: barRect.left + barRect.width / 2, 
                y: barRect.top + barRect.height / 2
              };
              
              // Add City -> Time bar line
              newLines.push({
                from: sourceCenter,
                to: barCenter,
                type: "city-to-time"  // Use specific type for styling
              });
            }
          });
          
          console.log(`LINES: Connected city ${hoveredCity} to ${connectedBars} time bars`);
          setLines(newLines);
          return;
        } else {
          console.log(`No days found for city ${hoveredCity} in cityToDaysGlobal`);
        }
      } else {
        console.error(`ERROR: Can't find geo circle element with ID 'geo-circle-${hoveredCity}'`);
      }
    }
    
    // CASE 2: Handle Sankey hover
    if (!hoveredSankey) {
      setLines([]);
      return;
    }

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

    // 1. Connect to cities if available
    if (hoveredSankey.connectedCities && hoveredSankey.connectedCities.length > 0) {
      console.log(`LINES: Connecting to ${hoveredSankey.connectedCities.length} cities`);
      
      hoveredSankey.connectedCities.forEach(city => {
        const targetEl = document.getElementById(`geo-circle-${city}`);
        if (targetEl) {
          const targetRect = targetEl.getBoundingClientRect();
          const cityCenter = {
            x: targetRect.left + targetRect.width / 2,
            y: targetRect.top + targetRect.height / 2
          };
          
          // Add Sankey -> City line
          newLines.push({
            from: sourceCenter,
            to: cityCenter,
            type: "city"
          });
        } else {
          console.log(`Could not find city element for: ${city}`);
        }
      });
    }
    
    // 2. Connect to time bars if connected days are available
    if (hoveredSankey.connectedDays && hoveredSankey.connectedDays.length > 0) {
      console.log(`LINES: Connecting to days using ${hoveredSankey.connectedDays.length} connected days`);
      console.log("SAMPLE DAYS:", hoveredSankey.connectedDays.slice(0, 5));
      
      // Debug: Check all time-histogram-bar elements
      const allTimeBars = document.querySelectorAll('.time-histogram-bar');
      console.log(`FOUND ${allTimeBars.length} total time histogram bars`);
      
      if (allTimeBars.length > 0) {
        // Log sample bar IDs and data attributes
        const sampleBars = Array.from(allTimeBars).slice(0, 3);
        sampleBars.forEach(bar => {
          console.log(`BAR: id=${bar.id}, data-date=${bar.getAttribute('data-date')}`);
        });
      }
      
      // For each connected day, try to find the matching time bar
      let matchingBars = 0;
      let attemptedMatches = 0;
      
      hoveredSankey.connectedDays.forEach(dayStr => {
        // Time bars have IDs like "time-bar-YYYY-MM-DD"
        const timeBarId = `time-bar-${dayStr}`;
        attemptedMatches++;
        
        // Log every few attempts to avoid console spam
        if (attemptedMatches <= 5 || attemptedMatches % 10 === 0) {
          console.log(`LOOKING FOR: ${timeBarId}`);
        }
        
        const barEl = document.getElementById(timeBarId);
        
        if (barEl) {
          matchingBars++;
          console.log(`FOUND MATCHING BAR: ${timeBarId}`);
          
          const barRect = barEl.getBoundingClientRect();
          const barCenter = {
            x: barRect.left + barRect.width / 2, 
            y: barRect.top + barRect.height / 2
          };
          
          // Add Sankey -> Time bar line
          newLines.push({
            from: sourceCenter,
            to: barCenter,
            type: "time"
          });
        }
      });
      
      console.log(`LINES: Found ${matchingBars} matching time bars out of ${attemptedMatches} attempts`);
      
      // If we didn't find any matching time bars but have connected days,
      // add a fallback line to the time graph
      if (matchingBars === 0) {
        console.log("LINES: No matching time bars found for hoveredSankey.connectedDays");
      }
    } else {
      console.log("LINES: No connected days available for time bar connections");
      
      // NEW CODE: Use our calculated daysToHighlight instead
      console.log(`LINES: Trying new approach with calculated daysToHighlight (size: ${daysToHighlight.size})`);
      
      if (daysToHighlight.size > 0) {
        // Debug: Check all time-histogram-bar elements
        const allTimeBars = document.querySelectorAll('.time-histogram-bar');
        console.log(`FOUND ${allTimeBars.length} total time histogram bars`);
        
        if (allTimeBars.length > 0) {
          // Log sample bar IDs and data attributes
          const sampleBars = Array.from(allTimeBars).slice(0, 3);
          sampleBars.forEach(bar => {
            console.log(`BAR: id=${bar.id}, data-date=${bar.getAttribute('data-date')}`);
          });
        }
        
        // For each day in our calculated set, try to find the matching time bar
        let matchingBars = 0;
        let attemptedMatches = 0;
        
        daysToHighlight.forEach(dayStr => {
          // Time bars have IDs like "time-bar-YYYY-MM-DD"
          const timeBarId = `time-bar-${dayStr}`;
          attemptedMatches++;
          
          // Log every few attempts to avoid console spam
          if (attemptedMatches <= 5 || attemptedMatches % 10 === 0) {
            console.log(`LOOKING FOR: ${timeBarId}`);
          }
          
          const barEl = document.getElementById(timeBarId);
          
          if (barEl) {
            matchingBars++;
            
            // Only log the first few matches to avoid console spam
            if (matchingBars <= 5) {
              console.log(`FOUND MATCHING BAR: ${timeBarId}`);
              
              // Add bar coordinates for debugging
              const barRect = barEl.getBoundingClientRect();
              console.log(`BAR COORDINATES: x=${barRect.left}, y=${barRect.top}, width=${barRect.width}, height=${barRect.height}`);
            }
            
            const barRect = barEl.getBoundingClientRect();
            const barCenter = {
              x: barRect.left + barRect.width / 2, 
              y: barRect.top + barRect.height / 2
            };
            
            // Add Sankey -> Time bar line
            newLines.push({
              from: sourceCenter,
              to: barCenter,
              type: "time"
            });
          }
        });
        
        console.log(`LINES: Found ${matchingBars} matching time bars out of ${attemptedMatches} attempts (using new approach)`);
        
        // If we didn't find any matching time bars but have calculated days,
        // add a fallback line to the time graph
        if (matchingBars === 0) {
          console.log("LINES: No matching time bars found with calculated days approach");
        }
      } else {
        console.log("LINES: No calculated days available either");
      }
    }
    
    // 3. Create direct city-to-time-bar connections when a Sankey node is hovered
    // This creates a complete loop of connections: Sankey->Cities->TimeBars->Sankey
    
    // We'll only do this if we have both connected cities and connected days AND we're in LOOP_LINKS mode
    if (linkDisplayMode === LinkDisplayMode.LOOP_LINKS &&
        hoveredSankey.connectedCities && hoveredSankey.connectedCities.length > 0 &&
        daysToHighlight.size > 0) {
      
      console.log("LINES: Creating city-to-time connections to complete the loop");
      
      // Limit to prevent too many connections for performance
      const maxCitiesToConnect = 3;
      const maxTimeBarsToConnect = 5;
      
      // Get a subset of cities to connect from
      const citiesToConnect = hoveredSankey.connectedCities.slice(0, maxCitiesToConnect);
      
      // Get a subset of time bars to connect to
      const daysToConnect = Array.from(daysToHighlight).slice(0, maxTimeBarsToConnect);
      
      // For each city and time bar combination, create a connection
      citiesToConnect.forEach(city => {
        const cityEl = document.getElementById(`geo-circle-${city}`);
        if (!cityEl) return;
        
        const cityRect = cityEl.getBoundingClientRect();
        const cityCenter = {
          x: cityRect.left + cityRect.width / 2,
          y: cityRect.top + cityRect.height / 2
        };
        
        // Connect to each time bar
        daysToConnect.forEach(dayStr => {
          const timeBarId = `time-bar-${dayStr}`;
          const barEl = document.getElementById(timeBarId);
          
          if (barEl) {
            const barRect = barEl.getBoundingClientRect();
            const barCenter = {
              x: barRect.left + barRect.width / 2,
              y: barRect.top + barRect.height / 2
            };
            
            // Add City -> Time bar line
            newLines.push({
              from: cityCenter,
              to: barCenter,
              type: "city-to-time"
            });
          }
        });
      });
    }
    
    console.log(`LINES: Creating ${newLines.length} connection lines in total`);
    
    // Additional filter to remove any connections to the top-left corner
    // This specifically targets the unwanted line visible in the UI
    const timeGraphEl = document.getElementById("time-graph");
    let filteredLines = newLines;
    
    if (timeGraphEl) {
      const graphRect = timeGraphEl.getBoundingClientRect();
      
      // Filter out any lines connecting to the top-left region of the time graph
      filteredLines = newLines.filter(line => {
        // Skip non-time connections
        if (line.type !== "time") return true;
        
        // Check if this is connecting near the top-left corner
        const isTopLeftCorner = 
          line.to.x < (graphRect.left + 100) && // Within 100px of left edge
          line.to.y < (graphRect.top + 100);    // Within 100px of top edge
        
        if (isTopLeftCorner) {
          console.log("Filtered out unwanted connection to top-left corner");
          return false;
        }
        
        return true;
      });
      
      if (filteredLines.length < newLines.length) {
        console.log(`Removed ${newLines.length - filteredLines.length} unwanted top-left corner connections`);
      }
    }
    
    setLines(filteredLines);
  }, [hoveredSankey, hoveredCity, dayToStates, dayToCities, cityToDaysGlobal, linkDisplayMode]);

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
        
        // Calculate a more pronounced curve for better visibility
        const dx = line.to.x - line.from.x;
        const dy = line.to.y - line.from.y;
        
        // Determine the direction and create appropriate curves
        let controlPoint1X, controlPoint1Y, controlPoint2X, controlPoint2Y;
        
        // For more dramatic curves, we'll use cubic Bézier (C) instead of quadratic (Q)
        // This gives us two control points for more flexibility
        const distance = Math.sqrt(dx*dx + dy*dy);
        const midX = (line.from.x + line.to.x) / 2;
        const midY = (line.from.y + line.to.y) / 2;
        
        // Create a perpendicular offset for the control points
        // The offset is proportional to the distance for consistency
        const offsetX = -dy * 0.2; // Perpendicular to the line
        const offsetY = dx * 0.2;  // Perpendicular to the line
        
        controlPoint1X = midX + offsetX;
        controlPoint1Y = midY + offsetY;
        controlPoint2X = midX + offsetX;
        controlPoint2Y = midY + offsetY;
        
        // Create different curve styles based on type and relative positions
        let path;
        
        // Calculate curve direction based on relative positions
        // This makes the curves bend naturally based on source/target positions
        const isSourceAboveTarget = line.from.y < line.to.y;
        const isSourceLeftOfTarget = line.from.x < line.to.x;
        
        // Set the curve sign based on relative positions (affects curve direction)
        const curveSign = isSourceAboveTarget ? -1 : 1;
        
        if (line.type === "city") {
          // City connections: more horizontal flow with gentle curve
          const curveFactor = Math.min(Math.abs(dx) * 0.4, 150); // Limit the curve height
          
          // Control points for city connections
          const ctrl1X = line.from.x + dx * 0.3;
          const ctrl1Y = line.from.y + (curveSign * curveFactor * 0.5);
          const ctrl2X = line.to.x - dx * 0.3;
          const ctrl2Y = line.to.y + (curveSign * curveFactor * 0.5);
          
          path = `M${line.from.x},${line.from.y} C${ctrl1X},${ctrl1Y} ${ctrl2X},${ctrl2Y} ${line.to.x},${line.to.y}`;
        } else if (line.type === "time") {
          // Time connections: more vertical flow with adaptive curve
          const curveFactor = Math.min(Math.abs(dy) * 0.5, 200); // Limit the curve width
          
          // Control points for time connections - curve bends perpendicular to main direction
          const ctrl1X = line.from.x + (isSourceLeftOfTarget ? curveFactor : -curveFactor);
          const ctrl1Y = line.from.y + dy * 0.3;
          const ctrl2X = line.to.x + (isSourceLeftOfTarget ? -curveFactor : curveFactor);
          const ctrl2Y = line.to.y - dy * 0.3;
          
          path = `M${line.from.x},${line.from.y} C${ctrl1X},${ctrl1Y} ${ctrl2X},${ctrl2Y} ${line.to.x},${line.to.y}`;
        } else if (line.type === "city-to-time") {
          // City-to-time connections: dynamic curve
          const hdist = Math.abs(dx);
          const vdist = Math.abs(dy);
          
          // Determine whether the connection is more horizontal or vertical
          if (hdist > vdist) {
            // More horizontal - curve vertically
            const ctrl1X = line.from.x + dx * 0.3;
            const ctrl1Y = line.from.y + (curveSign * Math.min(vdist * 0.8, 150));
            const ctrl2X = line.to.x - dx * 0.3;
            const ctrl2Y = line.to.y + (curveSign * Math.min(vdist * 0.8, 150));
            
            path = `M${line.from.x},${line.from.y} C${ctrl1X},${ctrl1Y} ${ctrl2X},${ctrl2Y} ${line.to.x},${line.to.y}`;
          } else {
            // More vertical - curve horizontally
            const hcurveSign = isSourceLeftOfTarget ? 1 : -1;
            const ctrl1X = line.from.x + (hcurveSign * Math.min(hdist * 0.8, 150));
            const ctrl1Y = line.from.y + dy * 0.3;
            const ctrl2X = line.to.x + (hcurveSign * Math.min(hdist * 0.8, 150));
            const ctrl2Y = line.to.y - dy * 0.3;
            
            path = `M${line.from.x},${line.from.y} C${ctrl1X},${ctrl1Y} ${ctrl2X},${ctrl2Y} ${line.to.x},${line.to.y}`;
          }
        } else {
          // Default fallback - simple curve
          const ctrl1X = line.from.x + dx * 0.5;
          const ctrl1Y = line.from.y;
          const ctrl2X = line.to.x - dx * 0.5;
          const ctrl2Y = line.to.y;
          
          path = `M${line.from.x},${line.from.y} C${ctrl1X},${ctrl1Y} ${ctrl2X},${ctrl2Y} ${line.to.x},${line.to.y}`;
        }
        
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