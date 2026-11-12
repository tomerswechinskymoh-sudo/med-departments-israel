"""Existing Vercel release workflow: immutable archive, skip-domain, verify, promote, sync."""
from pathlib import Path
import subprocess,json,hashlib,sys,os,tarfile,re,datetime
ROOT=Path(__file__).resolve().parents[2]; OUT=ROOT/'docs/staz-survey-20261112'
PROJECT='prj_0YCcPYlSvFYIveAzKWI1wDO6PNaE';TEAM='team_Jj2tczP8vf4XPr74gxyasW5A'
BASE='7397eb8d5a6e0bbc4f0a0cd6cfff0755ee09c314';OLD='dpl_CEaQ4tTqrFiLRtT1XRQiHnvbM5yZ'
QUICK_REVIEW='--quick-review' in sys.argv
if QUICK_REVIEW:
 OUT=ROOT/'docs/staz-survey-ux-20261112'
 BASE='e4507b3f5d698965868bfbea41b20c02fbcda617';OLD='dpl_AnDbii2qL6penLNwsgsnhuqGF5F5'
MAPPING_REVIEW='--mapping-review' in sys.argv
if MAPPING_REVIEW:
 OUT=ROOT/'docs/staz-survey-mapping-20261112'
 BASE='3a3f8a207f62b0b5f4ce51f07c63471501a6aec2';OLD='dpl_F7nM84f8xguxpQjh7tS6ewyyQ8jT'
COPY_REVIEW='--copy-review' in sys.argv
if COPY_REVIEW:
 OUT=ROOT/'docs/staz-survey-copy-20261112'
 BASE='ff2e538a5cab8cdf6f53cc4af9d577268cc9e045';OLD='dpl_EZA7CUHVFfzRACRKBf8sDrL291R4'
def run(args,**kw):return subprocess.check_output(args,cwd=ROOT,text=True,**kw).strip()
def git(*args):return run(['git',*args])
def write(n,v):(OUT/n).write_text(json.dumps(v,ensure_ascii=False,indent=2)+'\n')
def read(n):return json.loads((OUT/n).read_text())
def api(path,body=None):
 args=['vercel','api',path,'--scope',TEAM,'--raw','--non-interactive']
 if body is not None:args+=['--method','PATCH','--input','-']
 r=subprocess.run(args,input=json.dumps(body)if body is not None else None,capture_output=True,text=True,timeout=55)
 assert r.returncode==0,'Vercel API failed: '+path
 return json.loads(r.stdout)
def main():return run(['gh','api','repos/tomerswechinskymoh-sudo/med-departments-israel/branches/main','--jq','.commit.sha'])
def safe(p):
 keys=['id','accountId','name','framework','nodeVersion','buildCommand','installCommand','rootDirectory','outputDirectory','ssoProtection','commandForIgnoringBuildStep','autoExposeSystemEnvs','autoAssignCustomDomains','crons']
 d={k:p.get(k)for k in keys};d['productionBranch']=p.get('link',{}).get('productionBranch');d['environmentMetadata']=[{k:e.get(k)for k in ['key','target','type','gitBranch','createdAt','updatedAt']}for e in p.get('env',[])];return d
def snapshot(expected=OLD):
 p=api('/v9/projects/'+PROJECT);aliases=[api('/v4/aliases/'+h)for h in ['hitmachut.org','www.hitmachut.org']]
 assert all(a['projectId']==PROJECT and a['deploymentId']==expected for a in aliases)
 assert p['ssoProtection']=={'deploymentType':'all_except_custom_domains'}
 assert p['crons']['deploymentId']==expected and p['crons']['disabledAt']is None
 recent=api('/v6/deployments?projectId='+PROJECT+'&limit=8')['deployments'];assert not any(d['state']in ['BUILDING','QUEUED','INITIALIZING']for d in recent)
 return {'timeUtc':datetime.datetime.now(datetime.timezone.utc).isoformat(),'main':main(),'project':safe(p),'aliases':[{k:a.get(k)for k in ['alias','deploymentId','projectId']}for a in aliases]}
phase=sys.argv[1]
if phase=='preflight':
 s=snapshot();assert s['main']==BASE;write('preflight.json',s);print('Production aliases, source, protection and cron verified')
elif phase=='deploy':
 s=snapshot();assert s['main']==BASE and s['project']==read('preflight.json')['project'];write('immediate-predeploy.json',s)
 assert read('checks.json')['passed']
 if not COPY_REVIEW:assert read('production-migration.json' if MAPPING_REVIEW else 'production-baseline.json' if QUICK_REVIEW else 'production-import.json')['passed']
 assert not git('diff','HEAD','--name-only');commit=git('rev-parse','HEAD');assert git('rev-parse','HEAD^')==BASE
 target=Path('/private/tmp/hitmachut-staz-release-'+commit[:12]);target.mkdir(exist_ok=False)
 archive=OUT/'source.tar';subprocess.run(['git','archive','--format=tar','-o',str(archive),commit],cwd=ROOT,check=True)
 with tarfile.open(archive)as t:t.extractall(target,filter='data')
 files={str(p.relative_to(target)):hashlib.sha1(p.read_bytes()).hexdigest()for p in target.rglob('*')if p.is_file()}
 assert not any(p.endswith('.xlsm') or 'staz_positive_reviews_download.csv' in p or p.startswith('.env') and p!='.env.example' for p in files)
 write('source.json',{'commit':commit,'base':BASE,'archiveSha256':hashlib.sha256(archive.read_bytes()).hexdigest(),'files':files})
 (target/'.vercel').mkdir();(target/'.vercel/project.json').write_text(json.dumps({'projectId':PROJECT,'orgId':TEAM}))
 env={k:v for k,v in os.environ.items()if k in ['PATH','HOME','TMPDIR','LANG','LC_ALL','USER','SHELL','TERM']};env['VERCEL_TELEMETRY_DISABLED']='1'
 r=subprocess.run(['vercel','deploy',str(target),'--project',PROJECT,'--scope',TEAM,'--prod','--skip-domain','--no-wait','--format','json','--meta','stazSourceCommit='+commit,'--meta','stazBaseCommit='+BASE,'--yes','--non-interactive'],cwd=target,env=env,capture_output=True,text=True,timeout=180)
 write('deploy-submit.json',{'exitCode':r.returncode,'stdout':r.stdout,'stderr':r.stderr});assert r.returncode==0,'Deploy submission failed'
 d=json.loads(r.stdout)['deployment'];write('deployment.json',{'id':d['id'],'url':d['url'].removeprefix('https://')});print(json.dumps(read('deployment.json')))
elif phase=='verify':
 d=api('/v13/deployments/'+read('deployment.json')['id']);assert d['projectId']==PROJECT and d['target']=='production'
 print(json.dumps({'id':d['id'],'state':d['readyState']}));assert d['readyState']=='READY'
 assert d['meta']['stazSourceCommit']==read('source.json')['commit']
 uploaded={}
 def walk(nodes,prefix=''):
  for n in nodes:
   path=prefix+n['name']
   if n['type']=='directory':walk(n.get('children',[]),path+'/')
   elif n['type']=='file':uploaded[path.removeprefix('src/')]=n['uid']
 walk(api('/v6/deployments/'+d['id']+'/files'));local=read('source.json')['files']
 for p,h in uploaded.items():assert local.get(p)==h,'Source mismatch: '+p
 omitted=set(local)-set(uploaded);assert all(p in ['.gitignore','.Rhistory']or Path(p).name=='.DS_Store'for p in omitted),sorted(omitted)
 state=snapshot();assert state['project']==read('preflight.json')['project']
 logs=run(['vercel','inspect',d['id'],'--scope',TEAM,'--logs','--non-interactive'],stderr=subprocess.STDOUT)
 assert 'Build Completed'in logs and 'Compiled successfully'in logs
 assert not any(x in logs for x in ['prisma migrate deploy','prisma db push','npm run db:seed'])
 write('provider-verified.json',{'passed':True,'filesCompared':len(uploaded),'omitted':sorted(omitted),'settingsUnchanged':True,'buildSucceeded':True,'noBuildTimeDatabaseMigration':True})
elif phase=='promote':
 assert read('provider-verified.json')['passed'] and read('staged-smoke.json')['passed']
 s=snapshot();assert s['main']==BASE and s['project']==read('preflight.json')['project']
 d=read('deployment.json');assert api('/v13/deployments/'+d['id'])['readyState']=='READY'
 r=run(['vercel','promote',d['id'],'--scope',TEAM,'--yes','--non-interactive'],stderr=subprocess.STDOUT)
 s=snapshot(d['id']);write('promotion.json',{'passed':True,'deployment':d,'aliases':s['aliases'],'output':r});print('Promoted; both production aliases and cron verified')
elif phase=='sync':
 assert read('live-smoke.json')['passed'];dep=read('deployment.json')['id'];s=snapshot(dep);assert s['main']==BASE
 commit=read('source.json')['commit'];assert git('rev-parse','HEAD')==commit
 p=api('/v9/projects/'+PROJECT);old=p['commandForIgnoringBuildStep'];assert old==read('preflight.json')['project']['commandForIgnoringBuildStep']
 shas=re.findall(r'[a-f0-9]{40}',old);assert len(shas)==5
 rule='case $VERCEL_GIT_COMMIT_SHA in '+'|'.join(shas[1:]+[commit])+');;*)exit 1;;esac';assert len(rule)<=256
 for sha,expected in [(commit,0),('f'*40,1),('',1)]:assert subprocess.run(['sh','-c',rule],env={'PATH':'/usr/bin:/bin','VERCEL_GIT_COMMIT_SHA':sha}).returncode==expected
 api('/v9/projects/'+PROJECT,{'commandForIgnoringBuildStep':rule});p2=api('/v9/projects/'+PROJECT)
 for k in ['env','ssoProtection','crons','link','buildCommand','installCommand','rootDirectory']:assert p.get(k)==p2.get(k)
 assert main()==BASE
 run(['git','push','--porcelain','--no-follow-tags','origin',commit+':refs/heads/main'],stderr=subprocess.STDOUT)
 assert main()==commit
 write('github-sync.json',{'passed':True,'commit':commit,'main':commit,'forcePush':False,'previousIgnoreRule':old,'newIgnoreRule':rule});print('GitHub main synchronized; duplicate deployment exclusion preserved')
else:raise ValueError(phase)
