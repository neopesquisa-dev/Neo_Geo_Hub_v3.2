
import React, { useEffect, useRef, useState } from 'react';
import { Layer, GeoImage, PhotoLayer } from '../types';
import * as L from 'leaflet';
import { Navigation, AlertTriangle } from 'lucide-react';

interface MapViewProps {
  layers: Layer[];
  onUpdateImage?: (layerId: string, imageId: string, updates: Partial<GeoImage>) => void;
  onSelectImage: (img: GeoImage) => void;
}

const MapView: React.FC<MapViewProps> = ({ layers, onUpdateImage, onSelectImage }) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const layerGroupRef = useRef<L.LayerGroup | null>(null);
  
  const [coords, setCoords] = useState<{lat: number, lng: number} | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  
  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    // Default view: Rio de Janeiro 
    const initialLat = -22.9068;
    const initialLng = -43.1729;

    // Base Layers
    const satellite = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
        attribution: 'Tiles &copy; Esri',
        maxZoom: 19
    });

    const dark = L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; CARTO',
        maxZoom: 20,
        subdomains: 'abcd'
    });

    const street = L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; CARTO',
        maxZoom: 20,
        subdomains: 'abcd'
    });

    const map = L.map(mapContainerRef.current, {
        zoomControl: false,
        attributionControl: false,
        layers: [satellite],
        crs: L.CRS.EPSG3857 // Default Web Mercator
    }).setView([initialLat, initialLng], 14);

    L.control.layers({ "Satellite": satellite, "Dark": dark, "Street": street }, undefined, { position: 'topright' }).addTo(map);
    L.control.zoom({ position: 'topleft' }).addTo(map);

    mapInstanceRef.current = map;
    layerGroupRef.current = L.layerGroup().addTo(map); 

    map.on('mousemove', (e) => setCoords({ lat: e.latlng.lat, lng: e.latlng.lng }));

    return () => {
        map.remove();
        mapInstanceRef.current = null;
    };
  }, []);

  // --- MARKERS RENDER ---
  useEffect(() => {
    if (!mapInstanceRef.current || !layerGroupRef.current) return;
    layerGroupRef.current.clearLayers();
    
    const photoLayers = layers.filter(l => l.visible && l.type === 'PHOTO_SET') as PhotoLayer[];
    const bounds = L.latLngBounds([]);
    let hasImages = false;

    photoLayers.forEach(layer => {
        layer.images.forEach(img => {
            if (img.lat && img.lng) {
                hasImages = true;
                bounds.extend([img.lat, img.lng]);
                
                const iconHtml = `
                    <div class="marker-pin w-10 h-14 flex flex-col items-center cursor-pointer group relative">
                        <div class="w-10 h-8 bg-black border-2 ${img.analysis ? 'border-green-500' : 'border-white'} rounded overflow-hidden relative z-10 hover:border-cyan-500 transition-colors">
                            <img src="${img.url}" class="w-full h-full object-cover" />
                        </div>
                        <div class="w-0.5 h-3 bg-white group-hover:bg-cyan-500"></div>
                        <div class="w-1.5 h-1.5 bg-white rounded-full shadow-[0_0_5px_black]"></div>
                    </div>
                `;
                const icon = L.divIcon({ className: 'custom-marker-icon', html: iconHtml, iconSize: [40, 56], iconAnchor: [20, 56], popupAnchor: [0, -50] });
                const marker = L.marker([img.lat, img.lng], { icon }).bindPopup(`<div class='font-bold text-xs'>${img.filename}</div>`);
                
                marker.on('click', () => {
                     mapInstanceRef.current?.setView([img.lat, img.lng], 19);
                     onSelectImage(img);
                });
                layerGroupRef.current?.addLayer(marker);
            }
        });
    });

    if (hasImages && bounds.isValid()) {
        mapInstanceRef.current.fitBounds(bounds, { padding: [50, 50], maxZoom: 18 });
    }
  }, [layers]);

  return (
    <div className="w-full h-full bg-[#050505] relative">
      <div id="map-container" ref={mapContainerRef} className="w-full h-full z-0" />

      {/* Error / Warning Overlay */}
      {errorMsg && (
          <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-red-900/90 border border-red-500 text-white px-4 py-2 rounded shadow-xl z-[500] flex items-center gap-2 animate-in fade-in slide-in-from-top-4">
              <AlertTriangle size={16} />
              <span className="text-xs font-bold">{errorMsg}</span>
          </div>
      )}

      {/* Coords Bar */}
      <div className="absolute bottom-0 left-0 w-full bg-[#050505]/90 border-t border-[#222] px-4 py-1.5 flex items-center justify-between z-[400] pointer-events-none">
         <div className="flex items-center gap-4">
            <div className="text-[10px] text-gray-500 font-bold flex items-center gap-1.5">
                <Navigation size={10} />
                <span className="font-mono text-gray-300">
                    {coords ? `${coords.lat.toFixed(6)}, ${coords.lng.toFixed(6)}` : '--.------, --.------'}
                </span>
            </div>
            <div className="w-px h-3 bg-[#333]"></div>
            <div className="text-[10px] text-gray-600 font-mono">EPSG:3857 (Web Mercator)</div>
         </div>
      </div>
    </div>
  );
};

export default MapView;
