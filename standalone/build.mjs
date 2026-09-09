import {existsSync,renameSync,rmSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
if(existsSync('.sites-worker-output'))throw Error('Resolve existing .sites-worker-output before rebuilding');
const preserved=existsSync('dist');if(preserved)renameSync('dist','.sites-worker-output');
try{const r=spawnSync(process.execPath,['node_modules/vinext/dist/cli.js','build'],{stdio:'inherit',env:{...process.env,FITSPACE_TARGET:'node'},timeout:180000});if(r.status!==0)throw Error('Standalone build failed');rmSync('dist-standalone',{recursive:true,force:true});renameSync('dist','dist-standalone');}finally{rmSync('dist',{recursive:true,force:true});if(preserved)renameSync('.sites-worker-output','dist')}
