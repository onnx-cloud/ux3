import { i18n } from '@ux3/i18n';

export function validateProject(data: any) {
  if (!data.name?.trim()) {
    throw new Error(i18n('validation.projectNameRequired'));
  }
  if (data.name.length > 100) {
    throw new Error(i18n('validation.projectNameMax', { max: 100 }));
  }
  return { valid: true };
}

export function validateBoard(data: any) {
  if (!data.name?.trim()) {
    throw new Error(i18n('validation.boardNameRequired'));
  }
  if (!data.projectId) throw new Error(i18n('errors.failed'));
  if (data.name.length > 100) throw new Error(i18n('errors.maxLength', { max: 100 }));
  return { valid: true };
}

export function validateLane(data: any) {
  if (!data.name?.trim()) {
    throw new Error(i18n('validation.laneNameRequired'));
  }
  if (!data.boardId) throw new Error(i18n('errors.failed'));
  if (data.maxTasks && data.minTasks && data.maxTasks < data.minTasks) {
    throw new Error(i18n('validation.wipExceeded', { max: data.maxTasks }));
  }
  if (data.name.length > 100) throw new Error(i18n('errors.maxLength', { max: 100 }));
  return { valid: true };
}

export function validateTask(data: any) {
  if (!data.title?.trim()) {
    throw new Error(i18n('validation.taskTitleRequired'));
  }
  if (data.title.length > 200) {
    throw new Error(i18n('validation.taskTitleMax', { max: 200 }));
  }
  if (data.description && data.description.length > 2000) {
    throw new Error(i18n('validation.descriptionMax', { max: 2000 }));
  }
  if (data.priority && !['low', 'normal', 'high', 'urgent'].includes(data.priority)) {
    throw new Error(i18n('validation.invalidPriority'));
  }
  if (data.points && (data.points < 0 || data.points > 100)) {
    throw new Error(i18n('validation.pointsRange', { min: 0, max: 100 }));
  }
  return { valid: true };
}

export function validateComment(data: any) {
  if (!data.text?.trim()) throw new Error(i18n('errors.required'));
  if (data.text.length > 5000) throw new Error(i18n('errors.maxLength', { max: 5000 }));
  return { valid: true };
}