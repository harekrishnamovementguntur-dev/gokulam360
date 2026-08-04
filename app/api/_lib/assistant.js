const STATUS_LABELS = { present: 'Present', late: 'Late', absent: 'Absent', excused: 'Excused' };

export function classifyAssistantQuestion(question = '') {
  const text = String(question).trim().toLowerCase();
  if (!text) return { intent: 'summary' };
  if (/(phone|mobile|contact).*(absent|absence)|(absent|absence).*(phone|mobile|contact)/.test(text)) return { intent: 'absent_contacts' };
  if (/(absent|absence)/.test(text)) return { intent: 'attendance_status', status: 'absent' };
  if (/how many.*present|present.*(count|how many)/.test(text)) return { intent: 'attendance_status', status: 'present' };
  if (/(late|tardy)/.test(text)) return { intent: 'attendance_status', status: 'late' };
  if (/excused/.test(text)) return { intent: 'attendance_status', status: 'excused' };
  if (/(due|outstanding|pending).*(payment|fee)|payment.*(due|pending|outstanding)/.test(text)) return { intent: 'payments_due' };
  if (/(upcoming|next).*(session|class)/.test(text) || /sessions?.*next/.test(text)) return { intent: 'upcoming_sessions' };
  return { intent: 'summary' };
}

export function statusLabel(status) {
  return STATUS_LABELS[String(status || '').toLowerCase()] || String(status || 'Unknown');
}

export function formatCurrencyMinor(amountMinor, currency = 'INR') {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency, maximumFractionDigits: 0 }).format((Number(amountMinor) || 0) / 100);
}
