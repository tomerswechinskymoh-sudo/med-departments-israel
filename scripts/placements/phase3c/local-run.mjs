import {spawnSync} from 'node:child_process';
import {existsSync,readFileSync,writeFileSync} from 'node:fs';
import {randomBytes} from 'node:crypto';
const path='/private/tmp/hitmachut-phase3c/local-session.key';
if(!existsSync(path))writeFileSync(path,randomBytes(32).toString('hex'),{mode:0o600});
const url='postgresql://postgres@127.0.0.1:55439/phase3c_guarded_test_only?schema=public';
const env={PATH:process.env.PATH,HOME:process.env.HOME,TMPDIR:process.env.TMPDIR,DATABASE_URL:url,DIRECT_URL:url,AUTH_SECRET:readFileSync(path,'utf8'),APP_URL:'http://localhost:3105',NEXTAUTH_URL:'http://localhost:3105',NEXT_TELEMETRY_DISABLED:'1',PLAYWRIGHT_BROWSERS_PATH:'0'};
console.error('TEST_ONLY: phase3c_guarded_test_only at loopback:55439; no provider/storage/payment credentials');
const [command,...args]=process.argv.slice(2);const r=spawnSync(command,args,{env,stdio:'inherit'});process.exit(r.status??1);
