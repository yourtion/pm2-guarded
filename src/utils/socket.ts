import fs from "fs";
import Logger from "./log";
import { SocketParser } from "./socket-parser";
import net from "net";

const logger = new Logger(false);

function isInfluxData(data: any) {
  const fields = ["tags", "fields", "timestamp"];
  let isOk = true;
  for (let field of fields) {
    if (data[field] === undefined) {
      isOk = false;
    }
  }
  return isOk;
}

/**
 * 1、套接字接收数据传入
 * 2、缓存接收到数据
 * 3、监听数据
 */
export class SocketUpload {
  /** 接收到的数据 */
  records: string[] = [];
  /** 单位为毫秒数 */
  timeGap = 10000;
  constructor(timeGap: number) {
    this.timeGap = timeGap;
  }
  startServer(path: string, onTick: (args: any[]) => void) {
    const server = net.createServer(c => {
      logger.info("客户端成功接入");
      let parser = new SocketParser();
      parser.on("finish", ret => {
        if (ret.data) {
          const list: any = JSON.parse(ret.data);
          const isOk = Array.isArray(list) && list.length > 0 && list.every(item => isInfluxData(item));
          if (isOk) {
            for (let item of list) {
              this.records.push({ ...item, timestamp: item ? new Date(item.timestamp) : new Date() });
            }
            c.write("ok");
          } else {
            logger.debug("influxdb数据有误", ret.data);
            logger.error("influxdb数据有误");
            c.write("nil");
          }
        }
      });

      parser.on("error", err => {
        logger.error("解析数据失败", err);
        c.write("nil");
      });

      c.on("data", data => {
        try {
          parser.parser(data);
        } catch (err) {
          logger.debug("解析json失败", err);
          c.write("nil");
        }
      });
      c.on("end", () => {
        logger.info("客户端已断开连接");
        parser.removeAllListeners();
        (parser as any) = null;
      });
    });

    server.listen(path, () => {
      logger.info("服务器已启动:" + path);

      process.on("SIGINT", () => {
        try {
          logger.info("清除socket文件:" + path);
          fs.unlinkSync(path);
        } catch (err) {
          logger.error("清除socket文件失败");
        }
        process.exit();
      });
    });

    setInterval(() => {
      const records = this.records;
      this.records = [];
      onTick(records);
    }, this.timeGap);
  }
}
