const { getAnalyzeTask, submitFeedback } = require('../../utils/api');
const { appendHistoryRecord, getSettings } = require('../../utils/storage');

const LABEL_TEXT = {
  trusted: '可信',
  untrusted: '不可信',
  insufficient: '证据不足'
};

const LABEL_COLOR = {
  trusted: '#16A34A',
  untrusted: '#DC2626',
  insufficient: '#D97706'
};

const STANCE_TEXT = {
  support: '支持',
  refute: '反驳',
  unrelated: '相关性弱'
};

function truncateText(text, maxLength) {
  if (!text) {
    return '';
  }
  if (text.length <= maxLength) {
    return text;
  }
  return `${text.slice(0, maxLength)}...`;
}

Page({
  data: {
    taskId: '',
    loading: true,
    error: '',
    result: null,
    labelText: '',
    topClaim: '',
    progressPercent: 0,
    progressColor: '#1677FF',
    elderMode: false
  },

  onLoad(query) {
    const settings = getSettings();
    this.setData({
      taskId: query.taskId || '',
      elderMode: settings.elderMode
    });

    if (!query.taskId) {
      this.setData({
        loading: false,
        error: '缺少任务 ID'
      });
      return;
    }

    this.startPolling();
  },

  onUnload() {
    this.stopPolling();
  },

  startPolling() {
    this.pollCount = 0;
    this.fetchTask();
    this.timer = setInterval(() => {
      this.fetchTask();
    }, 1200);
  },

  stopPolling() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  },

  async fetchTask() {
    const { taskId } = this.data;
    if (!taskId) {
      return;
    }

    this.pollCount += 1;

    try {
      const payload = await getAnalyzeTask(taskId);
      if (payload.status === 'pending' || payload.status === 'processing') {
        if (this.pollCount > 25) {
          this.stopPolling();
          this.setData({
            loading: false,
            error: '处理超时，请稍后重试'
          });
        }
        return;
      }

      if (payload.status === 'failed') {
        this.stopPolling();
        this.setData({
          loading: false,
          error: payload.error || '分析失败'
        });
        return;
      }

      if (payload.status === 'done') {
        this.stopPolling();
        const result = {
          ...payload.result,
          evidences: (payload.result?.evidences || []).map((item) => ({
            ...item,
            stanceText: STANCE_TEXT[item.stance] || '未知'
          }))
        };
        const labelText = LABEL_TEXT[result.label] || '证据不足';
        const progressPercent = Math.max(0, Math.min(100, Number(result.score || 0)));
        const progressColor = LABEL_COLOR[result.label] || '#1677FF';
        const topClaim =
          result.claims?.[0]?.claim || truncateText(result.clean_text || '未提取到主张', 50);

        this.setData({
          loading: false,
          result,
          labelText,
          topClaim,
          progressPercent,
          progressColor,
          error: ''
        });

        appendHistoryRecord({
          taskId,
          result
        });
      }
    } catch (_error) {
      this.stopPolling();
      this.setData({
        loading: false,
        error: '拉取任务失败，请检查网络或服务地址'
      });
    }
  },

  onRetry() {
    this.setData({
      loading: true,
      error: ''
    });
    this.startPolling();
  },

  onCopySource(event) {
    const url = event.currentTarget.dataset.url;
    if (!url) {
      return;
    }

    wx.setClipboardData({
      data: url,
      success: () => {
        wx.showToast({
          title: '链接已复制',
          icon: 'none'
        });
      }
    });
  },

  onFeedback() {
    const { taskId } = this.data;
    const feedbackTypes = [
      { label: '结论不对', value: 'wrong_label' },
      { label: '证据不全', value: 'missing_evidence' },
      { label: '截图识别错了', value: 'ocr_error' }
    ];

    wx.showActionSheet({
      itemList: feedbackTypes.map((item) => item.label),
      success: async (res) => {
        const selected = feedbackTypes[res.tapIndex];
        try {
          await submitFeedback({
            result_id: taskId,
            type: selected.value,
            comment: ''
          });
          wx.showToast({
            title: '感谢反馈',
            icon: 'none'
          });
        } catch (_error) {
          wx.showToast({
            title: '提交失败，请稍后重试',
            icon: 'none'
          });
        }
      }
    });
  },

  onGeneratePoster() {
    const { result, topClaim, labelText } = this.data;
    if (!result) {
      return;
    }

    const ctx = wx.createCanvasContext('shareCanvas', this);

    ctx.setFillStyle('#F4F7FF');
    ctx.fillRect(0, 0, 640, 900);

    ctx.setFillStyle('#FFFFFF');
    this.drawRoundRect(ctx, 40, 40, 560, 820, 24);
    ctx.fill();

    ctx.setFillStyle('#1F2633');
    ctx.setFontSize(36);
    ctx.fillText('家庭辟谣卡片', 72, 110);

    ctx.setFillStyle('#1677FF');
    ctx.setFontSize(26);
    ctx.fillText(`结论：${labelText}  ·  ${result.score}/100`, 72, 164);

    ctx.setFillStyle('#2A3340');
    ctx.setFontSize(28);
    const claim = `主张：${truncateText(topClaim, 52)}`;
    ctx.fillText(claim, 72, 220);

    ctx.setFillStyle('#4A5565');
    ctx.setFontSize(24);
    const reason1 = `1. ${result.reasons?.[0] || '证据链分析结果'}`;
    const reason2 = `2. ${result.reasons?.[1] || '建议核对官方来源'}`;
    ctx.fillText(truncateText(reason1, 34), 72, 286);
    ctx.fillText(truncateText(reason2, 34), 72, 334);

    ctx.setFillStyle('#8A95A6');
    ctx.setFontSize(22);
    ctx.fillText('提示：本结果仅供参考，请以官方最新发布为准。', 72, 760);

    ctx.setFillStyle('#8A95A6');
    ctx.setFontSize(20);
    ctx.fillText(`生成时间：${new Date().toLocaleString()}`, 72, 806);

    ctx.draw(false, () => {
      wx.canvasToTempFilePath(
        {
          canvasId: 'shareCanvas',
          width: 640,
          height: 900,
          destWidth: 1280,
          destHeight: 1800,
          success: (res) => {
            wx.previewImage({
              urls: [res.tempFilePath],
              current: res.tempFilePath
            });
          },
          fail: () => {
            wx.showToast({
              title: '生成失败，请重试',
              icon: 'none'
            });
          }
        },
        this
      );
    });
  },

  drawRoundRect(ctx, x, y, width, height, radius) {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.arcTo(x + width, y, x + width, y + height, radius);
    ctx.arcTo(x + width, y + height, x, y + height, radius);
    ctx.arcTo(x, y + height, x, y, radius);
    ctx.arcTo(x, y, x + width, y, radius);
    ctx.closePath();
  },

  onReanalyze() {
    wx.navigateBack({
      delta: 1,
      fail: () => {
        wx.reLaunch({
          url: '/pages/index/index'
        });
      }
    });
  }
});
