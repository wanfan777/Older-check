const { createAnalyzeTask, previewOcr } = require('../../utils/api');
const { clearAnalyzeDraft, getAnalyzeDraft, getSettings, saveAnalyzeDraft } = require('../../utils/storage');

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

function formatFileSize(size = 0) {
  if (!size) {
    return '';
  }
  if (size < 1024 * 1024) {
    return `${Math.max(1, Math.round(size / 1024))}KB`;
  }
  return `${(size / (1024 * 1024)).toFixed(1)}MB`;
}

function splitClaimsByRule(text = '') {
  return String(text || '')
    .split(/[。！？!\n]/)
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 3)
    .map((item, index) => ({
      id: `draft_${Date.now()}_${index}`,
      claim: item
    }));
}

function normalizeClaims(rawClaims = [], fallbackText = '') {
  const fromApi = Array.isArray(rawClaims)
    ? rawClaims
        .map((item, index) => ({
          id: item.id || `c${index + 1}`,
          claim: String(item.claim || '').trim(),
          topic: item.topic || '通用'
        }))
        .filter((item) => Boolean(item.claim))
    : [];

  if (fromApi.length > 0) {
    return fromApi.slice(0, 3);
  }

  return splitClaimsByRule(fallbackText);
}

Page({
  data: {
    draftReady: false,
    elderMode: false,
    text: '',
    imagePath: '',
    imageMime: 'image/jpeg',
    imageMeta: '',
    ocrText: '',
    claims: [],
    activeClaimIndex: 0,
    ocrLoading: false,
    ocrError: '',
    recognitionNote: '',
    submitting: false
  },

  onLoad() {
    const settings = getSettings();
    this.setData({
      elderMode: settings.elderMode
    });
  },

  onShow() {
    if (this.hasInitialized) {
      return;
    }

    const draft = getAnalyzeDraft();
    if (!draft) {
      wx.showToast({
        title: '未找到待确认内容',
        icon: 'none'
      });
      wx.navigateBack({
        delta: 1,
        fail: () => {
          wx.reLaunch({
            url: '/pages/index/index'
          });
        }
      });
      return;
    }

    this.hasInitialized = true;
    this.setData({
      draftReady: true,
      text: String(draft.text || ''),
      imagePath: String(draft.imagePath || ''),
      imageMime: String(draft.imageMime || 'image/jpeg'),
      ocrText: String(draft.ocrText || draft.text || ''),
      claims: normalizeClaims(draft.claims, draft.ocrText || draft.text || ''),
      activeClaimIndex: Number.isInteger(draft.activeClaimIndex) ? draft.activeClaimIndex : 0,
      imageMeta: ''
    });

    this.runOcrPreview();
  },

  onHide() {
    if (!this.skipPersist) {
      this.persistDraft();
    }
  },

  onUnload() {
    if (!this.skipPersist) {
      this.persistDraft();
    }
  },

  persistDraft() {
    const { text, imagePath, imageMime, ocrText, claims, activeClaimIndex } = this.data;
    saveAnalyzeDraft({
      text,
      imagePath,
      imageMime,
      ocrText,
      claims,
      activeClaimIndex
    });
  },

  onInputOcrText(event) {
    this.setData({
      ocrText: event.detail.value
    });
  },

  onSwitchClaim(event) {
    const index = Number(event.currentTarget.dataset.index || 0);
    this.setData({
      activeClaimIndex: index
    });
  },

  onInputClaim(event) {
    const index = Number(event.currentTarget.dataset.index || 0);
    const value = event.detail.value || '';
    const claims = [...this.data.claims];

    if (!claims[index]) {
      return;
    }

    claims[index] = {
      ...claims[index],
      claim: value
    };

    this.setData({
      claims
    });
  },

  onAddClaim() {
    const claims = [...this.data.claims];
    if (claims.length >= 3) {
      wx.showToast({
        title: '最多保留 3 条主张',
        icon: 'none'
      });
      return;
    }

    claims.push({
      id: `manual_${Date.now()}`,
      claim: ''
    });

    this.setData({
      claims,
      activeClaimIndex: claims.length - 1
    });
  },

  onDeleteClaim() {
    const { claims, activeClaimIndex } = this.data;
    if (claims.length <= 1) {
      wx.showToast({
        title: '至少保留 1 条主张',
        icon: 'none'
      });
      return;
    }

    const next = claims.filter((_item, index) => index !== activeClaimIndex);
    const nextIndex = Math.max(0, activeClaimIndex - 1);

    this.setData({
      claims: next,
      activeClaimIndex: nextIndex
    });
  },

  onChooseAgain() {
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
        const baseMeta = [sizeText, width && height ? `${width}x${height}` : ''].filter(Boolean).join(' · ');
        const applyImage = (path, extraMeta = '') => {
          this.setData({
            imagePath: path,
            imageMime: inferImageMime(path),
            imageMeta: [baseMeta, extraMeta].filter(Boolean).join(' · ')
          });
          this.runOcrPreview();
        };

        if (file.size > 3 * 1024 * 1024) {
          wx.compressImage({
            src: file.tempFilePath,
            quality: 72,
            success: (compressed) => {
              applyImage(compressed.tempFilePath, '已压缩');
              wx.showToast({
                title: '图片较大，已自动压缩',
                icon: 'none'
              });
            },
            fail: () => {
              applyImage(file.tempFilePath);
              wx.showToast({
                title: '图片较大，建议裁剪后重试',
                icon: 'none'
              });
            }
          });
          return;
        }

        applyImage(file.tempFilePath);
      },
      fail: () => {
        wx.showToast({
          title: '选择图片失败',
          icon: 'none'
        });
      }
    });
  },

  onRetryOcr() {
    const { ocrText, text } = this.data;
    if (ocrText && ocrText !== text) {
      wx.showModal({
        title: '确认重新识别',
        content: '重新识别会覆盖当前编辑文本，是否继续？',
        success: (res) => {
          if (res.confirm) {
            this.runOcrPreview();
          }
        }
      });
      return;
    }

    this.runOcrPreview();
  },

  async runOcrPreview() {
    const { imagePath, imageMime, text } = this.data;
    if (!imagePath && !text.trim()) {
      return;
    }

    this.setData({
      ocrLoading: true,
      ocrError: '',
      recognitionNote: ''
    });

    try {
      let imageBase64 = '';
      if (imagePath) {
        imageBase64 = await readFileAsBase64(imagePath);
      }

      const preview = await previewOcr({
        text: text.trim(),
        image_base64: imageBase64,
        image_mime: imageMime
      });

      const claims = normalizeClaims(preview.claims, preview.clean_text || text);
      this.setData({
        ocrText: String(preview.clean_text || text || ''),
        claims,
        activeClaimIndex: Math.min(this.data.activeClaimIndex, Math.max(0, claims.length - 1)),
        recognitionNote: String(preview.recognition_note || ''),
        ocrError: ''
      });
    } catch (_error) {
      this.setData({
        ocrError: '识别失败，请重试或直接手动编辑文本。'
      });
    } finally {
      this.setData({
        ocrLoading: false
      });
    }
  },

  async onContinueAnalyze() {
    const { text, imagePath, imageMime, ocrText, claims, activeClaimIndex, submitting } = this.data;
    if (submitting) {
      return;
    }

    const cleanTextOverride = String(ocrText || '').trim();
    const claimOverrides = claims.map((item) => String(item.claim || '').trim()).filter(Boolean).slice(0, 3);

    if (!cleanTextOverride && !text.trim() && !imagePath) {
      wx.showToast({
        title: '请输入可分析内容',
        icon: 'none'
      });
      return;
    }

    this.setData({ submitting: true });

    try {
      let imageBase64 = '';
      if (imagePath) {
        imageBase64 = await readFileAsBase64(imagePath);
      }

      const task = await createAnalyzeTask({
        text: text.trim(),
        image_base64: imageBase64,
        image_mime: imageMime,
        clean_text_override: cleanTextOverride,
        claim_overrides: claimOverrides,
        primary_claim_index: Math.min(activeClaimIndex, Math.max(0, claimOverrides.length - 1))
      });

      this.skipPersist = true;
      clearAnalyzeDraft();

      wx.navigateTo({
        url: `/pages/result/result?taskId=${task.task_id}`
      });
    } catch (_error) {
      wx.showToast({
        title: '提交失败，请稍后重试',
        icon: 'none'
      });
    } finally {
      this.setData({ submitting: false });
    }
  },

  onBackEdit() {
    this.persistDraft();
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
