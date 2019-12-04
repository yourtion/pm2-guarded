import { initPmx } from "./pmx";
import { InfluxDB, IPoint } from "influx";
import SystemInfo from "./utils/sysinfo";
import Logger from "./utils/log";
import exec from "./utils/exec";
import parsePM2Data from "./utils/pm2";
import NginxStatus from "./utils/nginx";
import * as URL from "url";
import { SocketUpload } from "./utils/socket";

const config = initPmx();
const logger = new Logger(config.debug);

const flatMap = (f: any, arr: any[]) => arr.reduce((x, y) => [...x, ...f(y)], []);

enum KEYS {
  Nginx,
  Socket,
}

const MAX_DATAS_SIZE = 100;
let EVENTS: [KEYS, any][] = [];
let DATAS_WAITING: IPoint[][] = [];
let SEDNING = false;
let WAITING = 0;

function startFetchNginx(fetchInterval: number) {
  try {
    const url = URL.parse(config.nginx);
    logger.debug(url);
    const ng = new NginxStatus({ host: url.host!, port: Number(url.port || 80), path: url.path! });
    setInterval(async function() {
      const info = await ng.getStatus();
      if (info) EVENTS.push([KEYS.Nginx, info]);
    }, fetchInterval);
  } catch (error) {
    logger.error("Nginx config error", error);
  }
}

function startSocketServer(dataInterval: number) {
  const socketUpload = new SocketUpload(dataInterval);
  socketUpload.startServer(config.socketPath, async datas => {
    try {
      logger.debug("socket data", datas);
      if (datas.length < 1) return;
      for (const data of datas) {
        EVENTS.push([KEYS.Socket, data]);
      }
    } catch (err) {
      logger.error("socketUpload error", err);
    }
  });
}

if (config.influxdb) {
  logger.info(config);

  const fetchInterval = config.fetchInterval || 1000;
  const sendInterval = config.sendInterval || 5000;
  const dataInterval = config.dataInterval || 5000;

  const system = new SystemInfo(fetchInterval);
  const influx = new InfluxDB(config.influxdb);

  // Nginx
  if (config.nginx) {
    startFetchNginx(fetchInterval);
  }

  // SocketUpload
  if (config.socketPath) {
    startSocketServer(dataInterval);
  }

  setInterval(async function() {
    if (SEDNING) return;
    logger.debug("Start Interval");
    SEDNING = true;
    try {
      const data: IPoint[] = [];
      // 处理系统信息
      const sysInfo = system.getInfo();
      const timestamp = new Date();
      const host = system.hostname;
      logger.debug(sysInfo);
      data.push({ measurement: "sysinfo", tags: { host }, fields: sysInfo, timestamp });
      // 处理PM2信息
      let pm2Data = await exec("pm2 jlist");
      // 修复部分有前缀的结果
      const fixIndex = pm2Data.indexOf("[");
      if (fixIndex > 0) {
        pm2Data = pm2Data.slice(fixIndex);
      }
      const pm2Info = parsePM2Data(pm2Data) || [];
      for (const info of pm2Info) {
        data.push({ measurement: "app", tags: { host, app: info.name, ins: info.instance }, fields: info, timestamp });
      }
      // 处理事件记录
      const events = EVENTS;
      EVENTS = [];
      for (const event of events) {
        switch (event[0]) {
          // 执行Nginx相关数据推送
          case KEYS.Nginx:
            data.push({ measurement: "nginx", tags: { host }, fields: event[1].data, timestamp: event[1].timestamp });
            break;
          case KEYS.Socket:
            data.push({
              measurement: event[1].measurement ? `data-${event[1].measurement}` : "data",
              tags: { host, ...event[1].tags },
              fields: event[1].fields,
              timestamp: event[1].timestamp,
            });
            break;
          default:
            break;
        }
      }
      DATAS_WAITING.push(data);
      // 如果触发错误，等待
      if (WAITING > 0) {
        // 删除过多数据，防止程序爆掉
        if (DATAS_WAITING.length > MAX_DATAS_SIZE) {
          DATAS_WAITING.shift();
        }
        return WAITING--;
      }
      logger.debug("Start SEDNING");
      await influx.writePoints(flatMap((x: any) => x, DATAS_WAITING));
      // 发送成功则删除等待发送数据列表
      DATAS_WAITING = [];
    } catch (error) {
      WAITING = 6;
      logger.error(error.message || error);
    } finally {
      SEDNING = false;
    }
    logger.debug("End SEDNING");
  }, sendInterval);
} else {
  // run empty loop
  logger.info("Run `pm2 set pm2-guarded:influxdb http://user:pass@host:port/db` to start monit");
  logger.info("Run `pm2 set pm2-guarded:nginx http://127.0.0.1/nginx_status` to add Nginx monit");
  logger.info("Run `pm2 set pm2-guarded:socketPath /tmp/xxx` to add socket influxdb");
  logger.info("Run `pm2 set pm2-guarded:fetchInterval 1000` to set info fetch interval");
  logger.info("Run `pm2 set pm2-guarded:sendInterval 5000` to set data send interval");

  setInterval(() => {}, 60000);
}
