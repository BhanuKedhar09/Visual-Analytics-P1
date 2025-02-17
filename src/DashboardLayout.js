// // DashboardLayout.js
// import React from 'react';
// import TimeHistogram from './TimeHistogram';        // or your stacked area chart
// import GeographicHeatmap from './GeographicHeatmap';
// import RadialNetworkPlaceholder from './RadialNetworkPlaceholder';
// import AIChatPlaceholder from './AIChatPlaceholder';

// /**
//  * A pinned (non-draggable) dashboard layout with:
//  *  - AI Chat on the left
//  *  - Stacked Chart on top-right
//  *  - Map in the middle (bottom-left)
//  *  - Radial network on bottom-right
//  */
// function DashboardLayout() {
//   return (
//     <div style={{
//       width: '100vw',
//       height: '100vh',
//       display: 'grid',
//       gridTemplateColumns: '300px 1fr 1fr',
//       gridTemplateRows: '50% 50%',
//       gap: '10px',
//       background: '#f9f9f9',
//       padding: '10px',
//       boxSizing: 'border-box'
//     }}>
//       {/* AI Chat: spans two rows in the first column */}
//       <div style={{
//         gridColumn: '1 / 2',
//         gridRow: '1 / 3',
//         border: '1px solid #ccc',
//         borderRadius: '6px',
//         overflow: 'hidden',
//         display: 'flex',
//         flexDirection: 'column'
//       }}>
//         <AIChatPlaceholder />
//       </div>

//       {/* Stacked Chart (TimeHistogram or your area chart) in top-right (spans columns 2-4 if you want) */}
//       <div style={{
//         gridColumn: '2 / 4',
//         gridRow: '1 / 2',
//         border: '1px solid #ccc',
//         borderRadius: '6px',
//         overflow: 'hidden'
//       }}>
//         <TimeHistogram />
//       </div>

//       {/* Map in the middle (bottom-left) => column 2, row 2 */}
//       <div style={{
//         gridColumn: '2 / 3',
//         gridRow: '2 / 3',
//         border: '1px solid #ccc',
//         borderRadius: '6px',
//         overflow: 'hidden'
//       }}>
//         <GeographicHeatmap />
//       </div>

//       {/* Radial Network in bottom-right => column 3, row 2 */}
//       <div style={{
//         gridColumn: '3 / 4',
//         gridRow: '2 / 3',
//         border: '1px solid #ccc',
//         borderRadius: '6px',
//         overflow: 'hidden'
//       }}>
//         <RadialNetworkPlaceholder />
//       </div>
//     </div>
//   );
// }

// export default DashboardLayout;