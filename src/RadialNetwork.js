// RadialNetwork.js
import React, { useRef, useEffect, useContext } from "react";
import * as d3 from "d3";
import { DataContext } from "./DataLoader";

/**
 * This component builds a bipartite radial network:
 * - One node per City (Location).
 * - One node per MerchantID.
 * - A link if there's a transaction from that City -> Merchant.
 *
 * This drastically reduces node count vs. account-level detail.
 */
function RadialNetwork({ width = 600, height = 400 }) {
  const { data } = useContext(DataContext);
  const svgRef = useRef(null);

  useEffect(() => {
    if (!data || data.length === 0) return;

    // 1) Extract unique cities & merchants
    const citySet = new Set();
    const merchantSet = new Set();
    data.forEach((row) => {
      if (row.Location) citySet.add(row.Location);
      if (row.MerchantID) merchantSet.add(row.MerchantID);
    });
    const cities = Array.from(citySet);
    const merchants = Array.from(merchantSet);

    // 2) Create node arrays
    //    type = "city" or "merchant"
    const cityNodes = cities.map((city) => ({
      id: city,
      type: "city",
    }));
    const merchantNodes = merchants.map((mer) => ({
      id: mer,
      type: "merchant",
    }));

    // Combine them
    const nodes = [...cityNodes, ...merchantNodes];

    // 3) Build links set to avoid duplicates
    //    For each transaction => link from row.Location -> row.MerchantID
    const linkSet = new Set();
    data.forEach((row) => {
      if (row.Location && row.MerchantID) {
        const key = `${row.Location}||${row.MerchantID}`;
        linkSet.add(key);
      }
    });
    const links = Array.from(linkSet).map((k) => {
      const [c, m] = k.split("||");
      return { source: c, target: m };
    });

    // 4) Setup the SVG
    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    // Use a viewBox so it resizes and is centered
    svg
      .attr("viewBox", [-width / 2, -height / 2, width, height])
      .attr("preserveAspectRatio", "xMidYMid meet");

    // 5) Create a force simulation with a radial force
    //    This places nodes in a circle around the center
    const simulation = d3
      .forceSimulation(nodes)
      .force("link", d3.forceLink(links).id((d) => d.id).distance(80))
      .force("charge", d3.forceManyBody().strength(-30))
      .force("radial", d3.forceRadial(Math.min(width, height) / 3))
      // Optionally center them as well
      .force("center", d3.forceCenter(0, 0))
      .on("tick", ticked);

    // 6) Draw links (lines)
    const linkGroup = svg
      .append("g")
      .attr("stroke", "#999")
      .attr("stroke-opacity", 0.6);

    const linkElements = linkGroup
      .selectAll("line")
      .data(links)
      .enter()
      .append("line")
      .attr("stroke-width", 1.5);

    // 7) Draw nodes (circles)
    const nodeGroup = svg.append("g").attr("stroke", "#fff").attr("stroke-width", 1.5);

    const nodeElements = nodeGroup
      .selectAll("circle")
      .data(nodes)
      .enter()
      .append("circle")
      .attr("r", 8)
      .attr("fill", (d) => (d.type === "city" ? "#4E79A7" : "#F28E2B"))
      .call(drag(simulation));

    // 8) Draw labels
    const labelGroup = svg.append("g").attr("font-size", 10).attr("fill", "#333");

    const labels = labelGroup
      .selectAll("text")
      .data(nodes)
      .enter()
      .append("text")
      .text((d) => d.id)
      .attr("dx", 10)
      .attr("dy", ".35em");

    // 9) The tick function (positions lines & circles on each simulation step)
    function ticked() {
      linkElements
        .attr("x1", (d) => d.source.x)
        .attr("y1", (d) => d.source.y)
        .attr("x2", (d) => d.target.x)
        .attr("y2", (d) => d.target.y);

      nodeElements
        .attr("cx", (d) => d.x)
        .attr("cy", (d) => d.y);

      labels
        .attr("x", (d) => d.x)
        .attr("y", (d) => d.y);
    }

    // 10) Drag logic
    function drag(simulation) {
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

      return d3
        .drag()
        .on("start", dragstarted)
        .on("drag", dragged)
        .on("end", dragended);
    }

    // Cleanup on unmount
    return () => simulation.stop();
  }, [data, width, height]);

  return <svg ref={svgRef} style={{ width: "100%", height: "100%" }} />;
}

export default RadialNetwork;