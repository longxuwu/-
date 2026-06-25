# 企业 AGI 数字分身平台规划

平台从单一 HR 数字员工升级为企业级数字分身矩阵。

## 产品定位

一个公司可以拥有多个数字分身，每个分身对应一个部门、岗位或业务流程：

- AI 销售分身：客户跟进、线索分级、话术生成。
- AI 行政分身：日程提醒、会议纪要、流程通知。
- AI 合同分身：合同审查、履约预警、条款摘要。
- AI 财务分身：智能问数、报表生成、费用分析。
- AI 客服分身：多渠道接待、知识库问答、工单分流。
- AI 制造分身：质检分析、预测维护、产线日报。
- AI 运营分身：经营看板、用电分析、活动复盘。
- AI 招聘分身：简历筛选、人才画像、邀约审批。

## 平台抽象

每个数字分身都由以下部分组成：

- `Persona`：对外身份，如 AI 招聘分身。
- `Agent`：内部执行单元，如 Resume Matcher。
- `Skill`：可复用工作流程，如简历匹配、合同审查。
- `Tool/MCP`：能调用的工具，如数据库、邮箱、日历、CRM。
- `Knowledge`：部门知识库、制度、模板、历史数据。
- `Approval`：人工审批和安全边界。
- `Audit`：操作记录、工具调用、外发记录。

## 推荐数据模型

```text
personas
  id
  name
  department
  description
  status
  icon
  accent

persona_agents
  persona_id
  agent_id

agents
  id
  name
  role
  status
  tools
  description

skills
  id
  name
  trigger
  workflow

agent_runs
  id
  persona_id
  agent_id
  input
  output
  status
  created_at

approvals
  id
  run_id
  action_type
  content
  status
  approved_by
```

## 执行架构

```text
用户 / 定时任务 / 外部事件
  -> Persona Router
  -> 主控 Agent
  -> 专业 Agent
  -> Skill
  -> Tool / MCP / API
  -> 人工审批
  -> 业务系统 / 消息 / 报告
  -> 审计日志
```

## 当前实现

前端已提供：

- 企业 AGI 数字分身矩阵首页。
- 8 个分身卡片。
- 当前分身状态条。
- AI 招聘分身工作台。
- 其他分身能力蓝图和定制步骤。

后端已提供：

- `agents` 表。
- `/api/agents`。
- `/api/bootstrap` 返回 agents。

下一步建议：

1. 增加 `personas` 表。
2. 增加 `persona_agents` 关系表。
3. 增加分身创建/编辑页面。
4. 为每个分身配置工具权限。
5. 为每个分身配置审批策略。
6. 增加运行记录和审计日志。

