'use client';

import { useEffect, useState, useMemo, useRef } from 'react';
import { toast } from 'sonner';
import {
  BarChart3, Users, GraduationCap, IndianRupee, CalendarCheck2, Calendar as CalendarIcon,
  Building2, LogOut, Menu, Moon, Sun, Search, Plus, Edit3, Trash2, IdCard, Printer,
  UserCircle2, TrendingUp, ChevronRight, Sparkles, Flame, BookOpen, ClipboardCheck
} from 'lucide-react';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, Tooltip as RTooltip,
  ResponsiveContainer, CartesianGrid, Legend
} from 'recharts';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger
} from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';

const API = '/api';

/* ---------- helpers ---------- */
const store = {
  get token() { if (typeof window === 'undefined') return null; return localStorage.getItem('g360_token'); },
  set token(v) { if (typeof window === 'undefined') return; v ? localStorage.setItem('g360_token', v) : localStorage.removeItem('g360_token'); },
  get user() { if (typeof window === 'undefined') return null; const s = localStorage.getItem('g360_user'); return s ? JSON.parse(s) : null; },
  set user(v) { if (typeof window === 'undefined') return; v ? localStorage.setItem('g360_user', JSON.stringify(v)) : localStorage.removeItem('g360_user'); },
};

async function api(path, opts = {}) {
  const headers = { 'Content-Type': 'application/json', ...(opts.headers || {}) };
  const t = store.token;
  if (t) headers.Authorization = `Bearer ${t}`;
  const r = await fetch(`${API}${path}`, { ...opts, headers });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(data.error || 'Request failed');
  return data;
}

const fmtINR = (n) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n || 0);
const initials = (s = '') => s.split(' ').map(x => x[0]).join('').slice(0, 2).toUpperCase();

/* ---------- LOGIN ---------- */
function Login({ onLoggedIn }) {
  const [email, setEmail] = useState('admin@iskcongokulam.org');
  const [password, setPassword] = useState('password123');
  const [loading, setLoading] = useState(false);
  const [seeding, setSeeding] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { token, user } = await api('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) });
      store.token = token; store.user = user;
      toast.success(`Welcome, ${user.name}`);
      onLoggedIn(user);
    } catch (e) { toast.error(e.message); }
    finally { setLoading(false); }
  };

  const seed = async () => {
    setSeeding(true);
    try {
      const r = await fetch(`${API}/seed`, { method: 'POST' });
      const d = await r.json();
      toast.success('Demo data ready! Try any of the login options below.');
    } catch (e) { toast.error('Seed failed'); }
    finally { setSeeding(false); }
  };

  return (
    <div className="min-h-screen grid md:grid-cols-2">
      {/* Left: form */}
      <div className="flex items-center justify-center p-8">
        <div className="w-full max-w-md space-y-6">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-saffron-gradient grid place-items-center shadow-lg">
              <Flame className="text-white" size={22} />
            </div>
            <div>
              <div className="text-2xl font-bold tracking-tight">Gokulam<span className="text-primary">360</span></div>
              <div className="text-xs text-muted-foreground">Sunday School Management Platform</div>
            </div>
          </div>

          <div>
            <h1 className="text-3xl font-bold">Welcome back 🙏</h1>
            <p className="text-muted-foreground mt-1">Sign in to your organization dashboard.</p>
          </div>

          <form onSubmit={submit} className="space-y-4">
            <div className="space-y-1.5">
              <Label>Email</Label>
              <Input type="email" value={email} onChange={e => setEmail(e.target.value)} required />
            </div>
            <div className="space-y-1.5">
              <Label>Password</Label>
              <Input type="password" value={password} onChange={e => setPassword(e.target.value)} required />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Signing in…' : 'Sign in'}
            </Button>
          </form>

          <div className="rounded-lg border bg-card p-4 space-y-2">
            <div className="flex items-center justify-between">
              <div className="text-sm font-semibold flex items-center gap-2"><Sparkles size={14} className="text-primary" /> Demo credentials</div>
              <Button size="sm" variant="outline" onClick={seed} disabled={seeding}>
                {seeding ? 'Seeding…' : 'Reset demo data'}
              </Button>
            </div>
            <div className="text-xs text-muted-foreground space-y-1">
              <div className="flex justify-between"><span>Super Admin</span><code>super@gokulam360.com</code></div>
              <div className="flex justify-between"><span>Org Admin</span><code>admin@iskcongokulam.org</code></div>
              <div className="flex justify-between"><span>Teacher</span><code>teacher@iskcongokulam.org</code></div>
              <div className="pt-1">Password: <code>password123</code></div>
            </div>
          </div>
        </div>
      </div>

      {/* Right: hero */}
      <div className="hidden md:block relative overflow-hidden">
        <img
          src="https://images.unsplash.com/photo-1641730259879-ad98e7db7bcb"
          alt="Krishna"
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-br from-orange-900/70 via-amber-800/50 to-rose-900/70" />
        <div className="relative h-full flex flex-col justify-end p-10 text-white">
          <div className="max-w-md space-y-4">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur px-3 py-1 text-xs font-medium">
              <Flame size={12} /> Serving Krishna's children
            </div>
            <h2 className="text-4xl font-bold leading-tight text-shadow-warm">
              Manage students, attendance & fees — with devotion.
            </h2>
            <p className="text-white/85">
              Gokulam360 helps Hare Krishna Sunday Schools & spiritual programs run smoothly across every organization.
            </p>
            <div className="flex gap-3 pt-2">
              <div className="rounded-lg bg-white/10 backdrop-blur px-4 py-3">
                <div className="text-2xl font-bold">Multi-org</div>
                <div className="text-xs text-white/75">Tenant isolated</div>
              </div>
              <div className="rounded-lg bg-white/10 backdrop-blur px-4 py-3">
                <div className="text-2xl font-bold">Role-based</div>
                <div className="text-xs text-white/75">Admin / Teacher</div>
              </div>
              <div className="rounded-lg bg-white/10 backdrop-blur px-4 py-3">
                <div className="text-2xl font-bold">PDF</div>
                <div className="text-xs text-white/75">ID cards & reports</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------- SHELL ---------- */
function Shell({ user, org, onLogout, dark, setDark }) {
  const [view, setView] = useState('dashboard');
  const [q, setQ] = useState('');

  const nav = useMemo(() => {
    const items = [
      { key: 'dashboard', label: 'Dashboard', icon: BarChart3, roles: ['super_admin', 'org_admin', 'teacher'] },
      { key: 'organizations', label: 'Organizations', icon: Building2, roles: ['super_admin'] },
      { key: 'students', label: 'Students', icon: GraduationCap, roles: ['super_admin', 'org_admin', 'teacher'] },
      { key: 'teachers', label: 'Teachers', icon: Users, roles: ['super_admin', 'org_admin'] },
      { key: 'programs', label: 'Programs', icon: BookOpen, roles: ['super_admin', 'org_admin', 'teacher'] },
      { key: 'attendance', label: 'Attendance', icon: ClipboardCheck, roles: ['super_admin', 'org_admin', 'teacher'] },
      { key: 'fees', label: 'Fees', icon: IndianRupee, roles: ['super_admin', 'org_admin'] },
      { key: 'events', label: 'Events', icon: CalendarIcon, roles: ['super_admin', 'org_admin', 'teacher'] },
    ];
    return items.filter(i => i.roles.includes(user.role));
  }, [user.role]);

  return (
    <div className="min-h-screen flex bg-muted/30">
      {/* Sidebar */}
      <aside className="hidden md:flex w-64 shrink-0 flex-col bg-card border-r">
        <div className="p-5 flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-xl bg-saffron-gradient grid place-items-center shadow">
            <Flame className="text-white" size={20} />
          </div>
          <div>
            <div className="font-bold text-lg leading-none">Gokulam<span className="text-primary">360</span></div>
            <div className="text-[10px] text-muted-foreground uppercase tracking-wide mt-0.5">SaaS Platform</div>
          </div>
        </div>
        <Separator />
        <nav className="flex-1 p-3 space-y-1">
          {nav.map(item => {
            const Icon = item.icon;
            const active = view === item.key;
            return (
              <button
                key={item.key}
                onClick={() => setView(item.key)}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition ${
                  active ? 'bg-primary text-primary-foreground shadow-sm' : 'text-foreground/70 hover:bg-muted hover:text-foreground'
                }`}
              >
                <Icon size={17} />
                {item.label}
                {active && <ChevronRight className="ml-auto" size={14} />}
              </button>
            );
          })}
        </nav>
        <div className="p-3 border-t">
          <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/50">
            <Avatar className="h-9 w-9"><AvatarFallback className="bg-primary text-primary-foreground text-xs">{initials(user.name)}</AvatarFallback></Avatar>
            <div className="min-w-0 flex-1">
              <div className="text-sm font-medium truncate">{user.name}</div>
              <div className="text-xs text-muted-foreground truncate capitalize">{user.role.replace('_', ' ')}</div>
            </div>
            <Button size="icon" variant="ghost" onClick={onLogout} title="Logout"><LogOut size={16} /></Button>
          </div>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 min-w-0 flex flex-col">
        <header className="h-16 bg-card/80 backdrop-blur border-b px-4 md:px-6 flex items-center gap-3 sticky top-0 z-20">
          <div className="md:hidden">
            <select value={view} onChange={e => setView(e.target.value)} className="rounded-md border px-2 py-1 text-sm bg-background">
              {nav.map(n => <option key={n.key} value={n.key}>{n.label}</option>)}
            </select>
          </div>
          <div className="hidden md:block">
            <div className="text-xs text-muted-foreground">{org?.name || 'Platform'}</div>
            <div className="text-sm font-semibold capitalize">{view}</div>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <div className="relative hidden md:block">
              <Search className="absolute left-2.5 top-2.5 text-muted-foreground" size={15} />
              <Input value={q} onChange={e => setQ(e.target.value)} placeholder="Search students, teachers…" className="pl-8 w-72" />
            </div>
            <Button size="icon" variant="ghost" onClick={() => setDark(!dark)}>
              {dark ? <Sun size={16} /> : <Moon size={16} />}
            </Button>
          </div>
        </header>

        <main className="flex-1 p-4 md:p-6 overflow-x-hidden">
          {view === 'dashboard' && <Dashboard user={user} />}
          {view === 'organizations' && <Organizations />}
          {view === 'students' && <Students search={q} />}
          {view === 'teachers' && <Teachers />}
          {view === 'programs' && <Programs />}
          {view === 'attendance' && <Attendance />}
          {view === 'fees' && <Fees />}
          {view === 'events' && <Events />}
        </main>
      </div>
    </div>
  );
}

/* ---------- DASHBOARD ---------- */
function Dashboard({ user }) {
  const [stats, setStats] = useState(null);
  useEffect(() => { api('/dashboard').then(setStats).catch(e => toast.error(e.message)); }, []);

  if (!stats) return <div className="text-muted-foreground">Loading dashboard…</div>;

  const kpis = [
    { label: 'Total Students', value: stats.totalStudents, icon: GraduationCap, tone: 'from-orange-500 to-amber-500' },
    { label: 'Active Students', value: stats.activeStudents, icon: TrendingUp, tone: 'from-emerald-500 to-teal-500' },
    { label: 'New Admissions', value: stats.newAdmissions, icon: Sparkles, tone: 'from-fuchsia-500 to-pink-500' },
    { label: 'Attendance', value: `${stats.attendancePct}%`, icon: CalendarCheck2, tone: 'from-sky-500 to-blue-500' },
    { label: 'Pending Fees', value: fmtINR(stats.pendingFees), icon: IndianRupee, tone: 'from-rose-500 to-red-500' },
    { label: 'Teachers', value: stats.totalTeachers, icon: Users, tone: 'from-violet-500 to-purple-500' },
  ];

  const pieColors = ['hsl(24 95% 53%)', 'hsl(0 72% 51%)'];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Namaste, {user.name.split(' ')[0]} 🙏</h1>
        <p className="text-muted-foreground">Here's what's happening in your organization today.</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {kpis.map(k => {
          const Icon = k.icon;
          return (
            <Card key={k.label} className="overflow-hidden">
              <CardContent className="p-4">
                <div className={`w-9 h-9 rounded-lg bg-gradient-to-br ${k.tone} grid place-items-center mb-3`}>
                  <Icon className="text-white" size={17} />
                </div>
                <div className="text-2xl font-bold leading-none">{k.value}</div>
                <div className="text-xs text-muted-foreground mt-1">{k.label}</div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        <Card className="md:col-span-2">
          <CardHeader><CardTitle className="text-base">Monthly Admissions</CardTitle></CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer>
              <BarChart data={stats.monthlyAdmissions}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="month" fontSize={12} />
                <YAxis fontSize={12} allowDecimals={false} />
                <RTooltip />
                <Bar dataKey="count" fill="hsl(24 95% 53%)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Fee Collections</CardTitle></CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer>
              <PieChart>
                <Pie data={stats.feeSplit} dataKey="value" nameKey="name" innerRadius={40} outerRadius={80} paddingAngle={4}>
                  {stats.feeSplit.map((_, i) => <Cell key={i} fill={pieColors[i % pieColors.length]} />)}
                </Pie>
                <Legend />
                <RTooltip formatter={v => fmtINR(v)} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        <Card className="md:col-span-2">
          <CardHeader><CardTitle className="text-base">Attendance Trend</CardTitle></CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer>
              <LineChart data={stats.attendanceTrend}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="date" fontSize={11} />
                <YAxis fontSize={12} allowDecimals={false} />
                <RTooltip />
                <Legend />
                <Line type="monotone" dataKey="present" stroke="hsl(24 95% 53%)" strokeWidth={2.5} dot={{ r: 3 }} />
                <Line type="monotone" dataKey="absent" stroke="hsl(0 72% 51%)" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Upcoming Events</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {stats.upcomingEvents?.length === 0 && <div className="text-sm text-muted-foreground">No upcoming events</div>}
            {stats.upcomingEvents?.map(ev => (
              <div key={ev.id} className="flex gap-3 p-2 rounded-lg hover:bg-muted/50">
                <div className="w-11 h-11 rounded-lg bg-gradient-to-br from-orange-100 to-amber-100 dark:from-orange-900/40 dark:to-amber-900/40 grid place-items-center text-primary">
                  <CalendarIcon size={18} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{ev.name}</div>
                  <div className="text-xs text-muted-foreground">{ev.date}</div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

/* ---------- ORGANIZATIONS (super admin) ---------- */
function Organizations() {
  const [items, setItems] = useState([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: '', address: '', contact_email: '', contact_phone: '', currency: 'INR', admin_name: '', admin_email: '', admin_password: '' });
  const load = () => api('/organizations').then(r => setItems(r.items));
  useEffect(() => { load(); }, []);

  const save = async () => {
    try {
      await api('/organizations', { method: 'POST', body: JSON.stringify(form) });
      toast.success('Organization created');
      setOpen(false); load();
      setForm({ name: '', address: '', contact_email: '', contact_phone: '', currency: 'INR', admin_name: '', admin_email: '', admin_password: '' });
    } catch (e) { toast.error(e.message); }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Organizations</h1>
          <p className="text-sm text-muted-foreground">Manage every tenant on Gokulam360.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button><Plus size={16} className="mr-1.5" /> New Organization</Button></DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>Create Organization</DialogTitle><DialogDescription>Also creates its first Org Admin.</DialogDescription></DialogHeader>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2"><Label>Name</Label><Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></div>
              <div className="col-span-2"><Label>Address</Label><Input value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} /></div>
              <div><Label>Contact Email</Label><Input value={form.contact_email} onChange={e => setForm({ ...form, contact_email: e.target.value })} /></div>
              <div><Label>Contact Phone</Label><Input value={form.contact_phone} onChange={e => setForm({ ...form, contact_phone: e.target.value })} /></div>
              <div className="col-span-2 mt-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Admin account</div>
              <div><Label>Admin Name</Label><Input value={form.admin_name} onChange={e => setForm({ ...form, admin_name: e.target.value })} /></div>
              <div><Label>Admin Email</Label><Input value={form.admin_email} onChange={e => setForm({ ...form, admin_email: e.target.value })} /></div>
              <div className="col-span-2"><Label>Admin Password</Label><Input type="password" value={form.admin_password} onChange={e => setForm({ ...form, admin_password: e.target.value })} /></div>
            </div>
            <DialogFooter><Button onClick={save}>Create</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow><TableHead>Name</TableHead><TableHead>Email</TableHead><TableHead>Phone</TableHead><TableHead>Currency</TableHead><TableHead>Created</TableHead></TableRow>
          </TableHeader>
          <TableBody>
            {items.map(o => (
              <TableRow key={o.id}>
                <TableCell className="font-medium">{o.name}</TableCell>
                <TableCell>{o.contact_email}</TableCell>
                <TableCell>{o.contact_phone}</TableCell>
                <TableCell><Badge variant="secondary">{o.currency}</Badge></TableCell>
                <TableCell>{new Date(o.created_at).toLocaleDateString()}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}

/* ---------- STUDENTS ---------- */
function Students({ search }) {
  const [items, setItems] = useState([]);
  const [programs, setPrograms] = useState([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [cardOf, setCardOf] = useState(null);
  const [org, setOrg] = useState(null);
  const empty = { first_name: '', last_name: '', dob: '', gender: 'Male', address: '', mobile: '', email: '', father_name: '', mother_name: '', emergency_contact: '', initiated_name: '', counsellor: '', temple: '', program_id: '', status: 'active', student_id: '' };
  const [form, setForm] = useState(empty);

  const load = () => api('/students').then(r => setItems(r.items));
  useEffect(() => { load(); api('/programs').then(r => setPrograms(r.items)); api('/auth/me').then(r => setOrg(r.organization)); }, []);

  const filtered = useMemo(() => {
    const q = (search || '').toLowerCase();
    if (!q) return items;
    return items.filter(s => (s.first_name + ' ' + s.last_name + ' ' + s.student_id + ' ' + (s.email || '')).toLowerCase().includes(q));
  }, [items, search]);

  const openEdit = (s) => { setEditing(s); setForm({ ...empty, ...s }); setOpen(true); };
  const openNew = () => { setEditing(null); setForm({ ...empty, student_id: 'GK-2025-' + String(Math.floor(1000 + Math.random() * 9000)) }); setOpen(true); };
  const save = async () => {
    try {
      if (editing) await api(`/students/${editing.id}`, { method: 'PUT', body: JSON.stringify(form) });
      else await api('/students', { method: 'POST', body: JSON.stringify(form) });
      toast.success(editing ? 'Student updated' : 'Student added');
      setOpen(false); load();
    } catch (e) { toast.error(e.message); }
  };
  const del = async (s) => {
    if (!confirm(`Remove ${s.first_name}?`)) return;
    await api(`/students/${s.id}`, { method: 'DELETE' });
    toast.success('Removed'); load();
  };

  const printCard = async () => {
    const { jsPDF } = await import('jspdf');
    const doc = new jsPDF({ unit: 'mm', format: [54, 86], orientation: 'portrait' });
    // Header
    doc.setFillColor(234, 88, 12);
    doc.rect(0, 0, 54, 16, 'F');
    doc.setTextColor(255); doc.setFont('helvetica', 'bold'); doc.setFontSize(9);
    doc.text('GOKULAM360', 27, 6, { align: 'center' });
    doc.setFontSize(6.5); doc.setFont('helvetica', 'normal');
    doc.text((org?.name || 'Organization').slice(0, 40), 27, 10.5, { align: 'center' });
    doc.text('STUDENT ID CARD', 27, 14, { align: 'center' });

    // Photo box
    doc.setDrawColor(234, 88, 12); doc.setLineWidth(0.4);
    doc.roundedRect(19, 20, 16, 20, 1, 1);
    doc.setFontSize(6); doc.setTextColor(150);
    doc.text('PHOTO', 27, 30.5, { align: 'center' });

    // Fields
    doc.setTextColor(30); doc.setFontSize(7);
    let y = 45;
    const line = (label, value) => {
      doc.setFont('helvetica', 'bold'); doc.text(label, 4, y);
      doc.setFont('helvetica', 'normal'); doc.text(String(value || '-'), 4, y + 3);
      y += 7.5;
    };
    line('NAME', `${cardOf.first_name} ${cardOf.last_name}`);
    line('STUDENT ID', cardOf.student_id);
    line('PROGRAM', programs.find(p => p.id === cardOf.program_id)?.name || '-');
    line('DOB', cardOf.dob);
    line('EMERGENCY', cardOf.emergency_contact);

    // Footer band
    doc.setFillColor(253, 186, 116);
    doc.rect(0, 80, 54, 6, 'F');
    doc.setTextColor(120, 45, 5); doc.setFontSize(6);
    doc.text('Hare Krishna \u2022 Serve with devotion', 27, 84, { align: 'center' });

    doc.save(`idcard-${cardOf.student_id}.pdf`);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">Students</h1>
          <p className="text-sm text-muted-foreground">{filtered.length} of {items.length} students</p>
        </div>
        <Button onClick={openNew}><Plus size={16} className="mr-1.5" /> Add Student</Button>
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Student</TableHead><TableHead>ID</TableHead><TableHead>Program</TableHead>
              <TableHead>Contact</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map(s => (
              <TableRow key={s.id}>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Avatar className="h-8 w-8"><AvatarFallback className="bg-gradient-to-br from-orange-400 to-amber-400 text-white text-xs">{initials(s.first_name + ' ' + s.last_name)}</AvatarFallback></Avatar>
                    <div>
                      <div className="font-medium">{s.first_name} {s.last_name}</div>
                      <div className="text-xs text-muted-foreground">{s.initiated_name || s.gender}</div>
                    </div>
                  </div>
                </TableCell>
                <TableCell><code className="text-xs">{s.student_id}</code></TableCell>
                <TableCell className="text-sm">{programs.find(p => p.id === s.program_id)?.name || '-'}</TableCell>
                <TableCell className="text-sm">{s.mobile}</TableCell>
                <TableCell><Badge variant={s.status === 'active' ? 'default' : 'secondary'} className={s.status === 'active' ? 'bg-emerald-500 hover:bg-emerald-500' : ''}>{s.status}</Badge></TableCell>
                <TableCell className="text-right">
                  <Button size="icon" variant="ghost" onClick={() => setCardOf(s)} title="ID Card"><IdCard size={15} /></Button>
                  <Button size="icon" variant="ghost" onClick={() => openEdit(s)} title="Edit"><Edit3 size={15} /></Button>
                  <Button size="icon" variant="ghost" onClick={() => del(s)} title="Remove"><Trash2 size={15} /></Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      {/* Add/Edit dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing ? 'Edit Student' : 'New Student'}</DialogTitle></DialogHeader>
          <Tabs defaultValue="personal">
            <TabsList>
              <TabsTrigger value="personal">Personal</TabsTrigger>
              <TabsTrigger value="family">Family</TabsTrigger>
              <TabsTrigger value="spiritual">Spiritual</TabsTrigger>
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
              <div className="col-span-2"><Label>Program</Label>
                <Select value={form.program_id} onValueChange={v => setForm({ ...form, program_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Select program" /></SelectTrigger>
                  <SelectContent>{programs.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </TabsContent>
            <TabsContent value="family" className="grid grid-cols-2 gap-3 mt-2">
              <div><Label>Father Name</Label><Input value={form.father_name} onChange={e => setForm({ ...form, father_name: e.target.value })} /></div>
              <div><Label>Mother Name</Label><Input value={form.mother_name} onChange={e => setForm({ ...form, mother_name: e.target.value })} /></div>
              <div><Label>Guardian</Label><Input value={form.guardian} onChange={e => setForm({ ...form, guardian: e.target.value })} /></div>
              <div><Label>Emergency Contact</Label><Input value={form.emergency_contact} onChange={e => setForm({ ...form, emergency_contact: e.target.value })} /></div>
            </TabsContent>
            <TabsContent value="spiritual" className="grid grid-cols-2 gap-3 mt-2">
              <div><Label>Initiated Name</Label><Input value={form.initiated_name} onChange={e => setForm({ ...form, initiated_name: e.target.value })} /></div>
              <div><Label>Counsellor</Label><Input value={form.counsellor} onChange={e => setForm({ ...form, counsellor: e.target.value })} /></div>
              <div className="col-span-2"><Label>Temple Association</Label><Input value={form.temple} onChange={e => setForm({ ...form, temple: e.target.value })} /></div>
            </TabsContent>
          </Tabs>
          <DialogFooter><Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button><Button onClick={save}>{editing ? 'Update' : 'Create'}</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ID Card preview */}
      <Dialog open={!!cardOf} onOpenChange={v => !v && setCardOf(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Student ID Card</DialogTitle></DialogHeader>
          {cardOf && (
            <div className="flex flex-col items-center gap-4">
              <div className="w-64 rounded-xl overflow-hidden border-2 border-primary shadow-xl bg-card">
                <div className="bg-saffron-gradient p-3 text-white text-center">
                  <div className="text-xs font-bold tracking-widest">GOKULAM360</div>
                  <div className="text-[10px] opacity-90 mt-0.5">{org?.name}</div>
                  <div className="text-[9px] font-semibold mt-1 tracking-wider">STUDENT ID CARD</div>
                </div>
                <div className="p-4">
                  <div className="w-20 h-24 mx-auto rounded-md border-2 border-primary bg-muted grid place-items-center mb-3">
                    <UserCircle2 className="text-muted-foreground" size={40} />
                  </div>
                  <div className="space-y-1.5 text-xs">
                    <div><span className="font-bold">NAME</span><br />{cardOf.first_name} {cardOf.last_name}</div>
                    <div><span className="font-bold">ID</span><br />{cardOf.student_id}</div>
                    <div><span className="font-bold">PROGRAM</span><br />{programs.find(p => p.id === cardOf.program_id)?.name || '-'}</div>
                    <div><span className="font-bold">EMERGENCY</span><br />{cardOf.emergency_contact}</div>
                  </div>
                </div>
                <div className="bg-amber-200 text-amber-900 text-[10px] text-center py-1.5 font-semibold tracking-wide">
                  Hare Krishna • Serve with devotion
                </div>
              </div>
              <Button onClick={printCard}><Printer size={15} className="mr-1.5" /> Download PDF</Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ---------- TEACHERS ---------- */
function Teachers() {
  const [items, setItems] = useState([]);
  const [open, setOpen] = useState(false);
  const empty = { employee_id: '', name: '', email: '', mobile: '', address: '', qualification: '', skills: '' };
  const [form, setForm] = useState(empty);
  const [editing, setEditing] = useState(null);
  const load = () => api('/teachers').then(r => setItems(r.items));
  useEffect(() => { load(); }, []);
  const save = async () => {
    try {
      if (editing) await api(`/teachers/${editing.id}`, { method: 'PUT', body: JSON.stringify(form) });
      else await api('/teachers', { method: 'POST', body: JSON.stringify(form) });
      toast.success('Saved'); setOpen(false); load();
    } catch (e) { toast.error(e.message); }
  };
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div><h1 className="text-2xl font-bold">Teachers</h1><p className="text-sm text-muted-foreground">{items.length} teachers</p></div>
        <Button onClick={() => { setEditing(null); setForm({ ...empty, employee_id: 'T-' + String(Math.floor(100 + Math.random() * 900)) }); setOpen(true); }}><Plus size={16} className="mr-1.5" /> Add Teacher</Button>
      </div>
      <Card>
        <Table>
          <TableHeader><TableRow><TableHead>Emp ID</TableHead><TableHead>Name</TableHead><TableHead>Email</TableHead><TableHead>Mobile</TableHead><TableHead>Qualification</TableHead><TableHead></TableHead></TableRow></TableHeader>
          <TableBody>
            {items.map(t => (
              <TableRow key={t.id}>
                <TableCell><code className="text-xs">{t.employee_id}</code></TableCell>
                <TableCell className="font-medium">{t.name}</TableCell>
                <TableCell>{t.email}</TableCell>
                <TableCell>{t.mobile}</TableCell>
                <TableCell>{t.qualification}</TableCell>
                <TableCell className="text-right">
                  <Button size="icon" variant="ghost" onClick={() => { setEditing(t); setForm({ ...empty, ...t }); setOpen(true); }}><Edit3 size={15} /></Button>
                  <Button size="icon" variant="ghost" onClick={async () => { await api(`/teachers/${t.id}`, { method: 'DELETE' }); load(); }}><Trash2 size={15} /></Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

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
          <DialogFooter><Button onClick={save}>Save</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ---------- PROGRAMS ---------- */
function Programs() {
  const [items, setItems] = useState([]);
  useEffect(() => { api('/programs').then(r => setItems(r.items)); }, []);
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Programs</h1>
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {items.map(p => (
          <Card key={p.id} className="hover:shadow-lg transition">
            <CardHeader>
              <div className="w-10 h-10 rounded-lg bg-saffron-gradient grid place-items-center mb-2"><BookOpen className="text-white" size={18} /></div>
              <CardTitle className="text-lg">{p.name}</CardTitle>
              <CardDescription>{p.description}</CardDescription>
            </CardHeader>
            <CardContent className="text-sm space-y-1">
              <div className="flex justify-between"><span className="text-muted-foreground">Age Group</span><span className="font-medium">{p.age_group}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Duration</span><span className="font-medium">{p.duration_months} months</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Capacity</span><span className="font-medium">{p.capacity}</span></div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

/* ---------- ATTENDANCE ---------- */
function Attendance() {
  const [students, setStudents] = useState([]);
  const [programs, setPrograms] = useState([]);
  const [program, setProgram] = useState('');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [marks, setMarks] = useState({});

  useEffect(() => { api('/students').then(r => setStudents(r.items)); api('/programs').then(r => setPrograms(r.items)); }, []);

  const list = students.filter(s => !program || s.program_id === program);
  const setMark = (id, v) => setMarks({ ...marks, [id]: v });
  const bulk = (v) => { const m = {}; list.forEach(s => m[s.id] = v); setMarks(m); };

  const save = async () => {
    try {
      const records = list.map(s => ({ student_id: s.id, status: marks[s.id] || 'present' }));
      await api('/attendance-bulk', { method: 'POST', body: JSON.stringify({ date, program_id: program, records }) });
      toast.success('Attendance saved');
    } catch (e) { toast.error(e.message); }
  };

  const badgeCls = (v) => ({
    present: 'bg-emerald-500 hover:bg-emerald-600',
    absent: 'bg-rose-500 hover:bg-rose-600',
    late: 'bg-amber-500 hover:bg-amber-600',
    excused: 'bg-sky-500 hover:bg-sky-600',
  })[v] || 'bg-muted';

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Attendance</h1>
      <Card>
        <CardContent className="p-4 flex flex-wrap gap-3 items-end">
          <div><Label>Date</Label><Input type="date" value={date} onChange={e => setDate(e.target.value)} /></div>
          <div className="min-w-[220px]"><Label>Program</Label>
            <Select value={program} onValueChange={setProgram}>
              <SelectTrigger><SelectValue placeholder="All programs" /></SelectTrigger>
              <SelectContent>{programs.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="ml-auto flex gap-2 flex-wrap">
            <Button size="sm" variant="outline" onClick={() => bulk('present')}>Mark all Present</Button>
            <Button size="sm" variant="outline" onClick={() => bulk('absent')}>Mark all Absent</Button>
            <Button onClick={save}>Save Attendance</Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <Table>
          <TableHeader><TableRow><TableHead>Student</TableHead><TableHead>ID</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
          <TableBody>
            {list.map(s => (
              <TableRow key={s.id}>
                <TableCell className="font-medium">{s.first_name} {s.last_name}</TableCell>
                <TableCell><code className="text-xs">{s.student_id}</code></TableCell>
                <TableCell>
                  <div className="flex gap-1.5 flex-wrap">
                    {['present', 'absent', 'late', 'excused'].map(v => (
                      <button key={v} onClick={() => setMark(s.id, v)}
                        className={`text-xs px-2.5 py-1 rounded-full capitalize font-medium transition ${
                          marks[s.id] === v ? `text-white ${badgeCls(v)}` : 'bg-muted text-muted-foreground hover:bg-muted/70'
                        }`}>{v}</button>
                    ))}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}

/* ---------- FEES ---------- */
function Fees() {
  const [items, setItems] = useState([]);
  const [students, setStudents] = useState([]);
  useEffect(() => { api('/fees').then(r => setItems(r.items)); api('/students').then(r => setStudents(r.items)); }, []);
  const sMap = Object.fromEntries(students.map(s => [s.id, s]));
  const pending = items.filter(f => f.status === 'pending');
  const paid = items.filter(f => f.status === 'paid');
  const totalPending = pending.reduce((a, f) => a + (f.amount - (f.paid_amount || 0)), 0);
  const totalPaid = paid.reduce((a, f) => a + (f.paid_amount || 0), 0);

  const markPaid = async (f) => {
    await api(`/fees/${f.id}`, { method: 'PUT', body: JSON.stringify({ status: 'paid', paid_amount: f.amount, paid_at: new Date().toISOString() }) });
    api('/fees').then(r => setItems(r.items));
    toast.success('Marked as paid');
  };

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Fees</h1>
      <div className="grid grid-cols-3 gap-3">
        <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">Total Collected</div><div className="text-2xl font-bold text-emerald-600">{fmtINR(totalPaid)}</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">Pending</div><div className="text-2xl font-bold text-rose-600">{fmtINR(totalPending)}</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">Records</div><div className="text-2xl font-bold">{items.length}</div></CardContent></Card>
      </div>
      <Card>
        <Table>
          <TableHeader><TableRow><TableHead>Student</TableHead><TableHead>Type</TableHead><TableHead>Amount</TableHead><TableHead>Paid</TableHead><TableHead>Status</TableHead><TableHead>Due</TableHead><TableHead></TableHead></TableRow></TableHeader>
          <TableBody>
            {items.map(f => {
              const s = sMap[f.student_id];
              return (
                <TableRow key={f.id}>
                  <TableCell className="font-medium">{s ? `${s.first_name} ${s.last_name}` : '-'}</TableCell>
                  <TableCell>{f.fee_type}</TableCell>
                  <TableCell>{fmtINR(f.amount)}</TableCell>
                  <TableCell>{fmtINR(f.paid_amount)}</TableCell>
                  <TableCell><Badge className={f.status === 'paid' ? 'bg-emerald-500 hover:bg-emerald-600' : 'bg-rose-500 hover:bg-rose-600'}>{f.status}</Badge></TableCell>
                  <TableCell>{f.due_date}</TableCell>
                  <TableCell className="text-right">
                    {f.status !== 'paid' && <Button size="sm" onClick={() => markPaid(f)}>Mark Paid</Button>}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}

/* ---------- EVENTS ---------- */
function Events() {
  const [items, setItems] = useState([]);
  useEffect(() => { api('/events').then(r => setItems(r.items)); }, []);
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Events</h1>
      <div className="grid md:grid-cols-3 gap-4">
        {items.map(e => (
          <Card key={e.id} className="overflow-hidden">
            <div className="bg-saffron-gradient h-24 flex items-end p-4">
              <CalendarIcon className="text-white/90" size={26} />
            </div>
            <CardContent className="p-4">
              <div className="font-bold">{e.name}</div>
              <div className="text-xs text-muted-foreground mt-0.5">{e.date}</div>
              <p className="text-sm mt-2">{e.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

/* ---------- ROOT ---------- */
function App() {
  const [user, setUser] = useState(null);
  const [org, setOrg] = useState(null);
  const [ready, setReady] = useState(false);
  const [dark, setDark] = useState(false);

  useEffect(() => {
    const t = store.token;
    if (t) {
      api('/auth/me').then(r => { setUser(r.user); setOrg(r.organization); }).catch(() => { store.token = null; }).finally(() => setReady(true));
    } else setReady(true);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    document.documentElement.classList.toggle('dark', dark);
  }, [dark]);

  const logout = () => { store.token = null; store.user = null; setUser(null); setOrg(null); };
  const onLoggedIn = async (u) => {
    setUser(u);
    try { const me = await api('/auth/me'); setOrg(me.organization); } catch {}
  };

  if (!ready) return <div className="min-h-screen grid place-items-center text-muted-foreground">Loading…</div>;
  if (!user) return <Login onLoggedIn={onLoggedIn} />;
  return <Shell user={user} org={org} onLogout={logout} dark={dark} setDark={setDark} />;
}

export default App;
