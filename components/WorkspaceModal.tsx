import React, { useEffect, useState } from 'react';
import { X, Server, Plus, FolderOpen, Trash2, Check, LayoutGrid } from 'lucide-react';
import { Workspace } from '../types';
import { db } from '../db';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  activeWorkspaceId: string;
  onSelectWorkspace: (workspace: Workspace) => void;
}

const WorkspaceModal: React.FC<Props> = ({ isOpen, onClose, activeWorkspaceId, onSelectWorkspace }) => {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [newWsName, setNewWsName] = useState("");

  useEffect(() => {
    if (isOpen) {
        loadWorkspaces();
    }
  }, [isOpen]);

  const loadWorkspaces = async () => {
    const all = await db.workspaces.toArray();
    setWorkspaces(all);
  };

  const handleCreate = async () => {
      if (!newWsName.trim()) return;
      const newWs: Workspace = {
          id: `ws-${Date.now()}`,
          name: newWsName,
          created: new Date().toISOString(),
          itemCount: 0
      };
      await db.workspaces.add(newWs);
      setWorkspaces([...workspaces, newWs]);
      setIsCreating(false);
      setNewWsName("");
      onSelectWorkspace(newWs); // Auto switch
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
      e.stopPropagation();
      if (id === 'demo-session') {
          alert("Não é possível deletar a sessão DEMO.");
          return;
      }
      if (confirm("Tem certeza? Todos os layers desta sessão serão perdidos (associação quebrada).")) {
          await db.workspaces.delete(id);
          // Optional: Clean up layers associated with this ID
          await db.layers.where('workspaceId').equals(id).delete();
          loadWorkspaces();
      }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[2000] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#0a0a0a] border border-[#333] w-full max-w-lg rounded-xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
        
        <div className="p-4 border-b border-[#222] flex items-center justify-between bg-[#080808]">
            <h3 className="font-bold text-gray-200 flex items-center gap-2 uppercase tracking-wide">
                <LayoutGrid size={16} className="text-cyan-500" /> Workspace Manager
            </h3>
            <button onClick={onClose} className="text-gray-500 hover:text-white"><X size={18}/></button>
        </div>

        <div className="p-4 bg-[#050505] flex-1 overflow-y-auto max-h-[60vh] space-y-3">
            
            {workspaces.map(ws => {
                const isActive = activeWorkspaceId === ws.id;
                const isDemo = ws.id === 'demo-session';
                
                return (
                    <div 
                        key={ws.id}
                        onClick={() => onSelectWorkspace(ws)}
                        className={`group relative p-4 rounded border cursor-pointer transition-all flex items-center justify-between
                            ${isActive 
                                ? 'bg-cyan-900/10 border-cyan-500/50 shadow-[0_0_15px_rgba(6,182,212,0.1)]' 
                                : 'bg-[#111] border-[#222] hover:border-gray-500 hover:bg-[#161616]'
                            }
                        `}
                    >
                        <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-lg ${isActive ? 'bg-cyan-500 text-black' : isDemo ? 'bg-yellow-500/20 text-yellow-500' : 'bg-[#222] text-gray-500'}`}>
                                <Server size={18} />
                            </div>
                            <div>
                                <div className={`font-bold text-sm ${isActive ? 'text-cyan-400' : 'text-gray-300'}`}>
                                    {ws.name} {isDemo && <span className="text-[9px] bg-yellow-500 text-black px-1 rounded ml-2 font-mono">DEMO</span>}
                                </div>
                                <div className="text-[10px] text-gray-500 font-mono mt-0.5">
                                    Items: {ws.itemCount || 0} • Created: {ws.created ? new Date(ws.created).toLocaleDateString() : 'N/A'}
                                </div>
                            </div>
                        </div>

                        {isActive && <Check size={18} className="text-cyan-500" />}
                        
                        {!isActive && !isDemo && (
                            <button 
                                onClick={(e) => handleDelete(e, ws.id)}
                                className="opacity-0 group-hover:opacity-100 p-2 text-gray-600 hover:text-red-500 transition-all"
                            >
                                <Trash2 size={14} />
                            </button>
                        )}
                    </div>
                );
            })}

            {isCreating ? (
                <div className="p-3 bg-[#111] border border-[#333] rounded animate-in fade-in slide-in-from-top-2">
                    <input 
                        autoFocus
                        type="text" 
                        placeholder="Nome da Nova Sessão..." 
                        value={newWsName}
                        onChange={(e) => setNewWsName(e.target.value)}
                        className="w-full bg-black border border-[#333] rounded px-3 py-2 text-sm text-white focus:border-cyan-500 outline-none mb-2 font-mono"
                    />
                    <div className="flex gap-2 justify-end">
                        <button onClick={() => setIsCreating(false)} className="px-3 py-1 text-xs text-gray-500 hover:text-white">Cancelar</button>
                        <button onClick={handleCreate} className="px-3 py-1 bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold rounded">Criar</button>
                    </div>
                </div>
            ) : (
                <button 
                    onClick={() => setIsCreating(true)}
                    className="w-full py-3 border border-dashed border-[#333] hover:border-gray-500 rounded text-gray-500 hover:text-white text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-all"
                >
                    <Plus size={14} /> Nova Sessão
                </button>
            )}

        </div>
      </div>
    </div>
  );
};

export default WorkspaceModal;