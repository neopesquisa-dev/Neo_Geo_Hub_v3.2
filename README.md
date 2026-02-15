# Neo Geo Hub .v³ (Trinity)

> **Digital Twin Platform**
>
> O hub retro-futurista definitivo para análise geoespacial, visualização de nuvens de pontos, Gaussian Splats e inteligência artificial aplicada a ativos físicos.

![Project Status](https://img.shields.io/badge/Status-Active-brightgreen)
![Version](https://img.shields.io/badge/Version-v3.0.1-fuchsia)
![Tech](https://img.shields.io/badge/Tech-React%20%7C%20Three.js%20%7C%20Gemini%20AI-blue)

## 🛸 Funcionalidades

*   **Visualizador 3D Avançado**: Suporte para Nuvens de Pontos (`.ply`, `.las`) e Gaussian Splats (`.splat`, `.ply`).
*   **Gemini AI Vision**: Análise automática de fotos de inspeção para identificar patologias e características do terreno.
*   **Mapa 2D Georreferenciado**: Plotagem de ativos e fotos com base em metadados EXIF GPS.
*   **Armazenamento Local (IndexedDB)**: Persistência de dados massivos diretamente no navegador do usuário (sem upload para nuvem de terceiros).
*   **Relatórios Automáticos**: Geração de relatórios de inspeção técnica prontos para impressão.

## 🚀 Instalação e Uso

Certifique-se de ter o [Node.js](https://nodejs.org/) instalado.

1.  **Configuração Inicial:**
    ```bash
    npm install
    ```

2.  **Configuração de Ambiente:**
    Crie um arquivo `.env` na raiz do projeto e adicione sua chave da API do Google Gemini (necessária para análise de IA):
    ```env
    VITE_API_KEY=sua_chave_aqui
    ```

3.  **Rodar o servidor de desenvolvimento:**
    ```bash
    npm run dev
    ```

## 🛠️ Tecnologias Utilizadas

*   **Frontend**: React 19, TypeScript, Vite, Tailwind CSS
*   **3D Engine**: Three.js, @mkkellogg/gaussian-splats-3d
*   **GIS & Mapas**: Leaflet
*   **Banco de Dados Local**: Dexie.js (IndexedDB wrapper)
*   **AI**: Google Gemini Pro Vision (via `@google/genai`)

## ⚠️ Solução de Problemas de Sync (GitHub)

Se o botão de sync falhar devido a conflito de histórico, use o terminal:

```bash
# 1. Remova o histórico antigo
rm -rf .git

# 2. Inicie um novo histórico limpo
git init
git branch -M main

# 3. Adicione seus arquivos
git add .
git commit -m "Initial Commit v3"

# 4. Conecte ao novo repositório (substitua SEU_USUARIO)
git remote add origin https://github.com/SEU_USUARIO/neo-geo-hub-v3.git

# 5. Force o envio (CUIDADO: Isso sobrescreve o GitHub)
git push -u origin main --force
```

---
Desenvolvido por Neo Pesquisa Dev