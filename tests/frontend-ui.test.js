'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.join(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const html=read('public/index.html'),css=read('public/styles.css'),js=read('public/app.js');
test('elementos esenciales de inicio de sesión y navegación están presentes',()=>{
 for(const id of ['loginForm','loginUser','loginPass','appView','navContent','content','modalRoot','quickFindButton','mobileOverlay','closeSidebar','avatarInitials']){
  assert.match(html,new RegExp(`id="${id}"`));
 }
});
test('la identidad usa los archivos oficiales',()=>{
 assert.ok(fs.existsSync(path.join(root,'public/assets/logo-original.png')));
 assert.ok(fs.existsSync(path.join(root,'public/assets/banner-fractales.png')));
 assert.match(css,/--orange:\s*#f47524/);
});
test('se preservan las rutas de API y los formularios',()=>{
 for(const req of ['/auth/login','/auth/me','/meta','/dashboard','/records/','/student/overview'])assert.ok(js.includes(req),req);
 assert.match(js,/function recordModal|async function recordModal/);
 assert.match(js,/function openQuickFind\(/);
 assert.match(js,/function openMenu\(/);
});
test('animaciones y experiencia móvil respetan accesibilidad',()=>{
 assert.match(css,/prefers-reduced-motion:\s*reduce/);
 assert.match(css,/@media\(max-width:650px\)/);
 assert.match(html,/aria-live="polite"/);
 assert.match(css,/focus-visible/);
});
test('vista previa independiente y rotulada como ficticia',()=>{
 const demo=read('VISTA_PREVIA_OFFLINE.html');
 assert.match(demo,/DATOS FICTICIOS/);
 assert.match(demo,/window\.fetch=/);
 assert.match(demo,/function openQuickFind/);
});
