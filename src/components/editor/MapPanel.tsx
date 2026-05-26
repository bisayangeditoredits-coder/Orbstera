'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { usePresentationStore } from '@/store/usePresentationStore';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Search, Loader2, ArrowRight, CheckCircle2, Map, MapPin, ZoomIn, ZoomOut } from 'lucide-react';

// ─── Tile math ─────────────────────────────────────────────────────────────────
function lonToTileX(lon: number, zoom: number) {
  return (lon + 180) / 360 * Math.pow(2, zoom);
}
function latToTileY(lat: number, zoom: number) {
  const r = lat * Math.PI / 180;
  return (1 - Math.log(Math.tan(r) + 1 / Math.cos(r)) / Math.PI) / 2 * Math.pow(2, zoom);
}

function getTileUrl(style: string, tx: number, ty: number, zoom: number): string {
  const tz = Math.floor(tx), tyf = Math.floor(ty);
  const sub = ['a', 'b', 'c'][Math.abs(tz + tyf) % 3];
  switch (style) {
    case 'satellite':
      return `https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/${zoom}/${tyf}/${tz}`;
    case 'terrain':
      return `https://${sub}.tile.opentopomap.org/${zoom}/${tz}/${tyf}.png`;
    default:
      return `https://${sub}.tile.openstreetmap.org/${zoom}/${tz}/${tyf}.png`;
  }
}

/** Stitch tiles onto a hidden canvas and return a data URL */
async function renderMapToDataUrl(
  lat: number, lon: number, zoom: number, style: string,
  outW: number, outH: number,
): Promise<string> {
  const TILE = 256;
  const cx = lonToTileX(lon, zoom);
  const cy = latToTileY(lat, zoom);

  // How many tiles around the centre we need
  const halfW = outW / 2;
  const halfH = outH / 2;
  const tileOffX = cx - Math.floor(cx); // fractional part (pixel offset inside centre tile)
  const tileOffY = cy - Math.floor(cy);

  // Integer tile indices of the centre tile
  const ctX = Math.floor(cx);
  const ctY = Math.floor(cy);

  // Canvas pixel where the centre tile's top-left corner sits
  const originX = halfW - tileOffX * TILE;
  const originY = halfH - tileOffY * TILE;

  const canvas = document.createElement('canvas');
  canvas.width = outW;
  canvas.height = outH;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#e8e8e8';
  ctx.fillRect(0, 0, outW, outH);

  const maxTile = Math.pow(2, zoom);
  const tilesX = Math.ceil(outW / TILE) + 2;
  const tilesY = Math.ceil(outH / TILE) + 2;

  // Collect all tiles we need
  const promises: Promise<void>[] = [];
  for (let dy = -Math.ceil(tilesY / 2); dy <= Math.ceil(tilesY / 2); dy++) {
    for (let dx = -Math.ceil(tilesX / 2); dx <= Math.ceil(tilesX / 2); dx++) {
      const tx = ((ctX + dx) % maxTile + maxTile) % maxTile;
      const ty = ctY + dy;
      if (ty < 0 || ty >= maxTile) continue;

      const url = getTileUrl(style, tx, ty, zoom);
      const px = Math.round(originX + dx * TILE);
      const py = Math.round(originY + dy * TILE);

      promises.push(new Promise<void>((resolve) => {
        const img = new window.Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
          ctx.drawImage(img, px, py, TILE, TILE);
          resolve();
        };
        img.onerror = () => resolve(); // skip failed tiles gracefully
        img.src = url;
      }));
    }
  }

  await Promise.all(promises);

  // Draw a pin at the exact centre
  const pinX = halfW;
  const pinY = halfH;

  // Pin shadow
  ctx.beginPath();
  ctx.arc(pinX, pinY + 1, 9, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  ctx.fill();

  // White ring
  ctx.beginPath();
  ctx.arc(pinX, pinY, 9, 0, Math.PI * 2);
  ctx.fillStyle = '#ffffff';
  ctx.fill();

  // Inner dot
  ctx.beginPath();
  ctx.arc(pinX, pinY, 6, 0, Math.PI * 2);
  ctx.fillStyle = '#4f46e5';
  ctx.fill();

  return canvas.toDataURL('image/png');
}

// ─── Leaflet iframe preview (always works for preview) ───────────────────────
function getTileTemplate(style: string): string {
  switch (style) {
    case 'satellite':
      return 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';
    case 'terrain':
      return 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png';
    default:
      return 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
  }
}

function buildLeafletHtml(lat: number, lon: number, zoom: number, style: string): string {
  const tileUrl = getTileTemplate(style);
  const isSatellite = style === 'satellite';
  const tileLayer = isSatellite
    ? `L.tileLayer('${tileUrl}', { maxZoom: 19 })`
    : `L.tileLayer('${tileUrl}', { maxZoom: 19, subdomains: 'abc' })`;
  return `<!DOCTYPE html>
<html><head>
<meta charset="utf-8"/>
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<style>*{margin:0;padding:0;box-sizing:border-box}html,body,#map{width:100%;height:100%}.leaflet-control-zoom,.leaflet-control-attribution{display:none!important}</style>
</head><body>
<div id="map"></div>
<script>
var map=L.map('map',{zoomControl:false,attributionControl:false}).setView([${lat},${lon}],${zoom});
${tileLayer}.addTo(map);
L.circleMarker([${lat},${lon}],{radius:8,color:'#fff',weight:3,fillColor:'#4f46e5',fillOpacity:1}).addTo(map);
</script></body></html>`;
}

// ─── Map styles ───────────────────────────────────────────────────────────────
const MAP_STYLES = [
  { id: 'standard',  label: 'Standard',  thumb: 'ðŸ—ºï¸' },
  { id: 'satellite', label: 'Satellite', thumb: 'ðŸ›°ï¸' },
  { id: 'terrain',   label: 'Terrain',   thumb: 'ðŸ”ï¸' },
];

// ─── Component ────────────────────────────────────────────────────────────────
export function MapPanel({ onClose }: { onClose?: () => void }) {
  const addElement        = usePresentationStore((s) => s.addElement);
  const currentSlideIndex = usePresentationStore((s) => s.currentSlideIndex);
  const presentation      = usePresentationStore((s) => s.presentation);

  const [query, setQuery]       = useState('');
  const [loading, setLoading]   = useState(false);
  const [inserting, setInserting] = useState(false);
  const [error, setError]       = useState('');
  const [result, setResult]     = useState<{ lat: number; lon: number; name: string } | null>(null);
  const [zoom, setZoom]         = useState(12);
  const [mapStyle, setMapStyle] = useState('standard');
  const [inserted, setInserted] = useState(false);

  const [predictions, setPredictions] = useState<any[]>([]);
  const [showPredictions, setShowPredictions] = useState(false);

  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Rebuild iframe whenever location/zoom/style changes
  const iframeHtml = result ? buildLeafletHtml(result.lat, result.lon, zoom, mapStyle) : null;

  useEffect(() => {
    if (!iframeRef.current || !iframeHtml) return;
    const doc = iframeRef.current.contentDocument;
    if (doc) { doc.open(); doc.write(iframeHtml); doc.close(); }
  }, [iframeHtml]);

  useEffect(() => {
    const timer = setTimeout(async () => {
      if (query.trim().length > 2) {
        try {
          const res = await fetch(`https://photon.komoot.io/api/?q=${encodeURIComponent(query)}&limit=5`);
          const data = await res.json();
          setPredictions(data.features || []);
          setShowPredictions(true);
        } catch {
          // ignore
        }
      } else {
        setPredictions([]);
        setShowPredictions(false);
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [query]);

  const selectPrediction = useCallback((p: any) => {
    const lon = p.geometry.coordinates[0];
    const lat = p.geometry.coordinates[1];
    const props = p.properties;
    const displayName = [props.name, props.city || props.county, props.state, props.country]
      .filter((v, i, a) => v && a.indexOf(v) === i)
      .join(', ');

    setQuery(displayName);
    setShowPredictions(false);
    setResult({ lat, lon, name: displayName });
    setError('');
  }, []);

  const search = useCallback(async () => {
    if (!query.trim()) return;
    setLoading(true); setError(''); setResult(null);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1`,
        { headers: { 'Accept-Language': 'en' } }
      );
      const data = await res.json();
      if (!data.length) { setError('Location not found. Try a different search.'); return; }
      setResult({ lat: parseFloat(data[0].lat), lon: parseFloat(data[0].lon), name: data[0].display_name });
    } catch {
      setError('Search failed. Check your connection.');
    } finally { setLoading(false); }
  }, [query]);

  const handleInsert = useCallback(async () => {
    if (!result || currentSlideIndex === null || !presentation) return;
    const slide = presentation.slides[currentSlideIndex];
    if (!slide) return;

    setInserting(true);
    try {
      // Render 1100Ã—600 map as data URL by stitching tiles on canvas
      const dataUrl = await renderMapToDataUrl(result.lat, result.lon, zoom, mapStyle, 1100, 600);

      addElement(slide.id, {
        id: `el-map-${Date.now()}`,
        type: 'image',
        x: 90, y: 60,
        width: 1100, height: 600,
        src: dataUrl,
        zIndex: 5,
      } as any);

      // Location label below
      addElement(slide.id, {
        id: `el-map-lbl-${Date.now()}`,
        type: 'text',
        x: 90, y: 672,
        width: 1100, height: 34,
        content: `ðŸ“  ${result.name.split(',').slice(0, 3).join(', ')}`,
        textStyle: {
          fontSize: 13, fontWeight: 'normal', color: '#6B7280',
          textAlign: 'left', lineHeight: 1.4, fontFamily: 'Inter',
        },
        zIndex: 6,
      } as any);

      setInserted(true);
      setTimeout(() => setInserted(false), 2200);
    } catch {
      setError('Failed to render map. Try again.');
    } finally {
      setInserting(false);
    }
  }, [result, zoom, mapStyle, currentSlideIndex, presentation, addElement]);

  return (
    <div className="flex flex-col h-full bg-white overflow-hidden">

      {/* Header */}
      <div className="shrink-0 bg-white border-b border-neutral-100 px-4 pt-4 pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-neutral-100 flex items-center justify-center">
              <Map size={15} className="text-neutral-500" strokeWidth={2} />
            </div>
            <div>
              <h2 className="text-[13px] font-bold text-neutral-900 leading-none">Map Inserter</h2>
              <p className="text-[10px] text-neutral-400 mt-0.5 font-semibold">OpenStreetMap Â· Free</p>
            </div>
          </div>
          {onClose && (
            <button onClick={onClose}
              className="w-7 h-7 rounded-lg text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 flex items-center justify-center transition-all">
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto bg-[#F7F8FA]" style={{ scrollbarWidth: 'none' }}>
        <div className="px-4 pt-4 pb-6 space-y-3">

          <div className="flex gap-2 relative">
            <div className="relative flex-1">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 pointer-events-none" />
              <input
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  if (result) setResult(null);
                }}
                onKeyDown={(e) => e.key === 'Enter' && search()}
                onFocus={() => { if (predictions.length) setShowPredictions(true); }}
                onBlur={() => setTimeout(() => setShowPredictions(false), 200)}
                placeholder="Search any city, place, address…"
                className="w-full h-10 bg-white border border-neutral-200 rounded-xl pl-8 pr-3 text-[13px] font-medium text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:border-neutral-400 transition-all"
              />
            </div>
            <button onClick={search} disabled={!query.trim() || loading}
              className="h-10 w-10 rounded-xl bg-neutral-900 flex items-center justify-center shrink-0 hover:bg-neutral-700 transition-all disabled:opacity-40">
              {loading
                ? <Loader2 size={14} className="animate-spin text-white" />
                : <ArrowRight size={14} className="text-white" />}
            </button>

            {/* Predictions Dropdown */}
            <AnimatePresence>
              {showPredictions && predictions.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  className="absolute top-full left-0 right-12 mt-2 bg-white rounded-xl shadow-xl border border-neutral-200 overflow-hidden z-50 flex flex-col"
                >
                  {predictions.map((p, i) => {
                    const props = p.properties;
                    const title = props.name || props.city || props.county || 'Unknown location';
                    const subtitle = [props.city || props.county, props.state, props.country].filter((v, i, a) => v && v !== title && a.indexOf(v) === i).join(', ');
                    return (
                      <button
                        key={i}
                        onClick={() => selectPrediction(p)}
                        className="flex items-start gap-3 px-3 py-2.5 text-left hover:bg-neutral-50 border-b border-neutral-100 last:border-0 transition-colors"
                      >
                        <MapPin size={13} className="text-neutral-400 mt-0.5 shrink-0" />
                        <div>
                          <p className="text-[12px] font-bold text-neutral-800 leading-none mb-1">{title}</p>
                          {subtitle && <p className="text-[10px] text-neutral-400 leading-none">{subtitle}</p>}
                        </div>
                      </button>
                    );
                  })}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {error && <p className="text-[12px] text-red-400 text-center py-1">{error}</p>}

          {result && (
            <AnimatePresence>
              <motion.div key="result" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>

                {/* Location chip */}
                <div className="flex items-start gap-2 bg-white border border-neutral-200 rounded-xl px-3 py-2.5 mb-3">
                  <MapPin size={13} className="text-neutral-400 mt-0.5 shrink-0" />
                  <p className="text-[11px] text-neutral-600 font-semibold leading-relaxed line-clamp-2">
                    {result.name}
                  </p>
                </div>

                {/* Style picker */}
                <div className="flex gap-2 mb-3">
                  {MAP_STYLES.map((s) => (
                    <button key={s.id} onClick={() => setMapStyle(s.id)}
                      className={`flex-1 flex flex-col items-center py-2 rounded-xl border text-[10px] font-bold transition-all ${
                        mapStyle === s.id
                          ? 'bg-neutral-900 text-white border-neutral-900'
                          : 'bg-white text-neutral-500 border-neutral-200 hover:border-neutral-400'
                      }`}>
                      <span className="text-base mb-0.5">{s.thumb}</span>
                      {s.label}
                    </button>
                  ))}
                </div>

                {/* Zoom */}
                <div className="bg-white border border-neutral-200 rounded-xl p-3 mb-3">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-[10px] font-bold text-neutral-400">Zoom Level</p>
                    <div className="flex items-center gap-2">
                      <button onClick={() => setZoom((z) => Math.max(2, z - 1))}
                        className="w-6 h-6 rounded-lg bg-neutral-100 flex items-center justify-center hover:bg-neutral-200 transition-all">
                        <ZoomOut size={11} className="text-neutral-600" />
                      </button>
                      <span className="text-[11px] font-mono font-bold text-neutral-700 w-5 text-center">{zoom}</span>
                      <button onClick={() => setZoom((z) => Math.min(18, z + 1))}
                        className="w-6 h-6 rounded-lg bg-neutral-100 flex items-center justify-center hover:bg-neutral-200 transition-all">
                        <ZoomIn size={11} className="text-neutral-600" />
                      </button>
                    </div>
                  </div>
                  <input type="range" min="2" max="18" value={zoom}
                    onChange={(e) => setZoom(Number(e.target.value))}
                    className="w-full accent-neutral-900" />
                  <div className="flex justify-between mt-1">
                    <span className="text-[9px] text-neutral-400">World</span>
                    <span className="text-[9px] text-neutral-400">Street</span>
                  </div>
                </div>

                {/* Live Leaflet preview (iframe) */}
                <div className="rounded-xl overflow-hidden border border-neutral-200 mb-3"
                  style={{ height: 220 }}>
                  <iframe
                    ref={iframeRef}
                    title="Map Preview"
                    className="w-full h-full border-0 block"
                    sandbox="allow-scripts allow-same-origin"
                  />
                </div>

                <p className="text-[10px] text-neutral-400 text-center mb-3">
                  Preview Â· Map will be stitched as image when inserted
                </p>

                {/* Insert button */}
                <AnimatePresence mode="wait">
                  {inserted ? (
                    <motion.div key="done"
                      initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
                      className="h-12 rounded-2xl bg-neutral-900 flex items-center justify-center gap-2 shadow-md">
                      <CheckCircle2 size={15} className="text-white" />
                      <span className="text-white font-bold text-[13px]">Added to Slide!</span>
                    </motion.div>
                  ) : (
                    <motion.button key="insert"
                      initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
                      onClick={handleInsert}
                      disabled={inserting}
                      whileHover={{ scale: inserting ? 1 : 1.015 }}
                      whileTap={{ scale: 0.98 }}
                      className="w-full h-12 rounded-2xl bg-neutral-900 text-white font-bold text-[13px] hover:bg-neutral-800 transition-all disabled:opacity-60 flex items-center justify-center gap-2 shadow-md">
                      {inserting
                        ? <><Loader2 size={15} className="animate-spin" /> Rendering map…</>
                        : <><ArrowRight size={15} strokeWidth={2.5} /> Insert Map into Slide</>}
                    </motion.button>
                  )}
                </AnimatePresence>

              </motion.div>
            </AnimatePresence>
          )}

          {/* Empty state */}
          {!result && !loading && !error && (
            <div className="flex flex-col items-center text-center opacity-30 mt-10 gap-2">
              <Map size={30} strokeWidth={1.3} className="text-neutral-400" />
              <p className="text-[11px] text-neutral-500 font-medium leading-relaxed">
                Search any location to insert<br />a real map into your slide
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
