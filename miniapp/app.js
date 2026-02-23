const { getSettings } = require('./utils/storage');

App({
  globalData: {
    settings: getSettings()
  },
  onLaunch() {
    this.globalData.settings = getSettings();
  }
});
