'use strict';
const V4={
  options(rows,key,text,empty='Selecciona una opción'){
    return `<option value="">${esc(empty)}</option>`+rows.map(r=>`<option value="${esc(r[key])}">${esc(typeof text==='function'?text(r):r[text])}</option>`).join('');
  },
  async submit(form,work){
    const button=form.querySelector('[type="submit"]');if(button.disabled)return;
    button.disabled=true;
    try{await work();}catch(e){toast(e.message,true);}finally{if(button.isConnected)button.disabled=false;}
  },
  financeSummary(rows){
    const total=status=>rows.filter(p=>p.ID_ESTADO_PAGO===status).reduce((n,p)=>n+Math.round(Number(p.MONTO)*100),0)/100;
    return `<div class="v4-totals"><article><small>Total pagado</small><strong>${fmt.format(total('PAGADO'))}</strong></article><article><small>Total pendiente</small><strong>${fmt.format(total('PENDIENTE'))}</strong></article></div>`;
  },
  async enrollmentView(){
    header('Administración','Inscripción integral');const ctx=await api('/academic/context');const access=await api('/auth/capabilities').catch(()=>({v41:false}));
    $('content').innerHTML=`<div class="module-header"><div><span class="eyebrow">REGISTRO Y REINSCRIPCIÓN</span><h2>Inscribir estudiante</h2><p>Consulta el DNI y selecciona el ciclo y grupo académico.</p></div></div>
      <section class="panel v4-form-panel"><form id="enrollmentForm">
      <div class="v4-search"><div class="field"><label for="enrollDni">DNI del estudiante *</label><input id="enrollDni" required inputmode="numeric" pattern="[0-9]{8}" minlength="8" maxlength="8" autocomplete="off"></div><button type="button" class="btn btn-secondary" id="lookupStudent">Consultar DNI</button></div>
      <div id="enrollLookup" role="status">Consulta el DNI para continuar.</div>
      <fieldset id="enrollDetails" hidden disabled class="v4-fieldset"><h3>Datos del estudiante y apoderado</h3><div class="form-grid">${state.modules.ALUMNO.columns.filter(c=>c.name!=='DNI_ALUMNO').map(c=>formControl(c,state.modules.ALUMNO,null)).join('')}</div>
      <h3>PROGRAMA y matrícula</h3><div class="form-grid">
      ${[['enrollProgram','PROGRAMA académico'],['enrollMode','MODALIDAD'],['enrollCycle','CICLO académico'],['enrollShift','TURNO'],['enrollGroup','HORARIO_ACADEMICO académico']].map(([id,name])=>`<div class="field"><label for="${id}">${name} *</label><select id="${id}" required></select></div>`).join('')}</div>
      <div class="helper" id="enrollSummary" aria-live="polite">Selecciona el grupo para revisar los cargos.</div>
      ${access.v41?'<section class="v41-enroll-access"><h3>Primer acceso del estudiante</h3><div class="field"><label for="enrollAccess">Forma de entrega</label><select id="enrollAccess"><option value="TEMPORAL">Contraseña temporal individual (recomendado)</option><option value="DNI_ACTIVACION">DNI inicial + código de activación entregado personalmente</option></select></div><label class="v41-check" id="enrollIdentityRow" hidden><input type="checkbox" id="enrollIdentity"> Identifiqué al estudiante y le entregaré directamente su código individual de activación.</label><p class="field-note">Las cuentas existentes conservan su acceso. Nunca basta con conocer el DNI para consultar los datos.</p></section>':''}
      <div class="form-actions"><button class="btn btn-primary" type="submit">Registrar inscripción</button></div></fieldset></form></section>`;
    const form=$('enrollmentForm');let known=null,student=null,lookupVersion=0;
    if($('enrollAccess'))$('enrollAccess').onchange=()=>{const required=$('enrollAccess').value==='DNI_ACTIVACION';$('enrollIdentityRow').hidden=!required;$('enrollIdentity').required=required;$('enrollIdentity').checked=false;};
    $('enrollProgram').innerHTML=V4.options(ctx.programas,'ID_PROGRAMA','NOMBRE_PROGRAMA');
    $('enrollMode').innerHTML='<option value="">Selecciona modalidad</option><option value="REGULAR">Regular · 4 cuotas</option><option value="ACELERADO">Acelerado · 2 cuotas</option>';
    $('enrollShift').innerHTML='<option value="">Selecciona turno</option><option value="MANANA">Mañana · 07:00 a 13:00</option><option value="TARDE">Tarde · 15:00 a 21:00</option>';
    $('field-ID_CARRERA').innerHTML=V4.options(ctx.carreras,'ID_CARRERA','NOMBRE_CARRERA');
    $('field-ID_PARENTESCO').innerHTML=V4.options(ctx.parentescos,'ID_PARENTESCO','PARENTESCO');
    function cycles(){
      $('enrollCycle').innerHTML=V4.options(ctx.ciclos.filter(c=>c.ID_PROGRAMA===$('enrollProgram').value&&c.MODALIDAD===$('enrollMode').value),'ID_CICLO',c=>`${c.NOMBRE_CICLO} · ${fmtDate(c.FECHA_INICIO)}`);groups();
    }
    function groups(){
      $('enrollGroup').innerHTML=V4.options(ctx.grupos.filter(g=>g.ID_CICLO===$('enrollCycle').value&&g.ID_TURNO===$('enrollShift').value),'ID_HORARIO_ACADEMICO',g=>`${g.NOMBRE_HORARIO} · ${g.NOMBRE_AULA}`);summary();
    }
    function summary(){const group=ctx.grupos.find(g=>g.ID_HORARIO_ACADEMICO===$('enrollGroup').value);
      $('enrollSummary').textContent=group?`${group.NOMBRE_CICLO} · ${fmtDate(group.FECHA_INICIO)} al ${fmtDate(group.FECHA_FIN)}. ${group.NUMERO_MENSUALIDADES} cuotas de ${fmt.format(group.PRECIO_MENSUAL)}. ${student?'Reinscripción: sin nuevo cargo inicial.':'Inscripción inicial: S/ 50.00.'} Total: ${fmt.format(Number(group.NUMERO_MENSUALIDADES)*Number(group.PRECIO_MENSUAL)+(student?0:50))}. Primera cuota vence el ${fmtDate(group.FECHA_INICIO)}.`:'Selecciona ciclo, turno y grupo para revisar los cargos.';
    }
    $('enrollProgram').onchange=cycles;$('enrollMode').onchange=cycles;$('enrollCycle').onchange=groups;$('enrollShift').onchange=groups;$('enrollGroup').onchange=summary;cycles();
    $('enrollDni').oninput=()=>{known=null;lookupVersion++;$('enrollDetails').hidden=true;$('enrollDetails').disabled=true;$('enrollLookup').textContent='Consulta el DNI para continuar.';};
    $('lookupStudent').onclick=async()=>{
      const input=$('enrollDni');if(!input.reportValidity())return;
      const version=++lookupVersion,button=$('lookupStudent');button.disabled=true;
      try{const d=await api(`/alumnos/${input.value}/inscripcion`);if(version!==lookupVersion||!button.isConnected)return;
        known=input.value;student=d.alumno;
        if($('enrollAccess')){$('enrollAccess').disabled=!!student;$('enrollAccess').value='TEMPORAL';$('enrollAccess').onchange();}
        for(const c of state.modules.ALUMNO.columns){const el=$('field-'+c.name);if(!el)continue;el.value=d.alumno?.[c.name]==null?'':htmlValue(d.alumno[c.name],c);el.disabled=!!student;}
        $('enrollLookup').innerHTML=student?`<div class="helper"><strong>${esc(student.NOMBRE_COMPLETO)}</strong> · Estudiante registrado. Se conservan sus datos y cuenta.</div>${d.historial.length?panel('Historial de matrículas','Inscripciones anteriores',[['ID_MATRICULA','Código'],['NOMBRE_CICLO','CICLO'],['NOMBRE_HORARIO','HORARIO_ACADEMICO'],['FECHA_MATRICULA','Fecha']],d.historial):''}`:'<div class="helper">Estudiante nuevo. Completa sus datos para crear su cuenta y matrícula.</div>';
        $('enrollDetails').disabled=false;$('enrollDetails').hidden=false;summary();
      }catch(e){toast(e.message,true);}finally{if(button.isConnected)button.disabled=false;}
    };
    form.onsubmit=e=>{e.preventDefault();V4.submit(form,async()=>{
      if(!known||known!==$('enrollDni').value)throw Error('Consulta el DNI antes de registrar.');
      const alumno={DNI_ALUMNO:known};
      if(!student)for(const c of state.modules.ALUMNO.columns){const el=$('field-'+c.name);if(el)alumno[c.name]=el.value||null;}
      const extra=$('enrollAccess')?.value==='DNI_ACTIVACION'?{accesoInicial:{modo:'DNI_ACTIVACION',identidadConfirmada:$('enrollIdentity').checked}}:{};
      const result=await api('/inscripciones',{method:'POST',body:JSON.stringify({alumno,ID_HORARIO_ACADEMICO:$('enrollGroup').value,...extra})});
      known=null;form.reset();$('enrollDetails').hidden=true;$('enrollDetails').disabled=true;$('enrollLookup').textContent='Consulta otro DNI para continuar.';
      modal('Inscripción registrada',`Matrícula ${result.matricula}`,`<div class="v4-result"><p>${result.cuotas} cuotas generadas. Total: <strong>${fmt.format(result.total)}</strong>.</p><p>Usuario: <strong>${esc(result.usuario)}</strong></p>${result.claveTemporal?`<p>Contraseña temporal:</p><code class="v4-secret">${esc(result.claveTemporal)}</code><p>Entrégala al estudiante por un canal privado. Se muestra una sola vez y deberá cambiarla al ingresar.</p>`:'<p>El estudiante conserva su cuenta y contraseña actuales.</p>'}</div>`);
      if(result.codigoActivacion){const box=document.createElement('div');box.className='v41-activation-delivery';box.innerHTML=`<p><strong>Código individual de activación</strong></p><code class="v4-secret">${esc(result.codigoActivacion)}</code><p>Entrégalo solo al estudiante identificado. Vence en 24 horas y se utiliza una sola vez. Para ingresar necesitará su DNI, la clave inicial y este código; después creará su propia contraseña.</p>`;$('modalRoot').querySelector('.v4-result').append(box);}
      if(result.cuentaActiva===false){const warning=document.createElement('p');warning.className='helper';warning.textContent='La cuenta está desactivada. Revisa su restauración desde Usuarios antes de permitir el ingreso.';$('modalRoot').querySelector('.v4-result').append(warning);}
    });};
  },
  async paymentsView(initialDni=''){
    header('Administración','Gestión de pagos');
    $('content').innerHTML=`<div class="module-header"><div><h2>Pagos y obligaciones</h2><p>Consulta las cuotas de un estudiante y confirma cada cobro.</p></div><button class="btn btn-secondary" id="paymentMethods">Medios de pago</button></div><section class="panel v4-form-panel"><form id="paymentSearch" class="v4-search"><div class="field"><label for="paymentDni">DNI del estudiante</label><input id="paymentDni" value="${esc(initialDni)}" inputmode="numeric" pattern="[0-9]{8}" minlength="8" maxlength="8" required></div><button class="btn btn-primary" type="submit">Buscar deudas</button></form></section><div id="paymentResults"></div>`;
    $('paymentMethods').onclick=()=>V4.methodsModal();
    $('paymentSearch').onsubmit=e=>{e.preventDefault();V4.submit(e.currentTarget,load);};
    async function load(){
      const searchDni=$('paymentDni').value;const d=await api(`/pagos/alumno/${searchDni}`);if(!$('paymentResults'))return;
      $('paymentResults').innerHTML=`<h3>${esc(d.alumno.NOMBRE_COMPLETO)} · ${esc(searchDni)}</h3>${V4.financeSummary(d.rows)}<div class="field v4-filter"><label for="paymentFilter">Mostrar obligaciones</label><select id="paymentFilter"><option value="">Todas</option><option value="PENDIENTE">Pendientes</option><option value="PAGADO">Pagadas</option></select></div><div id="paymentRows"></div>`;
      function draw(){const rows=d.rows.filter(p=>!$('paymentFilter').value||p.ID_ESTADO_PAGO===$('paymentFilter').value);
        $('paymentRows').innerHTML=rows.length?`<section class="panel"><div class="table-scroll"><table><thead><tr><th>Obligación / matrícula</th><th>Cuota</th><th>Importe</th><th>Vencimiento</th><th>ESTADO</th><th>Acciones</th></tr></thead><tbody>${rows.map(p=>`<tr><td><strong>${esc(p.ID_CONCEPTO)}</strong><br><small>${esc(p.ID_PAGO)}<br>${esc(p.ID_MATRICULA||'Inscripción inicial')} · ${esc(p.NOMBRE_CICLO||'')}<br>${p.FECHA_PAGO?'Pagado '+esc(fmtDateTime(p.FECHA_PAGO))+' '+esc(p.ID_MEDIO_PAGO)+' · '+esc(p.ID_USUARIO_RESPONSABLE):''}</small></td><td>${esc(p.NUMERO_MENSUALIDAD||'—')}</td><td>${fmt.format(p.MONTO)}</td><td>${fmtDate(p.FECHA_VENCIMIENTO)}</td><td>${display(p.ID_ESTADO_PAGO,'ID_ESTADO_PAGO')}</td><td><div class="actions-cell"><button class="btn btn-secondary btn-sm" data-pay="${esc(p.ID_PAGO)}">${p.ID_ESTADO_PAGO==='PENDIENTE'?'Confirmar pago':'Anular confirmación'}</button><button class="btn btn-secondary btn-sm" data-history="${esc(p.ID_PAGO)}">Historial</button></div></td></tr>`).join('')}</tbody></table></div></section>`:emptyInline('No hay obligaciones para este filtro.');
        $('paymentRows').querySelectorAll('[data-pay]').forEach(b=>b.onclick=()=>V4.paymentModal(d.rows.find(p=>p.ID_PAGO===b.dataset.pay),load));
        $('paymentRows').querySelectorAll('[data-history]').forEach(b=>b.onclick=()=>V4.auditModal('PAGO',b.dataset.history));
      }
      $('paymentFilter').onchange=draw;draw();
    }
    if(initialDni)await load();
  },
  async paymentModal(p,refresh){
    try{const reverse=p.ID_ESTADO_PAGO==='PAGADO';
      const methods=reverse?[]:(await api('/pagos/medios')).rows.filter(m=>m.ACTIVO);
      modal(reverse?'Anular confirmación':'Confirmar pago',`${p.ID_PAGO} · ${fmt.format(p.MONTO)}`,`<form id="confirmPayment" class="v4-form-panel"><p>${reverse?'La cuota volverá a pendiente. La confirmación anterior quedará en el historial.':'Confirma que recibiste el importe completo de esta obligación.'}</p><div class="field"><label for="paymentValue">${reverse?'MOTIVO de anulación *':'Medio de pago *'}</label>${reverse?'<input id="paymentValue" required minlength="5" maxlength="250">':`<select id="paymentValue" required>${V4.options(methods,'ID_MEDIO_PAGO','NOMBRE_MEDIO_PAGO')}</select>`}</div><div class="form-actions"><button class="btn btn-primary" type="submit">${reverse?'Guardar anulación':'Registrar pago'}</button></div></form>`);
      const form=$('confirmPayment');form.onsubmit=e=>{e.preventDefault();V4.submit(form,async()=>{await api(`/pagos/${p.ID_PAGO}/${reverse?'anular':'confirmar'}`,{method:'POST',body:JSON.stringify({[reverse?'motivo':'medio']:$('paymentValue').value})});closeModal();toast(reverse?'Anulación registrada en el historial.':'PAGO confirmado.');await refresh();});};
    }catch(e){toast(e.message,true);}
  },
  async auditModal(entity,code){
    try{const d=await api(`/auditoria/${encodeURIComponent(entity)}/${encodeURIComponent(code)}`);
      modal('Historial de operaciones',code,`<div class="v4-form-panel">${d.rows.length?d.rows.map(r=>`<article class="v4-audit"><strong>${esc(r.ACCION)}</strong><p>${fmtDate(r.FECHA_EVENTO)} · ${esc(String(r.FECHA_EVENTO).slice(11,19))} UTC · Administrador ${esc(r.ID_USUARIO_RESPONSABLE)}</p><p>${esc(r.MOTIVO||'')}</p><details><summary>Ver registro anterior y posterior</summary><pre>${esc(JSON.stringify({anterior:r.DATOS_ANTERIORES?JSON.parse(r.DATOS_ANTERIORES):null,nuevo:r.DATOS_NUEVOS?JSON.parse(r.DATOS_NUEVOS):null},null,2))}</pre></details></article>`).join(''):'<p>Sin operaciones V4. Los registros anteriores a la actualización se conservan.</p>'}</div>`);
    }catch(e){toast(e.message,true);}
  },
  async methodsModal(){
    try{const d=await api('/pagos/medios');modal('Medios de pago','Los medios desactivados se conservan en el historial.',`<div class="v4-form-panel">${panel('Medios configurados','Crea o actualiza utilizando su código',[['ID_MEDIO_PAGO','Código'],['NOMBRE_MEDIO_PAGO','Nombre'],['ACTIVO','ACTIVO']],d.rows)}<form id="methodForm"><div class="form-grid"><div class="field"><label for="methodCode">Código *</label><input id="methodCode" required maxlength="10" pattern="[A-Z0-9_-]+"></div><div class="field"><label for="methodName">Nombre *</label><input id="methodName" required maxlength="60"></div><div class="field"><label for="methodActive">ACTIVO</label><select id="methodActive"><option value="true">Sí</option><option value="false">No</option></select></div></div><div class="form-actions"><button type="submit" class="btn btn-primary">Guardar medio</button></div></form></div>`);
      const form=$('methodForm');form.onsubmit=e=>{e.preventDefault();V4.submit(form,async()=>{await api('/pagos/medios',{method:'POST',body:JSON.stringify({codigo:$('methodCode').value,nombre:$('methodName').value,ACTIVO:$('methodActive').value==='true'})});await V4.methodsModal();toast('Medio de pago guardado.');});};
    }catch(e){toast(e.message,true);}
  },
  async examsView(){
    header('Académico','Simulacros generales');const d=await api('/simulacros');
    const exams=[...new Map(d.rows.map(r=>[r.ID_SIMULACRO,r])).values()];
    $('content').innerHTML=`<div class="module-header"><div><h2>Simulacros generales</h2><p>Un puntaje total por estudiante. Los resultados se muestran al publicarlos.</p></div><button class="btn btn-primary" id="newExam">Crear simulacro</button></div><div class="v4-exam-grid">${exams.map(ex=>{const groups=d.rows.filter(r=>r.ID_SIMULACRO===ex.ID_SIMULACRO&&r.ID_SIMULACRO_HORARIO);const published=groups.length&&groups.every(g=>g.PUBLICADO);return `<section class="panel v4-exam"><span class="eyebrow">${esc(ex.ID_SIMULACRO)}</span><h3>${esc(ex.NOMBRE_SIMULACRO)}</h3><p>Máximo: ${esc(ex.PUNTAJE_MAXIMO)} puntos</p>${groups.map(g=>`<p>${esc(g.NOMBRE_HORARIO)} · ${fmtDate(g.FECHA_PROGRAMADA)} · ${g.PUBLICADO?'PUBLICADO':'Borrador'}</p>`).join('')}<div class="form-actions"><button class="btn btn-secondary" data-score="${esc(ex.ID_SIMULACRO)}">Registrar puntaje por DNI</button><button class="btn btn-primary" data-publish="${esc(ex.ID_SIMULACRO)}" data-value="${!published}">${published?'Retirar publicación':'Publicar resultados'}</button></div></section>`;}).join('')||emptyInline('Crea el primer simulacro general.')}</div>`;
    $('newExam').onclick=()=>V4.examModal();
    $('content').querySelectorAll('[data-score]').forEach(b=>b.onclick=()=>V4.scoreModal(b.dataset.score));
    $('content').querySelectorAll('[data-publish]').forEach(b=>b.onclick=async()=>{b.disabled=true;try{await api(`/simulacros/${encodeURIComponent(b.dataset.publish)}/publicacion`,{method:'POST',body:JSON.stringify({PUBLICADO:b.dataset.value==='true'})});await V4.examsView();toast('Publicación actualizada.');}catch(e){toast(e.message,true);if(b.isConnected)b.disabled=false;}});
  },
  async examModal(){
    try{const ctx=await api('/academic/context');
      modal('Crear simulacro general','Selecciona todos los grupos participantes.',`<form id="examForm" class="v4-form-panel"><div class="form-grid">
      ${[['examCode','Código','text','maxlength="20" pattern="[A-Za-z0-9_-]+"'],['examName','Nombre','text','maxlength="150"'],['examMax','Puntaje máximo','number','min="0.01" max="999999.99" step="0.01"'],['examDate','Fecha','date',''],['examTime','Hora','time',''],['examDuration','Duración (minutos)','number','min="1" max="32767" step="1"']].map(([id,name,type,attrs])=>`<div class="field"><label for="${id}">${name} *</label><input id="${id}" type="${type}" ${attrs} required></div>`).join('')}
      <fieldset class="field full v4-groups"><legend>Grupos participantes *</legend>${ctx.grupos.map(g=>`<label><input type="checkbox" name="examGroup" value="${esc(g.ID_HORARIO_ACADEMICO)}"> ${esc(g.NOMBRE_HORARIO)} · ${esc(g.NOMBRE_CICLO)} · ${esc(g.NOMBRE_TURNO)}</label>`).join('')||'<p>Crea primero un ciclo y un grupo ACTIVO.</p>'}</fieldset></div><div class="form-actions"><button class="btn btn-primary" type="submit">Guardar simulacro</button></div></form>`);
      const form=$('examForm');form.onsubmit=e=>{e.preventDefault();V4.submit(form,async()=>{const groups=[...form.querySelectorAll('[name="examGroup"]:checked')].map(el=>el.value);if(!groups.length)throw Error('Selecciona al menos un grupo.');await api('/simulacros',{method:'POST',body:JSON.stringify({ID_SIMULACRO:$('examCode').value,NOMBRE_SIMULACRO:$('examName').value,PUNTAJE_MAXIMO:Number($('examMax').value),FECHA_PROGRAMADA:$('examDate').value,HORA_INICIO:$('examTime').value,DURACION_MINUTOS:Number($('examDuration').value),grupos:groups})});closeModal();await V4.examsView();toast('Simulacro registrado.');});};
    }catch(e){toast(e.message,true);}
  },
  scoreModal(code){
    modal('Registrar puntaje total',code,`<form id="scoreForm" class="v4-form-panel"><div class="v4-search"><div class="field"><label for="scoreDni">DNI del estudiante *</label><input id="scoreDni" required pattern="[0-9]{8}" inputmode="numeric" minlength="8" maxlength="8"></div><button type="button" class="btn btn-secondary" id="scoreLookup">Consultar estudiante</button></div><div class="helper" id="scoreStudent">Consulta el DNI para comprobar el grupo participante.</div><fieldset id="scoreFields" class="v4-fieldset" disabled><div class="form-grid"><div class="field"><label for="scoreValue">Puntaje total *</label><input id="scoreValue" type="number" min="0" max="999999.99" step="0.01" required></div><div class="field full"><label for="scoreReason">Motivo de corrección</label><input id="scoreReason" minlength="5" maxlength="250"><small>Obligatorio si el alumno ya tiene un puntaje registrado. El resultado anterior se conserva en el historial.</small></div></div><div class="form-actions"><button class="btn btn-primary" type="submit">Guardar puntaje</button></div></fieldset></form>`);
    let checkedDni=null,version=0;const form=$('scoreForm');
    $('scoreDni').oninput=()=>{checkedDni=null;version++;$('scoreFields').disabled=true;$('scoreStudent').textContent='Consulta el DNI para continuar.';};
    $('scoreLookup').onclick=async()=>{
      if(!$('scoreDni').reportValidity())return;const currentVersion=++version,button=$('scoreLookup');button.disabled=true;
      try{const result=await api(`/simulacros/${encodeURIComponent(code)}/alumno/${$('scoreDni').value}`);if(version!==currentVersion||!button.isConnected)return;const student=result.alumno;
        checkedDni=$('scoreDni').value;$('scoreStudent').textContent=`${student.NOMBRE_COMPLETO} · ${student.NOMBRE_HORARIO} · Máximo: ${student.PUNTAJE_MAXIMO}. ${student.ID_RESULTADO?'Puntaje registrado: '+student.PUNTAJE_TOTAL+'. Indica un motivo para corregirlo.':'Sin resultado registrado.'}`;
        $('scoreValue').max=student.PUNTAJE_MAXIMO;$('scoreValue').value=student.PUNTAJE_TOTAL??'';$('scoreReason').required=!!student.ID_RESULTADO;$('scoreReason').value='';$('scoreFields').disabled=false;
      }catch(e){toast(e.message,true);}finally{if(button.isConnected)button.disabled=false;}
    };
    form.onsubmit=e=>{e.preventDefault();V4.submit(form,async()=>{if(!checkedDni||checkedDni!==$('scoreDni').value)throw Error('Consulta el DNI antes de registrar el puntaje.');const result=await api(`/simulacros/${encodeURIComponent(code)}/resultados`,{method:'POST',body:JSON.stringify({DNI_ALUMNO:checkedDni,PUNTAJE_TOTAL:Number($('scoreValue').value),Motivo_Cambio:$('scoreReason').value})});await V4.auditModal('RESULTADO_SIMULACRO',result.codigo);toast(result.corregido?'Puntaje corregido con historial.':'Puntaje registrado.');});};
  },
  async scheduleModal(record){return V44.editor(record?.ID_HORARIO_ACADEMICO||null);},
  weekly(rows){
    if(!rows.length)return studentEmpty('calendar','Sin horarios publicados','Tus clases aparecerán cuando se registre el horario del grupo.');
    const ranges=[...new Set(rows.map(r=>fmtTime(r.HORA_INICIO)+'–'+fmtTime(r.HORA_FIN)))].sort();
    const cell=r=>`<article class="v4-class ${r.ID_TIPO_BLOQUE==='RECREO'?'v4-break':''}"><strong>${esc(r.ID_TIPO_BLOQUE==='RECREO'?'Recreo':r.NOMBRE_CURSO||'Clase')}</strong><small>${esc(r.ID_TIPO_BLOQUE==='RECREO'?'':r.NOMBRE_COMPLETO||'DOCENTE por confirmar')}</small><small>${esc(r.NOMBRE_HORARIO||'')} · ${esc(r.NOMBRE_TURNO||'')}<br>${esc(r.NOMBRE_AULA||'')}</small></article>`;
    return `<div class="table-scroll v4-week"><table><caption>Horario semanal · grupo, turno y aula</caption><thead><tr><th>Horas</th>${days.slice(1).map(d=>`<th scope="col">${d}</th>`).join('')}</tr></thead><tbody>${ranges.map(range=>`<tr><th scope="row">${range}</th>${days.slice(1).map((_,i)=>`<td>${rows.filter(r=>Number(r.DIA_SEMANA)===i+1&&fmtTime(r.HORA_INICIO)+'–'+fmtTime(r.HORA_FIN)===range).map(cell).join('')||'—'}</td>`).join('')}</tr>`).join('')}</tbody></table></div><div class="v4-week-mobile">${days.slice(1).map((d,i)=>{const list=rows.filter(r=>Number(r.DIA_SEMANA)===i+1);return list.length?`<section><h4>${d}</h4>${list.map(r=>`<p class="class-clock">${fmtTime(r.HORA_INICIO)}–${fmtTime(r.HORA_FIN)}</p>${cell(r)}`).join('')}</section>`:'';}).join('')}</div>`;
  }
};
