
import React, { useEffect, useRef, useState, useCallback } from 'react';
import { GaussianSplatLayer } from '../types';
import * as THREE from 'three';
import { 
  ArrowLeft, Loader2, Maximize, Box, 
  Settings2, ChevronDown, RefreshCw, AlertTriangle, 
  Zap, Disc, Ruler, MapPin, Play, Pause, Trash2, MousePointer2, Plus, Save, X
} from 'lucide-react';

// @ts-ignore
import { Viewer as SplatViewer } from '@mkkellogg/gaussian-splats-3d';

interface SplatViewerPageProps {
  layer: GaussianSplatLayer;
  onExit: () => void;
}

interface MarkerData {
  id: string;
  x: number;
  y: number;
  z: number;
  label: string;
}

interface MeasurementData {
  id: string;
  start: { x: number, y: number, z: number };
  end: { x: number, y: number, z: number };
  distance: number;
}

const SplatViewerPage: React.FC<SplatViewerPageProps> = ({ layer, onExit }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<any>(null);
  const loadedRef = useRef(false);
  const raycasterRef = useRef(new THREE.Raycaster());
  const mouseRef = useRef(new THREE.Vector2());
  
  // Grupos Three.js para objetos auxiliares
  const toolsGroupRef = useRef<THREE.Group>(new THREE.Group());
  
  // State - System
  const [isLoading, setIsLoading] = useState(true);
  const [loadingText, setLoadingText] = useState("Iniciando Engine...");
  const [progress, setProgress] = useState(0); 
  const [error, setError] = useState<string | null>(null);
  const [splatCount, setSplatCount] = useState(0);
  const [isSettingsOpen, setIsSettingsOpen] = useState(true);

  // State - Scene Controls
  const [splatScale, setSplatScale] = useState(1.0); 
  const [renderMode, setRenderMode] = useState<number>(0); 
  const [position, setPosition] = useState({ x: 0, y: 0, z: 0 });
  const [rotation, setRotation] = useState({ x: 0, y: -90, z: 0 }); 
  const [isPlaying, setIsPlaying] = useState(false);

  // State - Tools
  const [activeTool, setActiveTool] = useState<'NONE' | 'RULER' | 'MARKER'>('NONE');
  const [markers, setMarkers] = useState<MarkerData[]>([]);
  const [measurements, setMeasurements] = useState<MeasurementData[]>([]);
  const [tempMeasureStart, setTempMeasureStart] = useState<{ x: number, y: number, z: number } | null>(null);

  // Marker Input Logic
  const [isMarkerInputOpen, setIsMarkerInputOpen] = useState(false);
  const [tempMarkerPos, setTempMarkerPos] = useState<{ x: number, y: number, z: number } | null>(null);
  const [markerText, setMarkerText] = useState("");

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

        // Configuração do Raycaster para pontos (caso o splat seja renderizado como pontos)
        raycasterRef.current.params.Points.threshold = 0.1;

        const formatCode = layer.format === 'PLY' ? 2 : 0;

        await viewer.addSplatScene(layer.url, {
          'splatAlphaRemovalThreshold': 5, // Ajuste para melhor performance/visual
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

        // Adiciona Grupo de Ferramentas à Cena
        if (viewer.scene) {
            const axesHelper = new THREE.AxesHelper(2);
            viewer.scene.add(axesHelper);
            viewer.scene.add(toolsGroupRef.current);
        }

        // Auto-center e contagem
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
          // Attempt to dispose. Catch specific DOM errors.
          viewer.dispose();
        } catch (e: any) {
          // Suppress removeChild errors common in React StrictMode
          if (e.message && e.message.includes && e.message.includes('removeChild')) {
             // Ignore
          } else {
             console.warn("Viewer dispose warning:", e);
          }
        }
      }
      viewerRef.current = null;
      loadedRef.current = false;
    };
  }, [layer]);

  // Sync Controls & Auto Rotate
  useEffect(() => {
    if(viewerRef.current && viewerRef.current.getSplatMesh()) {
        const mesh = viewerRef.current.getSplatMesh();
        mesh.setSplatScale(splatScale);
        mesh.position.set(position.x, position.y, position.z);
        
        const radX = ((rotation.x - 90) * Math.PI) / 180;
        const radY = (rotation.y * Math.PI) / 180;
        const radZ = (rotation.z * Math.PI) / 180;
        mesh.rotation.set(radX, radY, radZ);
        
        if (typeof viewerRef.current.setRenderMode === 'function') {
            viewerRef.current.setRenderMode(renderMode);
        }

        // Auto Rotate Control
        if (viewerRef.current.controls) {
            viewerRef.current.controls.autoRotate = isPlaying;
            viewerRef.current.controls.autoRotateSpeed = 2.0;
        }
    }
  }, [splatScale, position, rotation, renderMode, isPlaying]);

  // --- HELPERS VISUAIS THREE.JS ---

  const addVisualSphere = (pos: {x:number, y:number, z:number}, color: number, scale = 0.2) => {
      const geometry = new THREE.SphereGeometry(scale, 16, 16);
      const material = new THREE.MeshBasicMaterial({ color: color, depthTest: false, transparent: true, opacity: 0.9 });
      const sphere = new THREE.Mesh(geometry, material);
      sphere.position.set(pos.x, pos.y, pos.z);
      toolsGroupRef.current.add(sphere);
      return sphere;
  };

  const addVisualLine = (start: {x:number, y:number, z:number}, end: {x:number, y:number, z:number}, color: number) => {
      const material = new THREE.LineBasicMaterial({ color: color, depthTest: false, linewidth: 2 });
      const points = [
          new THREE.Vector3(start.x, start.y, start.z),
          new THREE.Vector3(end.x, end.y, end.z)
      ];
      const geometry = new THREE.BufferGeometry().setFromPoints(points);
      const line = new THREE.Line(geometry, material);
      toolsGroupRef.current.add(line);
      return line;
  };

  // --- INTERAÇÃO (RAYCAST) ---

  const handleCanvasClick = useCallback((e: React.MouseEvent) => {
    if (activeTool === 'NONE' || !viewerRef.current || !containerRef.current || isMarkerInputOpen) return;

    // Normalizar coordenadas do mouse (-1 a +1)
    const rect = containerRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    const y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

    mouseRef.current.set(x, y);
    raycasterRef.current.setFromCamera(mouseRef.current, viewerRef.current.camera);

    const mesh = viewerRef.current.getSplatMesh();
    if (!mesh) return;

    const intersects = raycasterRef.current.intersectObject(mesh);

    if (intersects.length > 0) {
        const point = intersects[0].point;

        if (activeTool === 'MARKER') {
            setTempMarkerPos({ x: point.x, y: point.y, z: point.z });
            setIsMarkerInputOpen(true); // Abre modal de digitação
        } 
        else if (activeTool === 'RULER') {
            if (!tempMeasureStart) {
                // Primeiro Clique: Define Ponto A
                setTempMeasureStart({ x: point.x, y: point.y, z: point.z });
                addVisualSphere(point, 0xffff00, 0.15); // Esfera Amarela no Ponto A
            } else {
                // Segundo Clique: Define Ponto B e Calcula
                const startVec = new THREE.Vector3(tempMeasureStart.x, tempMeasureStart.y, tempMeasureStart.z);
                const endVec = point;
                const dist = startVec.distanceTo(endVec);

                // Desenha linha e esfera final
                addVisualSphere(point, 0xffff00, 0.15); // Esfera Amarela no Ponto B
                addVisualLine(tempMeasureStart, point, 0x00ffff); // Linha Ciano

                setMeasurements(prev => [...prev, {
                    id: `ms-${Date.now()}`,
                    start: tempMeasureStart,
                    end: { x: point.x, y: point.y, z: point.z },
                    distance: dist
                }]);
                setTempMeasureStart(null); // Reseta para próxima medição
            }
        }
    }
  }, [activeTool, tempMeasureStart, isMarkerInputOpen]);

  const saveMarker = () => {
      if (tempMarkerPos && markerText.trim()) {
          const newMarker: MarkerData = {
              id: `mk-${Date.now()}`,
              x: tempMarkerPos.x,
              y: tempMarkerPos.y,
              z: tempMarkerPos.z,
              label: markerText
          };
          setMarkers(prev => [...prev, newMarker]);
          addVisualSphere(tempMarkerPos, 0xff00ff, 0.3); // Esfera Magenta para o Marcador
          
          // Reset Input
          setIsMarkerInputOpen(false);
          setMarkerText("");
          setTempMarkerPos(null);
          setActiveTool('NONE'); // Opcional: sai do modo marcador após adicionar
      }
  };

  const cancelMarker = () => {
      setIsMarkerInputOpen(false);
      setMarkerText("");
      setTempMarkerPos(null);
  };

  const clearMeasurements = () => {
      // Remove visualmente apenas linhas e esferas de medição (simplificação: limpa tudo do grupo e redesenha marcadores se necessário)
      // Aqui vamos limpar tudo do grupo de ferramentas e recolocar os marcadores se existirem
      toolsGroupRef.current.clear();
      setMeasurements([]);
      setTempMeasureStart(null);
      
      // Re-add markers visual
      markers.forEach(m => addVisualSphere(m, 0xff00ff, 0.3));
  };

  const clearMarkers = () => {
      // Limpa marcadores do estado e redesenha medições
      setMarkers([]);
      toolsGroupRef.current.clear();
      
      // Re-add measurements visual
      measurements.forEach(m => {
          addVisualSphere(m.start, 0xffff00, 0.15);
          addVisualSphere(m.end, 0xffff00, 0.15);
          addVisualLine(m.start, m.end, 0x00ffff);
      });
  };

  const resetView = () => {
    setSplatScale(1.0);
    setRenderMode(0);
    setRotation({ x: 0, y: -90, z: 0 });
    setIsPlaying(false);
    if(viewerRef.current && viewerRef.current.camera) {
        viewerRef.current.camera.position.set(0, 5, 10);
        viewerRef.current.camera.lookAt(0, 0, 0);
    }
  };

  return (
    <div className="fixed inset-0 z-[2000] bg-[#020202] flex flex-col font-sans select-none overflow-hidden text-white">
      <div 
        ref={containerRef} 
        className={`flex-1 w-full h-full relative ${activeTool !== 'NONE' ? 'cursor-crosshair' : 'cursor-move active:cursor-grabbing'}`}
        onClick={handleCanvasClick}
      />

      {/* INPUT MODAL FOR MARKERS */}
      {isMarkerInputOpen && (
          <div className="absolute inset-0 z-[2100] bg-black/50 backdrop-blur-sm flex items-center justify-center">
              <div className="bg-[#111] border border-[#333] p-4 rounded-xl shadow-2xl w-80 animate-in zoom-in-95">
                  <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
                      <MapPin size={14} className="text-fuchsia-500"/> Adicionar Anotação
                  </h3>
                  <input 
                      autoFocus
                      type="text" 
                      placeholder="Digite sua observação..."
                      className="w-full bg-black border border-[#333] rounded px-3 py-2 text-xs text-white mb-3 focus:border-fuchsia-500 outline-none"
                      value={markerText}
                      onChange={(e) => setMarkerText(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && saveMarker()}
                  />
                  <div className="flex justify-end gap-2">
                      <button onClick={cancelMarker} className="px-3 py-1.5 rounded text-xs text-gray-400 hover:text-white hover:bg-white/10">Cancelar</button>
                      <button onClick={saveMarker} className="px-3 py-1.5 rounded text-xs font-bold bg-fuchsia-600 hover:bg-fuchsia-500 text-white flex items-center gap-1">
                          <Save size={12}/> Salvar
                      </button>
                  </div>
              </div>
          </div>
      )}

      {/* Top Navigation UI - Mobile Optimized */}
      <div className="absolute top-0 left-0 w-full p-3 md:p-6 flex justify-between items-start pointer-events-none">
        <div className="pointer-events-auto flex items-center gap-2 md:gap-4 max-w-[60%]">
            <button onClick={onExit} className="w-8 h-8 md:w-10 md:h-10 bg-black/40 hover:bg-yellow-500 hover:text-black backdrop-blur-md border border-white/10 rounded-full flex items-center justify-center text-white transition-all shadow-xl shrink-0">
                <ArrowLeft size={16} />
            </button>
            <div className="flex flex-col min-w-0">
                <h1 className="text-sm md:text-lg font-bold text-white tracking-tight flex items-center gap-2 truncate">
                    <span className="truncate">{layer.name}</span>
                    <span className="bg-yellow-500 text-black text-[9px] px-1.5 py-0.5 rounded font-mono font-bold hidden sm:inline-block">3DGS</span>
                </h1>
                <div className="flex items-center gap-3 text-[9px] md:text-[10px] text-yellow-500/60 font-mono">
                    <span className="flex items-center gap-1"><Box size={10}/> {splatCount.toLocaleString()} <span className="hidden sm:inline">GAUSSIANS</span></span>
                </div>
            </div>
        </div>

        {/* Play/Pause Control - Compact Mobile */}
        <div className="pointer-events-auto">
            <button 
                onClick={() => setIsPlaying(!isPlaying)}
                className={`flex items-center gap-2 px-3 py-1.5 md:px-4 md:py-2 rounded-full border backdrop-blur-md transition-all font-bold text-[10px] md:text-xs uppercase ${isPlaying ? 'bg-yellow-500 border-yellow-400 text-black' : 'bg-black/40 border-white/10 text-white hover:bg-white/10'}`}
            >
                {isPlaying ? <Pause size={12} fill={isPlaying ? "black" : "currentColor"} /> : <Play size={12} fill="currentColor" />}
                <span className="hidden sm:inline">{isPlaying ? 'PAUSE ROTATION' : 'PLAY ROTATION'}</span>
                <span className="sm:hidden">{isPlaying ? 'PAUSE' : 'PLAY'}</span>
            </button>
        </div>
      </div>

      {/* Control Sidebar Panel - Responsive Width */}
      <div className={`absolute top-20 right-4 md:top-24 md:right-6 w-64 md:w-80 bg-black/60 backdrop-blur-xl border border-white/10 rounded-2xl p-4 md:p-5 transition-all duration-300 max-h-[70vh] overflow-y-auto custom-scrollbar ${isSettingsOpen ? 'opacity-100 pointer-events-auto visible' : 'opacity-0 translate-x-10 pointer-events-none invisible'}`}>
          <div className="space-y-6">
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                  <span className="text-[11px] font-bold text-white uppercase tracking-widest flex items-center gap-2">
                      <Settings2 size={14} className="text-yellow-500"/> Parâmetros de Cena
                  </span>
                  <button onClick={resetView} className="text-[10px] text-yellow-500 hover:text-white transition-colors flex items-center gap-1">
                      <RefreshCw size={10}/> Reset
                  </button>
              </div>

              {/* Tools Section */}
              <div className="space-y-3">
                  <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest flex items-center gap-2">
                      <MousePointer2 size={12} className="text-cyan-500"/> Ferramentas Interativas
                  </span>
                  <div className="flex gap-2">
                      <button 
                        onClick={() => { setActiveTool(activeTool === 'RULER' ? 'NONE' : 'RULER'); setTempMeasureStart(null); }}
                        className={`flex-1 flex flex-col items-center justify-center gap-1 py-3 rounded border transition-all ${activeTool === 'RULER' ? 'bg-cyan-900/40 border-cyan-500 text-cyan-400' : 'bg-white/5 border-transparent text-gray-400 hover:bg-white/10'}`}
                      >
                          <Ruler size={16} />
                          <span className="text-[9px] font-bold uppercase">Régua</span>
                      </button>
                      <button 
                        onClick={() => { setActiveTool(activeTool === 'MARKER' ? 'NONE' : 'MARKER'); setIsMarkerInputOpen(false); }}
                        className={`flex-1 flex flex-col items-center justify-center gap-1 py-3 rounded border transition-all ${activeTool === 'MARKER' ? 'bg-fuchsia-900/40 border-fuchsia-500 text-fuchsia-400' : 'bg-white/5 border-transparent text-gray-400 hover:bg-white/10'}`}
                      >
                          <MapPin size={16} />
                          <span className="text-[9px] font-bold uppercase">Marcador</span>
                      </button>
                  </div>

                  {/* Tool Hints & Data */}
                  {activeTool === 'RULER' && (
                      <div className="bg-cyan-900/10 border border-cyan-500/30 p-3 rounded text-[10px] animate-in slide-in-from-top-2">
                          <div className="text-cyan-300 mb-2 font-bold flex justify-between items-center">
                              <span>MEDIÇÕES: {measurements.length}</span>
                              {measurements.length > 0 && <button onClick={clearMeasurements} className="text-cyan-500 hover:text-white"><Trash2 size={10}/></button>}
                          </div>
                          
                          {tempMeasureStart && (
                              <div className="flex items-center gap-2 text-yellow-500 animate-pulse mb-2 bg-yellow-900/20 p-1.5 rounded border border-yellow-500/20">
                                  <div className="w-2 h-2 rounded-full bg-yellow-500"></div>
                                  <span>Clique no ponto final...</span>
                              </div>
                          )}
                          
                          <div className="space-y-1 max-h-20 overflow-y-auto custom-scrollbar">
                              {measurements.map((m, i) => (
                                  <div key={m.id} className="flex justify-between text-gray-400 font-mono border-b border-white/5 pb-1">
                                      <span>Dist {i+1}:</span>
                                      <span className="text-white font-bold">{m.distance.toFixed(3)}m</span>
                                  </div>
                              ))}
                              {measurements.length === 0 && !tempMeasureStart && <span className="text-gray-500 italic">Clique em dois pontos para medir.</span>}
                          </div>
                      </div>
                  )}

                  {/* Marker List Panel */}
                  <div className={`bg-fuchsia-900/10 border border-fuchsia-500/30 p-3 rounded text-[10px] transition-all ${activeTool === 'MARKER' || markers.length > 0 ? 'block' : 'hidden'}`}>
                      <div className="text-fuchsia-300 mb-2 font-bold flex justify-between items-center">
                          <span>ANOTAÇÕES: {markers.length}</span>
                          {markers.length > 0 && <button onClick={clearMarkers} className="text-fuchsia-500 hover:text-white"><Trash2 size={10}/></button>}
                      </div>
                      
                      {activeTool === 'MARKER' && (
                           <div className="flex items-center gap-2 text-fuchsia-400 mb-2 bg-fuchsia-900/20 p-1.5 rounded border border-fuchsia-500/20">
                                <Plus size={10} />
                                <span>Clique no modelo para adicionar...</span>
                           </div>
                      )}

                      <div className="space-y-1 max-h-32 overflow-y-auto custom-scrollbar">
                          {markers.map((m, i) => (
                              <div key={m.id} className="flex flex-col text-gray-400 font-mono border-b border-white/5 pb-1.5 mb-1.5">
                                  <span className="text-white font-bold truncate">"{m.label}"</span>
                                  <span className="text-[8px] text-gray-600">XYZ: {m.x.toFixed(1)}, {m.y.toFixed(1)}, {m.z.toFixed(1)}</span>
                              </div>
                          ))}
                           {markers.length === 0 && activeTool !== 'MARKER' && <span className="text-gray-600 italic">Nenhuma anotação.</span>}
                      </div>
                  </div>
              </div>

              <div className="w-full h-px bg-white/10 my-2"></div>

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
