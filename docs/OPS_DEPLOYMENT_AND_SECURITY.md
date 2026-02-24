# 部署与密钥安全（Qwen）

本文档用于保证本地、测试、生产环境在大模型配置上保持一致，并给出密钥管理与轮换操作规范。

## 1. 环境变量基线

以下变量在 `local / test / prod` 必须同名、同语义：

```env
LLM_ENABLED=true
LLM_BASE_URL=https://dashscope.aliyuncs.com/compatible-mode/v1
LLM_MODEL_TEXT=qwen-plus-latest
LLM_MODEL_VISION=qwen-vl-ocr-latest
LLM_JSON_RESPONSE_FORMAT=true
LLM_TIMEOUT_MS=30000
LLM_API_KEY=<secret>
```

说明：
- `LLM_MODEL_TEXT`：用于文本主张提取。
- `LLM_MODEL_VISION`：用于截图 OCR 识别。
- `LLM_API_KEY`：仅放在环境变量或密钥管理系统，不允许写入 Git。

## 2. 发布前检查清单

1. 检查 `LLM_BASE_URL` 是否为 DashScope 兼容地址。  
2. 检查文本/视觉模型是否分别为：
   - `qwen-plus-latest`
   - `qwen-vl-ocr-latest`
3. 检查 `LLM_API_KEY` 已在目标环境注入（不是代码仓库文件）。
4. 检查日志中没有输出完整 Key（仅允许掩码）。

## 3. 密钥轮换策略

建议每 30-90 天轮换一次，或在以下事件后立即轮换：
- Key 出现在聊天、截图、日志或文档中；
- 账号权限变更；
- 出现异常调用或费用突增。

轮换步骤：
1. 在阿里云百炼控制台创建新 Key。  
2. 将新 Key 注入 `test` 环境并完成回归。  
3. 将新 Key 注入 `prod` 环境并重启服务。  
4. 观察 10-30 分钟无异常后，废弃旧 Key。  
5. 记录轮换时间、执行人、影响范围。

## 4. 回滚策略（模型级）

当线上出现质量或兼容问题时，优先回滚模型名，不改代码：

1. 回滚 `LLM_MODEL_TEXT` 到上一个稳定值。  
2. 回滚 `LLM_MODEL_VISION` 到上一个稳定值。  
3. 保持 `LLM_JSON_RESPONSE_FORMAT=true`，利用现有自动降级逻辑。  
4. 回滚后复测 `/v1/analyze` 文本+图片两条链路。

## 5. 最小验收命令（后端）

```bash
# 健康检查
curl http://127.0.0.1:3300/health

# 文本分析
curl -s http://127.0.0.1:3300/v1/analyze \
  -H 'Content-Type: application/json' \
  -d '{"text":"吃某种保健品可以治愈高血压"}'
```

