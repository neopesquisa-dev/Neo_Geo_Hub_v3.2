import React, { useState } from 'react';
import { Layer, PointCloudLayer, AppSettings } from '../types';
import { FileText, Database, Tag, Settings2, Move, ChevronRight, ChevronLeft, PanelRightClose, PanelRightOpen } from 'lucide-react';
import { TRANSLATIONS } from '../constants';

interface Props {
  activeLayer?: Layer;
  settings: AppSettings;
  onUpdateLayer: (id: string, updates: Partial<Layer>) => void;
}

const PropertiesPanel: React.FC<Props> = ({ activeLayer, settings, onUpdateLayer }) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const t = TRANSLATIONS[settings.language];

  const formatSize = (bytes?: number) => {
    if(!bytes) return 'N/A';
    if(bytes > 1024*1024) return `${(bytes / (1024*1024)).toFixed(2)} MB`;
    return `${(bytes / 1024).toFixed(2)} KB`;
  };

  // --- RENDERIZADO RECOLHIDO (MINIMIZADO) ---
  if (isCollapsed) {
    return (
        <div 
            onClick={() => setIsCollapsed(false)}
            className="w-10 bg-[#050505] border-l border-[#222] hidden lg:flex flex-col items-center py-4 cursor-pointer hover:bg-[#111] transition-all duration-300 z-30 group"
            title="Expandir Propriedades"
        >
            <PanelRightOpen size={16} className="text-gray-500 group-hover:text-cyan-400 mb-6 transition-colors" />
            <div className="flex-1 flex items-center justify-center">
                <span className="[writing-mode:vertical-rl] rotate-180 text-[10px] font-bold text-gray-600 group-hover:text-gray-300 uppercase tracking-[0.2em] font-mono whitespace-nowrap">
                    {t.prop_title}
                </span>
            </div>
        </div>
    );
  }

  // --- RENDERIZADO EXPANDIDO ---
  return (
    <div className="w-72 bg-[#050505] border-l border-[#222] hidden lg:flex flex-col z-30 transition-all duration-300">
      
      {/* Header */}
      <div className="p-4 border-b border-[#222] bg-[#080808] flex items-center justify-between shrink-0">
        <h3 className="font-bold text-gray-200 flex items-center gap-2 text-xs uppercase tracking-widest">
          <FileText size={14} className="text-cyan-500" /> {t.prop_title}
        </h3>
        <button 
            onClick={() => setIsCollapsed(true)}
            className="text-gray-600 hover:text-white transition-colors"
            title="Recolher Painel"
        >
            <PanelRightClose size={16} />
        </button>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto custom-scrollbar">
          
          {!activeLayer ? (
            // Placeholder State (Inside the panel now)
            <div className="h-full flex flex-col items-center justify-center text-gray-600 p-6 text-center select-none">
                <Settings2 size={24} className="mb-4 opacity-20" />
                <p className="text-xs font-mono uppercase tracking-widest opacity-50">{t.prop_no_sel}</p>
            </div>
          ) : (
            <div className="p-4 space-y-8">
                {/* General Info */}
                <div className="space-y-3">
                <div className="text-[10px] font-bold text-gray-600 uppercase tracking-widest flex items-center gap-2">
                    <Tag size={10} /> {t.prop_dataset}
                </div>
                
                <div className="grid grid-cols-1 gap-3">
                    <div className="space-y-1">
                        <label className="text-[10px] text-gray-500 font-mono block">{t.prop_filename}</label>
                        <div className="text-xs text-gray-200 font-medium truncate border-b border-[#222] pb-1" title={activeLayer.name}>{activeLayer.name}</div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1">
                            <label className="text-[10px] text-gray-500 font-mono block">{t.prop_type}</label>
                            <div className="text-xs text-gray-300 bg-[#111] px-2 py-1 rounded inline-block">
                                {activeLayer.type === 'POINT_CLOUD' && 'LiDAR/Scan'}
                                {activeLayer.type === 'PHOTO_SET' && 'Imagery Set'}
                                {activeLayer.type === 'GAUSSIAN_SPLAT' && '3D Splat'}
                            </div>
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] text-gray-500 font-mono block">{t.prop_date}</label>
                            <div className="text-xs text-gray-300 py-1">{activeLayer.date.split(' ')[0]}</div>
                        </div>
                    </div>
                </div>
                </div>

                {/* Cloud Stats */}
                {activeLayer.type === 'POINT_CLOUD' && (
                <div className="space-y-3">
                    <div className="text-[10px] font-bold text-gray-600 uppercase tracking-widest flex items-center gap-2">
                        <Database size={10} /> {t.prop_stats}
                    </div>
                    <div className="bg-[#0a0a0a] border border-[#222] rounded p-3 space-y-3">
                    <div className="flex justify-between items-end">
                        <span className="text-[10px] text-gray-500">{t.prop_total_pts}</span>
                        <span className="text-xs text-cyan-400 font-mono">{(activeLayer as PointCloudLayer).pointCount.toLocaleString()}</span>
                    </div>
                    
                    {/* Offset Info */}
                    {(activeLayer as PointCloudLayer).modelData && (
                        <>
                        <div className="w-full h-px bg-[#222]"></div>
                        <div className="space-y-1">
                            <div className="flex items-center gap-1 text-[10px] text-gray-500"><Move size={10}/> {t.prop_offset}</div>
                            <div className="grid grid-cols-3 gap-1 font-mono text-[9px] text-gray-400">
                                <div className="bg-[#111] p-1 rounded">X: {(activeLayer as PointCloudLayer).modelData!.offset[0].toFixed(0)}</div>
                                <div className="bg-[#111] p-1 rounded">Y: {(activeLayer as PointCloudLayer).modelData!.offset[1].toFixed(0)}</div>
                                <div className="bg-[#111] p-1 rounded">Z: {(activeLayer as PointCloudLayer).modelData!.offset[2].toFixed(0)}</div>
                            </div>
                        </div>
                        </>
                    )}
                    </div>
                </div>
                )}
            </div>
          )}
      </div>
      
      {!isCollapsed && (
        <div className="p-4 border-t border-[#222] bg-[#080808] text-[9px] text-gray-700 text-center font-mono shrink-0 uppercase">
            NEO GEO HUB .v³ {t.prop_version} 3.0.0
        </div>
      )}
    </div>
  );
};

export default PropertiesPanel;