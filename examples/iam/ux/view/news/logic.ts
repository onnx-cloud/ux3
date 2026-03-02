// fetch news from public API shim (served from examples/iam/public/api)
// allows real HTTP request during development and E2E tests.
export async function loadNewsData() {
  const resp = await fetch('/api/news/today');
  if (!resp.ok) throw new Error('failed to load news');
  return resp.json();
}
