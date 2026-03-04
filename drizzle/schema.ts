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
  /**
   * 审核状态：
   * - auto_approved: 置信度 ≥ 阈值，自动通过
   * - pending_review: 置信度 < 阈值，等待管理员复核
   * - approved: 管理员手动通过
   * - rejected: 管理员手动拒绝
   */
  reviewStatus: mysqlEnum("reviewStatus", [
    "auto_approved",
    "pending_review",
    "approved",
    "rejected",
  ])
    .notNull()
    .default("auto_approved"),
  /** 复核操作的管理员 ID */
  reviewedBy: int("reviewedBy"),
  /** 复核时间 */
  reviewedAt: timestamp("reviewedAt"),
  /** 复核备注 */
  reviewNote: text("reviewNote"),
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

/**
 * 鸟类百科信息表
 * 每种鸟类一条记录，由 AI 生成并缓存，避免重复调用
 */
export const birdEncyclopedia = mysqlTable("bird_encyclopedia", {
  id: int("id").autoincrement().primaryKey(),
  /** 鸟类中文名（唯一键，用于查询） */
  speciesNameZh: varchar("speciesNameZh", { length: 128 }).notNull().unique(),
  /** 鸟类英文名 */
  speciesNameEn: varchar("speciesNameEn", { length: 128 }).notNull(),
  /** 学名 */
  scientificName: varchar("scientificName", { length: 128 }).notNull(),
  /** 目/科分类 */
  taxonomy: varchar("taxonomy", { length: 128 }),
  /** 代表性图片 URL（来自 S3） */
  representativePicUrl: text("representativePicUrl"),
  /** 简介（2-3句话） */
  summary: text("summary"),
  /** 形态特征 */
  morphology: text("morphology"),
  /** 生活习性 */
  behavior: text("behavior"),
  /** 食性描述 */
  diet: text("diet"),
  /** 分布地区 */
  distribution: text("distribution"),
  /** 栖息地描述 */
  habitat: text("habitat"),
  /** 繁殖信息 */
  breeding: text("breeding"),
  /** 鸣声描述 */
  vocalizations: text("vocalizations"),
  /** 保护状态（如：无危、近危、易危等） */
  conservationStatus: varchar("conservationStatus", { length: 64 }),
  /** 趣味小知识 */
  funFacts: text("funFacts"),
  /** 在校园内的观察建议 */
  campusObservationTips: text("campusObservationTips"),
  /** 本站累计识别次数（冗余字段，定期更新） */
  sightingCount: int("sightingCount").notNull().default(0),
  /** 最近一次识别时间（UTC 毫秒） */
  lastSeenAt: bigint("lastSeenAt", { mode: "number" }),
  /** 内容生成时间 */
  generatedAt: timestamp("generatedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type BirdEncyclopedia = typeof birdEncyclopedia.$inferSelect;
export type InsertBirdEncyclopedia = typeof birdEncyclopedia.$inferInsert;

/**
 * 系统配置表
 * 存储全局配置项，以 key-value 形式保存
 */
export const systemConfig = mysqlTable("system_config", {
  id: int("id").autoincrement().primaryKey(),
  /** 配置项键名 */
  configKey: varchar("configKey", { length: 64 }).notNull().unique(),
  /** 配置项值（JSON 字符串） */
  configValue: text("configValue").notNull(),
  /** 配置项描述 */
  description: varchar("description", { length: 256 }),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type SystemConfig = typeof systemConfig.$inferSelect;
export type InsertSystemConfig = typeof systemConfig.$inferInsert;

/**
 * AI 模型配置表
 * 管理员可在后台配置不同的 AI 提供商和模型
 */
export const aiModelConfig = mysqlTable("ai_model_config", {
  id: int("id").autoincrement().primaryKey(),
  /** 配置名称，如“DeepSeek 识鸟” */
  name: varchar("name", { length: 128 }).notNull(),
  /**
   * 提供商标识：
   * deepseek | openai | gemini | ollama | custom
   */
  provider: varchar("provider", { length: 64 }).notNull().default("deepseek"),
  /** API Key */
  apiKey: text("apiKey").notNull(),
  /** API Base URL，默认为对应提供商的官方地址 */
  baseUrl: varchar("baseUrl", { length: 512 }).notNull(),
  /** 模型型号，如 deepseek-chat、gpt-4o、gemini-2.0-flash */
  model: varchar("model", { length: 128 }).notNull(),
  /** 识别图片时使用的详细程度：low | high | auto */
  imageDetail: varchar("imageDetail", { length: 16 }).notNull().default("high"),
  /** 最大 token 数 */
  maxTokens: int("maxTokens").notNull().default(512),
  /** 是否为当前激活的配置 */
  isActive: boolean("isActive").notNull().default(false),
  /** 备注 */
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type AiModelConfig = typeof aiModelConfig.$inferSelect;
export type InsertAiModelConfig = typeof aiModelConfig.$inferInsert;
