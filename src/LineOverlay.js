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

    let newLines = [];

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
    
    console.log(`LINES: Creating ${newLines.length} connection lines in total`);
    setLines(newLines);
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
