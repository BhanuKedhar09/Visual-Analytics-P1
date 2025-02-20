// SankeyFourColumns.js
import React, {
    useRef,
    useEffect,
    useContext,
    useState,
    useCallback
  } from "react";
  import * as d3 from "d3";
  import { sankey, sankeyLinkHorizontal } from "d3-sankey";
  import { DataContext } from "./DataLoader";
  
  /**
   * Four-column Sankey: State -> City -> Occupation -> Merchant
   * 
   * - Responsive: uses a ResizeObserver to adapt to parent container size.
   * - Sorting logic:
   *   1) States by descending total flow
   *   2) Cities by "dominant" state
   *   3) Occupations by descending total flow
   *   4) Merchants by descending total flow
   * 
   * We produce 3 sets of partial link frequencies:
   *   (state->city), (city->occupation), (occupation->merchant).
   * Then we unify them in one Sankey graph with layers=0,1,2,3.
   */
  
  function SankeyFourColumns({
    minFlow = 1,         // skip flows < minFlow
    nodeWidthPx = 10,
    nodePaddingPx = 10
  }) {
    const { data } = useContext(DataContext);
  
    // We'll measure container size with a ResizeObserver
    const containerRef = useRef(null);
    const svgRef = useRef(null);
  
    // Store the container’s measured width/height in state
    const [width, setWidth] = useState(800);
    const [height, setHeight] = useState(600);
  
    // 1) Set up a ResizeObserver to track parent container size
    useEffect(() => {
      if (!containerRef.current) return;
      const ro = new ResizeObserver((entries) => {
        for (let entry of entries) {
          if (entry.contentBoxSize) {
            const cw = entry.contentBoxSize[0]
              ? entry.contentBoxSize[0].inlineSize
              : entry.contentBoxSize.inlineSize;
            const ch = entry.contentBoxSize[0]
              ? entry.contentBoxSize[0].blockSize
              : entry.contentBoxSize.blockSize;
            setWidth(Math.max(300, cw));
            setHeight(Math.max(300, ch));
          } else {
            // fallback for older browsers
            setWidth(Math.max(300, entry.contentRect.width));
            setHeight(Math.max(300, entry.contentRect.height));
          }
        }
      });
      ro.observe(containerRef.current);
  
      return () => {
        ro.disconnect();
      };
    }, []);
  
    // 2) A function to build + render the sankey each time data or size changes
    const renderSankey = useCallback(() => {
      if (!data || data.length === 0) return;
      if (width < 300 || height < 300) return; // too small to draw
  
      // Filter rows missing required fields
      const filtered = data.filter(
        (d) =>
          d.state_id?.trim() &&
          d.Location?.trim() &&
          d.CustomerOccupation?.trim() &&
          d.MerchantID?.trim()
      );
      if (filtered.length === 0) {
        console.warn("No valid rows after filtering missing columns.");
        return;
      }
  
      // aggregator for quadruple: (state, city, occup, merchant)
      // We'll store freq in a Map<"state||city||occup||mer", number>
      const quadFreq = new Map();
  
      // Also track:
      //   - stateTotals
      //   - cityFlows => city->(state->freq)
      //   - occupTotals
      //   - merchTotals
      const stateTotals = new Map();
      const cityFlows = new Map(); // city => Map(state->freq)
      const occupTotals = new Map();
      const merchTotals = new Map();
  
      filtered.forEach((row) => {
        const st = row.state_id.trim();
        const ct = row.Location.trim();
        const oc = row.CustomerOccupation.trim();
        const me = row.MerchantID.trim();
  
        const key = `${st}||${ct}||${oc}||${me}`;
        quadFreq.set(key, (quadFreq.get(key) || 0) + 1);
  
        // track state total
        stateTotals.set(st, (stateTotals.get(st) || 0) + 1);
  
        // track city->(state->freq)
        if (!cityFlows.has(ct)) cityFlows.set(ct, new Map());
        const stMap = cityFlows.get(ct);
        stMap.set(st, (stMap.get(st) || 0) + 1);
  
        // track occupation total
        occupTotals.set(oc, (occupTotals.get(oc) || 0) + 1);
  
        // track merchant total
        merchTotals.set(me, (merchTotals.get(me) || 0) + 1);
      });
  
      // We'll produce partial link freq for:
      //   (state->city), (city->occupation), (occupation->merchant)
      const scLinkFreq = new Map();
      const coLinkFreq = new Map();
      const omLinkFreq = new Map();
  
      // Build partial links from the quadruple
      for (const [key, freq] of quadFreq.entries()) {
        if (freq < minFlow) continue;
        const [st, ct, oc, me] = key.split("||");
  
        // increment (state->city)
        const scKey = `${st}||${ct}`;
        scLinkFreq.set(scKey, (scLinkFreq.get(scKey) || 0) + freq);
  
        // increment (city->occup)
        const coKey = `${ct}||${oc}`;
        coLinkFreq.set(coKey, (coLinkFreq.get(coKey) || 0) + freq);
  
        // increment (occup->merchant)
        const omKey = `${oc}||${me}`;
        omLinkFreq.set(omKey, (omLinkFreq.get(omKey) || 0) + freq);
      }
  
      // Build sets for each column
      const stateSet = new Set();
      const citySet = new Set();
      const occupSet = new Set();
      const merchSet = new Set();
  
      // fill state/city from scLinkFreq
      for (const [key, freq] of scLinkFreq.entries()) {
        const [st, ct] = key.split("||");
        stateSet.add(st);
        citySet.add(ct);
      }
  
      // fill city/occup from coLinkFreq
      for (const [key, freq] of coLinkFreq.entries()) {
        const [ct, oc] = key.split("||");
        citySet.add(ct);
        occupSet.add(oc);
      }
  
      // fill occup/merchant from omLinkFreq
      for (const [key, freq] of omLinkFreq.entries()) {
        const [oc, me] = key.split("||");
        occupSet.add(oc);
        merchSet.add(me);
      }
  
      // Sort states by descending total flow
      const states = Array.from(stateSet).sort((a, b) => {
        const ta = stateTotals.get(a) || 0;
        const tb = stateTotals.get(b) || 0;
        return d3.descending(ta, tb);
      });
  
      // For each city, find "dominant" state
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
  
      // sort city by rank of its dominant state
      const cities = Array.from(citySet).sort((cA, cB) => {
        const stA = cityDominant[cA];
        const stB = cityDominant[cB];
        const rA = stateRank.get(stA) ?? 9999;
        const rB = stateRank.get(stB) ?? 9999;
        if (rA !== rB) return d3.ascending(rA, rB);
        return d3.ascending(cA, cB);
      });
  
      // sort occupations by descending total flow
      const occupations = Array.from(occupSet).sort((a, b) => {
        const ta = occupTotals.get(a) || 0;
        const tb = occupTotals.get(b) || 0;
        return d3.descending(ta, tb);
      });
  
      // sort merchants by descending total flow
      const merchants = Array.from(merchSet).sort((a, b) => {
        const ta = merchTotals.get(a) || 0;
        const tb = merchTotals.get(b) || 0;
        return d3.descending(ta, tb);
      });
  
      // Build final node array with layer=0,1,2,3
      const nodes = [];
      const nodeIndexMap = new Map();
  
      // states
      states.forEach((st) => {
        const idx = nodes.length;
        nodes.push({ name: st, layer: 0 });
        nodeIndexMap.set(st, idx);
      });
      // cities
      cities.forEach((ct) => {
        const idx = nodes.length;
        nodes.push({ name: ct, layer: 1 });
        nodeIndexMap.set(ct, idx);
      });
      // occupations
      occupations.forEach((oc) => {
        const idx = nodes.length;
        nodes.push({ name: oc, layer: 2 });
        nodeIndexMap.set(oc, idx);
      });
      // merchants
      merchants.forEach((me) => {
        const idx = nodes.length;
        nodes.push({ name: me, layer: 3 });
        nodeIndexMap.set(me, idx);
      });
  
      // Build sankey links
      const sankeyLinks = [];
  
      // state->city
      for (const [key, freq] of scLinkFreq.entries()) {
        const [st, ct] = key.split("||");
        const sIdx = nodeIndexMap.get(st);
        const cIdx = nodeIndexMap.get(ct);
        if (sIdx !== undefined && cIdx !== undefined) {
          sankeyLinks.push({
            source: sIdx,
            target: cIdx,
            value: freq
          });
        }
      }
  
      // city->occup
      for (const [key, freq] of coLinkFreq.entries()) {
        const [ct, oc] = key.split("||");
        const cIdx = nodeIndexMap.get(ct);
        const oIdx = nodeIndexMap.get(oc);
        if (cIdx !== undefined && oIdx !== undefined) {
          sankeyLinks.push({
            source: cIdx,
            target: oIdx,
            value: freq
          });
        }
      }
  
      // occup->merchant
      for (const [key, freq] of omLinkFreq.entries()) {
        const [oc, me] = key.split("||");
        const oIdx = nodeIndexMap.get(oc);
        const mIdx = nodeIndexMap.get(me);
        if (oIdx !== undefined && mIdx !== undefined) {
          sankeyLinks.push({
            source: oIdx,
            target: mIdx,
            value: freq
          });
        }
      }
  
      // Render
      drawSankey(nodes, sankeyLinks, width, height);
    }, [data, width, height, minFlow, nodeWidthPx, nodePaddingPx]);
  
    // 3) Actually draw the sankey
    const drawSankey = useCallback(
      (nodeArray, linkArray, w, h) => {
        if (!svgRef.current) return;
        const svg = d3.select(svgRef.current);
        svg.selectAll("*").remove();
  
        // custom align: 0 => left, 1 => next, 2 => next, 3 => right
        function customAlign(node) {
          return node.layer;
        }
  
        const sankeyGenerator = sankey()
          .nodeWidth(nodeWidthPx)
          .nodePadding(nodePaddingPx)
          .nodeAlign(customAlign)
          .extent([
            [0, 0],
            [w, h]
          ]);
  
        const sankeyData = {
          nodes: nodeArray,
          links: linkArray
        };
  
        const sankeyLayout = sankeyGenerator(sankeyData);
  
        // Links
        svg
          .append("g")
          .selectAll("path")
          .data(sankeyLayout.links)
          .enter()
          .append("path")
          .attr("fill", "none")
          .attr("stroke", "#999")
          .attr("stroke-opacity", 0.4)
          .attr("stroke-width", (d) => d.width)
          .attr("d", sankeyLinkHorizontal());
  
        // Nodes
        const nodeGroup = svg.append("g");
        nodeGroup
          .selectAll("rect")
          .data(sankeyLayout.nodes)
          .enter()
          .append("rect")
          .attr("x", (d) => d.x0)
          .attr("y", (d) => d.y0)
          .attr("width", (d) => d.x1 - d.x0)
          .attr("height", (d) => d.y1 - d.y0)
          .attr("fill", (d) => {
            if (d.layer === 0) return "#4E79A7"; // states
            if (d.layer === 1) return "#F28E2B"; // cities
            if (d.layer === 2) return "#59A14F"; // occupations
            return "#E15759"; // merchants
          });
  
        // Labels
        nodeGroup
          .selectAll("text")
          .data(sankeyLayout.nodes)
          .enter()
          .append("text")
          .attr("x", (d) => {
            // if it's the last layer (3 => merchant), place label to the left
            if (d.layer === 3) return d.x0 - 6;
            // otherwise place to the right
            return d.x1 + 6;
          })
          .attr("y", (d) => (d.y0 + d.y1) / 2)
          .attr("dy", "0.35em")
          .attr("text-anchor", (d) => (d.layer === 3 ? "end" : "start"))
          .text((d) => d.name);
      },
      [svgRef, nodeWidthPx, nodePaddingPx]
    );
  
    // Re‐render sankey whenever data or size changes
    useEffect(() => {
      renderSankey();
    }, [renderSankey]);
  
    return (
      <div
        ref={containerRef}
        style={{ width: "100%", height: "100%", position: "relative" }}
      >
        <svg
          ref={svgRef}
          style={{
            width: "100%",
            height: "100%",
            display: "block"
          }}
        />
      </div>
    );
  }
  
  export default SankeyFourColumns;