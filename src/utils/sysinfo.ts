import os from "os";

function computeUsage() {
  let totalIdle = 0;
  let totalTick = 0;
  const cpus = os.cpus();

  for (const cpu of cpus) {
    for (let type in cpu.times) {
      totalTick += (cpu.times as any)[type];
    }
    totalIdle += cpu.times.idle;
  }

  return {
    idle: totalIdle / cpus.length,
    total: totalTick / cpus.length,
  };
}

export default class SystemInfo {
  public totalmem = os.totalmem();
  public hostname = os.hostname();
  private cpuUsage: number = 0;

  constructor() {
    setInterval(this.fetch.bind(this), 1000);
  }

  private fetch() {
    // cpuUsage Info
    const startMeasure = computeUsage();
    setTimeout(_ => {
      const endMeasure = computeUsage();
      var idleDifference = endMeasure.idle - startMeasure.idle;
      var totalDifference = endMeasure.total - startMeasure.total;
      var percentageCPU = (10000 - Math.round((10000 * idleDifference) / totalDifference)) / 100;
      this.cpuUsage = percentageCPU;
    }, 100);
  }

  getInfo() {
    const load = os.loadavg();
    return {
      cpuUsage: this.cpuUsage,
      freemem: 1 - os.freemem() / this.totalmem,
      load5: load[0],
      load10: load[1],
      load15: load[2],
    };
  }
}
