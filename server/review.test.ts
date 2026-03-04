import { describe, it, expect, vi, beforeEach } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

// ─── Mock 数据库模块 ────────────────────────────────────────────────────────

vi.mock("./db", () => ({
  getConfidenceThreshold: vi.fn().mockResolvedValue(0.75),
  setSystemConfig: vi.fn().mockResolvedValue(undefined),
  getPendingReviews: vi.fn().mockResolvedValue({
    items: [
      {
        id: 1,
        speciesNameZh: "麻雀",
        speciesNameEn: "Eurasian Tree Sparrow",
        scientificName: "Passer montanus",
        taxonomy: "雀形目 / 雀科",
        confidence: 0.62,
        s3PicUrl: "https://s3.example.com/bird1.jpg",
        originalPicUrl: null,
        description: "小型鸟类，常见于校园",
        capturedAt: Date.now() - 3600000,
        deviceSerial: "TEST001",
        reviewStatus: "pending_review",
        reviewNote: null,
        reviewedBy: null,
        reviewedAt: null,
        createdAt: new Date(),
      },
    ],
    total: 1,
  }),
  getReviewStats: vi.fn().mockResolvedValue({
    pending: 3,
    approved: 12,
    rejected: 2,
    autoApproved: 45,
  }),
  approveSighting: vi.fn().mockResolvedValue(undefined),
  rejectSighting: vi.fn().mockResolvedValue(undefined),
  batchApproveSightings: vi.fn().mockResolvedValue(undefined),
  batchRejectSightings: vi.fn().mockResolvedValue(undefined),
  reclassifyByThreshold: vi.fn().mockResolvedValue(undefined),
  // 其他 db 函数（被其他路由使用）
  getLatestSightings: vi.fn().mockResolvedValue([]),
  getTodaySightings: vi.fn().mockResolvedValue([]),
  getSpeciesStats: vi.fn().mockResolvedValue([]),
  getHourlyStats: vi.fn().mockResolvedValue([]),
  getSightingsPaginated: vi.fn().mockResolvedValue({ items: [], total: 0 }),
  getAllCameraConfigs: vi.fn().mockResolvedValue([]),
  getCameraConfigById: vi.fn().mockResolvedValue(undefined),
  createCameraConfig: vi.fn().mockResolvedValue(undefined),
  updateCameraConfig: vi.fn().mockResolvedValue(undefined),
  deleteCameraConfig: vi.fn().mockResolvedValue(undefined),
  getAllEncyclopedia: vi.fn().mockResolvedValue([]),
  getEncyclopediaByNameZh: vi.fn().mockResolvedValue(undefined),
  getEncyclopediaById: vi.fn().mockResolvedValue(undefined),
  upsertEncyclopedia: vi.fn().mockResolvedValue(undefined),
  updateEncyclopediaSightingStats: vi.fn().mockResolvedValue(undefined),
  upsertUser: vi.fn().mockResolvedValue(undefined),
  getUserByOpenId: vi.fn().mockResolvedValue(undefined),
  getSystemConfig: vi.fn().mockResolvedValue("0.75"),
}));

vi.mock("./monitorService", () => ({
  startMonitoring: vi.fn(),
  stopMonitoring: vi.fn(),
  getActiveMonitors: vi.fn().mockReturnValue([]),
}));

vi.mock("./_core/llm", () => ({
  invokeLLM: vi.fn().mockResolvedValue({
    choices: [{ message: { content: JSON.stringify({ summary: "测试摘要" }) } }],
  }),
}));

// ─── 测试上下文工厂 ────────────────────────────────────────────────────────

function makeAdminCtx(): TrpcContext {
  return {
    user: {
      id: 1,
      openId: "admin-user",
      email: "admin@example.com",
      name: "Admin",
      loginMethod: "manus",
      role: "admin",
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    },
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: vi.fn() } as unknown as TrpcContext["res"],
  };
}

function makePublicCtx(): TrpcContext {
  return {
    user: null,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: vi.fn() } as unknown as TrpcContext["res"],
  };
}

// ─── 测试套件 ────────────────────────────────────────────────────────────────

describe("config.getThreshold", () => {
  it("公开接口应返回当前置信度阈值", async () => {
    const caller = appRouter.createCaller(makePublicCtx());
    const result = await caller.config.getThreshold();
    expect(result).toHaveProperty("threshold");
    expect(typeof result.threshold).toBe("number");
    expect(result.threshold).toBeGreaterThanOrEqual(0);
    expect(result.threshold).toBeLessThanOrEqual(1);
  });
});

describe("config.setThreshold", () => {
  it("管理员可以设置置信度阈值", async () => {
    const { setSystemConfig, reclassifyByThreshold } = await import("./db");
    vi.mocked(setSystemConfig).mockClear();
    vi.mocked(reclassifyByThreshold).mockClear();

    const caller = appRouter.createCaller(makeAdminCtx());
    const result = await caller.config.setThreshold({ threshold: 0.8, reclassify: true });

    expect(result.success).toBe(true);
    expect(result.threshold).toBe(0.8);
    expect(setSystemConfig).toHaveBeenCalledWith(
      "confidenceThreshold",
      "0.8",
      expect.any(String)
    );
    expect(reclassifyByThreshold).toHaveBeenCalledWith(0.8);
  });

  it("非管理员设置阈值应抛出 FORBIDDEN 错误", async () => {
    const caller = appRouter.createCaller(makePublicCtx());
    await expect(
      caller.config.setThreshold({ threshold: 0.5, reclassify: false })
    ).rejects.toThrow();
  });

  it("阈值设置 reclassify=false 时不触发重新分类", async () => {
    const { reclassifyByThreshold } = await import("./db");
    vi.mocked(reclassifyByThreshold).mockClear();

    const caller = appRouter.createCaller(makeAdminCtx());
    await caller.config.setThreshold({ threshold: 0.7, reclassify: false });

    expect(reclassifyByThreshold).not.toHaveBeenCalled();
  });
});

describe("review.stats", () => {
  it("管理员可以获取复核统计数据", async () => {
    const caller = appRouter.createCaller(makeAdminCtx());
    const stats = await caller.review.stats();

    expect(stats).toMatchObject({
      pending: 3,
      approved: 12,
      rejected: 2,
      autoApproved: 45,
      threshold: 0.75,
    });
  });
});

describe("review.pendingList", () => {
  it("管理员可以获取待复核列表", async () => {
    const caller = appRouter.createCaller(makeAdminCtx());
    const result = await caller.review.pendingList({ page: 1, pageSize: 20 });

    expect(result.total).toBe(1);
    expect(result.items).toHaveLength(1);
    expect(result.items[0]?.speciesNameZh).toBe("麻雀");
    expect(result.items[0]?.reviewStatus).toBe("pending_review");
  });
});

describe("review.approve", () => {
  it("管理员可以通过单条记录", async () => {
    const { approveSighting } = await import("./db");
    vi.mocked(approveSighting).mockClear();

    const caller = appRouter.createCaller(makeAdminCtx());
    const result = await caller.review.approve({ id: 1, note: "图片清晰，确认正确" });

    expect(result.success).toBe(true);
    expect(approveSighting).toHaveBeenCalledWith(1, 1, "图片清晰，确认正确");
  });
});

describe("review.reject", () => {
  it("管理员可以拒绝单条记录", async () => {
    const { rejectSighting } = await import("./db");
    vi.mocked(rejectSighting).mockClear();

    const caller = appRouter.createCaller(makeAdminCtx());
    const result = await caller.review.reject({ id: 1, note: "图片模糊，无法确认" });

    expect(result.success).toBe(true);
    expect(rejectSighting).toHaveBeenCalledWith(1, 1, "图片模糊，无法确认");
  });
});

describe("review.batchApprove", () => {
  it("管理员可以批量通过多条记录", async () => {
    const { batchApproveSightings } = await import("./db");
    vi.mocked(batchApproveSightings).mockClear();

    const caller = appRouter.createCaller(makeAdminCtx());
    const result = await caller.review.batchApprove({ ids: [1, 2, 3] });

    expect(result.success).toBe(true);
    expect(result.count).toBe(3);
    expect(batchApproveSightings).toHaveBeenCalledWith([1, 2, 3], 1);
  });
});

describe("review.batchReject", () => {
  it("管理员可以批量拒绝多条记录", async () => {
    const { batchRejectSightings } = await import("./db");
    vi.mocked(batchRejectSightings).mockClear();

    const caller = appRouter.createCaller(makeAdminCtx());
    const result = await caller.review.batchReject({ ids: [4, 5] });

    expect(result.success).toBe(true);
    expect(result.count).toBe(2);
    expect(batchRejectSightings).toHaveBeenCalledWith([4, 5], 1);
  });
});
