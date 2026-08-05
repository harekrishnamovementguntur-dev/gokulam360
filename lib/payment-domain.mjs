export const PAYMENT_STATUSES = Object.freeze(['draft','posted','partially_refunded','refunded','voided']);
export const PAYMENT_KINDS = Object.freeze(['payment','refund']);
export const PAYMENT_METHODS = Object.freeze(['cash','bank_transfer','upi','card','online','other']);

export class PaymentDomainError extends Error {
  constructor(message, status = 422) { super(message); this.name = 'PaymentDomainError'; this.status = status; }
}
const required = (value, field) => {
  const result = String(value ?? '').trim();
  if (!result) throw new PaymentDomainError(field + ' is required');
  return result;
};
export function createPayment({ id, organizationId, amountMinor, currency, method, description, receiptNumber, actorId, now, idempotencyKey }) {
  if (!id || !organizationId || !actorId || !now) throw new PaymentDomainError('Payment identity and audit fields are required');
  if (!Number.isInteger(amountMinor) || amountMinor <= 0) throw new PaymentDomainError('amount_minor must be a positive integer');
  if (!PAYMENT_METHODS.includes(method)) throw new PaymentDomainError('Invalid payment_method');
  return { id, organization_id: organizationId, kind: 'payment', status: 'draft', amount_minor: amountMinor, currency: required(currency, 'currency').toUpperCase(), payment_method: method, description: typeof description === 'string' ? description : '', receipt_number: required(receiptNumber, 'receipt_number'), created_by: actorId, idempotency_key: required(idempotencyKey, 'idempotency_key'), created_at: now, updated_at: now };
}
export function validateAllocations(allocations, amountMinor) {
  if (!Array.isArray(allocations) || allocations.length === 0) throw new PaymentDomainError('At least one Payment Allocation is required');
  const total = allocations.reduce((sum, item) => sum + Number(item.amount_minor), 0);
  if (total !== amountMinor) throw new PaymentDomainError('Payment Allocations must equal the Payment amount');
  return allocations.map((item) => {
    const amount = Number(item.amount_minor);
    const credits = Number(item.credit_quantity);
    if (!Number.isInteger(amount) || amount <= 0) throw new PaymentDomainError('allocation amount_minor must be a positive integer');
    if (!Number.isInteger(credits) || credits < 0) throw new PaymentDomainError('allocation credit_quantity must be a non-negative integer');
    return { membership_id: required(item.membership_id, 'allocation membership_id'), amount_minor: amount, credit_quantity: credits, description: typeof item.description === 'string' ? item.description : '' };
  });
}
export function refundStatus(refundedMinor, originalMinor) {
  return refundedMinor >= originalMinor ? 'refunded' : 'partially_refunded';
}
