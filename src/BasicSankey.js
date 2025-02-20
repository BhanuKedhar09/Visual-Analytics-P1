// BasicSankey.js
import React, { useRef, useEffect } from "react";
import * as d3 from "d3";
import { sankey, sankeyLeft, sankeyLinkHorizontal } from "d3-sankey";

function BasicSankey({ width = 700, height = 300 }) {
  const svgRef = useRef();

  useEffect(() => {
    // Set margins and dimensions.
    const margin = { top: 10, right: 10, bottom: 10, left: 10 };
    const w = width - margin.left - margin.right;
    const h = height - margin.top - margin.bottom;

    // Create the SVG container.
    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();
    svg
      .attr("width", width)
      .attr("height", height)
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    // Define a simple dataset.
    // This example creates 4 nodes and 3 links.
    const graph = {
      nodes: [
        { node: 0, name: "Source" },
        { node: 1, name: "Intermediate" },
        { node: 2, name: "Another Intermediate" },
        { node: 3, name: "Target" }
      ],
      links: [
        { source: 0, target: 1, value: 2 },
        { source: 1, target: 2, value: 2 },
        { source: 1, target: 3, value: 2 }
      ]
    };

    // Create the sankey generator.
    const sankeyGenerator = sankey()
      .nodeWidth(36)
      .nodePadding(40)
      .extent([[1, 1], [w, h]]);

    // Run the sankey layout.
    const { nodes, links } = sankeyGenerator(graph);

    // Create an inner group for drawing.
    const g = svg
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    // Draw links.
    g.append("g")
      .selectAll("path")
      .data(links)
      .enter()
      .append("path")
      .attr("d", sankeyLinkHorizontal())
      .attr("fill", "none")
      .attr("stroke", "#999")
      .attr("stroke-opacity", 0.5)
      .attr("stroke-width", d => Math.max(1, d.width));

    // Draw nodes.
    const nodeGroup = g.append("g");
    nodeGroup
      .selectAll("rect")
      .data(nodes)
      .enter()
      .append("rect")
      .attr("x", d => d.x0)
      .attr("y", d => d.y0)
      .attr("width", d => d.x1 - d.x0)
      .attr("height", d => d.y1 - d.y0)
      .attr("fill", "#4E79A7")
      .attr("stroke", "none");

    // Add labels.
    nodeGroup
      .selectAll("text")
      .data(nodes)
      .enter()
      .append("text")
      .attr("x", d => (d.x0 < w / 2 ? d.x1 + 6 : d.x0 - 6))
      .attr("y", d => (d.y1 + d.y0) / 2)
      .attr("dy", "0.35em")
      .attr("text-anchor", d => (d.x0 < w / 2 ? "start" : "end"))
      .text(d => d.name);
  }, [width, height]);

  return <svg ref={svgRef} />;
}

export default BasicSankey;