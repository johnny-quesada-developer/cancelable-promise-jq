const { warn, error, info } = console;

const avoidConsoleError = true;
const avoidConsoleWarn = true;
const avoidConsoleInfo = true;

beforeEach(() => {
  jest.spyOn(console, 'warn').mockImplementation((...args) => {
    if (avoidConsoleWarn) return;

    warn(...args);
  });
  jest.spyOn(console, 'error').mockImplementation((...args) => {
    if (avoidConsoleError) return;

    error(...args);
  });
  jest.spyOn(console, 'info').mockImplementation((...args) => {
    if (avoidConsoleInfo) return;

    info(...args);
  });
});

afterEach(() => {
  jest.restoreAllMocks();
  jest.clearAllMocks();
});

export {};
