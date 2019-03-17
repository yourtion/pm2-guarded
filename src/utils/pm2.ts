export default function parsePM2Data(data: string) {
  const res = [];
  try {
    const info = JSON.parse(data) as any[];
    for (const p of info) {
      // 跳过已经停止的进程
      if (!p.pid) continue;
      const monit = p.monit || {};
      const env = p.pm2_env || {};
      const axmMonitor = env.axm_monitor || {};
      const instance = parseInt(env.NODE_APP_INSTANCE);
      const ret = {
        name: p.name,
        pid: p.pid,
        cpu: monit.cpu,
        memory: monit.memory,
        instance: isNaN(instance) || instance === undefined ? 1 : instance,
      } as any;
      for (const k of Object.keys(axmMonitor)) {
        const v = axmMonitor[k];
        // if (!v.value) continue;
        const val = parseFloat(v.value);
        if (isNaN(val)) continue;
        ret[k] = val;
      }
      res.push(ret);
    }
    return res;
  } catch (error) {}
  return;
}
