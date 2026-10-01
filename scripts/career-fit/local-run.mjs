import {spawnSync} from 'node:child_process';
import {readFileSync} from 'node:fs';
const url='postgresql://postgres@127.0.0.1:55439/phase4a_career_fit_test_only?schema=public';
const env={PATH:process.env.PATH,HOME:process.env.HOME,TMPDIR:process.env.TMPDIR,DATABASE_URL:url,DIRECT_URL:url,AUTH_SECRET:readFileSync('/private/tmp/hitmachut-phase3c/local-session.key','utf8'),APP_URL:'http://localhost:3106',NEXTAUTH_URL:'http://localhost:3106',NEXT_TELEMETRY_DISABLED:'1',PLAYWRIGHT_BROWSERS_PATH:'0'};
console.error('TEST_ONLY: phase4a_career_fit_test_only at loopback:55439; no external-provider credentials');
const [command,...args]=process.argv.slice(2);const r=spawnSync(command,args,{env,stdio:'inherit'});process.exit(r.status??1);
