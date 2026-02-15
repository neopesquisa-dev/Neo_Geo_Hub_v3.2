
import React, { useState } from 'react';
import { Layer, PhotoLayer, GeoImage } from '../types';
import { X, FileText, Share2, Printer, MapPin, CheckCircle, AlertOctagon } from 'lucide-react';
import { APP_CONFIG } from '../constants';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  layers: Layer[];
}

const InspectionReportModal: React.FC<Props> = ({ isOpen, onClose, layers }) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const allImages: GeoImage[] = layers
    .filter(l => l.type === 'PHOTO_SET' && l.visible)
    .flatMap(l => (l as PhotoLayer).images);

  const totalAssets = allImages.length;
  const analyzedAssets = allImages.filter(i => i.analysis).length;
  
  const handleShare = () => {
    const baseUrl = window.location.origin;
    const dummyLink = `${baseUrl}/report/${Math.random().toString(36).substring(7)}`;
    
    navigator.clipboard.writeText(dummyLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-[1500] bg-black/90 backdrop-blur-md flex items-center justify-center p-4 print:p-0 print:bg-white print:static">
      <div className="bg-[#0a0a0a] w-full max-w-5xl h-[90vh] rounded-xl border border-[#333] flex flex-col shadow-2xl animate-in zoom-in-95 duration-200 print:h-auto print:border-none print:shadow-none print:text-black print:bg-white transition-colors">
        
        <div className="p-6 border-b border-[#222] flex items-center justify-between bg-[#080808] print:bg-white print:border-black">
          <div className="flex items-center gap-4">
            <div className="h-12 w-auto flex items-center justify-center overflow-hidden">
                <img 
                    src={APP_CONFIG.LOGO_SOURCE}
                    alt={APP_CONFIG.APP_TITLE}
                    className="h-full w-auto object-contain max-w-[120px]" 
                />
            </div>
            <div>
                <h2 className="text-xl font-bold text-white tracking-tight print:text-black">Relatório de Inspeção Técnica</h2>
                <div className="flex items-center gap-3 text-xs text-gray-500 font-mono mt-1 print:text-gray-600">
                    <span>ID: REF-{new Date().getFullYear()}-001</span>
                    <span className="w-1 h-1 bg-gray-600 rounded-full"></span>
                    <span>{new Date().toLocaleDateString()}</span>
                </div>
            </div>
          </div>
          
          <div className="flex items-center gap-3 print:hidden">
             <button 
                onClick={handlePrint}
                className="flex items-center gap-2 px-4 py-2 bg-[#1a1a1a] hover:bg-[#222] border border-[#333] text-gray-300 rounded text-xs font-bold transition-colors"
             >
                <Printer size={14} /> IMPRIMIR PDF
             </button>
             <button 
                onClick={handleShare}
                className="flex items-center gap-2 px-4 py-2 bg-yellow-600 hover:bg-yellow-500 text-black rounded text-xs font-bold transition-colors shadow-lg shadow-yellow-900/20"
             >
                <Share2 size={14} /> 
                {copied ? 'LINK COPIADO!' : 'COMPARTILHAR LINK'}
             </button>
             <button 
                onClick={onClose}
                className="p-2 hover:bg-[#222] rounded-full text-gray-500 transition-colors"
             >
                <X size={20} />
             </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar print:overflow-visible">
            <div className="grid grid-cols-4 gap-4 mb-8 print:grid-cols-4">
                <div className="bg-[#111] border border-[#222] p-4 rounded-lg print:bg-gray-50 print:border-gray-300">
                    <label className="text-[10px] text-gray-500 font-bold uppercase tracking-wider print:text-black">Ativos Totais</label>
                    <div className="text-2xl font-mono text-white mt-1 print:text-black">{totalAssets}</div>
                </div>
                <div className="bg-[#111] border border-[#222] p-4 rounded-lg print:bg-gray-50 print:border-gray-300">
                    <label className="text-[10px] text-gray-500 font-bold uppercase tracking-wider print:text-black">Inspecionados (IA)</label>
                    <div className="text-2xl font-mono text-yellow-500 mt-1 print:text-black">{analyzedAssets}</div>
                </div>
                <div className="bg-[#111] border border-[#222] p-4 rounded-lg print:bg-gray-50 print:border-gray-300">
                    <label className="text-[10px] text-gray-500 font-bold uppercase tracking-wider print:text-black">Status</label>
                    <div className="text-xs font-bold text-yellow-500 mt-2 border border-yellow-500/30 bg-yellow-900/20 inline-block px-2 py-1 rounded print:text-black print:border-black print:bg-transparent">
                        EM ANÁLISE
                    </div>
                </div>
                 <div className="bg-[#111] border border-[#222] p-4 rounded-lg print:bg-gray-50 print:border-gray-300">
                    <label className="text-[10px] text-gray-500 font-bold uppercase tracking-wider print:text-black">Coordenadas</label>
                    <div className="text-xs text-gray-400 mt-2 font-mono truncate print:text-black">
                       {allImages[0] ? `${allImages[0].lat.toFixed(4)}, ${allImages[0].lng.toFixed(4)}` : 'N/A'}
                    </div>
                </div>
            </div>

            <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-4 border-b border-[#222] pb-2 print:text-black print:border-black">
                Registro Fotográfico e Análise
            </h3>

            <div className="space-y-6">
                {allImages.map((img, idx) => (
                    <div key={img.id} className="bg-[#111] border border-[#222] rounded-lg overflow-hidden flex flex-col md:flex-row print:bg-white print:border-gray-300 print:break-inside-avoid">
                        <div className="w-full md:w-64 h-48 bg-black shrink-0 relative border-r border-[#222] print:border-gray-300">
                            <img src={img.url} className="w-full h-full object-contain" alt={img.filename} />
                            <div className="absolute bottom-2 left-2 bg-black/60 backdrop-blur px-2 py-1 rounded text-[9px] text-white font-mono">
                                {idx + 1}. {img.filename}
                            </div>
                        </div>
                        
                        <div className="flex-1 p-4 flex flex-col">
                             <div className="flex items-start justify-between mb-3">
                                <div className="flex items-center gap-2 text-[10px] font-mono text-gray-500 print:text-black">
                                    <MapPin size={12} />
                                    COORD: {img.lat.toFixed(6)}, {img.lng.toFixed(6)}
                                </div>
                                
                                {img.analysis ? (
                                    <div className="flex items-center gap-1.5 px-2 py-1 bg-yellow-900/20 text-yellow-500 border border-yellow-500/30 rounded text-[10px] font-bold uppercase print:text-black print:border-black print:bg-gray-200">
                                        <CheckCircle size={10} /> Inspecionado
                                    </div>
                                ) : (
                                    <div className="flex items-center gap-1.5 px-2 py-1 bg-gray-800 text-gray-400 border border-gray-700 rounded text-[10px] font-bold uppercase print:text-black print:border-black print:bg-gray-100">
                                        <AlertOctagon size={10} /> Pendente
                                    </div>
                                )}
                             </div>

                             <div className="flex-1 bg-[#080808] border border-[#222] rounded p-3 print:bg-gray-50 print:border-none">
                                <label className="text-[9px] text-fuchsia-500 font-bold uppercase block mb-1 print:text-black">Análise Técnica (IA)</label>
                                <p className="text-xs text-gray-300 font-mono leading-relaxed whitespace-pre-wrap print:text-black">
                                    {img.analysis || "Aguardando processamento de inteligência artificial..."}
                                </p>
                             </div>
                        </div>
                    </div>
                ))}
            </div>

            <div className="hidden print:block mt-8 border-t border-black pt-4 text-center text-xs font-mono">
                Relatório gerado automaticamente por Neo Geo Hub .v² Platform. {new Date().toLocaleString()}
            </div>
        </div>
      </div>
    </div>
  );
};

export default InspectionReportModal;
