export const TERM_STATUSES = Object.freeze(['draft', 'active', 'inactive', 'archived']);
export const SESSION_STATUSES = Object.freeze(['scheduled', 'completed', 'cancelled', 'rescheduled', 'holiday', 'archived']);
export const SESSION_SOURCES = Object.freeze(['generated', 'manual']);

export class AcademicCalendarError extends Error {
  constructor(message, status = 422) { super(message); this.name = 'AcademicCalendarError'; this.status = status; }
}

const own = (object, key) => Object.prototype.hasOwnProperty.call(object, key);
const history = (type, actorId, now, details = {}) => ({ type, changed_by: actorId, changed_at: now, ...details });

function text(value, field) {
  const result = String(value ?? '').trim();
  if (!result) throw new AcademicCalendarError(field + ' is required');
  return result;
}
export function date(value, field) {
  const result = text(value, field);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(result) || Number.isNaN(Date.parse(result + 'T00:00:00.000Z'))) {
    throw new AcademicCalendarError(field + ' must be YYYY-MM-DD');
  }
  return result;
}
function time(value, field, optional = false) {
  if ((value == null || value === '') && optional) return '';
  const result = text(value, field);
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(result)) throw new AcademicCalendarError(field + ' must be HH:mm');
  return result;
}
function status(value, values, field) {
  if (!values.includes(value)) throw new AcademicCalendarError('Invalid ' + field + ': ' + value);
  return value;
}
function arrayOfDates(value, field) {
  if (value == null) return [];
  if (!Array.isArray(value)) throw new AcademicCalendarError(field + ' must be an array');
  return [...new Set(value.map((item) => date(item, field)))].sort();
}
function weekdays(value) {
  if (!Array.isArray(value) || value.length === 0) throw new AcademicCalendarError('At least one weekday is required');
  const result = [...new Set(value.map(Number))];
  if (result.some((item) => !Number.isInteger(item) || item < 0 || item > 6)) throw new AcademicCalendarError('weekdays must contain values from 0 to 6');
  return result.sort((a, b) => a - b);
}
function holidayDates(value) {
  if (value == null) return [];
  if (!Array.isArray(value)) throw new AcademicCalendarError('holiday_dates must be an array');
  const seen = new Set();
  return value.map((item) => {
    const holiday = typeof item === 'string' ? { date: item, reason: '' } : item || {};
    const result = { date: date(holiday.date, 'holiday date'), reason: String(holiday.reason || '').trim() };
    if (seen.has(result.date)) throw new AcademicCalendarError('Duplicate holiday date: ' + result.date);
    seen.add(result.date);
    return result;
  }).sort((a, b) => a.date.localeCompare(b.date));
}
function notes(value) {
  return String(value || '').trim();
}
function positiveInteger(value, field) {
  const result = Number(value);
  if (!Number.isInteger(result) || result < 1) throw new AcademicCalendarError(field + ' must be a positive integer');
  return result;
}

export function createTerm({ id, organizationId, input, actorId, now }) {
  const startDate = date(input.start_date, 'start_date');
  const endDate = date(input.end_date, 'end_date');
  if (startDate > endDate) throw new AcademicCalendarError('start_date must not be after end_date');
  return {
    id,
    organization_id: organizationId,
    program_offering_id: text(input.program_offering_id, 'program_offering_id'),
    name: text(input.name, 'Term name'),
    display_order: Number.isInteger(Number(input.display_order)) && Number(input.display_order) > 0 ? Number(input.display_order) : 1,
    start_date: startDate,
    end_date: endDate,
    status: status(input.status || 'draft', TERM_STATUSES, 'term status'),
    created_at: now,
    updated_at: now,
    change_history: [history('created', actorId, now)],
  };
}
export function updateTerm(term, { input, actorId, now }) {
  const changes = {};
  for (const key of ['name', 'display_order', 'start_date', 'end_date']) if (own(input, key)) changes[key] = input[key];
  if (own(changes, 'name')) changes.name = text(changes.name, 'Term name');
  if (own(changes, 'display_order')) changes.display_order = positiveInteger(changes.display_order, 'display_order');
  if (own(changes, 'start_date')) changes.start_date = date(changes.start_date, 'start_date');
  if (own(changes, 'end_date')) changes.end_date = date(changes.end_date, 'end_date');
  if ((changes.start_date || term.start_date) > (changes.end_date || term.end_date)) throw new AcademicCalendarError('start_date must not be after end_date');
  if (own(input, 'program_offering_id') && input.program_offering_id !== term.program_offering_id) throw new AcademicCalendarError('program_offering_id cannot be changed after a Term is created');
  return { ...term, ...changes, updated_at: now, change_history: [...(term.change_history || []), history('updated', actorId, now, { fields: Object.keys(changes) })] };
}
export function transitionTerm(term, { status: nextStatus, actorId, now }) {
  status(nextStatus, TERM_STATUSES, 'term status');
  if (term.status === 'archived' && nextStatus !== 'inactive') throw new AcademicCalendarError('Archived Terms can only be restored to inactive');
  if (term.status === nextStatus) throw new AcademicCalendarError('Status is unchanged');
  return { ...term, status: nextStatus, updated_at: now, change_history: [...(term.change_history || []), history('status_changed', actorId, now, { from_status: term.status, to_status: nextStatus })] };
}

export function createSession({ id, organizationId, input, actorId, now, source = 'manual', sessionNumber }) {
  const sessionDate = date(input.date, 'date');
  const startTime = time(input.start_time, 'start_time');
  const endTime = time(input.end_time, 'end_time');
  if (startTime >= endTime) throw new AcademicCalendarError('start_time must be before end_time');
  return {
    id,
    organization_id: organizationId,
    term_id: text(input.term_id, 'term_id'),
    session_number: sessionNumber || positiveInteger(input.session_number, 'session_number'),
    date: sessionDate,
    start_time: startTime,
    end_time: endTime,
    status: status(input.status || 'scheduled', SESSION_STATUSES, 'session status'),
    notes: notes(input.notes),
    topic: notes(input.topic),
    reference: notes(input.reference),
    source: source === 'generated' ? 'generated' : 'manual',
    generation_key: input.generation_key || null,
    created_at: now,
    updated_at: now,
    change_history: [history('created', actorId, now, { source })],
  };
}
export function updateSession(session, { input, actorId, now }) {
  if (own(input, 'session_number') && Number(input.session_number) !== session.session_number) throw new AcademicCalendarError('session_number is immutable');
  if (own(input, 'term_id') && input.term_id !== session.term_id) throw new AcademicCalendarError('term_id cannot be changed after a Session is created');
  const changes = {};
  for (const key of ['date', 'start_time', 'end_time', 'status', 'notes', 'topic', 'reference']) if (own(input, key)) changes[key] = input[key];
  if (own(changes, 'date')) changes.date = date(changes.date, 'date');
  if (own(changes, 'start_time')) changes.start_time = time(changes.start_time, 'start_time');
  if (own(changes, 'end_time')) changes.end_time = time(changes.end_time, 'end_time');
  if (own(changes, 'status')) changes.status = status(changes.status, SESSION_STATUSES, 'session status');
  for (const key of ['notes', 'topic', 'reference']) if (own(changes, key)) changes[key] = notes(changes[key]);
  if ((changes.start_time || session.start_time) >= (changes.end_time || session.end_time)) throw new AcademicCalendarError('start_time must be before end_time');
  return { ...session, ...changes, source: 'manual', updated_at: now, change_history: [...(session.change_history || []), history('updated', actorId, now, { fields: Object.keys(changes), source: 'manual' })] };
}
export function transitionSession(session, { status: nextStatus, actorId, now, details = {} }) {
  status(nextStatus, SESSION_STATUSES, 'session status');
  if (session.status === nextStatus && !details.new_date) throw new AcademicCalendarError('Status is unchanged');
  const reschedule = details.new_date ? { date: date(details.new_date, 'new_date') } : {};
  return { ...session, ...reschedule, status: nextStatus, source: 'manual', updated_at: now, change_history: [...(session.change_history || []), history('status_changed', actorId, now, { from_status: session.status, to_status: nextStatus, ...details })] };
}

export function normalizeGenerationInput(input) {
  const startDate = date(input.start_date, 'start_date');
  const endDate = date(input.end_date, 'end_date');
  if (startDate > endDate) throw new AcademicCalendarError('start_date must not be after end_date');
  const holidays = holidayDates(input.holiday_dates);
  return {
    weekdays: weekdays(input.weekdays),
    start_date: startDate,
    end_date: endDate,
    start_time: time(input.start_time, 'start_time'),
    end_time: time(input.end_time, 'end_time'),
    excluded_dates: arrayOfDates(input.excluded_dates, 'excluded_dates'),
    holiday_dates: holidays,
  };
}
export function generationCandidates(term, input, existingSessions = []) {
  const configuration = normalizeGenerationInput(input);
  if (configuration.start_date < term.start_date || configuration.end_date > term.end_date) throw new AcademicCalendarError('Generation dates must be within the Term date range');
  const excluded = new Set(configuration.excluded_dates);
  const holidays = new Map(configuration.holiday_dates.map((item) => [item.date, item.reason]));
  const existing = new Map(existingSessions.map((session) => [session.date, session]));
  const dates = [];
  const cursor = new Date(configuration.start_date + 'T00:00:00.000Z');
  const end = new Date(configuration.end_date + 'T00:00:00.000Z');
  while (cursor <= end) {
    const iso = cursor.toISOString().slice(0, 10);
    if (configuration.weekdays.includes(cursor.getUTCDay()) && !excluded.has(iso) && !holidays.has(iso)) dates.push(iso);
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  const maxNumber = existingSessions.reduce((max, item) => Math.max(max, item.session_number || 0), 0);
  return {
    configuration,
    candidates: dates.map((sessionDate, index) => {
      const found = existing.get(sessionDate);
      return found ? { date: sessionDate, action: 'preserve', session_number: found.session_number, status: found.status, source: found.source } : { date: sessionDate, action: 'create', session_number: maxNumber + index + 1, status: 'scheduled', source: 'generated' };
    }),
    excluded: configuration.excluded_dates.map((item) => ({ date: item, reason: 'Excluded by administrator' })),
    holidays: configuration.holiday_dates,
  };
}
