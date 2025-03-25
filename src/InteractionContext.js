import React, { createContext, useState, useEffect } from "react";

// Constants for link display modes
export const LinkDisplayMode = {
  HIGHLIGHT_ONLY: "highlight",
  DIRECT_LINKS: "links",
  LOOP_LINKS: "loop"
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
      }}
    >
      {children}
    </InteractionContext.Provider>
  );
}