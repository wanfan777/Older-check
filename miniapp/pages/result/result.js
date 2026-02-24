const { getAnalyzeTask, submitFeedback } = require('../../utils/api');
const { appendHistoryRecord, getSettings } = require('../../utils/storage');

const LABEL_TEXT = {
  trusted: '可信',
  untrusted: '不可信',
  insufficient: '证据不足'
};

const LABEL_COLOR = {
  trusted: '#52C41A',
  untrusted: '#F5222D',
  insufficient: '#FAAD14'
};

const STANCE_TEXT = {
  support: '支持',
  refute: '反驳',
  unrelated: '不相关'
};

const FEEDBACK_OPTIONS = [
  { label: '结论不对', value: 'wrong_label' },
  { label: '证据不全', value: 'missing_evidence' },
  { label: 'OCR 错误', value: 'ocr_error' },
  { label: '其他', value: 'other' }
];

function truncateText(text, maxLength) {
  if (!text) {
    return '';
  }
  if (text.length <= maxLength) {
    return text;
  }
  return `${text.slice(0, maxLength)}...`;
}

function getConclusionLine(label) {
  if (label === 'trusted') {
    return '当前检索到的权威信息与该说法基本一致，但仍建议以最新官方发布为准。';
  }
  if (label === 'untrusted') {
    return '当前检索到的权威信息与该说法存在明显冲突，请勿直接转发。';
  }
  return '目前缺少足够权威证据，暂时无法判断真伪。';
}

function normalizeReasons(reasons = []) {
  return reasons.slice(0, 3).map((reason, index) => ({
    id: `r${index + 1}`,
    text: reason,
    shortText: truncateText(reason, 30),
    expanded: false
  }));
}

function normalizeEvidences(evidences = []) {
  return evidences.map((item, index) => ({
    ...item,
    uiId: `${item.id || 'e'}_${index}`,
    stanceText: STANCE_TEXT[item.stance] || '未知'
  }));
}

Page({
  data: {
    taskId: '',
    loading: true,
    showSkeleton: false,
    loadingHint: '正在分析，预计 5~8 秒',
    error: '',
    result: null,
    labelText: '',
    conclusionLine: '',
    topClaim: '',
    progressPercent: 0,
    progressColor: '#1677FF',
    elderMode: false,
    showOcrRaw: false,
    reasons: [],
    reasonsVisible: [],
    visibleReasonCount: 3,
    evidencesAll: [],
    evidencesVisible: [],
    evidenceExpanded: false,
    feedbackVisible: false,
    feedbackOptions: FEEDBACK_OPTIONS,
    feedbackType: 'wrong_label',
    feedbackComment: '',
    feedbackSubmitting: false
  },

  onLoad(query) {
    const settings = getSettings();
    this.setData({
      taskId: query.taskId || '',
      elderMode: settings.elderMode,
      visibleReasonCount: settings.elderMode ? 2 : 3
    });

    if (!query.taskId) {
      this.setData({
        loading: false,
        error: '缺少任务 ID'
      });
      return;
    }

    this.skeletonTimer = setTimeout(() => {
      if (this.data.loading) {
        this.setData({ showSkeleton: true });
      }
    }, 150);

    this.startPolling();
  },

  onUnload() {
    this.stopPolling();
    if (this.skeletonTimer) {
      clearTimeout(this.skeletonTimer);
      this.skeletonTimer = null;
    }
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

  setResultData(payloadResult) {
    const result = {
      ...payloadResult,
      evidences: normalizeEvidences(payloadResult?.evidences || [])
    };

    const reasons = normalizeReasons(result.reasons || []);
    const visibleReasonCount = this.data.elderMode ? 2 : 3;
    const reasonsVisible = reasons.slice(0, visibleReasonCount);
    const evidencesVisible = result.evidences.slice(0, 3);
    const labelText = LABEL_TEXT[result.label] || '证据不足';
    const topClaim = result.claims?.[0]?.claim || truncateText(result.clean_text || '未提取到主张', 60);

    this.setData({
      loading: false,
      showSkeleton: false,
      result,
      reasons,
      reasonsVisible,
      evidencesAll: result.evidences,
      evidencesVisible,
      evidenceExpanded: false,
      labelText,
      topClaim,
      conclusionLine: getConclusionLine(result.label),
      visibleReasonCount,
      progressPercent: Math.max(0, Math.min(100, Number(result.score || 0))),
      progressColor: LABEL_COLOR[result.label] || '#1677FF',
      error: ''
    });
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
          showSkeleton: false,
          error: payload.error || '分析失败'
        });
        return;
      }

      if (payload.status === 'done') {
        this.stopPolling();
        this.setResultData(payload.result || {});
        appendHistoryRecord({
          taskId,
          result: payload.result || {}
        });
      }
    } catch (_error) {
      this.stopPolling();
      this.setData({
        loading: false,
        showSkeleton: false,
        error: '拉取任务失败，请检查网络或服务地址'
      });
    }
  },

  onRetry() {
    this.setData({
      loading: true,
      showSkeleton: false,
      error: ''
    });

    if (this.skeletonTimer) {
      clearTimeout(this.skeletonTimer);
    }

    this.skeletonTimer = setTimeout(() => {
      if (this.data.loading) {
        this.setData({ showSkeleton: true });
      }
    }, 150);

    this.startPolling();
  },

  onToggleOcrRaw() {
    this.setData({
      showOcrRaw: !this.data.showOcrRaw
    });
  },

  onToggleReason(event) {
    const id = event.currentTarget.dataset.id;
    const reasons = this.data.reasons.map((item) => {
      if (item.id !== id) {
        return item;
      }
      return {
        ...item,
        expanded: !item.expanded
      };
    });

    this.setData({ reasons });
    this.setData({
      reasonsVisible: reasons.slice(0, this.data.visibleReasonCount)
    });
  },

  onShowAllReasons() {
    this.setData({
      visibleReasonCount: 3,
      reasonsVisible: this.data.reasons.slice(0, 3)
    });
  },

  onToggleEvidence() {
    const { evidenceExpanded, evidencesAll } = this.data;
    this.setData({
      evidenceExpanded: !evidenceExpanded,
      evidencesVisible: evidenceExpanded ? evidencesAll.slice(0, 3) : evidencesAll
    });
  },

  onGoEvidence() {
    wx.pageScrollTo({
      selector: '#evidenceSection',
      duration: 200
    });
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

  onOpenFeedback() {
    this.setData({
      feedbackVisible: true,
      feedbackType: 'wrong_label',
      feedbackComment: ''
    });
  },

  onCloseFeedback() {
    this.setData({
      feedbackVisible: false
    });
  },

  onFeedbackTypeChange(event) {
    this.setData({
      feedbackType: event.detail.value
    });
  },

  onFeedbackCommentInput(event) {
    this.setData({
      feedbackComment: event.detail.value || ''
    });
  },

  async onSubmitFeedback() {
    const { taskId, feedbackType, feedbackComment, feedbackSubmitting } = this.data;
    if (feedbackSubmitting) {
      return;
    }

    this.setData({ feedbackSubmitting: true });

    try {
      await submitFeedback({
        result_id: taskId,
        type: feedbackType,
        comment: String(feedbackComment || '').trim()
      });

      this.setData({
        feedbackVisible: false,
        feedbackSubmitting: false,
        feedbackComment: ''
      });

      wx.showToast({
        title: '感谢反馈，我们会持续优化',
        icon: 'none'
      });
    } catch (_error) {
      this.setData({ feedbackSubmitting: false });
      wx.showToast({
        title: '提交失败，请稍后重试',
        icon: 'none'
      });
    }
  },

  onRetryOcrFlow() {
    wx.navigateBack({
      delta: 1,
      fail: () => {
        wx.reLaunch({
          url: '/pages/confirm/confirm'
        });
      }
    });
  },

  onGeneratePoster() {
    const { result, topClaim, labelText } = this.data;
    if (!result) {
      return;
    }

    const ctx = wx.createCanvasContext('shareCanvas', this);

    ctx.setFillStyle('#F5F7FA');
    ctx.fillRect(0, 0, 640, 900);

    ctx.setFillStyle('#FFFFFF');
    this.drawRoundRect(ctx, 40, 40, 560, 820, 24);
    ctx.fill();

    ctx.setFillStyle('#1F2937');
    ctx.setFontSize(36);
    ctx.fillText('家庭辟谣卡片', 72, 110);

    ctx.setFillStyle('#1677FF');
    ctx.setFontSize(26);
    ctx.fillText(`结论：${labelText}  ·  ${result.score}/100`, 72, 164);

    ctx.setFillStyle('#2A3340');
    ctx.setFontSize(28);
    ctx.fillText(`主张：${truncateText(topClaim, 52)}`, 72, 220);

    ctx.setFillStyle('#4B5563');
    ctx.setFontSize(24);
    const reasons = (result.reasons || []).slice(0, 2);
    ctx.fillText(`1. ${truncateText(reasons[0] || '建议核对权威来源', 36)}`, 72, 286);
    ctx.fillText(`2. ${truncateText(reasons[1] || '结合时间与来源再判断', 36)}`, 72, 334);

    ctx.setFillStyle('#94A3B8');
    ctx.setFontSize(22);
    ctx.fillText('本结果仅供参考，请以官方最新发布为准。', 72, 760);

    ctx.setFillStyle('#94A3B8');
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
    wx.reLaunch({
      url: '/pages/index/index'
    });
  },

  noop() {},
});
