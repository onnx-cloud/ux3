import { i18n } from '../../../generated/i18n';

export function checkWIPLimit(lane: any, taskCount: number) {
  if (lane.maxTasks && taskCount > lane.maxTasks) {
    throw new Error(i18n('validation.wipExceeded', { max: lane.maxTasks }));
  }
}

export function checkDependencies(task: any, allTasks: any[]) {
  if (!task.dependencies?.length) return true;
  const depTasks = task.dependencies.map(id => allTasks.find(t => t.id === id));
  const notDone = depTasks.some(t => t?.state !== 'completed');
  if (notDone) throw new Error(i18n('validation.incompleteDependencies'));
}

export function checkCycles(task: any, dependencies: any[]) {
  const visited = new Set();
  function hasCycle(id: string): boolean {
    if (visited.has(id)) return true;
    visited.add(id);
    const deps = dependencies.filter(d => d.dependentId === id);
    return deps.some(d => hasCycle(d.id));
  }
  if (hasCycle(task.id)) throw new Error(i18n('validation.circularDependency'));
}