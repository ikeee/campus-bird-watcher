/**
 * AI 鸟类识别服务模块
 *
 * 优先从数据库读取管理员配置的 AI 模型（ai_model_config 表中 isActive=true 的记录）。
 * 若数据库中无激活配置，则回退到环境变量 DEEPSEEK_API_KEY（兼容旧版部署）。
 *
 * 支持任何兼容 OpenAI Chat Completions 格式的 API，包括：
 *   - DeepSeek  (https://api.deepseek.com)
 *   - OpenAI    (https://api.openai.com)
 *   - Google Gemini via OpenAI-compatible endpoint
 *   - Ollama    (http://localhost:11434/v1)
 *   - 任何自定义 OpenAI-compatible 服务
 */

import { getActiveAiModelConfig } from "./db";

export interface BirdRecognitionResult {
  hasBird: boolean;
  speciesNameZh: string;
  speciesNameEn: string;
  scientificName: string;
  taxonomy: string;
  confidence: number;
  description: string;
}

const SYSTEM_PROMPT = `你是一位专业的鸟类学家和野外观鸟专家。你的任务是分析摄像头拍摄的图片，判断图片中是否有鸟类出现，并识别鸟类品种。

请严格按照以下 JSON 格式返回结果（不要包含任何其他文字、不要包含 markdown 代码块）：
{
  "hasBird": true或false,
  "speciesNameZh": "鸟类中文名（如无鸟则为空字符串）",
  "speciesNameEn": "English common name",
  "scientificName": "Genus species（拉丁学名）",
  "taxonomy": "目名 / 科名",
  "confidence": 0.0到1.0之间的数字,
  "description": "简短描述该鸟类的外观特征、习性和分布（50字以内，如无鸟则为空字符串）"
}

注意事项：
- 如果图片中没有鸟类，hasBird 设为 false，其他字段设为空字符串，confidence 设为 0
- 如果图片模糊或无法确定品种，confidence 应低于 0.5
- 优先识别常见的中国校园鸟类，如麻雀、白头鹎、珠颈斑鸠、乌鸫等
- 只返回纯 JSON，不要任何额外说明`;

interface ApiConfig {
  apiKey: string;
  baseUrl: string;
  model: string;
  imageDetail: string;
  maxTokens: number;
}

/**
 * 获取当前应使用的 AI API 配置
 * 优先级：数据库激活配置 > 环境变量 DEEPSEEK_API_KEY
 */
async function resolveApiConfig(): Promise<ApiConfig | null> {
  // 1. 优先从数据库读取管理员配置
  try {
    const dbConfig = await getActiveAiModelConfig();
    if (dbConfig && dbConfig.apiKey) {
      return {
        apiKey: dbConfig.apiKey,
        baseUrl: dbConfig.baseUrl.replace(/\/$/, ""),
        model: dbConfig.model,
        imageDetail: dbConfig.imageDetail || "high",
        maxTokens: dbConfig.maxTokens || 512,
      };
    }
  } catch (e) {
    console.warn("[BirdRecognition] 读取数据库 AI 配置失败，回退到环境变量:", e);
  }

  // 2. 回退到环境变量（兼容旧版）
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (apiKey) {
    return {
      apiKey,
      baseUrl: (process.env.DEEPSEEK_API_URL || "https://api.deepseek.com").replace(/\/$/, ""),
      model: process.env.DEEPSEEK_MODEL || "deepseek-chat",
      imageDetail: "high",
      maxTokens: 512,
    };
  }

  return null;
}

/**
 * 识别图片中的鸟类
 * @param imageUrl 图片 URL
 */
export async function recognizeBird(imageUrl: string): Promise<BirdRecognitionResult> {
  const config = await resolveApiConfig();

  if (!config) {
    console.error("[BirdRecognition] 未配置 AI 模型，请在管理后台添加 AI 模型配置");
    return emptyResult();
  }

  try {
    const payload = {
      model: config.model,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        {
          role: "user",
          content: [
            {
              type: "image_url",
              image_url: { url: imageUrl, detail: config.imageDetail },
            },
            {
              type: "text",
              text: "请分析这张摄像头图片，判断是否有鸟类，并识别品种。只返回 JSON。",
            },
          ],
        },
      ],
      max_tokens: config.maxTokens,
      temperature: 0.1,
      response_format: { type: "json_object" },
    };

    const response = await fetch(`${config.baseUrl}/v1/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(30_000),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`AI API 错误 ${response.status}: ${errText}`);
    }

    const data = await response.json() as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const content = data.choices?.[0]?.message?.content;

    if (!content) throw new Error("AI API 返回内容为空");

    // 清理可能的 markdown 代码块包裹
    const cleaned = content
      .replace(/^```json\s*/i, "")
      .replace(/^```\s*/i, "")
      .replace(/\s*```$/i, "")
      .trim();

    const result = JSON.parse(cleaned) as BirdRecognitionResult;
    result.confidence = Math.max(0, Math.min(1, Number(result.confidence) || 0));

    console.log(
      `[BirdRecognition] [${config.model}] 识别结果: hasBird=${result.hasBird}` +
      (result.hasBird
        ? ` 品种=${result.speciesNameZh} 置信度=${(result.confidence * 100).toFixed(0)}%`
        : "")
    );

    return result;
  } catch (error) {
    console.error("[BirdRecognition] 识别失败:", error);
    return emptyResult();
  }
}

/**
 * 使用指定配置测试识别（用于管理后台"测试"按钮）
 * @param testConfig 临时测试配置（不需要写入数据库）
 * @param imageUrl   测试图片 URL
 */
export async function testBirdRecognition(
  testConfig: ApiConfig,
  imageUrl: string
): Promise<{ success: boolean; result?: BirdRecognitionResult; error?: string; latencyMs?: number }> {
  const start = Date.now();
  try {
    const payload = {
      model: testConfig.model,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        {
          role: "user",
          content: [
            {
              type: "image_url",
              image_url: { url: imageUrl, detail: testConfig.imageDetail || "high" },
            },
            { type: "text", text: "请分析这张图片，判断是否有鸟类，并识别品种。只返回 JSON。" },
          ],
        },
      ],
      max_tokens: testConfig.maxTokens || 512,
      temperature: 0.1,
      response_format: { type: "json_object" },
    };

    const response = await fetch(`${testConfig.baseUrl.replace(/\/$/, "")}/v1/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${testConfig.apiKey}`,
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(30_000),
    });

    if (!response.ok) {
      const errText = await response.text();
      return { success: false, error: `API 错误 ${response.status}: ${errText}` };
    }

    const data = await response.json() as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const content = data.choices?.[0]?.message?.content;
    if (!content) return { success: false, error: "API 返回内容为空" };

    const cleaned = content
      .replace(/^```json\s*/i, "")
      .replace(/^```\s*/i, "")
      .replace(/\s*```$/i, "")
      .trim();

    const result = JSON.parse(cleaned) as BirdRecognitionResult;
    result.confidence = Math.max(0, Math.min(1, Number(result.confidence) || 0));

    return { success: true, result, latencyMs: Date.now() - start };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
      latencyMs: Date.now() - start,
    };
  }
}

function emptyResult(): BirdRecognitionResult {
  return {
    hasBird: false,
    speciesNameZh: "",
    speciesNameEn: "",
    scientificName: "",
    taxonomy: "",
    confidence: 0,
    description: "",
  };
}
