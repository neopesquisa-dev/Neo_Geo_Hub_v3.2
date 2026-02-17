
import React, { useState, useEffect, useCallback } from 'react';
import Sidebar from './components/Sidebar';
import Viewer3D from './components/Viewer3D';
import MapView from './components/MapView';
import PhotoGallery from './components/PhotoGallery';
import SplatViewerPage from './components/SplatViewerPage'; 
import Header from './components/Header';
import PropertiesPanel from './components/PropertiesPanel';
import InspectionReportModal from './components/InspectionReportModal';
import SettingsModal from './components/SettingsModal';
import UserProfileModal from './components/UserProfileModal'; 
import WorkspaceModal from './components/WorkspaceModal'; 
import { AppState, ViewMode, Layer, PointCloudLayer, PhotoLayer, GaussianSplatLayer, GeoImage, AppSettings, UserProfile, Workspace } from './types';
import { Loader2, Sparkles, Bot, X, Map as MapIcon, ChevronLeft, ChevronRight, Trash2, AlertTriangle, Box, Image as ImageIcon, Search, ScanLine, Target } from 'lucide-react';
import { analyzeSitePhoto, detectObjectInPhoto, DetectionResult } from './services/geminiService';
import { MOCK_USER, DEMO_DATA_URLS } from './constants';
import * as THREE from 'three';
import { PLYLoader } from 'three/addons/loaders/PLYLoader.js';
import { db, saveLayerToDB, deleteLayerFromDB, initWorkspaces } from './db';
// useLiveQuery removed as it was unused and causing build issues if missing

// Declare EXIF global from exif-js script
declare var EXIF: any;

const App: React.FC = () => {
  const [state, setState] = useState<AppState>({
    user: MOCK_USER,
    activeWorkspace: { id: 'loading', name: 'Loading...', created: '' },
    activeLayerId: null, 
    layers: [],
    viewMode: ViewMode.MODE_3D,
    selectedImage: null,
    isReportOpen: false,
    isSettingsOpen: false,
    isWorkspaceModalOpen: false,
    settings: {
      theme: 'dark',
      language: 'pt'
    }
  });
  
  const [isProfileOpen, setIsProfileOpen] = useState(false); 
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [dbLoading, setDbLoading] = useState(true);

  // Estados locais do Modal de Detalhes
  const [searchQuery, setSearchQuery] = useState("");
  const [detectionResult, setDetectionResult] = useState<DetectionResult | null>(null);
  const [activeTab, setActiveTab] = useState<'REPORT' | 'SEARCH'>('REPORT');

  // Apply theme to body
  useEffect(() => {
    if (state.settings.theme === 'light') {
        document.body.classList.add('light-mode');
    } else {
        document.body.classList.remove('light-mode');
    }
  }, [state.settings.theme]);

  // Reset modal state when image changes
  useEffect(() => {
      if (state.selectedImage) {
          setDetectionResult(null);
          setSearchQuery("");
          setActiveTab('REPORT');
      }
  }, [state.selectedImage]);

  useEffect(() => {
    const initApp = async () => {
        setDbLoading(true);
        try {
            const demoWorkspace = await initWorkspaces();
            const lastWsId = localStorage.getItem('last_workspace_id');
            let currentWs = demoWorkspace;
            
            if (lastWsId && lastWsId !== demoWorkspace.id) {
                const found = await db.workspaces.get(lastWsId);
                if (found) currentWs = found;
            }

            setState(prev => ({ ...prev, activeWorkspace: currentWs }));
            await loadLayersForWorkspace(currentWs.id);
        } catch (e) {
            console.error("App Init Error", e);
        } finally {
            setDbLoading(false);
        }
    };
    initApp();
  }, []);

  const loadLayersForWorkspace = async (workspaceId: string): Promise<Layer[]> => {
        setDbLoading(true);
        try {
            const storedLayers = await db.layers.where('workspaceId').equals(workspaceId).toArray();
            const rehydratedLayers: Layer[] = [];
            
            for (const layer of storedLayers) {
                if (layer.type === 'GAUSSIAN_SPLAT' || layer.type === 'POINT_CLOUD') {
                    // Se a URL já for um Blob URL válido (começa com blob:), mantemos.
                    // Se for remota (http), mantemos.
                    if (layer.url && (layer.url.startsWith('http') || layer.url.startsWith('blob:'))) {
                        rehydratedLayers.push(layer);
                    } else {
                        const storedFile = await db.files.get(layer.id);
                        if (storedFile) {
                            const url = URL.createObjectURL(storedFile.data);
                            if (layer.type === 'GAUSSIAN_SPLAT') {
                                rehydratedLayers.push({ ...layer, url } as GaussianSplatLayer);
                            } else {
                                rehydratedLayers.push(layer);
                            }
                        } else {
                            // Se não tem arquivo físico e nem URL válida, removemos ou mantemos como placeholder
                            rehydratedLayers.push(layer);
                        }
                    }
                } 
                else if (layer.type === 'PHOTO_SET') {
                    const photoLayer = layer as PhotoLayer;
                    const rehydratedImages = await Promise.all(photoLayer.images.map(async (img) => {
                        const storedImgFile = await db.files.get(img.id);
                        if (storedImgFile) {
                            return { ...img, url: URL.createObjectURL(storedImgFile.data) };
                        }
                        return img;
                    }));
                    rehydratedLayers.push({ ...layer, images: rehydratedImages } as PhotoLayer);
                } else {
                    rehydratedLayers.push(layer);
                }
            }

            setState(prev => ({ 
                ...prev, 
                layers: rehydratedLayers,
                activeLayerId: rehydratedLayers.length > 0 ? rehydratedLayers[0].id : prev.activeLayerId 
            }));

            return rehydratedLayers;
        } finally {
            setDbLoading(false);
        }
  };

  const handleUpload = async (files: FileList | null, customName: string, typeHint: 'SPLAT' | 'CLOUD' | 'PHOTO') => {
    if (!files || files.length === 0) return;
    setDbLoading(true);

    try {
        const workspaceId = state.activeWorkspace.id;
        const timestamp = new Date().toISOString();
        const fileArray = Array.from(files);

        // 1. GAUSSIAN SPLAT (.splat ou .ply neural)
        if (typeHint === 'SPLAT') {
            const file = fileArray[0];
            const splatLayer: GaussianSplatLayer = {
                id: `layer-splat-${Date.now()}`,
                workspaceId,
                name: customName || file.name,
                type: 'GAUSSIAN_SPLAT',
                visible: true,
                opacity: 1,
                date: timestamp,
                url: URL.createObjectURL(file),
                format: file.name.toLowerCase().endsWith('.ply') ? 'PLY' : 'SPLAT',
                splatCount: Math.floor(file.size / 32),
                fileSize: file.size
            };
            await saveLayerToDB(splatLayer, file);
        } 
        // 2. NUVEM DE PONTOS (.ply, .las, .xyz)
        else if (typeHint === 'CLOUD') {
            for (const file of fileArray) {
                const pcLayer: PointCloudLayer = {
                    id: `layer-pc-${Date.now()}-${Math.random().toString(36).substr(2,5)}`,
                    workspaceId,
                    name: customName || file.name,
                    type: 'POINT_CLOUD',
                    visible: true,
                    opacity: 1,
                    date: timestamp,
                    pointCount: 0,
                    format: 'PLY'
                };
                await saveLayerToDB(pcLayer, file);
            }
        }
        // 3. FOTOS GEOREFERENCIADAS
        else if (typeHint === 'PHOTO') {
            const geoImages: GeoImage[] = [];
            for (const file of fileArray) {
                const coords = await getExifDataFromBlob(file);
                const imgId = `img-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
                
                // Se não encontrar GPS, usa 0,0 temporariamente, mas vamos tratar isso no mapa
                // Se coords.lat for null, não salvamos coordenadas falsas.
                const finalLat = coords.lat !== null ? coords.lat : 0;
                const finalLng = coords.lng !== null ? coords.lng : 0;
                
                geoImages.push({
                    id: imgId,
                    filename: file.name,
                    url: URL.createObjectURL(file),
                    lat: finalLat, 
                    lng: finalLng,
                    timestamp: Date.now()
                });
                await db.files.put({ id: imgId, data: file, type: file.type });
            }

            const photoLayer: PhotoLayer = {
                id: `layer-photos-${Date.now()}`,
                workspaceId,
                name: customName || `Set de Fotos (${fileArray.length})`,
                type: 'PHOTO_SET',
                visible: true,
                opacity: 1,
                date: timestamp,
                images: geoImages
            };
            await saveLayerToDB(photoLayer);
        }

        await loadLayersForWorkspace(workspaceId);
    } catch (e) {
        console.error("Upload failed", e);
        alert("Falha ao processar arquivos.");
    } finally {
        setDbLoading(false);
    }
  };

  const handleLoadDemoData = async (targetWorkspaceId?: string) => {
    const wsId = targetWorkspaceId || state.activeWorkspace.id;
    if (wsId !== 'demo-session') return;
    
    setDbLoading(true);
    console.log("Iniciando carregamento da Demo...");

    try {
        const existingLayers = await db.layers.where('workspaceId').equals(wsId).toArray();
        for (const l of existingLayers) {
            await deleteLayerFromDB(l.id);
        }

        // 1. Carregar Splat Demo
        let splatBlob: Blob | null = null;
        try {
            console.log("Buscando Splat:", DEMO_DATA_URLS.SPLAT);
            // Tenta carregar da URL Remota (Github Media)
            const splatResponse = await fetch(DEMO_DATA_URLS.SPLAT);
            
            if (!splatResponse.ok) throw new Error(`Remote Fetch Status: ${splatResponse.status}`);
            
            const tempBlob = await splatResponse.blob();
            // Verificar se o que baixou é realmente um arquivo binário e não uma página HTML de erro 404/github
            if (tempBlob.type.includes("text/html") || tempBlob.size < 1000) {
                throw new Error("Invalid content type or size (likely HTML error page)");
            }
            splatBlob = tempBlob;
        } catch (remoteErr) {
             console.warn(`Falha no carregamento remoto (${remoteErr}), tentando local...`);
             try {
                const localResponse = await fetch("/Demo/SUBESTACAO_RGB_2_splat.splat");
                if (!localResponse.ok) throw new Error("Local Fetch Failed");
                splatBlob = await localResponse.blob();
             } catch (localErr) {
                console.error("Falha também no carregamento local.");
             }
        }

        if (splatBlob) {
            const objectUrl = URL.createObjectURL(splatBlob);
            
            const splatLayer: GaussianSplatLayer = {
                id: `layer-demo-splat-${Date.now()}`,
                workspaceId: wsId,
                name: "Subestação Goiabeiras",
                type: 'GAUSSIAN_SPLAT',
                visible: true,
                opacity: 1,
                date: new Date().toISOString(),
                url: objectUrl, // Usa o Blob URL criado imediatamente
                format: 'SPLAT',
                splatCount: Math.floor(splatBlob.size / 32),
                fileSize: splatBlob.size
            };

            // Tenta salvar no DB Local.
            try {
                await saveLayerToDB(splatLayer, splatBlob);
                console.log("Splat carregado e salvo localmente.");
            } catch (dbErr) {
                console.warn("Falha ao salvar Splat no IndexedDB (provavelmente tamanho). Usando versão em memória para esta sessão.", dbErr);
                // IMPORTANTE: Não revogamos a URL aqui. Deixamos o layer com a URL do blob em memória.
                // Salvamos apenas o metadado no DB para que o App saiba que o layer existe.
                await db.layers.put(splatLayer);
            }
        } else {
            console.warn("Splat Demo falhou em carregar de todas as fontes.");
        }

        // 2. Carregar Nuvem de Pontos Demo
        // @ts-ignore
        const cloudUrl = DEMO_DATA_URLS.POINT_CLOUD;
        let pcBlob: Blob | null = null;
        if (cloudUrl) {
            try {
                console.log("Buscando Point Cloud:", cloudUrl);
                const pcResponse = await fetch(cloudUrl);
                if (!pcResponse.ok) throw new Error(`Remote Fetch Status: ${pcResponse.status}`);
                pcBlob = await pcResponse.blob();
            } catch (remoteErr) {
                 console.warn("Falha no carregamento remoto PointCloud, tentando local...");
                 try {
                     // Tenta carregar localmente se existir na pasta public
                     const localResponse = await fetch("/Demo/Sub_Fx_1passada_Ground%2BLinha_1_ply.ply");
                     if (localResponse.ok) {
                         pcBlob = await localResponse.blob();
                     }
                 } catch (localErr) {
                     console.error("Falha no fallback local PointCloud");
                 }
            }
        }

        if (pcBlob) {
            const pcLayer: PointCloudLayer = {
                id: `layer-demo-pc-${Date.now()}`,
                workspaceId: wsId,
                name: "Nuvem de Pontos (Sub_Fx)",
                type: 'POINT_CLOUD',
                visible: true,
                opacity: 1,
                date: new Date().toISOString(),
                pointCount: 0, // Será calculado ao abrir
                format: 'PLY'
            };
            try {
                await saveLayerToDB(pcLayer, pcBlob);
            } catch (dbErr) {
                console.warn("Falha ao salvar PC no DB, usando remoto.");
                // Se falhou ao salvar, tentamos usar a URL remota como fallback, mas já temos o blob aqui...
                // O ideal seria criar URL do blob se salvamento falhou
                pcLayer.url = URL.createObjectURL(pcBlob);
                await db.layers.put(pcLayer);
            }
            console.log("Point Cloud carregada com sucesso.");
        }

        // 3. Carregar Fotos Demo
        const demoImages: GeoImage[] = [];
        for (const [idx, imgData] of DEMO_DATA_URLS.DEMO_IMAGES.entries()) {
            try {
                console.log("Buscando Imagem:", imgData.url);
                const res = await fetch(imgData.url);
                if (!res.ok) {
                    console.warn(`Imagem fetch error: ${res.status}`);
                    // Fallback local se falhar remoto
                    const localUrl = `/Demo/${imgData.filename}`;
                    try {
                        const localRes = await fetch(localUrl);
                        if(localRes.ok) {
                             const blob = await localRes.blob();
                             await processImageBlob(blob, imgData, idx, wsId, demoImages);
                        }
                    } catch(e) { /* ignore */ }
                    continue;
                }
                const blob = await res.blob();
                await processImageBlob(blob, imgData, idx, wsId, demoImages);
                
            } catch (e) {
                console.warn(`Failed to load demo image: ${imgData.filename}`, e);
            }
        }

        if (demoImages.length > 0) {
            const imgLayer: PhotoLayer = {
                 id: `layer-demo-photo-${Date.now()}`,
                 workspaceId: wsId,
                 name: "Fotos Inspeção DJI",
                 type: 'PHOTO_SET',
                 visible: true,
                 opacity: 1,
                 date: new Date().toISOString(),
                 images: demoImages
            };
            await saveLayerToDB(imgLayer);
        }

        await loadLayersForWorkspace(wsId);
        setState(prev => ({ ...prev, viewMode: ViewMode.MODE_3D }));
    } catch (e) {
        console.error("Demo Load Critical Failure", e);
        alert("Erro crítico ao carregar demo. Verifique o console para detalhes.");
    } finally {
        setDbLoading(false);
    }
  };

  const processImageBlob = async (blob: Blob, imgData: any, idx: number, wsId: string, demoImages: GeoImage[]) => {
        // Tenta extrair EXIF real, usa fallback do constants se falhar
        const exifData = await getExifDataFromBlob(blob);
        const realLat = exifData.lat ?? imgData.lat;
        const realLng = exifData.lng ?? imgData.lng;
        
        const imgId = `img-demo-${idx}-${Date.now()}`;
        await db.files.put({ id: imgId, data: blob, type: blob.type });

        demoImages.push({
            id: imgId,
            filename: imgData.filename,
            url: URL.createObjectURL(blob), 
            lat: realLat,
            lng: realLng,
            timestamp: Date.now(),
            analysis: undefined // Forçar undefined para que o botão de análise apareça
        });
  };

  // Melhoria na robustez da extração do EXIF
  const getExifDataFromBlob = (blob: Blob): Promise<{lat: number | null, lng: number | null}> => {
    return new Promise((resolve) => {
        if (typeof EXIF === 'undefined' || !blob) return resolve({lat: null, lng: null});
        
        // EXIF.getData trabalha melhor com File objects ou Blob convertidos
        // O arraybuffer precisa ser lido internamente pelo exif-js
        EXIF.getData(blob as any, function(this: any) {
            const lat = EXIF.getTag(this, "GPSLatitude");
            const latRef = EXIF.getTag(this, "GPSLatitudeRef");
            const lng = EXIF.getTag(this, "GPSLongitude");
            const lngRef = EXIF.getTag(this, "GPSLongitudeRef");

            if (lat && latRef && lng && lngRef) {
                const finalLat = convertDMSToDD(lat, latRef);
                const finalLng = convertDMSToDD(lng, lngRef);
                
                // Validação extra para coordenadas 0,0 (ilha nula)
                if (finalLat === 0 && finalLng === 0) {
                    resolve({ lat: null, lng: null });
                } else {
                    resolve({ lat: finalLat, lng: finalLng });
                }
            } else {
                resolve({ lat: null, lng: null });
            }
        });
    });
  };

  const convertDMSToDD = (degrees: any[], ref: string) => {
    if (!degrees || degrees.length < 3) return 0;
    
    // Tratamento seguro para Numerator/Denominator ou número puro
    const getVal = (item: any) => {
        if (typeof item === 'number') return item;
        if (item && typeof item.numerator === 'number' && typeof item.denominator === 'number') {
            return item.denominator !== 0 ? item.numerator / item.denominator : 0;
        }
        return 0;
    };

    let d = getVal(degrees[0]);
    let m = getVal(degrees[1]);
    let s = getVal(degrees[2]);

    let dd = d + m / 60 + s / 3600;
    if (ref === "S" || ref === "W") dd = dd * -1;
    return dd;
  };

  const toggleLayer = async (id: string) => {
    const target = state.layers.find(l => l.id === id);
    if (target) {
        const updated = { ...target, visible: !target.visible };
        setState(prev => ({
          ...prev,
          layers: prev.layers.map(l => l.id === id ? updated : l)
        }));
        await db.layers.update(id, { visible: updated.visible });
    }
  };
  
  const deleteLayer = async (id: string) => {
    await deleteLayerFromDB(id);
    setState(prev => ({
      ...prev,
      layers: prev.layers.filter(l => l.id !== id),
      activeLayerId: prev.activeLayerId === id ? null : prev.activeLayerId
    }));
  };

  const selectLayer = (id: string) => {
    const layer = state.layers.find(l => l.id === id);
    let newMode = state.viewMode;
    if (layer) {
        if (layer.type === 'GAUSSIAN_SPLAT') newMode = ViewMode.MODE_SPLAT;
        else if (layer.type === 'POINT_CLOUD') newMode = ViewMode.MODE_3D;
        else if (layer.type === 'PHOTO_SET') newMode = ViewMode.MODE_MAP;
    }
    setState(prev => ({ ...prev, activeLayerId: id, viewMode: newMode }));
  };

  const updateLayer = async (id: string, updates: Partial<Layer>) => {
      setState(prev => ({
          ...prev,
          layers: prev.layers.map(l => l.id === id ? { ...l, ...updates } : l)
      }));
      await db.layers.update(id, updates);
  };

  const updateImage = (layerId: string, imageId: string, updates: Partial<GeoImage>) => {
    setState(prev => {
        const newLayers = prev.layers.map(layer => {
            if (layer.id !== layerId || layer.type !== 'PHOTO_SET') return layer;
            const photoLayer = layer as PhotoLayer;
            return {
                ...photoLayer,
                images: photoLayer.images.map(img => img.id === imageId ? { ...img, ...updates } : img)
            };
        });
        const updatedLayer = newLayers.find(l => l.id === layerId);
        if (updatedLayer) db.layers.put(updatedLayer);
        return { ...prev, layers: newLayers };
    });
  };

  const handleSelectImage = (img: GeoImage) => {
    setState(prev => ({ ...prev, selectedImage: img }));
  };

  const handleAnalyzeImage = async (img: GeoImage) => {
    setIsAnalyzing(true);
    const { blob, base64 } = await getImageData(img);
    if (!base64) {
        setIsAnalyzing(false);
        return;
    }

    const result = await analyzeSitePhoto(base64, blob.type);
    const parentLayer = state.layers.find(l => l.type === 'PHOTO_SET' && (l as PhotoLayer).images.some(i => i.id === img.id));
    if (parentLayer) {
        updateImage(parentLayer.id, img.id, { analysis: result, severity: 'MEDIUM' });
        if (state.selectedImage?.id === img.id) {
            setState(prev => ({ ...prev, selectedImage: { ...img, analysis: result, severity: 'MEDIUM' } }));
        }
    }
    setIsAnalyzing(false);
  };

  const handleVisualSearch = async () => {
      if (!state.selectedImage || !searchQuery.trim()) return;
      setIsAnalyzing(true);
      
      const { blob, base64 } = await getImageData(state.selectedImage);
      if (!base64) {
          setIsAnalyzing(false);
          return;
      }

      const result = await detectObjectInPhoto(base64, blob.type, searchQuery);
      setDetectionResult(result);
      setIsAnalyzing(false);
  };

  const getImageData = async (img: GeoImage) => {
    try {
        const storedFile = await db.files.get(img.id);
        let blob: Blob;
        
        if (storedFile) {
            blob = storedFile.data;
        } else {
            const response = await fetch(img.url);
            if (!response.ok) throw new Error("CORS_BLOCK");
            blob = await response.blob();
        }

        const reader = new FileReader();
        const base64 = await new Promise<string>((resolve) => {
            reader.readAsDataURL(blob);
            reader.onloadend = () => {
                const res = reader.result as string;
                resolve(res.split(',')[1]);
            }
        });
        return { blob, base64 };
    } catch (e) {
        alert("Erro ao ler imagem. Verifique permissões ou CORS.");
        return { blob: new Blob(), base64: null };
    }
  };

  const activeLayer = state.layers.find(l => l.id === state.activeLayerId);

  return (
    <div className="flex flex-col h-[100dvh] bg-black text-white font-sans overflow-hidden transition-colors">
      {state.viewMode === ViewMode.MODE_SPLAT && activeLayer?.type === 'GAUSSIAN_SPLAT' && (
          <SplatViewerPage layer={activeLayer as GaussianSplatLayer} onExit={() => setState(prev => ({ ...prev, viewMode: ViewMode.MODE_3D }))} />
      )}

      {state.viewMode !== ViewMode.MODE_SPLAT && (
        <Header 
            currentMode={state.viewMode} setMode={(m) => setState(prev => ({ ...prev, viewMode: m }))}
            toggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
            onOpenReport={() => setState(prev => ({ ...prev, isReportOpen: true }))}
            onOpenSettings={() => setState(prev => ({ ...prev, isSettingsOpen: true }))}
            onOpenProfile={() => setIsProfileOpen(true)}
            onSwitchWorkspace={() => setState(prev => ({ ...prev, isWorkspaceModalOpen: true }))}
            settings={state.settings} user={state.user} activeWorkspace={state.activeWorkspace}
        />
      )}
      
      <div className={`flex flex-1 overflow-hidden relative ${state.viewMode === ViewMode.MODE_SPLAT ? 'hidden' : ''}`}>
        {dbLoading && (
            <div className="absolute inset-0 z-[100] bg-black/90 flex items-center justify-center flex-col gap-4">
                <Loader2 size={48} className="text-cyan-500 animate-spin" />
                <div className="text-sm font-mono text-gray-400 uppercase tracking-widest">Processando Ativos...</div>
            </div>
        )}

        {/* Mobile Sidebar Backdrop */}
        {isSidebarOpen && (
             <div 
                className="absolute inset-0 z-40 bg-black/50 backdrop-blur-sm md:hidden"
                onClick={() => setIsSidebarOpen(false)}
             ></div>
        )}

        {/* Sidebar container - Mobile Fixed Drawer */}
        <div className={`
             fixed inset-y-0 left-0 z-50 w-72 h-full bg-[#050505] shadow-2xl transform transition-transform duration-300 md:static md:transform-none md:shadow-none
             ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
        `}>
            <Sidebar 
                layers={state.layers} activeLayerId={state.activeLayerId} activeWorkspace={state.activeWorkspace}
                onToggleLayer={toggleLayer} onSelectLayer={selectLayer} onDeleteLayer={deleteLayer} 
                onUpload={handleUpload} onLoadDemo={() => handleLoadDemoData()} settings={state.settings}
                onCloseMobile={() => setIsSidebarOpen(false)} // Pass close prop
            />
        </div>

        <main className="flex-1 relative bg-[#050505] overflow-hidden pb-16 md:pb-0">
           {state.viewMode === ViewMode.MODE_3D && <Viewer3D activeLayer={activeLayer} theme={state.settings.theme} />}
           {state.viewMode === ViewMode.MODE_MAP && <MapView layers={state.layers} onSelectImage={handleSelectImage} />}
           {state.viewMode === ViewMode.MODE_GALLERY && (
             <PhotoGallery 
                layers={state.layers} 
                onSelectImage={handleSelectImage} 
                onUpdateImage={updateImage} 
             />
           )}
           
           {/* MODAL DE DETALHES COM BUSCA VISUAL */}
           {state.selectedImage && (
             <div className="absolute inset-0 z-[1000] bg-black/95 flex items-center justify-center p-0 md:p-4">
                <div className="bg-[#111] border-none md:border md:border-[#333] rounded-none md:rounded-lg w-full h-full md:max-w-6xl md:h-[85vh] flex flex-col md:flex-row overflow-hidden shadow-2xl">
                    
                    {/* LEFT: Image Viewer (Top on Mobile) */}
                    <div className="flex-1 bg-black relative flex items-center justify-center group overflow-hidden max-h-[40vh] md:max-h-full shrink-0">
                        <div className="relative w-full h-full flex items-center justify-center">
                            <img src={state.selectedImage.url} className="max-w-full max-h-full object-contain" />
                            
                            {/* Bounding Boxes Overlay */}
                            {detectionResult && detectionResult.boxes && (
                                <div className="absolute inset-0 pointer-events-none w-full h-full">
                                    {detectionResult.boxes.map((box, i) => (
                                        <div 
                                            key={i}
                                            className="absolute border-2 border-fuchsia-500 bg-fuchsia-500/10 z-10 animate-in zoom-in-50 duration-500"
                                            style={{
                                                top: `${box.ymin}%`,
                                                left: `${box.xmin}%`,
                                                width: `${box.xmax - box.xmin}%`,
                                                height: `${box.ymax - box.ymin}%`
                                            }}
                                        >
                                            <span className="absolute -top-6 left-0 bg-fuchsia-600 text-white text-[10px] px-1 rounded font-bold uppercase shadow-lg">
                                                {box.label || searchQuery}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                        <button onClick={() => setState(prev => ({...prev, selectedImage: null}))} className="absolute top-4 right-4 p-2 bg-black/50 rounded-full text-white hover:bg-white/20 transition-all z-20"><X size={20}/></button>
                    </div>

                    {/* RIGHT: Analysis Panel (Bottom on Mobile) */}
                    <div className="w-full md:w-96 bg-[#0a0a0a] border-t md:border-t-0 md:border-l border-[#222] flex flex-col flex-1 overflow-hidden">
                        
                        {/* Tab Switcher */}
                        <div className="flex border-b border-[#222] shrink-0">
                            <button 
                                onClick={() => setActiveTab('REPORT')}
                                className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider transition-all ${activeTab === 'REPORT' ? 'bg-[#111] text-cyan-400 border-b-2 border-cyan-500' : 'text-gray-500 hover:text-white'}`}
                            >
                                <Bot size={14} className="inline mr-2 mb-0.5" /> Relatório
                            </button>
                            <button 
                                onClick={() => setActiveTab('SEARCH')}
                                className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider transition-all ${activeTab === 'SEARCH' ? 'bg-[#111] text-fuchsia-400 border-b-2 border-fuchsia-500' : 'text-gray-500 hover:text-white'}`}
                            >
                                <ScanLine size={14} className="inline mr-2 mb-0.5" /> Busca Visual
                            </button>
                        </div>

                        {/* Content */}
                        <div className="flex-1 p-6 overflow-y-auto space-y-6">
                            
                            {/* Metadata Header */}
                            <div className="grid grid-cols-2 gap-3 mb-4">
                                <div className="bg-[#111] p-2 rounded border border-[#222]">
                                    <label className="text-[9px] text-gray-500 uppercase font-bold">Arquivo</label>
                                    <div className="text-[10px] text-white font-mono truncate">{state.selectedImage.filename}</div>
                                </div>
                                <div className="bg-[#111] p-2 rounded border border-[#222]">
                                    <label className="text-[9px] text-gray-500 uppercase font-bold">Coords (GPS)</label>
                                    <div className="text-cyan-400 font-mono text-[10px] truncate">
                                        {state.selectedImage.lat ? `${state.selectedImage.lat.toFixed(5)}, ${state.selectedImage.lng.toFixed(5)}` : 'Sem GPS'}
                                    </div>
                                </div>
                            </div>

                            {activeTab === 'REPORT' && (
                                <div>
                                    <label className="text-[10px] text-gray-500 uppercase font-bold mb-2 block">Relatório Técnico</label>
                                    {state.selectedImage.analysis ? (
                                        <div className="text-xs text-gray-300 font-mono leading-relaxed bg-black/40 p-4 rounded border border-white/5 shadow-inner whitespace-pre-line">
                                            {state.selectedImage.analysis}
                                        </div>
                                    ) : (
                                        <div className="text-center py-10">
                                            <Bot size={32} className="mx-auto text-gray-600 mb-3" />
                                            <p className="text-xs text-gray-500 mb-4">Nenhuma análise gerada para esta imagem.</p>
                                            <button 
                                                onClick={() => state.selectedImage && handleAnalyzeImage(state.selectedImage)}
                                                disabled={isAnalyzing}
                                                className="w-full py-3 bg-cyan-500 hover:bg-cyan-400 text-black shadow-[0_0_15px_rgba(6,182,212,0.4)] rounded text-xs font-bold transition-all flex items-center justify-center gap-2 uppercase tracking-widest"
                                            >
                                                {isAnalyzing ? <Loader2 className="animate-spin" size={14}/> : <Sparkles size={14}/>}
                                                GERAR RELATÓRIO
                                            </button>
                                        </div>
                                    )}
                                </div>
                            )}

                            {activeTab === 'SEARCH' && (
                                <div className="space-y-4">
                                    <div className="bg-[#111] p-4 rounded-lg border border-[#333]">
                                        <label className="text-[10px] text-gray-500 uppercase font-bold mb-2 block">O que você procura?</label>
                                        <div className="flex gap-2">
                                            <input 
                                                type="text" 
                                                value={searchQuery}
                                                onChange={(e) => setSearchQuery(e.target.value)}
                                                placeholder="Ex: Trinca, Ferrugem, Carro..."
                                                className="flex-1 bg-black border border-[#444] rounded px-3 text-xs text-white focus:border-fuchsia-500 outline-none"
                                            />
                                            <button 
                                                onClick={handleVisualSearch}
                                                disabled={isAnalyzing || !searchQuery}
                                                className="px-3 bg-fuchsia-800 hover:bg-fuchsia-600 text-white rounded flex items-center justify-center disabled:opacity-50"
                                            >
                                                {isAnalyzing ? <Loader2 className="animate-spin" size={14} /> : <Search size={14} />}
                                            </button>
                                        </div>
                                    </div>

                                    {detectionResult && (
                                        <div className={`p-4 rounded border ${detectionResult.found ? 'bg-green-900/10 border-green-500/50' : 'bg-red-900/10 border-red-500/50'} animate-in fade-in slide-in-from-bottom-2`}>
                                            <div className="flex items-center gap-2 mb-2">
                                                {detectionResult.found ? <Target size={16} className="text-green-500"/> : <X size={16} className="text-red-500"/>}
                                                <span className={`text-xs font-bold uppercase ${detectionResult.found ? 'text-green-400' : 'text-red-400'}`}>
                                                    {detectionResult.found ? 'Encontrado' : 'Não Encontrado'}
                                                </span>
                                            </div>
                                            <p className="text-[11px] text-gray-300 font-mono leading-relaxed">
                                                {detectionResult.reason}
                                            </p>
                                            {detectionResult.found && detectionResult.boxes && detectionResult.boxes.length > 0 && (
                                                <div className="mt-2 text-[10px] text-gray-500">
                                                    {detectionResult.boxes.length} ocorrência(s) marcada(s) na imagem.
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {!detectionResult && !isAnalyzing && (
                                        <div className="text-center py-8 opacity-40">
                                            <Target size={40} className="mx-auto mb-2 text-gray-600"/>
                                            <p className="text-[10px] text-gray-500">A IA irá escanear a imagem e marcar as ocorrências encontradas.</p>
                                        </div>
                                    )}
                                </div>
                            )}

                        </div>
                    </div>
                </div>
             </div>
           )}
        </main>
        
        <PropertiesPanel activeLayer={activeLayer} settings={state.settings} onUpdateLayer={updateLayer} />
        
        {/* Mobile Bottom Navigation Bar */}
        <div className="absolute bottom-0 left-0 w-full h-16 bg-[#050505] border-t border-[#222] flex md:hidden items-center justify-around px-4 z-40 pb-safe backdrop-blur-md">
            <button 
                onClick={() => setState(prev => ({...prev, viewMode: ViewMode.MODE_3D}))}
                className={`flex flex-col items-center gap-1 p-2 rounded transition-all ${state.viewMode === ViewMode.MODE_3D ? 'text-cyan-400' : 'text-gray-500'}`}
            >
                <Box size={20} />
                <span className="text-[9px] font-bold uppercase">3D Space</span>
            </button>
            <button 
                onClick={() => setState(prev => ({...prev, viewMode: ViewMode.MODE_MAP}))}
                className={`flex flex-col items-center gap-1 p-2 rounded transition-all ${state.viewMode === ViewMode.MODE_MAP ? 'text-cyan-400' : 'text-gray-500'}`}
            >
                <MapIcon size={20} />
                <span className="text-[9px] font-bold uppercase">Map</span>
            </button>
            <button 
                onClick={() => setState(prev => ({...prev, viewMode: ViewMode.MODE_GALLERY}))}
                className={`flex flex-col items-center gap-1 p-2 rounded transition-all ${state.viewMode === ViewMode.MODE_GALLERY ? 'text-cyan-400' : 'text-gray-500'}`}
            >
                <ImageIcon size={20} />
                <span className="text-[9px] font-bold uppercase">Gallery</span>
            </button>
        </div>

      </div>

      <InspectionReportModal isOpen={state.isReportOpen} onClose={() => setState(prev => ({ ...prev, isReportOpen: false }))} layers={state.layers} />
      <SettingsModal isOpen={state.isSettingsOpen} onClose={() => setState(prev => ({ ...prev, isSettingsOpen: false }))} settings={state.settings} onUpdateSettings={(s) => setState(prev => ({ ...prev, settings: {...prev.settings, ...s}}))} />
      <WorkspaceModal isOpen={state.isWorkspaceModalOpen} onClose={() => setState(prev => ({ ...prev, isWorkspaceModalOpen: false }))} activeWorkspaceId={state.activeWorkspace?.id || ''} onSelectWorkspace={(ws) => setState(prev => ({ ...prev, activeWorkspace: ws, isWorkspaceModalOpen: false}))} />
      <UserProfileModal isOpen={isProfileOpen} onClose={() => setIsProfileOpen(false)} user={state.user} onUpdateUser={(u) => setState(prev => ({ ...prev, user: {...prev.user, ...u}}))} />
    </div>
  );
};

export default App;
