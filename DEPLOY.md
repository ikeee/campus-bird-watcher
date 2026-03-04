# 校园鸟屋智能监控系统 — 群晖 NAS 部署指南

本文档说明如何在**群晖 NAS**（Synology DiskStation）上通过 Docker 部署校园鸟屋智能监控系统，使其在校园局域网内运行。

---

## 一、前置要求

| 项目 | 要求 |
|------|------|
| 群晖 DSM 版本 | DSM 7.0 或以上 |
| 套件 | Container Manager（原 Docker 套件）已安装 |
| 内存 | 建议 2GB 以上可用内存 |
| 存储 | 建议预留 10GB 以上空间（图片存储） |
| 网络 | 内网可访问外网（用于调用 AI API） |

---

## 二、准备工作

### 2.1 在群晖上创建共享文件夹

通过 DSM 控制面板 → 共享文件夹，创建以下目录结构（或使用现有共享文件夹）：

```
/volume1/docker/birdwatch/
├── mysql/          ← 数据库数据
└── uploads/        ← 鸟类图片存储
```

通过 SSH 或 File Station 创建：

```bash
mkdir -p /volume1/docker/birdwatch/mysql
mkdir -p /volume1/docker/birdwatch/uploads
```

### 2.2 下载项目代码

通过 SSH 登录群晖，将项目代码克隆到 NAS：

```bash
# 方法一：通过 Git（需安装 Git 套件）
cd /volume1/docker
git clone <你的项目仓库地址> birdwatch-app
cd birdwatch-app

# 方法二：通过 File Station 上传项目压缩包并解压
```

---

## 三、配置环境变量

在项目根目录创建 `.env` 文件：

```bash
cd /volume1/docker/birdwatch-app
cp .env.example .env
nano .env   # 或用 vi 编辑
```

**必填配置项：**

```bash
# 数据库密码（自定义强密码）
DB_ROOT_PASSWORD=MyRootPass2024!
DB_PASSWORD=MyBirdWatchPass2024!

# 数据库和图片存储路径（群晖实际路径）
DB_HOST_PATH=/volume1/docker/birdwatch/mysql
UPLOADS_HOST_PATH=/volume1/docker/birdwatch/uploads

# JWT 密钥（随机字符串，可用以下命令生成）
# openssl rand -hex 32
JWT_SECRET=a1b2c3d4e5f6...（填入生成的随机字符串）

# 管理员初始密码
ADMIN_INIT_PASSWORD=YourAdminPassword2024

# AI API 配置（也可在管理后台配置，此处可留空）
DEFAULT_AI_PROVIDER=deepseek
DEFAULT_AI_API_KEY=sk-your-deepseek-api-key
DEFAULT_AI_BASE_URL=https://api.deepseek.com
DEFAULT_AI_MODEL=deepseek-chat
```

---

## 四、启动服务

### 方法一：通过 SSH 命令行（推荐）

```bash
cd /volume1/docker/birdwatch-app

# 首次启动（构建镜像 + 启动容器）
docker compose up -d --build

# 查看启动日志
docker compose logs -f app

# 查看运行状态
docker compose ps
```

### 方法二：通过 Container Manager 图形界面

1. 打开 DSM → Container Manager → 项目
2. 点击「新增」→「从 docker-compose.yml 创建」
3. 选择项目目录 `/volume1/docker/birdwatch-app`
4. 点击「下一步」→「完成」

---

## 五、访问系统

服务启动后，在局域网内任意设备浏览器访问：

```
http://<群晖IP地址>:3000
```

例如：`http://192.168.1.100:3000`

**首次登录：**
- 用户名：`admin`
- 密码：`.env` 文件中设置的 `ADMIN_INIT_PASSWORD`

---

## 六、配置 AI 识鸟模型

1. 登录系统后，进入**管理后台** → 点击「管理模型」
2. 点击「添加模型配置」
3. 选择 AI 提供商（推荐 **DeepSeek**，性价比高）
4. 填入 API Key 和模型型号
5. 点击「测试连接」验证配置是否正确
6. 保存后点击「激活」使其生效

**DeepSeek API 获取方式：**
1. 访问 [platform.deepseek.com](https://platform.deepseek.com)
2. 注册账号 → API Keys → 创建新 Key
3. 复制 Key 填入系统

---

## 七、配置萤石云摄像头

1. 进入**管理后台** → 摄像头配置
2. 点击「添加摄像头」
3. 填入以下信息：
   - **名称**：如"鸟屋摄像头1"
   - **AppKey / AppSecret**：在[萤石云开放平台](https://open.ys7.com)获取
   - **设备序列号**：印在摄像头背面
   - **轮询间隔**：建议 30000ms（30秒）以上
4. 保存后点击「启动」开始监控

---

## 八、常用运维命令

```bash
# 查看应用日志
docker compose logs -f app

# 查看数据库日志
docker compose logs -f db

# 重启应用
docker compose restart app

# 停止所有服务
docker compose down

# 更新应用（拉取新代码后）
git pull
docker compose up -d --build app

# 备份数据库
docker exec campus-bird-watcher-db \
  mysqldump -u birdwatch -p<DB_PASSWORD> birdwatch \
  > /volume1/docker/birdwatch/backup_$(date +%Y%m%d).sql

# 查看图片存储占用
du -sh /volume1/docker/birdwatch/uploads/
```

---

## 九、配置局域网固定 IP（可选）

为方便师生访问，建议在路由器中为群晖 NAS 绑定固定 IP，或在 DSM 中设置静态 IP：

DSM → 控制面板 → 网络 → 网络界面 → 编辑 → 手动设置 IP

---

## 十、故障排查

| 问题 | 解决方法 |
|------|---------|
| 无法访问 3000 端口 | 检查群晖防火墙是否放行 3000 端口（控制面板 → 安全性 → 防火墙） |
| 数据库连接失败 | 检查 `.env` 中 `DB_PASSWORD` 是否与 `DB_ROOT_PASSWORD` 不同，且不含特殊字符 |
| 萤石云抓拍次数超限 | 将轮询间隔调大至 60000ms（1分钟）以上 |
| AI 识别失败 | 检查 API Key 是否有效，内网是否能访问 AI 服务商域名 |
| 图片无法显示 | 检查 `/volume1/docker/birdwatch/uploads/` 目录权限（应为 755） |

---

## 十一、数据备份建议

建议在群晖 Hyper Backup 中配置定时备份以下目录：

- `/volume1/docker/birdwatch/mysql/` — 数据库数据
- `/volume1/docker/birdwatch/uploads/` — 鸟类图片

---

*如有问题，请查看应用日志：`docker compose logs -f app`*
