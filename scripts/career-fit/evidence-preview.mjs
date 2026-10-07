// Isolated local preview/build: no inherited production credentials or database URLs.
// SiteHeader intentionally skips its unrelated department query when DATABASE_URL is absent.
// Browser release tests provide the public catalog fixture without a database connection.
import {spawnSync} from 'node:child_process';
import {randomBytes} from 'node:crypto';
const [command,...args]=process.argv.slice(2);
if(!command)throw Error('Provide a command, e.g. node node_modules/next/dist/bin/next start --hostname 127.0.0.1 --port 3112');
const env={PATH:process.env.PATH,HOME:process.env.HOME,TMPDIR:process.env.TMPDIR,NEXT_TELEMETRY_DISABLED:'1',AUTH_SECRET:randomBytes(32).toString('hex'),APP_URL:'http://localhost:3112',NEXTAUTH_URL:'http://localhost:3112',CAREER_FIT_EVIDENCE_PREVIEW:'1'};
// Allows explicit browser regression of the production gate without deploying.
if(process.env.EVIDENCE_VERIFY_PRODUCTION_GUARD==='1')env.VERCEL_ENV='production';
const r=spawnSync(command,args,{env,stdio:'inherit'});process.exit(r.status??1);
