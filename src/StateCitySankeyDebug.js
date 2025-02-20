// StateCitySankeyDebug.js
import React, { useRef, useEffect, useContext } from "react";
import * as d3 from "d3";
import { sankey, sankeyLinkHorizontal } from "d3-sankey";
import { DataContext } from "./DataLoader";

function StateCitySankeyDebug({
  width = 700,
  height = 300,
  minFlow = 1
}) {
  const { data } = useContext(DataContext);
  const svgRef = useRef(null);

  useEffect(() => {
    if (!data || data.length === 0) return;

    // 1) Filter out rows missing state_id or Location
    const filtered = data.filter(
      d => d.state_id && d.state_id.trim() && d.Location && d.Location.trim()
    );
    if (filtered.length === 0) {
      console.warn("No valid rows after filtering missing state_id or Location.");
      return;
    }

    // 2) Build a frequency map for (state, city)
    const freqMap = new Map(); // key = "state||city", val = freq
    filtered.forEach(row => {
      const st = row.state_id.trim();
      const city = row.Location.trim();
      const key = `${st}||${city}`;
      freqMap.set(key, (freqMap.get(key) || 0) + 1);
    });

    // 3) Build a node name set (for both states and cities)
    const nodeSet = new Set();
    // We'll store link info in an array
    const linkArray = [];

    for (const [key, freq] of freqMap.entries()) {
      if (freq < minFlow) continue;
      const [st, city] = key.split("||");
      nodeSet.add(st);
      nodeSet.add(city);
      linkArray.push({ sourceName: st, targetName: city, value: freq });
    }

    if (linkArray.length === 0) {
      console.warn("No links remain after minFlow filtering.");
      return;
    }

    // 4) Convert nodeSet to an array
    const nodeNames = Array.from(nodeSet);
    nodeNames.sort();

    // Build a map from name->index
    const nodeIndexMap = new Map();
    nodeNames.forEach((nm, i) => nodeIndexMap.set(nm, i));

    // 5) Create final sankey data: nodes[], links[]
    const sankeyNodes = nodeNames.map(name => ({ name }));
    const sankeyLinks = [];

    for (const link of linkArray) {
      const srcIdx = nodeIndexMap.get(link.sourceName);
      const tgtIdx = nodeIndexMap.get(link.targetName);
      // If either is undefined, skip
      if (srcIdx === undefined || tgtIdx === undefined) {
        console.warn("Skipping link with missing node index:", link);
        continue;
      }
      sankeyLinks.push({
        source: srcIdx,
        target: tgtIdx,
        value: link.value
      });
    }

    if (sankeyLinks.length === 0) {
      console.warn("No sankeyLinks remain after final check.");
      return;
    }

    // Log them to see if there's any out-of-range
    console.log("Sankey nodes:", sankeyNodes);
    console.log("Sankey links:", sankeyLinks);

    // 6) Sankey layout
    // We'll skip sankeyLeft alignment to reduce confusion
    const sankeyGenerator = sankey()
      .nodeWidth(10)
      .nodePadding(10)
      .extent([[0, 0], [width, height]]);

    const sankeyData = {
      nodes: sankeyNodes,
      links: sankeyLinks
    };

    const sankeyLayout = sankeyGenerator(sankeyData);

    // 7) Draw
    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();
    svg
      .attr("viewBox", [0, 0, width, height])
      .attr("preserveAspectRatio", "xMidYMid meet");

    // Links
    svg.append("g")
      .selectAll("path")
      .data(sankeyLayout.links)
      .enter()
      .append("path")
      .attr("fill", "none")
      .attr("stroke", "#999")
      .attr("stroke-opacity", 0.5)
      .attr("stroke-width", d => d.width)
      .attr("d", sankeyLinkHorizontal());

    // Nodes
    const nodeGroup = svg.append("g");
    nodeGroup
      .selectAll("rect")
      .data(sankeyLayout.nodes)
      .enter()
      .append("rect")
      .attr("x", d => d.x0)
      .attr("y", d => d.y0)
      .attr("width", d => d.x1 - d.x0)
      .attr("height", d => d.y1 - d.y0)
      .attr("fill", "#4E79A7");

    // Labels
    nodeGroup
      .selectAll("text")
      .data(sankeyLayout.nodes)
      .enter()
      .append("text")
      .attr("x", d => (d.x0 < width / 2 ? d.x1 + 6 : d.x0 - 6))
      .attr("y", d => (d.y0 + d.y1) / 2)
      .attr("dy", "0.35em")
      .attr("text-anchor", d => (d.x0 < width / 2 ? "start" : "end"))
      .text(d => d.name);
  }, [data, width, height, minFlow]);

  return <svg ref={svgRef} style={{ width: "100%", height: "auto" }} />;
}

export default StateCitySankeyDebug;