
import React, { useState } from 'react';
import { Layer, PhotoLayer, GeoImage } from '../types';
import { 
  Image as ImageIcon, CheckCircle, Search, Sparkles, X, 
  BrainCircuit, Loader2, Grid, Layers, Maximize2, AlertCircle, 
  Check, ScanEye, ArrowRight, ZoomIn
} from 'lucide-react';
import { analyzeSitePhoto, detectObjectInPhoto } from '../services/geminiService';
import { db } from '../db';

interface GalleryProps {
  layers: Layer[];
  onSelectImage: (img: GeoImage) => void;
  onUpdateImage: (layerId: string, imageId: string, updates: Partial<GeoImage>) => void;
}

const DEFAULT_TAGS = [
  "intervenção humana", "deslizamentos", "rios", "encostas", 
  "construções", "construções irregulares", "linhas de transmissão", "estação elétrica",
  "rachaduras", "ferrugem", "vegetação densa"
];

const PhotoGallery: React.FC<GalleryProps> = ({ layers, onSelectImage, onUpdateImage }) => {
  const photoLayers = layers.filter(l => l.type === 'PHOTO_SET') as PhotoLayer[];
  const allImages = photoLayers.flatMap(l => l.images.map(img => ({ ...img, layerId: l.id, layerName: l.name })));
  
  // --- STATE ---
  const [activeTab, setActiveTab] = useState<'LIBRARY' | 'SEARCH'>('LIBRARY');
  const [lightboxImg, setLightboxImg] = useState<GeoImage | null>(null);

  // Selection
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  
  // Search Engine
  const [searchQuery, setSearchQuery] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [searchResults, setSearchResults] = useState<Record<string, {found: boolean, reason: string}>>({});
  const [hasSearched, setHasSearched] = useState(false);

  // --- ACTIONS ---

  const toggleSelection = (id: string) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setSelectedIds(newSet);
    if (newSet.size === 0) setIsSelectionMode(false);
  };

  const handleSelectAll = () => {
    if (selectedIds.size === allImages.length) {
        setSelectedIds(new Set());
        setIsSelectionMode(false);
    } else {
        setSelectedIds(new Set(allImages.map(i => i.id)));
        setIsSelectionMode(true);
    }
  };

  const processImages = async (action: 'ANALYZE' | 'SEARCH', query?: string) => {
      // Se estamos na aba de busca e nada foi selecionado, assumimos busca em TUDO
      let targets = allImages.filter(img => selectedIds.has(img.id));
      if (targets.length === 0 && action === 'SEARCH') {
          targets = allImages;
      }
      
      if (targets.length === 0) return;

      setIsProcessing(true);
      setProgress({ current: 0, total: targets.length });
      
      if (action === 'SEARCH') {
          setSearchResults({});
          setHasSearched(true);
      }

      for (let i = 0; i < targets.length; i++) {
          const img = targets[i];
          try {
              const storedFile = await db.files.get(img.id);
              let blob: Blob;
              if (storedFile) blob = storedFile.data;
              else {
                  const res = await fetch(img.url);
                  blob = await res.blob();
              }
              
              const reader = new FileReader();
              const base64Content = await new Promise<string>((resolve) => {
                  reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
                  reader.readAsDataURL(blob);
              });

              if (action === 'ANALYZE') {
                  const result = await analyzeSitePhoto(base64Content, blob.type);
                  onUpdateImage(img.layerId, img.id, { analysis: result, severity: 'MEDIUM' });
              } else if (action === 'SEARCH' && query) {
                  const result = await detectObjectInPhoto(base64Content, blob.type, query);
                  if (result.found) {
                      setSearchResults(prev => ({...prev, [img.id]: result}));
                      if (query.toLowerCase().includes("risco") || query.toLowerCase().includes("perigo")) {
                          onUpdateImage(img.layerId, img.id, { severity: 'HIGH' });
                      }
                  }
              }
          } catch (e) {
              console.error(`Error processing ${img.id}`, e);
          }
          setProgress(prev => ({ ...prev, current: i + 1 }));
      }
      setIsProcessing(false);
  };

  // --- RENDER HELPERS ---

  const renderImageCard = (img: any, isSearchResult = false) => {
    const isSelected = selectedIds.has(img.id);
    const searchResult = searchResults[img.id];

    return (
        <div 
            key={img.id} 
            className={`group relative aspect-video bg-[#0a0a0a] rounded-lg overflow-hidden border transition-all shadow-lg animate-in fade-in zoom-in-95
                ${isSelected ? 'border-cyan-500 ring-1 ring-cyan-500' : 'border-[#222] hover:border-gray-500'}
                ${isSearchResult ? 'border-l-4 border-l-green-500' : ''}
            `}
            onClick={(e) => {
                if (isSearchResult) return; // No search results, click logic is handled by buttons
                if (isSelectionMode || e.shiftKey) {
                    toggleSelection(img.id);
                    setIsSelectionMode(true);
                } else {
                    setLightboxImg(img);
                }
            }}
        >
            <img src={img.url} alt={img.filename} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" />
            
            {/* Overlay Gradient */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-black/30 opacity-60 group-hover:opacity-100 transition-opacity pointer-events-none"></div>

            {/* Selection Checkbox (Library Mode) */}
            {!isSearchResult && (
                <div 
                    onClick={(e) => { e.stopPropagation(); toggleSelection(img.id); setIsSelectionMode(true); }}
                    className={`absolute top-2 left-2 z-20 cursor-pointer ${isSelectionMode || isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'} transition-opacity`}
                >
                    <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${isSelected ? 'bg-cyan-500 border-cyan-500' : 'bg-black/50 border-white/50 hover:bg-white/20'}`}>
                        {isSelected && <CheckCircle size={14} className="text-black" />}
                    </div>
                </div>
            )}

            {/* Actions (Library Mode) */}
            {!isSearchResult && (
                <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-20">
                     <button 
                        onClick={(e) => { e.stopPropagation(); setLightboxImg(img); }}
                        className="p-1.5 bg-black/60 hover:bg-white text-white hover:text-black rounded backdrop-blur-md transition-colors"
                        title="Tela Cheia"
                     >
                        <Maximize2 size={12} />
                     </button>
                     <button 
                        onClick={(e) => { e.stopPropagation(); onSelectImage(img); }}
                        className="p-1.5 bg-cyan-900/60 hover:bg-cyan-500 text-cyan-400 hover:text-black rounded backdrop-blur-md transition-colors border border-cyan-500/30"
                        title="Inspecionar / Analisar"
                     >
                        <ScanEye size={12} />
                     </button>
                </div>
            )}

            {/* Bottom Info */}
            <div className="absolute bottom-0 left-0 w-full p-3 pointer-events-none">
                <div className="text-[10px] text-white font-bold truncate">{img.filename}</div>
                <div className="text-[9px] text-gray-400 font-mono flex items-center gap-1">
                    <Layers size={8} /> {img.layerName}
                </div>
                
                {/* Search Result Specific Info */}
                {isSearchResult && searchResult && (
                    <div className="mt-2 pt-2 border-t border-white/10">
                        <div className="flex items-center gap-1 text-[9px] font-bold text-green-400 uppercase mb-1">
                            <Check size={10} /> Encontrado
                        </div>
                        <p className="text-[9px] text-gray-300 leading-tight line-clamp-2">
                            {searchResult.reason}
                        </p>
                        <div className="mt-2 flex gap-2 pointer-events-auto">
                            <button 
                                onClick={(e) => { e.stopPropagation(); onSelectImage(img); }}
                                className="flex-1 py-1 bg-green-900/40 border border-green-500/30 hover:bg-green-500 hover:text-black rounded text-[9px] font-bold transition-colors uppercase"
                            >
                                Ver Detalhes
                            </button>
                            <button 
                                onClick={(e) => { e.stopPropagation(); setLightboxImg(img); }}
                                className="px-2 py-1 bg-white/10 hover:bg-white hover:text-black rounded text-white transition-colors"
                            >
                                <ZoomIn size={10} />
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Analysis Dot */}
            {img.analysis && !isSearchResult && (
                 <div className="absolute bottom-3 right-3 w-1.5 h-1.5 bg-fuchsia-500 rounded-full shadow-[0_0_5px_rgba(217,70,239,1)]"></div>
            )}
        </div>
    );
  };

  return (
    <div className="w-full h-full bg-[#050505] flex flex-col overflow-hidden relative font-sans">
      
      {/* --- HEADER / TABS --- */}
      <div className="shrink-0 bg-[#080808] border-b border-[#222]">
          <div className="flex items-center">
              <button 
                onClick={() => setActiveTab('LIBRARY')}
                className={`flex-1 py-4 text-xs font-bold uppercase tracking-widest transition-all flex items-center justify-center gap-2
                    ${activeTab === 'LIBRARY' ? 'text-cyan-400 border-b-2 border-cyan-500 bg-cyan-900/5' : 'text-gray-500 hover:text-white'}
                `}
              >
                  <Grid size={14} /> Biblioteca
              </button>
              <div className="w-px h-6 bg-[#222]"></div>
              <button 
                onClick={() => setActiveTab('SEARCH')}
                className={`flex-1 py-4 text-xs font-bold uppercase tracking-widest transition-all flex items-center justify-center gap-2
                    ${activeTab === 'SEARCH' ? 'text-fuchsia-400 border-b-2 border-fuchsia-500 bg-fuchsia-900/5' : 'text-gray-500 hover:text-white'}
                `}
              >
                  <BrainCircuit size={14} /> Busca Inteligente
              </button>
          </div>
      </div>

      {/* --- CONTENT AREA --- */}
      <div className="flex-1 overflow-hidden relative">
          
          {/* Progress Bar */}
          {isProcessing && (
              <div className="absolute top-0 left-0 w-full h-1 z-50 bg-[#111]">
                  <div 
                    className="h-full bg-gradient-to-r from-cyan-500 via-white to-fuchsia-500 transition-all duration-300 shadow-[0_0_10px_rgba(6,182,212,0.5)]"
                    style={{ width: `${(progress.current / progress.total) * 100}%` }}
                  ></div>
              </div>
          )}

          {/* TAB: LIBRARY */}
          {activeTab === 'LIBRARY' && (
              <div className="h-full flex flex-col">
                  {/* Toolbar */}
                  <div className="px-6 py-4 flex items-center justify-between border-b border-[#222]/50">
                      <div className="flex items-center gap-4">
                          <button 
                            onClick={handleSelectAll}
                            className="text-[10px] font-bold text-gray-400 hover:text-white uppercase tracking-wider flex items-center gap-2 px-3 py-1.5 bg-[#111] rounded border border-[#222] transition-colors"
                          >
                             {selectedIds.size === allImages.length && allImages.length > 0 ? <CheckCircle size={12} className="text-cyan-500"/> : <div className="w-3 h-3 rounded-full border border-gray-600"></div>}
                             Selecionar Tudo
                          </button>
                          
                          {selectedIds.size > 0 && (
                             <span className="text-xs text-cyan-500 font-mono font-bold animate-in fade-in">
                                 {selectedIds.size} selecionados
                             </span>
                          )}
                      </div>

                      <div className="flex items-center gap-2">
                          <button 
                             onClick={() => processImages('ANALYZE')}
                             disabled={selectedIds.size === 0 || isProcessing}
                             className="flex items-center gap-2 px-4 py-1.5 bg-fuchsia-900/20 hover:bg-fuchsia-500 text-fuchsia-400 hover:text-white border border-fuchsia-500/30 rounded text-[10px] font-bold uppercase tracking-wider transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                              {isProcessing ? <Loader2 size={12} className="animate-spin"/> : <Sparkles size={12} />}
                              Analisar Lote
                          </button>
                      </div>
                  </div>

                  {/* Grid */}
                  <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
                      {photoLayers.map(layer => (
                          <div key={layer.id} className="mb-8">
                              <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-4 flex items-center gap-2 border-b border-[#222] pb-2">
                                  <Layers size={12} /> {layer.name} <span className="text-gray-700">({layer.images.length})</span>
                              </h3>
                              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                                  {layer.images.map(img => renderImageCard({ ...img, layerId: layer.id, layerName: layer.name }))}
                              </div>
                          </div>
                      ))}
                      {allImages.length === 0 && (
                          <div className="flex flex-col items-center justify-center h-64 text-gray-700">
                              <ImageIcon size={48} className="mb-4 opacity-20"/>
                              <p className="text-sm font-mono uppercase">Nenhuma foto carregada</p>
                          </div>
                      )}
                  </div>
              </div>
          )}

          {/* TAB: SEARCH */}
          {activeTab === 'SEARCH' && (
              <div className="h-full flex flex-col">
                  {/* Search Header */}
                  <div className="p-8 bg-gradient-to-b from-[#0a0a0a] to-[#050505] border-b border-[#222]">
                      <div className="max-w-4xl mx-auto w-full space-y-4">
                          <h2 className="text-xl font-bold text-white flex items-center gap-3">
                              <BrainCircuit className="text-fuchsia-500" /> Motor de Busca Visual
                          </h2>
                          
                          <div className="relative group">
                              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-fuchsia-500 transition-colors" size={20} />
                              <input 
                                  type="text" 
                                  value={searchQuery}
                                  onChange={(e) => setSearchQuery(e.target.value)}
                                  placeholder="Descreva o que procura (ex: trincas em vigas, corrosão, carros...)"
                                  className="w-full bg-[#111] border border-[#333] group-focus-within:border-fuchsia-500/50 rounded-xl pl-12 pr-4 py-4 text-sm text-white focus:outline-none transition-all placeholder-gray-600 shadow-xl"
                                  onKeyDown={(e) => e.key === 'Enter' && processImages('SEARCH', searchQuery)}
                              />
                              <button 
                                onClick={() => processImages('SEARCH', searchQuery)}
                                disabled={isProcessing || !searchQuery}
                                className="absolute right-2 top-1/2 -translate-y-1/2 px-4 py-2 bg-fuchsia-600 hover:bg-fuchsia-500 text-white rounded-lg text-xs font-bold uppercase tracking-wider transition-all disabled:opacity-50 flex items-center gap-2"
                              >
                                  {isProcessing ? <Loader2 size={14} className="animate-spin"/> : <ArrowRight size={14} />}
                                  Buscar
                              </button>
                          </div>

                          <div className="flex flex-wrap gap-2">
                              {DEFAULT_TAGS.map(tag => (
                                  <button 
                                    key={tag}
                                    onClick={() => setSearchQuery(tag)}
                                    className="px-2 py-1 bg-[#161616] border border-[#222] hover:border-fuchsia-500/50 text-gray-400 hover:text-white rounded text-[10px] uppercase transition-all"
                                  >
                                      {tag}
                                  </button>
                              ))}
                          </div>
                      </div>
                  </div>

                  {/* Search Results Area */}
                  <div className="flex-1 overflow-y-auto p-6 bg-[#050505] custom-scrollbar">
                      {isProcessing ? (
                          <div className="h-full flex flex-col items-center justify-center space-y-4 animate-in fade-in">
                              <Loader2 size={40} className="text-fuchsia-500 animate-spin" />
                              <div className="text-center">
                                  <div className="text-sm font-bold text-white uppercase tracking-widest">Analisando Imagens</div>
                                  <div className="text-xs text-gray-500 font-mono mt-1">Processando item {progress.current} de {progress.total}</div>
                              </div>
                          </div>
                      ) : hasSearched ? (
                          <div className="max-w-7xl mx-auto">
                               <div className="flex items-center justify-between mb-6">
                                   <h3 className="text-sm font-bold text-white uppercase tracking-widest flex items-center gap-2">
                                       <Search size={14} className="text-fuchsia-500" /> Resultados Encontrados
                                   </h3>
                                   <span className="text-xs text-gray-500 font-mono bg-[#111] px-2 py-1 rounded border border-[#222]">
                                       {Object.keys(searchResults).length} Ocorrências
                                   </span>
                               </div>

                               {Object.keys(searchResults).length > 0 ? (
                                   <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
                                       {allImages
                                           .filter(img => searchResults[img.id])
                                           .map(img => renderImageCard({ ...img, layerId: img.layerId, layerName: img.layerName }, true))
                                       }
                                   </div>
                               ) : (
                                   <div className="flex flex-col items-center justify-center py-20 border border-dashed border-[#222] rounded-xl bg-[#0a0a0a]">
                                       <AlertCircle size={40} className="text-gray-700 mb-4" />
                                       <p className="text-sm text-gray-500 font-bold uppercase">Nenhum resultado encontrado</p>
                                       <p className="text-xs text-gray-600 mt-1">Tente ajustar seus termos de busca.</p>
                                   </div>
                               )}
                          </div>
                      ) : (
                          <div className="h-full flex flex-col items-center justify-center opacity-30">
                              <BrainCircuit size={64} className="text-gray-700 mb-4" />
                              <p className="text-sm font-mono uppercase text-gray-500">Aguardando comando de busca</p>
                          </div>
                      )}
                  </div>
              </div>
          )}
      </div>

      {/* --- LIGHTBOX (Local Fullscreen) --- */}
      {lightboxImg && (
          <div className="absolute inset-0 z-[100] bg-black/95 backdrop-blur-xl flex items-center justify-center animate-in fade-in duration-200">
              <div className="relative w-full h-full flex items-center justify-center p-4">
                  <img 
                    src={lightboxImg.url} 
                    alt="Fullscreen" 
                    className="max-w-full max-h-full object-contain shadow-2xl"
                  />
                  
                  {/* Lightbox Controls */}
                  <div className="absolute top-4 right-4 flex gap-2">
                      <button 
                        onClick={() => { onSelectImage(lightboxImg); setLightboxImg(null); }}
                        className="px-4 py-2 bg-cyan-900/80 hover:bg-cyan-500 text-cyan-400 hover:text-black border border-cyan-500/30 rounded font-bold text-xs uppercase transition-all flex items-center gap-2 backdrop-blur-md"
                      >
                          <ScanEye size={14} /> Inspecionar Detalhes
                      </button>
                      <button 
                        onClick={() => setLightboxImg(null)}
                        className="p-2 bg-white/10 hover:bg-red-500/20 text-white hover:text-red-500 rounded-full transition-all"
                      >
                          <X size={24} />
                      </button>
                  </div>

                  <div className="absolute bottom-4 left-1/2 -translate-x-1/2 px-4 py-2 bg-black/60 backdrop-blur rounded-full text-white text-xs font-mono border border-white/10">
                      {lightboxImg.filename}
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};

export default PhotoGallery;
