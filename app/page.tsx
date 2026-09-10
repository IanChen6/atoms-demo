'use client';
import { useState, useEffect, useRef } from 'react';
import AuthPanel, { type Account } from '@/components/auth-panel';
import {
  Sparkles,
  ArrowUp,
  Code2,
  Plus,
  Layers,
  Monitor,
  History,
  Download,
  Smartphone,
  Check,
  Loader2,
  Settings2,
  FolderOpen,
  Rocket,
  Lock,
  Unlock,
  Search,
  Palette,
  Hammer,
  ShieldCheck,
  Circle,
} from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { extractHtmlDocument, previewDocument } from '@/lib/demo';
import { collaborationTrace, type AgentActivity } from '@/lib/agents';
type Project = {
  id: string;
  title: string;
  created: number;
  published_version: string | null;
  published_at: number | null;
};
type Version = {
  id: string;
  prompt: string;
  html: string;
  summary: string;
  mode: string;
  created: number;
};
type ChatMessage = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  status: 'success' | 'error' | 'clarification' | 'pending';
  mode: string;
  version: string | null;
  created: number;
  steps?: string[];
  completedSteps?: number;
  trace?: string | AgentActivity[];
};

function ProcessTrace({ message }: { message: ChatMessage }) {
  let activities: AgentActivity[] = [];
  if (Array.isArray(message.trace)) activities = message.trace;
  else if (typeof message.trace === 'string') {
    try {
      const parsed = JSON.parse(message.trace);
      if (Array.isArray(parsed)) activities = parsed as AgentActivity[];
    } catch {
      activities = [];
    }
  }
  if (activities.length) {
    const completed = activities.filter((item) => item.status === 'done').length;
    const roleIcon = {
      analyst: Search,
      designer: Palette,
      engineer: Hammer,
      reviewer: ShieldCheck,
    };
    return (
      <details className="agent-run" open={message.status === 'pending'}>
        <summary>
          {message.status === 'pending' ? (
            <Loader2 className="spin" size={16} />
          ) : message.status === 'error' ? (
            <Circle size={16} />
          ) : (
            <Check size={16} />
          )}
          <span>
            {message.status === 'pending'
              ? `多智能体协作中 · ${completed}/${activities.length}`
              : message.status === 'error'
                ? '协作在检查点停止'
                : `协作完成 · ${activities.length} 个角色`}
          </span>
        </summary>
        <div className="agent-timeline">
          {activities.map((activity) => {
            const Icon = roleIcon[activity.role];
            return (
              <article
                className={`agent-activity activity-${activity.status}`}
                key={activity.role}
              >
                <div className="agent-avatar">
                  <Icon size={16} />
                </div>
                <div className="agent-activity-body">
                  <div className="agent-activity-heading">
                    <b>{activity.name}</b>
                    <span>
                      {activity.status === 'done'
                        ? '已完成'
                        : activity.status === 'active'
                          ? '进行中'
                          : activity.status === 'error'
                            ? '已停止'
                            : '等待中'}
                    </span>
                  </div>
                  <strong>{activity.title}</strong>
                  <p>{activity.detail}</p>
                  {!!activity.changes?.length && activity.status !== 'pending' && (
                    <div className="change-list">
                      {activity.changes.map((change) => (
                        <span key={change}>{change}</span>
                      ))}
                    </div>
                  )}
                </div>
              </article>
            );
          })}
        </div>
        <div className="trace-privacy">仅展示决策、操作与验证结果</div>
      </details>
    );
  }
  const steps =
    message.steps ||
    (message.status === 'clarification'
      ? ['检查需求是否足够具体', '整理需要补充的关键信息']
      : message.status === 'error'
        ? ['分析需求与运行约束', '尝试构建并记录失败原因']
        : message.version
          ? [
              '分析需求与运行约束',
              '规划页面结构和核心交互',
              '生成并校验可运行代码',
              '保存新版本并更新预览',
            ]
          : []);
  if (!steps.length) return null;
  const completed =
    message.status === 'pending'
      ? Math.min(message.completedSteps || 0, steps.length)
      : steps.length;
  return (
    <details className="process-trace" open={message.status === 'pending'}>
      <summary>
        {message.status === 'pending' ? (
          <Loader2 className="spin" size={15} />
        ) : (
          <Check size={15} />
        )}
        {message.status === 'pending'
          ? `执行规划 · ${completed}/${steps.length}`
          : `已处理 ${steps.length} 步`}
      </summary>
      <ol>
        {steps.map((step, index) => (
          <li
            className={
              index < completed ? 'done' : index === completed ? 'active' : ''
            }
            key={step}
          >
            {step}
          </li>
        ))}
      </ol>
    </details>
  );
}
export default function Page() {
  const [account, setAccount] = useState<Account | null>(null),
    [checking, setChecking] = useState(true);
  const [prompt, setPrompt] = useState(''),
    [projects, setProjects] = useState<Project[]>([]),
    [project, setProject] = useState(''),
    [versions, setVersions] = useState<Version[]>([]),
    [messages, setMessages] = useState<ChatMessage[]>([]),
    [draftMessages, setDraftMessages] = useState<ChatMessage[]>([]),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [ready, setReady] = useState(false),
    [modelReady, setModelReady] = useState(false),
    [mode, setMode] = useState('demo'),
    [mobile, setMobile] = useState(false),
    [tab, setTab] = useState('preview'),
    [selected, setSelected] = useState(''),
    [appStorage, setAppStorage] = useState<Record<string, string>>({}),
    [saveState, setSaveState] = useState<'saved' | 'saving' | 'error'>('saved');
  const [quota, setQuota] = useState<{
    used: number;
    limits: { perMinute: number; perDay: number; globalPerDay: number };
  } | null>(null);
  const modeInitialized = useRef(false);
  const lock = useRef(false),
    frame = useRef<HTMLIFrameElement>(null),
    storageQueue = useRef<Promise<unknown>>(Promise.resolve());
  const current = versions.find((v) => v.id === selected) || versions.at(-1);
  const activeProject = projects.find((p) => p.id === project);
  const title = activeProject?.title;
  const isPublished = !!activeProject?.published_version;
  async function load(id = '') {
    const [r, storageResponse] = await Promise.all([
      fetch('/api/studio' + (id ? '?project=' + encodeURIComponent(id) : '')),
      id
        ? fetch('/api/app-data?project=' + encodeURIComponent(id))
        : Promise.resolve(null),
    ]);
    const data = (await r.json()) as {
      error?: string;
      projects: Project[];
      versions: Version[];
      messages: ChatMessage[];
      modelReady: boolean;
      usage: {
        used: number;
        limits: { perMinute: number; perDay: number; globalPerDay: number };
      };
    };
    if (!r.ok) throw new Error(data.error);
    let stored: Record<string, string> = {};
    if (storageResponse) {
      const storageResult = (await storageResponse.json()) as {
        data?: Record<string, string>;
        error?: string;
      };
      if (!storageResponse.ok) throw new Error(storageResult.error);
      stored = storageResult.data || {};
    }
    setProjects(data.projects);
    setVersions(data.versions);
    setMessages(data.messages);
    setDraftMessages([]);
    setModelReady(data.modelReady);
    if (!modeInitialized.current) {
      setMode(data.modelReady ? 'ai' : 'demo');
      modeInitialized.current = true;
    }
    setQuota(data.usage);
    setReady(true);
    setSelected(
      data.projects.find((item) => item.id === id)?.published_version || '',
    );
    setProject(id);
    setAppStorage(stored);
    setSaveState('saved');
  }
  useEffect(() => {
    fetch('/api/auth')
      .then(async (r) => {
        const d = (await r.json()) as { user: Account | null; error?: string };
        if (!r.ok) throw new Error(d.error);
        setAccount(d.user);
        if (d.user) await load();
      })
      .catch((e) => setError(e.message))
      .finally(() => setChecking(false));
  }, []);
  async function logout() {
    if (lock.current) return;
    setBusy(true);
    try {
      const r = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'logout' }),
      });
      if (!r.ok) throw new Error('退出失败，请重试');
      setAccount(null);
      setPrompt('');
      setSelected('');
      setProjects([]);
      setVersions([]);
      setMessages([]);
      setDraftMessages([]);
      setAppStorage({});
      setProject('');
      setReady(false);
      setError('');
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function fork(version: string) {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setError('');
    try {
      const r = await fetch('/api/fork', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ version }),
      });
      const d = (await r.json()) as { project: string; error?: string };
      if (!r.ok) throw new Error(d.error);
      await load(d.project);
      setTab('preview');
    } catch (e) {
      setError((e as Error).message);
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  async function changeProject(id: string) {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setError('');
    try {
      await load(id);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  async function changePublication(action: 'publish' | 'unpublish') {
    if (lock.current || !project || (action === 'publish' && !current)) return;
    lock.current = true;
    setBusy(true);
    setError('');
    try {
      const version = current?.id;
      const response = await fetch('/api/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, project, version }),
      });
      const result = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(result.error);
      await load(project);
    } catch (e) {
      setError((e as Error).message || '无法更新发布状态');
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  async function generate(text = prompt, restore?: string) {
    if (lock.current || !ready) return;
    if (isPublished) {
      setError('当前项目已经发布。请先取消发布，再继续修改。');
      return;
    }
    if (!restore && !text.trim()) return;
    lock.current = true;
    setBusy(true);
    setError('');
    const submitted = restore ? '恢复历史版本' : text.trim();
    if (!restore) {
      const created = Date.now();
      const trace = collaborationTrace(submitted, !!current);
      setDraftMessages([
        {
          id: `draft-user-${created}`,
          role: 'user',
          content: submitted,
          status: 'success',
          mode,
          version: null,
          created,
        },
        {
          id: `draft-agent-${created}`,
          role: 'assistant',
          content: '正在理解需求并准备应用…',
          status: 'pending',
          mode,
          version: null,
          created: created + 1,
          trace,
        },
      ]);
      setPrompt('');
    }
    try {
      const r = await fetch('/api/studio', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'text/event-stream',
        },
        body: JSON.stringify({
          prompt: text,
          project: project || undefined,
          mode,
          restore,
        }),
      });
      if (!r.body) throw new Error('生成服务没有返回协作过程。');
      const reader = r.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let d: {
        error?: string;
        project?: string;
        version?: string;
        outcome?: 'success' | 'error' | 'clarification';
      } = {};
      while (true) {
        const { value, done } = await reader.read();
        buffer += decoder.decode(value, { stream: !done });
        const blocks = buffer.split('\n\n');
        buffer = blocks.pop() || '';
        for (const block of blocks) {
          const line = block
            .split('\n')
            .find((item) => item.startsWith('data: '));
          if (!line) continue;
          const event = JSON.parse(line.slice(6)) as {
            type: 'progress' | 'result';
            trace?: AgentActivity[];
            project?: string;
            message?: string;
            error?: string;
            version?: string;
            outcome?: 'success' | 'error' | 'clarification';
          };
          if (event.type === 'progress' && event.trace) {
            setDraftMessages((items) =>
              items.map((item) =>
                item.role === 'assistant'
                  ? { ...item, trace: event.trace }
                  : item,
              ),
            );
          } else if (event.type === 'result') {
            d = event;
          }
        }
        if (done) break;
      }
      if (d.project) {
        await load(d.project);
      }
      if (d.outcome === 'error' && !d.project) throw new Error(d.error);
      if (d.outcome === 'success') setTab('preview');
      return d;
    } catch (e) {
      const failureText =
        (e as Error).message || '请求未能送达，请检查网络后重试。';
      setDraftMessages((current) => {
        const content =
          (e as Error).message || '请求未能送达，请检查网络后重试。';
        return current.map((item) =>
          item.role === 'assistant'
            ? { ...item, content, status: 'error' }
            : item,
        );
      });
      if (restore) setError(failureText);
      return { outcome: 'error' as const, error: failureText };
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  useEffect(() => {
    const ctx = (
      document as Document & {
        modelContext?: {
          registerTool: (tool: unknown, options: unknown) => Promise<void>;
        };
      }
    ).modelContext;
    if (!ctx) return;
    const lifecycle = new AbortController();
    Promise.resolve(
      ctx.registerTool(
        {
          name: 'generate_application',
          description:
            'Generate and save an application version in the selected project; updates the visible preview.',
          inputSchema: {
            type: 'object',
            properties: {
              prompt: { type: 'string', minLength: 1, maxLength: 4000 },
            },
            required: ['prompt'],
            additionalProperties: false,
          },
          annotations: { readOnlyHint: false, untrustedContentHint: true },
          execute: async (input: unknown) => {
            const p = (input as { prompt?: unknown })?.prompt;
            if (typeof p !== 'string' || !p.trim() || p.length > 4000)
              throw new Error('需求必须为 1–4000 字');
            if (!ready || lock.current) throw new Error('工作空间尚未就绪');
            return await generate(p);
          },
        },
        { signal: lifecycle.signal },
      ),
    ).catch(() => {});
    return () => lifecycle.abort();
    // `generate` intentionally follows the selected project and mode captured above.
    // oxlint-disable-next-line react-hooks/exhaustive-deps
  }, [project, mode, ready]);
  useEffect(() => {
    function receive(event: MessageEvent) {
      if (event.source !== frame.current?.contentWindow || !project) return;
      const payload = event.data as {
        source?: unknown;
        type?: unknown;
        data?: unknown;
      };
      if (
        payload?.source !== 'atom-preview' ||
        payload.type !== 'storage' ||
        !payload.data ||
        typeof payload.data !== 'object' ||
        Array.isArray(payload.data)
      )
        return;
      const data = payload.data as Record<string, unknown>;
      if (Object.values(data).some((value) => typeof value !== 'string'))
        return;
      const snapshot = { ...data } as Record<string, string>;
      setSaveState('saving');
      storageQueue.current = storageQueue.current
        .catch(() => undefined)
        .then(async () => {
          const response = await fetch('/api/app-data', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ project, data: snapshot }),
          });
          if (!response.ok) throw new Error('应用数据保存失败');
          setSaveState('saved');
        })
        .catch(() => setSaveState('error'));
    }
    window.addEventListener('message', receive);
    return () => window.removeEventListener('message', receive);
  }, [project]);
  function download() {
    if (!current) return;
    const url = URL.createObjectURL(
      new Blob([extractHtmlDocument(current.html) || current.html], {
        type: 'text/html',
      }),
    );
    const a = document.createElement('a');
    a.href = url;
    a.download = 'atom-app.html';
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  if (checking)
    return (
      <output className="auth-loading">
        <Loader2 className="spin" />
        正在打开工作空间…
      </output>
    );
  if (!account)
    return (
      <AuthPanel
        onAuthenticated={(u) => {
          setAccount(u);
          setError('');
          load().catch((e) => setError(e.message));
        }}
      />
    );
  return (
    <main className="studio">
      <header>
        <div className="brand">
          <Sparkles /> atom<span>STUDIO</span>
        </div>
        <span className="crumb">工作空间 / {title || '新的想法'}</span>
        <div className="account-control">
          <span title={account.email}>{account.name}</span>
          <button disabled={busy} onClick={logout}>
            退出
          </button>
        </div>
        <span className="mode">{mode === 'ai' ? '真实模型' : '示例模式'}</span>
        <Dialog>
          <DialogTrigger className="icon-button" aria-label="模型设置">
            <Settings2 size={19} />
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>生成模式</DialogTitle>
              <DialogDescription>
                示例模式可以直接体验；真实 AI 模式需要部署者配置模型服务。
              </DialogDescription>
            </DialogHeader>
            <div className="settings">
              {quota && (
                <div className="quota-card">
                  <b>真实 AI 调用额度</b>
                  <p>
                    今日已用 {quota.used} / {quota.limits.perDay} 次
                  </p>
                  <p>
                    每分钟 {quota.limits.perMinute} 次 · 同时 1 次<br />
                    全站每日最多 {quota.limits.globalPerDay} 次
                  </p>
                  <small>
                    北京时间 00:00
                    重置。已发出的失败请求也计次，示例和版本操作不计次。
                  </small>
                </div>
              )}
              <label>
                使用模式
                <select
                  value={mode}
                  onChange={(e) => setMode(e.target.value)}
                  disabled={busy}
                >
                  <option value="demo">示例引擎 · 无需密钥</option>
                  <option value="ai" disabled={!modelReady}>
                    真实 AI {modelReady ? '· 已配置' : '· 尚未配置'}
                  </option>
                </select>
              </label>
              <p>示例引擎支持待办、笔记、计时器及主题修改，不会调用大模型。</p>
              <p>
                接入兼容 Chat Completions 的服务时，在服务端配置
                MODEL_BASE_URL、MODEL_NAME 和 MODEL_API_KEY。密钥不进入浏览器。
              </p>
              <p>
                项目、版本和生成应用中的数据都会保存到你的账号，登录后可继续使用。
              </p>
            </div>
          </DialogContent>
        </Dialog>
      </header>
      <div className="workspace">
        <section className="conversation">
          <div className="project-switch">
            <FolderOpen size={16} />
            <select
              aria-label="选择项目"
              value={project}
              disabled={busy}
              onChange={(e) => changeProject(e.target.value)}
            >
              <option value="">新的想法</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.title}
                </option>
              ))}
            </select>
            <button
              className="icon-button"
              aria-label="新建项目"
              disabled={busy}
              onClick={() => changeProject('')}
            >
              <Plus size={18} />
            </button>
          </div>
          <div className="section-label">
            BUILD WITH AGENTS{' '}
            <span>
              {versions.length ? `${versions.length} VERSIONS` : '01'}
            </span>
          </div>
          {!messages.length && !draftMessages.length && !versions.length ? (
            <>
              <h1>
                把想法，
                <br />
                <em>变成可用的应用。</em>
              </h1>
              <p className="intro">
                描述你想构建的产品。一起生成、预览，再把每个细节做对。
              </p>
              <div className="agent-card">
                <Sparkles size={20} />
                <div>
                  <b>你的构建伙伴已就绪</b>
                  <p>
                    {mode === 'demo'
                      ? '先用交互示例，体验完整构建流程。'
                      : '从一个具体的需求开始吧。'}
                  </p>
                </div>
              </div>
              <div className="suggestions">
                {[
                  '待办清单，支持添加和完成任务',
                  '专注计时器，25 分钟工作与休息',
                  '记事本，支持搜索笔记',
                ].map((s) => (
                  <button key={s} disabled={busy} onClick={() => setPrompt(s)}>
                    <Plus size={15} />
                    {s}
                  </button>
                ))}
              </div>
            </>
          ) : (
            <div className="messages">
              {[
                ...(messages.length
                  ? messages
                  : versions.flatMap((v) => [
                      {
                        id: `legacy-user-${v.id}`,
                        role: 'user' as const,
                        content: v.prompt,
                        status: 'success' as const,
                        mode: v.mode,
                        version: null,
                        created: v.created,
                      },
                      {
                        id: `legacy-agent-${v.id}`,
                        role: 'assistant' as const,
                        content: v.summary,
                        status: 'success' as const,
                        mode: v.mode,
                        version: v.id,
                        created: v.created + 1,
                      },
                    ])),
                ...draftMessages,
              ].map((message) =>
                message.role === 'user' ? (
                  <div className="user-message" key={message.id}>
                    {message.content}
                  </div>
                ) : (
                  <div
                    className={`response response-${message.status}`}
                    key={message.id}
                  >
                    <div className="response-heading">
                      {message.status === 'pending' ? (
                        <Loader2 className="spin" size={16} />
                      ) : (
                        <Sparkles size={16} />
                      )}
                      <b>
                        {message.status === 'clarification'
                          ? '需要你补充信息'
                          : message.status === 'error'
                            ? '这次没有生成成功'
                            : message.mode === 'ai'
                              ? '构建 Agent'
                              : '示例引擎'}
                      </b>
                    </div>
                    <ProcessTrace message={message} />
                    <p>{message.content}</p>
                    {message.version && (
                      <button
                        className="version-chip"
                        onClick={() => {
                          setSelected(message.version!);
                          setTab('preview');
                        }}
                      >
                        <Check size={14} />
                        查看生成结果
                      </button>
                    )}
                  </div>
                ),
              )}
            </div>
          )}
          {busy && (
            <output className="working">
              <Loader2 className="spin" size={16} />
              {mode === 'ai' ? '正在生成并保存应用…' : '正在处理并保存…'}
            </output>
          )}
          {error && !draftMessages.length && (
            <div role="alert" className="error">
              {error}
              {!ready && (
                <button
                  onClick={() => load().catch((e) => setError(e.message))}
                >
                  重试连接
                </button>
              )}
            </div>
          )}
          {isPublished && (
            <div className="published-lock">
              <Lock size={17} />
              <div>
                <b>当前项目已发布，现为只读状态</b>
                <p>已锁定发布版本；取消发布后才能继续修改或恢复版本。</p>
              </div>
              <button
                disabled={busy}
                onClick={() => changePublication('unpublish')}
              >
                <Unlock size={14} />
                取消发布
              </button>
            </div>
          )}
          <form
            className={`composer${isPublished ? ' composer-locked' : ''}`}
            onSubmit={(e) => {
              e.preventDefault();
              void generate().catch(() => {});
            }}
          >
            <textarea
              aria-label="应用需求"
              maxLength={4000}
              disabled={busy || isPublished}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder={
                isPublished
                  ? '当前项目已发布，取消发布后可继续修改'
                  : versions.length
                    ? '继续修改，例如：改成深色主题…'
                    : '例如：做一个极简的待办应用…'
              }
              onKeyDown={(e) => {
                if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                  e.preventDefault();
                  void generate().catch(() => {});
                }
              }}
            />
            <div>
              <span>
                <Sparkles size={14} />
                {isPublished
                  ? '发布版本已锁定'
                  : `${mode === 'demo' ? '示例引擎' : '真实 AI'} · ⌘ Enter`}
              </span>
              <button
                disabled={busy || isPublished || !ready || !prompt.trim()}
                aria-label="生成应用"
              >
                {busy ? (
                  <Loader2 className="spin" size={19} />
                ) : (
                  <ArrowUp size={19} />
                )}
              </button>
            </div>
          </form>
          <div className={`save-note save-note-${saveState}`}>
            {saveState === 'saving' ? (
              <Loader2 className="spin" size={13} />
            ) : (
              <Check size={13} />
            )}
            {saveState === 'saving'
              ? '正在保存应用数据'
              : saveState === 'error'
                ? '应用数据保存失败，请重试操作'
                : '项目、版本与应用数据已保存'}
          </div>
        </section>
        <section className="surface">
          <Tabs value={tab} onValueChange={setTab}>
            <div className="toolbar">
              <TabsList>
                <TabsTrigger value="preview">
                  <Monitor size={15} />
                  预览
                </TabsTrigger>
                <TabsTrigger value="code">
                  <Code2 size={15} />
                  代码
                </TabsTrigger>
                <TabsTrigger value="history">
                  <History size={15} />
                  版本
                </TabsTrigger>
              </TabsList>
              <div className="preview-actions">
                {current && project && (
                  <button
                    className={`publish-control${isPublished ? ' published' : ''}`}
                    disabled={busy}
                    onClick={() =>
                      changePublication(isPublished ? 'unpublish' : 'publish')
                    }
                  >
                    {isPublished ? <Unlock size={15} /> : <Rocket size={15} />}
                    {isPublished ? '取消发布' : '发布当前版本'}
                  </button>
                )}
                <button
                  aria-label={mobile ? '切换桌面预览' : '切换手机预览'}
                  className="icon-button"
                  onClick={() => setMobile(!mobile)}
                >
                  {mobile ? <Monitor size={17} /> : <Smartphone size={17} />}
                </button>
                <button
                  className="export"
                  disabled={!current}
                  onClick={download}
                >
                  <Download size={15} />
                  <span>导出源码</span>
                </button>
              </div>
            </div>
            <TabsContent value="preview">
              {current ? (
                <>
                  <div className="preview-address">
                    <div className="window-dots" aria-hidden="true">
                      <i />
                      <i />
                      <i />
                    </div>
                    <span className="preview-title">应用预览</span>
                    <span className="preview-version">
                      v{versions.indexOf(current) + 1} ·{' '}
                      {current.mode === 'demo' ? '交互示例' : 'AI 生成'}
                    </span>
                    <span className={`saved-badge saved-badge-${saveState}`}>
                      {saveState === 'saving' ? (
                        <Loader2 className="spin" size={12} />
                      ) : (
                        <Check size={12} />
                      )}
                      {saveState === 'saving'
                        ? '保存中'
                        : saveState === 'error'
                          ? '保存失败'
                          : '已保存'}
                    </span>
                  </div>
                  <div className={'iframe-wrap' + (mobile ? ' mobile' : '')}>
                    <iframe
                      ref={frame}
                      key={current.id}
                      title="生成的应用预览"
                      sandbox="allow-scripts"
                      referrerPolicy="no-referrer"
                      srcDoc={previewDocument(current.html, appStorage)}
                    />
                  </div>
                </>
              ) : (
                <div className="empty-preview">
                  <div className="preview-icon">
                    <Layers size={32} />
                  </div>
                  <h2>下一个好想法，从这里开始</h2>
                  <p>在左侧描述需求，应用将在这里呈现。</p>
                  <div className="steps">
                    <span>01 描述想法</span>
                    <i />
                    <span>02 构建应用</span>
                    <i />
                    <span>03 预览迭代</span>
                  </div>
                </div>
              )}
            </TabsContent>
            <TabsContent value="code">
              {current ? (
                <pre className="code-view">
                  <code>{current.html}</code>
                </pre>
              ) : (
                <div className="empty-preview">生成后查看完整源码</div>
              )}
            </TabsContent>
            <TabsContent value="history">
              <div className="history-list">
                <h2>每一次迭代，都有迹可循。</h2>
                <p>
                  恢复会新建版本；创建分支会生成独立项目，方便尝试不同方向。
                </p>
                {[...versions].reverse().map((v, i) => (
                  <article key={v.id}>
                    <div>
                      <b>版本 {versions.length - i}</b>
                      {activeProject?.published_version === v.id && (
                        <span className="published-version">
                          <Lock size={12} /> 已发布
                        </span>
                      )}
                      <small>
                        {new Date(v.created).toLocaleString('zh-CN')}
                      </small>
                      <p>{v.prompt}</p>
                    </div>
                    <div className="version-actions">
                      <button disabled={busy} onClick={() => void fork(v.id)}>
                        创建分支项目
                      </button>
                      <button
                        disabled={busy || isPublished}
                        onClick={() => void generate('', v.id).catch(() => {})}
                      >
                        恢复此版本
                      </button>
                    </div>
                  </article>
                ))}
                {!versions.length && (
                  <p>生成第一个应用后，版本会出现在这里。</p>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </section>
      </div>
    </main>
  );
}
