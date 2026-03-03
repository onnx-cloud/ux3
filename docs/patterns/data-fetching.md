# Data Fetching Patterns

This guide covers best practices for fetching, caching, and managing data in UX3 applications. Effective data patterns reduce latency, improve reliability, and simplify state management.

## Overview

Data fetching in UX3 follows these principles:

1. **Fetch in services** — All HTTP calls live in `src/services/`, not in FSMs
2. **Invoke from FSMs** — Use FSM `invoke` to trigger service calls
3. **Pass data to views** — Views access data via FSM context
4. **Cache strategically** — Use application-level caching for frequently accessed data
5. **Handle errors gracefully** — See [Error Handling Patterns](./error-handling.md)

## Pattern 1: Simple Data Fetch

The most straightforward pattern: invoke a service, success/error states:

**Service** (in `src/services/posts.ts`):
```typescript
export const posts = {
  async getPostById(id: string) {
    const resp = await fetch(`/api/posts/${id}`);
    if (!resp.ok) {
      return {
        error: {
          code: 'FETCH_FAILED',
          message: `HTTP ${resp.status}: ${resp.statusText}`,
          statusCode: resp.status,
        }
      };
    }
    return { post: await resp.json() };
  }
};
```

**View FSM** (in `ux/view/post-detail/detail.yaml`):
```yaml
name: postDetail
initial: loading
context:
  postId: null
  post: null
  error: null

states:
  loading:
    invoke:
      src: posts.getPostById
      params: [ctx.postId]
    on:
      SUCCESS:
        target: loaded
        actions:
          - assign: { post: event.payload.post, error: null }
      ERROR:
        target: error
        actions:
          - assign: { error: event.payload.error }

  loaded:
    on:
      REFRESH: loading

  error:
    on:
      RETRY: loading
```

**Template**:
```html
<div ux-if="ctx.post" class="post-detail">
  <h1>{{ctx.post.title}}</h1>
  <p>{{ctx.post.content}}</p>
  <button @click="REFRESH">Refresh</button>
</div>

<div ux-if="ctx.error" class="error">
  Failed to load post: {{ctx.error.message}}
  <button @click="RETRY">Try again</button>
</div>
```

## Pattern 2: Parallel Data Fetching

Load multiple independent data sources concurrently:

**View FSM**:
```yaml
name: dashboard
initial: loading
context:
  user: null
  posts: null
  comments: null
  error: null

states:
  loading:
    # Use parallel service calls
    invoke:
      - src: user.getProfile
        onDone: { actions: [assign: { user: event.payload.user }] }
        onError: { actions: [assign: { error: event.payload.error }] }
      - src: posts.getPosts
        onDone: { actions: [assign: { posts: event.payload.posts }] }
        onError: { actions: [assign: { error: event.payload.error }] }
      - src: comments.getComments
        onDone: { actions: [assign: { comments: event.payload.comments }] }
        onError: { actions: [assign: { error: event.payload.error }] }
    on:
      SUCCESS: loaded  # When all succeed
      ERROR: error     # When any fails

  loaded:
    on:
      REFRESH: loading

  error:
    on:
      RETRY: loading
```

Alternatively, use a combined service that fetches all data:

```typescript
// In src/services/dashboard.ts
export const dashboard = {
  async loadDashboard() {
    try {
      const [userResp, postsResp, commentsResp] = await Promise.all([
        fetch('/api/profile'),
        fetch('/api/posts'),
        fetch('/api/comments'),
      ]);
      
      if (!userResp.ok || !postsResp.ok || !commentsResp.ok) {
        return {
          error: {
            code: 'FETCH_FAILED',
            message: 'Failed to load dashboard',
          }
        };
      }
      
      return {
        dashboard: {
          user: await userResp.json(),
          posts: await postsResp.json(),
          comments: await commentsResp.json(),
        }
      };
    } catch (cause) {
      return {
        error: {
          code: 'NETWORK_ERROR',
          message: `Network error: ${cause instanceof Error ? cause.message : 'Unknown'}`,
          details: { cause },
        }
      };
    }
  }
};
```

**Simpler FSM**:
```yaml
states:
  loading:
    invoke:
      src: dashboard.loadDashboard
    on:
      SUCCESS:
        target: loaded
        actions:
          - assign:
              user: event.payload.dashboard.user
              posts: event.payload.dashboard.posts
              comments: event.payload.dashboard.comments
      ERROR:
        target: error
        actions:
          - assign: { error: event.payload.error }
```

## Pattern 3: Lazy Loading (Load on Demand)

Only fetch data when user navigates to a section:

```yaml
name: app
initial: home
context:
  section: 'home'
  data: null

states:
  home:
    template: home.html
    on:
      NAVIGATE_SETTINGS: settings

  settings:
    invoke:
      src: user.getSettings
    on:
      SUCCESS:
        target: settingsLoaded
        actions:
          - assign: { data: event.payload.settings }
      ERROR:
        target: settingsError

  settingsLoaded:
    template: settings.html
    on:
      BACK: home

  settingsError:
    template: error.html
```

## Pattern 4: Paginated Data

Load data in chunks with pagination controls:

**Service**:
```typescript
export const posts = {
  async getPosts(page: number = 1, pageSize: number = 20) {
    const resp = await fetch(`/api/posts?page=${page}&pageSize=${pageSize}`);
    if (!resp.ok) {
      return { error: { message: 'Failed to load posts' } };
    }
    const data = await resp.json();
    return {
      posts: data.items,
      pagination: {
        page: data.page,
        pageSize: data.pageSize,
        totalPages: data.totalPages,
        totalCount: data.totalCount,
      }
    };
  }
};
```

**View FSM**:
```yaml
name: postList
initial: loading
context:
  posts: []
  page: 1
  pageSize: 20
  pagination: null
  error: null

states:
  loading:
    invoke:
      src: posts.getPosts
      params: [ctx.page, ctx.pageSize]
    on:
      SUCCESS:
        target: loaded
        actions:
          - assign:
              posts: event.payload.posts
              pagination: event.payload.pagination
              error: null
      ERROR:
        target: error
        actions:
          - assign: { error: event.payload.error }

  loaded:
    on:
      NEXT_PAGE:
        target: loading
        actions:
          - assign: { page: ctx.page + 1 }
      PREV_PAGE:
        target: loading
        guard: ctx.page > 1
        actions:
          - assign: { page: ctx.page - 1 }
      GOTO_PAGE:
        target: loading
        actions:
          - assign: { page: event.value }

  error:
    on:
      RETRY: loading
```

**Template**:
```html
<div class="post-list">
  <ul>
    <li ux-each="post in ctx.posts">
      {{post.title}}
    </li>
  </ul>
  
  <div class="pagination">
    <button @click="PREV_PAGE" disabled="{{ctx.page <= 1}}">← Previous</button>
    <span>Page {{ctx.page}} of {{ctx.pagination?.totalPages}}</span>
    <button @click="NEXT_PAGE" disabled="{{ctx.page >= ctx.pagination?.totalPages}}">Next →</button>
  </div>
</div>
```

## Pattern 5: Infinite Scroll

Append data as user scrolls to bottom:

**Service**: Same as paginated, but tracks cumulative results.

**View FSM**:
```yaml
name: feed
initial: loading
context:
  items: []
  page: 1
  pageSize: 20
  hasMore: true
  loading: false
  error: null

states:
  loading:
    entry:
      - assign: { loading: true }
    invoke:
      src: feed.getItems
      params: [ctx.page, ctx.pageSize]
    on:
      SUCCESS:
        target: ready
        actions:
          - assign:
              items: ctx.items.concat(event.payload.items)
              hasMore: event.payload.hasMore
              loading: false
      ERROR:
        target: ready
        actions:
          - assign: { error: event.payload.error, loading: false }

  ready:
    on:
      SCROLL_TO_BOTTOM:
        target: loading
        guard: ctx.hasMore && !ctx.loading
        actions:
          - assign: { page: ctx.page + 1 }
      REFRESH:
        target: loading
        actions:
          - assign: { items: [], page: 1 }
```

**Template** (with intersection observer):
```html
<div class="feed">
  <div ux-each="item in ctx.items" class="feed-item">
    {{item.content}}
  </div>
  
  <div id="scroll-sentinel" data-ux-event="SCROLL_TO_BOTTOM">
    <div ux-if="ctx.loading" class="loading">Loading more...</div>
    <div ux-if="!ctx.hasMore && ctx.items.length > 0" class="end-message">
      No more posts
    </div>
  </div>
</div>

<script>
  // Trigger SCROLL_TO_BOTTOM event when sentinel enters viewport
  const observer = new IntersectionObserver((entries) => {
    if (entries[0].isIntersecting) {
      document.querySelector('#scroll-sentinel').click();
    }
  });
  observer.observe(document.querySelector('#scroll-sentinel'));
</script>
```

## Pattern 6: Application-Level Caching

Avoid fetching the same data multiple times using a cache service:

**Cache Service** (in `src/services/cache.ts`):
```typescript
interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number; // Time to live in ms
}

export class DataCache {
  private cache: Map<string, CacheEntry<any>> = new Map();

  set<T>(key: string, data: T, ttl: number = 1000 * 60 * 5) {
    this.cache.set(key, { data, timestamp: Date.now(), ttl });
  }

  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;
    
    const age = Date.now() - entry.timestamp;
    if (age > entry.ttl) {
      this.cache.delete(key);
      return null;
    }
    
    return entry.data;
  }

  has(key: string): boolean {
    return this.get(key) !== null;
  }

  clear(key?: string) {
    if (key) {
      this.cache.delete(key);
    } else {
      this.cache.clear();
    }
  }
}

export const cache = new DataCache();
```

**Service Using Cache**:
```typescript
import { cache } from './cache';

export const users = {
  async getUserById(id: string) {
    const cacheKey = `user:${id}`;
    
    // Check cache first
    const cached = cache.get(cacheKey);
    if (cached) {
      return { user: cached, fromCache: true };
    }
    
    // Fetch if not cached
    try {
      const resp = await fetch(`/api/users/${id}`);
      if (!resp.ok) {
        return { error: { message: 'User not found' } };
      }
      
      const user = await resp.json();
      cache.set(cacheKey, user, 1000 * 60 * 10); // 10 min TTL
      return { user, fromCache: false };
    } catch (cause) {
      return { error: { message: 'Network error', details: { cause } } };
    }
  }
};
```

**View FSM** (with cache invalidation on update):
```yaml
states:
  loaded:
    on:
      UPDATE_USER:
        target: updating
        actions:
          - { invoke: updateUser }
          - assign: { updating: true }

  updating:
    invoke:
      src: users.updateUser
      params: [ctx.user]
    on:
      SUCCESS:
        actions:
          - { clearCache: 'user:*' }  # Clear user cache
          - assign: { user: event.payload.user }
        target: loaded
```

## Pattern 7: Request Deduplication

Prevent duplicate requests for the same data in-flight:

```typescript
// In src/services/base.ts
class RequestCache {
  private inFlight: Map<string, Promise<any>> = new Map();

  async deduped<T>(key: string, fetcher: () => Promise<T>): Promise<T> {
    // Return existing promise if in-flight
    if (this.inFlight.has(key)) {
      return this.inFlight.get(key);
    }

    // Create new promise and cache it
    const promise = fetcher().finally(() => {
      this.inFlight.delete(key);
    });
    
    this.inFlight.set(key, promise);
    return promise;
  }
}

export const requestCache = new RequestCache();

// Usage in services
export const products = {
  async getProduct(id: string) {
    return requestCache.deduped(`product:${id}`, async () => {
      const resp = await fetch(`/api/products/${id}`);
      return resp.json();
    });
  }
};
```

## Pattern 8: Search/Filter with Debouncing

Avoid hammering the server while user types:

```typescript
// In src/services/search.ts
function debounce<T extends any[], R>(
  fn: (...args: T) => Promise<R>,
  delay: number
) {
  let timeout: ReturnType<typeof setTimeout>;
  let lastResult: R;

  return async (...args: T): Promise<R> => {
    return new Promise((resolve) => {
      clearTimeout(timeout);
      timeout = setTimeout(async () => {
        lastResult = await fn(...args);
        resolve(lastResult);
      }, delay);
    });
  };
}

export const search = {
  searchUsers: debounce(async (query: string) => {
    if (!query || query.length < 2) {
      return { users: [] };
    }
    
    const resp = await fetch(`/api/search/users?q=${encodeURIComponent(query)}`);
    return resp.json();
  }, 300) // Wait 300ms after user stops typing
};
```

**View FSM**:
```yaml
states:
  ready:
    on:
      SEARCH:
        target: searching
        actions:
          - assign: { query: event.value }

  searching:
    invoke:
      src: search.searchUsers
      params: [ctx.query]
    on:
      SUCCESS:
        target: ready
        actions:
          - assign: { results: event.payload.users }
      ERROR:
        target: ready  # Show last results on error
```

## Pattern 9: Optimistic Updates

Update UI immediately, revert if server rejects:

```yaml
name: todo
initial: idle
context:
  todo: { id: 1, title: 'My task', completed: false }
  pending: false
  error: null

states:
  idle:
    on:
      TOGGLE_COMPLETE:
        target: idle
        actions:
          # Optimistic update: assume success
          - assign:
              'todo.completed': !ctx.todo.completed
              pending: true
          # Invoke server call
          - invoke: todos.updateTodo
            params: [ctx.todo.id, ctx.todo]

  # On server response...
  # SUCCESS: Keep optimistic update, clear pending
  # ERROR: Revert to previous state, show error
```

**Service**:
```typescript
export const todos = {
  async updateTodo(id: string, todo: any) {
    const resp = await fetch(`/api/todos/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(todo),
    });
    
    if (!resp.ok) {
      return { error: { message: 'Failed to update' } };
    }
    
    return { todo: await resp.json() };
  }
};
```

## Checklist: Data Fetching Strategy

Before shipping a feature, ask:

- [ ] **Is data fetched in a service?** (not in FSM or view)
- [ ] **Does FSM invoke the service?** (via `invoke` entry)
- [ ] **Are errors handled gracefully?** (not exceptions)
- [ ] **Is loading state shown to user?** (prevent double-clicks)
- [ ] **Is data cached appropriately?** (balance freshness vs. perf)
- [ ] **Can user retry failed requests?** (explicit retry button)
- [ ] **Are duplicate requests prevented?** (deduplication if needed)
- [ ] **Is pagination/infinite-scroll working?** (if applicable)
- [ ] **Does search debounce?** (if applicable)
- [ ] **Are optimistic updates reverted on failure?** (if applicable)
- [ ] **Is cache cleared on mutations?** (updates, deletes)
- [ ] **Are timeouts handled?** (long operations should timeout)

## Related

- [Services documentation](../services.md) — Service implementation
- [Error Handling Patterns](./error-handling.md) — Network error strategies
- [FSM Core documentation](../fsm-core.md) — Invoke and event patterns
- [Testing guides](../testing-guides.md) — How to test async data flows
