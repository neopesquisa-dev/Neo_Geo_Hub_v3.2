import { GoogleGenAI } from "@google/genai";

// Analysis for GIS context (Relatório Geral)
export const analyzeSitePhoto = async (base64Image: string, mimeType: string): Promise<string> => {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: {
        parts: [
          {
            inlineData: {
              data: base64Image,
              mimeType: mimeType
            }
          },
          {
            text: `Analise esta imagem geoespacial/de local detalhadamente. 
            
            Por favor, forneça um relatório estruturado em PORTUGUÊS DO BRASIL cobrindo os seguintes pontos:
            1. **Descrição da Cena**: O que é visível? (Terreno, edifícios, vegetação, infraestrutura).
            2. **Principais Características**: Identifique objetos específicos (veículos, linhas de energia, estradas, corpos d'água, equipamentos).
            3. **Avaliação de Condição**: Observe quaisquer defeitos visíveis, problemas de manutenção ou riscos (rachaduras, ferrugem, vegetação excessiva, erosão).
            4. **Contexto Geoespacial**: Estime o tipo de ambiente (Urbano, Rural, Industrial, Florestal).
            
            Mantenha o tom técnico, profissional e conciso.`
          }
        ]
      }
    });

    return response.text || "Nenhuma análise gerada.";
  } catch (error: any) {
    console.error("AI Analysis Failed Detailed:", error);
    
    if (error.message?.includes("API Key")) {
        return "Erro de Configuração: Chave de API não encontrada.";
    }
    if (error.message?.includes("403")) {
        return "Erro de Permissão: Verifique se a Chave de API é válida e tem saldo/créditos no Google AI Studio.";
    }
    
    return `Erro ao processar: ${error.message || "Verifique a conexão ou a chave da API."}`;
  }
};

// Interface para o resultado da detecção
export interface DetectionResult {
    found: boolean;
    reason: string;
    boxes?: { ymin: number; xmin: number; ymax: number; xmax: number; label: string }[];
}

// Search/Detection specific object in photo (Busca Específica com Coordenadas)
export const detectObjectInPhoto = async (base64Image: string, mimeType: string, query: string): Promise<DetectionResult> => {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: {
        parts: [
          {
            inlineData: {
              data: base64Image,
              mimeType: mimeType
            }
          },
          {
            text: `Atue como um sistema de visão computacional.
            Analise a imagem procurando por: "${query}".
            
            Retorne um JSON estritamente neste formato:
            {
              "found": boolean,
              "reason": "breve explicação em PT-BR",
              "boxes": [
                 { "ymin": 0-100, "xmin": 0-100, "ymax": 0-100, "xmax": 0-100, "label": "nome do objeto" }
              ]
            }
            
            Regras para "boxes":
            1. Use coordenadas normalizadas de 0 a 100 (porcentagem da imagem).
            2. Se encontrar o objeto, desenhe a caixa delimitadora (bounding box) estimada.
            3. Se não encontrar, retorne lista vazia em "boxes".
            `
          }
        ]
      },
      config: {
          responseMimeType: "application/json"
      }
    });

    const text = response.text?.trim();
    if (!text) return { found: false, reason: "Sem resposta do modelo" };

    try {
        return JSON.parse(text);
    } catch {
        // Fallback básico
        const isFound = text.toLowerCase().includes("true");
        return { found: isFound, reason: text, boxes: [] };
    }

  } catch (error: any) {
    console.error("AI Detection Failed:", error);
    return { found: false, reason: "Erro na análise", boxes: [] };
  }
};