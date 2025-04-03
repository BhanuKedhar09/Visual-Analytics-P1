// SankeyFourColumns.js
import React, {
  useRef,
  useEffect,
  useContext,
  useState,
  useCallback,
} from "react";
import * as d3 from "d3";
import { sankey, sankeyLinkHorizontal } from "d3-sankey";
import { DataContext } from "./DataLoader";
import { InteractionContext } from "./InteractionContext";
import { enableCopyAndDrag } from "./dragDropHelper";
import { createDropHandler } from "./dropHandler";

function SankeyFourColumns({
  minFlow = 1, // skip flows with frequency < minFlow
  maxMerchants = 20, // group smaller merchants into "Other"
  nodeWidthPx = 30,
  nodePaddingPx = 20,
  id = "",
  className = "",
}) {
  const { data } = useContext(DataContext);
  const {
    hoveredSankey,
    hoveredCity,
    setHoveredSankey,
    selectedSankeyNodes,
    setSelectedSankeyNodes,
    setHoveredSankeyLink,
    highlightedState,
    setHighlightedState,
    highlightedCity,
    setHighlightedCity,
    timeHighlightedState,
    setTimeHighlightedState,
    timeHighlightedCity,
    setTimeHighlightedCity,
    sankeyHighlightedState,
    setSankeyHighlightedState,
    sankeyHighlightedCity,
    setSankeyHighlightedCity,
    cityToDaysGlobal,
    dayToStates,
    dayToCities,
    hoveredDay
  } = useContext(InteractionContext);

  const containerRef = useRef(null);
  const svgRef = useRef(null);
  const nodesRef = useRef(null); // for later coloring
  const linkSelectionRef = useRef(null);
  const sankeyLayoutRef = useRef(null);
  const dropContext = {
    setHighlightedState,
    setHighlightedCity,
    setTimeHighlightedState,
    setTimeHighlightedCity,
  };

  // Dimensions
  const [width, setWidth] = useState(800);
  const [height, setHeight] = useState(560);
  const [highlightedNodes, setHighlightedNodes] = useState(new Set());
  const [highlightedLinks, setHighlightedLinks] = useState(new Set());

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

  // 1) Process Data and Compute Relationships
  const renderSankey = useCallback(() => {
    if (!data || data.length === 0) return;
    if (width < 300 || height < 300) return;

    // Filter out incomplete rows.
    const filtered = data.filter(
      (d) =>
        d.state_id?.trim() &&
        d.Location?.trim() &&
        d.CustomerOccupation?.trim() &&
        d.MerchantID?.trim()
    );
    if (filtered.length === 0) {
      console.warn("No valid rows after filtering.");
      return;
    }

    // Parse and aggregate frequencies.
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

    // Group smaller merchants into "Other"
    const merchEntries = Array.from(merchantTotals.entries());
    merchEntries.sort((a, b) => d3.descending(a[1], b[1]));
    const topMerchants = merchEntries.slice(0, maxMerchants).map((d) => d[0]);
    const otherMerchants = merchEntries.slice(maxMerchants).map((d) => d[0]);
    if (otherMerchants.length > 0) {
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

    // Compute link frequencies between adjacent layers.
    const scLinkFreq = new Map();
    const coLinkFreq = new Map();
    const omLinkFreq = new Map();
    for (const [key, freq] of quadFreq.entries()) {
      if (freq < minFlow) continue;
      const [st, ct, oc, me] = key.split("||");
      scLinkFreq.set(
        `${st}||${ct}`,
        (scLinkFreq.get(`${st}||${ct}`) || 0) + freq
      );
      coLinkFreq.set(
        `${ct}||${oc}`,
        (coLinkFreq.get(`${ct}||${oc}`) || 0) + freq
      );
      omLinkFreq.set(
        `${oc}||${me}`,
        (omLinkFreq.get(`${oc}||${me}`) || 0) + freq
      );
    }

    // Build node sets from the computed link frequencies.
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

    // Sort nodes.
    const states = Array.from(stateSet).sort((a, b) => {
      const ta = stateTotals.get(a) || 0;
      const tb = stateTotals.get(b) || 0;
      return d3.descending(ta, tb);
    });
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
    const occupations = Array.from(occupSet).sort((a, b) => {
      const ta = occupTotals.get(a) || 0;
      const tb = occupTotals.get(b) || 0;
      return d3.descending(ta, tb);
    });
    const merchants = Array.from(merchSet).sort((a, b) => {
      const ta = merchantTotals.get(a) || 0;
      const tb = merchantTotals.get(b) || 0;
      return d3.descending(ta, tb);
    });

    // Build final node array with layers (using composite keys for uniqueness).
    const nodes = [];
    const nodeIndexMap = new Map();
    states.forEach((st) => {
      const idx = nodes.length;
      nodes.push({ name: st, layer: 0 });
      nodeIndexMap.set(`0||${st}`, idx);
    });
    cities.forEach((ct) => {
      const idx = nodes.length;
      nodes.push({ name: ct, layer: 1 });
      nodeIndexMap.set(`1||${ct}`, idx);
    });
    occupations.forEach((oc) => {
      const idx = nodes.length;
      nodes.push({ name: oc, layer: 2 });
      nodeIndexMap.set(`2||${oc}`, idx);
    });
    merchants.forEach((me) => {
      const idx = nodes.length;
      nodes.push({ name: me, layer: 3 });
      nodeIndexMap.set(`3||${me}`, idx);
    });

    // Build sankey links.
    const sankeyLinks = [];
    for (const [key, freq] of scLinkFreq.entries()) {
      const [st, ct] = key.split("||");
      const sIdx = nodeIndexMap.get(`0||${st}`);
      const cIdx = nodeIndexMap.get(`1||${ct}`);
      if (sIdx !== undefined && cIdx !== undefined) {
        sankeyLinks.push({ source: sIdx, target: cIdx, value: freq });
      }
    }
    for (const [key, freq] of coLinkFreq.entries()) {
      const [ct, oc] = key.split("||");
      const cIdx = nodeIndexMap.get(`1||${ct}`);
      const oIdx = nodeIndexMap.get(`2||${oc}`);
      if (cIdx !== undefined && oIdx !== undefined) {
        sankeyLinks.push({ source: cIdx, target: oIdx, value: freq });
      }
    }
    for (const [key, freq] of omLinkFreq.entries()) {
      const [oc, me] = key.split("||");
      const oIdx = nodeIndexMap.get(`2||${oc}`);
      const mIdx = nodeIndexMap.get(`3||${me}`);
      if (oIdx !== undefined && mIdx !== undefined) {
        sankeyLinks.push({ source: oIdx, target: mIdx, value: freq });
      }
    }
    if (sankeyLinks.length === 0) {
      console.warn("No links remain after building sankeyLinks.");
      return;
    }

    drawSankey(nodes, sankeyLinks, width, height);
  }, [data, width, height, minFlow, maxMerchants, nodeWidthPx, nodePaddingPx]);

  // 2) Draw the Sankey
  const drawSankey = useCallback(
    (nodeArray, linkArray, w, h) => {
      if (!svgRef.current) return;
      const svg = d3.select(svgRef.current);
      svg.selectAll("*").remove();

      const sankeyGenerator = sankey()
        .nodeWidth(nodeWidthPx)
        .nodePadding(nodePaddingPx)
        .nodeAlign((node) => node.layer)
        .extent([
          [0, 0],
          [w, h],
        ]);

      const sankeyData = {
        nodes: nodeArray.map((d) => ({ ...d })),
        links: linkArray.map((d) => ({ ...d })),
      };
      let sankeyLayout;
      try {
        sankeyLayout = sankeyGenerator(sankeyData);
      } catch (err) {
        console.error("Sankey layout error:", err);
        return;
      }
      sankeyLayoutRef.current = sankeyLayout;
      // 1) Draw links
      const linkGroup = svg.append("g");
      linkSelectionRef.current = linkGroup
        .selectAll("path")
        .data(sankeyLayout.links)
        .enter()
        .append("path")
        .attr("fill", "none")
        .attr("stroke", "#999")
        .attr("stroke-opacity", 0.6)
        .attr("stroke-width", (d) => d.width)
        .attr("d", sankeyLinkHorizontal())
        .on("mouseover", (evt, d) => {
          d3.select(evt.currentTarget)
            .attr("stroke", "red")
            .attr("stroke-opacity", 1);
          setHoveredSankeyLink(d);
          
          // Stop any timer that might be removing highlights
          if (window.linkHighlightTimer) {
            clearTimeout(window.linkHighlightTimer);
            window.linkHighlightTimer = null;
          }
        })
        .on("mouseout", (evt, d) => {
          // Add a delay before removing the highlight
          window.linkHighlightTimer = setTimeout(() => {
            d3.select(evt.currentTarget)
              .attr("stroke", "#999")
              .attr("stroke-opacity", 0.6);
            setHoveredSankeyLink(null);
            setHoveredSankey(null);
          }, 100); // 100ms delay helps avoid flickering
        });

      // 2) Draw nodes
      const nodeGroup = svg.append("g");
      const nodeSel = nodeGroup
        .selectAll("rect")
        .data(sankeyLayout.nodes)
        .enter()
        .append("rect")
        .attr("id", (d) => {
          // Create more specific IDs to help with debugging
          const layerType = d.layer === 0 ? "state" : 
                          d.layer === 1 ? "city" : 
                          d.layer === 2 ? "occupation" : "merchant";
          return `sankey-node-${layerType}-${d.name.replace(/\s+/g, '-')}`;
        })
        .attr("class", (d) => {
          const layerType = d.layer === 0 ? "state-node" : 
                          d.layer === 1 ? "city-node" : 
                          d.layer === 2 ? "occupation-node" : "merchant-node";
          return `sankey-node ${layerType}`;
        })
        .attr("data-layer", d => d.layer)
        .attr("data-name", d => d.name)
        .attr("x", (d) => d.x0)
        .attr("y", (d) => d.y0)
        .attr("width", (d) => d.x1 - d.x0)
        .attr("height", (d) => d.y1 - d.y0)
        .attr("stroke", "#fff")
        .attr("stroke-width", 1)
        .attr("fill", (d) => defaultColorByLayer(d.layer))
        .on("mouseover", (evt, d) => {
          /* The code is a JavaScript snippet that checks if the `sankeyLayoutRef.current` is falsy
          (null, undefined, 0, false, etc.), and if so, it immediately returns from the current
          function or block of code. */
          if (!sankeyLayoutRef.current) return;
          
          // Initialize empty arrays to collect connected elements
          let connectedCities = [];
          let connectedDays = new Set(); // Re-add this to store matching dates
          
          if (d.layer === 0) {
            // For a state node, gather connected city names from sankey links.
            const links = sankeyLayoutRef.current.links;
            console.log("SANKEY LINKS:", links);
            links.forEach((link) => {
              if (link.source.index === d.index && link.target.layer === 1) {
                connectedCities.push(link.target.name);
              }
              if (link.target.index === d.index && link.source.layer === 1) {
                connectedCities.push(link.source.name);
              }
            });
            connectedCities = Array.from(new Set(connectedCities));
            
            // Find days related to this state using dayToStates
            if (dayToStates && Object.keys(dayToStates).length > 0) {
              console.log(`Finding days for state: ${d.name}`);
              console.log(`DEBUG - dayToStates structure:`, dayToStates);
              console.log(`DEBUG - dayToStates keys count:`, Object.keys(dayToStates).length);
              console.log(`DEBUG - Sample dayToStates entries:`, 
                Object.entries(dayToStates).slice(0, 3).map(([dayNum, stateSet]) => ({
                  dayNum,
                  date: new Date(+dayNum),
                  statesCount: stateSet.size,
                  sampleStates: Array.from(stateSet).slice(0, 5)
                }))
              );
              
              let matchingDaysCount = 0;
              // Iterate through all day numbers in dayToStates
              Object.entries(dayToStates).forEach(([dayNum, states]) => {
                // Check if this day has transactions from our state
                if (states && states.has(d.name)) {
                  matchingDaysCount++;
                  // Convert the day number to a formatted date string
                  const date = new Date(+dayNum);
                  const dateStr = d3.timeFormat("%Y-%m-%d")(date);
                  connectedDays.add(dateStr);
                  
                  // Debug format - log a sample of formatted dates
                  if (connectedDays.size <= 5) {
                    console.log(`SANKEY DATE FORMAT: dayNum=${dayNum}, date=${date}, formatted=${dateStr}`);
                    
                    // Also log what the corresponding time bar ID would be
                    const expectedTimeBarId = `time-bar-${dateStr}`;
                    console.log(`EXPECTED TIME BAR ID: ${expectedTimeBarId}`);
                  }
                }
              });
              
              console.log(`Found ${connectedDays.size}/${matchingDaysCount} days for state ${d.name}`);
            } else {
              console.log("ERROR: dayToStates is empty or undefined!", dayToStates);
            }
            
            // Convert set to array for the hoveredSankey object - FIX: Added for state nodes
            const daysArray = Array.from(connectedDays);
            
            // Set the hoveredSankey with node info, connected cities and connected days - FIX: Added for state nodes
            const hoveredSankeyObj = {
              layer: d.layer,
              name: d.name,
              index: d.index,
              connectedCities,
              connectedDays: daysArray
            };
            
            setHoveredSankey(hoveredSankeyObj);
            
          } else if (d.layer === 1) {
            // For city nodes, just use the name directly
            connectedCities = [d.name];
            
            // FIX: Set highlightedCity to highlight this city on the map
            setHighlightedCity(d.name);
            
            // Find days related to this city using dayToCities
            if (dayToCities && Object.keys(dayToCities).length > 0) {
              // Iterate through all day numbers in dayToCities
              Object.entries(dayToCities).forEach(([dayNum, cities]) => {
                // Check if this day has transactions from our city
                if (cities && cities.has(d.name)) {
                  // Convert the day number to a formatted date string
                  const date = new Date(+dayNum);
                  const dateStr = d3.timeFormat("%Y-%m-%d")(date);
                  connectedDays.add(dateStr);
                }
              });
            }
            
            // Convert set to array for the hoveredSankey object
            const daysArray = Array.from(connectedDays);
            
            // Set the hoveredSankey with node info, connected cities and connected days
            const hoveredSankeyObj = {
              layer: d.layer,
              name: d.name,
              index: d.index,
              connectedCities,
              connectedDays: daysArray
            };
            
            setHoveredSankey(hoveredSankeyObj);
          }
          
          // Stop any timer that might be removing highlights from links
          if (window.nodeHighlightTimer) {
            clearTimeout(window.nodeHighlightTimer);
            window.nodeHighlightTimer = null;
          }
          
          // Now highlight sankey links...
          linkGroup
            .selectAll("path")
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
        })
        .on("mouseout", (evt, d) => {
          // Add a delay before removing the highlight
          window.nodeHighlightTimer = setTimeout(() => {
            setHoveredSankey(null);
            
            // FIX: Clear the highlighted city on mouseout
            if (d.layer === 1) {
              setHighlightedCity(null);
            }
            
            linkGroup
              .selectAll("path")
              .attr("stroke", "#999")
              .attr("stroke-opacity", 0.4);
          }, 100); // 100ms delay helps avoid flickering
        })
        .on("click", (evt, d) => {
          evt.stopPropagation();
          const nodeKey = `${d.layer}||${d.name}`;
          setSelectedSankeyNodes((prev) => {
            const newSet = new Set(prev);
            if (newSet.has(nodeKey)) newSet.delete(nodeKey);
            else newSet.add(nodeKey);
            return newSet;
          });
        });

      nodeSel.each(function (d) {
        // e.g. if d.layer===0 => "state", layer===1 => "city", etc.
        d.type = "sankeyNode";
      });

      // NEW: Attach drag-drop functionality

      const handleNodeDrop = (nodeData, containerBox, dropZone) => {
        if (!dropZone) {
          // Reset the highlights so that if the user drags outside any valid zone,
          // the highlight variables are cleared.
          setHighlightedState(null);
          setHighlightedCity(null);
          setTimeHighlightedState(null);
          setTimeHighlightedCity(null);

          return;
        } // Not dropped over any target

        // Example logic: check the id of the drop zone
        if (dropZone.id === "geo-map") {
          // If a state node (layer 0), highlight all circles for that state.
          setTimeHighlightedState(null);
          setTimeHighlightedCity(null);
          if (nodeData.layer === 0) {
            // For instance: call your context setter or a function to highlight state circles.
            setHighlightedState(nodeData.name);
          }
          // If a city node (layer 1), highlight just that city circle.
          else if (nodeData.layer === 1) {
            setHighlightedCity(nodeData.name);
            setSankeyHighlightedCity(nodeData.name);
            // highlightCityOnMap(nodeData.name);
          }
        } else if (dropZone.id === "time-graph") {
          setHighlightedState(null);
          setHighlightedCity(null);
          if (nodeData.layer === 0) {
            setTimeHighlightedState(nodeData.name);
          } else if (nodeData.layer === 1) {
            setTimeHighlightedCity(nodeData.name);
          }
        }
      };
      const handleDrop = createDropHandler({
        setHighlightedState,
        setHighlightedCity,
        setTimeHighlightedState,
        setTimeHighlightedCity,
        sankeyHighlightedState,
        setSankeyHighlightedState,
        sankeyHighlightedCity,
        setSankeyHighlightedCity,
        cityToDaysGlobal,
      });
      // enableCopyAndDrag(nodeSel, handleNodeDrop);
      enableCopyAndDrag(nodeSel, handleDrop);

      nodesRef.current = nodeSel;

      // 3) Draw labels
      nodeGroup
        .selectAll("text")
        .data(sankeyLayout.nodes)
        .enter()
        .append("text")
        .attr("font-size", 10)
        .attr("x", (d) => (d.layer === 3 ? d.x0 - 6 : d.x1 + 6))
        .attr("y", (d) => (d.y0 + d.y1) / 2)
        .attr("dy", "0.35em")
        .attr("text-anchor", (d) => (d.layer === 3 ? "end" : "start"))
        .text((d) => d.name);
    },
    [
      svgRef,
      nodeWidthPx,
      nodePaddingPx,
      setHoveredSankey,
      setHoveredSankeyLink,
      setSelectedSankeyNodes,
      setHighlightedState,
      setHighlightedCity,
      setTimeHighlightedState,
      setTimeHighlightedCity,
      sankeyHighlightedState,
      setSankeyHighlightedState,
      sankeyHighlightedCity,
      setSankeyHighlightedCity,
    ]
  );

  // Recompute sankey whenever data changes.
  useEffect(() => {
    renderSankey();
  }, [renderSankey]);

  // 3) Color nodes (like in GeographicHeatmap)
  useEffect(() => {
    if (!nodesRef.current) return;
    
    // Debug info
    console.log("Sankey highlighting update:", {
      sankeyHighlightedCity,
      sankeyHighlightedState,
      nodeCount: nodesRef.current.size()
    });
    
    // CRITICAL FIX: First reset all nodes to their default colors
    // This prevents any state bleeding where previously highlighted nodes remain highlighted
    nodesRef.current.attr("fill", d => defaultColorByLayer(d.layer));
    
    // Now apply specific highlights to the relevant nodes
    nodesRef.current.filter(d => {
      return (d.layer === 0 && d.name === sankeyHighlightedState) || 
             (d.layer === 1 && d.name === sankeyHighlightedCity) ||
             (highlightedState && d.layer === 0 && d.name === highlightedState) ||
             (highlightedCity && d.layer === 1 && d.name === highlightedCity) ||
             (hoveredSankey && hoveredSankey.layer === d.layer && hoveredSankey.name === d.name) ||
             selectedSankeyNodes.has(`${d.layer}||${d.name}`);
    }).attr("fill", d => {
      const nodeKey = `${d.layer}||${d.name}`;
      
      // Apply highlight from external context (sankeyHighlightedState/City)
      if (d.layer === 0 && d.name === sankeyHighlightedState) {
        console.log(`Highlighting state node: ${d.name}`);
        return "red";
      }
      if (d.layer === 1 && d.name === sankeyHighlightedCity) {
        console.log(`Highlighting city node: ${d.name}`);
        return "red";
      }
      
      // Highlight if this node matches the drop-set map highlight
      if (highlightedState && d.layer === 0 && d.name === highlightedState) {
        return "red";
      }
      if (highlightedCity && d.layer === 1 && d.name === highlightedCity) {
        return "red";
      }

      // Apply hover/selection highlighting
      if (
        hoveredSankey &&
        hoveredSankey.layer === d.layer &&
        hoveredSankey.name === d.name
      ) {
        return "red";
      }
      if (selectedSankeyNodes.has(nodeKey)) {
        return "blue";
      }
      
      // If we're here, just use the default color (though this shouldn't happen due to the filter)
      return defaultColorByLayer(d.layer);
    });
  }, [
    hoveredSankey,
    selectedSankeyNodes,
    sankeyHighlightedState,
    sankeyHighlightedCity,
    highlightedState,
    highlightedCity,
    setHighlightedState,
    setHighlightedCity,
    setTimeHighlightedState,
    setTimeHighlightedCity,
    hoveredDay,
    timeHighlightedState,
    timeHighlightedCity
  ]);

  useEffect(() => {
    if (!sankeyLayoutRef.current) return;

    // If neither city nor state is highlighted, clear everything
    if (!sankeyHighlightedCity && !sankeyHighlightedState && !hoveredDay) {
      setHighlightedLinks(new Set());
      setHighlightedNodes(new Set());
      return;
    }

    console.log("Sankey link highlight calculation:", {
      sankeyHighlightedCity,
      sankeyHighlightedState,
      hoveredDay: hoveredDay ? d3.timeFormat("%Y-%m-%d")(hoveredDay) : null,
      hasLinks: sankeyLayoutRef.current?.links?.length > 0
    });

    const { nodes, links } = sankeyLayoutRef.current;
    const connectedLinkIndices = new Set();
    const connectedNodeIndices = new Set();

    // Find the relevant nodes
    const cityNode =
      sankeyHighlightedCity &&
      nodes.find((n) => n.layer === 1 && n.name === sankeyHighlightedCity);
    const stateNode =
      sankeyHighlightedState &&
      nodes.find((n) => n.layer === 0 && n.name === sankeyHighlightedState);
    
    // CASE 1: Handle highlighted city
    if (cityNode) {
      console.log(`Found city node: ${cityNode.name}, index: ${cityNode.index}`);
      
      // Add the city node itself to highlighted nodes
      connectedNodeIndices.add(cityNode.index);
      
      // For city nodes, we need to find:
      // 1. Links between this city and occupations (one step ahead)
      // 2. Link connecting this city to its state (one step back)
      
      links.forEach((link, i) => {
        // Find links where this city is source (city → occupation)
        if (link.source.index === cityNode.index) {
          connectedLinkIndices.add(i);
          connectedNodeIndices.add(link.target.index); // The occupation node
          console.log(`Found forward link ${i}: ${cityNode.name} → ${link.target.name}`);
        }
        
        // Find link where this city is target (state → city)
        if (link.target.index === cityNode.index) {
          connectedLinkIndices.add(i);
          connectedNodeIndices.add(link.source.index); // The state node
          console.log(`Found backward link ${i}: ${link.source.name} → ${cityNode.name}`);
        }
      });
    }
    
    // CASE 2: Handle highlighted state
    else if (stateNode) {
      // ONLY state is highlighted => highlight all links connected to that state
      console.log(`Found state node: ${stateNode.name}, index: ${stateNode.index}`);
      
      // Add the state node itself to highlighted nodes
      connectedNodeIndices.add(stateNode.index);
      
      links.forEach((link, i) => {
        if (link.source.index === stateNode.index) {
          connectedLinkIndices.add(i);
          connectedNodeIndices.add(link.target.index);
          console.log(`Found link ${i}: ${stateNode.name} → ${link.target.name}`);
        }
      });
    } 
    
    // CASE 3: Handle day hover from timegraph - highlight all cities and states for that day
    else if (hoveredDay) {
      const dayNum = +d3.timeDay(hoveredDay);
      console.log(`Highlighting nodes for day: ${d3.timeFormat("%Y-%m-%d")(hoveredDay)}`);
      
      // First find cities for this day and highlight them
      const citiesForDay = dayToCities[dayNum] ? Array.from(dayToCities[dayNum]) : [];
      console.log(`Found ${citiesForDay.length} cities for this day`);
      
      citiesForDay.forEach(city => {
        const cityNodeToHighlight = nodes.find(n => n.layer === 1 && n.name === city);
        if (cityNodeToHighlight) {
          console.log(`Found city node to highlight: ${city}`);
          connectedNodeIndices.add(cityNodeToHighlight.index);
          
          // Also highlight links from this city
          links.forEach((link, i) => {
            if (link.source.index === cityNodeToHighlight.index) {
              connectedLinkIndices.add(i);
              connectedNodeIndices.add(link.target.index);
            }
            if (link.target.index === cityNodeToHighlight.index) {
              connectedLinkIndices.add(i);
              connectedNodeIndices.add(link.source.index);
            }
          });
        }
      });
      
      // Then find states for this day and highlight them
      const statesForDay = dayToStates[dayNum] ? Array.from(dayToStates[dayNum]) : [];
      console.log(`Found ${statesForDay.length} states for this day`);
      
      statesForDay.forEach(state => {
        const stateNodeToHighlight = nodes.find(n => n.layer === 0 && n.name === state);
        if (stateNodeToHighlight) {
          console.log(`Found state node to highlight: ${state}`);
          connectedNodeIndices.add(stateNodeToHighlight.index);
          
          // Also highlight links from this state
          links.forEach((link, i) => {
            if (link.source.index === stateNodeToHighlight.index) {
              connectedLinkIndices.add(i);
              connectedNodeIndices.add(link.target.index);
            }
          });
        }
      });
    }

    console.log(`Highlighting ${connectedLinkIndices.size} links and ${connectedNodeIndices.size} nodes`);

    // Save in state => a later useEffect or direct .attr() call updates the visuals
    setHighlightedLinks(connectedLinkIndices);
    setHighlightedNodes(connectedNodeIndices);
  }, [sankeyHighlightedCity, sankeyHighlightedState, hoveredDay, dayToCities, dayToStates]);

  // then you likely have another useEffect that updates the link styling:
  useEffect(() => {
    if (linkSelectionRef.current) {
      linkSelectionRef.current
        .attr("stroke", (d, i) => (highlightedLinks.has(i) ? "red" : "#999"))
        .attr("stroke-opacity", (d, i) => (highlightedLinks.has(i) ? 1 : 0.6));
    }
    
    // Also highlight the nodes that are connected
    if (nodesRef.current) {
      nodesRef.current
        .attr("stroke", (d, i) => highlightedNodes.has(i) ? "red" : "#fff")
        .attr("stroke-width", (d, i) => highlightedNodes.has(i) ? 2 : 1);
    }
  }, [highlightedLinks, highlightedNodes]);

  // At the start of your rendering (after the useEffects), add this debugging code:
  // Debug values being received for highlighting
  useEffect(() => {
    console.log("SankeyFourColumns received highlight values:", {
      sankeyHighlightedCity,
      sankeyHighlightedState,
      hoveredSankey
    });
  }, [sankeyHighlightedCity, sankeyHighlightedState, hoveredSankey]);

  return (
    <div
      ref={containerRef}
      id={id}
      className={className}
      style={{ width: "100%", height: "100%", position: "relative" }}
    >
      <svg
        ref={svgRef}
        style={{ width: "100%", height: "100%", display: "block" }}
      />
    </div>
  );
}

function defaultColorByLayer(layer) {
  if (layer === 0) return "#4E79A7"; // states - blue
  if (layer === 1) return "#F28E2B"; // cities - orange
  if (layer === 2) return "#59A14F"; // occupations - green
  return "#E15759"; // merchants - red
}

// Add this debugging/fix function at the bottom of the file
export function debugSankeyNodes() {
  const nodes = document.querySelectorAll("[id^='sankey-node-']");
  console.log(`Found ${nodes.length} sankey nodes:`);
  nodes.forEach(node => {
    console.log(node.id, node.getAttribute("fill"));
  });
}

export default SankeyFourColumns;
