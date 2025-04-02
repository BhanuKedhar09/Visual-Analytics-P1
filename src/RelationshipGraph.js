import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';

function RelationshipGraph({ data, width = 450, height = 250 }) {
  const svgRef = useRef(null);
  
  useEffect(() => {
    if (!data || !svgRef.current || !data.nodes || !data.links || data.nodes.length === 0) {
      console.log("No valid data for graph:", data);
      return;
    }
    
    console.log("Rendering graph with data:", data);
    
    // Clear previous content
    d3.select(svgRef.current).selectAll("*").remove();
    
    // Setup the visualization
    const svg = d3.select(svgRef.current)
      .attr("width", width)
      .attr("height", height);
      
    // Find main/central node (from Sankey selection)
    const mainNode = data.nodes.find(n => n.isMain) || data.nodes[0];
    
    // Create different node levels - main, direct connections, others
    const mainNodeRadius = 15;
    const directNodeRadius = 10; 
    const otherNodeRadius = 7;
    
    // Determine node sizes based on relationship to main node
    data.nodes.forEach(node => {
      if (node === mainNode) {
        node.size = mainNodeRadius;
      } else if (data.links.some(link => 
        (link.source === mainNode.id && link.target === node.id) || 
        (link.target === mainNode.id && link.source === node.id))) {
        node.size = directNodeRadius;
      } else {
        node.size = otherNodeRadius;
      }
    });
    
    // Create simulation with stronger centering for main node
    const simulation = d3.forceSimulation(data.nodes)
      .force("link", d3.forceLink(data.links).id(d => d.id).distance(d => {
        // Shorter distance for links to/from main node
        const isMainLink = d.source.id === mainNode.id || d.target.id === mainNode.id;
        return isMainLink ? 70 : 100;
      }))
      .force("charge", d3.forceManyBody().strength(-120))
      .force("center", d3.forceCenter(width / 2, height / 2))
      .force("x", d3.forceX(width / 2).strength(d => d === mainNode ? 0.2 : 0.05))
      .force("y", d3.forceY(height / 2).strength(d => d === mainNode ? 0.2 : 0.05));
    
    // Add links with different styles based on relationship
    const link = svg.append("g")
      .selectAll("line")
      .data(data.links)
      .enter()
      .append("line")
      .attr("stroke", d => {
        const isMainLink = d.source.id === mainNode.id || d.target.id === mainNode.id;
        return isMainLink ? "#007bff" : "#999";
      })
      .attr("stroke-width", d => {
        const isMainLink = d.source.id === mainNode.id || d.target.id === mainNode.id;
        return isMainLink ? 2 : 1;
      })
      .attr("stroke-opacity", d => {
        const isMainLink = d.source.id === mainNode.id || d.target.id === mainNode.id;
        return isMainLink ? 0.8 : 0.5;
      });
    
    // Add node groups
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
      .attr("r", d => d.size)
      .attr("fill", d => {
        // Highlight main node
        if (d === mainNode) return "#f39c12";
        
        // Color based on node type
        switch(d.type) {
          case "time": return "#66c2a5";
          case "city": return "#fc8d62"; 
          case "state": return "#8da0cb";
          case "merchant": return "#e78ac3";
          case "occupation": return "#a6d854";
          default: return "#a6d854";
        }
      })
      .attr("stroke", d => d === mainNode ? "#d35400" : "none")
      .attr("stroke-width", 2);
    
    // Add labels with different styles
    node.append("text")
      .text(d => d.name)
      .attr("x", d => d.size + 3)
      .attr("y", 4)
      .style("font-size", d => d === mainNode ? "12px" : "9px")
      .style("font-weight", d => d === mainNode ? "bold" : "normal");
    
    // Add legend
    const legend = svg.append("g")
      .attr("class", "legend")
      .attr("transform", `translate(10, ${height - 120})`);
    
    const legendItems = [
      { type: "main", color: "#f39c12", label: "Selected Node" },
      { type: "time", color: "#66c2a5", label: "Time" },
      { type: "city", color: "#fc8d62", label: "City" },
      { type: "state", color: "#8da0cb", label: "State" },
      { type: "merchant", color: "#e78ac3", label: "Merchant" },
      { type: "occupation", color: "#a6d854", label: "Occupation" }
    ];
    
    legendItems.forEach((item, i) => {
      const itemG = legend.append("g")
        .attr("transform", `translate(0, ${i * 18})`);
      
      itemG.append("circle")
        .attr("r", 5)
        .attr("fill", item.color);
      
      itemG.append("text")
        .attr("x", 15)
        .attr("y", 5)
        .text(item.label)
        .style("font-size", "9px");
    });
    
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
    
    // Add tooltips
    const tooltip = d3.select("body")
      .append("div")
      .attr("class", "node-tooltip")
      .style("position", "absolute")
      .style("visibility", "hidden")
      .style("background-color", "white")
      .style("border", "1px solid #ddd")
      .style("border-radius", "4px")
      .style("padding", "5px")
      .style("pointer-events", "none")
      .style("font-size", "12px")
      .style("z-index", 1000000);
    
    node.on("mouseover", function(event, d) {
      tooltip
        .style("visibility", "visible")
        .html(`
          <strong>${d.name}</strong><br>
          Type: ${d.type}<br>
          ${d.details ? `Details: ${d.details}` : ''}
        `);
    })
    .on("mousemove", function(event) {
      tooltip
        .style("top", (event.pageY - 10) + "px")
        .style("left", (event.pageX + 10) + "px");
    })
    .on("mouseout", function() {
      tooltip.style("visibility", "hidden");
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
      if (d !== mainNode) { // Keep main node fixed
        d.fx = null;
        d.fy = null;
      }
    }
    
    // Pin the main node in the center initially
    mainNode.fx = width / 2;
    mainNode.fy = height / 2;
    
    return () => {
      tooltip.remove();
    };
    
  }, [data, width, height]);
  
  if (!data || !data.nodes || data.nodes.length === 0) {
    return (
      <div style={{ 
        width, 
        height, 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        backgroundColor: '#f8f9fa',
        borderRadius: '4px',
        color: '#6c757d',
        fontSize: '14px'
      }}>
        No relationship data available
      </div>
    );
  }
  
  return (
    <svg ref={svgRef} width={width} height={height}></svg>
  );
}

export default RelationshipGraph; 