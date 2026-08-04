import test from 'node:test';
import assert from 'node:assert/strict';
import { classifyAssistantQuestion, formatCurrencyMinor } from '../app/api/_lib/assistant.js';

test('assistant classifies attendance questions without exposing domain concepts', () => {
  assert.deepEqual(classifyAssistantQuestion('How many were present?'), { intent: 'attendance_status', status: 'present' });
  assert.deepEqual(classifyAssistantQuestion('Who is present today in Damodara Term?'), { intent: 'attendance_status', status: 'present' });
  assert.deepEqual(classifyAssistantQuestion('Give me the phone numbers of absentees'), { intent: 'absent_contacts' });
  assert.deepEqual(classifyAssistantQuestion('What payments are pending?'), { intent: 'payments_due' });
});

test('assistant formats money from minor units', () => {
  assert.equal(formatCurrencyMinor(400000), '₹4,000');
});
