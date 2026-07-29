'use client';

import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

const reasons = [
  ['manual_adjustment', 'Manual adjustment'],
  ['enrollment_credit', 'Enrollment credit'],
  ['credit_purchase', 'Credit purchase'],
  ['attendance_consumption', 'Attendance consumption'],
  ['attendance_correction', 'Attendance correction'],
  ['refund_reversal', 'Refund reversal'],
  ['credit_expiry', 'Credit expiry'],
  ['credit_transfer', 'Credit transfer'],
];

async function request(path, options = {}) {
  const token = typeof window !== 'undefined' ? localStorage.getItem('g360_token') : null;
  const response = await fetch('/api' + path, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: 'Bearer ' + token } : {}), ...(options.headers || {}) },
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || 'Request failed');
  return data;
}

function labelOf(student) {
  if (!student) return 'Unknown student';
  return [student.first_name, student.last_name].filter(Boolean).join(' ') || student.name || student.student_id || student.id;
}

export default function CreditLedger() {
  const [memberships, setMemberships] = useState([]);
  const [students, setStudents] = useState([]);
  const [selectedMembership, setSelectedMembership] = useState('');
  const [ledger, setLedger] = useState({ items: [], balance: 0 });
  const [dialog, setDialog] = useState(false);
  const [form, setForm] = useState({ quantity_delta: '', reason_code: 'manual_adjustment', description: '' });
  const [saving, setSaving] = useState(false);

  const selectedStudent = useMemo(() => {
    const membership = memberships.find((item) => item.id === selectedMembership);
    return students.find((student) => student.id === membership?.student_id);
  }, [memberships, selectedMembership, students]);

  const load = async () => {
    try {
      const [membershipData, studentData] = await Promise.all([request('/memberships'), request('/students')]);
      setMemberships(membershipData.items || membershipData);
      setStudents(studentData.items || studentData);
    } catch (error) { toast.error(error.message); }
  };

  const loadLedger = async (membershipId) => {
    if (!membershipId) { setLedger({ items: [], balance: 0 }); return; }
    try { setLedger(await request('/credit-ledger?membership_id=' + encodeURIComponent(membershipId))); }
    catch (error) { toast.error(error.message); }
  };

  useEffect(() => { load(); }, []);
  useEffect(() => { loadLedger(selectedMembership); }, [selectedMembership]);

  const submit = async () => {
    setSaving(true);
    try {
      await request('/credit-ledger', {
        method: 'POST',
        headers: { 'Idempotency-Key': crypto.randomUUID() },
        body: JSON.stringify({
          membership_id: selectedMembership,
          quantity_delta: Number(form.quantity_delta),
          reason_code: form.reason_code,
          description: form.description,
        }),
      });
      setDialog(false);
      setForm({ quantity_delta: '', reason_code: 'manual_adjustment', description: '' });
      await loadLedger(selectedMembership);
      toast.success('Credit ledger entry posted');
    } catch (error) { toast.error(error.message); }
    finally { setSaving(false); }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex-1">
          <h1 className="text-2xl font-bold">Credits & Ledger</h1>
          <p className="text-sm text-muted-foreground">View calculated Membership credit balances and the immutable ledger.</p>
        </div>
        <Button onClick={() => setDialog(true)} disabled={!selectedMembership}>Add Credit Adjustment</Button>
      </div>
      <div className="rounded-2xl glass p-4">
        <Label>Membership</Label>
        <Select value={selectedMembership || 'none'} onValueChange={(value) => setSelectedMembership(value === 'none' ? '' : value)}>
          <SelectTrigger className="mt-1"><SelectValue placeholder="Choose Membership" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="none">Choose Membership</SelectItem>
            {memberships.map((membership) => <SelectItem key={membership.id} value={membership.id}>
              {labelOf(students.find((student) => student.id === membership.student_id))} · {membership.id.slice(0, 8)}
            </SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      {selectedMembership && (
        <div className="rounded-2xl glass p-5">
          <div className="text-xs text-muted-foreground">Calculated balance for {labelOf(selectedStudent)}</div>
          <div className={`text-4xl font-bold mt-1 ${ledger.balance < 0 ? 'text-rose-600' : 'text-emerald-600'}`}>{ledger.balance}</div>
          {ledger.balance < 0 && <p className="text-xs text-rose-600 mt-1">Warning: this Membership has a negative credit balance.</p>}
        </div>
      )}
      <div className="overflow-hidden rounded-2xl glass">
        <Table>
          <TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Change</TableHead><TableHead>Running balance</TableHead><TableHead>Reason</TableHead><TableHead>Description</TableHead><TableHead>Source</TableHead></TableRow></TableHeader>
          <TableBody>
            {ledger.items.map((entry) => <TableRow key={entry.id}>
              <TableCell>{new Date(entry.effective_at).toLocaleString()}</TableCell>
              <TableCell className={entry.quantity_delta < 0 ? 'text-rose-600' : 'text-emerald-600'}>{entry.quantity_delta > 0 ? '+' : ''}{entry.quantity_delta}</TableCell>
              <TableCell>{entry.running_balance}</TableCell>
              <TableCell>{reasons.find(([code]) => code === entry.reason_code)?.[1] || entry.reason_code}</TableCell>
              <TableCell>{entry.description || '—'}</TableCell>
              <TableCell>{entry.source_type} · {entry.source_id.slice(0, 8)}</TableCell>
            </TableRow>)}
            {!ledger.items.length && <TableRow><TableCell colSpan={6} className="text-center py-10 text-muted-foreground">No ledger entries for this Membership.</TableCell></TableRow>}
          </TableBody>
        </Table>
      </div>
      <Dialog open={dialog} onOpenChange={setDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Credit Adjustment</DialogTitle><DialogDescription>Manual adjustments are exceptional administrative operations and are permanently auditable.</DialogDescription></DialogHeader>
          <div className="grid gap-3">
            <div><Label htmlFor="credit-quantity">Credits to add or remove</Label><Input id="credit-quantity" type="number" step="1" value={form.quantity_delta} onChange={(event) => setForm({ ...form, quantity_delta: event.target.value })} placeholder="Example: 10 or -1" /></div>
            <div><Label>Reason</Label><Select value={form.reason_code} onValueChange={(value) => setForm({ ...form, reason_code: value })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{reasons.map(([code, label]) => <SelectItem key={code} value={code}>{label}</SelectItem>)}</SelectContent></Select></div>
            <div><Label htmlFor="credit-description">Description</Label><Textarea id="credit-description" value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} placeholder="Add context for this administrative operation" maxLength={4000} /></div>
          </div>
          <DialogFooter><Button disabled={saving || !selectedMembership || !Number.isInteger(Number(form.quantity_delta)) || Number(form.quantity_delta) === 0} onClick={submit}>{saving ? 'Posting…' : 'Post ledger entry'}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
