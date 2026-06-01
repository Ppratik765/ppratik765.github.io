/* ============================================================
   PORTFOLIO — js/map-route.js
   Cinematic Pathfinding Map with Dynamic Zoom & Loops (Leaflet.js)
   ============================================================ */

document.addEventListener('DOMContentLoaded', () => {
  'use strict';

  const mapContainer = document.getElementById('map-leaflet');
  if (!mapContainer || typeof L === 'undefined') return;

  const LOCATIONS = [
    {
      id: 'soar-valley',
      coords: [52.6369, -1.1398], // Leicester, UK
      tooltip: '<strong>Soar Valley College (Leicester, UK)</strong><br><span style="color: var(--accent-primary);">10th Standard</span>'
    },
    {
      id: 'dps-harni',
      coords: [22.3564, 73.2243], // DPS Harni, Vadodara, India
      tooltip: '<strong>DPS Harni (Vadodara, India)</strong><br><span style="color: var(--accent-primary);">12th Standard</span><br>Score: 435/500<br>JEE Main: 50,000 Rank (96.6 %ile)'
    },
    {
      id: 'gsv',
      coords: [22.2768, 73.1906], // GSV, Vadodara, India
      tooltip: '<strong>Gati Shakti Vishwavidyalaya</strong><br><span style="color: var(--accent-primary);">B.Tech AI & DS, Transportation & Logistics</span><br>CGPA: 8.5+<br>GATE 2027 DA Aspirant · LeetCode: 160+ Solved'
    }
  ];

  // Initialize Leaflet Map (remove attribution watermark)
  const map = L.map('map-leaflet', {
    zoomControl: false,
    scrollWheelZoom: false,
    attributionControl: false 
  }).setView([35, 38], 3);

  // Theming Tiles
  const darkTilesUrl = 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png';
  const lightTilesUrl = 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png';

  const isLight = document.documentElement.getAttribute('data-theme') === 'light';
  let currentLayer = L.tileLayer(isLight ? lightTilesUrl : darkTilesUrl, {
    subdomains: 'abcd',
    maxZoom: 20
  }).addTo(map);

  // Watch for theme updates and swap tiles
  window.addEventListener('theme-changed', () => {
    const isLightNow = document.documentElement.getAttribute('data-theme') === 'light';
    const newLayer = L.tileLayer(isLightNow ? lightTilesUrl : darkTilesUrl, {
      subdomains: 'abcd',
      maxZoom: 20
    });
    
    newLayer.addTo(map);
    setTimeout(() => {
      map.removeLayer(currentLayer);
      currentLayer = newLayer;
    }, 250);
  });

  // Custom styling elements based on theme
  const getColors = () => {
    const light = document.documentElement.getAttribute('data-theme') === 'light';
    return {
      primary: light ? '#cc9a06' : '#ffc300',
      secondary: light ? '#b8860b' : '#ffd60a'
    };
  };

  function createCustomIcon(color) {
    return L.divIcon({
      className: 'custom-leaflet-icon',
      html: `
        <div class="marker-inner-wrapper" style="
          width: 16px; 
          height: 16px; 
          border-radius: 50%; 
          border: 2px solid ${color}; 
          display: flex; 
          align-items: center; 
          justify-content: center;
          background: rgba(0,0,0,0.4);
          box-shadow: 0 0 10px ${color};
        ">
          <div style="
            width: 6px; 
            height: 6px; 
            border-radius: 50%; 
            background: ${color};
          "></div>
        </div>
      `,
      iconSize: [16, 16],
      iconAnchor: [8, 8]
    });
  }

  // Draw Routes (Polylines and Arcs)
  const colors = getColors();

  // Bezier Arc Generator for Leaflet Polylines
  function getBezierPoints(start, end, bend = 0.25, numPoints = 50) {
    const points = [];
    const midLat = (start[0] + end[0]) / 2;
    const midLng = (start[1] + end[1]) / 2;
    const dLat = end[0] - start[0];
    const dLng = end[1] - start[1];
    const ctrlLat = midLat - dLng * bend;
    const ctrlLng = midLng + dLat * bend;
    
    for (let i = 0; i <= numPoints; i++) {
      const t = i / numPoints;
      const lat = (1-t)**2 * start[0] + 2*(1-t)*t * ctrlLat + t**2 * end[0];
      const lng = (1-t)**2 * start[1] + 2*(1-t)*t * ctrlLng + t**2 * end[1];
      points.push([lat, lng]);
    }
    return points;
  }
  
  // Flight path UK -> Vadodara (Curved Arc)
  const flightArcPoints = getBezierPoints(LOCATIONS[0].coords, LOCATIONS[1].coords, 0.25);
  const flightRoute = L.polyline(flightArcPoints, {
    color: colors.primary,
    weight: 2,
    dashArray: '8, 8',
    opacity: 0.7
  }).addTo(map);

  // Local transit path DPS Harni -> GSV (Curved Arc)
  const localArcPoints = getBezierPoints(LOCATIONS[1].coords, LOCATIONS[2].coords, -0.4);
  const localRoute = L.polyline(localArcPoints, {
    color: colors.secondary,
    weight: 3,
    dashArray: '5, 5',
    opacity: 0.9
  }).addTo(map);

  // Markers
  const markers = LOCATIONS.map((loc, index) => {
    const col = index === 1 ? colors.secondary : colors.primary;
    const marker = L.marker(loc.coords, { icon: createCustomIcon(col) }).addTo(map);
    
    marker.bindTooltip(loc.tooltip, {
      direction: 'top',
      offset: [0, -10],
      className: 'leaflet-custom-tooltip'
    });
    return marker;
  });

  // --- Cinematic Sequence Logic ---
  let isHovered = false;

  mapContainer.addEventListener('mouseenter', () => { isHovered = true; });
  mapContainer.addEventListener('mouseleave', () => { isHovered = false; });
  mapContainer.addEventListener('touchstart', () => { isHovered = true; }, {passive: true});

  async function cinematicWait(ms) {
    let elapsed = 0;
    while (elapsed < ms) {
      if (!isHovered) {
        elapsed += 100;
      }
      await new Promise(r => setTimeout(r, 100));
    }
  }

  async function runCinematicLoop() {
    // Initial delay before starting the loop
    await cinematicWait(1500);

    while (true) {
      // Phase 1: UK View
      map.flyTo(LOCATIONS[0].coords, 6, { duration: 2.0 });
      await cinematicWait(2500); // let it arrive, wait for user
      markers[0].openTooltip();
      await cinematicWait(2500); // read time
      markers[0].closeTooltip();

      // Phase 2: Intercontinental Flight to Vadodara
      map.flyTo(LOCATIONS[1].coords, 12, { duration: 3.5 });
      await cinematicWait(4000); 
      markers[1].openTooltip();
      await cinematicWait(3000); // read time
      markers[1].closeTooltip();

      // Phase 3: Transition across Vadodara to GSV
      map.flyTo(LOCATIONS[2].coords, 14, { duration: 2.0 });
      await cinematicWait(2500);
      markers[2].openTooltip();
      await cinematicWait(3000); // read time
      markers[2].closeTooltip();

      // Phase 4: Reset to full world view
      map.flyTo([35, 38], 3, { duration: 3.0 });
      await cinematicWait(4000);
    }
  }

  // Allow manual control
  map.on('mousedown', () => { isHovered = true; });
  map.on('mouseup', () => { isHovered = false; });
  map.on('dragstart', () => { isHovered = true; });

  // Start the loop
  runCinematicLoop();
});
