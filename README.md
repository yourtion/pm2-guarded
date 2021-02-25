# pm2-guarded

pm2-guarded 是一个 pm2 插件，通过将 pmx 获取运行应用的 metrics value 并整合上报到 Influxdb，同时通过 Grafana 可以进行展示。

## 采集内容

- pm2 应用的 metrics 信息
- pm2 所在机器的运行状态
- Nginx 的 nginx_status 信息
- 通过 socket 上报的信息
## How to use 安装

```bash
$ pm2 install pm2-guarded
```
### Upgrade 升级

```bash
$ pm2 module:update pm2-guarded
```

### Send to influxdb

配置 influxdb 地址

```bash
$ pm2 set pm2-guarded:influxdb http://user:pass@host:port/db
```
### Add Nginx status

采集本机的 Nginx 信息

```bash
$ pm2 set pm2-guarded:nginx http://127.0.0.1/nginx_status
```

### Add Proxy to influxdb

一个本地代理接口，可以通过该 socket 向 InfluxDB 上报本地其他数据，主动上报数据，而不是等待 pm2-guarded 定时采集

上报方法参考：[example/socket.ts](example/socket.ts)

```bash
$ pm2 set pm2-guarded:socketPath /tmp/pm2-guarded.sock
```

### Config

- set info fetch interval（应用数据采集时间间隔） `pm2 set pm2-guarded:fetchInterval 1000`
- set data send interval（向 InfluxDB 上报数据时间间隔） `pm2 set pm2-guarded:sendInterval 5000`

## ScreenShot

除了下面的 Grafana 看板，可以根据自己的需求自行定制看板

### APP Info

App Info Grafana Dashboard: [AppInfo.json](grafana-dashboards/AppInfo.json)

![](screenshots/app1.png)
![](screenshots/app2.png)

### Nginx info

Nginx Info Grafana Dashboard: [Nginx.json](grafana-dashboards/Nginx.json)

![](screenshots/nginx1.png)

### Host Info

Host Info Grafana Dashboard: [HostInfo](grafana-dashboards/HostInfo.json)

![](screenshots/host1.png)
