import { questions, scale, VERSION } from './config';
export type InstrumentItem = { id:string; text:string; section:number; choices:readonly {value:number;label:string}[] };
export type InstrumentDefinition = {
 id:string; version:string; title:string; status:'EXPLORATORY'|'AUTHORIZED'; language:string;
 items:readonly InstrumentItem[]; allowClear:boolean; unknownLabel?:string;
 // An authorized adapter must supply its own verified scoring and missing-answer rules.
 evidence:{edition:string; rights:string; languageEvidence:string; scoringReference:string};
};
export const exploratoryInstrument:InstrumentDefinition = {
 id:'hitmachut-preferences',version:VERSION,title:'שאלון ההעדפות המקורי — כלי חקר לא מתוקף',status:'EXPLORATORY',language:'he',
 items:questions.map(q=>({...q,choices:scale.map((label,value)=>({value,label}))})),allowClear:true,
 unknownLabel:'לא יודע/ת עדיין / לא נחשפתי מספיק',
 evidence:{edition:VERSION,rights:'Original Hitmachut content',languageEvidence:'Original Hebrew; not validated',scoringReference:'scoring.ts:matchSpecialties'},
};
export const mspiStatus = {
 status:'BLOCKED',name:'Medical Specialty Preference Inventory (MSPI)',
 url:'https://careersinmedicine.aamc.org/understand-yourself/interests-mspi',
 checked:'2026-10-01',
 blockers:['Current edition and authorized scoring/missing rules unverified','Digital reproduction, scoring and translation permission not established','Licensed and validated Hebrew version not established'],
} as const;
export type AuthorizedInstrumentAdapter<Result> = {
 definition:InstrumentDefinition & {status:'AUTHORIZED'};
 rightsRecord:string; populationLimitations:string; missingAnswerRules:string;
 score:(answers:Readonly<Record<string,number|undefined>>)=>Result;
};
// Deliberately empty: no proprietary items or inferred scoring key is shipped.
export const authorizedInstruments:readonly AuthorizedInstrumentAdapter<unknown>[]=[];
