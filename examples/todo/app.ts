/**
 * Example: Todo App with UX3
 * 
 * Demonstrates:
 * - Multiple FSMs (auth, todoList)
 * - View composition
 * - Reactive state
 * - Event handling
 */

import { FSMRegistry } from '@ux3/fsm';
import { StateMachine } from '@ux3/fsm';
import { ViewComponent, reconcileScriptRepeat } from '@ux3/ui';
import { effect } from '@ux3/state';

// ============================================================================
// 1. Initialize FSMs
// ============================================================================

const authFsm = new StateMachine({
  id: 'auth',
  initial: 'idle',
  states: {
    idle: { on: { LOGIN: 'authenticating' } },
    authenticating: { on: { SUCCESS: 'authenticated', FAILURE: 'error' } },
    authenticated: { on: { LOGOUT: 'idle' } },
    error: { on: { RETRY: 'authenticating', DISMISS: 'idle' } },
  },
});

const todoListFsm = new StateMachine({
  id: 'todoList',
  initial: 'idle',
  states: {
    idle: { on: { LOAD: 'loading' } },
    loading: { on: { SUCCESS: 'loaded', FAILURE: 'error' } },
    loaded: { on: { ADD: 'loaded', REMOVE: 'loaded', EDIT: 'editing' } },
    editing: { on: { SAVE: 'loaded', CANCEL: 'loaded' } },
    error: { on: { RETRY: 'loading', DISMISS: 'idle' } },
  },
});

// Register FSMs
FSMRegistry.register('auth', authFsm);
FSMRegistry.register('todoList', todoListFsm);

console.log('[App] FSMs registered:', FSMRegistry.list());

// ============================================================================
// 2. Define view components
// ============================================================================

interface LoginViewContext {
  username: string;
  password: string;
  isLoading: boolean;
  error?: string;
}

/**
 * LoginView - Visible when auth.idle or auth.error
 */
export class LoginView extends ViewComponent<LoginViewContext> {
  static readonly METADATA = {
    namespace: 'auth',
    states: ['auth.idle', 'auth.error'] as const,
  };

  protected _mountTemplate() {
    const tpl = document.createElement('template');
    tpl.innerHTML = `
      <style>
        :host { display: contents; }
        form { max-width: 400px; margin: 0 auto; }
        input { width: 100%; padding: 8px; margin: 8px 0; }
        button { padding: 10px 20px; background: #007bff; color: white; border: none; cursor: pointer; }
        button:disabled { opacity: 0.5; cursor: not-allowed; }
        .error { color: red; margin: 8px 0; }
      </style>
      <form id="loginForm">
        <h1>Login</h1>
        <input id="username" type="text" placeholder="Username" required />
        <input id="password" type="password" placeholder="Password" required />
        <button id="submitBtn" type="button" ux-event="LOGIN">Login</button>
        <div id="errorMsg" class="error" hidden></div>
      </form>
    `;
    this.shadowRoot!.appendChild(tpl.content.cloneNode(true));
    this._bindEvents();
  }

  protected _setupEffects() {
    effect(() => {
      if (this.state.username || this.state.password || this.state.isLoading) {
        this._render();
      }
    });
  }

  protected _render() {
    const submitBtn = this.query<HTMLButtonElement>('#submitBtn')!;
    const errorMsg = this.query<HTMLDivElement>('#errorMsg')!;

    submitBtn.disabled = this.state.isLoading;

    if (this.state.error) {
      errorMsg.textContent = this.state.error;
      errorMsg.hidden = false;
    } else {
      errorMsg.hidden = true;
    }
  }

  private _bindEvents() {
    const submitBtn = this.query<HTMLButtonElement>('#submitBtn')!;
    const usernameInput = this.query<HTMLInputElement>('#username')!;
    const passwordInput = this.query<HTMLInputElement>('#password')!;

    submitBtn.addEventListener('click', () => {
      this.state.username = usernameInput.value;
      this.state.password = passwordInput.value;
      this.state.isLoading = true;

      this.fsm?.send('LOGIN', {
        username: this.state.username,
        password: this.state.password,
      });
    });
  }
}

LoginView.register('view-login');

// ============================================================================

interface TodoListViewContext {
  todos: Array<{ id: string; title: string; completed: boolean }>;
  isLoading: boolean;
  error?: string;
}

/**
 * TodoListView - Visible when todoList.loaded
 */
export class TodoListView extends ViewComponent<TodoListViewContext> {
  static readonly METADATA = {
    namespace: 'todoList',
    states: ['todoList.loaded'] as const,
  };

  protected _mountTemplate() {
    const tpl = document.createElement('template');
    tpl.innerHTML = `
      <style>
        :host { display: contents; }
        .todo-list { list-style: none; padding: 0; }
        .todo-item { padding: 12px; border-bottom: 1px solid #eee; display: flex; gap: 10px; }
        .todo-item.completed { opacity: 0.6; text-decoration: line-through; }
        .todo-item button { padding: 4px 8px; cursor: pointer; }
      </style>
      <div id="root">
        <h2>My Todos</h2>
        <ul id="todoList" class="todo-list"></ul>
        <button id="addBtn" ux-event="ADD">Add Todo</button>
      </div>
    `;
    this.shadowRoot!.appendChild(tpl.content.cloneNode(true));
    this._bindEvents();
  }

  protected _setupEffects() {
    effect(() => {
      if (this.state.todos) {
        this._render();
      }
    });
  }

  protected _render() {
    const todoList = this.query<HTMLUListElement>('#todoList')!;
    todoList.innerHTML = '';

    (this.state.todos || []).forEach((todo) => {
      const li = document.createElement('li');
      li.className = `todo-item ${todo.completed ? 'completed' : ''}`;
      li.innerHTML = `
        <span>${todo.title}</span>
        <button data-todo-id="${todo.id}" ux-event="REMOVE">Remove</button>
      `;

      li.querySelector('[data-todo-id]')?.addEventListener('click', () => {
        this.fsm?.send('REMOVE', { id: todo.id });
      });

      todoList.appendChild(li);
    });
  }

  private _bindEvents() {
    const addBtn = this.query<HTMLButtonElement>('#addBtn')!;
    addBtn.addEventListener('click', () => {
      this.fsm?.send('ADD', { title: 'New Todo' });
    });
  }
}

TodoListView.register('view-todo-list');

// ============================================================================

/**
 * CDNScriptsView - Demonstrates ux-repeat on script tags
 * Loads multiple libraries via CDN
 */
interface CDNScriptsViewContext {
  cdnScripts: Array<{ src: string; type?: string; async?: boolean }>;
  loaded: number;
}

export class CDNScriptsView extends ViewComponent<CDNScriptsViewContext> {
  static readonly METADATA = {
    namespace: 'cdn',
    states: ['cdn.loaded'] as const,
  };

  protected _mountTemplate() {
    const tpl = document.createElement('template');
    tpl.innerHTML = `
      <style>
        :host { display: contents; }
        .cdn-container { padding: 20px; border: 1px solid #ccc; }
        .cdn-info { margin: 10px 0; font-size: 14px; }
        .script-list { background: #f5f5f5; padding: 10px; margin: 10px 0; max-height: 300px; overflow-y: auto; }
        .script-item { padding: 8px; border-bottom: 1px solid #ddd; font-family: monospace; font-size: 12px; word-break: break-all; }
      </style>
      <div class="cdn-container">
        <h2>CDN Scripts (ux-repeat Demo)</h2>
        <div class="cdn-info">Loaded <span id="scriptCount">0</span> scripts</div>
        <div class="script-list" id="scriptList">
          <!-- Scripts will be injected here via reconcileScriptRepeat() -->
        </div>
        <button id="loadBtn">Load CDN Scripts</button>
      </div>
      <!-- Actual script tags will be created here -->
      <div id="cdnScriptsContainer" style="display: none;"></div>
    `;
    this.shadowRoot!.appendChild(tpl.content.cloneNode(true));
    this._bindEvents();
  }

  protected _setupEffects() {
    effect(() => {
      if (this.state.cdnScripts || this.state.loaded) {
        this._render();
      }
    });
  }

  protected _render() {
    const scriptCount = this.query<HTMLSpanElement>('#scriptCount')!;
    const scriptList = this.query<HTMLDivElement>('#scriptList')!;
    const cdnContainer = this.query<HTMLDivElement>('#cdnScriptsContainer')!;

    // Update count
    scriptCount.textContent = String(this.state.loaded || 0);

    // Display list of scripts that will be loaded
    scriptList.innerHTML = '';
    (this.state.cdnScripts || []).forEach((script) => {
      const item = document.createElement('div');
      item.className = 'script-item';
      item.textContent = script.src;
      scriptList.appendChild(item);
    });

    // Actually inject the script tags (ux-repeat simulation)
    if (this.state.cdnScripts) {
      reconcileScriptRepeat(cdnContainer, this.state.cdnScripts);
    }
  }

  private _bindEvents() {
    const loadBtn = this.query<HTMLButtonElement>('#loadBtn')!;
    loadBtn.addEventListener('click', () => {
      // Simulate loading CDN scripts
      this.state.cdnScripts = [
        {
          src: 'https://cdn.jsdelivr.net/npm/lodash@4/lodash.min.js',
          async: true,
        },
        {
          src: 'https://cdn.jsdelivr.net/npm/axios@1/dist/axios.min.js',
          async: true,
        },
        {
          src: 'https://cdn.jsdelivr.net/npm/date-fns@3/index.min.js',
          async: true,
        },
      ];
      this.state.loaded = this.state.cdnScripts.length;
    });
  }
}

CDNScriptsView.register('view-cdn-scripts');
// 3. App initialization
// ============================================================================

function initApp() {
  console.log('[App] Initializing...');

  // Load initial data
  authFsm.send('LOGIN', { username: 'user@example.com', password: '' });

  // Simulate login success
  setTimeout(() => {
    authFsm.send('SUCCESS', {});
    todoListFsm.send('LOAD', {});

    // Simulate todo load
    setTimeout(() => {
      todoListFsm.send('SUCCESS', {
        todos: [
          { id: '1', title: 'Learn UX3', completed: false },
          { id: '2', title: 'Build a project', completed: false },
        ],
      });
    }, 500);
  }, 500);

  console.log('[App] Ready');
}

// Start app when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}
