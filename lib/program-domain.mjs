export const PROGRAM_STATUSES = Object.freeze(['draft', 'active', 'inactive', 'archived']);
export class ProgramDomainError extends Error { constructor(message, status = 422) { super(message); this.name = 'ProgramDomainError'; this.status = status; } }
const forbiddenProgramFields = ['fee_amount','credits','sessions','terms','capacity','start_date','end_date','teacher_id','teacher_ids','batch','cohort','schedule'];

export function assertProgramStatus(status) {
  if (!PROGRAM_STATUSES.includes(status)) throw new ProgramDomainError(`Invalid program status: ${status}`);
  return status;
}
export function assertProgramPayload(input) {
  for (const field of forbiddenProgramFields) if (Object.hasOwn(input, field)) throw new ProgramDomainError(`Program must not contain ${field}`);
  if (!String(input.name || '').trim()) throw new ProgramDomainError('Program name is required');
}
function history(type, actorId, now, details = {}) { return { type, changed_by: actorId, changed_at: now, ...details }; }
export function createAcademicProgram({ id, organizationId, input, actorId, now }) {
  assertProgramPayload(input); assertProgramStatus(input.status || 'draft');
  return { id, organization_id: organizationId, name: input.name.trim(), description: String(input.description || ''), age_group: String(input.age_group || ''), status: input.status || 'draft', metadata: input.metadata && typeof input.metadata === 'object' ? input.metadata : {}, created_at: now, updated_at: now, change_history: [history('created', actorId, now)] };
}
export function updateAcademicProgram(program, { input, actorId, now }) {
  assertProgramPayload({ ...program, ...input }); const allowed = ['name','description','age_group','metadata']; const changes = Object.fromEntries(allowed.filter(k => Object.hasOwn(input,k)).map(k => [k, input[k]]));
  return { ...program, ...changes, name: changes.name ? String(changes.name).trim() : program.name, updated_at: now, change_history: [...(program.change_history || []), history('updated', actorId, now, { fields: Object.keys(changes) })] };
}
export function createProgramOffering({ id, organizationId, input, actorId, now }) {
  if (!input.program_id || !input.academic_year || !input.start_date || !input.end_date) throw new ProgramDomainError('program_id, academic_year, start_date, and end_date are required');
  if (input.start_date > input.end_date) throw new ProgramDomainError('start_date must not be after end_date');
  assertProgramStatus(input.status || 'draft');
  return { id, organization_id: organizationId, program_id: input.program_id, academic_year: String(input.academic_year), cohort: String(input.cohort || ''), start_date: input.start_date, end_date: input.end_date, capacity: Number.isInteger(Number(input.capacity)) && Number(input.capacity) >= 0 ? Number(input.capacity) : 0, schedule: input.schedule && typeof input.schedule === 'object' ? input.schedule : {}, status: input.status || 'draft', metadata: input.metadata && typeof input.metadata === 'object' ? input.metadata : {}, created_at: now, updated_at: now, change_history: [history('created', actorId, now)] };
}
export function updateProgramOffering(offering, { input, actorId, now }) {
  const allowed = ['academic_year','cohort','start_date','end_date','capacity','schedule','metadata']; const changes = Object.fromEntries(allowed.filter(k => Object.hasOwn(input,k)).map(k => [k,input[k]]));
  if ((changes.start_date || offering.start_date) > (changes.end_date || offering.end_date)) throw new ProgramDomainError('start_date must not be after end_date');
  return { ...offering, ...changes, updated_at: now, change_history: [...(offering.change_history || []), history('updated', actorId, now, { fields: Object.keys(changes) })] };
}
export function transitionProgramEntity(entity, { status, actorId, now }) {
  assertProgramStatus(status); if (entity.status === 'archived' && status !== 'inactive') throw new ProgramDomainError('Archived records can only be restored to inactive');
  if (entity.status === status) throw new ProgramDomainError('Status is unchanged');
  return { ...entity, status, updated_at: now, change_history: [...(entity.change_history || []), history('status_changed', actorId, now, { from_status: entity.status, to_status: status })] };
}