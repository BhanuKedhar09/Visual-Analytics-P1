// TimeHistogram.js
import React, { useRef, useEffect, useContext, useState } from "react";
import * as d3 from "d3";
import { DataContext } from "./DataLoader";
import { InteractionContext } from "./InteractionContext";

function TimeHistogram({ width = 1000, height = 300 }) {
  const svgRef = useRef(null);
  const barsRef = useRef(null);

  // We'll keep the final processed data in state so we can reference it in the update effect
  const [histData, setHistData] = useState([]);

  // day => Set of states, cities, occupations, merchants
  const [dayToStates, setDayToStates] = useState({});
  const [dayToCities, setDayToCities] = useState({});
  const [dayToOccupations, setDayToOccupations] = useState({});
  const [dayToMerchants, setDayToMerchants] = useState({});

  const { data } = useContext(DataContext);
  const {
    hoveredDay, setHoveredDay,
    hoveredCity,
    hoveredSankey,
    selectedDays, setSelectedDays,
    selectedCities
  } = useContext(InteractionContext);

  /***************************************************
   * 1) MOUNT EFFECT: parse data, draw chart once
   ***************************************************/
  useEffect(() => {
    if (!data || data.length === 0) return;

    // 1) Parse transaction dates
    const parseTime = d3.timeParse("%Y-%m-%d %H:%M:%S");
    const processed = data.map(d => ({
      ...d,
      TransactionDate: parseTime(d.TransactionDate),
    }));
    processed.sort((a, b) => a.TransactionDate - b.TransactionDate);

    // 2) Build day-based histogram (Credit vs. Debit counts)
    const dayRoll = d3.rollup(
      processed,
      txs => {
        const c = { Credit: 0, Debit: 0 };
        txs.forEach(tx => {
          if (tx.TransactionType === "Credit") c.Credit++;
          else if (tx.TransactionType === "Debit") c.Debit++;
        });
        return c;
      },
      d => d3.timeDay(d.TransactionDate)
    );
    let hist = Array.from(dayRoll, ([date, counts]) => ({ date, ...counts }));
    hist.sort((a, b) => a.date - b.date);

    // Fill missing days
    hist = fillMissingDays(hist);
    function fillMissingDays(arr) {
      const minDate = d3.min(arr, d => d.date);
      const maxDate = d3.max(arr, d => d.date);
      const out = [];
      let current = new Date(minDate);
      while (current <= maxDate) {
        const existing = arr.find(x => +x.date === +current);
        if (existing) out.push(existing);
        else out.push({ date: new Date(current), Credit: 0, Debit: 0 });
        current.setDate(current.getDate() + 1);
      }
      return out;
    }
    setHistData(hist);

    // 3) Build day->states, day->cities, day->occupations, day->merchants
    const dts = {};
    const dtc = {};
    const dto = {};
    const dtm = {};

    processed.forEach(d => {
      const dayNum = +d3.timeDay(d.TransactionDate);

      // dayToStates
      if (!dts[dayNum]) dts[dayNum] = new Set();
      dts[dayNum].add(d.state_id);  // e.g. "TX", "CA"

      // dayToCities
      if (!dtc[dayNum]) dtc[dayNum] = new Set();
      dtc[dayNum].add(d.Location);

      // dayToOccupations
      if (!dto[dayNum]) dto[dayNum] = new Set();
      dto[dayNum].add(d.CustomerOccupation);

      // dayToMerchants
      if (!dtm[dayNum]) dtm[dayNum] = new Set();
      dtm[dayNum].add(d.MerchantID);
    });

    setDayToStates(dts);
    setDayToCities(dtc);
    setDayToOccupations(dto);
    setDayToMerchants(dtm);

    // 4) Draw the stacked bar chart
    drawHistogram(hist);
  }, [data]);

  /*****************************************************
   * 2) UPDATE EFFECT: style bars based on interactions
   *****************************************************/
  useEffect(() => {
    if (!barsRef.current || histData.length === 0) return;

    // If day is hovered
    const hoveredDayNum = hoveredDay ? +d3.timeDay(hoveredDay) : null;

    // Check hoveredSankey layer => which item is hovered
    let hoveredState = null;      // layer=0
    let hoveredCityName = null;   // layer=1
    let hoveredOccupation = null; // layer=2
    let hoveredMerchant = null;   // layer=3

    if (hoveredSankey) {
      if (hoveredSankey.layer === 0) {
        hoveredState = hoveredSankey.name;
      } else if (hoveredSankey.layer === 1) {
        hoveredCityName = hoveredSankey.name;
      } else if (hoveredSankey.layer === 2) {
        hoveredOccupation = hoveredSankey.name;
      } else if (hoveredSankey.layer === 3) {
        hoveredMerchant = hoveredSankey.name;
      }
    }

    barsRef.current
      .attr("fill", (d) => {
        // default color based on stacked key
        let c = d.key === "Credit" ? "#4E79A7" : "#F28E2B";
        const dayNum = +d3.timeDay(histData[d.index].date);

        // If day is selected => fill blue
        if (selectedDays.has(dayNum)) return "blue";
        // If day is hovered => fill red
        if (hoveredDayNum === dayNum) return "red";

        // now check states, cities, occupations, merchants
        const stateSet = dayToStates[dayNum];
        const citySet = dayToCities[dayNum];
        const occupSet = dayToOccupations[dayNum];
        const merchSet = dayToMerchants[dayNum];

        // If hoveredState => highlight if stateSet includes hoveredState
        if (hoveredState && stateSet && stateSet.has(hoveredState)) {
          c = "red";
        }
        // If hoveredCityName => highlight if citySet includes it
        if (hoveredCityName && citySet && citySet.has(hoveredCityName)) {
          c = "red";
        }
        // If hoveredOccupation => highlight if occupSet includes it
        if (hoveredOccupation && occupSet && occupSet.has(hoveredOccupation)) {
          c = "red";
        }
        // If hoveredMerchant => highlight if merchSet includes it
        if (hoveredMerchant && merchSet && merchSet.has(hoveredMerchant)) {
          c = "red";
        }

        // If hoveredCity from other views => highlight if citySet has it
        if (hoveredCity && citySet && citySet.has(hoveredCity)) {
          c = "red";
        }

        // If we have selectedCities => highlight if day includes them
        for (const sc of selectedCities) {
          if (citySet && citySet.has(sc)) {
            c = "blue";
            break;
          }
        }

        return c;
      })
      .attr("fill-opacity", (d) => {
        const dayNum = +d3.timeDay(histData[d.index].date);
        if (selectedDays.has(dayNum) || hoveredDayNum === dayNum) return 1;

        let relevant = false;
        const stateSet = dayToStates[dayNum];
        const citySet = dayToCities[dayNum];
        const occupSet = dayToOccupations[dayNum];
        const merchSet = dayToMerchants[dayNum];

        if (hoveredState && stateSet && stateSet.has(hoveredState)) relevant = true;
        if (hoveredCityName && citySet && citySet.has(hoveredCityName)) relevant = true;
        if (hoveredCity && citySet && citySet.has(hoveredCity)) relevant = true;
        if (hoveredOccupation && occupSet && occupSet.has(hoveredOccupation)) relevant = true;
        if (hoveredMerchant && merchSet && merchSet.has(hoveredMerchant)) relevant = true;

        for (const sc of selectedCities) {
          if (citySet && citySet.has(sc)) relevant = true;
        }

        if (relevant) return 0.9;
        if (hoveredDayNum || hoveredState || hoveredCityName || hoveredCity || hoveredOccupation || hoveredMerchant || selectedCities.size || selectedDays.size) {
          return 0.3;
        }
        return 1;
      });
  }, [
    hoveredDay, hoveredCity, hoveredSankey,
    selectedDays, selectedCities,
    histData, dayToStates, dayToCities, dayToOccupations, dayToMerchants
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

    const xScale = d3.scaleTime()
      .domain(d3.extent(hist, d => d.date))
      .range([0, innerW]);
    const maxY = d3.max(hist, d => d.Credit + d.Debit) || 1;
    const yScale = d3.scaleLinear()
      .domain([0, maxY])
      .nice()
      .range([innerH, 0]);

    // x-axis
    g.append("g")
      .attr("transform", `translate(0,${innerH})`)
      .call(d3.axisBottom(xScale).ticks(10).tickFormat(d3.timeFormat("%b %d")));

    // y-axis
    g.append("g").call(d3.axisLeft(yScale).ticks(6));

    // stacked bars
    const stackGen = d3.stack().keys(["Credit", "Debit"]);
    const series = stackGen(hist);

    const layer = g.selectAll(".layer")
      .data(series)
      .enter()
      .append("g")
      .attr("class", "layer");

    const color = d3.scaleOrdinal()
      .domain(["Credit", "Debit"])
      .range(["#4E79A7", "#F28E2B"]);

    const rectSel = layer.selectAll("rect")
      .data(d => d.map((point, index) => ({ point, index, key: d.key })))
      .enter()
      .append("rect")
      .attr("x", d => xScale(hist[d.index].date) - computeBarWidth(hist, xScale)/2)
      .attr("width", d => computeBarWidth(hist, xScale))
      .attr("y", d => yScale(d.point[1]))
      .attr("height", d => yScale(d.point[0]) - yScale(d.point[1]))
      .attr("fill", d => color(d.key))
      .attr("stroke", "#fff")
      .attr("stroke-width", 0.5)
      // On hover => update hoveredDay
      .on("mouseover", (evt, d) => {
        const day = hist[d.index].date;
        setHoveredDay(day);
      })
      .on("mouseout", () => {
        setHoveredDay(null);
      })
      // On click => toggle day selection
      .on("click", (evt, d) => {
        evt.stopPropagation();
        const dayNum = +d3.timeDay(hist[d.index].date);
        setSelectedDays(prev => {
          const newSet = new Set(prev);
          if (newSet.has(dayNum)) newSet.delete(dayNum);
          else newSet.add(dayNum);
          return newSet;
        });
      });
    barsRef.current = rectSel;

    // Zoom
    const zoomBehavior = d3.zoom()
      .scaleExtent([1, 10])
      .translateExtent([[0, 0], [innerW, innerH]])
      .extent([[0, 0], [innerW, innerH]])
      .on("zoom", evt => {
        const newX = evt.transform.rescaleX(xScale);
        rectSel
          .attr("x", dd => newX(hist[dd.index].date) - computeBarWidth(hist, newX)/2)
          .attr("width", dd => computeBarWidth(hist, newX));
        g.select(".x-axis").call(d3.axisBottom(newX).ticks(10));
      });
    svg.call(zoomBehavior);
  }

  function computeBarWidth(arr, scaleFn) {
    if (arr.length < 2) return 20;
    let totalGap = 0;
    for (let i = 0; i < arr.length - 1; i++) {
      totalGap += scaleFn(arr[i+1].date) - scaleFn(arr[i].date);
    }
    const avgGap = totalGap / (arr.length - 1);
    return Math.max(3, Math.min(avgGap * 0.8, 20));
  }

  return <svg ref={svgRef} style={{ width: "100%", height: "auto" }} />;
}

export default TimeHistogram;