import { eq, desc, and, gte, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { InsertUser, users, birdSightings, cameraConfigs, birdEncyclopedia, InsertBirdSighting, InsertCameraConfig, InsertBirdEncyclopedia } from "../drizzle/schema";
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
  return db
    .select({
      hour: sql<number>`HOUR(FROM_UNIXTIME(${birdSightings.capturedAt} / 1000))`.as("hour"),
      count: sql<number>`COUNT(*)`.as("count"),
    })
    .from(birdSightings)
    .where(gte(birdSightings.capturedAt, todayStart.getTime()))
    .groupBy(sql`HOUR(FROM_UNIXTIME(${birdSightings.capturedAt} / 1000))`)
    .orderBy(sql`hour`);
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
