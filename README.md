# 🐦 Campus Bird Watch · 校园智能观鸟站

> 利用闲置萤石云摄像头，为校园鸟屋打造一套 AI 智能识鸟系统。  
> 每一张抓拍，都是自然与校园相遇的珍贵瞬间。

![Campus Bird Watch 首页截图](docs/screenshot-home.png)

---

## 项目简介

**Campus Bird Watch** 是一套运行在校园局域网内的智能观鸟系统，灵感来源于 [BirdBuddy](https://mybirdbuddy.com)。它将闲置的萤石云摄像头变成一台智能鸟类观察站——当小鸟来到鸟屋取食时，系统自动抓拍图片，调用 AI 视觉模型识别鸟类品种，并将识别结果展示在优雅的网页上，供师生随时查阅。

本项目专为**校园内网部署**设计，支持在群晖 NAS 上通过 Docker 一键启动，无需公网服务器，数据完全保存在本地。

---

## 功能特性

### 核心功能

| 功能 | 说明 |
|------|------|
| **自动抓拍** | 定时调用萤石云 API 抓取摄像头画面，间隔可配置（最小 4 秒） |
| **AI 识鸟** | 调用 AI 视觉模型识别鸟类中文名、英文名、学名、分类目科、置信度 |
| **图片持久化** | 抓拍图片保存至本地文件系统，规避萤石云 2 小时过期限制 |
| **多摄像头支持** | 可同时管理多个萤石云摄像头，独立配置轮询间隔 |
| **置信度阈值** | 低于阈值的识别结果进入待复核队列，由管理员人工确认 |

### 展示页面

| 页面 | 内容 |
|------|------|
| **实时监控** | Hero 区 + 今日统计 + 最新到访鸟类扇形图片展示 |
| **识别记录** | 分页卡片列表，点击查看详情（学名、分类、置信度进度条） |
| **鸟类百科** | AI 自动生成每种鸟类的习性、分布、鸣声、食性等知识卡片 |
| **历史统计** | 按小时柱状图、品种分布饼图、品种访问频次排行 |
| **待复核队列** | 低置信度记录的人工审核界面，支持批量通过/拒绝 |
| **管理后台** | 摄像头配置、AI 模型切换、置信度阈值设置 |

### AI 模型支持

系统支持在管理后台自由切换 AI 提供商，无需修改代码：

| 提供商 | 推荐模型 | 特点 |
|--------|---------|------|
| **DeepSeek** | `deepseek-chat` | 性价比高，中文识别优秀 |
| **OpenAI** | `gpt-4o` / `gpt-4o-mini` | 识别精度高，响应稳定 |
| **Google Gemini** | `gemini-2.5-flash` | 速度快，多模态能力强 |
| **Ollama（本地）** | `llava` / `minicpm-v` | 完全离线，数据不出内网 |
| **自定义** | 任意兼容 OpenAI 格式的 API | 支持私有部署的模型服务 |

---

## 技术架构

```
┌─────────────────────────────────────────────────────────┐
│                    校园局域网                             │
│                                                         │
│  ┌──────────┐    抓拍 API    ┌──────────────────────┐   │
│  │ 萤石云   │◄──────────────│                      │   │
│  │ 摄像头   │               │   Campus Bird Watch  │   │
│  └──────────┘               │                      │   │
│                             │  ┌────────────────┐  │   │
│  ┌──────────┐   识别请求    │  │  Express 后端  │  │   │
│  │ AI API   │◄──────────────│  │  (Node.js)     │  │   │
│  │ DeepSeek │               │  └────────────────┘  │   │
│  │ /OpenAI  │               │  ┌────────────────┐  │   │
│  └──────────┘               │  │  React 前端    │  │   │
│                             │  │  (Vite + tRPC) │  │   │
│  ┌──────────┐               │  └────────────────┘  │   │
│  │ MySQL DB │◄──────────────│  ┌────────────────┐  │   │
│  │ (本地)   │               │  │  本地文件存储  │  │   │
│  └──────────┘               │  │  /uploads/     │  │   │
│                             │  └────────────────┘  │   │
│  ┌──────────┐               └──────────────────────┘   │
│  │ 师生浏览器│◄─────────────────── http://NAS_IP:3000   │
│  └──────────┘                                          │
└─────────────────────────────────────────────────────────┘
```

**技术栈：**

- **前端**：React 19 + Vite + Tailwind CSS 4 + shadcn/ui + Recharts
- **后端**：Node.js + Express 4 + tRPC 11（端到端类型安全）
- **数据库**：MySQL 8.0 + Drizzle ORM
- **字体**：Cormorant Garamond（英文衬线）+ Noto Serif SC（中文衬线）
- **部署**：Docker + Docker Compose

---

## 快速开始

### 前置要求

- Docker 和 Docker Compose（群晖 NAS 安装 Container Manager 套件）
- 萤石云摄像头 + [萤石云开放平台](https://open.ys7.com) 账号
- 至少一个 AI 视觉模型 API Key（推荐 DeepSeek）

### 三步启动

**第一步：克隆代码**

```bash
git clone https://github.com/your-repo/campus-bird-watcher.git
cd campus-bird-watcher
```

**第二步：配置环境变量**

```bash
cp .env.example .env
# 编辑 .env，填写数据库密码、JWT 密钥、管理员初始密码
nano .env
```

**第三步：启动服务**

```bash
# 创建数据目录
mkdir -p data/mysql data/uploads

# 构建并启动
docker compose up -d --build

# 查看启动日志
docker compose logs -f app
```

服务启动后访问 `http://localhost:3000`，使用 `.env` 中设置的管理员密码登录。

---

## 项目结构

```
campus-bird-watcher/
├── client/                    # React 前端
│   └── src/
│       ├── pages/             # 页面组件
│       │   ├── Home.tsx       # 首页（实时监控）
│       │   ├── Sightings.tsx  # 识别记录
│       │   ├── Encyclopedia.tsx        # 鸟类百科列表
│       │   ├── EncyclopediaDetail.tsx  # 鸟类百科详情
│       │   ├── Statistics.tsx # 历史统计
│       │   ├── Review.tsx     # 待复核队列
│       │   ├── Admin.tsx      # 管理后台
│       │   └── AiModelManager.tsx      # AI 模型管理
│       └── components/
│           ├── FanGallery.tsx # 扇形图片展示组件
│           └── Layout.tsx     # 全局导航布局
├── server/                    # Node.js 后端
│   ├── routers.ts             # tRPC 路由定义
│   ├── db.ts                  # 数据库查询函数
│   ├── ezviz.ts               # 萤石云 API 封装
│   ├── birdRecognition.ts     # AI 识鸟服务
│   ├── monitorService.ts      # 定时监控任务
│   └── localStorage.ts        # 本地文件存储
├── drizzle/                   # 数据库 Schema 和迁移
├── docker-compose.yml         # Docker 编排配置
├── Dockerfile                 # 应用镜像构建
├── DEPLOY.md                  # 群晖 NAS 部署指南
└── README.md                  # 本文档
```

---

## 数据库结构

| 表名 | 用途 |
|------|------|
| `users` | 管理员账号 |
| `bird_sightings` | 鸟类识别记录（图片、品种、置信度、审核状态） |
| `camera_configs` | 摄像头配置（AppKey、设备序列号、轮询间隔） |
| `bird_encyclopedia` | AI 生成的鸟类百科内容 |
| `system_config` | 系统配置（置信度阈值等） |
| `ai_model_config` | AI 模型配置（提供商、API Key、模型型号） |

---

## 许可证

MIT License — 欢迎用于校园教育项目。

---

*每一只鸟的到来，都是自然的馈赠。*
