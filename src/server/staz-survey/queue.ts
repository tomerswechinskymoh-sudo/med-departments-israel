import type { Prisma } from '@prisma/client';
export function automationQueueWhere(view: string | null): Prisma.SurveyReviewWhereInput {
  switch(view ?? 'uncertain') {
    case 'uncertain': return { automationCategory:'UNCERTAIN',publishText:false,status:{not:'REJECTED'} };
    case 'blocked': return { automationCategory:{in:['MAPPING','ASSOCIATION','PRIVACY']},publishText:false,status:{not:'REJECTED'} };
    case 'approved': return {status:'APPROVED'};
    case 'excluded': return {automationCategory:'EXCLUDED'};
    case 'all': return {};
    default: return {id:{in:[]}};
  }
}
