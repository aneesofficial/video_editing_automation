// In-memory queue configuration: Redis is not needed for single-user desktop setup.
export const redisConnection = {
  disconnect: () => {},
  quit: async () => {},
  on: (_event: string, _callback: Function) => {},
};
