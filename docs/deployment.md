# 换电脑部署说明

## 最轻量部署

适合个人电脑或内网演示。

需要：

- Node.js 20+。
- Python 3.11+。
- 项目源码。

启动后端：

```powershell
.\start_backend.ps1
```

启动前端：

```powershell
npm.cmd install
npm.cmd run dev -- --host 127.0.0.1 --port 5173
```

访问：

```text
http://127.0.0.1:5173
```

## 数据迁移

SQLite 数据文件：

```text
backend/data/hirepilot.db
```

把这个文件复制到新电脑同路径即可迁移数据。

## 局域网访问

如果要让同一个局域网内其他电脑访问：

后端：

```powershell
.\start_backend.ps1
```

前端：

```powershell
npm.cmd run dev -- --host 0.0.0.0 --port 5173
```

然后用主机 IP 访问：

```text
http://主机IP:5173
```

注意：上线给多人使用时，需要增加正式登录、HTTPS、数据库备份和权限控制。

## 正式上线建议

前端：

- `npm run build`
- Nginx 部署 `dist`

后端：

- FastAPI 或继续轻量 Python 服务。
- 生产库使用 PostgreSQL/MySQL。
- JWT + Refresh Token。
- 日志、审计、备份。

部署路径建议放在 D 盘：

```text
D:\Develop\hirepilot
```

