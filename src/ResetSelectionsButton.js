// ResetSelectionsButton.js
import React, { useContext } from 'react';
import { InteractionContext } from './InteractionContext';

function ResetSelectionsButton() {
  const { resetSelections } = useContext(InteractionContext);
  return (
    <button onClick={resetSelections} style={{ padding: '10px', fontSize: '16px' }}>
      Reset Selections
    </button>
  );
}

export default ResetSelectionsButton;