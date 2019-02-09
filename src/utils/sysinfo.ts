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

  constructor(interval = 1000) {
    setInterval(this.fetch.bind(this), interval);
  }

  private fetch() {
    // cpuUsage Info
    const startMeasure = computeUsage();
    const t = process.uptime();
    setTimeout(_ => {
      const endMeasure = computeUsage();
      const spent = Math.floor((process.uptime() - t) * 1000);
      const idleDifference = endMeasure.idle - startMeasure.idle;
      const totalDifference = endMeasure.total - startMeasure.total;
      const percentageCPU = (10000 - Math.round((10000 * idleDifference) / totalDifference)) / spent;
      if (!isNaN(percentageCPU)) {
        this.cpuUsage = percentageCPU;
      }
    }, 100);
  }

  getInfo() {
    const load = os.loadavg();
    return {
      cpu: this.cpuUsage,
      freemem: 1 - os.freemem() / this.totalmem,
      load5: load[0],
      load10: load[1],
      load15: load[2],
    };
  }
}
