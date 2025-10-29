declare global {
  var useMocks: boolean;
  var mockEmailQueue: any[];
  function simulateDelay(name: string, ms?: number): Promise<void>;
}

export {};
