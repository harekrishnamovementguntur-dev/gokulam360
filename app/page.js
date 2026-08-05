'use client';

import { useEffect, useState } from 'react';

const tokenStore = {
  get() {
    if (typeof window === 'undefined') return null;
    return window.localStorage.getItem('gokulam360_token');
  },
  set(value) {
    if (typeof window === 'undefined') return;
    if (value) window.localStorage.setItem('gokulam360_token', value);
    else window.localStorage.removeItem('gokulam360_token');
  },
};

async function request(path, options = {}) {
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
  const token = tokenStore.get();
  if (token) headers.Authorization = `Bearer ${token}`;
  const response = await fetch(`/api/${path.replace(/^\//, '')}`, { ...options, headers });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error || 'Unable to complete the request.');
  return payload;
}

function initials(name = '') {
  return name.split(/\\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase() || 'GK';
}

function App() {
  const [user, setUser] = useState(null);
  const [organization, setOrganization] = useState(null);
  const [loading, setLoading] = useState(true);

  const refreshSession = async () => {
    try {
      const result = await request('auth/me');
      setUser(result.user);
      setOrganization(result.organization);
    } catch {
      tokenStore.set(null);
      setUser(null);
      setOrganization(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (tokenStore.get()) refreshSession();
    else setLoading(false);
  }, []);

  if (loading) return <PageMessage>Loading Gokulam360…</PageMessage>;
  if (!user) return <Login onLoggedIn={(result) => { tokenStore.set(result.token); setUser(result.user); setOrganization(result.organization); }} />;
  return <Workspace user={user} organization={organization} onLogout={() => { tokenStore.set(null); setUser(null); setOrganization(null); }} />;
}

function Login({ onLoggedIn }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const submit = async (event) => {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      const result = await request('auth/login', {
        method: 'POST',
        body: JSON.stringify({ email: email.trim(), password }),
      });
      onLoggedIn(result);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-10 text-slate-100">
      <div className="mx-auto grid min-h-[80vh] max-w-5xl items-center gap-10 lg:grid-cols-2">
        <section>
          <p className="mb-4 text-sm font-semibold uppercase tracking-[0.25em] text-violet-300">Gokulam360 V2</p>
          <h1 className="max-w-xl text-4xl font-bold tracking-tight md:text-6xl">Temple work, made simple.</h1>
          <p className="mt-5 max-w-lg text-lg leading-8 text-slate-300">One calm workspace for students, classes, attendance, payments, parents, and reports.</p>
        </section>
        <form onSubmit={submit} className="rounded-3xl border border-white/10 bg-white p-6 text-slate-900 shadow-2xl md:p-8">
          <h2 className="text-2xl font-bold">Sign in</h2>
          <p className="mt-2 text-sm text-slate-500">Use your Gokulam360 account.</p>
          <div className="mt-6 space-y-4">
            <label className="block text-sm font-medium">Email<input className="mt-2 w-full rounded-xl border px-3 py-3 outline-none focus:border-violet-500" type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} required /></label>
            <label className="block text-sm font-medium">Password<input className="mt-2 w-full rounded-xl border px-3 py-3 outline-none focus:border-violet-500" type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} required /></label>
            {error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
            <button className="w-full rounded-xl bg-violet-600 px-4 py-3 font-semibold text-white hover:bg-violet-700 disabled:opacity-50" disabled={busy}>{busy ? 'Signing in…' : 'Sign in'}</button>
          </div>
        </form>
      </div>
    </main>
  );
}

function Workspace({ user, organization, onLogout }) {
  const [setupOpen, setSetupOpen] = useState(false);
  const [message, setMessage] = useState('');

  const isSuperAdmin = user.role === 'super_admin';

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <header className="border-b bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 md:px-8">
          <div>
            <p className="text-lg font-bold">Gokulam<span className="text-violet-600">360</span></p>
            <p className="text-xs text-slate-500">{organization?.name || 'Platform administration'}</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="grid h-9 w-9 place-items-center rounded-full bg-violet-100 text-sm font-bold text-violet-700">{initials(user.name)}</div>
            <div className="hidden text-right sm:block"><p className="text-sm font-semibold">{user.name}</p><p className="text-xs capitalize text-slate-500">{user.role.replace('_', ' ')}</p></div>
            <button onClick={onLogout} className="rounded-lg border px-3 py-2 text-sm hover:bg-slate-50">Sign out</button>
          </div>
        </div>
      </header>
      <div className="mx-auto max-w-7xl px-4 py-8 md:px-8">
        {isSuperAdmin && !organization ? (
          <FirstOrganization onCreated={(result) => { setMessage(result); setSetupOpen(false); }} open={setupOpen} onOpenChange={setSetupOpen} />
        ) : (
          <>
            <section className="rounded-3xl bg-gradient-to-br from-violet-700 to-indigo-700 p-6 text-white md:p-8">
              <p className="text-sm text-violet-200">Today</p>
              <h1 className="mt-2 text-3xl font-bold">Welcome, {user.name.split(' ')[0]}.</h1>
              <p className="mt-3 max-w-2xl text-violet-100">Choose the work you need to do. Gokulam360 will handle the underlying records for you.</p>
            </section>
            <section className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <ModuleCard title="Students" description="Enroll students and view their complete history." status="Next module" />
              <ModuleCard title="Attendance" description="Take today's attendance in one clear list." status="Next module" />
              <ModuleCard title="Payments" description="Collect payments without exposing ledger mechanics." status="Next module" />
              <ModuleCard title="Classes" description="Set up programs, terms, and sessions." status="Next module" />
              <ModuleCard title="Parent QR" description="Give families a simple view from the ID card." status="Next module" />
              <ModuleCard title="Reports & Assistant" description="Ask questions and understand what needs attention." status="Next module" />
            </section>
          </>
        )}
        {message && <p className="mt-4 rounded-xl bg-emerald-50 p-4 text-sm text-emerald-700">{message}</p>}
      </div>
    </main>
  );
}

function ModuleCard({ title, description, status }) {
  return <article className="rounded-2xl border bg-white p-5 shadow-sm"><div className="flex items-center justify-between gap-3"><h2 className="font-semibold">{title}</h2><span className="rounded-full bg-slate-100 px-2 py-1 text-[11px] text-slate-500">{status}</span></div><p className="mt-3 text-sm leading-6 text-slate-500">{description}</p></article>;
}

function FirstOrganization({ open, onOpenChange, onCreated }) {
  const [form, setForm] = useState({ name: '', admin_name: '', admin_email: '', admin_mobile: '', admin_password: '' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const submit = async (event) => {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      await request('organizations', {
        method: 'POST',
        body: JSON.stringify({ ...form, contact_email: form.admin_email, contact_phone: form.admin_mobile, currency: 'INR', academic_year: new Date().getFullYear() + '-' + String(new Date().getFullYear() + 1).slice(-2) }),
      });
      onCreated('Organization created. The Organization Administrator can now sign in.');
      setForm({ name: '', admin_name: '', admin_email: '', admin_mobile: '', admin_password: '' });
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setBusy(false);
    }
  };

  if (!open) return <section className="rounded-3xl border border-dashed bg-white p-8 text-center"><h1 className="text-2xl font-bold">Create your first organization</h1><p className="mx-auto mt-3 max-w-lg text-sm leading-6 text-slate-500">This is the only setup step for the Super Admin. After this, the Organization Administrator handles the school.</p><button onClick={() => onOpenChange(true)} className="mt-6 rounded-xl bg-violet-600 px-5 py-3 font-semibold text-white hover:bg-violet-700">Create organization</button></section>;

  return <section className="max-w-xl rounded-3xl border bg-white p-6 shadow-sm md:p-8"><div className="flex items-start justify-between gap-4"><div><h1 className="text-2xl font-bold">Create your first organization</h1><p className="mt-2 text-sm text-slate-500">Enter the temple or school name and the first administrator's details.</p></div><button onClick={() => onOpenChange(false)} className="text-sm text-slate-500">Cancel</button></div><form onSubmit={submit} className="mt-6 space-y-4"><label className="block text-sm font-medium">Organization name<input className="mt-2 w-full rounded-xl border px-3 py-3" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} required /></label><label className="block text-sm font-medium">Administrator name<input className="mt-2 w-full rounded-xl border px-3 py-3" value={form.admin_name} onChange={(event) => setForm({ ...form, admin_name: event.target.value })} required /></label><label className="block text-sm font-medium">Administrator email<input className="mt-2 w-full rounded-xl border px-3 py-3" type="email" value={form.admin_email} onChange={(event) => setForm({ ...form, admin_email: event.target.value })} required /></label><label className="block text-sm font-medium">Administrator mobile<input className="mt-2 w-full rounded-xl border px-3 py-3" type="tel" value={form.admin_mobile} onChange={(event) => setForm({ ...form, admin_mobile: event.target.value })} required /></label><label className="block text-sm font-medium">Temporary password<input className="mt-2 w-full rounded-xl border px-3 py-3" type="password" minLength="8" value={form.admin_password} onChange={(event) => setForm({ ...form, admin_password: event.target.value })} required /></label>{error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}<button disabled={busy} className="w-full rounded-xl bg-violet-600 px-4 py-3 font-semibold text-white disabled:opacity-50">{busy ? 'Creating…' : 'Create organization'}</button></form></section>;
}

function PageMessage({ children }) {
  return <main className="grid min-h-screen place-items-center bg-slate-950 px-4 text-lg text-white">{children}</main>;
}

export default App;
