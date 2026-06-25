# HirePilot HR Digital Employee

一个面向 BOSS 直聘无开放接口场景的 HR 数字员工 MVP。

项目构思：关于数字员工平台，目标是逐步实现“一人公司”的多数字分身协作体系。

当前版本是纯前端工作台，用于验证核心流程：

- 演示登录入口，后续可替换为企业账号、JWT 和权限系统。
- 企业 AGI 数字分身矩阵首页，作为平台级入口。
- 支持销售、行政、合同、财务、客服、制造、运营、招聘 8 类分身入口。
- 支持从平台首页跳转到不同分身模块。
- AI 招聘分身已接入当前 HR 招聘工作台。
- 展示 BOSS 页面视觉识别入口。
- 支持上传 BOSS 页面截图预览。
- 支持粘贴候选人文本并解析关键字段。
- 将候选人与岗位 JD 做规则化匹配评分。
- 展示候选人队列、匹配分、优势、风险和追问问题。
- 根据匹配状态生成邀约、追问或礼貌拒绝消息草稿。
- 消息审批中心支持复制、通过、驳回。
- JD 管理支持编辑岗位信息、匹配阈值、关键词和预警项。
- 定时任务中心支持启停任务和立即运行模拟。
- 上线配置页展示登录验证、服务部署和 BOSS 无接口集成路线。
- 数据使用 localStorage 持久化，刷新页面不会立即丢失。

## 运行

启动轻量 Python 后端：

```powershell
.\start_backend.ps1
```

如果你不用 Codex 自带 Python，也可以指定自己的 Python：

```powershell
$env:HIREPILOT_PYTHON="D:\Python\python.exe"
.\start_backend.ps1
```

后端地址：

```text
http://127.0.0.1:8787
```

启动前端：

```bash
npm install
npm run dev -- --host 127.0.0.1 --port 5173
```

打开：

```text
http://127.0.0.1:5173
```

## 后端技术栈

当前后端走轻量化方案：

- Python 标准库 `http.server`。
- SQLite 标准库 `sqlite3`。
- 无 FastAPI。
- 无 pip 依赖。
- 无虚拟环境。
- 无 Docker。

这样做的原因是你的 C 盘空间紧张，先避免安装大包。后续正式上线时，可以平滑升级为：

- FastAPI。
- PostgreSQL。
- JWT / Refresh Token。
- Redis + Celery。
- OCR 服务。
- 大模型分析服务。

当前 API：

- `GET /api/health`
- `POST /api/login`
- `GET /api/bootstrap`
- `GET /api/jobs/current`
- `PUT /api/jobs/current`
- `GET /api/candidates`
- `POST /api/candidates/analyze`
- `GET /api/drafts`
- `PATCH /api/drafts/{id}`
- `GET /api/tasks`
- `PATCH /api/tasks/{id}`
- `GET /api/agents`
- `GET /api/persona-runs`
- `POST /api/persona-runs`
- `PATCH /api/persona-runs/{id}`

运行数据保存在：

```text
backend/data/hirepilot.db
```

这个文件是本地运行数据，已加入 `.gitignore`。

## 合规边界

因为 BOSS 直聘没有开放接口，当前方案采用半自动安全模式：

- 不绕过验证码。
- 不绕过登录保护。
- 不模拟批量骚扰消息。
- 不自动发送外部消息。
- 用户通过截图、复制文本、授权导出或人工确认方式把数据交给系统处理。

后续如果要进一步自动化，应优先考虑官方授权、企业后台允许的导出方式、浏览器扩展的人工触发采集，或本地 OCR 辅助识别。

## 当前模块

- `分身矩阵`：企业所有数字分身入口，不带具体业务菜单。
- `当前分身`：进入当前选中分身的独立业务工作台。
- `工作台`：候选人总览、识别输入、JD 摘要、候选人详情。
- `BOSS 识别`：截图/文本识别入口和后端识别流水线说明。
- `JD 管理`：岗位基础信息、评分阈值、硬性条件、加分项、排除项。
- `消息审批`：邀约、追问、拒绝草稿的复制、通过、驳回。
- `定时任务`：每日识别提醒、审批汇总、人才库复捞。
- `上线配置`：登录验证、部署服务、无接口平台集成边界。

## 分身平台方向

新增规划文档：

```text
docs/avatar-platform-plan.md
```

平台结构是“平台入口 -> 数字分身模块 -> 内部 Agent 编排”。后续会把 `Persona` 和 `Agent` 分开：

- Persona：对外身份，例如 AI 招聘分身、AI 财务分身。
- Agent：内部执行单元，例如 Resume Matcher、Communication Agent。
- Skill：可复用工作流程。
- Tool/MCP：业务系统、数据库、浏览器、邮箱、日历等工具。
- Approval：人工审批和安全边界。
- Audit：操作审计和运行记录。

## 下一步

建议按这个顺序扩展：

1. 接后端 API：FastAPI / NestJS。
2. 接数据库：PostgreSQL 保存岗位、候选人、匹配记录和审批记录。
3. 接登录验证：企业邮箱、JWT、Refresh Token、RBAC 权限。
4. 接 OCR：PaddleOCR、本地视觉模型或云 OCR。
5. 接大模型：简历解析、JD 结构化、匹配解释、消息生成。
6. 接任务队列：每天提醒用户打开 BOSS 并执行人工授权采集。
7. 接浏览器扩展：只在用户主动点击时读取当前页面 DOM 或截图。
8. 接消息审批流：复制到 BOSS 或通过允许的渠道发送。
