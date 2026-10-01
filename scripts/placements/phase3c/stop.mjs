import {execFileSync} from 'node:child_process';
let ids;try{ids=execFileSync('lsof',['-nP','-tiTCP:3105','-sTCP:LISTEN'],{encoding:'utf8'}).trim().split('\n');}catch{console.log('No server on 3105');process.exit(0);}
for(const id of ids){if(!/^\d+$/.test(id))throw Error('Invalid process');const cwd=execFileSync('lsof',['-a','-p',id,'-d','cwd','-Fn'],{encoding:'utf8'});if(!cwd.includes('\nn'+process.cwd()+'\n'))throw Error('Refusing to stop a different workspace');process.kill(Number(id),'SIGTERM');}console.log('Stopped verified worktree server on 3105');
