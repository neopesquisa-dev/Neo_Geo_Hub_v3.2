
import React, { useRef, useState } from 'react';
import { Layer, AppSettings, Workspace } from '../types';
import { Eye, EyeOff, Upload, Grid, ChevronDown, Database, Tag, Trash2, Aperture, Info, PlayCircle, Camera, Download, Cloud, Save, RotateCw, X } from 'lucide-react';
import { TRANSLATIONS } from '../constants';

interface SidebarProps {
    layers: Layer[];
    activeLayerId: string | null;
    activeWorkspace: Workspace;
    onToggleLayer: (id: string) => void;
    onSelectLayer: (id: string) => void;
    onDeleteLayer: (id: string) => void;
    onUpload: (files: FileList | null, customName: string, typeHint: 'SPLAT' | 'CLOUD' | 'PHOTO') => void;
    onLoadDemo: () => void;
    settings: AppSettings;
    onCloseMobile?: () => void;
    canUpload?: boolean;
    canDelete?: boolean;
}

const GroupHeader: React.FC<{ label: string; formats: string; icon?: React.ReactNode }> = ({ label, formats, icon }) => (
    <div className="px-4 py-2 bg-[#0a0a0a] border-y border-[#1a1a1a] flex items-center justify-between group cursor-help select-none mt-2">
        <div className="flex items-center gap-2">
            {icon || <ChevronDown size={10} className="text-gray-500" />}
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{label}</span>
        </div>

        <div className="relative flex items-center">
            <Info size={10} className="text-gray-700 group-hover:text-yellow-500 transition-colors" />
            <div className="absolute right-0 top-5 w-48 bg-[#111] border border-[#333] rounded p-2.5 shadow-[0_4px_20px_rgba(0,0,0,0.5)] opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-[60] pointer-events-none transform translate-y-1 group-hover:translate-y-0">
                <div className="flex items-center justify-between border-b border-[#222] pb-1.5 mb-1.5">
                    <span className="text-[8px] text-gray-500 font-bold uppercase tracking-wider">Supported Formats</span>
                    <Tag size={8} className="text-yellow-600" />
                </div>
                <div className="text-[9px] text-yellow-400 font-mono leading-relaxed break-words">
                    {formats}
                </div>
                <div className="absolute -top-1 right-0.5 w-2 h-2 bg-[#111] border-l border-t border-[#333] transform rotate-45"></div>
            </div>
        </div>
    </div>
);

const Sidebar: React.FC<SidebarProps> = ({ layers, activeLayerId, activeWorkspace, onToggleLayer, onSelectLayer, onDeleteLayer, onUpload, onLoadDemo, settings, onCloseMobile, canUpload = true, canDelete = true }) => {
    const photoInputRef = useRef<HTMLInputElement>(null);
    const cloudInputRef = useRef<HTMLInputElement>(null);
    const splatInputRef = useRef<HTMLInputElement>(null);

    const [uploadName, setUploadName] = useState("");
    const t = TRANSLATIONS[settings.language];

    const handleUploadClick = (ref: React.RefObject<HTMLInputElement>) => ref.current?.click();

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, hint: 'PHOTO' | 'CLOUD' | 'SPLAT') => {
        if (e.target.files && e.target.files.length > 0) {
            onUpload(e.target.files, uploadName, hint);
            e.target.value = '';
            setUploadName("");
        }
    };

    const isDemoEmpty = activeWorkspace.id === 'demo-session' && layers.length === 0;
    const isDemoSession = activeWorkspace.id === 'demo-session';

    return (
        <aside className="w-72 h-full bg-[#050505] border-r border-[#222] flex flex-col z-40">

            {/* Mobile Close Button */}
            {onCloseMobile && (
                <div className="flex md:hidden p-2 justify-end border-b border-[#222]">
                    <button onClick={onCloseMobile} className="text-gray-400 hover:text-white p-2">
                        <X size={20} />
                    </button>
                </div>
            )}

            {canUpload && (
                <div className="p-4 border-b border-[#222] space-y-3 bg-[#080808]">
                    <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <Tag size={12} className="text-gray-500" />
                        </div>
                        <input
                            type="text"
                            value={uploadName}
                            onChange={(e) => setUploadName(e.target.value)}
                            placeholder={t.sidebar_upload_ph}
                            className="w-full bg-[#0a0a0a] border border-[#222] rounded pl-8 pr-3 py-2 text-xs text-white placeholder-gray-600 focus:border-yellow-500 focus:outline-none font-mono transition-colors"
                        />
                    </div>

                    <input type="file" multiple accept=".jpg,.jpeg,.png,.webp" ref={photoInputRef} className="hidden" onChange={(e) => handleFileChange(e, 'PHOTO')} />
                    <input type="file" multiple accept=".ply,.las,.laz,.xyz,.txt,.asc" ref={cloudInputRef} className="hidden" onChange={(e) => handleFileChange(e, 'CLOUD')} />
                    <input type="file" multiple accept=".ply,.splat" ref={splatInputRef} className="hidden" onChange={(e) => handleFileChange(e, 'SPLAT')} />

                    <div className="grid grid-cols-3 gap-1.5">
                        <button
                            onClick={() => handleUploadClick(photoInputRef)}
                            className="bg-cyan-900/10 hover:bg-cyan-900/20 text-cyan-400 border border-cyan-400/20 hover:border-cyan-400 text-[8px] font-bold py-3 px-1 rounded flex flex-col items-center justify-center gap-1.5 transition-all group"
                            title="Carregar Fotos Georreferenciadas"
                        >
                            <Camera size={14} className="group-hover:scale-110 transition-transform" />
                            <span className="uppercase">Fotos</span>
                        </button>

                        <button
                            onClick={() => handleUploadClick(cloudInputRef)}
                            className="bg-fuchsia-900/10 hover:bg-fuchsia-900/20 text-fuchsia-500 border border-fuchsia-500/20 hover:border-fuchsia-500 text-[8px] font-bold py-3 px-1 rounded flex flex-col items-center justify-center gap-1.5 transition-all group"
                            title="Carregar Nuvem de Pontos Técnica"
                        >
                            <Database size={14} className="group-hover:scale-110 transition-transform" />
                            <span className="uppercase">Nuvem</span>
                        </button>

                        <button
                            onClick={() => handleUploadClick(splatInputRef)}
                            className="bg-yellow-900/10 hover:bg-yellow-900/20 text-yellow-500 border border-yellow-500/20 hover:border-yellow-500 text-[8px] font-bold py-3 px-1 rounded flex flex-col items-center justify-center gap-1.5 transition-all group"
                            title="Carregar Gaussian Splat (PLY Neural)"
                        >
                            <Aperture size={14} className="group-hover:animate-spin-slow transition-transform" />
                            <span className="uppercase">3DGS</span>
                        </button>
                    </div>
                </div>
            )}

            <div className="flex-1 overflow-y-auto px-0 pb-4 custom-scrollbar">
                <div className="mt-2 mb-1 px-4 py-2 flex items-center justify-between text-[10px] font-bold text-gray-500 uppercase tracking-widest border-b border-[#222] border-dashed mx-4 pb-2">
                    <span>{t.sidebar_proj_layers}</span>
                    <div className="flex items-center gap-2">
                        {isDemoSession && (
                            <button onClick={onLoadDemo} className="p-1 hover:bg-yellow-900/30 text-yellow-600 hover:text-yellow-400 rounded transition-colors" title="Reset Demo Data">
                                <RotateCw size={10} />
                            </button>
                        )}
                        <span className="flex items-center gap-1 text-[9px] text-yellow-500" title="Dados salvos automaticamente"><Save size={10} /> Local</span>
                    </div>
                </div>

                {isDemoEmpty ? (
                    <div className="px-4 py-8 flex flex-col items-center text-center space-y-3 animate-in fade-in slide-in-from-left-4">
                        <div className="w-12 h-12 bg-yellow-900/10 border border-yellow-500/20 rounded-full flex items-center justify-center">
                            <Cloud size={20} className="text-yellow-500" />
                        </div>
                        <div>
                            <h3 className="text-xs font-bold text-gray-300">Sessão DEMO Vazia</h3>
                            <button onClick={onLoadDemo} className="mt-4 flex items-center gap-2 px-4 py-2 bg-yellow-500 hover:bg-yellow-400 text-black rounded text-xs font-bold transition-all shadow-[0_0_15px_rgba(207,255,4,0.2)]">
                                <Download size={12} /> {t.sidebar_demo_load}
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-0">
                        <GroupHeader label={t.sidebar_splats} formats=".SPLAT, .PLY (Neural)" icon={<Aperture size={10} className="text-yellow-500" />} />
                        <div className="py-1 bg-[#080808]">
                            {layers.filter(l => l.type === 'GAUSSIAN_SPLAT').map(layer => (
                                <LayerItem key={layer.id} layer={layer} isActive={activeLayerId === layer.id} onSelect={() => onSelectLayer(layer.id)} onToggle={() => onToggleLayer(layer.id)} onDelete={() => onDeleteLayer(layer.id)} canDelete={canDelete} icon={<PlayCircle size={12} className={activeLayerId === layer.id ? "text-yellow-500" : "text-yellow-700"} />} />
                            ))}
                        </div>

                        <GroupHeader label={t.sidebar_clouds} formats=".PLY, .XYZ, .LAS, .LAZ" icon={<Grid size={10} className="text-fuchsia-600" />} />
                        <div className="py-1">
                            {layers.filter(l => l.type === 'POINT_CLOUD').map(layer => (
                                <LayerItem key={layer.id} layer={layer} isActive={activeLayerId === layer.id} onSelect={() => onSelectLayer(layer.id)} onToggle={() => onToggleLayer(layer.id)} onDelete={() => onDeleteLayer(layer.id)} canDelete={canDelete} icon={<Database size={12} className={activeLayerId === layer.id ? "text-fuchsia-400" : "text-gray-600"} />} />
                            ))}
                        </div>

                        <GroupHeader label={t.sidebar_photos} formats=".JPG, .PNG (EXIF)" icon={<Camera size={10} className="text-cyan-400" />} />
                        <div className="py-1">
                            {layers.filter(l => l.type === 'PHOTO_SET').map(layer => (
                                <LayerItem key={layer.id} layer={layer} isActive={activeLayerId === layer.id} onSelect={() => onSelectLayer(layer.id)} onToggle={() => onToggleLayer(layer.id)} onDelete={() => onDeleteLayer(layer.id)} canDelete={canDelete} icon={<Camera size={12} className={activeLayerId === layer.id ? "text-cyan-400" : "text-cyan-700"} />} />
                            ))}
                        </div>
                    </div>
                )}
            </div>

            <div className="p-3 border-t border-[#222] bg-[#080808]">
                <div className="flex flex-col gap-2">
                    <div className="flex justify-between items-center">
                        <div className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">{t.sidebar_sys_status}</div>
                        <div className="flex items-center gap-1 text-[9px] text-gray-600 font-mono">
                            {layers.length} items
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                        <div className="bg-[#111] p-1.5 rounded border border-[#222]">
                            <div className="text-[9px] text-gray-600">Storage</div>
                            <div className="text-[10px] text-gray-300 font-mono mt-0.5">{(layers.length * 12 + 45).toFixed(0)} MB</div>
                        </div>
                        <div className="bg-[#111] p-1.5 rounded border border-[#222]">
                            <div className="text-[9px] text-gray-600">Active DB</div>
                            <div className="text-[10px] text-yellow-500 font-mono mt-0.5">{activeWorkspace.name.substring(0, 10)}</div>
                        </div>
                    </div>
                </div>
            </div>
        </aside>
    );
};

const LayerItem: React.FC<{
    layer: Layer,
    isActive: boolean,
    onSelect: () => void,
    onToggle: (e: React.MouseEvent) => void,
    onDelete: (e: React.MouseEvent) => void,
    canDelete?: boolean,
    icon: React.ReactNode,
}> = ({ layer, isActive, onSelect, onToggle, onDelete, canDelete = true, icon }) => {

    let activeClasses = 'bg-[#111] border-transparent';
    if (isActive) {
        if (layer.type === 'GAUSSIAN_SPLAT') activeClasses = 'bg-yellow-900/10 border-yellow-500';
        else if (layer.type === 'PHOTO_SET') activeClasses = 'bg-cyan-900/10 border-cyan-500';
        else activeClasses = 'bg-fuchsia-900/10 border-fuchsia-500';
    }

    return (
        <div
            onClick={onSelect}
            className={`group flex items-center gap-3 px-4 py-2 cursor-pointer border-l-[3px] transition-all relative ${activeClasses} hover:bg-[#111]`}
        >
            <button onClick={(e) => { e.stopPropagation(); onToggle(e); }} className="text-gray-600 hover:text-white transition-colors">
                {layer.visible ? <Eye size={12} /> : <EyeOff size={12} className="opacity-40" />}
            </button>

            {icon}

            <div className="flex flex-col min-w-0 flex-1">
                <span className={`text-[11px] font-medium truncate ${isActive ? 'text-white' : 'text-gray-400 group-hover:text-gray-300'}`}>
                    {layer.name}
                </span>
                <div className="flex items-center gap-2">
                    <span className="text-[9px] text-gray-700 font-mono truncate">
                        {layer.date ? layer.date.split(' ')[0] : 'Desconhecida'}
                    </span>
                    {isActive && layer.type === 'GAUSSIAN_SPLAT' && <span className="text-[8px] text-yellow-500 font-bold uppercase tracking-widest animate-pulse">ATIVO</span>}
                    {isActive && layer.type === 'PHOTO_SET' && <span className="text-[8px] text-cyan-500 font-bold uppercase tracking-widest animate-pulse">ATIVO</span>}
                </div>
            </div>

            {canDelete && (
                <button onClick={(e) => { e.stopPropagation(); onDelete(e); }} className="opacity-0 group-hover:opacity-100 text-gray-600 hover:text-red-500 transition-all p-1" title="Delete Layer">
                    <Trash2 size={12} />
                </button>
            )}
        </div>
    );
};

export default Sidebar;
