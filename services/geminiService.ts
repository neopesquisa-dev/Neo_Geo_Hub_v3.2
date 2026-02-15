import { GoogleGenAI, Type } from "@google/genai";

// Helper para garantir a recuperação da chave
// A chave é injetada via 'define' no vite.config.ts, substituindo process.env.API_KEY pelo valor real.
const getApiKey = (): string => {
  return process.env.API_KEY || "";
};

// Analysis for GIS context (Relatório Geral)
export const analyzeSitePhoto = async (base64Image: string, mimeType: string): Promise<string> => {
  try {
    const apiKey = getApiKey();
    if (!apiKey) {
        throw new Error("API Key não configurada. Verifique o arquivo .env e VITE_API_KEY.");
    }

    const ai = new GoogleGenAI({ apiKey });
    
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
        return "Erro de Configuração: Chave de API ausente.";
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
    const apiKey = getApiKey();
    if (!apiKey) {
        return { found: false, reason: "API Key não configurada no servidor.", boxes: [] };
    }

    const ai = new GoogleGenAI({ apiKey });
    
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
            
            Se encontrar, explique onde e porquê em 'reason'.
            Se não encontrar, explique o motivo em 'reason'.
            
            IMPORTANTE: Para 'boxes', use coordenadas normalizadas (0-100) representando a porcentagem da imagem.`
          }
        ]
      },
      config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              found: { type: Type.BOOLEAN },
              reason: { type: Type.STRING },
              boxes: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    ymin: { type: Type.NUMBER },
                    xmin: { type: Type.NUMBER },
                    ymax: { type: Type.NUMBER },
                    xmax: { type: Type.NUMBER },
                    label: { type: Type.STRING }
                  }
                }
              }
            }
          }
      }
    });

    const text = response.text?.trim();
    if (!text) return { found: false, reason: "Sem resposta do modelo", boxes: [] };

    const cleanText = text.replace(/```json\s*|\s*```/g, "");
    return JSON.parse(cleanText) as DetectionResult;

  } catch (error: any) {
    console.error("AI Detection Failed:", error);
    return { found: false, reason: "Erro na análise: " + (error.message || "Desconhecido"), boxes: [] };
  }
};