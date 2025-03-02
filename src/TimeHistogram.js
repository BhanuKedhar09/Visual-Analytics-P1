// TimeHistogram.js
import React, { useRef, useEffect, useContext, useState } from "react";
import * as d3 from "d3";
import { DataContext } from "./DataLoader";
import { InteractionContext } from "./InteractionContext";

function TimeHistogram({ width = 1000, height = 300 }) {
  const svgRef = useRef(null);
  const barsRef = useRef(null);

  // Final processed data for the stacked chart
  const [histData, setHistData] = useState([]);

  // Mappings for cross-view linking (day → sets of states/cities/occupations/merchants)
  const [dayToStates, setDayToStates] = useState({});
  const [dayToCities, setDayToCities] = useState({});
  const [dayToOccupations, setDayToOccupations] = useState({});
  const [dayToMerchants, setDayToMerchants] = useState({});
  // const [selectedSankeyNodes, setSelectedSankeyNodes] = useState(new Set());
  const { data } = useContext(DataContext);

  // From InteractionContext:
  // hoveredDay => ephemeral day hover
  // selectedDays => persistent day selection
  // hoveredCity, hoveredSankey => cross-view ephemeral signals
  // selectedCities => if you want persistent city selection
  const {
    hoveredDay, setHoveredDay,
    selectedDays, setSelectedDays,
    hoveredCity,
    hoveredSankey,
    selectedCities,
    selectedSankeyNodes
  } = useContext(InteractionContext);

  /***************************************************
   * 1) MOUNT EFFECT: parse data & draw chart once
   ***************************************************/
  useEffect(() => {
    if (!data || data.length === 0) return;

    // Parse transaction dates
    const parseTime = d3.timeParse("%Y-%m-%d %H:%M:%S");
    const processed = data.map((d) => ({
      ...d,
      TransactionDate: parseTime(d.TransactionDate),
    }));
    processed.sort((a, b) => a.TransactionDate - b.TransactionDate);

    // Build day-based histogram
    const dayRoll = d3.rollup(
      processed,
      (txs) => {
        const c = { Credit: 0, Debit: 0 };
        txs.forEach((tx) => {
          if (tx.TransactionType === "Credit") c.Credit++;
          else if (tx.TransactionType === "Debit") c.Debit++;
        });
        return c;
      },
      (d) => d3.timeDay(d.TransactionDate)
    );
    let hist = Array.from(dayRoll, ([date, counts]) => ({ date, ...counts }));
    hist.sort((a, b) => a.date - b.date);

    // Fill missing days
    hist = fillMissingDays(hist);
    function fillMissingDays(arr) {
      const minDate = d3.min(arr, (d) => d.date);
      const maxDate = d3.max(arr, (d) => d.date);
      const out = [];
      let cur = new Date(minDate);
      while (cur <= maxDate) {
        const existing = arr.find((x) => +x.date === +cur);
        if (existing) out.push(existing);
        else out.push({ date: new Date(cur), Credit: 0, Debit: 0 });
        cur.setDate(cur.getDate() + 1);
      }
      return out;
    }
    setHistData(hist);

    // day → states/cities/occupations/merchants
    const dts = {};
    const dtc = {};
    const dto = {};
    const dtm = {};
    processed.forEach((d) => {
      const dayNum = +d3.timeDay(d.TransactionDate);
      if (!dts[dayNum]) dts[dayNum] = new Set();
      dts[dayNum].add(d.state_id);

      if (!dtc[dayNum]) dtc[dayNum] = new Set();
      dtc[dayNum].add(d.Location);

      if (!dto[dayNum]) dto[dayNum] = new Set();
      dto[dayNum].add(d.CustomerOccupation);

      if (!dtm[dayNum]) dtm[dayNum] = new Set();
      dtm[dayNum].add(d.MerchantID);
    });
    setDayToStates(dts);
    setDayToCities(dtc);
    setDayToOccupations(dto);
    setDayToMerchants(dtm);

    // Draw the stacked bars
    drawHistogram(hist);
  }, [data]);

  /*****************************************************
   * 2) UPDATE EFFECT: color bars based on interactions
   *****************************************************/
  useEffect(() => {
    if (!barsRef.current || !histData.length) return;

    // Convert hoveredDay to numeric day for easy comparison
    const hoveredDayNum = hoveredDay ? +d3.timeDay(hoveredDay) : null;

    // If there is a hovered Sankey node, parse it
    let hoveredSankeyLayer = null;
    let hoveredSankeyName = null;
    if (hoveredSankey) {
      hoveredSankeyLayer = hoveredSankey.layer;
      hoveredSankeyName = hoveredSankey.name;
    }

    barsRef.current
      .attr("fill", (d) => {
        // Default color depends on transaction type
        const defColor = d.key === "Credit" ? "#4E79A7" : "#F28E2B";
        const dayNum = +d3.timeDay(histData[d.index].date);

        // 1) Check ephemeral (hover) conditions first => RED
        //    (like your map circles do)
        if (hoveredDayNum === dayNum) {
          // If this day is hovered in the histogram
          return "red";
        }
        if (hoveredCity && dayToCities[dayNum]?.has(hoveredCity)) {
          // If this bar's day has the hovered city from the map
          return "red";
        }
        if (hoveredSankeyLayer !== null && hoveredSankeyName) {
          // If we have a hovered Sankey node, see if this bar's day has that item
          if (
            hoveredSankeyLayer === 0 &&
            dayToStates[dayNum]?.has(hoveredSankeyName)
          ) {
            return "red";
          }
          if (
            hoveredSankeyLayer === 1 &&
            dayToCities[dayNum]?.has(hoveredSankeyName)
          ) {
            return "red";
          }
          if (
            hoveredSankeyLayer === 2 &&
            dayToOccupations[dayNum]?.has(hoveredSankeyName)
          ) {
            return "red";
          }
          if (
            hoveredSankeyLayer === 3 &&
            dayToMerchants[dayNum]?.has(hoveredSankeyName)
          ) {
            return "red";
          }
        }

        // 2) Check persistent (selected) conditions => BLUE
        //    If any apply, color it blue
        if (selectedDays.has(dayNum)) {
          return "blue";
        }
        // If day has any selected city from the map
        for (const city of selectedCities) {
          if (dayToCities[dayNum]?.has(city)) {
            return "blue";
          }
        }
        // If day has any selected Sankey node
        for (const sankeyNodeKey of selectedSankeyNodes) {
          const [layer, name] = sankeyNodeKey.split("||");
          if (layer === "0" && dayToStates[dayNum]?.has(name)) {
            return "blue";
          }
          if (layer === "1" && dayToCities[dayNum]?.has(name)) {
            return "blue";
          }
          if (layer === "2" && dayToOccupations[dayNum]?.has(name)) {
            return "blue";
          }
          if (layer === "3" && dayToMerchants[dayNum]?.has(name)) {
            return "blue";
          }
        }

        // 3) If no ephemeral or persistent condition => default color
        return defColor;
      })
      .attr("fill-opacity", (d) => {
        // Optional: dim bars not relevant to any hover/selection
        // to mimic the map approach of .3 vs .9
        const dayNum = +d3.timeDay(histData[d.index].date);

        // We'll see if it's relevant to any ephemeral or persistent condition
        let isRelevant = false;

        // ephemeral check
        if (hoveredDayNum === dayNum) isRelevant = true;
        if (hoveredCity && dayToCities[dayNum]?.has(hoveredCity))
          isRelevant = true;
        if (hoveredSankeyLayer !== null && hoveredSankeyName) {
          if (
            hoveredSankeyLayer === 0 &&
            dayToStates[dayNum]?.has(hoveredSankeyName)
          )
            isRelevant = true;
          if (
            hoveredSankeyLayer === 1 &&
            dayToCities[dayNum]?.has(hoveredSankeyName)
          )
            isRelevant = true;
          if (
            hoveredSankeyLayer === 2 &&
            dayToOccupations[dayNum]?.has(hoveredSankeyName)
          )
            isRelevant = true;
          if (
            hoveredSankeyLayer === 3 &&
            dayToMerchants[dayNum]?.has(hoveredSankeyName)
          )
            isRelevant = true;
        }

        // persistent check
        if (selectedDays.has(dayNum)) isRelevant = true;
        for (const city of selectedCities) {
          if (dayToCities[dayNum]?.has(city)) isRelevant = true;
        }
        for (const sankeyNodeKey of selectedSankeyNodes) {
          const [layer, name] = sankeyNodeKey.split("||");
          if (layer === "0" && dayToStates[dayNum]?.has(name))
            isRelevant = true;
          if (layer === "1" && dayToCities[dayNum]?.has(name))
            isRelevant = true;
          if (layer === "2" && dayToOccupations[dayNum]?.has(name))
            isRelevant = true;
          if (layer === "3" && dayToMerchants[dayNum]?.has(name))
            isRelevant = true;
        }

        // If relevant => full opacity, else if something is hovered/selected => dim
        if (isRelevant) return 1;
        if (
          hoveredDayNum !== null ||
          hoveredCity ||
          hoveredSankeyLayer !== null ||
          selectedDays.size > 0 ||
          selectedCities.size > 0 ||
          selectedSankeyNodes.size > 0
        ) {
          return 0.3;
        }
        // Otherwise, if nothing is hovered/selected => normal
        return 1;
      });
  }, [
    hoveredDay,
    selectedDays,
    hoveredCity,
    selectedCities,
    hoveredSankey,
    selectedSankeyNodes,
    histData,
    dayToStates,
    dayToCities,
    dayToOccupations,
    dayToMerchants,
  ]);

  function drawHistogram(hist) {
    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const margin = { top: 30, right: 30, bottom: 60, left: 60 };
    const innerW = width - margin.left - margin.right;
    const innerH = height - margin.top - margin.bottom;

    const g = svg
      .attr("width", width)
      .attr("height", height)
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    const xScale = d3
      .scaleTime()
      .domain(d3.extent(hist, (d) => d.date))
      .range([0, innerW]);
    const maxY = d3.max(hist, (d) => d.Credit + d.Debit) || 0;
    const yScale = d3.scaleLinear().domain([0, maxY]).nice().range([innerH, 0]);

    // x-axis
    g.append("g")
      .attr("transform", `translate(0,${innerH})`)
      .attr("class", "x-axis")
      .call(d3.axisBottom(xScale).ticks(10).tickFormat(d3.timeFormat("%b %d")));

    // y-axis
    g.append("g").call(d3.axisLeft(yScale).ticks(6));

    // Build stacked data
    const stackGen = d3.stack().keys(["Credit", "Debit"]);
    const series = stackGen(hist);

    const layer = g
      .selectAll(".layer")
      .data(series)
      .enter()
      .append("g")
      .attr("class", "layer");

    const colorScale = d3
      .scaleOrdinal()
      .domain(["Credit", "Debit"])
      .range(["#4E79A7", "#F28E2B"]);

    const rectSel = layer
      .selectAll("rect")
      .data((d) => d.map((point, index) => ({ point, index, key: d.key })))
      .enter()
      .append("rect")
      .attr(
        "x",
        (d) => xScale(hist[d.index].date) - computeBarWidth(hist, xScale) / 2
      )
      .attr("width", (d) => computeBarWidth(hist, xScale))
      .attr("y", (d) => yScale(d.point[1]))
      .attr("height", (d) => yScale(d.point[0]) - yScale(d.point[1]))
      .attr("fill", (d) => colorScale(d.key))
      .attr("stroke", "#fff")
      .attr("stroke-width", 0.5)
      // ephemeral day hover => set hoveredDay
      .on("mouseover", (evt, d) => {
        const day = hist[d.index].date;
        setHoveredDay(day);
      })
      .on("mouseout", () => {
        setHoveredDay(null);
      })
      // persistent day selection => toggle in selectedDays
      .on("click", (evt, d) => {
        evt.stopPropagation();
        const dayNum = +d3.timeDay(hist[d.index].date);
        setSelectedDays((prev) => {
          const newSet = new Set(prev);
          if (newSet.has(dayNum)) newSet.delete(dayNum);
          else newSet.add(dayNum);
          return newSet;
        });
      });
    barsRef.current = rectSel;

    // Zoom
    const zoomBehavior = d3
      .zoom()
      .scaleExtent([1, 10])
      .translateExtent([
        [0, 0],
        [innerW, innerH],
      ])
      .extent([
        [0, 0],
        [innerW, innerH],
      ])
      .on("zoom", (evt) => {
        const newX = evt.transform.rescaleX(xScale);
        rectSel
          .attr(
            "x",
            (dd) => newX(hist[dd.index].date) - computeBarWidth(hist, newX) / 2
          )
          .attr("width", (dd) => computeBarWidth(hist, newX));
        g.select(".x-axis").call(d3.axisBottom(newX).ticks(10));
      });
    svg.call(zoomBehavior);
  }

  function computeBarWidth(arr, scaleFn) {
    if (arr.length < 2) return 20;
    let totalGap = 0;
    for (let i = 0; i < arr.length - 1; i++) {
      totalGap += scaleFn(arr[i + 1].date) - scaleFn(arr[i].date);
    }
    const avgGap = totalGap / (arr.length - 1);
    return Math.max(3, Math.min(avgGap * 0.8, 20));
  }

  return <svg ref={svgRef} style={{ width: "100%", height: "auto" }} />;
}

export default TimeHistogram;
