export const PROGRAM_STATUSES = Object.freeze(['draft', 'active', 'inactive', 'archived']);

export class ProgramDomainError extends Error {
  constructor(message, status = 422) { super(message); this.name = 'ProgramDomainError'; this.status = status; }
}

const forbiddenProgramFields = ['fee_amount', 'credits', 'sessions', 'terms', 'capacity', 'start_date', 'end_date', 'teacher_id', 'teacher_ids', 'batch', 'cohort', 'schedule'];
const own = (object, key) => Object.prototype.hasOwnProperty.call(object, key);
const history = (type, actorId, now, details = {}) => ({ type, changed_by: actorId, changed_at: now, ...details });

function requiredText(value, field) {
  const text = String(value || '').trim();
  if (!text) throw new ProgramDomainError(field + ' is required');
  return text;
}
function validDate(value, field) {
  const text = requiredText(value, field);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text) || Number.isNaN(Date.parse(text + 'T00:00:00.000Z'))) throw new ProgramDomainError(field + ' must be YYYY-MM-DD');
  return text;
}
function objectValue(value, field) {
  if (value == null) return {};
  if (typeof value !== 'object' || Array.isArray(value)) throw new ProgramDomainError(field + ' must be an object');
  return value;
}
function capacityValue(value) {
  if (value == null || value === '') return 0;
  const capacity = Number(value);
  if (!Number.isInteger(capacity) || capacity < 0) throw new ProgramDomainError('capacity must be a non-negative integer');
  return capacity;
}

export function assertProgramStatus(status) {
  if (!PROGRAM_STATUSES.includes(status)) throw new ProgramDomainError('Invalid program status: ' + status);
  return status;
}
export function assertProgramPayload(input) {
  for (const field of forbiddenProgramFields) if (own(input, field)) throw new ProgramDomainError('Program must not contain ' + field);
  requiredText(input.name, 'Program name');
}
export function createAcademicProgram({ id, organizationId, input, actorId, now }) {
  assertProgramPayload(input);
  return { id, organization_id: organizationId, name: requiredText(input.name, 'Program name'), description: String(input.description || '').trim(), age_group: String(input.age_group || '').trim(), status: assertProgramStatus(input.status || 'draft'), metadata: objectValue(input.metadata, 'metadata'), created_at: now, updated_at: now, change_history: [history('created', actorId, now)] };
}
export function updateAcademicProgram(program, { input, actorId, now }) {
  assertProgramPayload({ ...program, ...input });
  const allowed = ['name', 'description', 'age_group', 'metadata'];
  const changes = Object.fromEntries(allowed.filter((key) => own(input, key)).map((key) => [key, input[key]]));
  if (own(changes, 'name')) changes.name = requiredText(changes.name, 'Program name');
  if (own(changes, 'description')) changes.description = String(changes.description || '').trim();
  if (own(changes, 'age_group')) changes.age_group = String(changes.age_group || '').trim();
  if (own(changes, 'metadata')) changes.metadata = objectValue(changes.metadata, 'metadata');
  return { ...program, ...changes, updated_at: now, change_history: [...(program.change_history || []), history('updated', actorId, now, { fields: Object.keys(changes) })] };
}
export function createProgramOffering({ id, organizationId, input, actorId, now }) {
  const startDate = validDate(input.start_date, 'start_date');
  const endDate = validDate(input.end_date, 'end_date');
  if (startDate > endDate) throw new ProgramDomainError('start_date must not be after end_date');
  return { id, organization_id: organizationId, program_id: requiredText(input.program_id, 'program_id'), academic_year: requiredText(input.academic_year, 'academic_year'), cohort: String(input.cohort || '').trim(), start_date: startDate, end_date: endDate, capacity: capacityValue(input.capacity), schedule: objectValue(input.schedule, 'schedule'), status: assertProgramStatus(input.status || 'draft'), metadata: objectValue(input.metadata, 'metadata'), created_at: now, updated_at: now, change_history: [history('created', actorId, now)] };
}
export function updateProgramOffering(offering, { input, actorId, now }) {
  const allowed = ['academic_year', 'cohort', 'start_date', 'end_date', 'capacity', 'schedule', 'metadata'];
  const changes = Object.fromEntries(allowed.filter((key) => own(input, key)).map((key) => [key, input[key]]));
  if (own(changes, 'academic_year')) changes.academic_year = requiredText(changes.academic_year, 'academic_year');
  if (own(changes, 'cohort')) changes.cohort = String(changes.cohort || '').trim();
  if (own(changes, 'start_date')) changes.start_date = validDate(changes.start_date, 'start_date');
  if (own(changes, 'end_date')) changes.end_date = validDate(changes.end_date, 'end_date');
  if (own(changes, 'capacity')) changes.capacity = capacityValue(changes.capacity);
  if (own(changes, 'schedule')) changes.schedule = objectValue(changes.schedule, 'schedule');
  if (own(changes, 'metadata')) changes.metadata = objectValue(changes.metadata, 'metadata');
  if ((changes.start_date || offering.start_date) > (changes.end_date || offering.end_date)) throw new ProgramDomainError('start_date must not be after end_date');
  return { ...offering, ...changes, updated_at: now, change_history: [...(offering.change_history || []), history('updated', actorId, now, { fields: Object.keys(changes) })] };
}
export function transitionProgramEntity(entity, { status, actorId, now }) {
  assertProgramStatus(status);
  if (entity.status === 'archived' && status !== 'inactive') throw new ProgramDomainError('Archived records can only be restored to inactive');
  if (entity.status === status) throw new ProgramDomainError('Status is unchanged');
  return { ...entity, status, updated_at: now, change_history: [...(entity.change_history || []), history('status_changed', actorId, now, { from_status: entity.status, to_status: status })] };
}
