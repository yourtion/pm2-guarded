import * as http from "http";

const REGS = [
  /Active connections\: ([0-9]+)/i,
  /server accepts handled requests/i,
  /([0-9]+) ([0-9]+) ([0-9]+)/i,
  /Reading: ([0-9]+) Writing: ([0-9]+) Waiting: ([0-9]+)/i,
];

function getRegxInfoNum(info: RegExpMatchArray, index: number): number {
  const data = (info && info[index] && parseInt(info[index], 10)) || 0;
  return isNaN(data) ? 0 : data;
}

export default class NginxStatus {
  private lastAccepts = -1;
  private lastHandled = -1;
  private lastRequests = -1;
  private inited = false;

  private host: string;
  private port: number;
  private path: string;
  private agent: http.Agent;

  constructor({ host = "127.0.0.1", port = 80, path = "/nginx_status" }) {
    this.host = host;
    this.port = port;
    this.path = path;
    this.agent = new http.Agent({ keepAlive: true });
  }

  async getStatus() {
    try {
      const now = new Date();
      const status = await this.getStatusRaw();
      if (!status) return;
      return this.parseResult(status, now);
    } catch (_) {
      return;
    }
  }

  private getStatusRaw(): Promise<string> {
    return new Promise((resolve, reject) => {
      http
        .get({ host: this.host, port: this.port, path: this.path, agent: this.agent }, (res) => {
          const { statusCode } = res;
          if (res.statusCode !== 200) {
            res.resume();
            return reject("请求失败\n" + `状态码: ${statusCode}`);
          }
          let rawData: string = "";
          res.on("data", (chunk) => (rawData += chunk));
          res.on("end", () => resolve(rawData));
        })
        .on("error", (e) => reject(e));
    });
  }

  private parseResult(info: string = "", timestamp: Date) {
    const strArr = info.split("\n");
    if (strArr.length < REGS.length) return;
    const infoArr: RegExpMatchArray[] = [];
    for (let i = 0; i < REGS.length; i++) {
      const parsed = strArr[i].match(REGS[i]);
      if (parsed === null) return;
      infoArr.push(parsed);
    }
    const accepts = getRegxInfoNum(infoArr[2], 1);
    const handled = getRegxInfoNum(infoArr[2], 2);
    const requests = getRegxInfoNum(infoArr[2], 3);
    const result = {
      data: { active: 0, accepts: 0, handled: 0, requests: 0, reading: 0, writing: 0, waiting: 0 },
      timestamp,
    };
    // 计算accepts、handled、requests增长量
    result.data.active = getRegxInfoNum(infoArr[0], 1);
    result.data.accepts = accepts >= this.lastAccepts ? accepts - this.lastAccepts : accepts;
    result.data.handled = handled >= this.lastHandled ? handled - this.lastHandled : handled;
    result.data.requests = requests >= this.lastRequests ? requests - this.lastRequests : requests;
    result.data.reading = getRegxInfoNum(infoArr[3], 1);
    result.data.writing = getRegxInfoNum(infoArr[3], 2);
    result.data.waiting = getRegxInfoNum(infoArr[3], 3);
    this.lastAccepts = accepts;
    this.lastHandled = handled;
    this.lastRequests = requests;
    // 第一次进行初始化状态
    if (this.inited === false) {
      this.inited = true;
      return;
    }
    return result;
  }
}
