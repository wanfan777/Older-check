const { getHistory, getSettings } = require('../../utils/storage');

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
    const keyword = event.detail.value || '';
    this.setData({
      keyword
    });
    this.applyFilters();
  },

  onChangeStatus(event) {
    const statusFilter = event.currentTarget.dataset.value || 'all';
    this.setData({
      statusFilter
    });
    this.applyFilters();
  },

  applyFilters() {
    const { sourceList, keyword, statusFilter } = this.data;
    const normalizedKeyword = keyword.trim();

    const list = sourceList.filter((item) => {
      const matchKeyword = !normalizedKeyword || item.claim.includes(normalizedKeyword);
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
  }
});
