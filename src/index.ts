import { initPmx } from "./pmx";
import { InfluxDB, IPoint } from "influx";
import SystemInfo from "./utils/sysinfo";
import Logger from "./utils/log";
import exec from "./utils/exec";
import parsePM2Data from "./utils/pm2";

const config = initPmx();
const logger = new Logger(config.debug);

// let EVENTS: Record<string, any>[] = [];
let SEDNING = false;

if (config.influxdb) {
  logger.info(config);

  const fetchInterval = config.fetchInterval || 1000;
  const sendInterval = config.sendInterval || 5000;

  const system = new SystemInfo(fetchInterval);
  const influx = new InfluxDB(config.influxdb);

  setInterval(async function() {
    if (SEDNING) return;
    logger.debug("Start SEDNING");
    SEDNING = true;
    try {
      const sysInfo = system.getInfo();
      const timestamp = new Date();
      const host = system.hostname;
      logger.debug(sysInfo);
      const data: IPoint[] = [];
      data.push({ measurement: "sysinfo", tags: { host }, fields: sysInfo, timestamp });
      const pm2Data = await exec("pm2 jlist");
      const pm2Info = parsePM2Data(pm2Data) || [];
      for (const info of pm2Info) {
        data.push({ measurement: "app", tags: { host, app: info.name, ins: info.instance }, fields: info, timestamp });
      }
      await influx.writePoints(data);
    } catch (error) {
      logger.error(error);
    } finally {
      SEDNING = false;
    }
    logger.debug("End SEDNING");
  }, sendInterval);
} else {
  // run empty loop
  logger.info("Run `pm2 set pm2-guarded:influxdb http://user:pass@host:port/db` to start monit");
  logger.info("Run `pm2 set pm2-guarded:fetchInterval 1000` to set info fetch interval");
  logger.info("Run `pm2 set pm2-guarded:sendInterval 5000` to set data send interval");
  setInterval(() => {}, 60000);
}
