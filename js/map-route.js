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
      tooltip: '<strong>Soar Valley College (Leicester, UK)</strong><br><span style="color: var(--accent-primary);">Year 11 · 7 Grade 9s (GCSE)</span>'
    },
    {
      id: 'dps-harni',
      coords: [22.3564, 73.2243], // DPS Harni, Vadodara, India
      tooltip: '<strong>DPS Harni (Vadodara, India)</strong><br><span style="color: var(--accent-primary);">12th Standard</span><br>Score: 435/500<br>JEE Main: 50,000 Rank (96.6 %ile)'
    },
    {
      id: 'gsv',
      coords: [22.2768, 73.1906], // GSV, Vadodara, India
      tooltip: '<strong>Gati Shakti Vishwavidyalaya</strong><br><span style="color: var(--accent-primary);">B.Tech AI & DS, Transportation & Logistics</span><br>CGPA: 8.80<br>GATE 2027 DA Aspirant · LeetCode: 160+ Solved'
    }
  ];

  // Initialize Leaflet Map (remove attribution watermark)
  const map = L.map('map-leaflet', {
    zoomControl: false,
    scrollWheelZoom: false,
    attributionControl: false 
  }).setView([35, 38], 3);

  // Theming Tiles — Esri's keyless "Canvas" basemaps (no API key, no rate
  // limit). Previously CARTO's basemaps.cartocdn.com, which started
  // requiring a registered API key in Aug 2026 and now watermarks
  // anonymous requests with "API KEY REQUIRED".
  const darkTilesUrl = 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}';
  const lightTilesUrl = 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}';
  const tileOptions = {
    maxZoom: 20,
    maxNativeZoom: 16, // Esri's canvas tiles top out at 16; Leaflet upsamples past this
    attribution: '&copy; <a href="https://www.esri.com/" target="_blank" rel="noopener">Esri</a>',
  };

  const isLight = document.documentElement.getAttribute('data-theme') === 'light';
  let currentLayer = L.tileLayer(isLight ? lightTilesUrl : darkTilesUrl, tileOptions).addTo(map);

  // Watch for theme updates and swap tiles
  window.addEventListener('theme-changed', () => {
    const isLightNow = document.documentElement.getAttribute('data-theme') === 'light';
    const newLayer = L.tileLayer(isLightNow ? lightTilesUrl : darkTilesUrl, tileOptions);

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
  // The tour only plays while the map is on screen. Every time it comes back into view
  // it restarts from the beginning: world view -> Soar Valley College (England) -> Vadodara -> GSV.
  const WORLD_VIEW = [35, 38];
  let isHovered = false;
  let runToken = 0;      // bumping this cancels whatever sequence is currently running
  let running = false;

  mapContainer.addEventListener('mouseenter', () => { isHovered = true; });
  mapContainer.addEventListener('mouseleave', () => { isHovered = false; });
  mapContainer.addEventListener('touchstart', () => { isHovered = true; }, { passive: true });

  // Resolves true when the wait finished, false when this run was cancelled meanwhile.
  async function wait(ms, token) {
    let elapsed = 0;
    while (elapsed < ms) {
      if (token !== runToken) return false;
      if (!isHovered) elapsed += 100;
      await new Promise((r) => setTimeout(r, 100));
    }
    return token === runToken;
  }

  function closeAllTooltips() { markers.forEach((m) => m.closeTooltip()); }

  // Tell the page which stop the tour is on (-1 = world view) so the About
  // timeline can follow along. Purely additive: nothing depends on it.
  function announce(index) {
    window.dispatchEvent(new CustomEvent('about:stop', { detail: { index } }));
  }
  let mapVisible = false;
  let resumeTimer = 0;

  async function runSequence(token) {
    map.invalidateSize();
    map.stop();
    closeAllTooltips();
    map.setView(WORLD_VIEW, 3, { animate: false });   // always begin from the same frame
    announce(-1);
    if (!(await wait(500, token))) return;

    while (true) {
      // Phase 1: England — Soar Valley College
      announce(0);
      map.flyTo(LOCATIONS[0].coords, 6, { duration: 2.0 });
      if (!(await wait(2500, token))) return;
      markers[0].openTooltip();
      if (!(await wait(2500, token))) return;
      markers[0].closeTooltip();

      // Phase 2: Intercontinental flight to Vadodara
      announce(1);
      map.flyTo(LOCATIONS[1].coords, 12, { duration: 3.5 });
      if (!(await wait(4000, token))) return;
      markers[1].openTooltip();
      if (!(await wait(3000, token))) return;
      markers[1].closeTooltip();

      // Phase 3: Across Vadodara to GSV
      announce(2);
      map.flyTo(LOCATIONS[2].coords, 14, { duration: 2.0 });
      if (!(await wait(2500, token))) return;
      markers[2].openTooltip();
      if (!(await wait(3000, token))) return;
      markers[2].closeTooltip();

      // Phase 4: Back out to the world view, then loop from England again
      announce(-1);
      map.flyTo(WORLD_VIEW, 3, { duration: 3.0 });
      if (!(await wait(4000, token))) return;
    }
  }

  function startTour() {
    if (running) return;
    running = true;
    runSequence(++runToken);
  }

  function stopTour() {
    if (!running) return;
    running = false;
    runToken++;            // cancels the loop at its next wait
    isHovered = false;
    map.stop();
    closeAllTooltips();
    announce(-1);
  }

  // Timeline click -> fly to that stop, then hand control back to the tour.
  window.addEventListener('about:goto', (e) => {
    const i = e.detail && e.detail.index;
    if (typeof i !== 'number' || !LOCATIONS[i]) return;
    stopTour();
    clearTimeout(resumeTimer);
    map.invalidateSize();
    announce(i);
    const zoom = i === 0 ? 6 : (i === 1 ? 12 : 14);
    map.flyTo(LOCATIONS[i].coords, zoom, { duration: 1.8 });
    setTimeout(() => markers[i] && markers[i].openTooltip(), 1900);
    resumeTimer = setTimeout(() => { if (mapVisible && !running) startTour(); }, 9000);
  });

  // Allow manual control
  map.on('mousedown', () => { isHovered = true; });
  map.on('mouseup', () => { isHovered = false; });
  map.on('dragstart', () => { isHovered = true; });

  // Start when the map is (mostly) on screen; stop once it has scrolled away.
  if ('IntersectionObserver' in window) {
    new IntersectionObserver((entries) => {
      const ratio = entries[0].intersectionRatio;
      mapVisible = entries[0].isIntersecting && ratio >= 0.1;
      if (entries[0].isIntersecting && ratio >= 0.4) startTour();
      else if (!entries[0].isIntersecting || ratio < 0.1) stopTour();
    }, { threshold: [0, 0.1, 0.4] }).observe(mapContainer);
  } else {
    startTour();
  }
});
