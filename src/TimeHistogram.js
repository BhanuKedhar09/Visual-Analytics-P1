// TimeHistogram.js
import React, { useRef, useEffect, useContext } from "react";
import * as d3 from "d3";
import { DataContext } from "./DataLoader";

function TimeHistogram({ width = 800, height = 400 }) {
  const svgRef = useRef();
  const { data } = useContext(DataContext);

  useEffect(() => {
    if (!data || data.length === 0) return;

    // Remove previous content
    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    function fillMissingDays(histogramData) {
      // 1. Find the earliest and latest date in histogramData
      const minDate = d3.min(histogramData, (d) => d.date);
      const maxDate = d3.max(histogramData, (d) => d.date);

      // 2. Create a new array that includes *every* calendar day from minDate to maxDate
      let filled = [];
      let current = new Date(minDate);

      while (current <= maxDate) {
        // Try to find this day in the existing data
        const existingIndex = histogramData.findIndex(
          (d) => +d.date === +current
        );
        if (existingIndex >= 0) {
          // If the day exists, push it as is
          filled.push(histogramData[existingIndex]);
        } else {
          // If missing, add an entry with zero counts
          filled.push({
            date: new Date(current),
            Credit: 0,
            Debit: 0,
          });
        }
        // Move to the next day
        current.setDate(current.getDate() + 1);
      }

      return filled;
    }

    // Create a tooltip div (only once)
    const tooltip = d3
      .select("body")
      .append("div")
      .attr("class", "tooltip")
      .style("position", "absolute")
      .style("padding", "6px")
      .style("background", "rgba(0,0,0,0.7)")
      .style("color", "#fff")
      .style("border-radius", "4px")
      .style("pointer-events", "none")
      .style("opacity", 0);

    // Define margins and inner dimensions
    const margin = { top: 30, right: 30, bottom: 60, left: 60 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    /************* DATA PROCESSING *************/
    const parseTime = d3.timeParse("%Y-%m-%d %H:%M:%S");
    const processedData = data.map((d) => ({
      ...d,
      TransactionDate: parseTime(d.TransactionDate),
    }));
    // Sort data by date ascending
    processedData.sort((a, b) => a.TransactionDate - b.TransactionDate);

    // Group transactions by day using d3.timeDay; this gives one row per calendar day.
    const dayTypeMap = d3.rollup(
      processedData,
      (transactions) => {
        const counts = { Credit: 0, Debit: 0 };
        transactions.forEach((tx) => {
          if (tx.TransactionType === "Credit") counts.Credit++;
          else if (tx.TransactionType === "Debit") counts.Debit++;
        });
        return counts;
      },
      (d) => d3.timeDay(d.TransactionDate)
    );
    let histogramData = Array.from(dayTypeMap, ([date, counts]) => ({
      date,
      ...counts,
    }));
    histogramData.sort((a, b) => a.date - b.date);
    // 5) Fill missing days
    histogramData = fillMissingDays(histogramData);

    // 6) Re-sort after filling
    histogramData.sort((a, b) => a.date - b.date);

    // Keys for stacking
    const keys = ["Credit", "Debit"];
    const stackGenerator = d3.stack().keys(keys);
    const series = stackGenerator(histogramData);

    const maxY = d3.max(histogramData, (d) => d.Credit + d.Debit) || 0;

    /************* SCALES *************/
    const xScale = d3
      .scaleTime()
      .domain(d3.extent(histogramData, (d) => d.date))
      .range([0, innerWidth]);
    const yScale = d3
      .scaleLinear()
      .domain([0, maxY])
      .nice()
      .range([innerHeight, 0]);
    const color = d3.scaleOrdinal().domain(keys).range(["#4E79A7", "#F28E2B"]);

    // Append main group container
    const g = svg
      .attr("width", width)
      .attr("height", height)
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    /************* HELPER: COMPUTE BAR WIDTH *************/
    // Given a current x-scale, compute each bar's width as 80% of the gap to the next day,
    // clamped to a minimum of 3px and a maximum of 20px.
    function computeBarWidth(i, scale) {
      if (histogramData.length === 1) return innerWidth * 0.8;
      let gap;
      if (i < histogramData.length - 1) {
        gap = scale(histogramData[i + 1].date) - scale(histogramData[i].date);
      } else {
        gap = scale(histogramData[i].date) - scale(histogramData[i - 1].date);
      }
      const rawWidth = gap * 0.8;
      return Math.max(3, Math.min(rawWidth, 20));
    }

    /************* DRAW STACKED BARS *************/
    const layer = g
      .selectAll(".layer")
      .data(series)
      .enter()
      .append("g")
      .attr("class", "layer")
      .attr("fill", (d) => color(d.key));

    layer
      .selectAll("rect")
      .data((layerData) => layerData.map((point, index) => ({ point, index })))
      .enter()
      .append("rect")
      .attr(
        "x",
        (d) =>
          xScale(histogramData[d.index].date) -
          computeBarWidth(d.index, xScale) / 2
      )
      .attr("width", (d) => computeBarWidth(d.index, xScale))
      .attr("y", (d) => yScale(d.point[1]))
      .attr("height", (d) => yScale(d.point[0]) - yScale(d.point[1]))
      .attr("rx", 2)
      .attr("stroke", "#fff")
      .attr("stroke-width", 0.5)
      // Tooltip event handlers
      .on("mouseover", (event, d) => {
        const day = histogramData[d.index].date;
        const credit = histogramData[d.index].Credit;
        const debit = histogramData[d.index].Debit;
        tooltip.transition().duration(200).style("opacity", 0.9);
        tooltip
          .html(
            `<strong>${d3.timeFormat("%Y-%m-%d")(
              day
            )}</strong><br/>Credit: ${credit}<br/>Debit: ${debit}`
          )
          .style("left", event.pageX + 10 + "px")
          .style("top", event.pageY - 28 + "px");
      })
      .on("mousemove", (event, d) => {
        tooltip
          .style("left", event.pageX + 10 + "px")
          .style("top", event.pageY - 28 + "px");
      })
      .on("mouseout", () => {
        tooltip.transition().duration(500).style("opacity", 0);
      });

    /************* AXES *************/
    const xAxisGroup = g
      .append("g")
      .attr("transform", `translate(0, ${innerHeight})`);
    const yAxisGroup = g.append("g");

    const xAxis = d3
      .axisBottom(xScale)
      .ticks(10)
      .tickFormat(d3.timeFormat("%b %d"));
    xAxisGroup.call(xAxis);

    const yAxis = d3.axisLeft(yScale).ticks(6);
    yAxisGroup.call(yAxis);

    // Axis labels
    xAxisGroup
      .append("text")
      .attr("x", innerWidth / 2)
      .attr("y", 40)
      .attr("fill", "#000")
      .attr("text-anchor", "middle")
      .attr("font-size", "12px")
      .text("Date");
    yAxisGroup
      .append("text")
      .attr("transform", "rotate(-90)")
      .attr("y", -50)
      .attr("x", -innerHeight / 2)
      .attr("fill", "#000")
      .attr("text-anchor", "middle")
      .attr("font-size", "12px")
      .text("Transactions");

    // Optional gridlines
    g.append("g")
      .call(d3.axisLeft(yScale).ticks(6).tickSize(-innerWidth).tickFormat(""))
      .selectAll("line")
      .attr("stroke", "#e0e0e0")
      .attr("stroke-dasharray", "3,3");

    /************* ZOOM BEHAVIOR *************/
    const zoom = d3
      .zoom()
      .scaleExtent([1, 10])
      .translateExtent([
        [0, 0],
        [innerWidth, innerHeight],
      ])
      .extent([
        [0, 0],
        [innerWidth, innerHeight],
      ])
      .on("zoom", zoomed);

    function zoomed(event) {
      const newXScale = event.transform.rescaleX(xScale);
      // Update bars with new scale
      g.selectAll(".layer")
        .selectAll("rect")
        .attr(
          "x",
          (d) =>
            newXScale(histogramData[d.index].date) -
            computeBarWidth(d.index, newXScale) / 2
        )
        .attr("width", (d) => computeBarWidth(d.index, newXScale));
      // Update x-axis with dynamic tick formatting
      let tickFormat;
      if (event.transform.k < 3) {
        tickFormat = d3.timeFormat("%b %d");
      } else {
        tickFormat = d3.timeFormat("%Y-%m-%d");
      }
      xAxisGroup.call(
        d3.axisBottom(newXScale).ticks(10).tickFormat(tickFormat)
      );
    }

    svg.call(zoom);

    // Remove tooltip on unmount
    return () => tooltip.remove();
  }, [data, width, height]);

  return <svg ref={svgRef} style={{ width: "100%", height: "auto" }} />;
}

export default TimeHistogram;
