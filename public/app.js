'use strict';
const $=id=>document.getElementById(id);
const fmt=new Intl.NumberFormat('es-PE',{style:'currency',currency:'PEN'});
const state={user:null,modules:{},page:'home',q:'',pageNo:1,studentTab:'resumen',selection:null};
const days=['','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado','Domingo'];
// Iconos SVG propios: sin librerías externas, disponibles sin conexión.
const drawings={
'layout-dashboard':'<rect x="3" y="3" width="7" height="9" rx="1"/><rect x="14" y="3" width="7" height="5" rx="1"/><rect x="14" y="12" width="7" height="9" rx="1"/><rect x="3" y="16" width="7" height="5" rx="1"/>',
'users':'<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>',
'user-round':'<circle cx="12" cy="8" r="4"/><path d="M5 21a7 7 0 0 1 14 0"/>',
'user-plus':'<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M19 8v6m-3-3h6"/>',
'clipboard':'<rect x="5" y="4" width="14" height="18" rx="2"/><rect x="9" y="2" width="6" height="4" rx="1"/><path d="M9 12h6m-6 4h6"/>',
'credit-card':'<rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20"/>',
'calendar':'<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 10h18"/>',
'book':'<path d="M12 7v14M3 18.5A2.5 2.5 0 0 1 5.5 16H12V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v13.5ZM21 18.5a2.5 2.5 0 0 0-2.5-2.5H12V5a2 2 0 0 1 2-2h5a2 2 0 0 1 2 2v13.5Z"/>',
'graduation':'<path d="m2 10 10-5 10 5-10 5-10-5Zm4 2v5c3 3 9 3 12 0v-5M22 10v7"/>',
'clock':'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
'building':'<rect x="4" y="3" width="16" height="18" rx="2"/><path d="M9 21v-4h6v4M8 8h1m6 0h1M8 12h1m6 0h1"/>',
'file-text':'<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z"/><path d="M14 2v6h6M8 13h8m-8 4h8"/>',
'check-circle':'<circle cx="12" cy="12" r="9"/><path d="m8 12 3 3 5-6"/>',
'file-check':'<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z"/><path d="M14 2v6h6m-12 8 2 2 4-4"/>',
'chart':'<path d="M3 3v18h18M7 16v-4m5 4V7m5 9v-6"/>',
'wallet':'<rect x="2" y="6" width="20" height="15" rx="2"/><path d="M2 9h17m-2 6h2"/>',
'award':'<circle cx="12" cy="8" r="6"/><path d="m8.3 13.4-1 8L12 19l4.7 2.4-1-8"/>',
'file-plus':'<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z"/><path d="M14 2v6h6M12 12v7m-3-3.5h6"/>',
'settings':'<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.8 1.8 0 0 0 .4 2l-1.7 1.7a1.8 1.8 0 0 0-2-.4 8 8 0 0 1-2.1.9 1.8 1.8 0 0 0-1.2 1.7h-2.4a1.8 1.8 0 0 0-1.2-1.7 8 8 0 0 1-2.1-.9 1.8 1.8 0 0 0-2 .4L3.4 17a1.8 1.8 0 0 0 .4-2 8 8 0 0 1-.9-2.1A1.8 1.8 0 0 0 1.2 11h0V9a1.8 1.8 0 0 0 1.7-1.2 8 8 0 0 1 .9-2.1 1.8 1.8 0 0 0-.4-2L5.1 2a1.8 1.8 0 0 0 2 .4A8 8 0 0 1 9.2 1.5 1.8 1.8 0 0 0 10.4 0h2.4a1.8 1.8 0 0 0 1.2 1.5 8 8 0 0 1 2.1.9 1.8 1.8 0 0 0 2-.4l1.7 1.7a1.8 1.8 0 0 0-.4 2 8 8 0 0 1 .9 2.1A1.8 1.8 0 0 0 22 9v2a1.8 1.8 0 0 0-1.7 1.2A8 8 0 0 1 19.4 15Z"/>',
'shield':'<path d="M12 22s8-4 8-11V5l-8-3-8 3v6c0 7 8 11 8 11Z"/><path d="m9 12 2 2 4-4"/>',
'plus':'<path d="M12 5v14M5 12h14"/>',
'pencil':'<path d="m15 5 4 4M4 20l5-1 11-11a2.8 2.8 0 0 0-4-4L5 15l-1 5Z"/>',
'trash':'<path d="M3 6h18m-2 0-1 15H6L5 6m3 0V3h8v3m-6 4v7m4-7v7"/>',
'search':'<circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/>',
'alert':'<path d="m12 3 10 18H2L12 3Zm0 6v5m0 4h.01"/>',
'arrow-up-right':'<path d="M7 17 17 7M8 7h9v9"/>',
'arrow-right':'<path d="M5 12h14m-6-6 6 6-6 6"/>',
'sliders':'<path d="M4 7h16M4 17h16M9 4v6m6 4v6"/>',
'sparkles':'<path d="m12 3 1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9L12 3Zm7 13 .9 2.1L22 19l-2.1.9L19 22l-.9-2.1L16 19l2.1-.9L19 16Z"/>',
'folder':'<path d="M3 6a2 2 0 0 1 2-2h5l2 3h7a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6Z"/>',
'heart':'<path d="M20.8 5.6a5.5 5.5 0 0 0-7.8 0L12 6.8l-1-1.2a5.5 5.5 0 0 0-7.8 7.8L12 22l8.8-8.6a5.5 5.5 0 0 0 0-7.8Z"/>'
};
function ico(name,size=18){const shapes=drawings[name]||drawings.folder;return `<svg class="inline-icon" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${shapes}</svg>`;}
const navIcons={home:'layout-dashboard',ALUMNO:'users',MATRICULA:'clipboard',Pago:'wallet',Docente:'graduation',Grupo:'users',Horario:'calendar',Examen:'file-check',Examen_Grupo:'file-text',Nota_Examen:'award',Ciclo:'clock',Programa:'book',CURSOS:'book',Docente_Asignatura:'graduation',CARRERA:'graduation',Turno:'clock',Aula:'building',Usuario:'user-round',ROL:'shield'};
const pretty={DNI_Alu:'DNI del estudiante',Nomb_Alu:'Nombres y apellidos',Correo_Alu:'Correo electrónico',Fech_Nac:'Fecha de nacimiento',Cel_Alu:'Celular',Dir_Alu:'Dirección',Nomb_Apoderado:'Nombre del apoderado',DNI_Apoderado:'DNI del apoderado',Cel_Apoderado:'Celular del apoderado',Correo_Apoderado:'Correo del apoderado',PARENTESCO_Cod_Paren:'Parentesco',CARRERA_Cod_Carrera:'Carrera de interés',DNI_Doc:'DNI del docente',Nom_Doc:'Nombres del docente',Cel_Doc:'Celular',Nomb_Usuario:'Usuario de acceso',ALUMNO_DNI_Alu:'Estudiante',ROL_Cod_Rol:'Rol de usuario',Fech_Matricula:'Fecha de matrícula',Grupo_Cod_Grupo:'Grupo académico',Ciclo_Cod_Ciclo:'Ciclo académico',Aula_Cod_Aula:'Aula',Turno_Cod_Turno:'Turno',Programa_Cod_Programa:'Programa académico',ESTADO_CICLO_Cod_Estado:'Estado del ciclo',ESTADO_MATRICULA_Cod_Estado_Matricula:'Estado de matrícula',ESTADO_PAGO_Cod_Estado:'Estado de pago',CONCEPTO_PAGO_Cod_Concepto:'Concepto de pago',Nro_Mensualidad:'Número de mensualidad',Monto:'Monto (S/)',Medio_Pago:'Medio de pago',Fech_Pago:'Fecha y hora del pago',Fech_Vencimiento:'Fecha de vencimiento',MATRICULA_Cod_Matricula:'Matrícula relacionada',Usuario_Cod_Usuario:'Usuario que registró el cobro',Dia_Semana:'Día de la semana',Hr_Inicio:'Hora de inicio',Hr_Fin:'Hora de término',TIPO_BLOQUE_Cod_Tipo:'Tipo de bloque',Docente_Asignatura_CURSOS_Cod_Curso:'Curso',Docente_Asignatura_Docente_DNI_Doc:'Docente asignado',CURSOS_Cod_Curso:'Curso',Docente_DNI_Doc:'Docente',Examen_Cod_Examen:'Simulacro',Examen_Grupo_Cod_examen_grupo:'Simulacro asignado',ESTADO_EXAMEN_GRUPO_Cod_Estado_Examen:'Estado del simulacro',Publicado:'Publicar resultados a estudiantes',Nro_Mensualidades:'Número de pensiones',Precio_Mensual:'Precio mensual (S/)',puntaje_maximo:'Puntaje máximo',Puntaje_total:'Puntaje obtenido',Cupo_Max:'Cupo máximo',Capacidad:'Capacidad del aula',Fech_Inicio:'Fecha de inicio',Fech_Fin:'Fecha de finalización',Fech_programada:'Fecha programada',Hr_inicio:'Hora del examen',Duracion_minutos:'Duración (minutos)',Fech_registro:'Fecha de registro',Cod_Nota:'Código de nota'};
function label(k){if(pretty[k])return pretty[k];return k.replace(/_/g,' ').replace(/([a-z])([A-Z])/g,'$1 $2').replace(/^Cod /i,'Código de ').replace(/\b\w/g,c=>c.toUpperCase());}
function esc(v){return String(v??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));}
function fmtDate(value){if(!value)return '—';const s=String(value).slice(0,10);const parts=s.split('-');return parts.length===3?`${parts[2]}/${parts[1]}/${parts[0]}`:s;}
function fmtTime(value){if(value==null)return '—';const s=String(value);return s.includes('T')?s.slice(11,16):s.slice(0,5);}
function display(v,k){if(v===null||v===undefined||v==='')return '<span class="muted">—</span>';if(typeof v==='boolean')return `<span class="tag ${v?'good':'bad'}">${v?'Sí':'No'}</span>`;if(k==='Dia_Semana')return esc(days[Number(v)]||v);if(k.startsWith('Fech')||k==='Fech_registro')return fmtDate(v);if(k.toLowerCase().startsWith('hr_'))return fmtTime(v);if(k==='Monto'||k==='Precio_Mensual')return fmt.format(v);if(/^(ESTADO_|Estado$|Modalidad$)/.test(k)){const c=['PAGADO','ACTIVA','ACTIVO','RENDIDO','REGULAR'].includes(v)?'good':['PENDIENTE','PROGRAMADO'].includes(v)?'warn':'info';return `<span class="tag ${c}">${esc(v)}</span>`;}const t=String(v);return esc(t.length>56?t.slice(0,55)+'…':t);}
async function api(route,options={}){
  const response=await fetch('/api'+route,{credentials:'same-origin',headers:{'Content-Type':'application/json'},...options});
  let data;try{data=await response.json();}catch{throw Error('El servidor no devolvió una respuesta válida.');}
  if(!response.ok){if(response.status===401&&state.user){state.user=null;showLogin();}throw Error(data.error||`Error ${response.status}`);}
  return data;
}
let toastTimer;function toast(text,bad=false){const el=$('toast');el.innerHTML=`<span class="toast-symbol">${bad?'!':'✓'}</span><span>${esc(text)}</span>`;el.className='toast open'+(bad?' error':'');clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.className='toast',4300);}
function showLogin(){state.user=null;$('appView').hidden=true;$('loginView').hidden=false;closeModal();document.title='Iniciar sesión · Fractales Academy';}
function showApp(user){state.user=user;$('appView').hidden=false;$('loginView').hidden=true;$('roleBadge').textContent=user.rol==='ADMIN'?'Administrador':'Estudiante';$('avatarInitials').textContent=user.nombre.trim().split(/\s+/).slice(0,2).map(w=>w[0]).join('').toUpperCase();$('profileName').textContent=user.nombre;renderNav();navigate('home');if(user.cambiar)passwordModal(true);}
async function boot(){
  $('today').textContent=new Date().toLocaleDateString('es-PE',{weekday:'long',day:'numeric',month:'long'}); $('loginYear').textContent=$('footerYear').textContent=new Date().getFullYear();
  $('loginForm').addEventListener('submit',async(e)=>{e.preventDefault();const btn=$('loginSubmit');btn.disabled=true;$('loginError').hidden=true;try{const data=await api('/auth/login',{method:'POST',body:JSON.stringify({usuario:$('loginUser').value,clave:$('loginPass').value})});$('loginPass').value='';if(data.user.rol==='ADMIN')await loadMeta();showApp(data.user);}catch(err){$('loginError').textContent=err.message;$('loginError').hidden=false;}finally{btn.disabled=false;}});
  $('togglePass').onclick=()=>{const inp=$('loginPass');inp.type=inp.type==='password'?'text':'password';$('togglePass').textContent=inp.type==='password'?'Mostrar':'Ocultar';};
  $('logoutButton').onclick=logout;$('profileButton').onclick=()=>passwordModal(false);
  $('menuButton').onclick=()=>openMenu(true);$('mobileOverlay').onclick=()=>openMenu(false);$('closeSidebar').onclick=()=>openMenu(false);$('quickFindButton').onclick=openQuickFind;
  document.addEventListener('keydown',e=>{if(e.key==='Escape'){if(!state.user?.cambiar)closeModal();openMenu(false);}if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='k'&&state.user){e.preventDefault();openQuickFind();}});
  try {const d=await api('/auth/me');if(d.user.rol==='ADMIN')await loadMeta();showApp(d.user);}catch{showLogin();}
}
async function loadMeta(){const m=await api('/meta');state.modules=Object.fromEntries(m.modules.map(x=>[x.name,x]));}
async function logout(){try{await api('/auth/logout',{method:'POST',body:'{}'});}catch{}showLogin();}
function openMenu(value){$('sidebar').classList.toggle('open',value);$('mobileOverlay').hidden=!value;$('menuButton').setAttribute('aria-expanded',String(value));if(value)$('closeSidebar').focus();}
function navItem(id,title){return `<button type="button" class="nav-item ${state.page===id?'active':''}" ${state.page===id?'aria-current="page"':''} data-nav="${esc(id)}"><span class="nav-ico">${ico(navIcons[id]||'folder')}</span><span>${esc(title)}</span></button>`;}
function renderNav(){let html='<div class="nav-label">PRINCIPAL</div>'+navItem('home',state.user.rol==='ADMIN'?'Panel general':'Mi espacio');if(state.user.rol==='ADMIN'){let last='';for(const m of Object.values(state.modules)){if(m.category!==last){last=m.category;html+=`<div class="nav-label">${esc(last)}</div>`;}html+=navItem(m.name,m.label);}}else{html+=`<div class="nav-label">ACCESOS</div>${navItem('student-notes','Mis resultados')}${navItem('student-schedule','Mi horario')}${navItem('student-payments','Mis pagos')}`;}
  $('navContent').innerHTML=html;$('navContent').querySelectorAll('[data-nav]').forEach(el=>el.onclick=()=>navigate(el.dataset.nav));}
function header(crumb,title){$('crumb').textContent=crumb.toUpperCase();$('pageTitle').textContent=title;document.title=`${title} · Fractales Academy`;}
async function navigate(id,page=1){openMenu(false);state.page=id;state.pageNo=page;state.q='';renderNav();$('content').innerHTML='<div class="loading">Preparando tu espacio…</div>';
  try{if(state.user.cambiar){$('content').innerHTML='<div class="helper">Para empezar debes cambiar tu contraseña temporal.</div>';return;}
    if(state.user.rol==='ALUMNO')await studentView(id);
    else if(id==='home')await dashboard();else await tableView(id);
  }catch(e){$('content').innerHTML=`<div class="panel empty-state"><span class="big">⚠</span><strong>No se pudo cargar esta sección</strong>${esc(e.message)}<br><button class="btn btn-secondary" id="retryBtn">Reintentar</button></div>`;$('retryBtn').onclick=()=>navigate(id);}
}
async function dashboard(){
  header('Inicio','Panel general');
  const d=await api('/dashboard');
  const userName=state.user.nombre.trim().split(/\s+/)[0];
  const when=new Date().getHours(),greeting=when<12?'Buenos días':when<19?'Buenas tardes':'Buenas noches';
  const kpis=[
    {label:'Estudiantes registrados',value:d.alumnos,icon:'users',hint:'Alumnos en la base de datos'},
    {label:'Matrículas activas',value:d.matriculas,icon:'clipboard',hint:'Inscripciones vigentes'},
    {label:'Pagos pendientes',value:d.pendientes,icon:'credit-card',hint:'Cobros por gestionar'},
    {label:'Ingresos del mes',value:fmt.format(d.ingresos),icon:'chart',hint:'Pagos confirmados del mes'}
  ];
  $('content').innerHTML=`
    <div class="welcome-line"><div><span class="eyebrow">VISTA GENERAL</span><h2>${greeting}, ${esc(userName)} <span aria-hidden="true">✦</span></h2><p>Todo lo que sucede en tu academia, en un solo lugar.</p></div><span class="today-chip">${ico('calendar',14)} ${esc(new Date().toLocaleDateString('es-PE',{day:'numeric',month:'long',year:'numeric'}))}</span></div>
    <section class="banner-card"><div class="banner-copy"><span class="eyebrow">FRACTALES ACADEMY / GESTIÓN ACADÉMICA</span><h2>Un gran futuro<br><span>se construye hoy.</span></h2><p>Organiza estudiantes, matrículas y clases desde tu espacio de trabajo.</p><button class="banner-mini-btn" data-jump="MATRICULA">Gestionar matrículas ${ico('arrow-up-right',14)}</button></div><div class="banner-photo"><img src="/assets/banner-fractales.png" alt="Campaña institucional Fractales Academy"></div></section>
    <div class="stats-grid">${kpis.map(k=>`<div class="stat-card"><div class="stat-top"><span>${esc(k.label)}</span><div class="stat-icon">${ico(k.icon)}</div></div><div class="stat-value">${esc(k.value)}</div><div class="stat-hint">${esc(k.hint)}</div></div>`).join('')}</div>
    <div class="section-grid">
      <section class="panel"><div class="panel-head"><div><h3>Últimas matrículas</h3><p>Movimientos recientes de inscripción</p></div><button data-jump="MATRICULA" class="link-action">Ver todas ${ico('arrow-right',13)}</button></div><div class="panel-inner">${d.recent.length?d.recent.map(x=>`<div class="item-row"><div class="item-icon">${ico('user-round')}</div><div class="item-row-content"><strong>${esc(x.Nomb_Alu)}</strong><small>${esc(x.Nomb_Grupo)} · ${esc(x.Cod_Matricula)}</small></div><span class="tag">${fmtDate(x.Fech_Matricula)}</span></div>`).join(''):emptyInline('Todavía no hay matrículas recientes.')}</div></section>
      <section class="panel"><div class="panel-head"><div><h3>Agenda de simulacros</h3><p>Próximas evaluaciones programadas</p></div><button data-jump="Examen_Grupo" class="link-action">Ver agenda ${ico('arrow-right',13)}</button></div><div class="panel-inner">${d.exams.length?d.exams.map(x=>`<div class="item-row"><div class="item-icon">${ico('file-check')}</div><div class="item-row-content"><strong>${esc(x.Nomb_Examen)}</strong><small>${esc(x.Nomb_Grupo)}</small></div><span class="tag warn">${fmtDate(x.Fech_programada)}</span></div>`).join(''):emptyInline('No hay simulacros próximos en el calendario.')}</div></section>
    </div>
    <h3 class="dashboard-section-title">${ico('sparkles',18)} Accesos rápidos</h3><div class="quick-actions">${[
      ['ALUMNO','Nuevo estudiante','user-plus'],['MATRICULA','Nueva matrícula','clipboard'],['Pago','Registrar pago','wallet'],['Horario','Gestionar horarios','calendar']
    ].map(([key,value,iconName])=>`<button class="quick-action" data-jump="${key}"><span class="quick-action-symbol">${ico(iconName,18)}</span><span>${value}</span><span class="quick-action-arrow">↗</span></button>`).join('')}</div>`;
  $('content').querySelectorAll('[data-jump]').forEach(b=>b.onclick=()=>navigate(b.dataset.jump));
}
function emptyInline(msg){return `<div class="empty-state" style="padding:24px 8px">${esc(msg)}</div>`;}
function columnsFor(m){const ordered=[...m.display,...m.columns.map(c=>c.name)];return [...new Set(ordered)].filter(k=>!['Clave_Hash','Observaciones','Descripcion','Dir_Alu'].includes(k)).slice(0,6);}
let searchDebounce;
async function tableView(id){
  const m=state.modules[id];if(!m)throw Error('Módulo no encontrado.');header(m.category,m.label);
  const url=`/records/${encodeURIComponent(id)}?page=${state.pageNo}&q=${encodeURIComponent(state.q)}`;
  const data=await api(url);const cols=columnsFor(m);
  $('content').innerHTML=`
    <div class="module-header"><div><span class="eyebrow">${esc(m.category)} / ADMINISTRACIÓN</span><h2>${esc(m.label)}</h2><p>Organiza, consulta y actualiza la información de este módulo.</p></div><button class="btn btn-primary" id="addRecord">${ico('plus',16)} Crear registro</button></div>
    ${id==='Horario'?'<div class="helper"><strong>Control de horarios:</strong> se validan los cruces por grupo, aula y docente, considerando el ciclo y el turno.</div>':''}
    ${id==='Pago'?'<div class="helper"><strong>Política de cobros:</strong> verifica conceptos, matrícula inicial y mensualidades según las restricciones de SQL Server.</div>':''}
    <section class="panel"><div class="module-toolbar"><div class="search-wrap"><span aria-hidden="true">⌕</span><input class="search-input" type="search" id="searchRecords" value="${esc(state.q)}" placeholder="Buscar por nombre o código…" aria-label="Buscar registros"></div><span class="search-meta">${Number(data.count).toLocaleString('es-PE')} registros</span></div>
    ${data.rows.length?`<div class="table-scroll"><table><thead><tr>${cols.map(c=>`<th scope="col">${esc(label(c))}</th>`).join('')}<th scope="col">Acciones</th></tr></thead><tbody>${data.rows.map(row=>`<tr>${cols.map((col,i)=>`<td class="${i===0?'td-title':''}">${display(row[col],col)}</td>`).join('')}<td><div class="actions-cell"><button class="btn btn-secondary btn-sm" data-edit="${esc(row._id)}" aria-label="Editar registro">${ico('pencil',13)} Editar</button><button class="btn btn-danger btn-sm" data-delete="${esc(row._id)}" aria-label="Eliminar registro">${ico('trash',13)} Eliminar</button></div></td></tr>`).join('')}</tbody></table></div>`:`<div class="empty-state"><span class="big">${ico('folder',26)}</span><strong>Sin registros ${state.q?'para esta búsqueda':''}</strong><p>${state.q?'Prueba con otro nombre o código.':'Todavía no hay datos aquí. Crea tu primer registro para empezar.'}</p></div>`}
    <div class="table-bottom"><span>Página ${state.pageNo} de ${Math.max(1,Math.ceil(data.count/data.pageSize))}</span><div class="pager"><button id="prevPage" ${state.pageNo===1?'disabled':''}>← Anterior</button><button id="nextPage" ${state.pageNo*data.pageSize>=data.count?'disabled':''}>Siguiente →</button></div></div></section>`;
  $('addRecord').onclick=()=>recordModal(m,null);
  $('searchRecords').addEventListener('input',e=>{const q=e.target.value;const pos=e.target.selectionStart;clearTimeout(searchDebounce);searchDebounce=setTimeout(async()=>{
    state.q=q;state.pageNo=1;try{await tableView(id);const input=$('searchRecords');if(input&&document.activeElement!==input){input.focus();try{input.setSelectionRange(pos,pos);}catch{}}}catch(err){toast(err.message,true);}
  },400);});
  $('prevPage').onclick=()=>{state.pageNo--;tableView(id).catch(e=>toast(e.message,true));};
  $('nextPage').onclick=()=>{state.pageNo++;tableView(id).catch(e=>toast(e.message,true));};
  $('content').querySelectorAll('[data-edit]').forEach(btn=>btn.onclick=()=>{const row=data.rows.find(x=>x._id===btn.dataset.edit);if(row)recordModal(m,row);});
  $('content').querySelectorAll('[data-delete]').forEach(btn=>btn.onclick=()=>{const row=data.rows.find(x=>x._id===btn.dataset.delete);if(row)deleteModal(m,row);});
}
let modalFocusOrigin=null;function modal(title,sub,body,footer){modalFocusOrigin=document.activeElement;$('modalRoot').hidden=false;document.body.classList.add('modal-open');$('modalRoot').innerHTML=`<div class="modal" role="dialog" aria-modal="true" aria-label="${esc(title)}"><div class="modal-head"><div><h2>${esc(title)}</h2><p>${esc(sub||'')}</p></div><button class="close-modal" aria-label="Cerrar">×</button></div>${body}${footer||''}</div>`;
  $('modalRoot').querySelector('.close-modal').onclick=closeModal;setTimeout(()=>$('modalRoot').querySelector('input,button')?.focus(),0);}
function closeModal(){const root=$('modalRoot');root.hidden=true;root.innerHTML='';document.body.classList.remove('modal-open');if(modalFocusOrigin?.isConnected)modalFocusOrigin.focus();modalFocusOrigin=null;}
function initialValue(col,m,existing){if(existing)return existing[col.name];const key=col.name;
  if(key==='ESTADO_MATRICULA_Cod_Estado_Matricula')return 'ACTIVA';
  if(key==='ESTADO_PAGO_Cod_Estado')return 'PENDIENTE';
  if(key==='ESTADO_CICLO_Cod_Estado'||key==='ESTADO_EXAMEN_GRUPO_Cod_Estado_Examen')return 'PROGRAMADO';
  if(key==='Modalidad')return 'REGULAR';if(key==='Nro_Mensualidades')return 4;
  if(key==='Precio_Mensual')return 250;
  if(key==='ROL_Cod_Rol')return 'ALUMNO';
  if(key==='Activo'||key==='Activa'||key==='activo')return true;
  if(key==='Fech_Matricula')return new Date().toISOString().slice(0,10);
  if(key==='Publicado'||key==='Debe_Cambiar_Clave')return false;
  return '';
}
function htmlValue(v,col){if(v==null)return '';if(col.type==='time')return fmtTime(v);if(col.type==='date')return String(v).slice(0,10);if(col.type==='datetime2')return String(v).slice(0,16);return String(v);}
function selectOptions(field,value){let opts=[];
  if(field.name==='Modalidad')opts=['REGULAR','ACELERADO'];
  if(field.name==='Medio_Pago')opts=['YAPE','EFECTIVO','TARJETA'];
  if(field.name==='Estado'&&state.page==='Examen_Grupo')opts=['PROGRAMADO','RENDIDO','CANCELADO'];
  if(field.name==='Dia_Semana')opts=[1,2,3,4,5,6,7];
  return opts.map(v=>`<option value="${esc(v)}" ${String(value)===String(v)?'selected':''}>${field.name==='Dia_Semana'?days[v]:esc(v)}</option>`).join('');
}
function formControl(col,m,existing){const name=col.name;
  if(name==='Usuario_Cod_Usuario'&&m.name==='Pago')return '';
  if(name==='Fech_Pago'&&m.name==='Pago')return '';
  if(name==='Estado'&&m.name==='Examen_Grupo')return '';
  if(name==='Clave_Hash')return '';
  const v=initialValue(col,m,existing);
  const pkAuto=!existing&&col.pk&&m.pk.length===1&&/^Cod_/i.test(name)&&!['ROL','TIPO_BLOQUE','CONCEPTO_PAGO','ESTADO_CICLO','ESTADO_EXAMEN_GRUPO','ESTADO_MATRICULA','ESTADO_PAGO','PARENTESCO','Programa'].includes(m.name);
  const required=col.required&&!col.default&&!pkAuto&&!existing;
  const mark=required?'<span class="required-mark"> *</span>':'';
  const inpBase=`name="${esc(name)}" id="field-${esc(name)}" data-field="${esc(name)}" ${required?'required':''} ${existing&&col.pk?'disabled':''}`;
  let el='';
  if(col.references){el=`<select ${inpBase}><option value="">${col.required?'Selecciona una opción':'Sin asignar'}</option>${v!==''&&v!=null?`<option value="${esc(v)}" selected>${esc(v)}</option>`:''}</select>`;}
  else if(col.type==='bit')el=`<select ${inpBase}><option value="true" ${v===true||v===1?'selected':''}>Sí</option><option value="false" ${v===false||v===0||v===''?'selected':''}>No</option></select>`;
  else if(['Dia_Semana','Modalidad','Medio_Pago'].includes(name))el=`<select ${inpBase}>${name==='Medio_Pago'?'<option value="">Sin especificar</option>':''}${selectOptions(col,v)}</select>`;
  else if(['Descripcion','Observaciones','Dir_Alu'].includes(name))el=`<textarea ${inpBase} maxlength="${col.length||250}" placeholder="Escribe aquí…">${esc(htmlValue(v,col))}</textarea>`;
  else {const type=col.type==='date'?'date':col.type==='time'?'time':col.type==='datetime2'?'datetime-local':['tinyint','smallint','decimal'].includes(col.type)?'number':'text';
    const num=type==='number'?` min="0" step="${col.type==='decimal'?'0.01':'1'}"`:'';
    el=`<input ${inpBase} type="${type}" ${num} ${col.length&&type==='text'?`maxlength="${col.length}"`:''} value="${esc(htmlValue(v,col))}" placeholder="${pkAuto?'Automático si lo dejas vacío':`Ingresa ${label(name).toLowerCase()}`}">`;
  }
  const note=pkAuto?'<div class="field-note">Opcional: se genera un código único automáticamente.</div>':null;
  return `<div class="field ${['Descripcion','Observaciones','Dir_Alu'].includes(name)?'full':''}"><label for="field-${esc(name)}">${esc(label(name))}${mark}</label>${el}${note||''}</div>`;
}
async function recordModal(m,record){const creating=!record;const body=`<form id="recordForm"><div class="form-grid">${m.columns.map(c=>formControl(c,m,record)).join('')}${m.name==='Usuario'?`<div class="field full"><label for="newSecret">${creating?'Contraseña inicial *':'Nueva contraseña (opcional)'}</label><input type="password" id="newSecret" minlength="12" maxlength="72" ${creating?'required':''} autocomplete="new-password" placeholder="Mínimo 12 caracteres"><div class="field-note">Las contraseñas se almacenan cifradas, nunca como texto legible.</div></div>`:''}</div><div class="form-actions"><button class="btn btn-secondary" type="button" id="cancelRecord">Cancelar</button><button class="btn btn-primary" id="saveRecord" type="submit">${creating?'Crear registro':'Guardar cambios'} →</button></div></form>`;
  modal(creating?'Nuevo registro':'Editar registro',m.label,body);
  $('cancelRecord').onclick=closeModal;
  const refs=m.columns.filter(c=>c.references).map(c=>({field:c.name,ref:c.references.table,refCol:c.references.column}));
  await Promise.all(refs.map(async({field,ref,refCol})=>{
    const select=$('field-'+field);if(!select)return;
    try{const result=await api(`/options/${encodeURIComponent(ref)}?valueCol=${encodeURIComponent(refCol)}`);if($('field-'+field)!==select)return;
      const old=select.value;
      const opts=[...select.options].filter(o=>!o.value).map(o=>o.outerHTML).join('');
      select.innerHTML=opts+result.rows.map(opt=>`<option value="${esc(opt.value)}">${esc(opt.label)}</option>`).join('');
      if(old&&!result.rows.some(r=>String(r.value)===old))select.innerHTML+=`<option value="${esc(old)}">${esc(old)}</option>`;
      select.value=old;
    }catch(err){toast(`No se cargaron opciones de ${ref}: ${err.message}`,true);}
  }));
  const cycle=$('field-Modalidad');if(cycle)cycle.addEventListener('change',()=>{if(!record&&$('field-Nro_Mensualidades'))$('field-Nro_Mensualidades').value=cycle.value==='ACELERADO'?2:4;});
  const eg=$('field-Examen_Grupo_Cod_examen_grupo');if(eg&&m.name==='Nota_Examen')eg.addEventListener('change',async()=>{if(!eg.value)return;try{const d=await api(`/options/Examen_Grupo?q=${encodeURIComponent(eg.value)}`);const match=d.rows.find(x=>x.value===eg.value);if(match&&$('field-Grupo_Cod_Grupo'))$('field-Grupo_Cod_Grupo').value=match.row.Grupo_Cod_Grupo;}catch{}});
  // El usuario puede cerrar la ventana mientras se cargan los catálogos.
  if(!$('recordForm'))return;
  $('recordForm').addEventListener('submit',async(e)=>{e.preventDefault();const data={};
    for(const c of m.columns){const el=$('field-'+c.name);if(!el||el.disabled)continue;let v=el.value;
      if(v==='') {if(c.required&&!c.pk&&!c.default) {toast(`Completa ${label(c.name)}.`,true);return;}if(c.pk&&!record)continue; v=null;}
      else if(c.type==='bit')v=v==='true';
      else if(['tinyint','smallint','decimal'].includes(c.type))v=Number(v);
      data[c.name]=v;
    }
    if(m.name==='Usuario'){const secret=$('newSecret').value;if(secret)data.Nueva_Clave=secret;}
    const btn=$('saveRecord');btn.disabled=true;btn.textContent='Guardando…';
    try{const url=`/records/${encodeURIComponent(m.name)}${record?'/'+encodeURIComponent(record._id):''}`;
      await api(url,{method:record?'PUT':'POST',body:JSON.stringify(data)});closeModal();toast(record?'Registro actualizado correctamente.':'Registro creado correctamente.');await tableView(m.name);
    }catch(err){toast(err.message,true);}finally{if(btn.isConnected){btn.disabled=false;btn.textContent=record?'Guardar cambios':'Crear registro';}}
  });
}
function deleteModal(m,record){const desc=m.display.map(k=>record[k]).filter(Boolean).join(' · ');
  modal('Confirmar eliminación',m.label,`<div class="panel-inner"><p>¿Quieres eliminar <strong>${esc(desc)}</strong>?</p><p class="muted">Si el registro tiene información relacionada, SQL Server impedirá eliminarlo. Para usuarios se recomienda desactivar la cuenta.</p></div>`, `<div class="form-actions"><button id="deleteCancel" class="btn btn-secondary">Cancelar</button><button id="deleteConfirm" class="btn btn-danger">Sí, eliminar</button></div>`);
  $('deleteCancel').onclick=closeModal;
  $('deleteConfirm').onclick=async()=>{try{await api(`/records/${encodeURIComponent(m.name)}/${encodeURIComponent(record._id)}`,{method:'DELETE',body:'{}'});closeModal();toast('Registro eliminado.');await tableView(m.name);}catch(e){toast(e.message,true);}};
}
function passwordModal(force){modal('Seguridad de tu cuenta',force?'Es obligatorio cambiar la contraseña inicial.':'Actualiza tu contraseña de acceso.',`<form id="passwordForm"><div class="form-grid"><div class="field full"><label>Contraseña actual *</label><input type="password" name="actual" required autocomplete="current-password"></div><div class="field full"><label>Nueva contraseña *</label><input type="password" name="nueva" minlength="12" maxlength="72" required autocomplete="new-password"></div></div><p class="password-info">Utiliza al menos 12 caracteres. No compartas tu contraseña con otras personas.</p><div class="form-actions"><button type="submit" class="btn btn-primary">Actualizar contraseña</button></div></form>`);
  if(force){$('modalRoot').querySelector('.close-modal').hidden=true;} $('passwordForm').onsubmit=async(e)=>{e.preventDefault();const fd=new FormData(e.currentTarget);try{const d=await api('/auth/change-password',{method:'POST',body:JSON.stringify(Object.fromEntries(fd.entries()))});state.user=d.user;closeModal();toast('Contraseña actualizada.');navigate('home');}catch(err){toast(err.message,true);}};
}
function panel(title,subtitle,columns,rows){return `<section class="panel wide-panel"><div class="panel-head"><div><h3>${esc(title)}</h3><p>${esc(subtitle)}</p></div><span class="tag">${rows.length} registros</span></div>${rows.length?`<div class="table-scroll"><table><thead><tr>${columns.map(x=>`<th>${esc(x[1])}</th>`).join('')}</tr></thead><tbody>${rows.map(row=>`<tr>${columns.map(([key])=>`<td>${display(row[key],key)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`:emptyInline('Aún no hay información disponible.')}</section>`;}
function studentWelcome(){
  const hour=new Date().getHours();
  return hour<12?'¡Buenos días':hour<19?'¡Buenas tardes':'¡Buenas noches';
}
function schoolTag(value){return `<span class="pill-soft">${esc(value||'Sin asignar')}</span>`;}
function statStudent(title,value,subtitle,icon,style='orange'){
  return `<article class="student-metric ${style}"><div class="student-metric-symbol">${ico(icon,20)}</div><p>${esc(title)}</p><strong>${esc(value)}</strong><small>${esc(subtitle)}</small></article>`;
}
function studentEmpty(icon,title,text){return `<div class="student-empty">${ico(icon,28)}<strong>${esc(title)}</strong><p>${esc(text)}</p></div>`;}
function studentGroupCard(g){return `<article class="student-group-card"><div class="group-tile-art">${ico('graduation',26)}</div><div><span class="tiny-label">MI GRUPO</span><h4>${esc(g.Nomb_Grupo||'Grupo asignado')}</h4><p>${esc(g.Nomb_Ciclo||'Ciclo')} · ${esc(g.Nomb_Programa||'Programa')}</p></div>${schoolTag(g.ESTADO_MATRICULA_Cod_Estado_Matricula)}</article>`;}
function studentResults(d){
  if(!d.notes.length)return studentEmpty('award','Tus notas aparecerán aquí','Verás los puntajes de simulacros cuando la academia los publique.');
  return `<div class="student-result-list">${d.notes.map(n=>{
    const score=Number(n.Puntaje_total),maximum=Number(n.puntaje_maximo);
    const ok=Number.isFinite(score)&&Number.isFinite(maximum)&&maximum>0;
    const width=ok?Math.max(0,Math.min(100,score/maximum*100)):0;
    return `<article class="student-result"><div class="student-result-head"><div><span class="tiny-label">SIMULACRO PUBLICADO</span><h4>${esc(n.Nomb_Examen||'Evaluación')}</h4><p>${esc(n.Nomb_Grupo||'')} · ${fmtDate(n.Fech_programada)}</p></div><div class="result-score"><strong>${esc(n.Puntaje_total)}</strong><small>${ok?'de '+esc(n.puntaje_maximo)+' puntos':'puntos'}</small></div></div>${ok?`<div class="student-progress-track" role="progressbar" aria-label="Porcentaje de puntaje en ${esc(n.Nomb_Examen)}" aria-valuenow="${Math.round(width)}" aria-valuemin="0" aria-valuemax="100"><span style="width:${width}%"></span></div>`:''}</article>`;
  }).join('')}</div>`;
}
function studentCalendar(d){
  if(!d.schedule.length)return studentEmpty('calendar','Sin horarios publicados','Tus clases se mostrarán cuando la academia registre un horario para tu grupo.');
  const grouped=new Map();
  for(const item of d.schedule){const day=Number(item.Dia_Semana);const name=days[day]||String(item.Dia_Semana||'Día');if(!grouped.has(name))grouped.set(name,[]);grouped.get(name).push(item);}
  return `<div class="student-timetable">${[...grouped].map(([day,rows])=>`<section class="student-day"><div class="student-day-title"><span class="day-dot"></span><h4>${esc(day)}</h4><span>${rows.length} ${rows.length===1?'bloque':'bloques'}</span></div><div class="student-classes">${rows.map(r=>`<article class="student-class"><span class="class-clock">${ico('clock',15)} ${fmtTime(r.Hr_Inicio)}–${fmtTime(r.Hr_Fin)}</span><div><strong>${esc(r.Nomb_Curso||'Bloque académico')}</strong><small>${esc(r.Nom_Doc||'Docente por confirmar')} · ${esc(r.Nomb_Grupo||'')}</small></div></article>`).join('')}</div></section>`).join('')}</div>`;
}
function studentPaymentCard(p){
 const status=String(p.ESTADO_PAGO_Cod_Estado||'').toUpperCase();
 const statusClass=status==='PAGADO'?'paid':status==='PENDIENTE'?'pending':'neutral';
 return `<article class="student-payment"><div class="payment-icon">${ico('credit-card',20)}</div><div class="payment-details"><strong>${esc(p.CONCEPTO_PAGO_Cod_Concepto||'Concepto académico')}${p.Nro_Mensualidad?' · Mes '+esc(p.Nro_Mensualidad):''}</strong><small>Vencimiento: ${fmtDate(p.Fech_Vencimiento)}</small></div><div class="payment-amount"><b>${fmt.format(Number(p.Monto)||0)}</b><span class="payment-status ${statusClass}">${esc(status||'SIN ESTADO')}</span></div></article>`;
}
async function studentView(page){
  header('Portal del estudiante','Mi espacio académico');
  const d=await api('/student/overview');
  const first=String(d.profile?.Nomb_Alu||state.user.nombre||'Estudiante').trim().split(/\s+/)[0];
  const now=new Date();
  const tabs=[['resumen','Inicio','layout-dashboard'],['horario','Mi horario','calendar'],['notas','Mis notas','award'],['pagos','Mis pagos','credit-card']];
  let tab=page==='student-notes'?'notas':page==='student-schedule'?'horario':page==='student-payments'?'pagos':'resumen';
  const pending=d.payments.filter(x=>String(x.ESTADO_PAGO_Cod_Estado).toUpperCase()==='PENDIENTE');
  const headline=`${studentWelcome()}, ${esc(first)}!`;
  $('content').innerHTML=`<div class="student-page"><section class="student-welcome">
     <div class="student-welcome-overlay"></div><div class="student-floating-spark spark-one" aria-hidden="true">✦</div><div class="student-floating-spark spark-two" aria-hidden="true">✳</div>
     <div class="student-welcome-copy"><span class="student-eyebrow"><i></i> TU ESPACIO DE APRENDIZAJE</span><h2>${headline} <span class="student-hello-hand" aria-hidden="true">👋</span></h2><p>Un paso a la vez, estás construyendo tu futuro. Aquí tienes todo para organizar tu camino académico.</p><div class="student-hero-actions"><button type="button" class="student-hero-button" data-student-go="horario">Ver mis clases ${ico('arrow-right',15)}</button><span class="student-date">${ico('calendar',15)} ${esc(now.toLocaleDateString('es-PE',{day:'numeric',month:'long'}))}</span></div></div>
     <div class="student-floating-note" aria-hidden="true"><span>✦</span><strong>Hoy cuenta</strong><small>Sigue avanzando</small></div>
  </section>
  <nav class="student-tabs student-modern-tabs" aria-label="Secciones del estudiante">${tabs.map(([key,label,iconName])=>`<button type="button" class="student-tab ${tab===key?'active':''}" data-tab="${key}" ${tab===key?'aria-current="page"':''}>${ico(iconName,17)}<span>${label}</span></button>`).join('')}</nav>
  <div id="studentContent" class="student-content" aria-live="polite"></div></div>`;
  const root=$('content');
  function switchTab(key){tab=key;root.querySelectorAll('[data-tab]').forEach(btn=>{const selected=btn.dataset.tab===tab;btn.classList.toggle('active',selected);if(selected)btn.setAttribute('aria-current','page');else btn.removeAttribute('aria-current');});renderTab();}
  root.querySelectorAll('[data-tab]').forEach(btn=>btn.addEventListener('click',()=>switchTab(btn.dataset.tab)));
  root.querySelectorAll('[data-student-go]').forEach(btn=>btn.addEventListener('click',()=>switchTab(btn.dataset.studentGo)));
  function studentSection(title,caption,body,action){return `<section class="student-block"><div class="student-block-heading"><div><span class="tiny-label">FRACTALES ACADEMY</span><h3>${esc(title)}</h3><p>${esc(caption)}</p></div>${action||''}</div>${body}</section>`;}
  function renderTab(){let content='';
    if(tab==='resumen'){
      content=`<div class="student-kpis">${statStudent('Mis grupos',d.groups.length,'Matrículas registradas','graduation','tangerine')}${statStudent('Mis clases',d.schedule.length,'Bloques semanales','calendar','teal')}${statStudent('Mis notas',d.notes.length,'Resultados publicados','award','violet')}${statStudent('Próximos exámenes',d.exams.length,'Simulacros programados','file-check','rose')}</div>`;
      content+=`<div class="student-dashboard-grid"><div class="student-dashboard-main">`;
      content+=studentSection('Tu próximo paso','Accede rápidamente a tu información académica',`<div class="student-access-grid"><button data-student-go="horario" class="student-access-card"><span class="access-illustration blue">${ico('calendar',26)}</span><strong>Organiza tu semana</strong><small>Revisa tus días y horarios de clase</small><span class="access-arrow">↗</span></button><button data-student-go="notas" class="student-access-card"><span class="access-illustration violet">${ico('award',26)}</span><strong>Sigue tus logros</strong><small>Consulta las notas ya publicadas</small><span class="access-arrow">↗</span></button><button data-student-go="pagos" class="student-access-card"><span class="access-illustration peach">${ico('credit-card',26)}</span><strong>Consulta tus pagos</strong><small>${pending.length?`${pending.length} registro(s) pendiente(s)`:'Revisa tu historial y vencimientos'}</small><span class="access-arrow">↗</span></button></div>`);
      content+=studentSection('Mis grupos','Tu lugar en Fractales Academy',d.groups.length?`<div class="student-groups">${d.groups.map(studentGroupCard).join('')}</div>`:studentEmpty('users','No tienes grupos registrados','Cuando te matricules, tus grupos se mostrarán aquí.'));
      content+=`</div><aside class="student-dashboard-side"><section class="student-story-card"><img src="/assets/estudio-ilustracion.svg" alt="Ilustración de cuadernos y materiales para estudiar" loading="lazy"><span class="tiny-label">TU MOTIVACIÓN DEL DÍA</span><h3>Tu esfuerzo abre posibilidades.</h3><p>Aprende, crece y trasciende. Cada clase es una oportunidad.</p></section>`;
      content+=`<section class="student-aside-panel"><div class="student-aside-title">${ico('file-check',20)}<h3>Próximos simulacros</h3></div>${d.exams.length?`<div class="student-exam-list">${d.exams.slice(0,4).map(x=>`<div class="student-exam"><span class="exam-date">${fmtDate(x.Fech_programada)}</span><strong>${esc(x.Nomb_Examen)}</strong><small>${esc(x.Nomb_Grupo||'')} · ${fmtTime(x.Hr_inicio)}</small></div>`).join('')}</div>`:studentEmpty('calendar','Sin simulacros programados','La academia publicará los próximos exámenes aquí.')}</section></aside></div>`;
    }else if(tab==='horario'){
      content=studentSection('Tu horario semanal','Revisa tus clases de los grupos con matrícula activa',studentCalendar(d));
    }else if(tab==='notas'){
      content=studentSection('Tus resultados','Solo puedes ver las evaluaciones publicadas por la academia',studentResults(d));
    }else{
      content=studentSection('Pagos y pensiones','Información registrada por administración; para consultas, comunícate con la academia',d.payments.length?`<div class="student-payment-list">${d.payments.map(studentPaymentCard).join('')}</div>`:studentEmpty('credit-card','Sin pagos registrados','Tu historial de pagos aparecerá aquí cuando esté disponible.'));
    }
    $('studentContent').innerHTML=content;
    $('studentContent').querySelectorAll('[data-student-go]').forEach(btn=>btn.addEventListener('click',()=>switchTab(btn.dataset.studentGo)));
  }
  renderTab();
}

function openQuickFind(){
  if(!state.user)return;
  const aliases={ALUMNO:'alumno alumnos estudiante estudiantes',MATRICULA:'matricula matrícula inscripción inscripciones',Pago:'pago pagos cobro cobros',Docente:'profesor profesores docentes',Horario:'horario horarios clase clases',Examen:'examen simulacro evaluación',Examen_Grupo:'simulacro programación',Nota_Examen:'nota notas resultados',Usuario:'usuario usuarios cuentas'};
  const entries=state.user.rol==='ADMIN'?[{id:'home',name:'Panel general',cat:'Principal'},...Object.values(state.modules).map(m=>({id:m.name,name:m.label,cat:m.category}))]:[
    {id:'home',name:'Mi espacio',cat:'Estudiante'}, {id:'student-notes',name:'Mis resultados',cat:'Estudiante'},
    {id:'student-schedule',name:'Mi horario',cat:'Estudiante'},{id:'student-payments',name:'Mis pagos',cat:'Estudiante'}];
  modal('Buscar un módulo','Accede rápidamente a cualquier sección',`<div class="command-search">${ico('search',21)}<input id="commandInput" type="search" aria-label="Buscar módulo" placeholder="Escribe el nombre de una sección…" autocomplete="off"></div><div class="command-results" id="commandResults"></div><div class="command-footer"><span>Selecciona una sección para navegar</span><span>ESC para cerrar</span></div>`);
  $('modalRoot').querySelector('.modal').classList.add('command-modal');
  const input=$('commandInput'),results=$('commandResults');
  function paint(){const term=input.value.trim().toLocaleLowerCase('es');const matches=entries.filter(x=>(x.name+' '+x.cat+' '+(aliases[x.id]||'')).toLocaleLowerCase('es').includes(term)).slice(0,17);
    results.innerHTML=matches.length?matches.map(x=>`<button class="command-result" data-find-nav="${esc(x.id)}"><span class="command-result-icon">${ico(navIcons[x.id]||'folder')}</span><span><strong>${esc(x.name)}</strong><small>${esc(x.cat)}</small></span><span class="command-result-arrow">↗</span></button>`).join(''):'<div class="command-empty">No encontramos una sección con ese nombre.</div>';
    results.querySelectorAll('[data-find-nav]').forEach(b=>b.onclick=()=>{const id=b.dataset.findNav;closeModal();navigate(id);});
  }
  input.addEventListener('input',paint);input.addEventListener('keydown',e=>{if(e.key==='Enter'){const first=results.querySelector('[data-find-nav]');if(first){e.preventDefault();first.click();}}});
  paint();input.focus();
}
document.addEventListener('DOMContentLoaded',boot);
