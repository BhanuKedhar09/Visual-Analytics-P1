// InteractionContext.js
import React, { createContext, useState, useEffect } from "react";

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
  const [interactionState, setInteractionState] = useState({
    highlightedState: null,
    highlightedCity: null,
  });
  const [timeHighlightedState, setTimeHighlightedState] = useState(null);
  const [timeHighlightedCity, setTimeHighlightedCity] = useState(null);
  const [sankeyHighlightedState, setSankeyHighlightedState] = useState(null);
  const [sankeyHighlightedCity, setSankeyHighlightedCity] = useState(null);

  const updateInteractionContext = (updates) => {
    setInteractionState((prev) => ({ ...prev, ...updates }));
  };
  // Debug effect: log whenever highlight changes
  // useEffect(() => {
  //   console.log("highlightedState changed:", highlightedState);
  //   console.log("highlightedCity changed:", highlightedCity);
  // }, [highlightedState, highlightedCity]);

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
    // setMapHighlightedState(null);
    // setMapHighlightedCity(null);
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
        // interactionState,
      }}
    >
      {children}
    </InteractionContext.Provider>
  );
}
