export type ServiceFn = (params?: any) => Promise<any>;

export class ServiceRegistry {
  private map = new Map<string, ServiceFn>();

  register(name: string, fn: ServiceFn): void {
    this.map.set(name, fn);
  }

  unregister(name: string): void {
    this.map.delete(name);
  }

  resolve(name: string): ServiceFn | undefined {
    return this.map.get(name);
  }

  has(name: string): boolean {
    return this.map.has(name);
  }
}

export const DefaultServiceRegistry = new ServiceRegistry();
