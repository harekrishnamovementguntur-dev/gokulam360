'use client';
import { useEffect, useState, use } from 'react';
import { motion } from 'framer-motion';
import { Flame, BookOpen, Calendar } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';

const fmtINR = (n) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n || 0);
const initials = (s = '') => s.split(' ').filter(Boolean).map(x => x[0]).join('').slice(0, 2).toUpperCase();

function PublicPage({ params }) {
  const { token } = use(params);
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
        <div className="text-3xl mb-3">😔</div>
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
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="blob w-96 h-96 bg-violet-400/40" style={{ top: '-8%', left: '-8%' }} />
        <div className="blob w-[500px] h-[500px] bg-blue-400/30" style={{ top: '30%', right: '-10%', animationDelay: '4s' }} />
      </div>
      <div className="relative max-w-3xl mx-auto p-4 md:p-8 space-y-5">
        <div className="rounded-2xl glass px-4 h-14 flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-saffron-gradient grid place-items-center text-white shadow"><Flame size={16} /></div>
          <div className="font-bold">Gokulam<span className="text-gradient">360</span> <span className="text-xs font-normal text-muted-foreground ml-1">Parent View</span></div>
          <div className="ml-auto text-[10px] text-muted-foreground">{data.organization.name}</div>
        </div>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
          className="relative overflow-hidden rounded-3xl p-6 md:p-8 bg-mesh-warm border">
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
        </motion.div>

        <div className="grid md:grid-cols-3 gap-4">
          <div className="rounded-2xl glass p-5"><div className="text-xs text-muted-foreground">Attendance</div><div className="text-3xl font-bold mt-1">{attPct}%</div><Progress value={attPct} className="h-1.5 mt-2" /></div>
          <div className="rounded-2xl relative overflow-hidden p-5 text-white shadow-xl" style={{ background: 'linear-gradient(135deg,#059669,#10b981)' }}><div className="text-xs opacity-85">Paid</div><div className="text-3xl font-bold mt-1">{fmtINR(feePaid)}</div></div>
          <div className={`rounded-2xl relative overflow-hidden p-5 text-white shadow-xl`} style={{ background: feeDue > 0 ? 'linear-gradient(135deg,#e11d48,#f43f5e)' : 'linear-gradient(135deg,#0891b2,#22d3ee)' }}><div className="text-xs opacity-85">{feeDue > 0 ? 'Dues' : 'All clear'}</div><div className="text-3xl font-bold mt-1">{fmtINR(feeDue)}</div></div>
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
            {data.attendance.length === 0 && <div className="text-xs text-muted-foreground italic">No records yet</div>}
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
            {data.fees.length === 0 && <div className="text-xs text-muted-foreground italic">No fees on record</div>}
          </div>
        </div>

        <section className="rounded-2xl glass overflow-hidden">
          <div className="px-5 py-4 border-b flex items-center gap-2"><Calendar size={16} className="text-primary" /><div><div className="font-semibold text-sm">Temple Events</div><div className="text-xs text-muted-foreground">Upcoming celebrations and activities</div></div></div>
          {events.length ? <div className="divide-y">{events.map(event => <article key={event.id} className="p-4 flex gap-4"><div className="w-16 shrink-0 rounded-xl bg-saffron-gradient text-white text-center grid place-items-center py-2"><div className="text-[10px] uppercase">{new Date(event.date + 'T00:00:00').toLocaleString('en', { month: 'short' })}</div><div className="text-2xl font-bold leading-none">{new Date(event.date + 'T00:00:00').getDate()}</div></div>{event.image_url && <img src={event.image_url} alt="" className="h-20 w-28 rounded-xl object-cover border" />}<div className="min-w-0"><div className="font-semibold">{event.name}</div><p className="mt-1 text-sm text-muted-foreground whitespace-pre-wrap">{event.description}</p></div></article>)}</div> : <div className="p-5 text-sm text-muted-foreground">No upcoming temple events at the moment.</div>}
        </section>

        <div className="text-center text-[11px] text-muted-foreground pb-6">
          Contact: {data.organization.contact_email} · {data.organization.contact_phone}
        </div>
      </div>
    </div>
  );
}

export default PublicPage;
