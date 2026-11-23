import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateDemandBenchmark, compareDemand, relativeDemandValue } from '../../src/lib/demand-benchmark';
import { formatGenderPercent, formatImportedGenderPercent } from '../../src/lib/gender-percent-display';
import { calculateSpecialtyMetrics } from '../../src/lib/specialty-metrics';

const row=(specialtyId:string,value:number|null,metricKey='relativeDemandIndex')=>({specialtyId,metricKey,value});
test('all-specialty mean counts each specialty once and preserves valid zero',()=>{
 const rows=[row('a',2),row('a',9,'מדד ביקוש יחסי'),row('b',1),row('c',0),row('missing',null),row('invalid',NaN),row('negative',-1),row('other',99,'salary')];
 assert.deepEqual(calculateDemandBenchmark(rows),{average:1,specialtyCount:3});
 assert.deepEqual(calculateDemandBenchmark(rows.reverse()),{average:1,specialtyCount:3});
 assert.equal(relativeDemandValue([row('b',3,'מדד ביקוש יחסי')]),3);
 assert.deepEqual(calculateDemandBenchmark([]),{average:null,specialtyCount:0});
});
test('classification boundaries are symmetric, inclusive at 50%, and use unrounded data',()=>{
 const benchmark={average:2,specialtyCount:10};
 for(const [value,level] of [[0,'veryLow'],[1,'veryLow'],[1.01,'low'],[1.59,'low'],[1.6,'similar'],[2,'similar'],[2.4,'similar'],[2.401,'high'],[2.99,'high'],[3,'veryHigh'],[8,'veryHigh']] as const) assert.equal(compareDemand(value,benchmark).level,level,String(value));
 assert.equal(compareDemand(1.225,{average:.8175,specialtyCount:28}).level,'high','rounding to 1.23 must not move across 1.5x boundary');
 assert.equal(compareDemand(1,{average:null,specialtyCount:0}).level,null);
 assert.equal(compareDemand(1,{average:1,specialtyCount:1}).level,null);
 assert.equal(compareDemand(0,{average:0,specialtyCount:2}).level,'similar');
 assert.equal(compareDemand(1,{average:0,specialtyCount:2}).level,null);
});
test('gender percentages round display only, with null distinct from zero',()=>{
 for(const [value,expected] of [[55.4,'55%'],[55.5,'56%'],[0,'0%'],[99.9,'100%'],[100,'100%']] as const) assert.equal(formatGenderPercent(value),expected);
 for(const value of [null,undefined,NaN,Infinity,-1,101]) assert.equal(formatGenderPercent(value),null);
 for(const rawValue of ['55.6%','55,6%']) assert.equal(formatImportedGenderPercent({metricKey:'אחוז_נשים',value:null,rawValue}),'56%');
 assert.equal(formatImportedGenderPercent({metricKey:'אחוז_נשים',value:null,rawValue:'#DIV/0!'}),null);
});
test('specialty output carries the same global benchmark across selected specialties and department subsets',()=>{
 const demandBenchmark=calculateDemandBenchmark([row('a',1.6),row('b',.8),row('c',0)]);
 for(const value of [1.6,.8,0])for(const departments of [[],[{residentsCount:999}]]) {
  const data=calculateSpecialtyMetrics(departments,['relativeDemandIndex'],['relativeDemandIndex'],{demandBenchmark,specialtyMetrics:[row('selected',value)]});
  assert.equal(data[0].value,value.toFixed(2));assert.equal(data[0].demandComparison?.average,demandBenchmark.average);assert.equal(data[0].demandComparison?.specialtyCount,3);
 }
 const absent=calculateSpecialtyMetrics([],['relativeDemandIndex'],['relativeDemandIndex'],{demandBenchmark});
 assert.equal(absent[0].isPlaceholder,true);assert.deepEqual(absent[0].demandComparison,{...demandBenchmark,level:null});
});
test('women display is integral for imported and department-derived specialty metrics without modifying source',()=>{
 const original={metricKey:'אחוז_נשים',value:56.78,rawValue:'56.78%',unit:'%'};
 const result=calculateSpecialtyMetrics([],['genderDistribution'],['genderDistribution'],{specialtyMetrics:[original]});
 assert.equal(result[0].value,'57% נשים');assert.equal(original.value,56.78);assert.equal(original.rawValue,'56.78%');
 const fallback=calculateSpecialtyMetrics([{externalMetrics:[{metricKey:'womenPercent',value:52.33,sourceName:'MOH',approved:true}]}],['genderDistribution'],['genderDistribution']);
 assert.equal(fallback[0].value,'52% נשים');
});
