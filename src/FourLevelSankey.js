// FourLevelSankey.js
import React, { useRef, useEffect, useContext } from "react";
import * as d3 from "d3";
import { sankey, sankeyLeft, sankeyLinkHorizontal } from "d3-sankey";
import { DataContext } from "./DataLoader";

/**
 * Four-level Sankey: State -> City -> CustomerOccupation -> Merchant
 * 
 * We:
 *  1) Filter out rows missing these fields.
 *  2) Aggregate each row into a chain (State, City, Occupation, Merchant).
 *  3) Combine them so we have 3 links in that chain:
 *     - State -> City
 *     - City -> Occupation
 *     - Occupation -> Merchant
 *  4) Summation of freq or amounts for each link (so no duplicates).
 *  5) Generate Sankey with d3-sankey, ensuring each link references valid nodes.
 */

function FourLevelSankey({
  width = 900,
  height = 600,
  minFlow = 1 // skip flows below this threshold
}) {
  const { data } = useContext(DataContext);
  const svgRef = useRef(null);

  useEffect(() => {
    if (!data || data.length === 0) return;

    // 1) Filter out any rows missing required fields
    //    Adjust field names if your data uses different keys
    const filtered = data.filter(d =>
      d.state_id && d.Location && d.CustomerOccupation && d.MerchantID
    );

    if (filtered.length === 0) return;

    // 2) We'll store the chain freq in a rollup or a nested map
    //    But let's do a single pass approach:
    //    For each row, increment freq of the chain (State, City, Occupation, Merchant).
    //    Then we'll break that chain into 3 link segments.

    // A map from the 3 segments => combined freq
    // segment can be like "State->City", "City->Occup", "Occup->Merchant"
    // We'll store them in a single Map<key, freq>
    // key = "sourceName||targetName"
    const linkFreqMap = new Map();

    // Also track a set of all node names
    const nodeSet = new Set();

    // For freq or sum of amounts? If you want sum of TransactionAmount,
    // replace "1" with row.TransactionAmount
    filtered.forEach(row => {
      const state = row.state_id;
      const city = row.Location;
      const occup = row.CustomerOccupation;
      const merch = row.MerchantID;

      // increment the freq for 3 segments
      incrementLinkFreq(linkFreqMap, state, city, 1);
      incrementLinkFreq(linkFreqMap, city, occup, 1);
      incrementLinkFreq(linkFreqMap, occup, merch, 1);

      // track the node names
      nodeSet.add(state);
      nodeSet.add(city);
      nodeSet.add(occup);
      nodeSet.add(merch);
    });

    // Now we have linkFreqMap with combined freq for each segment
    // e.g., "StateName||CityName" => freq
    // We'll skip anything < minFlow
    const linksArray = [];
    for (const [key, freq] of linkFreqMap.entries()) {
      if (freq >= minFlow) {
        const [src, tgt] = key.split("||");
        linksArray.push({ source: src, target: tgt, value: freq });
      }
    }

    // Build node array
    const nodeNames = Array.from(nodeSet);
    nodeNames.sort(); // optional sort

    // A map name->index
    const nodeIndexMap = new Map();
    nodeNames.forEach((name, i) => {
      nodeIndexMap.set(name, i);
    });

    // Convert links to numeric indices
    const sankeyLinks = linksArray.map(l => ({
      source: nodeIndexMap.get(l.source),
      target: nodeIndexMap.get(l.target),
      value: l.value
    }));

    // Node array for sankey
    const sankeyNodes = nodeNames.map((name, i) => ({
      name,
      index: i
    }));

    // 3) Sankey Layout
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

    // 4) Draw
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
      .attr("stroke-opacity", 0.4)
      .attr("stroke-width", d => d.width)
      .attr("d", sankeyLinkHorizontal());

    // Nodes
    const nodeGroup = svg.append("g");

    const node = nodeGroup
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
      .attr("x", d => d.x0 - 6)
      .attr("y", d => (d.y1 + d.y0) / 2)
      .attr("dy", "0.35em")
      .attr("text-anchor", "end")
      .text(d => d.name)
      .filter(d => d.x0 < width / 2) // if node is in left half, label on right
      .attr("x", d => d.x1 + 6)
      .attr("text-anchor", "start");

  }, [data, width, height, minFlow]);

  return <svg ref={svgRef} style={{ width: "100%", height: "auto" }} />;
}

// A small helper to increment link frequency in a Map
function incrementLinkFreq(linkMap, src, tgt, val) {
  // skip if missing
  if (!src || !tgt) return;
  const key = `${src}||${tgt}`;
  const old = linkMap.get(key) || 0;
  linkMap.set(key, old + val);
}

export default FourLevelSankey;