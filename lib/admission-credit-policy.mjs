export const ADMISSION_CREDIT_POLICIES = Object.freeze(['remaining', 'full', 'custom']);

export function calculateAdmissionCredits({ sessions = [], policy = 'remaining', customCredits = 0, asOf = new Date().toISOString().slice(0, 10) }) {
  if (!ADMISSION_CREDIT_POLICIES.includes(policy)) throw new Error('Invalid admission credit policy');
  const attendable = sessions.filter(session => !['holiday', 'cancelled'].includes(String(session?.status || '').toLowerCase()));
  const completed = attendable.filter(session =>
    String(session?.status || '').toLowerCase() === 'completed' ||
    String(session?.date || '') < asOf
  );
  const fullCredits = attendable.length;
  const remainingCredits = Math.max(0, fullCredits - completed.length);
  const credits = policy === 'full'
    ? fullCredits
    : policy === 'custom'
      ? Number(customCredits) || 0
      : remainingCredits;
  if (!Number.isInteger(credits) || credits < 0) throw new Error('custom credits must be a non-negative integer');
  return {
    fullCredits,
    completedSessions: completed.length,
    remainingCredits,
    credits,
    excludedSessions: sessions.length - attendable.length,
  };
}
