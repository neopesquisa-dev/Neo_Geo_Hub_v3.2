import { Layer } from '../types';

const STORAGE_KEY = 'NEO_GEO_PROJECT_DATA';

export interface ProjectData {
  version: string;
  name: string;
  layers: Layer[];
}

export const saveProject = (layers: Layer[]) => {
  const data: ProjectData = {
    version: '2.0-GIS',
    name: 'Untitled Project',
    layers
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
};

export const loadProject = (): ProjectData | null => {
  const dataStr = localStorage.getItem(STORAGE_KEY);
  if (!dataStr) return null;
  try {
    return JSON.parse(dataStr) as ProjectData;
  } catch (e) {
    console.error("Project Data Corrupted", e);
    return null;
  }
};