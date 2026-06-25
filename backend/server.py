from __future__ import annotations

import argparse
import base64
import hashlib
import hmac
import json
import os
import sqlite3
import time
from http import HTTPStatus
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from typing import Any
from urllib.parse import urlparse


ROOT = Path(__file__).resolve().parent
DATA_DIR = ROOT / "data"
DB_PATH = DATA_DIR / "hirepilot.db"
SECRET = os.environ.get("HIREPILOT_SECRET", "dev-secret-change-before-production")


DEFAULT_JOB = {
    "title": "AI 产品经理",
    "department": "增长与智能化",
    "location": "上海 / 远程混合",
    "salary": "25K-40K",
    "requiredYears": 3,
    "thresholdInvite": 85,
    "thresholdReview": 65,
    "mustHave": ["AI 产品", "SaaS", "数据分析", "用户研究", "原型设计"],
    "niceToHave": ["招聘系统", "Agent", "B 端产品", "增长实验"],
    "blockers": ["无产品闭环经验", "只做项目交付", "不能接受混合办公"],
}

SAMPLE_TEXT = """候选人：林晨
当前岗位：高级产品经理
公司：某 B2B SaaS 创业公司
城市：上海
经验：5年
学历：本科
期望薪资：30K-38K
技能：AI 产品, SaaS, 数据分析, 用户研究, 原型设计, 增长实验
最近消息：你好，我对 AI 产品经理岗位比较感兴趣，之前做过智能客服和销售自动化产品。"""


def now_text() -> str:
    return time.strftime("%Y-%m-%d %H:%M:%S")


def dumps(data: Any) -> str:
    return json.dumps(data, ensure_ascii=False, separators=(",", ":"))


def sign(payload: dict[str, Any]) -> str:
    body = base64.urlsafe_b64encode(dumps(payload).encode("utf-8")).decode("ascii").rstrip("=")
    sig = hmac.new(SECRET.encode("utf-8"), body.encode("ascii"), hashlib.sha256).hexdigest()
    return f"{body}.{sig}"


def verify(token: str) -> bool:
    try:
        body, sig = token.split(".", 1)
    except ValueError:
        return False
    expected = hmac.new(SECRET.encode("utf-8"), body.encode("ascii"), hashlib.sha256).hexdigest()
    if not hmac.compare_digest(expected, sig):
        return False
    padded = body + "=" * (-len(body) % 4)
    payload = json.loads(base64.urlsafe_b64decode(padded.encode("ascii")).decode("utf-8"))
    return float(payload.get("exp", 0)) > time.time()


def connect() -> sqlite3.Connection:
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db() -> None:
    with connect() as conn:
        conn.executescript(
            """
            create table if not exists kv (
              key text primary key,
              value text not null
            );
            create table if not exists candidates (
              id integer primary key,
              data text not null
            );
            create table if not exists drafts (
              id integer primary key,
              data text not null
            );
            create table if not exists tasks (
              id integer primary key,
              data text not null
            );
            create table if not exists agents (
              id integer primary key,
              data text not null
            );
            create table if not exists persona_runs (
              id integer primary key,
              data text not null
            );
            """
        )
        if not conn.execute("select 1 from kv where key = 'job'").fetchone():
            conn.execute("insert into kv(key, value) values('job', ?)", (dumps(DEFAULT_JOB),))
        if not conn.execute("select 1 from candidates limit 1").fetchone():
            for candidate in seed_candidates():
                conn.execute("insert into candidates(id, data) values(?, ?)", (candidate["id"], dumps(candidate)))
                draft = create_draft(candidate, DEFAULT_JOB)
                conn.execute("insert into drafts(id, data) values(?, ?)", (draft["id"], dumps(draft)))
        if not conn.execute("select 1 from tasks limit 1").fetchone():
            for task in seed_tasks():
                conn.execute("insert into tasks(id, data) values(?, ?)", (task["id"], dumps(task)))
        if not conn.execute("select 1 from agents limit 1").fetchone():
            for agent in seed_agents():
                conn.execute("insert into agents(id, data) values(?, ?)", (agent["id"], dumps(agent)))


def get_job(conn: sqlite3.Connection) -> dict[str, Any]:
    row = conn.execute("select value from kv where key = 'job'").fetchone()
    return json.loads(row["value"])


def set_job(conn: sqlite3.Connection, job: dict[str, Any]) -> dict[str, Any]:
    conn.execute("insert into kv(key, value) values('job', ?) on conflict(key) do update set value = excluded.value", (dumps(job),))
    return job


def table_items(conn: sqlite3.Connection, table: str) -> list[dict[str, Any]]:
    rows = conn.execute(f"select data from {table} order by id desc").fetchall()
    return [json.loads(row["data"]) for row in rows]


def upsert_item(conn: sqlite3.Connection, table: str, item: dict[str, Any]) -> dict[str, Any]:
    conn.execute(f"insert into {table}(id, data) values(?, ?) on conflict(id) do update set data = excluded.data", (item["id"], dumps(item)))
    return item


def seed_candidates() -> list[dict[str, Any]]:
    return [
        {
            "id": 1,
            "name": "林晨",
            "role": "高级产品经理",
            "company": "某 B2B SaaS 创业公司",
            "city": "上海",
            "salary": "30K-38K",
            "years": 5,
            "education": "本科",
            "skills": ["AI 产品", "SaaS", "数据分析", "用户研究", "原型设计", "增长实验"],
            "source": "BOSS 截图识别",
            "raw": SAMPLE_TEXT,
            "score": 92,
            "status": "待邀约",
            "strengths": ["AI 产品和 SaaS 经验直接命中", "薪资期望在预算内", "有增长实验经验"],
            "risks": ["需要确认是否有从 0 到 1 产品闭环"],
            "questions": ["能否介绍一个你主导的 AI 产品从需求到上线的完整案例？"],
        },
        {
            "id": 2,
            "name": "周然",
            "role": "项目经理",
            "company": "传统软件外包公司",
            "city": "苏州",
            "salary": "22K-28K",
            "years": 6,
            "education": "本科",
            "skills": ["项目管理", "客户沟通", "交付管理", "需求文档"],
            "source": "手动粘贴",
            "raw": "项目经理，6年，传统软件外包，擅长交付管理和需求文档。",
            "score": 48,
            "status": "礼貌拒绝",
            "strengths": ["沟通和项目推进经验较强"],
            "risks": ["缺少 AI 产品经验", "缺少 SaaS 和数据分析经历", "更偏项目交付而非产品闭环"],
            "questions": ["是否有独立负责产品规划、指标设计和迭代决策的经历？"],
        },
        {
            "id": 3,
            "name": "许安",
            "role": "产品经理",
            "company": "招聘科技公司",
            "city": "杭州",
            "salary": "28K-35K",
            "years": 4,
            "education": "硕士",
            "skills": ["招聘系统", "B 端产品", "数据分析", "原型设计", "用户研究"],
            "source": "BOSS 对话页",
            "raw": "招聘科技公司产品经理，做过 ATS、人才库、面试流程产品。",
            "score": 78,
            "status": "需追问",
            "strengths": ["招聘系统和 B 端产品经验是强加分项", "数据分析和用户研究能力匹配"],
            "risks": ["AI 产品经验不明确", "需要确认是否愿意来上海或混合办公"],
            "questions": ["你是否做过 AI 简历解析、候选人推荐或自动化沟通相关功能？"],
        },
    ]


def seed_tasks() -> list[dict[str, Any]]:
    return [
        {"id": 1, "name": "每日候选人识别提醒", "time": "09:00", "channel": "站内 + 企业微信", "enabled": True, "lastRun": "今天 09:00", "result": "处理 18 条，推荐 5 条"},
        {"id": 2, "name": "待审批消息汇总", "time": "17:30", "channel": "站内", "enabled": True, "lastRun": "昨天 17:30", "result": "待审批 7 条"},
        {"id": 3, "name": "人才库复捞", "time": "周一 10:00", "channel": "邮件", "enabled": False, "lastRun": "未运行", "result": "关闭中"},
    ]


def seed_agents() -> list[dict[str, Any]]:
    return [
        {
            "id": 1,
            "name": "HR Coordinator",
            "role": "主控数字员工",
            "status": "运行中",
            "tools": ["任务路由", "审批控制", "日报汇总"],
            "description": "负责接收 HR 请求、协调其他数字员工、判断是否需要人工确认。",
        },
        {
            "id": 2,
            "name": "BOSS Scout",
            "role": "渠道识别员工",
            "status": "半自动",
            "tools": ["截图识别", "文本抽取", "候选人入库"],
            "description": "在用户授权和人工触发下识别 BOSS 页面候选人信息，不绕过平台风控。",
        },
        {
            "id": 3,
            "name": "JD Analyst",
            "role": "岗位分析员工",
            "status": "运行中",
            "tools": ["JD 结构化", "硬性条件拆解", "评分规则维护"],
            "description": "将岗位 JD 转换为可计算的招聘画像和匹配规则。",
        },
        {
            "id": 4,
            "name": "Resume Matcher",
            "role": "简历匹配员工",
            "status": "运行中",
            "tools": ["简历解析", "匹配评分", "风险识别"],
            "description": "对候选人简历和岗位要求进行匹配分析，输出分数和解释。",
        },
        {
            "id": 5,
            "name": "Communication Agent",
            "role": "沟通草稿员工",
            "status": "待审批",
            "tools": ["邀约生成", "追问生成", "礼貌拒绝"],
            "description": "生成对外沟通草稿，所有发送动作默认进入人工审批。",
        },
        {
            "id": 6,
            "name": "Scheduler",
            "role": "定时任务员工",
            "status": "运行中",
            "tools": ["每日巡检", "审批提醒", "人才库复捞"],
            "description": "负责定时触发招聘巡检、消息审批提醒和人才库复捞。",
        },
    ]


PERSONA_NAMES = {
    "sales": "AI销售分身",
    "admin": "AI行政分身",
    "contract": "AI合同分身",
    "finance": "AI财务分身",
    "support": "AI客服分身",
    "manufacturing": "AI制造分身",
    "operations": "AI运营分身",
    "recruiting": "AI招聘分身",
}


PERSONA_STEPS = {
    "sales": ["读取客户线索", "判断客户阶段", "生成跟进话术", "等待销售确认"],
    "admin": ["读取会议/日程", "提取待办事项", "生成纪要", "等待责任人确认"],
    "contract": ["读取合同文本", "识别关键条款", "检查履约风险", "等待法务审批"],
    "finance": ["读取财务指标", "识别异常波动", "生成问数摘要", "等待财务确认"],
    "support": ["读取客户消息", "匹配知识库答案", "生成回复草稿", "等待客服确认"],
    "manufacturing": ["读取产线数据", "识别质量/设备异常", "生成维护建议", "等待负责人确认"],
    "operations": ["读取经营指标", "定位波动原因", "生成复盘建议", "等待运营确认"],
    "recruiting": ["读取候选人信息", "匹配 JD", "生成沟通草稿", "等待 HR 审批"],
}


def create_persona_run(body: dict[str, Any]) -> dict[str, Any]:
    persona_id = body.get("personaId", "sales")
    action = body.get("action", "创建运行任务")
    persona_name = PERSONA_NAMES.get(persona_id, "AI数字分身")
    input_text = body.get("input") or f"{persona_name}执行：{action}"
    outputs = {
        "sales": "已生成 3 条客户跟进建议，并标记 1 个高意向线索需要销售确认。",
        "admin": "已整理会议纪要和 4 个待办事项，待责任人确认后归档。",
        "contract": "已发现 2 个履约风险点和 1 个付款节点提醒，建议进入法务审批。",
        "finance": "已生成费用波动摘要：营销费用环比上升 12%，建议复核投放明细。",
        "support": "已生成客服回复草稿，并将复杂问题转人工处理。",
        "manufacturing": "已识别 1 条设备维护预警，建议安排下次停机窗口检查。",
        "operations": "已输出活动复盘摘要：转化下降主要集中在新客首单环节。",
        "recruiting": "已生成候选人匹配结论和沟通草稿，待 HR 审批。",
    }
    needs_approval = action not in {"配置知识库", "接入业务系统"}
    return {
        "id": int(time.time() * 1000),
        "personaId": persona_id,
        "personaName": persona_name,
        "action": action,
        "input": input_text,
        "output": outputs.get(persona_id, "已完成本次数字分身模拟运行，结果进入人工确认。"),
        "status": "待审批" if needs_approval else "已完成",
        "createdAt": now_text(),
        "steps": PERSONA_STEPS.get(persona_id, ["接收任务", "调用工具", "生成结果", "进入审批"]),
    }


def parse_value(lines: list[str], labels: list[str], fallback: str) -> str:
    for line in lines:
        if any(label in line for label in labels):
            parts = line.replace("：", ":", 1).split(":", 1)
            if len(parts) == 2 and parts[1].strip():
                return parts[1].strip()
    return fallback


def analyze_candidate(text: str, job: dict[str, Any]) -> dict[str, Any]:
    lines = [line.strip() for line in text.replace("；", "\n").replace(";", "\n").splitlines() if line.strip()]
    years = 0
    for token in text.replace("年", " 年").split():
        if token.isdigit():
            years = int(token)
            break
    must_hits = [skill for skill in job["mustHave"] if skill in text]
    nice_hits = [skill for skill in job["niceToHave"] if skill in text]
    score = min(98, round(len(must_hits) * 12 + len(nice_hits) * 7 + min(20, years * 4) + 16))
    if score >= int(job["thresholdInvite"]):
        status = "待邀约"
    elif score >= int(job["thresholdReview"]):
        status = "需追问"
    else:
        status = "礼貌拒绝"
    risks = []
    if len(must_hits) < 3:
        risks.append("核心技能命中不足，需要人工复核")
    if years < int(job["requiredYears"]):
        risks.append("工作年限低于岗位要求")
    if "AI" not in text:
        risks.append("AI 产品经验不明确")
    return {
        "id": int(time.time() * 1000),
        "name": parse_value(lines, ["候选人", "姓名"], "待识别候选人"),
        "role": parse_value(lines, ["当前岗位", "岗位"], "待识别岗位"),
        "company": parse_value(lines, ["公司"], "待识别公司"),
        "city": parse_value(lines, ["城市", "地点"], "待确认"),
        "salary": parse_value(lines, ["期望薪资", "薪资"], "待确认"),
        "years": years,
        "education": parse_value(lines, ["学历"], "待确认"),
        "skills": must_hits + nice_hits or ["待复核"],
        "source": "Python API 识别",
        "raw": text,
        "score": score,
        "status": status,
        "strengths": [
            f"命中 {len(must_hits)} 个核心条件" if must_hits else "暂未命中足够核心条件",
            f"命中 {len(nice_hits)} 个加分项" if nice_hits else "加分项信息较少",
            "经验年限满足要求" if years >= int(job["requiredYears"]) else "经验年限需要确认",
        ],
        "risks": risks or ["暂无明显风险，建议进入邀约审批"],
        "questions": ["请补充一个最能代表你能力的产品案例。", "你在该项目中负责需求、指标、设计和上线中的哪些部分？"],
    }


def create_draft(candidate: dict[str, Any], job: dict[str, Any]) -> dict[str, Any]:
    if candidate["status"] == "待邀约":
        kind = "邀约"
        content = f"{candidate['name']}你好，我看了你的经历，和我们正在招聘的{job['title']}岗位匹配度很高，尤其是{'、'.join(candidate['skills'][:3])}这几块。想和你约一个 20 分钟的初步沟通，了解一下你过往项目和近期机会偏好。你今天或明天哪个时间方便？"
    elif candidate["status"] == "需追问":
        kind = "追问"
        content = f"{candidate['name']}你好，感谢你关注我们的{job['title']}岗位。我想再确认一下：{candidate['questions'][0]} 如果方便的话，可以简单补充一下。"
    else:
        kind = "拒绝"
        content = f"{candidate['name']}你好，感谢你投递和关注。我们认真看了你的经历，目前这个岗位对 AI 产品和 SaaS 产品闭环经验要求会更强一些，现阶段匹配度不是特别高。后续如果有更合适的岗位，我也会优先再联系你，祝你近期求职顺利。"
    return {"id": candidate["id"], "candidateId": candidate["id"], "candidateName": candidate["name"], "type": kind, "content": content, "status": "待审批", "createdAt": now_text()}


class Handler(BaseHTTPRequestHandler):
    server_version = "HirePilotLite/0.1"

    def do_OPTIONS(self) -> None:
        self.send_response(HTTPStatus.NO_CONTENT)
        self.send_headers()
        self.end_headers()

    def do_GET(self) -> None:
        path = urlparse(self.path).path
        if path == "/api/health":
            return self.json({"ok": True, "service": "hirepilot-lite", "db": str(DB_PATH)})
        if not self.authorized():
            return self.json({"error": "unauthorized"}, HTTPStatus.UNAUTHORIZED)
        with connect() as conn:
            if path == "/api/bootstrap":
                return self.json({
                    "job": get_job(conn),
                    "candidates": table_items(conn, "candidates"),
                    "drafts": table_items(conn, "drafts"),
                    "tasks": table_items(conn, "tasks"),
                    "agents": table_items(conn, "agents"),
                    "personaRuns": table_items(conn, "persona_runs"),
                })
            if path == "/api/jobs/current":
                return self.json(get_job(conn))
            if path == "/api/candidates":
                return self.json(table_items(conn, "candidates"))
            if path == "/api/drafts":
                return self.json(table_items(conn, "drafts"))
            if path == "/api/tasks":
                return self.json(table_items(conn, "tasks"))
            if path == "/api/agents":
                return self.json(table_items(conn, "agents"))
            if path == "/api/persona-runs":
                return self.json(table_items(conn, "persona_runs"))
        self.json({"error": "not found"}, HTTPStatus.NOT_FOUND)

    def do_POST(self) -> None:
        path = urlparse(self.path).path
        body = self.read_json()
        if path == "/api/login":
            email = body.get("email", "")
            password = body.get("password", "")
            if email and password:
                token = sign({"sub": email, "role": "admin", "exp": time.time() + 60 * 60 * 12})
                return self.json({"token": token, "user": {"email": email, "role": "admin"}})
            return self.json({"error": "email and password are required"}, HTTPStatus.BAD_REQUEST)
        if not self.authorized():
            return self.json({"error": "unauthorized"}, HTTPStatus.UNAUTHORIZED)
        with connect() as conn:
            if path == "/api/candidates/analyze":
                text = body.get("text", "")
                if not text:
                    return self.json({"error": "text is required"}, HTTPStatus.BAD_REQUEST)
                job = get_job(conn)
                candidate = analyze_candidate(text, job)
                draft = create_draft(candidate, job)
                upsert_item(conn, "candidates", candidate)
                upsert_item(conn, "drafts", draft)
                return self.json({"candidate": candidate, "draft": draft}, HTTPStatus.CREATED)
            if path == "/api/persona-runs":
                run = create_persona_run(body)
                upsert_item(conn, "persona_runs", run)
                return self.json(run, HTTPStatus.CREATED)
        self.json({"error": "not found"}, HTTPStatus.NOT_FOUND)

    def do_PUT(self) -> None:
        path = urlparse(self.path).path
        if not self.authorized():
            return self.json({"error": "unauthorized"}, HTTPStatus.UNAUTHORIZED)
        body = self.read_json()
        with connect() as conn:
            if path == "/api/jobs/current":
                return self.json(set_job(conn, body))
        self.json({"error": "not found"}, HTTPStatus.NOT_FOUND)

    def do_PATCH(self) -> None:
        path = urlparse(self.path).path
        if not self.authorized():
            return self.json({"error": "unauthorized"}, HTTPStatus.UNAUTHORIZED)
        body = self.read_json()
        parts = path.strip("/").split("/")
        if len(parts) != 3 or parts[0] != "api":
            return self.json({"error": "not found"}, HTTPStatus.NOT_FOUND)
        table, raw_id = parts[1], parts[2]
        table_map = {"drafts": "drafts", "tasks": "tasks", "persona-runs": "persona_runs"}
        if table not in table_map:
            return self.json({"error": "not found"}, HTTPStatus.NOT_FOUND)
        db_table = table_map[table]
        with connect() as conn:
            row = conn.execute(f"select data from {db_table} where id = ?", (raw_id,)).fetchone()
            if not row:
                return self.json({"error": "not found"}, HTTPStatus.NOT_FOUND)
            item = json.loads(row["data"])
            item.update(body)
            if table == "tasks" and body.get("runNow"):
                item["lastRun"] = "刚刚"
                item["result"] = "模拟运行完成：识别 6 条，推荐 2 条"
                item.pop("runNow", None)
            upsert_item(conn, db_table, item)
            return self.json(item)

    def authorized(self) -> bool:
        header = self.headers.get("Authorization", "")
        if not header.startswith("Bearer "):
            return False
        return verify(header.removeprefix("Bearer ").strip())

    def read_json(self) -> dict[str, Any]:
        length = int(self.headers.get("Content-Length", "0"))
        if not length:
            return {}
        raw = self.rfile.read(length).decode("utf-8")
        return json.loads(raw)

    def json(self, data: Any, status: HTTPStatus = HTTPStatus.OK) -> None:
        payload = dumps(data).encode("utf-8")
        self.send_response(status)
        self.send_headers(content_type="application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(payload)))
        self.end_headers()
        self.wfile.write(payload)

    def send_headers(self, content_type: str = "text/plain; charset=utf-8") -> None:
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET,POST,PUT,PATCH,OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, Authorization")
        self.send_header("Content-Type", content_type)

    def log_message(self, format: str, *args: Any) -> None:
        print(f"[{now_text()}] {self.address_string()} {format % args}")


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--host", default="127.0.0.1")
    parser.add_argument("--port", default=8787, type=int)
    args = parser.parse_args()
    init_db()
    server = ThreadingHTTPServer((args.host, args.port), Handler)
    print(f"HirePilot backend running on http://{args.host}:{args.port}")
    print(f"SQLite DB: {DB_PATH}")
    server.serve_forever()


if __name__ == "__main__":
    main()
