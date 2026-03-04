import { z } from "zod";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { TRPCError } from "@trpc/server";
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
} from "./db";
import {
  startMonitoring,
  stopMonitoring,
  getActiveMonitors,
} from "./monitorService";

// Admin guard
const adminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== "admin") {
    throw new TRPCError({ code: "FORBIDDEN", message: "需要管理员权限" });
  }
  return next({ ctx });
});

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
    /** 获取最新识别记录（首页用） */
    latest: publicProcedure
      .input(z.object({ limit: z.number().min(1).max(50).default(10) }).optional())
      .query(async ({ input }) => {
        return getLatestSightings(input?.limit ?? 10);
      }),

    /** 分页获取识别记录 */
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

    /** 今日识别记录 */
    today: publicProcedure.query(async () => {
      return getTodaySightings();
    }),
  }),

  // ─── 统计数据 ──────────────────────────────────────────────
  stats: router({
    /** 品种分布统计（近 N 天） */
    species: publicProcedure
      .input(z.object({ days: z.number().min(1).max(365).default(30) }).optional())
      .query(async ({ input }) => {
        return getSpeciesStats(input?.days ?? 30);
      }),

    /** 今日按小时分布 */
    hourly: publicProcedure.query(async () => {
      return getHourlyStats();
    }),

    /** 今日总览 */
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

  // ─── 摄像头配置管理（管理员） ──────────────────────────────
  cameras: router({
    /** 获取所有摄像头配置 */
    list: adminProcedure.query(async () => {
      const configs = await getAllCameraConfigs();
      // 隐藏敏感字段
      return configs.map(({ appSecret, cachedToken, ...rest }) => ({
        ...rest,
        appSecretMasked: appSecret ? "••••••••" + appSecret.slice(-4) : "",
      }));
    }),

    /** 创建摄像头配置 */
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
        await createCameraConfig({
          ...input,
          isActive: false,
        });
        return { success: true };
      }),

    /** 更新摄像头配置 */
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

    /** 删除摄像头配置 */
    delete: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        stopMonitoring(input.id);
        await deleteCameraConfig(input.id);
        return { success: true };
      }),

    /** 启动监控 */
    startMonitor: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        const config = await getCameraConfigById(input.id);
        if (!config) throw new TRPCError({ code: "NOT_FOUND", message: "摄像头配置不存在" });
        await updateCameraConfig(input.id, { isActive: true });
        startMonitoring(input.id, config.pollIntervalMs);
        return { success: true };
      }),

    /** 停止监控 */
    stopMonitor: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        stopMonitoring(input.id);
        await updateCameraConfig(input.id, { isActive: false });
        return { success: true };
      }),

    /** 获取当前运行中的监控列表 */
    activeMonitors: adminProcedure.query(async () => {
      return getActiveMonitors();
    }),
  }),
});

export type AppRouter = typeof appRouter;
