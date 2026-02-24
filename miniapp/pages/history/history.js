const { deleteHistoryRecord, getHistory, getSettings } = require('../../utils/storage');

Page({
  data: {
    keyword: '',
    statusFilter: 'all',
    sourceList: [],
    list: [],
    elderMode: false
  },

  onShow() {
    const sourceList = getHistory();
    const settings = getSettings();

    this.setData({
      sourceList,
      elderMode: settings.elderMode
    });

    this.applyFilters();
  },

  onInputKeyword(event) {
    this.setData({
      keyword: event.detail.value || ''
    });
    this.applyFilters();
  },

  onChangeStatus(event) {
    this.setData({
      statusFilter: event.currentTarget.dataset.value || 'all'
    });
    this.applyFilters();
  },

  applyFilters() {
    const { sourceList, keyword, statusFilter } = this.data;
    const normalizedKeyword = String(keyword || '').trim();

    const list = sourceList.filter((item) => {
      const matchKeyword = !normalizedKeyword || String(item.claim || '').includes(normalizedKeyword);
      const matchStatus = statusFilter === 'all' || item.label === statusFilter;
      return matchKeyword && matchStatus;
    });

    this.setData({ list });
  },

  openDetail(event) {
    const id = event.currentTarget.dataset.id;
    wx.navigateTo({
      url: `/pages/detail/detail?id=${id}`
    });
  },

  onDeleteRecord(event) {
    const id = event.currentTarget.dataset.id;
    if (!id) {
      return;
    }

    wx.showModal({
      title: '删除记录',
      content: '删除后不可恢复，是否继续？',
      success: (res) => {
        if (!res.confirm) {
          return;
        }

        const next = deleteHistoryRecord(id);
        this.setData({
          sourceList: next
        });
        this.applyFilters();

        wx.showToast({
          title: '已删除',
          icon: 'none'
        });
      }
    });
  }
});
