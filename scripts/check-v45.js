'use strict';
const fs=require('node:fs'),path=require('node:path'),{spawnSync}=require('node:child_process'),assert=require('node:assert/strict');let count=0;
for(const dir of ['server','public','scripts','tests'])for(const file of fs.readdirSync(dir)){if(!file.endsWith('.js'))continue;const name=path.join(dir,file),r=spawnSync(process.execPath,['--check',name],{encoding:'utf8'});if(r.status!==0)throw Error(r.stderr);count++;}
const model=require('../server/model.json');for(const m of Object.values(model)){assert.match(m.name,/^[A-Z][A-Z0-9_]*$/);for(const c of m.columns){assert.match(c.name,/^[A-Z][A-Z0-9_]*$/);if(c.references){assert.ok(model[c.references.table]);assert.ok(model[c.references.table].columns.some(col=>col.name===c.references.column));}}}
const html=fs.readFileSync('public/index.html','utf8');for(const match of html.matchAll(/(?:src|href)="(\/(?:[\w./-]+\.(?:js|css|svg|png|webp)))(?:\?[^" ]*)?"/g))assert.ok(fs.existsSync('public'+match[1]),match[1]);
assert.equal(require('../package.json').version,require('../package-lock.json').version);console.log('PASS sintaxis:',count,'archivos; modelo normalizado, referencias y recursos del frontend.');
