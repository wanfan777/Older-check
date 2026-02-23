# 家庭信息鉴别小程序（MVP 骨架）

基于你给出的 PRD，当前仓库已实现一个可联调的最小闭环：

1. 小程序端输入截图/文本。
2. 后端创建分析任务并异步处理。
3. 轮询任务状态获取结论、证据、解释、建议。
4. 结果页展示三态结论，并支持历史记录和反馈。

## 目录结构

```text
.
├── api/                     # Node.js 后端
│   ├── src/server.js        # /v1/analyze, /v1/analyze/:task_id, /v1/feedback
│   ├── src/services/        # LLM识别/Claim/Retrieval/Scoring/Explainer
│   └── src/config/sources.js
├── miniapp/                 # 微信小程序前端（原生）
│   ├── pages/index          # 上传与输入
│   ├── pages/result         # 结果与证据、分享卡片、反馈
│   ├── pages/history        # 历史记录
│   ├── pages/detail         # 历史详情
│   └── pages/settings       # 长辈模式/服务地址/清空记录
└── docs/
    ├── MVP_PRD.md
    └── API_SPEC.md
```

## 后端启动

```bash
cd api
npm install
npm run dev
```

## 微信开发者工具导入方式（重要）

请固定导入 `miniapp/` 目录，不要导入仓库根目录。

- 正确目录：`/Users/fan/Documents/miniprogram/miniapp`
- 错误目录：`/Users/fan/Documents/miniprogram`（会出现“在项目根目录未找到 app.json”）

如果你之前误导入了根目录，请在微信开发者工具中删除该最近项目，再重新导入 `miniapp/`。

详细操作见：`docs/WECHAT_DEVTOOLS_SETUP.md`

## LLM 配置（识别与主张提取）

复制 `api/.env.example` 并设置你的模型配置：

```bash
cd api
cp .env.example .env
```

关键环境变量：

- `LLM_API_KEY`：必填，未设置时会自动降级到规则识别
- `LLM_BASE_URL`：默认 `https://api.openai.com/v1`（兼容 OpenAI 协议的网关也可）
- `LLM_MODEL`：默认 `gpt-4.1-mini`
- `LLM_ENABLED`：默认 `true`
- `LLM_TIMEOUT_MS`：默认 `30000`

默认地址：`http://127.0.0.1:3300`

如果你需要改端口，可覆盖启动：

```bash
PORT=3400 npm run dev
```

健康检查：

```bash
curl http://127.0.0.1:3300/health
```

## 小程序联调

1. 用微信开发者工具打开 `miniapp/`。
2. 在小程序 `设置` 页配置后端地址（默认 `http://127.0.0.1:3300`）。
3. 在开发者工具中关闭域名校验或把地址加入合法域名。

## 当前实现说明

- 图片识别与 claim 提取采用 LLM 优先策略；若未配置 LLM Key，会自动降级到规则模式。
- 证据检索、评分、解释为规则+模板版本，便于快速验证流程。
- 证据源使用示例白名单（`api/src/config/sources.js`），便于后续替换成真实抓取/检索系统。

## 下一步建议

1. 将 `retrieval.js` 接到向量库与白名单索引。
2. 增加用户体系与持久化数据库，替换当前内存任务存储。
3. 补充内容安全策略与敏感信息脱敏。
4. 给高风险话题增加人工复核队列。
