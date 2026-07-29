import test from 'node:test'; import assert from 'node:assert/strict';
import { createAcademicProgram, createProgramOffering, transitionProgramEntity } from '../lib/program-domain.mjs';
const ctx={id:'x',organizationId:'o',actorId:'u',now:'2026-07-29T00:00:00Z'};
test('Program rejects operational fields',()=>assert.throws(()=>createAcademicProgram({...ctx,input:{name:'Gita',fee_amount:1}}),/fee_amount/));
test('Offering owns delivery data',()=>{const o=createProgramOffering({...ctx,input:{program_id:'p',academic_year:'2026',start_date:'2026-01-01',end_date:'2026-02-01',capacity:20}});assert.equal(o.program_id,'p');assert.equal(o.capacity,20);});
test('archived entity restores only to inactive',()=>{const p=createAcademicProgram({...ctx,input:{name:'Gita',status:'active'}});const a=transitionProgramEntity(p,{status:'archived',actorId:'u',now:'2026-07-30'});assert.throws(()=>transitionProgramEntity(a,{status:'active',actorId:'u',now:'2026-07-31'}));});