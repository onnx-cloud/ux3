export function validateProject(data: any) {
  if (!data.name?.trim()) throw new Error('Project name is required');
  if (data.name.length > 100) throw new Error('Project name must be <= 100 chars');
  return { valid: true };
}

export function validateBoard(data: any) {
  if (!data.name?.trim()) throw new Error('Board name required');
  if (!data.projectId) throw new Error('Board must belong to a project');
  if (data.name.length > 100) throw new Error('Max 100 characters');
  return { valid: true };
}

export function validateLane(data: any) {
  if (!data.name?.trim()) throw new Error('Lane name required');
  if (!data.boardId) throw new Error('Lane must belong to a board');
  if (data.maxTasks && data.minTasks && data.maxTasks < data.minTasks) {
    throw new Error('Max must be >= Min');
  }
  if (data.name.length > 100) throw new Error('Max 100 characters');
  return { valid: true };
}

export function validateTask(data: any) {
  if (!data.title?.trim()) throw new Error('Task title is required');
  if (data.title.length > 200) throw new Error('Title must be <= 200 chars');
  if (data.description && data.description.length > 2000) {
    throw new Error('Description must be <= 2000 chars');
  }
  if (data.priority && !['low', 'normal', 'high', 'urgent'].includes(data.priority)) {
    throw new Error('Invalid priority');
  }
  if (data.points && (data.points < 0 || data.points > 100)) {
    throw new Error('Points must be 0-100');
  }
  return { valid: true };
}

export function validateComment(data: any) {
  if (!data.text?.trim()) throw new Error('Comment text required');
  if (data.text.length > 5000) throw new Error('Max 5000 characters');
  return { valid: true };
}