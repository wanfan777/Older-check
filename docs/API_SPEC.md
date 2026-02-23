# API 规格（MVP）

## POST /v1/analyze

- 入参：
  - `text` string，可选
  - `image_base64` string，可选
  - `image_mime` string，可选（如 `image/png`）
- 约束：`text` 和 `image_base64` 至少一个；图片 base64 解码后不超过 10MB
- 出参：

```json
{
  "task_id": "task_...",
  "status": "pending",
  "estimated_wait_ms": 1200
}
```

## GET /v1/analyze/:task_id

- 出参：

```json
{
  "task_id": "task_...",
  "status": "pending|processing|done|failed",
  "created_at": "2026-02-15T09:00:00.000Z",
  "updated_at": "2026-02-15T09:00:01.000Z",
  "error": null,
  "result": {
    "recognition_provider": "llm_vision|fallback_no_llm|user_text",
    "recognition_note": "",
    "claims": [],
    "label": "trusted|untrusted|insufficient",
    "score": 82,
    "reasons": [],
    "evidences": [],
    "summary": "...",
    "next_steps": [],
    "disclaimer": "..."
  }
}
```

## POST /v1/feedback

- 入参：
  - `result_id` string
  - `type` string (`wrong_label|missing_evidence|ocr_error`)
  - `comment` string，可选
- 出参：

```json
{
  "ok": true,
  "feedback": {
    "id": "fb_..."
  }
}
```
