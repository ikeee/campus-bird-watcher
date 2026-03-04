import { eq, desc, and, gte, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { InsertUser, users, birdSightings, cameraConfigs, birdEncyclopedia, InsertBirdSighting, InsertCameraConfig, InsertBirdEncyclopedia, aiModelConfig, AiModelConfig, InsertAiModelConfig } from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) { console.warn("[Database] Cannot upsert user: database not available"); return; }

  try {
    const values: InsertUser = { openId: user.openId };
    const updateSet: Record<string, unknown> = {};
    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];
    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };
    textFields.forEach(assignNullable);
    if (user.lastSignedIn !== undefined) { values.lastSignedIn = user.lastSignedIn; updateSet.lastSignedIn = user.lastSignedIn; }
    if (user.role !== undefined) { values.role = user.role; updateSet.role = user.role; }
    else if (user.openId === ENV.ownerOpenId) { values.role = 'admin'; updateSet.role = 'admin'; }
    if (!values.lastSignedIn) values.lastSignedIn = new Date();
    if (Object.keys(updateSet).length === 0) updateSet.lastSignedIn = new Date();
    await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) { console.warn("[Database] Cannot get user: database not available"); return undefined; }
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

// ─── 鸟类识别记录 ───────────────────────────────────────────────

/** 获取最新的鸟类识别记录 */
export async function getLatestSightings(limit = 20) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(birdSightings).orderBy(desc(birdSightings.capturedAt)).limit(limit);
}

/** 获取今日识别记录 */
export async function getTodaySightings() {
  const db = await getDb();
  if (!db) return [];
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  return db
    .select()
    .from(birdSightings)
    .where(gte(birdSightings.capturedAt, todayStart.getTime()))
    .orderBy(desc(birdSightings.capturedAt));
}

/** 获取品种分布统计 */
export async function getSpeciesStats(days = 30) {
  const db = await getDb();
  if (!db) return [];
  const since = Date.now() - days * 24 * 60 * 60 * 1000;
  return db
    .select({
      speciesNameZh: birdSightings.speciesNameZh,
      speciesNameEn: birdSightings.speciesNameEn,
      scientificName: birdSightings.scientificName,
      count: sql<number>`COUNT(*)`.as("count"),
      latestPic: sql<string>`MAX(COALESCE(${birdSightings.s3PicUrl}, ${birdSightings.originalPicUrl}))`.as("latestPic"),
    })
    .from(birdSightings)
    .where(gte(birdSightings.capturedAt, since))
    .groupBy(birdSightings.speciesNameZh, birdSightings.speciesNameEn, birdSightings.scientificName)
    .orderBy(desc(sql`COUNT(*)`));
}

/** 获取按小时分布的访问频次（今日） */
export async function getHourlyStats() {
  const db = await getDb();
  if (!db) return [];
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  // 使用原始 SQL 字符串避免 Drizzle 将列名参数化导致 GROUP BY 失败
  const colName = "capturedAt";
  return db
    .select({
      hour: sql<number>`HOUR(FROM_UNIXTIME(\`${colName}\` / 1000))`.as("hour"),
      count: sql<number>`COUNT(*)`.as("count"),
    })
    .from(birdSightings)
    .where(gte(birdSightings.capturedAt, todayStart.getTime()))
    .groupBy(sql`HOUR(FROM_UNIXTIME(\`${colName}\` / 1000))`)
    .orderBy(sql`HOUR(FROM_UNIXTIME(\`${colName}\` / 1000))`);
}

/** 分页获取识别记录 */
export async function getSightingsPaginated(page = 1, pageSize = 12) {
  const db = await getDb();
  if (!db) return { items: [], total: 0 };
  const offset = (page - 1) * pageSize;
  const [items, countResult] = await Promise.all([
    db.select().from(birdSightings).orderBy(desc(birdSightings.capturedAt)).limit(pageSize).offset(offset),
    db.select({ total: sql<number>`COUNT(*)` }).from(birdSightings),
  ]);
  return { items, total: countResult[0]?.total ?? 0 };
}

// ─── 摄像头配置 ───────────────────────────────────────────────

export async function getAllCameraConfigs() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(cameraConfigs).orderBy(cameraConfigs.id);
}

export async function getCameraConfigById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const rows = await db.select().from(cameraConfigs).where(eq(cameraConfigs.id, id)).limit(1);
  return rows[0];
}

export async function createCameraConfig(data: InsertCameraConfig) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(cameraConfigs).values(data);
}

export async function updateCameraConfig(id: number, data: Partial<InsertCameraConfig>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(cameraConfigs).set(data).where(eq(cameraConfigs.id, id));
}

export async function deleteCameraConfig(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(cameraConfigs).where(eq(cameraConfigs.id, id));
}

// ─── 鸟类百科 ───────────────────────────────────────────────────────────────

/** 获取所有百科条目（按识别次数降序） */
export async function getAllEncyclopedia() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(birdEncyclopedia).orderBy(desc(birdEncyclopedia.sightingCount));
}

/** 根据中文名查询百科条目 */
export async function getEncyclopediaByNameZh(speciesNameZh: string) {
  const db = await getDb();
  if (!db) return undefined;
  const rows = await db.select().from(birdEncyclopedia).where(eq(birdEncyclopedia.speciesNameZh, speciesNameZh)).limit(1);
  return rows[0];
}

/** 根据 ID 查询百科条目 */
export async function getEncyclopediaById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const rows = await db.select().from(birdEncyclopedia).where(eq(birdEncyclopedia.id, id)).limit(1);
  return rows[0];
}

/** 创建或更新百科条目（upsert by speciesNameZh） */
export async function upsertEncyclopedia(data: InsertBirdEncyclopedia) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const updateSet: Record<string, unknown> = {};
  const fields = ["speciesNameEn","scientificName","taxonomy","representativePicUrl","summary","morphology","behavior","diet","distribution","habitat","breeding","vocalizations","conservationStatus","funFacts","campusObservationTips","generatedAt"] as const;
  for (const f of fields) {
    if ((data as any)[f] !== undefined) updateSet[f] = (data as any)[f];
  }
  await db.insert(birdEncyclopedia).values(data).onDuplicateKeyUpdate({ set: updateSet });
}

/** 更新百科条目的识别次数和最近识别时间 */
export async function updateEncyclopediaSightingStats(speciesNameZh: string, lastSeenAt: number, representativePicUrl?: string) {
  const db = await getDb();
  if (!db) return;
  const updateData: Record<string, unknown> = {
    sightingCount: sql`${birdEncyclopedia.sightingCount} + 1`,
    lastSeenAt,
  };
  if (representativePicUrl) updateData.representativePicUrl = representativePicUrl;
  await db.update(birdEncyclopedia).set(updateData).where(eq(birdEncyclopedia.speciesNameZh, speciesNameZh));
}

// ─── 系统配置 ───────────────────────────────────────────────────────────────

import { systemConfig } from "../drizzle/schema";

/** 获取系统配置值 */
export async function getSystemConfig(key: string): Promise<string | null> {
  const db = await getDb();
  if (!db) return null;
  const rows = await db.select().from(systemConfig).where(eq(systemConfig.configKey, key)).limit(1);
  return rows[0]?.configValue ?? null;
}

/** 设置系统配置值 */
export async function setSystemConfig(key: string, value: string, description?: string): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db
    .insert(systemConfig)
    .values({ configKey: key, configValue: value, description })
    .onDuplicateKeyUpdate({ set: { configValue: value } });
}

/** 获取置信度阈值（默认 0.75） */
export async function getConfidenceThreshold(): Promise<number> {
  const val = await getSystemConfig("confidenceThreshold");
  const parsed = parseFloat(val ?? "0.75");
  return isNaN(parsed) ? 0.75 : Math.max(0, Math.min(1, parsed));
}

// ─── 复核队列 ───────────────────────────────────────────────────────────────

import { ne, inArray, lt } from "drizzle-orm";

/** 获取待复核记录列表（分页） */
export async function getPendingReviews(page = 1, pageSize = 20) {
  const db = await getDb();
  if (!db) return { items: [], total: 0 };
  const offset = (page - 1) * pageSize;
  const [items, countResult] = await Promise.all([
    db
      .select()
      .from(birdSightings)
      .where(eq(birdSightings.reviewStatus, "pending_review"))
      .orderBy(desc(birdSightings.capturedAt))
      .limit(pageSize)
      .offset(offset),
    db
      .select({ total: sql<number>`COUNT(*)` })
      .from(birdSightings)
      .where(eq(birdSightings.reviewStatus, "pending_review")),
  ]);
  return { items, total: countResult[0]?.total ?? 0 };
}

/** 获取复核统计数据 */
export async function getReviewStats() {
  const db = await getDb();
  if (!db) return { pending: 0, approved: 0, rejected: 0, autoApproved: 0 };
  const rows = await db
    .select({
      reviewStatus: birdSightings.reviewStatus,
      count: sql<number>`COUNT(*)`.as("count"),
    })
    .from(birdSightings)
    .groupBy(birdSightings.reviewStatus);
  const stats = { pending: 0, approved: 0, rejected: 0, autoApproved: 0 };
  for (const row of rows) {
    if (row.reviewStatus === "pending_review") stats.pending = row.count;
    else if (row.reviewStatus === "approved") stats.approved = row.count;
    else if (row.reviewStatus === "rejected") stats.rejected = row.count;
    else if (row.reviewStatus === "auto_approved") stats.autoApproved = row.count;
  }
  return stats;
}

/** 审核通过单条记录 */
export async function approveSighting(id: number, reviewedBy: number, note?: string): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db
    .update(birdSightings)
    .set({
      reviewStatus: "approved",
      reviewedBy,
      reviewedAt: new Date(),
      reviewNote: note ?? null,
    })
    .where(eq(birdSightings.id, id));
}

/** 拒绝单条记录 */
export async function rejectSighting(id: number, reviewedBy: number, note?: string): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db
    .update(birdSightings)
    .set({
      reviewStatus: "rejected",
      reviewedBy,
      reviewedAt: new Date(),
      reviewNote: note ?? null,
    })
    .where(eq(birdSightings.id, id));
}

/** 批量审核通过 */
export async function batchApproveSightings(ids: number[], reviewedBy: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  if (ids.length === 0) return;
  await db
    .update(birdSightings)
    .set({ reviewStatus: "approved", reviewedBy, reviewedAt: new Date() })
    .where(inArray(birdSightings.id, ids));
}

/** 批量拒绝 */
export async function batchRejectSightings(ids: number[], reviewedBy: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  if (ids.length === 0) return;
  await db
    .update(birdSightings)
    .set({ reviewStatus: "rejected", reviewedBy, reviewedAt: new Date() })
    .where(inArray(birdSightings.id, ids));
}

/** 将所有现有 pending 记录重新按新阈值分类（阈值变更时调用） */
export async function reclassifyByThreshold(threshold: number): Promise<void> {
  const db = await getDb();
  if (!db) return;
  // 低于阈值 → pending_review
  await db
    .update(birdSightings)
    .set({ reviewStatus: "pending_review" })
    .where(
      and(
        lt(birdSightings.confidence, threshold),
        inArray(birdSightings.reviewStatus, ["auto_approved"])
      )
    );
  // 高于等于阈值 → auto_approved（仅对 pending_review 中未人工操作的）
  await db
    .update(birdSightings)
    .set({ reviewStatus: "auto_approved" })
    .where(
      and(
        gte(birdSightings.confidence, threshold),
        eq(birdSightings.reviewStatus, "pending_review")
      )
    );
}

/** 获取所有已收录的分类列表（去重） */
export async function getAllTaxonomies(): Promise<string[]> {
  const db = await getDb();
  if (!db) return [];
  const rows = await db
    .select({ taxonomy: birdEncyclopedia.taxonomy })
    .from(birdEncyclopedia)
    .where(sql`${birdEncyclopedia.taxonomy} IS NOT NULL`)
    .groupBy(birdEncyclopedia.taxonomy)
    .orderBy(birdEncyclopedia.taxonomy);
  return rows.map((r) => r.taxonomy).filter((t): t is string => !!t);
}

/** 按分类筛选百科条目 */
export async function getEncyclopediaByTaxonomy(taxonomy: string) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(birdEncyclopedia)
    .where(sql`${birdEncyclopedia.taxonomy} LIKE ${`%${taxonomy}%`}`)
    .orderBy(desc(birdEncyclopedia.sightingCount));
}

/** 获取某鸟类的最近识别记录（含图片），用于详情页多图展示 */
export async function getRecentSightingsBySpecies(
  speciesNameZh: string,
  limit = 12
) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select({
      id: birdSightings.id,
      s3PicUrl: birdSightings.s3PicUrl,
      originalPicUrl: birdSightings.originalPicUrl,
      capturedAt: birdSightings.capturedAt,
      confidence: birdSightings.confidence,
      deviceSerial: birdSightings.deviceSerial,
      reviewStatus: birdSightings.reviewStatus,
    })
    .from(birdSightings)
    .where(
      and(
        eq(birdSightings.speciesNameZh, speciesNameZh),
        sql`${birdSightings.reviewStatus} IN ('auto_approved','approved')`
      )
    )
    .orderBy(desc(birdSightings.capturedAt))
    .limit(limit);
}

/** 获取百科条目总数和各分类数量统计 */
export async function getEncyclopediaStats() {
  const db = await getDb();
  if (!db) return { total: 0, taxonomyCounts: [] as { taxonomy: string; count: number }[] };
  const totalRows = await db
    .select({ count: sql<number>`COUNT(*)` })
    .from(birdEncyclopedia);
  const total = Number(totalRows[0]?.count ?? 0);
  const taxRows = await db
    .select({
      taxonomy: birdEncyclopedia.taxonomy,
      count: sql<number>`COUNT(*)`,
    })
    .from(birdEncyclopedia)
    .where(sql`${birdEncyclopedia.taxonomy} IS NOT NULL`)
    .groupBy(birdEncyclopedia.taxonomy)
    .orderBy(desc(sql`COUNT(*)`));
  const taxonomyCounts = taxRows.map((r) => ({
    taxonomy: r.taxonomy ?? "",
    count: Number(r.count),
  }));
  return { total, taxonomyCounts };
}

// ─────────────────────────────────────────────
// AI 模型配置 CRUD
// ─────────────────────────────────────────────

/** 获取所有 AI 模型配置（按创建时间倒序） */
export async function getAllAiModelConfigs(): Promise<AiModelConfig[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(aiModelConfig).orderBy(desc(aiModelConfig.createdAt));
}

/** 获取当前激活的 AI 模型配置 */
export async function getActiveAiModelConfig(): Promise<AiModelConfig | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const rows = await db
    .select()
    .from(aiModelConfig)
    .where(eq(aiModelConfig.isActive, true))
    .limit(1);
  return rows[0];
}

/** 新增 AI 模型配置 */
export async function createAiModelConfig(data: InsertAiModelConfig): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.insert(aiModelConfig).values(data);
}

/** 更新 AI 模型配置 */
export async function updateAiModelConfig(
  id: number,
  data: Partial<InsertAiModelConfig>
): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.update(aiModelConfig).set(data).where(eq(aiModelConfig.id, id));
}

/** 删除 AI 模型配置 */
export async function deleteAiModelConfig(id: number): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.delete(aiModelConfig).where(eq(aiModelConfig.id, id));
}

/**
 * 激活指定 AI 模型配置（同时取消其他所有配置的激活状态）
 * 使用事务确保同一时刻只有一个配置处于激活状态
 */
export async function activateAiModelConfig(id: number): Promise<void> {
  const db = await getDb();
  if (!db) return;
  // 先取消所有激活
  await db.update(aiModelConfig).set({ isActive: false });
  // 再激活指定配置
  await db.update(aiModelConfig).set({ isActive: true }).where(eq(aiModelConfig.id, id));
}
