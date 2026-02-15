
import React, { useEffect, useRef, useState } from 'react';
import { Layer, PointCloudLayer, Theme } from '../types';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { PLYLoader } from 'three/addons/loaders/PLYLoader.js';
import { db } from '../db';
import { Rotate3d, Palette, Database, Layers, Move, Loader2 } from 'lucide-react';

interface ViewerProps {
  activeLayer?: Layer;
  theme: Theme;
}

const ASPRS_COLORS: Record<number, { name: string, color: [number, number, number] }> = {
  0: { name: "Unclassified", color: [0.5, 0.5, 0.5] },
  2: { name: "Ground", color: [0.58, 0.29, 0.0] },
  3: { name: "Low Veg", color: [0.0, 0.6, 0.0] },
  4: { name: "Med Veg", color: [0.0, 0.8, 0.0] },
  5: { name: "High Veg", color: [0.0, 1.0, 0.0] },
  6: { name: "Building", color: [1.0, 0.6, 0.0] },
  7: { name: "Low Point", color: [1.0, 0.0, 0.0] },
  9: { name: "Water", color: [0.0, 0.0, 1.0] },
  17: { name: "Bridge", color: [0.6, 0.3, 0.1] },
};

const Viewer3D: React.FC<ViewerProps> = ({ activeLayer, theme }) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const pointsRef = useRef<THREE.Points | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const axesRef = useRef<THREE.AxesHelper | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  
  const [pointSize, setPointSize] = useState(0.12); 
  const [colorMode, setColorMode] = useState<'RGB' | 'HEIGHT' | 'CLASS'>('RGB');
  const [isLoading, setIsLoading] = useState(false);
  const [debugInfo, setDebugInfo] = useState<{count: number, hasClass: boolean, heightRange: [number, number]} | null>(null);
  
  const [transform, setTransform] = useState({
    posX: 0, posY: 0, posZ: 0,
    rotX: 0, rotY: 0, rotZ: 0
  });

  // Update Scene Background based on Theme
  useEffect(() => {
    if (sceneRef.current) {
        // Dark Mode: #020202 (Black-ish), Light Mode: #cccccc (Darker Silver/Gray)
        const bgColor = theme === 'light' ? 0xcccccc : 0x020202;
        sceneRef.current.background = new THREE.Color(bgColor);
    }
  }, [theme]);

  useEffect(() => {
    if (!mountRef.current) return;
    const mountNode = mountRef.current;
    
    const scene = new THREE.Scene();
    // Default background setup
    const bgColor = theme === 'light' ? 0xcccccc : 0x020202;
    scene.background = new THREE.Color(bgColor);
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(60, mountNode.clientWidth / mountNode.clientHeight, 0.1, 1000000);
    camera.position.set(50, 50, 50);

    const renderer = new THREE.WebGLRenderer({ antialias: true, logarithmicDepthBuffer: true });
    renderer.setSize(mountNode.clientWidth, mountNode.clientHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    mountNode.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;

    // Grid e Eixos - Adjust colors based on theme if needed, but defaults usually fine
    const gridColor = theme === 'light' ? 0x888888 : 0x111111;
    const gridCenterColor = theme === 'light' ? 0x444444 : 0x080808;
    const grid = new THREE.GridHelper(1000, 50, gridCenterColor, gridColor);
    scene.add(grid);
    
    const axes = new THREE.AxesHelper(15);
    scene.add(axes);
    axesRef.current = axes;

    let frameId: number;
    const animate = () => {
      frameId = requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    const loadData = async () => {
      if (activeLayer?.type !== 'POINT_CLOUD') return;
      setIsLoading(true);
      try {
        const layer = activeLayer as PointCloudLayer;
        let arrayBuffer: ArrayBuffer;
        
        if (!(db as any).isOpen()) await (db as any).open();
        const stored = await db.files.get(layer.id);
        
        if (stored) arrayBuffer = await stored.data.arrayBuffer();
        else if (layer.url) {
          const res = await fetch(layer.url);
          if (!res.ok) throw new Error("Falha ao buscar dados da camada");
          arrayBuffer = await res.arrayBuffer();
        }
        else throw new Error("Nenhum dado disponível");

        const geometry = new PLYLoader().parse(arrayBuffer);
        
        // CORREÇÃO DE EIXOS NATIVA: Z-up para Y-up
        geometry.rotateX(-Math.PI / 2);
        
        geometry.computeBoundingBox();
        const bbox = geometry.boundingBox!;
        const center = new THREE.Vector3();
        bbox.getCenter(center);
        
        // CENTRALIZAÇÃO AUTOMÁTICA NA ORIGEM
        geometry.translate(-center.x, -bbox.min.y, -center.z);
        geometry.computeBoundingBox();
        
        const positions = geometry.attributes.position.array as Float32Array;
        const heights = new Float32Array(geometry.attributes.position.count);
        
        let minH = Infinity;
        let maxH = -Infinity;

        for(let i=0; i<heights.length; i++) {
            const h = positions[i*3 + 1]; // Agora Y é a altura
            heights[i] = h;
            if (h < minH) minH = h;
            if (h > maxH) maxH = h;
        }

        const classifications = (geometry.attributes as any).classification || (geometry.attributes as any).class;
        
        geometry.userData = {
          originalColors: geometry.attributes.color ? (geometry.attributes.color.array as Float32Array).slice() : null,
          heights,
          minH,
          maxH,
          classifications: classifications ? (classifications.array as Uint8Array).slice() : null
        };

        if (!geometry.attributes.color) {
            geometry.setAttribute('color', new THREE.BufferAttribute(new Float32Array(heights.length * 3).fill(0.8), 3));
            setColorMode('HEIGHT');
        }

        const material = new THREE.PointsMaterial({ size: pointSize, vertexColors: true, sizeAttenuation: true });
        const points = new THREE.Points(geometry, material);
        
        scene.add(points);
        pointsRef.current = points;

        setDebugInfo({ 
            count: heights.length, 
            hasClass: !!classifications,
            heightRange: [minH, maxH]
        });
        
        // Ajustar Camera
        const size = bbox.getSize(new THREE.Vector3());
        const radius = size.length();
        camera.position.set(radius, radius, radius);
        controls.target.set(0, size.y / 2, 0);

      } catch (e) {
        console.error("3D Viewer Error:", e);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();

    const handleResize = () => {
        if (!mountNode || !rendererRef.current) return;
        camera.aspect = mountNode.clientWidth / mountNode.clientHeight;
        camera.updateProjectionMatrix();
        rendererRef.current.setSize(mountNode.clientWidth, mountNode.clientHeight);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(frameId);
      controls.dispose();
      
      if (rendererRef.current) {
          const dom = rendererRef.current.domElement;
          try {
              if (dom && dom.parentElement) {
                  dom.parentElement.removeChild(dom);
              }
          } catch (e) {
              console.warn("Error cleaning up 3D Viewer DOM:", e);
          }
          rendererRef.current.dispose();
      }
      
      if (pointsRef.current) {
          pointsRef.current.geometry.dispose();
          if (Array.isArray(pointsRef.current.material)) {
              pointsRef.current.material.forEach(m => m.dispose());
          } else {
              pointsRef.current.material.dispose();
          }
      }
    };
  }, [activeLayer?.id]);

  useEffect(() => {
    if (!pointsRef.current) return;
    const mesh = pointsRef.current;
    const geom = mesh.geometry;
    
    mesh.position.set(transform.posX, transform.posY, transform.posZ);
    mesh.rotation.set(THREE.MathUtils.degToRad(transform.rotX), THREE.MathUtils.degToRad(transform.rotY), THREE.MathUtils.degToRad(transform.rotZ));
    (mesh.material as THREE.PointsMaterial).size = pointSize;

    const colorAttr = geom.attributes.color as THREE.BufferAttribute;
    if (!colorAttr) return;

    if (colorMode === 'RGB' && geom.userData.originalColors) {
      colorAttr.array.set(geom.userData.originalColors);
    } else if (colorMode === 'HEIGHT' && geom.userData.heights) {
      const h = geom.userData.heights;
      const min = geom.userData.minH;
      const max = geom.userData.maxH;
      const range = max - min || 1;

      for (let i = 0; i < colorAttr.count; i++) {
        const norm = (h[i] - min) / range;
        let r=0, g=0, b=0;
        if (norm < 0.25) { b = 1; g = norm * 4; }
        else if (norm < 0.5) { g = 1; b = 1 - (norm - 0.25) * 4; }
        else if (norm < 0.75) { g = 1; r = (norm - 0.5) * 4; }
        else { r = 1; g = 1 - (norm - 0.75) * 4; }
        colorAttr.setXYZ(i, r, g, b);
      }
    } else if (colorMode === 'CLASS' && geom.userData.classifications) {
      const cls = geom.userData.classifications;
      for (let i = 0; i < colorAttr.count; i++) {
        const c = ASPRS_COLORS[cls[i]]?.color || [1, 1, 1];
        colorAttr.setXYZ(i, c[0], c[1], c[2]);
      }
    }
    colorAttr.needsUpdate = true;
  }, [pointSize, colorMode, transform]);

  return (
    <div className={`w-full h-full relative font-mono overflow-hidden ${theme === 'light' ? 'bg-[#cccccc]' : 'bg-[#020202]'}`}>
      <div ref={mountRef} className="w-full h-full" />
      
      {isLoading && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/90 z-20">
             <Loader2 size={40} className="text-yellow-500 animate-spin mb-4" />
             <div className="text-yellow-500 text-[9px] tracking-[0.3em] uppercase font-bold">Processando Nuvem Técnica...</div>
        </div>
      )}

      {/* Control Panel - Adjusted Classes for Theme Compatibility */}
      <div className="absolute top-4 right-4 flex flex-col gap-3 z-10 w-64 pointer-events-none">
          <div className="bg-black/70 backdrop-blur-md border border-white/10 rounded-xl p-4 pointer-events-auto">
                <div className="flex flex-col gap-3">
                    <label className="text-[9px] text-gray-500 font-bold uppercase tracking-widest flex items-center gap-2">
                       <Palette size={10} className="text-yellow-500"/> Rendering Mode
                    </label>
                    <div className="flex gap-1 bg-white/5 p-1 rounded-lg">
                        <button onClick={()=>setColorMode('RGB')} className={`flex-1 text-[9px] py-1.5 rounded transition-all ${colorMode==='RGB'?'bg-cyan-600 text-white shadow-lg shadow-cyan-500/10':'text-gray-500 hover:text-gray-300'}`}>RGB</button>
                        <button onClick={()=>setColorMode('HEIGHT')} className={`flex-1 text-[9px] py-1.5 rounded transition-all ${colorMode==='HEIGHT'?'bg-fuchsia-600 text-white shadow-lg shadow-fuchsia-500/10':'text-gray-500 hover:text-gray-300'}`}>HGT</button>
                        <button onClick={()=>setColorMode('CLASS')} disabled={!debugInfo?.hasClass} className={`flex-1 text-[9px] py-1.5 rounded transition-all ${colorMode==='CLASS'?'bg-yellow-500 text-black shadow-lg shadow-yellow-500/10':(!debugInfo?.hasClass ? 'opacity-20 text-gray-700' : 'text-gray-500 hover:text-gray-300')}`}>CLS</button>
                    </div>
                    <div className="space-y-1">
                        <div className="flex justify-between text-[9px] text-gray-500 uppercase"><span>Size</span><span>{pointSize.toFixed(2)}</span></div>
                        <input type="range" min="0.01" max="1" step="0.01" value={pointSize} onChange={e=>setPointSize(parseFloat(e.target.value))} className="w-full h-1 bg-white/10 rounded-full appearance-none accent-yellow-500"/>
                    </div>
                </div>
          </div>

          <div className="bg-black/70 backdrop-blur-md border border-white/10 rounded-xl p-4 pointer-events-auto">
                <div className="flex items-center justify-between mb-3">
                    <label className="text-[9px] text-gray-500 font-bold uppercase tracking-widest flex items-center gap-2">
                        <Move size={10} className="text-yellow-500"/> Alinhamento manual
                    </label>
                    <button onClick={() => setTransform({posX:0,posY:0,posZ:0,rotX:0,rotY:0,rotZ:0})} className="px-2 py-0.5 bg-yellow-500/10 border border-yellow-500/30 rounded text-[8px] text-yellow-400 hover:bg-yellow-500 hover:text-black transition-all">RESET</button>
                </div>
                <div className="space-y-2">
                    {['rotX', 'rotY', 'rotZ'].map((axis) => (
                        <div key={axis} className="flex items-center gap-2">
                            <span className="text-[9px] text-yellow-500 w-3 font-bold">{axis.slice(-1).toUpperCase()}</span>
                            <input type="range" min="-180" max="180" step="1" value={transform[axis as keyof typeof transform]} onChange={e => setTransform(p => ({...p, [axis]: parseFloat(e.target.value)}))} className="flex-1 h-1 bg-white/5 appearance-none accent-yellow-500"/>
                        </div>
                    ))}
                </div>
          </div>
      </div>

      <div className="absolute bottom-4 left-4 bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-lg border border-white/10 text-[9px] text-gray-400 flex items-center gap-4 transition-all">
          <div className="flex items-center gap-1.5"><div className="w-1.5 h-1.5 bg-yellow-500 rounded-full animate-pulse"></div> POINTS: {debugInfo?.count.toLocaleString() || '---'}</div>
          <div className="w-px h-3 bg-white/10"></div>
          <div className="flex items-center gap-1.5 uppercase tracking-tighter"> Alt: {debugInfo ? `${debugInfo.heightRange[0].toFixed(1)}m a ${debugInfo.heightRange[1].toFixed(1)}m` : '---'}</div>
      </div>
    </div>
  );
};

export default Viewer3D;
