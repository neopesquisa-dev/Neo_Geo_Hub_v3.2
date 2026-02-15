

import { Dexie } from 'dexie';
import type { Table } from 'dexie';
import { Layer, Workspace } from './types';

// Interface for what we store in DB
export interface StoredFile {
  id: string; // matches layer.id
  data: Blob;
  type: string; // mime type
}

/**
 * NeoGeoDB - Standard Dexie Database Initialization
 * Properties are declared to enable TypeScript support. 
 * Dexie automatically populates these properties based on the schema in stores().
 */
export class NeoGeoDB extends Dexie {
  layers!: Table<Layer, string>;
  files!: Table<StoredFile, string>;
  workspaces!: Table<Workspace, string>;

  constructor() {
    super('NeoGeoHubDB');
    
    // Fixed: Cast to any to access version method if type checker fails to see inherited Dexie members
    (this as any).version(2).stores({
      workspaces: 'id, name', 
      layers: 'id, type, workspaceId', 
      files: 'id' 
    });
  }
}

export const db = new NeoGeoDB();

// Helper to seed the DEMO workspace
export const initWorkspaces = async (): Promise<Workspace> => {
    // Fixed: Cast db to any to access isOpen and open methods
    if (!(db as any).isOpen()) await (db as any).open();
    
    // Check if DEMO exists
    const demo = await db.workspaces.get('demo-session');
    
    if (demo) return demo;

    // Create Default DEMO session if not exists
    const newDemo: Workspace = {
        id: 'demo-session',
        name: 'DEMO',
        description: 'Ambiente de Demonstração (Dados Locais)',
        created: new Date().toISOString(),
        itemCount: 0
    };
    
    await db.workspaces.add(newDemo);
    return newDemo;
};

// Helper to save a layer and its file
export const saveLayerToDB = async (layer: Layer, file?: Blob) => {
  // Fixed: Cast db to any to access isOpen and open methods
  if (!(db as any).isOpen()) await (db as any).open();
  
  // Fixed: Cast db to any to access transaction method
  await (db as any).transaction('rw', [db.layers, db.files, db.workspaces], async () => {
    // 1. Save metadata
    await db.layers.put(layer);
    
    // 2. Save binary data if present
    if (file) {
      await db.files.put({
        id: layer.id,
        data: file,
        type: file.type
      });
    }

    // 3. Update workspace item count
    if (layer.workspaceId) {
        const count = await db.layers.where('workspaceId').equals(layer.workspaceId).count();
        await db.workspaces.update(layer.workspaceId, { itemCount: count });
    }
  });
};

// Helper to delete
export const deleteLayerFromDB = async (id: string) => {
  // Fixed: Cast db to any to access isOpen and open methods
  if (!(db as any).isOpen()) await (db as any).open();
  // Fixed: Cast db to any to access transaction method
  await (db as any).transaction('rw', [db.layers, db.files, db.workspaces], async () => {
    const layer = await db.layers.get(id);
    await db.layers.delete(id);
    await db.files.delete(id);
    
    if (layer?.workspaceId) {
        const count = await db.layers.where('workspaceId').equals(layer.workspaceId).count();
        await db.workspaces.update(layer.workspaceId, { itemCount: count });
    }
  });
};

// Helper to clear all data
export const clearDB = async () => {
    // Fixed: Cast db to any to access isOpen and open methods
    if (!(db as any).isOpen()) await (db as any).open();
    // Fixed: Cast db to any to access transaction method
    await (db as any).transaction('rw', [db.layers, db.files, db.workspaces], async () => {
        await db.layers.clear();
        await db.files.clear();
        await db.workspaces.clear();
    });
};