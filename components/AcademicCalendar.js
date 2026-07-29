'use client';

import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Archive, CalendarDays, Check, Edit3, History, Layers, Plus, RotateCcw, WandSparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';

const weekdays = [
  { value: 0, label: 'Sunday' }, { value: 1, label: 'Monday' }, { value: 2, label: 'Tuesday' },
  { value: 3, label: 'Wednesday' }, { value: 4, label: 'Thursday' }, { value: 5, label: 'Friday' }, { value: 6, label: 'Saturday' },
];
const emptyTerm = { program_offering_id: '', name: '', display_order: 1, start_date: '', end_date: '', status: 'active' };
const emptySession = { term_id: '', date: '', start_time: '10:00', end_time: '11:30', status: 'scheduled', notes: '', topic: '', reference: '' };

function statusLabel(value) { return String(value || '').replace('_', ' '); }
function stepLabel(step) { return ['Weekdays', 'Time', 'Exceptions', 'Preview', 'Generate'][step - 1]; }

export default function AcademicCalendar({ request }) {
  const [offerings, setOfferings] = useState([]);
  const [terms, setTerms] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [selectedOfferingId, setSelectedOfferingId] = useState('');
  const [selectedTermId, setSelectedTermId] = useState('');
  const [termDialog, setTermDialog] = useState(null);
  const [termForm, setTermForm] = useState(emptyTerm);
  const [sessionDialog, setSessionDialog] = useState(null);
  const [sessionForm, setSessionForm] = useState(emptySession);
  const [wizard, setWizard] = useState(null);
  const [wizardStep, setWizardStep] = useState(1);
  const [generationForm, setGenerationForm] = useState(null);
  const [preview, setPreview] = useState(null);
  const [generationResult, setGenerationResult] = useState(null);
  const [saving, setSaving] = useState(false);

  const loadOfferings = async () => {
    const response = await request('/program-offerings');
    setOfferings(response.items || []);
    if (!selectedOfferingId && response.items?.[0]) setSelectedOfferingId(response.items[0].id);
  };
  const loadTerms = async () => {
    const response = await request('/academic-terms' + (selectedOfferingId ? '?program_offering_id=' + selectedOfferingId : ''));
    const filtered = selectedOfferingId ? (response.items || []).filter((term) => term.program_offering_id === selectedOfferingId) : (response.items || []);
    setTerms(filtered);
    if (!selectedTermId && filtered[0]) setSelectedTermId(filtered[0].id);
  };
  const loadSessions = async (termId = selectedTermId) => {
    if (!termId) return setSessions([]);
    const response = await request('/academic-sessions?term_id=' + termId);
    setSessions(response.items || []);
  };

  useEffect(() => { loadOfferings().catch((error) => toast.error(error.message)); }, []);
  useEffect(() => { loadTerms().catch((error) => toast.error(error.message)); }, [selectedOfferingId]);
  useEffect(() => { loadSessions().catch((error) => toast.error(error.message)); }, [selectedTermId]);

  const selectedTerm = useMemo(() => terms.find((term) => term.id === selectedTermId), [terms, selectedTermId]);
  const offeringName = (id) => offerings.find((offering) => offering.id === id)?.academic_year + (offerings.find((offering) => offering.id === id)?.cohort ? ' · ' + offerings.find((offering) => offering.id === id).cohort : '');

  const openTerm = (term = null) => {
    setTermDialog({ entity: term });
    setTermForm(term ? { name: term.name, display_order: term.display_order, start_date: term.start_date, end_date: term.end_date } : { ...emptyTerm, program_offering_id: selectedOfferingId });
  };
  const saveTerm = async () => {
    try {
      setSaving(true);
      const path = termDialog.entity ? '/academic-terms/' + termDialog.entity.id : '/academic-terms';
      await request(path, { method: termDialog.entity ? 'PUT' : 'POST', body: JSON.stringify({ ...termForm, program_offering_id: termDialog.entity?.program_offering_id || selectedOfferingId }) });
      setTermDialog(null); await loadTerms(); toast.success('Term saved');
    } catch (error) { toast.error(error.message); } finally { setSaving(false); }
  };
  const transitionTerm = async (term, status) => {
    try {
      await request('/academic-terms/' + term.id + '/lifecycle', { method: 'POST', body: JSON.stringify({ status }) });
      await loadTerms(); toast.success(status === 'archived' ? 'Term archived' : 'Term restored');
    } catch (error) { toast.error(error.message); }
  };

  const openSession = (session = null) => {
    setSessionDialog({ entity: session });
    setSessionForm(session ? { date: session.date, start_time: session.start_time, end_time: session.end_time, status: session.status, notes: session.notes || '', topic: session.topic || '', reference: session.reference || '' } : { ...emptySession, term_id: selectedTermId, date: selectedTerm?.start_date || '' });
  };
  const saveSession = async () => {
    try {
      setSaving(true);
      const path = sessionDialog.entity ? '/academic-sessions/' + sessionDialog.entity.id : '/academic-sessions';
      await request(path, { method: sessionDialog.entity ? 'PUT' : 'POST', body: JSON.stringify({ ...sessionForm, term_id: sessionDialog.entity?.term_id || selectedTermId }) });
      setSessionDialog(null); await loadSessions(); toast.success('Session saved');
    } catch (error) { toast.error(error.message); } finally { setSaving(false); }
  };

  const openWizard = () => {
    if (!selectedTerm) return toast.error('Select a Term first');
    setWizard(true); setWizardStep(1); setPreview(null); setGenerationResult(null);
    setGenerationForm({ term_id: selectedTerm.id, weekdays: [0], start_date: selectedTerm.start_date, end_date: selectedTerm.end_date, start_time: '10:00', end_time: '11:30', excluded_dates: [], holiday_dates: [], excluded_input: '', holiday_input: '', holiday_reason: '' });
  };
  const addException = (kind) => {
    const key = kind === 'excluded' ? 'excluded_dates' : 'holiday_dates';
    if (kind === 'excluded') {
      if (!generationForm.excluded_input) return;
      setGenerationForm({ ...generationForm, [key]: [...generationForm[key], generationForm.excluded_input], excluded_input: '' });
    } else {
      if (!generationForm.holiday_input) return;
      setGenerationForm({ ...generationForm, [key]: [...generationForm[key], { date: generationForm.holiday_input, reason: generationForm.holiday_reason }], holiday_input: '', holiday_reason: '' });
    }
  };
  const getPreview = async () => {
    try {
      setSaving(true);
      const result = await request('/academic-sessions/generate/preview', { method: 'POST', body: JSON.stringify(generationForm) });
      setPreview(result); setWizardStep(4);
    } catch (error) { toast.error(error.message); } finally { setSaving(false); }
  };
  const generate = async () => {
    try {
      setSaving(true);
      const result = await request('/academic-sessions/generate', { method: 'POST', body: JSON.stringify(generationForm) });
      setGenerationResult(result); setWizardStep(5); await loadSessions();
      toast.success(result.created.length + ' Sessions created');
    } catch (error) { toast.error(error.message); } finally { setSaving(false); }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-3">
        <div className="grid h-12 w-12 place-items-center rounded-2xl bg-saffron-gradient text-white"><CalendarDays /></div>
        <div className="flex-1"><h1 className="text-2xl font-bold">Academic Calendar</h1><p className="text-sm text-muted-foreground">Plan Terms and Sessions for each Program Offering.</p></div>
        <Button onClick={() => openTerm()}><Plus size={15} className="mr-1" />Create Term</Button>
      </div>

      <div className="rounded-2xl glass p-4">
        <Label>Program Offering</Label>
        <Select value={selectedOfferingId || undefined} onValueChange={(value) => { setSelectedOfferingId(value); setSelectedTermId(''); }}>
          <SelectTrigger className="mt-1 max-w-xl"><SelectValue placeholder="Choose a Program Offering" /></SelectTrigger>
          <SelectContent>{offerings.filter((offering) => offering.status !== 'archived').map((offering) => <SelectItem key={offering.id} value={offering.id}>{offering.academic_year}{offering.cohort ? ' · ' + offering.cohort : ''}</SelectItem>)}</SelectContent>
        </Select>
      </div>

      <div className="grid gap-4 xl:grid-cols-[20rem_1fr]">
        <section className="overflow-hidden rounded-2xl glass">
          <div className="flex items-center justify-between p-4"><div><h2 className="font-semibold">Terms</h2><p className="text-xs text-muted-foreground">Academic periods</p></div><Button size="icon" variant="ghost" aria-label="Create Term" onClick={() => openTerm()}><Plus size={16} /></Button></div>
          <div className="space-y-2 p-3">
            {terms.map((term) => <button key={term.id} onClick={() => setSelectedTermId(term.id)} className={'w-full rounded-xl p-3 text-left transition ' + (term.id === selectedTermId ? 'bg-primary/15 ring-1 ring-primary/30' : 'hover:bg-white/40 dark:hover:bg-white/5')}>
              <div className="font-medium">{term.name}</div><div className="text-xs text-muted-foreground">{term.start_date} → {term.end_date}</div><div className="mt-1 text-xs capitalize">{statusLabel(term.status)}</div>
            </button>)}
            {!terms.length && <p className="p-3 text-sm text-muted-foreground">Create a Term to begin.</p>}
          </div>
        </section>

        <section className="overflow-hidden rounded-2xl glass">
          {selectedTerm ? <><div className="flex flex-wrap items-center gap-3 border-b p-4"><div className="flex-1"><h2 className="font-semibold">{selectedTerm.name}</h2><p className="text-sm text-muted-foreground">{offeringName(selectedTerm.program_offering_id)} · {selectedTerm.start_date} to {selectedTerm.end_date}</p></div><Button variant="outline" onClick={openWizard}><WandSparkles size={15} className="mr-1" />Generate Sessions</Button><Button variant="ghost" size="icon" aria-label="Edit Term" onClick={() => openTerm(selectedTerm)}><Edit3 size={16} /></Button>{selectedTerm.status === 'archived' ? <Button variant="ghost" size="icon" aria-label="Restore Term" onClick={() => transitionTerm(selectedTerm, 'inactive')}><RotateCcw size={16} /></Button> : <Button variant="ghost" size="icon" aria-label="Archive Term" onClick={() => transitionTerm(selectedTerm, 'archived')}><Archive size={16} /></Button>}</div>
            <div className="flex items-center justify-between p-4"><div><h3 className="font-semibold">Sessions</h3><p className="text-xs text-muted-foreground">Generated and manual changes are preserved separately.</p></div><Button size="sm" variant="outline" onClick={() => openSession()}><Plus size={14} className="mr-1" />Add Session</Button></div>
            <Table><TableHeader><TableRow><TableHead>No.</TableHead><TableHead>Date</TableHead><TableHead>Time</TableHead><TableHead>Status</TableHead><TableHead>Origin</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader><TableBody>
              {sessions.map((session) => <TableRow key={session.id}><TableCell>{session.session_number}</TableCell><TableCell><div>{session.date}</div><div className="text-xs text-muted-foreground">{session.topic || 'No topic'}</div></TableCell><TableCell>{session.start_time}–{session.end_time}</TableCell><TableCell className="capitalize">{statusLabel(session.status)}</TableCell><TableCell className="capitalize">{session.source}</TableCell><TableCell className="text-right"><Button variant="ghost" size="icon" aria-label={'Edit Session ' + session.session_number} onClick={() => openSession(session)}><Edit3 size={15} /></Button></TableCell></TableRow>)}
              {!sessions.length && <TableRow><TableCell colSpan={6} className="py-8 text-center text-muted-foreground">No Sessions yet. Use Generate Sessions to preview and create them.</TableCell></TableRow>}
            </TableBody></Table>
          </> : <div className="p-10 text-center text-muted-foreground">Select a Term to manage its Sessions.</div>}
        </section>
      </div>

      <Dialog open={Boolean(termDialog)} onOpenChange={(open) => !open && setTermDialog(null)}><DialogContent><DialogHeader><DialogTitle>{termDialog?.entity ? 'Edit Term' : 'Create Term'}</DialogTitle></DialogHeader><div className="grid gap-3"><div><Label htmlFor="term-name">Term name</Label><Input id="term-name" value={termForm.name || ''} onChange={(event) => setTermForm({ ...termForm, name: event.target.value })} /></div><div><Label htmlFor="term-order">Display order</Label><Input id="term-order" type="number" min="1" value={termForm.display_order ?? 1} onChange={(event) => setTermForm({ ...termForm, display_order: Number(event.target.value) })} /></div><div className="grid grid-cols-2 gap-3"><div><Label htmlFor="term-start">Start date</Label><Input id="term-start" type="date" value={termForm.start_date || ''} onChange={(event) => setTermForm({ ...termForm, start_date: event.target.value })} /></div><div><Label htmlFor="term-end">End date</Label><Input id="term-end" type="date" value={termForm.end_date || ''} onChange={(event) => setTermForm({ ...termForm, end_date: event.target.value })} /></div></div></div><DialogFooter><Button variant="outline" onClick={() => setTermDialog(null)}>Cancel</Button><Button disabled={saving} onClick={saveTerm}>Save Term</Button></DialogFooter></DialogContent></Dialog>

      <Dialog open={Boolean(sessionDialog)} onOpenChange={(open) => !open && setSessionDialog(null)}><DialogContent><DialogHeader><DialogTitle>{sessionDialog?.entity ? 'Edit Session' : 'Add Session'}</DialogTitle></DialogHeader><div className="grid gap-3"><div className="grid grid-cols-2 gap-3"><div><Label htmlFor="session-date">Date</Label><Input id="session-date" type="date" value={sessionForm.date || ''} onChange={(event) => setSessionForm({ ...sessionForm, date: event.target.value })} /></div><div><Label>Status</Label><Select value={sessionForm.status} onValueChange={(value) => setSessionForm({ ...sessionForm, status: value })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{['scheduled', 'completed', 'cancelled', 'rescheduled', 'holiday', 'archived'].map((status) => <SelectItem key={status} value={status}>{statusLabel(status)}</SelectItem>)}</SelectContent></Select></div></div><div className="grid grid-cols-2 gap-3"><div><Label htmlFor="session-start">Start time</Label><Input id="session-start" type="time" value={sessionForm.start_time || ''} onChange={(event) => setSessionForm({ ...sessionForm, start_time: event.target.value })} /></div><div><Label htmlFor="session-end">End time</Label><Input id="session-end" type="time" value={sessionForm.end_time || ''} onChange={(event) => setSessionForm({ ...sessionForm, end_time: event.target.value })} /></div></div><div><Label htmlFor="session-topic">Topic (optional)</Label><Input id="session-topic" value={sessionForm.topic || ''} onChange={(event) => setSessionForm({ ...sessionForm, topic: event.target.value })} /></div><div><Label htmlFor="session-reference">Reference (optional)</Label><Input id="session-reference" value={sessionForm.reference || ''} onChange={(event) => setSessionForm({ ...sessionForm, reference: event.target.value })} /></div><div><Label htmlFor="session-notes">Notes</Label><Textarea id="session-notes" value={sessionForm.notes || ''} onChange={(event) => setSessionForm({ ...sessionForm, notes: event.target.value })} /></div></div><DialogFooter><Button variant="outline" onClick={() => setSessionDialog(null)}>Cancel</Button><Button disabled={saving} onClick={saveSession}>Save Session</Button></DialogFooter></DialogContent></Dialog>

      <Dialog open={Boolean(wizard)} onOpenChange={(open) => !open && setWizard(null)}><DialogContent className="max-w-3xl"><DialogHeader><DialogTitle>Generate Sessions · {selectedTerm?.name}</DialogTitle></DialogHeader>{generationForm && <div className="space-y-4"><div className="grid grid-cols-5 gap-1 text-center text-xs">{[1,2,3,4,5].map((step) => <div key={step} className={'rounded-lg p-2 ' + (wizardStep === step ? 'bg-primary text-primary-foreground' : wizardStep > step ? 'bg-emerald-500/15 text-emerald-700' : 'bg-muted')}>{wizardStep > step ? <Check size={14} className="mx-auto" /> : step}<div>{stepLabel(step)}</div></div>)}</div>
        {wizardStep === 1 && <div className="grid gap-3"><p className="text-sm text-muted-foreground">Choose the weekdays on which Sessions should occur.</p><div className="grid grid-cols-2 gap-2 sm:grid-cols-4">{weekdays.map((day) => <label key={day.value} className="flex items-center gap-2 rounded-lg border p-3"><input type="checkbox" checked={generationForm.weekdays.includes(day.value)} onChange={(event) => setGenerationForm({ ...generationForm, weekdays: event.target.checked ? [...generationForm.weekdays, day.value].sort() : generationForm.weekdays.filter((value) => value !== day.value) })} />{day.label}</label>)}</div></div>}
        {wizardStep === 2 && <div className="grid gap-3"><p className="text-sm text-muted-foreground">Set the default time for generated Sessions.</p><div className="grid grid-cols-2 gap-3"><div><Label htmlFor="generation-start">Start time</Label><Input id="generation-start" type="time" value={generationForm.start_time} onChange={(event) => setGenerationForm({ ...generationForm, start_time: event.target.value })} /></div><div><Label htmlFor="generation-end">End time</Label><Input id="generation-end" type="time" value={generationForm.end_time} onChange={(event) => setGenerationForm({ ...generationForm, end_time: event.target.value })} /></div></div><div className="grid grid-cols-2 gap-3"><div><Label htmlFor="generation-from">From</Label><Input id="generation-from" type="date" value={generationForm.start_date} onChange={(event) => setGenerationForm({ ...generationForm, start_date: event.target.value })} /></div><div><Label htmlFor="generation-to">To</Label><Input id="generation-to" type="date" value={generationForm.end_date} onChange={(event) => setGenerationForm({ ...generationForm, end_date: event.target.value })} /></div></div></div>}
        {wizardStep === 3 && <div className="grid gap-4"><div><Label>Excluded dates</Label><div className="flex gap-2 mt-1"><Input type="date" value={generationForm.excluded_input} onChange={(event) => setGenerationForm({ ...generationForm, excluded_input: event.target.value })} /><Button variant="outline" onClick={() => addException('excluded')}>Add</Button></div><div className="mt-2 flex flex-wrap gap-2">{generationForm.excluded_dates.map((dateValue) => <span key={dateValue} className="rounded-full bg-muted px-3 py-1 text-xs">{dateValue}</span>)}</div></div><div><Label>Holiday dates and reasons</Label><div className="mt-1 grid gap-2 sm:grid-cols-[10rem_1fr_auto]"><Input type="date" value={generationForm.holiday_input} onChange={(event) => setGenerationForm({ ...generationForm, holiday_input: event.target.value })} /><Input placeholder="Reason, for example: Festival" value={generationForm.holiday_reason} onChange={(event) => setGenerationForm({ ...generationForm, holiday_reason: event.target.value })} /><Button variant="outline" onClick={() => addException('holiday')}>Add</Button></div><div className="mt-2 space-y-1">{generationForm.holiday_dates.map((holiday) => <div key={holiday.date} className="rounded-lg bg-muted px-3 py-1 text-xs">{holiday.date} — {holiday.reason || 'Holiday'}</div>)}</div></div></div>}
        {wizardStep === 4 && preview && <div className="space-y-4"><div className="rounded-xl bg-primary/10 p-4"><div className="text-lg font-semibold">{preview.candidates.filter((item) => item.action === 'create').length} Sessions will be created</div><p className="text-sm text-muted-foreground">Existing Sessions will be preserved and not overwritten.</p></div><div className="grid gap-3 md:grid-cols-2"><div><h4 className="font-medium">Dates to create</h4><div className="max-h-40 overflow-auto text-sm">{preview.candidates.filter((item) => item.action === 'create').map((item) => <div key={item.date}>{item.date} · Session {item.session_number}</div>) || <p>None</p>}</div></div><div><h4 className="font-medium">Preserved Sessions</h4><div className="max-h-40 overflow-auto text-sm">{preview.candidates.filter((item) => item.action === 'preserve').map((item) => <div key={item.date}>{item.date} · {statusLabel(item.status)} · {item.source}</div>) || <p>None</p>}</div></div></div><div><h4 className="font-medium">Excluded dates</h4>{preview.excluded.map((item) => <div key={item.date} className="text-sm">{item.date} — {item.reason}</div>)}<h4 className="mt-2 font-medium">Holidays</h4>{preview.holidays.map((item) => <div key={item.date} className="text-sm">{item.date} — {item.reason || 'Holiday'}</div>)}</div><p className="text-sm font-medium">Nothing will be created until you select Generate Sessions.</p></div>}
        {wizardStep === 5 && generationResult && <div className="space-y-4"><div className="rounded-xl bg-emerald-500/15 p-4"><div className="text-lg font-semibold">Generation complete</div><p className="text-sm">{generationResult.created.length} created · {generationResult.preserved.length} preserved</p></div><Button onClick={() => { setWizard(null); loadSessions(); }}>Review Sessions</Button></div>}
        <DialogFooter><Button variant="outline" onClick={() => setWizard(null)}>{wizardStep === 5 ? 'Close' : 'Cancel'}</Button>{wizardStep > 1 && wizardStep < 4 && <Button variant="outline" onClick={() => setWizardStep(wizardStep - 1)}>Back</Button>}{wizardStep === 1 && <Button disabled={!generationForm.weekdays.length} onClick={() => setWizardStep(2)}>Next</Button>}{wizardStep === 2 && <Button onClick={() => setWizardStep(3)}>Next</Button>}{wizardStep === 3 && <Button disabled={saving} onClick={getPreview}>Preview Sessions</Button>}{wizardStep === 4 && <Button disabled={saving} onClick={generate}>Generate Sessions</Button>}</DialogFooter>
      </div>}</DialogContent></Dialog>
    </div>
  );
}
