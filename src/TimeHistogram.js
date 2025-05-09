// TimeHistogram.js
import React, { useRef, useEffect, useContext, useState } from "react";
import * as d3 from "d3";
import { DataContext } from "./DataLoader";
import { InteractionContext } from "./InteractionContext";
import { enableCopyAndDrag } from "./dragDropHelper";

function TimeHistogram({
  id = "",
  className = "",
  width = 1000,
  height = 300,
}) {
  const svgRef = useRef(null);
  const barsRef = useRef(null);
  const zoomRef = useRef(null);
  // Final processed data for the stacked chart
  const [histData, setHistData] = useState([]);

  // Local state for day mappings
  const [localDayToStates, setLocalDayToStates] = useState({});
  const [localDayToCities, setLocalDayToCities] = useState({});
  const [localDayToOccupations, setLocalDayToOccupations] = useState({});
  const [localDayToMerchants, setLocalDayToMerchants] = useState({});

  const { data } = useContext(DataContext);

  // From InteractionContext
  const {
    hoveredDay,
    setHoveredDay,
    selectedDays,
    setSelectedDays,
    hoveredCity,
    hoveredSankey,
    selectedCities,
    selectedSankeyNodes,
    highlightedState,
    highlightedCity,
    timeHighlightedState,
    timeHighlightedCity,
    setTimeHighlightedCity,
    sankeyHighlightedState,
    setSankeyHighlightedState,
    sankeyHighlightedCity,
    setSankeyHighlightedCity,
    dayToCities,
    dayToStates,
    // Setters for context day maps
    setDayToStates,
    setDayToCities,
    setDayToOccupations,
    setDayToMerchants,
    setCityToDays,
    setCityToDaysGlobal,
    timeHighlightedCities,
    setTimeHighlightedCities,
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
    // These mappings are critical for cross-view linking
    const dts = {};
    const dtc = {};
    const dto = {};
    const dtm = {};

    processed.forEach((d) => {
      const dayNum = +d3.timeDay(d.TransactionDate);

      // Important: These mappings must be created with proper types
      // Each day maps to a Set of values for proper lookup

      if (!dts[dayNum]) dts[dayNum] = new Set();
      if (d.state_id) {
        dts[dayNum].add(d.state_id.trim());
      }

      if (!dtc[dayNum]) dtc[dayNum] = new Set();
      if (d.Location) {
        dtc[dayNum].add(d.Location.trim());
      }

      if (!dto[dayNum]) dto[dayNum] = new Set();
      if (d.CustomerOccupation) {
        dto[dayNum].add(d.CustomerOccupation.trim());
      }

      if (!dtm[dayNum]) dtm[dayNum] = new Set();
      if (d.MerchantID) {
        dtm[dayNum].add(d.MerchantID.trim());
      }
    });

    // Debug the mappings
    // console.log("Day to Cities mapping:", {
    //   totalDays: Object.keys(dtc).length,
    //   sampleDay: Object.entries(dtc)[0],
    //   allDays: Object.keys(dtc).slice(0, 5),
    // });

    // console.log("Day to States mapping:", {
    //   totalDays: Object.keys(dts).length,
    //   sampleDay: Object.entries(dts)[0],
    //   allDays: Object.keys(dts).slice(0, 5),
    // });

    // Now let's reverse it to get cityToDays
    const ctd = {};
    for (const [dayNum, cities] of Object.entries(dtc)) {
      for (const city of cities) {
        if (!ctd[city]) ctd[city] = new Set();
        ctd[city].add(+dayNum);
      }
    }

    // Save locally and update the context
    setLocalDayToStates(dts);
    setLocalDayToCities(dtc);
    setLocalDayToOccupations(dto);
    setLocalDayToMerchants(dtm);

    // Update the context for cross-component access
    if (typeof setDayToStates === "function") {
      setDayToStates(dts);
    }

    if (typeof setDayToCities === "function") {
      setDayToCities(dtc);
    }

    if (typeof setDayToOccupations === "function") {
      setDayToOccupations(dto);
    }

    if (typeof setDayToMerchants === "function") {
      setDayToMerchants(dtm);
    }

    // Set cityToDays in context too
    if (typeof setCityToDays === "function") {
      setCityToDays(ctd);
      // console.log("CRITICAL DEBUG - TimeHistogram setting cityToDays:", ctd);
      // console.log(
      //   "CRITICAL DEBUG - Sample city entries:",
      //   Object.entries(ctd)
      //     .slice(0, 3)
      //     .map(([city, daySet]) => {
      //       return {
      //         city,
      //         days: Array.from(daySet).slice(0, 5),
      //         dayCount: daySet.size,
      //         type: typeof daySet,
      //         isSet: daySet instanceof Set,
      //       };
      //     })
      // );
    }

    if (typeof setCityToDaysGlobal === "function") {
      setCityToDaysGlobal(ctd);
      // console.log(
      //   "CRITICAL DEBUG - TimeHistogram setting cityToDaysGlobal:",
      //   ctd
      // );
    }

    // Draw the stacked bars
    drawHistogram(hist);
  }, [
    data,
    setDayToStates,
    setDayToCities,
    setDayToOccupations,
    setDayToMerchants,
    setCityToDays,
    setCityToDaysGlobal,
  ]);

  useEffect(() => {
    if (!barsRef.current || !histData.length) return;

    const hoveredDayNum = hoveredDay ? +d3.timeDay(hoveredDay) : null;
    let hoveredSankeyLayer = null;
    let hoveredSankeyName = null;
    if (hoveredSankey) {
      hoveredSankeyLayer = hoveredSankey.layer;
      hoveredSankeyName = hoveredSankey.name;
    }

    barsRef.current
      .attr("fill", (d) => {
        const defColor = d.key === "Credit" ? "#4E79A7" : "#F28E2B";
        const dayNum = +d3.timeDay(histData[d.index].date);
        // Ephemeral (hover) conditions
        if (hoveredDayNum === dayNum) return "red";
        if (
          timeHighlightedState &&
          localDayToStates[dayNum]?.has(timeHighlightedState)
        )
          return "red";
        if (
          timeHighlightedCity &&
          localDayToCities[dayNum]?.has(timeHighlightedCity)
        )
          return "red";
        if (hoveredCity && localDayToCities[dayNum]?.has(hoveredCity))
          return "red";
        if (hoveredSankeyLayer !== null && hoveredSankeyName) {
          if (
            hoveredSankeyLayer === 0 &&
            localDayToStates[dayNum]?.has(hoveredSankeyName)
          )
            return "red";
          if (
            hoveredSankeyLayer === 1 &&
            localDayToCities[dayNum]?.has(hoveredSankeyName)
          )
            return "red";
          if (
            hoveredSankeyLayer === 2 &&
            localDayToOccupations[dayNum]?.has(hoveredSankeyName)
          )
            return "red";
          if (
            hoveredSankeyLayer === 3 &&
            localDayToMerchants[dayNum]?.has(hoveredSankeyName)
          )
            return "red";
        }

        // Persistent (selected) conditions
        if (selectedDays.has(dayNum)) return "blue";
        for (const city of selectedCities) {
          if (localDayToCities[dayNum]?.has(city)) return "blue";
        }
        for (const sankeyNodeKey of selectedSankeyNodes) {
          const [layer, name] = sankeyNodeKey.split("||");
          if (layer === "0" && localDayToStates[dayNum]?.has(name))
            return "blue";
          if (layer === "1" && localDayToCities[dayNum]?.has(name))
            return "blue";
          if (layer === "2" && localDayToOccupations[dayNum]?.has(name))
            return "blue";
          if (layer === "3" && localDayToMerchants[dayNum]?.has(name))
            return "blue";
        }
        return defColor;
      })
      .attr("fill-opacity", (d) => {
        const dayNum = +d3.timeDay(histData[d.index].date);
        let isRelevant = false;
        if (hoveredDayNum === dayNum) isRelevant = true;
        if (hoveredCity && localDayToCities[dayNum]?.has(hoveredCity))
          isRelevant = true;
        if (hoveredSankeyLayer !== null && hoveredSankeyName) {
          if (
            hoveredSankeyLayer === 0 &&
            localDayToStates[dayNum]?.has(hoveredSankeyName)
          )
            isRelevant = true;
          if (
            hoveredSankeyLayer === 1 &&
            localDayToCities[dayNum]?.has(hoveredSankeyName)
          )
            isRelevant = true;
          if (
            hoveredSankeyLayer === 2 &&
            localDayToOccupations[dayNum]?.has(hoveredSankeyName)
          )
            isRelevant = true;
          if (
            hoveredSankeyLayer === 3 &&
            localDayToMerchants[dayNum]?.has(hoveredSankeyName)
          )
            isRelevant = true;
        }
        if (selectedDays.has(dayNum)) isRelevant = true;
        for (const city of selectedCities) {
          if (localDayToCities[dayNum]?.has(city)) isRelevant = true;
        }
        for (const sankeyNodeKey of selectedSankeyNodes) {
          const [layer, name] = sankeyNodeKey.split("||");
          if (layer === "0" && localDayToStates[dayNum]?.has(name))
            isRelevant = true;
          if (layer === "1" && localDayToCities[dayNum]?.has(name))
            isRelevant = true;
          if (layer === "2" && localDayToOccupations[dayNum]?.has(name))
            isRelevant = true;
          if (layer === "3" && localDayToMerchants[dayNum]?.has(name))
            isRelevant = true;
        }
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
    localDayToStates,
    localDayToCities,
    localDayToOccupations,
    localDayToMerchants,
    timeHighlightedState,
    timeHighlightedCity,
    sankeyHighlightedState,
    setSankeyHighlightedState,
    sankeyHighlightedCity,
    setSankeyHighlightedCity,
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

    // ... inside your drawHistogram function, where you define rectSel:
    const rectSel = layer
      .selectAll("rect")
      .data((d) => d.map((point, index) => ({ point, index, key: d.key })))
      .enter()
      .append("rect")
      .attr("id", function (d) {
        return "time-bar-" + d3.timeFormat("%Y-%m-%d")(hist[d.index].date);
      })
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
      // Ephemeral day hover => set hoveredDay and update the time-highlighted cities.
      .on("mouseover", (evt, d) => {
        const day = hist[d.index].date;
        const dayNum = +d3.timeDay(day);
        console.log("=== Time Bar Hover Debug ===");
        console.log("Hovered Date:", d3.timeFormat("%Y-%m-%d")(day));
        console.log("Day Number:", dayNum);
        console.log("Transaction Counts:", {
          Credit: hist[d.index].Credit,
          Debit: hist[d.index].Debit
        });
        
        // Log cities for this day
        const citiesForDay = dayToCities[dayNum] ? Array.from(dayToCities[dayNum]) : [];
        console.log("Cities for this day:", citiesForDay);
        
        // Log states for this day
        const statesForDay = dayToStates[dayNum] ? Array.from(dayToStates[dayNum]) : [];
        console.log("States for this day:", statesForDay);
        
        console.log("Setting hoveredDay to:", day);
        setHoveredDay(day);
        
        // Set all cities for this day as time-highlighted
        if (citiesForDay.length > 0) {
          console.log(`Setting timeHighlightedCities to all ${citiesForDay.length} cities for this day`);
          setTimeHighlightedCities(citiesForDay);
        } else {
          setTimeHighlightedCities([]);
        }
        
        // Show tooltip
        d3.select("body")
          .select(".tooltip")
          .html(
            `
            <strong>${d3.timeFormat("%b %d, %Y")(day)}</strong><br/>
            Credit: ${hist[d.index].Credit}<br/>
            Debit: ${hist[d.index].Debit}
            `
          )
          .style("opacity", 1)
          .style("left", (evt.pageX + 10) + "px")
          .style("top", (evt.pageY + 10) + "px");
      })
      .on("mousemove", (evt) => {
        d3.select("body")
          .select(".tooltip")
          .style("left", (evt.pageX + 10) + "px")
          .style("top", (evt.pageY + 10) + "px");
      })
      .on("mouseout", () => {
        console.log("=== Time Bar Mouseout Debug ===");
        console.log("Clearing hoveredDay");
        setHoveredDay(null);
        
        // Clear all highlighting
        console.log("Clearing timeHighlightedCities");
        setTimeHighlightedCities([]);
        
        d3.select("body").select(".tooltip").style("opacity", 0);
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
    rectSel.each(function (d) {
      const dataPoint = hist[d.index];
      const datum = d3.select(this).datum();
      datum.type = "timeBar";
      datum.date = dataPoint.date;
      datum.dateStr = d3.timeFormat("%b %d, %Y")(dataPoint.date);
      datum.day = +d3.timeDay(dataPoint.date);
      datum.Credit = dataPoint.Credit;
      datum.Debit = dataPoint.Debit;
    });
    barsRef.current = rectSel;
    // Ensure tooltip exists
    const tooltip = d3.select("body").select(".tooltip");
    if (tooltip.empty()) {
      d3.select("body").append("div").attr("class", "tooltip");
    }

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
          .attr("x", (dd) => newX(hist[dd.index].date))
          .attr("width", (dd) => computeBarWidth(hist, newX));
        g.select(".x-axis").call(d3.axisBottom(newX).ticks(10));
      });
    zoomRef.current = zoomBehavior;
    svg.call(zoomBehavior);

    // Apply enableCopyAndDrag to the time bars
    enableCopyAndDrag(rectSel);
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

  return (
    <div
      id="time-graph"
      className={className}
      style={{ width, height, position: "relative" }}
    >
      <svg ref={svgRef} style={{ width: "100%", height: "100%" }} />
    </div>
  );
}

export default TimeHistogram;
