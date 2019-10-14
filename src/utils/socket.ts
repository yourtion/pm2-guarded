import net from "net";
import fs from "fs";
import Logger from "./log";

const logger = new Logger(false);

export interface ISocketData {
  timestamp: number;
  fields: any;
  tags: any;
}

/**
 * 1、套接字接收数据传入
 * 2、缓存接收到数据
 * 3、监听数据
 */
export class SocketUpload {
  /** 接收到的数据 */
  records: ISocketData[] = [];
  /** 单位为毫秒数 */
  timeGap = 10000;
  constructor(timeGap: number) {
    this.timeGap = timeGap;
  }
  startServer(path: string, onTick: (args: ISocketData[]) => void) {
    const server = net.createServer(c => {
      logger.info("客户端成功接入");
      c.on("data", data => {
        const now = Date.now();
        try {
          const arrs = data
            .toString()
            .split("\n")
            .filter(str => !!str)
            .map(item => JSON.parse(item))
            .map(item => {
              return {
                timestamp: item.timestamp || now,
                fields: item.fields || {},
                tags: item.tags || {},
              };
            });
          this.records.push(...arrs);
        } catch (err) {
          logger.debug("解析json失败", err);
          c.write("nil");
        }
      });
      c.on("end", () => {
        logger.info("客户端已断开连接");
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
