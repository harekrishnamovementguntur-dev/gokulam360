'use client';

import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Archive, CheckCircle2, Edit3, Eye, Plus, RotateCcw, Search, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

const STATUSES = ['pending', 'active', 'paused', 'completed', 'inactive', 'archived'];
const badgeClass = {
  pending: 'bg-amber-500/15 text-amber-700 border-amber-500/25',
  active: 'bg-emerald-500/15 text-emerald-700 border-emerald-500/25',
  paused: 'bg-sky-500/15 text-sky-700 border-sky-500/25',
  completed: 'bg-violet-500/15 text-violet-700 border-violet-500/25',
  inactive: 'bg-muted text-muted-foreground',
  archived: 'bg-rose-500/15 text-rose-700 border-rose-500/25',
};

function nameOf(student) {
  return student ? `${student.first_name || ''} ${student.last_name || ''}`.trim() || student.student_id : 'Unknown student';
}

function restoreStatus(membership) {
  const event = [...(membership.lifecycle_history || [])].reverse().find(item => item.to_status === 'archived');
  return event?.restorable_status || 'inactive';
}

export default function Memberships({ request }) {
  const [items, setItems] = useState([]);
  const [students, setStudents] = useState([]);
  const [programs, setPrograms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [details, setDetails] = useState(null);
  const [editing, setEditing] = useState(null);
  const empty = { student_id: '', program_id: '', status: 'pending', notes: '' };
  const [form, setForm] = useState(empty);
  const studentsById = useMemo(() => Object.fromEntries(students.map(student => [student.id, student])), [students]);
  const programsById = useMemo(() => Object.fromEntries(programs.map(program => [program.id, program])), [programs]);

  const load = async () => {
    setLoading(true);
    try {
      const [membershipResponse, studentResponse, programResponse] = await Promise.all([
        request('/memberships'), request('/students'), request('/programs'),
      ]);
      setItems(membershipResponse.items || []);
      setStudents(studentResponse.items || []);
      setPrograms(programResponse.items || []);
    } catch (error) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => items.filter(item => {
    if (status !== 'all' && item.status !== status) return false;
    const student = studentsById[item.student_id];
    const program = programsById[item.program_id];
    const text = `${nameOf(student)} ${student?.student_id || ''} ${program?.name || ''}`.toLowerCase();
    return !query || text.includes(query.toLowerCase());
  }), [items, status, query, studentsById, programsById]);

  const openCreate = () => {
    setEditing(null);
    setForm(empty);
    setDialogOpen(true);
  };

  const openEdit = membership => {
    setEditing(membership);
    setForm({ student_id: membership.student_id, program_id: membership.program_id, status: membership.status, notes: membership.notes || '' });
    setDialogOpen(true);
  };

  const save = async () => {
    try {
      if (editing) {
        await request(`/memberships/${editing.id}`, { method: 'PUT', body: JSON.stringify({ notes: form.notes }) });
        toast.success('Membership details updated');
      } else {
        await request('/memberships', { method: 'POST', body: JSON.stringify(form) });
        toast.success('Membership created');
      }
      setDialogOpen(false);
      await load();
    } catch (error) {
      toast.error(error.message);
    }
  };

  const transition = async (membership, nextStatus, reason) => {
    try {
      await request(`/memberships/${membership.id}/lifecycle`, {
        method: 'POST',
        body: JSON.stringify({ status: nextStatus, reason }),
      });
      toast.success(nextStatus === 'archived' ? 'Membership archived' : 'Membership restored');
      setDetails(null);
      await load();
    } catch (error) {
      toast.error(error.message);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-4 flex-wrap">
        <div className="w-12 h-12 rounded-2xl bg-saffron-gradient text-white grid place-items-center shadow-lg ring-glow"><Users size={20} /></div>
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Memberships</h1>
          <p className="text-sm text-muted-foreground">Durable Student-to-Program relationships and lifecycle history.</p>
        </div>
        <Button className="bg-saffron-gradient shadow" onClick={openCreate}><Plus size={15} className="mr-1" /> Create Membership</Button>
      </div>

      <div className="rounded-2xl glass p-4 flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[220px]"><Search size={14} className="absolute left-3 top-3 text-muted-foreground" /><Input className="pl-9" value={query} onChange={event => setQuery(event.target.value)} placeholder="Search student or program…" /></div>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
          <SelectContent><SelectItem value="all">All statuses</SelectItem>{STATUSES.map(value => <SelectItem value={value} key={value}>{value[0].toUpperCase() + value.slice(1)}</SelectItem>)}</SelectContent>
        </Select>
      </div>

      <div className="rounded-2xl glass overflow-hidden">
        <Table>
          <TableHeader><TableRow><TableHead>Student</TableHead><TableHead>Program</TableHead><TableHead>Status</TableHead><TableHead>Created</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
          <TableBody>
            {loading && <TableRow><TableCell colSpan={5} className="text-center py-10 text-muted-foreground">Loading Memberships…</TableCell></TableRow>}
            {!loading && filtered.length === 0 && <TableRow><TableCell colSpan={5} className="text-center py-10 text-muted-foreground">No Memberships found.</TableCell></TableRow>}
            {!loading && filtered.map(membership => {
              const student = studentsById[membership.student_id];
              const program = programsById[membership.program_id];
              return <TableRow key={membership.id}>
                <TableCell><div className="font-medium">{nameOf(student)}</div><div className="text-[11px] text-muted-foreground">{student?.student_id || membership.student_id}</div></TableCell>
                <TableCell>{program?.name || membership.program_id}</TableCell>
                <TableCell><Badge variant="outline" className={badgeClass[membership.status]}>{membership.status}</Badge></TableCell>
                <TableCell className="text-xs text-muted-foreground">{new Date(membership.created_at).toLocaleDateString('en-IN')}</TableCell>
                <TableCell className="text-right"><Button size="sm" variant="ghost" onClick={() => setDetails(membership)}><Eye size={14} className="mr-1" /> Details</Button></TableCell>
              </TableRow>;
            })}
          </TableBody>
        </Table>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{editing ? 'Edit Membership' : 'Create Membership'}</DialogTitle><DialogDescription>{editing ? 'Student and Program are immutable. Update operational notes only.' : 'Connect one Student to one Program.'}</DialogDescription></DialogHeader>
          <div className="grid gap-3">
            <div><Label>Student</Label><Select value={form.student_id} onValueChange={value => setForm(current => ({ ...current, student_id: value }))} disabled={!!editing}><SelectTrigger><SelectValue placeholder="Select Student" /></SelectTrigger><SelectContent>{students.map(student => <SelectItem key={student.id} value={student.id}>{nameOf(student)} · {student.student_id}</SelectItem>)}</SelectContent></Select></div>
            <div><Label>Program</Label><Select value={form.program_id} onValueChange={value => setForm(current => ({ ...current, program_id: value }))} disabled={!!editing}><SelectTrigger><SelectValue placeholder="Select Program" /></SelectTrigger><SelectContent>{programs.map(program => <SelectItem key={program.id} value={program.id}>{program.name}</SelectItem>)}</SelectContent></Select></div>
            {!editing && <div><Label>Initial Status</Label><Select value={form.status} onValueChange={value => setForm(current => ({ ...current, status: value }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="pending">Pending</SelectItem><SelectItem value="active">Active</SelectItem></SelectContent></Select></div>}
            <div><Label>Notes</Label><Textarea rows={3} value={form.notes} onChange={event => setForm(current => ({ ...current, notes: event.target.value }))} placeholder="Optional admission or operational note" /></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button><Button className="bg-saffron-gradient" onClick={save} disabled={!form.student_id || !form.program_id}>{editing ? 'Save changes' : 'Create Membership'}</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!details} onOpenChange={open => !open && setDetails(null)}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          {details && <><DialogHeader><DialogTitle>Membership Details</DialogTitle><DialogDescription>{nameOf(studentsById[details.student_id])} · {programsById[details.program_id]?.name || details.program_id}</DialogDescription></DialogHeader>
            <div className="flex items-center justify-between rounded-xl bg-muted/50 p-3"><div><div className="text-xs text-muted-foreground">Current status</div><Badge variant="outline" className={badgeClass[details.status]}>{details.status}</Badge></div><div className="text-right text-xs text-muted-foreground">Created<br /><span className="text-foreground">{new Date(details.created_at).toLocaleString('en-IN')}</span></div></div>
            <div><Label>Notes</Label><div className="mt-1 rounded-xl border p-3 text-sm min-h-12">{details.notes || 'No notes added.'}</div></div>
            <div><Label>Lifecycle History</Label><div className="mt-2 space-y-2">{(details.lifecycle_history || []).map((event, index) => <div key={index} className="rounded-xl border p-3 text-xs"><div className="font-medium">{event.from_status || '—'} <span className="text-muted-foreground">→</span> {event.to_status}</div><div className="text-muted-foreground mt-1">{event.reason || 'No reason supplied'} · {new Date(event.changed_at).toLocaleString('en-IN')}</div></div>)}</div></div>
            <DialogFooter className="gap-2 sm:gap-0">
              <Button variant="outline" onClick={() => openEdit(details)}><Edit3 size={14} className="mr-1" /> Edit notes</Button>
              {details.status === 'archived'
                ? <Button className="bg-emerald-gradient" onClick={() => transition(details, restoreStatus(details), 'Membership restored')}><RotateCcw size={14} className="mr-1" /> Restore</Button>
                : <Button variant="destructive" onClick={() => transition(details, 'archived', 'Membership archived')}><Archive size={14} className="mr-1" /> Archive</Button>}
            </DialogFooter>
          </>}
        </DialogContent>
      </Dialog>
    </div>
  );
}
