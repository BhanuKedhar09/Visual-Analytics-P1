// StateCitySankeySorted.js
import React, { useRef, useEffect, useContext, useState } from "react";
import * as d3 from "d3";
import { sankey, sankeyLinkHorizontal } from "d3-sankey";
import { DataContext } from "./DataLoader";

/**
 * Three-column Sankey: State -> City -> Occupation
 * 
 * - Wide layout (1500 px) so we minimize vertical scrolling.
 * - Height fixed at 600 px for demonstration (adjust as needed).
 * - Sorts:
 *    1) States by descending total flow
 *    2) Cities by "dominant state" (the state that has the highest freq with that city)
 *    3) Occupations by descending total flow
 *
 * We produce two sets of link segments for each row:
 *   - (State -> City)
 *   - (City -> Occupation)
 * 
 * That yields a three-column Sankey horizontally:
 *   layer=0 => State
 *   layer=1 => City
 *   layer=2 => Occupation
 */

function StateCitySankeySorted({
  baseWidth = 1500,    // wide layout to reduce vertical scrolling
  baseHeight = 600,    // fixed height
  minFlow = 1,         // skip flows < minFlow
  nodeWidthPx = 10,
  nodePaddingPx = 10
}) {
  const { data } = useContext(DataContext);
  const svgRef = useRef(null);

  useEffect(() => {
    if (!data || data.length === 0) return;

    // 1) Filter out rows missing state_id, Location, CustomerOccupation
    const filtered = data.filter(
      d =>
        d.state_id && d.state_id.trim() &&
        d.Location && d.Location.trim() &&
        d.CustomerOccupation && d.CustomerOccupation.trim()
    );
    if (filtered.length === 0) {
      console.warn("No valid rows after filtering missing state/city/occupation.");
      return;
    }

    // 2) We'll build a 3-level aggregator: (state -> city -> occupation)
    //    Then we produce two link segments for each row:
    //      (state->city) and (city->occupation)
    //    We'll combine them into a single link array for Sankey.

    // a) We'll track freq for each chain: (state, city, occupation)
    //    plus partial pairs: (state->city), (city->occup)
    //    but simpler approach: store freq for the full triple, then create 2 link segments from it.
    const tripleFreq = new Map(); // key = "state||city||occup", val = freq

    // We'll also track:
    // - stateTotals: total flow out of each state
    // - cityFlows: city->(state->freq) to find city’s dominant state
    // - occupTotals: total flow for each occupation
    const stateTotals = new Map();
    const cityFlows = new Map();   // city => Map(state->freq)
    const occupTotals = new Map();

    filtered.forEach(row => {
      const st = row.state_id.trim();
      const ct = row.Location.trim();
      const oc = row.CustomerOccupation.trim();

      // increment triple freq
      const key = `${st}||${ct}||${oc}`;
      tripleFreq.set(key, (tripleFreq.get(key) || 0) + 1);

      // track state total
      stateTotals.set(st, (stateTotals.get(st) || 0) + 1);

      // track city->(state->freq)
      if (!cityFlows.has(ct)) cityFlows.set(ct, new Map());
      const stMap = cityFlows.get(ct);
      stMap.set(st, (stMap.get(st) || 0) + 1);

      // track occupation total
      occupTotals.set(oc, (occupTotals.get(oc) || 0) + 1);
    });

    // We'll store link segments in two arrays:
    //   1) state->city
    //   2) city->occupation
    // Then combine them.

    const scLinkFreq = new Map(); // key="state||city", val=freq
    const coLinkFreq = new Map(); // key="city||occup", val=freq

    // 3) Build partial links from triple
    //    If freq < minFlow, skip
    for (const [key, freq] of tripleFreq.entries()) {
      if (freq < minFlow) continue;
      const [st, ct, oc] = key.split("||");

      // increment state->city
      const scKey = `${st}||${ct}`;
      scLinkFreq.set(scKey, (scLinkFreq.get(scKey) || 0) + freq);

      // increment city->occup
      const coKey = `${ct}||${oc}`;
      coLinkFreq.set(coKey, (coLinkFreq.get(coKey) || 0) + freq);
    }

    // Now we have two sets of link freq. We'll unify them into a single sankey link array
    // but we also need a node set for states, cities, occupations with layer=0,1,2
    const stateSet = new Set();
    const citySet = new Set();
    const occupSet = new Set();

    // gather states & cities from scLinkFreq
    for (const [key, freq] of scLinkFreq.entries()) {
      const [st, ct] = key.split("||");
      stateSet.add(st);
      citySet.add(ct);
    }

    // gather city & occup from coLinkFreq
    for (const [key, freq] of coLinkFreq.entries()) {
      const [ct, oc] = key.split("||");
      citySet.add(ct);
      occupSet.add(oc);
    }

    // 4) Sort states by descending total flow
    const states = Array.from(stateSet).sort((a, b) => {
      const ta = stateTotals.get(a) || 0;
      const tb = stateTotals.get(b) || 0;
      return d3.descending(ta, tb);
    });

    // 5) For each city, find dominant state
    const cityDominant = {};
    for (const ct of citySet) {
      const stMap = cityFlows.get(ct) || new Map();
      let bestSt = null;
      let bestFreq = -Infinity;
      for (const [s, f] of stMap.entries()) {
        if (f > bestFreq) {
          bestFreq = f;
          bestSt = s;
        }
      }
      cityDominant[ct] = bestSt;
    }

    // build a map state->rank
    const stateRank = new Map();
    states.forEach((s, i) => {
      stateRank.set(s, i);
    });

    // sort city by the rank of its dominant state
    const cities = Array.from(citySet).sort((cA, cB) => {
      const stA = cityDominant[cA];
      const stB = cityDominant[cB];
      const rA = stateRank.get(stA) ?? 9999;
      const rB = stateRank.get(stB) ?? 9999;
      if (rA !== rB) return d3.ascending(rA, rB);
      return d3.ascending(cA, cB); // fallback
    });

    // 6) Sort occupations by descending total flow
    const occupations = Array.from(occupSet).sort((a, b) => {
      const ta = occupTotals.get(a) || 0;
      const tb = occupTotals.get(b) || 0;
      return d3.descending(ta, tb);
    });

    // 7) Build final node array
    // layer=0 => states
    // layer=1 => cities
    // layer=2 => occupations
    const nodes = [];
    const nodeIndexMap = new Map();

    // states first
    states.forEach(st => {
      const idx = nodes.length;
      nodes.push({ name: st, layer: 0 });
      nodeIndexMap.set(st, idx);
    });
    // cities
    cities.forEach(ct => {
      const idx = nodes.length;
      nodes.push({ name: ct, layer: 1 });
      nodeIndexMap.set(ct, idx);
    });
    // occupations
    occupations.forEach(oc => {
      const idx = nodes.length;
      nodes.push({ name: oc, layer: 2 });
      nodeIndexMap.set(oc, idx);
    });

    // 8) Build sankey link array from scLinkFreq and coLinkFreq
    const sankeyLinks = [];

    // state->city
    for (const [key, freq] of scLinkFreq.entries()) {
      const [st, ct] = key.split("||");
      const sIdx = nodeIndexMap.get(st);
      const cIdx = nodeIndexMap.get(ct);
      if (sIdx === undefined || cIdx === undefined) continue;
      sankeyLinks.push({
        source: sIdx,
        target: cIdx,
        value: freq
      });
    }

    // city->occup
    for (const [key, freq] of coLinkFreq.entries()) {
      const [ct, oc] = key.split("||");
      const cIdx = nodeIndexMap.get(ct);
      const oIdx = nodeIndexMap.get(oc);
      if (cIdx === undefined || oIdx === undefined) continue;
      sankeyLinks.push({
        source: cIdx,
        target: oIdx,
        value: freq
      });
    }

    if (sankeyLinks.length === 0) {
      console.warn("No sankeyLinks remain after building the 2 segments.");
      return;
    }

    // Debug logs
    console.log("Sankey nodes:", nodes);
    console.log("Sankey links:", sankeyLinks);

    // We'll do a fixed wide layout
    const chartWidth = baseWidth;
    const chartHeight = baseHeight;

    // 9) Draw the Sankey
    drawSankey(nodes, sankeyLinks, chartWidth, chartHeight);

    function drawSankey(nodeArray, linkArray, w, h) {
      const svg = d3.select(svgRef.current);
      svg.selectAll("*").remove();
      svg
        .attr("viewBox", [0, 0, w, h])
        .attr("preserveAspectRatio", "xMidYMid meet");

      // customAlign: layer=0 => left, 1 => middle, 2 => right
      function customAlign(node) {
        return node.layer; // 0 => left, 1 => middle, 2 => right
      }

      const sankeyGenerator = sankey()
        .nodeWidth(nodeWidthPx)
        .nodePadding(nodePaddingPx)
        .nodeAlign(customAlign)
        .extent([[0, 0], [w, h]]);

      const sankeyData = {
        nodes: nodeArray,
        links: linkArray
      };

      const sankeyLayout = sankeyGenerator(sankeyData);

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
      nodeGroup.selectAll("rect")
        .data(sankeyLayout.nodes)
        .enter()
        .append("rect")
        .attr("x", d => d.x0)
        .attr("y", d => d.y0)
        .attr("width", d => d.x1 - d.x0)
        .attr("height", d => d.y1 - d.y0)
        .attr("fill", d => {
          if (d.layer === 0) return "#4E79A7"; // state
          if (d.layer === 1) return "#F28E2B"; // city
          return "#59A14F"; // occupation
        });

      // Labels
      nodeGroup.selectAll("text")
        .data(sankeyLayout.nodes)
        .enter()
        .append("text")
        .attr("x", d => {
          if (d.layer === 2) {
            // right column => place label to left
            return d.x0 - 6;
          } else {
            // left or middle => place label to right
            return d.x1 + 6;
          }
        })
        .attr("y", d => (d.y0 + d.y1) / 2)
        .attr("dy", "0.35em")
        .attr("text-anchor", d => (d.layer === 2 ? "end" : "start"))
        .text(d => d.name);
    }
  }, [data, baseWidth, baseHeight, minFlow, nodeWidthPx, nodePaddingPx]);

  return (
    <svg
      ref={svgRef}
      style={{
        width: "100%",
        height: "auto",
        border: "1px solid #ccc"
      }}
    />
  );
}

export default StateCitySankeySorted;