export function disableConsoleOutput() {
  // Override ALL console methods to prevent any output
  console.log = () => {};
  console.error = () => {};
  console.warn = () => {};
  console.info = () => {};
  console.debug = () => {};
  console.trace = () => {};
  console.dir = () => {};
  console.time = () => {};
  console.timeEnd = () => {};
  console.timeLog = () => {};
  console.group = () => {};
  console.groupEnd = () => {};
  console.table = () => {};
  console.clear = () => {};
  console.count = () => {};
  console.countReset = () => {};
}
