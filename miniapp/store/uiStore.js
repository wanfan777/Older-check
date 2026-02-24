const state = {
  shouldRefreshHistory: false
};

function getUiState() {
  return {
    ...state
  };
}

function patchUiState(partial = {}) {
  Object.assign(state, partial);
  return getUiState();
}

module.exports = {
  getUiState,
  patchUiState
};
