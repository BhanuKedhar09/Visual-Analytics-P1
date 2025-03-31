import React, { useState, useRef, useEffect, useContext } from 'react';
import { InteractionContext } from './InteractionContext';
import { DataContext } from './DataLoader';
import RelationshipGraph from './RelationshipGraph';
import { generateInsights } from './services/insightsService';
import * as d3 from 'd3';

function RelationshipPopupLayer({ 
  id, 
  initialPosition, 
  initialInsights = null, 
  initialSelections = {}, 
  onDataUpdate, 
  onSave, 
  onClose 
}) {
  const [position, setPosition] = useState(initialPosition || { x: window.innerWidth - 520, y: 80 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const popupRef = useRef(null);
  const [aiInsights, setAiInsights] = useState(initialInsights);
  const [isLoadingInsights, setIsLoadingInsights] = useState(false);
  const [manualAnalysisRequested, setManualAnalysisRequested] = useState(false);
  const [graphData, setGraphData] = useState(null);
  
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
  
  // Handle mouse events for dragging
  const handleMouseDown = (e) => {
    if (e.target.closest('.window-controls')) return;
    
    // Bring this window to the front by increasing its z-index
    if (popupRef.current) {
      const popups = document.querySelectorAll('.relationship-popup');
      popups.forEach(popup => {
        popup.style.zIndex = '99990';
      });
      popupRef.current.style.zIndex = '99999';
    }
    
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
    
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging]);
  
  // Replace the automatic useEffect with a manual trigger
  useEffect(() => {
    if (!manualAnalysisRequested) return;
    
    // Reset flag
    setManualAnalysisRequested(false);
    
    // Same analysis code as before...
    setIsLoadingInsights(true);
    
    // Prepare the data for AI analysis
    const analysisData = {
      selections: {
        day: hoveredDay ? new Date(hoveredDay).toLocaleDateString() : null,
        sankey: hoveredSankey ? hoveredSankey.name : null,
        city: hoveredCircle ? hoveredCircle : null
      },
      data: getRelevantData(data, hoveredDay, hoveredSankey, hoveredCircle)
    };
    
    // Call the AI service
    generateInsights(analysisData)
      .then(results => {
        setAiInsights(results);
        setIsLoadingInsights(false);
      })
      .catch(error => {
        console.error('Error generating insights:', error);
        setAiInsights({ error: 'Failed to generate insights. Please try again.' });
        setIsLoadingInsights(false);
      });
  }, [manualAnalysisRequested, hoveredDay, hoveredSankey, hoveredCircle, data]);
  
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
  
  // Create graph data from selections
  useEffect(() => {
    if (!hoveredDay && !hoveredSankey && !hoveredCircle) {
      setGraphData(null);
      return;
    }
    
    // Create nodes and links based on current selections
    const nodes = [];
    const links = [];
    
    // Add nodes for current selections
    if (hoveredDay) {
      nodes.push({ 
        id: 'day-' + hoveredDay, 
        name: new Date(hoveredDay).toLocaleDateString(), 
        type: 'time',
        size: 8 
      });
    }
    
    if (hoveredSankey) {
      nodes.push({ 
        id: 'sankey-' + hoveredSankey.name, 
        name: hoveredSankey.name, 
        type: 'merchant',
        size: 7 
      });
    }
    
    if (hoveredCircle) {
      nodes.push({ 
        id: 'city-' + hoveredCircle, 
        name: hoveredCircle, 
        type: 'city',
        size: 7 
      });
    }
    
    // Add related nodes from data context
    // (This would come from your actual data relations)
    // For example, if a day is selected, add cities active on that day
    if (hoveredDay && dayToCities) {
      const dayNum = +d3.timeDay(new Date(hoveredDay));
      const cities = dayToCities[dayNum];
      
      if (cities) {
        cities.forEach(city => {
          if (!nodes.find(n => n.id === 'city-' + city)) {
            nodes.push({
              id: 'city-' + city,
              name: city,
              type: 'city',
              size: 6
            });
          }
          
          links.push({
            source: 'day-' + hoveredDay,
            target: 'city-' + city,
            value: 1
          });
        });
      }
    }
    
    // Similarly add other relationships...
    
    setGraphData({ nodes, links });
    
  }, [hoveredDay, hoveredSankey, hoveredCircle, dayToCities]);
  
  return (
    <div 
      ref={popupRef}
      className="relationship-popup"
      style={{
        position: 'fixed',
        left: `${position.x}px`,
        top: `${position.y}px`,
        width: '500px',
        height: '400px',
        backgroundColor: 'white',
        boxShadow: '0 0 10px rgba(0,0,0,0.2)',
        borderRadius: '8px',
        overflow: 'hidden',
        zIndex: 99999, // Extremely high z-index
        display: 'flex',
        flexDirection: 'column',
        cursor: isDragging ? 'grabbing' : 'default'
      }}
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
        <div className="graph-container" style={{ height: '250px' }}>
          {graphData ? (
            <RelationshipGraph data={graphData} width={450} height={250} />
          ) : (
            <div style={{ 
              height: '250px', 
              backgroundColor: '#f0f0f0', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              marginBottom: '15px',
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
            disabled={isLoadingInsights || (!hoveredDay && !hoveredSankey && !hoveredCircle)}
            style={{
              backgroundColor: '#007bff',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              padding: '8px 12px',
              cursor: isLoadingInsights || (!hoveredDay && !hoveredSankey && !hoveredCircle) ? 'not-allowed' : 'pointer',
              opacity: isLoadingInsights || (!hoveredDay && !hoveredSankey && !hoveredCircle) ? 0.7 : 1
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
              Select elements in the visualizations to generate insights
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default RelationshipPopupLayer; 