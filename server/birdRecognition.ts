/**
 * AI 鸟类识别服务模块
 * 调用内置 LLM 视觉模型识别图片中的鸟类品种
 */

import { invokeLLM } from "./_core/llm";

export interface BirdRecognitionResult {
  /** 是否检测到鸟类 */
  hasBird: boolean;
  /** 鸟类中文名 */
  speciesNameZh: string;
  /** 鸟类英文名 */
  speciesNameEn: string;
  /** 鸟类学名（拉丁文） */
  scientificName: string;
  /** 目/科分类，如"雀形目 / 雀科" */
  taxonomy: string;
  /** 置信度 0.0 ~ 1.0 */
  confidence: number;
  /** 鸟类描述（习性、特征等） */
  description: string;
}

const SYSTEM_PROMPT = `你是一位专业的鸟类学家和野外观鸟专家。你的任务是分析摄像头拍摄的图片，判断图片中是否有鸟类出现，并识别鸟类品种。

请严格按照以下 JSON 格式返回结果（不要包含任何其他文字）：
{
  "hasBird": true/false,
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
- 优先识别常见的中国校园鸟类，如麻雀、白头鹎、珠颈斑鸠、乌鸫等`;

/**
 * 识别图片中的鸟类
 * @param imageUrl 图片 URL（萤石云原始 URL 或 S3 URL）
 */
export async function recognizeBird(
  imageUrl: string
): Promise<BirdRecognitionResult> {
  try {
    const response = await invokeLLM({
      messages: [
        {
          role: "system",
          content: SYSTEM_PROMPT,
        },
        {
          role: "user",
          content: [
            {
              type: "image_url",
              image_url: {
                url: imageUrl,
                detail: "high",
              },
            },
            {
              type: "text",
              text: "请分析这张摄像头图片，判断是否有鸟类，并识别品种。",
            },
          ],
        },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "bird_recognition",
          strict: true,
          schema: {
            type: "object",
            properties: {
              hasBird: { type: "boolean", description: "是否检测到鸟类" },
              speciesNameZh: { type: "string", description: "鸟类中文名" },
              speciesNameEn: { type: "string", description: "鸟类英文名" },
              scientificName: { type: "string", description: "拉丁学名" },
              taxonomy: { type: "string", description: "目/科分类" },
              confidence: { type: "number", description: "置信度 0-1" },
              description: { type: "string", description: "鸟类描述" },
            },
            required: [
              "hasBird",
              "speciesNameZh",
              "speciesNameEn",
              "scientificName",
              "taxonomy",
              "confidence",
              "description",
            ],
            additionalProperties: false,
          },
        },
      },
    });

    const content = response.choices?.[0]?.message?.content;
    if (!content) {
      throw new Error("AI 返回内容为空");
    }

    const result: BirdRecognitionResult =
      typeof content === "string" ? JSON.parse(content) : content;
    return result;
  } catch (error) {
    console.error("[BirdRecognition] 识别失败:", error);
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
}
