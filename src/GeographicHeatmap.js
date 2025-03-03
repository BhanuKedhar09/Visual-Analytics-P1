// GeographicHeatmap.js
import React, { useRef, useEffect, useContext, useState } from "react";
import * as d3 from "d3";
import { DataContext } from "./DataLoader";
import { InteractionContext } from "./InteractionContext";

function GeographicHeatmap({ width = 1200, height = 800 }) {
  const svgRef = useRef(null);
  const circlesRef = useRef(null); // store the circle selection
  const gMapRef = useRef(null);

  const [cities, setCities] = useState([]);
  const [cityToDays, setCityToDays] = useState({}); // city => Set of dayNum

  const { data } = useContext(DataContext);
  const {
    hoveredDay,
    selectedDays,
    hoveredCity,
    setHoveredCity,
    selectedCities,
    setSelectedCities,
    hoveredSankey,
    selectedSankeyNodes,
  } = useContext(InteractionContext);

  /*******************************************
   * 1) MOUNT EFFECT: parse data, draw map once
   *******************************************/
  useEffect(() => {
    if (!data || data.length === 0) return;

    // 1) build city data
    const cityMap = {};
    data.forEach((d) => {
      if (!d.lat || !d.lng) return;
      const c = d.Location;
      if (!cityMap[c]) {
        cityMap[c] = {
          city: c,
          state: d.state_id ? d.state_id.trim() : "",
          lat: +d.lat,
          lng: +d.lng,
          count: 0,
          days: new Set(),
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
    const svg = d3
      .select(svgRef.current)
      .attr("width", width)
      .attr("height", height);
    svg.selectAll("*").remove();

    const gMap = svg.append("g");
    gMapRef.current = gMap;

    const baseScale = (width + height) * 0.75;
    const projection = d3
      .geoAlbersUsa()
      .translate([width / 2, height / 2])
      .scale(baseScale);
    const path = d3.geoPath().projection(projection);

    d3.json(process.env.PUBLIC_URL + "/gz_2010_us_040_00_500k.json")
      .then((usData) => {
        gMap
          .selectAll("path")
          .data(usData.features)
          .enter()
          .append("path")
          .attr("d", path)
          .attr("fill", "#f0f0f0")
          .attr("stroke", "#ccc");

        // circles
        const maxCount = d3.max(cityArr, (c) => c.count) || 1;
        const rScale = d3.scaleSqrt().domain([0, maxCount]).range([0, 20]);

        const circleSel = gMap
          .selectAll("circle")
          .data(cityArr)
          .enter()
          .append("circle")
          .attr("cx", (d) => {
            const coords = projection([d.lng, d.lat]);
            return coords ? coords[0] : -9999;
          })
          .attr("cy", (d) => {
            const coords = projection([d.lng, d.lat]);
            return coords ? coords[1] : -9999;
          })
          .attr("r", (d) => rScale(d.count))
          .attr("fill", (d) => {
            // default fill color
            let fillColor = "orange";

            // If the city is hovered, use red.
            if (hoveredCity === d.city) {
              fillColor = "red";
            }

            // If the city is directly selected (via map click), use blue.
            if (selectedCities.has(d.city)) {
              fillColor = "blue";
            }

            // If a Sankey node (state) is hovered and matches this city's state, override to red.
            if (
              hoveredSankey &&
              hoveredSankey.layer === 0 &&
              hoveredSankey.name === d.state
            ) {
              fillColor = "red";
            }

            // If a Sankey state node is selected and matches this city's state, override to blue.
            for (const key of selectedSankeyNodes) {
              const [layer, name] = key.split("||");
              if (layer === "0" && name === d.state) {
                fillColor = "blue";
                break;
              }
            }

            return fillColor;
          })
          .attr("fill-opacity", (d) => {
            // default opacity is 0.5
            let opacity = 0.2;

            // Increase opacity if city is hovered or directly selected.
            if (hoveredCity === d.city || selectedCities.has(d.city)) {
              opacity = 0.5;
            }

            // Also, if a Sankey state node is hovered and matches, set opacity to 0.9.
            if (
              hoveredSankey &&
              hoveredSankey.layer === 0 &&
              hoveredSankey.name === d.state
            ) {
              opacity = 0.5;
            }

            // Or if any Sankey state node is selected and matches, set opacity to 0.9.
            for (const key of selectedSankeyNodes) {
              const [layer, name] = key.split("||");
              if (layer === "0" && name === d.state) {
                opacity = 0.5;
                break;
              }
            }

            // Otherwise, if any interaction is active, dim non-relevant circles.
            if (
              hoveredCity ||
              hoveredDay ||
              selectedCities.size ||
              selectedDays.size
            ) {
              if (opacity === 0.5) opacity = 0.3;
            }

            return opacity;
          })
          .attr("stroke", (d) => {
            // Thicker stroke if the city is hovered or selected.
            if (hoveredCity === d.city || selectedCities.has(d.city))
              return "#333";

            // Also if a Sankey state node is hovered and matches.
            if (
              hoveredSankey &&
              hoveredSankey.layer === 0 &&
              hoveredSankey.name === d.state
            )
              return "#333";

            // Or if any Sankey state node is selected and matches.
            for (const key of selectedSankeyNodes) {
              const [layer, name] = key.split("||");
              if (layer === "0" && name === d.state) return "#333";
            }
            return "#fff";
          })
          .attr("stroke-width", (d) => {
            if (hoveredCity === d.city || selectedCities.has(d.city)) return 2;
            if (
              hoveredSankey &&
              hoveredSankey.layer === 0 &&
              hoveredSankey.name === d.state
            )
              return 2;
            for (const key of selectedSankeyNodes) {
              const [layer, name] = key.split("||");
              if (layer === "0" && name === d.state) return 2;
            }
            return 1;
          })
          .on("mouseover", (evt, d) => {
            setHoveredCity(d.city);
          })
          .on("mouseout", () => {
            setHoveredCity(null);
          })
          // click => toggle city selection
          .on("click", (evt, d) => {
            evt.stopPropagation();
            setSelectedCities((prev) => {
              const newSet = new Set(prev);
              if (newSet.has(d.city)) newSet.delete(d.city);
              else newSet.add(d.city);
              return newSet;
            });
          });

        circlesRef.current = circleSel;
      })
      .catch((err) => console.error("Error loading map data:", err));

    // 3) zoom
    const zoomBehavior = d3
      .zoom()
      .scaleExtent([1, 8])
      .translateExtent([
        [0, 0],
        [width, height],
      ])
      .on("zoom", (evt) => {
        gMap.attr("transform", evt.transform);
      });
    svg.call(zoomBehavior);
  }, [data, width, height, setHoveredCity, setSelectedCities]);

  useEffect(() => {
    if (!circlesRef.current || !cities.length) return;
  
    const hoveredDayNum = hoveredDay ? +d3.timeDay(hoveredDay) : null;
  
    circlesRef.current
      .attr("fill", (d) => {
        // default fill color for cities is orange
        let fillColor = "orange";
        
        // Local interactions: if the city is hovered → red; if selected → blue.
        if (hoveredCity === d.city) {
          fillColor = "red";
        }
        if (selectedCities.has(d.city)) {
          fillColor = "blue";
        }
        
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
         
        // Cross-view (from Sankey): 
        // if a Sankey state node is hovered and matches this city's state → red.
        if (hoveredSankey && hoveredSankey.layer === 0 && hoveredSankey.name === d.state) {
          fillColor = "red";
        }
        // if a Sankey state node is selected and matches this city's state → blue.
        for (const key of selectedSankeyNodes) {
          const [layer, name] = key.split("||");
          if (layer === "0" && name === d.state) {
            fillColor = "blue";
            break;
          }
        }
        
        return fillColor;
      })
      .attr("fill-opacity", (d) => {
        // Increase opacity if this city is directly hovered or selected
        if (hoveredCity === d.city || selectedCities.has(d.city)) return 0.9;
        // Or if a Sankey state node (selected) matches this city's state.
        for (const key of selectedSankeyNodes) {
          const [layer, name] = key.split("||");
          if (layer === "0" && name === d.state) return 0.9;
        }
        return 0.5;
      })
      .attr("stroke", (d) => {
        // Thicker stroke if hovered or selected (or if a Sankey state node is selected and matches)
        if (hoveredCity === d.city || selectedCities.has(d.city)) return "#333";
        for (const key of selectedSankeyNodes) {
          const [layer, name] = key.split("||");
          if (layer === "0" && name === d.state) return "#333";
        }
        return "#fff";
      })
      .attr("stroke-width", (d) => {
        if (hoveredCity === d.city || selectedCities.has(d.city)) return 2;
        for (const key of selectedSankeyNodes) {
          const [layer, name] = key.split("||");
          if (layer === "0" && name === d.state) return 2;
        }
        return 1;
      });
  }, [hoveredDay, hoveredCity, selectedDays, selectedCities, cities, hoveredSankey, selectedSankeyNodes]);
  return (
    <div style={{ position: "relative", width, height }}>
      <svg ref={svgRef} style={{ width: "100%", height: "100%" }} />
    </div>
  );
}

export default GeographicHeatmap;
