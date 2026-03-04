/**
 * 本地文件存储模块（Self-host 版本）
 * 替代 S3，将图片保存到本地 uploads 目录
 *
 * 图片通过 Express 静态路由 /uploads 对外提供访问
 * Docker 部署时通过 volume 挂载到宿主机目录持久化
 */

import fs from "fs";
import path from "path";

/** 上传目录，优先使用环境变量 UPLOADS_DIR，默认为项目根目录下的 uploads */
function getUploadsDir(): string {
  return process.env.UPLOADS_DIR || path.join(process.cwd(), "uploads");
}

/**
 * 确保目录存在（递归创建）
 */
function ensureDir(dirPath: string): void {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

/**
 * 获取本地服务的 base URL（用于拼接图片访问地址）
 * 优先使用环境变量 APP_BASE_URL，否则使用 localhost
 */
function getBaseUrl(): string {
  const base = process.env.APP_BASE_URL || "";
  // 去掉末尾斜杠
  return base.replace(/\/$/, "");
}

/**
 * 将图片 Buffer 保存到本地文件系统
 * @param relKey 相对路径键，如 "bird-captures/ABC123/1234567890-abcd1234.jpg"
 * @param data   图片数据
 * @param _contentType 内容类型（本地存储不需要，保留参数兼容 storagePut 签名）
 * @returns { key, url } key 为相对路径，url 为可访问的 HTTP URL
 */
export async function localStoragePut(
  relKey: string,
  data: Buffer | Uint8Array | string,
  _contentType?: string
): Promise<{ key: string; url: string }> {
  const uploadsDir = getUploadsDir();
  const fullPath = path.join(uploadsDir, relKey);

  // 确保子目录存在
  ensureDir(path.dirname(fullPath));

  // 写入文件
  const buffer = typeof data === "string" ? Buffer.from(data) : Buffer.from(data);
  fs.writeFileSync(fullPath, buffer);

  // 构建访问 URL：/uploads/<relKey>
  const url = `${getBaseUrl()}/uploads/${relKey}`;

  return { key: relKey, url };
}

/**
 * 删除本地文件
 * @param relKey 相对路径键
 */
export function localStorageDelete(relKey: string): void {
  const uploadsDir = getUploadsDir();
  const fullPath = path.join(uploadsDir, relKey);
  if (fs.existsSync(fullPath)) {
    fs.unlinkSync(fullPath);
  }
}

/**
 * 获取 uploads 目录的绝对路径（供 Express 静态路由使用）
 */
export function getUploadsAbsDir(): string {
  const dir = getUploadsDir();
  ensureDir(dir);
  return dir;
}
