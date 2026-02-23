import { createId } from '../utils/id.js';

class TaskStore {
  constructor() {
    this.tasks = new Map();
    this.feedback = [];
  }

  createTask({ inputType, userId }) {
    const now = new Date().toISOString();
    const task = {
      id: createId('task'),
      status: 'pending',
      input_type: inputType,
      user_id: userId,
      created_at: now,
      updated_at: now,
      result: null,
      error: null
    };

    this.tasks.set(task.id, task);
    return task;
  }

  markProcessing(taskId) {
    const task = this.tasks.get(taskId);
    if (!task) {
      return null;
    }

    task.status = 'processing';
    task.updated_at = new Date().toISOString();
    return task;
  }

  finishTask(taskId, result) {
    const task = this.tasks.get(taskId);
    if (!task) {
      return null;
    }

    task.status = 'done';
    task.result = result;
    task.updated_at = new Date().toISOString();
    return task;
  }

  failTask(taskId, errorMessage) {
    const task = this.tasks.get(taskId);
    if (!task) {
      return null;
    }

    task.status = 'failed';
    task.error = errorMessage;
    task.updated_at = new Date().toISOString();
    return task;
  }

  getTask(taskId) {
    return this.tasks.get(taskId) || null;
  }

  addFeedback(payload) {
    const record = {
      id: createId('fb'),
      created_at: new Date().toISOString(),
      ...payload
    };

    this.feedback.push(record);
    return record;
  }

  getFeedback() {
    return this.feedback;
  }
}

export const taskStore = new TaskStore();
