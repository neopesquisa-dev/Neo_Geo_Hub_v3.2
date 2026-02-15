import React from 'react';
import { X, User, Briefcase, Database, Check, Shield, Activity, HardDrive, LogOut } from 'lucide-react';
import { UserProfile } from '../types';
import { MOCK_WORKSPACES } from '../constants';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  user: UserProfile;
  onUpdateUser: (updates: Partial<UserProfile>) => void;
}

const UserProfileModal: React.FC<Props> = ({ isOpen, onClose, user, onUpdateUser }) => {
  if (!isOpen) return null;

  const activeWorkspace = MOCK_WORKSPACES.find(w => w.id === user.activeWorkspaceId);

  return (
    <div className="fixed inset-0 z-[2000] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#050505] w-full max-w-3xl rounded-xl border border-[#333] shadow-2xl overflow-hidden flex flex-col md:flex-row animate-in zoom-in-95 duration-200">
        
        {/* Left Panel - Identity Card Visual */}
        <div className="w-full md:w-80 bg-[#0a0a0a] border-r border-[#222] p-6 flex flex-col items-center text-center relative overflow-hidden group">
            {/* Background Decor */}
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-cyan-500 via-fuchsia-500 to-yellow-500"></div>
            <div className="absolute top-10 -right-10 w-32 h-32 bg-cyan-500/10 blur-3xl rounded-full pointer-events-none"></div>

            <div className="relative w-24 h-24 mb-4">
                <div className="absolute inset-0 rounded-full border-2 border-cyan-500/30 animate-[spin_10s_linear_infinite]"></div>
                <div className="absolute inset-1 rounded-full border border-dashed border-gray-600 animate-[spin_15s_linear_infinite_reverse]"></div>
                <img 
                    src={user.avatarUrl} 
                    alt="User" 
                    className="absolute inset-2 w-[calc(100%-16px)] h-[calc(100%-16px)] rounded-full object-cover border border-[#333]"
                />
                <div className="absolute bottom-0 right-0 w-4 h-4 bg-green-500 border-2 border-[#0a0a0a] rounded-full shadow-[0_0_10px_rgba(34,197,94,0.6)]"></div>
            </div>

            <h2 className="text-xl font-bold text-white tracking-tight">{user.name}</h2>
            <div className="text-[10px] text-cyan-400 font-code mt-1 uppercase tracking-widest">{user.role}_ACCESS_LEVEL_5</div>
            
            <div className="mt-6 w-full space-y-3">
                <div className="bg-[#111] p-2 rounded border border-[#222] flex items-center justify-between">
                    <span className="text-[9px] text-gray-500 font-bold uppercase">Organization</span>
                    <span className="text-[10px] text-gray-300 font-mono flex items-center gap-1">
                        <Briefcase size={10} /> {user.organization}
                    </span>
                </div>
                <div className="bg-[#111] p-2 rounded border border-[#222] flex items-center justify-between">
                    <span className="text-[9px] text-gray-500 font-bold uppercase">User ID</span>
                    <span className="text-[10px] text-gray-500 font-mono">{user.id}</span>
                </div>
                <div className="bg-[#111] p-2 rounded border border-[#222] flex items-center justify-between">
                    <span className="text-[9px] text-gray-500 font-bold uppercase">Session</span>
                    <span className="text-[10px] text-green-500 font-mono flex items-center gap-1">
                        <Activity size={10} /> ACTIVE
                    </span>
                </div>
            </div>

            <button className="mt-auto w-full py-2 border border-red-900/30 hover:border-red-500 text-red-500/70 hover:text-red-500 bg-red-900/10 hover:bg-red-900/20 rounded text-xs font-bold transition-all flex items-center justify-center gap-2">
                <LogOut size={12} /> DISCONNECT
            </button>
        </div>

        {/* Right Panel - Workspace & Stats */}
        <div className="flex-1 p-6 bg-[#050505] flex flex-col">
            <div className="flex justify-between items-start mb-6">
                <div>
                    <h3 className="text-sm font-bold text-gray-200 uppercase flex items-center gap-2">
                        <Database size={16} className="text-fuchsia-500" /> Data Environments
                    </h3>
                    <p className="text-[10px] text-gray-500 mt-1">Select active workspace to load specific datasets.</p>
                </div>
                <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors">
                    <X size={20} />
                </button>
            </div>

            <div className="grid gap-3 mb-8 overflow-y-auto max-h-[40vh] custom-scrollbar pr-2">
                {MOCK_WORKSPACES.map(wk => {
                    const isActive = user.activeWorkspaceId === wk.id;
                    return (
                        <div 
                            key={wk.id}
                            onClick={() => onUpdateUser({ activeWorkspaceId: wk.id })}
                            className={`relative p-4 rounded-lg border cursor-pointer transition-all group overflow-hidden ${isActive ? 'bg-gradient-to-r from-fuchsia-900/20 to-cyan-900/10 border-fuchsia-500/50' : 'bg-[#0f0f0f] border-[#222] hover:border-[#444]'}`}
                        >
                            {isActive && <div className="absolute left-0 top-0 bottom-0 w-1 bg-fuchsia-500"></div>}
                            
                            <div className="flex items-center justify-between z-10 relative">
                                <div className="flex items-center gap-3">
                                    <div className={`p-2 rounded ${isActive ? 'bg-fuchsia-500/20 text-fuchsia-400' : 'bg-[#1a1a1a] text-gray-500'}`}>
                                        <HardDrive size={16} />
                                    </div>
                                    <div>
                                        <div className={`text-xs font-bold ${isActive ? 'text-white' : 'text-gray-400 group-hover:text-gray-200'}`}>{wk.name}</div>
                                        <div className="text-[10px] text-gray-600 font-mono mt-0.5">{wk.itemCount} datasets • Last used: {wk.lastActive}</div>
                                    </div>
                                </div>
                                {isActive && (
                                    <div className="flex items-center gap-1 text-[9px] font-bold text-fuchsia-400 bg-fuchsia-900/30 px-2 py-1 rounded border border-fuchsia-500/30">
                                        <Check size={10} /> MOUNTED
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Security / Stats Footer */}
            <div className="mt-auto pt-4 border-t border-[#222]">
                <div className="grid grid-cols-3 gap-4">
                    <div className="text-center">
                         <div className="text-[9px] text-gray-500 uppercase font-bold">Security</div>
                         <div className="text-xs text-green-400 font-mono flex items-center justify-center gap-1 mt-1"><Shield size={10} /> ENCRYPTED</div>
                    </div>
                    <div className="text-center border-l border-[#222]">
                         <div className="text-[9px] text-gray-500 uppercase font-bold">Permissions</div>
                         <div className="text-xs text-gray-300 font-mono mt-1">READ / WRITE</div>
                    </div>
                    <div className="text-center border-l border-[#222]">
                         <div className="text-[9px] text-gray-500 uppercase font-bold">Region</div>
                         <div className="text-xs text-gray-300 font-mono mt-1">SA-EAST-1</div>
                    </div>
                </div>
            </div>

        </div>
      </div>
    </div>
  );
};

export default UserProfileModal;