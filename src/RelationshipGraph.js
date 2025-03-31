import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';

function RelationshipGraph({ data, width = 450, height = 250 }) {
  const svgRef = useRef(null);
  
  useEffect(() => {
    if (!data || !svgRef.current) return;
    
    // Clear previous content
    d3.select(svgRef.current).selectAll("*").remove();
    
    // Setup the visualization
    const svg = d3.select(svgRef.current)
      .attr("width", width)
      .attr("height", height);
      
    // Create simulation
    const simulation = d3.forceSimulation(data.nodes)
      .force("link", d3.forceLink(data.links).id(d => d.id).distance(70))
      .force("charge", d3.forceManyBody().strength(-120))
      .force("center", d3.forceCenter(width / 2, height / 2));
    
    // Add links
    const link = svg.append("g")
      .selectAll("line")
      .data(data.links)
      .enter()
      .append("line")
      .attr("stroke", "#999")
      .attr("stroke-width", d => Math.sqrt(d.value || 1));
    
    // Add nodes
    const node = svg.append("g")
      .selectAll("g")
      .data(data.nodes)
      .enter()
      .append("g")
      .call(d3.drag()
        .on("start", dragstarted)
        .on("drag", dragged)
        .on("end", dragended)
      );
    
    // Add circles for nodes
    node.append("circle")
      .attr("r", d => d.size || 5)
      .attr("fill", d => {
        // Color based on node type
        switch(d.type) {
          case "time": return "#66c2a5";
          case "city": return "#fc8d62"; 
          case "state": return "#8da0cb";
          case "merchant": return "#e78ac3";
          default: return "#a6d854";
        }
      });
    
    // Add labels
    node.append("text")
      .text(d => d.name)
      .attr("x", 8)
      .attr("y", 3)
      .style("font-size", "8px");
    
    // Handle simulation ticks
    simulation.on("tick", () => {
      link
        .attr("x1", d => d.source.x)
        .attr("y1", d => d.source.y)
        .attr("x2", d => d.target.x)
        .attr("y2", d => d.target.y);
        
      node
        .attr("transform", d => `translate(${d.x},${d.y})`);
    });
    
    // Drag functions
    function dragstarted(event, d) {
      if (!event.active) simulation.alphaTarget(0.3).restart();
      d.fx = d.x;
      d.fy = d.y;
    }
    
    function dragged(event, d) {
      d.fx = event.x;
      d.fy = event.y;
    }
    
    function dragended(event, d) {
      if (!event.active) simulation.alphaTarget(0);
      d.fx = null;
      d.fy = null;
    }
    
  }, [data, width, height]);
  
  return (
    <svg ref={svgRef} width={width} height={height}></svg>
  );
}

export default RelationshipGraph; 