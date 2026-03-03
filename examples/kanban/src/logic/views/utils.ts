// ID & Ordering
export function generateOrder() {
  return Date.now() / 1000 + Math.random();
}

export function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export function calculateMaxOrder(lanes: any[]) {
  const max = Math.max(...lanes.map(l => l.order || 0));
  return (max || 0) + 1;
}

export function calculateNewOrder(tasks: any[]) {
  const max = Math.max(...tasks.map(t => t.order || 0));
  return (max || 0) + 1;
}

export function calculateNewOrders(lanes: any[], draggedId: string, dropPosition: number) {
  const reordered = lanes.map((lane, i) => ({
    ...lane,
    order: i + 1
  }));
  return reordered;
}

// Lane & Task Helpers
export function findDoneLane(lanes: any[]) {
  return lanes.find(l => l.name.toLowerCase() === 'done')?.id || (lanes[lane.length - 1]?.id);
}

export function filteredTasks(ctx: any, laneId: string) {
  return (ctx.tasks || []).filter(t => {
    if (t.laneId !== laneId) return false;
    if (ctx.filter?.assignee && t.assignee !== ctx.filter.assignee) return false;
    if (ctx.filter?.priority && t.priority !== ctx.filter?.priority) return false;
    if (ctx.filter?.hideArchived && t.deletedAt) return false;
    return true;
  });
}

// Formatting
export function formatDate(date: any) {
  if (!date) return '';
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
}

export function addDays(date: any, days: number) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d.getTime();
}

export function extractMentions(text: string) {
  const mentions = text.match(/@[\w]+/g) || [];
  return mentions.map(m => m.slice(1));  // Remove @ prefix
}

// Arithmetic
export function increment(value: number) {
  return (value || 0) + 1;
}

export function decrement(value: number) {
  return Math.max(0, (value || 0) - 1);
}

// Project Context Management
export function resetProjects(ctx: any) {
  ctx.projects = [];
}

export function setProjects(ctx: any, evt: any) {
  ctx.projects = evt.data;
  ctx.isLoading = false;
}

export function addProject(ctx: any, evt: any) {
  ctx.projects.push(evt.data);
}

export function removeProject(ctx: any) {
  ctx.projects = ctx.projects.filter(p => p.id !== ctx.deleteProjectId);
}

export function updateProjectLocal(ctx: any, evt: any) {
  const idx = ctx.projects.findIndex(p => p.id === ctx.projectId);
  if (idx >= 0) {
    ctx.projects[idx] = { ...ctx.projects[idx], ...evt.data };
  }
}

export function setProject(ctx: any, evt: any) {
  ctx.project = evt.data;
}

// Board Context Management
export function setBoards(ctx: any, evt: any) {
  ctx.boards = evt.data;
  if (!ctx.selectedBoardId && ctx.boards.length > 0) {
    ctx.selectedBoardId = ctx.boards[0].id;
  }
}

export function addBoard(ctx: any, evt: any) {
  ctx.boards.push(evt.data);
  ctx.newBoardId = evt.data.id;
}

export function removeBoard(ctx: any) {
  ctx.boards = ctx.boards.filter(b => b.id !== ctx.selectedBoardId);
}

export function updateBoard(ctx: any, evt: any) {
  const idx = ctx.boards.findIndex(b => b.id === ctx.selectedBoardId);
  if (idx >= 0) {
    ctx.boards[idx] = { ...ctx.boards[idx], ...evt.data };
  }
}

export function selectFirstBoard(ctx: any) {
  if (ctx.boards.length > 0) {
    ctx.selectedBoardId = ctx.boards[0].id;
  }
}

export function deleteBoard(ctx: any) {
  ctx.newBoardId = null;
}

export function selectBoard(ctx: any, evt: any) {
  ctx.selectedBoardId = evt.boardId;
}

export function navigateToBoard(ctx: any, evt: any) {
  ctx.selectedBoardId = evt.boardId;
}

// Lane Context Management
export function setLanes(ctx: any, evt: any) {
  ctx.lanes = evt.data;
}

export function addLane(ctx: any, evt: any) {
  ctx.lanes.push(evt.data);
}

export function removeLane(ctx: any) {
  ctx.lanes = ctx.lanes.filter(l => l.id !== ctx.selectedLaneId);
}

export function updateLane(ctx: any, evt: any) {
  const idx = ctx.lanes.findIndex(l => l.id === ctx.selectedLaneId);
  if (idx >= 0) {
    ctx.lanes[idx] = { ...ctx.lanes[idx], ...evt.data };
  }
}

export function updateLaneStats(ctx: any, evt: any) {
  const lane = ctx.lanes.find(l => l.id === ctx.laneId);
  if (lane) {
    lane.taskCount = evt.data.length;
  }
}

export function selectLane(ctx: any, evt: any) {
  ctx.selectedLaneId = evt.laneId;
}

export function toggleLaneCollapse(ctx: any, evt: any) {
  const lane = ctx.lanes.find(l => l.id === evt.laneId);
  if (lane) {
    lane.isCollapsed = !lane.isCollapsed;
  }
}

// Task Context Management
export function setTasks(ctx: any, evt: any) {
  ctx.tasks = evt.data;
}

export function addTask(ctx: any, evt: any) {
  ctx.tasks.push(evt.data);
}

export function removeTask(ctx: any) {
  ctx.tasks = ctx.tasks.filter(t => t.id !== ctx.selectedTaskId);
}

export function updateTask(ctx: any, evt: any) {
  const idx = ctx.tasks.findIndex(t => t.id === ctx.selectedTaskId);
  if (idx >= 0) {
    ctx.tasks[idx] = { ...ctx.tasks[idx], ...evt.data };
  }
}

export function reloadTasks(ctx: any) {
  ctx.refresh = Date.now();
}

export function setTask(ctx: any, evt: any) {
  ctx.task = evt.data;
}

export function updateTaskLocal(ctx: any, evt: any) {
  if (ctx.tasks) {
    const idx = ctx.tasks.findIndex(t => t.id === ctx.task.id);
    if (idx >= 0) {
      ctx.tasks[idx] = ctx.task;
    }
  }
}

export function selectTask(ctx: any, evt: any) {
  ctx.selectedTaskId = evt.taskId;
}

export function clearSelected(ctx: any) {
  ctx.selectedTaskId = null;
  ctx.selectedBoardId = null;
  ctx.selectedLaneId = null;
}

export function updateTaskPriority(ctx: any, evt: any) {
  ctx.task.priority = evt.priority;
}

export function updateTaskAssignee(ctx: any, evt: any) {
  ctx.task.assignee = evt.assignee;
}

// Comment Context Management
export function setComments(ctx: any, evt: any) {
  ctx.comments = evt.data;
}

export function addComment(ctx: any, evt: any) {
  ctx.comments.push(evt.data);
  ctx.task.comments = (ctx.task.comments || 0) + 1;
}

export function removeComment(ctx: any) {
  ctx.comments = ctx.comments.filter(c => c.id !== ctx.commentId);
  ctx.task.comments = Math.max(0, (ctx.task.comments || 0) - 1);
}

export function updateComment(ctx: any, evt: any) {
  const idx = ctx.comments.findIndex(c => c.id === ctx.commentId);
  if (idx >= 0) {
    ctx.comments[idx] = { ...ctx.comments[idx], ...evt.data };
  }
}

// Filter & Search
export function applySearch(ctx: any, evt: any) {
  ctx.searchQuery = evt.query;
}

export function updateSearch(ctx: any, evt: any) {
  ctx.filter.search = evt.query;
}

export function applySort(ctx: any, evt: any) {
  ctx.sortBy = evt.field;
  ctx.sortDir = evt.dir || (ctx.sortDir === 'asc' ? 'desc' : 'asc');
}

export function applyFilter(ctx: any, evt: any) {
  ctx.filter = { ...ctx.filter, ...evt.filter };
}

// Drag & Drop
export function startDrag(ctx: any, evt: any) {
  ctx.draggedTaskId = evt.taskId;
}

export function startLaneDrag(ctx: any, evt: any) {
  ctx.draggedLaneId = evt.laneId;
}

export function updateDropTarget(ctx: any, evt: any) {
  ctx.dropLaneId = evt.laneId;
}

export function updateDropPosition(ctx: any, evt: any) {
  ctx.dropPosition = evt.position;
}

export function clearDrag(ctx: any) {
  ctx.draggedTaskId = null;
  ctx.dropLaneId = null;
  ctx.draggedLaneId = null;
  ctx.dropPosition = null;
}

// Form Management
export function clearForm(ctx: any) {
  ctx.form = {};
}

export function clearDelete(ctx: any) {
  ctx.deleteProjectId = null;
  ctx.deleteBoardId = null;
  ctx.selectedLaneId = null;
}

export function closeDetail(ctx: any) {
  ctx.selectedTaskId = null;
}

// State Loading
export function loadProjects(ctx: any) {
  ctx.isLoading = true;
}

export function loadBoard(ctx: any) {
  ctx.isLoading = true;
}

export function loadLanes(ctx: any) {
  // Triggered after board load
}

export function loadTasks(ctx: any) {
  // Triggered after lanes load
}

export function loadTaskDetail(ctx: any) {
  // Load full task data with comments
}

export function reloadTaskDetail(ctx: any) {
  // Refresh task detail from store
}

// Error Handling
import { i18n } from '../../../src/i18n';
export function setError(ctx: any, evt: any) {
  ctx.error = evt.error?.message || i18n('errors.failed');
}

// Hover & Interactive States
export function setHovering(ctx: any, value: boolean) {
  ctx.isHovering = value;
}

// Board Setup
export function createDefaultLanes(ctx: any, evt: any) {
  // Triggered after board creation
}

// Board Cloning
export function clonedLanes(ctx: any) {
  return ctx.board.lanes?.map((lane: any) => ({
    ...lane,
    id: generateUUID(),
    boardId: undefined
  })) || [];
}

export function clonedTasks(ctx: any) {
  const laneMap = new Map();
  return ctx.board.tasks?.map((task: any) => ({
    ...task,
    id: generateUUID(),
    boardId: undefined,
    laneId: laneMap.get(task.laneId)
  })) || [];
}

// Statistics
export function calculateStats(ctx: any, evt: any) {
  const tasks = evt.data;
  ctx.taskStats = {
    total: tasks.length,
    completed: tasks.filter(t => t.state === 'completed').length,
    pending: tasks.filter(t => t.state !== 'completed').length,
    byPriority: {
      low: tasks.filter(t => t.priority === 'low').length,
      normal: tasks.filter(t => t.priority === 'normal').length,
      high: tasks.filter(t => t.priority === 'high').length,
      urgent: tasks.filter(t => t.priority === 'urgent').length
    }
  };
}

// Navigation
export function navigateHome(ctx: any) {
  // Navigation handled by router
}

export function selectNewBoard(ctx: any, evt: any) {
  ctx.selectedBoardId = evt.boardId;
}
