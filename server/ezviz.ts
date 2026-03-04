/**
 * 萤石云（EZVIZ）API 服务模块
 * 负责 AccessToken 管理与设备抓拍图片获取
 */

import axios from "axios";
import { getDb } from "./db";
import { cameraConfigs } from "../drizzle/schema";
import { eq } from "drizzle-orm";

const EZVIZ_BASE = "https://open.ys7.com";

interface TokenResponse {
  code: string;
  msg: string;
  data?: {
    accessToken: string;
    expireTime: number;
  };
}

interface CaptureResponse {
  code: string;
  msg: string;
  data?: {
    picUrl: string;
  };
}

/**
 * 从萤石云获取 AccessToken（带本地缓存）
 */
export async function getEzvizToken(
  appKey: string,
  appSecret: string,
  configId?: number
): Promise<string> {
  // 如果有 configId，先检查缓存
  if (configId !== undefined) {
    const db = await getDb();
    if (db) {
      const rows = await db
        .select()
        .from(cameraConfigs)
        .where(eq(cameraConfigs.id, configId))
        .limit(1);
      const config = rows[0];
      if (
        config?.cachedToken &&
        config.tokenExpireAt &&
        Date.now() < config.tokenExpireAt - 60_000 * 10 // 提前 10 分钟刷新
      ) {
        return config.cachedToken;
      }
    }
  }

  // 请求新 Token
  const params = new URLSearchParams({ appKey, appSecret });
  const resp = await axios.post<TokenResponse>(
    `${EZVIZ_BASE}/api/lapp/token/get`,
    params.toString(),
    { headers: { "Content-Type": "application/x-www-form-urlencoded" } }
  );

  if (resp.data.code !== "200" || !resp.data.data?.accessToken) {
    throw new Error(`萤石云获取 Token 失败: ${resp.data.msg} (code: ${resp.data.code})`);
  }

  const { accessToken, expireTime } = resp.data.data;

  // 更新数据库缓存
  if (configId !== undefined) {
    const db = await getDb();
    if (db) {
      await db
        .update(cameraConfigs)
        .set({ cachedToken: accessToken, tokenExpireAt: expireTime })
        .where(eq(cameraConfigs.id, configId));
    }
  }

  return accessToken;
}

/**
 * 调用萤石云设备抓拍接口，返回图片 URL
 * 注意：返回的图片 URL 仅 2 小时有效，需及时上传至 S3
 */
export async function captureDeviceImage(
  accessToken: string,
  deviceSerial: string,
  channelNo: number = 1
): Promise<string> {
  const params = new URLSearchParams({
    accessToken,
    deviceSerial,
    channelNo: String(channelNo),
  });

  const resp = await axios.post<CaptureResponse>(
    `${EZVIZ_BASE}/api/lapp/device/capture`,
    params.toString(),
    { headers: { "Content-Type": "application/x-www-form-urlencoded" } }
  );

  if (resp.data.code !== "200" || !resp.data.data?.picUrl) {
    throw new Error(
      `萤石云抓拍失败: ${resp.data.msg} (code: ${resp.data.code})`
    );
  }

  return resp.data.data.picUrl;
}
