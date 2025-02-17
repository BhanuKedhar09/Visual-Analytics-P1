// DataStatus.js
import React, { useContext } from 'react';
import { DataContext } from './DataLoader';

function DataStatus() {
  const { data } = useContext(DataContext);
  return (
    <div>
      {data.length > 0 ? `Loaded ${data.length} records` : 'Loading data...'}
    </div>
  );
}

export default DataStatus;