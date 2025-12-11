const store: Record<string, any> = {};

export const _mockStore = store;

export const Preferences = {
  get: async ({key}: { key: string }) => {
    return {value: store[key] || null};
  },
  set: async ({key, value}: { key: string; value: string }) => {
    return store[key] = value;
  },
}
