"""Read-only audit: committed source tables + already downloaded public projection. No personal data output."""
import csv, hashlib, json, collections, pathlib
root=pathlib.Path(__file__).resolve().parents[2]
with (root/'Master_Dept.csv').open(encoding='utf-8-sig') as f: rows=list(csv.DictReader(f))
rows=[r for r in rows if r['תחום התמחות'] and r['תחום התמחות']!='תחום התמחות']
def number(v):
 try: return float(v.strip().replace('%','').replace(',',''))
 except (ValueError,AttributeError): return None
metrics={}
for key in ['מעבר_שלב_א','מעבר_שלב_ב','מדד_שחיקה','מספר_בכירים','מספר_מתמחים','מספר פרסומים מחלקתי','DUNS100','זמן_המתנה_חציוני_לתקן']:
 groups=collections.defaultdict(set)
 count=0
 for r in rows:
  v=number(r.get(key))
  if v is not None: count+=1;groups[r['תחום התמחות']].add(v)
 metrics[key]={'numericRows':count,'specialties':len(groups),'maxDistinctWithinSpecialty':max(map(len,groups.values()),default=0)}
catalog=json.loads(pathlib.Path('/private/tmp/hitmachut-phase4b/catalog.json').read_text())
report={'version':'2026-10-01.4b.1','retrieved':'2026-10-01','sourceRows':len(rows),'sourceSha256':{p:hashlib.sha256((root/p).read_bytes()).hexdigest() for p in ['Master_Dept.csv','Data_Exp.csv']},'metrics':metrics,'publicCatalog':{'departments':len(catalog['departments']),'specialties':len(catalog['specialties']),'known':{k:sum(d[k] is not None for d in catalog['departments']) for k in ['region','hospital','type']}},'baseIndexEligibleDepartments':0,'baseIndexEligibleSpecialties':0,'notes':['Source rows are not the live visible cohort. Do not equate denominators.','Data_Exp explicitly identifies pass rates and burnout as national specialty aggregates.','No restricted review records, applicant data or external ENT data were retrieved.']}
(root/'docs/career-fit/metric-audit.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
print(json.dumps(report,ensure_ascii=False,indent=2))
