"""Read-only deployment checks. Provider bypass remains in process memory."""
import json,subprocess,sys,ssl,urllib.request,urllib.error
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2];OUT=ROOT/'docs/staz-survey-20261112'
if '--quick-review' in sys.argv:OUT=ROOT/'docs/staz-survey-ux-20261112'
if '--mapping-review' in sys.argv:OUT=ROOT/'docs/staz-survey-mapping-20261112'
if '--copy-review' in sys.argv:OUT=ROOT/'docs/staz-survey-copy-20261112'
if '--association-repair' in sys.argv:OUT=ROOT/'docs/staz-survey-repair-20261112'
if '--encoding-repair' in sys.argv:OUT=ROOT/'docs/staz-survey-encoding-20261112'
if '--auto-approval' in sys.argv:OUT=ROOT/'docs/staz-survey-automation-20261113'
if '--directory-review' in sys.argv:OUT=ROOT/'docs/staz-survey-directory-20261113'
TEAM='team_Jj2tczP8vf4XPr74gxyasW5A';PROJECT='prj_0YCcPYlSvFYIveAzKWI1wDO6PNaE'
phase=sys.argv[1];assert phase in ['staged','live']
d=json.loads((OUT/'deployment.json').read_text());headers={'User-Agent':'Hitmachut-Staz-Authorized-Release-Smoke'}
if phase=='staged':
 r=subprocess.run(['vercel','api','/v9/projects/'+PROJECT,'--scope',TEAM,'--raw','--non-interactive'],capture_output=True,text=True,timeout=55);assert r.returncode==0
 p=json.loads(r.stdout);headers['x-vercel-protection-bypass']=next(k for k,v in p.get('protectionBypass',{}).items()if v.get('scope')=='automation-bypass')
 origin='https://'+d['url']
else:origin='https://www.hitmachut.org'
class NoRedirect(urllib.request.HTTPRedirectHandler):
 def redirect_request(self,*a,**k):return None
opener=urllib.request.build_opener(NoRedirect(),urllib.request.HTTPSHandler(context=ssl.create_default_context(cafile='/etc/ssl/cert.pem')))
checks=[]
for path,expected in [('/',[200]),('/admin/survey-reviews',[307,302]),('/api/admin/survey-reviews',[403]),('/api/admin/survey-reviews/unknown',[403]),('/login',[200]),('/departments',[200]),('/compare',[200]),('/sitemap',[200]),('/sitemap.xml',[404])]:
 try:res=opener.open(urllib.request.Request(origin+path,headers=headers),timeout=55)
 except urllib.error.HTTPError as e:res=e
 with res:
  body=res.read().decode('utf-8','replace');ok=res.status in expected
  if path.startswith('/api/admin/'):ok=ok and 'FORBIDDEN'in body and 'no-store'in res.headers.get('Cache-Control','')
  if path=='/admin/survey-reviews':ok=ok and '/login'in res.headers.get('Location','')
  if path in ['/','/departments','/compare','/sitemap','/sitemap.xml']:ok=ok and 'STAZ_SURVEY_2020_2025:R'not in body and 'rawEncrypted'not in body and 'sourceReviewKey'not in body
  checks.append({'path':path,'status':res.status,'passed':ok});print(path,res.status,'OK'if ok else'FAILED',flush=True)
report={'passed':all(c['passed']for c in checks),'phase':phase,'checks':checks,'scope':'Unauthenticated read-only checks; authenticated moderation and privacy workflows verified on isolated test branch; production source remains disabled.'}
if '--mapping-review' in sys.argv:report['scope']='Unauthenticated read-only checks; authenticated moderation and privacy workflows verified on isolated test branch; production source enabled under user authorization, only manually approved content eligible.'
if '--copy-review' in sys.argv:report['scope']='Read-only public routes and admin access gates. Presentation-only update; approval decisions, source rights and database unchanged.'
if '--auto-approval' in sys.argv:report['scope']='Read-only public routes and admin access gates. Automatic approvals, independent ratings, manual decisions and source hide/restore tested on isolated database. Public enablement explicitly authorized by user.'
if '--directory-review' in sys.argv:report['scope']='Read-only route and access checks. Directory counts, independent elective ratings and immediate hide/restore tested on isolated database. Production approvals, associations and publication settings unchanged.'
(OUT/(phase+'-smoke.json')).write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n');assert report['passed']
