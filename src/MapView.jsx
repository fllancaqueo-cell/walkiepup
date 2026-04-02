import { useEffect, useRef } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";

mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN;

// ── Mapa simple — muestra ubicación del usuario y paseador ─────────
export default function MapView({ walkerLat, walkerLng, ownerLat, ownerLng, height = 220 }) {
  const mapContainer = useRef(null);
  const map          = useRef(null);
  const walkerMarker = useRef(null);
  const ownerMarker  = useRef(null);

  // Coordenadas por defecto (Viña del Mar, Chile)
  const defaultLat = ownerLat ?? -33.0245;
  const defaultLng = ownerLng ?? -71.5518;

  useEffect(() => {
    if (map.current) return;

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: "mapbox://styles/mapbox/streets-v12",
      center: [defaultLng, defaultLat],
      zoom: 14,
    });

    map.current.addControl(new mapboxgl.NavigationControl(), "top-right");

    // Marker del dueño (naranja)
    const ownerEl = document.createElement("div");
    ownerEl.innerHTML = "🏠";
    ownerEl.style.fontSize = "28px";
    ownerEl.style.cursor = "pointer";

    ownerMarker.current = new mapboxgl.Marker({ element: ownerEl })
      .setLngLat([defaultLng, defaultLat])
      .setPopup(new mapboxgl.Popup().setText("Tu ubicación"))
      .addTo(map.current);

    // Marker del paseador (si hay coordenadas)
    if (walkerLat && walkerLng) {
      const walkerEl = document.createElement("div");
      walkerEl.innerHTML = "🦮";
      walkerEl.style.fontSize = "28px";
      walkerEl.style.cursor = "pointer";

      walkerMarker.current = new mapboxgl.Marker({ element: walkerEl })
        .setLngLat([walkerLng, walkerLat])
        .setPopup(new mapboxgl.Popup().setText("Paseador"))
        .addTo(map.current);
    }
  }, []);

  // Actualizar posición del paseador en tiempo real
  useEffect(() => {
    if (!map.current || !walkerLat || !walkerLng) return;

    if (walkerMarker.current) {
      walkerMarker.current.setLngLat([walkerLng, walkerLat]);
    } else {
      const walkerEl = document.createElement("div");
      walkerEl.innerHTML = "🦮";
      walkerEl.style.fontSize = "28px";

      walkerMarker.current = new mapboxgl.Marker({ element: walkerEl })
        .setLngLat([walkerLng, walkerLat])
        .setPopup(new mapboxgl.Popup().setText("Paseador"))
        .addTo(map.current);
    }

    // Centrar mapa entre dueño y paseador
    const bounds = new mapboxgl.LngLatBounds();
    bounds.extend([walkerLng, walkerLat]);
    bounds.extend([defaultLng, defaultLat]);
    map.current.fitBounds(bounds, { padding: 60, maxZoom: 16 });

  }, [walkerLat, walkerLng]);

  return (
    <div ref={mapContainer} style={{ height, width: "100%" }} />
  );
}
