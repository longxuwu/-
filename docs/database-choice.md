# 数据库选型：SQLite 和 MySQL 的区别

当前 MVP 使用 SQLite，原因是轻量、零安装、零服务进程，适合本机演示和早期验证。

## SQLite

SQLite 是一个嵌入式数据库。数据就是一个本地文件：

```text
backend/data/hirepilot.db
```

优点：

- 不需要安装数据库服务。
- Python 标准库自带 `sqlite3`。
- 占用空间很小。
- 迁移简单，复制 `.db` 文件即可。
- 很适合单机 MVP、演示环境、小团队试用。

限制：

- 不适合高并发多人同时写入。
- 权限、账号、审计能力弱。
- 运维能力不如 MySQL/PostgreSQL。
- 多台机器共享访问不方便。

## MySQL

MySQL 是服务型数据库，需要单独启动数据库服务。

优点：

- 适合多人、多服务、长期线上运行。
- 支持更成熟的账号权限、备份、索引、连接池。
- Java/Spring 企业环境常见。
- 你本机 `D:\Develop` 已经有 `mysql-8.0.26-winx64`。

限制：

- 需要安装、配置、启动服务。
- 占用磁盘和内存更多。
- 本地开发环境维护成本更高。

## 当前建议

阶段 1：继续用 SQLite，把招聘流程跑通。

阶段 2：如果要部署给多人使用，升级到 PostgreSQL 或 MySQL。

阶段 3：如果企业已有 Java/MySQL 基建，可以后端继续 Python 做 AI/OCR 服务，业务数据放 MySQL。

推荐迁移路径：

```text
SQLite MVP
  -> SQLAlchemy 数据访问层
  -> PostgreSQL/MySQL 生产库
  -> 连接池、备份、权限、审计
```

