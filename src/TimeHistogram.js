// TimeHistogram.js
import React, { useRef, useEffect, useContext, useState } from "react";
import * as d3 from "d3";
import { DataContext } from "./DataLoader";
import { InteractionContext } from "./InteractionContext";

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
      if (!dts[dayNum]) dts[dayNum] = new Set();
      dts[dayNum].add(d.state_full);

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
          dayToStates[dayNum]?.has(timeHighlightedState)
        )
          return "red";
        if (
          timeHighlightedCity &&
          dayToCities[dayNum]?.has(timeHighlightedCity)
        )
          return "red";
        if (hoveredCity && dayToCities[dayNum]?.has(hoveredCity)) return "red";
        if (hoveredSankeyLayer !== null && hoveredSankeyName) {
          if (
            hoveredSankeyLayer === 0 &&
            dayToStates[dayNum]?.has(hoveredSankeyName)
          )
            return "red";
          if (
            hoveredSankeyLayer === 1 &&
            dayToCities[dayNum]?.has(hoveredSankeyName)
          )
            return "red";
          if (
            hoveredSankeyLayer === 2 &&
            dayToOccupations[dayNum]?.has(hoveredSankeyName)
          )
            return "red";
          if (
            hoveredSankeyLayer === 3 &&
            dayToMerchants[dayNum]?.has(hoveredSankeyName)
          )
            return "red";
        }

        // Persistent (selected) conditions
        if (selectedDays.has(dayNum)) return "blue";
        for (const city of selectedCities) {
          if (dayToCities[dayNum]?.has(city)) return "blue";
        }
        for (const sankeyNodeKey of selectedSankeyNodes) {
          const [layer, name] = sankeyNodeKey.split("||");
          if (layer === "0" && dayToStates[dayNum]?.has(name)) return "blue";
          if (layer === "1" && dayToCities[dayNum]?.has(name)) return "blue";
          if (layer === "2" && dayToOccupations[dayNum]?.has(name))
            return "blue";
          if (layer === "3" && dayToMerchants[dayNum]?.has(name)) return "blue";
        }
        return defColor;
      })
      .attr("fill-opacity", (d) => {
        const dayNum = +d3.timeDay(histData[d.index].date);
        let isRelevant = false;
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
    // highlightedState,
    // highlightedCity,
    histData,
    dayToStates,
    dayToCities,
    dayToOccupations,
    dayToMerchants,
    timeHighlightedState,
    timeHighlightedCity,
    sankeyHighlightedState,
    setSankeyHighlightedState,
    sankeyHighlightedCity,
    setSankeyHighlightedCity,
  ]);
  // end ofuseEffect
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
    rectSel.each(function (d) {
      d.type = "timeBar";
    });
    barsRef.current = rectSel;
    // Ensure tooltip exists
    const tooltip = d3.select("body").select(".tooltip");
    if (tooltip.empty()) {
      d3.select("body").append("div").attr("class", "tooltip");
    }

    rectSel
      .on("mouseover", (evt, d) => {
        // Format the date
        const dateStr = d3.timeFormat("%b %d, %Y")(hist[d.index].date);
        d3.select("body")
          .select(".tooltip")
          .html(
            `
        <strong>${dateStr}</strong><br/>
        Credit: ${hist[d.index].Credit}<br/>
        Debit: ${hist[d.index].Debit}
      `
          )
          .style("opacity", 1);
      })
      .on("mousemove", (evt) => {
        d3.select("body")
          .select(".tooltip")
          .style("left", evt.pageX + 10 + "px")
          .style("top", evt.pageY + 10 + "px");
      })
      .on("mouseout", () => {
        d3.select("body").select(".tooltip").style("opacity", 0);
      });

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
          // .attr("x",(dd) => newX(hist[dd.index].date) - computeBarWidth(hist, newX) / 2)
          .attr("x", (dd) => newX(hist[dd.index].date))
          .attr("width", (dd) => computeBarWidth(hist, newX));
        g.select(".x-axis").call(d3.axisBottom(newX).ticks(10));
      });
    zoomRef.current = zoomBehavior;
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

  return (
    <div
      id={id}
      className={className}
      style={{ width, height, position: "relative" }}
    >
      <svg ref={svgRef} style={{ width: "100%", height: "100%" }} />
    </div>
  );
}

export default TimeHistogram;
