import { useEffect, useRef } from "react";
import mapboxgl from "mapbox-gl";

mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN;

export default function MapView({ walkerLat, walkerLng, ownerLat, ownerLng, height = 220 }) {
  const mapContainer = useRef(null);
  const map          = useRef(null);
  const walkerMarker = useRef(null);
  const ownerMarker  = useRef(null);

  useEffect(() => {
    if (map.current) return;

    // Iniciar mapa centrado en Viña del Mar por defecto
    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: "mapbox://styles/mapbox/streets-v12",
      center: [-71.5518, -33.0245],
      zoom: 14,
    });

    map.current.addControl(new mapboxgl.NavigationControl(), "top-right");

    // Pedir ubicación real del usuario y centrar el mapa
    navigator.geolocation?.getCurrentPosition((pos) => {
      const lat = pos.coords.latitude;
      const lng = pos.coords.longitude;

      map.current.flyTo({ center: [lng, lat], zoom: 15 });

      // Marker del dueño
      const ownerEl = document.createElement("div");
      ownerEl.innerHTML = "🏠";
      ownerEl.style.fontSize = "28px";

      if (ownerMarker.current) ownerMarker.current.remove();
      ownerMarker.current = new mapboxgl.Marker({ element: ownerEl })
        .setLngLat([lng, lat])
        .setPopup(new mapboxgl.Popup().setText("Tu ubicación"))
        .addTo(map.current);
    });

  }, []);

  // Actualizar posición del paseador en tiempo real
  useEffect(() => {
    if (!map.current || !walkerLat || !walkerLng) return;

    const walkerEl = document.createElement("div");
    walkerEl.innerHTML = "🦮";
    walkerEl.style.fontSize = "28px";

    if (walkerMarker.current) {
      walkerMarker.current.setLngLat([walkerLng, walkerLat]);
    } else {
      walkerMarker.current = new mapboxgl.Marker({ element: walkerEl })
        .setLngLat([walkerLng, walkerLat])
        .setPopup(new mapboxgl.Popup().setText("Paseador"))
        .addTo(map.current);
    }

    // Centrar entre dueño y paseador
    if (ownerLat && ownerLng) {
      const bounds = new mapboxgl.LngLatBounds();
      bounds.extend([walkerLng, walkerLat]);
      bounds.extend([ownerLng, ownerLat]);
      map.current.fitBounds(bounds, { padding: 60, maxZoom: 16 });
    }

  }, [walkerLat, walkerLng]);

  // Actualizar marker del dueño si llegan coordenadas reales
  useEffect(() => {
    if (!map.current || !ownerLat || !ownerLng) return;

    const ownerEl = document.createElement("div");
    ownerEl.innerHTML = "🏠";
    ownerEl.style.fontSize = "28px";

    if (ownerMarker.current) {
      ownerMarker.current.setLngLat([ownerLng, ownerLat]);
    } else {
      ownerMarker.current = new mapboxgl.Marker({ element: ownerEl })
        .setLngLat([ownerLng, ownerLat])
        .setPopup(new mapboxgl.Popup().setText("Tu ubicación"))
        .addTo(map.current);
    }

    map.current.flyTo({ center: [ownerLng, ownerLat], zoom: 15 });

  }, [ownerLat, ownerLng]);

  return <div ref={mapContainer} style={{ height, width: "100%" }} />;
}
