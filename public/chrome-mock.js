// Mock Chrome extension APIs for browser testing
if (typeof chrome === 'undefined') {
  window.chrome = {
    runtime: {
      id: 'test-extension-id',
      sendMessage: () => Promise.resolve({ ok: false, error: 'Chrome APIs not available in browser mode' }),
      onMessage: {
        addListener: () => {},
        removeListener: () => {}
      }
    },
    storage: {
      local: {
        get: () => Promise.resolve({}),
        set: () => Promise.resolve({}),
        remove: () => Promise.resolve({})
      },
      sync: {
        get: () => Promise.resolve({}),
        set: () => Promise.resolve({})
      }
    },
    tabs: {
      query: () => Promise.resolve([]),
      sendMessage: () => Promise.resolve({})
    },
    scripting: {
      executeScript: () => Promise.resolve([])
    }
  };
}

