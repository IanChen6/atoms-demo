'use client';
import { useState } from 'react';
import {
  Sparkles,
  ArrowRight,
  Loader2,
  GitBranch,
  ShieldCheck,
  FolderOpen,
} from 'lucide-react';
export type Account = { id: string; email: string; name: string };
export default function AuthPanel({
  onAuthenticated,
}: {
  onAuthenticated: (user: Account) => void;
}) {
  const [register, setRegister] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState('');
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (busy) return;
    const data = new FormData(e.currentTarget);
    setBusy(true);
    setError('');
    try {
      if (register && data.get('password') !== data.get('confirm'))
        throw new Error('两次输入的密码不一致');
      const r = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: register ? 'register' : 'login',
          email: data.get('email'),
          password: data.get('password'),
          name: data.get('name'),
        }),
      });
      const body = (await r.json()) as { user: Account; error?: string };
      if (!r.ok) throw new Error(body.error);
      onAuthenticated(body.user);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className="auth-page">
      <header>
        <div className="brand">
          <Sparkles />
          atom<span>STUDIO</span>
        </div>
        <span className="mode">你的应用构建空间</span>
      </header>
      <div className="auth-layout">
        <section className="auth-story">
          <div className="section-label">FROM IDEA TO APP</div>
          <h1>
            每个好想法，
            <br />
            都值得一个<em>开始。</em>
          </h1>
          <p>
            与 Agent 一起构建、预览和迭代。
            <br />
            登录你的工作空间，把下一步变成现实。
          </p>
          <div className="auth-benefits">
            <div>
              <FolderOpen />
              <span>
                <b>随时接着做</b>
                <small>项目和版本跟随账号保存</small>
              </span>
            </div>
            <div>
              <GitBranch />
              <span>
                <b>让想法长出分支</b>
                <small>从任意版本开启一个新方向</small>
              </span>
            </div>
            <div>
              <ShieldCheck />
              <span>
                <b>属于你的工作空间</b>
                <small>每个账号独立管理自己的项目</small>
              </span>
            </div>
          </div>
        </section>
        <section className="auth-card">
          <span className="eyebrow">YOUR WORKSPACE</span>
          <h2>{register ? '创建你的账号' : '欢迎回来'}</h2>
          <p>
            {register
              ? '从一个账号，开始你的第一个应用。'
              : '登录后，继续构建你的想法。'}
          </p>
          <form onSubmit={submit}>
            {register && (
              <label>
                昵称
                <input
                  name="name"
                  required
                  maxLength={40}
                  autoComplete="nickname"
                  placeholder="你希望我们如何称呼你"
                  disabled={busy}
                />
              </label>
            )}
            <label>
              邮箱
              <input
                name="email"
                type="email"
                required
                maxLength={254}
                autoComplete="email"
                placeholder="you@example.com"
                disabled={busy}
              />
            </label>
            <label>
              密码
              <input
                name="password"
                type="password"
                required
                minLength={12}
                maxLength={72}
                autoComplete={register ? 'new-password' : 'current-password'}
                placeholder="至少 12 个字符"
                disabled={busy}
              />
            </label>
            {register && (
              <label>
                确认密码
                <input
                  name="confirm"
                  type="password"
                  required
                  minLength={12}
                  maxLength={72}
                  autoComplete="new-password"
                  placeholder="再次输入密码"
                  disabled={busy}
                />
              </label>
            )}
            {error && (
              <div className="error" role="alert">
                {error}
              </div>
            )}
            <button className="auth-submit" disabled={busy}>
              {busy ? (
                <Loader2 className="spin" size={18} />
              ) : (
                <>
                  {register ? '注册并进入工作空间' : '登录工作空间'}
                  <ArrowRight size={18} />
                </>
              )}
            </button>
          </form>
          <div className="auth-switch">
            {register ? '已有账号？' : '还没有账号？'}
            <button
              disabled={busy}
              onClick={() => {
                setRegister(!register);
                setError('');
              }}
            >
              {register ? '去登录' : '创建账号'}
            </button>
          </div>
          <small className="auth-note">
            {register
              ? '邮箱用作登录标识，当前暂不提供邮件验证和密码找回。'
              : '请使用你在 Atom Studio 注册的账号。'}
          </small>
        </section>
      </div>
    </main>
  );
}
