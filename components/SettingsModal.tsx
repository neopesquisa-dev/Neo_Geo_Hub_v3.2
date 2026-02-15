

import React, { useState, useEffect } from 'react';
import { X, Moon, Sun, Monitor, HardDrive, Info, Database, Trash2, Cpu, AlertTriangle, CheckCircle } from 'lucide-react';
import { AppSettings } from '../types';
import { APP_CONFIG, TRANSLATIONS } from '../constants';
import { db, clearDB } from '../db';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  settings: AppSettings;
  onUpdateSettings: (newSettings: Partial<AppSettings>) => void;
}

const SettingsModal: React.FC<Props> = ({ 
  isOpen, 
  onClose, 
  settings, 
  onUpdateSettings, 
}) => {
  const [activeTab, setActiveTab] = useState<'general' | 'storage' | 'about'>('general');
  const [storageUsage, setStorageUsage] = useState<{ usage: number, quota: number } | null>(null);
  const [dbCount, setDbCount] = useState<number>(0);
  const [isClearing, setIsClearing] = useState(false);
  const [clearSuccess, setClearSuccess] = useState(false);

  const t = TRANSLATIONS[settings.language];

  useEffect(() => {
    if (isOpen) {
        checkStorage();
    }
  }, [isOpen, activeTab]);

  const checkStorage = async () => {
    try {
        // Fixed: Cast db to any to access isOpen and open methods
        if (!(db as any).isOpen()) await (db as any).open();

        // Safety check: verify layers table exists before calling count
        if (db.layers) {
          const count = await db.layers.count();
          setDbCount(count);
        } else {
          setDbCount(0);
        }

        if (navigator.storage && navigator.storage.estimate) {
            const estimate = await navigator.storage.estimate();
            if (estimate.usage !== undefined && estimate.quota !== undefined) {
                setStorageUsage({ usage: estimate.usage, quota: estimate.quota });
            }
        }
    } catch (e) {
        console.error("Storage estimate failed", e);
    }
  };

  const handleClearData = async () => {
      if (window.confirm("ATENÇÃO: Isso apagará TODOS os seus projetos, nuvens de pontos e fotos salvos localmente. Esta ação não pode ser desfeita. Continuar?")) {
          setIsClearing(true);
          try {
              await clearDB();
              setClearSuccess(true);
              await checkStorage();
              setTimeout(() => {
                  window.location.reload();
              }, 1500);
          } catch (e) {
              console.error("Failed to clear DB", e);
              setIsClearing(false);
          }
      }
  };

  const formatBytes = (bytes: number, decimals = 2) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[2000] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#0a0a0a] border border-[#333] w-full max-w-2xl rounded-lg shadow-2xl animate-in zoom-in-95 duration-200 flex flex-col overflow-hidden h-[60vh]">
        
        <div className="h-10 bg-[#111] border-b border-[#222] flex items-center justify-between px-4 select-none shrink-0">
          <div className="flex items-center gap-2">
             <div className="flex gap-1.5">
               <div className="w-2.5 h-2.5 rounded-full bg-red-500/50"></div>
               <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/50"></div>
               <div className="w-2.5 h-2.5 rounded-full bg-green-500/50"></div>
             </div>
             <span className="text-[10px] font-code text-gray-400 ml-2">sys_config.json</span>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors">
            <X size={16} />
          </button>
        </div>

        <div className="flex flex-1 overflow-hidden">
            <div className="w-40 bg-[#080808] border-r border-[#222] flex flex-col py-4 shrink-0">
                <button 
                    onClick={() => setActiveTab('general')}
                    className={`text-left px-4 py-3 text-xs font-bold uppercase tracking-wide border-l-2 transition-all flex items-center gap-2 ${activeTab === 'general' ? 'border-fuchsia-500 text-fuchsia-400 bg-fuchsia-900/10' : 'border-transparent text-gray-500 hover:text-gray-300'}`}
                >
                    <Monitor size={14} /> General
                </button>
                <button 
                    onClick={() => setActiveTab('storage')}
                    className={`text-left px-4 py-3 text-xs font-bold uppercase tracking-wide border-l-2 transition-all flex items-center gap-2 ${activeTab === 'storage' ? 'border-cyan-500 text-cyan-400 bg-cyan-900/10' : 'border-transparent text-gray-500 hover:text-gray-300'}`}
                >
                    <HardDrive size={14} /> Storage
                </button>
                <button 
                    onClick={() => setActiveTab('about')}
                    className={`text-left px-4 py-3 text-xs font-bold uppercase tracking-wide border-l-2 transition-all flex items-center gap-2 ${activeTab === 'about' ? 'border-yellow-500 text-yellow-400 bg-yellow-900/10' : 'border-transparent text-gray-500 hover:text-gray-300'}`}
                >
                    <Info size={14} /> About
                </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 custom-scrollbar bg-[#050505]">
                {activeTab === 'general' && (
                    <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
                        <section className="space-y-4">
                            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2 font-code border-b border-[#222] pb-2">Appearance</h3>
                            <div className="bg-[#111] rounded border border-[#222] p-1 flex">
                                <button onClick={() => onUpdateSettings({ theme: 'dark' })} className={`flex-1 flex items-center justify-center gap-2 py-2 rounded text-xs font-bold transition-all ${settings.theme === 'dark' ? 'bg-[#222] text-white shadow-sm' : 'text-gray-500 hover:text-gray-300'}`}><Moon size={14} /> DARK</button>
                                <button onClick={() => onUpdateSettings({ theme: 'light' })} className={`flex-1 flex items-center justify-center gap-2 py-2 rounded text-xs font-bold transition-all ${settings.theme === 'light' ? 'bg-[#e2e2e2] text-black shadow-sm' : 'text-gray-500 hover:text-gray-300'}`}><Sun size={14} /> LIGHT</button>
                            </div>
                        </section>
                        <section className="space-y-4">
                            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2 font-code border-b border-[#222] pb-2">Language</h3>
                            <div className="grid grid-cols-2 gap-3">
                                <div onClick={() => onUpdateSettings({ language: 'en' })} className={`cursor-pointer border rounded p-3 flex items-center gap-3 transition-all ${settings.language === 'en' ? 'border-cyan-500 bg-cyan-900/10' : 'border-[#222] bg-[#0f0f0f] hover:border-[#444]'}`}>
                                    <div className="text-xl">🇺🇸</div>
                                    <div className={`text-xs font-bold ${settings.language === 'en' ? 'text-white' : 'text-gray-400'}`}>English</div>
                                </div>
                                <div onClick={() => onUpdateSettings({ language: 'pt' })} className={`cursor-pointer border rounded p-3 flex items-center gap-3 transition-all ${settings.language === 'pt' ? 'border-cyan-500 bg-cyan-900/10' : 'border-[#222] bg-[#0f0f0f] hover:border-[#444]'}`}>
                                    <div className="text-xl">🇧🇷</div>
                                    <div className={`text-xs font-bold ${settings.language === 'pt' ? 'text-white' : 'text-gray-400'}`}>Português</div>
                                </div>
                            </div>
                        </section>
                    </div>
                )}

                {activeTab === 'storage' && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                        <div className="bg-[#111] border border-[#222] rounded-lg p-5">
                            <div className="flex items-center gap-4 mb-4">
                                <div className="p-3 bg-cyan-900/20 rounded-full border border-cyan-500/30 text-cyan-400"><Database size={24} /></div>
                                <div><div className="text-lg font-bold text-white">{dbCount}</div><div className="text-xs text-gray-400">Items in Local Storage</div></div>
                            </div>
                            <div className="space-y-2">
                                <div className="flex justify-between text-[10px] text-gray-400 font-mono uppercase">
                                    <span>Disk Usage</span>
                                    <span>{storageUsage ? formatBytes(storageUsage.usage) : 'Calculating...'}</span>
                                </div>
                                <div className="w-full h-2 bg-[#222] rounded-full overflow-hidden">
                                    <div className="h-full bg-cyan-500 transition-all duration-1000" style={{ width: storageUsage ? `${(storageUsage.usage / storageUsage.quota) * 100}%` : '0%' }}></div>
                                </div>
                            </div>
                        </div>
                        <div className="bg-red-900/5 border border-red-900/20 rounded-lg p-5">
                             <h4 className="text-xs font-bold text-red-500 uppercase flex items-center gap-2 mb-3"><AlertTriangle size={14} /> Danger Zone</h4>
                             {!clearSuccess ? (
                                <button onClick={handleClearData} disabled={isClearing} className="w-full py-2 bg-red-900/10 hover:bg-red-500 hover:text-white border border-red-500/30 text-red-400 rounded text-xs font-bold transition-all disabled:opacity-50">
                                    {isClearing ? 'LIMPANDO...' : 'WIPE LOCAL DATABASE'}
                                </button>
                             ) : (
                                <div className="flex items-center gap-2 text-green-500 text-xs font-bold animate-pulse"><CheckCircle size={14} /> DATABASE WIPED. RELOADING...</div>
                             )}
                        </div>
                    </div>
                )}

                {activeTab === 'about' && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                        <h3 className="text-xs font-bold text-yellow-500 uppercase tracking-widest flex items-center gap-2 font-code border-b border-[#222] pb-2"><Info size={14} /> System Info</h3>
                        <div className="bg-[#050505] border border-[#222] rounded p-4 font-mono text-[10px] space-y-3">
                            <div className="flex justify-between border-b border-[#222] pb-2"><span className="text-gray-500">APP_NAME</span><span className="text-white font-bold">{APP_CONFIG.APP_TITLE}</span></div>
                            <div className="flex justify-between border-b border-[#222] pb-2"><span className="text-gray-500">VERSION</span><span className="text-cyan-400">v2.1.0</span></div>
                            <div className="flex justify-between pb-1"><span className="text-gray-500">AI MODEL</span><span className="text-green-400">Gemini 3 Flash</span></div>
                        </div>
                    </div>
                )}
            </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsModal;