import { describe, expect, it, vi, beforeEach } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

// ─── Mock DB ──────────────────────────────────────────────────────────────────
vi.mock("./db", () => ({
  getLatestSightings: vi.fn().mockResolvedValue([
    {
      id: 1,
      speciesNameZh: "麻雀",
      speciesNameEn: "Eurasian Tree Sparrow",
      scientificName: "Passer montanus",
      taxonomy: "雀形目 / 雀科",
      confidence: 0.92,
      s3PicUrl: "https://s3.example.com/bird1.jpg",
      originalPicUrl: null,
      description: "常见校园鸟类",
      capturedAt: 1709500000000,
      deviceSerial: "TEST001",
      createdAt: new Date(),
    },
  ]),
  getTodaySightings: vi.fn().mockResolvedValue([
    { speciesNameZh: "麻雀", capturedAt: Date.now() },
    { speciesNameZh: "白头鹎", capturedAt: Date.now() - 1000 },
    { speciesNameZh: "麻雀", capturedAt: Date.now() - 2000 },
  ]),
  getSpeciesStats: vi.fn().mockResolvedValue([
    { speciesNameZh: "麻雀", speciesNameEn: "Eurasian Tree Sparrow", scientificName: "Passer montanus", count: 15, latestPic: "https://s3.example.com/sparrow.jpg" },
    { speciesNameZh: "白头鹎", speciesNameEn: "Light-vented Bulbul", scientificName: "Pycnonotus sinensis", count: 8, latestPic: null },
  ]),
  getHourlyStats: vi.fn().mockResolvedValue([
    { hour: 8, count: 3 },
    { hour: 14, count: 7 },
    { hour: 16, count: 5 },
  ]),
  getSightingsPaginated: vi.fn().mockResolvedValue({
    items: [
      {
        id: 1,
        speciesNameZh: "麻雀",
        speciesNameEn: "Eurasian Tree Sparrow",
        scientificName: "Passer montanus",
        taxonomy: "雀形目 / 雀科",
        confidence: 0.92,
        s3PicUrl: "https://s3.example.com/bird1.jpg",
        originalPicUrl: null,
        description: "常见校园鸟类",
        capturedAt: 1709500000000,
        deviceSerial: "TEST001",
        createdAt: new Date(),
      },
    ],
    total: 1,
  }),
  getAllCameraConfigs: vi.fn().mockResolvedValue([]),
  getCameraConfigById: vi.fn().mockResolvedValue(null),
  createCameraConfig: vi.fn().mockResolvedValue(undefined),
  updateCameraConfig: vi.fn().mockResolvedValue(undefined),
  deleteCameraConfig: vi.fn().mockResolvedValue(undefined),
  getDb: vi.fn().mockResolvedValue(null),
  upsertUser: vi.fn().mockResolvedValue(undefined),
  getUserByOpenId: vi.fn().mockResolvedValue(null),
}));

vi.mock("./monitorService", () => ({
  startMonitoring: vi.fn(),
  stopMonitoring: vi.fn(),
  getActiveMonitors: vi.fn().mockReturnValue([]),
  restoreMonitoring: vi.fn().mockResolvedValue(undefined),
}));

// ─── Context helpers ───────────────────────────────────────────────────────────
function createPublicContext(): TrpcContext {
  return {
    user: null,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: vi.fn() } as unknown as TrpcContext["res"],
  };
}

function createAdminContext(): TrpcContext {
  return {
    user: {
      id: 1,
      openId: "admin-user",
      email: "admin@school.edu",
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

// ─── Tests ────────────────────────────────────────────────────────────────────
describe("sightings.latest", () => {
  it("returns latest sightings list", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    const result = await caller.sightings.latest({ limit: 10 });
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBeGreaterThan(0);
    expect(result[0].speciesNameZh).toBe("麻雀");
    expect(result[0].confidence).toBeGreaterThan(0.9);
  });
});

describe("sightings.paginated", () => {
  it("returns paginated results with total count", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    const result = await caller.sightings.paginated({ page: 1, pageSize: 12 });
    expect(result).toHaveProperty("items");
    expect(result).toHaveProperty("total");
    expect(Array.isArray(result.items)).toBe(true);
    expect(typeof result.total).toBe("number");
  });
});

describe("stats.todaySummary", () => {
  it("returns today summary with correct structure", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    const result = await caller.stats.todaySummary();
    expect(result).toHaveProperty("totalSightings");
    expect(result).toHaveProperty("uniqueSpecies");
    expect(result).toHaveProperty("latestSighting");
    expect(result.totalSightings).toBe(3);
    expect(result.uniqueSpecies).toBe(2); // 麻雀 and 白头鹎
  });
});

describe("stats.species", () => {
  it("returns species distribution stats", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    const result = await caller.stats.species({ days: 30 });
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBe(2);
    expect(result[0].speciesNameZh).toBe("麻雀");
    expect(Number(result[0].count)).toBe(15);
  });
});

describe("stats.hourly", () => {
  it("returns hourly distribution data", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    const result = await caller.stats.hourly();
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBe(3);
  });
});

describe("cameras.list (admin only)", () => {
  it("throws FORBIDDEN for non-admin users", async () => {
    const userCtx: TrpcContext = {
      ...createPublicContext(),
      user: {
        id: 2,
        openId: "regular-user",
        email: "user@school.edu",
        name: "Student",
        loginMethod: "manus",
        role: "user",
        createdAt: new Date(),
        updatedAt: new Date(),
        lastSignedIn: new Date(),
      },
    };
    const caller = appRouter.createCaller(userCtx);
    await expect(caller.cameras.list()).rejects.toThrow();
  });

  it("returns camera list for admin", async () => {
    const caller = appRouter.createCaller(createAdminContext());
    const result = await caller.cameras.list();
    expect(Array.isArray(result)).toBe(true);
  });
});

describe("cameras.activeMonitors", () => {
  it("returns active monitor IDs for admin", async () => {
    const caller = appRouter.createCaller(createAdminContext());
    const result = await caller.cameras.activeMonitors();
    expect(Array.isArray(result)).toBe(true);
  });
});
