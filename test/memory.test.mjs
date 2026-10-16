import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, rmSync, realpathSync, existsSync, readdirSync, symlinkSync, chmodSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { createServer } from 'node:http';
import test from 'node:test';
import { applyPlan } from '../dist/files.js';
import { planInstall } from '../dist/install.js';
import { localMemoryUrl, selectMemory, planMemory, readMemory, memoryProblems, setupMemory, removeMemory, fetchMemoryAssets } from '../dist/memory.js';

const cli = resolve('dist/cli.js');
function fixture(t, name='project') {
 const base=realpathSync(mkdtempSync(join(tmpdir(),'guardian memory ')));
 t.after(()=>rmSync(base,{recursive:true,force:true}));
 const root=join(base,name);mkdirSync(root);
 applyPlan(planInstall(root,{groups:['core'],graft:false}));
 return {root,base};
}
function assets() {
 return new Map([['claude/dist/mcp-server.js',Buffer.from('// test MCP\n')],['codex/dist/codex-honcho.mjs',Buffer.from('// test hooks\n')]]);
}
function walk(root,prefix='') {
 return readdirSync(join(root,prefix),{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(root,join(prefix,e.name)):[[join(prefix,e.name),readFileSync(join(root,prefix,e.name)).toString('base64')]]);
}

test('memory choices require explicit capture consent; IDs separate equal project names and preserve renamed titles',t=>{
 const a=fixture(t),b=fixture(t);
 assert.throws(()=>selectMemory(a.root,{provider:'honcho'}),/whether new conversations/);
 const p=selectMemory(a.root,{provider:'honcho',capture:true,name:'Min app'});
 assert.notEqual(p.workspace,selectMemory(b.root,{provider:'honcho',capture:true,name:'Min app'}).workspace);
 applyPlan(planMemory(a.root,p,assets()));
 assert.equal(selectMemory(a.root,{name:'Renamed'}).workspace,p.workspace);
 assert.equal(readMemory(a.root).peer,'user');
 assert.deepEqual(memoryProblems(a.root),[]);
});

test('memory setup preserves client hooks, permissions, MCP servers and restores only its changes',t=>{
 const {root}=fixture(t);
 const original={permissions:{allow:['Bash(node --version)']},hooks:{SessionStart:[{hooks:[{type:'command',command:'echo existing'}]}]}};
 mkdirSync(join(root,'.claude'),{recursive:true});
 writeFileSync(join(root,'.claude/settings.local.json'),JSON.stringify(original));
 chmodSync(join(root,'.claude/settings.local.json'),0o600);
 writeFileSync(join(root,'.mcp.json'),JSON.stringify({mcpServers:{other:{command:'existing'}}}));
 const profile=selectMemory(root,{provider:'honcho',capture:true});
 applyPlan(planMemory(root,profile,assets()));
 assert.equal(statSync(join(root,'.claude/settings.local.json')).mode & 0o777,0o600);
 let config=JSON.parse(readFileSync(join(root,'.claude/settings.local.json')));
 assert.deepEqual(config.permissions,original.permissions);
 assert.deepEqual(config.hooks.SessionStart[0],original.hooks.SessionStart[0]);
 config.permissions.allow.push('Bash(new-command)');
 config.hooks.Stop.push({hooks:[{type:'command',command:'echo added later'}]});
 writeFileSync(join(root,'.claude/settings.local.json'),JSON.stringify(config));
 const update=planMemory(root,profile,assets());
 assert.ok(update.changes.every(change=>change.path==='.guardian/memory-installation.json'));
 applyPlan(update);
 assert.deepEqual(planMemory(root,profile,assets()).changes,[]);
 removeMemory(root,false);
 const restored=JSON.parse(readFileSync(join(root,'.claude/settings.local.json')));
 assert.deepEqual(restored.permissions.allow,['Bash(node --version)','Bash(new-command)']);
 assert.deepEqual(restored.hooks.SessionStart,original.hooks.SessionStart);
 assert.equal(restored.hooks.Stop.length,1);
 assert.deepEqual(JSON.parse(readFileSync(join(root,'.mcp.json'))),{mcpServers:{other:{command:'existing'}}});
 assert.equal(readMemory(root),null);
});

test('capture off removes managed hooks and keeps MCP; declining memory removes connection without deleting server data',t=>{
 const {root}=fixture(t);
 applyPlan(planMemory(root,selectMemory(root,{provider:'honcho',capture:true}),assets()));
 applyPlan(planMemory(root,selectMemory(root,{capture:false}),assets()));
 assert.ok(!existsSync(join(root,'.codex/hooks.json')));
 assert.ok(!existsSync(join(root,'.claude/settings.local.json')));
 assert.ok(JSON.parse(readFileSync(join(root,'.mcp.json'))).mcpServers['guardian-honcho']);
 applyPlan(planMemory(root,selectMemory(root,{provider:'none'})));
 assert.equal(readMemory(root).provider,'none');
 assert.ok(!existsSync(join(root,'.mcp.json')));
 assert.ok(!existsSync(join(root,'.codex/config.toml')));
});

test('modified managed settings and symlink destinations stop before mutation',t=>{
 const {root}=fixture(t);
 const profile=selectMemory(root,{provider:'honcho',capture:true});
 applyPlan(planMemory(root,profile,assets()));
 const p=join(root,'.mcp.json');const config=JSON.parse(readFileSync(p));
 config.mcpServers['guardian-honcho'].command='modified';writeFileSync(p,JSON.stringify(config));
 const before=walk(root);
 assert.throws(()=>planMemory(root,profile,assets()),/managed memory setting was modified/);
 assert.deepEqual(walk(root),before);
 const b=fixture(t);
 writeFileSync(join(b.base,'external.json'),'{}');
 symlinkSync(join(b.base,'external.json'),join(b.root,'.mcp.json'));
 assert.throws(()=>planMemory(b.root,selectMemory(b.root,{provider:'honcho',capture:true}),assets()),/Symlink destination/);
 assert.equal(readFileSync(join(b.base,'external.json'),'utf8'),'{}');
});

test('hook commands safely handle quoted folders and ignore events from another project',t=>{
 const {root,base}=fixture(t,"app' $(touch PWNED) 'x");
 const vendor=assets();vendor.set('codex/dist/codex-honcho.mjs',Buffer.from("console.log('HOOK_OK');\n"));
 applyPlan(planMemory(root,selectMemory(root,{provider:'honcho',capture:true}),vendor));
 const hooks=JSON.parse(readFileSync(join(root,'.codex/hooks.json')));
 const command=hooks.hooks.SessionStart[0].hooks[0].command;
 const result=spawnSync('/bin/sh',['-c',command],{input:JSON.stringify({cwd:root}),encoding:'utf8',cwd:base});
 assert.equal(result.status,0,result.stderr);assert.match(result.stdout,/HOOK_OK/);
 assert.ok(!existsSync(join(base,'PWNED')));
 const outside=spawnSync('/bin/sh',['-c',command],{input:JSON.stringify({cwd:base}),encoding:'utf8',cwd:base});
 assert.equal(outside.status,0,outside.stderr);assert.equal(outside.stdout,'');
});

test('moved project memory requires reviewed rebind; external URLs and unsafe IDs rejected',t=>{
 const {root}=fixture(t);
 const profile=selectMemory(root,{provider:'none'});
 applyPlan(planMemory(root,{...profile,root:'/old/project'}));
 assert.throws(()=>selectMemory(root,{}),/moved or copied/);
 assert.equal(selectMemory(root,{rebind:true}).root,root);
 for(const url of ['https://api.honcho.dev','http://example.com','http://127.0.0.1:8008/v3','http://user:secret@localhost:8008','http://localhost:8008?x=1']) assert.throws(()=>localMemoryUrl(url));
 for(const workspace of ['../escape','bad id','a/b'])assert.throws(()=>selectMemory(root,{rebind:true,workspace}));
});

test('dry run never calls network or writes; none works without a server',async t=>{
 const {root}=fixture(t);
 const before=walk(root),previous=globalThis.fetch;
 globalThis.fetch=()=>{throw new Error('Unexpected network call');};
 try {
  await setupMemory(root,{provider:'honcho',capture:true},true);
  assert.deepEqual(walk(root),before);
  await setupMemory(root,{provider:'none'},false);
  assert.equal(readMemory(root).provider,'none');
 }finally{globalThis.fetch=previous;}
});

test('unavailable server leaves existing setup unchanged',async t=>{
 const {root}=fixture(t);const before=walk(root),previous=globalThis.fetch;
 globalThis.fetch=async()=>new Response('{}',{status:503});
 try {await assert.rejects(setupMemory(root,{provider:'honcho',capture:true},false),/server is unavailable/);assert.deepEqual(walk(root),before);}
 finally{globalThis.fetch=previous;}
});

test('download integrity mismatch fails closed before extraction',async()=>{
 const previous=globalThis.fetch;
 globalThis.fetch=async()=>new Response('tampered');
 try{await assert.rejects(fetchMemoryAssets(['codex']),/integrity mismatch/);}finally{globalThis.fetch=previous;}
});

test('connect creates one named workspace on the local API and preserves it across repeat setup',async t=>{
 const {root}=fixture(t);
 const requests=[];
 const server=createServer((req,res)=>{
  let body='';req.on('data',chunk=>{body+=chunk;});req.on('end',()=>{
   requests.push({method:req.method,path:req.url,body});res.setHeader('Content-Type','application/json');
   if(req.url==='/health')res.end('{"status":"ok"}');
   else if(req.url==='/v3/workspaces')res.end(JSON.stringify({id:JSON.parse(body).id}));
   else{res.statusCode=404;res.end('{}');}
  });
 });
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 t.after(()=>new Promise(resolve=>server.close(resolve)));
 const url='http://127.0.0.1:'+server.address().port;
 await setupMemory(root,{provider:'honcho',capture:true,url},false,async()=>assets());
 const id=readMemory(root).workspace;
 await setupMemory(root,{},false,async()=>assets());
 assert.equal(readMemory(root).workspace,id);
 assert.ok(requests.filter(r=>r.method==='POST').every(r=>JSON.parse(r.body).id===id));
 assert.ok(!requests.some(r=>r.method==='DELETE'));
});

test('workspace failure does not install memory files or hooks',async t=>{
 const {root}=fixture(t);const before=walk(root),previous=globalThis.fetch;
 globalThis.fetch=async(_url,opts)=>new Response(opts?.method==='POST'?'{}':'{"status":"ok"}',{status:opts?.method==='POST'?500:200});
 try {await assert.rejects(setupMemory(root,{provider:'honcho',capture:true},false,async()=>assets()),/Workspace connection failed/);assert.deepEqual(walk(root),before);}
 finally{globalThis.fetch=previous;}
});

test('legacy adoption is explicit and retains restoration records',t=>{
 const {root}=fixture(t);
 writeFileSync(join(root,'.mcp.json'),JSON.stringify({mcpServers:{'guardian-honcho':{command:'old-runtime'},other:{command:'keep'}}}));
 const profile=selectMemory(root,{provider:'honcho',capture:true,workspace:'guardian-existing'});
 assert.throws(()=>planMemory(root,profile,assets()),/needs review/);
 applyPlan(planMemory(root,profile,assets(),true));
 assert.equal(readMemory(root).workspace,'guardian-existing');
 removeMemory(root,false);
 assert.equal(JSON.parse(readFileSync(join(root,'.mcp.json'))).mcpServers['guardian-honcho'],undefined);
 assert.ok(existsSync(join(root,'.guardian/memory-legacy-backup.json')));
 assert.match(readFileSync(join(root,'.gitignore'),'utf8'),/\.guardian\/memory-legacy-backup.json/);
});

test('legacy migration with capture off removes only old handlers and never reactivates them',t=>{
 const {root}=fixture(t);
 mkdirSync(join(root,'.claude'),{recursive:true});
 const old='/Users/example/.honcho/guardian-local/guardian-honcho-hook claude stop';
 writeFileSync(join(root,'.claude/settings.local.json'),JSON.stringify({hooks:{Stop:[{hooks:[{type:'command',command:old},{type:'command',command:'echo keep'}]}]}}));
 const profile=selectMemory(root,{provider:'honcho',capture:false});
 applyPlan(planMemory(root,profile,assets(),true));
 const before=JSON.parse(readFileSync(join(root,'.claude/settings.local.json')));
 assert.deepEqual(before.hooks.Stop[0].hooks,[{type:'command',command:'echo keep'}]);
 removeMemory(root,false);
 const after=readFileSync(join(root,'.claude/settings.local.json'),'utf8');
 assert.ok(!after.includes('guardian-honcho-hook'));assert.match(after,/echo keep/);
});

test('service dry run and malformed memory commands do not run Docker or write',t=>{
 const {root}=fixture(t);const before=walk(root);
 const preview=spawnSync(process.execPath,[cli,'memory','service','start','--dry-run'],{encoding:'utf8'});
 assert.equal(preview.status,0,preview.stderr);assert.match(preview.stdout,/No commands, downloads or API calls/);
 for(const args of [['service','start','--bad'],['setup',root,'--capture','maybe'],['setup',root,'--provider','remote']]){
  const result=spawnSync(process.execPath,[cli,'memory',...args],{encoding:'utf8'});assert.equal(result.status,1);
 }
 assert.deepEqual(walk(root),before);
});
