import childProcess from "child_process";

const opts = {
  env: Object.assign(process.env, {
    LANG: "en_US.UTF-8",
  }),
  // give it anyway since ignored by non-windows systems
  windowsHide: true,
};

export default function exec(cmd: string) {
  return new Promise((resolve, reject) => {
    childProcess.exec(cmd, opts, (err, stdout, stderr) => {
      if (err) return reject(err);
      if (stderr) return resolve(stderr);
      resolve(stdout);
    });
  });
}
