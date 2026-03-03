import { createStoreStub } from '@ux3/plugin-store/testing';
import { validateProject } from '../../src/logic/views/validators';

describe('Kanban App', () => {
  it('should load projects on home view', async () => {
    const store = createStoreStub({
      // stub projects array
    });
    // ...assert projects render
  });

  it('should validate project name', async () => {
    const store = createStoreStub();
    // call validator directly
    try {
      validateProject({ name: '' });
    } catch (err: any) {
      expect(err.message).toContain('required');
    }
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
