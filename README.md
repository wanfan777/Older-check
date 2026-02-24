# 家庭信息鉴别小程序（MVP）

一个给家庭场景使用的“信息真伪初筛”微信小程序。  
用户上传截图或粘贴文本后，系统会给出三态结论（可信 / 不可信 / 证据不足），并提供证据与行动建议。

## 小程序主要功能

### 1) 多模态输入
- 支持文本输入与图片上传（相册/拍照）。
- 支持“截图 + 补充文字”联合分析，提高可读性和命中率。

### 2) 自动鉴别与结论输出
- 自动提取可验证主张（claim）。
- 给出三态结果：`可信`、`不可信`、`证据不足`。
- 输出可信度分数（0-100）、一句话摘要、关键理由。

### 3) 证据卡片与风险提示
- 展示对应证据来源、发布时间、支持/反驳立场、引用摘要。
- 提供高风险话题提醒（健康、诈骗、金融、政策、公共安全）。
- 支持一键复制证据来源链接。

### 4) 结果二次操作
- 生成“辟谣卡片”用于转发说明。
- 提交纠错反馈（结论不对 / 证据不全 / OCR 识别错误）。

### 5) 历史与详情
- 自动保存分析历史。
- 支持按关键词和结论状态筛选历史记录。
- 支持查看历史详情（结论、解释、证据链）。

### 6) 适老化与联调设置
- 长辈模式开关。
- 字体倍率与历史保留天数设置（已存储，后续可进一步联动展示逻辑）。
- 可配置后端服务地址，便于本地联调。

## 页面能力一览

- `pages/index`：输入文本/上传截图、发起分析、最近记录概览。
- `pages/result`：轮询任务、展示结论/理由/证据、生成卡片、提交反馈。
- `pages/history`：历史列表与筛选。
- `pages/detail`：历史单条详情与证据时间线。
- `pages/settings`：适老化、服务地址、清空历史。

## 核心处理流程

1. 小程序提交文本或图片到 `/v1/analyze`。
2. 后端创建异步任务并进入分析流水线：
   - 文本提取（OCR/文本清洗）
   - 主张提取（Claim）
   - 证据检索（Retrieval）
   - 评分判定（Scoring）
   - 解释生成（Explainer）
3. 小程序轮询 `/v1/analyze/:task_id`，拿到最终结果。
4. 结果页展示并写入本地历史。

## 目录结构

```text
.
├── api/                     # Node.js 后端
│   ├── src/server.js        # /v1/analyze, /v1/analyze/:task_id, /v1/feedback
│   ├── src/services/        # OCR/Claim/Retrieval/Scoring/Explainer/LLM Client
│   └── src/config/sources.js
├── miniapp/                 # 微信小程序前端（原生）
│   ├── pages/index
│   ├── pages/result
│   ├── pages/history
│   ├── pages/detail
│   └── pages/settings
└── docs/
    ├── MVP_PRD.md
    ├── API_SPEC.md
    ├── WECHAT_DEVTOOLS_SETUP.md
    └── OPS_DEPLOYMENT_AND_SECURITY.md
```

## 本地启动（最短路径）

### 启动后端

```bash
cd api
npm install
npm run dev
```

默认服务地址：`http://127.0.0.1:3300`

### 导入小程序（重要）

微信开发者工具请导入：`/Users/fan/Documents/miniprogram/miniapp`  
不要导入仓库根目录，否则会报 `app.json` 缺失。

## LLM 配置（可选但推荐）

复制并配置环境变量：

```bash
cd api
cp .env.example .env
```

关键项：
- `LLM_API_KEY`：配置后启用 LLM 优先识别与主张提取。
- `LLM_BASE_URL`：兼容 OpenAI 协议网关地址。
- `LLM_MODEL_TEXT`：文本主张提取模型。
- `LLM_MODEL_VISION`：图片 OCR 识别模型。

推荐固定组合（当前默认）：
- `LLM_MODEL_TEXT=qwen-plus-latest`
- `LLM_MODEL_VISION=qwen-vl-ocr-latest`

接入 Qwen（DashScope）示例：

```env
LLM_ENABLED=true
LLM_API_KEY=你的DashScopeKey
LLM_BASE_URL=https://dashscope.aliyuncs.com/compatible-mode/v1
LLM_MODEL_TEXT=qwen-plus-latest
LLM_MODEL_VISION=qwen-vl-ocr-latest
LLM_JSON_RESPONSE_FORMAT=true
```

未配置时会自动降级为规则模式，不影响基础流程跑通。

部署与密钥管理规范见：`docs/OPS_DEPLOYMENT_AND_SECURITY.md`

## 当前边界（MVP）

- 任务与反馈存储为内存态，重启后会丢失。
- 证据源使用示例白名单索引，便于后续替换为真实检索系统。
- 结果用于辅助判断，不替代医疗、法律、投资等专业意见。
