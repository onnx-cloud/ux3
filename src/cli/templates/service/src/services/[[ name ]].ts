export const [[ name ]]Service = {
  async get(id: string): Promise<unknown> {
    const res = await fetch(`/api/[[ name ]]/${id}`);
    if (!res.ok) throw new Error(`[[ Name ]] get failed: ${res.status}`);
    return res.json();
  },

  async list(): Promise<unknown[]> {
    const res = await fetch('/api/[[ name ]]');
    if (!res.ok) throw new Error(`[[ Name ]] list failed: ${res.status}`);
    return res.json();
  },

  async create(data: unknown): Promise<unknown> {
    const res = await fetch('/api/[[ name ]]', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error(`[[ Name ]] create failed: ${res.status}`);
    return res.json();
  },

  async update(id: string, data: unknown): Promise<unknown> {
    const res = await fetch(`/api/[[ name ]]/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error(`[[ Name ]] update failed: ${res.status}`);
    return res.json();
  },

  async remove(id: string): Promise<void> {
    const res = await fetch(`/api/[[ name ]]/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error(`[[ Name ]] remove failed: ${res.status}`);
  },
};
