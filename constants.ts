
export const APP_CONFIG = {
  LOGO_SOURCE: "https://i.ibb.co/gF3dhZwz/logo.png",
  APP_TITLE: "Neo Geo Hub .v³",
  APP_SUBTITLE: "Digital Twin Platform"
};

export const DEMO_DATA_URLS = {
    // 1. GAUSSIAN SPLAT
    // Usando media.githubusercontent.com para garantir suporte a arquivos LFS (Large File Storage)
    // Isso evita erros 404 ou carregamento de "pointers" de texto em vez do binário
    SPLAT: "https://media.githubusercontent.com/media/neopesquisa-dev/Neo_Geo_Hub_v3.2/main/public/Demo/SUBESTACAO_RGB_2_splat.splat", 
    
    // 2. NUVEM DE PONTOS
    POINT_CLOUD: "https://raw.githubusercontent.com/neopesquisa-dev/Neo_Geo_Hub_v3.2/main/public/Demo/Sub_Fx_1passada_Ground%2BLinha_1_ply.ply",

    // 3. IMAGENS
    DEMO_IMAGES: [
        {
            filename: "DJI_20250307143535_0003_V.JPG",
            url: "https://raw.githubusercontent.com/neopesquisa-dev/Neo_Geo_Hub_v3.2/main/public/Demo/DJI_20250307143535_0003_V.JPG",
            lat: -22.8958, // Fallback caso EXIF falhe
            lng: -43.1822, // Fallback caso EXIF falhe
        }
    ]
};

export const MOCK_USER = {
  id: 'usr-001',
  name: 'Drone_Operator',
  role: 'ADMIN' as const,
  organization: 'NeoGeo Hub',
  activeWorkspaceId: 'demo-session',
  avatarUrl: 'https://ui-avatars.com/api/?name=Drone+Operator&background=0D8ABC&color=fff&bold=true'
};

export const MOCK_WORKSPACES = [
  { id: 'wk-01', name: 'Inspeção_Porto_RJ', itemCount: 3, lastActive: 'Agora' },
  { id: 'demo-session', name: 'DEMO', itemCount: 3, lastActive: 'Sessão Ativa' }
];

export const TRANSLATIONS = {
  pt: {
    nav_workspace: 'Workspace',
    nav_map: 'Mapa 2D',
    nav_gallery: 'Galeria',
    nav_report: 'Relatório.md',
    sys_online: 'SYS: ONLINE',
    sidebar_upload_ph: 'Nome do Projeto...',
    sidebar_upload_btn: 'Carregar Dados',
    sidebar_filter: 'Filtrar...',
    sidebar_proj_layers: 'Camadas do Projeto',
    sidebar_clouds: 'Nuvens de Pontos',
    sidebar_splats: 'Gaussian Splats (3DGS)',
    sidebar_ortho: 'Ortofotos',
    sidebar_photos: 'Fotos Georreferenciadas',
    sidebar_no_cloud: 'Vazio',
    sidebar_no_splat: 'Vazio',
    sidebar_no_ortho: 'Vazio',
    sidebar_no_photo: 'Vazio',
    sidebar_sys_status: 'Status',
    sidebar_demo_load: 'CARREGAR DEMO',
    sidebar_demo_desc: 'Recarregar fotos e modelo 3D de teste.',
    prop_title: 'Propriedades',
    prop_no_sel: 'Selecione uma camada',
    prop_dataset: 'Info',
    prop_filename: 'NOME',
    prop_type: 'TIPO',
    prop_date: 'DATA',
    prop_crs_title: 'Coordenadas',
    prop_crs_label: 'EPSG',
    prop_crs_desc: 'Código de projeção.',
    prop_stats: 'Estatísticas',
    prop_total_pts: 'PONTOS',
    prop_file_size: 'TAMANHO',
    prop_offset: 'OFFSET',
    prop_version: 'V'
  },
  en: {
    nav_workspace: 'Workspace',
    nav_map: '2D Map',
    nav_gallery: 'Gallery',
    nav_report: 'Report.md',
    sys_online: 'SYS: ONLINE',
    sidebar_upload_ph: 'Project Name...',
    sidebar_upload_btn: 'Upload Data',
    sidebar_filter: 'Filter...',
    sidebar_proj_layers: 'Project Layers',
    sidebar_clouds: 'Point Clouds',
    sidebar_splats: 'Gaussian Splats',
    sidebar_ortho: 'Orthophotos',
    sidebar_photos: 'Geo Photos',
    sidebar_no_cloud: 'Empty',
    sidebar_no_splat: 'Empty',
    sidebar_no_ortho: 'Empty',
    sidebar_no_photo: 'Empty',
    sidebar_sys_status: 'Status',
    sidebar_demo_load: 'LOAD DEMO',
    sidebar_demo_desc: 'Reload demo photos and 3D model.',
    prop_title: 'Properties',
    prop_no_sel: 'Select a layer',
    prop_dataset: 'Info',
    prop_filename: 'NAME',
    prop_type: 'TIPO',
    prop_date: 'DATE',
    prop_crs_title: 'Coordinates',
    prop_crs_label: 'EPSG',
    prop_crs_desc: 'Projection code.',
    prop_stats: 'Stats',
    prop_total_pts: 'POINTS',
    prop_file_size: 'SIZE',
    prop_offset: 'OFFSET',
    prop_version: 'V'
  }
};
