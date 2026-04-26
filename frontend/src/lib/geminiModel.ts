type ModelType = 'pro' | 'flash';

interface GeminiModelInfo {
  name?: string;
  supportedGenerationMethods?: string[];
}

interface ListModelsResponse {
  models?: GeminiModelInfo[];
}

const MODEL_PREFERENCES: Record<ModelType, string[]> = {
  pro: ['gemini-1.5-pro', 'gemini-pro-latest', 'gemini-2.0-pro', 'gemini-2.5-pro'],
  flash: ['gemini-1.5-flash', 'gemini-flash-latest', 'gemini-2.0-flash', 'gemini-2.5-flash'],
};

const MODEL_FALLBACKS: Record<ModelType, string> = {
  pro: 'gemini-1.5-pro',
  flash: 'gemini-1.5-flash',
};

function normalizeModelName(modelName: string): string {
  return modelName.replace(/^models\//, '');
}

function supportsGenerateContent(model: GeminiModelInfo): boolean {
  return (model.supportedGenerationMethods || []).includes('generateContent');
}

function isNonPreviewBaseModel(name: string): boolean {
  const lower = name.toLowerCase();
  return !lower.includes('preview') && !lower.includes('experimental') && !lower.includes('exp');
}

export async function resolveGeminiModel(apiKey: string, modelType: ModelType): Promise<string> {
  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
    if (!response.ok) {
      throw new Error(`ListModels failed with status ${response.status}`);
    }

    const data = (await response.json()) as ListModelsResponse;
    console.log("Toàn bộ model trả về từ API:", data.models);
    const candidates = (data.models || [])
      .filter((model) => model.name && supportsGenerateContent(model))
      .map((model) => normalizeModelName(model.name as string))
      .filter((name) => {
        const lower = name.toLowerCase();
        // Chấp nhận các bản 1.5, 2.0, 2.5 hoặc các alias stable như gemini-flash-latest
        const isModernVersion = name.includes('1.5') || name.includes('2.0') || name.includes('2.5') || name.endsWith('-latest');
        return isModernVersion && 
               !lower.includes('preview') && 
               !lower.includes('experimental') && 
               !lower.includes('exp') &&
               !lower.includes('robotics');
      });

    const sortedCandidates = [...candidates].sort((a, b) => b.localeCompare(a));
    console.log(`Các model khả dụng sau khi lọc cho ${modelType}:`, sortedCandidates);

    // 1. Ưu tiên các tên model cụ thể trong MODEL_PREFERENCES
    const preferred = MODEL_PREFERENCES[modelType].find((name) => sortedCandidates.includes(name));
    if (preferred) return preferred;

    // 2. Ưu tiên model cùng loại (flash/pro) phiên bản cao nhất
    const sameFamily = sortedCandidates.find((name) => name.includes(modelType));
    if (sameFamily) return sameFamily;

    // 3. Chọn model đầu tiên trong danh sách đã sắp xếp
    if (sortedCandidates.length > 0) return sortedCandidates[0];
  } catch (error) {
    console.warn('Không thể xác định danh sách model, sẽ dùng model dự phòng.', error);
  }

  return MODEL_FALLBACKS[modelType];
}
