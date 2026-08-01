'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Download, FileText, RefreshCw, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

const statusOptions = [
  ['all', 'All statuses'],
  ['active', 'Active'],
  ['pending', 'Pending'],
  ['paused', 'Paused'],
  ['completed', 'Completed'],
  ['inactive', 'Inactive'],
  ['archived', 'Archived'],
];

function csvValue(value) {
  return '"' + String(value ?? '').replaceAll('"', '""') + '"';
}

export default function MemberMembershipReports() {
  const [report, setReport] = useState('members');
  const [status, setStatus] = useState('all');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [state, setState] = useState({ loading: false, error: '', data: null });

  const load = useCallback(async (cursor = null) => {
    setState((current) => ({ ...current, loading: true, error: '' }));
    const params = new URLSearchParams({ page_size: '50', sort: 'created_at', direction: 'desc' });
    if (status !== 'all') params.set('status', status);
    if (from) params.set('from', from);
    if (to) params.set('to', to);
    if (cursor) params.set('cursor', cursor);

    try {
      const token = typeof window === 'undefined' ? null : localStorage.getItem('g360_token');
      const response = await fetch('/api/reports/' + report + '?' + params.toString(), {
        headers: token ? { Authorization: 'Bearer ' + token } : {},
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.error?.message || body.error || 'Unable to load report');
      setState({ loading: false, error: '', data: body });
    } catch (error) {
      setState({ loading: false, error: error.message, data: null });
    }
  }, [from, report, status, to]);

  useEffect(() => { load(); }, [load]);

  const rows = state.data?.items || [];
  const headers = report === 'members'
    ? ['Member ID', 'Name', 'Status', 'Memberships', 'Active memberships', 'Created']
    : ['Membership ID', 'Student', 'Status', 'Participations', 'Active participations', 'Created'];

  const csvRows = useMemo(() => {
    if (!rows.length) return '';
    return [headers, ...rows.map((row) => report === 'members'
      ? [row.student_id || row.id, [row.first_name, row.last_name].filter(Boolean).join(' '), row.status, row.membership_count, row.active_membership_count, row.created_at]
      : [row.id, [row.student?.first_name, row.student?.last_name].filter(Boolean).join(' '), row.status, row.participation_count, row.active_participation_count, row.created_at],
    )].map((line) => line.map(csvValue).join(',')).join('\n');
  }, [headers, report, rows]);

  const downloadCsv = () => {
    if (!csvRows) return;
    const blob = new Blob([csvRows], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = report + '-report.csv';
    anchor.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground"><FileText size={15} /> Reporting</div>
        <h1 className="text-3xl font-bold tracking-tight mt-1">Members & Membership Reports</h1>
        <p className="text-muted-foreground mt-1">Organization-scoped read-only views of canonical member and membership data.</p>
      </div>

      <Card className="glass">
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Users size={18} /> Report filters</CardTitle>
          <CardDescription>Filters apply to the selected report and never change your organization scope.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap items-end gap-3">
          <div className="space-y-1.5"><Label>Status</Label><Select value={status} onValueChange={setStatus}><SelectTrigger className="w-44"><SelectValue /></SelectTrigger><SelectContent>{statusOptions.map(([value, label]) => <SelectItem value={value} key={value}>{label}</SelectItem>)}</SelectContent></Select></div>
          <div className="space-y-1.5"><Label htmlFor="members-report-from">From</Label><Input id="members-report-from" type="date" value={from} onChange={(event) => setFrom(event.target.value)} /></div>
          <div className="space-y-1.5"><Label htmlFor="members-report-to">To</Label><Input id="members-report-to" type="date" value={to} onChange={(event) => setTo(event.target.value)} /></div>
          <Button variant="outline" onClick={() => load()} disabled={state.loading}><RefreshCw size={15} className="mr-1" /> Refresh</Button>
          <Button variant="outline" onClick={downloadCsv} disabled={!rows.length}><Download size={15} className="mr-1" /> Export current page</Button>
        </CardContent>
      </Card>

      <Tabs value={report} onValueChange={(value) => { setReport(value); setState({ loading: false, error: '', data: null }); }}>
        <TabsList><TabsTrigger value="members">Members</TabsTrigger><TabsTrigger value="memberships">Memberships</TabsTrigger></TabsList>
        <TabsContent value="members"><ReportTable report={report} rows={rows} headers={headers} loading={state.loading} error={state.error} /></TabsContent>
        <TabsContent value="memberships"><ReportTable report={report} rows={rows} headers={headers} loading={state.loading} error={state.error} /></TabsContent>
      </Tabs>

      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>{state.data?.summary?.total ?? 0} total records</span>
        <Button variant="ghost" onClick={() => load(state.data?.page?.next_cursor)} disabled={!state.data?.page?.has_more || state.loading}>Next page</Button>
      </div>
    </div>
  );
}

function ReportTable({ report, rows, headers, loading, error }) {
  if (loading) return <Card className="glass p-6 text-muted-foreground">Loading report…</Card>;
  if (error) return <Card className="glass p-6 text-destructive">{error}</Card>;
  if (!rows.length) return <Card className="glass p-6 text-muted-foreground">No records match these filters.</Card>;
  return (
    <Card className="glass overflow-hidden">
      <Table>
        <TableHeader><TableRow>{headers.map((header) => <TableHead key={header}>{header}</TableHead>)}</TableRow></TableHeader>
        <TableBody>{rows.map((row) => report === 'members'
          ? <TableRow key={row.id}><TableCell>{row.student_id || row.id}</TableCell><TableCell>{[row.first_name, row.last_name].filter(Boolean).join(' ') || 'Unnamed member'}</TableCell><TableCell>{row.status || '—'}</TableCell><TableCell>{row.membership_count ?? 0}</TableCell><TableCell>{row.active_membership_count ?? 0}</TableCell><TableCell>{row.created_at ? new Date(row.created_at).toLocaleDateString() : '—'}</TableCell></TableRow>
          : <TableRow key={row.id}><TableCell>{row.id}</TableCell><TableCell>{[row.student?.first_name, row.student?.last_name].filter(Boolean).join(' ') || row.student_id || 'Unknown student'}</TableCell><TableCell>{row.status || '—'}</TableCell><TableCell>{row.participation_count ?? 0}</TableCell><TableCell>{row.active_participation_count ?? 0}</TableCell><TableCell>{row.created_at ? new Date(row.created_at).toLocaleDateString() : '—'}</TableCell></TableRow>
        )}</TableBody>
      </Table>
    </Card>
  );
}
