import {
  BarChart3,
  Bell,
  BriefcaseBusiness,
  CalendarClock,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  Copy,
  Database,
  Eye,
  Factory,
  FileCheck2,
  FileSearch,
  Headphones,
  Inbox,
  LockKeyhole,
  LogOut,
  MessageSquareText,
  Play,
  ScanText,
  Settings,
  ShieldCheck,
  Sparkles,
  Truck,
  Upload,
  UserRoundCheck,
  Users,
  WalletCards,
  XCircle,
} from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import type { ChangeEvent, CSSProperties, ReactNode } from 'react'
import './App.css'

const API_BASE = 'http://127.0.0.1:8787/api'

type View = 'matrix' | 'personaModule' | 'hr' | 'recognition' | 'jobs' | 'messages' | 'schedule' | 'agents' | 'settings'
type CandidateStatus = '待分析' | '待邀约' | '需追问' | '礼貌拒绝'
type DraftStatus = '待审批' | '已通过' | '已驳回'

type PersonaId = 'sales' | 'admin' | 'contract' | 'finance' | 'support' | 'manufacturing' | 'operations' | 'recruiting'

type Persona = {
  id: PersonaId
  name: string
  shortName: string
  icon: ReactNode
  accent: string
  description: string
  scenarios: string[]
  status: '已启用' | '建设中'
  owner: string
}

type JobProfile = {
  title: string
  department: string
  location: string
  salary: string
  requiredYears: number
  thresholdInvite: number
  thresholdReview: number
  mustHave: string[]
  niceToHave: string[]
  blockers: string[]
}

type Candidate = {
  id: number
  name: string
  role: string
  company: string
  city: string
  salary: string
  years: number
  education: string
  skills: string[]
  source: string
  raw: string
  score: number
  status: CandidateStatus
  strengths: string[]
  risks: string[]
  questions: string[]
}

type MessageDraft = {
  id: number
  candidateId: number
  candidateName: string
  type: '邀约' | '追问' | '拒绝'
  content: string
  status: DraftStatus
  createdAt: string
}

type ScheduleTask = {
  id: number
  name: string
  time: string
  channel: string
  enabled: boolean
  lastRun: string
  result: string
}

type AgentWorker = {
  id: number
  name: string
  role: string
  status: string
  tools: string[]
  description: string
}

type PersonaRunStatus = '待审批' | '已完成' | '已驳回' | '已归档'

type PersonaRun = {
  id: number
  personaId: PersonaId
  personaName: string
  action: string
  input: string
  output: string
  status: PersonaRunStatus
  createdAt: string
  steps: string[]
}

const personas: Persona[] = [
  { id: 'sales', name: 'AI销售分身', shortName: '销售', icon: <BriefcaseBusiness size={24} />, accent: '#38bdf8', description: '客户跟进、线索分级、话术生成、销售日报。', scenarios: ['客户跟进', '话术生成', '商机提醒'], status: '已启用', owner: '销售部' },
  { id: 'admin', name: 'AI行政分身', shortName: '行政', icon: <ClipboardCheck size={24} />, accent: '#facc15', description: '日程提醒、会议纪要、访客与资产流程。', scenarios: ['日程提醒', '会议纪要', '流程通知'], status: '已启用', owner: '行政部' },
  { id: 'contract', name: 'AI合同分身', shortName: '合同', icon: <FileCheck2 size={24} />, accent: '#34d399', description: '合同审查、履约预警、条款摘要和风险提示。', scenarios: ['合同审查', '履约预警', '风险摘要'], status: '已启用', owner: '法务部' },
  { id: 'finance', name: 'AI财务分身', shortName: '财务', icon: <BarChart3 size={24} />, accent: '#fb7185', description: '智能问数、费用分析、报表生成和异常提醒。', scenarios: ['智能问数', '报表生成', '费用分析'], status: '已启用', owner: '财务部' },
  { id: 'support', name: 'AI客服分身', shortName: '客服', icon: <Headphones size={24} />, accent: '#22d3ee', description: '多渠道客服、知识库问答、工单分流和 7x24 在线。', scenarios: ['多渠道接待', '知识库问答', '工单分流'], status: '已启用', owner: '客服部' },
  { id: 'manufacturing', name: 'AI制造分身', shortName: '制造', icon: <Factory size={24} />, accent: '#94a3b8', description: '质检分析、设备预警、产线数据和预测维护。', scenarios: ['质检分析', '预测维护', '产线日报'], status: '已启用', owner: '制造部' },
  { id: 'operations', name: 'AI运营分身', shortName: '运营', icon: <Truck size={24} />, accent: '#2dd4bf', description: '车队管理、用电分析、活动复盘和经营看板。', scenarios: ['经营看板', '用电分析', '活动复盘'], status: '已启用', owner: '运营部' },
  { id: 'recruiting', name: 'AI招聘分身', shortName: '招聘', icon: <Users size={24} />, accent: '#8b5cf6', description: '简历筛选、人才画像、邀约草稿和招聘漏斗。', scenarios: ['简历筛选', '人才画像', '邀约审批'], status: '已启用', owner: 'HR' },
]

const defaultJob: JobProfile = {
  title: 'AI 产品经理',
  department: '增长与智能化',
  location: '上海 / 远程混合',
  salary: '25K-40K',
  requiredYears: 3,
  thresholdInvite: 85,
  thresholdReview: 65,
  mustHave: ['AI 产品', 'SaaS', '数据分析', '用户研究', '原型设计'],
  niceToHave: ['招聘系统', 'Agent', 'B 端产品', '增长实验'],
  blockers: ['无产品闭环经验', '只做项目交付', '不能接受混合办公'],
}

const sampleBossText = `候选人：林晨
当前岗位：高级产品经理
公司：某 B2B SaaS 创业公司
城市：上海
经验：5年
学历：本科
期望薪资：30K-38K
技能：AI 产品, SaaS, 数据分析, 用户研究, 原型设计, 增长实验
最近消息：你好，我对 AI 产品经理岗位比较感兴趣，之前做过智能客服和销售自动化产品。`

const seedCandidates: Candidate[] = [
  {
    id: 1,
    name: '林晨',
    role: '高级产品经理',
    company: '某 B2B SaaS 创业公司',
    city: '上海',
    salary: '30K-38K',
    years: 5,
    education: '本科',
    skills: ['AI 产品', 'SaaS', '数据分析', '用户研究', '原型设计', '增长实验'],
    source: 'BOSS 截图识别',
    raw: sampleBossText,
    score: 92,
    status: '待邀约',
    strengths: ['AI 产品和 SaaS 经验直接命中', '薪资期望在预算内', '有增长实验经验'],
    risks: ['需要确认是否有从 0 到 1 产品闭环'],
    questions: ['能否介绍一个你主导的 AI 产品从需求到上线的完整案例？'],
  },
  {
    id: 2,
    name: '周然',
    role: '项目经理',
    company: '传统软件外包公司',
    city: '苏州',
    salary: '22K-28K',
    years: 6,
    education: '本科',
    skills: ['项目管理', '客户沟通', '交付管理', '需求文档'],
    source: '手动粘贴',
    raw: '项目经理，6年，传统软件外包，擅长交付管理和需求文档。',
    score: 48,
    status: '礼貌拒绝',
    strengths: ['沟通和项目推进经验较强'],
    risks: ['缺少 AI 产品经验', '缺少 SaaS 和数据分析经历', '更偏项目交付而非产品闭环'],
    questions: ['是否有独立负责产品规划、指标设计和迭代决策的经历？'],
  },
  {
    id: 3,
    name: '许安',
    role: '产品经理',
    company: '招聘科技公司',
    city: '杭州',
    salary: '28K-35K',
    years: 4,
    education: '硕士',
    skills: ['招聘系统', 'B 端产品', '数据分析', '原型设计', '用户研究'],
    source: 'BOSS 对话页',
    raw: '招聘科技公司产品经理，做过 ATS、人才库、面试流程产品。',
    score: 78,
    status: '需追问',
    strengths: ['招聘系统和 B 端产品经验是强加分项', '数据分析和用户研究能力匹配'],
    risks: ['AI 产品经验不明确', '需要确认是否愿意来上海或混合办公'],
    questions: ['你是否做过 AI 简历解析、候选人推荐或自动化沟通相关功能？'],
  },
]

const seedTasks: ScheduleTask[] = [
  { id: 1, name: '每日候选人识别提醒', time: '09:00', channel: '站内 + 企业微信', enabled: true, lastRun: '今天 09:00', result: '处理 18 条，推荐 5 条' },
  { id: 2, name: '待审批消息汇总', time: '17:30', channel: '站内', enabled: true, lastRun: '昨天 17:30', result: '待审批 7 条' },
  { id: 3, name: '人才库复捞', time: '周一 10:00', channel: '邮件', enabled: false, lastRun: '未运行', result: '关闭中' },
]

const seedAgents: AgentWorker[] = [
  { id: 1, name: 'HR Coordinator', role: '主控数字员工', status: '运行中', tools: ['任务路由', '审批控制', '日报汇总'], description: '负责接收 HR 请求、协调其他数字员工、判断是否需要人工确认。' },
  { id: 2, name: 'BOSS Scout', role: '渠道识别员工', status: '半自动', tools: ['截图识别', '文本抽取', '候选人入库'], description: '在用户授权和人工触发下识别 BOSS 页面候选人信息，不绕过平台风控。' },
  { id: 3, name: 'JD Analyst', role: '岗位分析员工', status: '运行中', tools: ['JD 结构化', '硬性条件拆解', '评分规则维护'], description: '将岗位 JD 转换为可计算的招聘画像和匹配规则。' },
  { id: 4, name: 'Resume Matcher', role: '简历匹配员工', status: '运行中', tools: ['简历解析', '匹配评分', '风险识别'], description: '对候选人简历和岗位要求进行匹配分析，输出分数和解释。' },
  { id: 5, name: 'Communication Agent', role: '沟通草稿员工', status: '待审批', tools: ['邀约生成', '追问生成', '礼貌拒绝'], description: '生成对外沟通草稿，所有发送动作默认进入人工审批。' },
  { id: 6, name: 'Scheduler', role: '定时任务员工', status: '运行中', tools: ['每日巡检', '审批提醒', '人才库复捞'], description: '负责定时触发招聘巡检、消息审批提醒和人才库复捞。' },
]

function useStoredState<T>(key: string, initialValue: T) {
  const [value, setValue] = useState<T>(() => {
    const stored = localStorage.getItem(key)
    return stored ? (JSON.parse(stored) as T) : initialValue
  })

  useEffect(() => {
    localStorage.setItem(key, JSON.stringify(value))
  }, [key, value])

  return [value, setValue] as const
}

async function apiRequest<T>(path: string, token: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  })
  if (!response.ok) {
    throw new Error(`API ${response.status}`)
  }
  return response.json() as Promise<T>
}

function parseCandidate(text: string, id: number, job: JobProfile): Candidate {
  const lines = text.split(/\n|；|;/).map((line) => line.trim()).filter(Boolean)
  const findValue = (labels: string[], fallback: string) => {
    const hit = lines.find((line) => labels.some((label) => line.includes(label)))
    return hit?.split(/[:：]/).slice(1).join('：').trim() || fallback
  }
  const yearsMatch = text.match(/(\d+)\s*年/)
  const years = yearsMatch ? Number(yearsMatch[1]) : 0
  const mustHits = job.mustHave.filter((skill) => text.includes(skill)).length
  const niceHits = job.niceToHave.filter((skill) => text.includes(skill)).length
  const skills = job.mustHave.concat(job.niceToHave).filter((skill) => text.includes(skill))
  const score = Math.min(98, Math.round(mustHits * 12 + niceHits * 7 + Math.min(20, years * 4) + 16))
  const status: CandidateStatus = score >= job.thresholdInvite ? '待邀约' : score >= job.thresholdReview ? '需追问' : '礼貌拒绝'
  const risks = [
    mustHits < 3 ? '核心技能命中不足，需要人工复核' : '',
    years < job.requiredYears ? '工作年限低于岗位要求' : '',
    !text.includes('AI') ? 'AI 产品经验不明确' : '',
  ].filter(Boolean)

  return {
    id,
    name: findValue(['候选人', '姓名'], `候选人 ${id}`),
    role: findValue(['当前岗位', '岗位'], '待识别岗位'),
    company: findValue(['公司'], '待识别公司'),
    city: findValue(['城市', '地点'], '待确认'),
    salary: findValue(['期望薪资', '薪资'], '待确认'),
    years,
    education: findValue(['学历'], '待确认'),
    skills: skills.length ? skills : ['待复核'],
    source: '视觉/文本识别',
    raw: text,
    score,
    status,
    strengths: [
      mustHits > 0 ? `命中 ${mustHits} 个核心条件` : '暂未命中足够核心条件',
      niceHits > 0 ? `命中 ${niceHits} 个加分项` : '加分项信息较少',
      years >= job.requiredYears ? '经验年限满足要求' : '经验年限需要确认',
    ],
    risks: risks.length ? risks : ['暂无明显风险，建议进入邀约审批'],
    questions: ['请补充一个最能代表你能力的产品案例。', '你在该项目中负责需求、指标、设计和上线中的哪些部分？'],
  }
}

function buildMessage(candidate: Candidate, job: JobProfile) {
  if (candidate.status === '待邀约') {
    return `${candidate.name}你好，我看了你的经历，和我们正在招聘的${job.title}岗位匹配度很高，尤其是${candidate.skills.slice(0, 3).join('、')}这几块。想和你约一个 20 分钟的初步沟通，了解一下你过往项目和近期机会偏好。你今天或明天哪个时间方便？`
  }
  if (candidate.status === '需追问') {
    return `${candidate.name}你好，感谢你关注我们的${job.title}岗位。我想再确认一下：${candidate.questions[0]} 如果方便的话，可以简单补充一下。`
  }
  return `${candidate.name}你好，感谢你投递和关注。我们认真看了你的经历，目前这个岗位对 AI 产品和 SaaS 产品闭环经验要求会更强一些，现阶段匹配度不是特别高。后续如果有更合适的岗位，我也会优先再联系你，祝你近期求职顺利。`
}

function createDraft(candidate: Candidate, job: JobProfile): MessageDraft {
  return {
    id: candidate.id,
    candidateId: candidate.id,
    candidateName: candidate.name,
    type: candidate.status === '待邀约' ? '邀约' : candidate.status === '需追问' ? '追问' : '拒绝',
    content: buildMessage(candidate, job),
    status: '待审批',
    createdAt: new Date().toLocaleString('zh-CN', { hour12: false }),
  }
}

function createPersonaRun(persona: Persona, action: string): PersonaRun {
  const outputs: Record<PersonaId, string> = {
    sales: '已生成 3 条客户跟进建议，并标记 1 个高意向线索需要销售确认。',
    admin: '已整理会议纪要和 4 个待办事项，待责任人确认后归档。',
    contract: '已发现 2 个履约风险点和 1 个付款节点提醒，建议进入法务审批。',
    finance: '已生成费用波动摘要：营销费用环比上升 12%，建议复核投放明细。',
    support: '已生成客服回复草稿，并将复杂问题转人工处理。',
    manufacturing: '已识别 1 条设备维护预警，建议安排下次停机窗口检查。',
    operations: '已输出活动复盘摘要：转化下降主要集中在新客首单环节。',
    recruiting: '已生成候选人匹配结论和沟通草稿，待 HR 审批。',
  }
  return {
    id: Date.now(),
    personaId: persona.id,
    personaName: persona.name,
    action,
    input: `${persona.owner} / ${persona.scenarios.join('、')}`,
    output: outputs[persona.id],
    status: action === '创建运行任务' ? '待审批' : '已完成',
    createdAt: new Date().toLocaleString('zh-CN', { hour12: false }),
    steps: moduleWorkflow(persona.id).slice(0, 4),
  }
}

function App() {
  const [isAuthed, setIsAuthed] = useStoredState('hirepilot-auth', false)
  const [token, setToken] = useStoredState('hirepilot-token', '')
  const [apiStatus, setApiStatus] = useState('连接 Python 后端中')
  const [view, setView] = useState<View>('matrix')
  const [activePersona, setActivePersona] = useStoredState<PersonaId>('hirepilot-persona', 'recruiting')
  const [job, setJob] = useStoredState<JobProfile>('hirepilot-job', defaultJob)
  const [candidates, setCandidates] = useStoredState<Candidate[]>('hirepilot-candidates', seedCandidates)
  const [drafts, setDrafts] = useStoredState<MessageDraft[]>('hirepilot-drafts', seedCandidates.map((candidate) => createDraft(candidate, defaultJob)))
  const [tasks, setTasks] = useStoredState<ScheduleTask[]>('hirepilot-tasks', seedTasks)
  const [agents, setAgents] = useStoredState<AgentWorker[]>('hirepilot-agents', seedAgents)
  const [personaRuns, setPersonaRuns] = useStoredState<PersonaRun[]>('hirepilot-persona-runs', [])
  const [selectedId, setSelectedId] = useState(seedCandidates[0].id)
  const [inputText, setInputText] = useState(sampleBossText)
  const [preview, setPreview] = useState<string | null>(null)
  const [copiedId, setCopiedId] = useState<number | null>(null)

  const activePersonaData = personas.find((persona) => persona.id === activePersona) || personas[7]

  useEffect(() => {
    const hrOnlyViews: View[] = ['hr', 'recognition', 'jobs', 'messages', 'schedule']
    if (activePersonaData.id !== 'recruiting' && hrOnlyViews.includes(view)) {
      setView('personaModule')
    }
  }, [activePersonaData.id, view])

  const loadBootstrap = useCallback(async (authToken: string) => {
    if (!authToken) return
    try {
      const data = await apiRequest<{ job: JobProfile; candidates: Candidate[]; drafts: MessageDraft[]; tasks: ScheduleTask[]; agents?: AgentWorker[]; personaRuns?: PersonaRun[] }>('/bootstrap', authToken)
      setJob(data.job)
      setCandidates(data.candidates)
      setDrafts(data.drafts)
      setTasks(data.tasks)
      setAgents(data.agents || seedAgents)
      setPersonaRuns(data.personaRuns || [])
      setSelectedId(data.candidates[0]?.id || seedCandidates[0].id)
      setApiStatus('Python 后端已连接')
    } catch {
      setApiStatus('后端未连接，正在使用本地演示数据')
    }
  }, [setAgents, setCandidates, setDrafts, setJob, setPersonaRuns, setTasks])

  useEffect(() => {
    if (isAuthed && token) {
      void loadBootstrap(token)
    }
  }, [isAuthed, loadBootstrap, token])

  const selected = candidates.find((candidate) => candidate.id === selectedId) || candidates[0]
  const stats = useMemo(() => {
    const avg = candidates.length ? Math.round(candidates.reduce((sum, candidate) => sum + candidate.score, 0) / candidates.length) : 0
    return {
      total: candidates.length,
      invite: candidates.filter((candidate) => candidate.status === '待邀约').length,
      review: candidates.filter((candidate) => candidate.status === '需追问').length,
      reject: candidates.filter((candidate) => candidate.status === '礼貌拒绝').length,
      avg,
    }
  }, [candidates])

  if (!isAuthed) {
    return <LoginScreen onLogin={async (email, password) => {
      try {
        const data = await apiRequest<{ token: string }>('/login', '', {
          method: 'POST',
          body: JSON.stringify({ email, password }),
        })
        setToken(data.token)
        setIsAuthed(true)
        await loadBootstrap(data.token)
      } catch {
        setToken('')
        setApiStatus('后端未连接，正在使用本地演示数据')
        setIsAuthed(true)
      }
    }} />
  }

  const openPersona = (personaId: PersonaId) => {
    setActivePersona(personaId)
    setView(personaId === 'recruiting' ? 'hr' : 'personaModule')
  }

  const analyze = async () => {
    if (token) {
      try {
        const result = await apiRequest<{ candidate: Candidate; draft: MessageDraft }>('/candidates/analyze', token, {
          method: 'POST',
          body: JSON.stringify({ text: inputText }),
        })
        setCandidates((current) => [result.candidate, ...current])
        setDrafts((current) => [result.draft, ...current])
        setSelectedId(result.candidate.id)
        setView('hr')
        setApiStatus('Python 后端已连接')
        return
      } catch {
        setApiStatus('后端分析失败，已回退到前端规则')
      }
    }
    const candidate = parseCandidate(inputText, Date.now(), job)
    setCandidates((current) => [candidate, ...current])
    setDrafts((current) => [createDraft(candidate, job), ...current])
    setSelectedId(candidate.id)
    setView('hr')
  }

  const handleImage = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      setPreview(String(reader.result))
      setInputText((current) => `${current}\n截图已载入：${file.name}\n真实上线后这里会走 OCR/视觉模型抽取字段。`)
    }
    reader.readAsDataURL(file)
  }

  const updateDraft = async (id: number, status: DraftStatus) => {
    if (token) {
      try {
        const updated = await apiRequest<MessageDraft>(`/drafts/${id}`, token, {
          method: 'PATCH',
          body: JSON.stringify({ status }),
        })
        setDrafts((current) => current.map((draft) => (draft.id === id ? updated : draft)))
        setApiStatus('Python 后端已连接')
        return
      } catch {
        setApiStatus('后端审批失败，已回退到本地状态')
      }
    }
    setDrafts((current) => current.map((draft) => (draft.id === id ? { ...draft, status } : draft)))
  }

  const runPersonaTask = async (persona: Persona, action: string) => {
    if (token) {
      try {
        const run = await apiRequest<PersonaRun>('/persona-runs', token, {
          method: 'POST',
          body: JSON.stringify({ personaId: persona.id, action, input: `${persona.name} / ${action}` }),
        })
        setPersonaRuns((current) => [run, ...current])
        setApiStatus('Python 后端已连接')
        return
      } catch {
        setApiStatus('分身任务后端同步失败，已回退到本地记录')
      }
    }
    setPersonaRuns((current) => [createPersonaRun(persona, action), ...current])
  }

  const updatePersonaRun = async (id: number, status: PersonaRunStatus) => {
    if (token) {
      try {
        const updated = await apiRequest<PersonaRun>(`/persona-runs/${id}`, token, {
          method: 'PATCH',
          body: JSON.stringify({ status }),
        })
        setPersonaRuns((current) => current.map((run) => (run.id === id ? updated : run)))
        setApiStatus('Python 后端已连接')
        return
      } catch {
        setApiStatus('分身审批后端同步失败，已回退到本地状态')
      }
    }
    setPersonaRuns((current) => current.map((run) => (run.id === id ? { ...run, status } : run)))
  }

  const updateJob = (nextJob: JobProfile) => {
    setJob(nextJob)
    if (token) {
      void apiRequest<JobProfile>('/jobs/current', token, {
        method: 'PUT',
        body: JSON.stringify(nextJob),
      }).then(() => setApiStatus('Python 后端已连接')).catch(() => setApiStatus('岗位已本地保存，后端同步失败'))
    }
  }

  const copyDraft = async (draft: MessageDraft) => {
    await navigator.clipboard.writeText(draft.content)
    setCopiedId(draft.id)
    window.setTimeout(() => setCopiedId(null), 1200)
  }

  if (view === 'matrix') {
    return (
      <main className="platform-shell">
        <PlatformHeader apiStatus={apiStatus} onLogout={() => setIsAuthed(false)} />
        <PersonaMatrix activePersona={activePersonaData} onOpen={openPersona} />
      </main>
    )
  }

  return (
    <main className="app-shell">
      <Sidebar active={view} activePersona={activePersonaData} onChange={setView} onLogout={() => setIsAuthed(false)} />
      <section className="workspace">
        <header className="topbar">
          <div>
            <p className="eyebrow">企业分身矩阵 · {apiStatus}</p>
            <h1>{viewTitle(view, activePersonaData)}</h1>
          </div>
          {activePersonaData.id === 'recruiting' ? (
            <button className="primary-action" type="button" onClick={() => setView('messages')}>
              <Bell size={18} />
              {drafts.filter((draft) => draft.status === '待审批').length} 条待审批
            </button>
          ) : (
            <button className="primary-action" type="button" onClick={() => setView('personaModule')}>
              <Bell size={18} />
              {personaRuns.filter((run) => run.personaId === activePersonaData.id && run.status === '待审批').length} 条分身审批
            </button>
          )}
        </header>

        {view === 'personaModule' && <PersonaModule persona={activePersonaData} runs={personaRuns.filter((run) => run.personaId === activePersonaData.id)} onRun={runPersonaTask} onUpdateRun={updatePersonaRun} />}
        {view === 'hr' && (
          <>
            <PersonaStrip persona={activePersonaData} />
            <Metrics stats={stats} />
            <BusinessLoop />
            <section className="main-grid">
              <RecognitionPanel inputText={inputText} preview={preview} onAnalyze={analyze} onImage={handleImage} onText={setInputText} />
              <JobPanel job={job} />
              <CandidateQueue candidates={candidates} selectedId={selected.id} onSelect={setSelectedId} />
              <CandidateDetail candidate={selected} job={job} />
            </section>
          </>
        )}
        {view === 'recognition' && (
          <section className="wide-grid">
            <RecognitionPanel inputText={inputText} preview={preview} onAnalyze={analyze} onImage={handleImage} onText={setInputText} />
            <div className="panel">
              <div className="panel-heading"><div><p className="eyebrow">上线接入</p><h2>识别服务流水线</h2></div><span className="status-pill">Backend ready</span></div>
              <Pipeline />
            </div>
          </section>
        )}
        {view === 'jobs' && <JobEditor job={job} onChange={updateJob} />}
        {view === 'messages' && <MessageCenter drafts={drafts} copiedId={copiedId} onCopy={copyDraft} onUpdate={updateDraft} />}
        {view === 'schedule' && <ScheduleCenter tasks={tasks} token={token} onStatus={setApiStatus} onChange={setTasks} />}
        {view === 'agents' && <AgentCenter agents={agents} />}
        {view === 'settings' && <SettingsPanel />}
      </section>
    </main>
  )
}

function viewTitle(view: View, persona: Persona) {
  return {
    matrix: '企业 AGI 数字分身矩阵',
    personaModule: `${persona.name}工作台`,
    hr: `${persona.name}工作台`,
    recognition: 'BOSS 识别中心',
    jobs: 'JD 管理与匹配规则',
    messages: '消息审批中心',
    schedule: '定时任务与数字员工运行',
    agents: '多数字员工编排中心',
    settings: '登录、安全与上线配置',
  }[view]
}

function LoginScreen({ onLogin }: { onLogin: (email: string, password: string) => Promise<void> }) {
  const [email, setEmail] = useState('hr@company.com')
  const [password, setPassword] = useState('demo123456')
  return (
    <main className="login-shell">
      <section className="login-panel">
        <div className="brand login-brand"><div className="brand-mark"><Sparkles size={22} /></div><div><strong>AGI Matrix</strong><span>企业数字分身平台</span></div></div>
        <div><p className="eyebrow">Demo auth</p><h1>登录企业分身控制台</h1><p className="login-copy">当前是前端演示登录。上线后接入企业账号、JWT 会话、权限角色和操作审计。</p></div>
        <label><span>邮箱</span><input value={email} onChange={(event) => setEmail(event.target.value)} /></label>
        <label><span>密码</span><input value={password} type="password" onChange={(event) => setPassword(event.target.value)} /></label>
        <button className="primary-action login-button" type="button" onClick={() => void onLogin(email, password)}><LockKeyhole size={18} />进入控制台</button>
      </section>
    </main>
  )
}

function PlatformHeader({ apiStatus, onLogout }: { apiStatus: string; onLogout: () => void }) {
  return (
    <header className="platform-header">
      <div className="brand platform-brand">
        <div className="brand-mark"><Sparkles size={22} /></div>
        <div><strong>AGI Matrix</strong><span>企业数字分身平台</span></div>
      </div>
      <div className="platform-status">
        <span>{apiStatus}</span>
        <button className="logout-button light" type="button" onClick={onLogout}><LogOut size={17} />退出登录</button>
      </div>
    </header>
  )
}

function Sidebar({ active, activePersona, onChange, onLogout }: { active: View; activePersona: Persona; onChange: (view: View) => void; onLogout: () => void }) {
  const currentPersonaView: View = activePersona.id === 'recruiting' ? 'hr' : 'personaModule'
  const hrNavItems = [
    { id: 'matrix', view: 'matrix' as const, icon: Sparkles, label: '分身矩阵' },
    { id: 'current', view: currentPersonaView, icon: Users, label: '当前分身' },
    { id: 'recognition', view: 'recognition' as const, icon: ScanText, label: 'BOSS 识别' },
    { id: 'jobs', view: 'jobs' as const, icon: BriefcaseBusiness, label: 'JD 管理' },
    { id: 'messages', view: 'messages' as const, icon: MessageSquareText, label: '消息审批' },
    { id: 'schedule', view: 'schedule' as const, icon: CalendarClock, label: '定时任务' },
    { id: 'agents', view: 'agents' as const, icon: UserRoundCheck, label: '编排中心' },
    { id: 'settings', view: 'settings' as const, icon: Settings, label: '上线配置' },
  ]
  const personaNavItems = [
    { id: 'matrix', view: 'matrix' as const, icon: Sparkles, label: '分身矩阵' },
    { id: 'current', view: currentPersonaView, icon: Users, label: '当前分身' },
    ...activePersona.scenarios.map((scenario, index) => ({ id: `scenario-${index}`, view: 'personaModule' as const, icon: personaScenarioIcon(activePersona.id, index), label: scenario })),
    { id: 'agents', view: 'agents' as const, icon: UserRoundCheck, label: '编排中心' },
    { id: 'settings', view: 'settings' as const, icon: Settings, label: '上线配置' },
  ]
  const navItems = activePersona.id === 'recruiting' ? hrNavItems : personaNavItems
  return (
    <aside className="sidebar">
      <div className="brand"><div className="brand-mark"><Sparkles size={22} /></div><div><strong>AGI Matrix</strong><span>企业数字分身平台</span></div></div>
      <div className="active-persona-card" style={{ '--persona-color': activePersona.accent } as CSSProperties}>
        <div>{activePersona.icon}</div>
        <strong>{activePersona.name}</strong>
        <span>{activePersona.owner} · 专属工作台</span>
      </div>
      <nav>{navItems.map(({ id, view, icon: Icon, label }) => <button className={active === view && !id.startsWith('scenario-') ? 'nav-active' : ''} key={id} type="button" onClick={() => onChange(view)}><Icon size={18} />{label}</button>)}</nav>
      <div className="guardrail"><ShieldCheck size={18} /><p>每个分身独立配置工具、权限、审批流；外发动作默认人工确认。</p></div>
      <button className="logout-button" type="button" onClick={onLogout}><LogOut size={17} />退出登录</button>
    </aside>
  )
}

function personaScenarioIcon(personaId: PersonaId, index: number) {
  if (personaId === 'finance') return index === 0 ? BarChart3 : index === 1 ? FileCheck2 : Database
  if (personaId === 'sales') return index === 0 ? BriefcaseBusiness : index === 1 ? MessageSquareText : Bell
  if (personaId === 'admin') return index === 0 ? CalendarClock : index === 1 ? ClipboardCheck : Bell
  if (personaId === 'contract') return index === 0 ? FileCheck2 : index === 1 ? CalendarClock : ShieldCheck
  if (personaId === 'support') return index === 0 ? Headphones : index === 1 ? Database : MessageSquareText
  if (personaId === 'manufacturing') return index === 0 ? Factory : index === 1 ? Bell : BarChart3
  if (personaId === 'operations') return index === 0 ? Truck : index === 1 ? BarChart3 : ClipboardCheck
  return Users
}

function PersonaMatrix({ activePersona, onOpen }: { activePersona: Persona; onOpen: (personaId: PersonaId) => void }) {
  return (
    <>
      <section className="matrix-hero">
        <div className="hero-copy">
          <span>AGI Matrix · Enterprise Agent OS</span>
          <h2>企业数字员工调度中心</h2>
          <p>统一管理 HR、销售、财务、客服、行政、合同、制造、运营等数字分身。每个身份拥有独立工作台、任务队列、审批链路和业务记录。</p>
          <div className="hero-badges"><strong>8 个部门分身</strong><strong>任务队列</strong><strong>审批留痕</strong><strong>本地轻量后端</strong></div>
        </div>
        <div className="hero-console" aria-hidden="true">
          <div><span></span><span></span><span></span></div>
          <code>agent.router.select("finance")</code>
          <code>task.queue.push(run)</code>
          <code>approval.require("human")</code>
          <code>audit.write(result)</code>
        </div>
      </section>
      <section className="persona-grid">
        {personas.map((persona) => (
          <button className={persona.id === activePersona.id ? 'persona-card selected' : 'persona-card'} key={persona.id} type="button" onClick={() => onOpen(persona.id)} style={{ '--persona-color': persona.accent } as CSSProperties}>
            <div className="persona-icon">{persona.icon}</div>
            <h3>{persona.name}</h3>
            <p>{persona.scenarios.slice(0, 2).join(' · ')}</p>
            <span>{persona.owner}工作台</span>
          </button>
        ))}
      </section>
    </>
  )
}

function PersonaModule({ persona, runs, onRun, onUpdateRun }: { persona: Persona; runs: PersonaRun[]; onRun: (persona: Persona, action: string) => void | Promise<void>; onUpdateRun: (id: number, status: PersonaRunStatus) => void | Promise<void> }) {
  const visibleRuns = runs.filter((run) => run.status !== '已归档')
  const [activeRunIndex, setActiveRunIndex] = useState(0)
  const activeRun = visibleRuns[activeRunIndex] || visibleRuns[0]
  const pendingRuns = visibleRuns.filter((run) => run.status === '待审批').length
  useEffect(() => {
    setActiveRunIndex(0)
  }, [persona.id, visibleRuns.length])
  const moveRun = (step: number) => {
    if (!visibleRuns.length) return
    setActiveRunIndex((current) => (current + step + visibleRuns.length) % visibleRuns.length)
  }
  return (
    <>
      <PersonaStrip persona={persona} />
      <section className="module-grid">
        <ModuleMetric label="今日待处理" value={pendingRuns + (persona.id === 'finance' ? 12 : persona.id === 'sales' ? 26 : 8)} />
        <ModuleMetric label="自动处理率" value={persona.id === 'support' ? '71%' : '64%'} />
        <ModuleMetric label="需人工审批" value={pendingRuns || (persona.id === 'contract' ? 5 : 3)} />
        <ModuleMetric label="运行记录" value={visibleRuns.length} />
      </section>
      <section className="wide-grid persona-blueprint">
        <div className="panel">
          <div className="panel-heading"><div><p className="eyebrow">{persona.owner}</p><h2>{persona.name}模块工作台</h2></div><span className="status-pill">{persona.status}</span></div>
          <p className="agent-description">{persona.description}</p>
          <TagGroup title="核心场景" items={persona.scenarios} />
          <div className="module-actions">
            <button type="button" onClick={() => void onRun(persona, '配置知识库')}>配置知识库</button>
            <button type="button" onClick={() => void onRun(persona, '接入业务系统')}>接入业务系统</button>
            <button className="approve" type="button" onClick={() => void onRun(persona, '创建运行任务')}><Play size={15} />创建运行任务</button>
          </div>
        </div>
        <div className="panel run-log-panel">
          <div className="panel-heading">
            <div><p className="eyebrow">Task queue</p><h2>分身任务队列</h2></div>
            <span className="status-pill">{pendingRuns} 条待审批</span>
          </div>
          {activeRun ? (
            <article className="run-card run-carousel" key={activeRun.id}>
              <header>
                <div><strong>{activeRun.action}</strong><small>{activeRun.createdAt}</small></div>
                <span className={`status-pill ${activeRun.status === '已完成' ? 'strong' : ''}`}>{activeRun.status}</span>
              </header>
              <p className="run-output">{activeRun.output}</p>
              <Pipeline items={activeRun.steps} />
              <footer>
                <div className="run-switcher">
                  <button type="button" onClick={() => moveRun(-1)} disabled={visibleRuns.length < 2}><ChevronLeft size={15} />上一条</button>
                  <span>{activeRunIndex + 1} / {visibleRuns.length}</span>
                  <button type="button" onClick={() => moveRun(1)} disabled={visibleRuns.length < 2}>下一条<ChevronRight size={15} /></button>
                </div>
                <div className="draft-actions">
                  {activeRun.status === '待审批' && <button type="button" onClick={() => void onUpdateRun(activeRun.id, '已驳回')}>驳回</button>}
                  {activeRun.status === '待审批' && <button className="approve" type="button" onClick={() => void onUpdateRun(activeRun.id, '已完成')}>通过</button>}
                  {activeRun.status !== '待审批' && <button type="button" onClick={() => void onUpdateRun(activeRun.id, '已归档')}>归档</button>}
                </div>
              </footer>
              <div className="run-dots">
                {visibleRuns.map((run, index) => (
                  <button className={index === activeRunIndex ? 'active' : ''} key={run.id} type="button" onClick={() => setActiveRunIndex(index)} aria-label={`切换到第 ${index + 1} 条任务`} />
                ))}
              </div>
            </article>
          ) : (
            <p className="empty-copy">还没有运行记录，点击左侧“创建运行任务”先跑一条业务流程。</p>
          )}
        </div>
        <div className="panel">
          <div className="panel-heading"><div><p className="eyebrow">Workflow</p><h2>模块运行流程</h2></div><WalletCards size={20} /></div>
          <Pipeline items={moduleWorkflow(persona.id)} />
        </div>
        <div className="panel">
          <div className="panel-heading"><div><p className="eyebrow">Tools</p><h2>工具与权限边界</h2></div><ShieldCheck size={20} /></div>
          <Pipeline items={['只读取授权数据', '外发动作进入审批', '记录工具调用日志', '按部门角色控制权限']} />
        </div>
        <div className="panel">
          <div className="panel-heading"><div><p className="eyebrow">Next</p><h2>定制接入步骤</h2></div><Database size={20} /></div>
          <Pipeline items={['定义部门目标', '配置知识库和模板', '接入业务工具', '设置审批策略', '试运行并优化']} />
        </div>
      </section>
    </>
  )
}

function ModuleMetric({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="module-metric">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  )
}

function BusinessLoop() {
  return (
    <section className="business-loop">
      {['BOSS 页面识别', '候选人入库', 'JD 匹配评分', '生成沟通草稿', '人工审批', '记录处理结果'].map((item, index) => (
        <div key={item}><span>{index + 1}</span><strong>{item}</strong></div>
      ))}
    </section>
  )
}

function moduleWorkflow(personaId: PersonaId) {
  const flows: Record<PersonaId, string[]> = {
    sales: ['同步客户线索', '识别客户阶段', '生成跟进话术', '提醒销售确认', '写入跟进记录'],
    admin: ['读取日程和会议', '生成会议纪要', '提取待办事项', '提醒责任人', '归档行政记录'],
    contract: ['上传或同步合同', '识别关键条款', '检查履约风险', '生成审查意见', '提交法务审批'],
    finance: ['连接财务数据', '识别经营问题', '生成问数结果', '输出报表摘要', '异常进入审批'],
    support: ['接收客户消息', '匹配知识库答案', '生成回复草稿', '复杂问题转人工', '沉淀工单标签'],
    manufacturing: ['接入质检/设备数据', '识别异常指标', '预测维护风险', '生成产线日报', '通知负责人'],
    operations: ['接入运营指标', '识别波动原因', '生成复盘建议', '输出经营看板', '沉淀策略记录'],
    recruiting: ['同步候选人', '解析简历', '匹配岗位 JD', '生成沟通草稿', '进入 HR 审批'],
  }
  return flows[personaId]
}

function PersonaStrip({ persona }: { persona: Persona }) {
  return (
    <section className="persona-strip" style={{ '--persona-color': persona.accent } as CSSProperties}>
      <div className="persona-icon">{persona.icon}</div>
      <div><strong>{persona.name}</strong><span>{persona.description}</span></div>
      <em>{persona.status}</em>
    </section>
  )
}

function Metrics({ stats }: { stats: { total: number; invite: number; review: number; reject: number; avg: number } }) {
  return <section className="metrics-grid"><Metric icon={<Inbox size={18} />} label="候选人" value={stats.total} /><Metric icon={<CheckCircle2 size={18} />} label="待邀约" value={stats.invite} /><Metric icon={<FileSearch size={18} />} label="需追问" value={stats.review} /><Metric icon={<XCircle size={18} />} label="礼貌拒绝" value={stats.reject} /><Metric icon={<Sparkles size={18} />} label="平均匹配" value={`${stats.avg}%`} /></section>
}

function RecognitionPanel({ inputText, preview, onAnalyze, onImage, onText }: { inputText: string; preview: string | null; onAnalyze: () => void | Promise<void>; onImage: (event: ChangeEvent<HTMLInputElement>) => void; onText: (value: string) => void }) {
  return (
    <div className="panel recognition-panel">
      <div className="panel-heading"><div><p className="eyebrow">输入层</p><h2>BOSS 页面识别与 JD 对比</h2></div><span className="status-pill">识别后自动评分</span></div>
      <div className="boss-frame"><div className="boss-toolbar"><span></span><span></span><span></span><strong>boss.zhipin.com / 候选人对话页</strong></div><div className="boss-content"><div className="boss-profile"><div className="avatar">林</div><div><strong>林晨 · 高级产品经理</strong><span>5年 · 本科 · 上海 · 30K-38K</span></div></div><p>做过智能客服和销售自动化产品，对 AI 产品经理岗位感兴趣。</p><div className="scan-box"><Eye size={18} /><span>识别候选人卡片、薪资、城市、经验、技能关键词</span></div></div></div>
      <label className="upload-zone"><Upload size={20} /><span>上传 BOSS 截图预览</span><input accept="image/*" type="file" onChange={onImage} /></label>
      {preview && <img className="screenshot-preview" src={preview} alt="上传的 BOSS 页面截图预览" />}
      <textarea value={inputText} onChange={(event) => onText(event.target.value)} />
      <button className="full-button" type="button" onClick={() => void onAnalyze()}><ScanText size={18} />识别 BOSS 信息并自动对比 JD</button>
    </div>
  )
}

function JobPanel({ job }: { job: JobProfile }) {
  return <div className="panel job-panel"><div className="panel-heading"><div><p className="eyebrow">岗位画像</p><h2>{job.title}</h2></div><span className="status-pill strong">招聘中</span></div><dl className="job-facts"><div><dt>部门</dt><dd>{job.department}</dd></div><div><dt>地点</dt><dd>{job.location}</dd></div><div><dt>薪资</dt><dd>{job.salary}</dd></div></dl><TagGroup title="硬性条件" items={job.mustHave} /><TagGroup title="加分项" items={job.niceToHave} /><TagGroup title="排除/预警" items={job.blockers} danger /></div>
}

function CandidateQueue({ candidates, selectedId, onSelect }: { candidates: Candidate[]; selectedId: number; onSelect: (id: number) => void }) {
  return <div className="panel queue-panel"><div className="panel-heading"><div><p className="eyebrow">处理队列</p><h2>候选人列表</h2></div><span className="status-pill">{candidates.length} 条</span></div><div className="candidate-list">{candidates.map((candidate) => <button className={candidate.id === selectedId ? 'candidate-row selected' : 'candidate-row'} key={candidate.id} type="button" onClick={() => onSelect(candidate.id)}><div><strong>{candidate.name}</strong><span>{candidate.role} · {candidate.company}</span></div><em>{candidate.score}</em></button>)}</div></div>
}

function CandidateDetail({ candidate, job }: { candidate: Candidate; job: JobProfile }) {
  const matchedMust = job.mustHave.filter((skill) => candidate.skills.includes(skill) || candidate.raw.includes(skill))
  const missingMust = job.mustHave.filter((skill) => !matchedMust.includes(skill))
  const matchedNice = job.niceToHave.filter((skill) => candidate.skills.includes(skill) || candidate.raw.includes(skill))
  const decision = candidate.score >= job.thresholdInvite ? '建议邀约' : candidate.score >= job.thresholdReview ? '建议追问' : '建议礼貌拒绝'
  return (
    <div className="panel detail-panel">
      <div className="panel-heading"><div><p className="eyebrow">AI 判断</p><h2>{candidate.name} · {candidate.score}%</h2></div><span className={`status-pill ${candidate.status === '待邀约' ? 'strong' : ''}`}>{candidate.status}</span></div>
      <div className="candidate-summary"><div><span>岗位</span><strong>{candidate.role}</strong></div><div><span>城市</span><strong>{candidate.city}</strong></div><div><span>年限</span><strong>{candidate.years || '待确认'}年</strong></div><div><span>薪资</span><strong>{candidate.salary}</strong></div></div>
      <div className="score-card"><div className="score-ring" style={{ '--score': candidate.score } as CSSProperties}><span>{candidate.score}</span></div><div><h3>推荐结论</h3><p>{candidate.score >= job.thresholdInvite ? '建议优先邀约，候选人与 JD 关键能力高度重合。' : candidate.score >= job.thresholdReview ? '建议补充追问，确认 AI 产品和办公地点等关键条件。' : '暂不建议推进，可礼貌拒绝并进入人才库观察。'}</p></div></div>
      <div className="analysis-columns"><Insight title="优势" items={candidate.strengths} /><Insight title="风险" items={candidate.risks} /><Insight title="建议追问" items={candidate.questions} /></div>
      <section className="compare-panel">
        <div className="compare-heading"><FileSearch size={18} /><strong>BOSS 识别结果自动对比 JD</strong><span>{decision}</span></div>
        <div className="compare-grid">
          <div><span>核心命中</span><strong>{matchedMust.length} / {job.mustHave.length}</strong><p>{matchedMust.length ? matchedMust.join('、') : '暂无核心条件命中'}</p></div>
          <div><span>待确认缺口</span><strong>{missingMust.length}</strong><p>{missingMust.length ? missingMust.join('、') : '核心条件已基本覆盖'}</p></div>
          <div><span>加分项</span><strong>{matchedNice.length}</strong><p>{matchedNice.length ? matchedNice.join('、') : '暂无明确加分项'}</p></div>
          <div><span>阈值规则</span><strong>{job.thresholdInvite} / {job.thresholdReview}</strong><p>邀约阈值 / 追问阈值</p></div>
        </div>
      </section>
      <div className="message-draft"><div className="draft-heading"><ClipboardCheck size={18} /><strong>待审批消息草稿</strong></div><p>{buildMessage(candidate, job)}</p></div>
    </div>
  )
}

function JobEditor({ job, onChange }: { job: JobProfile; onChange: (job: JobProfile) => void }) {
  const setList = (key: 'mustHave' | 'niceToHave' | 'blockers', value: string) => onChange({ ...job, [key]: value.split(/,|，|\n/).map((item) => item.trim()).filter(Boolean) })
  return <section className="settings-grid"><div className="panel form-panel"><div className="panel-heading"><div><p className="eyebrow">JD 配置</p><h2>岗位基础信息</h2></div><span className="status-pill strong">已自动保存</span></div><Field label="岗位名称" value={job.title} onChange={(value) => onChange({ ...job, title: value })} /><Field label="部门" value={job.department} onChange={(value) => onChange({ ...job, department: value })} /><Field label="地点" value={job.location} onChange={(value) => onChange({ ...job, location: value })} /><Field label="薪资范围" value={job.salary} onChange={(value) => onChange({ ...job, salary: value })} /><div className="number-row"><Field label="最低年限" type="number" value={String(job.requiredYears)} onChange={(value) => onChange({ ...job, requiredYears: Number(value) })} /><Field label="邀约阈值" type="number" value={String(job.thresholdInvite)} onChange={(value) => onChange({ ...job, thresholdInvite: Number(value) })} /><Field label="追问阈值" type="number" value={String(job.thresholdReview)} onChange={(value) => onChange({ ...job, thresholdReview: Number(value) })} /></div></div><div className="panel form-panel"><div className="panel-heading"><div><p className="eyebrow">评分规则</p><h2>关键词与预警</h2></div></div><TextareaField label="硬性条件" value={job.mustHave.join('，')} onChange={(value) => setList('mustHave', value)} /><TextareaField label="加分项" value={job.niceToHave.join('，')} onChange={(value) => setList('niceToHave', value)} /><TextareaField label="排除/预警" value={job.blockers.join('，')} onChange={(value) => setList('blockers', value)} /></div></section>
}

function MessageCenter({ drafts, copiedId, onCopy, onUpdate }: { drafts: MessageDraft[]; copiedId: number | null; onCopy: (draft: MessageDraft) => void; onUpdate: (id: number, status: DraftStatus) => void | Promise<void> }) {
  return <section className="table-panel panel"><div className="panel-heading"><div><p className="eyebrow">审批流</p><h2>消息草稿</h2></div><span className="status-pill">{drafts.filter((draft) => draft.status === '待审批').length} 条待处理</span></div><div className="draft-list">{drafts.map((draft) => <article className="draft-card" key={draft.id}><header><strong>{draft.candidateName} · {draft.type}</strong><span className={`status-pill ${draft.status === '已通过' ? 'strong' : ''}`}>{draft.status}</span></header><p>{draft.content}</p><footer><span>{draft.createdAt}</span><div className="draft-actions"><button type="button" onClick={() => onCopy(draft)}><Copy size={15} />{copiedId === draft.id ? '已复制' : '复制'}</button><button type="button" onClick={() => void onUpdate(draft.id, '已驳回')}>驳回</button><button className="approve" type="button" onClick={() => void onUpdate(draft.id, '已通过')}>通过</button></div></footer></article>)}</div></section>
}

function ScheduleCenter({ tasks, token, onStatus, onChange }: { tasks: ScheduleTask[]; token: string; onStatus: (status: string) => void; onChange: (tasks: ScheduleTask[]) => void | Promise<void> }) {
  const patchTask = async (id: number, body: Partial<ScheduleTask> & { runNow?: boolean }) => {
    if (token) {
      try {
        const updated = await apiRequest<ScheduleTask>(`/tasks/${id}`, token, { method: 'PATCH', body: JSON.stringify(body) })
        await onChange(tasks.map((task) => (task.id === id ? updated : task)))
        onStatus('Python 后端已连接')
        return
      } catch {
        onStatus('任务后端同步失败，已回退到本地状态')
      }
    }
    await onChange(tasks.map((task) => (task.id === id ? { ...task, ...body, result: body.enabled === false ? '关闭中' : task.result } : task)))
  }
  return <section className="settings-grid">{tasks.map((task) => <article className="panel task-card" key={task.id}><div className="panel-heading"><div><p className="eyebrow">{task.channel}</p><h2>{task.name}</h2></div><span className={`status-pill ${task.enabled ? 'strong' : ''}`}>{task.enabled ? '运行中' : '已停用'}</span></div><dl className="job-facts"><div><dt>时间</dt><dd>{task.time}</dd></div><div><dt>上次运行</dt><dd>{task.lastRun}</dd></div><div><dt>结果</dt><dd>{task.result}</dd></div></dl><div className="draft-actions"><button type="button" onClick={() => void patchTask(task.id, { enabled: !task.enabled, result: !task.enabled ? '等待下一次运行' : '关闭中' })}>{task.enabled ? '停用' : '启用'}</button><button className="approve" type="button" onClick={() => void patchTask(task.id, { runNow: true })}><Play size={15} />立即运行</button></div></article>)}</section>
}

function AgentCenter({ agents }: { agents: AgentWorker[] }) {
  return <section className="settings-grid agent-grid"><div className="panel agent-map"><div className="panel-heading"><div><p className="eyebrow">Orchestration</p><h2>数字员工协作链路</h2></div><span className="status-pill strong">{agents.length} 个 Agent</span></div><Pipeline items={['用户或定时任务进入主控分身', '按部门和场景路由到专业分身', '专业分身调用工具和知识库', '敏感动作进入人工审批', '结果写入审计和业务系统']} /></div>{agents.map((agent) => <article className="panel agent-card" key={agent.id}><div className="panel-heading"><div><p className="eyebrow">{agent.role}</p><h2>{agent.name}</h2></div><span className={`status-pill ${agent.status === '运行中' ? 'strong' : ''}`}>{agent.status}</span></div><p className="agent-description">{agent.description}</p><TagGroup title="工具能力" items={agent.tools} /></article>)}</section>
}

function SettingsPanel() {
  return <section className="settings-grid"><div className="panel"><div className="panel-heading"><div><p className="eyebrow">Auth</p><h2>登录验证预留</h2></div><LockKeyhole size={20} /></div><Pipeline items={['企业邮箱/手机号登录', 'JWT + Refresh Token', '角色权限：老板 / HR / 管理员', '操作审计与导出权限']} /></div><div className="panel"><div className="panel-heading"><div><p className="eyebrow">Deploy</p><h2>上线服务架构</h2></div><Database size={20} /></div><Pipeline items={['前端：Nginx 静态部署', '后端：Python API 服务', '数据库：SQLite -> MySQL/PostgreSQL', '任务：Redis Queue / Celery / Cron']} /></div><div className="panel"><div className="panel-heading"><div><p className="eyebrow">Avatar</p><h2>分身定制框架</h2></div><ShieldCheck size={20} /></div><Pipeline items={['选择部门和角色', '配置知识库和业务工具', '配置权限和审批边界', '试运行并沉淀技能']} /></div></section>
}

function Pipeline({ items = ['截图 / 页面文本', 'OCR / DOM 读取', '字段结构化', 'JD 匹配评分', '消息草稿审批'] }: { items?: string[] }) {
  return <ol className="pipeline">{items.map((item, index) => <li key={item}><span>{index + 1}</span>{item}</li>)}</ol>
}

function Metric({ icon, label, value }: { icon: ReactNode; label: string; value: string | number }) {
  return <div className="metric-card"><div>{icon}</div><span>{label}</span><strong>{value}</strong></div>
}

function TagGroup({ title, items, danger = false }: { title: string; items: string[]; danger?: boolean }) {
  return <section className="tag-group"><h3>{title}</h3><div>{items.map((item) => <span className={danger ? 'tag danger' : 'tag'} key={item}>{item}</span>)}</div></section>
}

function Insight({ title, items }: { title: string; items: string[] }) {
  return <section className="insight"><h3>{title}</h3><ul>{items.map((item) => <li key={item}>{item}</li>)}</ul></section>
}

function Field({ label, value, onChange, type = 'text' }: { label: string; value: string; onChange: (value: string) => void; type?: string }) {
  return <label className="field"><span>{label}</span><input type={type} value={value} onChange={(event) => onChange(event.target.value)} /></label>
}

function TextareaField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return <label className="field"><span>{label}</span><textarea value={value} onChange={(event) => onChange(event.target.value)} /></label>
}

export default App
