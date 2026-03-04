// barrel file used by generated views

// ===== State Update Actions =====
// These functions update the FSM context in response to events

export const setBoards = (ctx: any, event: any) => {
  ctx.boards = event.data?.boards ?? [];
};

export const setProject = (ctx: any, event: any) => {
  ctx.project = event.data?.project ?? null;
};

export const setProjects = (ctx: any, event: any) => {
  ctx.projects = event.data?.projects ?? [];
};

export const setLanes = (ctx: any, event: any) => {
  ctx.lanes = event.data?.lanes ?? [];
};

export const setTask = (ctx: any, event: any) => {
  ctx.task = event.data?.task ?? null;
};

export const setComments = (ctx: any, event: any) => {
  ctx.comments = event.data?.comments ?? [];
};

export const setError = (ctx: any, event: any) => {
  ctx.error = event.data?.error ?? event.message ?? 'An error occurred';
};

export const clearForm = (ctx: any) => {
  ctx.form = {};
};

export const clearDelete = (ctx: any) => {
  ctx.deleteConfirm = null;
};

export const clearDrag = (ctx: any) => {
  ctx.dragging = null;
};

export const clearSelected = (ctx: any) => {
  ctx.selectedTaskId = null;
};

// ===== Load Actions =====
// These are invoked at entry to load data

export const loadBoard = (ctx: any, event: any) => {
  // Load board data - typically via service invoke
};

export const loadBoards = (ctx: any, event: any) => {
  // Load boards data - typically via service invoke
};

export const loadLanes = (ctx: any, event: any) => {
  // Load lanes data - typically via service invoke
};

export const loadTasks = (ctx: any, event: any) => {
  // Load tasks data - typically via service invoke
};

export const loadTaskDetail = (ctx: any, event: any) => {
  // Load task detail - typically via service invoke
};

export const loadProjects = (ctx: any, event: any) => {
  // Load projects data - typically via service invoke
};

// ===== Reload/Refresh Actions =====

export const reloadTaskDetail = (ctx: any, event: any) => {
  // Reload task detail from service
};

export const reloadTasks = (ctx: any, event: any) => {
  // Reload tasks from service
};

// ===== Toggle/UI State Actions =====

export const toggleLaneCollapse = (ctx: any, event: any) => {
  const laneId = event.data?.laneId;
  if (!laneId) return;
  
  ctx.collapsedLanes = ctx.collapsedLanes ?? [];
  const index = ctx.collapsedLanes.indexOf(laneId);
  if (index > -1) {
    ctx.collapsedLanes.splice(index, 1);
  } else {
    ctx.collapsedLanes.push(laneId);
  }
};

// ===== Create/Update Actions =====

export const addProject = (ctx: any, event: any) => {
  ctx.projects = ctx.projects ?? [];
  const newProject = event.data?.project ?? { id: Date.now(), name: 'Untitled' };
  ctx.projects.push(newProject);
};

export const updateProjectLocal = (ctx: any, event: any) => {
  if (!ctx.project) return;
  const updates = event.data?.updates ?? {};
  Object.assign(ctx.project, updates);
};

// ===== Delete/Remove Actions =====

export const removeProject = (ctx: any, event: any) => {
  const projectId = event.data?.projectId ?? ctx.project?.id;
  if (!projectId) return;
  ctx.projects = (ctx.projects ?? []).filter((p: any) => p.id !== projectId);
};

export const removeLabel = (ctx: any, event: any) => {
  const labelId = event.data?.labelId;
  if (!labelId || !ctx.task) return;
  ctx.task.labels = (ctx.task.labels ?? []).filter((l: any) => l.id !== labelId);
};

// ===== Close/Exit Actions =====

export const closeDetail = (ctx: any, event: any) => {
  ctx.task = null;
  ctx.comments = [];
};

// Re-export utilities, validators, constraints, and relations
export * from '../../src/logic/views/utils';
export * from '../../src/logic/views/validators';
export * from '../../src/logic/views/constraints';
export * from '../../src/logic/views/relations';
