import React, { useState, useRef, useEffect, useContext } from 'react';
import { InteractionContext } from './InteractionContext';
import { DataContext } from './DataLoader';
import RelationshipGraph from './RelationshipGraph';
import { generateInsights } from './services/insightsService';
import * as d3 from 'd3';
import { useWindow } from './WindowContext';

function RelationshipPopupLayer({ 
  id, 
  initialPosition, 
  initialInsights = null, 
  initialSelections = {}, 
  onDataUpdate, 
  onSave, 
  onClose 
}) {
  // console.log("RelationshipPopupLayer MOUNT with initialSelections:", JSON.stringify(initialSelections));
  
  const [position, setPosition] = useState(initialPosition || { x: window.innerWidth - 520, y: 80 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const popupRef = useRef(null);
  const [aiInsights, setAiInsights] = useState(initialInsights);
  const [isLoadingInsights, setIsLoadingInsights] = useState(false);
  const [manualAnalysisRequested, setManualAnalysisRequested] = useState(false);
  const [graphData, setGraphData] = useState(null);
  
  // Add state for selected elements - MOVED UP HERE before useEffects
  const [selectedDay, setSelectedDay] = useState(initialSelections.selectedDay || null);
  const [selectedSankey, setSelectedSankey] = useState(initialSelections.selectedSankey || null);
  const [selectedCircle, setSelectedCircle] = useState(initialSelections.selectedCircle || null);
  
  // console.log("Initial state:", { 
  //   selectedDay: selectedDay ? (selectedDay instanceof Date ? selectedDay.toISOString() : selectedDay) : null,
  //   selectedSankey: selectedSankey ? JSON.stringify(selectedSankey) : null,
  //   selectedCircle: selectedCircle
  // });
  
  // Get relevant context data
  const { hoveredDay, hoveredSankey, hoveredCircle, dayToCities: contextDayToCities } = useContext(InteractionContext);
  const { data } = useContext(DataContext);
  
  // Determine if we need to use the context data or create our own mapping
  const [localDayToCities, setLocalDayToCities] = useState({});
  
  // Use contextDayToCities if available, otherwise use our local state
  const dayToCities = contextDayToCities || localDayToCities;
  
  // Renamed useEffect to update localDayToCities instead
  useEffect(() => {
    // Skip if we already have data from context
    if (contextDayToCities || !data || data.length === 0) return;
    
    // Create mapping of days to cities
    const mapping = {};
    data.forEach(item => {
      if (item.date && item.Location) {
        const dayNum = +d3.timeDay(new Date(item.date));
        if (!mapping[dayNum]) {
          mapping[dayNum] = new Set();
        }
        mapping[dayNum].add(item.Location);
      }
    });
    
    // Convert sets to arrays
    const result = {};
    Object.entries(mapping).forEach(([day, citySet]) => {
      result[day] = Array.from(citySet);
    });
    
    setLocalDayToCities(result);
  }, [data, contextDayToCities]);
  
  // Use the window context with the provided id
  const { windowId, zIndex, bringToFront } = useWindow(id, "popup");
  
  // Handle mouse events for dragging
  const handleMouseDown = (e) => {
    if (e.target.closest('.window-controls')) return;
    
    // Bring this window to the front
    bringToFront();
    
    setIsDragging(true);
    const rect = popupRef.current.getBoundingClientRect();
    setDragOffset({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    });
  };
  
  const handleMouseMove = (e) => {
    if (!isDragging) return;
    setPosition({
      x: e.clientX - dragOffset.x,
      y: e.clientY - dragOffset.y
    });
  };
  
  const handleMouseUp = () => {
    setIsDragging(false);
    // Call bringToFront after drag is complete
    setTimeout(bringToFront, 0);
  };
  
  // Add state for window size
  const [windowSize, setWindowSize] = useState({ width: 500, height: 400 });
  const [isResizing, setIsResizing] = useState(false);
  
  // Add resize handlers
  const handleResizeMouseDown = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsResizing(true);
  };
  
  const handleResizeMouseMove = (e) => {
    if (!isResizing) return;
    
    const newWidth = Math.max(300, e.clientX - position.x);
    const newHeight = Math.max(300, e.clientY - position.y);
    
    setWindowSize({ width: newWidth, height: newHeight });
  };
  
  const handleResizeMouseUp = () => {
    setIsResizing(false);
    // Call bringToFront after resize is complete
    setTimeout(bringToFront, 0);
  };
  
  // Add and remove event listeners
  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    } else {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    }
    
    if (isResizing) {
      document.addEventListener('mousemove', handleResizeMouseMove);
      document.addEventListener('mouseup', handleResizeMouseUp);
    } else {
      document.removeEventListener('mousemove', handleResizeMouseMove);
      document.removeEventListener('mouseup', handleResizeMouseUp);
    }
    
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.removeEventListener('mousemove', handleResizeMouseMove);
      document.removeEventListener('mouseup', handleResizeMouseUp);
    };
  }, [isDragging, isResizing]);
  
  // Use effect to trigger initial graph generation when component mounts with initialSelections
  useEffect(() => {
    // console.log("Initial graph generation effect running with initialSelections:", 
    //   JSON.stringify(initialSelections),
    //   "selectedDay:", selectedDay, 
    //   "selectedSankey:", selectedSankey, 
    //   "selectedCircle:", selectedCircle);
      
    // If we have initial selections, force a graph update
    if (Object.keys(initialSelections).length > 0) {
      // console.log("Found initialSelections, generating graph");
      
      // Create graph data directly instead of just setting state
      const nodes = [];
      const links = [];
      let mainNodeId = null;
      
      if (initialSelections.selectedSankey) {
        // console.log("Processing selectedSankey:", initialSelections.selectedSankey);
        const sankeyToUse = initialSelections.selectedSankey;
        const type = sankeyToUse.layer === 0 ? 'state' : 
                    sankeyToUse.layer === 1 ? 'city' : 
                    sankeyToUse.layer === 2 ? 'occupation' : 'merchant';
                    
        const nodeId = `${type}-${sankeyToUse.name}`;
        nodes.push({ 
          id: nodeId, 
          name: sankeyToUse.name, 
          type: type,
          isMain: true,
          details: `Layer ${sankeyToUse.layer}` 
        });
        mainNodeId = nodeId;
        
        setSelectedSankey(initialSelections.selectedSankey);
        
        // Add related data nodes here...
        if (data && data.length > 0) {
          // For city or state nodes, add related merchants
          if (['city', 'state'].includes(sankeyToUse.layer === 0 ? 'state' : 'city')) {
            const relatedMerchants = data
              .filter(row => {
                if (sankeyToUse.layer === 0) {
                  return row.state_id === sankeyToUse.name;
                } else {
                  return row.Location === sankeyToUse.name;
                }
              })
              .map(row => row.MerchantID)
              .filter((v, i, a) => a.indexOf(v) === i) // Unique values
              .slice(0, 5); // Limit to top 5
            
            relatedMerchants.forEach(merchant => {
              nodes.push({
                id: `merchant-${merchant}`,
                name: merchant,
                type: 'merchant',
                details: 'Related merchant'
              });
              
              links.push({
                source: mainNodeId,
                target: `merchant-${merchant}`,
                value: 1
              });
            });
          }
          
          // For occupation nodes, add related cities
          if (sankeyToUse.layer === 2) {
            const relatedCities = data
              .filter(row => row.CustomerOccupation === sankeyToUse.name)
              .map(row => row.Location)
              .filter((v, i, a) => a.indexOf(v) === i)
              .slice(0, 5);
            
            relatedCities.forEach(city => {
              nodes.push({
                id: `city-${city}`,
                name: city,
                type: 'city',
                details: 'Related to occupation'
              });
              
              links.push({
                source: mainNodeId,
                target: `city-${city}`,
                value: 1
              });
            });
          }
        }
      } else if (initialSelections.selectedCircle) {
        const circleToUse = initialSelections.selectedCircle;
        nodes.push({ 
          id: `city-${circleToUse}`, 
          name: circleToUse, 
          type: 'city',
          isMain: true,
          details: 'Geographic location'
        });
        mainNodeId = `city-${circleToUse}`;
        
        setSelectedCircle(initialSelections.selectedCircle);
        
        // Add related data...
        if (data && data.length > 0) {
          // Add related merchants for this city
          const relatedMerchants = data
            .filter(row => row.Location === circleToUse)
            .map(row => row.MerchantID)
            .filter((v, i, a) => a.indexOf(v) === i)
            .slice(0, 5);
          
          relatedMerchants.forEach(merchant => {
            nodes.push({
              id: `merchant-${merchant}`,
              name: merchant,
              type: 'merchant',
              details: 'Related merchant'
            });
            
            links.push({
              source: mainNodeId,
              target: `merchant-${merchant}`,
              value: 1
            });
          });
        }
      } else if (initialSelections.selectedDay) {
        const dayToUse = initialSelections.selectedDay;
        nodes.push({ 
          id: `day-${dayToUse}`, 
          name: new Date(dayToUse).toLocaleDateString(), 
          type: 'time',
          isMain: true,
          details: `Date: ${new Date(dayToUse).toLocaleDateString()}`
        });
        mainNodeId = `day-${dayToUse}`;
        
        setSelectedDay(initialSelections.selectedDay);
        
        // Add cities for this day
        if (dayToCities) {
          const dayNum = +d3.timeDay(new Date(dayToUse));
          const cities = dayToCities[dayNum];
          
          if (cities) {
            cities.forEach(city => {
              nodes.push({
                id: `city-${city}`,
                name: city,
                type: 'city',
                details: 'Active on selected date'
              });
              
              links.push({
                source: mainNodeId,
                target: `city-${city}`,
                value: 1
              });
            });
          }
        }
      }
      
      // Set the graph data directly
      if (nodes.length > 0) {
        console.log("Created initial graph data:", { nodes, links });
        setGraphData({ nodes, links });
      }
      
      // Auto-generate insights for initial selections
      setTimeout(() => {
        setManualAnalysisRequested(true);
      }, 500); // Small delay to ensure graph is ready
    }
  }, [initialSelections, data, dayToCities]); // Add data and dayToCities as dependencies
  
  // Update the useEffect to use both selected and hovered elements and be more stable
  useEffect(() => {
    // Check if we have explicit selections
    const hasExplicitSelection = selectedDay !== null || selectedSankey !== null || selectedCircle !== null;
    
    // console.log("Graph data effect running with selections:", {
    //   hasExplicitSelection,
    //   selectedDay: selectedDay ? (selectedDay instanceof Date ? selectedDay.toISOString() : selectedDay) : null,
    //   selectedSankey: selectedSankey ? JSON.stringify(selectedSankey) : null,
    //   selectedCircle,
    //   hoveredDay,
    //   hoveredSankey,
    //   hoveredCircle
    // });
    
    // If we have explicit selections, don't respond to hover events at all
    const isHoverEvent = !hasExplicitSelection && (hoveredDay || hoveredSankey || hoveredCircle);
    
    // Ignore hover events completely if we have explicit selections
    if (hasExplicitSelection && (hoveredDay || hoveredSankey || hoveredCircle)) {
      // console.log("Ignoring hover event because we have explicit selections");
      return;
    }
    
    // Use selected elements first, never fall back to hovered if we have selections
    const dayToUse = selectedDay !== null ? selectedDay : (isHoverEvent ? hoveredDay : null);
    const sankeyToUse = selectedSankey !== null ? selectedSankey : (isHoverEvent ? hoveredSankey : null);
    const circleToUse = selectedCircle !== null ? selectedCircle : (isHoverEvent ? hoveredCircle : null);
    
    // console.log("Using elements for graph:", {
    //   dayToUse: dayToUse ? (dayToUse instanceof Date ? dayToUse.toISOString() : dayToUse) : null,
    //   sankeyToUse: sankeyToUse ? JSON.stringify(sankeyToUse) : null,
    //   circleToUse
    // });
    
    // Early return if we have nothing to show
    if (!dayToUse && !sankeyToUse && !circleToUse) {
      if (!graphData) return;
      // Only clear graph data if no explicit selections and no hover
      if (!hasExplicitSelection && !isHoverEvent) {
        // console.log("Clearing graph data - no selections or hovers");
        setGraphData(null);
      }
      return;
    }
    
    const nodes = [];
    const links = [];
    
    // Determine the main node based on priority: Sankey > City > Day
    let mainNodeId = null;
    
    if (sankeyToUse) {
      const type = sankeyToUse.layer === 0 ? 'state' : 
                  sankeyToUse.layer === 1 ? 'city' : 
                  sankeyToUse.layer === 2 ? 'occupation' : 'merchant';
                  
      const nodeId = `${type}-${sankeyToUse.name}`;
      nodes.push({ 
        id: nodeId, 
        name: sankeyToUse.name, 
        type: type,
        isMain: true, // Mark as main node
        details: `Layer ${sankeyToUse.layer}` 
      });
      mainNodeId = nodeId;
    } else if (circleToUse) {
      nodes.push({ 
        id: `city-${circleToUse}`, 
        name: circleToUse, 
        type: 'city',
        isMain: true,
        details: 'Geographic location'
      });
      mainNodeId = `city-${circleToUse}`;
    } else if (dayToUse) {
      nodes.push({ 
        id: `day-${dayToUse}`, 
        name: new Date(dayToUse).toLocaleDateString(), 
        type: 'time',
        isMain: true,
        details: `Date: ${new Date(dayToUse).toLocaleDateString()}`
      });
      mainNodeId = `day-${dayToUse}`;
    }
    
    // If we have a day selection and cityToDays data
    if (dayToUse && dayToCities) {
      const dayNum = +d3.timeDay(new Date(dayToUse));
      const cities = dayToCities[dayNum];
      
      if (cities) {
        cities.forEach(city => {
          // Don't add the city again if it's the main node
          if (`city-${city}` === mainNodeId) return;
          
          // Check if node already exists
          if (!nodes.find(n => n.id === `city-${city}`)) {
            nodes.push({
              id: `city-${city}`,
              name: city,
              type: 'city',
              details: 'Active on selected date'
            });
          }
          
          links.push({
            source: mainNodeId || `day-${dayToUse}`,
            target: `city-${city}`,
            value: 1
          });
        });
      }
    }
    
    // If we have a Sankey node selected, add related data
    if (sankeyToUse) {
      // This would contain logic to find related entities to the selected Sankey node
      // Examples based on your CSV columns:
      
      // For city or state nodes, add related merchants
      if (['city', 'state'].includes(sankeyToUse.layer === 0 ? 'state' : 'city')) {
        // This is pseudocode - you'd need to access your actual data
        const relatedMerchants = data
          .filter(row => {
            if (sankeyToUse.layer === 0) {
              return row.state_id === sankeyToUse.name;
            } else {
              return row.Location === sankeyToUse.name;
            }
          })
          .map(row => row.MerchantID)
          .filter((v, i, a) => a.indexOf(v) === i) // Unique values
          .slice(0, 5); // Limit to top 5
        
        relatedMerchants.forEach(merchant => {
          if (!nodes.find(n => n.id === `merchant-${merchant}`)) {
            nodes.push({
              id: `merchant-${merchant}`,
              name: merchant,
              type: 'merchant',
              details: 'Related merchant'
            });
          }
          
          links.push({
            source: mainNodeId,
            target: `merchant-${merchant}`,
            value: 1
          });
        });
      }
      
      // For occupation nodes, add related cities
      if (sankeyToUse.layer === 2) {
        const relatedCities = data
          .filter(row => row.CustomerOccupation === sankeyToUse.name)
          .map(row => row.Location)
          .filter((v, i, a) => a.indexOf(v) === i)
          .slice(0, 5);
        
        relatedCities.forEach(city => {
          if (!nodes.find(n => n.id === `city-${city}`)) {
            nodes.push({
              id: `city-${city}`,
              name: city,
              type: 'city',
              details: 'Related to occupation'
            });
          }
          
          links.push({
            source: mainNodeId,
            target: `city-${city}`,
            value: 1
          });
        });
      }
    }
    
    // console.log("Created graph data with nodes:", nodes.length, "links:", links.length);
    setGraphData({ nodes, links });
    
  }, [selectedDay, selectedSankey, selectedCircle, hoveredDay, hoveredSankey, hoveredCircle, dayToCities, data]);
  
  // Replace the automatic useEffect with a manual trigger that handles both selections and hovers
  useEffect(() => {
    if (!manualAnalysisRequested) return;
    
    // Reset flag
    setManualAnalysisRequested(false);
    
    // Get the effective elements to use (selected takes priority over hovered)
    const dayToUse = selectedDay || hoveredDay;
    const sankeyToUse = selectedSankey || hoveredSankey;
    const circleToUse = selectedCircle || hoveredCircle;
    
    if (!dayToUse && !sankeyToUse && !circleToUse) {
      // console.log("No elements selected or hovered for insights generation");
      setAiInsights(null);
      setIsLoadingInsights(false);
      return;
    }
    
    // Same analysis code as before...
    setIsLoadingInsights(true);
    
    // Prepare the data for AI analysis
    const analysisData = {
      selections: {
        day: dayToUse ? new Date(dayToUse).toLocaleDateString() : null,
        sankey: sankeyToUse ? sankeyToUse.name : null,
        city: circleToUse
      },
      data: getRelevantData(data, dayToUse, sankeyToUse, circleToUse)
    };
    
    // console.log("Generating insights for:", analysisData.selections);
    
    // Call the AI service
    generateInsights(analysisData)
      .then(results => {
        setAiInsights(results);
        setIsLoadingInsights(false);
      })
      .catch(error => {
        // console.error('Error generating insights:', error);
        setAiInsights({ error: 'Failed to generate insights. Please try again.' });
        setIsLoadingInsights(false);
      });
  }, [manualAnalysisRequested, hoveredDay, hoveredSankey, hoveredCircle, selectedDay, selectedSankey, selectedCircle, data]);
  
  // Function to filter relevant data for analysis
  function getRelevantData(allData, day, sankey, city) {
    // Filter the data based on the selections
    return allData.filter(item => {
      if (day && new Date(item.date).getTime() !== new Date(day).getTime()) return false;
      if (sankey && item.category !== sankey.name) return false;
      if (city && item.Location !== city) return false;
      return true;
    });
  }
  
  // Add export function
  const exportInsights = () => {
    if (!aiInsights) return;
    
    const content = `
Data Analysis Insights
=====================
${aiInsights.summary}

Metrics:
- Transactions: ${aiInsights.details?.transactionCount || 'N/A'}
- Total Value: $${aiInsights.details?.totalValue || 'N/A'}
- Top Merchant: ${aiInsights.details?.topMerchant || 'N/A'}
- Average Amount: $${aiInsights.details?.averageAmount || 'N/A'}

Generated on: ${new Date().toLocaleString()}
    `;
    
    // Create blob and trigger download
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `insights-${id}-${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };
  
  // Add console logging to debug
  // console.log("Graph data:", graphData);
  
  // Add a click handler function to set selected elements
  const handleElementClick = (type, value) => {
    if (type === 'day') {
      setSelectedDay(value);
      setSelectedSankey(null);
      setSelectedCircle(null);
    } else if (type === 'sankey') {
      setSelectedDay(null);
      setSelectedSankey(value);
      setSelectedCircle(null);
    } else if (type === 'circle') {
      setSelectedDay(null);
      setSelectedSankey(null);
      setSelectedCircle(value);
    }
  };
  
  return (
    <div 
      ref={popupRef}
      id={windowId}
      className="relationship-popup"
      style={{
        position: 'fixed',
        left: `${position.x}px`,
        top: `${position.y}px`,
        width: `${windowSize.width}px`,
        height: `${windowSize.height}px`,
        backgroundColor: 'white',
        boxShadow: '0 0 10px rgba(0,0,0,0.2)',
        borderRadius: '8px',
        overflow: 'hidden',
        zIndex: zIndex,
        display: 'flex',
        flexDirection: 'column',
        cursor: isDragging ? 'grabbing' : 'default',
        transition: isDragging || isResizing ? 'none' : 'left 0.2s, top 0.2s, width 0.2s, height 0.2s'
      }}
      onClick={bringToFront}
    >
      {/* Window title bar */}
      <div 
        className="window-title-bar"
        onMouseDown={handleMouseDown}
        style={{
          backgroundColor: '#007bff',
          color: 'white',
          padding: '8px 15px',
          fontWeight: 'bold',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          cursor: 'grab'
        }}
      >
        <span>Relationship Graph #{id}</span>
        <div className="window-controls" style={{ display: 'flex' }}>
          {aiInsights && (
            <button 
              onClick={exportInsights}
              title="Export insights"
              style={{
                background: 'none',
                border: 'none',
                color: 'white',
                fontSize: '14px',
                marginRight: '10px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center'
              }}
            >
              {/* Export icon */}
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M8 12L8 4" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
                <path d="M4 8L8 4L12 8" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M3 12H13" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
            </button>
          )}
          <button 
            onClick={onSave}
            title="Save to collage"
            style={{
              background: 'none',
              border: 'none',
              color: 'white',
              fontSize: '14px',
              marginRight: '10px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center'
            }}
          >
            {/* Save icon (floppy disk) */}
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M13.5 3.5V14.5H2.5V1.5H11.5L13.5 3.5Z" stroke="white" strokeWidth="1.5"/>
              <rect x="4.5" y="1.5" width="7" height="5" stroke="white" strokeWidth="1.5"/>
              <rect x="4.5" y="9.5" width="7" height="5" stroke="white" strokeWidth="1.5"/>
              <line x1="7.5" y1="3.5" x2="7.5" y2="4.5" stroke="white" strokeWidth="1.5"/>
            </svg>
          </button>
          <button 
            onClick={onClose}
            title="Close"
            style={{
              background: 'none',
              border: 'none',
              color: 'white',
              fontSize: '16px',
              cursor: 'pointer'
            }}
          >
            ×
          </button>
        </div>
      </div>
      
      {/* Window content */}
      <div className="window-content" style={{ padding: '15px', flex: 1, overflow: 'auto' }}>
        {/* Placeholder for graph visualization */}
        <div className="graph-container" style={{ height: '250px', border: '1px solid #ddd' }}>
          {graphData ? (
            <>
              <RelationshipGraph data={graphData} width={windowSize.width - 30} height={250} />
              {/* Debug output */}
              <div style={{ position: 'absolute', right: '5px', top: '5px', fontSize: '10px', color: '#999' }}>
                Nodes: {graphData.nodes.length}, Links: {graphData.links.length}
              </div>
            </>
          ) : (
            <div style={{ 
              height: '100%', 
              backgroundColor: '#f0f0f0', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              borderRadius: '4px'
            }}>
              <p>Select elements in visualizations to see relationships</p>
            </div>
          )}
        </div>
        
        {/* AI Insights section */}
        <div style={{ marginBottom: '15px', textAlign: 'right' }}>
          <button
            onClick={() => setManualAnalysisRequested(true)}
            disabled={isLoadingInsights || (!selectedDay && !selectedSankey && !selectedCircle && !hoveredDay && !hoveredSankey && !hoveredCircle)}
            style={{
              backgroundColor: '#007bff',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              padding: '8px 12px',
              cursor: isLoadingInsights || (!selectedDay && !selectedSankey && !selectedCircle && !hoveredDay && !hoveredSankey && !hoveredCircle) ? 'not-allowed' : 'pointer',
              opacity: isLoadingInsights || (!selectedDay && !selectedSankey && !selectedCircle && !hoveredDay && !hoveredSankey && !hoveredCircle) ? 0.7 : 1
            }}
          >
            {isLoadingInsights ? 'Analyzing...' : 'Generate Insights'}
          </button>
        </div>
        
        <div className="insights-container">
          <h4>Data Insights</h4>
          {isLoadingInsights ? (
            <div className="loading-insights" style={{
              padding: '15px',
              backgroundColor: '#f0f0f0',
              borderRadius: '4px',
              textAlign: 'center'
            }}>
              <div className="spinner" style={{
                width: '25px',
                height: '25px',
                border: '3px solid rgba(0, 123, 255, 0.3)',
                borderTop: '3px solid #007bff',
                borderRadius: '50%',
                margin: '0 auto 10px auto',
                animation: 'spin 1s linear infinite'
              }}></div>
              <p>Generating insights...</p>
              <style>{`
                @keyframes spin {
                  0% { transform: rotate(0deg); }
                  100% { transform: rotate(360deg); }
                }
                @keyframes fadeIn {
                  from { opacity: 0; }
                  to { opacity: 1; }
                }
                .insights-content {
                  animation: fadeIn 0.3s ease-in-out;
                }
              `}</style>
            </div>
          ) : aiInsights ? (
            <div className="insights-content" style={{
              padding: '12px',
              backgroundColor: '#f8f9fa',
              borderRadius: '4px',
              border: '1px solid #dee2e6'
            }}>
              {aiInsights.error ? (
                <div className="error-message" style={{ color: '#dc3545' }}>
                  {aiInsights.error}
                </div>
              ) : (
                <>
                  <div className="summary" style={{ 
                    marginBottom: '10px',
                    lineHeight: '1.5'
                  }}>
                    {aiInsights.summary}
                  </div>
                  
                  {aiInsights.details && (
                    <div className="metrics" style={{
                      display: 'flex',
                      flexWrap: 'wrap',
                      gap: '10px',
                      marginTop: '10px'
                    }}>
                      <div className="metric-card" style={{
                        flex: '1 0 45%',
                        backgroundColor: '#e9ecef',
                        padding: '8px',
                        borderRadius: '4px',
                        textAlign: 'center'
                      }}>
                        <div style={{ fontWeight: 'bold' }}>{aiInsights.details.transactionCount}</div>
                        <div style={{ fontSize: '12px', color: '#6c757d' }}>Transactions</div>
                      </div>
                      
                      <div className="metric-card" style={{
                        flex: '1 0 45%',
                        backgroundColor: '#e9ecef',
                        padding: '8px',
                        borderRadius: '4px',
                        textAlign: 'center'
                      }}>
                        <div style={{ fontWeight: 'bold' }}>${aiInsights.details.totalValue}</div>
                        <div style={{ fontSize: '12px', color: '#6c757d' }}>Total Value</div>
                      </div>
                      
                      <div className="metric-card" style={{
                        flex: '1 0 45%',
                        backgroundColor: '#e9ecef',
                        padding: '8px',
                        borderRadius: '4px',
                        textAlign: 'center'
                      }}>
                        <div style={{ fontWeight: 'bold' }}>{aiInsights.details.topMerchant}</div>
                        <div style={{ fontSize: '12px', color: '#6c757d' }}>Top Merchant</div>
                      </div>
                      
                      <div className="metric-card" style={{
                        flex: '1 0 45%',
                        backgroundColor: '#e9ecef',
                        padding: '8px',
                        borderRadius: '4px',
                        textAlign: 'center'
                      }}>
                        <div style={{ fontWeight: 'bold' }}>${aiInsights.details.averageAmount}</div>
                        <div style={{ fontSize: '12px', color: '#6c757d' }}>Avg. Amount</div>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          ) : (
            <div className="no-insights" style={{
              padding: '15px',
              backgroundColor: '#f0f0f0',
              borderRadius: '4px',
              textAlign: 'center',
              color: '#6c757d'
            }}>
              {selectedDay || selectedSankey || selectedCircle ? 
                "Click 'Generate Insights' to analyze the selected elements" : 
                "Select elements in the visualizations to generate insights"}
            </div>
          )}
        </div>
      </div>
      
      {/* Add resize handle */}
      <div 
        className="resize-handle"
        onMouseDown={handleResizeMouseDown}
        style={{
          position: 'absolute',
          right: '0',
          bottom: '0',
          width: '15px',
          height: '15px',
          cursor: 'nwse-resize',
          background: 'transparent'
        }}
      >
        <svg width="10" height="10" viewBox="0 0 10 10" style={{ position: 'absolute', right: '2px', bottom: '2px' }}>
          <path d="M0,10 L10,0 L10,10 Z" fill="#007bff" opacity="0.5" />
        </svg>
      </div>
    </div>
  );
}

export default RelationshipPopupLayer; 