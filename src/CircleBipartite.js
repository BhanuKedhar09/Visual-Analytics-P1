// CircleBipartite.js
import React, { useRef, useEffect, useContext } from "react";
import * as d3 from "d3";
import { DataContext } from "./DataLoader";

/**
 * A bipartite "two-ring" circular layout:
 * - City nodes on an inner circle (radius=200).
 * - Merchant nodes on an outer circle (radius=300).
 * - Link thickness scaled by transaction frequency.
 *
 * No force simulation. We manually compute (x,y) for each node in a circle.
 */
function CircleBipartite({
  width = 600,
  height = 600,
  innerRadius = 200,
  outerRadius = 300,
  minFreq = 2, // hide city-merchant pairs with freq < minFreq
}) {
  const { data } = useContext(DataContext);
  const svgRef = useRef(null);

  useEffect(() => {
    if (!data || data.length === 0) return;

    // 1) Aggregate transactions by (City, Merchant) => frequency
    const pairCount = d3.rollup(
      data,
      (v) => v.length,
      (d) => d.Location,     // city
      (d) => d.MerchantID    // merchant
    );

    // Build sets for city, merchant
    const citySet = new Set();
    const merchantSet = new Set();
    const links = [];

    // Also track each city->merchant freq
    for (const [city, merchantsMap] of pairCount.entries()) {
      citySet.add(city);
      for (const [mer, freq] of merchantsMap.entries()) {
        merchantSet.add(mer);
        if (freq >= minFreq) {
          links.push({ city, mer, freq });
        }
      }
    }

    const cities = Array.from(citySet).sort();    // optional sort for stable layout
    const merchants = Array.from(merchantSet).sort();

    // 2) We'll place city nodes on an inner circle, merchant nodes on an outer circle
    //    We store node objects with (x, y, radius, angle)
    const cityNodes = cities.map((c, i) => {
      const angle = (2 * Math.PI * i) / cities.length; // distribute evenly
      return {
        id: c,
        type: "city",
        angle,
        r: innerRadius,
      };
    });

    const merchantNodes = merchants.map((m, i) => {
      const angle = (2 * Math.PI * i) / merchants.length; // distribute evenly
      return {
        id: m,
        type: "merchant",
        angle,
        r: outerRadius,
      };
    });

    // Combine
    const nodes = [...cityNodes, ...merchantNodes];

    // 3) Link thickness scale
    const maxFreq = d3.max(links, (d) => d.freq) || 1;
    const linkWidthScale = d3.scaleSqrt().domain([1, maxFreq]).range([0.5, 4]);

    // 4) For quick lookup of node coords
    //    We'll store them in a map: nodeMap[nodeID] => { x, y }
    const nodeMap = {};
    // Convert polar to Cartesian
    nodes.forEach((nd) => {
      const x = nd.r * Math.cos(nd.angle);
      const y = nd.r * Math.sin(nd.angle);
      nodeMap[nd.id] = { ...nd, x, y };
    });

    // 5) Setup the SVG
    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    svg
      .attr("viewBox", [-width / 2, -height / 2, width, height])
      .attr("preserveAspectRatio", "xMidYMid meet");

    // 6) Draw links
    const linkGroup = svg
      .append("g")
      .attr("stroke", "#999")
      .attr("stroke-opacity", 0.6);

    linkGroup
      .selectAll("line")
      .data(links)
      .enter()
      .append("line")
      .attr("stroke-width", (d) => linkWidthScale(d.freq))
      .attr("x1", (d) => nodeMap[d.city].x)
      .attr("y1", (d) => nodeMap[d.city].y)
      .attr("x2", (d) => nodeMap[d.mer].x)
      .attr("y2", (d) => nodeMap[d.mer].y);

    // 7) Draw nodes
    const nodeGroup = svg.append("g").attr("stroke", "#fff").attr("stroke-width", 1.5);

    nodeGroup
      .selectAll("circle")
      .data(nodes)
      .enter()
      .append("circle")
      .attr("r", 6)
      .attr("cx", (d) => nodeMap[d.id].x)
      .attr("cy", (d) => nodeMap[d.id].y)
      .attr("fill", (d) => (d.type === "city" ? "#4E79A7" : "#F28E2B"));

    // 8) Labels (optional, can be cluttered)
    const labelGroup = svg.append("g").attr("font-size", 10).attr("fill", "#333");

    labelGroup
      .selectAll("text")
      .data(nodes)
      .enter()
      .append("text")
      .text((d) => d.id)
      .attr("x", (d) => nodeMap[d.id].x)
      .attr("y", (d) => nodeMap[d.id].y)
      .attr("dx", 8)
      .attr("dy", "0.35em");

    // No force simulation => no tick updates needed

  }, [data, width, height, innerRadius, outerRadius, minFreq]);

  return <svg ref={svgRef} style={{ width: "100%", height: "100%" }} />;
}

export default CircleBipartite;