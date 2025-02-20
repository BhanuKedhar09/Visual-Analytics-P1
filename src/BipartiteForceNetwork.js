// BipartiteForceNetwork.js
import React, { useRef, useEffect, useContext } from "react";
import * as d3 from "d3";
import { DataContext } from "./DataLoader";

/**
 * A bipartite force-directed layout:
 *  - One node per City
 *  - One node per Merchant
 *  - Link thickness scaled by transaction frequency
 *  - Optional minFreq to filter out low-frequency links
 *  - City nodes forced left, Merchant nodes forced right
 */
function BipartiteForceNetwork({
  width = 600,
  height = 400,
  minFreq = 2 // filter out city-merchant pairs with freq < minFreq
}) {
  const { data } = useContext(DataContext);
  const svgRef = useRef(null);

  useEffect(() => {
    if (!data || data.length === 0) return;

    // 1) Aggregate transactions by (City, Merchant) to get frequency
    //    We'll store city->merchant freq in a map or rollup
    const pairCount = d3.rollup(
      data,
      v => v.length, // number of transactions
      d => d.Location,  // City
      d => d.MerchantID // Merchant
    );

    // 2) Build node sets
    //    We'll have type="city" or type="merchant"
    const citySet = new Set();
    const merchantSet = new Set();

    // Also build links array with a freq property
    const linksArray = [];

    for (const [city, merchantsMap] of pairCount.entries()) {
      citySet.add(city);
      for (const [mer, freq] of merchantsMap.entries()) {
        merchantSet.add(mer);
        if (freq >= minFreq) {
          // Only keep links with freq >= minFreq
          linksArray.push({
            source: city,
            target: mer,
            value: freq
          });
        }
      }
    }

    // Convert sets to arrays
    const cities = Array.from(citySet);
    const merchants = Array.from(merchantSet);

    // 3) Create node objects
    //    group=0 => city, group=1 => merchant
    const cityNodes = cities.map(c => ({
      id: c,
      type: "city",
      group: 0
    }));
    const merchantNodes = merchants.map(m => ({
      id: m,
      type: "merchant",
      group: 1
    }));
    const nodes = [...cityNodes, ...merchantNodes];

    // 4) Setup the SVG
    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    svg
      .attr("viewBox", [-width / 2, -height / 2, width, height])
      .attr("preserveAspectRatio", "xMidYMid meet");

    // 5) Link thickness scale
    //    We'll find the max freq among links
    const maxFreq = d3.max(linksArray, d => d.value) || 1;
    const linkWidthScale = d3.scaleSqrt()
      .domain([1, maxFreq])
      .range([0.5, 4]); // thickness from 0.5 to 4

    // 6) Force simulation
    const simulation = d3.forceSimulation(nodes)
      // Link force: distance can be 50 or so, or dynamic if you like
      .force("link", d3.forceLink(linksArray).id(d => d.id).distance(50))
      .force("charge", d3.forceManyBody().strength(-30))
      // Force city nodes to the left, merchant nodes to the right
      // group=0 => x ~ -width/4, group=1 => x ~ +width/4
      .force("forceX", d3.forceX(d => (d.group === 0 ? -width / 4 : width / 4)).strength(0.2))
      .force("center", d3.forceCenter(0, 0)) // keep overall centered
      .force("collision", d3.forceCollide(10)) // optional, to avoid overlap
      .on("tick", ticked);

    // 7) Draw links
    const linkGroup = svg
      .append("g")
      .attr("stroke", "#999")
      .attr("stroke-opacity", 0.6);

    const linkElements = linkGroup
      .selectAll("line")
      .data(linksArray)
      .enter()
      .append("line")
      .attr("stroke-width", d => linkWidthScale(d.value));

    // 8) Draw nodes (circles)
    const nodeGroup = svg.append("g")
      .attr("stroke", "#fff")
      .attr("stroke-width", 1);

    const nodeElements = nodeGroup
      .selectAll("circle")
      .data(nodes)
      .enter()
      .append("circle")
      .attr("r", 6)
      .attr("fill", d => d.type === "city" ? "#4E79A7" : "#F28E2B")
      .call(drag(simulation));

    // 9) Node labels (optional, can be cluttered)
    //    If it's still too messy, consider removing or showing on hover
    const labelGroup = svg.append("g")
      .attr("font-size", 10)
      .attr("fill", "#333");

    const labels = labelGroup
      .selectAll("text")
      .data(nodes)
      .enter()
      .append("text")
      .text(d => d.id)
      .attr("dx", 8)
      .attr("dy", "0.35em");

    // 10) Tick function
    function ticked() {
      linkElements
        .attr("x1", d => d.source.x)
        .attr("y1", d => d.source.y)
        .attr("x2", d => d.target.x)
        .attr("y2", d => d.target.y);

      nodeElements
        .attr("cx", d => d.x)
        .attr("cy", d => d.y);

      labels
        .attr("x", d => d.x)
        .attr("y", d => d.y);
    }

    // 11) Drag logic
    function drag(sim) {
      function dragstarted(event, d) {
        if (!event.active) sim.alphaTarget(0.3).restart();
        d.fx = d.x;
        d.fy = d.y;
      }
      function dragged(event, d) {
        d.fx = event.x;
        d.fy = event.y;
      }
      function dragended(event, d) {
        if (!event.active) sim.alphaTarget(0);
        d.fx = null;
        d.fy = null;
      }
      return d3.drag()
        .on("start", dragstarted)
        .on("drag", dragged)
        .on("end", dragended);
    }

    // Cleanup
    return () => simulation.stop();
  }, [data, width, height, minFreq]);

  return <svg ref={svgRef} style={{ width: "100%", height: "100%" }} />;
}

export default BipartiteForceNetwork;