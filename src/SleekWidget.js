// SleekWidget.js
import React, { useState, Children, cloneElement } from "react";
import { Rnd } from "react-rnd";

function SleekWidget({
  title = "Widget",
  initialWidth = 600,
  initialHeight = 350,
  initialX = 50,
  initialY = 50,
  onClose = () => {},
  children,
}) {
  const HEADER_HEIGHT = 32;

  // Use the initialX, initialY for the default position
  const [position, setPosition] = useState({ x: initialX, y: initialY });
  const [size, setSize] = useState({ width: initialWidth, height: initialHeight });

  const [isMinimized, setIsMinimized] = useState(false);
  const [prevSize, setPrevSize] = useState(size);

  const handleMinimize = () => {
    if (!isMinimized) {
      setPrevSize(size);
      setSize({ width: size.width, height: HEADER_HEIGHT });
      setIsMinimized(true);
    } else {
      setSize(prevSize);
      setIsMinimized(false);
    }
  };

  const handleClose = () => onClose();

  let content = null;
  if (!isMinimized && Children.count(children) === 1) {
    const childWidth = Math.max(size.width - 20, 0);
    const childHeight = Math.max(size.height - HEADER_HEIGHT - 10, 0);

    const onlyChild = Children.only(children);
    content = cloneElement(onlyChild, {
      width: childWidth,
      height: childHeight,
    });
  } else if (!isMinimized) {
    content = children;
  }

  return (
    <Rnd
      position={position}
      size={size}
      onDragStop={(e, data) => setPosition({ x: data.x, y: data.y })}
      onResizeStop={(e, direction, ref, delta, pos) => {
        setSize({
          width: parseInt(ref.style.width, 10),
          height: parseInt(ref.style.height, 10),
        });
        setPosition({ x: pos.x, y: pos.y });
      }}
      minWidth={200}
      minHeight={HEADER_HEIGHT}
      bounds="parent"
      style={{
        border: "1px solid #ddd",
        background: "#fff",
        boxShadow: "0 2px 5px rgba(0, 0, 0, 0.2)",
        display: "flex",
        flexDirection: "column",
        borderRadius: "8px",
      }}
      dragHandleClassName="sleek-widget-header"
    >
      <div
        className="sleek-widget-header"
        style={{
          height: HEADER_HEIGHT,
          background: "linear-gradient(to bottom, #fafafa, #ececec)",
          borderBottom: "1px solid #ccc",
          display: "flex",
          alignItems: "center",
          padding: "0 8px",
          cursor: "move",
          borderTopLeftRadius: "8px",
          borderTopRightRadius: "8px",
        }}
      >
        <span
          style={{
            flex: 1,
            fontWeight: "bold",
            fontSize: "14px",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {title}
        </span>
        <button
          onClick={handleMinimize}
          style={{
            background: "transparent",
            border: "none",
            fontSize: "16px",
            cursor: "pointer",
            marginRight: "8px",
          }}
          title="Minimize/Restore"
        >
          {isMinimized ? "◻︎" : "–"}
        </button>
        <button
          onClick={handleClose}
          style={{
            background: "transparent",
            border: "none",
            fontSize: "16px",
            cursor: "pointer",
          }}
          title="Close"
        >
          ×
        </button>
      </div>
      {!isMinimized && (
        <div
          style={{
            flex: 1,
            overflow: "auto",
            padding: "10px",
            borderBottomLeftRadius: "8px",
            borderBottomRightRadius: "8px",
          }}
        >
          {content}
        </div>
      )}
    </Rnd>
  );
}

export default SleekWidget;