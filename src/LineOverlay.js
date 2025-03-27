import React, { useRef, useEffect, useState, useContext } from "react";
import * as d3 from "d3";
import { InteractionContext, LinkDisplayMode } from "./InteractionContext";

const LineOverlay = () => {
  const { 
    hoveredSankey,
    hoveredCity,
    hoveredDay,
    dayToStates,
    dayToCities,
    cityToDaysGlobal,
    localDayToCities,
    linkDisplayMode,
    setSankeyHighlightedCity
  } = useContext(InteractionContext);
  
  const [lines, setLines] = useState([]);
  const svgRef = useRef(null);

  // This effect runs whenever the hover state or link mode changes
  useEffect(() => {
    // Debug current state
    console.log("=== LineOverlay State ===");
    console.log("hoveredCity:", hoveredCity);
    console.log("linkDisplayMode:", linkDisplayMode);
    
    // Clear lines if in HIGHLIGHT_ONLY mode
    if (linkDisplayMode === LinkDisplayMode.HIGHLIGHT_ONLY) {
      setLines([]);
      // Clear any sankey highlights when in highlight-only mode
      setSankeyHighlightedCity(null);
      return;
    }
    
    // Initialize empty lines array
    let newLines = [];
    
    // CASE 1: Handle city hover from the map
    if (hoveredCity && linkDisplayMode === LinkDisplayMode.SHOW_LINKS) {
      console.log(`Drawing connections for city: ${hoveredCity}`);
      
      // Highlight the corresponding Sankey node when a city is hovered
      setSankeyHighlightedCity(hoveredCity);
      
      // Find the geo circle element for this city
      const sourceEl = document.getElementById(`geo-circle-${hoveredCity}`);
      if (sourceEl) {
        const sourceRect = sourceEl.getBoundingClientRect();
        const sourceCenter = {
          x: sourceRect.left + sourceRect.width / 2,
          y: sourceRect.top + sourceRect.height / 2
        };
        
        // 1. Connect to time bars
        // Get the days associated with this city from dayToCities
        Object.entries(dayToCities).forEach(([dayNum, cities]) => {
          if (cities && cities.has(hoveredCity)) {
            const date = new Date(+dayNum);
            const dateStr = d3.timeFormat("%Y-%m-%d")(date);
            
            const timeBarId = `time-bar-${dateStr}`;
            const barEl = document.getElementById(timeBarId);
            
            if (barEl) {
              const barRect = barEl.getBoundingClientRect();
              const barCenter = {
                x: barRect.left + barRect.width / 2,
                y: barRect.top + barRect.height / 2
              };
              
              newLines.push({
                from: sourceCenter,
                to: barCenter,
                type: "city-to-time"
              });
            }
          }
        });
        
        // 2. Connect to Sankey city node
        const cityNodeId = `sankey-node-${hoveredCity}`;
        const cityNodeEl = document.getElementById(cityNodeId);
        if (cityNodeEl) {
          const nodeRect = cityNodeEl.getBoundingClientRect();
          const nodeCenter = {
            x: nodeRect.left + nodeRect.width / 2,
            y: nodeRect.top + nodeRect.height / 2
          };
          
          newLines.push({
            from: sourceCenter,
            to: nodeCenter,
            type: "city-to-sankey"
          });
        } else {
          // If we can't find the city node directly, try to find its state node
          // This is a fallback in case the city node doesn't exist or has a different ID pattern
          // First we need to look up the state for this city
          let cityState = null;
          
          // Find the first day with this city to get its state
          for (const [dayNum, cities] of Object.entries(dayToCities)) {
            if (cities && cities.has(hoveredCity)) {
              // Try to get the state from the data
              const stateNodeId = `sankey-node-state-${cityState}`;
              const stateNodeEl = document.getElementById(stateNodeId);
              
              if (stateNodeEl) {
                const nodeRect = stateNodeEl.getBoundingClientRect();
                const nodeCenter = {
                  x: nodeRect.left + nodeRect.width / 2,
                  y: nodeRect.top + nodeRect.height / 2
                };
                
                newLines.push({
                  from: sourceCenter,
                  to: nodeCenter,
                  type: "city-to-state-sankey"
                });
                break;
              }
            }
          }
        }
      }
    }
    
    // CASE 2: Handle time bar hover
    if (hoveredDay && !hoveredCity && linkDisplayMode === LinkDisplayMode.SHOW_LINKS) {
      // Clear any highlighted Sankey city when hovering a time bar
      setSankeyHighlightedCity(null);
      
      const dayStr = d3.timeFormat("%Y-%m-%d")(hoveredDay);
      const sourceEl = document.getElementById(`time-bar-${dayStr}`);
      
      if (sourceEl) {
        const sourceRect = sourceEl.getBoundingClientRect();
        const sourceCenter = {
          x: sourceRect.left + sourceRect.width / 2,
          y: sourceRect.top + sourceRect.height / 2
        };
        
        // Get the cities associated with this day from dayToCities
        const dayNum = +d3.timeDay(hoveredDay);
        const cities = dayToCities[dayNum];
        
        if (cities) {
          // 1. Connect to cities on the map
          cities.forEach(city => {
            const cityEl = document.getElementById(`geo-circle-${city}`);
            if (cityEl) {
              const cityRect = cityEl.getBoundingClientRect();
              const cityCenter = {
                x: cityRect.left + cityRect.width / 2,
                y: cityRect.top + cityRect.height / 2
              };
              
              newLines.push({
                from: sourceCenter,
                to: cityCenter,
                type: "time-to-city"
              });
              
              // 2. Connect to Sankey nodes for these cities
              const cityNodeId = `sankey-node-${city}`;
              const cityNodeEl = document.getElementById(cityNodeId);
              if (cityNodeEl) {
                const nodeRect = cityNodeEl.getBoundingClientRect();
                const nodeCenter = {
                  x: nodeRect.left + nodeRect.width / 2,
                  y: nodeRect.top + nodeRect.height / 2
                };
                
                newLines.push({
                  from: sourceCenter,
                  to: nodeCenter,
                  type: "time-to-sankey"
                });
              }
            }
          });
          
          // 3. Get unique states for this day
          const states = new Set();
          cities.forEach(city => {
            // Try to determine the state for each city
            // This is a simplified approach - in a real application, you might have a more direct way
            // to look up the state for a city
            Object.entries(dayToStates).forEach(([day, stateSet]) => {
              if (day === dayNum.toString() && stateSet) {
                stateSet.forEach(state => states.add(state));
              }
            });
          });
          
          // Connect to state nodes in Sankey
          states.forEach(state => {
            const stateNodeId = `sankey-node-${state}`;
            const stateNodeEl = document.getElementById(stateNodeId);
            if (stateNodeEl) {
              const nodeRect = stateNodeEl.getBoundingClientRect();
              const nodeCenter = {
                x: nodeRect.left + nodeRect.width / 2,
                y: nodeRect.top + nodeRect.height / 2
              };
              
              newLines.push({
                from: sourceCenter,
                to: nodeCenter,
                type: "time-to-sankey-state"
              });
            }
          });
        }
      }
    }
    
    // CASE 3: Handle Sankey hover
    if (hoveredSankey && linkDisplayMode === LinkDisplayMode.SHOW_LINKS) {
      // Find the source element (Sankey node)
      const sourceEl = document.getElementById(`sankey-node-${hoveredSankey.name}`);
      if (sourceEl) {
        const sourceRect = sourceEl.getBoundingClientRect();
        const sourceCenter = {
          x: sourceRect.left + sourceRect.width / 2,
          y: sourceRect.top + sourceRect.height / 2
        };

        // 1. Connect to cities if available
        if (hoveredSankey.connectedCities && hoveredSankey.connectedCities.length > 0) {
          hoveredSankey.connectedCities.forEach(city => {
            const targetEl = document.getElementById(`geo-circle-${city}`);
            if (targetEl) {
              const targetRect = targetEl.getBoundingClientRect();
              const cityCenter = {
                x: targetRect.left + targetRect.width / 2,
                y: targetRect.top + targetRect.height / 2
              };
              
              newLines.push({
                from: sourceCenter,
                to: cityCenter,
                type: "sankey-to-city"
              });
            }
          });
        }
        
        // 2. Connect to time bars based on connected cities
        // Calculate days to highlight based on connected cities
        const daysToHighlight = new Set();
        
        if (hoveredSankey.connectedCities && hoveredSankey.connectedCities.length > 0) {
          hoveredSankey.connectedCities.forEach(city => {
            // Find days for this city
            Object.entries(dayToCities).forEach(([dayNum, cities]) => {
              if (cities && cities.has(city)) {
                const date = new Date(+dayNum);
                const dateStr = d3.timeFormat("%Y-%m-%d")(date);
                daysToHighlight.add(dateStr);
              }
            });
          });
        }
        
        // Connect to all days found
        daysToHighlight.forEach(dayStr => {
          const barEl = document.getElementById(`time-bar-${dayStr}`);
          if (barEl) {
            const barRect = barEl.getBoundingClientRect();
            const barCenter = {
              x: barRect.left + barRect.width / 2, 
              y: barRect.top + barRect.height / 2
            };
            
            newLines.push({
              from: sourceCenter,
              to: barCenter,
              type: "sankey-to-time"
            });
          }
        });
      }
    }
    
    // Remove any lines where source and target are the same or invalid
    newLines = newLines.filter(line => {
      // Check if points are valid
      if (!line.from || !line.to || 
          isNaN(line.from.x) || isNaN(line.from.y) || 
          isNaN(line.to.x) || isNaN(line.to.y)) {
        return false;
      }
      
      // Check if source and target are different
      if (Math.abs(line.from.x - line.to.x) < 1 && 
          Math.abs(line.from.y - line.to.y) < 1) {
        return false;
      }
      
      return true;
    });
    
    // Additional filter to remove any connections to the left edge or top-left corner
    // and to handle zoom by only showing connections to visible elements
    newLines = newLines.filter(line => {
      // Get the time graph element for additional context
      const timeGraphEl = document.getElementById("time-graph");
      if (timeGraphEl) {
        const graphRect = timeGraphEl.getBoundingClientRect();
        
        // Get chart coordinates for better filtering
        const chartLeft = graphRect.left;
        const chartRight = graphRect.right;
        const chartTop = graphRect.top;
        const chartBottom = graphRect.bottom;
        
        // For time graph connections only, apply more strict filtering
        if (line.type.includes("time")) {
          // 1. Filter out ALL connections to the first 10% horizontally of the time graph
          const isLeftPortion = (line.to.x < (chartLeft + graphRect.width * 0.1)) && 
                            (line.to.y >= chartTop && line.to.y <= chartBottom);
        
          // 2. Filter out ALL connections to the top 15% of the time graph
          const isTopPortion = (line.to.y < (chartTop + graphRect.height * 0.15)) &&
                            (line.to.x >= chartLeft && line.to.x <= chartRight);
          
          // 3. Extreme corner case - wider area
          const isCorner = (line.to.x < (chartLeft + graphRect.width * 0.2)) && 
                          (line.to.y < (chartTop + graphRect.height * 0.2));
                          
          if (isLeftPortion || isTopPortion || isCorner) {
            return false;
          }
          
          // Ensure the target is actually a time bar and not a label or axis
          // For time connections, validate target element is a real data bar
          const date = new Date(line.to.timestamp);
          if (date && !isNaN(date.getTime())) {
            const dateStr = d3.timeFormat("%Y-%m-%d")(date);
            const timeBarId = `time-bar-${dateStr}`;
            const barEl = document.getElementById(timeBarId);
            if (!barEl) {
              // If we can't find the target time bar element, filter it out
              return false;
            }
          }
          
          // ZOOM HANDLING: Only include lines to targets that are within the visible area of the time graph
          const isTargetInTimeGraph = (line.to.x >= chartLeft && 
                                      line.to.x <= chartRight &&
                                      line.to.y >= chartTop && 
                                      line.to.y <= chartBottom);
                                      
          const isSourceInTimeGraph = (line.from.x >= chartLeft && 
                                      line.from.x <= chartRight &&
                                      line.from.y >= chartTop && 
                                      line.from.y <= chartBottom);
                                      
          // For time-related connections, ensure at least one end is in the visible area
          if (!isTargetInTimeGraph && !isSourceInTimeGraph) {
            return false;
          }
        }
      }
      
      // Also filter out any points that would be outside the viewport or at (0,0)
      const isOutsideViewport = line.to.x < 10 || line.to.y < 10 || line.from.x < 10 || line.from.y < 10;
      return !isOutsideViewport;
    });
    
    console.log(`Setting ${newLines.length} connection lines`);
    setLines(newLines);
  }, [hoveredSankey, hoveredCity, hoveredDay, dayToStates, dayToCities, localDayToCities, linkDisplayMode, setSankeyHighlightedCity]);

  return (
    <div 
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        pointerEvents: "none",
        zIndex: 9999, // Very high z-index to ensure it's above other elements
      }}
    >
      <svg
        ref={svgRef}
        width="100%" 
        height="100%"
        style={{
          position: "absolute", 
          top: 0,
          left: 0,
          overflow: "visible", // Important to allow lines to extend beyond SVG
        }}
      >
        <defs>
          <filter id="drop-shadow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur in="SourceAlpha" stdDeviation="2" />
            <feOffset dx="1" dy="1" result="offsetblur" />
            <feComponentTransfer>
              <feFuncA type="linear" slope="0.5" />
            </feComponentTransfer>
            <feMerge>
              <feMergeNode />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {lines.map((line, idx) => {
          // Calculate curve parameters
          const dx = line.to.x - line.from.x;
          const dy = line.to.y - line.from.y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          
          // Determine direction for better curve orientation
          const isSourceAboveTarget = line.from.y < line.to.y;
          const isSourceLeftOfTarget = line.from.x < line.to.x;
          
          // Lighter, more elegant styling
          let strokeColor, strokeWidth, dashArray, opacity;
          
          switch(line.type) {
            case "city-to-time":
            case "time-to-city":
              strokeColor = "rgba(65, 105, 225, 0.4)"; // Royal blue with more transparency
              strokeWidth = 0.7; // Even thinner lines
              dashArray = "none"; 
              opacity = 0.8; // More transparent
              break;
            case "city-to-sankey":
            case "city-to-state-sankey":
              strokeColor = "rgba(50, 120, 200, 0.4)"; // Slightly different blue for city-sankey links
              strokeWidth = 0.7; // Thin lines
              dashArray = "none";
              opacity = 0.8; // Semi-transparent
              break;
            case "time-to-sankey":
            case "time-to-sankey-state":
              strokeColor = "rgba(70, 130, 180, 0.4)"; // Steel blue for time-sankey links
              strokeWidth = 0.7; // Thin lines
              dashArray = "none";
              opacity = 0.8; // Semi-transparent
              break;
            case "sankey-to-city":
              strokeColor = "rgba(30, 144, 255, 0.4)"; // Dodger blue with more transparency
              strokeWidth = 0.7; // Even thinner lines
              dashArray = "none";
              opacity = 0.8; // More transparent
              break;
            case "sankey-to-time":
              strokeColor = "rgba(95, 158, 160, 0.4)"; // Cadet blue with more transparency
              strokeWidth = 0.7; // Even thinner lines
              dashArray = "none";
              opacity = 0.8; // More transparent
              break;
            default:
              strokeColor = "rgba(65, 105, 225, 0.4)"; // Royal blue with more transparency
              strokeWidth = 0.7; // Even thinner lines
              dashArray = "none";
              opacity = 0.8; // More transparent
          }
          
          // Calculate control points for a more elegant cubic Bézier curve
          // These curves have more natural flow and elegance
          
          // Direction of the curve should be based on the relative positions
          // This is critical to prevent intersections and make curves more natural
          const isMoreHorizontal = Math.abs(dx) > Math.abs(dy);
          
          // Declare control point variables
          let controlPoint1, controlPoint2;
          
          // Calculate a better curve style based on line type
          if (line.type === "city-to-time" || line.type === "time-to-city") {
            // For city-time connections
            // Use a straight line with very slight curve
            // This creates more predictable connections
            
            // Simple symmetric curve
            const midX = (line.from.x + line.to.x) / 2;
            const midY = (line.from.y + line.to.y) / 2;
            
            // Offset from the midpoint for a very gentle curve
            // Only curve about 5% of the distance
            const offsetFactor = 0.05;
            
            // Create a very gentle curve that doesn't dip too far
            controlPoint1 = {
              x: midX,
              y: midY - Math.abs(dx) * offsetFactor // Very shallow curve
            };
            
            controlPoint2 = {
              x: midX,
              y: midY - Math.abs(dx) * offsetFactor // Very shallow curve
            };
          } else {
            // For sankey connections, use more pronounced curves
            const horizontalDirection = isSourceLeftOfTarget ? 1 : -1;
            const widthFactor = 0.2; // Controls horizontal offset
            
            // Vary curvature slightly based on line index to prevent exact overlaps
            const variationFactor = 1 + (idx % 5) * 0.03;
            const adjustedWidthFactor = widthFactor * variationFactor;
            
            controlPoint1 = {
              x: line.from.x + Math.abs(dy) * adjustedWidthFactor * horizontalDirection,
              y: line.from.y + dy * 0.33
            };
            
            controlPoint2 = {
              x: line.to.x + Math.abs(dy) * adjustedWidthFactor * -horizontalDirection,
              y: line.to.y - dy * 0.33
            };
          }
          
          // Path string for a cubic Bézier curve
          const path = `M${line.from.x},${line.from.y} C${controlPoint1.x},${controlPoint1.y} ${controlPoint2.x},${controlPoint2.y} ${line.to.x},${line.to.y}`;
          
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
    </div>
  );
};

export default LineOverlay;