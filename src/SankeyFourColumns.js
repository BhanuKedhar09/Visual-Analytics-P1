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
import { InteractionContext } from "./InteractionContext";

function SankeyFourColumns({
  minFlow = 1,
  maxMerchants = 20,
  nodeWidthPx = 30,
  nodePaddingPx = 20
}) {
  const { data } = useContext(DataContext);

  // We read the sankey hovered states from InteractionContext
  const { setHoveredSankey, setHoveredSankeyLink } = useContext(InteractionContext);

  const containerRef = useRef(null);
  const svgRef = useRef(null);

  const [width, setWidth] = useState(800);
  const [height, setHeight] = useState(560);

  useEffect(() => {
    if (!containerRef.current) return;
    const ro = new ResizeObserver((entries) => {
      for (let entry of entries) {
        const cw = entry.contentRect.width;
        const ch = entry.contentRect.height;
        setWidth(Math.max(300, cw));
        setHeight(Math.max(300, ch));
      }
    });
    ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, []);

  const renderSankey = useCallback(() => {
    if (!data || data.length === 0) return;
    if (width < 300 || height < 300) return;

    // 1) Filter rows missing fields
    const filtered = data.filter(
      d =>
        d.state_id?.trim() &&
        d.Location?.trim() &&
        d.CustomerOccupation?.trim() &&
        d.MerchantID?.trim()
    );
    if (filtered.length === 0) {
      console.warn("No valid rows after filtering.");
      return;
    }

    // 2) Aggregation logic
    const quadFreq = new Map();
    const stateTotals = new Map();
    const cityFlows = new Map();
    const occupTotals = new Map();
    const merchantTotals = new Map();

    filtered.forEach((row) => {
      const st = row.state_id.trim();
      const ct = row.Location.trim();
      const oc = row.CustomerOccupation.trim();
      const me = row.MerchantID.trim();
      const key = `${st}||${ct}||${oc}||${me}`;
      quadFreq.set(key, (quadFreq.get(key) || 0) + 1);

      stateTotals.set(st, (stateTotals.get(st) || 0) + 1);
      if (!cityFlows.has(ct)) cityFlows.set(ct, new Map());
      const stMap = cityFlows.get(ct);
      stMap.set(st, (stMap.get(st) || 0) + 1);
      occupTotals.set(oc, (occupTotals.get(oc) || 0) + 1);
      merchantTotals.set(me, (merchantTotals.get(me) || 0) + 1);
    });

    // 3) Aggregate merchants => "Other"
    const merchEntries = Array.from(merchantTotals.entries());
    merchEntries.sort((a, b) => d3.descending(a[1], b[1]));
    const topMerchants = merchEntries.slice(0, maxMerchants).map(d => d[0]);
    const otherMerchants = merchEntries.slice(maxMerchants).map(d => d[0]);
    const hasOther = otherMerchants.length > 0;
    if (hasOther) {
      const newQuadFreq = new Map();
      for (const [key, freq] of quadFreq.entries()) {
        const [st, ct, oc, me] = key.split("||");
        const me2 = otherMerchants.includes(me) ? "Other" : me;
        const newKey = `${st}||${ct}||${oc}||${me2}`;
        newQuadFreq.set(newKey, (newQuadFreq.get(newKey) || 0) + freq);
      }
      quadFreq.clear();
      for (const [k, f] of newQuadFreq.entries()) {
        quadFreq.set(k, f);
      }
      merchantTotals.clear();
      for (const [k, f] of quadFreq.entries()) {
        const parts = k.split("||");
        const me2 = parts[3];
        merchantTotals.set(me2, (merchantTotals.get(me2) || 0) + f);
      }
    }

    // 4) partial link freq
    const scLinkFreq = new Map();
    const coLinkFreq = new Map();
    const omLinkFreq = new Map();

    for (const [key, freq] of quadFreq.entries()) {
      if (freq < minFlow) continue;
      const [st, ct, oc, me] = key.split("||");
      scLinkFreq.set(`${st}||${ct}`, (scLinkFreq.get(`${st}||${ct}`) || 0) + freq);
      coLinkFreq.set(`${ct}||${oc}`, (coLinkFreq.get(`${ct}||${oc}`) || 0) + freq);
      omLinkFreq.set(`${oc}||${me}`, (omLinkFreq.get(`${oc}||${me}`) || 0) + freq);
    }

    // 5) build sets
    const stateSet = new Set();
    const citySet = new Set();
    const occupSet = new Set();
    const merchSet = new Set();

    for (const k of scLinkFreq.keys()) {
      const [st, ct] = k.split("||");
      stateSet.add(st);
      citySet.add(ct);
    }
    for (const k of coLinkFreq.keys()) {
      const [ct, oc] = k.split("||");
      citySet.add(ct);
      occupSet.add(oc);
    }
    for (const k of omLinkFreq.keys()) {
      const [oc, me] = k.split("||");
      occupSet.add(oc);
      merchSet.add(me);
    }

    // 6) sort states
    const states = Array.from(stateSet).sort((a, b) => {
      const ta = stateTotals.get(a) || 0;
      const tb = stateTotals.get(b) || 0;
      return d3.descending(ta, tb);
    });

    // 7) city -> dominant state
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
    const stateRank = new Map();
    states.forEach((s, i) => {
      stateRank.set(s, i);
    });
    const cities = Array.from(citySet).sort((a, b) => {
      const stA = cityDominant[a];
      const stB = cityDominant[b];
      const rA = stateRank.get(stA) ?? 9999;
      const rB = stateRank.get(stB) ?? 9999;
      if (rA !== rB) return d3.ascending(rA, rB);
      return d3.ascending(a, b);
    });

    // 8) occupations
    const occupations = Array.from(occupSet).sort((a, b) => {
      const ta = occupTotals.get(a) || 0;
      const tb = occupTotals.get(b) || 0;
      return d3.descending(ta, tb);
    });

    // 9) merchants
    const merchants = Array.from(merchSet).sort((a, b) => {
      const ta = merchantTotals.get(a) || 0;
      const tb = merchantTotals.get(b) || 0;
      return d3.descending(ta, tb);
    });

    // 10) build node array
    const nodes = [];
    const nodeIndexMap = new Map();

    states.forEach((st) => {
      const idx = nodes.length;
      nodes.push({ name: st, layer: 0 });
      nodeIndexMap.set(st, idx);
    });
    cities.forEach((ct) => {
      const idx = nodes.length;
      nodes.push({ name: ct, layer: 1 });
      nodeIndexMap.set(ct, idx);
    });
    occupations.forEach((oc) => {
      const idx = nodes.length;
      nodes.push({ name: oc, layer: 2 });
      nodeIndexMap.set(oc, idx);
    });
    merchants.forEach((me) => {
      const idx = nodes.length;
      nodes.push({ name: me, layer: 3 });
      nodeIndexMap.set(me, idx);
    });

    // 11) sankey links
    const sankeyLinks = [];
    for (const [key, freq] of scLinkFreq.entries()) {
      const [st, ct] = key.split("||");
      const sIdx = nodeIndexMap.get(st);
      const cIdx = nodeIndexMap.get(ct);
      if (sIdx !== undefined && cIdx !== undefined) {
        sankeyLinks.push({ source: sIdx, target: cIdx, value: freq });
      }
    }
    for (const [key, freq] of coLinkFreq.entries()) {
      const [ct, oc] = key.split("||");
      const cIdx = nodeIndexMap.get(ct);
      const oIdx = nodeIndexMap.get(oc);
      if (cIdx !== undefined && oIdx !== undefined) {
        sankeyLinks.push({ source: cIdx, target: oIdx, value: freq });
      }
    }
    for (const [key, freq] of omLinkFreq.entries()) {
      const [oc, me] = key.split("||");
      const oIdx = nodeIndexMap.get(oc);
      const mIdx = nodeIndexMap.get(me);
      if (oIdx !== undefined && mIdx !== undefined) {
        sankeyLinks.push({ source: oIdx, target: mIdx, value: freq });
      }
    }

    if (sankeyLinks.length === 0) {
      console.warn("No links remain after building sankeyLinks.");
      return;
    }

    drawSankey(nodes, sankeyLinks, width, height);
  }, [data, width, height, minFlow, nodeWidthPx, nodePaddingPx, maxMerchants]);

  const drawSankey = useCallback(
    (nodeArray, linkArray, w, h) => {
      if (!svgRef.current) return;
      const svg = d3.select(svgRef.current);
      svg.selectAll("*").remove();

      function customAlign(node) {
        return node.layer;
      }

      const sankeyGenerator = sankey()
        .nodeWidth(nodeWidthPx)
        .nodePadding(nodePaddingPx)
        .nodeAlign(customAlign)
        .extent([[0, 0], [w, h]]);

      const sankeyData = { nodes: nodeArray, links: linkArray };
      const sankeyLayout = sankeyGenerator(sankeyData);

      // Draw links
      const linkGroup = svg.append("g");
      linkGroup
        .selectAll("path")
        .data(sankeyLayout.links)
        .enter()
        .append("path")
        .attr("fill", "none")
        .attr("stroke", "#999")
        .attr("stroke-opacity", 0.4)
        .attr("stroke-width", (d) => d.width)
        .attr("d", sankeyLinkHorizontal())
        .on("mouseover", (event, d) => {
          d3.select(event.currentTarget)
            .attr("stroke", "red")
            .attr("stroke-opacity", 1);
          // Broadcast hovered link
          setHoveredSankeyLink(d);
        })
        .on("mouseout", (event, d) => {
          d3.select(event.currentTarget)
            .attr("stroke", "#999")
            .attr("stroke-opacity", 0.4);
          setHoveredSankeyLink(null);
        });

      // Draw nodes
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
          return "#E15759";                   // merchants
        })
        .on("mouseover", (event, d) => {
          // highlight connected links
          svg.selectAll("path")
            .attr("stroke", (link) =>
              link.source.index === d.index || link.target.index === d.index
                ? "red"
                : "#999"
            )
            .attr("stroke-opacity", (link) =>
              link.source.index === d.index || link.target.index === d.index
                ? 1
                : 0.4
            );
          // Broadcast hovered node
          setHoveredSankey(d);
        })
        .on("mouseout", (event, d) => {
          svg.selectAll("path")
            .attr("stroke", "#999")
            .attr("stroke-opacity", 0.4);
          setHoveredSankey(null);
        });

      // Labels
      nodeGroup
        .selectAll("text")
        .data(sankeyLayout.nodes)
        .enter()
        .append("text")
        .attr("font-size", "10px")
        .attr("x", (d) => (d.layer === 3 ? d.x0 - 6 : d.x1 + 6))
        .attr("y", (d) => (d.y0 + d.y1) / 2)
        .attr("dy", "0.35em")
        .attr("text-anchor", (d) => (d.layer === 3 ? "end" : "start"))
        .text((d) => d.name);
    },
    [svgRef, nodeWidthPx, nodePaddingPx, setHoveredSankey, setHoveredSankeyLink]
  );

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
        style={{ width: "100%", height: "100%", display: "block" }}
      />
    </div>
  );
}

export default SankeyFourColumns;