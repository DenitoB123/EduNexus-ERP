type MockedMethods<T> = {
  [K in keyof T]: T[K] extends (...args: infer A) => infer R ? jest.Mock<R, A> : T[K];
};

export class MockFactory {
  static create<T extends object>(
    methods: Array<keyof T>,
    defaultReturn?: unknown,
  ): MockedMethods<T> {
    const mock = {} as MockedMethods<T>;
    for (const method of methods) {
      (mock as Record<string | symbol, unknown>)[method as string] = jest.fn().mockResolvedValue(
        defaultReturn ?? undefined,
      );
    }
    return mock;
  }

  static createWithDefaults<T extends object>(
    defaults: Partial<{ [K in keyof T]: ReturnType<jest.Mock> }>,
  ): MockedMethods<T> {
    const mock = {} as MockedMethods<T>;
    for (const [key, value] of Object.entries(defaults)) {
      (mock as Record<string, unknown>)[key] = jest.fn().mockResolvedValue(value);
    }
    return mock;
  }
}
