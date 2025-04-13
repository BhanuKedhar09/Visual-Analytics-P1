// dragDropHelper.js
import * as d3 from "d3";

/**
 * detectDropZone(containerBox)
 *   - Checks all elements with class="drop-zone" to see if the container's center
 *     is within their bounding box. Returns the matched drop zone or null.
 */
function detectDropZone(containerBox, isFilterDrag = false) {
  const centerX = containerBox.left + containerBox.width / 2;
  const centerY = containerBox.top + containerBox.height / 2;
  
  // For filter drag, only look for CircleBipartite drop zone
  // For normal copy, look for all drop zones but don't highlight them
  const selector = isFilterDrag ? "#circle-bipartite.drop-zone" : ".drop-zone";
  const dropZones = document.querySelectorAll(selector);
  
  // Remove previous drag-over class
  document.querySelectorAll(".drop-zone.drag-over").forEach(zone => {
    zone.classList.remove("drag-over");
  });
  
  for (const zone of dropZones) {
    const rect = zone.getBoundingClientRect();
    if (
      centerX >= rect.left &&
      centerX <= rect.right &&
      centerY >= rect.top &&
      centerY <= rect.bottom
    ) {
      // Only add visual feedback if it's CircleBipartite AND it's a filter drag
      if (zone.id === "circle-bipartite" && isFilterDrag) {
        zone.classList.add("drag-over");
      }
      return zone;
    }
  }
  return null;
}

// Called when drag starts
function dragStartedAbs(event, d) {
  // Store the data in the dataTransfer object for use when dropping
  if (event.sourceEvent && event.sourceEvent.dataTransfer) {
    try {
      // Stringify the data for transfer
      const transferData = JSON.stringify({
        ...d.nodeData,
        dragAction: d.dragAction
      });
      
      // Set the data in the dataTransfer object
      event.sourceEvent.dataTransfer.setData("application/json", transferData);
      console.log("Set dataTransfer data:", transferData);
      
      // Set the drag image and effect
      event.sourceEvent.dataTransfer.effectAllowed = "move";
    } catch (error) {
      console.error("Error setting dataTransfer:", error);
    }
  } else {
    console.warn("No dataTransfer object available in the drag event");
  }

  // Show drag tooltip with data type info
  const tooltip = document.getElementById("drag-tooltip");
  if (tooltip) {
    let tooltipText = "Drag to filter";
    
    // Customize tooltip based on data type
    if (d.nodeData) {
      if (d.nodeData.type === "geoCircle") {
        tooltipText = `Filter by City: ${d.nodeData.city}`;
      } else if (d.nodeData.type === "sankeyNode") {
        const type = d.nodeData.layer === 0 ? "State" : 
                    d.nodeData.layer === 1 ? "City" : 
                    d.nodeData.layer === 2 ? "Occupation" : "Merchant";
        tooltipText = `Filter by ${type}: ${d.nodeData.name}`;
      } else if (d.nodeData.type === "timeBar") {
        const dateStr = d.nodeData.date ? d.nodeData.date.toLocaleDateString() : "Unknown";
        tooltipText = `Filter by Date: ${dateStr}`;
      }
    }
    
    // Only show tooltip for filter drags
    if (d.dragAction === "filter") {
      tooltip.textContent = tooltipText;
      tooltip.style.display = "block";
      tooltip.style.left = (event.sourceEvent.pageX + 10) + "px";
      tooltip.style.top = (event.sourceEvent.pageY + 10) + "px";
    } else {
      tooltip.style.display = "none";
    }
  }
}

// Called continuously as the element is dragged
function draggedAbs(event, d) {
  d.x += event.dx;
  d.y += event.dy;
  d3.select(this)
    .style("left", d.x + "px")
    .style("top", d.y + "px");
    
  // Update tooltip position
  const tooltip = document.getElementById("drag-tooltip");
  if (tooltip && tooltip.style.display !== "none") {
    tooltip.style.left = (event.sourceEvent.pageX + 10) + "px";
    tooltip.style.top = (event.sourceEvent.pageY + 10) + "px";
  }
  
  // Update drop zone visual feedback - only for filter drags
  const containerBox = this.getBoundingClientRect();
  const isFilterDrag = d.dragAction === "filter";
  
  if (isFilterDrag) {
    // Only detect and highlight drop zones for filter drags
    detectDropZone(containerBox, isFilterDrag);
  } else {
    // For copy operations, don't show any highlighting
    // But still detect the drop zone for later use in dragEndedAbs
    document.querySelectorAll(".drop-zone.drag-over").forEach(zone => {
      zone.classList.remove("drag-over");
    });
  }
}

// Called when drag ends
function dragEndedAbs(event, d) {
  // Remove drag-over classes
  document.querySelectorAll(".drop-zone.drag-over").forEach(zone => {
    zone.classList.remove("drag-over");
  });
  
  // Hide tooltip
  const tooltip = document.getElementById("drag-tooltip");
  if (tooltip) {
    tooltip.style.display = "none";
  }

  const containerBox = this.getBoundingClientRect();
  // Only filter drags should look for CircleBipartite
  const dropZone = detectDropZone(containerBox, d.dragAction === "filter");
  
  // Signal drag end - this is critical for the "drag out" behavior
  // When a drag ends, we need to notify the system regardless of where it ended
  if (d.nodeData?.type === "geoCircle" && d.dragAction === "filter") {
    // Find the setDroppedItem from the window if it's available
    if (window.setDroppedItem) {
      console.log("DRAG ENDED - Signaling drag end event");
      window.setDroppedItem({
        action: "dragend",
        data: d.nodeData,
        timestamp: Date.now()
      });
    }
  }
  
  // Only pass to callback if it's a filter drag and the drop zone is CircleBipartite,
  // or if it's not a filter drag (normal drag)
  if (d.onDragEndCallback) {
    if ((d.dragAction === "filter" && dropZone?.id === "circle-bipartite") || 
        d.dragAction !== "filter") {
      d.onDragEndCallback(d.nodeData, containerBox, dropZone);
    }
  }
}

/**
 * enableCopyAndDrag(selection, onDragEndCallback)
 *
 * Attaches a right-click (contextmenu) event to each element in the selection.
 * When right-clicked, a context menu appears with a "Copy" option.
 * Clicking "Copy" creates a cloned copy of the element in an absolutely positioned container.
 */
export function enableCopyAndDrag(selection, onDragEndCallback = null) {
  selection.on("contextmenu", function (event) {
    event.preventDefault();

    // Remove any existing context menus.
    d3.select("body").selectAll(".custom-context-menu").remove();

    // Create context menu near the mouse pointer
    const menu = d3
      .select("body")
      .append("div")
      .attr("class", "custom-context-menu")
      .style("left", event.pageX + "px")
      .style("top", event.pageY + "px")
      .html("<div class='menu-item'>Copy</div><div class='menu-item'>Drag as Filter</div>");
      
    // Add back the Pop-out Relationship Graph option
    menu.append("div")
      .attr("class", "menu-item")
      .text("Pop-out Relationship Graph");

    const original = d3.select(this);

    // Setup action handlers for menu items
    menu.selectAll(".menu-item").on("click", function() {
      menu.remove();
      
      const menuAction = d3.select(this).text();
      
      if (menuAction === "Pop-out Relationship Graph") {
        // Get the data from the element
        const datum = original.datum();
        console.log("Right-click menu: Creating popup with datum:", datum);
        
        // Create a popup data object with the right format
        let popupData = {
          type: datum.type || 'unknown',
          value: datum.name || datum.id || 'unknown'
        };
        
        // For Sankey nodes, ensure we have the right format
        if (datum.type === 'sankeyNode') {
          popupData = {
            type: datum.layer === 0 ? 'state' : 
                 datum.layer === 1 ? 'city' : 
                 datum.layer === 2 ? 'occupation' : 'merchant',
            value: datum.name
          };
        }
        // For geo circles, use geo-circle type
        else if (datum.type === 'geoCircle') {
          popupData = {
            type: 'geo-circle',
            value: datum.city || datum.name
          };
        }
        // For time bars, use time type
        else if (datum.type === 'timeBar') {
          popupData = {
            type: 'time',
            value: datum.date || datum.day
          };
          console.log("Creating popup for timeBar:", {
            date: datum.date,
            dateStr: datum.dateStr,
            day: datum.day,
            Credit: datum.Credit,
            Debit: datum.Debit
          });
        }
        
        console.log("Formatted popup data:", popupData);
        
        // Create a new popup with this data
        if (window.createRelationshipPopup) {
          window.createRelationshipPopup(popupData);
        }
        return;
      }
      
      if (menuAction === "Copy" || menuAction === "Drag as Filter") {
        // Whether this is a filter drag or just a copy
        const isFilterDrag = menuAction === "Drag as Filter";
        
        /**
         * 1) Measure bounding box in the original SVG coordinate system.
         *    We do this by calling getBBox() on the shape, which returns x, y, width, height in local coords.
         */
        const shapeBBox = original.node().getBBox(); // local SVG coords
        // We also need to transform these coords into the page coordinate system.
        // We'll do so using getBoundingClientRect on the shape's bounding box corners.

        // Let's get the shape's bounding box corners in local coords:
        const svgNode = original.node().ownerSVGElement; // the parent <svg> of the shape
        if (!svgNode) {
          console.warn("No ownerSVGElement found—cannot measure shape properly.");
          return;
        }

        // Convert top-left corner of shapeBBox to page coords
        const ptTopLeft = svgNode.createSVGPoint();
        ptTopLeft.x = shapeBBox.x;
        ptTopLeft.y = shapeBBox.y;
        const screenTopLeft = ptTopLeft.matrixTransform(original.node().getScreenCTM());

        // Convert bottom-right corner of shapeBBox to page coords
        const ptBottomRight = svgNode.createSVGPoint();
        ptBottomRight.x = shapeBBox.x + shapeBBox.width;
        ptBottomRight.y = shapeBBox.y + shapeBBox.height;
        const screenBottomRight = ptBottomRight.matrixTransform(
          original.node().getScreenCTM()
        );

        // Now we can compute the bounding box in page coords:
        const shapePageX = screenTopLeft.x;
        const shapePageY = screenTopLeft.y;
        const shapePageWidth = screenBottomRight.x - screenTopLeft.x;
        const shapePageHeight = screenBottomRight.y - screenTopLeft.y;

        // 2) Create an absolutely positioned container <div> at shape's top-left in page coords.
        //    We'll add a +10 offset so it doesn't overlap exactly.
        const offset = 10;
        const container = d3
          .select("body")
          .append("div")
          .classed("copied-node-container", true)
          .attr("draggable", "true")
          .style("position", "absolute")
          .style("left", shapePageX + offset + "px")
          .style("top", shapePageY + offset + "px")
          .style("width", shapePageWidth + "px")
          .style("height", shapePageHeight + "px")
          .style("z-index", 9999)
          .style("overflow", "visible")
          .style("pointer-events", "all")
          .style("cursor", "grab");

        // Add HTML5 drag and drop event handlers directly
        container.node().addEventListener("dragstart", (e) => {
          console.log("Native dragstart event");
          const datum = d3.select(e.currentTarget).datum();
          
          // Store the data as both JSON and TEXT formats
          const transferData = JSON.stringify({
            ...datum.nodeData,
            dragAction: datum.dragAction
          });
          
          e.dataTransfer.setData("application/json", transferData);
          e.dataTransfer.setData("text/plain", transferData);
          e.dataTransfer.effectAllowed = "move";
          
          // Add some visual feedback
          e.dataTransfer.setDragImage(e.currentTarget, 0, 0);
          console.log("Native dragstart: Set data successfully", transferData);
        });

        // 3) Append an <svg> inside the container sized to that bounding box
        const containerSVG = container
          .append("svg")
          .attr("width", shapePageWidth)
          .attr("height", shapePageHeight);

        // 4) Clone the original element
        const cloneNode = original.node().cloneNode(true);

        // 5) Create a <g> in the new <svg> and append the clone
        const gClone = containerSVG.append("g");
        gClone.node().appendChild(cloneNode);

        // Rebind the original datum so the clone has the same data
        d3.select(cloneNode).datum(original.datum());
        // Add draggable class to indicate it's draggable
        d3.select(cloneNode).classed("draggable", true);
        
        // Pseudocode: attach event handlers based on d.type
        const cloneSelection = d3.select(cloneNode);
        cloneSelection
          .on("mouseover", (evt) => {
            const d = cloneSelection.datum();
            if (!d) return;

            switch (d.type) {
              case "geoCircle":
                // City, State, Count
                d3.select("body")
                  .select(".tooltip")
                  .html(
                    `City: ${d.city}<br/>State: ${d.state}<br/>Count: ${d.count}`
                  )
                  .style("opacity", 1);
                break;

              case "timeBar":
                // Date, Credit, Debit
                d3.select("body")
                  .select(".tooltip")
                  .html(
                    `Date: ${d.dateStr}<br/>Credit: ${d.Credit}<br/>Debit: ${d.Debit}`
                  )
                  .style("opacity", 1);
                break;

              case "sankeyNode":
                // Node name or layer
                d3.select("body")
                  .select(".tooltip")
                  .html(`Node: ${d.name}`)
                  .style("opacity", 1);
                break;

              // etc. for other shapes
              default:
                // fallback
                d3.select("body")
                  .select(".tooltip")
                  .html("Unknown shape")
                  .style("opacity", 1);
                break;
            }
          })
          .on("mousemove", (evt) => {
            d3.select("body")
              .select(".tooltip")
              .style("left", evt.pageX + 10 + "px")
              .style("top", evt.pageY + 10 + "px");
          })
          .on("mouseout", () => {
            d3.select("body").select(".tooltip").style("opacity", 0);
          });

        // Remove any transform from the clone
        cloneNode.removeAttribute("transform");

        // 6) Translate the clone so that shapeBBox.x,y becomes (0,0)
        //    Then we do not add an extra offset here because we already offset the container itself by +10
        gClone.attr("transform", `translate(${-shapeBBox.x}, ${-shapeBBox.y})`);

        // Style the clone to indicate it's a copy (optional)
        d3.select(cloneNode)
          .style("stroke-dasharray", isFilterDrag ? "4,2" : null)
          .style("opacity", 0.9)
          .classed("cloned", true);

        // Add a small filter badge if it's a filter drag
        if (isFilterDrag) {
          container.append("div")
            .style("position", "absolute")
            .style("top", "-15px")
            .style("left", "0")
            .style("background", "#3498db")
            .style("color", "white")
            .style("padding", "2px 6px")
            .style("border-radius", "10px")
            .style("font-size", "10px")
            .text("Filter");
        }

        // (Optional) If you want to fade the original, uncomment:
        // original.style("opacity", 0.5);

        // 7) Store data on the container
        container.datum({
          x: shapePageX + offset,
          y: shapePageY + offset,
          originalNode: original.node(),
          nodeData: original.datum(),
          onDragEndCallback: onDragEndCallback,
          dragAction: isFilterDrag ? "filter" : "copy" // Store the action type
        });
        const d = original.datum();
        if (d && d.type === "sankeyNode") {
          // Add a label for sankeyNode type (optional)
          container
            .append("div")
            .classed("drag-label", true)
            .style("position", "absolute")
            .style("left", (shapePageWidth + 2) + "px")
            .style("top", "0px")
            .style("font-size", "12px")
            .style("color", "black")
            .style("background", "transparent")
            .text(d.name);
        }

        // Make the cloned node draggable with standard d3.drag()
        const drag = d3.drag()
          .on("start", dragStartedAbs)
          .on("drag", draggedAbs)
          .on("end", dragEndedAbs);
        
        container.call(drag);
      }
    });

    // Close the menu if clicked elsewhere
    d3.select("body").on("click.closeMenu", () => {
      d3.select("body").selectAll(".custom-context-menu").remove();
      d3.select("body").on("click.closeMenu", null);
    });
  });
}

// Export if needed
export { detectDropZone, dragStartedAbs, draggedAbs, dragEndedAbs };
