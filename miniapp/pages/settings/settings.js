const { clearHistory, getSettings, saveSettings } = require('../../utils/storage');

Page({
  data: {
    settings: getSettings()
  },

  onShow() {
    this.setData({
      settings: getSettings()
    });
  },

  onToggleElderMode(event) {
    this.updateSettings({
      elderMode: event.detail.value
    });
  },

  onFontScaleChange(event) {
    this.updateSettings({
      fontScale: Number(event.detail.value)
    });
  },

  onRetentionChange(event) {
    this.updateSettings({
      retentionDays: Number(event.detail.value)
    });
  },

  onApiBaseUrlInput(event) {
    this.updateSettings({
      apiBaseUrl: event.detail.value.trim()
    });
  },

  updateSettings(partial) {
    this.setData({
      settings: {
        ...this.data.settings,
        ...partial
      }
    });
  },

  onSave() {
    const saved = saveSettings(this.data.settings);
    getApp().globalData.settings = saved;
    wx.showToast({
      title: '设置已保存',
      icon: 'none'
    });
  },

  onClearHistory() {
    wx.showModal({
      title: '确认清空',
      content: '历史记录将被永久删除，是否继续？',
      success: (res) => {
        if (!res.confirm) {
          return;
        }

        clearHistory();
        wx.showToast({
          title: '已清空',
          icon: 'none'
        });
      }
    });
  }
});
