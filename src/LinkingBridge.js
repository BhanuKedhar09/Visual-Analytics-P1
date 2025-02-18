// // LinkingBridge.js
// import { useEffect, useContext } from 'react';
// import * as d3 from 'd3';
// import { DataContext } from './DataLoader';

// function LinkingBridge() {
//   const { data } = useContext(DataContext);

//   useEffect(() => {
//     // Select elements from the two visualizations
//     const mapCircles = d3.selectAll('.city-circle');
//     const histBars = d3.selectAll('.hist-bar');

//     // When pointerover on a map circle, highlight that circle and
//     // highlight all histogram bars whose date is in that city's transaction days.
//     mapCircles.on('pointerover', function(event, circleData) {
//       // Highlight the hovered map circle
//       console.log("pointerover", circleData);
//       d3.select(this)
//         .attr('stroke', 'blue')
//         .attr('stroke-width', '2.5px');

//       // Compute the set of dates (numeric timestamps at day resolution)
//       // on which this city has transactions.
//       const city = circleData.city;
//       const cityDates = new Set(
//         data
//           .filter(d => d.Location === city)
//           .map(d => +d3.timeDay(new Date(d.TransactionDate)))
//       );

//       // For each histogram bar, check if its date is in cityDates.
//       histBars.each(function(barData) {
//         // Expect barData.date is a Date object; convert to numeric day.
//         const barDay = +d3.timeDay(barData.date);
//         if (cityDates.has(barDay)) {
//           d3.select(this)
//             .attr('stroke', 'red')
//             .attr('stroke-width', '2.5px');
//         }
//       });
//     });

//     mapCircles.on('pointerout', function(event, d) {
//       // Remove highlight from map circle
//       d3.select(this).attr('stroke', 'none');
//       // Remove highlight from all histogram bars
//       histBars.attr('stroke', 'none');
//     });

//     // Similarly, for histogram bars: when hovered, highlight the bar and
//     // highlight map circles for cities that had transactions on that day.
//     histBars.on('pointerover', function(event, barData) {
//         console.log(event, barData);
//       d3.select(this)
//         .attr('stroke', 'red')
//         .attr('stroke-width', '2.5px');

//       // Get the day (numeric timestamp) of this bar.
//       const barDay = +d3.timeDay(barData.date);

//       mapCircles.each(function(circleData) {
//         // For each city, check if it had a transaction on barDay.
//         const city = circleData.city;
//         const cityDates = new Set(
//           data
//             .filter(d => d.Location === city)
//             .map(d => +d3.timeDay(new Date(d.TransactionDate)))
//         );
//         if (cityDates.has(barDay)) {
//           d3.select(this)
//             .attr('stroke', 'blue')
//             .attr('stroke-width', '2.5px');
//         }
//       });
//     });

//     histBars.on('pointerout', function(event, d) {
//       d3.select(this).attr('stroke', 'none');
//       mapCircles.attr('stroke', 'none');
//     });

//     // Cleanup event handlers on unmount
//     return () => {
//       mapCircles.on('pointerover', null);
//       mapCircles.on('pointerout', null);
//       histBars.on('pointerover', null);
//       histBars.on('pointerout', null);
//     };

//   }, [data]);

//   // This component doesn't render any DOM; it only attaches event listeners.
//   return null;
// }

// export default LinkingBridge;