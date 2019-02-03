import os from "os";

const totalmem = os.totalmem();
export const hostname = os.hostname();

export function getSysInfo() {
  const load = os.loadavg();
  return {
    freemem: 1 - os.freemem() / totalmem,
    load5: load[0],
    load10: load[1],
    load15: load[2],
  };
}
