'use client';

import { useEffect, useState, useMemo, useRef } from 'react';
import { toast } from 'sonner';
import { motion, AnimatePresence, useMotionValue, useSpring, useTransform } from 'framer-motion';
import confetti from 'canvas-confetti';
import {
  BarChart3, Users, GraduationCap, IndianRupee, CalendarCheck2, Calendar as CalendarIcon,
  Building2, LogOut, Menu, Moon, Sun, Search, Plus, Edit3, Trash2, IdCard, Printer,
  UserCircle2, TrendingUp, ChevronRight, Sparkles, Flame, BookOpen, ClipboardCheck,
  Bell, Send, MessageSquare, Camera, FileText, Download, FileSpreadsheet, Command as CmdIcon,
  Rocket, Award, Heart, Activity, ArrowUpRight, Phone, PartyPopper, Zap, Layers, School,
  ChevronLeft, Upload, Check, CheckCircle2, Circle, Palette, Wallet, UserPlus
} from 'lucide-react';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, Tooltip as RTooltip,
  ResponsiveContainer, CartesianGrid, Legend, Area, AreaChart
} from 'recharts';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { Command, CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, CommandSeparator } from '@/components/ui/command';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';

const API = '/api';

/* ---------- helpers ---------- */
const store = {
  get token() { if (typeof window === 'undefined') return null; return localStorage.getItem('g360_token'); },
  set token(v) { if (typeof window === 'undefined') return; v ? localStorage.setItem('g360_token', v) : localStorage.removeItem('g360_token'); },
};
async function api(path, opts = {}) {
  const headers = { 'Content-Type': 'application/json', ...(opts.headers || {}) };
  const t = store.token; if (t) headers.Authorization = `Bearer ${t}`;
  const r = await fetch(`${API}${path}`, { ...opts, headers });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(data.error || 'Request failed');
  return data;
}
const fmtINR = (n) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n || 0);
const initials = (s = '') => s.split(' ').filter(Boolean).map(x => x[0]).join('').slice(0, 2).toUpperCase();
const greet = () => { const h = new Date().getHours(); return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening'; };

/* ---------- Animated number counter ---------- */
function Counter({ value, format = (v) => Math.round(v).toLocaleString(), className = '' }) {
  const mv = useMotionValue(0);
  const spring = useSpring(mv, { stiffness: 90, damping: 20 });
  const [display, setDisplay] = useState('0');
  useEffect(() => { mv.set(typeof value === 'number' ? value : 0); }, [value]);
  useEffect(() => spring.on('change', v => setDisplay(format(v))), [spring]);
  return <span className={className}>{display}</span>;
}

/* ---------- Progress Ring ---------- */
function ProgressRing({ value = 0, size = 96, stroke = 8, color = 'hsl(262 83% 58%)', label }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const [offset, setOffset] = useState(c);
  useEffect(() => {
    const t = setTimeout(() => setOffset(c - (value / 100) * c), 100);
    return () => clearTimeout(t);
  }, [value, c]);
  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} stroke="hsl(var(--muted))" strokeWidth={stroke} fill="none" />
        <circle cx={size / 2} cy={size / 2} r={r} stroke={color} strokeWidth={stroke} fill="none"
          strokeLinecap="round" strokeDasharray={c} strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 1.4s cubic-bezier(.2,.7,.2,1)' }} />
      </svg>
      <div className="absolute text-center">
        <div className="text-xl font-bold"><Counter value={value} format={v => Math.round(v) + '%'} /></div>
        {label && <div className="text-[10px] text-muted-foreground">{label}</div>}
      </div>
    </div>
  );
}

/* ---------- Animated blobs ---------- */
function AuroraBlobs() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      <div className="blob w-96 h-96 bg-orange-400/40" style={{ top: '-8%', left: '-8%' }} />
      <div className="blob w-[500px] h-[500px] bg-rose-400/30" style={{ top: '30%', right: '-10%', animationDelay: '4s' }} />
      <div className="blob w-80 h-80 bg-amber-300/40" style={{ bottom: '-10%', left: '30%', animationDelay: '8s' }} />
      <div className="blob w-72 h-72 bg-fuchsia-400/25" style={{ top: '50%', left: '20%', animationDelay: '2s' }} />
    </div>
  );
}

/* ============================================================
   LOGIN
============================================================ */
function Login({ onLoggedIn }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [seeding, setSeeding] = useState(false);

  const submit = async (e) => {
    e.preventDefault(); setLoading(true);
    try {
      const { token, user } = await api('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) });
      store.token = token;
      toast.success(`Welcome back, ${user.name.split(' ')[0]} 🙏`);
      onLoggedIn(user);
    } catch (e) { toast.error(e.message); } finally { setLoading(false); }
  };
  const seed = async () => {
    setSeeding(true);
    try { await fetch(`${API}/seed`, { method: 'POST' }); toast.success('Demo data ready ✨'); }
    catch { toast.error('Seed failed'); } finally { setSeeding(false); }
  };

  const quickLogin = (em) => { setEmail(em); setPassword('password123'); };

  return (
    <div className="min-h-screen relative overflow-hidden bg-aurora">
      <AuroraBlobs />
      <div className="relative min-h-screen grid md:grid-cols-2 gap-8 p-6 md:p-10">
        {/* Left: form panel (glass) */}
        <div className="flex items-center justify-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}
            className="w-full max-w-md rounded-3xl glass-strong p-8 shadow-2xl"
          >
            <div className="flex items-center gap-3 mb-6">
              <motion.div initial={{ rotate: -10, scale: 0.8 }} animate={{ rotate: 0, scale: 1 }} transition={{ type: 'spring', stiffness: 200 }}
                className="w-12 h-12 rounded-2xl bg-saffron-gradient grid place-items-center shadow-lg ring-glow">
                <Flame className="text-white" size={24} />
              </motion.div>
              <div>
                <div className="text-2xl font-bold tracking-tight">Gokulam<span className="text-gradient">360</span></div>
                <div className="text-xs text-muted-foreground">Sunday School • Multi-tenant SaaS</div>
              </div>
            </div>

            <div className="mb-6">
              <h1 className="text-3xl font-bold tracking-tight">Welcome back 🙏</h1>
              <p className="text-muted-foreground mt-1">Sign in to your organization dashboard.</p>
            </div>

            <form onSubmit={submit} className="space-y-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Email</Label>
                <Input type="email" value={email} onChange={e => setEmail(e.target.value)} className="h-11 bg-white/60 dark:bg-black/20" required />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Password</Label>
                <Input type="password" value={password} onChange={e => setPassword(e.target.value)} className="h-11 bg-white/60 dark:bg-black/20" required />
              </div>
              <Button type="submit" className="w-full h-11 bg-saffron-gradient hover:opacity-95 shadow-lg" disabled={loading}>
                {loading ? 'Signing in…' : <>Sign in <ArrowUpRight size={16} className="ml-1" /></>}
              </Button>
            </form>

            
          </motion.div>
        </div>

        {/* Right: hero */}
        <div className="hidden md:flex items-center justify-center relative">
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.7, delay: 0.1 }}
            className="relative w-full max-w-lg">
            <div className="relative rounded-[2rem] overflow-hidden aurora-border shadow-2xl">
              <img src="https://images.unsplash.com/photo-1641730259879-ad98e7db7bcb" alt="" className="w-full h-[520px] object-cover" />
              <div className="absolute inset-0 bg-gradient-to-tr from-indigo-900/85 via-violet-800/50 to-transparent" />
              <div className="absolute bottom-0 left-0 right-0 p-8 text-white">
                <div className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur-md px-3 py-1 text-[11px] font-medium mb-4">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 pulse-dot" /> Serving Krishna's children
                </div>
                <h2 className="text-3xl font-bold leading-tight text-shadow-warm">Manage with devotion.<br/>Scale with grace.</h2>
                <p className="text-white/85 text-sm mt-3">A premium platform for Hare Krishna Gokulam Schools — students, teachers, attendance, fees, ID cards & more.</p>
              </div>
            </div>
            {/* Floating stat cards */}
            <motion.div animate={{ y: [0, -10, 0] }} transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
              className="absolute -left-6 top-16 rounded-2xl glass-strong p-4 w-44 shadow-xl">
              <div className="flex items-center gap-2 mb-1">
                <div className="w-8 h-8 rounded-lg bg-emerald-gradient grid place-items-center"><TrendingUp size={16} className="text-white" /></div>
                <div className="text-xs text-muted-foreground">Active Students</div>
              </div>
              <div className="text-2xl font-bold">1,240+</div>
              <div className="text-[10px] text-emerald-600">▲ 12% this month</div>
            </motion.div>
            <motion.div animate={{ y: [0, 12, 0] }} transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
              className="absolute -right-4 bottom-24 rounded-2xl glass-strong p-4 w-48 shadow-xl">
              <div className="flex items-center gap-2 mb-1">
                <div className="w-8 h-8 rounded-lg bg-violet-gradient grid place-items-center"><Award size={16} className="text-white" /></div>
                <div className="text-xs text-muted-foreground">Attendance</div>
              </div>
              <div className="text-2xl font-bold">94%</div>
              <Progress value={94} className="h-1.5 mt-1.5" />
            </motion.div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   SHELL
============================================================ */
function Shell({ user, org, onLogout, dark, setDark, refreshMe }) {
  const [view, setView] = useState('dashboard');
  const [cmdOpen, setCmdOpen] = useState(false);
  const [students, setStudents] = useState([]);
  const [teachers, setTeachers] = useState([]);

  useEffect(() => {
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); setCmdOpen(true); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => {
    if (user.role === 'parent') return;
    api('/students').then(r => setStudents(r.items)).catch(() => {});
    api('/teachers').then(r => setTeachers(r.items)).catch(() => {});
  }, [user.role]);

  const nav = useMemo(() => {
    const items = [
      { key: 'dashboard', label: 'Dashboard', icon: BarChart3, roles: ['super_admin', 'org_admin', 'teacher'] },
      { key: 'organizations', label: 'Organizations', icon: Building2, roles: ['super_admin'] },
      { key: 'students', label: 'Students', icon: GraduationCap, roles: ['super_admin', 'org_admin', 'teacher'] },
      { key: 'teachers', label: 'Teachers', icon: Users, roles: ['super_admin', 'org_admin'] },
      { key: 'classes', label: 'Classes & Batches', icon: School, roles: ['super_admin', 'org_admin', 'teacher'] },
      { key: 'attendance', label: 'Attendance', icon: ClipboardCheck, roles: ['super_admin', 'org_admin', 'teacher'] },
      { key: 'fees', label: 'Fees', icon: IndianRupee, roles: ['super_admin', 'org_admin'] },
      { key: 'notifications', label: 'Notifications', icon: Bell, roles: ['super_admin', 'org_admin'] },
      { key: 'reports', label: 'Reports', icon: FileText, roles: ['super_admin', 'org_admin'] },
      { key: 'events', label: 'Events', icon: CalendarIcon, roles: ['super_admin', 'org_admin', 'teacher'] },
      { key: 'backup', label: 'Backup', icon: Download, roles: ['super_admin', 'org_admin'] },
    ];
    return items.filter(i => i.roles.includes(user.role));
  }, [user.role]);

  if (user.role === 'parent') return <ParentPortal user={user} onLogout={onLogout} dark={dark} setDark={setDark} />;

  return (
    <div className="min-h-screen flex bg-aurora relative">
      <AuroraBlobs />
      {/* Sidebar */}
      <aside className="hidden md:flex w-64 shrink-0 flex-col relative z-10">
        <div className="m-4 flex-1 rounded-3xl glass p-4 flex flex-col">
          <div className="px-2 py-3 flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-saffron-gradient grid place-items-center shadow ring-glow">
              <Flame className="text-white" size={20} />
            </div>
            <div>
              <div className="font-bold text-lg leading-none tracking-tight">Gokulam<span className="text-gradient">360</span></div>
              <div className="text-[9px] text-muted-foreground uppercase tracking-widest mt-1">Premium SaaS</div>
            </div>
          </div>
          <nav className="flex-1 mt-4 space-y-1 overflow-y-auto pr-1">
            {nav.map((item, idx) => {
              const Icon = item.icon; const active = view === item.key;
              return (
                <motion.button
                  key={item.key}
                  initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: idx * 0.03 }}
                  onClick={() => setView(item.key)}
                  className={`sidebar-item ${active ? 'active' : ''} w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                    active
                      ? 'bg-gradient-to-r from-primary/15 to-fuchsia-500/10 text-foreground shadow-inner'
                      : 'text-foreground/70 hover:bg-white/40 dark:hover:bg-white/5 hover:text-foreground'
                  }`}
                >
                  <span className={`w-8 h-8 rounded-lg grid place-items-center transition ${active ? 'bg-saffron-gradient text-white shadow' : 'bg-muted text-muted-foreground'}`}>
                    <Icon size={15} />
                  </span>
                  {item.label}
                  {active && <ChevronRight className="ml-auto" size={14} />}
                </motion.button>
              );
            })}
          </nav>
          <div className="mt-3 rounded-2xl p-3 bg-gradient-to-br from-primary/12 via-fuchsia-500/10 to-blue-500/10 border border-primary/20">
            <div className="flex items-center gap-2">
              <Avatar className="h-10 w-10 ring-2 ring-primary/30"><AvatarFallback className="bg-saffron-gradient text-white text-xs font-semibold">{initials(user.name)}</AvatarFallback></Avatar>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-semibold truncate">{user.name}</div>
                <div className="text-[10px] text-muted-foreground truncate capitalize">{user.role.replace('_', ' ')}</div>
              </div>
              <button onClick={onLogout} className="p-1.5 rounded-lg hover:bg-white/40 text-muted-foreground hover:text-foreground transition" title="Logout"><LogOut size={14} /></button>
            </div>
          </div>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 min-w-0 flex flex-col relative z-10">
        <header className="mx-4 mt-4 rounded-2xl glass px-4 md:px-5 h-14 flex items-center gap-3 sticky top-4 z-20">
          <div className="md:hidden">
            <select value={view} onChange={e => setView(e.target.value)} className="rounded-md border px-2 py-1 text-sm bg-transparent">
              {nav.map(n => <option key={n.key} value={n.key}>{n.label}</option>)}
            </select>
          </div>
          <div className="hidden md:flex items-center gap-2 text-sm text-muted-foreground">
            <span className="opacity-70">{org?.name || 'Platform'}</span>
            <ChevronRight size={13} />
            <span className="font-semibold text-foreground capitalize">{nav.find(n => n.key === view)?.label || view}</span>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <button onClick={() => setCmdOpen(true)}
              className="hidden md:flex items-center gap-2 h-9 px-3 rounded-lg bg-white/40 dark:bg-white/5 hover:bg-white/60 border text-sm text-muted-foreground transition">
              <Search size={14} /> <span>Search…</span>
              <kbd className="ml-6 text-[10px] px-1.5 py-0.5 rounded bg-muted border font-mono">⌘K</kbd>
            </button>
            <Button size="icon" variant="ghost" className="rounded-lg" onClick={() => setDark(!dark)}>
              {dark ? <Sun size={16} /> : <Moon size={16} />}
            </Button>
          </div>
        </header>

        <main className="flex-1 px-4 md:px-6 py-6 overflow-x-hidden">
          <AnimatePresence mode="wait">
            <motion.div key={view} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.25 }}>
              {view === 'dashboard' && <Dashboard user={user} org={org} onNav={setView} />}
              {view === 'organizations' && <Organizations />}
              {view === 'students' && <Students students={students} setStudents={setStudents} />}
              {view === 'teachers' && <Teachers teachers={teachers} setTeachers={setTeachers} />}
              {view === 'classes' && <Classes />}
              {view === 'attendance' && <Attendance />}
              {view === 'fees' && <Fees />}
              {view === 'notifications' && <Notifications students={students} />}
              {view === 'reports' && <Reports />}
              {view === 'events' && <Events />}
              {view === 'backup' && <Backup />}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>

      {/* Command palette */}
      <CommandDialog open={cmdOpen} onOpenChange={setCmdOpen}>
        <CommandInput placeholder="Search students, teachers, or jump to a page…" />
        <CommandList>
          <CommandEmpty>No results found.</CommandEmpty>
          <CommandGroup heading="Navigate">
            {nav.map(n => {
              const Icon = n.icon;
              return (
                <CommandItem key={n.key} onSelect={() => { setView(n.key); setCmdOpen(false); }}>
                  <Icon size={14} className="mr-2 text-primary" /> {n.label}
                </CommandItem>
              );
            })}
          </CommandGroup>
          {students.length > 0 && (
            <>
              <CommandSeparator />
              <CommandGroup heading="Students">
                {students.slice(0, 20).map(s => (
                  <CommandItem key={s.id} onSelect={() => { setView('students'); setCmdOpen(false); }}>
                    <GraduationCap size={14} className="mr-2 text-primary" />
                    {s.first_name} {s.last_name} <span className="ml-2 text-xs text-muted-foreground">{s.student_id}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            </>
          )}
          {teachers.length > 0 && (
            <>
              <CommandSeparator />
              <CommandGroup heading="Teachers">
                {teachers.slice(0, 10).map(t => (
                  <CommandItem key={t.id} onSelect={() => { setView('teachers'); setCmdOpen(false); }}>
                    <Users size={14} className="mr-2 text-primary" /> {t.name}
                  </CommandItem>
                ))}
              </CommandGroup>
            </>
          )}
        </CommandList>
      </CommandDialog>
    </div>
  );
}

/* ============================================================
   DASHBOARD (hero + KPIs + charts + timeline + heatmap)
============================================================ */
function Dashboard({ user, org, onNav }) {
  const [stats, setStats] = useState(null);
  const [activity, setActivity] = useState([]);
  useEffect(() => {
    api('/dashboard').then(setStats).catch(e => toast.error(e.message));
    api('/activity').then(r => setActivity(r.items)).catch(() => {});
  }, []);

  if (!stats) return <DashboardSkeleton />;

  const kpis = [
    { key: 'students', label: 'Total Students', value: stats.totalStudents, sub: `${stats.activeStudents} active`, icon: GraduationCap, grad: 'bg-saffron-gradient', ring: 'from-orange-500/40 to-amber-500/20' },
    { key: 'attendance', label: 'Attendance', value: stats.attendancePct, isPct: true, sub: 'last 4 weeks', icon: CalendarCheck2, grad: 'bg-emerald-gradient', ring: 'from-emerald-500/40 to-teal-500/20' },
    { key: 'pending', label: 'Pending Fees', value: stats.pendingFees, isMoney: true, sub: `${fmtINR(stats.collectedFees)} collected`, icon: IndianRupee, grad: 'bg-rose-gradient', ring: 'from-rose-500/40 to-pink-500/20' },
    { key: 'teachers', label: 'Teachers', value: stats.totalTeachers, sub: 'Faculty on board', icon: Users, grad: 'bg-violet-gradient', ring: 'from-violet-500/40 to-fuchsia-500/20' },
  ];

  return (
    <div className="space-y-6">
      {/* HERO GREETING */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
        className="relative overflow-hidden rounded-3xl p-6 md:p-8 bg-mesh-warm border">
        <div className="absolute -right-10 -top-10 w-64 h-64 rounded-full bg-white/30 blur-3xl" />
        <div className="absolute right-10 bottom-4 opacity-20 hidden md:block">
          <Flame size={160} className="text-violet-600" />
        </div>
        <div className="relative">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/60 backdrop-blur px-3 py-1 text-[11px] font-medium mb-3">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 pulse-dot" /> Live • {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}
          </div>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-indigo-950 dark:text-indigo-100">
            {greet()}, <span className="text-gradient">{user.name.split(' ')[0]}</span> 🙏
          </h1>
          <p className="text-indigo-900/75 dark:text-indigo-100/70 mt-2 max-w-xl">
            Here's a spiritual snapshot of <span className="font-semibold">{org?.name || 'your organization'}</span>. Every child served is Krishna served.
          </p>
          <div className="flex flex-wrap gap-2 mt-4">
            <Button size="sm" className="bg-saffron-gradient shadow" onClick={() => onNav('students')}><Plus size={14} className="mr-1" /> Add Student</Button>
            <Button size="sm" variant="secondary" className="glass" onClick={() => onNav('attendance')}><ClipboardCheck size={14} className="mr-1" /> Mark Attendance</Button>
            <Button size="sm" variant="secondary" className="glass" onClick={() => onNav('notifications')}><Send size={14} className="mr-1" /> Send Notification</Button>
            <Button size="sm" variant="secondary" className="glass" onClick={() => onNav('reports')}><FileText size={14} className="mr-1" /> View Reports</Button>
          </div>
        </div>
      </motion.div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((k, i) => {
          const Icon = k.icon;
          return (
            <motion.div key={k.key}
              initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}
              className={`card-lift relative overflow-hidden rounded-2xl glass p-5`}>
              <div className={`absolute -right-6 -top-6 w-28 h-28 rounded-full bg-gradient-to-br ${k.ring} blur-2xl`} />
              <div className="relative">
                <div className={`w-11 h-11 rounded-xl ${k.grad} grid place-items-center shadow-lg mb-3`}>
                  <Icon className="text-white" size={20} />
                </div>
                <div className="text-3xl font-bold tracking-tight">
                  {k.isMoney ? <><span className="text-xl">₹</span><Counter value={k.value} format={v => Math.round(v).toLocaleString('en-IN')} /></>
                    : k.isPct ? <><Counter value={k.value} /><span className="text-xl">%</span></>
                    : <Counter value={k.value} />}
                </div>
                <div className="text-xs text-muted-foreground mt-1">{k.label}</div>
                <div className="text-[10px] text-emerald-600 mt-1 font-medium">{k.sub}</div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Charts row */}
      <div className="grid lg:grid-cols-3 gap-4">
        <motion.div className="lg:col-span-2 rounded-2xl glass p-5 card-lift" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}>
          <div className="flex items-center justify-between mb-3">
            <div>
              <div className="text-sm font-semibold flex items-center gap-1.5"><TrendingUp size={14} className="text-primary" /> Monthly Admissions</div>
              <div className="text-[11px] text-muted-foreground">New students joined per month</div>
            </div>
            <Badge variant="secondary" className="text-[10px]">Last 6 months</Badge>
          </div>
          <div className="h-64">
            <ResponsiveContainer>
              <AreaChart data={stats.monthlyAdmissions}>
                <defs>
                  <linearGradient id="admGrad" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0%" stopColor="hsl(262 83% 58%)" stopOpacity={0.6} />
                    <stop offset="100%" stopColor="hsl(224 90% 58%)" stopOpacity={0.05} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted/40" vertical={false} />
                <XAxis dataKey="month" fontSize={11} stroke="hsl(var(--muted-foreground))" />
                <YAxis fontSize={11} allowDecimals={false} stroke="hsl(var(--muted-foreground))" />
                <RTooltip contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 10px 30px rgba(0,0,0,0.1)' }} />
                <Area type="monotone" dataKey="count" stroke="hsl(262 83% 58%)" strokeWidth={2.5} fill="url(#admGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        <motion.div className="rounded-2xl glass p-5 card-lift text-center" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.25 }}>
          <div className="text-sm font-semibold flex items-center gap-1.5 mb-1"><Award size={14} className="text-primary" /> Attendance</div>
          <div className="text-[11px] text-muted-foreground mb-4">Overall performance</div>
          <div className="flex flex-col items-center">
            <ProgressRing value={stats.attendancePct} size={160} stroke={14} label="Overall" />
            <div className="grid grid-cols-2 gap-3 w-full mt-5">
              <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/20 p-2.5">
                <div className="text-lg font-bold text-emerald-600"><Counter value={stats.activeStudents} /></div>
                <div className="text-[10px] text-muted-foreground">Active</div>
              </div>
              <div className="rounded-xl bg-rose-500/10 border border-rose-500/20 p-2.5">
                <div className="text-lg font-bold text-rose-600"><Counter value={stats.totalStudents - stats.activeStudents} /></div>
                <div className="text-[10px] text-muted-foreground">Inactive</div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Heatmap + Activity Timeline */}
      <div className="grid lg:grid-cols-3 gap-4">
        <motion.div className="lg:col-span-2 rounded-2xl glass p-5" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}>
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="text-sm font-semibold flex items-center gap-1.5"><Activity size={14} className="text-primary" /> Attendance Heatmap</div>
              <div className="text-[11px] text-muted-foreground">Last 12 weeks • darker = higher attendance</div>
            </div>
          </div>
          <Heatmap trend={stats.attendanceTrend} />
        </motion.div>

        <motion.div className="rounded-2xl glass p-5" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.35 }}>
          <div className="text-sm font-semibold flex items-center gap-1.5 mb-3"><Zap size={14} className="text-primary" /> Recent Activity</div>
          <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
            {activity.length === 0 && <EmptyState small text="No activity yet" />}
            {activity.map((a, i) => (
              <motion.div key={a.id} initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.04 }}
                className="flex gap-3">
                <div className="relative">
                  <div className={`w-8 h-8 rounded-lg grid place-items-center text-white ${
                    a.kind === 'student_added' ? 'bg-saffron-gradient' :
                    a.kind === 'attendance' ? 'bg-emerald-gradient' :
                    a.kind === 'fee_paid' ? 'bg-rose-gradient' :
                    a.kind === 'notification' ? 'bg-violet-gradient' :
                    a.kind === 'event' ? 'bg-teal-gradient' : 'bg-muted'}`}>
                    {a.kind === 'student_added' ? <GraduationCap size={14} /> :
                     a.kind === 'attendance' ? <ClipboardCheck size={14} /> :
                     a.kind === 'fee_paid' ? <IndianRupee size={14} /> :
                     a.kind === 'notification' ? <Bell size={14} /> :
                     a.kind === 'event' ? <CalendarIcon size={14} /> : <Sparkles size={14} />}
                  </div>
                  {i < activity.length - 1 && <div className="absolute left-1/2 top-8 w-px h-6 bg-border -translate-x-1/2" />}
                </div>
                <div className="flex-1 min-w-0 pb-2">
                  <div className="text-xs font-medium leading-tight">{a.title}</div>
                  <div className="text-[10px] text-muted-foreground mt-0.5">{a.actor} • {timeAgo(a.created_at)}</div>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Upcoming events + Motivational */}
      <div className="grid lg:grid-cols-3 gap-4">
        <motion.div className="lg:col-span-2 rounded-2xl glass p-5" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }}>
          <div className="text-sm font-semibold flex items-center gap-1.5 mb-3"><CalendarIcon size={14} className="text-primary" /> Upcoming Events</div>
          {stats.upcomingEvents.length === 0 ? <EmptyState text="No upcoming events" small /> : (
            <div className="grid md:grid-cols-2 gap-3">
              {stats.upcomingEvents.map((e, i) => (
                <motion.div key={e.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                  className="rounded-xl p-3 bg-gradient-to-br from-primary/10 to-blue-500/5 border border-primary/20 card-lift">
                  <div className="flex items-start gap-3">
                    <div className="rounded-lg bg-saffron-gradient text-white w-12 h-12 grid place-items-center text-center">
                      <div>
                        <div className="text-[9px] uppercase">{new Date(e.date).toLocaleString('en', { month: 'short' })}</div>
                        <div className="text-lg font-bold leading-none">{new Date(e.date).getDate()}</div>
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold truncate">{e.name}</div>
                      <div className="text-[11px] text-muted-foreground line-clamp-2">{e.description}</div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </motion.div>

        <motion.div className="rounded-2xl overflow-hidden relative p-5 text-white shadow-2xl" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.45 }}
          style={{ background: 'linear-gradient(135deg, #4c1d95 0%, #7c3aed 55%, #a855f7 100%)' }}>
          <div className="absolute -right-8 -bottom-8 opacity-20">
            <Heart size={140} />
          </div>
          <div className="relative">
            <div className="inline-flex items-center gap-1.5 text-[10px] font-semibold bg-white/20 rounded-full px-2 py-0.5 mb-3">
              <Sparkles size={10} /> DAILY INSPIRATION
            </div>
            <div className="text-lg font-semibold leading-snug">"For those who take pleasure in the self, whose human life is one of self-realization, there is no duty."</div>
            <div className="text-xs opacity-80 mt-2">— Bhagavad Gita 3.17</div>
            <div className="mt-4 flex items-center gap-2 text-[11px] opacity-85">
              <PartyPopper size={12} /> Every child taught is a soul awakened
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-40 rounded-3xl" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-32 rounded-2xl" />)}
      </div>
      <div className="grid lg:grid-cols-3 gap-4"><Skeleton className="h-72 rounded-2xl lg:col-span-2" /><Skeleton className="h-72 rounded-2xl" /></div>
    </div>
  );
}

function Heatmap({ trend }) {
  // Generate a 12-week grid: rows are days of week (Sun..Sat), columns weeks
  const weeks = 12;
  const map = {};
  (trend || []).forEach(t => { map[t.date] = t.present / Math.max(1, t.present + t.absent); });
  const cells = [];
  const today = new Date();
  const start = new Date(today); start.setDate(today.getDate() - (weeks * 7));
  for (let w = 0; w < weeks; w++) {
    const col = [];
    for (let d = 0; d < 7; d++) {
      const day = new Date(start); day.setDate(start.getDate() + w * 7 + d);
      const key = day.toISOString().slice(0, 10);
      const v = map[key]; // 0..1 or undefined
      col.push({ key, v, day });
    }
    cells.push(col);
  }
  const intensity = (v) => {
    if (v === undefined) return 'bg-muted/40';
    if (v > 0.9) return 'bg-emerald-600';
    if (v > 0.75) return 'bg-emerald-500/80';
    if (v > 0.5) return 'bg-emerald-400/70';
    if (v > 0.25) return 'bg-emerald-300/60';
    return 'bg-rose-300/50';
  };
  return (
    <div>
      <div className="flex gap-1">
        {cells.map((col, ci) => (
          <div key={ci} className="flex flex-col gap-1">
            {col.map(c => (
              <div key={c.key} title={`${c.key} • ${c.v === undefined ? 'no data' : Math.round(c.v * 100) + '%'}`}
                className={`w-4 h-4 rounded-sm ${intensity(c.v)}`} />
            ))}
          </div>
        ))}
      </div>
      <div className="flex items-center justify-between mt-3 text-[10px] text-muted-foreground">
        <span>{cells[0][0].day.toLocaleDateString('en', { month: 'short', day: 'numeric' })}</span>
        <div className="flex items-center gap-1">
          <span>Less</span>
          <div className="w-3 h-3 rounded-sm bg-rose-300/50" />
          <div className="w-3 h-3 rounded-sm bg-emerald-300/60" />
          <div className="w-3 h-3 rounded-sm bg-emerald-400/70" />
          <div className="w-3 h-3 rounded-sm bg-emerald-500/80" />
          <div className="w-3 h-3 rounded-sm bg-emerald-600" />
          <span>More</span>
        </div>
        <span>Today</span>
      </div>
    </div>
  );
}

function timeAgo(iso) {
  const d = new Date(iso); const diff = Math.floor((Date.now() - d.getTime()) / 1000);
  if (diff < 60) return 'just now';
  if (diff < 3600) return Math.floor(diff / 60) + 'm ago';
  if (diff < 86400) return Math.floor(diff / 3600) + 'h ago';
  return Math.floor(diff / 86400) + 'd ago';
}

function EmptyState({ text = 'Nothing here yet', small = false, action }) {
  return (
    <div className={`flex flex-col items-center justify-center text-center ${small ? 'py-4' : 'py-16'}`}>
      <div className={`${small ? 'w-14 h-14' : 'w-24 h-24'} rounded-full bg-gradient-to-br from-primary/20 to-blue-500/15 dark:from-primary/30 dark:to-blue-500/25 grid place-items-center mb-3`}>
        <Sparkles className="text-primary" size={small ? 18 : 36} />
      </div>
      <div className={`${small ? 'text-xs' : 'text-sm'} font-medium text-muted-foreground`}>{text}</div>
      {action}
    </div>
  );
}

/* ============================================================
   IMPORT STUDENTS (CSV / XLSX)
============================================================ */
function ImportStudents({ programs, onImported }) {
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState([]);
  const [fileName, setFileName] = useState('');
  const [importing, setImporting] = useState(false);
  const fileRef = useRef(null);

  const template = [
    { first_name: 'Krishna', last_name: 'Sharma', dob: '2015-05-12', gender: 'Male', mobile: '+919876543210', email: 'krishna@example.com', father_name: 'Ramesh Sharma', mother_name: 'Sita Sharma', emergency_contact: '+919812345678', address: 'Vrindavan Colony, Kochi', program: programs[0]?.name || 'Sunday School', status: 'active' },
    { first_name: 'Radha', last_name: 'Menon', dob: '2016-08-24', gender: 'Female', mobile: '+919876000001', email: 'radha@example.com', father_name: 'Mohan Menon', mother_name: 'Lakshmi Menon', emergency_contact: '+919812345679', address: 'Kochi', program: programs[1]?.name || 'Sunday School', status: 'active' },
  ];

  const downloadTemplate = async () => {
    const XLSX = await import('xlsx');
    const ws = XLSX.utils.json_to_sheet(template);
    const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, 'Students');
    XLSX.writeFile(wb, 'gokulam360-students-template.xlsx');
  };

  const onFile = async (e) => {
    const file = e.target.files?.[0]; if (!file) return;
    setFileName(file.name);
    const buf = await file.arrayBuffer();
    if (file.name.endsWith('.csv')) {
      const text = new TextDecoder().decode(buf);
      const lines = text.split(/\r?\n/).filter(Boolean);
      const headers = lines[0].split(',').map(h => h.replace(/^"|"$/g, '').trim());
      const parsed = lines.slice(1).map(line => {
        const cells = line.match(/("([^"]*)"|[^,]+)/g)?.map(c => c.replace(/^"|"$/g, '').trim()) || [];
        return Object.fromEntries(headers.map((h, i) => [h, cells[i] || '']));
      });
      setRows(parsed);
    } else {
      const XLSX = await import('xlsx');
      const wb = XLSX.read(buf);
      const first = wb.SheetNames[0];
      const parsed = XLSX.utils.sheet_to_json(wb.Sheets[first], { defval: '' });
      setRows(parsed);
    }
  };

  const submit = async () => {
    setImporting(true);
    try {
      const res = await api('/students-import', { method: 'POST', body: JSON.stringify({ rows }) });
      confetti({ particleCount: Math.min(200, res.imported * 4), spread: 90, origin: { y: 0.6 }, colors: ['#7c3aed', '#4f46e5', '#a855f7', '#22c55e'] });
      toast.success(`🎉 Imported ${res.imported} students${res.errors.length ? ` • ${res.errors.length} skipped` : ''}`);
      setOpen(false); setRows([]); setFileName('');
      onImported && onImported();
    } catch (e) { toast.error(e.message); }
    finally { setImporting(false); }
  };

  const previewCols = ['first_name', 'last_name', 'mobile', 'program', 'gender', 'status'];

  return (
    <>
      <Button variant="outline" onClick={() => setOpen(true)}><Upload size={15} className="mr-1" /> Import</Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Bulk Import Students</DialogTitle>
            <DialogDescription>Upload a CSV or Excel file. Columns: first_name, last_name, dob, gender, mobile, email, father_name, mother_name, emergency_contact, address, program, status</DialogDescription>
          </DialogHeader>

          {rows.length === 0 ? (
            <div className="space-y-4">
              <div className="rounded-2xl border-2 border-dashed border-primary/30 bg-primary/5 p-8 text-center hover:bg-primary/10 transition cursor-pointer" onClick={() => fileRef.current?.click()}>
                <div className="w-14 h-14 rounded-2xl bg-saffron-gradient text-white grid place-items-center mx-auto mb-3 shadow-lg"><Upload size={22} /></div>
                <div className="font-semibold">Drop your file here or click to browse</div>
                <div className="text-xs text-muted-foreground mt-1">.csv, .xlsx, .xls — up to 500 students</div>
                <input ref={fileRef} type="file" accept=".csv,.xlsx,.xls" hidden onChange={onFile} />
              </div>
              <div className="flex items-center gap-2 justify-center">
                <span className="text-xs text-muted-foreground">First time?</span>
                <Button size="sm" variant="link" onClick={downloadTemplate}><Download size={13} className="mr-1" /> Download Excel template</Button>
              </div>
              <div className="text-[11px] text-muted-foreground text-center">
                Program names must match existing programs (case-insensitive). Missing programs default to unassigned.
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="text-sm">
                  <span className="font-semibold">{rows.length} rows</span> parsed from <code className="text-xs">{fileName}</code>
                </div>
                <Button size="sm" variant="ghost" onClick={() => { setRows([]); setFileName(''); }}>Change file</Button>
              </div>
              <div className="rounded-xl border overflow-hidden max-h-80 overflow-y-auto">
                <Table>
                  <TableHeader className="sticky top-0 bg-card">
                    <TableRow>{previewCols.map(c => <TableHead key={c} className="text-[11px] uppercase">{c.replace('_', ' ')}</TableHead>)}</TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.slice(0, 50).map((r, i) => (
                      <TableRow key={i}>
                        {previewCols.map(c => (
                          <TableCell key={c} className="text-xs whitespace-nowrap">{String(r[c] || r[c.replace('_', ' ')] || '-')}</TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                {rows.length > 50 && <div className="text-center text-[11px] text-muted-foreground py-2">…and {rows.length - 50} more rows</div>}
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button className="bg-saffron-gradient" onClick={submit} disabled={importing || rows.length === 0}>
              {importing ? 'Importing…' : `Import ${rows.length} students`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

/* ============================================================
   ORGANIZATIONS + WIZARD
============================================================ */
function Organizations() {
  const [items, setItems] = useState([]);
  const [wizardOpen, setWizardOpen] = useState(false);
  const load = () => api('/organizations').then(r => setItems(r.items));
  useEffect(() => { load(); }, []);

  return (
    <div className="space-y-5">
      <PageHeader title="Organizations" subtitle="Manage every tenant on Gokulam360" icon={Building2}
        action={<Button onClick={() => setWizardOpen(true)} className="bg-saffron-gradient shadow"><Plus size={15} className="mr-1" /> New Organization</Button>} />
      {items.length === 0 ? <EmptyState text="No organizations yet" action={<Button className="mt-3 bg-saffron-gradient" onClick={() => setWizardOpen(true)}><Plus size={14} className="mr-1" />Create first organization</Button>} /> : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map((o, i) => (
            <motion.div key={o.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
              className="rounded-2xl glass p-5 card-lift">
              <div className="flex items-start gap-3">
                <div className="w-12 h-12 rounded-2xl bg-saffron-gradient text-white grid place-items-center shadow"><Building2 size={20} /></div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold truncate">{o.name}</div>
                  <div className="text-xs text-muted-foreground truncate">{o.address}</div>
                </div>
                <Badge variant="secondary">{o.currency}</Badge>
              </div>
              <div className="mt-3 space-y-1 text-xs">
                <div className="flex items-center gap-2"><span className="text-muted-foreground">Email</span><span className="ml-auto font-medium truncate max-w-[60%]">{o.contact_email || '-'}</span></div>
                <div className="flex items-center gap-2"><span className="text-muted-foreground">Phone</span><span className="ml-auto font-medium">{o.contact_phone || '-'}</span></div>
                <div className="flex items-center gap-2"><span className="text-muted-foreground">Since</span><span className="ml-auto font-medium">{new Date(o.created_at).toLocaleDateString()}</span></div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
      <OrgWizard open={wizardOpen} onOpenChange={setWizardOpen} onCreated={() => { setWizardOpen(false); load(); }} />
    </div>
  );
}

function OrgWizard({ open, onOpenChange, onCreated }) {
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: '', address: '',
    contact_email: '', contact_phone: '',
    currency: 'INR', academic_year: '2025-26', logo_url: '',
    admin_name: '', admin_email: '', admin_password: '',
    first_program: { name: 'Sunday School', description: 'Weekly spiritual education for children', age_group: '6-14', duration_months: 4, capacity: 40, start_date: '', end_date: '' },
    fees: { admission: 500, term: 1500 },
  });
  const set = (patch) => setForm(f => ({ ...f, ...patch }));
  const setProgram = (patch) => setForm(f => ({ ...f, first_program: { ...f.first_program, ...patch } }));
  const setFees = (patch) => setForm(f => ({ ...f, fees: { ...f.fees, ...patch } }));

  const steps = [
    { key: 'welcome', title: 'Welcome', icon: Sparkles, subtitle: "Let's set up your Sunday School" },
    { key: 'details', title: 'Organization', icon: Building2, subtitle: 'Basic details' },
    { key: 'contact', title: 'Contact', icon: Phone, subtitle: 'How families reach you' },
    { key: 'branding', title: 'Branding', icon: Palette, subtitle: 'Currency & academic year' },
    { key: 'admin', title: 'Admin', icon: UserPlus, subtitle: 'First admin account' },
    { key: 'program', title: 'First Program', icon: BookOpen, subtitle: 'Add your inaugural class' },
    { key: 'review', title: 'Launch', icon: Rocket, subtitle: 'Review & create' },
  ];

  const canNext = () => {
    const s = steps[step].key;
    if (s === 'details') return form.name.trim().length > 1;
    if (s === 'contact') return form.contact_email.includes('@');
    if (s === 'admin') return form.admin_name && form.admin_email.includes('@') && form.admin_password.length >= 6;
    if (s === 'program') return true;
    return true;
  };

  const next = () => { if (!canNext()) { toast.error('Please complete required fields'); return; } setStep(s => Math.min(steps.length - 1, s + 1)); };
  const prev = () => setStep(s => Math.max(0, s - 1));

  const submit = async () => {
    setSaving(true);
    try {
      await api('/organizations', { method: 'POST', body: JSON.stringify(form) });
      confetti({ particleCount: 250, spread: 100, origin: { y: 0.5 }, colors: ['#7c3aed', '#4f46e5', '#a855f7', '#22c55e', '#f43f5e'] });
      toast.success(`🎉 ${form.name} is live!`);
      onCreated();
      // Reset
      setStep(0);
      setForm({ name: '', address: '', contact_email: '', contact_phone: '', currency: 'INR', academic_year: '2025-26', logo_url: '', admin_name: '', admin_email: '', admin_password: '', first_program: { name: 'Sunday School', description: '', age_group: '6-14', duration_months: 4, capacity: 40, start_date: '', end_date: '' }, fees: { admission: 500, term: 1500 } });
    } catch (e) { toast.error(e.message); }
    finally { setSaving(false); }
  };

  const s = steps[step];
  const StepIcon = s.icon;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl p-0 overflow-hidden max-h-[92vh]">
        <div className="grid md:grid-cols-[220px_1fr]">
          {/* Left rail */}
          <div className="hidden md:flex flex-col bg-gradient-to-b from-primary/15 via-blue-500/10 to-fuchsia-500/10 p-5 border-r">
            <div className="flex items-center gap-2 mb-6">
              <div className="w-9 h-9 rounded-xl bg-saffron-gradient grid place-items-center text-white shadow ring-glow"><Flame size={16} /></div>
              <div className="font-bold text-sm">Gokulam<span className="text-gradient">360</span></div>
            </div>
            <div className="space-y-1">
              {steps.map((st, i) => {
                const done = i < step; const active = i === step; const Ic = st.icon;
                return (
                  <div key={st.key} className={`flex items-center gap-2.5 py-2 px-2 rounded-lg text-[12px] transition ${active ? 'bg-white/70 dark:bg-white/10 shadow-sm font-semibold' : 'opacity-70'}`}>
                    <div className={`w-6 h-6 rounded-full grid place-items-center text-white text-[10px] font-semibold shrink-0 ${done ? 'bg-emerald-500' : active ? 'bg-saffron-gradient' : 'bg-muted text-muted-foreground'}`}>
                      {done ? <Check size={12} /> : <Ic size={11} />}
                    </div>
                    <span>{st.title}</span>
                  </div>
                );
              })}
            </div>
            <div className="mt-auto rounded-xl bg-white/60 dark:bg-black/20 backdrop-blur p-3">
              <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">Step {step + 1} of {steps.length}</div>
              <Progress value={((step + 1) / steps.length) * 100} className="h-1.5" />
            </div>
          </div>

          {/* Right content */}
          <div className="p-6 md:p-8 flex flex-col max-h-[92vh] overflow-y-auto">
            <AnimatePresence mode="wait">
              <motion.div key={step} initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -12 }} transition={{ duration: 0.25 }} className="flex-1 min-h-[340px]">
                <div className="flex items-center gap-3 mb-5">
                  <div className="w-11 h-11 rounded-2xl bg-saffron-gradient text-white grid place-items-center shadow-lg"><StepIcon size={18} /></div>
                  <div>
                    <div className="text-xl font-bold tracking-tight">{s.title}</div>
                    <div className="text-xs text-muted-foreground">{s.subtitle}</div>
                  </div>
                </div>

                {s.key === 'welcome' && (
                  <div className="space-y-4 text-center py-4">
                    <motion.div initial={{ scale: 0.7 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 180 }}
                      className="mx-auto w-24 h-24 rounded-3xl bg-saffron-gradient grid place-items-center text-white shadow-2xl ring-glow">
                      <Rocket size={40} />
                    </motion.div>
                    <div className="text-2xl font-bold">Welcome to Gokulam<span className="text-gradient">360</span></div>
                    <div className="text-sm text-muted-foreground max-w-md mx-auto">
                      In just 6 quick steps you'll launch a fully-configured Sunday School — with an admin account, first program, and everything ready for enrolments.
                    </div>
                    <div className="flex justify-center gap-3 pt-3">
                      {[
                        { icon: Building2, label: 'Multi-tenant' },
                        { icon: Users, label: 'Roles' },
                        { icon: MessageSquare, label: 'WhatsApp' },
                        { icon: IdCard, label: 'ID Cards' },
                      ].map(f => (
                        <div key={f.label} className="rounded-xl bg-white/60 dark:bg-white/5 border p-3 min-w-[100px]">
                          <div className="w-8 h-8 rounded-lg bg-saffron-gradient text-white grid place-items-center mx-auto mb-1.5"><f.icon size={14} /></div>
                          <div className="text-[11px] font-medium">{f.label}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {s.key === 'details' && (
                  <div className="space-y-3">
                    <div><Label>Organization Name *</Label><Input value={form.name} onChange={e => set({ name: e.target.value })} placeholder="e.g. ISKCON Gokulam Sunday School" /></div>
                    <div><Label>Address</Label><Textarea rows={2} value={form.address} onChange={e => set({ address: e.target.value })} placeholder="Full address for records" /></div>
                  </div>
                )}

                {s.key === 'contact' && (
                  <div className="space-y-3">
                    <div><Label>Primary Email *</Label><Input type="email" value={form.contact_email} onChange={e => set({ contact_email: e.target.value })} placeholder="contact@yourorg.org" /></div>
                    <div><Label>Phone</Label><Input value={form.contact_phone} onChange={e => set({ contact_phone: e.target.value })} placeholder="+91 98765 43210" /></div>
                    <div className="rounded-xl bg-primary/5 border border-primary/20 p-3 text-[11px] text-muted-foreground">
                      💡 This is displayed on ID cards, receipts and parent communications.
                    </div>
                  </div>
                )}

                {s.key === 'branding' && (
                  <div className="grid grid-cols-2 gap-3">
                    <div><Label>Currency</Label>
                      <Select value={form.currency} onValueChange={v => set({ currency: v })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="INR">₹ INR — Indian Rupee</SelectItem>
                          <SelectItem value="USD">$ USD — US Dollar</SelectItem>
                          <SelectItem value="GBP">£ GBP — British Pound</SelectItem>
                          <SelectItem value="EUR">€ EUR — Euro</SelectItem>
                          <SelectItem value="AUD">A$ AUD — Australian Dollar</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div><Label>Academic Year</Label><Input value={form.academic_year} onChange={e => set({ academic_year: e.target.value })} placeholder="2025-26" /></div>
                    <div className="col-span-2 mt-2">
                      <Label>Fee defaults</Label>
                      <div className="grid grid-cols-2 gap-2 mt-1">
                        <Input type="number" value={form.fees.admission} onChange={e => setFees({ admission: Number(e.target.value) })} placeholder="Admission fee" />
                        <Input type="number" value={form.fees.term} onChange={e => setFees({ term: Number(e.target.value) })} placeholder="Term fee" />
                      </div>
                    </div>
                  </div>
                )}

                {s.key === 'admin' && (
                  <div className="space-y-3">
                    <div className="rounded-xl p-3 bg-gradient-to-br from-primary/10 to-blue-500/10 border border-primary/20 text-[11px]">
                      This person will manage this organization end-to-end. They'll get their own login.
                    </div>
                    <div><Label>Full Name *</Label><Input value={form.admin_name} onChange={e => set({ admin_name: e.target.value })} placeholder="Radha Devi Dasi" /></div>
                    <div><Label>Email *</Label><Input type="email" value={form.admin_email} onChange={e => set({ admin_email: e.target.value })} placeholder="admin@yourorg.org" /></div>
                    <div><Label>Password * (min 6 chars)</Label><Input type="password" value={form.admin_password} onChange={e => set({ admin_password: e.target.value })} placeholder="At least 6 characters" /></div>
                  </div>
                )}

                {s.key === 'program' && (
                  <div className="space-y-3">
                    <div className="text-[11px] text-muted-foreground">Add your first class — you can add more later.</div>
                    <div><Label>Program Name</Label><Input value={form.first_program.name} onChange={e => setProgram({ name: e.target.value })} placeholder="Sunday School" /></div>
                    <div><Label>Description</Label><Textarea rows={2} value={form.first_program.description} onChange={e => setProgram({ description: e.target.value })} /></div>
                    <div className="grid grid-cols-3 gap-2">
                      <div><Label className="text-[10px]">Age Group</Label><Input value={form.first_program.age_group} onChange={e => setProgram({ age_group: e.target.value })} placeholder="6-14" /></div>
                      <div><Label className="text-[10px]">Duration (mo)</Label><Input type="number" value={form.first_program.duration_months} onChange={e => setProgram({ duration_months: e.target.value })} /></div>
                      <div><Label className="text-[10px]">Capacity</Label><Input type="number" value={form.first_program.capacity} onChange={e => setProgram({ capacity: e.target.value })} /></div>
                    </div>
                  </div>
                )}

                {s.key === 'review' && (
                  <div className="space-y-3">
                    <div className="rounded-2xl overflow-hidden">
                      <div className="bg-saffron-gradient text-white p-4">
                        <div className="text-[11px] uppercase tracking-widest opacity-80">Ready to launch</div>
                        <div className="text-2xl font-bold mt-1">{form.name}</div>
                        <div className="text-xs opacity-90 mt-0.5">{form.address}</div>
                      </div>
                      <div className="p-4 bg-white/50 dark:bg-white/5 space-y-2 text-xs">
                        <ReviewRow icon={MessageSquare} label="Contact" value={`${form.contact_email} • ${form.contact_phone || '—'}`} />
                        <ReviewRow icon={Palette} label="Currency" value={`${form.currency} • ${form.academic_year}`} />
                        <ReviewRow icon={UserPlus} label="Admin" value={`${form.admin_name} <${form.admin_email}>`} />
                        <ReviewRow icon={BookOpen} label="First program" value={`${form.first_program.name} • ${form.first_program.age_group} • ${form.first_program.capacity} seats`} />
                        <ReviewRow icon={Wallet} label="Fee defaults" value={`Admission ${form.currency} ${form.fees.admission} • Term ${form.currency} ${form.fees.term}`} />
                      </div>
                    </div>
                    <div className="text-[11px] text-muted-foreground text-center">Click <b>Launch</b> to create the organization and admin login instantly.</div>
                  </div>
                )}
              </motion.div>
            </AnimatePresence>

            <div className="flex items-center gap-2 mt-6 pt-4 border-t">
              <Button variant="ghost" onClick={prev} disabled={step === 0}><ChevronLeft size={14} className="mr-1" /> Back</Button>
              <div className="ml-auto flex items-center gap-2">
                <span className="text-[11px] text-muted-foreground">{step + 1} / {steps.length}</span>
                {step < steps.length - 1 ? (
                  <Button className="bg-saffron-gradient" onClick={next}>Continue <ChevronRight size={14} className="ml-1" /></Button>
                ) : (
                  <Button className="bg-saffron-gradient" onClick={submit} disabled={saving}>
                    <Rocket size={14} className="mr-1" /> {saving ? 'Launching…' : 'Launch Organization'}
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ReviewRow({ icon: Icon, label, value }) {
  return (
    <div className="flex items-center gap-3 py-1.5 border-b last:border-0">
      <div className="w-8 h-8 rounded-lg bg-primary/10 grid place-items-center text-primary"><Icon size={14} /></div>
      <div className="text-[10px] uppercase tracking-widest text-muted-foreground w-24">{label}</div>
      <div className="flex-1 font-medium truncate">{value}</div>
    </div>
  );
}

/* Page header */
function PageHeader({ title, subtitle, icon: Icon, action }) {
  return (
    <div className="flex items-center gap-4 flex-wrap">
      <div className="w-12 h-12 rounded-2xl bg-saffron-gradient text-white grid place-items-center shadow-lg ring-glow">
        {Icon && <Icon size={20} />}
      </div>
      <div className="flex-1 min-w-0">
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">{title}</h1>
        <p className="text-sm text-muted-foreground">{subtitle}</p>
      </div>
      {action}
    </div>
  );
}

/* ============================================================
   STUDENTS
============================================================ */
function Students({ students, setStudents }) {
  const [programs, setPrograms] = useState([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [cardOf, setCardOf] = useState(null);
  const [historyOf, setHistoryOf] = useState(null);
  const [org, setOrg] = useState(null);
  const [q, setQ] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const empty = { first_name: '', last_name: '', dob: '', gender: 'Male', address: '', mobile: '', email: '', father_name: '', mother_name: '', emergency_contact: '', initiated_name: '', counsellor: '', temple: '', program_id: '', program_ids: [], status: 'active', student_id: '', photo_url: '' };
  const [form, setForm] = useState(empty);
  const fileRef = useRef(null);

  const load = () => api('/students').then(r => setStudents(r.items));
  useEffect(() => { api('/programs').then(r => setPrograms(r.items)); api('/auth/me').then(r => setOrg(r.organization)); }, []);

  const filtered = useMemo(() => {
    let list = students;
    if (statusFilter !== 'all') list = list.filter(s => s.status === statusFilter);
    if (q) list = list.filter(s => (s.first_name + ' ' + s.last_name + ' ' + s.student_id + ' ' + (s.email || '')).toLowerCase().includes(q.toLowerCase()));
    return list;
  }, [students, q, statusFilter]);

  const openEdit = (s) => { setEditing(s); setForm({ ...empty, ...s, program_ids: s.program_ids && s.program_ids.length ? s.program_ids : (s.program_id ? [s.program_id] : []) }); setOpen(true); };
  const openNew = () => { setEditing(null); setForm({ ...empty, student_id: 'GK-2025-' + String(Math.floor(1000 + Math.random() * 9000)) }); setOpen(true); };
  const save = async () => {
    try {
      const isNew = !editing;
      const payload = { ...form, program_id: form.program_ids?.[0] || form.program_id }; // keep legacy
      if (editing) await api(`/students/${editing.id}`, { method: 'PUT', body: JSON.stringify(payload) });
      else await api('/students', { method: 'POST', body: JSON.stringify(payload) });
      if (isNew) {
        confetti({ particleCount: 120, spread: 80, origin: { y: 0.6 }, colors: ['#7c3aed', '#4f46e5', '#a855f7', '#22c55e', '#0ea5e9'] });
        toast.success(`🎉 ${form.first_name} welcomed to ${org?.name || 'the school'}!`);
      } else toast.success('Student updated');
      setOpen(false); load();
    } catch (e) { toast.error(e.message); }
  };
  const del = async (s) => { if (!confirm(`Remove ${s.first_name}?`)) return; await api(`/students/${s.id}`, { method: 'DELETE' }); toast.success('Removed'); load(); };

  const handlePhoto = (e) => {
    const file = e.target.files?.[0]; if (!file) return;
    if (file.size > 800 * 1024) { toast.error('Image must be < 800KB'); return; }
    const reader = new FileReader();
    reader.onload = () => setForm(f => ({ ...f, photo_url: reader.result }));
    reader.readAsDataURL(file);
  };

  const printCard = async () => {
    const { jsPDF } = await import('jspdf');
    const QRCode = (await import('qrcode')).default;
    const parentUrl = `${window.location.origin}/p/${cardOf.public_token}`;
    let qrDataUrl = '';
    try { qrDataUrl = await QRCode.toDataURL(parentUrl, { width: 200, margin: 1 }); } catch {}
    const doc = new jsPDF({ unit: 'mm', format: [54, 86], orientation: 'portrait' });
    doc.setFillColor(124, 58, 237); doc.rect(0, 0, 54, 16, 'F');
    doc.setTextColor(255); doc.setFont('helvetica', 'bold'); doc.setFontSize(9); doc.text('GOKULAM360', 27, 6, { align: 'center' });
    doc.setFontSize(6.5); doc.setFont('helvetica', 'normal'); doc.text((org?.name || 'Organization').slice(0, 40), 27, 10.5, { align: 'center' });
    doc.text('STUDENT ID CARD', 27, 14, { align: 'center' });
    doc.setDrawColor(124, 58, 237); doc.setLineWidth(0.4); doc.roundedRect(4, 20, 16, 20, 1, 1);
    if (cardOf.photo_url) { try { doc.addImage(cardOf.photo_url, 'JPEG', 4.2, 20.2, 15.6, 19.6); } catch { } }
    else { doc.setFontSize(6); doc.setTextColor(150); doc.text('PHOTO', 12, 30.5, { align: 'center' }); }
    doc.setTextColor(30); doc.setFontSize(6.5);
    let y = 22;
    const line = (label, value) => { doc.setFont('helvetica', 'bold'); doc.text(label, 22, y); doc.setFont('helvetica', 'normal'); doc.text(String(value || '-').slice(0, 22), 22, y + 3); y += 6.5; };
    line('NAME', `${cardOf.first_name} ${cardOf.last_name}`);
    line('ID', cardOf.student_id);
    doc.setFont('helvetica', 'bold'); doc.text('EMERGENCY', 22, y); doc.setFont('helvetica', 'normal'); doc.text(String(cardOf.emergency_contact || '-').slice(0, 22), 22, y + 3);
    // QR code bottom-left
    if (qrDataUrl) { try { doc.addImage(qrDataUrl, 'PNG', 4, 45, 20, 20); } catch {} }
    doc.setFontSize(5.5); doc.setTextColor(80);
    doc.text('Scan for parent portal', 14, 68, { align: 'center' });
    doc.text('Attendance • Fees • Progress', 14, 71, { align: 'center' });
    // Program list on right
    doc.setFontSize(6); doc.setTextColor(30);
    doc.setFont('helvetica', 'bold'); doc.text('ENROLLED IN', 26, 47);
    doc.setFont('helvetica', 'normal');
    const progs = (cardOf.program_ids && cardOf.program_ids.length ? cardOf.program_ids : [cardOf.program_id]).map(pid => programs.find(p => p.id === pid)?.name).filter(Boolean);
    progs.slice(0, 3).forEach((n, i) => doc.text('• ' + n.slice(0, 20), 26, 51 + i * 3.5));
    doc.setFillColor(196, 181, 253); doc.rect(0, 80, 54, 6, 'F');
    doc.setTextColor(76, 29, 149); doc.setFontSize(6); doc.text('Hare Krishna \u2022 Serve with devotion', 27, 84, { align: 'center' });
    doc.save(`idcard-${cardOf.student_id}.pdf`);
  };

  const counts = useMemo(() => {
    return {
      all: students.length,
      active: students.filter(s => s.status === 'active').length,
      inactive: students.filter(s => s.status === 'inactive').length,
      discontinued: students.filter(s => s.status === 'discontinued').length,
    };
  }, [students]);

  return (
    <div className="space-y-5">
      <PageHeader title="Students" subtitle={`${filtered.length} of ${students.length} students`} icon={GraduationCap}
        action={<div className="flex gap-2">
          <ImportStudents programs={programs} onImported={load} />
          <Button onClick={openNew} className="bg-saffron-gradient shadow"><Plus size={15} className="mr-1" /> Add Student</Button>
        </div>} />

      {/* Filters bar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[220px] max-w-md">
          <Search size={14} className="absolute left-3 top-3 text-muted-foreground" />
          <Input placeholder="Search by name, ID, email…" value={q} onChange={e => setQ(e.target.value)} className="pl-9 h-10 glass" />
        </div>
        <div className="flex gap-1 p-1 rounded-xl glass">
          {[
            { k: 'all', l: 'All', c: counts.all },
            { k: 'active', l: 'Active', c: counts.active },
            { k: 'inactive', l: 'Inactive', c: counts.inactive },
            { k: 'discontinued', l: 'Left', c: counts.discontinued },
          ].map(t => (
            <button key={t.k} onClick={() => setStatusFilter(t.k)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${statusFilter === t.k ? 'bg-saffron-gradient text-white shadow' : 'text-muted-foreground hover:text-foreground'}`}>
              {t.l} <span className="ml-1 opacity-70">{t.c}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Grid */}
      {filtered.length === 0 ? (
        <EmptyState text="No students match your filters" action={<Button className="mt-3 bg-saffron-gradient" onClick={openNew}><Plus size={14} className="mr-1" />Add first student</Button>} />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map((s, i) => (
            <motion.div key={s.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: (i % 8) * 0.03 }}
              className="rounded-2xl glass p-4 card-lift">
              <div className="flex items-start gap-3">
                <Avatar className="h-14 w-14 ring-2 ring-primary/30 shadow">
                  {s.photo_url ? <AvatarImage src={s.photo_url} /> : <AvatarFallback className="bg-saffron-gradient text-white font-semibold">{initials(s.first_name + ' ' + s.last_name)}</AvatarFallback>}
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold truncate">{s.first_name} {s.last_name}</div>
                  <div className="text-[10px] text-muted-foreground font-mono">{s.student_id}</div>
                  <div className="text-[11px] text-primary mt-0.5 flex flex-wrap gap-1">
                    {((s.program_ids && s.program_ids.length ? s.program_ids : [s.program_id]).filter(Boolean).slice(0, 2).map(pid => {
                      const prog = programs.find(p => p.id === pid);
                      return prog ? <span key={pid} className="px-1.5 py-0.5 rounded bg-primary/10 text-[10px]">{prog.name}</span> : null;
                    }))}
                    {(s.program_ids?.length || 0) > 2 && <span className="text-[10px] text-muted-foreground">+{s.program_ids.length - 2}</span>}
                  </div>
                </div>
                <Badge className={`text-[10px] ${s.status === 'active' ? 'bg-emerald-500 hover:bg-emerald-500' : 'bg-muted text-muted-foreground'}`}>{s.status}</Badge>
              </div>
              <div className="text-[11px] text-muted-foreground mt-3 space-y-0.5">
                {s.mobile && <div className="flex items-center gap-1.5"><Phone size={11} /> {s.mobile}</div>}
              </div>
              <div className="flex gap-1 mt-3 pt-3 border-t">
                <Button size="sm" variant="ghost" className="flex-1 text-xs h-8" onClick={() => setHistoryOf(s)}><Activity size={13} className="mr-1" /> History</Button>
                <Button size="sm" variant="ghost" className="flex-1 text-xs h-8" onClick={() => setCardOf(s)}><IdCard size={13} className="mr-1" /> ID Card</Button>
                <Button size="sm" variant="ghost" className="flex-1 text-xs h-8" onClick={() => openEdit(s)}><Edit3 size={13} className="mr-1" /> Edit</Button>
                <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => del(s)}><Trash2 size={13} /></Button>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Add/Edit */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing ? 'Edit Student' : 'New Student'}</DialogTitle><DialogDescription>Fill personal & family details.</DialogDescription></DialogHeader>

          {/* Photo uploader */}
          <div className="flex items-center gap-4 p-4 rounded-2xl bg-gradient-to-r from-primary/10 to-blue-500/10 dark:from-primary/20 dark:to-blue-500/15 border">
            <div className="relative">
              <Avatar className="h-20 w-20 ring-2 ring-primary/40">
                {form.photo_url ? <AvatarImage src={form.photo_url} /> : <AvatarFallback className="bg-saffron-gradient text-white text-lg">{initials((form.first_name || 'S') + ' ' + (form.last_name || ''))}</AvatarFallback>}
              </Avatar>
              <button type="button" onClick={() => fileRef.current?.click()} className="absolute -bottom-1 -right-1 bg-primary text-primary-foreground rounded-full p-1.5 shadow-lg hover:scale-110 transition">
                <Camera size={13} />
              </button>
              <input ref={fileRef} type="file" accept="image/*" hidden onChange={handlePhoto} />
            </div>
            <div>
              <div className="text-sm font-semibold">Student photo</div>
              <div className="text-[11px] text-muted-foreground">JPG/PNG • Max 800KB. Will appear on ID cards.</div>
              {form.photo_url && <Button size="sm" variant="ghost" className="mt-1 h-7 text-[11px]" onClick={() => setForm({ ...form, photo_url: '' })}>Remove</Button>}
            </div>
          </div>

          <Tabs defaultValue="personal">
            <TabsList>
              <TabsTrigger value="personal">Personal</TabsTrigger>
              <TabsTrigger value="family">Family</TabsTrigger>
            </TabsList>
            <TabsContent value="personal" className="grid grid-cols-2 gap-3 mt-2">
              <div><Label>Student ID</Label><Input value={form.student_id} onChange={e => setForm({ ...form, student_id: e.target.value })} /></div>
              <div><Label>Status</Label>
                <Select value={form.status} onValueChange={v => setForm({ ...form, status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem><SelectItem value="inactive">Inactive</SelectItem>
                    <SelectItem value="discontinued">Discontinued</SelectItem><SelectItem value="completed">Completed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div><Label>First Name</Label><Input value={form.first_name} onChange={e => setForm({ ...form, first_name: e.target.value })} /></div>
              <div><Label>Last Name</Label><Input value={form.last_name} onChange={e => setForm({ ...form, last_name: e.target.value })} /></div>
              <div><Label>Date of Birth</Label><Input type="date" value={form.dob} onChange={e => setForm({ ...form, dob: e.target.value })} /></div>
              <div><Label>Gender</Label>
                <Select value={form.gender} onValueChange={v => setForm({ ...form, gender: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="Male">Male</SelectItem><SelectItem value="Female">Female</SelectItem></SelectContent>
                </Select>
              </div>
              <div><Label>Mobile</Label><Input value={form.mobile} onChange={e => setForm({ ...form, mobile: e.target.value })} /></div>
              <div><Label>Email</Label><Input value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} /></div>
              <div className="col-span-2"><Label>Address</Label><Textarea rows={2} value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} /></div>
              <div className="col-span-2"><Label>Enroll in Classes (select multiple)</Label>
                <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto p-2 rounded-lg border bg-white/30 dark:bg-white/5">
                  {programs.map(p => {
                    const selected = form.program_ids?.includes(p.id);
                    return (
                      <label key={p.id} className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer text-xs transition ${selected ? 'bg-primary/15 border border-primary/40' : 'bg-white/50 dark:bg-white/5 border border-transparent hover:border-primary/30'}`}>
                        <input type="checkbox" className="accent-primary" checked={!!selected} onChange={() => {
                          const ids = form.program_ids || [];
                          setForm({ ...form, program_ids: selected ? ids.filter(x => x !== p.id) : [...ids, p.id] });
                        }} />
                        <div className="flex-1 min-w-0">
                          <div className="font-medium truncate">{p.name}</div>
                          <div className="text-[9px] text-muted-foreground">{(p.days_of_week || []).map(d => DAY_LABELS[d]).join(', ')} · {fmtINR(p.fee_amount || 0)}</div>
                        </div>
                      </label>
                    );
                  })}
                </div>
                <div className="text-[10px] text-muted-foreground mt-1">{(form.program_ids || []).length} class(es) selected</div>
              </div>
            </TabsContent>
            <TabsContent value="family" className="grid grid-cols-2 gap-3 mt-2">
              <div><Label>Father Name</Label><Input value={form.father_name} onChange={e => setForm({ ...form, father_name: e.target.value })} /></div>
              <div><Label>Mother Name</Label><Input value={form.mother_name} onChange={e => setForm({ ...form, mother_name: e.target.value })} /></div>
              <div><Label>Guardian</Label><Input value={form.guardian || ''} onChange={e => setForm({ ...form, guardian: e.target.value })} /></div>
              <div><Label>Emergency Contact</Label><Input value={form.emergency_contact} onChange={e => setForm({ ...form, emergency_contact: e.target.value })} /></div>
            </TabsContent>
          </Tabs>
          <DialogFooter><Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button><Button onClick={save} className="bg-saffron-gradient">{editing ? 'Update' : 'Create'}</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ID Card */}
      <Dialog open={!!cardOf} onOpenChange={v => !v && setCardOf(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Student ID Card</DialogTitle></DialogHeader>
          {cardOf && (
            <div className="flex flex-col items-center gap-4">
              <motion.div initial={{ rotateY: 180, opacity: 0 }} animate={{ rotateY: 0, opacity: 1 }} transition={{ duration: 0.6 }}
                className="w-64 rounded-2xl overflow-hidden border-2 border-primary shadow-2xl bg-card">
                <div className="bg-saffron-gradient p-3 text-white text-center">
                  <div className="text-xs font-bold tracking-widest">GOKULAM360</div>
                  <div className="text-[10px] opacity-90 mt-0.5">{org?.name}</div>
                  <div className="text-[9px] font-semibold mt-1 tracking-wider">STUDENT ID CARD</div>
                </div>
                <div className="p-4">
                  <div className="w-20 h-24 mx-auto rounded-md border-2 border-primary overflow-hidden bg-muted grid place-items-center mb-3">
                    {cardOf.photo_url ? <img src={cardOf.photo_url} className="w-full h-full object-cover" /> : <UserCircle2 className="text-muted-foreground" size={40} />}
                  </div>
                  <div className="space-y-1.5 text-xs">
                    <div><span className="font-bold text-[10px] uppercase text-muted-foreground">Name</span><br />{cardOf.first_name} {cardOf.last_name}</div>
                    <div><span className="font-bold text-[10px] uppercase text-muted-foreground">ID</span><br />{cardOf.student_id}</div>
                    <div><span className="font-bold text-[10px] uppercase text-muted-foreground">Program</span><br />{programs.find(p => p.id === cardOf.program_id)?.name || '-'}</div>
                    <div><span className="font-bold text-[10px] uppercase text-muted-foreground">Emergency</span><br />{cardOf.emergency_contact}</div>
                  </div>
                </div>
                <div className="bg-amber-200 text-amber-900 text-[10px] text-center py-1.5 font-semibold tracking-wide">Hare Krishna • Serve with devotion</div>
              </motion.div>
              <Button onClick={printCard} className="bg-saffron-gradient"><Download size={14} className="mr-1.5" /> Download PDF</Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <EnrollmentHistoryDialog student={historyOf} onClose={() => setHistoryOf(null)} onChange={() => load()} />
    </div>
  );
}

/* ============================================================
   ENROLLMENT HISTORY DRAWER
============================================================ */
function EnrollmentHistoryDialog({ student, onClose, onChange }) {
  const [enrollments, setEnrollments] = useState([]);
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    if (!student) return;
    setLoading(true);
    api(`/enrollments?student_id=${student.id}`).then(r => setEnrollments(r.items)).finally(() => setLoading(false));
  }, [student]);

  const renew = async (e) => {
    if (!confirm(`Renew ${e.program_name} for a fresh term?`)) return;
    try {
      await api('/enrollments/renew', { method: 'POST', body: JSON.stringify({ enrollment_id: e.id }) });
      confetti({ particleCount: 100, spread: 80, origin: { y: 0.6 }, colors: ['#7c3aed', '#22c55e'] });
      toast.success('Enrollment renewed 🎉');
      api(`/enrollments?student_id=${student.id}`).then(r => setEnrollments(r.items));
      onChange && onChange();
    } catch (e) { toast.error(e.message); }
  };

  if (!student) return null;

  const active = enrollments.filter(e => !e.left_at || e.status === 'active');
  const past = enrollments.filter(e => e.left_at && e.status !== 'active');

  return (
    <Dialog open={!!student} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-2xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <Avatar className="h-11 w-11">
              {student.photo_url ? <AvatarImage src={student.photo_url} /> : <AvatarFallback className="bg-saffron-gradient text-white">{initials(student.first_name + ' ' + student.last_name)}</AvatarFallback>}
            </Avatar>
            <div>
              <div>{student.first_name} {student.last_name}</div>
              <div className="text-[10px] font-mono text-muted-foreground font-normal">{student.student_id}</div>
            </div>
          </DialogTitle>
          <DialogDescription>Enrollment history · session credits · renewals</DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="space-y-2">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-24 rounded-2xl" />)}</div>
        ) : enrollments.length === 0 ? (
          <EmptyState small text="Not enrolled in any class yet" />
        ) : (
          <div className="space-y-4">
            <div>
              <div className="text-[11px] uppercase tracking-widest text-muted-foreground mb-2 font-semibold">Active enrollments ({active.length})</div>
              <div className="space-y-2">
                {active.map(e => <EnrollmentCard key={e.id} e={e} onRenew={renew} />)}
                {active.length === 0 && <div className="text-xs text-muted-foreground italic">No active enrollments</div>}
              </div>
            </div>
            {past.length > 0 && (
              <div>
                <div className="text-[11px] uppercase tracking-widest text-muted-foreground mb-2 font-semibold">History ({past.length})</div>
                <div className="space-y-2">
                  {past.map(e => <EnrollmentCard key={e.id} e={e} past />)}
                </div>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function EnrollmentCard({ e, onRenew, past = false }) {
  const usedPct = e.sessions_credited ? Math.min(100, Math.round((e.sessions_attended / e.sessions_credited) * 100)) : 0;
  const exhausted = e.sessions_remaining === 0 && e.sessions_credited > 0;
  const carryover = e.program?.end_date && new Date(e.program.end_date) < new Date() && e.sessions_remaining > 0;
  return (
    <motion.div initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
      className={`rounded-2xl p-4 border ${past ? 'bg-muted/40 opacity-80' : 'bg-white/60 dark:bg-white/5 glass'}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-saffron-gradient text-white grid place-items-center"><BookOpen size={16} /></div>
          <div>
            <div className="font-semibold text-sm">{e.program_name}</div>
            <div className="text-[10px] text-muted-foreground">
              Enrolled {new Date(e.enrolled_at).toLocaleDateString('en', { day: 'numeric', month: 'short', year: 'numeric' })}
              {e.left_at && <> · Left {new Date(e.left_at).toLocaleDateString('en', { day: 'numeric', month: 'short', year: 'numeric' })}</>}
              {e.renewed_from && <> · Renewal</>}
            </div>
          </div>
        </div>
        <Badge className={e.status === 'active' ? 'bg-emerald-500' : e.status === 'completed' ? 'bg-primary' : 'bg-muted text-muted-foreground'}>{e.status}</Badge>
      </div>

      <div className="mt-3 space-y-1.5">
        <div className="flex items-center justify-between text-[11px]">
          <span className="text-muted-foreground">Sessions used</span>
          <span className="font-semibold">
            <span className={exhausted ? 'text-rose-600' : 'text-emerald-600'}>{e.sessions_attended}</span>
            <span className="text-muted-foreground"> / {e.sessions_credited}</span>
          </span>
        </div>
        <div className="h-2 rounded-full bg-muted overflow-hidden">
          <div className={`h-full rounded-full transition-all ${exhausted ? 'bg-rose-500' : usedPct > 75 ? 'bg-amber-500' : 'bg-emerald-500'}`} style={{ width: `${usedPct}%` }} />
        </div>
        <div className="flex items-center justify-between text-[10px] text-muted-foreground">
          <span>Started {e.program?.start_date || '—'}</span>
          <span>{e.sessions_remaining} sessions remaining</span>
        </div>
      </div>

      {(exhausted || carryover) && !past && (
        <div className="mt-3 flex items-center gap-2">
          {exhausted && (
            <div className="text-[11px] text-rose-600 flex items-center gap-1">
              ⚠ Quota exhausted
            </div>
          )}
          {carryover && !exhausted && (
            <div className="text-[11px] text-primary flex items-center gap-1">
              📚 {e.sessions_remaining} unused sessions carrying over from previous term
            </div>
          )}
          {onRenew && <Button size="sm" className="ml-auto bg-saffron-gradient text-white h-7 text-[11px]" onClick={() => onRenew(e)}>Renew term</Button>}
        </div>
      )}
    </motion.div>
  );
}

/* ============================================================
   TEACHERS
============================================================ */
function Teachers({ teachers, setTeachers }) {
  const [open, setOpen] = useState(false);
  const empty = { employee_id: '', name: '', email: '', mobile: '', address: '', qualification: '', skills: '' };
  const [form, setForm] = useState(empty);
  const [editing, setEditing] = useState(null);
  const load = () => api('/teachers').then(r => setTeachers(r.items));
  const save = async () => {
    try {
      if (editing) await api(`/teachers/${editing.id}`, { method: 'PUT', body: JSON.stringify(form) });
      else await api('/teachers', { method: 'POST', body: JSON.stringify(form) });
      toast.success('Saved'); setOpen(false); load();
    } catch (e) { toast.error(e.message); }
  };
  return (
    <div className="space-y-5">
      <PageHeader title="Teachers" subtitle={`${teachers.length} faculty members`} icon={Users}
        action={<Button className="bg-saffron-gradient shadow" onClick={() => { setEditing(null); setForm({ ...empty, employee_id: 'T-' + String(Math.floor(100 + Math.random() * 900)) }); setOpen(true); }}><Plus size={15} className="mr-1" /> Add Teacher</Button>} />
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {teachers.map((t, i) => (
          <motion.div key={t.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
            className="rounded-2xl glass p-5 card-lift">
            <div className="flex items-start gap-3">
              <Avatar className="h-14 w-14 ring-2 ring-primary/30 shadow"><AvatarFallback className="bg-violet-gradient text-white font-semibold">{initials(t.name)}</AvatarFallback></Avatar>
              <div className="flex-1 min-w-0">
                <div className="font-semibold truncate">{t.name}</div>
                <div className="text-[10px] font-mono text-muted-foreground">{t.employee_id}</div>
                <div className="text-[11px] text-primary mt-0.5">{t.qualification}</div>
              </div>
            </div>
            <div className="mt-3 text-[11px] text-muted-foreground space-y-1">
              <div className="flex items-center gap-1.5"><Phone size={11} /> {t.mobile || '-'}</div>
              <div className="flex items-center gap-1.5"><Send size={11} /> {t.email || '-'}</div>
              {t.skills && <div className="flex items-center gap-1.5"><Sparkles size={11} /> {t.skills}</div>}
            </div>
            <div className="flex gap-1 mt-3 pt-3 border-t">
              <Button size="sm" variant="ghost" className="flex-1 text-xs h-8" onClick={() => { setEditing(t); setForm({ ...empty, ...t }); setOpen(true); }}><Edit3 size={13} className="mr-1" /> Edit</Button>
              <Button size="icon" variant="ghost" className="h-8 w-8" onClick={async () => { await api(`/teachers/${t.id}`, { method: 'DELETE' }); load(); }}><Trash2 size={13} /></Button>
            </div>
          </motion.div>
        ))}
      </div>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent><DialogHeader><DialogTitle>{editing ? 'Edit' : 'New'} Teacher</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Employee ID</Label><Input value={form.employee_id} onChange={e => setForm({ ...form, employee_id: e.target.value })} /></div>
            <div><Label>Name</Label><Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></div>
            <div><Label>Email</Label><Input value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} /></div>
            <div><Label>Mobile</Label><Input value={form.mobile} onChange={e => setForm({ ...form, mobile: e.target.value })} /></div>
            <div className="col-span-2"><Label>Qualification</Label><Input value={form.qualification} onChange={e => setForm({ ...form, qualification: e.target.value })} /></div>
            <div className="col-span-2"><Label>Skills</Label><Input value={form.skills} onChange={e => setForm({ ...form, skills: e.target.value })} /></div>
            <div className="col-span-2"><Label>Address</Label><Textarea rows={2} value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} /></div>
          </div>
          <DialogFooter><Button onClick={save} className="bg-saffron-gradient">Save</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ============================================================
   CLASSES / BATCHES (built on programs)
============================================================ */
const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const DAY_FULL = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function DaysPicker({ value = [], onChange }) {
  const toggle = (d) => onChange(value.includes(d) ? value.filter(x => x !== d) : [...value, d].sort());
  return (
    <div className="flex gap-1.5 flex-wrap">
      {DAY_LABELS.map((label, i) => {
        const active = value.includes(i);
        return (
          <button type="button" key={i} onClick={() => toggle(i)}
            className={`w-11 h-11 rounded-xl text-xs font-semibold transition ${active ? 'bg-saffron-gradient text-white shadow-lg scale-105' : 'bg-muted text-muted-foreground hover:bg-primary/10 hover:text-primary'}`}>
            {label}
          </button>
        );
      })}
    </div>
  );
}

function Classes() {
  const [items, setItems] = useState([]);
  const [students, setStudents] = useState([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const empty = { name: '', description: '', age_group: '', duration_months: 4, capacity: 30, start_date: '', end_date: '', days_of_week: [0], fee_amount: 1500 };
  const [form, setForm] = useState(empty);
  const load = () => api('/programs').then(r => setItems(r.items));
  useEffect(() => { load(); api('/students').then(r => setStudents(r.items)); }, []);
  const save = async () => {
    try {
      const payload = { ...form, duration_months: Number(form.duration_months) || 0, capacity: Number(form.capacity) || 0, fee_amount: Number(form.fee_amount) || 0 };
      if (editing) await api(`/programs/${editing.id}`, { method: 'PUT', body: JSON.stringify(payload) });
      else await api('/programs', { method: 'POST', body: JSON.stringify(payload) });
      confetti({ particleCount: 90, spread: 70, origin: { y: 0.6 }, colors: ['#7c3aed', '#4f46e5', '#a855f7'] });
      toast.success(editing ? 'Class updated' : 'Class created 🎉');
      setOpen(false); load();
    } catch (e) { toast.error(e.message); }
  };
  const del = async (p) => { if (!confirm(`Delete ${p.name}?`)) return; await api(`/programs/${p.id}`, { method: 'DELETE' }); toast.success('Deleted'); load(); };
  const openNew = () => { setEditing(null); setForm(empty); setOpen(true); };
  const openEdit = (p) => { setEditing(p); setForm({ ...empty, ...p, days_of_week: p.days_of_week || [0] }); setOpen(true); };

  const enrolledCount = (p) => students.filter(s => (s.program_ids || [s.program_id]).includes(p.id)).length;

  return (
    <div className="space-y-5">
      <PageHeader title="Classes & Batches" subtitle="Schedules, days, capacity & fees" icon={School}
        action={<Button className="bg-saffron-gradient shadow" onClick={openNew}><Plus size={15} className="mr-1" /> New Class</Button>} />

      {items.length === 0 ? <EmptyState text="No classes yet" action={<Button className="mt-3 bg-saffron-gradient" onClick={openNew}><Plus size={14} className="mr-1" />Create first class</Button>} /> : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map((p, i) => {
            const enrolled = enrolledCount(p);
            const pct = Math.min(100, Math.round((enrolled / (p.capacity || 1)) * 100));
            const days = p.days_of_week || [0];
            return (
              <motion.div key={p.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                className="rounded-2xl glass p-5 card-lift group">
                <div className="flex items-start justify-between">
                  <div className="w-11 h-11 rounded-2xl bg-saffron-gradient grid place-items-center shadow"><BookOpen className="text-white" size={18} /></div>
                  <Badge variant="secondary">{p.age_group}</Badge>
                </div>
                <div className="mt-3 font-semibold">{p.name}</div>
                <div className="text-xs text-muted-foreground line-clamp-2 min-h-[32px]">{p.description}</div>

                {/* Days pills */}
                <div className="mt-3 flex gap-1 flex-wrap">
                  {DAY_LABELS.map((l, di) => (
                    <div key={di} className={`w-7 h-7 rounded-md text-[10px] font-semibold grid place-items-center ${days.includes(di) ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground/50'}`}>{l[0]}</div>
                  ))}
                </div>

                <div className="mt-3 grid grid-cols-3 text-center gap-2">
                  <div><div className="text-lg font-bold"><Counter value={enrolled} /></div><div className="text-[10px] text-muted-foreground">Enrolled</div></div>
                  <div><div className="text-lg font-bold">{p.capacity}</div><div className="text-[10px] text-muted-foreground">Capacity</div></div>
                  <div><div className="text-lg font-bold">{fmtINR(p.fee_amount || 0)}</div><div className="text-[10px] text-muted-foreground">Fee</div></div>
                </div>
                <div className="mt-3">
                  <div className="flex justify-between text-[10px] text-muted-foreground mb-1"><span>Fill rate</span><span>{pct}%</span></div>
                  <Progress value={pct} className="h-1.5" />
                </div>
                <div className="mt-3 text-[10px] text-muted-foreground flex justify-between">
                  <span>{p.start_date} → {p.end_date}</span>
                  <span className="text-primary font-semibold">{days.length} day{days.length !== 1 ? 's' : ''}/wk</span>
                </div>
                <div className="flex gap-1 mt-3 pt-3 border-t opacity-0 group-hover:opacity-100 transition">
                  <Button size="sm" variant="ghost" className="flex-1 text-xs h-8" onClick={() => openEdit(p)}><Edit3 size={13} className="mr-1" /> Edit</Button>
                  <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => del(p)}><Trash2 size={13} /></Button>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing ? 'Edit' : 'New'} Class / Batch</DialogTitle><DialogDescription>Set schedule, capacity & fee.</DialogDescription></DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2"><Label>Name</Label><Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="e.g. Sunday School Term 2" /></div>
            <div className="col-span-2"><Label>Description</Label><Textarea rows={2} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Short description of the program" /></div>
            <div className="col-span-2">
              <Label>Class Days *</Label>
              <DaysPicker value={form.days_of_week} onChange={v => setForm({ ...form, days_of_week: v })} />
              <div className="text-[10px] text-muted-foreground mt-1.5">
                {form.days_of_week.length === 0 ? '⚠️ Select at least one day' : `Runs ${form.days_of_week.map(d => DAY_FULL[d]).join(', ')}`}
              </div>
            </div>
            <div><Label>Fee (per term)</Label><Input type="number" value={form.fee_amount} onChange={e => setForm({ ...form, fee_amount: e.target.value })} /></div>
            <div><Label>Age Group</Label><Input value={form.age_group} onChange={e => setForm({ ...form, age_group: e.target.value })} placeholder="6-14" /></div>
            <div><Label>Duration (months)</Label><Input type="number" value={form.duration_months} onChange={e => setForm({ ...form, duration_months: e.target.value })} /></div>
            <div><Label>Capacity</Label><Input type="number" value={form.capacity} onChange={e => setForm({ ...form, capacity: e.target.value })} /></div>
            <div><Label>Start Date</Label><Input type="date" value={form.start_date} onChange={e => setForm({ ...form, start_date: e.target.value })} /></div>
            <div><Label>End Date</Label><Input type="date" value={form.end_date} onChange={e => setForm({ ...form, end_date: e.target.value })} /></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button><Button onClick={save} className="bg-saffron-gradient" disabled={form.days_of_week.length === 0}>{editing ? 'Update' : 'Create'}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ============================================================
   ATTENDANCE
============================================================ */
function Attendance() {
  const [students, setStudents] = useState([]);
  const [programs, setPrograms] = useState([]);
  const [program, setProgram] = useState('');
  const [sessions, setSessions] = useState([]);
  const [date, setDate] = useState('');
  const [marks, setMarks] = useState({});
  const [existing, setExisting] = useState({});
  const [enrollments, setEnrollments] = useState([]);
  useEffect(() => { api('/students').then(r => setStudents(r.items)); api('/programs').then(r => setPrograms(r.items)); }, []);
  useEffect(() => {
    if (!program) { setSessions([]); setDate(''); setEnrollments([]); return; }
    api(`/programs/${program}/sessions`).then(r => {
      setSessions(r.sessions || []);
      const today = new Date().toISOString().slice(0, 10);
      const todayS = r.sessions?.find(s => s.date === today);
      const nearest = r.sessions?.filter(s => s.is_past || s.is_today).slice(-1)[0];
      setDate((todayS || nearest || r.sessions?.[0])?.date || '');
    });
    api(`/enrollments?program_id=${program}`).then(r => setEnrollments(r.items));
  }, [program]);
  useEffect(() => {
    if (!program || !date) { setExisting({}); return; }
    api(`/attendance?program_id=${program}&date=${date}`).then(r => {
      const m = {};
      (r.items || []).forEach(a => { m[a.student_id] = a.status; });
      setExisting(m); setMarks(m);
    }).catch(() => {});
  }, [program, date]);

  const selectedProgram = programs.find(p => p.id === program);
  const selectedSession = sessions.find(s => s.date === date);
  const list = students.filter(s => {
    if (s.status !== 'active') return false;
    if (!program) return true;
    const ids = s.program_ids && s.program_ids.length ? s.program_ids : (s.program_id ? [s.program_id] : []);
    return ids.includes(program);
  });
  const setMark = (id, v) => setMarks({ ...marks, [id]: v });
  const bulk = (v) => { const m = {}; list.forEach(s => m[s.id] = v); setMarks(m); };
  const save = async () => {
    if (!program) { toast.error('Please pick a class first'); return; }
    if (!date) { toast.error('Pick a session date'); return; }
    try {
      const records = list.map(s => ({ student_id: s.id, status: marks[s.id] || 'present' }));
      await api('/attendance-bulk', { method: 'POST', body: JSON.stringify({ date, program_id: program, records }) });
      confetti({ particleCount: 60, spread: 60, origin: { y: 0.7 }, colors: ['#10b981', '#22c55e', '#7c3aed'] });
      toast.success(`Attendance saved for ${records.length} students`);
      api(`/programs/${program}/sessions`).then(r => setSessions(r.sessions || []));
    } catch (e) { toast.error(e.message); }
  };

  const counts = useMemo(() => {
    const c = { present: 0, absent: 0, late: 0, excused: 0 };
    list.forEach(s => { const v = marks[s.id]; if (v) c[v]++; });
    return c;
  }, [marks, list]);

  const chip = (v, sel) => ({
    present: sel ? 'bg-emerald-500 text-white shadow-emerald-500/50 shadow-lg' : 'bg-emerald-500/10 text-emerald-700 hover:bg-emerald-500/20',
    absent: sel ? 'bg-rose-500 text-white shadow-rose-500/50 shadow-lg' : 'bg-rose-500/10 text-rose-700 hover:bg-rose-500/20',
    late: sel ? 'bg-amber-500 text-white shadow-amber-500/50 shadow-lg' : 'bg-amber-500/10 text-amber-700 hover:bg-amber-500/20',
    excused: sel ? 'bg-sky-500 text-white shadow-sky-500/50 shadow-lg' : 'bg-sky-500/10 text-sky-700 hover:bg-sky-500/20',
  })[v];

  return (
    <div className="space-y-5">
      <PageHeader title="Attendance" subtitle="Session-based marking · scheduled auto-generated" icon={ClipboardCheck} />

      {/* Class picker */}
      <div className="rounded-2xl glass p-4 flex flex-wrap gap-3 items-end">
        <div className="min-w-[260px]"><Label className="text-[11px]">Class</Label>
          <Select value={program} onValueChange={setProgram}>
            <SelectTrigger><SelectValue placeholder="Select a class" /></SelectTrigger>
            <SelectContent>{programs.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        {selectedProgram && (
          <div className="text-[11px] text-muted-foreground">
            <div>Runs on <b className="text-primary">{(selectedProgram.days_of_week || []).map(d => DAY_FULL[d]).join(', ') || '—'}</b></div>
            <div>{sessions.length} sessions scheduled · {sessions.filter(s => s.marked).length} marked</div>
          </div>
        )}
        <div className="ml-auto flex gap-2">
          <Button size="sm" variant="outline" onClick={() => bulk('present')} disabled={!date}>All Present</Button>
          <Button size="sm" variant="outline" onClick={() => bulk('absent')} disabled={!date}>All Absent</Button>
          <Button onClick={save} className="bg-saffron-gradient shadow" disabled={!date || !program}>Save Attendance</Button>
        </div>
      </div>

      {/* Session picker strip */}
      {program && sessions.length > 0 && (
        <div className="rounded-2xl glass p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="text-sm font-semibold flex items-center gap-1.5"><CalendarIcon size={14} className="text-primary" /> Sessions</div>
            <div className="text-[11px] text-muted-foreground">Scroll to pick a session · today's session is auto-selected</div>
          </div>
          <div className="flex gap-2 overflow-x-auto pb-2">
            {sessions.map(s => {
              const active = s.date === date;
              const cls = active ? 'bg-saffron-gradient text-white shadow-lg scale-105' :
                s.marked ? 'bg-emerald-500/15 border border-emerald-500/40 text-emerald-800 dark:text-emerald-200' :
                s.is_past ? 'bg-muted text-muted-foreground border border-transparent' :
                s.is_today ? 'bg-primary/10 border border-primary/40 text-primary' :
                'bg-white/50 dark:bg-white/5 border border-transparent';
              const d = new Date(s.date + 'T00:00:00');
              const cancelSession = async (ev) => {
                ev.stopPropagation();
                if (!confirm(`Cancel session on ${d.toLocaleDateString('en', { weekday: 'long', day: 'numeric', month: 'long' })}? Students won't be charged for this session.`)) return;
                await api(`/programs/${program}/cancel-session`, { method: 'POST', body: JSON.stringify({ date: s.date, action: 'cancel' }) });
                toast.success('Session cancelled');
                api(`/programs/${program}/sessions`).then(r => setSessions(r.sessions || []));
              };
              return (
                <div key={s.date} className="relative shrink-0 group">
                  <button onClick={() => setDate(s.date)}
                    className={`rounded-xl px-3 py-2 min-w-[76px] transition ${cls}`}>
                    <div className="text-[9px] uppercase font-semibold opacity-80">{d.toLocaleString('en', { month: 'short' })}</div>
                    <div className="text-lg font-bold leading-none">{d.getDate()}</div>
                    <div className="text-[9px] opacity-80 mt-0.5">{d.toLocaleString('en', { weekday: 'short' })}</div>
                    {s.marked && !active && <div className="text-[9px] mt-1 flex items-center justify-center gap-0.5"><Check size={9} /> {s.present}/{s.total}</div>}
                    {s.is_today && !active && <div className="text-[9px] mt-1 font-semibold">TODAY</div>}
                  </button>
                  {!s.marked && !s.is_past && (
                    <button onClick={cancelSession}
                      className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-rose-500 text-white text-[9px] opacity-0 group-hover:opacity-100 transition hover:bg-rose-600" title="Cancel this session">✕</button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {selectedSession && (
        <div className={`rounded-xl p-3 text-sm flex items-center gap-3 ${selectedSession.marked ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-800 dark:text-emerald-200' : 'bg-primary/10 border border-primary/30'}`}>
          <div className={`w-9 h-9 rounded-lg grid place-items-center text-white ${selectedSession.marked ? 'bg-emerald-500' : 'bg-saffron-gradient'}`}>
            {selectedSession.marked ? <Check size={16} /> : <ClipboardCheck size={16} />}
          </div>
          <div>
            <div className="font-semibold">{selectedSession.day_name}, {new Date(date + 'T00:00:00').toLocaleDateString('en', { day: 'numeric', month: 'long', year: 'numeric' })}</div>
            <div className="text-[11px] opacity-80">
              {selectedSession.marked ? `Already marked · ${selectedSession.present}/${selectedSession.total} present · saving will overwrite` : 'Not yet marked · ready to record'}
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-4 gap-3">
        {[
          { k: 'present', l: 'Present', c: counts.present, grad: 'bg-emerald-gradient' },
          { k: 'absent', l: 'Absent', c: counts.absent, grad: 'bg-rose-gradient' },
          { k: 'late', l: 'Late', c: counts.late, grad: 'bg-saffron-gradient' },
          { k: 'excused', l: 'Excused', c: counts.excused, grad: 'bg-teal-gradient' },
        ].map(s => (
          <div key={s.k} className="rounded-2xl glass p-4 flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl ${s.grad} grid place-items-center text-white`}><ClipboardCheck size={18} /></div>
            <div><div className="text-2xl font-bold"><Counter value={s.c} /></div><div className="text-[10px] text-muted-foreground">{s.l}</div></div>
          </div>
        ))}
      </div>

      <div className="rounded-2xl glass p-4">
        {!program ? <EmptyState text="Select a class to see enrolled students" /> :
          !date ? <EmptyState text="Pick a session from the strip above" /> :
          list.length === 0 ? <EmptyState text="No students enrolled in this class" /> : (
            <div className="space-y-1.5">
              {list.map(s => {
                const enr = enrollments.find(e => e.student_id === s.id && !e.left_at);
                const remaining = enr?.sessions_remaining ?? null;
                const credited = enr?.sessions_credited ?? null;
                const exhausted = remaining === 0 && credited > 0;
                return (
                <div key={s.id} className={`flex items-center gap-3 p-2 rounded-xl hover:bg-white/50 dark:hover:bg-white/5 transition ${exhausted ? 'opacity-60' : ''}`}>
                  <Avatar className="h-9 w-9">
                    {s.photo_url ? <AvatarImage src={s.photo_url} /> : <AvatarFallback className="bg-saffron-gradient text-white text-xs">{initials(s.first_name + ' ' + s.last_name)}</AvatarFallback>}
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate flex items-center gap-2">
                      {s.first_name} {s.last_name}
                      {exhausted && <Badge className="bg-rose-500 text-[9px] px-1.5 py-0">Quota done</Badge>}
                    </div>
                    <div className="text-[10px] text-muted-foreground flex items-center gap-2">
                      <span className="font-mono">{s.student_id}</span>
                      {remaining !== null && (
                        <span className={`inline-flex items-center gap-1 ${exhausted ? 'text-rose-600' : remaining <= 3 ? 'text-amber-600' : 'text-emerald-600'}`}>
                          · <b>{remaining}</b>/{credited} sessions left
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-1.5 flex-wrap">
                    {['present', 'absent', 'late', 'excused'].map(v => (
                      <button key={v} onClick={() => setMark(s.id, v)}
                        className={`text-[11px] px-2.5 py-1 rounded-full capitalize font-medium transition ${chip(v, marks[s.id] === v)}`}>{v}</button>
                    ))}
                  </div>
                </div>
              );})}
            </div>
          )}
      </div>
    </div>
  );
}

/* ============================================================
   FEES
============================================================ */
function Fees() {
  const [items, setItems] = useState([]);
  const [students, setStudents] = useState([]);
  const [noteDrafts, setNoteDrafts] = useState({});
  const [savingNote, setSavingNote] = useState(null);
  useEffect(() => { api('/fees').then(r => setItems(r.items)); api('/students').then(r => setStudents(r.items)); }, []);
  const sMap = Object.fromEntries(students.map(s => [s.id, s]));
  const pending = items.filter(f => f.status === 'pending');
  const paid = items.filter(f => f.status === 'paid');
  const totalPending = pending.reduce((a, f) => a + (f.amount - (f.paid_amount || 0)), 0);
  const totalPaid = paid.reduce((a, f) => a + (f.paid_amount || 0), 0);
  const markPaid = async (f) => {
    await api(`/fees/${f.id}`, { method: 'PUT', body: JSON.stringify({ status: 'paid', paid_amount: f.amount, paid_at: new Date().toISOString() }) });
    api('/fees').then(r => setItems(r.items));
    confetti({ particleCount: 60, spread: 70, origin: { y: 0.7 }, colors: ['#7c3aed', '#0ea5e9'] });
    toast.success('Payment received 💰');
  };
  const saveNote = async (f) => {
    const notes = noteDrafts[f.id] ?? f.notes ?? '';
    setSavingNote(f.id);
    try {
      await api(`/fees/${f.id}`, { method: 'PUT', body: JSON.stringify({ notes }) });
      setItems(current => current.map(item => item.id === f.id ? { ...item, notes } : item));
      setNoteDrafts(current => ({ ...current, [f.id]: undefined }));
      toast.success('Fee note saved');
    } finally {
      setSavingNote(null);
    }
  };
  return (
    <div className="space-y-5">
      <PageHeader title="Fees" subtitle="Track collections & pending dues" icon={IndianRupee} />
      <div className="grid md:grid-cols-3 gap-4">
        <div className="rounded-2xl relative overflow-hidden p-5 text-white shadow-xl" style={{ background: 'linear-gradient(135deg,#059669,#10b981)' }}>
          <div className="absolute -right-4 -bottom-4 opacity-20"><IndianRupee size={80} /></div>
          <div className="text-xs opacity-85">Total Collected</div>
          <div className="text-3xl font-bold mt-1">₹<Counter value={totalPaid} format={v => Math.round(v).toLocaleString('en-IN')} /></div>
          <div className="text-[11px] opacity-80 mt-1">{paid.length} paid records</div>
        </div>
        <div className="rounded-2xl relative overflow-hidden p-5 text-white shadow-xl" style={{ background: 'linear-gradient(135deg,#e11d48,#f43f5e)' }}>
          <div className="absolute -right-4 -bottom-4 opacity-20"><IndianRupee size={80} /></div>
          <div className="text-xs opacity-85">Pending Dues</div>
          <div className="text-3xl font-bold mt-1">₹<Counter value={totalPending} format={v => Math.round(v).toLocaleString('en-IN')} /></div>
          <div className="text-[11px] opacity-80 mt-1">{pending.length} pending</div>
        </div>
        <div className="rounded-2xl glass p-5">
          <div className="text-xs text-muted-foreground">Collection Rate</div>
          <div className="text-3xl font-bold mt-1"><Counter value={Math.round((totalPaid / Math.max(1, totalPaid + totalPending)) * 100)} format={v => Math.round(v)} />%</div>
          <Progress className="mt-3 h-2" value={Math.round((totalPaid / Math.max(1, totalPaid + totalPending)) * 100)} />
        </div>
      </div>
      <div className="rounded-2xl glass overflow-hidden">
        <Table>
          <TableHeader><TableRow><TableHead>Student</TableHead><TableHead>Type</TableHead><TableHead>Amount</TableHead><TableHead>Paid</TableHead><TableHead>Status</TableHead><TableHead>Due</TableHead><TableHead className="min-w-[240px]">Notes</TableHead><TableHead></TableHead></TableRow></TableHeader>
          <TableBody>
            {items.map(f => {
              const s = sMap[f.student_id];
              return (
                <TableRow key={f.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Avatar className="h-7 w-7">
                        {s?.photo_url ? <AvatarImage src={s.photo_url} /> : <AvatarFallback className="bg-saffron-gradient text-white text-[10px]">{initials(s ? s.first_name + ' ' + s.last_name : '?')}</AvatarFallback>}
                      </Avatar>
                      <div className="text-sm font-medium">{s ? `${s.first_name} ${s.last_name}` : '-'}</div>
                    </div>
                  </TableCell>
                  <TableCell>{f.fee_type}</TableCell>
                  <TableCell>{fmtINR(f.amount)}</TableCell>
                  <TableCell>{fmtINR(f.paid_amount)}</TableCell>
                  <TableCell><Badge className={f.status === 'paid' ? 'bg-emerald-500 hover:bg-emerald-600' : 'bg-rose-500 hover:bg-rose-600'}>{f.status}</Badge></TableCell>
                  <TableCell className="text-xs text-muted-foreground">{f.due_date}</TableCell>
                  <TableCell><div className="flex items-end gap-2"><Textarea rows={2} value={noteDrafts[f.id] ?? f.notes ?? ''} onChange={e => setNoteDrafts(current => ({ ...current, [f.id]: e.target.value }))} placeholder="Add a note…" className="min-h-[52px] text-xs" /><Button size="sm" variant="outline" onClick={() => saveNote(f)} disabled={savingNote === f.id}>{savingNote === f.id ? 'Saving…' : 'Save'}</Button></div></TableCell>
                  <TableCell className="text-right">{f.status !== 'paid' && <Button size="sm" className="bg-saffron-gradient" onClick={() => markPaid(f)}>Mark Paid</Button>}</TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

/* ============================================================
   NOTIFICATIONS — FREE via wa.me deep-links
============================================================ */
function Notifications({ students }) {
  const [items, setItems] = useState([]);
  const [enrollments, setEnrollments] = useState([]);
  const [kind, setKind] = useState('fee_reminder');
  const [target, setTarget] = useState('all_active');
  const [customIds, setCustomIds] = useState([]);
  const [message, setMessage] = useState('Namaste 🙏 Kindly complete your ward\'s pending fee at your convenience. Hare Krishna!');
  const [sentIds, setSentIds] = useState(new Set());
  useEffect(() => {
    api('/notifications').then(r => setItems(r.items)).catch(() => {});
    api('/enrollments').then(r => setEnrollments(r.items)).catch(() => {});
  }, []);

  const kinds = {
    fee_reminder: 'Fee reminder',
    birthday: 'Birthday wish',
    event: 'Event announcement',
    attendance: 'Attendance update',
    low_quota: 'Low session quota alert',
    custom: 'Custom message',
  };
  const templates = {
    fee_reminder: 'Namaste 🙏 Kindly complete your ward\'s pending fee at your convenience. Hare Krishna!',
    birthday: '🎂 Wishing your dear child a very Happy Birthday! May Krishna\'s blessings be always upon them. — Gokulam Sunday School',
    event: '🌸 Upcoming: Janmashtami Celebration on Aug 16. Please join us with your family for kirtan, prasadam and cultural programs.',
    attendance: 'Dear Parent, this is a gentle reminder about your child\'s recent attendance. Please encourage regular participation. 🙏',
    low_quota: 'Namaste 🙏 Your child has only a few sessions left in their current term at Gokulam Sunday School. Please renew soon to continue the spiritual education journey. Hare Krishna!',
    custom: '',
  };

  // Low-quota target: students with any enrollment having <= 3 sessions remaining
  const lowQuotaStudentIds = useMemo(() => {
    const ids = new Set();
    enrollments.forEach(e => {
      if (!e.left_at && e.sessions_credited > 0 && e.sessions_remaining <= 3) ids.add(e.student_id);
    });
    return ids;
  }, [enrollments]);

  const normalize = (raw) => {
    if (!raw) return null;
    let p = String(raw).trim().replace(/[\s\-()+]/g, '');
    if (/^\d{10}$/.test(p)) p = '91' + p;
    else if (/^91\d{10}$/.test(p)) { /* ok */ }
    else if (/^\d{11,15}$/.test(p)) { /* pass */ }
    else return null;
    return p;
  };

  const activeStudents = useMemo(() => students.filter(s => s.status === 'active' && s.mobile), [students]);
  const recipients = useMemo(() => {
    let src = activeStudents;
    if (target === 'sample') src = src.slice(0, 5);
    if (target === 'custom') src = activeStudents.filter(s => customIds.includes(s.id));
    if (target === 'low_quota') src = activeStudents.filter(s => lowQuotaStudentIds.has(s.id));
    return src.map(s => ({ id: s.id, name: `${s.first_name} ${s.last_name}`, phone: s.mobile, phoneClean: normalize(s.mobile), photo: s.photo_url }));
  }, [activeStudents, target, customIds, lowQuotaStudentIds]);

  const validRecipients = recipients.filter(r => r.phoneClean);
  const invalidCount = recipients.length - validRecipients.length;

  const waLink = (phone, text) => `https://wa.me/${phone}?text=${encodeURIComponent(text)}`;

  const logSend = async (r) => {
    setSentIds(prev => new Set([...prev, r.id]));
    try {
      await api('/notifications', { method: 'POST', body: JSON.stringify({
        channel: 'whatsapp', kind, message, recipients: [{ name: r.name, phone: r.phone }]
      }) });
      api('/notifications').then(res => setItems(res.items));
    } catch (e) { /* log fail silently */ }
  };

  const openOne = (r) => {
    window.open(waLink(r.phoneClean, message), '_blank');
    logSend(r);
  };

  const openAll = async () => {
    if (validRecipients.length === 0) { toast.error('No valid recipients'); return; }
    if (validRecipients.length > 15 && !confirm(`This will open ${validRecipients.length} WhatsApp tabs. Continue?`)) return;
    toast.info(`Opening ${validRecipients.length} WhatsApp chats… allow popups if blocked`);
    confetti({ particleCount: 80, spread: 70, origin: { y: 0.6 }, colors: ['#25D366', '#128C7E', '#7c3aed'] });
    for (let i = 0; i < validRecipients.length; i++) {
      const r = validRecipients[i];
      setTimeout(() => { window.open(waLink(r.phoneClean, message), '_blank'); logSend(r); }, i * 350);
    }
  };

  const copyMessage = () => { navigator.clipboard.writeText(message); toast.success('Message copied'); };

  const toggleCustom = (id) => {
    setCustomIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  return (
    <div className="space-y-5">
      <PageHeader title="WhatsApp Notifications" subtitle="Send messages via free WhatsApp deep-links" icon={Bell} />

      <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-900 dark:text-emerald-200 p-3 text-xs flex items-start gap-2">
        <div className="w-6 h-6 rounded-full bg-emerald-500 grid place-items-center text-white shrink-0"><MessageSquare size={12} /></div>
        <div>
          <div className="font-semibold">100% free — no API keys, no monthly fees.</div>
          Clicking "Send" opens WhatsApp Web / WhatsApp app on your device with the message pre-filled to each parent's number. You just hit send. Works on desktop, mobile, and iPad.
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        {/* Composer */}
        <div className="lg:col-span-2 rounded-2xl glass p-5 space-y-4">
          <div>
            <Label className="text-[11px]">Template</Label>
            <Select value={kind} onValueChange={v => { setKind(v); if (templates[v]) setMessage(templates[v]); }}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{Object.entries(kinds).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-[11px]">Recipients</Label>
            <Select value={target} onValueChange={setTarget}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all_active">All active students ({activeStudents.length})</SelectItem>
                <SelectItem value="sample">First 5 (testing)</SelectItem>
                <SelectItem value="custom">Choose individually ({customIds.length} selected)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {target === 'custom' && (
            <div className="max-h-52 overflow-y-auto rounded-xl border p-2 space-y-1 bg-white/30 dark:bg-white/5">
              {activeStudents.map(s => (
                <label key={s.id} className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-white/60 dark:hover:bg-white/10 cursor-pointer">
                  <input type="checkbox" checked={customIds.includes(s.id)} onChange={() => toggleCustom(s.id)} className="accent-primary" />
                  <span className="text-xs">{s.first_name} {s.last_name}</span>
                  <span className="ml-auto text-[10px] text-muted-foreground">{s.mobile}</span>
                </label>
              ))}
            </div>
          )}

          <div>
            <Label className="text-[11px]">Message</Label>
            <Textarea rows={5} value={message} onChange={e => setMessage(e.target.value)} placeholder="Type message…" />
            <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
              <span>{message.length} characters</span>
              <button onClick={copyMessage} className="hover:text-primary">Copy message</button>
            </div>
          </div>

          <div className="flex gap-2">
            <Button className="flex-1 bg-emerald-gradient shadow" onClick={openAll} disabled={validRecipients.length === 0}>
              <MessageSquare size={14} className="mr-1.5" /> Open all {validRecipients.length} chats
            </Button>
          </div>
          {invalidCount > 0 && (
            <div className="text-[11px] text-amber-600 dark:text-amber-400">
              ⚠️ {invalidCount} recipient(s) skipped — invalid or missing phone number.
            </div>
          )}
        </div>

        {/* WhatsApp preview */}
        <div className="rounded-2xl glass p-5">
          <div className="text-xs font-semibold mb-3">WhatsApp Preview</div>
          <div className="rounded-3xl bg-black text-white p-1 shadow-2xl mx-auto max-w-[260px]">
            <div className="rounded-[22px] p-4 h-[420px] flex flex-col relative overflow-hidden"
              style={{ background: 'linear-gradient(180deg,#0b1416 0%,#0e1a1d 100%)' }}>
              <div className="text-center text-[10px] text-slate-400 mb-2">WhatsApp • {new Date().toLocaleTimeString('en', { hour: '2-digit', minute: '2-digit' })}</div>
              <div className="self-start max-w-[85%] rounded-2xl px-3 py-2 text-xs shadow" style={{ background: '#005c4b' }}>
                {message || <span className="text-slate-400">Your message will appear here…</span>}
                <div className="text-[9px] text-slate-300 text-right mt-1">{new Date().toLocaleTimeString('en', { hour: '2-digit', minute: '2-digit' })} ✓✓</div>
              </div>
              <div className="mt-auto text-center text-[9px] text-slate-500">via Gokulam360 • {kinds[kind]}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Recipients list with per-person Send */}
      <div className="rounded-2xl glass p-5">
        <div className="flex items-center justify-between mb-3">
          <div className="text-sm font-semibold flex items-center gap-1.5"><Users size={14} className="text-primary" /> Recipients ({validRecipients.length})</div>
          <div className="text-[11px] text-muted-foreground">Click each row to send individually</div>
        </div>
        {recipients.length === 0 ? <EmptyState small text="No recipients selected" /> : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-2 max-h-96 overflow-y-auto">
            {recipients.map(r => {
              const sent = sentIds.has(r.id);
              const invalid = !r.phoneClean;
              return (
                <div key={r.id} className={`flex items-center gap-2.5 p-2 rounded-xl border transition ${invalid ? 'opacity-50 bg-muted/30' : sent ? 'bg-emerald-500/10 border-emerald-500/40' : 'bg-white/40 dark:bg-white/5 hover:bg-emerald-500/5'}`}>
                  <Avatar className="h-9 w-9">
                    {r.photo ? <AvatarImage src={r.photo} /> : <AvatarFallback className="bg-saffron-gradient text-white text-[11px]">{initials(r.name)}</AvatarFallback>}
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-medium truncate">{r.name}</div>
                    <div className="text-[10px] font-mono text-muted-foreground">{r.phone || 'No phone'}</div>
                  </div>
                  {invalid ? <Badge variant="destructive" className="text-[9px]">invalid</Badge> :
                    <Button size="sm" variant={sent ? 'ghost' : 'default'} className={`h-7 text-[11px] ${sent ? 'text-emerald-600' : 'bg-emerald-gradient text-white'}`} onClick={() => openOne(r)}>
                      {sent ? '✓ Sent' : <><MessageSquare size={11} className="mr-1" /> Send</>}
                    </Button>
                  }
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* History */}
      <div className="rounded-2xl glass p-5">
        <div className="text-sm font-semibold flex items-center gap-1.5 mb-3"><Activity size={14} className="text-primary" /> Notification History</div>
        {items.length === 0 ? <EmptyState small text="No notifications sent yet" /> : (
          <div className="space-y-2">
            {items.slice(0, 20).map(n => (
              <div key={n.id} className="flex items-start gap-3 p-3 rounded-xl bg-white/40 dark:bg-white/5 border">
                <div className="w-9 h-9 rounded-lg grid place-items-center text-white bg-emerald-gradient"><MessageSquare size={15} /></div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium line-clamp-1">{n.message}</div>
                  <div className="text-[10px] text-muted-foreground mt-0.5">To {n.recipients?.[0]?.name || 'recipients'} • {kinds[n.kind] || n.kind} • {timeAgo(n.created_at)}</div>
                </div>
                <Badge className="bg-emerald-500">sent</Badge>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ============================================================
   REPORTS
============================================================ */
function Reports() {
  const [tab, setTab] = useState('students');
  const [rows, setRows] = useState([]);
  const [attSummary, setAttSummary] = useState(null);
  const [loading, setLoading] = useState(false);
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const dateRangeSuffix = fromDate || toDate ? `-${fromDate || 'start'}-to-${toDate || 'end'}` : '';
  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (fromDate) params.set('from', fromDate);
    if (toDate) params.set('to', toDate);
    const query = params.toString() ? `?${params.toString()}` : '';
    if (tab === 'attendance-summary') {
      api(`/reports/attendance-summary${query}`).then(setAttSummary).finally(() => setLoading(false));
    } else {
      api(`/reports/${tab}${query}`).then(r => setRows(r.items)).finally(() => setLoading(false));
    }
  }, [tab, fromDate, toDate]);

  const columns = {
    students: ['student_id', 'first_name', 'last_name', 'gender', 'mobile', 'email', 'status'],
    attendance: ['date', 'student_name', 'status'],
    fees: ['student_name', 'fee_type', 'amount', 'paid_amount', 'status', 'due_date'],
  }[tab];

  const exportCSV = () => {
    if (tab === 'attendance-summary' && attSummary) {
      const headers = ['Student ID', 'Name', 'Overall %', 'Sessions', 'Present', ...attSummary.months];
      const lines = attSummary.students.map(s => [s.student_id, s.name, s.overall + '%', s.total_sessions, s.present, ...attSummary.months.map(m => (s.monthly[m] ?? '-') + (s.monthly[m] !== undefined ? '%' : ''))]);
      const csv = [headers.join(','), ...lines.map(l => l.map(v => `"${v}"`).join(','))].join('\n');
      const blob = new Blob([csv], { type: 'text/csv' });
      const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `attendance-summary${dateRangeSuffix}.csv`; a.click();
      return;
    }
    const csv = [columns.join(','), ...rows.map(r => columns.map(c => `"${String(r[c] ?? '').replace(/"/g, '""')}"`).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `${tab}-report${dateRangeSuffix}.csv`; a.click();
  };
  const exportXLSX = async () => {
    const XLSX = await import('xlsx');
    let ws, sheet = tab;
    if (tab === 'attendance-summary' && attSummary) {
      const data = attSummary.students.map(s => ({ 'Student ID': s.student_id, Name: s.name, 'Overall %': s.overall, Sessions: s.total_sessions, Present: s.present, ...Object.fromEntries(attSummary.months.map(m => [m, s.monthly[m] ?? ''])) }));
      ws = XLSX.utils.json_to_sheet(data);
      sheet = 'attendance-summary';
    } else {
      ws = XLSX.utils.json_to_sheet(rows.map(r => Object.fromEntries(columns.map(c => [c, r[c] ?? '']))));
    }
    const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, sheet);
    XLSX.writeFile(wb, `${sheet}-report${dateRangeSuffix}.xlsx`);
  };
  const exportPDF = async () => {
    const { jsPDF } = await import('jspdf');
    const doc = new jsPDF({ orientation: 'landscape' });
    doc.setFillColor(234, 88, 12); doc.rect(0, 0, 300, 20, 'F');
    doc.setTextColor(255); doc.setFontSize(16); doc.setFont('helvetica', 'bold'); doc.text('Gokulam360', 14, 13);
    doc.setFontSize(10); doc.setFont('helvetica', 'normal'); doc.text(`${tab.toUpperCase()} REPORT${dateRangeSuffix ? ` — ${fromDate || 'Start'} to ${toDate || 'Today'}` : ''} — ${new Date().toLocaleDateString()}`, 100, 13);
    const pdfColumns = tab === 'attendance-summary' ? ['student_id', 'name', 'overall', 'total_sessions', 'present'] : columns;
    const pdfRows = tab === 'attendance-summary' ? (attSummary?.students || []).map(student => ({ ...student, overall: student.overall + '%' })) : rows;
    doc.setTextColor(30);
    let y = 28;
    doc.setFontSize(9); doc.setFont('helvetica', 'bold');
    pdfColumns.forEach((c, i) => doc.text(c.replace(/_/g, ' ').toUpperCase(), 14 + i * 40, y));
    y += 5; doc.setFont('helvetica', 'normal');
    pdfRows.slice(0, 30).forEach(r => {
      pdfColumns.forEach((c, i) => doc.text(String(r[c] ?? '').slice(0, 22), 14 + i * 40, y));
      y += 5.5; if (y > 195) { doc.addPage(); y = 20; }
    });
    doc.save(`${tab}-report${dateRangeSuffix}.pdf`);
  };

  return (
    <div className="space-y-5">
      <PageHeader title="Reports" subtitle="Export data as PDF, Excel or CSV" icon={FileText}
        action={<div className="flex gap-2">
          <Button variant="outline" onClick={exportCSV}><Download size={14} className="mr-1" /> CSV</Button>
          <Button variant="outline" onClick={exportXLSX}><FileSpreadsheet size={14} className="mr-1" /> Excel</Button>
          <Button className="bg-saffron-gradient" onClick={exportPDF}><FileText size={14} className="mr-1" /> PDF</Button>
        </div>} />

      {tab !== 'students' && <div className="rounded-2xl glass p-4 flex flex-wrap items-end gap-3">
        <div><Label className="text-xs">From date</Label><Input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)} className="mt-1 w-[170px]" /></div>
        <div><Label className="text-xs">To date</Label><Input type="date" value={toDate} onChange={e => setToDate(e.target.value)} min={fromDate || undefined} className="mt-1 w-[170px]" /></div>
        {(fromDate || toDate) && <Button variant="ghost" size="sm" onClick={() => { setFromDate(''); setToDate(''); }}>Clear dates</Button>}
      </div>}

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="students">Students</TabsTrigger>
          <TabsTrigger value="attendance">Attendance</TabsTrigger>
          <TabsTrigger value="attendance-summary">Monthly Summary</TabsTrigger>
          <TabsTrigger value="fees">Fees</TabsTrigger>
        </TabsList>
        <TabsContent value={tab} className="mt-4">
          {tab === 'attendance-summary' ? (
            <AttendanceSummaryTable data={attSummary} loading={loading} />
          ) : (
            <div className="rounded-2xl glass overflow-hidden">
              {loading ? <div className="p-6 space-y-2">{[...Array(6)].map((_, i) => <Skeleton key={i} className="h-8" />)}</div> :
                rows.length === 0 ? <EmptyState text="No data in this report" /> : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader><TableRow>{columns.map(c => <TableHead key={c} className="whitespace-nowrap">{c.replace(/_/g, ' ')}</TableHead>)}</TableRow></TableHeader>
                      <TableBody>
                        {rows.slice(0, 200).map((r, i) => (
                          <TableRow key={i}>
                            {columns.map(c => <TableCell key={c} className="whitespace-nowrap text-xs">{String(r[c] ?? '-')}</TableCell>)}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                    {rows.length > 200 && <div className="text-center text-[11px] text-muted-foreground py-3">Showing 200 of {rows.length} rows. Export to see all.</div>}
                  </div>
                )}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function AttendanceSummaryTable({ data, loading }) {
  if (loading || !data) return <div className="rounded-2xl glass p-6 space-y-2">{[...Array(8)].map((_, i) => <Skeleton key={i} className="h-8" />)}</div>;
  if (!data.students.length) return <EmptyState text="No attendance recorded yet" />;
  const pctColor = (p) => {
    if (p === undefined || p === null || p === '-') return 'bg-muted text-muted-foreground';
    if (p >= 90) return 'bg-emerald-500 text-white';
    if (p >= 75) return 'bg-emerald-400 text-white';
    if (p >= 50) return 'bg-amber-400 text-white';
    if (p >= 25) return 'bg-orange-500 text-white';
    return 'bg-rose-500 text-white';
  };
  const sorted = [...data.students].sort((a, b) => b.overall - a.overall);
  const avg = sorted.length ? Math.round(sorted.reduce((s, x) => s + x.overall, 0) / sorted.length) : 0;
  const top = sorted.slice(0, 3);
  const bottom = sorted.slice(-3).reverse();

  return (
    <div className="space-y-4">
      <div className="grid md:grid-cols-3 gap-3">
        <div className="rounded-2xl glass p-4 flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-saffron-gradient grid place-items-center text-white shadow"><Users size={18} /></div>
          <div><div className="text-2xl font-bold"><Counter value={data.students.length} /></div><div className="text-[10px] text-muted-foreground">Students tracked</div></div>
        </div>
        <div className="rounded-2xl glass p-4 flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-emerald-gradient grid place-items-center text-white shadow"><TrendingUp size={18} /></div>
          <div><div className="text-2xl font-bold"><Counter value={avg} />%</div><div className="text-[10px] text-muted-foreground">Average attendance</div></div>
        </div>
        <div className="rounded-2xl glass p-4 flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-violet-gradient grid place-items-center text-white shadow"><CalendarIcon size={18} /></div>
          <div><div className="text-2xl font-bold"><Counter value={data.months.length} /></div><div className="text-[10px] text-muted-foreground">Months tracked</div></div>
        </div>
      </div>
      <div className="grid md:grid-cols-2 gap-3">
        <div className="rounded-2xl glass p-4">
          <div className="text-xs font-semibold flex items-center gap-1.5 mb-3"><Award size={13} className="text-emerald-500" /> Top performers</div>
          {top.map(s => (
            <div key={s.student_id} className="flex items-center gap-2 py-1.5">
              <div className="flex-1 text-sm">{s.name}</div>
              <div className={`text-xs px-2 py-0.5 rounded-full ${pctColor(s.overall)}`}>{s.overall}%</div>
            </div>
          ))}
        </div>
        <div className="rounded-2xl glass p-4">
          <div className="text-xs font-semibold flex items-center gap-1.5 mb-3"><Zap size={13} className="text-rose-500" /> Needs attention</div>
          {bottom.map(s => (
            <div key={s.student_id} className="flex items-center gap-2 py-1.5">
              <div className="flex-1 text-sm">{s.name}</div>
              <div className={`text-xs px-2 py-0.5 rounded-full ${pctColor(s.overall)}`}>{s.overall}%</div>
            </div>
          ))}
        </div>
      </div>
      <div className="rounded-2xl glass overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="sticky top-0 bg-card/95 backdrop-blur">
              <TableRow>
                <TableHead>Student</TableHead>
                <TableHead className="text-center">Overall</TableHead>
                <TableHead className="text-center">Sessions</TableHead>
                {data.months.map(m => <TableHead key={m} className="text-center whitespace-nowrap">{new Date(m + '-01').toLocaleString('en', { month: 'short', year: '2-digit' })}</TableHead>)}
              </TableRow>
            </TableHeader>
            <TableBody>
              {sorted.map(s => (
                <TableRow key={s.student_id}>
                  <TableCell>
                    <div className="font-medium text-sm">{s.name}</div>
                    <div className="text-[10px] font-mono text-muted-foreground">{s.student_id}</div>
                  </TableCell>
                  <TableCell className="text-center">
                    <div className={`inline-flex px-2.5 py-1 rounded-full text-xs font-semibold ${pctColor(s.overall)}`}>{s.overall}%</div>
                  </TableCell>
                  <TableCell className="text-center text-xs">{s.present}/{s.total_sessions}</TableCell>
                  {data.months.map(m => (
                    <TableCell key={m} className="text-center">
                      {s.monthly[m] !== undefined ? (
                        <div className={`inline-flex w-11 h-6 items-center justify-center rounded text-[11px] font-semibold ${pctColor(s.monthly[m])}`}>{s.monthly[m]}%</div>
                      ) : <span className="text-muted-foreground text-xs">—</span>}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   EVENTS
============================================================ */
function Events() {
  const [items, setItems] = useState([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const empty = { name: '', date: '', description: '', image_url: '' };
  const [form, setForm] = useState(empty);
  const load = () => api('/events').then(r => setItems(r.items));
  useEffect(() => { load(); }, []);
  const save = async () => {
    try {
      if (editing) await api(`/events/${editing.id}`, { method: 'PUT', body: JSON.stringify(form) });
      else await api('/events', { method: 'POST', body: JSON.stringify(form) });
      confetti({ particleCount: 80, spread: 70, origin: { y: 0.6 }, colors: ['#7c3aed', '#4f46e5', '#a855f7', '#ec4899'] });
      toast.success(editing ? 'Event updated' : 'Event created 🎉');
      setOpen(false); load();
    } catch (e) { toast.error(e.message); }
  };
  const del = async (e) => { if (!confirm(`Delete ${e.name}?`)) return; await api(`/events/${e.id}`, { method: 'DELETE' }); load(); };
  const openNew = () => { setEditing(null); setForm(empty); setOpen(true); };
  const openEdit = (e) => { setEditing(e); setForm({ ...empty, ...e }); setOpen(true); };
  const selectImage = (ev) => {
    const file = ev.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) return toast.error('Please choose an image file');
    if (file.size > 2 * 1024 * 1024) return toast.error('Please choose an image smaller than 2 MB');
    const reader = new FileReader();
    reader.onload = () => setForm(current => ({ ...current, image_url: reader.result }));
    reader.readAsDataURL(file);
  };
  const covers = ['#7c3aed,#ec4899', '#4f46e5,#0ea5e9', '#0891b2,#22d3ee', '#a855f7,#3b82f6', '#8b5cf6,#d946ef'];

  return (
    <div className="space-y-5">
      <PageHeader title="Events" subtitle="Celebrations, festivals & activities" icon={CalendarIcon}
        action={<Button className="bg-saffron-gradient shadow" onClick={openNew}><Plus size={15} className="mr-1" /> New Event</Button>} />
      {items.length === 0 ? <EmptyState text="No events yet" action={<Button className="mt-3 bg-saffron-gradient" onClick={openNew}><Plus size={14} className="mr-1" />Create first event</Button>} /> : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map((e, i) => (
            <motion.div key={e.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
              className="rounded-2xl overflow-hidden glass card-lift group">
              <div className="h-28 relative" style={{ background: `linear-gradient(135deg, ${covers[i % covers.length]})` }}>
                {e.image_url ? <img src={e.image_url} alt="" className="absolute inset-0 h-full w-full object-cover" /> : (
                  <div className="absolute inset-0 flex items-center justify-center"><CalendarIcon className="text-white/90" size={40} /></div>
                )}
                <div className="absolute bottom-3 left-3 bg-white/20 backdrop-blur rounded-lg text-white text-center px-2 py-1 min-w-[54px]">
                  <div className="text-[9px] uppercase">{new Date(e.date).toLocaleString('en', { month: 'short' })}</div>
                  <div className="text-xl font-bold leading-none">{new Date(e.date).getDate()}</div>
                </div>
              </div>
              <div className="p-4">
                <div className="font-bold">{e.name}</div>
                <p className="text-xs text-muted-foreground mt-1 line-clamp-2 min-h-[32px]">{e.description}</p>
                <div className="flex gap-1 mt-3 pt-3 border-t opacity-0 group-hover:opacity-100 transition">
                  <Button size="sm" variant="ghost" className="flex-1 text-xs h-8" onClick={() => openEdit(e)}><Edit3 size={13} className="mr-1" /> Edit</Button>
                  <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => del(e)}><Trash2 size={13} /></Button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{editing ? 'Edit' : 'New'} Event</DialogTitle><DialogDescription>Add festivals, competitions, camps and more.</DialogDescription></DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2"><Label>Event Name</Label><Input value={form.name} onChange={ev => setForm({ ...form, name: ev.target.value })} placeholder="e.g. Janmashtami Celebration" /></div>
            <div><Label>Date</Label><Input type="date" value={form.date} onChange={ev => setForm({ ...form, date: ev.target.value })} /></div>
            <div></div>
            <div className="col-span-2"><Label>Description</Label><Textarea rows={3} value={form.description} onChange={ev => setForm({ ...form, description: ev.target.value })} placeholder="Details about the event" /></div>
            <div className="col-span-2 space-y-2"><Label>Advertisement image <span className="text-muted-foreground font-normal">(optional, max 2 MB)</span></Label><Input type="file" accept="image/*" onChange={selectImage} />{form.image_url && <div className="flex items-center gap-3"><img src={form.image_url} alt="Event preview" className="h-16 w-24 rounded-lg object-cover border" /><Button type="button" variant="ghost" size="sm" onClick={() => setForm({ ...form, image_url: '' })}>Remove image</Button></div>}</div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button><Button onClick={save} className="bg-saffron-gradient">{editing ? 'Update' : 'Create'}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ============================================================
   PARENT PORTAL
============================================================ */
function ParentPortal({ user, onLogout, dark, setDark }) {
  const [data, setData] = useState(null);
  useEffect(() => { api('/parent/me').then(setData).catch(e => toast.error(e.message)); }, []);
  if (!data) return <div className="min-h-screen grid place-items-center text-muted-foreground">Loading…</div>;
  const s = data.student;
  const attRecent = data.attendance.slice(0, 10);
  const presentCount = data.attendance.filter(a => a.status === 'present' || a.status === 'late').length;
  const attPct = Math.round((presentCount / Math.max(1, data.attendance.length)) * 100);
  const feeDue = data.fees.filter(f => f.status !== 'paid').reduce((a, f) => a + (f.amount - (f.paid_amount || 0)), 0);
  const feePaid = data.fees.reduce((a, f) => a + (f.paid_amount || 0), 0);

  return (
    <div className="min-h-screen bg-aurora relative">
      <AuroraBlobs />
      <div className="relative max-w-5xl mx-auto p-4 md:p-8 space-y-5">
        {/* Header */}
        <div className="rounded-2xl glass px-4 h-14 flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-saffron-gradient grid place-items-center text-white shadow"><Flame size={16} /></div>
          <div className="font-bold">Gokulam<span className="text-gradient">360</span> <span className="text-xs font-normal text-muted-foreground ml-1">Parent Portal</span></div>
          <div className="ml-auto flex items-center gap-2">
            <Button size="icon" variant="ghost" onClick={() => setDark(!dark)}>{dark ? <Sun size={16} /> : <Moon size={16} />}</Button>
            <Button size="sm" variant="ghost" onClick={onLogout}><LogOut size={14} className="mr-1" /> Logout</Button>
          </div>
        </div>

        {/* Hero */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
          className="relative overflow-hidden rounded-3xl p-6 md:p-8 bg-mesh-warm border">
          <div className="absolute -right-10 -top-10 w-64 h-64 rounded-full bg-white/30 blur-3xl" />
          <div className="relative flex items-center gap-4">
            <Avatar className="h-20 w-20 ring-4 ring-white/60 shadow-xl">
              {s.photo_url ? <AvatarImage src={s.photo_url} /> : <AvatarFallback className="bg-saffron-gradient text-white text-2xl font-bold">{initials(s.first_name + ' ' + s.last_name)}</AvatarFallback>}
            </Avatar>
            <div>
              <div className="text-xs text-orange-900/70">Welcome</div>
              <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-orange-950 dark:text-orange-100">{s.first_name} {s.last_name}</h1>
              <div className="text-sm text-orange-900/70 mt-1">Student ID: <span className="font-mono">{s.student_id}</span></div>
            </div>
          </div>
        </motion.div>

        {/* Stats */}
        <div className="grid md:grid-cols-3 gap-4">
          <div className="rounded-2xl glass p-5">
            <div className="flex justify-between items-start">
              <div><div className="text-xs text-muted-foreground">Attendance</div><div className="text-3xl font-bold mt-1"><Counter value={attPct} />%</div></div>
              <ProgressRing value={attPct} size={70} stroke={7} label="" />
            </div>
          </div>
          <div className="rounded-2xl relative overflow-hidden p-5 text-white shadow-xl" style={{ background: 'linear-gradient(135deg,#059669,#10b981)' }}>
            <div className="text-xs opacity-85">Total Fees Paid</div>
            <div className="text-3xl font-bold mt-1">₹<Counter value={feePaid} format={v => Math.round(v).toLocaleString('en-IN')} /></div>
          </div>
          <div className={`rounded-2xl relative overflow-hidden p-5 text-white shadow-xl`} style={{ background: feeDue > 0 ? 'linear-gradient(135deg,#e11d48,#f43f5e)' : 'linear-gradient(135deg,#0891b2,#22d3ee)' }}>
            <div className="text-xs opacity-85">{feeDue > 0 ? 'Pending Dues' : 'All Clear'}</div>
            <div className="text-3xl font-bold mt-1">₹<Counter value={feeDue} format={v => Math.round(v).toLocaleString('en-IN')} /></div>
          </div>
        </div>

        {/* Attendance timeline & fees */}
        <div className="grid md:grid-cols-2 gap-4">
          <div className="rounded-2xl glass p-5">
            <div className="text-sm font-semibold mb-3 flex items-center gap-1.5"><ClipboardCheck size={14} className="text-primary" /> Recent Attendance</div>
            {attRecent.length === 0 ? <EmptyState small text="No attendance yet" /> : (
              <div className="space-y-1.5">
                {attRecent.map(a => (
                  <div key={a.id} className="flex items-center justify-between p-2 rounded-lg bg-white/40 dark:bg-white/5">
                    <div className="text-xs">{new Date(a.date).toLocaleDateString('en', { weekday: 'short', day: 'numeric', month: 'short' })}</div>
                    <Badge className={
                      a.status === 'present' ? 'bg-emerald-500' :
                      a.status === 'late' ? 'bg-amber-500' :
                      a.status === 'excused' ? 'bg-sky-500' : 'bg-rose-500'
                    }>{a.status}</Badge>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="rounded-2xl glass p-5">
            <div className="text-sm font-semibold mb-3 flex items-center gap-1.5"><IndianRupee size={14} className="text-primary" /> Fee History</div>
            {data.fees.length === 0 ? <EmptyState small text="No fees on record" /> : (
              <div className="space-y-1.5">
                {data.fees.map(f => (
                  <div key={f.id} className="flex items-center justify-between p-2 rounded-lg bg-white/40 dark:bg-white/5">
                    <div>
                      <div className="text-xs font-medium">{f.fee_type}</div>
                      <div className="text-[10px] text-muted-foreground">Due {f.due_date}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-bold">{fmtINR(f.amount)}</div>
                      <Badge className={f.status === 'paid' ? 'bg-emerald-500' : 'bg-rose-500'}>{f.status}</Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   BACKUP / RESTORE
============================================================ */
function Backup() {
  const [exporting, setExporting] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [lastBackup, setLastBackup] = useState(null);
  const fileRef = useRef(null);

  const doExport = async () => {
    setExporting(true);
    try {
      const data = await api('/backup/export');
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `gokulam360-backup-${stamp}.json`;
      a.click();
      setLastBackup({ at: new Date().toISOString(), counts: data.counts });
      confetti({ particleCount: 100, spread: 80, origin: { y: 0.6 }, colors: ['#7c3aed', '#22c55e', '#0ea5e9'] });
      toast.success('Backup downloaded successfully 💾');
    } catch (e) { toast.error(e.message); }
    finally { setExporting(false); }
  };

  const onRestoreFile = async (e) => {
    const file = e.target.files?.[0]; if (!file) return;
    if (!confirm(`Restoring will REPLACE all current org data with the backup. Continue?`)) return;
    setRestoring(true);
    try {
      const text = await file.text();
      const backup = JSON.parse(text);
      const res = await api('/backup/restore', { method: 'POST', body: JSON.stringify(backup) });
      confetti({ particleCount: 200, spread: 100, origin: { y: 0.5 }, colors: ['#7c3aed', '#22c55e'] });
      toast.success(`Restored: ${Object.entries(res.restored).map(([k, v]) => `${v} ${k}`).join(' • ')}`);
    } catch (e) { toast.error('Invalid backup file: ' + e.message); }
    finally { setRestoring(false); e.target.value = ''; }
  };

  return (
    <div className="space-y-5">
      <PageHeader title="Data Backup" subtitle="Export or restore your organization's entire data" icon={Download} />

      <div className="grid md:grid-cols-2 gap-4">
        {/* Export card */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="rounded-3xl relative overflow-hidden p-6 text-white shadow-2xl"
          style={{ background: 'linear-gradient(135deg, #4c1d95 0%, #6d28d9 55%, #a855f7 100%)' }}>
          <div className="absolute -right-8 -bottom-8 opacity-15"><Download size={180} /></div>
          <div className="relative">
            <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur grid place-items-center mb-4"><Download size={22} /></div>
            <div className="text-xl font-bold">Download Backup</div>
            <div className="text-sm opacity-85 mt-1">One-click JSON export of every student, teacher, class, attendance record, fee, event & notification for this organization.</div>
            <div className="mt-4 space-y-1.5 text-xs opacity-90">
              <div className="flex items-center gap-2"><Check size={12} /> Includes all your data</div>
              <div className="flex items-center gap-2"><Check size={12} /> Safe to email or store in cloud</div>
              <div className="flex items-center gap-2"><Check size={12} /> Restore anytime</div>
            </div>
            <Button className="mt-5 bg-white text-violet-700 hover:bg-white/90" onClick={doExport} disabled={exporting}>
              <Download size={15} className="mr-1.5" /> {exporting ? 'Preparing…' : 'Export as JSON'}
            </Button>
            {lastBackup && (
              <div className="text-[11px] opacity-80 mt-3">
                Last export: {timeAgo(lastBackup.at)} • {Object.entries(lastBackup.counts).map(([k, v]) => `${v} ${k}`).join(', ')}
              </div>
            )}
          </div>
        </motion.div>

        {/* Restore card */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          className="rounded-3xl glass p-6">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-rose-500 to-pink-500 text-white grid place-items-center mb-4 shadow"><Upload size={22} /></div>
          <div className="text-xl font-bold">Restore from Backup</div>
          <div className="text-sm text-muted-foreground mt-1">Upload a Gokulam360 backup JSON to restore. This <b className="text-rose-600">replaces</b> all current data for your organization.</div>
          <div className="mt-4 space-y-1.5 text-xs">
            <div className="flex items-center gap-2 text-amber-600"><span className="w-1 h-1 rounded-full bg-amber-500" /> Destructive — take a fresh export first</div>
            <div className="flex items-center gap-2 text-muted-foreground"><Check size={12} /> Idempotent — same file = same result</div>
            <div className="flex items-center gap-2 text-muted-foreground"><Check size={12} /> Data stays scoped to your org</div>
          </div>
          <input ref={fileRef} type="file" accept=".json" hidden onChange={onRestoreFile} />
          <Button variant="outline" className="mt-5 border-rose-300 text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-900/20" onClick={() => fileRef.current?.click()} disabled={restoring}>
            <Upload size={15} className="mr-1.5" /> {restoring ? 'Restoring…' : 'Upload backup file'}
          </Button>
        </motion.div>
      </div>

      <div className="rounded-2xl glass p-5">
        <div className="text-sm font-semibold mb-3 flex items-center gap-2"><Sparkles size={14} className="text-primary" /> Best practices</div>
        <div className="grid md:grid-cols-3 gap-3 text-xs">
          {[
            { icon: CalendarIcon, title: 'Weekly cadence', desc: 'Download a backup every Sunday after class.' },
            { icon: Building2, title: 'Off-site copy', desc: 'Keep at least one copy in Google Drive or email.' },
            { icon: Rocket, title: 'Before big changes', desc: 'Export before term rollovers or bulk imports.' },
          ].map(b => (
            <div key={b.title} className="rounded-xl p-3 bg-white/40 dark:bg-white/5 border">
              <div className="w-8 h-8 rounded-lg bg-saffron-gradient text-white grid place-items-center mb-2"><b.icon size={14} /></div>
              <div className="font-semibold">{b.title}</div>
              <div className="text-muted-foreground mt-0.5">{b.desc}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   PUBLIC PARENT PAGE (no auth)
============================================================ */
function PublicParentView({ token }) {
  const [data, setData] = useState(null);
  const [err, setErr] = useState(null);
  useEffect(() => {
    fetch(`/api/public/student/${token}`).then(r => r.json()).then(d => {
      if (d.error) setErr(d.error); else setData(d);
    }).catch(e => setErr(e.message));
  }, [token]);

  if (err) return (
    <div className="min-h-screen bg-aurora grid place-items-center p-6">
      <div className="rounded-2xl glass p-8 text-center max-w-md">
        <div className="w-16 h-16 mx-auto rounded-2xl bg-rose-500/20 grid place-items-center text-rose-600 mb-4"><span className="text-3xl">😔</span></div>
        <div className="font-bold text-lg">Link not found</div>
        <div className="text-sm text-muted-foreground mt-1">This parent link is invalid or has expired.</div>
      </div>
    </div>
  );
  if (!data) return <div className="min-h-screen bg-aurora grid place-items-center text-muted-foreground">Loading…</div>;

  const s = data.student;
  const attPct = data.attendance.length ? Math.round((data.attendance.filter(a => a.status === 'present' || a.status === 'late').length / data.attendance.length) * 100) : 0;
  const feeDue = data.fees.filter(f => f.status !== 'paid').reduce((a, f) => a + (f.amount - (f.paid_amount || 0)), 0);
  const feePaid = data.fees.reduce((a, f) => a + (f.paid_amount || 0), 0);
  const events = data.events || [];

  return (
    <div className="min-h-screen bg-aurora relative">
      <AuroraBlobs />
      <div className="relative max-w-3xl mx-auto p-4 md:p-8 space-y-5">
        <div className="rounded-2xl glass px-4 h-14 flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-saffron-gradient grid place-items-center text-white shadow"><Flame size={16} /></div>
          <div className="font-bold">Gokulam<span className="text-gradient">360</span> <span className="text-xs font-normal text-muted-foreground ml-1">Parent View</span></div>
          <div className="ml-auto text-[10px] text-muted-foreground">{data.organization.name}</div>
        </div>

        <div className="relative overflow-hidden rounded-3xl p-6 md:p-8 bg-mesh-warm border">
          <div className="absolute -right-10 -top-10 w-64 h-64 rounded-full bg-white/30 blur-3xl" />
          <div className="relative flex items-center gap-4">
            <Avatar className="h-20 w-20 ring-4 ring-white/60 shadow-xl">
              {s.photo_url ? <AvatarImage src={s.photo_url} /> : <AvatarFallback className="bg-saffron-gradient text-white text-2xl">{initials(s.first_name + ' ' + s.last_name)}</AvatarFallback>}
            </Avatar>
            <div>
              <div className="text-xs text-indigo-900/70">Namaste 🙏</div>
              <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-indigo-950">{s.first_name} {s.last_name}</h1>
              <div className="text-sm text-indigo-900/70 mt-1 font-mono">{s.student_id}</div>
            </div>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-4">
          <div className="rounded-2xl glass p-5"><div className="text-xs text-muted-foreground">Attendance</div><div className="text-3xl font-bold mt-1"><Counter value={attPct} />%</div><Progress value={attPct} className="h-1.5 mt-2" /></div>
          <div className="rounded-2xl relative overflow-hidden p-5 text-white shadow-xl" style={{ background: 'linear-gradient(135deg,#059669,#10b981)' }}><div className="text-xs opacity-85">Paid</div><div className="text-3xl font-bold mt-1">₹<Counter value={feePaid} format={v => Math.round(v).toLocaleString('en-IN')} /></div></div>
          <div className={`rounded-2xl relative overflow-hidden p-5 text-white shadow-xl`} style={{ background: feeDue > 0 ? 'linear-gradient(135deg,#e11d48,#f43f5e)' : 'linear-gradient(135deg,#0891b2,#22d3ee)' }}><div className="text-xs opacity-85">{feeDue > 0 ? 'Dues' : 'All clear'}</div><div className="text-3xl font-bold mt-1">₹<Counter value={feeDue} format={v => Math.round(v).toLocaleString('en-IN')} /></div></div>
        </div>

        <div className="rounded-2xl glass p-5">
          <div className="text-sm font-semibold mb-3 flex items-center gap-1.5"><BookOpen size={14} className="text-primary" /> Enrolled Classes</div>
          <div className="space-y-2">
            {data.enrollments.map(e => (
              <div key={e.id} className="rounded-xl bg-white/50 dark:bg-white/5 border p-3">
                <div className="flex items-center justify-between">
                  <div className="font-semibold text-sm">{e.program_name}</div>
                  <Badge className={e.status === 'active' ? 'bg-emerald-500' : 'bg-muted text-muted-foreground'}>{e.status}</Badge>
                </div>
                <div className="flex justify-between text-[11px] text-muted-foreground mt-1"><span>Sessions</span><span className="font-semibold">{e.sessions_attended} / {e.sessions_credited}</span></div>
                <Progress value={e.sessions_credited ? (e.sessions_attended / e.sessions_credited) * 100 : 0} className="h-1.5 mt-1" />
              </div>
            ))}
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <div className="rounded-2xl glass p-5">
            <div className="text-sm font-semibold mb-3">Recent Attendance</div>
            {data.attendance.slice(0, 10).map(a => (
              <div key={a.id} className="flex items-center justify-between p-1.5 text-xs">
                <span>{new Date(a.date).toLocaleDateString('en', { weekday: 'short', day: 'numeric', month: 'short' })}</span>
                <Badge className={a.status === 'present' ? 'bg-emerald-500' : a.status === 'late' ? 'bg-amber-500' : a.status === 'excused' ? 'bg-sky-500' : 'bg-rose-500'}>{a.status}</Badge>
              </div>
            ))}
          </div>
          <div className="rounded-2xl glass p-5">
            <div className="text-sm font-semibold mb-3">Fees</div>
            {data.fees.map(f => (
              <div key={f.id} className="flex items-center justify-between p-1.5 text-xs">
                <div><div className="font-medium">{f.fee_type}</div><div className="text-[10px] text-muted-foreground">Due {f.due_date}</div></div>
                <div className="text-right">
                  <div className="font-semibold">{fmtINR(f.amount)}</div>
                  <Badge className={f.status === 'paid' ? 'bg-emerald-500' : 'bg-rose-500'}>{f.status}</Badge>
                </div>
              </div>
            ))}
          </div>
        </div>

        <section className="rounded-2xl glass overflow-hidden">
          <div className="px-5 py-4 border-b flex items-center gap-2"><CalendarIcon size={16} className="text-primary" /><div><div className="font-semibold text-sm">Temple Events</div><div className="text-xs text-muted-foreground">Upcoming celebrations and activities</div></div></div>
          {events.length ? <div className="divide-y">{events.map(event => <article key={event.id} className="p-4"><div className="flex gap-4"><div className="w-16 shrink-0 rounded-xl bg-saffron-gradient text-white text-center grid place-items-center py-2"><div className="text-[10px] uppercase">{new Date(event.date + 'T00:00:00').toLocaleString('en', { month: 'short' })}</div><div className="text-2xl font-bold leading-none">{new Date(event.date + 'T00:00:00').getDate()}</div></div><div className="min-w-0"><div className="font-semibold">{event.name}</div><p className="mt-1 text-sm text-muted-foreground whitespace-pre-wrap">{event.description}</p></div></div>{event.image_url && <img src={event.image_url} alt="Event advertisement" className="mt-4 w-full max-h-[420px] rounded-xl border bg-muted/30 object-contain" />}</article>)}</div> : <div className="p-5 text-sm text-muted-foreground">No upcoming temple events at the moment.</div>}
        </section>

        <div className="text-center text-[11px] text-muted-foreground">
          Contact: {data.organization.contact_email} · {data.organization.contact_phone}
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   ROOT APP
============================================================ */
function App() {
  const [user, setUser] = useState(null);
  const [org, setOrg] = useState(null);
  const [ready, setReady] = useState(false);
  const [dark, setDark] = useState(false);
  const [publicToken, setPublicToken] = useState(null);

  const refreshMe = async () => {
    try { const me = await api('/auth/me'); setUser(me.user); setOrg(me.organization); } catch { store.token = null; setUser(null); }
  };
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const m = window.location.pathname.match(/^\/p\/([\w-]+)/);
    if (m) { setPublicToken(m[1]); setReady(true); return; }
    const t = store.token;
    if (t) refreshMe().finally(() => setReady(true));
    else setReady(true);
  }, []);
  useEffect(() => { if (typeof window === 'undefined') return; document.documentElement.classList.toggle('dark', dark); }, [dark]);
  const logout = () => { store.token = null; setUser(null); setOrg(null); };
  const onLoggedIn = async () => { await refreshMe(); };

  if (!ready) return <div className="min-h-screen bg-aurora grid place-items-center text-muted-foreground">Loading Gokulam360…</div>;
  if (publicToken) return <PublicParentView token={publicToken} />;
  if (!user) return <Login onLoggedIn={onLoggedIn} />;
  return <Shell user={user} org={org} onLogout={logout} dark={dark} setDark={setDark} refreshMe={refreshMe} />;
}

export default App;
