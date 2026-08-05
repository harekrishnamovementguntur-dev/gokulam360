'use client';

import { useEffect, useMemo, useState } from 'react';
import { ClipboardCheck, History, RefreshCw, Save } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';

const STATUS_OPTIONS = [
  { value: 'present', label: 'Present' },
  { value: 'late', label: 'Late' },
  { value: 'absent', label: 'Absent' },
  { value: 'excused', label: 'Excused' },
];

const freshRead = (path) => `${path}${path.includes('?') ? '&' : '?'}attendance_refresh=${Date.now()}`;
const responseItems = (response) => {
  if (Array.isArray(response)) return response;
  if (Array.isArray(response?.items)) return response.items;
  if (Array.isArray(response?.data?.items)) return response.data.items;
  return [];
};

const labelFor = (value) => STATUS_OPTIONS.find((item) => item.value === value)?.label || 'Not marked';
const newIdempotencyKey = () => globalThis.crypto?.randomUUID?.() || String(Date.now()) + '-' + Math.random().toString(16).slice(2);
const studentName = (student) => [student?.first_name, student?.last_name].filter(Boolean).join(' ') || student?.name || student?.student_id || student?.id || 'Student';

function statusBadge(status) {
  if (!status) return <Badge variant="outline">Not marked</Badge>;
  return <Badge variant={status === 'present' ? 'default' : status === 'late' ? 'secondary' : 'outline'}>{labelFor(status)}</Badge>;
}

export default function AttendanceAdministrator({ request }) {
  const [offerings, setOfferings] = useState([]);
  const [terms, setTerms] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [participations, setParticipations] = useState([]);
  const [memberships, setMemberships] = useState([]);
  const [students, setStudents] = useState([]);
  const [records, setRecords] = useState([]);
  const [offeringId, setOfferingId] = useState('');
  const [termId, setTermId] = useState('');
  const [sessionId, setSessionId] = useState('');
  const [drafts, setDrafts] = useState({});
  const [correctionMode, setCorrectionMode] = useState({});
  const [notes, setNotes] = useState({});
  const [historyParticipationId, setHistoryParticipationId] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadingRoster, setLoadingRoster] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const selectedOffering = offerings.find((item) => item.id === offeringId);
  const selectedTerm = terms.find((item) => item.id === termId);
  const selectedSession = sessions.find((item) => item.id === sessionId);
  const membershipsById = useMemo(() => new Map(memberships.map((item) => [item.id, item])), [memberships]);
  const studentsById = useMemo(() => new Map(students.map((item) => [item.id, item])), [students]);
  const recordsByParticipation = useMemo(() => {
    const grouped = new Map();
    for (const record of records) {
      const list = grouped.get(record.membership_term_participation_id) || [];
      list.push(record);
      grouped.set(record.membership_term_participation_id, list.sort((a, b) => (b.revision || 0) - (a.revision || 0)));
    }
    return grouped;
  }, [records]);
  const currentRecords = useMemo(() => new Map(
    Array.from(recordsByParticipation.entries()).map(([id, list]) => [id, list[0]]),
  ), [recordsByParticipation]);
  const historyRecords = recordsByParticipation.get(historyParticipationId) || [];

  const loadBase = async () => {
    setLoading(true);
    setError('');
    try {
      // Calendar data is required to open Attendance. Roster metadata is
      // supplementary and must not prevent the Offering/Term selectors from loading.
      const [offeringResult, termResult, membershipResult, studentResult] = await Promise.allSettled([
        request('/program-offerings'),
        request('/academic-terms'),
        request('/memberships'),
        request('/students'),
      ]);
      if (offeringResult.status === 'rejected') throw offeringResult.reason;
      if (termResult.status === 'rejected') throw termResult.reason;

      const offeringItems = responseItems(offeringResult.value);
      const termItems = responseItems(termResult.value);
      setOfferings(offeringItems.filter((item) => item.status !== 'archived'));
      setTerms(termItems.filter((item) => item.status !== 'archived'));
      setMemberships(membershipResult.status === 'fulfilled' ? responseItems(membershipResult.value) : []);
      setStudents(studentResult.status === 'fulfilled' ? responseItems(studentResult.value) : []);

      const optionalFailure = [membershipResult, studentResult].find((result) => result.status === 'rejected');
      if (optionalFailure) setError(optionalFailure.reason?.message || 'Roster details could not be loaded.');
    } catch (loadError) {
      setError(loadError.message || 'Attendance setup could not be loaded.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadBase(); }, []);

  useEffect(() => {
    setTermId('');
    setSessionId('');
    setSessions([]);
    setParticipations([]);
    setRecords([]);
    if (!offeringId) return;
  }, [offeringId]);

  useEffect(() => {
    if (!termId) return;
    setLoadingRoster(true);
    setError('');
    Promise.all([
      request(freshRead('/academic-sessions?term_id=' + encodeURIComponent(termId))),
      request(freshRead('/membership-term-participations?term_id=' + encodeURIComponent(termId) + '&status=active')),
    ]).then(([sessionResponse, participationResponse]) => {
      setSessions(responseItems(sessionResponse).filter((item) => item.program_offering_id === offeringId || !item.program_offering_id));
      setParticipations(responseItems(participationResponse));
      setSessionId('');
      setRecords([]);
    }).catch((loadError) => setError(loadError.message))
      .finally(() => setLoadingRoster(false));
  }, [termId, offeringId]);

  useEffect(() => {
    if (!sessionId) {
      setRecords([]);
      setDrafts({});
      setNotes({});
      setCorrectionMode({});
      return;
    }
    setLoadingRoster(true);
    setError('');
    request(freshRead('/attendance-records?session_id=' + encodeURIComponent(sessionId)))
      .then((response) => {
        const nextRecords = responseItems(response);
        setRecords(nextRecords);
        const latest = new Map();
        const nextNotes = {};
        for (const record of nextRecords) {
          const current = latest.get(record.membership_term_participation_id);
          if (!current || (record.revision || 0) > (current.revision || 0)) latest.set(record.membership_term_participation_id, record);
        }
        for (const [participationId, record] of latest) nextNotes[participationId] = record.notes || '';
        setDrafts(Object.fromEntries(Array.from(latest.entries()).filter(([, value]) => value.status).map(([id, value]) => [id, value.status])));
        setNotes(nextNotes);
      })
      .catch((loadError) => setError(loadError.message))
      .finally(() => setLoadingRoster(false));
  }, [sessionId]);

  const saveAttendance = async () => {
    if (!selectedSession || ['holiday', 'cancelled'].includes(selectedSession.status)) {
      toast.error('Attendance cannot be recorded for a Holiday or Cancelled Session');
      return;
    }
    const changes = participations.filter((participation) => {
      const nextStatus = drafts[participation.id];
      const currentStatus = currentRecords.get(participation.id)?.status || '';
      return nextStatus && nextStatus !== currentStatus && (!currentRecords.get(participation.id) || correctionMode[participation.id]);
    });
    if (!changes.length) {
      toast.info('There are no attendance changes to save');
      return;
    }
    setSaving(true);
    setError('');
    try {
      for (const participation of changes) {
        const current = currentRecords.get(participation.id);
        const path = current ? '/attendance-records/' + current.id + '/correction' : '/attendance-records';
        await request(path, {
          method: 'POST',
          headers: { 'Idempotency-Key': newIdempotencyKey() },
          body: JSON.stringify({
            session_id: selectedSession.id,
            membership_term_participation_id: participation.id,
            status: drafts[participation.id],
            notes: notes[participation.id] || '',
          }),
        });
      }
      const response = await request('/attendance-records?session_id=' + encodeURIComponent(sessionId));
      setRecords(responseItems(response));
      setCorrectionMode({});
      toast.success(String(changes.length) + ' attendance ' + (changes.length === 1 ? 'record' : 'records') + ' saved');
    } catch (saveError) {
      setError(saveError.message);
      toast.error(saveError.message);
    } finally {
      setSaving(false);
    }
  };

  const statusChange = (participationId, value) => setDrafts((current) => ({ ...current, [participationId]: value === 'none' ? '' : value }));
  const filteredTerms = terms.filter((term) => term.program_offering_id === offeringId);
  const activeParticipations = participations.filter((item) => item.status === 'active');
  const isBlockedSession = selectedSession && ['holiday', 'cancelled'].includes(selectedSession.status);

  if (loading) return <div className="rounded-2xl glass p-8 text-center text-muted-foreground">Loading Attendance setup…</div>;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex-1">
          <h1 className="text-2xl font-bold">Attendance</h1>
          <p className="text-sm text-muted-foreground">Record canonical Attendance for a Session and its active Membership Participations.</p>
        </div>
        <Button variant="outline" onClick={loadBase} disabled={loading}><RefreshCw size={15} className="mr-1" />Refresh setup</Button>
      </div>

      {error && <div role="alert" className="rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">{error}</div>}

      <div className="grid gap-3 rounded-2xl glass p-4 md:grid-cols-3">
        <div>
          <Label>Program Offering</Label>
          <Select value={offeringId || 'none'} onValueChange={(value) => setOfferingId(value === 'none' ? '' : value)}>
            <SelectTrigger className="mt-1"><SelectValue placeholder="Choose a Program Offering" /></SelectTrigger>
            <SelectContent><SelectItem value="none">Choose a Program Offering</SelectItem>{offerings.map((offering) => <SelectItem key={offering.id} value={offering.id}>{offering.academic_year || offering.name || offering.id}{offering.cohort ? ' · ' + offering.cohort : ''}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div>
          <Label>Term</Label>
          <Select value={termId || 'none'} onValueChange={(value) => setTermId(value === 'none' ? '' : value)} disabled={!offeringId}>
            <SelectTrigger className="mt-1"><SelectValue placeholder="Choose a Term" /></SelectTrigger>
            <SelectContent><SelectItem value="none">Choose a Term</SelectItem>{filteredTerms.map((term) => <SelectItem key={term.id} value={term.id}>{term.name} · {term.start_date} → {term.end_date}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div>
          <Label>Session</Label>
          <Select value={sessionId || 'none'} onValueChange={(value) => setSessionId(value === 'none' ? '' : value)} disabled={!termId || loadingRoster}>
            <SelectTrigger className="mt-1"><SelectValue placeholder="Choose a Session" /></SelectTrigger>
            <SelectContent><SelectItem value="none">Choose a Session</SelectItem>{sessions.map((session) => <SelectItem key={session.id} value={session.id}>#{session.session_number} · {session.date} · {session.status}</SelectItem>)}</SelectContent>
          </Select>
        </div>
      </div>

      {selectedSession && <div className="rounded-2xl glass p-4">
        <div className="flex flex-wrap items-center gap-2">
          <ClipboardCheck size={18} className="text-primary" />
          <div className="font-semibold">Session #{selectedSession.session_number} · {selectedSession.date}</div>
          <Badge variant={isBlockedSession ? 'destructive' : 'secondary'} className="capitalize">{selectedSession.status}</Badge>
          <span className="text-sm text-muted-foreground">{selectedSession.start_time}–{selectedSession.end_time}</span>
        </div>
        {isBlockedSession && <p className="mt-2 text-sm text-destructive">This Session is {selectedSession.status}; attendance and credits are never recorded.</p>}
      </div>}

      {termId && !loadingRoster && !activeParticipations.length && <div className="rounded-2xl glass p-8 text-center text-muted-foreground">No active Membership Term Participations exist for this Term.</div>}

      {sessionId && activeParticipations.length > 0 && <div className="overflow-hidden rounded-2xl glass">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b p-4">
          <div><h2 className="font-semibold">Attendance grid</h2><p className="text-xs text-muted-foreground">{activeParticipations.length} active Participations · changes are saved as immutable records</p></div>
          <Button onClick={saveAttendance} disabled={saving || isBlockedSession}><Save size={15} className="mr-1" />{saving ? 'Saving…' : 'Save attendance'}</Button>
        </div>
        <div className="divide-y">
          {activeParticipations.map((participation) => {
            const membership = membershipsById.get(participation.membership_id);
            const student = studentsById.get(membership?.student_id);
            const current = currentRecords.get(participation.id);
            const history = recordsByParticipation.get(participation.id) || [];
            return <div key={participation.id} className="grid gap-3 p-4 md:grid-cols-[1.3fr_1fr_1fr_auto] md:items-center">
              <div><div className="font-medium">{studentName(student)}</div><div className="text-xs text-muted-foreground">{participation.membership_id}</div></div>
              <div>{statusBadge(current?.status)}{current && <div className="mt-1 text-xs text-muted-foreground">Revision {current.revision || 1}</div>}</div>
              <div className="flex items-center gap-2">
                <Select value={drafts[participation.id] || 'none'} onValueChange={(value) => statusChange(participation.id, value)} disabled={saving || current?.event_type === 'voided' || Boolean(current && !correctionMode[participation.id])}>
                  <SelectTrigger aria-label={'Set attendance for ' + studentName(student)}><SelectValue placeholder="Set status" /></SelectTrigger>
                  <SelectContent><SelectItem value="none">Choose status</SelectItem>{STATUS_OPTIONS.map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}</SelectContent>
                </Select>
                {current && current.event_type !== 'voided' && <Button type="button" size="sm" variant={correctionMode[participation.id] ? 'secondary' : 'outline'} onClick={() => setCorrectionMode((value) => ({ ...value, [participation.id]: !value[participation.id] }))}>{correctionMode[participation.id] ? 'Editing correction' : 'Correct'}</Button>}
              </div>
              <Button variant="ghost" size="icon" aria-label={'View history for ' + studentName(student)} onClick={() => setHistoryParticipationId(participation.id)}><History size={16} /></Button>
              <Textarea className="md:col-span-4" rows={1} value={notes[participation.id] || ''} onChange={(event) => setNotes((currentNotes) => ({ ...currentNotes, [participation.id]: event.target.value }))} placeholder="Optional attendance note" />
              {history.length > 1 && <div className="md:col-span-4 text-xs text-muted-foreground">{history.length} immutable history entries</div>}
            </div>;
          })}
        </div>
      </div>}

      {historyParticipationId && <div className="rounded-2xl glass p-4">
        <div className="mb-3 flex items-center justify-between"><div><h2 className="font-semibold">Correction history</h2><p className="text-xs text-muted-foreground">Previous Attendance Records remain unchanged.</p></div><Button variant="ghost" onClick={() => setHistoryParticipationId('')}>Close</Button></div>
        <div className="space-y-2">{historyRecords.map((record) => <div key={record.id} className="rounded-lg border p-3 text-sm"><div className="flex flex-wrap justify-between gap-2"><span className="font-medium capitalize">{record.event_type} · {record.status || 'voided'}</span><span className="text-xs text-muted-foreground">Revision {record.revision || 1}</span></div><div className="mt-1 text-xs text-muted-foreground">{record.recorded_at} · {record.notes || 'No note'}</div>{record.supersedes_record_id && <div className="mt-1 text-xs">Supersedes {record.supersedes_record_id}</div>}</div>)}</div>
      </div>}

      {!offeringId && <div className="rounded-2xl glass p-10 text-center text-muted-foreground">Choose a Program Offering, Term, and Session to begin.</div>}
    </div>
  );
}
