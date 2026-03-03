export function checkWIPLimit(lane: any, taskCount: number) {
  if (lane.maxTasks && taskCount > lane.maxTasks) {
    throw new Error(`WIP limit exceeded: max ${lane.maxTasks} tasks`);
  }
}

export function checkDependencies(task: any, allTasks: any[]) {
  if (!task.dependencies?.length) return true;
  const depTasks = task.dependencies.map(id => allTasks.find(t => t.id === id));
  const notDone = depTasks.some(t => t?.state !== 'completed');
  if (notDone) throw new Error('Cannot start: incomplete dependencies');
}

export function checkCycles(task: any, dependencies: any[]) {
  const visited = new Set();
  function hasCycle(id: string): boolean {
    if (visited.has(id)) return true;
    visited.add(id);
    const deps = dependencies.filter(d => d.dependentId === id);
    return deps.some(d => hasCycle(d.id));
  }
  if (hasCycle(task.id)) throw new Error('Circular dependency detected');
}