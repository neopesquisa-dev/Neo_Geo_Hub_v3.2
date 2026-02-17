
import React from 'react';
import { Box, Map, Image as ImageIcon, Menu, Database, ClipboardList, Settings, User, Server } from 'lucide-react';
import { ViewMode, AppSettings, UserProfile, Workspace } from '../types';
import { APP_CONFIG, TRANSLATIONS } from '../constants';

interface HeaderProps {
  currentMode: ViewMode;
  setMode: (mode: ViewMode) => void;
  toggleSidebar: () => void;
  onOpenReport: () => void;
  onOpenSettings: () => void;
  onOpenProfile: () => void;
  onSwitchWorkspace: () => void;
  settings: AppSettings;
  user: UserProfile;
  activeWorkspace: Workspace;
}

const Header: React.FC<HeaderProps> = ({ 
    currentMode, setMode, toggleSidebar, onOpenReport, onOpenSettings, onOpenProfile, onSwitchWorkspace,
    settings, user, activeWorkspace 
}) => {
  const t = TRANSLATIONS[settings.language];

  return (
    <header className="h-14 md:h-16 bg-[#050505] border-b border-[#222] flex items-center justify-between px-3 md:px-4 z-50 select-none relative transition-colors shrink-0">
      <div className="flex items-center gap-2 md:gap-6 flex-1 min-w-0">
        <button 
            className="md:hidden text-gray-500 hover:text-white p-1.5 -ml-1.5 rounded-lg active:bg-white/10 transition-colors shrink-0"
            onClick={toggleSidebar}
        >
            <Menu size={20} />
        </button>

        <div className="flex items-center gap-2 md:gap-3 shrink-0">
          <div className="h-6 md:h-10 w-auto flex items-center flex-shrink-0">
              <img 
                  src={APP_CONFIG.LOGO_SOURCE}
                  alt={APP_CONFIG.APP_TITLE} 
                  className="h-full w-auto object-contain"
              />
          </div>
          
          <div 
              className="flex flex-col justify-center cursor-pointer group min-w-0"
              onClick={() => setMode(ViewMode.MODE_3D)}
              title="Voltar para Workspace"
          >
            {/* Title FULL on Mobile and Desktop */}
            <h1 className="text-sm md:text-xl font-bold text-white tracking-tighter leading-none font-code uppercase transition-colors whitespace-nowrap">
              <span className="group-hover:text-cyan-400 transition-colors duration-300">Neo</span>{' '}
              <span className="group-hover:text-fuchsia-500 transition-colors duration-300">Geo</span>{' '}
              <span className="group-hover:text-yellow-500 transition-colors duration-300">Hub</span>{' '}
              <span className="text-fuchsia-500 group-hover:text-fuchsia-400 transition-colors duration-300">.v³</span>
            </h1>
            <span className="text-[9px] md:text-[10px] text-cyan-600 font-code font-medium tracking-[0.2em] uppercase leading-tight group-hover:text-white transition-colors duration-300 block">
              &lt;{APP_CONFIG.APP_SUBTITLE} /&gt;
            </span>
          </div>
        </div>
        
        <div className="h-6 md:h-8 w-px bg-[#222] hidden md:block"></div>

        <div className="bg-[#0a0a0a] rounded p-1 border border-[#222] hidden md:flex font-code">
          <button 
            onClick={() => setMode(ViewMode.MODE_3D)}
            className={`flex items-center gap-2 px-4 py-1.5 rounded text-xs font-bold uppercase tracking-tight transition-all ${currentMode === ViewMode.MODE_3D ? 'bg-cyan-900/20 text-cyan-400 border border-cyan-500/50' : 'text-gray-500 hover:text-gray-300'}`}
          >
            <Box size={14} /> <span>{t.nav_workspace}</span>
          </button>
          <button 
            onClick={() => setMode(ViewMode.MODE_MAP)}
            className={`flex items-center gap-2 px-4 py-1.5 rounded text-xs font-bold uppercase tracking-tight transition-all ${currentMode === ViewMode.MODE_MAP ? 'bg-cyan-900/20 text-cyan-400 border border-cyan-500/50' : 'text-gray-500 hover:text-gray-300'}`}
          >
            <Map size={14} /> <span>{t.nav_map}</span>
          </button>
          <button 
            onClick={() => setMode(ViewMode.MODE_GALLERY)}
            className={`flex items-center gap-2 px-4 py-1.5 rounded text-xs font-bold uppercase tracking-tight transition-all ${currentMode === ViewMode.MODE_GALLERY ? 'bg-cyan-900/20 text-cyan-400 border border-cyan-500/50' : 'text-gray-500 hover:text-gray-300'}`}
          >
            <ImageIcon size={14} /> <span>{t.nav_gallery}</span>
          </button>
        </div>
      </div>

      <div className="flex items-center gap-2 md:gap-4 font-code shrink-0">
        <button 
            onClick={onSwitchWorkspace}
            className={`flex items-center gap-2 px-2 md:px-3 py-1.5 border rounded text-[10px] font-bold uppercase tracking-tight transition-all max-w-[90px] xs:max-w-[120px] md:max-w-none
            ${activeWorkspace.id === 'demo-session' 
                ? 'bg-yellow-500/10 border-yellow-500/30 text-yellow-500 hover:bg-yellow-500/20 hover:border-yellow-500' 
                : 'bg-[#1a1a1a] border-[#333] text-gray-400 hover:border-gray-400 hover:text-white'}
            `}
        >
            <Server size={12} className="shrink-0" />
            <span className="flex flex-col items-start leading-none gap-0.5 overflow-hidden">
                <span className="text-[7px] opacity-60 hidden md:inline">SESSION:</span>
                <span className="truncate w-full text-left">{activeWorkspace.name}</span>
            </span>
        </button>

        <div className="h-6 w-px bg-[#222] hidden md:block"></div>

        <button 
          onClick={onOpenReport}
          className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-fuchsia-900/10 hover:bg-fuchsia-900/30 border border-fuchsia-500/30 hover:border-fuchsia-500 rounded text-[11px] text-fuchsia-300 font-bold uppercase tracking-tight transition-all"
        >
            <ClipboardList size={14} />
            {t.nav_report}
        </button>

        <div className="hidden lg:flex items-center gap-2 px-3 py-1 bg-[#0a0a0a] border border-[#222] rounded text-[10px] text-gray-500 tracking-tight">
            <Database size={10} className="text-yellow-500 animate-pulse" />
            {t.sys_online}
        </div>
        
        <button
          onClick={onOpenSettings}
          className="p-1.5 md:p-2 text-gray-500 hover:text-cyan-400 transition-colors rounded-full hover:bg-[#111]"
          title="Configurações"
        >
           <Settings size={18} />
        </button>
      </div>
    </header>
  );
};

export default Header;
