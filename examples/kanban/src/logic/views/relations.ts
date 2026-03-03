export async function validateProjectOwnership(projectId: string, userId: string, store: any) {
  const project = await store.findOne('projects', projectId);
  if (!project) throw new Error('Project not found');
  if (project.owner !== userId) throw new Error('Access denied');
  return true;
}

export async function validateBoardOwnership(boardId: string, userId: string, store: any) {
  const board = await store.findOne('boards', boardId);
  if (!board) throw new Error('Board not found');
  const project = await store.findOne('projects', board.projectId);
  if (project.owner !== userId) throw new Error('Access denied');
  return true;
}

export async function getProjectBoards(projectId: string, store: any) {
  return store.find('boards', { projectId, deletedAt: null });
}

export async function getProjectTasks(projectId: string, store: any) {
  const boards = await getProjectBoards(projectId, store);
  const boardIds = boards.map(b => b.id);
  return store.find('tasks', {
    boardId: { $in: boardIds },
    deletedAt: null
  });
}

export async function getLaneTasks(laneId: string, store: any) {
  return store.find('tasks', { laneId, deletedAt: null });
}

export async function getTaskComments(taskId: string, store: any) {
  return store.find('comments', { taskId, deletedAt: null });
}