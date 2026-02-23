const { createAnalyzeTask } = require('../../utils/api');
const { getHistory, getSettings } = require('../../utils/storage');

function readFileAsBase64(path) {
  return new Promise((resolve, reject) => {
    wx.getFileSystemManager().readFile({
      filePath: path,
      encoding: 'base64',
      success: (res) => resolve(res.data),
      fail: (error) => reject(error)
    });
  });
}

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

Page({
  data: {
    text: '',
    imagePath: '',
    imageMime: '',
    analyzing: false,
    recent: [],
    recentSummary: {
      total: 0,
      trusted: 0,
      untrusted: 0,
      insufficient: 0
    },
    elderMode: false
  },

  onShow() {
    const history = getHistory();
    const recent = history.slice(0, 3);
    const settings = getSettings();
    const recentSummary = {
      total: history.length,
      trusted: history.filter((item) => item.label === 'trusted').length,
      untrusted: history.filter((item) => item.label === 'untrusted').length,
      insufficient: history.filter((item) => item.label === 'insufficient').length
    };

    this.setData({
      recent,
      recentSummary,
      elderMode: settings.elderMode
    });
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
      success: (res) => {
        const file = res.tempFiles?.[0];
        if (!file) {
          return;
        }

        this.setData({
          imagePath: file.tempFilePath,
          imageMime: inferImageMime(file.tempFilePath)
        });
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
      imageMime: ''
    });
  },

  async onAnalyze() {
    const { text, imagePath, imageMime, analyzing } = this.data;
    if (analyzing) {
      return;
    }

    if (!text.trim() && !imagePath) {
      wx.showToast({
        title: '请先输入内容或选择截图',
        icon: 'none'
      });
      return;
    }

    this.setData({ analyzing: true });

    try {
      let imageBase64 = '';
      if (imagePath) {
        imageBase64 = await readFileAsBase64(imagePath);
      }

      const task = await createAnalyzeTask({
        text: text.trim(),
        image_base64: imageBase64,
        image_mime: imageMime
      });

      wx.navigateTo({
        url: `/pages/result/result?taskId=${task.task_id}`
      });
    } catch (_error) {
      wx.showToast({
        title: '提交失败，请稍后重试',
        icon: 'none'
      });
    } finally {
      this.setData({ analyzing: false });
    }
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
  }
});
