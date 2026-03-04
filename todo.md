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
