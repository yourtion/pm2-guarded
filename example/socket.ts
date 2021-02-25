const net = require("net")

/** 上报数据 */
interface IReportData {
  /** 指标名 */
  measurement?: string;
  /** 标签数组 */
  tags?: string[];
  /** 指标值 */
  fields: number[];
  /** 采集时间戳 */
  timestamp: number;
}

/**
 * 打包数据
 * @param data 待上报数据
 */
function packData(data: string) {
  const bufs: number[] = [];
  let i = 0;
  let dataBuf = Buffer.from(data);
  let lenBuf = Buffer.from(dataBuf.length + "").values();
  while (i < dataBuf.length) {
    if (dataBuf[i] === 0x00 || [0x0a, 0x0d].includes(dataBuf[i])) {
      bufs.push(0x00);
    }
    bufs.push(dataBuf[i]);
    i++;
  }
  return Buffer.from([...lenBuf, ...[0x0a, 0x0d], ...bufs, ...[0x0a, 0x0d]]);
}

/**
 * 上传埋点数据的 socket
 * @param data 上报数据数组
 * @param uploadPath socket地址
 */
async function uploadRecordToSocket(data: IReportData[], uploadPath = "/tmp/pm2-guarded.sock") {
  if (data.length < 1) {
    return;
  }

  const socket = await new Promise<net.Socket>((resolve, reject) => {
    const socket = net.connect(uploadPath, () => {
      resolve(socket)
    })
    socket.on("error", (err) => reject(err))
  })

  await new Promise((resolve, reject) => {
    socket.write(packData(JSON.stringify(data)), (err) => {
      if (err) {
        return reject(err)
      }
      resolve(true);
    })
  })
}
