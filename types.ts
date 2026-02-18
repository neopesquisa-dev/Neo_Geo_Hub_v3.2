

export enum ViewMode {
  MODE_3D = '3D',
  MODE_MAP = 'MAP',
  MODE_GALLERY = 'GALLERY',
  MODE_SPLAT = 'SPLAT'
}

export type Theme = 'dark' | 'light';
export type Language = 'pt' | 'en';

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: 'ADMIN' | 'VIEWER' | 'EDITOR' | 'DEMO';
  organization: string;
  avatarUrl?: string;
  activeWorkspaceId: string;
}

export interface Workspace {
  id: string;
  name: string;
  description?: string;
  itemCount?: number;
  lastActive?: string;
  created?: string;
}

export interface AppSettings {
  theme: Theme;
  language: Language;
}

export interface GeoPoint {
  lat: number;
  lng: number;
  alt?: number;
}

export interface Point3D {
  x: number;
  y: number;
  z: number;
  r: number;
  g: number;
  b: number;
  h?: number;
  c?: number;
}

export interface Layer {
  id: string;
  workspaceId: string; // Linked to Workspace
  name: string;
  type: 'POINT_CLOUD' | 'ORTHO' | 'MESH' | 'PHOTO_SET' | 'GAUSSIAN_SPLAT';
  visible: boolean;
  opacity: number;
  date: string;
  url?: string; // Fixed: added url property to base Layer interface
  details?: any;
}

export interface PointCloudLayer extends Layer {
  type: 'POINT_CLOUD';
  pointCount: number;
  format: 'LAS' | 'LAZ' | 'PLY' | 'XYZ' | 'TXT';
  colorMode?: 'RGB' | 'HEIGHT' | 'INTENSITY';
  modelData?: {
    positions: Float32Array;
    colors: Float32Array;
    classifications: Uint8Array;
    heights: Float32Array;
    intensities?: Float32Array;
    offset: [number, number, number];
  };
  customPoints?: Point3D[];
}

export interface GaussianSplatLayer extends Layer {
  type: 'GAUSSIAN_SPLAT';
  url: string; // Blob URL
  splatCount: number;
  format: 'SPLAT' | 'PLY';
  fileSize: number;
}

export interface OrthoLayer extends Layer {
  type: 'ORTHO';
  url: string;
  format: 'TIFF' | 'TIF';
  bounds?: [number, number, number, number];
  fileSize?: number;
  epsgCode?: number;
}

export interface PhotoLayer extends Layer {
  type: 'PHOTO_SET';
  images: GeoImage[];
}

export interface GeoImage {
  id: string;
  filename: string;
  url: string;
  lat: number;
  lng: number;
  heading?: number;
  timestamp: number;
  analysis?: string;
  severity?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  notes?: string;
}

export interface AppState {
  user: UserProfile;
  activeWorkspace: Workspace;
  activeLayerId: string | null;
  layers: Layer[];
  viewMode: ViewMode;
  selectedImage: GeoImage | null;
  isReportOpen: boolean;
  isSettingsOpen: boolean;
  isWorkspaceModalOpen: boolean;
  settings: AppSettings;
}