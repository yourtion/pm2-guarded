import { EventEmitter } from "events";

interface IPackData {
  len: number;
  data: string | null;
}

/**
 * 自定义协议
 * 采用定长解析,数据格式为 len\r\ndata\r\n
 * 考虑到的问题：
 * 1、缓冲区大小
 * 2、无效请求
 * 3、数据何时传输完毕
 * 4、以什么作为标识，内容包含标识怎么处理（前面添加特殊字符标识）
 */
export class SocketParser extends EventEmitter {
  /**
   * 1 => 进入设置长度阶段
   * 2 => 进入数据解析阶段
   */
  private state = 1;
  private maxLen = 65536;
  private bufs: number[] = [];
  private gapState = -1;
  private formatChar = 0x00;
  private gapChar = [0x0a, 0x0d];
  private data: IPackData = { len: 0, data: null };

  constructor() {
    super();
  }

  /**
   * 检验数据块
   */
  private checkChunk() {
    switch (this.state) {
      case 1:
        if (this.bufs.length > 5) {
          throw new Error("长度数值超过限制");
        }
        break;
      case 2:
        if (this.bufs.length > this.maxLen) {
          throw new Error("数据大小超过限制");
        }
    }
  }

  /**
   * 重置数据
   */
  private resetData() {
    this.data = {
      len: 0,
      data: null,
    };
    this.gapState = -1;
    this.bufs = [];
  }

  /**
   * 格式化数据块
   */
  private formatChunk() {
    switch (this.state) {
      case 1:
        const len = Number(Buffer.from(this.bufs).toString());
        if (isNaN(len)) {
          throw new Error("长度数值格式有误");
        }
        this.data.len = len;
        this.bufs = [];
        this.state = 2;
        break;
      case 2:
        this.data.data = Buffer.from(this.bufs).toString();
        this.state = 1;
        const data = this.data;
        if (this.data.len !== this.bufs.length) {
          throw new Error("数据内容不合法");
        }

        this.resetData();
        this.emit("finish", data);
        break;
    }
  }

  /**
   * 检测数据块是否传输完毕
   * @param buf
   */
  private chunkOk(buf: number) {
    const index = this.gapChar.indexOf(buf);
    if (index !== -1 && this.gapState == index - 1) {
      this.gapState++;
    } else {
      this.gapState = -1;
    }

    const isOk = this.gapState === this.gapChar.length - 1;
    if (isOk) {
      this.gapState = -1;
    }
    return isOk;
  }

  /**
   * 将字符串数据组装成传输格式
   * @param data
   */
  public packData(data: string) {
    const bufs: number[] = [];
    let i = 0;
    let dataBuf = Buffer.from(data);
    let lenBuf = Buffer.from(dataBuf.length + "").values();
    while (i < dataBuf.length) {
      if (dataBuf[i] === this.formatChar || this.gapChar.includes(dataBuf[i])) {
        bufs.push(this.formatChar);
      }
      bufs.push(dataBuf[i]);
      i++;
    }
    return Buffer.from([...lenBuf, ...this.gapChar, ...bufs, ...this.gapChar]);
  }

  /**
   * 解析传输数据
   * @param bufs
   */
  public parser(bufs: Buffer) {
    try {
      let i = 0;
      while (i < bufs.length) {
        if (bufs[i] === this.formatChar) {
          i++;
          this.bufs.push(bufs[i]);
        } else {
          const isOk = this.chunkOk(bufs[i]);
          if (isOk) {
            this.formatChunk();
          } else if (this.gapState === -1) {
            this.bufs.push(bufs[i]);
          }
        }
        this.checkChunk();
        i++;
      }
    } catch (err) {
      const data = this.data;
      err.data = data;
      this.resetData();
      this.emit("error", err);
    }
  }

  on(event: "finish", listener: (args: IPackData) => void): this;
  on(event: "error", listener: (args: Error) => void): this;
  on(event: string | symbol, listener: (...args: any[]) => void): this;
  on(event: any, listener: (...args: any[]) => void) {
    super.on(event, listener);
    return this;
  }
}
