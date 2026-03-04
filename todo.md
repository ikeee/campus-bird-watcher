# 校园鸟屋智能监控系统 TODO

## 数据库 & 后端基础
- [x] 设计并迁移数据库 Schema（bird_sightings, camera_configs 表）
- [x] 实现萤石云 accessToken 获取与缓存服务
- [x] 实现萤石云设备抓拍接口调用
- [x] 实现 AI 视觉模型识别鸟类品种（invokeLLM + 图片 URL）
- [x] 实现抓拍图片上传至 S3 持久化存储
- [x] 实现后端定时轮询任务（间隔 ≥ 4 秒）
- [x] tRPC 路由：鸟类识别记录 CRUD
- [x] tRPC 路由：摄像头配置管理（增删改查）
- [x] tRPC 路由：启停监控任务
- [x] tRPC 路由：统计数据（今日访客、品种分布、时间轴）

## 前端页面
- [x] 全局设计风格：优雅自然系配色、排版、动效（Cormorant Garamond + Noto Serif SC）
- [x] 全局导航布局组件（顶部导航栏 + 页脚）
- [x] 首页：实时监控状态卡片 + 最新识别到的鸟类展示
- [x] 识别记录页：卡片式布局（图片、品种名、中英文学名、时间、置信度）
- [x] 历史统计页：今日访客数、品种分布饼图/柱图、访问频次时间轴
- [x] 管理后台页：配置 AppKey/Secret/设备序列号，启停监控

## 测试
- [x] 后端 tRPC 路由单元测试（9 tests passed）
- [x] 认证登出测试

## 鸟类百科功能
- [x] 扩展数据库：新增 bird_encyclopedia 表（存储 AI 生成的百科内容）
- [x] 后端：AI 生成鸟类百科内容（习性、分布、鸣声、食性、繁殖等）
- [x] 后端：tRPC 路由 encyclopedia.list / getById / getByName / generate / regenerate
- [x] 前端：百科列表页（已识别品种卡片网格，含搜索过滤）
- [x] 前端：百科详情页（知识卡片布局：习性、分布、鸣声、食性、繁殖、校园观察建议等）
- [x] 导航栏添加"鸟类百科"入口
- [x] 识别记录卡片添加"查看百科"跳转链接
- [x] 编写百科相关单元测试（9 tests passed）

## 置信度阈值与人工复核功能
- [x] 数据库：bird_sightings 表添加 reviewStatus 字段（auto_approved / pending_review / approved / rejected）
- [x] 数据库：新增 system_config 表（存储 confidenceThreshold 等系统配置）
- [x] 后端：tRPC 路由 config.getThreshold / config.setThreshold
- [x] 后端：tRPC 路由 review.pendingList / review.approve / review.reject / review.stats
- [x] 监控服务：抓拍识别后根据阈值自动设置 reviewStatus
- [x] 前端：管理后台新增阈值滑块设置面板
- [x] 前端：新增"待复核"页面（复核队列卡片 + 通过/拒绝操作）
- [x] 前端：导航栏添加待复核数量角标
- [x] 编写置信度阈值与复核功能单元测试

## 鸟类百科功能完善
- [x] 后端：encyclopedia.list 支持按目/科分类筛选
- [x] 后端：encyclopedia.getById 返回该鸟类的最近识别记录（图片列表）
- [x] 后端：encyclopedia.allTaxonomies 返回所有已收录的分类列表
- [x] 前端-百科列表：分类标签筛选栏（全部 / 雀形目 / 鸽形目 等）
- [x] 前端-百科列表：卡片增加最近识别时间、访问频次热度条
- [x] 前端-百科详情：多图轮播（展示该鸟类历次识别的图片）
- [x] 前端-百科详情：Xeno-canto 鸣声搜索嵌入（iframe 或外链）
- [x] 前端-百科详情：相关识别记录时间线（最近 10 次到访）
- [x] 前端-百科详情：分享按钮（复制链接）
- [x] 前端-首页：底部增加"鸟类百科"快捷入口卡片
- [x] 前端-识别记录：卡片悬停显示"已有百科"标记

## UI 风格改造（BirdBuddy 风格）
- [x] 首页 Hero：居中衆线大标题 + 副标题
- [x] 首页：岇形展开图片展示组件（5张，中间大图突出，两侧透视旋转）
- [x] 首页：暖米白背景 (#f0ece4)，深森林绿标题
- [x] 导航栏：透明/毛玻璃风格，深绿色 logo
- [x] 全局配色微调：与参考图一致

## Bug 修复
- [x] 修复首页按小时统计 SQL 错误（GROUP BY HOUR 表达式与 SELECT 别名不一致）

## UI 卡片样式精修
- [x] FanGallery：卡片改为深色圆角（深绿/深灰背景）、顶部弧形鸟屋遮罩 SVG
- [x] FanGallery：右上角绿色胶囊标签（品种名）
- [x] FanGallery：去掉"Stunning Images"标题文字
- [x] FanGallery：5 张卡片扇形展开透视角度与参考图一致

## Self-Host 内网部署改造
- [x] AI 识鸟：替换为 DeepSeek Vision API（deepseek-chat / deepseek-vision）
- [x] 图片存储：替换 S3 为本地文件系统，Express 提供 /uploads 静态路由
- [x] 认证：去掉 Manus OAuth，改为管理员密码登录（JWT）
- [x] 数据库：支持通过环境变量配置本地 MySQL 连接
- [x] Docker Compose：包含 app + mysql 服务，挂载本地卷
- [x] 群晖 NAS 安装文档（Container Manager 操作步骤）

## AI 模型管理功能
- [x] 数据库：新增 ai_model_config 表（provider, apiKey, baseUrl, model, isActive）
- [x] 后端：birdRecognition.ts 动态读取数据库中的 AI 配置
- [x] 后端：tRPC 路由 aiConfig.get / aiConfig.save / aiConfig.test
- [x] 前端：管理后台 AI 模型配置面板（提供商下拉、API Key 输入、模型型号、Base URL、测试按钮）
- [x] 前端：预设常用提供商（DeepSeek / OpenAI / Gemini / Ollama 本地 / 自定义）
