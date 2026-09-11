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
  MessageSquare,
  AppWindow,
  MousePointer2,
  FileText,
  Folder,
  Pencil,
  Save,
  Send,
  X,
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
import {
  applicationGuide,
  extractHtmlDocument,
  previewDocument,
} from '@/lib/demo';
import { type AgentActivity } from '@/lib/agents';
type Project = {
  id: string;
  title: string;
  created: number;
  published_version: string | null;
  published_at: number | null;
  description: string;
  instructions: string;
  review_status: 'draft' | 'submitted';
  review_version: string | null;
  review_requested_at: number | null;
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
  trace?: string | AgentActivity[];
};
type PreviewSelection = {
  tag: string;
  id: string;
  classes: string;
  text: string;
  path: string;
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
  const actualStepNames = new Set([
    '请求路由',
    '需求检查',
    '工程规划',
    '版本读取',
    '模型执行',
    '结果校验',
    '版本存储',
  ]);
  activities = activities.filter((activity) =>
    actualStepNames.has(activity.name),
  );
  if (activities.length) {
    const completed = activities.filter(
      (item) => item.status === 'done',
    ).length;
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
              ? `实际执行中 · ${completed}/${activities.length}`
              : message.status === 'error'
                ? '执行在检查点停止'
                : `实际执行记录 · ${activities.length} 步`}
          </span>
        </summary>
        <div className="agent-timeline">
          {activities.map((activity) => {
            const Icon = roleIcon[activity.role];
            return (
              <article
                className={`agent-activity activity-${activity.status}`}
                key={`${activity.name}-${activity.title}`}
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
                  {!!activity.changes?.length &&
                    activity.status !== 'pending' && (
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
        <div className="trace-privacy">
          仅展示服务端实际执行的操作与结果摘要
        </div>
      </details>
    );
  }
  return null;
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
    [mobile, setMobile] = useState(false),
    [tab, setTab] = useState('preview'),
    [selected, setSelected] = useState(''),
    [selectionMode, setSelectionMode] = useState(false),
    [previewSelection, setPreviewSelection] = useState<PreviewSelection | null>(
      null,
    ),
    [activeFile, setActiveFile] = useState('index.html'),
    [workspaceView, setWorkspaceView] = useState<'studio' | 'apps'>('studio'),
    [editingCode, setEditingCode] = useState(false),
    [codeDraft, setCodeDraft] = useState(''),
    [editingDetails, setEditingDetails] = useState(false),
    [detailsDraft, setDetailsDraft] = useState({
      title: '',
      description: '',
      instructions: '',
    }),
    [appStorage, setAppStorage] = useState<Record<string, string>>({}),
    [saveState, setSaveState] = useState<'saved' | 'saving' | 'error'>('saved');
  const [quota, setQuota] = useState<{
    used: number;
    limits: { perMinute: number; perDay: number; globalPerDay: number };
  } | null>(null);
  const lock = useRef(false),
    frame = useRef<HTMLIFrameElement>(null),
    storageQueue = useRef<Promise<unknown>>(Promise.resolve());
  const current = versions.find((v) => v.id === selected) || versions.at(-1);
  const activeProject = projects.find((p) => p.id === project);
  const title = activeProject?.title;
  const isPublished = !!activeProject?.published_version;
  const guide = current ? applicationGuide(current.html) : null;
  const appDescription =
    activeProject?.description || guide?.introduction || '';
  const appInstructions =
    activeProject?.instructions || guide?.instructions.join('\n') || '';
  const reviewReady =
    !!current &&
    activeProject?.review_status === 'submitted' &&
    activeProject.review_version === current.id;
  const codeFiles = current
    ? {
        'index.html': current.html,
        'README.md': `# ${title || guide?.name || '生成的应用'}\n\n${appDescription}\n\n## 使用说明\n\n${appInstructions}\n\n## 运行方式\n\n这是一个可独立运行的单页应用，交互数据会自动保存。`,
        'app.json': JSON.stringify(
          {
            name: title || '生成的应用',
            version: versions.indexOf(current) + 1,
            generator: 'AI Agent',
            persistence: 'enabled',
          },
          null,
          2,
        ),
      }
    : null;
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
    setQuota(data.usage);
    setReady(true);
    setSelected(
      data.projects.find((item) => item.id === id)?.published_version || '',
    );
    setProject(id);
    setAppStorage(stored);
    setSaveState('saved');
    setSelectionMode(false);
    setPreviewSelection(null);
    setEditingCode(false);
    setEditingDetails(false);
    const loadedProject = data.projects.find((item) => item.id === id);
    const loadedVersion =
      data.versions.find(
        (item) => item.id === loadedProject?.published_version,
      ) || data.versions.at(-1);
    const loadedGuide = loadedVersion
      ? applicationGuide(loadedVersion.html)
      : null;
    setCodeDraft(loadedVersion?.html || '');
    setDetailsDraft({
      title: loadedProject?.title || loadedGuide?.name || '',
      description:
        loadedProject?.description || loadedGuide?.introduction || '',
      instructions:
        loadedProject?.instructions ||
        loadedGuide?.instructions.join('\n') ||
        '',
    });
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
      setWorkspaceView('studio');
    } catch (e) {
      setError((e as Error).message);
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  async function openApplication(id: string) {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setError('');
    try {
      await load(id);
      setWorkspaceView('apps');
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
      if (action === 'unpublish' && workspaceView === 'apps')
        setWorkspaceView('studio');
    } catch (e) {
      setError((e as Error).message || '无法更新发布状态');
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  async function saveApplicationCode() {
    if (lock.current || !project || !current || isPublished) return;
    lock.current = true;
    setBusy(true);
    setError('');
    try {
      const response = await fetch('/api/project', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'code', project, html: codeDraft }),
      });
      const result = (await response.json()) as {
        error?: string;
        version?: string;
      };
      if (!response.ok) throw new Error(result.error);
      await load(project);
      if (result.version) setSelected(result.version);
      setEditingCode(false);
      setTab('preview');
    } catch (e) {
      setError((e as Error).message || '代码保存失败');
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  async function saveApplicationDetails() {
    if (lock.current || !project || !current || isPublished) return;
    lock.current = true;
    setBusy(true);
    setError('');
    try {
      const response = await fetch('/api/project', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'metadata',
          project,
          ...detailsDraft,
        }),
      });
      const result = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(result.error);
      await load(project);
      setEditingDetails(false);
    } catch (e) {
      setError((e as Error).message || '应用资料保存失败');
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  async function submitReview() {
    if (lock.current || !project || !current || isPublished || reviewReady)
      return;
    lock.current = true;
    setBusy(true);
    setError('');
    try {
      const response = await fetch('/api/project', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'review',
          project,
          version: current.id,
        }),
      });
      const result = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(result.error);
      await load(project);
    } catch (e) {
      setError((e as Error).message || '验证请求提交失败');
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  async function generate(text = prompt, restore?: string) {
    if (lock.current || !ready) return;
    if (!restore && !text.trim()) return;
    lock.current = true;
    setBusy(true);
    setError('');
    const submitted = restore ? '恢复历史版本' : text.trim();
    if (!restore) {
      const created = Date.now();
      const trace: AgentActivity[] = [];
      setDraftMessages([
        {
          id: `draft-user-${created}`,
          role: 'user',
          content: submitted,
          status: 'success',
          mode: 'ai',
          version: null,
          created,
        },
        {
          id: `draft-agent-${created}`,
          role: 'assistant',
          content: trace.length
            ? '正在理解需求并准备应用…'
            : '正在理解你的消息…',
          status: 'pending',
          mode: 'ai',
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
          restore,
          selection: previewSelection || undefined,
        }),
      });
      if (!r.body) throw new Error('生成服务没有返回执行过程。');
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
      if (d.outcome === 'success' && d.version) {
        setTab('preview');
        setSelectionMode(false);
        setPreviewSelection(null);
      }
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
    // `generate` intentionally follows the selected project captured above.
    // oxlint-disable-next-line react-hooks/exhaustive-deps
  }, [project, ready]);
  useEffect(() => {
    function receive(event: MessageEvent) {
      if (event.source !== frame.current?.contentWindow || !project) return;
      const payload = event.data as {
        source?: unknown;
        type?: unknown;
        data?: unknown;
      };
      if (payload?.source !== 'atom-preview') return;
      if (
        payload.type === 'selection' &&
        payload.data &&
        typeof payload.data === 'object' &&
        !Array.isArray(payload.data)
      ) {
        const picked = payload.data as PreviewSelection;
        if (picked.path && picked.tag) {
          setPreviewSelection(picked);
          setPrompt((value) =>
            value.trim() ? value : `请修改选中的 ${picked.tag} 区域：`,
          );
        }
        return;
      }
      if (
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
  useEffect(() => {
    frame.current?.contentWindow?.postMessage(
      { source: 'atom-studio', type: 'selection-mode', enabled: selectionMode },
      '*',
    );
  }, [selectionMode, current?.id, tab]);
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
        <span className="mode">{modelReady ? 'AI 已连接' : 'AI 未配置'}</span>
        <Dialog>
          <DialogTrigger className="icon-button" aria-label="模型设置">
            <Settings2 size={19} />
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>AI 模型</DialogTitle>
              <DialogDescription>
                对话与应用构建统一使用部署者配置的真实模型。
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
                    重置。已发出的失败请求也计次，版本操作不计次。
                  </small>
                </div>
              )}
              <div className={`model-status${modelReady ? ' ready' : ''}`}>
                <Circle size={13} />
                {modelReady ? '真实模型已配置' : '真实模型尚未配置'}
              </div>
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
        <aside className="studio-nav" aria-label="工作空间导航">
          <button
            className="new-chat"
            disabled={busy}
            onClick={() => changeProject('')}
          >
            <Plus size={17} /> 新会话
          </button>
          <nav>
            <div className="nav-section">
              <div className="nav-heading">
                <MessageSquare size={15} />
                <span>会话</span>
                <small>{projects.length}</small>
              </div>
              <div className="nav-items">
                {projects.map((item) => (
                  <button
                    key={item.id}
                    className={
                      workspaceView === 'studio' && project === item.id
                        ? 'active'
                        : ''
                    }
                    onClick={() => changeProject(item.id)}
                    disabled={busy}
                    title={item.title}
                  >
                    <MessageSquare size={14} />
                    <span>{item.title}</span>
                  </button>
                ))}
                {!projects.length && <p>还没有会话</p>}
              </div>
            </div>
            <div className="nav-section">
              <div className="nav-heading">
                <AppWindow size={15} />
                <span>我的应用</span>
                <small>
                  {projects.filter((item) => item.published_version).length}
                </small>
              </div>
              <div className="nav-items">
                {projects
                  .filter((item) => item.published_version)
                  .map((item) => (
                    <button
                      key={item.id}
                      className={
                        workspaceView === 'apps' && project === item.id
                          ? 'active'
                          : ''
                      }
                      onClick={() => openApplication(item.id)}
                      disabled={busy}
                      title={item.title}
                    >
                      <Rocket size={14} />
                      <span>{item.title}</span>
                    </button>
                  ))}
                {!projects.some((item) => item.published_version) && (
                  <p>发布后的应用会出现在这里</p>
                )}
              </div>
            </div>
          </nav>
        </aside>
        {workspaceView === 'apps' ? (
          <section className="app-library-detail">
            {current && activeProject ? (
              <>
                <div className="app-library-head">
                  <div>
                    <span className="eyebrow">我的应用</span>
                    <h1>{activeProject.title}</h1>
                    <p>{appDescription}</p>
                  </div>
                  <span className="live-status">
                    <Circle size={11} /> 已发布
                  </span>
                </div>
                <div className="app-library-grid">
                  <div className="app-library-preview">
                    <div className="preview-address">
                      <span className="preview-title">应用预览</span>
                      <span className="preview-version">
                        v{versions.indexOf(current) + 1}
                      </span>
                    </div>
                    <div className="iframe-wrap">
                      <iframe
                        ref={frame}
                        title={`${activeProject.title} 预览`}
                        sandbox="allow-scripts"
                        referrerPolicy="no-referrer"
                        srcDoc={previewDocument(current.html, appStorage)}
                      />
                    </div>
                  </div>
                  <aside className="app-library-info">
                    <div>
                      <span>应用介绍</span>
                      <p>{appDescription}</p>
                    </div>
                    <div>
                      <span>使用说明</span>
                      <ol>
                        {appInstructions
                          .split('\n')
                          .filter(Boolean)
                          .map((instruction) => (
                            <li key={instruction}>{instruction}</li>
                          ))}
                      </ol>
                    </div>
                    <div className="app-library-meta">
                      <span>发布信息</span>
                      <p>版本 v{versions.indexOf(current) + 1}</p>
                      <p>
                        {activeProject.published_at
                          ? new Date(activeProject.published_at).toLocaleString(
                              'zh-CN',
                            )
                          : '已发布'}
                      </p>
                    </div>
                    <div className="app-library-actions">
                      <button onClick={download}>
                        <Download size={15} /> 导出源码
                      </button>
                      <button
                        className="secondary"
                        disabled={busy}
                        onClick={() => changePublication('unpublish')}
                      >
                        <Unlock size={15} /> 取消发布并编辑
                      </button>
                    </div>
                  </aside>
                </div>
              </>
            ) : (
              <div className="empty-preview">选择一个已发布应用查看详情</div>
            )}
          </section>
        ) : (
          <>
            <section className="conversation">
              <div className="project-switch">
                <FolderOpen size={16} />
                <strong>{title || '新会话'}</strong>
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
                      <p>从一个具体的需求开始吧。</p>
                    </div>
                  </div>
                  <div className="suggestions">
                    {[
                      '构建一个待办清单，支持添加和完成任务',
                      '构建一个专注计时器，支持工作与休息',
                      '构建一个记事本，支持搜索笔记',
                    ].map((s) => (
                      <button
                        key={s}
                        disabled={busy}
                        onClick={() => setPrompt(s)}
                      >
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
                                : !message.version &&
                                    !('trace' in message && message.trace)
                                  ? '对话助手'
                                  : '构建 Agent'}
                          </b>
                        </div>
                        <ProcessTrace message={message} />
                        {message.status !== 'pending' && (
                          <p>{message.content}</p>
                        )}
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
                    <p>
                      应用修改已锁定；仍可继续普通讨论，取消发布后可再次构建。
                    </p>
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
                className="composer"
                onSubmit={(e) => {
                  e.preventDefault();
                  void generate().catch(() => {});
                }}
              >
                <textarea
                  aria-label="发送消息或应用需求"
                  maxLength={4000}
                  disabled={busy}
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder={
                    versions.length
                      ? '继续讨论，或描述要修改的功能…'
                      : '聊天，或描述你想构建的应用…'
                  }
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      void generate().catch(() => {});
                    }
                  }}
                />
                {previewSelection && (
                  <div className="selection-context">
                    <MousePointer2 size={14} />
                    <span>
                      已选中 {previewSelection.tag}
                      {previewSelection.text
                        ? ` · ${previewSelection.text.slice(0, 28)}`
                        : ''}
                    </span>
                    <button
                      type="button"
                      aria-label="清除圈选"
                      onClick={() => setPreviewSelection(null)}
                    >
                      ×
                    </button>
                  </div>
                )}
                <div>
                  <span>
                    <Sparkles size={14} />
                    AI Agent · Enter 发送 · Shift+Enter 换行
                  </span>
                  <button
                    disabled={busy || !ready || !prompt.trim()}
                    aria-label="发送"
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
                    <TabsTrigger value="about">
                      <FileText size={15} />
                      说明
                    </TabsTrigger>
                  </TabsList>
                  <div className="preview-actions">
                    {current && !isPublished && (
                      <button
                        className={`review-control${reviewReady ? ' submitted' : ''}`}
                        disabled={busy || reviewReady}
                        onClick={submitReview}
                      >
                        {reviewReady ? <Check size={15} /> : <Send size={15} />}
                        {reviewReady ? '已提交验证' : '提交 Atoms 验证'}
                      </button>
                    )}
                    {current && project && (
                      <button
                        className={`publish-control${isPublished ? ' published' : ''}`}
                        disabled={busy || (!isPublished && !reviewReady)}
                        title={
                          !isPublished && !reviewReady
                            ? '请先提交当前版本的 Atoms 验证请求'
                            : undefined
                        }
                        onClick={() =>
                          changePublication(
                            isPublished ? 'unpublish' : 'publish',
                          )
                        }
                      >
                        {isPublished ? (
                          <Unlock size={15} />
                        ) : (
                          <Rocket size={15} />
                        )}
                        {isPublished ? '取消发布' : '发布当前版本'}
                      </button>
                    )}
                    {current && (
                      <button
                        className={`select-control${selectionMode ? ' active' : ''}`}
                        disabled={isPublished}
                        onClick={() => {
                          setSelectionMode((value) => !value);
                          if (selectionMode) setPreviewSelection(null);
                        }}
                        aria-pressed={selectionMode}
                      >
                        <MousePointer2 size={15} />
                        {selectionMode ? '退出圈选' : '圈选修改'}
                      </button>
                    )}
                    <button
                      aria-label={mobile ? '切换桌面预览' : '切换手机预览'}
                      className="icon-button"
                      onClick={() => setMobile(!mobile)}
                    >
                      {mobile ? (
                        <Monitor size={17} />
                      ) : (
                        <Smartphone size={17} />
                      )}
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
                          {current.mode === 'manual' ? '手动编辑' : 'AI 生成'}
                        </span>
                        <span
                          className={`saved-badge saved-badge-${saveState}`}
                        >
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
                      <div
                        className={'iframe-wrap' + (mobile ? ' mobile' : '')}
                      >
                        <iframe
                          ref={frame}
                          key={current.id}
                          title="生成的应用预览"
                          sandbox="allow-scripts"
                          referrerPolicy="no-referrer"
                          srcDoc={previewDocument(current.html, appStorage)}
                          onLoad={() =>
                            frame.current?.contentWindow?.postMessage(
                              {
                                source: 'atom-studio',
                                type: 'selection-mode',
                                enabled: selectionMode,
                              },
                              '*',
                            )
                          }
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
                  {current && codeFiles ? (
                    <div className="file-workspace">
                      <aside className="file-tree">
                        <div className="file-root">
                          <Folder size={16} /> workspace
                        </div>
                        {Object.keys(codeFiles).map((name) => (
                          <button
                            key={name}
                            className={activeFile === name ? 'active' : ''}
                            onClick={() => setActiveFile(name)}
                          >
                            <FileText size={15} /> {name}
                          </button>
                        ))}
                      </aside>
                      <div className="file-editor">
                        <div className="file-editor-head">
                          <span>
                            workspace / <b>{activeFile}</b>
                          </span>
                          {activeFile === 'index.html' && !isPublished && (
                            <div>
                              {editingCode ? (
                                <>
                                  <button
                                    className="editor-action secondary"
                                    disabled={busy}
                                    onClick={() => {
                                      setEditingCode(false);
                                      setCodeDraft(current.html);
                                    }}
                                  >
                                    <X size={14} /> 取消
                                  </button>
                                  <button
                                    className="editor-action"
                                    disabled={busy || !codeDraft.trim()}
                                    onClick={saveApplicationCode}
                                  >
                                    <Save size={14} /> 保存为新版本
                                  </button>
                                </>
                              ) : (
                                <button
                                  className="editor-action"
                                  onClick={() => {
                                    setCodeDraft(current.html);
                                    setEditingCode(true);
                                  }}
                                >
                                  <Pencil size={14} /> 编辑代码
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                        {editingCode && activeFile === 'index.html' ? (
                          <textarea
                            className="code-editor-input"
                            aria-label="应用 HTML 代码"
                            spellCheck={false}
                            value={codeDraft}
                            onChange={(event) =>
                              setCodeDraft(event.target.value)
                            }
                          />
                        ) : (
                          <pre className="code-view">
                            <code>
                              {codeFiles[activeFile as keyof typeof codeFiles]}
                            </code>
                          </pre>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="empty-preview">生成后查看项目文件</div>
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
                          <button
                            disabled={busy}
                            onClick={() => void fork(v.id)}
                          >
                            创建分支项目
                          </button>
                          <button
                            disabled={busy || isPublished}
                            onClick={() =>
                              void generate('', v.id).catch(() => {})
                            }
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
                <TabsContent value="about">
                  {current ? (
                    <div className="about-app">
                      <div className="about-app-head">
                        <span>应用资料</span>
                        {!isPublished && !editingDetails && (
                          <button
                            className="editor-action"
                            onClick={() => {
                              setDetailsDraft({
                                title: title || guide?.name || '',
                                description: appDescription,
                                instructions: appInstructions,
                              });
                              setEditingDetails(true);
                            }}
                          >
                            <Pencil size={14} /> 编辑资料
                          </button>
                        )}
                      </div>
                      {editingDetails ? (
                        <form
                          className="details-editor"
                          onSubmit={(event) => {
                            event.preventDefault();
                            void saveApplicationDetails();
                          }}
                        >
                          <label>
                            应用名称
                            <input
                              maxLength={80}
                              required
                              value={detailsDraft.title}
                              onChange={(event) =>
                                setDetailsDraft((value) => ({
                                  ...value,
                                  title: event.target.value,
                                }))
                              }
                            />
                          </label>
                          <label>
                            应用介绍
                            <textarea
                              maxLength={600}
                              required
                              value={detailsDraft.description}
                              onChange={(event) =>
                                setDetailsDraft((value) => ({
                                  ...value,
                                  description: event.target.value,
                                }))
                              }
                            />
                          </label>
                          <label>
                            使用说明（每行一条）
                            <textarea
                              maxLength={1200}
                              required
                              value={detailsDraft.instructions}
                              onChange={(event) =>
                                setDetailsDraft((value) => ({
                                  ...value,
                                  instructions: event.target.value,
                                }))
                              }
                            />
                          </label>
                          <div className="details-actions">
                            <button
                              type="button"
                              className="editor-action secondary"
                              onClick={() => setEditingDetails(false)}
                            >
                              取消
                            </button>
                            <button className="editor-action" disabled={busy}>
                              <Save size={14} /> 保存资料
                            </button>
                          </div>
                        </form>
                      ) : (
                        <>
                          <span>应用名称</span>
                          <h2>{title || guide?.name}</h2>
                          <dl>
                            <div>
                              <dt>应用介绍</dt>
                              <dd>{appDescription}</dd>
                            </div>
                            <div>
                              <dt>使用说明</dt>
                              <dd>
                                <ol>
                                  {appInstructions
                                    .split('\n')
                                    .filter(Boolean)
                                    .map((instruction) => (
                                      <li key={instruction}>{instruction}</li>
                                    ))}
                                </ol>
                              </dd>
                            </div>
                          </dl>
                        </>
                      )}
                    </div>
                  ) : (
                    <div className="empty-preview">生成应用后查看说明</div>
                  )}
                </TabsContent>
              </Tabs>
            </section>
          </>
        )}
      </div>
    </main>
  );
}
