'use client';

import { useEffect, useMemo, useState } from 'react';
import { Archive, CheckCircle2, Eye, Plus, RotateCcw, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

const statusLabel = (status) => String(status || '').replace('_', ' ');
const studentLabel = (student) => [student?.first_name, student?.last_name].filter(Boolean).join(' ') || student?.name || student?.student_id || student?.id || 'Student';

export default function MembershipTermParticipation({ request }) {
  const [students, setStudents] = useState([]);
  const [memberships, setMemberships] = useState([]);
  const [offerings, setOfferings] = useState([]);
  const [terms, setTerms] = useState([]);
  const [items, setItems] = useState([]);
  const [filters, setFilters] = useState({ student_id: '', membership_id: '', program_offering_id: '', term_id: '', status: '' });
  const [form, setForm] = useState({ student_id: '', membership_id: '', program_offering_id: '', term_id: '' });
  const [dialog, setDialog] = useState(null);
  const [saving, setSaving] = useState(false);

  const maps = useMemo(() => ({
    students: new Map(students.map((item) => [item.id, item])),
    memberships: new Map(memberships.map((item) => [item.id, item])),
    offerings: new Map(offerings.map((item) => [item.id, item])),
    terms: new Map(terms.map((item) => [item.id, item])),
  }), [students, memberships, offerings, terms]);

  const load = async () => {
    try {
      const [studentResponse, membershipResponse, offeringResponse, termResponse] = await Promise.all([
        request('/students'),
        request('/memberships'),
        request('/program-offerings'),
        request('/academic-terms'),
      ]);
      setStudents(studentResponse.items || []);
      setMemberships(membershipResponse.items || []);
      setOfferings(offeringResponse.items || []);
      setTerms(termResponse.items || []);
      const participationResponse = await request('/membership-term-participations');
      setItems(participationResponse.items || []);
    } catch (error) { toast.error(error.message); }
  };

  useEffect(() => { load(); }, []);

  const visibleMemberships = memberships.filter((membership) => membership.status === 'active' && (!form.student_id || membership.student_id === form.student_id));
  const selectedMembership = memberships.find((membership) => membership.id === form.membership_id);
  const visibleOfferings = offerings.filter((offering) => offering.status !== 'archived' && (!selectedMembership || offering.program_id === selectedMembership.program_id));
  const visibleTerms = terms.filter((term) => term.status !== 'archived' && term.program_offering_id === form.program_offering_id);

  const filteredItems = items.filter((item) => (
    (!filters.student_id || maps.memberships.get(item.membership_id)?.student_id === filters.student_id) &&
    (!filters.membership_id || item.membership_id === filters.membership_id) &&
    (!filters.program_offering_id || item.program_offering_id === filters.program_offering_id) &&
    (!filters.term_id || item.term_id === filters.term_id) &&
    (!filters.status || item.status === filters.status)
  ));

  const openCreate = () => {
    setForm({ student_id: '', membership_id: '', program_offering_id: '', term_id: '' });
    setDialog({ type: 'create' });
  };
  const save = async () => {
    try {
      setSaving(true);
      await request('/membership-term-participations', { method: 'POST', body: JSON.stringify({
        membership_id: form.membership_id,
        program_offering_id: form.program_offering_id,
        term_id: form.term_id,
      }) });
      setDialog(null); await load(); toast.success('Participation created');
    } catch (error) { toast.error(error.message); } finally { setSaving(false); }
  };
  const transition = async (item, status) => {
    try {
      setSaving(true);
      await request('/membership-term-participations/' + item.id + '/lifecycle', { method: 'POST', body: JSON.stringify({ status }) });
      await load(); toast.success(status === 'restore' ? 'Participation restored' : 'Participation updated');
    } catch (error) { toast.error(error.message); } finally { setSaving(false); }
  };

  const selectedDetail = dialog?.item;
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex-1"><h1 className="text-2xl font-bold">Membership Participation</h1><p className="text-sm text-muted-foreground">Connect an active Membership to a Program Offering and Term.</p></div>
        <Button onClick={openCreate}><Plus size={15} className="mr-1" />Create Participation</Button>
      </div>
      <div className="grid gap-3 rounded-2xl glass p-4 md:grid-cols-5">
        {[['student_id','Student',students],['membership_id','Membership',memberships],['program_offering_id','Program Offering',offerings],['term_id','Term',terms]].map(([key,label,options]) => (
          <div key={key}><Label>{label}</Label><Select value={filters[key] || 'all'} onValueChange={(value) => setFilters({ ...filters, [key]: value === 'all' ? '' : value })}><SelectTrigger className="mt-1"><SelectValue placeholder={'All ' + label} /></SelectTrigger><SelectContent><SelectItem value="all">All {label}</SelectItem>{options.map((option) => <SelectItem key={option.id} value={option.id}>{option.name || option.title || option.id}</SelectItem>)}</SelectContent></Select></div>
        ))}
        <div><Label>Status</Label><Select value={filters.status || 'all'} onValueChange={(value) => setFilters({ ...filters, status: value === 'all' ? '' : value })}><SelectTrigger className="mt-1"><SelectValue placeholder="All statuses" /></SelectTrigger><SelectContent><SelectItem value="all">All statuses</SelectItem>{['active','completed','withdrawn','archived'].map((status) => <SelectItem key={status} value={status}>{statusLabel(status)}</SelectItem>)}</SelectContent></Select></div>
      </div>
      <div className="overflow-hidden rounded-2xl glass"><Table><TableHeader><TableRow><TableHead>Student</TableHead><TableHead>Membership</TableHead><TableHead>Program Offering</TableHead><TableHead>Term</TableHead><TableHead>Status</TableHead><TableHead>Actions</TableHead></TableRow></TableHeader><TableBody>{filteredItems.map((item) => { const membership=maps.memberships.get(item.membership_id); const student=maps.students.get(membership?.student_id); const offering=maps.offerings.get(item.program_offering_id); const term=maps.terms.get(item.term_id); return <TableRow key={item.id}><TableCell>{studentLabel(student)}</TableCell><TableCell>{membership?.program_id || 'Membership'}</TableCell><TableCell>{offering?.cohort || offering?.academic_year || item.program_offering_id}</TableCell><TableCell>{term?.name || item.term_id}</TableCell><TableCell className="capitalize">{statusLabel(item.status)}</TableCell><TableCell className="flex gap-1"><Button variant="ghost" size="icon" aria-label="View Participation" onClick={() => setDialog({ type:'view', item })}><Eye size={15}/></Button>{item.status === 'active' && <><Button variant="ghost" size="icon" aria-label="Complete Participation" onClick={() => transition(item,'completed')}><CheckCircle2 size={15}/></Button><Button variant="ghost" size="icon" aria-label="Withdraw Participation" onClick={() => transition(item,'withdrawn')}><XCircle size={15}/></Button><Button variant="ghost" size="icon" aria-label="Archive Participation" onClick={() => transition(item,'archived')}><Archive size={15}/></Button></>}{item.status === 'archived' && <Button variant="ghost" size="icon" aria-label="Restore Participation" onClick={() => transition(item,'restore')}><RotateCcw size={15}/></Button>}</TableCell></TableRow>; })}{!filteredItems.length && <TableRow><TableCell colSpan={6} className="py-10 text-center text-muted-foreground">No Participations found.</TableCell></TableRow>}</TableBody></Table></div>
      <Dialog open={Boolean(dialog)} onOpenChange={(open) => !open && setDialog(null)}><DialogContent><DialogHeader><DialogTitle>{dialog?.type === 'create' ? 'Create Participation' : 'Participation Details'}</DialogTitle><DialogDescription>{dialog?.type === 'create' ? 'Select the Student, active Membership, Program Offering, and Term.' : 'This relationship is historical and its references cannot be changed.'}</DialogDescription></DialogHeader>{dialog?.type === 'create' ? <div className="grid gap-3"><div><Label>Student</Label><Select value={form.student_id || 'none'} onValueChange={(value) => setForm({ student_id:value==='none'?'':value, membership_id:'', program_offering_id:'', term_id:'' })}><SelectTrigger><SelectValue placeholder="Choose Student" /></SelectTrigger><SelectContent><SelectItem value="none">Choose Student</SelectItem>{students.map((student) => <SelectItem key={student.id} value={student.id}>{studentLabel(student)}</SelectItem>)}</SelectContent></Select></div><div><Label>Active Membership</Label><Select value={form.membership_id || 'none'} onValueChange={(value) => setForm({ ...form, membership_id:value==='none'?'':value, program_offering_id:'', term_id:'' })}><SelectTrigger><SelectValue placeholder="Choose Membership" /></SelectTrigger><SelectContent><SelectItem value="none">Choose Membership</SelectItem>{visibleMemberships.map((membership) => <SelectItem key={membership.id} value={membership.id}>{membership.program_id} · {membership.status}</SelectItem>)}</SelectContent></Select></div><div><Label>Program Offering</Label><Select value={form.program_offering_id || 'none'} onValueChange={(value) => setForm({ ...form, program_offering_id:value==='none'?'':value, term_id:'' })}><SelectTrigger><SelectValue placeholder="Choose Program Offering" /></SelectTrigger><SelectContent><SelectItem value="none">Choose Program Offering</SelectItem>{visibleOfferings.map((offering) => <SelectItem key={offering.id} value={offering.id}>{offering.academic_year}{offering.cohort ? ' · '+offering.cohort : ''}</SelectItem>)}</SelectContent></Select></div><div><Label>Term</Label><Select value={form.term_id || 'none'} onValueChange={(value) => setForm({ ...form, term_id:value==='none'?'':value })}><SelectTrigger><SelectValue placeholder="Choose Term" /></SelectTrigger><SelectContent><SelectItem value="none">Choose Term</SelectItem>{visibleTerms.map((term) => <SelectItem key={term.id} value={term.id}>{term.name} · {term.start_date} → {term.end_date}</SelectItem>)}</SelectContent></Select></div></div> : <div className="space-y-2 text-sm"><div><strong>Status:</strong> <span className="capitalize">{statusLabel(selectedDetail?.status)}</span></div><div><strong>Membership:</strong> {selectedDetail?.membership_id}</div><div><strong>Program Offering:</strong> {selectedDetail?.program_offering_id}</div><div><strong>Term:</strong> {selectedDetail?.term_id}</div><div><strong>History entries:</strong> {selectedDetail?.lifecycle_history?.length || 0}</div></div>}<DialogFooter>{dialog?.type === 'create' && <Button disabled={saving || !form.student_id || !form.membership_id || !form.program_offering_id || !form.term_id} onClick={save}>Create Participation</Button>}</DialogFooter></DialogContent></Dialog>
    </div>
  );
}
