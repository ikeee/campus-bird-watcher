import {
  int,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  varchar,
  float,
  boolean,
  bigint,
} from "drizzle-orm/mysql-core";

export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * 鸟类识别记录表
 * 每次 AI 识别到鸟类时写入一条记录
 */
export const birdSightings = mysqlTable("bird_sightings", {
  id: int("id").autoincrement().primaryKey(),
  /** 鸟类中文名，如"麻雀" */
  speciesNameZh: varchar("speciesNameZh", { length: 128 }).notNull(),
  /** 鸟类英文名，如"Eurasian Tree Sparrow" */
  speciesNameEn: varchar("speciesNameEn", { length: 128 }).notNull(),
  /** 鸟类学名（拉丁文），如"Passer montanus" */
  scientificName: varchar("scientificName", { length: 128 }).notNull(),
  /** 鸟类目/科分类，如"雀形目 / 雀科" */
  taxonomy: varchar("taxonomy", { length: 128 }),
  /** AI 识别置信度 0.0 ~ 1.0 */
  confidence: float("confidence").notNull().default(0),
  /** 原始萤石云抓拍图片 URL（2小时有效） */
  originalPicUrl: text("originalPicUrl"),
  /** 上传至 S3 的持久化图片 URL */
  s3PicUrl: text("s3PicUrl"),
  /** S3 文件 key */
  s3Key: varchar("s3Key", { length: 512 }),
  /** 关联的摄像头设备序列号 */
  deviceSerial: varchar("deviceSerial", { length: 64 }),
  /** AI 返回的完整描述文字 */
  description: text("description"),
  /** 识别时间（UTC 毫秒时间戳） */
  capturedAt: bigint("capturedAt", { mode: "number" }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type BirdSighting = typeof birdSightings.$inferSelect;
export type InsertBirdSighting = typeof birdSightings.$inferInsert;

/**
 * 摄像头配置表
 * 存储萤石云 AppKey/Secret/设备序列号等配置
 */
export const cameraConfigs = mysqlTable("camera_configs", {
  id: int("id").autoincrement().primaryKey(),
  /** 配置名称，如"鸟屋1号摄像头" */
  name: varchar("name", { length: 128 }).notNull(),
  /** 萤石云 AppKey */
  appKey: varchar("appKey", { length: 128 }).notNull(),
  /** 萤石云 AppSecret */
  appSecret: varchar("appSecret", { length: 256 }).notNull(),
  /** 设备序列号 */
  deviceSerial: varchar("deviceSerial", { length: 64 }).notNull(),
  /** 通道号，IPC 设备填 1 */
  channelNo: int("channelNo").notNull().default(1),
  /** 缓存的 accessToken */
  cachedToken: text("cachedToken"),
  /** Token 过期时间（UTC 毫秒时间戳） */
  tokenExpireAt: bigint("tokenExpireAt", { mode: "number" }),
  /** 是否启用监控 */
  isActive: boolean("isActive").notNull().default(false),
  /** 轮询间隔（毫秒），最小 4000 */
  pollIntervalMs: int("pollIntervalMs").notNull().default(10000),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type CameraConfig = typeof cameraConfigs.$inferSelect;
export type InsertCameraConfig = typeof cameraConfigs.$inferInsert;
