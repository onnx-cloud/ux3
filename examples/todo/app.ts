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

// -----------------------------------------------------------------------------
// style registry used by all views; keys correspond to `data-style` attributes
// or to element tags / view identifiers.  All Tailwind utility lists live here so
// that markup stays clean and declarative.
// -----------------------------------------------------------------------------
const styles: Record<string, string> = {
  'login.view': 'max-w-md mx-auto p-6 bg-white rounded-lg shadow contents',
  'todo.list.view': 'max-w-md mx-auto p-6 bg-white rounded-lg shadow contents',
  'cdn.scripts.view': 'p-4 bg-white rounded shadow contents',
  'form.base': 'space-y-4',
  'input.base': 'w-full p-2 border rounded',
  'button.base': 'px-4 py-2 bg-blue-600 text-white rounded disabled:opacity-50',
  'app.container': 'grid grid-cols-2 gap-6 md:grid-cols-1',
  'debug.info': 'bg-gray-100 border-l-4 border-blue-500 rounded p-4 mt-8 font-mono text-xs',
  'todo.item': 'flex items-center justify-between p-3 border-b border-gray-200',
  'heading': 'text-2xl font-bold',
  'error-msg': 'text-red-600 mt-2',
  'list': 'space-y-2',
  'cdn.container': 'p-4 border rounded space-y-2',
  'text-sm': 'text-sm',
  'script-list': 'bg-gray-100 p-2 max-h-72 overflow-y-auto',
  'remove.button': 'text-red-500 hover:underline',
};

function applyStyles(root: HTMLElement) {
  // process elements annotated with either attribute
  root.querySelectorAll('[data-style], [ux-style]').forEach((el) => {
    const key = el.getAttribute('data-style') || el.getAttribute('ux-style') || '';
    const cls = styles[key];
    if (cls) (el as HTMLElement).className = cls;
  });
}

// expose for host page scripts
;(window as any).todoApplyStyles = applyStyles;

// if the document is already available, decorate the body immediately
if (document && document.body) {
  applyStyles(document.body);
}


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
      <form id="loginForm" data-style="form.base">
        <h1 data-style="heading">Login</h1>
        <input id="username" type="text" placeholder="Username" required data-style="input.base" />
        <input id="password" type="password" placeholder="Password" required data-style="input.base" />
        <button id="submitBtn" type="button" ux-event="LOGIN" data-style="button.base">Login</button>
        <div id="errorMsg" data-style="error-msg" hidden></div>
      </form>
    `;
    this.shadowRoot!.appendChild(tpl.content.cloneNode(true));
    applyStyles(this.shadowRoot!);
    applyStyles(this);
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
      <div id="root" data-style="form.base">
        <h2 data-style="heading">My Todos</h2>
        <ul id="todoList" data-style="list"></ul>
        <button id="addBtn" ux-event="ADD" data-style="button.base">Add Todo</button>
      </div>
    `;
    this.shadowRoot!.appendChild(tpl.content.cloneNode(true));
    applyStyles(this.shadowRoot!);
    applyStyles(this);
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
      // apply base style and completed modifier
      li.className = styles['todo.item'] + (todo.completed ? ' opacity-60 line-through' : '');
      li.innerHTML = `
        <span>${todo.title}</span>
        <button data-todo-id="${todo.id}" ux-event="REMOVE" data-style="remove.button">Remove</button>
      `;
      applyStyles(li as HTMLElement);

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
      <div data-style="cdn.container">
        <h2 data-style="heading">CDN Scripts (ux-repeat Demo)</h2>
        <div data-style="text-sm">Loaded <span id="scriptCount">0</span> scripts</div>
        <div id="scriptList" data-style="script-list">
          <!-- Scripts will be injected here via reconcileScriptRepeat() -->
        </div>
        <button id="loadBtn" ux-style="button.base">Load CDN Scripts</button>
      </div>
      <!-- Actual script tags will be created here -->
      <div id="cdnScriptsContainer" class="hidden"></div>
    `;
    this.shadowRoot!.appendChild(tpl.content.cloneNode(true));
    applyStyles(this.shadowRoot!);
    applyStyles(this);
    applyStyles(this.shadowRoot!);
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
      item.className = 'py-2 border-b border-gray-300 text-xs font-mono break-words';
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
