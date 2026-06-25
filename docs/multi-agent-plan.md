# 多数字员工框架规划

平台后续会支持多个数字员工协作，而不是只有一个 HR 助手。

## 当前 Agent 划分

- `HR Coordinator`：主控数字员工，负责接收任务、路由、审批判断和结果汇总。
- `BOSS Scout`：渠道识别员工，负责 BOSS 页面截图、文本和候选人卡片识别。
- `JD Analyst`：岗位分析员工，负责 JD 结构化、硬性条件和评分规则拆解。
- `Resume Matcher`：简历匹配员工，负责候选人画像、JD 匹配和风险识别。
- `Communication Agent`：沟通草稿员工，负责邀约、追问和拒绝话术。
- `Scheduler`：定时任务员工，负责每日巡检、审批提醒和人才库复捞。

## 数据表预留

后端已经预留：

```text
agents
```

当前接口：

```text
GET /api/agents
GET /api/bootstrap
```

`/api/bootstrap` 会同时返回岗位、候选人、草稿、任务和数字员工列表。

## 后续扩展

下一阶段可以增加：

- `agent_runs`：每次数字员工运行记录。
- `agent_tasks`：待处理任务队列。
- `agent_tools`：每个 Agent 可调用的工具。
- `human_approvals`：人工审批记录。
- `audit_logs`：工具调用和敏感动作审计。

建议执行流：

```text
用户/定时任务
  -> HR Coordinator
  -> BOSS Scout / JD Analyst / Resume Matcher
  -> Communication Agent
  -> 人工审批
  -> Scheduler 记录结果并生成日报
```

安全边界：

- 对外发送消息必须审批。
- 不绕过 BOSS 登录、验证码或风控。
- 候选人联系方式、简历、沟通记录需要权限控制和审计。

