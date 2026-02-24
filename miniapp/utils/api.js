const DEFAULT_API_BASE_URL = 'http://127.0.0.1:3300';

function getBaseUrl() {
  const saved = wx.getStorageSync('api_base_url');
  return saved || DEFAULT_API_BASE_URL;
}

function request({ url, method = 'GET', data = {} }) {
  return new Promise((resolve, reject) => {
    wx.request({
      url: `${getBaseUrl()}${url}`,
      method,
      data,
      timeout: 15000,
      success: (res) => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(res.data);
          return;
        }

        reject(new Error(res.data?.message || `请求失败(${res.statusCode})`));
      },
      fail: (error) => {
        reject(error);
      }
    });
  });
}

function createAnalyzeTask(payload) {
  return request({
    url: '/v1/analyze',
    method: 'POST',
    data: payload
  });
}

function previewOcr(payload) {
  return request({
    url: '/v1/ocr-preview',
    method: 'POST',
    data: payload
  });
}

function getAnalyzeTask(taskId) {
  return request({
    url: `/v1/analyze/${taskId}`
  });
}

function submitFeedback(payload) {
  return request({
    url: '/v1/feedback',
    method: 'POST',
    data: payload
  });
}

module.exports = {
  createAnalyzeTask,
  previewOcr,
  getAnalyzeTask,
  submitFeedback
};
