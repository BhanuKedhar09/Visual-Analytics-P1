import React, { useState, useEffect } from 'react';
import RelationshipPopupLayer from './RelationshipPopupLayer';

function RelationshipLayerToggle() {
  const [popups, setPopups] = useState([]);
  const [nextId, setNextId] = useState(1);
  const [savedPopups, setSavedPopups] = useState([]);
  
  // Create a new popup
  const createNewPopup = () => {
    const newPopup = {
      id: nextId,
      position: { 
        x: window.innerWidth - 520 - (popups.length * 20), 
        y: 80 + (popups.length * 20) 
      },
      aiInsights: null, // Store AI results here
      selections: {} // Store selections that generated these insights
    };
    
    setPopups([...popups, newPopup]);
    setNextId(nextId + 1);
  };
  
  // Save a popup
  const handleSave = (popupId) => {
    const popupToSave = popups.find(p => p.id === popupId);
    if (popupToSave) {
      // Remove from active popups
      setPopups(popups.filter(p => p.id !== popupId));
      // Add to saved popups
      setSavedPopups([...savedPopups, popupToSave]);
    }
  };
  
  // Close a popup
  const handleClose = (popupId) => {
    setPopups(popups.filter(p => p.id !== popupId));
  };
  
  // Restore a saved popup
  const restoreSavedPopup = (popupId) => {
    const popupToRestore = savedPopups.find(p => p.id === popupId);
    if (popupToRestore) {
      // Remove from saved popups
      setSavedPopups(savedPopups.filter(p => p.id !== popupId));
      // Add to active popups
      setPopups([...popups, popupToRestore]);
    }
  };
  
  // Add handlers to update the popup state
  const updatePopupData = (popupId, data) => {
    setPopups(popups.map(popup => 
      popup.id === popupId 
        ? { ...popup, ...data } 
        : popup
    ));
  };
  
  return (
    <>
      {/* Saved popups collage */}
      {savedPopups.length > 0 && (
        <div 
          className="saved-popups-collage"
          style={{
            position: 'fixed',
            bottom: '80px',
            right: '20px',
            display: 'flex',
            flexWrap: 'wrap',
            justifyContent: 'flex-end',
            width: '300px',
            zIndex: 99999
          }}
        >
          {savedPopups.map((popup, index) => (
            <div 
              key={popup.id}
              className="saved-thumbnail"
              onClick={() => restoreSavedPopup(popup.id)}
              style={{
                width: '100px',
                height: '80px',
                backgroundColor: 'white',
                boxShadow: '0 0 5px rgba(0,0,0,0.2)',
                borderRadius: '4px',
                overflow: 'hidden',
                cursor: 'pointer',
                border: '2px solid #007bff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '11px',
                padding: '5px',
                textAlign: 'center',
                margin: '5px',
                transform: `rotate(${Math.random() * 6 - 3}deg)`, // Slight random rotation for collage effect
                zIndex: 99999 + index // Ensure proper stacking
              }}
            >
              <div>
                <div style={{ 
                  width: '90px', 
                  height: '50px', 
                  backgroundColor: '#f0f0f0', 
                  marginBottom: '4px',
                  borderRadius: '3px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '8px'
                }}>
                  Graph #{popup.id}
                </div>
                <small>Click to expand</small>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Toggle button to create new popup */}
      <button 
        className="layer-toggle"
        onClick={createNewPopup}
        style={{
          position: 'fixed',
          bottom: '20px',
          right: '20px',
          width: '40px',
          height: '50px',
          borderRadius: '5px',
          backgroundColor: '#444',
          color: 'white',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 2px 5px rgba(0,0,0,0.3)',
          border: 'none',
          cursor: 'pointer',
          zIndex: 99999,
          fontSize: '18px',
          flexDirection: 'column'
        }}
      >
        <div style={{ marginBottom: '2px', width: '20px', height: '20px', border: '1px solid white', borderRadius: '2px' }}></div>
        <span style={{ fontSize: '14px' }}>+</span>
      </button>
      
      {/* Render active popups */}
      {popups.map(popup => (
        <RelationshipPopupLayer 
          key={popup.id}
          id={popup.id}
          initialPosition={popup.position}
          initialInsights={popup.aiInsights}
          initialSelections={popup.selections}
          onDataUpdate={(data) => updatePopupData(popup.id, data)}
          onSave={() => handleSave(popup.id)} 
          onClose={() => handleClose(popup.id)} 
        />
      ))}
    </>
  );
}

export default RelationshipLayerToggle; 