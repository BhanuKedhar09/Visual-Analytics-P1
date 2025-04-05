import React, { useState, useEffect } from 'react';
import RelationshipPopupLayer from './RelationshipPopupLayer';

function RelationshipLayerToggle({ popupsVisible = true }) {
  const [popups, setPopups] = useState([]);
  const [nextId, setNextId] = useState(1);
  const [savedPopups, setSavedPopups] = useState([]);
  const [autoRestoreEnabled, setAutoRestoreEnabled] = useState(false); // Default to not auto-restore
  
  // Create a new popup
  const createNewPopup = () => {
    const newPopup = {
      id: nextId,
      position: { 
        x: Math.max(100, window.innerWidth/2 - 250), 
        y: Math.max(100, window.innerHeight/2 - 200)
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
      console.log(`Saving popup ${popupId} with initialSelections:`, 
        popupToSave.initialSelections ? JSON.stringify(popupToSave.initialSelections) : "undefined");
      
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
    console.log(`Updating popup ${popupId} with data:`, JSON.stringify(data));
    
    setPopups(popups.map(popup => 
      popup.id === popupId 
        ? { 
            ...popup, 
            ...data,
            // Ensure initialSelections is preserved
            initialSelections: popup.initialSelections
          } 
        : popup
    ));
  };
  
  // Clear all popups and reset counter
  const clearAllPopups = () => {
    setPopups([]);
    setSavedPopups([]);
    setNextId(1);
    localStorage.removeItem('visualAnalytics.popups');
  };
  
  // Add useEffect to save popup states to localStorage
  useEffect(() => {
    if (popups.length > 0 || savedPopups.length > 0) {
      localStorage.setItem('visualAnalytics.popups', JSON.stringify({
        active: popups,
        saved: savedPopups,
        nextId,
        autoRestoreEnabled
      }));
    } else {
      // If no popups, clear localStorage
      localStorage.removeItem('visualAnalytics.popups');
    }
  }, [popups, savedPopups, nextId, autoRestoreEnabled]);

  // Load saved state on component mount - only if autoRestoreEnabled
  useEffect(() => {
    try {
      const savedState = localStorage.getItem('visualAnalytics.popups');
      if (savedState) {
        const { active, saved, nextId: nextIdSaved, autoRestoreEnabled: savedAutoRestore } = JSON.parse(savedState);
        
        // Set autoRestoreEnabled from saved state
        if (savedAutoRestore !== undefined) {
          setAutoRestoreEnabled(savedAutoRestore);
        }
        
        // Only restore popups if autoRestoreEnabled was true
        if (savedAutoRestore) {
          if (saved && saved.length) setSavedPopups(saved);
          if (active && active.length) setPopups(active);
          if (nextIdSaved) setNextId(nextIdSaved);
        } else {
          // Otherwise just restore the counter to continue numbering
          if (nextIdSaved) setNextId(nextIdSaved);
        }
      }
    } catch (e) {
      console.error('Error loading saved popup state:', e);
      // Reset to defaults on error
      setPopups([]);
      setSavedPopups([]);
      setNextId(1);
    }
  }, []);
  
  // Add a method to create a popup with pre-selected data
  const createPopupWithData = (elementData) => {
    // Determine the element type and create appropriate data
    console.log("createPopupWithData called with:", JSON.stringify(elementData));
    
    let initialSelections = {};
    
    if (elementData.type === 'state' || elementData.type === 'city' || 
        elementData.type === 'occupation' || elementData.type === 'merchant') {
      initialSelections.selectedSankey = {
        name: elementData.value,
        layer: elementData.type === 'state' ? 0 : 
               elementData.type === 'city' ? 1 :
               elementData.type === 'occupation' ? 2 : 3
      };
    } else if (elementData.type === 'time') {
      initialSelections.selectedDay = new Date(elementData.value);
    } else if (elementData.type === 'geo-circle') {
      initialSelections.selectedCircle = elementData.value;
    }
    
    console.log("Creating popup with initialSelections:", JSON.stringify(initialSelections));
    
    // Create a new popup with this selection data - positioned in center
    const newPopup = {
      id: nextId,
      position: { 
        x: Math.max(100, window.innerWidth/2 - 250), 
        y: Math.max(100, window.innerHeight/2 - 200)
      },
      initialSelections: initialSelections  // Use initialSelections instead of selectedData
    };
    
    setPopups([...popups, newPopup]);
    setNextId(nextId + 1);
  };

  // Make this function globally available
  useEffect(() => {
    window.createRelationshipPopup = createPopupWithData;
    
    return () => {
      delete window.createRelationshipPopup;
    };
  }, [popups.length, nextId]);
  
  return (
    <>
      <div className="collage-controls" style={{ position: 'fixed', bottom: '20px', right: '20px', zIndex: 9999 }}>
        {/* Saved popup thumbnails */}
        <div 
          className="saved-popups-collage"
          style={{
            marginBottom: '10px',
            display: 'flex',
            flexWrap: 'wrap',
            gap: '5px',
            maxWidth: '200px',
            justifyContent: 'flex-end'
          }}
        >
          {savedPopups.map(popup => (
            <div 
              key={popup.id}
              onClick={() => restoreSavedPopup(popup.id)}
              style={{
                width: '40px',
                height: '40px',
                backgroundColor: '#f0f0f0',
                border: '1px solid #ccc',
                borderRadius: '4px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '10px',
                cursor: 'pointer',
                color: '#666'
              }}
            >
              #{popup.id}
            </div>
          ))}
        </div>
      </div>
      
      {/* Only render active popups if popupsVisible is true */}
      {popupsVisible && popups.map(popup => {
        console.log(`Rendering popup ${popup.id} with initialSelections:`, popup.initialSelections ? JSON.stringify(popup.initialSelections) : "undefined");
        
        return (
          <RelationshipPopupLayer 
            key={popup.id}
            id={popup.id}
            initialPosition={popup.position}
            initialInsights={popup.aiInsights}
            initialSelections={popup.initialSelections || {}}
            onDataUpdate={(data) => updatePopupData(popup.id, data)}
            onSave={() => handleSave(popup.id)} 
            onClose={() => handleClose(popup.id)} 
          />
        );
      })}
    </>
  );
}

export default RelationshipLayerToggle; 
