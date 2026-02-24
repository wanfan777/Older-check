const { formatTime } = require('./format');

const HISTORY_KEY = 'analysis_history_v1';
const SETTINGS_KEY = 'app_settings_v1';
const DRAFT_KEY = 'analysis_draft_v1';

const DEFAULT_SETTINGS = {
  elderMode: false,
  fontScale: 1,
  retentionDays: 30,
  apiBaseUrl: 'http://127.0.0.1:3300'
};

function getHistory() {
  return wx.getStorageSync(HISTORY_KEY) || [];
}

function getHistoryById(id) {
  return getHistory().find((item) => item.id === id) || null;
}

function clearHistory() {
  wx.removeStorageSync(HISTORY_KEY);
}

function deleteHistoryRecord(id) {
  const old = getHistory();
  const next = old.filter((item) => item.id !== id);
  wx.setStorageSync(HISTORY_KEY, next);
  return next;
}

function getLabelText(label) {
  if (label === 'trusted') {
    return '可信';
  }
  if (label === 'untrusted') {
    return '不可信';
  }
  return '证据不足';
}

function appendHistoryRecord({ taskId, result }) {
  const old = getHistory();
  const now = new Date().toISOString();
  const claim = result.claims?.[0]?.claim || result.clean_text || '未命名主张';
  const record = {
    id: taskId,
    claim: claim.slice(0, 48),
    label: result.label,
    labelText: getLabelText(result.label),
    score: result.score,
    time: now,
    timeText: formatTime(now),
    result
  };

  const merged = [record, ...old.filter((item) => item.id !== taskId)].slice(0, 100);
  wx.setStorageSync(HISTORY_KEY, merged);
  return record;
}

function getSettings() {
  const saved = wx.getStorageSync(SETTINGS_KEY) || {};
  return {
    ...DEFAULT_SETTINGS,
    ...saved
  };
}

function saveSettings(settings) {
  const merged = {
    ...DEFAULT_SETTINGS,
    ...settings
  };

  wx.setStorageSync(SETTINGS_KEY, merged);
  if (merged.apiBaseUrl) {
    wx.setStorageSync('api_base_url', merged.apiBaseUrl);
  }

  return merged;
}

function saveAnalyzeDraft(draft) {
  const payload = {
    text: String(draft?.text || ''),
    imagePath: String(draft?.imagePath || ''),
    imageMime: String(draft?.imageMime || 'image/jpeg'),
    ocrText: String(draft?.ocrText || ''),
    claims: Array.isArray(draft?.claims) ? draft.claims : [],
    activeClaimIndex: Number.isInteger(draft?.activeClaimIndex) ? draft.activeClaimIndex : 0
  };
  wx.setStorageSync(DRAFT_KEY, payload);
  return payload;
}

function getAnalyzeDraft() {
  return wx.getStorageSync(DRAFT_KEY) || null;
}

function clearAnalyzeDraft() {
  wx.removeStorageSync(DRAFT_KEY);
}

module.exports = {
  getHistory,
  getHistoryById,
  clearHistory,
  deleteHistoryRecord,
  appendHistoryRecord,
  getSettings,
  saveSettings,
  saveAnalyzeDraft,
  getAnalyzeDraft,
  clearAnalyzeDraft
};
