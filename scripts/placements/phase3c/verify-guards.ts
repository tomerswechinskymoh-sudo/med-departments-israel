import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { pilotDesign, isGuardedPlacementMutation, isPreservedPlacementOperation } from '../../../src/lib/placements/pilot-release';
assert.equal(pilotDesign.admission,'DISABLED'); assert.equal(pilotDesign.participantAccounts.length,0);
assert.equal(pilotDesign.offerings.length,0);assert.equal(pilotDesign.uploads,false);
assert.equal(pilotDesign.groups,false);assert.equal(pilotDesign.payments,false);assert.equal(pilotDesign.externalNotifications,false);
let handlers=0;
function walk(dir:string){for(const f of readdirSync(dir,{withFileTypes:true})){const path=join(dir,f.name);if(f.isDirectory())walk(path);else if(f.name==='route.ts'){const url='/'+path.replace(/^src\/app\//,'').replace(/\/route.ts$/,'');if(!/\/api\/(placements|clinical-rotations|admin\/clinical-rotations|electives|admin\/electives)(\/|$)/.test(url))continue;const text=readFileSync(path,'utf8');for(const method of ['POST','PUT','PATCH','DELETE'])if(text.includes(`function ${method}(`)){assert.equal(isGuardedPlacementMutation(url,method),true,url);assert.ok(text.includes("await guardPlacementRequest("),"Handler guard missing: "+url);handlers++;}}}}
walk('src/app/api');assert.ok(handlers>=20);
for(const method of ['GET','HEAD','OPTIONS'])assert.equal(isGuardedPlacementMutation('/api/clinical-rotations/applications',method),false);
for(const path of ['/api/clinical-rotations/hospital/applications','/api/admin/clinical-rotations/applications']){for(const action of ['approve','cancel','waitlist','decline','complete',undefined])assert.equal(isPreservedPlacementOperation(path,action),false);for(const action of ['approveCancellation','rejectCancellation'])assert.equal(isPreservedPlacementOperation(path,action),true);}
assert.equal(isGuardedPlacementMutation('/api/auth/login','POST'),false);
assert.equal(isPreservedPlacementOperation('/api/clinical-rotations/cancellations'),true);
assert.equal(isPreservedPlacementOperation('/api/clinical-rotations/groups'),false);
console.log(`PASS guarded design, ${handlers} inventoried mutation handlers, cancellation-only exceptions and unrelated auth preservation`);
