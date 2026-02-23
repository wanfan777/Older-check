const { getHistoryById, getSettings } = require('../../utils/storage');

Page({
  data: {
    id: '',
    record: null,
    elderMode: false
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
      record
    });
  }
});
