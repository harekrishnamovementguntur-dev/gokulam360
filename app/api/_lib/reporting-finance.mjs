import { cursorPredicate, encodeCursor, reportResponse, ReportingError } from '../../../lib/reporting-domain.mjs';

const PAYMENT_SORT_FIELDS = new Set(['created_at', 'id']);
const LEDGER_SORT_FIELDS = new Set(['effective_at', 'created_at', 'id']);

function assertSort(filters, fields, label) {
  if (!fields.has(filters.sort)) {
    throw new ReportingError(label + ' reports support a defined chronological or id sort', 400, 'invalid_sort');
  }
}

function facet(filters, projection) {
  const cursor = cursorPredicate(filters.cursor, filters.sort, filters.direction);
  const direction = filters.direction === 'asc' ? 1 : -1;
  return {
    total: [{ $count: 'value' }],
    data: [
      ...(Object.keys(cursor).length ? [{ $match: cursor }] : []),
      { $sort: { [filters.sort]: direction, id: direction } },
      { $limit: filters.page_size + 1 },
      { $project: projection },
    ],
  };
}

function result(rows, filters, total) {
  const hasMore = rows.length > filters.page_size;
  const items = hasMore ? rows.slice(0, filters.page_size) : rows;
  const last = items[items.length - 1];
  const nextCursor = hasMore && last
    ? encodeCursor({ value: last[filters.sort], id: last.id, sort: filters.sort, direction: filters.direction })
    : null;
  return reportResponse({
    items,
    summary: { total },
    page: { page_size: filters.page_size, next_cursor: nextCursor, has_more: hasMore },
    filters,
  });
}

function paymentAllocationLookup(filters) {
  const allocationMatch = {};
  if (filters.membership_id) allocationMatch.membership_id = filters.membership_id;
  return [
    {
      $match: {
        $expr: {
          $and: [
            { $eq: ['$organization_id', '$$organizationId'] },
            { $eq: ['$payment_transaction_id', '$$paymentId'] },
          ],
        },
      },
    },
    ...(Object.keys(allocationMatch).length ? [{ $match: allocationMatch }] : []),
    { $project: { _id: 0, membership_id: 1, amount_minor: 1, credit_quantity: 1, allocation_type: 1 } },
  ];
}

export function buildPaymentsPipeline(scope, filters) {
  assertSort(filters, PAYMENT_SORT_FIELDS, 'Payment');
  const match = { organization_id: scope.organization_id };
  if (filters.status) match.status = filters.status;
  if (filters.kind) match.kind = filters.kind;
  if (filters.from) match.created_at = { ...(match.created_at || {}), $gte: filters.from };
  if (filters.to) match.created_at = { ...(match.created_at || {}), $lte: filters.to + 'T23:59:59.999Z' };

  const pipeline = [
    { $match: match },
    {
      $lookup: {
        from: 'payment_allocations',
        let: { organizationId: '$organization_id', paymentId: '$id' },
        pipeline: paymentAllocationLookup(filters),
        as: 'allocations',
      },
    },
    ...(filters.membership_id ? [{ $match: { $expr: { $gt: [{ $size: '$allocations' }, 0] } } }] : []),
    ...(filters.student_id ? [
      {
        $lookup: {
          from: 'memberships',
          let: { organizationId: '$organization_id', membershipIds: '$allocations.membership_id' },
          pipeline: [{
            $match: { $expr: { $and: [
              { $eq: ['$organization_id', '$$organizationId'] },
              { $in: ['$id', '$$membershipIds'] },
              { $eq: ['$student_id', filters.student_id] },
            ] } },
          }, { $project: { _id: 0, id: 1 } }],
          as: 'student_memberships',
        },
      },
      { $match: { $expr: { $gt: [{ $size: '$student_memberships' }, 0] } } },
    ] : []),
    {
      $addFields: {
        allocation_count: { $size: '$allocations' },
        allocated_amount_minor: { $sum: '$allocations.amount_minor' },
        allocated_credit_quantity: { $sum: '$allocations.credit_quantity' },
      },
    },
    {
      $facet: facet(filters, {
        _id: 0,
        id: 1,
        receipt_number: 1,
        kind: 1,
        status: 1,
        amount_minor: 1,
        currency: 1,
        payment_method: 1,
        description: 1,
        original_payment_id: 1,
        created_at: 1,
        posted_at: 1,
        updated_at: 1,
        allocation_count: 1,
        allocated_amount_minor: 1,
        allocated_credit_quantity: 1,
      }),
    },
  ];
  return pipeline;
}

export function buildLedgerPipeline(scope, filters) {
  assertSort(filters, LEDGER_SORT_FIELDS, 'Credit Ledger');
  const match = { organization_id: scope.organization_id };
  if (filters.membership_id) match.membership_id = filters.membership_id;
  if (filters.reason_code) match.reason_code = filters.reason_code;
  if (filters.source_type) match.source_type = filters.source_type;
  if (filters.from) match.effective_at = { ...(match.effective_at || {}), $gte: filters.from };
  if (filters.to) match.effective_at = { ...(match.effective_at || {}), $lte: filters.to + 'T23:59:59.999Z' };

  return [
    { $match: match },
    {
      $lookup: {
        from: 'memberships',
        let: { organizationId: '$organization_id', membershipId: '$membership_id' },
        pipeline: [{
          $match: { $expr: { $and: [
            { $eq: ['$organization_id', '$$organizationId'] },
            { $eq: ['$id', '$$membershipId'] },
            ...(filters.student_id ? [{ $eq: ['$student_id', filters.student_id] }] : []),
          ] } },
        }, {
          $project: { _id: 0, id: 1, student_id: 1, student_name: 1 },
        }],
        as: 'membership',
      },
    },
    { $match: { $expr: { $gt: [{ $size: '$membership' }, 0] } } },
    { $unwind: '$membership' },
    {
      $lookup: {
        from: 'credit_ledger_entries',
        let: { organizationId: '$organization_id', membershipId: '$membership_id' },
        pipeline: [
          { $match: { $expr: { $and: [
            { $eq: ['$organization_id', '$$organizationId'] },
            { $eq: ['$membership_id', '$$membershipId'] },
          ] } } },
          { $group: { _id: null, balance: { $sum: '$quantity_delta' } } },
        ],
        as: 'balance',
      },
    },
    {
      $addFields: {
        membership_balance: { $ifNull: [{ $arrayElemAt: ['$balance.balance', 0] }, 0] },
      },
    },
    {
      $facet: facet(filters, {
        _id: 0,
        id: 1,
        membership_id: 1,
        student_id: '$membership.student_id',
        quantity_delta: 1,
        reason_code: 1,
        description: 1,
        source_type: 1,
        source_id: 1,
        command_id: 1,
        effective_at: 1,
        created_at: 1,
        membership_balance: 1,
      }),
    },
  ];
}

async function execute(db, collection, pipeline, filters) {
  const [aggregate] = await db.collection(collection).aggregate(pipeline).toArray();
  return result(aggregate?.data || [], filters, aggregate?.total?.[0]?.value || 0);
}

export async function listPaymentReports({ db, scope, filters }) {
  return execute(db, 'payment_transactions', buildPaymentsPipeline(scope, filters), filters);
}

export async function listLedgerReports({ db, scope, filters }) {
  return execute(db, 'credit_ledger_entries', buildLedgerPipeline(scope, filters), filters);
}
