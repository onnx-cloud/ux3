import { describe, it, expect, beforeEach } from 'vitest';
import { Store } from '@ux3/plugin-store';
import {
  validateProject,
  validateBoard,
  validateLane,
  validateTask,
  validateComment
} from '../../src/logic/views/validators';
import {
  addTask,
  updateTask,
  removeTask,
  setTasks,
  addLane,
  updateLane,
  setLanes,
  generateUUID,
  calculateNewOrder,
  filteredTasks
} from '../../src/logic/views/utils';

describe('Kanban Integration Tests', () => {
  let store: Store;

  beforeEach(async () => {
    store = new Store({
      backend: 'memory',
      seedData: {
        projects: [
          { id: 'proj-1', name: 'Q1 Planning', owner: 'user-1', createdAt: Date.now() }
        ],
        boards: [
          { id: 'board-1', projectId: 'proj-1', name: 'Sprint Board', createdAt: Date.now() }
        ],
        lanes: [
          { id: 'lane-1', boardId: 'board-1', name: 'To Do', order: 1 },
          { id: 'lane-2', boardId: 'board-1', name: 'In Progress', order: 2 },
          { id: 'lane-3', boardId: 'board-1', name: 'Done', order: 3 }
        ],
        tasks: [
          {
            id: 'task-1',
            boardId: 'board-1',
            laneId: 'lane-1',
            title: 'Design mockups',
            priority: 'high',
            createdAt: Date.now()
          }
        ]
      }
    });
    await store.connect();
  });

  it('should validate project with required fields', () => {
    const validProject = { name: 'New Project', description: 'Test' };
    expect(() => validateProject(validProject)).not.toThrow();
  });

  it('should reject project with missing name', () => {
    expect(() => validateProject({ name: '' })).toThrow('required');
    expect(() => validateProject({ })).toThrow('required');
  });

  it('should enforce project name length limit', () => {
    const longName = 'a'.repeat(101);
    expect(() => validateProject({ name: longName })).toThrow('characters');
  });

  it('should validate board creation within project', () => {
    const validBoard = { name: 'Development', projectId: 'proj-1' };
    expect(() => validateBoard(validBoard)).not.toThrow();
  });

  it('should validate task with all fields', () => {
    const validTask = {
      title: 'Implement API',
      description: 'Build REST endpoints',
      priority: 'high',
      points: 8,
      dueDate: Date.now() + 86400000
    };
    expect(() => validateTask(validTask)).not.toThrow();
  });

  it('should reject task with priority outside allowed values', () => {
    expect(() => validateTask({
      title: 'Test',
      priority: 'critical'  // not in [low, normal, high, urgent]
    })).toThrow('priority');
  });

  it('should enforce task points range', () => {
    expect(() => validateTask({
      title: 'Test',
      points: 150  // exceeds max of 100
    })).toThrow('between');
  });

  it('should validate comments are not empty', () => {
    expect(() => validateComment({ text: '    ' })).toThrow('required');
    expect(() => validateComment({ text: 'Valid comment' })).not.toThrow();
  });

  it('should add task to lane context', () => {
    const ctx = { tasks: [{ id: 'task-1' }], selectedTaskId: null };
    const newTask = { id: 'task-2', title: 'New task', laneId: 'lane-1' };
    addTask(ctx, { data: newTask });
    expect(ctx.tasks).toHaveLength(2);
    expect(ctx.tasks[1].id).toBe('task-2');
  });

  it('should update task in context', () => {
    const ctx = {
      tasks: [{ id: 'task-1', title: 'Original', priority: 'low' }],
      selectedTaskId: 'task-1'
    };
    updateTask(ctx, { data: { title: 'Updated', priority: 'high' } });
    expect(ctx.tasks[0].title).toBe('Updated');
    expect(ctx.tasks[0].priority).toBe('high');
  });

  it('should remove task from context', () => {
    const ctx = {
      tasks: [{ id: 'task-1' }, { id: 'task-2' }],
      selectedTaskId: 'task-1'
    };
    removeTask(ctx);
    expect(ctx.tasks).toHaveLength(1);
    expect(ctx.tasks[0].id).toBe('task-2');
  });

  it('should filter tasks by lane', () => {
    const ctx = {
      tasks: [
        { id: 'task-1', laneId: 'lane-1', priority: 'high' },
        { id: 'task-2', laneId: 'lane-1', priority: 'low' },
        { id: 'task-3', laneId: 'lane-2', priority: 'high' }
      ],
      filter: { priority: 'high', assignee: null, hideArchived: true }
    };
    const laneTasks = filteredTasks(ctx, 'lane-1');
    expect(laneTasks).toHaveLength(1);
    expect(laneTasks[0].id).toBe('task-1');
  });

  it('should add lane to board', () => {
    const ctx = {
      lanes: [
        { id: 'lane-1', name: 'To Do', order: 1 },
        { id: 'lane-2', name: 'Done', order: 2 }
      ]
    };
    const newLane = { id: 'lane-3', name: 'In Review', order: 3 };
    addLane(ctx, { data: newLane });
    expect(ctx.lanes).toHaveLength(3);
    expect(ctx.lanes[2].name).toBe('In Review');
  });

  it('should update lane in context', () => {
    const ctx = {
      lanes: [{ id: 'lane-1', name: 'To Do', maxTasks: 5 }],
      selectedLaneId: 'lane-1'
    };
    updateLane(ctx, { data: { maxTasks: 10 } });
    expect(ctx.lanes[0].maxTasks).toBe(10);
  });

  it('should calculate new order for tasks', () => {
    const tasks = [
      { id: 'task-1', order: 10 },
      { id: 'task-2', order: 20 },
      { id: 'task-3', order: 15 }
    ];
    const newOrder = calculateNewOrder(tasks);
    expect(newOrder).toBe(21);
  });

  it('should generate unique UUIDs', () => {
    const uuid1 = generateUUID();
    const uuid2 = generateUUID();
    expect(uuid1).not.toBe(uuid2);
    expect(uuid1).toMatch(/^[0-9a-f-]{36}$/);
  });

  it('should initialize context with set operations', () => {
    const ctx = { tasks: undefined };
    const taskData = [
      { id: 'task-1', title: 'Task 1' },
      { id: 'task-2', title: 'Task 2' }
    ];
    setTasks(ctx, { data: taskData });
    expect(ctx.tasks).toEqual(taskData);
  });

  it('should initialize lanes context', () => {
    const ctx = { lanes: undefined };
    const laneData = [
      { id: 'lane-1', name: 'To Do' },
      { id: 'lane-2', name: 'Done' }
    ];
    setLanes(ctx, { data: laneData });
    expect(ctx.lanes).toEqual(laneData);
  });
});

