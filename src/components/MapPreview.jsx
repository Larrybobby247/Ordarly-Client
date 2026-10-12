import { useEffect, useRef, useState } from 'react';

const TOKEN = import.meta.env.VITE_MAPBOX_PUBLIC_TOKEN;
export const mapEnabled = !!TOKEN;

// A circle (as a polygon) around a point, radius in km. Good enough for delivery distances.
function circle(lat, lng, km, steps = 64) {
  const pts = [];
  for (let i = 0; i <= steps; i += 1) {
    const a = (i / steps) * 2 * Math.PI;
    const dLat = (km / 111.32) * Math.cos(a);
    const dLng = (km / (111.32 * Math.cos((lat * Math.PI) / 180))) * Math.sin(a);
    pts.push([lng + dLng, lat + dLat]);
  }
  return { type: 'Feature', geometry: { type: 'Polygon', coordinates: [pts] } };
}

/**
 * Small interactive Mapbox map.
 *  origin: {lat,lng}  the restaurant pin     radiusKm: draws the delivery circle
 *  dest:   {lat,lng}  the customer pin       height: CSS height
 * Renders nothing when no public token is set. Mapbox GL is loaded only when needed.
 */
export default function MapPreview({ origin, dest, radiusKm, height = 260, label = 'Map' }) {
  const box = useRef(null); const map = useRef(null); const marks = useRef([]); const [ready, setReady] = useState(false); const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!TOKEN || !origin || !box.current) return undefined;
    let dead = false;
    (async () => {
      try {
        const [{ default: mapboxgl }] = await Promise.all([import('mapbox-gl'), import('mapbox-gl/dist/mapbox-gl.css')]);
        if (dead || !box.current) return;
        mapboxgl.accessToken = TOKEN;
        const m = new mapboxgl.Map({ container: box.current, style: 'mapbox://styles/mapbox/streets-v12', center: [origin.lng, origin.lat], zoom: 12, attributionControl: true });
        m.addControl(new mapboxgl.NavigationControl({ showCompass: false }), 'top-right');
        m.on('load', () => { if (!dead) { map.current = { m, mapboxgl }; setReady(true); } });
        m.on('error', () => { if (!dead) setFailed(true); });
        map.current = { m, mapboxgl };
      } catch { if (!dead) setFailed(true); }
    })();
    return () => { dead = true; marks.current.forEach((x) => x.remove()); marks.current = []; try { map.current?.m.remove(); } catch { /* already gone */ } map.current = null; setReady(false); };
    // The map is created once per container. Pins/circle are updated by the effect below.
  }, [!!origin]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const c = map.current; if (!ready || !c || !origin) return;
    const { m, mapboxgl } = c;
    marks.current.forEach((x) => x.remove()); marks.current = [];
    marks.current.push(new mapboxgl.Marker({ color: '#e8532f' }).setLngLat([origin.lng, origin.lat]).setPopup(new mapboxgl.Popup({ offset: 24 }).setText('Restaurant')).addTo(m));
    if (dest) marks.current.push(new mapboxgl.Marker({ color: '#16a34a' }).setLngLat([dest.lng, dest.lat]).setPopup(new mapboxgl.Popup({ offset: 24 }).setText('Delivery address')).addTo(m));

    const data = radiusKm ? circle(origin.lat, origin.lng, radiusKm) : { type: 'FeatureCollection', features: [] };
    if (m.getSource('radius')) m.getSource('radius').setData(data);
    else {
      m.addSource('radius', { type: 'geojson', data });
      m.addLayer({ id: 'radius-fill', type: 'fill', source: 'radius', paint: { 'fill-color': '#e8532f', 'fill-opacity': 0.1 } });
      m.addLayer({ id: 'radius-line', type: 'line', source: 'radius', paint: { 'line-color': '#e8532f', 'line-width': 2, 'line-dasharray': [2, 2] } });
    }
    const b = new mapboxgl.LngLatBounds([origin.lng, origin.lat], [origin.lng, origin.lat]);
    if (dest) b.extend([dest.lng, dest.lat]);
    if (radiusKm && !dest) { circle(origin.lat, origin.lng, radiusKm).geometry.coordinates[0].forEach((p) => b.extend(p)); }
    m.fitBounds(b, { padding: 40, maxZoom: 15, duration: 600 });
  }, [ready, origin?.lat, origin?.lng, dest?.lat, dest?.lng, radiusKm]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!TOKEN || !origin || failed) return null;
  return <div ref={box} role="region" aria-label={label} style={{ height }} className="w-full overflow-hidden rounded-2xl border border-black/10" />;
}
