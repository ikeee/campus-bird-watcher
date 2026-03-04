import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Mock db 模块 ──────────────────────────────────────────────────────────────
vi.mock("./db", () => ({
  getAllEncyclopedia: vi.fn(),
  getEncyclopediaByNameZh: vi.fn(),
  getEncyclopediaById: vi.fn(),
  upsertEncyclopedia: vi.fn(),
  getAllTaxonomies: vi.fn(),
  getEncyclopediaByTaxonomy: vi.fn(),
  getRecentSightingsBySpecies: vi.fn(),
  getEncyclopediaStats: vi.fn(),
  updateEncyclopediaSightingStats: vi.fn(),
  getLatestSightings: vi.fn(),
  getTodaySightings: vi.fn(),
  getSpeciesStats: vi.fn(),
  getHourlyStats: vi.fn(),
  getSightingsPaginated: vi.fn(),
  getAllCameraConfigs: vi.fn(),
  getCameraConfigById: vi.fn(),
  createCameraConfig: vi.fn(),
  updateCameraConfig: vi.fn(),
  deleteCameraConfig: vi.fn(),
  getConfidenceThreshold: vi.fn(),
  setSystemConfig: vi.fn(),
  getPendingReviews: vi.fn(),
  getReviewStats: vi.fn(),
  approveSighting: vi.fn(),
  rejectSighting: vi.fn(),
  batchApproveSightings: vi.fn(),
  batchRejectSightings: vi.fn(),
  reclassifyByThreshold: vi.fn(),
}));

vi.mock("./monitorService", () => ({
  startMonitoring: vi.fn(),
  stopMonitoring: vi.fn(),
  getActiveMonitors: vi.fn(() => []),
}));

vi.mock("./_core/llm", () => ({
  invokeLLM: vi.fn(),
}));

import {
  getAllTaxonomies,
  getEncyclopediaByTaxonomy,
  getRecentSightingsBySpecies,
  getEncyclopediaStats,
  getAllEncyclopedia,
  getEncyclopediaById,
} from "./db";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

// ── 测试上下文 ────────────────────────────────────────────────────────────────
function makeCtx(role: "user" | "admin" | null = null): TrpcContext {
  return {
    user: role
      ? {
          id: 1,
          openId: "test-user",
          name: "Test",
          email: "test@example.com",
          loginMethod: "manus",
          role,
          createdAt: new Date(),
          updatedAt: new Date(),
          lastSignedIn: new Date(),
        }
      : null,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: vi.fn() } as unknown as TrpcContext["res"],
  };
}

// ── 测试数据 ──────────────────────────────────────────────────────────────────
const mockEntry = {
  id: 1,
  speciesNameZh: "麻雀",
  speciesNameEn: "Eurasian Tree Sparrow",
  scientificName: "Passer montanus",
  taxonomy: "雀形目 / 雀科",
  representativePicUrl: "https://s3.example.com/sparrow.jpg",
  summary: "麻雀是最常见的城市鸟类之一。",
  morphology: "体型小巧，褐色羽毛。",
  behavior: "群居性强，常在人类聚居地活动。",
  diet: "主要以谷物和昆虫为食。",
  distribution: "广泛分布于欧亚大陆。",
  habitat: "城市、农村、公园均有分布。",
  breeding: "每年繁殖 2-3 次。",
  vocalizations: "鸣声清脆，常发出\"叽叽\"声。",
  conservationStatus: "无危(LC)",
  funFacts: "麻雀会用沙浴来清洁羽毛。",
  campusObservationTips: "在食堂附近和草坪上最容易发现。",
  sightingCount: 42,
  lastSeenAt: Date.now(),
  generatedAt: new Date(),
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockSightings = [
  {
    id: 1,
    s3PicUrl: "https://s3.example.com/sparrow-1.jpg",
    originalPicUrl: null,
    capturedAt: Date.now() - 3600000,
    confidence: 0.92,
    deviceSerial: "CAM001",
    reviewStatus: "auto_approved" as const,
  },
  {
    id: 2,
    s3PicUrl: "https://s3.example.com/sparrow-2.jpg",
    originalPicUrl: null,
    capturedAt: Date.now() - 7200000,
    confidence: 0.87,
    deviceSerial: "CAM001",
    reviewStatus: "auto_approved" as const,
  },
];

// ── 测试套件 ──────────────────────────────────────────────────────────────────
describe("encyclopedia.taxonomies", () => {
  beforeEach(() => vi.clearAllMocks());

  it("应返回所有已收录的分类列表", async () => {
    vi.mocked(getAllTaxonomies).mockResolvedValue([
      "雀形目 / 雀科",
      "鸽形目 / 鸠鸽科",
      "雀形目 / 鸦科",
    ]);

    const caller = appRouter.createCaller(makeCtx());
    const result = await caller.encyclopedia.taxonomies();

    expect(result).toHaveLength(3);
    expect(result).toContain("雀形目 / 雀科");
    expect(getAllTaxonomies).toHaveBeenCalledOnce();
  });

  it("当数据库无数据时应返回空数组", async () => {
    vi.mocked(getAllTaxonomies).mockResolvedValue([]);
    const caller = appRouter.createCaller(makeCtx());
    const result = await caller.encyclopedia.taxonomies();
    expect(result).toEqual([]);
  });
});

describe("encyclopedia.stats", () => {
  beforeEach(() => vi.clearAllMocks());

  it("应返回总数和分类分布统计", async () => {
    vi.mocked(getEncyclopediaStats).mockResolvedValue({
      total: 5,
      taxonomyCounts: [
        { taxonomy: "雀形目 / 雀科", count: 3 },
        { taxonomy: "鸽形目 / 鸠鸽科", count: 2 },
      ],
    });

    const caller = appRouter.createCaller(makeCtx());
    const result = await caller.encyclopedia.stats();

    expect(result.total).toBe(5);
    expect(result.taxonomyCounts).toHaveLength(2);
    expect(result.taxonomyCounts[0].taxonomy).toBe("雀形目 / 雀科");
    expect(result.taxonomyCounts[0].count).toBe(3);
  });
});

describe("encyclopedia.byTaxonomy", () => {
  beforeEach(() => vi.clearAllMocks());

  it("应按分类返回过滤后的百科条目", async () => {
    vi.mocked(getEncyclopediaByTaxonomy).mockResolvedValue([mockEntry]);

    const caller = appRouter.createCaller(makeCtx());
    const result = await caller.encyclopedia.byTaxonomy({ taxonomy: "雀形目" });

    expect(result).toHaveLength(1);
    expect(result[0].speciesNameZh).toBe("麻雀");
    expect(getEncyclopediaByTaxonomy).toHaveBeenCalledWith("雀形目");
  });

  it("当分类不存在时应返回空数组", async () => {
    vi.mocked(getEncyclopediaByTaxonomy).mockResolvedValue([]);
    const caller = appRouter.createCaller(makeCtx());
    const result = await caller.encyclopedia.byTaxonomy({ taxonomy: "不存在的目" });
    expect(result).toEqual([]);
  });
});

describe("encyclopedia.recentSightings", () => {
  beforeEach(() => vi.clearAllMocks());

  it("应返回该鸟类的最近识别记录", async () => {
    vi.mocked(getRecentSightingsBySpecies).mockResolvedValue(mockSightings);

    const caller = appRouter.createCaller(makeCtx());
    const result = await caller.encyclopedia.recentSightings({
      speciesNameZh: "麻雀",
      limit: 12,
    });

    expect(result).toHaveLength(2);
    expect(result[0].s3PicUrl).toBe("https://s3.example.com/sparrow-1.jpg");
    expect(result[0].confidence).toBe(0.92);
    expect(getRecentSightingsBySpecies).toHaveBeenCalledWith("麻雀", 12);
  });

  it("应遵守 limit 参数限制", async () => {
    vi.mocked(getRecentSightingsBySpecies).mockResolvedValue([mockSightings[0]]);

    const caller = appRouter.createCaller(makeCtx());
    const result = await caller.encyclopedia.recentSightings({
      speciesNameZh: "麻雀",
      limit: 1,
    });

    expect(getRecentSightingsBySpecies).toHaveBeenCalledWith("麻雀", 1);
    expect(result).toHaveLength(1);
  });

  it("limit 超出范围应被拒绝", async () => {
    const caller = appRouter.createCaller(makeCtx());
    await expect(
      caller.encyclopedia.recentSightings({ speciesNameZh: "麻雀", limit: 25 })
    ).rejects.toThrow();
  });
});

describe("encyclopedia.getById", () => {
  beforeEach(() => vi.clearAllMocks());

  it("应根据 ID 返回百科条目", async () => {
    vi.mocked(getEncyclopediaById).mockResolvedValue(mockEntry);

    const caller = appRouter.createCaller(makeCtx());
    const result = await caller.encyclopedia.getById({ id: 1 });

    expect(result.speciesNameZh).toBe("麻雀");
    expect(result.scientificName).toBe("Passer montanus");
    expect(result.sightingCount).toBe(42);
  });

  it("当条目不存在时应抛出 NOT_FOUND 错误", async () => {
    vi.mocked(getEncyclopediaById).mockResolvedValue(undefined);

    const caller = appRouter.createCaller(makeCtx());
    await expect(caller.encyclopedia.getById({ id: 999 })).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
  });
});

describe("encyclopedia.list", () => {
  beforeEach(() => vi.clearAllMocks());

  it("应返回所有百科条目列表", async () => {
    vi.mocked(getAllEncyclopedia).mockResolvedValue([mockEntry]);

    const caller = appRouter.createCaller(makeCtx());
    const result = await caller.encyclopedia.list();

    expect(result).toHaveLength(1);
    expect(result[0].speciesNameZh).toBe("麻雀");
  });
});
