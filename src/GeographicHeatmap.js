// GeographicHeatmap.js
import React, { useRef, useState, useEffect, useContext } from 'react';
import * as d3 from 'd3';
import { DataContext } from './DataLoader';

function GeographicHeatmap({ width = 800, height = 500 }) {
  const svgRef = useRef();
  const { data, filterState } = useContext(DataContext);

  // Start with a more modest default zoom so the entire US is visible
  const [zoomLevel, setZoomLevel] = useState(1.0);

  useEffect(() => {
    if (!data || data.length === 0) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    // Responsive SVG
    svg
      .attr('width', width)
      .attr('height', height)
      .attr('viewBox', `0 0 ${width} ${height}`)
      .attr('preserveAspectRatio', 'xMidYMid meet');

    // Lower the baseScale so we start more "zoomed out"
    // e.g., (width + height) * 0.6
    const baseScale = (width + height) * 0.6;

    // Combine with zoomLevel
    const projection = d3.geoAlbersUsa()
      .translate([width / 2, height / 2])
      .scale(baseScale * zoomLevel);

    const path = d3.geoPath().projection(projection);

    // Load US states from public folder
    d3.json(process.env.PUBLIC_URL + '/gz_2010_us_040_00_500k.json')
      .then(usData => {
        // Draw states
        svg.append('g')
          .selectAll('path')
          .data(usData.features)
          .enter()
          .append('path')
          .attr('d', path)
          .attr('fill', '#f0f0f0')
          .attr('stroke', '#ccc');

        // Filter data if filterState has date range
        const filteredData = filterState && filterState.start && filterState.end
          ? data.filter(d => {
              const transDate = new Date(d.TransactionDate);
              return transDate >= filterState.start && transDate <= filterState.end;
            })
          : data;

        // Aggregate by city
        const cityMap = {};
        filteredData.forEach(d => {
          if (d.lat && d.lng) {
            if (!cityMap[d.Location]) {
              cityMap[d.Location] = {
                city: d.Location,
                lat: +d.lat,
                lng: +d.lng,
                count: 0
              };
            }
            cityMap[d.Location].count += 1;
          }
        });
        const cities = Object.values(cityMap);

        // Radius scale
        const maxCount = d3.max(cities, c => c.count) || 1;
        const radiusScale = d3.scaleSqrt()
          .domain([0, maxCount])
          .range([0, 20]);

        // Group for circles
        const circlesGroup = svg.append('g');

        // Tooltip
        const tooltip = d3.select('body').append('div')
          .attr('class', 'tooltip')
          .style('position', 'absolute')
          .style('padding', '6px')
          .style('background', 'rgba(0,0,0,0.7)')
          .style('color', '#fff')
          .style('border-radius', '4px')
          .style('pointer-events', 'none')
          .style('opacity', 0);

        // Draw circles
        circlesGroup.selectAll('circle')
          .data(cities)
          .enter()
          .append('circle')
          .attr('cx', d => {
            const coords = projection([d.lng, d.lat]);
            return coords ? coords[0] : -9999;
          })
          .attr('cy', d => {
            const coords = projection([d.lng, d.lat]);
            return coords ? coords[1] : -9999;
          })
          .attr('r', d => radiusScale(d.count))
          .attr('fill', 'orange')
          .attr('fill-opacity', 0.6)
          .attr('stroke', '#fff')
          .attr('stroke-width', 1)
          .on('mouseover', (event, d) => {
            tooltip.transition().duration(200).style('opacity', 0.9);
            tooltip.html(`<strong>${d.city}</strong><br/>Transactions: ${d.count}`)
              .style('left', (event.pageX + 10) + 'px')
              .style('top', (event.pageY - 28) + 'px');
          })
          .on('mousemove', (event) => {
            tooltip.style('left', (event.pageX + 10) + 'px')
              .style('top', (event.pageY - 28) + 'px');
          })
          .on('mouseout', () => {
            tooltip.transition().duration(500).style('opacity', 0);
          });
      })
      .catch(err => console.error("Error loading us-states.json:", err));

    // Cleanup
    return () => d3.selectAll('.tooltip').remove();
  }, [data, filterState, width, height, zoomLevel]);

  return (
    <div style={{ position: 'relative', width, height }}>
      {/* Zoom Buttons */}
      <div style={{ position: 'absolute', top: 10, left: 10, zIndex: 10 }}>
        <button onClick={() => setZoomLevel(z => z * 1.2)} style={{ marginRight: '5px' }}>+</button>
        <button onClick={() => setZoomLevel(z => z / 1.2)}>-</button>
      </div>
      <svg ref={svgRef} style={{ width: '100%', height: '100%' }} />
    </div>
  );
}

export default GeographicHeatmap;