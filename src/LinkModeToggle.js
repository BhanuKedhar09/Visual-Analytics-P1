import React, { useContext } from "react";
import { InteractionContext, LinkDisplayMode } from "./InteractionContext";

const LinkModeToggle = () => {
  const { linkDisplayMode, setLinkDisplayMode } = useContext(InteractionContext);

  const handleModeChange = (mode) => {
    console.log(`Changing link mode to: ${mode}`);
    setLinkDisplayMode(mode);
  };

  return (
    <div style={{ 
      display: 'flex',
      alignItems: 'center',
      marginRight: '20px',
      backgroundColor: 'white',
      padding: '5px',
      borderRadius: '4px',
      boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
    }}>
      <span style={{ marginRight: '8px', fontSize: '14px' }}>Links:</span>
      <button
        onClick={() => handleModeChange(LinkDisplayMode.HIGHLIGHT_ONLY)}
        style={{
          padding: '4px 8px',
          marginRight: '4px',
          border: '1px solid #ccc',
          borderRadius: '4px',
          background: linkDisplayMode === LinkDisplayMode.HIGHLIGHT_ONLY ? '#e0e0e0' : 'white',
          cursor: 'pointer',
          fontSize: '12px'
        }}
        title="Highlight elements without drawing connecting lines"
      >
        Highlight
      </button>
      <button
        onClick={() => handleModeChange(LinkDisplayMode.SHOW_LINKS)}
        style={{
          padding: '4px 8px',
          marginRight: '4px',
          border: '1px solid #ccc',
          borderRadius: '4px',
          background: linkDisplayMode === LinkDisplayMode.SHOW_LINKS ? '#e0e0e0' : 'white',
          cursor: 'pointer',
          fontSize: '12px'
        }}
        title="Draw direct links between related elements"
      >
        Links
      </button>
    </div>
  );
};

export default LinkModeToggle; 