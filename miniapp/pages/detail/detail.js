const { getHistoryById, getSettings, saveAnalyzeDraft } = require('../../utils/storage');

Page({
  data: {
    id: '',
    record: null,
    elderMode: false,
    reasons: []
  },

  onLoad(query) {
    const settings = getSettings();
    this.setData({
      id: query.id || '',
      elderMode: settings.elderMode
    });
  },

  onShow() {
    const rawRecord = getHistoryById(this.data.id);
    const record = rawRecord
      ? {
          ...rawRecord,
          result: {
            ...(rawRecord.result || {}),
            evidences: Array.isArray(rawRecord.result?.evidences) ? rawRecord.result.evidences : []
          }
        }
      : null;

    this.setData({
      record,
      reasons: Array.isArray(record?.result?.reasons) ? record.result.reasons.slice(0, 3) : []
    });
  },

  onReanalyzeThis() {
    const { record } = this.data;
    if (!record) {
      return;
    }

    saveAnalyzeDraft({
      text: String(record.result?.clean_text || record.claim || ''),
      imagePath: '',
      imageMime: 'image/jpeg',
      ocrText: String(record.result?.clean_text || record.claim || ''),
      claims: Array.isArray(record.result?.claims)
        ? record.result.claims.map((item) => ({
            id: item.id,
            claim: item.claim,
            topic: item.topic
          }))
        : [],
      activeClaimIndex: 0
    });

    wx.navigateTo({
      url: '/pages/confirm/confirm'
    });
  }
});
