import * as d3 from "d3";

/*  
  Drag handlers for the absolutely positioned container.
  These update the container’s CSS left/top based on drag deltas.
*/
function dragStartedAbs(event, d) {
  // Give visual feedback (optional)
  d3.select(this).style("outline", "1px dashed red");
}

function draggedAbs(event, d) {
  // Update container’s x and y stored in datum by adding drag deltas
  d.x += event.dx;
  d.y += event.dy;
  // Move the container using CSS properties
  d3.select(this)
    .style("left", d.x + "px")
    .style("top", d.y + "px");
}

function dragEndedAbs(event, d) {
  // Remove the visual feedback
  d3.select(this).style("outline", null);
}

/**
 * enableCopyAndDrag(selection)
 *   - Attaches a right-click (contextmenu) event to each node in the given selection.
 *   - When right-clicked, a context menu appears with a "Copy" option.
 *   - Clicking "Copy" creates a copy of the element:
 *       a) The original element remains in place.
 *       b) A cloned copy is placed inside an absolutely positioned <div> (with its own <svg>).
 *       c) The container <div> is then made draggable across the page.
 */
export function enableCopyAndDrag(selection) {
  selection.on("contextmenu", function (event) {
    event.preventDefault();
    
    // Remove any existing context menus
    d3.select("body").selectAll(".custom-context-menu").remove();
    
    // Create a simple context menu near the mouse pointer
    const menu = d3.select("body")
      .append("div")
      .attr("class", "custom-context-menu")
      .style("left", event.pageX + "px")
      .style("top", event.pageY + "px")
      .html("<div class='menu-item'>Copy</div>");
    
    // The original SVG element (e.g., a rect in the Sankey diagram)
    const original = d3.select(this);
    
    menu.select(".menu-item").on("click", () => {
      // Remove the context menu once "Copy" is clicked
      menu.remove();
      
      // 1) Get the node’s bounding box in page coordinates
      const bbox = original.node().getBoundingClientRect();
      
      // 2) Create an absolutely positioned container <div> at that exact position and size
      const container = d3.select("body")
        .append("div")
        .classed("copied-node-container", true)
        .style("position", "absolute")
        .style("left", bbox.x + "px")
        .style("top", bbox.y + "px")
        .style("width", bbox.width + "px")
        .style("height", bbox.height + "px")
        .style("z-index", 9999) // ensure it appears on top
        .style("pointer-events", "all");
      
      // 3) Append an <svg> inside the container with matching width and height
      const containerSVG = container.append("svg")
        .attr("width", bbox.width)
        .attr("height", bbox.height);
      
      // 4) Clone the original element
      const cloneNode = original.node().cloneNode(true);
      
      /*  
         Adjust the clone's position relative to the new SVG container.
         Since the new container's coordinate system starts at (0,0),
         set the clone's x and y attributes to 0. (Assumes the original’s
         x/y are relative to the container – adjust if needed.)
      */
      if (cloneNode.tagName === "rect") {
        // For rect elements, set x and y to 0 so it fits in the container
        cloneNode.setAttribute("x", 0);
        cloneNode.setAttribute("y", 0);
      }
      // Append the clone into the new SVG
      containerSVG.node().appendChild(cloneNode);
      
      // Convert the clone into a D3 selection and style it to indicate it’s a copy
      d3.select(cloneNode)
        .style("stroke-dasharray", "4,2")
        .style("opacity", 0.8)
        .classed("cloned", true);
      
      // (Optional) Update the original node’s style to show it’s been "moved"
      original.style("opacity", 0.5);
      
      // 5) Store the container's current x and y (the top-left position in page coords)
      container.datum({
        x: bbox.x,
        y: bbox.y,
        originalNode: original.node(),
        nodeData: original.datum()
      });
      
      // 6) Attach a D3 drag behavior to the container so it can be moved freely
      container.call(
        d3.drag()
          .on("start", dragStartedAbs)
          .on("drag", draggedAbs)
          .on("end", dragEndedAbs)
      );
    });
  });
  
  // Remove the context menu if the user clicks anywhere else
  d3.select("body").on("click.customContextMenu", function () {
    d3.select("body").selectAll(".custom-context-menu").remove();
  });
}