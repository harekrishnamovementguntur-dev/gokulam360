import { cursorPredicate, reportResponse, ReportingError } from '../../../lib/reporting-domain.mjs';

const REPORT_SORT_FIELDS = new Set(['created_at', 'id']);

function assertSort(filters) {
  if (!REPORT_SORT_FIELDS.has(filters.sort)) {
    throw new ReportingError('Members and Memberships reports support created_at or id sorting', 400, 'invalid_sort');
  }
}

function paginationFacet(filters, projection) {
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

function pageResult(rows, filters, summary) {
  const hasMore = rows.length > filters.page_size;
  const items = hasMore ? rows.slice(0, filters.page_size) : rows;
  const last = items[items.length - 1];
  const nextCursor = hasMore && last
    ? Buffer.from(JSON.stringify({
        version: 1,
        value: String(last[filters.sort]),
        id: String(last.id),
        sort: filters.sort,
        direction: filters.direction,
      })).toString('base64url')
    : null;
  return reportResponse({
    items,
    summary,
    page: { page_size: filters.page_size, next_cursor: nextCursor, has_more: hasMore },
    filters,
  });
}

function membershipFilter(filters) {
  const match = {};
  if (filters.membership_id) match.id = filters.membership_id;
  if (filters.program_id) match.program_id = filters.program_id;
  if (filters.status) match.status = filters.status;
  if (filters.from) match.created_at = { ...(match.created_at || {}), $gte: filters.from };
  if (filters.to) match.created_at = { ...(match.created_at || {}), $lte: filters.to + 'T23:59:59.999Z' };
  return match;
}

function participationLookup(filters) {
  const match = {};
  if (filters.program_offering_id) match.program_offering_id = filters.program_offering_id;
  if (filters.term_id) match.term_id = filters.term_id;
  return [
    {
      $match: {
        $expr: {
          $and: [
            { $eq: ['$organization_id', '$$organizationId'] },
            { $eq: ['$membership_id', '$$membershipId'] },
          ],
        },
      },
    },
    ...(Object.keys(match).length ? [{ $match: match }] : []),
    { $project: { _id: 0, id: 1, program_offering_id: 1, term_id: 1, status: 1 } },
  ];
}

export function buildMembersPipeline(scope, filters) {
  assertSort(filters);
  const membershipMatch = membershipFilter(filters);
  const membershipPipeline = [
    {
      $match: {
        $expr: {
          $and: [
            { $eq: ['$organization_id', '$$organizationId'] },
            { $eq: ['$student_id', '$$studentId'] },
          ],
        },
      },
    },
    ...(Object.keys(membershipMatch).length ? [{ $match: membershipMatch }] : []),
    ...(filters.program_offering_id || filters.term_id ? [
      {
        $lookup: {
          from: 'membership_term_participations',
          let: { organizationId: '$organization_id', membershipId: '$id' },
          pipeline: participationLookup(filters),
          as: 'participations',
        },
      },
      { $match: { $expr: { $gt: [{ $size: '$participations' }, 0] } } },
    ] : []),
    { $project: { _id: 0, id: 1, status: 1, created_at: 1 } },
  ];

  const studentMatch = { organization_id: scope.organization_id, is_deleted: { $ne: true } };
  if (filters.student_id) studentMatch.id = filters.student_id;
  if (filters.status) studentMatch.status = filters.status;

  return [
    { $match: studentMatch },
    {
      $lookup: {
        from: 'memberships',
        let: { organizationId: '$organization_id', studentId: '$id' },
        pipeline: membershipPipeline,
        as: 'memberships',
      },
    },
    {
      $addFields: {
        membership_count: { $size: '$memberships' },
        active_membership_count: {
          $size: { $filter: { input: '$memberships', as: 'membership', cond: { $eq: ['$$membership.status', 'active'] } } },
        },
        latest_membership_at: { $max: '$memberships.created_at' },
      },
    },
    {
      $facet: paginationFacet(filters, {
        _id: 0,
        id: 1,
        student_id: 1,
        first_name: 1,
        last_name: 1,
        status: 1,
        created_at: 1,
        updated_at: 1,
        membership_count: 1,
        active_membership_count: 1,
        latest_membership_at: 1,
      }),
    },
  ];
}

export function buildMembershipsPipeline(scope, filters) {
  assertSort(filters);
  const match = { organization_id: scope.organization_id };
  if (filters.membership_id) match.id = filters.membership_id;
  if (filters.program_id) match.program_id = filters.program_id;
  if (filters.status) match.status = filters.status;
  if (filters.student_id) match.student_id = filters.student_id;
  if (filters.from) match.created_at = { ...(match.created_at || {}), $gte: filters.from };
  if (filters.to) match.created_at = { ...(match.created_at || {}), $lte: filters.to + 'T23:59:59.999Z' };

  const participationFilter = filters.program_offering_id || filters.term_id;
  return [
    { $match: match },
    {
      $lookup: {
        from: 'students',
        let: { organizationId: '$organization_id', studentId: '$student_id' },
        pipeline: [{
          $match: { $expr: { $and: [
            { $eq: ['$organization_id', '$$organizationId'] },
            { $eq: ['$id', '$$studentId'] },
          ] } },
        }, { $project: { _id: 0, id: 1, student_id: 1, first_name: 1, last_name: 1 } }],
        as: 'student',
      },
    },
    { $unwind: { path: '$student', preserveNullAndEmptyArrays: true } },
    {
      $lookup: {
        from: 'membership_term_participations',
        let: { organizationId: '$organization_id', membershipId: '$id' },
        pipeline: participationLookup(filters),
        as: 'participations',
      },
    },
    ...(participationFilter ? [{ $match: { $expr: { $gt: [{ $size: '$participations' }, 0] } } }] : []),
    {
      $addFields: {
        participation_count: { $size: '$participations' },
        active_participation_count: {
          $size: { $filter: { input: '$participations', as: 'participation', cond: { $eq: ['$$participation.status', 'active'] } } },
        },
      },
    },
    {
      $facet: paginationFacet(filters, {
        _id: 0,
        organization_id: 1,
        id: 1,
        student_id: 1,
        program_id: 1,
        status: 1,
        created_at: 1,
        updated_at: 1,
        student: 1,
        participation_count: 1,
        active_participation_count: 1,
      }),
    },
  ];
}

async function executeReport(db, collection, pipeline, filters) {
  const [result] = await db.collection(collection).aggregate(pipeline).toArray();
  const rows = result?.data || [];
  const total = result?.total?.[0]?.value || 0;
  return pageResult(rows, filters, { total });
}

export async function listMembers({ db, scope, filters }) {
  return executeReport(db, 'students', buildMembersPipeline(scope, filters), filters);
}

export async function listMemberships({ db, scope, filters }) {
  return executeReport(db, 'memberships', buildMembershipsPipeline(scope, filters), filters);
}
