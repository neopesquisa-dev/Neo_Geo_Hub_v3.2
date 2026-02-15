import React, { useEffect, useRef, useState } from 'react';
import { GaussianSplatLayer } from '../types';
import * as THREE from 'three';
import { 
  ArrowLeft, Loader2, Maximize, Rotate3d, Box, 
  Settings2, ChevronDown, RefreshCw, AlertTriangle, Move,
  Compass, Zap, Disc
} from 'lucide-react';

// @ts-ignore
import { Viewer as SplatViewer } from '@mkkellogg/gaussian-splats-3d';

interface SplatViewerPageProps {
  layer: GaussianSplatLayer;
  onExit: () => void;
}

const SplatViewerPage: React.FC<SplatViewerPageProps> = ({ layer, onExit }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<any>(null);
  const loadedRef = useRef(false);
  
  // State
  const [isLoading, setIsLoading] = useState(true);
  const [loadingText, setLoadingText] = useState("Iniciando Engine...");
  const [progress, setProgress] = useState(0); 
  const [error, setError] = useState<string | null>(null);
  const [splatCount, setSplatCount] = useState(0);
  const [isSettingsOpen, setIsSettingsOpen] = useState(true);

  // Scene Controls
  const [splatScale, setSplatScale] = useState(1.0); 
  const [renderMode, setRenderMode] = useState<number>(0); 
  const [position, setPosition] = useState({ x: 0, y: 0, z: 0 });
  // Modificado: Rotação inicial em Y configurada para -90 conforme solicitado
  const [rotation, setRotation] = useState({ x: 0, y: -90, z: 0 }); 

  useEffect(() => {
    const currentContainer = containerRef.current;
    if (!currentContainer || loadedRef.current) return;
    loadedRef.current = true;

    let viewer: any = null;
    let isMounted = true;

    const initViewer = async () => {
      try {
        setIsLoading(true);
        setError(null);
        setProgress(5);

        // SplatViewer handles its own Three.js setup internally.
        // Modificado: initialCameraPosition reduzido para [0, 5, 10] para aumentar o zoom inicial
        viewer = new SplatViewer({
          'cameraUp': [0, 1, 0], 
          'initialCameraPosition': [0, 5, 10],
          'initialCameraLookAt': [0, 0, 0],
          'rootElement': currentContainer,
          'sharedMemoryForWorkers': window.crossOriginIsolated,
          'useBuiltInControls': true, 
          'dynamicScene': true,
          'selfDrivenMode': true
        });

        viewerRef.current = viewer;

        const formatCode = layer.format === 'PLY' ? 2 : 0;

        await viewer.addSplatScene(layer.url, {
          'splatAlphaRemovalThreshold': 1,
          'showLoadingUI': false,
          'position': [0, 0, 0],
          'rotation': [0.7071068, -0.7071068, 0, 0], // Native Z-up to Y-up rotation
          'scale': [1, 1, 1],
          'format': formatCode,
          'onProgress': (percent: number, label: string) => {
             if (isMounted) {
                 setProgress(Math.max(10, percent));
                 setLoadingText(label || `Carregando Ativo ${Math.round(percent)}%`);
             }
          }
        });

        if (!isMounted) return;

        // Adicionado: Helper de eixos XYZ para orientação espacial
        if (viewer.scene) {
            const axesHelper = new THREE.AxesHelper(5);
            viewer.scene.add(axesHelper);
        }

        // Auto-center the mesh within the viewer's world coordinate system
        const mesh = viewer.getSplatMesh();
        if (mesh) {
            mesh.geometry.computeBoundingBox();
            const bbox = mesh.geometry.boundingBox;
            if (bbox) {
                const center = new THREE.Vector3();
                bbox.getCenter(center);
                mesh.position.sub(center);
                mesh.position.y = -bbox.min.y; 
                setPosition({ x: mesh.position.x, y: mesh.position.y, z: mesh.position.z });
            }
            setSplatCount(mesh.getSplatCount());
        }
        
        viewer.start();
        setIsLoading(false);

      } catch (err: any) {
        if (!isMounted) return;
        console.error("Splat Viewer Error:", err);
        setError(err.message || "Erro ao renderizar modelo 3DGS.");
        setIsLoading(false);
      }
    };

    const timer = setTimeout(initViewer, 100);

    return () => {
      isMounted = false;
      clearTimeout(timer);
      if (viewer) {
        try {
          viewer.dispose();
        } catch (e) {
          console.warn("Viewer dispose failed", e);
        }
      }
      viewerRef.current = null;
      loadedRef.current = false;
    };
  }, [layer]);

  // Sync Controls with Viewer instance
  useEffect(() => {
    if(viewerRef.current && viewerRef.current.getSplatMesh()) {
        const mesh = viewerRef.current.getSplatMesh();
        mesh.setSplatScale(splatScale);
        mesh.position.set(position.x, position.y, position.z);
        
        // Correcting rotation offset for Gaussian Splats
        const radX = ((rotation.x - 90) * Math.PI) / 180;
        const radY = (rotation.y * Math.PI) / 180;
        const radZ = (rotation.z * Math.PI) / 180;
        mesh.rotation.set(radX, radY, radZ);
        
        if (typeof viewerRef.current.setRenderMode === 'function') {
            viewerRef.current.setRenderMode(renderMode);
        }
    }
  }, [splatScale, position, rotation, renderMode]);

  const resetView = () => {
    setSplatScale(1.0);
    setRenderMode(0);
    setRotation({ x: 0, y: -90, z: 0 }); // Reset para a nova rotação padrão
    if(viewerRef.current && viewerRef.current.camera) {
        viewerRef.current.camera.position.set(0, 5, 10);
        viewerRef.current.camera.lookAt(0, 0, 0);
    }
  };

  return (
    <div className="fixed inset-0 z-[2000] bg-[#020202] flex flex-col font-sans select-none overflow-hidden text-white">
      <div ref={containerRef} className="flex-1 w-full h-full relative cursor-move active:cursor-grabbing" />

      {/* Top Navigation UI */}
      <div className="absolute top-0 left-0 w-full p-6 flex justify-between items-start pointer-events-none">
        <div className="pointer-events-auto flex items-center gap-4">
            <button onClick={onExit} className="w-10 h-10 bg-black/40 hover:bg-yellow-500 hover:text-black backdrop-blur-md border border-white/10 rounded-full flex items-center justify-center text-white transition-all shadow-xl">
                <ArrowLeft size={18} />
            </button>
            <div className="flex flex-col">
                <h1 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
                    {layer.name}
                    <span className="bg-yellow-500 text-black text-[9px] px-1.5 py-0.5 rounded font-mono font-bold">3DGS ENGINE</span>
                </h1>
                <div className="flex items-center gap-3 text-[10px] text-yellow-500/60 font-mono">
                    <span className="flex items-center gap-1"><Box size={10}/> {splatCount.toLocaleString()} GAUSSIANS</span>
                    <span className="w-1 h-1 bg-white/20 rounded-full"></span>
                    <span className="flex items-center gap-1"><Zap size={10}/> GPU ACCELERATED</span>
                </div>
            </div>
        </div>
      </div>

      {/* Control Sidebar Panel */}
      <div className={`absolute top-24 right-6 w-80 bg-black/60 backdrop-blur-xl border border-white/10 rounded-2xl p-5 transition-all duration-300 pointer-events-auto max-h-[75vh] overflow-y-auto custom-scrollbar ${isSettingsOpen ? 'opacity-100' : 'opacity-0 translate-x-10 pointer-events-none'}`}>
          <div className="space-y-6">
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                  <span className="text-[11px] font-bold text-white uppercase tracking-widest flex items-center gap-2">
                      <Settings2 size={14} className="text-yellow-500"/> Parâmetros de Cena
                  </span>
                  <button onClick={resetView} className="text-[10px] text-yellow-500 hover:text-white transition-colors flex items-center gap-1">
                      <RefreshCw size={10}/> Reset
                  </button>
              </div>

              {/* Toggle Visualization Mode */}
              <div className="space-y-3">
                  <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest flex items-center gap-2">
                      <Zap size={12} className="text-yellow-500"/> Modo de Visualização
                  </span>
                  <div className="grid grid-cols-2 gap-2 p-1 bg-white/5 rounded-lg border border-white/5">
                      <button 
                        onClick={() => setRenderMode(0)}
                        className={`flex items-center justify-center gap-2 py-2 rounded text-[10px] font-bold transition-all ${renderMode === 0 ? 'bg-yellow-500 text-black shadow-lg shadow-yellow-500/20' : 'text-gray-400 hover:text-white'}`}
                      >
                          <Disc size={12}/> SPLATS
                      </button>
                      <button 
                        onClick={() => setRenderMode(1)}
                        className={`flex items-center justify-center gap-2 py-2 rounded text-[10px] font-bold transition-all ${renderMode === 1 ? 'bg-yellow-500 text-black shadow-lg shadow-yellow-500/20' : 'text-gray-400 hover:text-white'}`}
                      >
                          <Zap size={12}/> PONTOS
                      </button>
                  </div>
              </div>

              {/* Global Scaling */}
              <div className="space-y-3">
                  <div className="flex justify-between items-center text-[11px] text-gray-300">
                      <span className="flex items-center gap-2 uppercase font-bold tracking-tighter"><Maximize size={12} className="text-cyan-500"/> Escala Global</span>
                      <span className="font-mono bg-white/10 px-1.5 rounded text-[10px] text-yellow-500">{splatScale.toFixed(1)}x</span>
                  </div>
                  <input type="range" min="0.1" max="3.0" step="0.1" value={splatScale} onChange={(e) => setSplatScale(parseFloat(e.target.value))} className="w-full h-1.5 bg-gray-800 rounded-full appearance-none cursor-pointer accent-yellow-500"/>
              </div>

              {/* Manual Transform Corrections */}
              <div className="space-y-4 pt-4 border-t border-white/10">
                  <div className="space-y-2">
                      <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest flex items-center gap-2">Posicionamento (m)</span>
                      <div className="grid grid-cols-3 gap-2">
                          {['x', 'y', 'z'].map(axis => (
                              <div key={axis} className="flex flex-col gap-1">
                                  <span className="text-[8px] text-gray-600 uppercase font-bold text-center">{axis}</span>
                                  <input 
                                    type="number" 
                                    value={position[axis as keyof typeof position].toFixed(1)} 
                                    onChange={(e) => setPosition(prev => ({...prev, [axis]: parseFloat(e.target.value) || 0}))} 
                                    className="w-full bg-white/5 border border-white/10 rounded px-1 py-1 text-[10px] text-white font-mono outline-none text-center focus:border-yellow-500/50" 
                                  />
                              </div>
                          ))}
                      </div>
                  </div>

                  <div className="space-y-2">
                      <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest flex items-center gap-2">Correção de Rotação (deg)</span>
                      <div className="grid grid-cols-3 gap-2">
                          {['x', 'y', 'z'].map(axis => (
                              <div key={axis} className="flex flex-col gap-1">
                                  <span className="text-[8px] text-gray-600 uppercase font-bold text-center">{axis}</span>
                                  <input 
                                    type="number" 
                                    step="5"
                                    value={rotation[axis as keyof typeof rotation]} 
                                    onChange={(e) => setRotation(prev => ({...prev, [axis]: parseFloat(e.target.value) || 0}))} 
                                    className="w-full bg-white/5 border border-white/10 rounded px-1 py-1 text-[10px] text-white font-mono outline-none text-center focus:border-yellow-500/50" 
                                  />
                              </div>
                          ))}
                      </div>
                  </div>
              </div>
          </div>
      </div>

      {/* Floating Action Buttons */}
      <div className="absolute bottom-6 right-6 pointer-events-auto">
          <button onClick={() => setIsSettingsOpen(!isSettingsOpen)} className={`w-12 h-12 rounded-full backdrop-blur-md border shadow-2xl flex items-center justify-center text-white transition-all ${isSettingsOpen ? 'bg-yellow-500 border-yellow-400 text-black' : 'bg-black/50 border-white/20'}`}>
              {isSettingsOpen ? <ChevronDown size={20}/> : <Settings2 size={20}/>}
          </button>
      </div>

      {/* Fullscreen Loader */}
      {isLoading && (
        <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-black">
            <div className="w-64 space-y-6">
                <div className="flex flex-col items-center gap-4">
                    <Loader2 size={40} className="text-yellow-500 animate-spin" />
                    <div className="flex flex-col items-center">
                        <span className="text-xs text-yellow-500 font-mono font-bold uppercase tracking-widest">{loadingText}</span>
                        <span className="text-[10px] text-gray-500 font-mono mt-1">Carregando buffer de geometria...</span>
                    </div>
                </div>
                <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden">
                    <div className="h-full bg-yellow-500 transition-all duration-300 shadow-[0_0_10px_rgba(207,255,4,0.5)]" style={{ width: `${progress}%` }}></div>
                </div>
                <div className="text-center text-[9px] text-gray-600 uppercase tracking-widest">Digital Twin v2.1 Engine</div>
            </div>
        </div>
      )}

      {/* Error Boundary Overlay */}
      {error && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-xl">
            <div className="bg-[#0a0a0a] border border-red-500/20 p-10 rounded-3xl max-w-md text-center shadow-2xl">
                <div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
                    <AlertTriangle size={40} className="text-red-500" />
                </div>
                <h3 className="text-xl font-bold text-white mb-2 uppercase tracking-tight">Falha Crítica no Visualizador</h3>
                <p className="text-sm text-gray-400 mb-8 font-mono leading-relaxed">{error}</p>
                <button onClick={onExit} className="w-full py-3 bg-white text-black font-bold rounded-xl text-sm hover:bg-gray-200 transition-colors">RETORNAR AO HUB</button>
            </div>
        </div>
      )}
    </div>
  );
};

export default SplatViewerPage;