import React, { createContext, useState, useEffect } from "react";

// Constants for link display modes
export const LinkDisplayMode = {
  HIGHLIGHT_ONLY: "HIGHLIGHT_ONLY",
  SHOW_LINKS: "SHOW_LINKS"
};

export const InteractionContext = createContext();

export function InteractionProvider({ children }) {
  const [hoveredDay, setHoveredDay] = useState(null);
  const [hoveredCity, setHoveredCity] = useState(null);
  const [selectedDays, setSelectedDays] = useState(new Set());
  const [selectedCities, setSelectedCities] = useState(new Set());
  const [hoveredSankey, setHoveredSankey] = useState(null);
  const [hoveredSankeyLink, setHoveredSankeyLink] = useState(null);
  const [selectedSankeyNodes, setSelectedSankeyNodes] = useState(new Set());
  const [highlightedState, setHighlightedState] = useState(null);
  const [highlightedCity, setHighlightedCity] = useState(null);
  const [timeHighlightedState, setTimeHighlightedState] = useState(null);
  const [timeHighlightedCity, setTimeHighlightedCity] = useState(null);
  const [sankeyHighlightedState, setSankeyHighlightedState] = useState(null);
  const [sankeyHighlightedCity, setSankeyHighlightedCity] = useState(null);
  const [timeHighlightedCities, setTimeHighlightedCities] = useState([]);
  const [circleFilter, setCircleFilter] = useState(null);
  // New: State for Circle Bipartite filters
  const [circleFilters, setCircleFiltersOriginal] = useState(null);
  
  // NEW: Dedicated state for dropped items - direct communication channel
  const [droppedItem, setDroppedItem] = useState(null);
  
  // NEW: Make setDroppedItem available globally for drag end handlers
  useEffect(() => {
    // Expose the setter function to the window object
    window.setDroppedItem = (value) => {
      console.log("Global setDroppedItem called with:", value);
      setDroppedItem(value);
    };
    
    // Clean up when component unmounts
    return () => {
      window.setDroppedItem = undefined;
    };
  }, []);
  
  // Wrap the setter function to ensure the value is always treated as new
  const setCircleFilters = (value) => {
    console.log("InteractionContext: Setting circleFilters to", value);
    // If setting to null, just use the original setter
    if (value === null) {
      setCircleFiltersOriginal(null);
      return;
    }
    
    // Otherwise, create a new object to ensure React detects the change
    setCircleFiltersOriginal({
      ...value,
      _updatedAt: Date.now() // Add a timestamp to ensure uniqueness
    });
  };

  // Debug - track changes to highlighted elements
  useEffect(() => {
    // console.log("InteractionContext: sankeyHighlightedCity changed to", sankeyHighlightedCity);
  }, [sankeyHighlightedCity]);

  useEffect(() => {
    // console.log("InteractionContext: sankeyHighlightedState changed to", sankeyHighlightedState);
  }, [sankeyHighlightedState]);

  // NEW: Debug for circle filters
  useEffect(() => {
    // console.log("InteractionContext: circleFilters changed to", circleFilters);
  }, [circleFilters]);

  useEffect(() => {
    console.log("InteractionContext: circleFilters changed to", circleFilters);
  }, [circleFilters]);

  // NEW: Global mapping of city → Set of day numbers (and its setter)
  const [cityToDays, setCityToDays] = useState({});

  // Existing global mapping (if needed separately)
  const [cityToDaysGlobal, setCityToDaysGlobal] = useState({});

  // Day mappings for cross-filtering
  const [dayToStates, setDayToStates] = useState({});
  const [dayToCities, setDayToCities] = useState({});
  const [dayToOccupations, setDayToOccupations] = useState({});
  const [dayToMerchants, setDayToMerchants] = useState({});

  // Link display mode state
  const [linkDisplayMode, setLinkDisplayMode] = useState(LinkDisplayMode.HIGHLIGHT_ONLY);

  function resetSelections() {
    setHoveredDay(null);
    setHoveredCity(null);
    setSelectedDays(new Set());
    setSelectedCities(new Set());
    setHoveredSankey(null);
    setHoveredSankeyLink(null);
    setSelectedSankeyNodes(new Set());
    setHighlightedState(null);
    setHighlightedCity(null);
    setTimeHighlightedState(null);
    setTimeHighlightedCity(null);
    setSankeyHighlightedState(null);
    setSankeyHighlightedCity(null);
    // New: Reset circle filters
    setCircleFilters(null);
  }

  return (
    <InteractionContext.Provider
      value={{
        hoveredDay,
        setHoveredDay,
        hoveredCity,
        setHoveredCity,
        selectedDays,
        setSelectedDays,
        selectedCities,
        setSelectedCities,
        hoveredSankey,
        setHoveredSankey,
        hoveredSankeyLink,
        setHoveredSankeyLink,
        selectedSankeyNodes,
        setSelectedSankeyNodes,
        highlightedState,
        setHighlightedState,
        highlightedCity,
        setHighlightedCity,
        resetSelections,
        timeHighlightedState,
        setTimeHighlightedState,
        timeHighlightedCity,
        setTimeHighlightedCity,
        sankeyHighlightedState,
        setSankeyHighlightedState,
        sankeyHighlightedCity,
        setSankeyHighlightedCity,
        // City-day mappings
        cityToDays,
        setCityToDays,
        cityToDaysGlobal,
        setCityToDaysGlobal,
        // Day mappings for cross-filtering
        dayToStates,
        setDayToStates,
        dayToCities,
        setDayToCities,
        dayToOccupations,
        setDayToOccupations,
        dayToMerchants,
        setDayToMerchants,
        // Link display mode
        linkDisplayMode,
        setLinkDisplayMode,
        timeHighlightedCities,
        setTimeHighlightedCities,
        // New: Circle filters
        circleFilter,
        setCircleFilter,
        circleFilters,
        setCircleFilters,
        // NEW: Dedicated state for dropped items - direct communication channel
        droppedItem,
        setDroppedItem,
      }}
    >
      {children}
    </InteractionContext.Provider>
  );
}



