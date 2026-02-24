const { getHistory, getSettings, saveAnalyzeDraft } = require('../../utils/storage');

function inferImageMime(filePath) {
  const ext = String(filePath || '')
    .split('?')[0]
    .split('.')
    .pop()
    .toLowerCase();

  if (ext === 'png') {
    return 'image/png';
  }
  if (ext === 'webp') {
    return 'image/webp';
  }
  if (ext === 'jpg' || ext === 'jpeg') {
    return 'image/jpeg';
  }

  return 'image/jpeg';
}

function formatFileSize(size = 0) {
  if (!size) {
    return '';
  }
  if (size < 1024 * 1024) {
    return `${Math.max(1, Math.round(size / 1024))}KB`;
  }
  return `${(size / (1024 * 1024)).toFixed(1)}MB`;
}

Page({
  data: {
    text: '',
    imagePath: '',
    imageMime: '',
    imageMeta: '',
    recent: [],
    recentSummary: {
      total: 0,
      trusted: 0,
      untrusted: 0,
      insufficient: 0
    },
    elderMode: false,
    showBackTop: false
  },

  onShow() {
    const history = getHistory();
    const recent = history.slice(0, 3);
    const settings = getSettings();

    this.setData({
      recent,
      elderMode: settings.elderMode,
      recentSummary: {
        total: history.length,
        trusted: history.filter((item) => item.label === 'trusted').length,
        untrusted: history.filter((item) => item.label === 'untrusted').length,
        insufficient: history.filter((item) => item.label === 'insufficient').length
      }
    });
  },

  onPageScroll(event) {
    const showBackTop = event.scrollTop > 420;
    if (showBackTop !== this.data.showBackTop) {
      this.setData({ showBackTop });
    }
  },

  onInputText(event) {
    this.setData({
      text: event.detail.value
    });
  },

  onPickImage() {
    wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      sourceType: ['album', 'camera'],
      sizeType: ['compressed'],
      success: (res) => {
        const file = res.tempFiles?.[0];
        if (!file) {
          return;
        }

        const sizeText = formatFileSize(file.size || 0);
        const width = Number(file.width || 0);
        const height = Number(file.height || 0);
        const dimensionText = width && height ? `${width}x${height}` : '';
        const baseMeta = [sizeText, dimensionText].filter(Boolean).join(' · ');

        const applyImageSelection = (path, extraMeta = '') => {
          this.setData({
            imagePath: path,
            imageMime: inferImageMime(path),
            imageMeta: [baseMeta, extraMeta].filter(Boolean).join(' · ')
          });
        };

        if (file.size > 3 * 1024 * 1024) {
          wx.compressImage({
            src: file.tempFilePath,
            quality: 72,
            success: (compressed) => {
              applyImageSelection(compressed.tempFilePath, '已压缩');
              wx.showToast({
                title: '图片较大，已自动压缩',
                icon: 'none'
              });
            },
            fail: () => {
              applyImageSelection(file.tempFilePath);
              wx.showToast({
                title: '图片较大，建议裁剪后重试',
                icon: 'none'
              });
            }
          });
          return;
        } else if ((width && width < 720) || (height && height < 720)) {
          wx.showToast({
            title: '图片可能不清晰，建议重拍',
            icon: 'none'
          });
        }

        applyImageSelection(file.tempFilePath);
      },
      fail: () => {
        wx.showToast({
          title: '选择图片失败',
          icon: 'none'
        });
      }
    });
  },

  onClearImage() {
    this.setData({
      imagePath: '',
      imageMime: '',
      imageMeta: ''
    });
  },

  onNextStep() {
    const { text, imagePath, imageMime } = this.data;
    if (!text.trim() && !imagePath) {
      wx.showToast({
        title: '请先输入内容或选择截图',
        icon: 'none'
      });
      return;
    }

    saveAnalyzeDraft({
      text: text.trim(),
      imagePath,
      imageMime,
      ocrText: text.trim(),
      claims: [],
      activeClaimIndex: 0
    });

    wx.navigateTo({
      url: '/pages/confirm/confirm'
    });
  },

  goHistory() {
    wx.navigateTo({
      url: '/pages/history/history'
    });
  },

  goSettings() {
    wx.navigateTo({
      url: '/pages/settings/settings'
    });
  },

  openHistoryDetail(event) {
    const id = event.currentTarget.dataset.id;
    wx.navigateTo({
      url: `/pages/detail/detail?id=${id}`
    });
  },

  onBackTop() {
    wx.pageScrollTo({
      scrollTop: 0,
      duration: 200
    });
  }
});
