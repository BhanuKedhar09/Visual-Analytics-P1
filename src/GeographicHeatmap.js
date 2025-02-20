// GeographicHeatmap.js
import React, { useRef, useEffect, useContext, useState } from 'react';
import * as d3 from 'd3';
import { DataContext } from './DataLoader';
import { InteractionContext } from './InteractionContext';

function GeographicHeatmap({ width = 1200, height = 800 }) {
  const svgRef = useRef(null);
  const circlesRef = useRef(null);   // store the circle selection
  const gMapRef = useRef(null);

  const [cities, setCities] = useState([]);
  const [cityToDays, setCityToDays] = useState({}); // city => Set of dayNum

  const { data } = useContext(DataContext);
  const {
    hoveredDay,
    selectedDays,
    hoveredCity, setHoveredCity,
    selectedCities, setSelectedCities
  } = useContext(InteractionContext);

  /*******************************************
   * 1) MOUNT EFFECT: parse data, draw map once
   *******************************************/
  useEffect(() => {
    if (!data || data.length === 0) return;

    // 1) build city data
    const cityMap = {};
    data.forEach(d => {
      if (!d.lat || !d.lng) return;
      const c = d.Location;
      if (!cityMap[c]) {
        cityMap[c] = {
          city: c,
          lat: +d.lat,
          lng: +d.lng,
          count: 0,
          days: new Set()
        };
      }
      cityMap[c].count++;
      const dayNum = +d3.timeDay(new Date(d.TransactionDate));
      cityMap[c].days.add(dayNum);
    });
    const cityArr = Object.values(cityMap);
    setCities(cityArr);

    // city->days map
    const ctd = {};
    for (const c of cityArr) {
      ctd[c.city] = c.days;
    }
    setCityToDays(ctd);

    // 2) draw map
    const svg = d3.select(svgRef.current)
      .attr("width", width)
      .attr("height", height);
    svg.selectAll("*").remove();

    const gMap = svg.append("g");
    gMapRef.current = gMap;

    const baseScale = (width + height) * 0.75;
    const projection = d3.geoAlbersUsa()
      .translate([width / 2, height / 2])
      .scale(baseScale);
    const path = d3.geoPath().projection(projection);

    d3.json(process.env.PUBLIC_URL + '/gz_2010_us_040_00_500k.json')
      .then(usData => {
        gMap.selectAll("path")
          .data(usData.features)
          .enter()
          .append("path")
          .attr("d", path)
          .attr("fill", "#f0f0f0")
          .attr("stroke", "#ccc");

        // circles
        const maxCount = d3.max(cityArr, c => c.count) || 1;
        const rScale = d3.scaleSqrt().domain([0, maxCount]).range([0, 20]);

        const circleSel = gMap.selectAll("circle")
          .data(cityArr)
          .enter()
          .append("circle")
          .attr("cx", d => {
            const coords = projection([d.lng, d.lat]);
            return coords ? coords[0] : -9999;
          })
          .attr("cy", d => {
            const coords = projection([d.lng, d.lat]);
            return coords ? coords[1] : -9999;
          })
          .attr("r", d => rScale(d.count))
          .attr("fill", "orange")
          .attr("fill-opacity", 0.5)
          .attr("stroke", "#fff")
          .attr("stroke-width", 1)
          // hover => setHoveredCity
          .on("mouseover", (evt, d) => {
            setHoveredCity(d.city);
          })
          .on("mouseout", () => {
            setHoveredCity(null);
          })
          // click => toggle city
          .on("click", (evt, d) => {
            evt.stopPropagation();
            setSelectedCities(prev => {
              const newSet = new Set(prev);
              if (newSet.has(d.city)) newSet.delete(d.city);
              else newSet.add(d.city);
              return newSet;
            });
          });

        circlesRef.current = circleSel;
      })
      .catch(err => console.error("Error loading map data:", err));

    // 3) zoom
    const zoomBehavior = d3.zoom()
      .scaleExtent([1, 8])
      .translateExtent([[0,0],[width,height]])
      .on("zoom", (evt) => {
        gMap.attr("transform", evt.transform);
      });
    svg.call(zoomBehavior);

  }, [data, width, height, setHoveredCity, setSelectedCities]);

  /*********************************************
   * 2) UPDATE EFFECT: hoveredDay/city, selected
   *********************************************/
  useEffect(() => {
    if (!circlesRef.current || !cities.length) return;

    const hoveredDayNum = hoveredDay ? +d3.timeDay(hoveredDay) : null;

    circlesRef.current
      .attr("fill", d => {
        // default is orange
        let fillColor = "orange";

        // if city is selected => fill blue
        if (selectedCities.has(d.city)) fillColor = "blue";
        // else if city is hovered => fill red
        else if (hoveredCity === d.city) fillColor = "red";

        // if hoveredDay or selectedDays => see if city has that day
        let matchesDay = false;
        if (hoveredDayNum && d.days.has(hoveredDayNum)) {
          matchesDay = true;
          fillColor = "red";
        }
        for (const dayNum of selectedDays) {
          if (d.days.has(dayNum)) {
            matchesDay = true;
            fillColor = "blue";
            break;
          }
        }

        // if we have a hoveredCity or hoveredDay, we might dim everything else
        // but let's do that in fill-opacity logic
        return fillColor;
      })
      .attr("fill-opacity", d => {
        // if city is hovered or selected => higher
        if (hoveredCity === d.city || selectedCities.has(d.city)) return 0.9;

        // if city matches hoveredDay or selectedDays => medium
        let matchedDay = false;
        if (hoveredDayNum && d.days.has(hoveredDayNum)) matchedDay = true;
        for (const dayNum of selectedDays) {
          if (d.days.has(dayNum)) matchedDay = true;
        }
        if (matchedDay) return 0.7;

        // otherwise if something is hovered or selected, dim
        if (hoveredCity || hoveredDayNum || selectedCities.size || selectedDays.size) return 0.3;
        return 0.5;
      })
      .attr("stroke", d => {
        if (selectedCities.has(d.city) || hoveredCity === d.city) return "#333";
        return "#fff";
      })
      .attr("stroke-width", d => {
        if (selectedCities.has(d.city) || hoveredCity === d.city) return 2;
        return 1;
      });
  }, [
    hoveredDay, hoveredCity,
    selectedDays, selectedCities,
    cities
  ]);

  return <div style={{ position: 'relative', width, height }}>
    <svg ref={svgRef} style={{ width: '100%', height: '100%' }} />
  </div>;
}

export default GeographicHeatmap;