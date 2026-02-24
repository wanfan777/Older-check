import 'dotenv/config';
import cors from 'cors';
import express from 'express';
import { extractClaims } from './services/claim.js';
import { analyzeInput } from './services/analyze.js';
import { extractText } from './services/ocr.js';
import { taskStore } from './store/taskStore.js';

const app = express();
const port = Number(process.env.PORT || 3300);

app.use(cors());
app.use(
  express.json({
    limit: '12mb'
  })
);

app.use((req, _res, next) => {
  req.userId = req.header('x-user-id') || 'guest';
  next();
});

app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    now: new Date().toISOString()
  });
});

function normalizeClaims(claimOverridesRaw) {
  if (!Array.isArray(claimOverridesRaw)) {
    return [];
  }

  return claimOverridesRaw
    .map((item) => String(item || '').trim())
    .filter(Boolean)
    .slice(0, 3);
}

function normalizePrimaryClaimIndex(value) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 0) {
    return 0;
  }
  return parsed;
}

app.post('/v1/ocr-preview', async (req, res) => {
  const { text = '', image_base64: imageBase64 = '', image_mime: imageMime = '' } = req.body || {};

  if (!text && !imageBase64) {
    return res.status(400).json({
      error: 'INVALID_INPUT',
      message: 'text 或 image_base64 至少提供一个'
    });
  }

  if (imageBase64 && Buffer.byteLength(imageBase64, 'base64') > 10 * 1024 * 1024) {
    return res.status(413).json({
      error: 'IMAGE_TOO_LARGE',
      message: '图片超过 10MB，请压缩后重试'
    });
  }

  try {
    const ocr = await extractText({
      text,
      imageBase64,
      imageMime
    });
    const claims = await extractClaims(ocr.clean_text);

    return res.json({
      ...ocr,
      claims
    });
  } catch (error) {
    return res.status(500).json({
      error: 'OCR_PREVIEW_FAILED',
      message: error instanceof Error ? error.message : 'OCR 预览失败'
    });
  }
});

app.post('/v1/analyze', (req, res) => {
  const {
    text = '',
    image_base64: imageBase64 = '',
    image_mime: imageMime = '',
    clean_text_override: cleanTextOverride = '',
    claim_overrides: claimOverridesRaw = [],
    primary_claim_index: primaryClaimIndexRaw = 0
  } = req.body || {};

  const cleanTextOverrideNormalized = String(cleanTextOverride || '').trim();
  const claimOverrides = normalizeClaims(claimOverridesRaw);
  const primaryClaimIndex = normalizePrimaryClaimIndex(primaryClaimIndexRaw);

  if (!text && !imageBase64 && !cleanTextOverrideNormalized) {
    return res.status(400).json({
      error: 'INVALID_INPUT',
      message: 'text 或 image_base64 至少提供一个'
    });
  }

  if (imageBase64 && Buffer.byteLength(imageBase64, 'base64') > 10 * 1024 * 1024) {
    return res.status(413).json({
      error: 'IMAGE_TOO_LARGE',
      message: '图片超过 10MB，请压缩后重试'
    });
  }

  const task = taskStore.createTask({
    inputType: imageBase64 ? 'image' : 'text',
    userId: req.userId
  });

  setTimeout(async () => {
    try {
      taskStore.markProcessing(task.id);
      const result = await analyzeInput({
        text,
        imageBase64,
        imageMime,
        cleanTextOverride: cleanTextOverrideNormalized,
        claimOverrides,
        primaryClaimIndex
      });
      taskStore.finishTask(task.id, result);
    } catch (error) {
      taskStore.failTask(task.id, error instanceof Error ? error.message : 'UNKNOWN_ERROR');
    }
  }, 100);

  return res.status(202).json({
    task_id: task.id,
    status: task.status,
    estimated_wait_ms: 1200
  });
});

app.get('/v1/analyze/:taskId', (req, res) => {
  const task = taskStore.getTask(req.params.taskId);

  if (!task) {
    return res.status(404).json({
      error: 'TASK_NOT_FOUND',
      message: '任务不存在'
    });
  }

  return res.json({
    task_id: task.id,
    status: task.status,
    created_at: task.created_at,
    updated_at: task.updated_at,
    error: task.error,
    result: task.result
  });
});

app.post('/v1/feedback', (req, res) => {
  const { result_id: resultId, type, comment = '' } = req.body || {};

  if (!resultId || !type) {
    return res.status(400).json({
      error: 'INVALID_INPUT',
      message: 'result_id 和 type 为必填字段'
    });
  }

  const feedback = taskStore.addFeedback({
    result_id: resultId,
    type,
    comment,
    user_id: req.userId
  });

  return res.status(201).json({
    ok: true,
    feedback
  });
});

app.get('/v1/admin/feedback', (_req, res) => {
  res.json({
    total: taskStore.getFeedback().length,
    list: taskStore.getFeedback()
  });
});

app.use((error, _req, res, _next) => {
  return res.status(500).json({
    error: 'INTERNAL_ERROR',
    message: error instanceof Error ? error.message : '未知异常'
  });
});

app.listen(port, () => {
  console.log(`fact-check api listening on http://localhost:${port}`);
});
