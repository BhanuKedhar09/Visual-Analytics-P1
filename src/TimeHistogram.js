// TimeHistogram.js
import React, { useRef, useEffect, useContext, useState } from 'react';
import * as d3 from 'd3';
import { DataContext } from './DataLoader';
import { InteractionContext } from './InteractionContext';

function TimeHistogram({ width = 1000, height = 300 }) {
  const svgRef = useRef(null);
  const barsRef = useRef(null);    // store the bar selection
  const zoomRef = useRef(null);    // store the zoom behavior
  const xScaleRef = useRef(null);
  const yScaleRef = useRef(null);

  // We'll keep the final processed data in state so we can reference it in the update effect
  const [histData, setHistData] = useState([]);
  const [dayToCities, setDayToCities] = useState({}); // day => Set of city strings

  const { data } = useContext(DataContext);
  const {
    hoveredDay, setHoveredDay,
    hoveredCity,
    selectedDays, setSelectedDays,
    selectedCities
  } = useContext(InteractionContext);

  /***************************************************
   * 1) MOUNT EFFECT: parse data, draw chart once
   ***************************************************/
  useEffect(() => {
    if (!data || data.length === 0) return;

    // 1) parse & sort
    const parseTime = d3.timeParse("%Y-%m-%d %H:%M:%S");
    const processed = data.map(d => ({
      ...d,
      TransactionDate: parseTime(d.TransactionDate),
    }));
    processed.sort((a, b) => a.TransactionDate - b.TransactionDate);

    // 2) build day-based histogram
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

    // fill missing days
    hist = fillMissingDays(hist);

    function fillMissingDays(arr) {
      const minDate = d3.min(arr, d => d.date);
      const maxDate = d3.max(arr, d => d.date);
      const out = [];
      let cur = new Date(minDate);
      while (cur <= maxDate) {
        const existing = arr.find(x => +x.date === +cur);
        if (existing) out.push(existing);
        else out.push({ date: new Date(cur), Credit: 0, Debit: 0 });
        cur.setDate(cur.getDate() + 1);
      }
      return out;
    }

    setHistData(hist);

    // 3) build day->cities map for cross linking
    // each day => set of city strings
    const dtc = {};
    processed.forEach(d => {
      const dayNum = +d3.timeDay(d.TransactionDate);
      if (!dtc[dayNum]) dtc[dayNum] = new Set();
      dtc[dayNum].add(d.Location);
    });
    setDayToCities(dtc);

    // 4) create chart
    const margin = { top: 30, right: 30, bottom: 60, left: 60 };
    const innerW = width - margin.left - margin.right;
    const innerH = height - margin.top - margin.bottom;

    const maxY = d3.max(hist, d => d.Credit + d.Debit) || 0;
    const xScale = d3.scaleTime()
      .domain(d3.extent(hist, d => d.date))
      .range([0, innerW]);
    const yScale = d3.scaleLinear()
      .domain([0, maxY])
      .nice()
      .range([innerH, 0]);

    xScaleRef.current = xScale;
    yScaleRef.current = yScale;

    const stackGen = d3.stack().keys(["Credit", "Debit"]);
    const series = stackGen(hist);

    const svg = d3.select(svgRef.current)
      .attr("width", width)
      .attr("height", height);

    svg.selectAll("*").remove();

    const g = svg.append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    // x-axis
    const xAxis = d3.axisBottom(xScale).ticks(10).tickFormat(d3.timeFormat("%b %d"));
    g.append("g")
      .attr("transform", `translate(0,${innerH})`)
      .attr("class", "x-axis")
      .call(xAxis);

    // y-axis
    const yAxis = d3.axisLeft(yScale).ticks(6);
    g.append("g").call(yAxis);

    // stacked bars
    const layer = g.selectAll(".layer")
      .data(series)
      .enter()
      .append("g")
      .attr("class", "layer");

    // color
    const color = d3.scaleOrdinal()
      .domain(["Credit", "Debit"])
      .range(["#4E79A7", "#F28E2B"]);

    const rectSel = layer.selectAll("rect")
      .data(d => d.map((point, index) => ({ point, index, key: d.key })))
      .enter()
      .append("rect")
      .attr("x", d => xScale(hist[d.index].date))
      .attr("width", computeBarWidth(hist, xScale))
      .attr("y", d => yScale(d.point[1]))
      .attr("height", d => yScale(d.point[0]) - yScale(d.point[1]))
      .attr("fill", d => color(d.key))
      .attr("stroke", "#fff")
      .attr("stroke-width", 0.5)
      // Hover
      .on("mouseover", (evt, d) => {
        const day = hist[d.index].date;
        setHoveredDay(day);
      })
      .on("mouseout", () => {
        setHoveredDay(null);
      })
      // Click toggles day in selectedDays
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

    // 5) zoom
    const zoomBehavior = d3.zoom()
      .scaleExtent([1, 10])
      .translateExtent([[0, 0], [innerW, innerH]])
      .extent([[0, 0], [innerW, innerH]])
      .on("zoom", evt => {
        const newX = evt.transform.rescaleX(xScale);
        rectSel
          .attr("x", dd => newX(hist[dd.index].date))
          .attr("width", computeBarWidth(hist, newX));
        g.select(".x-axis").call(d3.axisBottom(newX).ticks(10));
      });
    zoomRef.current = zoomBehavior;

    svg.call(zoomBehavior);

  }, [data, width, height, setHoveredDay, setSelectedDays]);

  /*****************************************************
   * 2) UPDATE EFFECT: hoveredDay, hoveredCity, 
   *    selectedDays, selectedCities => update style
   *****************************************************/
  useEffect(() => {
    if (!barsRef.current || histData.length === 0) return;

    const hoveredDayNum = hoveredDay ? +d3.timeDay(hoveredDay) : null;

    barsRef.current
      .attr("fill", (d) => {
        // default stacked color
        let c = (d.key === "Credit") ? "#4E79A7" : "#F28E2B";
        const dayNum = +d3.timeDay(histData[d.index].date);

        // if day is selected => fill blue
        if (selectedDays.has(dayNum)) return "blue";
        // else if day is hovered => fill red
        if (hoveredDayNum === dayNum) return "red";

        // if hoveredCity or selectedCities => see if dayToCities[dayNum] has that city
        const citySet = dayToCities[dayNum];
        if (hoveredCity && citySet) {
          if (citySet.has(hoveredCity)) c = "red";
          else c = "#ccc"; // dim
        }
        for (const city of selectedCities) {
          if (citySet && citySet.has(city)) {
            c = "blue";
            break;
          }
        }

        return c;
      })
      .attr("fill-opacity", (d) => {
        const dayNum = +d3.timeDay(histData[d.index].date);
        // if day is selected or hovered => full opacity
        if (selectedDays.has(dayNum) || hoveredDayNum === dayNum) return 1;

        // if city is hovered or selected => check if day matches
        const citySet = dayToCities[dayNum];
        let matchedHover = false;
        if (hoveredCity && citySet && citySet.has(hoveredCity)) matchedHover = true;
        let matchedSelect = false;
        for (const c of selectedCities) {
          if (citySet && citySet.has(c)) matchedSelect = true;
        }
        if (matchedHover || matchedSelect) return 0.9;

        // otherwise, if something is hovered, dim
        if (hoveredCity || hoveredDayNum || selectedCities.size || selectedDays.size) return 0.3;
        return 1;
      });
  }, [
    hoveredDay, hoveredCity,
    selectedDays, selectedCities,
    histData, dayToCities
  ]);

  function computeBarWidth(arr, scaleFn) {
    if (arr.length < 2) return 20;
    let totalGap = 0;
    for (let i = 0; i < arr.length - 1; i++) {
      totalGap += scaleFn(arr[i+1].date) - scaleFn(arr[i].date);
    }
    const avgGap = totalGap / (arr.length - 1);
    return Math.max(3, Math.min(avgGap * 0.8, 20));
  }

  return <svg ref={svgRef} style={{ width: '100%', height: 'auto' }} />;
}

export default TimeHistogram;