/**
 * 鸟屋监控轮询服务
 * 定时从萤石云抓拍图片 → AI 识别 → S3 存储 → 写入数据库
 */

import axios from "axios";
import { getDb, getConfidenceThreshold } from "./db";
import { birdSightings, cameraConfigs } from "../drizzle/schema";
import { eq, and } from "drizzle-orm";
import { getEzvizToken, captureDeviceImage } from "./ezviz";
import { recognizeBird } from "./birdRecognition";
import { storagePut } from "./storage";
import { nanoid } from "nanoid";

/** 每个摄像头的轮询定时器 */
const pollingTimers = new Map<number, NodeJS.Timeout>();

/** 最近一次各摄像头的抓拍时间（防止过于频繁） */
const lastCaptureTime = new Map<number, number>();

/** 最小抓拍间隔（毫秒） */
const MIN_INTERVAL_MS = 4000;

/**
 * 下载图片并上传至 S3，返回持久化 URL
 */
async function uploadImageToS3(
  picUrl: string,
  deviceSerial: string
): Promise<{ s3Url: string; s3Key: string }> {
  const response = await axios.get(picUrl, {
    responseType: "arraybuffer",
    timeout: 15000,
  });

  const buffer = Buffer.from(response.data);
  const suffix = nanoid(8);
  const key = `bird-captures/${deviceSerial}/${Date.now()}-${suffix}.jpg`;

  const { url } = await storagePut(key, buffer, "image/jpeg");
  return { s3Url: url, s3Key: key };
}

/**
 * 对单个摄像头执行一次抓拍 + 识别流程
 */
async function runCaptureAndRecognize(configId: number): Promise<void> {
  const db = await getDb();
  if (!db) return;

  // 防止过于频繁
  const last = lastCaptureTime.get(configId) ?? 0;
  if (Date.now() - last < MIN_INTERVAL_MS) return;
  lastCaptureTime.set(configId, Date.now());

  const rows = await db
    .select()
    .from(cameraConfigs)
    .where(and(eq(cameraConfigs.id, configId), eq(cameraConfigs.isActive, true)))
    .limit(1);

  const config = rows[0];
  if (!config) return;

  try {
    // 1. 获取 AccessToken（带缓存）
    const token = await getEzvizToken(config.appKey, config.appSecret, configId);

    // 2. 调用萤石云抓拍接口
    const picUrl = await captureDeviceImage(token, config.deviceSerial, config.channelNo);
    const capturedAt = Date.now();

    // 3. 上传图片至 S3（防止 2 小时过期）
    let s3Url = "";
    let s3Key = "";
    try {
      const uploaded = await uploadImageToS3(picUrl, config.deviceSerial);
      s3Url = uploaded.s3Url;
      s3Key = uploaded.s3Key;
    } catch (uploadErr) {
      console.warn("[Monitor] S3 上传失败，使用原始 URL:", uploadErr);
    }

    // 4. AI 识别鸟类（优先用 S3 URL，否则用原始 URL）
    const imageForAI = s3Url || picUrl;
    const recognition = await recognizeBird(imageForAI);

    // 5. 只有识别到鸟类才写入数据库
    if (recognition.hasBird && recognition.confidence > 0.3) {
      // 根据置信度阈值决定审核状态
      const threshold = await getConfidenceThreshold();
      const reviewStatus = recognition.confidence >= threshold ? "auto_approved" : "pending_review";

      await db.insert(birdSightings).values({
        speciesNameZh: recognition.speciesNameZh,
        speciesNameEn: recognition.speciesNameEn,
        scientificName: recognition.scientificName,
        taxonomy: recognition.taxonomy,
        confidence: recognition.confidence,
        originalPicUrl: picUrl,
        s3PicUrl: s3Url || null,
        s3Key: s3Key || null,
        deviceSerial: config.deviceSerial,
        description: recognition.description,
        capturedAt,
        reviewStatus,
      });

      const statusLabel = reviewStatus === "auto_approved" ? "自动通过" : "待复核";
      console.log(
        `[Monitor] 识别到鸟类: ${recognition.speciesNameZh} (${recognition.speciesNameEn}) 置信度: ${(recognition.confidence * 100).toFixed(1)}% [状态: ${statusLabel}]`
      );
    } else {
      console.log(`[Monitor] 未检测到鸟类 (设备: ${config.deviceSerial})`);
    }
  } catch (err) {
    console.error(`[Monitor] 摄像头 ${configId} 抓拍/识别出错:`, err);
  }
}

/**
 * 启动指定摄像头的监控轮询
 */
export function startMonitoring(configId: number, intervalMs: number): void {
  stopMonitoring(configId);

  const safeInterval = Math.max(intervalMs, MIN_INTERVAL_MS);
  console.log(`[Monitor] 启动监控 configId=${configId} 间隔=${safeInterval}ms`);

  // 立即执行一次
  runCaptureAndRecognize(configId).catch(console.error);

  const timer = setInterval(() => {
    runCaptureAndRecognize(configId).catch(console.error);
  }, safeInterval);

  pollingTimers.set(configId, timer);
}

/**
 * 停止指定摄像头的监控轮询
 */
export function stopMonitoring(configId: number): void {
  const timer = pollingTimers.get(configId);
  if (timer) {
    clearInterval(timer);
    pollingTimers.delete(configId);
    console.log(`[Monitor] 停止监控 configId=${configId}`);
  }
}

/**
 * 获取当前正在运行的监控摄像头 ID 列表
 */
export function getActiveMonitors(): number[] {
  return Array.from(pollingTimers.keys());
}

/**
 * 服务器启动时，恢复所有 isActive=true 的摄像头监控
 */
export async function restoreMonitoring(): Promise<void> {
  const db = await getDb();
  if (!db) return;

  try {
    const activeConfigs = await db
      .select()
      .from(cameraConfigs)
      .where(eq(cameraConfigs.isActive, true));

    for (const config of activeConfigs) {
      startMonitoring(config.id, config.pollIntervalMs);
    }

    if (activeConfigs.length > 0) {
      console.log(`[Monitor] 已恢复 ${activeConfigs.length} 个摄像头监控`);
    }
  } catch (err) {
    console.error("[Monitor] 恢复监控失败:", err);
  }
}
