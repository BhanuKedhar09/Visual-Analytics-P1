// DataLoader.js
import React, { createContext, useEffect, useState } from 'react';
import * as d3 from 'd3';

// Create a context to share data across components
export const DataContext = createContext();

export function DataProvider({ children }) {
  const [data, setData] = useState([]);

  useEffect(() => {
    // Load the CSV file from the public folder
    d3.csv(process.env.PUBLIC_URL + '/bank_transactions_data_2.csv')
      .then((loadedData) => {
        // console.log("Data loaded:", typeof loadedData, loadedData[0]);
        setData(loadedData);
      })
      .catch(err => console.error("Error loading CSV data:", err));
  }, []);

  return (
    <DataContext.Provider value={{ data, setData }}>
      {children}
    </DataContext.Provider>
  );
}