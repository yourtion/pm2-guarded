import { initPmx } from "./pmx";

const config = initPmx();
if (config.influxdb) {
  console.log(config);
  setInterval(() => {}, 1000);
} else {
  // run empty loop
  console.log("Run `pm2 set pm2-guarded:influxdb 666` to start monit");
  setInterval(() => {}, 60000);
}
