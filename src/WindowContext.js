import React, { createContext, useContext, useState, useRef, useEffect } from 'react';

// Create context
const WindowContext = createContext();

// Create provider
export function WindowProvider({ children }) {
  const [activeWindowId, setActiveWindowId] = useState(null);
  const nextZIndex = useRef(100);
  
  // Keep track of all registered windows and their z-indices
  const [windows, setWindows] = useState({});
  
  // Register a window with the context
  const registerWindow = (id, type) => {
    const windowId = id || `window-${Math.random().toString(36).substr(2, 9)}`;
    setWindows(prev => ({
      ...prev,
      [windowId]: { id: windowId, type, zIndex: nextZIndex.current }
    }));
    nextZIndex.current += 1;
    return windowId;
  };
  
  // Unregister a window
  const unregisterWindow = (id) => {
    setWindows(prev => {
      const newWindows = { ...prev };
      delete newWindows[id];
      return newWindows;
    });
  };
  
  // Bring a window to the front
  const bringToFront = (id) => {
    if (!windows[id]) return;
    
    nextZIndex.current += 1;
    const newZIndex = nextZIndex.current;
    
    // IMPROVED FIX: Immediate DOM update with requestAnimationFrame
    // This ensures z-index changes immediately during drag operations
    if (document.getElementById(id)) {
      requestAnimationFrame(() => {
        const element = document.getElementById(id);
        if (element) {
          element.style.zIndex = newZIndex;
        }
      });
    }
    
    setWindows(prev => ({
      ...prev,
      [id]: { ...prev[id], zIndex: newZIndex }
    }));
    
    setActiveWindowId(id);
    return newZIndex;
  };
  
  // Get a window's current z-index
  const getZIndex = (id) => {
    return windows[id]?.zIndex || nextZIndex.current;
  };
  
  return (
    <WindowContext.Provider 
      value={{ 
        registerWindow, 
        unregisterWindow, 
        bringToFront, 
        getZIndex,
        activeWindowId
      }}
    >
      {children}
    </WindowContext.Provider>
  );
}

// Custom hook to use the window context
export function useWindow(id, type) {
  const context = useContext(WindowContext);
  
  // Check if context exists before destructuring
  if (!context) {
    throw new Error('useWindow must be used within a WindowProvider');
  }
  
  const { registerWindow, unregisterWindow, bringToFront, getZIndex, activeWindowId } = context;
  
  const [windowId, setWindowId] = useState(null);
  
  useEffect(() => {
    // Register this window when the component mounts
    const newId = registerWindow(id, type);
    setWindowId(newId);
    
    // Unregister when component unmounts
    return () => {
      if (newId) {
        unregisterWindow(newId);
      }
    };
  }, [id, type, registerWindow, unregisterWindow]);
  
  // Skip if windowId isn't set yet
  if (!windowId) {
    return {
      windowId: id || 'window-initializing',
      zIndex: 100,
      isActive: false,
      bringToFront: () => {}
    };
  }
  
  return {
    windowId,
    zIndex: getZIndex(windowId),
    isActive: activeWindowId === windowId,
    bringToFront: () => bringToFront(windowId)
  };
}

export default WindowContext; 