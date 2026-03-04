import { z } from "zod";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { TRPCError } from "@trpc/server";
import { invokeLLM } from "./_core/llm";
import {
  getLatestSightings,
  getTodaySightings,
  getSpeciesStats,
  getHourlyStats,
  getSightingsPaginated,
  getAllCameraConfigs,
  getCameraConfigById,
  createCameraConfig,
  updateCameraConfig,
  deleteCameraConfig,
  getAllEncyclopedia,
  getEncyclopediaByNameZh,
  getEncyclopediaById,
  upsertEncyclopedia,
  getAllTaxonomies,
  getEncyclopediaByTaxonomy,
  getRecentSightingsBySpecies,
  getEncyclopediaStats,
  getConfidenceThreshold,
  setSystemConfig,
  getPendingReviews,
  getReviewStats,
  approveSighting,
  rejectSighting,
  batchApproveSightings,
  batchRejectSightings,
  reclassifyByThreshold,
  getAllAiModelConfigs,
  getActiveAiModelConfig,
  createAiModelConfig,
  updateAiModelConfig,
  deleteAiModelConfig,
  activateAiModelConfig,
} from "./db";
import {
  startMonitoring,
  stopMonitoring,
  getActiveMonitors,
} from "./monitorService";
import { testBirdRecognition } from "./birdRecognition";

// Admin guard
const adminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== "admin") {
    throw new TRPCError({ code: "FORBIDDEN", message: "需要管理员权限" });
  }
  return next({ ctx });
});

// ─── AI 生成百科内容 ────────────────────────────────────────────────────────
async function generateEncyclopediaContent(
  speciesNameZh: string,
  speciesNameEn: string,
  scientificName: string,
  taxonomy: string | null
) {
  const prompt = `你是一位专业的鸟类学家和自然科普作家。请为以下鸟类生成详细的百科知识内容，用于校园观鸟科普教育。

鸟类信息：
- 中文名：${speciesNameZh}
- 英文名：${speciesNameEn}
- 学名：${scientificName}
- 分类：${taxonomy ?? "未知"}

请生成以下字段的内容（每个字段用2-4句话描述，语言生动有趣，适合中学生阅读）：
- summary: 简介（该鸟类的整体概述，2-3句）
- morphology: 形态特征（外观、体型、羽色等）
- behavior: 生活习性（活动规律、社会行为等）
- diet: 食性（主要食物来源和觅食方式）
- distribution: 分布地区（在中国及世界的分布范围）
- habitat: 栖息地（偏好的生活环境）
- breeding: 繁殖信息（繁殖季节、筑巢、产卵等）
- vocalizations: 鸣声（鸣叫特点、用途、声音描述）
- conservationStatus: 保护状态（IUCN红色名录等级，只返回等级名称如"无危(LC)"）
- funFacts: 趣味小知识（一个有趣的冷知识或特殊行为，吸引学生兴趣）
- campusObservationTips: 校园观察建议（在校园内如何找到并观察这种鸟，最佳时间地点等）

请以 JSON 格式返回，键名与上述字段完全一致。`;

  const response = await invokeLLM({
    messages: [
      {
        role: "system",
        content: "你是专业的鸟类学科普作家，擅长为中学生撰写生动有趣的鸟类知识。请严格按照 JSON 格式输出。",
      },
      { role: "user", content: prompt },
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "bird_encyclopedia",
        strict: true,
        schema: {
          type: "object",
          properties: {
            summary: { type: "string" },
            morphology: { type: "string" },
            behavior: { type: "string" },
            diet: { type: "string" },
            distribution: { type: "string" },
            habitat: { type: "string" },
            breeding: { type: "string" },
            vocalizations: { type: "string" },
            conservationStatus: { type: "string" },
            funFacts: { type: "string" },
            campusObservationTips: { type: "string" },
          },
          required: [
            "summary", "morphology", "behavior", "diet", "distribution",
            "habitat", "breeding", "vocalizations", "conservationStatus",
            "funFacts", "campusObservationTips",
          ],
          additionalProperties: false,
        },
      },
    },
  });

  const rawContent = response.choices[0]?.message?.content;
  const content = typeof rawContent === "string" ? rawContent : null;
  if (!content) throw new Error("AI 未返回内容");
  return JSON.parse(content) as {
    summary: string;
    morphology: string;
    behavior: string;
    diet: string;
    distribution: string;
    habitat: string;
    breeding: string;
    vocalizations: string;
    conservationStatus: string;
    funFacts: string;
    campusObservationTips: string;
  };
}

export const appRouter = router({
  system: systemRouter,

  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),

  // ─── 鸟类识别记录 ──────────────────────────────────────────
  sightings: router({
    latest: publicProcedure
      .input(z.object({ limit: z.number().min(1).max(50).default(10) }).optional())
      .query(async ({ input }) => {
        return getLatestSightings(input?.limit ?? 10);
      }),

    paginated: publicProcedure
      .input(
        z.object({
          page: z.number().min(1).default(1),
          pageSize: z.number().min(1).max(50).default(12),
        })
      )
      .query(async ({ input }) => {
        return getSightingsPaginated(input.page, input.pageSize);
      }),

    today: publicProcedure.query(async () => {
      return getTodaySightings();
    }),
  }),

  // ─── 统计数据 ──────────────────────────────────────────────
  stats: router({
    species: publicProcedure
      .input(z.object({ days: z.number().min(1).max(365).default(30) }).optional())
      .query(async ({ input }) => {
        return getSpeciesStats(input?.days ?? 30);
      }),

    hourly: publicProcedure.query(async () => {
      return getHourlyStats();
    }),

    todaySummary: publicProcedure.query(async () => {
      const today = await getTodaySightings();
      const speciesSet = new Set(today.map((s) => s.speciesNameZh));
      return {
        totalSightings: today.length,
        uniqueSpecies: speciesSet.size,
        latestSighting: today[0] ?? null,
      };
    }),
  }),

  // ─── 鸟类百科 ──────────────────────────────────────────────
  encyclopedia: router({
    /** 获取所有百科条目列表 */
    list: publicProcedure.query(async () => {
      return getAllEncyclopedia();
    }),

    /** 根据中文名获取百科条目（如不存在则触发 AI 生成） */
    getByName: publicProcedure
      .input(
        z.object({
          speciesNameZh: z.string().min(1),
          speciesNameEn: z.string().optional(),
          scientificName: z.string().optional(),
          taxonomy: z.string().nullable().optional(),
          representativePicUrl: z.string().nullable().optional(),
        })
      )
      .query(async ({ input }) => {
        // 先查缓存
        const existing = await getEncyclopediaByNameZh(input.speciesNameZh);
        if (existing && existing.generatedAt) {
          return { ...existing, isGenerating: false };
        }
        return null; // 前端收到 null 时触发 generate mutation
      }),

    /** 根据 ID 获取百科条目 */
    getById: publicProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        const entry = await getEncyclopediaById(input.id);
        if (!entry) throw new TRPCError({ code: "NOT_FOUND", message: "百科条目不存在" });
        return entry;
      }),

    /** 触发 AI 生成（或重新生成）百科内容 */
    generate: publicProcedure
      .input(
        z.object({
          speciesNameZh: z.string().min(1),
          speciesNameEn: z.string().min(1),
          scientificName: z.string().min(1),
          taxonomy: z.string().nullable().optional(),
          representativePicUrl: z.string().nullable().optional(),
        })
      )
      .mutation(async ({ input }) => {
        // 检查是否已存在且已生成
        const existing = await getEncyclopediaByNameZh(input.speciesNameZh);
        if (existing && existing.generatedAt) {
          return existing;
        }

        // 调用 AI 生成
        const aiContent = await generateEncyclopediaContent(
          input.speciesNameZh,
          input.speciesNameEn,
          input.scientificName,
          input.taxonomy ?? null
        );

        const data = {
          speciesNameZh: input.speciesNameZh,
          speciesNameEn: input.speciesNameEn,
          scientificName: input.scientificName,
          taxonomy: input.taxonomy ?? null,
          representativePicUrl: input.representativePicUrl ?? null,
          ...aiContent,
          generatedAt: new Date(),
          sightingCount: existing?.sightingCount ?? 0,
        };

        await upsertEncyclopedia(data);
        return await getEncyclopediaByNameZh(input.speciesNameZh);
      }),

    /** 获取所有已收录的分类列表 */
    taxonomies: publicProcedure.query(async () => {
      return getAllTaxonomies();
    }),
    /** 获取百科统计（总数、分类分布） */
    stats: publicProcedure.query(async () => {
      return getEncyclopediaStats();
    }),
    /** 按分类筛选百科条目 */
    byTaxonomy: publicProcedure
      .input(z.object({ taxonomy: z.string().min(1) }))
      .query(async ({ input }) => {
        return getEncyclopediaByTaxonomy(input.taxonomy);
      }),
    /** 获取某鸟类的最近识别记录（含图片） */
    recentSightings: publicProcedure
      .input(
        z.object({
          speciesNameZh: z.string().min(1),
          limit: z.number().min(1).max(24).default(12),
        })
      )
      .query(async ({ input }) => {
        return getRecentSightingsBySpecies(input.speciesNameZh, input.limit);
      }),
    /** 管理员强制重新生成 */
    regenerate: adminProcedure
      .input(
        z.object({
          speciesNameZh: z.string().min(1),
          speciesNameEn: z.string().min(1),
          scientificName: z.string().min(1),
          taxonomy: z.string().nullable().optional(),
          representativePicUrl: z.string().nullable().optional(),
        })
      )
      .mutation(async ({ input }) => {
        const aiContent = await generateEncyclopediaContent(
          input.speciesNameZh,
          input.speciesNameEn,
          input.scientificName,
          input.taxonomy ?? null
        );

        const existing = await getEncyclopediaByNameZh(input.speciesNameZh);
        const data = {
          speciesNameZh: input.speciesNameZh,
          speciesNameEn: input.speciesNameEn,
          scientificName: input.scientificName,
          taxonomy: input.taxonomy ?? null,
          representativePicUrl: input.representativePicUrl ?? existing?.representativePicUrl ?? null,
          ...aiContent,
          generatedAt: new Date(),
          sightingCount: existing?.sightingCount ?? 0,
        };

        await upsertEncyclopedia(data);
        return { success: true };
      }),
  }),

  // ─── 系统配置（管理员） ────────────────────────────────
  config: router({
    /** 获取当前置信度阈值 */
    getThreshold: publicProcedure.query(async () => {
      return { threshold: await getConfidenceThreshold() };
    }),

    /** 设置置信度阈值（管理员） */
    setThreshold: adminProcedure
      .input(
        z.object({
          threshold: z.number().min(0).max(1),
          reclassify: z.boolean().default(true),
        })
      )
      .mutation(async ({ input }) => {
        await setSystemConfig(
          "confidenceThreshold",
          input.threshold.toString(),
          "识别置信度阈值（0.0~1.0）"
        );
        if (input.reclassify) {
          await reclassifyByThreshold(input.threshold);
        }
        return { success: true, threshold: input.threshold };
      }),
  }),

  // ─── 复核队列（管理员） ────────────────────────────────
  review: router({
    /** 获取待复核记录列表 */
    pendingList: adminProcedure
      .input(
        z.object({
          page: z.number().min(1).default(1),
          pageSize: z.number().min(1).max(50).default(20),
        })
      )
      .query(async ({ input }) => {
        return getPendingReviews(input.page, input.pageSize);
      }),

    /** 复核统计数据 */
    stats: adminProcedure.query(async () => {
      const [stats, threshold] = await Promise.all([
        getReviewStats(),
        getConfidenceThreshold(),
      ]);
      return { ...stats, threshold };
    }),

    /** 审核通过单条 */
    approve: adminProcedure
      .input(
        z.object({
          id: z.number(),
          note: z.string().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        await approveSighting(input.id, ctx.user.id, input.note);
        return { success: true };
      }),

    /** 拒绝单条 */
    reject: adminProcedure
      .input(
        z.object({
          id: z.number(),
          note: z.string().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        await rejectSighting(input.id, ctx.user.id, input.note);
        return { success: true };
      }),

    /** 批量审核通过 */
    batchApprove: adminProcedure
      .input(z.object({ ids: z.array(z.number()).min(1) }))
      .mutation(async ({ ctx, input }) => {
        await batchApproveSightings(input.ids, ctx.user.id);
        return { success: true, count: input.ids.length };
      }),

    /** 批量拒绝 */
    batchReject: adminProcedure
      .input(z.object({ ids: z.array(z.number()).min(1) }))
      .mutation(async ({ ctx, input }) => {
        await batchRejectSightings(input.ids, ctx.user.id);
        return { success: true, count: input.ids.length };
      }),
  }),

  // ─── 摄像头配置管理（管理员） ──────────────────────
  cameras: router({
    list: adminProcedure.query(async () => {
      const configs = await getAllCameraConfigs();
      return configs.map(({ appSecret, cachedToken, ...rest }) => ({
        ...rest,
        appSecretMasked: appSecret ? "••••••••" + appSecret.slice(-4) : "",
      }));
    }),

    create: adminProcedure
      .input(
        z.object({
          name: z.string().min(1).max(128),
          appKey: z.string().min(1),
          appSecret: z.string().min(1),
          deviceSerial: z.string().min(1),
          channelNo: z.number().min(1).default(1),
          pollIntervalMs: z.number().min(4000).default(10000),
        })
      )
      .mutation(async ({ input }) => {
        await createCameraConfig({ ...input, isActive: false });
        return { success: true };
      }),

    update: adminProcedure
      .input(
        z.object({
          id: z.number(),
          name: z.string().min(1).max(128).optional(),
          appKey: z.string().min(1).optional(),
          appSecret: z.string().min(1).optional(),
          deviceSerial: z.string().min(1).optional(),
          channelNo: z.number().min(1).optional(),
          pollIntervalMs: z.number().min(4000).optional(),
        })
      )
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        await updateCameraConfig(id, data);
        return { success: true };
      }),

    delete: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        stopMonitoring(input.id);
        await deleteCameraConfig(input.id);
        return { success: true };
      }),

    startMonitor: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        const config = await getCameraConfigById(input.id);
        if (!config) throw new TRPCError({ code: "NOT_FOUND", message: "摄像头配置不存在" });
        await updateCameraConfig(input.id, { isActive: true });
        startMonitoring(input.id, config.pollIntervalMs);
        return { success: true };
      }),

    stopMonitor: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        stopMonitoring(input.id);
        await updateCameraConfig(input.id, { isActive: false });
        return { success: true };
      }),

    activeMonitors: adminProcedure.query(async () => {
      return getActiveMonitors();
    }),
  }),

  // ─── AI 模型配置管理 ─────────────────────────────────────────────────────────
  aiModel: router({
    /** 获取所有 AI 模型配置列表 */
    list: adminProcedure.query(async () => {
      return getAllAiModelConfigs();
    }),

    /** 获取当前激活的配置 */
    active: adminProcedure.query(async () => {
      return getActiveAiModelConfig() ?? null;
    }),

    /** 新增 AI 模型配置 */
    create: adminProcedure
      .input(
        z.object({
          name: z.string().min(1),
          provider: z.string().min(1),
          apiKey: z.string().min(1),
          baseUrl: z.string().url(),
          model: z.string().min(1),
          imageDetail: z.enum(["low", "high", "auto"]).default("high"),
          maxTokens: z.number().int().min(128).max(4096).default(512),
          notes: z.string().optional(),
        })
      )
      .mutation(async ({ input }) => {
        await createAiModelConfig({
          name: input.name,
          provider: input.provider,
          apiKey: input.apiKey,
          baseUrl: input.baseUrl,
          model: input.model,
          imageDetail: input.imageDetail,
          maxTokens: input.maxTokens,
          notes: input.notes ?? null,
          isActive: false,
        });
        return { success: true };
      }),

    /** 更新 AI 模型配置 */
    update: adminProcedure
      .input(
        z.object({
          id: z.number(),
          name: z.string().min(1).optional(),
          provider: z.string().optional(),
          apiKey: z.string().optional(),
          baseUrl: z.string().url().optional(),
          model: z.string().optional(),
          imageDetail: z.enum(["low", "high", "auto"]).optional(),
          maxTokens: z.number().int().min(128).max(4096).optional(),
          notes: z.string().optional(),
        })
      )
      .mutation(async ({ input }) => {
        const { id, ...rest } = input;
        await updateAiModelConfig(id, rest);
        return { success: true };
      }),

    /** 删除 AI 模型配置 */
    delete: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await deleteAiModelConfig(input.id);
        return { success: true };
      }),

    /** 激活指定配置（同时取消其他配置的激活状态） */
    activate: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await activateAiModelConfig(input.id);
        return { success: true };
      }),

    /**
     * 测试指定配置的识别效果
     * 使用传入的配置（不写入数据库）对测试图片进行识别
     */
    test: adminProcedure
      .input(
        z.object({
          apiKey: z.string().min(1),
          baseUrl: z.string().url(),
          model: z.string().min(1),
          imageDetail: z.enum(["low", "high", "auto"]).default("high"),
          maxTokens: z.number().int().min(128).max(4096).default(512),
          /** 测试图片 URL，不传则使用内置测试图片 */
          imageUrl: z.string().url().optional(),
        })
      )
      .mutation(async ({ input }) => {
        // 使用一张公开的麻雀图片作为默认测试图
        const testImageUrl =
          input.imageUrl ??
          "https://upload.wikimedia.org/wikipedia/commons/thumb/6/6e/Passer_montanus_malaccensis_male.jpg/320px-Passer_montanus_malaccensis_male.jpg";
        const result = await testBirdRecognition(
          {
            apiKey: input.apiKey,
            baseUrl: input.baseUrl.replace(/\/$/, ""),
            model: input.model,
            imageDetail: input.imageDetail,
            maxTokens: input.maxTokens,
          },
          testImageUrl
        );
        return result;
      }),
  }),
});

export type AppRouter = typeof appRouter;
