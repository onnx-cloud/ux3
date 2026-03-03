import { createStoreStub } from '@ux3/plugin-store/testing';

describe('Kanban App', () => {
  it('should load projects on home view', async () => {
    const store = createStoreStub({
      // stub projects array
    });
    // ...assert projects render
  });

  it('should create task via form', async () => {
    const store = createStoreStub();
    // Assert task appears in lane
  });

  it('should move task between lanes', async () => {
    const store = createStoreStub();
    // Assert lane changes in local context
  });
});
