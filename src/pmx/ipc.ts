type replacerType = (key: string, value: any) => any;

function safeStringify(obj: any, replacer?: replacerType, spaces?: string | number, cycleReplacer?: replacerType) {
  return JSON.stringify(obj, serializer(replacer, cycleReplacer), spaces);
}

function serializer(replacer: replacerType | null = null, cycleReplacer: replacerType | null = null): replacerType {
  const stack: any[] = [];
  const keys: string[] = [];

  if (cycleReplacer == null) {
    cycleReplacer = function(key: any, value: any) {
      if (stack[0] === value) return "[Circular ~]";
      return "[Circular ~." + keys.slice(0, stack.indexOf(value)).join(".") + "]";
    };
  }

  return function(this: replacerType, key: any, value: any) {
    if (stack.length > 0) {
      var thisPos = stack.indexOf(this);
      ~thisPos ? stack.splice(thisPos + 1) : stack.push(this);
      ~thisPos ? keys.splice(thisPos, Infinity, key) : keys.push(key);
      if (~stack.indexOf(value)) value = cycleReplacer!.call(this, key, value);
    } else stack.push(value);

    return replacer == null ? value : replacer.call(this, key, value);
  };
}

export default function ipcSend(args: any) {
  /** For debug purpose */
  if (process.env.MODULE_DEBUG) console.log(args);

  if (!process.send) {
    const output = args.data;
    delete output.__name;
    return false;
  }

  try {
    process.send(JSON.parse(safeStringify(args)));
  } catch (e) {
    console.error("Process disconnected from parent !");
    console.error(e.stack || e);
    process.exit(1);
  }
}
