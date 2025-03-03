// InteractionContext.js
import React, { createContext, useState } from 'react';

export const InteractionContext = createContext();

export function InteractionProvider({ children }) {
  const [hoveredDay, setHoveredDay] = useState(null);
  const [hoveredCity, setHoveredCity] = useState(null);
  const [selectedDays, setSelectedDays] = useState(new Set());
  const [selectedCities, setSelectedCities] = useState(new Set());
  const [hoveredSankey, setHoveredSankey] = useState(null);
  const [hoveredSankeyLink, setHoveredSankeyLink] = useState(null);
  const [selectedSankeyNodes, setSelectedSankeyNodes] = useState(new Set());

  function resetSelections() {
    setHoveredDay(null);
    setHoveredCity(null);
    setSelectedDays(new Set());
    setSelectedCities(new Set());
    setHoveredSankey(null);
    setHoveredSankeyLink(null);
    setSelectedSankeyNodes(new Set());
  }

  return (
    <InteractionContext.Provider value={{
      hoveredDay, setHoveredDay,
      hoveredCity, setHoveredCity,
      selectedDays, setSelectedDays,
      selectedCities, setSelectedCities,
      hoveredSankey, setHoveredSankey,
      hoveredSankeyLink, setHoveredSankeyLink,
      selectedSankeyNodes, setSelectedSankeyNodes,
      resetSelections
    }}>
      {children}
    </InteractionContext.Provider>
  );
}