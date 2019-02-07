export default class Logger {
  constructor(private logEnable: boolean) {}

  debug(...args: any) {
    if (!this.logEnable) return;
    console.log(...args);
  }

  info(...args: any[]) {
    console.log(...args);
  }

  error(...args: any[]) {
    console.error(...args);
  }
}
