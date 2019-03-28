/** node-amp encode */
export function ampDecode(buf: Buffer) {
  let off = 0;

  // unpack meta
  const meta = buf[off++];
  // const version = meta >> 4;
  const argv = meta & 0xf;
  const args = new Array(argv);

  // unpack args
  for (let i = 0; i < argv; i++) {
    const len = buf.readUInt32BE(off);
    off += 4;

    const arg = buf.slice(off, (off += len));
    args[i] = arg;
  }

  return args;
}

const version = 1;

/** node-amp decode */
export function ampEecode(data: any[]) {
  const argc = data.length;
  let len = 1;
  let off = 0;

  // data length
  for (let i = 0; i < argc; i++) {
    len += 4 + data[i].length;
  }

  // buffer
  const buf = Buffer.allocUnsafe(len);

  // pack meta
  buf[off++] = (version << 4) | argc;

  // pack args
  for (let i = 0; i < argc; i++) {
    const arg = data[i];

    buf.writeUInt32BE(arg.length, off);
    off += 4;

    arg.copy(buf, off);
    off += arg.length;
  }

  return buf;
}

/** Decode `msg` and unpack all args. */
export function decode(msg: Buffer) {
  const args = ampDecode(msg);

  for (let i = 0; i < args.length; i++) {
    args[i] = unpack(args[i]);
  }

  return args;
}

/** Encode and pack all `args`.  */
export function encode(args: any[]) {
  const tmp = new Array(args.length);

  for (let i = 0; i < args.length; i++) {
    tmp[i] = pack(args[i]);
  }

  return ampEecode(tmp);
}

/** Pack `arg`. */
export function pack(arg: any) {
  // blob
  if (Buffer.isBuffer(arg)) return arg;

  // string
  if ("string" == typeof arg) return Buffer.from("s:" + arg);

  // undefined
  if (arg === undefined) arg = null;

  // json
  return Buffer.from("j:" + JSON.stringify(arg));
}

/** Unpack `arg` */
export function unpack(arg: Buffer) {
  // json
  if (isJSON(arg)) return JSON.parse(arg.slice(2).toString());

  // string
  if (isString(arg)) return arg.slice(2).toString();

  // blob
  return arg;
}

export function decodeMsg(arg: Buffer) {
  // json
  if (isJSON(arg))
    return {
      type: "json",
      data: JSON.parse(arg.slice(2).toString()),
    };
  // string
  if (isString(arg))
    return {
      type: "string",
      data: arg.slice(2).toString(),
    };

  // blob
  return { type: "blob", data: arg };
}

/** String argument */
function isString(arg: any) {
  return 115 == arg[0] && 58 == arg[1];
}

/** JSON argument  */
function isJSON(arg: any) {
  return 106 == arg[0] && 58 == arg[1];
}
