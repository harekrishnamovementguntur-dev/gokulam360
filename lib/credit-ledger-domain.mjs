export const CREDIT_REASON_CODES = Object.freeze([
  'enrollment_credit',
  'credit_purchase',
  'attendance_consumption',
  'attendance_correction',
  'refund_reversal',
  'manual_adjustment',
  'credit_expiry',
  'credit_transfer',
]);

export class CreditLedgerDomainError extends Error {
  constructor(message, status = 422) {
    super(message);
    this.name = 'CreditLedgerDomainError';
    this.status = status;
  }
}

const required = (value, field) => {
  const result = String(value ?? '').trim();
  if (!result) throw new CreditLedgerDomainError(field + ' is required');
  return result;
};

export function createLedgerEntry({
  id,
  organizationId,
  membershipId,
  quantityDelta,
  reasonCode,
  description = '',
  sourceType,
  sourceId,
  actorId,
  now,
  commandId,
}) {
  if (!id || !organizationId || !actorId || !now || !commandId) {
    throw new CreditLedgerDomainError('Ledger identity and audit fields are required');
  }
  if (!Number.isInteger(quantityDelta) || quantityDelta === 0) {
    throw new CreditLedgerDomainError('quantity_delta must be a non-zero integer');
  }
  if (!CREDIT_REASON_CODES.includes(reasonCode)) {
    throw new CreditLedgerDomainError('Invalid credit ledger reason_code');
  }
  if (description.length > 4000) {
    throw new CreditLedgerDomainError('description must be 4000 characters or fewer');
  }
  return {
    id,
    organization_id: organizationId,
    membership_id: required(membershipId, 'membership_id'),
    quantity_delta: quantityDelta,
    reason_code: reasonCode,
    description,
    source_type: required(sourceType, 'source_type'),
    source_id: required(sourceId, 'source_id'),
    command_id: required(commandId, 'command_id'),
    created_by: actorId,
    effective_at: now,
    created_at: now,
  };
}
