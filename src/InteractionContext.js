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

  // New: State for Circle Bipartite filters
  const [circleFilters, setCircleFilters] = useState(null);
  
  // Debug - track changes to highlighted elements
  useEffect(() => {
    console.log("InteractionContext: sankeyHighlightedCity changed to", sankeyHighlightedCity);
  }, [sankeyHighlightedCity]);

  useEffect(() => {
    console.log("InteractionContext: sankeyHighlightedState changed to", sankeyHighlightedState);
  }, [sankeyHighlightedState]);

  // NEW: Debug for circle filters
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
        circleFilters,
        setCircleFilters,
      }}
    >
      {children}
    </InteractionContext.Provider>
  );
}