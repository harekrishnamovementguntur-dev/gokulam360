'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Archive, BookOpen, Edit3, Layers, Plus, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';

const emptyProgram = { name: '', description: '', age_group: '', status: 'active' };
const emptyOffering = { program_id: '', academic_year: '', cohort: '', start_date: '', end_date: '', capacity: 0, schedule: { label: '' }, metadata: { attendance_policy: { credit_consumption_enabled: false, credits_per_attendance: 1 } }, status: 'active' };
export default function ProgramsOfferings({ request }) {
  const [programs, setPrograms] = useState([]);
  const [offerings, setOfferings] = useState([]);
  const [dialog, setDialog] = useState(null);
  const [form, setForm] = useState(emptyProgram);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    try {
      const [programResponse, offeringResponse] = await Promise.all([
        request('/academic-programs'),
        request('/program-offerings'),
      ]);
      setPrograms(programResponse.items || []);
      setOfferings(offeringResponse.items || []);
    } catch (error) {
      toast.error(error.message || 'Unable to load Programs and Offerings');
    }
  };

  useEffect(() => {
    load();
  }, []);

  const programName = (programId) => programs.find((program) => program.id === programId)?.name || 'Unknown Program';

  const openProgram = (program = null) => {
    setDialog({ kind: 'program', entity: program });
    setForm(program ? { name: program.name, description: program.description || '', age_group: program.age_group || '' } : emptyProgram);
  };

  const openOffering = (offering = null) => {
    setDialog({ kind: 'offering', entity: offering });
    setForm(offering ? {
      program_id: offering.program_id,
      academic_year: offering.academic_year,
      cohort: offering.cohort || '',
      start_date: offering.start_date,
      end_date: offering.end_date,
      capacity: offering.capacity || 0,
      schedule: offering.schedule || { label: '' },
      metadata: {
        ...(offering.metadata || {}),
        attendance_policy: {
          credit_consumption_enabled: offering.metadata?.attendance_policy?.credit_consumption_enabled === true,
          credits_per_attendance: Number(offering.metadata?.attendance_policy?.credits_per_attendance || 1),
        },
      },
    } : emptyOffering);
  };

  const save = async () => {
    try {
      setSaving(true);
      if (dialog.kind === 'program') {
        const path = dialog.entity ? '/academic-programs/' + dialog.entity.id : '/academic-programs';
        await request(path, { method: dialog.entity ? 'PUT' : 'POST', body: JSON.stringify(form) });
      }
      if (dialog.kind === 'offering') {
        const path = dialog.entity ? '/program-offerings/' + dialog.entity.id : '/program-offerings';
        const payload = dialog.entity ? { ...form, program_id: undefined } : form;
        await request(path, { method: dialog.entity ? 'PUT' : 'POST', body: JSON.stringify(payload) });
      }
      setDialog(null);
      await load();
      toast.success('Saved successfully');
    } catch (error) {
      toast.error(error.message || 'Unable to save changes');
    } finally {
      setSaving(false);
    }
  };

  const transition = async (kind, entity, status) => {
    try {
      setSaving(true);
      const base = kind === 'program' ? '/academic-programs/' : '/program-offerings/';
      await request(base + entity.id + '/lifecycle', { method: 'POST', body: JSON.stringify({ status }) });
      await load();
      toast.success(status === 'archived' ? 'Archived successfully' : 'Restored as inactive');
    } catch (error) {
      toast.error(error.message || 'Unable to update status');
    } finally {
      setSaving(false);
    }
  };

  const actionButtons = (kind, entity, edit) => (
    <div className="flex justify-end gap-1">
      <Button variant="ghost" size="icon" aria-label={'Edit ' + entity.name} onClick={edit}>
        <Edit3 size={15} />
      </Button>
      {entity.status === 'archived' ? (
        <Button variant="ghost" size="icon" aria-label={'Restore ' + entity.name} disabled={saving} onClick={() => transition(kind, entity, 'inactive')}>
          <RotateCcw size={15} />
        </Button>
      ) : (
        <Button variant="ghost" size="icon" aria-label={'Archive ' + entity.name} disabled={saving} onClick={() => transition(kind, entity, 'archived')}>
          <Archive size={15} />
        </Button>
      )}
    </div>
  );

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-3">
        <div className="grid h-12 w-12 place-items-center rounded-2xl bg-saffron-gradient text-white"><BookOpen /></div>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">Programs & Offerings</h1>
          <p className="text-sm text-muted-foreground">Manage canonical academic Programs and their operational deliveries.</p>
        </div>
        <Button onClick={() => openProgram()}><Plus size={15} className="mr-1" />Program</Button>
        <Button variant="outline" onClick={() => openOffering()}><Layers size={15} className="mr-1" />Offering</Button>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <section className="overflow-hidden rounded-2xl glass">
          <div className="p-4"><h2 className="font-semibold">Canonical Programs</h2><p className="text-sm text-muted-foreground">Academic definitions only—no pricing, dates, or schedule.</p></div>
          <Table>
            <TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Age Group</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
            <TableBody>
              {programs.map((program) => <TableRow key={program.id}>
                <TableCell><div className="font-medium">{program.name}</div><div className="max-w-[18rem] truncate text-xs text-muted-foreground">{program.description || 'No description'}</div></TableCell>
                <TableCell>{program.age_group || '—'}</TableCell>
                <TableCell className="capitalize">{program.status}</TableCell>
                <TableCell>{actionButtons('program', program, () => openProgram(program))}</TableCell>
              </TableRow>)}
              {!programs.length && <TableRow><TableCell colSpan={4} className="py-8 text-center text-muted-foreground">No canonical Programs yet.</TableCell></TableRow>}
            </TableBody>
          </Table>
        </section>

        <section className="overflow-hidden rounded-2xl glass">
          <div className="p-4"><h2 className="font-semibold">Program Offerings</h2><p className="text-sm text-muted-foreground">Delivery details for a Program, such as cohort, dates, capacity, and schedule.</p></div>
          <Table>
            <TableHeader><TableRow><TableHead>Program</TableHead><TableHead>Delivery</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
            <TableBody>
              {offerings.map((offering) => <TableRow key={offering.id}>
                <TableCell className="font-medium">{programName(offering.program_id)}</TableCell>
                <TableCell><div>{offering.academic_year}{offering.cohort ? ' · ' + offering.cohort : ''}</div><div className="text-xs text-muted-foreground">{offering.start_date} to {offering.end_date}</div></TableCell>
                <TableCell className="capitalize">{offering.status}</TableCell>
                <TableCell>{actionButtons('offering', { ...offering, name: programName(offering.program_id) + ' offering' }, () => openOffering(offering))}</TableCell>
              </TableRow>)}
              {!offerings.length && <TableRow><TableCell colSpan={4} className="py-8 text-center text-muted-foreground">No Program Offerings yet.</TableCell></TableRow>}
            </TableBody>
          </Table>
        </section>
      </div>

      <Dialog open={Boolean(dialog)} onOpenChange={(open) => !open && setDialog(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>{dialog?.kind === 'program' ? (dialog.entity ? 'Edit Program' : 'Create Program') : (dialog?.entity ? 'Edit Program Offering' : 'Create Program Offering')}</DialogTitle></DialogHeader>
          {dialog?.kind === 'program' && <div className="grid gap-3">
            <div><Label htmlFor="program-name">Name</Label><Input id="program-name" value={form.name || ''} onChange={(event) => setForm({ ...form, name: event.target.value })} /></div>
            <div><Label htmlFor="program-description">Description</Label><Textarea id="program-description" value={form.description || ''} onChange={(event) => setForm({ ...form, description: event.target.value })} /></div>
            <div><Label htmlFor="program-age-group">Age group</Label><Input id="program-age-group" value={form.age_group || ''} onChange={(event) => setForm({ ...form, age_group: event.target.value })} /></div>
          </div>}
          {dialog?.kind === 'offering' && <div className="grid gap-3">
            <div><Label>Canonical Program</Label><Select disabled={Boolean(dialog.entity)} value={form.program_id || undefined} onValueChange={(value) => setForm({ ...form, program_id: value })}><SelectTrigger><SelectValue placeholder="Select a Program" /></SelectTrigger><SelectContent>{programs.filter((program) => program.status !== 'archived').map((program) => <SelectItem value={program.id} key={program.id}>{program.name}</SelectItem>)}</SelectContent></Select>{dialog.entity && <p className="text-xs text-muted-foreground">The parent Program is fixed after an Offering is created.</p>}</div>
            <div><Label htmlFor="offering-year">Academic year</Label><Input id="offering-year" value={form.academic_year || ''} onChange={(event) => setForm({ ...form, academic_year: event.target.value })} /></div>
            <div><Label htmlFor="offering-cohort">Cohort / batch</Label><Input id="offering-cohort" value={form.cohort || ''} onChange={(event) => setForm({ ...form, cohort: event.target.value })} /></div>
            <div className="grid grid-cols-2 gap-3"><div><Label htmlFor="offering-start">Start date</Label><Input id="offering-start" type="date" value={form.start_date || ''} onChange={(event) => setForm({ ...form, start_date: event.target.value })} /></div><div><Label htmlFor="offering-end">End date</Label><Input id="offering-end" type="date" value={form.end_date || ''} onChange={(event) => setForm({ ...form, end_date: event.target.value })} /></div></div>
            <div><Label htmlFor="offering-capacity">Capacity</Label><Input id="offering-capacity" type="number" min="0" value={form.capacity ?? 0} onChange={(event) => setForm({ ...form, capacity: Number(event.target.value) })} /></div>
            <div><Label htmlFor="offering-schedule">Schedule label</Label><Input id="offering-schedule" placeholder="For example: Sunday 10:00–11:00" value={form.schedule?.label || ''} onChange={(event) => setForm({ ...form, schedule: { ...form.schedule, label: event.target.value } })} /></div>
            <div className="rounded-xl border bg-muted/20 p-3">
              <div className="text-sm font-medium">Attendance credits</div>
              <label className="mt-2 flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={form.metadata?.attendance_policy?.credit_consumption_enabled === true}
                  onChange={(event) => setForm({
                    ...form,
                    metadata: {
                      ...form.metadata,
                      attendance_policy: {
                        ...form.metadata?.attendance_policy,
                        credit_consumption_enabled: event.target.checked,
                      },
                    },
                  })}
                />
                Consume credits when a student is Present or Late
              </label>
              <div className="mt-2">
                <Label htmlFor="offering-credits-per-attendance">Credits per Present/Late attendance</Label>
                <Input
                  id="offering-credits-per-attendance"
                  type="number"
                  min="1"
                  step="1"
                  disabled={form.metadata?.attendance_policy?.credit_consumption_enabled !== true}
                  value={form.metadata?.attendance_policy?.credits_per_attendance ?? 1}
                  onChange={(event) => setForm({
                    ...form,
                    metadata: {
                      ...form.metadata,
                      attendance_policy: {
                        ...form.metadata?.attendance_policy,
                        credits_per_attendance: Math.max(1, Number(event.target.value) || 1),
                      },
                    },
                  })}
                />
              </div>
              <p className="mt-1 text-xs text-muted-foreground">Absent, Excused, Holiday, and Cancelled sessions never consume credits.</p>
            </div>
          </div>}
          <DialogFooter><Button variant="outline" disabled={saving} onClick={() => setDialog(null)}>Cancel</Button><Button disabled={saving} onClick={save}>{saving ? 'Saving…' : 'Save'}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
