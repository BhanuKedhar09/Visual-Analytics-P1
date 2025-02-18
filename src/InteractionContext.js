// InteractionContext.js
import React, { createContext, useState } from 'react';

export const InteractionContext = createContext();

export function InteractionProvider({ children }) {
  const [hoveredDay, setHoveredDay] = useState(null);      // Date or null
  const [hoveredCity, setHoveredCity] = useState(null);    // string or null
  const [selectedDays, setSelectedDays] = useState(new Set());
  const [selectedCities, setSelectedCities] = useState(new Set());

  function resetSelections() {
    setHoveredDay(null);
    setHoveredCity(null);
    setSelectedDays(new Set());
    setSelectedCities(new Set());
  }

  return (
    <InteractionContext.Provider value={{
      hoveredDay, setHoveredDay,
      hoveredCity, setHoveredCity,
      selectedDays, setSelectedDays,
      selectedCities, setSelectedCities,
      resetSelections
    }}>
      {children}
    </InteractionContext.Provider>
  );
}