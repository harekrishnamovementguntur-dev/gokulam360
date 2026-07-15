Exit code: 0
Wall time: 0.9 seconds
Total output lines: 2876
Output:
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
      toast.success(`Welcome back, ${user.name.split(' ')[0]} ðŸ™`);
      onLoggedIn(user);
    } catch (e) { toast.error(e.message); } finally { setLoading(false); }
  };
  const seed = async () => {
    setSeeding(true);
    try { await fetch(`${API}/seed`, { method: 'POST' }); toast.success('Demo data ready âœ¨'); }
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
                <div className="text-xs text-muted-foreground">Sunday School â€¢ Multi-tenant SaaS</div>
              </div>
            </div>

            <div className="mb-6">
              <h1 className="text-3xl font-bold tracking-tight">Welcome back ðŸ™</h1>
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
                {loading ? 'Signing inâ€¦' : <>Sign in <ArrowUpRight size={16} className="ml-1" /></>}
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
                <p className="text-white/85 text-sm mt-3">A premium platform for Hare Krishna Gokulam Schools â€” students, teachers, attendance, fees, ID cards & more.</p>
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
              <div className="text-[10px] text-emerald-600">â–² 12% this month</div>
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
              <Search size={14} /> <span>Searchâ€¦</span>
              <kbd className="ml-6 text-[10px] px-1.5 py-0.5 rounded bg-muted border font-mono">âŒ˜K</kbd>
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
      <C…33655 tokens truncated…">Student ID: <span className="font-mono">{s.student_id}</span></div>
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
            <div className="text-3xl font-bold mt-1">â‚¹<Counter value={feePaid} format={v => Math.round(v).toLocaleString('en-IN')} /></div>
          </div>
          <div className={`rounded-2xl relative overflow-hidden p-5 text-white shadow-xl`} style={{ background: feeDue > 0 ? 'linear-gradient(135deg,#e11d48,#f43f5e)' : 'linear-gradient(135deg,#0891b2,#22d3ee)' }}>
            <div className="text-xs opacity-85">{feeDue > 0 ? 'Pending Dues' : 'All Clear'}</div>
            <div className="text-3xl font-bold mt-1">â‚¹<Counter value={feeDue} format={v => Math.round(v).toLocaleString('en-IN')} /></div>
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
      toast.success('Backup downloaded successfully ðŸ’¾');
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
      toast.success(`Restored: ${Object.entries(res.restored).map(([k, v]) => `${v} ${k}`).join(' â€¢ ')}`);
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
              <Download size={15} className="mr-1.5" /> {exporting ? 'Preparingâ€¦' : 'Export as JSON'}
            </Button>
            {lastBackup && (
              <div className="text-[11px] opacity-80 mt-3">
                Last export: {timeAgo(lastBackup.at)} â€¢ {Object.entries(lastBackup.counts).map(([k, v]) => `${v} ${k}`).join(', ')}
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
            <div className="flex items-center gap-2 text-amber-600"><span className="w-1 h-1 rounded-full bg-amber-500" /> Destructive â€” take a fresh export first</div>
            <div className="flex items-center gap-2 text-muted-foreground"><Check size={12} /> Idempotent â€” same file = same result</div>
            <div className="flex items-center gap-2 text-muted-foreground"><Check size={12} /> Data stays scoped to your org</div>
          </div>
          <input ref={fileRef} type="file" accept=".json" hidden onChange={onRestoreFile} />
          <Button variant="outline" className="mt-5 border-rose-300 text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-900/20" onClick={() => fileRef.current?.click()} disabled={restoring}>
            <Upload size={15} className="mr-1.5" /> {restoring ? 'Restoringâ€¦' : 'Upload backup file'}
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
        <div className="w-16 h-16 mx-auto rounded-2xl bg-rose-500/20 grid place-items-center text-rose-600 mb-4"><span className="text-3xl">ðŸ˜”</span></div>
        <div className="font-bold text-lg">Link not found</div>
        <div className="text-sm text-muted-foreground mt-1">This parent link is invalid or has expired.</div>
      </div>
    </div>
  );
  if (!data) return <div className="min-h-screen bg-aurora grid place-items-center text-muted-foreground">Loadingâ€¦</div>;

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
              <div className="text-xs text-indigo-900/70">Namaste ðŸ™</div>
              <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-indigo-950">{s.first_name} {s.last_name}</h1>
              <div className="text-sm text-indigo-900/70 mt-1 font-mono">{s.student_id}</div>
            </div>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-4">
          <div className="rounded-2xl glass p-5"><div className="text-xs text-muted-foreground">Attendance</div><div className="text-3xl font-bold mt-1"><Counter value={attPct} />%</div><Progress value={attPct} className="h-1.5 mt-2" /></div>
          <div className="rounded-2xl relative overflow-hidden p-5 text-white shadow-xl" style={{ background: 'linear-gradient(135deg,#059669,#10b981)' }}><div className="text-xs opacity-85">Paid</div><div className="text-3xl font-bold mt-1">â‚¹<Counter value={feePaid} format={v => Math.round(v).toLocaleString('en-IN')} /></div></div>
          <div className={`rounded-2xl relative overflow-hidden p-5 text-white shadow-xl`} style={{ background: feeDue > 0 ? 'linear-gradient(135deg,#e11d48,#f43f5e)' : 'linear-gradient(135deg,#0891b2,#22d3ee)' }}><div className="text-xs opacity-85">{feeDue > 0 ? 'Dues' : 'All clear'}</div><div className="text-3xl font-bold mt-1">â‚¹<Counter value={feeDue} format={v => Math.round(v).toLocaleString('en-IN')} /></div></div>
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
          {events.length ? <div className="divide-y">{events.map(event => <article key={event.id} className="p-4 flex gap-4"><div className="w-16 shrink-0 rounded-xl bg-saffron-gradient text-white text-center grid place-items-center py-2"><div className="text-[10px] uppercase">{new Date(event.date + 'T00:00:00').toLocaleString('en', { month: 'short' })}</div><div className="text-2xl font-bold leading-none">{new Date(event.date + 'T00:00:00').getDate()}</div></div>{event.image_url && <img src={event.image_url} alt="" className="h-20 w-28 rounded-xl object-cover border" />}<div className="min-w-0"><div className="font-semibold">{event.name}</div><p className="mt-1 text-sm text-muted-foreground whitespace-pre-wrap">{event.description}</p></div></article>)}</div> : <div className="p-5 text-sm text-muted-foreground">No upcoming temple events at the moment.</div>}
        </section>

        <div className="text-center text-[11px] text-muted-foreground">
          Contact: {data.organization.contact_email} Â· {data.organization.contact_phone}
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

  if (!ready) return <div className="min-h-screen bg-aurora grid place-items-center text-muted-foreground">Loading Gokulam360â€¦</div>;
  if (publicToken) return <PublicParentView token={publicToken} />;
  if (!user) return <Login onLoggedIn={onLoggedIn} />;
  return <Shell user={user} org={org} onLogout={logout} dark={dark} setDark={setDark} refreshMe={refreshMe} />;
}

export default App;

