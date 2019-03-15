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

  parseResult(info: string = "", timestamp: Date) {
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
    const result = { active: 0, accepts: 0, handled: 0, requests: 0, reading: 0, writing: 0, waiting: 0, timestamp };
    // 计算accepts、handled、requests增长量
    result.active = getRegxInfoNum(infoArr[0], 1);
    result.accepts = accepts >= this.lastAccepts ? accepts - this.lastAccepts : accepts;
    result.handled = handled >= this.lastHandled ? handled - this.lastHandled : handled;
    result.requests = requests >= this.lastRequests ? requests - this.lastRequests : requests;
    result.reading = getRegxInfoNum(infoArr[3], 1);
    result.writing = getRegxInfoNum(infoArr[3], 2);
    result.waiting = getRegxInfoNum(infoArr[3], 3);
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
