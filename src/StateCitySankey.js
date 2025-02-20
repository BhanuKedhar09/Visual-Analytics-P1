// StateCitySankey.js
import React, { useRef, useEffect, useContext } from "react";
import * as d3 from "d3";
import { sankey, sankeyLeft, sankeyLinkHorizontal } from "d3-sankey";
import { DataContext } from "./DataLoader";

/**
 * Minimal 2-level Sankey: state_id -> Location
 * 
 * We do:
 *   1) Filter out rows missing state_id or Location
 *   2) Aggregate frequency by (state_id, Location)
 *   3) Build a Sankey with two columns: states on the left, cities on the right
 *   4) Each link’s thickness is how many rows (transactions) appear for that (state, city) pair
 */

function StateCitySankey({
  width = 700,
  height = 300,
  minFlow = 1 // skip state->city pairs with freq < minFlow
}) {
  const { data } = useContext(DataContext);
  const svgRef = useRef(null);

  useEffect(() => {
    if (!data || data.length === 0) return;

    // 1) Filter out rows missing state_id or Location
    const filtered = data.filter(
      d => d.state_id && d.state_id.trim() && d.Location && d.Location.trim()
    );
    if (filtered.length === 0) return;

    // 2) Build aggregator for (state -> city) freq
    //    We'll store it in a Map<"state||city", freq>
    //    Then we'll build nodeSet from all states & cities
    const linkFreqMap = new Map();
    const nodeSet = new Set();

    filtered.forEach(row => {
      const st = row.state_id.trim();
      const city = row.Location.trim();
      // increment freq
      const key = `${st}||${city}`;
      const oldVal = linkFreqMap.get(key) || 0;
      linkFreqMap.set(key, oldVal + 1);

      // add to node set
      nodeSet.add(st);
      nodeSet.add(city);
    });

    // Convert linkFreqMap to an array of {source, target, value}
    const linksArray = [];
    for (const [key, freq] of linkFreqMap.entries()) {
      if (freq >= minFlow) {
        const [src, tgt] = key.split("||");
        linksArray.push({ source: src, target: tgt, value: freq });
      }
    }

    // 3) Build node array from nodeSet
    const nodeNames = Array.from(nodeSet);
    nodeNames.sort(); // optional sort for stable ordering

    // name->index
    const nodeIndexMap = new Map();
    nodeNames.forEach((name, i) => {
      nodeIndexMap.set(name, i);
    });

    // Convert links to numeric indices
    // Filter out any that can't find a matching node
    const sankeyLinks = linksArray
      .map(l => ({
        source: nodeIndexMap.get(l.source),
        target: nodeIndexMap.get(l.target),
        value: l.value
      }))
      .filter(l => l.source !== undefined && l.target !== undefined);

    if (sankeyLinks.length === 0) return;

    // Node array
    const sankeyNodes = nodeNames.map((name, i) => ({
      name,
      index: i
    }));

    // 4) Sankey layout
    const sankeyGenerator = sankey()
      .nodeId(d => d.name)
      .nodeAlign(sankeyLeft)
      .nodeWidth(10)
      .nodePadding(10)
      .extent([[0, 0], [width, height]]);

    const sankeyData = {
      nodes: sankeyNodes,
      links: sankeyLinks
    };

    const sankeyLayout = sankeyGenerator(sankeyData);

    // 5) Draw
    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    svg
      .attr("viewBox", [0, 0, width, height])
      .attr("preserveAspectRatio", "xMidYMid meet");

    // Links
    svg
      .append("g")
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

export default StateCitySankey;