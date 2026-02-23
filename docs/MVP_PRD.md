# MVP 落地版需求（对应已实现骨架）

## 目标

- 上传截图或文本后，在 8 秒内返回三态结论：可信 / 不可信 / 证据不足。
- 结果页首屏展示：结论标签、分数、一句话摘要。
- 支持历史查看、分享卡片、纠错反馈。

## P0 功能对应

- 上传：`miniapp/pages/index`
- LLM 识别与分析任务：`api/src/services/*`
- 可信度结论：`api/src/services/scoring.js`
- 证据卡片：`miniapp/pages/result`
- 历史：`miniapp/pages/history`
- 反馈：`POST /v1/feedback`

## 风险与边界

- 结论文案为“当前检索到的证据显示”，避免绝对化。
- 健康/金融/政策话题提供风险提示。
- 结果包含免责声明，不替代医生/律师/警方意见。

## 关键指标（建议埋点）

- `upload_submit`
- `task_poll_success`
- `result_helpful_click`
- `feedback_submit`
- `share_card_generate`
