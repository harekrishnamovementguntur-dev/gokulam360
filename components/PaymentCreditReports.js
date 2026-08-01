'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Download, FileText, RefreshCw, Wallet } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

const paymentStatuses = [
  ['all', 'All statuses'], ['draft', 'Draft'], ['posted', 'Posted'],
  ['partially_refunded', 'Partially refunded'], ['refunded', 'Refunded'], ['voided', 'Voided'],
];
const ledgerReasons = [
  ['all', 'All reasons'], ['credit_purchase', 'Credit purchase'],
  ['manual_adjustment', 'Manual adjustment'], ['refund_reversal', 'Refund reversal'],
  ['attendance_consumption', 'Attendance consumption'], ['attendance_correction', 'Attendance correction'],
];

function csvValue(value) {
  return '"' + String(value ?? '').replaceAll('"', '""') + '"';
}
function money(minor, currency = 'INR') {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency, maximumFractionDigits: 2 }).format((minor || 0) / 100);
}

export default function PaymentCreditReports() {
  const [report, setReport] = useState('payments');
  const [status, setStatus] = useState('all');
  const [reason, setReason] = useState('all');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [state, setState] = useState({ loading: false, error: '', data: null });

  const load = useCallback(async (cursor = null) => {
    setState((current) => ({ ...current, loading: true, error: '' }));
    const params = new URLSearchParams({ page_size: '50', sort: report === 'ledger' ? 'effective_at' : 'created_at', direction: 'desc' });
    if (report === 'payments' && status !== 'all') params.set('status', status);
    if (report === 'ledger' && reason !== 'all') params.set('reason_code', reason);
    if (from) params.set('from', from);
    if (to) params.set('to', to);
    if (cursor) params.set('cursor', cursor);

    try {
      const token = typeof window === 'undefined' ? null : localStorage.getItem('g360_token');
      const response = await fetch('/api/reports/' + report + '?' + params.toString(), {
        headers: token ? { Authorization: 'Bearer ' + token } : {},
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.error?.message || body.error || 'Unable to load financial report');
      setState({ loading: false, error: '', data: body });
    } catch (error) {
      setState({ loading: false, error: error.message, data: null });
    }
  }, [from, reason, report, status, to]);

  useEffect(() => { load(); }, [load]);

  const rows = state.data?.items || [];
  const headers = report === 'payments'
    ? ['Receipt', 'Kind', 'Status', 'Amount', 'Allocations', 'Credits', 'Created']
    : ['Entry', 'Membership', 'Delta', 'Reason', 'Source', 'Current balance', 'Effective'];

  const csvRows = useMemo(() => {
    if (!rows.length) return '';
    return [headers, ...rows.map((row) => report === 'payments'
      ? [row.receipt_number, row.kind, row.status, money(row.amount_minor, row.currency), row.allocation_count, row.allocated_credit_quantity, row.created_at]
      : [row.id, row.membership_id, row.quantity_delta, row.reason_code, row.source_type + ':' + row.source_id, row.membership_balance, row.effective_at],
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
        <h1 className="text-3xl font-bold tracking-tight mt-1">Payments & Credit Ledger Reports</h1>
        <p className="text-muted-foreground mt-1">Organization-scoped financial read models. Balances are calculated from immutable ledger entries.</p>
      </div>

      <Card className="glass">
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Wallet size={18} /> Report filters</CardTitle>
          <CardDescription>Financial reports are available to organization administrators and never accept a client organization scope.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap items-end gap-3">
          {report === 'payments'
            ? <div className="space-y-1.5"><Label>Status</Label><Select value={status} onValueChange={setStatus}><SelectTrigger className="w-48"><SelectValue /></SelectTrigger><SelectContent>{paymentStatuses.map(([value, label]) => <SelectItem value={value} key={value}>{label}</SelectItem>)}</SelectContent></Select></div>
            : <div className="space-y-1.5"><Label>Ledger reason</Label><Select value={reason} onValueChange={setReason}><SelectTrigger className="w-52"><SelectValue /></SelectTrigger><SelectContent>{ledgerReasons.map(([value, label]) => <SelectItem value={value} key={value}>{label}</SelectItem>)}</SelectContent></Select></div>}
          <div className="space-y-1.5"><Label htmlFor="finance-report-from">From</Label><Input id="finance-report-from" type="date" value={from} onChange={(event) => setFrom(event.target.value)} /></div>
          <div className="space-y-1.5"><Label htmlFor="finance-report-to">To</Label><Input id="finance-report-to" type="date" value={to} onChange={(event) => setTo(event.target.value)} /></div>
          <Button variant="outline" onClick={() => load()} disabled={state.loading}><RefreshCw size={15} className="mr-1" /> Refresh</Button>
          <Button variant="outline" onClick={downloadCsv} disabled={!rows.length}><Download size={15} className="mr-1" /> Export current page</Button>
        </CardContent>
      </Card>

      <Tabs value={report} onValueChange={(value) => { setReport(value); setState({ loading: false, error: '', data: null }); }}>
        <TabsList><TabsTrigger value="payments">Payments</TabsTrigger><TabsTrigger value="ledger">Credit Ledger</TabsTrigger></TabsList>
        <TabsContent value="payments"><FinanceTable report={report} rows={rows} headers={headers} loading={state.loading} error={state.error} /></TabsContent>
        <TabsContent value="ledger"><FinanceTable report={report} rows={rows} headers={headers} loading={state.loading} error={state.error} /></TabsContent>
      </Tabs>

      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>{state.data?.summary?.total ?? 0} total records</span>
        <Button variant="ghost" onClick={() => load(state.data?.page?.next_cursor)} disabled={!state.data?.page?.has_more || state.loading}>Next page</Button>
      </div>
    </div>
  );
}

function FinanceTable({ report, rows, headers, loading, error }) {
  if (loading) return <Card className="glass p-6 text-muted-foreground">Loading report…</Card>;
  if (error) return <Card className="glass p-6 text-destructive">{error}</Card>;
  if (!rows.length) return <Card className="glass p-6 text-muted-foreground">No records match these filters.</Card>;
  return (
    <Card className="glass overflow-hidden">
      <Table>
        <TableHeader><TableRow>{headers.map((header) => <TableHead key={header}>{header}</TableHead>)}</TableRow></TableHeader>
        <TableBody>{rows.map((row) => report === 'payments'
          ? <TableRow key={row.id}><TableCell className="font-mono">{row.receipt_number || row.id}</TableCell><TableCell>{row.kind || 'payment'}</TableCell><TableCell>{row.status}</TableCell><TableCell>{money(row.amount_minor, row.currency)}</TableCell><TableCell>{row.allocation_count ?? 0}</TableCell><TableCell>{row.allocated_credit_quantity ?? 0}</TableCell><TableCell>{row.created_at ? new Date(row.created_at).toLocaleDateString() : '—'}</TableCell></TableRow>
          : <TableRow key={row.id}><TableCell className="font-mono">{row.id}</TableCell><TableCell>{row.membership_id}</TableCell><TableCell className={row.quantity_delta < 0 ? 'text-destructive' : 'text-emerald-600'}>{row.quantity_delta > 0 ? '+' : ''}{row.quantity_delta}</TableCell><TableCell>{row.reason_code}</TableCell><TableCell>{row.source_type}</TableCell><TableCell>{row.membership_balance}</TableCell><TableCell>{row.effective_at ? new Date(row.effective_at).toLocaleDateString() : '—'}</TableCell></TableRow>
        )}</TableBody>
      </Table>
    </Card>
  );
}
