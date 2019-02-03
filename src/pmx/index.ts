import path from "path";

import ipcSend from "./ipc";
import autocast from "./cast";

function configureModule(opts: any) {
  ipcSend({
    type: "axm:option:configuration",
    data: opts,
  });
}

function configure(conf: any, do_not_tell_pm2 = false) {
  const package_filepath = path.resolve(path.dirname(require.main!.filename), "..", "package.json");
  let package_json;

  if (!conf.module_conf) conf.module_conf = {};

  conf.module_name = process.env.name || "outside-pm2";
  try {
    package_json = require(package_filepath);

    conf.module_version = package_json.version;

    if (package_json.config) {
      conf = Object.assign(conf, package_json.config);
      conf.module_conf = package_json.config;
    }
  } catch (e) {}

  /**
   * If custom variables has been set, merge with returned configuration
   */
  try {
    if (process.env[conf.module_name]) {
      const casted_conf = autocast(JSON.parse(process.env[conf.module_name] || ""));
      conf = Object.assign(conf, casted_conf);
      // Do not display probe configuration in Keymetrics
      delete casted_conf.probes;
      // This is the configuration variable modifiable from keymetrics
      conf.module_conf = Object.assign(conf.module_conf, casted_conf);

      // Obfuscate passwords
      Object.keys(conf.module_conf).forEach(function(key) {
        if ((key == "password" || key == "passwd") && conf.module_conf[key].length >= 1) {
          conf.module_conf[key] = "Password hidden";
        }
      });
    }
  } catch (e) {
    console.error(e);
    console.error("Error while parsing configuration in environment (%s)", conf.module_name);
  }
  if (do_not_tell_pm2 == true) return conf;

  configureModule(conf);
  return conf;
}

export function initPmx(opts: any = {}, cb?: (err: Error | null, conf: any) => void) {
  opts.isModule = true;
  const ret = configure(opts);
  if (cb && typeof cb == "function") return cb(null, ret);
  return ret;
}

// FIXME:
export function action() {}

// FIXME:
export function scopedAction() {}
