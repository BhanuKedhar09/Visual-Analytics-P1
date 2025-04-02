// dragDropHelper.js
import * as d3 from "d3";

/**
 * detectDropZone(containerBox)
 *   - Checks all elements with class="drop-zone" to see if the container's center
 *     is within their bounding box. Returns the matched drop zone or null.
 */
function detectDropZone(containerBox) {
  const centerX = containerBox.left + containerBox.width / 2;
  const centerY = containerBox.top + containerBox.height / 2;
  const dropZones = document.querySelectorAll(".drop-zone");
  for (const zone of dropZones) {
    const rect = zone.getBoundingClientRect();
    if (
      centerX >= rect.left &&
      centerX <= rect.right &&
      centerY >= rect.top &&
      centerY <= rect.bottom
    ) {
      return zone;
    }
  }
  return null;
}

// Called when drag starts (we do NOT show a dashed outline here).
function dragStartedAbs(event, d) {
  // If you want visual feedback, uncomment:
  // d3.select(this).style("outline", "1px dashed red");
}

// Called continuously as the element is dragged.
function draggedAbs(event, d) {
  d.x += event.dx;
  d.y += event.dy;
  d3.select(this)
    .style("left", d.x + "px")
    .style("top", d.y + "px");
}

// Called when drag ends.
function dragEndedAbs(event, d) {
  // Remove outline if you had one:
  // d3.select(this).style("outline", null);

  const containerBox = this.getBoundingClientRect();
  const dropZone = detectDropZone(containerBox);
  if (d.onDragEndCallback) {
    d.onDragEndCallback(d.nodeData, containerBox, dropZone);
  }
}

/**
 * enableCopyAndDrag(selection, onDragEndCallback)
 *
 * Attaches a right-click (contextmenu) event to each element in the selection.
 * When right-clicked, a context menu appears with a "Copy" option.
 * Clicking "Copy" creates a cloned copy of the element in an absolutely positioned container.
 *
 * This version:
 *  - Measures the shape's bounding box in the original SVG coordinate system (via getBBox()).
 *  - Converts that bounding box to page coordinates so we can size the container <div> accordingly.
 *  - Offsets the clone by +10 in x/y so it doesn't fully overlap the original.
 *  - Does NOT fade the original shape (remove the line if you want that).
 *  - Does NOT produce a dashed bounding box or outline for the container itself.
 */
export function enableCopyAndDrag(selection, onDragEndCallback = null) {
  selection.on("contextmenu", function (event) {
    event.preventDefault();

    // Remove any existing context menus.
    d3.select("body").selectAll(".custom-context-menu").remove();

    // Create a simple context menu near the mouse pointer.
    const menu = d3
      .select("body")
      .append("div")
      .attr("class", "custom-context-menu")
      .style("left", event.pageX + "px")
      .style("top", event.pageY + "px")
      .html("<div class='menu-item'>Copy</div>");

    const original = d3.select(this);

    // When "Copy" is clicked...
    menu.select(".menu-item").on("click", () => {
      menu.remove();

      /**
       * 1) Measure bounding box in the original SVG coordinate system.
       *    We do this by calling getBBox() on the shape, which returns x, y, width, height in local coords.
       */
      const shapeBBox = this.getBBox(); // local SVG coords
      // We also need to transform these coords into the page coordinate system.
      // We'll do so using getBoundingClientRect on the shape's bounding box corners.

      // Let's get the shape's bounding box corners in local coords:
      const svgNode = this.ownerSVGElement; // the parent <svg> of the shape
      if (!svgNode) {
        console.warn("No ownerSVGElement found—cannot measure shape properly.");
        return;
      }

      // Convert top-left corner of shapeBBox to page coords
      const ptTopLeft = svgNode.createSVGPoint();
      ptTopLeft.x = shapeBBox.x;
      ptTopLeft.y = shapeBBox.y;
      const screenTopLeft = ptTopLeft.matrixTransform(this.getScreenCTM());

      // Convert bottom-right corner of shapeBBox to page coords
      const ptBottomRight = svgNode.createSVGPoint();
      ptBottomRight.x = shapeBBox.x + shapeBBox.width;
      ptBottomRight.y = shapeBBox.y + shapeBBox.height;
      const screenBottomRight = ptBottomRight.matrixTransform(
        this.getScreenCTM()
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
        .style("position", "absolute")
        .style("left", shapePageX + offset + "px")
        .style("top", shapePageY + offset + "px")
        .style("width", shapePageWidth + "px")
        .style("height", shapePageHeight + "px")
        .style("z-index", 9999)
        .style("overflow", "visible")
        .style("pointer-events", "all");

      // 3) Append an <svg> inside the container sized to that bounding box
      const containerSVG = container
        .append("svg")
        .attr("width", shapePageWidth)
        .attr("height", shapePageHeight);

      // 4) Clone the original element
      const cloneNode = this.cloneNode(true);

      // 5) Create a <g> in the new <svg> and append the clone
      const gClone = containerSVG.append("g");
      gClone.node().appendChild(cloneNode);

      // Rebind the original datum so the clone has the same data
      d3.select(cloneNode).datum(original.datum());
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
        .style("stroke-dasharray", "4,2")
        .style("opacity", 0.9)
        .classed("cloned", true);

      // (Optional) If you want to fade the original, uncomment:
      // original.style("opacity", 0.5);

      // 7) Store data on the container
      container.datum({
        x: shapePageX + offset,
        y: shapePageY + offset,
        originalNode: original.node(),
        nodeData: original.datum(),
        onDragEndCallback: onDragEndCallback,
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


      // 8) Attach a D3 drag behavior to the container
      container.call(
        d3
          .drag()
          .on("start", dragStartedAbs)
          .on("drag", draggedAbs)
          .on("end", dragEndedAbs)
      );
    });

    // Add new Pop-out Graph option
    menu.append("div")
      .attr("class", "menu-item")
      .text("Pop-out Relationship Graph")
      .on("click", () => {
        menu.remove();
        
        // Get the data from the element
        const datum = d3.select(this).datum();
        
        // Create a new popup with this data
        // This requires access to the createNewPopup function
        // Either through a global function or through a callback
        if (window.createRelationshipPopup) {
          window.createRelationshipPopup(datum);
        }
      });

    // Close menu on click elsewhere
    d3.select("body").on("click.context-menu", () => {
      menu.remove();
      d3.select("body").on("click.context-menu", null);
    });
  });

  // Remove context menu if user clicks elsewhere
  d3.select("body").on("click.customContextMenu", function () {
    d3.select("body").selectAll(".custom-context-menu").remove();
  });
}

// Export if needed
export { detectDropZone, dragStartedAbs, draggedAbs, dragEndedAbs };
