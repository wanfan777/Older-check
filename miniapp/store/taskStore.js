const TASK_STATUS = {
  IDLE: 'idle',
  UPLOADING: 'uploading',
  OCRING: 'ocring',
  CONFIRMING: 'confirming',
  ANALYZING: 'analyzing',
  DONE: 'done',
  ERROR: 'error'
};

function createTaskState(overrides = {}) {
  return {
    status: TASK_STATUS.IDLE,
    taskId: '',
    error: '',
    ...overrides
  };
}

module.exports = {
  TASK_STATUS,
  createTaskState
};
