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
    const total=status=>rows.filter(p=>p.ESTADO_PAGO_Cod_Estado===status).reduce((n,p)=>n+Math.round(Number(p.Monto)*100),0)/100;
    return `<div class="v4-totals"><article><small>Total pagado</small><strong>${fmt.format(total('PAGADO'))}</strong></article><article><small>Total pendiente</small><strong>${fmt.format(total('PENDIENTE'))}</strong></article></div>`;
  },
  async enrollmentView(){
    header('Administración','Inscripción integral');const ctx=await api('/academic/context');
    $('content').innerHTML=`<div class="module-header"><div><span class="eyebrow">REGISTRO Y REINSCRIPCIÓN</span><h2>Inscribir estudiante</h2><p>Consulta el DNI y selecciona el ciclo y grupo académico.</p></div></div>
      <section class="panel v4-form-panel"><form id="enrollmentForm">
      <div class="v4-search"><div class="field"><label for="enrollDni">DNI del estudiante *</label><input id="enrollDni" required inputmode="numeric" pattern="[0-9]{8}" minlength="8" maxlength="8" autocomplete="off"></div><button type="button" class="btn btn-secondary" id="lookupStudent">Consultar DNI</button></div>
      <div id="enrollLookup" role="status">Consulta el DNI para continuar.</div>
      <fieldset id="enrollDetails" hidden disabled class="v4-fieldset"><h3>Datos del estudiante y apoderado</h3><div class="form-grid">${state.modules.ALUMNO.columns.filter(c=>c.name!=='DNI_Alu').map(c=>formControl(c,state.modules.ALUMNO,null)).join('')}</div>
      <h3>Programa y matrícula</h3><div class="form-grid">
      ${[['enrollProgram','Programa académico'],['enrollMode','Modalidad'],['enrollCycle','Ciclo académico'],['enrollShift','Turno'],['enrollGroup','Grupo académico']].map(([id,name])=>`<div class="field"><label for="${id}">${name} *</label><select id="${id}" required></select></div>`).join('')}</div>
      <div class="helper" id="enrollSummary" aria-live="polite">Selecciona el grupo para revisar los cargos.</div>
      <div class="form-actions"><button class="btn btn-primary" type="submit">Registrar inscripción</button></div></fieldset></form></section>`;
    const form=$('enrollmentForm');let known=null,student=null,lookupVersion=0;
    $('enrollProgram').innerHTML=V4.options(ctx.programas,'Cod_Programa','Nomb_Programa');
    $('enrollMode').innerHTML='<option value="">Selecciona modalidad</option><option value="REGULAR">Regular · 4 cuotas</option><option value="ACELERADO">Acelerado · 2 cuotas</option>';
    $('enrollShift').innerHTML='<option value="">Selecciona turno</option><option value="MANANA">Mañana · 07:00 a 13:00</option><option value="TARDE">Tarde · 15:00 a 21:00</option>';
    $('field-CARRERA_Cod_Carrera').innerHTML=V4.options(ctx.carreras,'Cod_Carrera','Nomb_Carrera');
    $('field-PARENTESCO_Cod_Paren').innerHTML=V4.options(ctx.parentescos,'Cod_Paren','Tipo_Paren');
    function cycles(){
      $('enrollCycle').innerHTML=V4.options(ctx.ciclos.filter(c=>c.Programa_Cod_Programa===$('enrollProgram').value&&c.Modalidad===$('enrollMode').value),'Cod_Ciclo',c=>`${c.Nomb_Ciclo} · ${fmtDate(c.Fech_Inicio)}`);groups();
    }
    function groups(){
      $('enrollGroup').innerHTML=V4.options(ctx.grupos.filter(g=>g.Ciclo_Cod_Ciclo===$('enrollCycle').value&&g.Turno_Cod_Turno===$('enrollShift').value),'Cod_Grupo',g=>`${g.Nomb_Grupo} · ${g.Nomb_Aula}`);summary();
    }
    function summary(){const group=ctx.grupos.find(g=>g.Cod_Grupo===$('enrollGroup').value);
      $('enrollSummary').textContent=group?`${group.Nomb_Ciclo} · ${fmtDate(group.Fech_Inicio)} al ${fmtDate(group.Fech_Fin)}. ${group.Nro_Mensualidades} cuotas de ${fmt.format(group.Precio_Mensual)}. ${student?'Reinscripción: sin nuevo cargo inicial.':'Inscripción inicial: S/ 50.00.'} Total: ${fmt.format(Number(group.Nro_Mensualidades)*Number(group.Precio_Mensual)+(student?0:50))}. Primera cuota vence el ${fmtDate(group.Fech_Inicio)}.`:'Selecciona ciclo, turno y grupo para revisar los cargos.';
    }
    $('enrollProgram').onchange=cycles;$('enrollMode').onchange=cycles;$('enrollCycle').onchange=groups;$('enrollShift').onchange=groups;$('enrollGroup').onchange=summary;cycles();
    $('enrollDni').oninput=()=>{known=null;lookupVersion++;$('enrollDetails').hidden=true;$('enrollDetails').disabled=true;$('enrollLookup').textContent='Consulta el DNI para continuar.';};
    $('lookupStudent').onclick=async()=>{
      const input=$('enrollDni');if(!input.reportValidity())return;
      const version=++lookupVersion,button=$('lookupStudent');button.disabled=true;
      try{const d=await api(`/alumnos/${input.value}/inscripcion`);if(version!==lookupVersion||!button.isConnected)return;
        known=input.value;student=d.alumno;
        for(const c of state.modules.ALUMNO.columns){const el=$('field-'+c.name);if(!el)continue;el.value=d.alumno?.[c.name]==null?'':htmlValue(d.alumno[c.name],c);el.disabled=!!student;}
        $('enrollLookup').innerHTML=student?`<div class="helper"><strong>${esc(student.Nomb_Alu)}</strong> · Estudiante registrado. Se conservan sus datos y cuenta.</div>${d.historial.length?panel('Historial de matrículas','Inscripciones anteriores',[['Cod_Matricula','Código'],['Nomb_Ciclo','Ciclo'],['Nomb_Grupo','Grupo'],['Fech_Matricula','Fecha']],d.historial):''}`:'<div class="helper">Estudiante nuevo. Completa sus datos para crear su cuenta y matrícula.</div>';
        $('enrollDetails').disabled=false;$('enrollDetails').hidden=false;summary();
      }catch(e){toast(e.message,true);}finally{if(button.isConnected)button.disabled=false;}
    };
    form.onsubmit=e=>{e.preventDefault();V4.submit(form,async()=>{
      if(!known||known!==$('enrollDni').value)throw Error('Consulta el DNI antes de registrar.');
      const alumno={DNI_Alu:known};
      if(!student)for(const c of state.modules.ALUMNO.columns){const el=$('field-'+c.name);if(el)alumno[c.name]=el.value||null;}
      const result=await api('/inscripciones',{method:'POST',body:JSON.stringify({alumno,Grupo_Cod_Grupo:$('enrollGroup').value})});
      known=null;form.reset();$('enrollDetails').hidden=true;$('enrollDetails').disabled=true;$('enrollLookup').textContent='Consulta otro DNI para continuar.';
      modal('Inscripción registrada',`Matrícula ${result.matricula}`,`<div class="v4-result"><p>${result.cuotas} cuotas generadas. Total: <strong>${fmt.format(result.total)}</strong>.</p><p>Usuario: <strong>${esc(result.usuario)}</strong></p>${result.claveTemporal?`<p>Contraseña temporal:</p><code class="v4-secret">${esc(result.claveTemporal)}</code><p>Entrégala al estudiante por un canal privado. Se muestra una sola vez y deberá cambiarla al ingresar.</p>`:'<p>El estudiante conserva su cuenta y contraseña actuales.</p>'}</div>`);
    });};
  },
  async paymentsView(initialDni=''){
    header('Administración','Gestión de pagos');
    $('content').innerHTML=`<div class="module-header"><div><h2>Pagos y obligaciones</h2><p>Consulta las cuotas de un estudiante y confirma cada cobro.</p></div><button class="btn btn-secondary" id="paymentMethods">Medios de pago</button></div><section class="panel v4-form-panel"><form id="paymentSearch" class="v4-search"><div class="field"><label for="paymentDni">DNI del estudiante</label><input id="paymentDni" value="${esc(initialDni)}" inputmode="numeric" pattern="[0-9]{8}" minlength="8" maxlength="8" required></div><button class="btn btn-primary" type="submit">Buscar deudas</button></form></section><div id="paymentResults"></div>`;
    $('paymentMethods').onclick=()=>V4.methodsModal();
    $('paymentSearch').onsubmit=e=>{e.preventDefault();V4.submit(e.currentTarget,load);};
    async function load(){
      const searchDni=$('paymentDni').value;const d=await api(`/pagos/alumno/${searchDni}`);if(!$('paymentResults'))return;
      $('paymentResults').innerHTML=`<h3>${esc(d.alumno.Nomb_Alu)} · ${esc(searchDni)}</h3>${V4.financeSummary(d.rows)}<div class="field v4-filter"><label for="paymentFilter">Mostrar obligaciones</label><select id="paymentFilter"><option value="">Todas</option><option value="PENDIENTE">Pendientes</option><option value="PAGADO">Pagadas</option></select></div><div id="paymentRows"></div>`;
      function draw(){const rows=d.rows.filter(p=>!$('paymentFilter').value||p.ESTADO_PAGO_Cod_Estado===$('paymentFilter').value);
        $('paymentRows').innerHTML=rows.length?`<section class="panel"><div class="table-scroll"><table><thead><tr><th>Obligación / matrícula</th><th>Cuota</th><th>Importe</th><th>Vencimiento</th><th>Estado</th><th>Acciones</th></tr></thead><tbody>${rows.map(p=>`<tr><td><strong>${esc(p.CONCEPTO_PAGO_Cod_Concepto)}</strong><br><small>${esc(p.Cod_Pago)}<br>${esc(p.MATRICULA_Cod_Matricula||'Inscripción inicial')} · ${esc(p.Nomb_Ciclo||'')}<br>${p.Fech_Pago?'Pagado '+esc(fmtDateTime(p.Fech_Pago))+' '+esc(p.Medio_Pago)+' · '+esc(p.Usuario_Cod_Usuario):''}</small></td><td>${esc(p.Nro_Mensualidad||'—')}</td><td>${fmt.format(p.Monto)}</td><td>${fmtDate(p.Fech_Vencimiento)}</td><td>${display(p.ESTADO_PAGO_Cod_Estado,'ESTADO_PAGO_Cod_Estado')}</td><td><div class="actions-cell"><button class="btn btn-secondary btn-sm" data-pay="${esc(p.Cod_Pago)}">${p.ESTADO_PAGO_Cod_Estado==='PENDIENTE'?'Confirmar pago':'Anular confirmación'}</button><button class="btn btn-secondary btn-sm" data-history="${esc(p.Cod_Pago)}">Historial</button></div></td></tr>`).join('')}</tbody></table></div></section>`:emptyInline('No hay obligaciones para este filtro.');
        $('paymentRows').querySelectorAll('[data-pay]').forEach(b=>b.onclick=()=>V4.paymentModal(d.rows.find(p=>p.Cod_Pago===b.dataset.pay),load));
        $('paymentRows').querySelectorAll('[data-history]').forEach(b=>b.onclick=()=>V4.auditModal('Pago',b.dataset.history));
      }
      $('paymentFilter').onchange=draw;draw();
    }
    if(initialDni)await load();
  },
  async paymentModal(p,refresh){
    try{const reverse=p.ESTADO_PAGO_Cod_Estado==='PAGADO';
      const methods=reverse?[]:(await api('/pagos/medios')).rows.filter(m=>m.Activo);
      modal(reverse?'Anular confirmación':'Confirmar pago',`${p.Cod_Pago} · ${fmt.format(p.Monto)}`,`<form id="confirmPayment" class="v4-form-panel"><p>${reverse?'La cuota volverá a pendiente. La confirmación anterior quedará en el historial.':'Confirma que recibiste el importe completo de esta obligación.'}</p><div class="field"><label for="paymentValue">${reverse?'Motivo de anulación *':'Medio de pago *'}</label>${reverse?'<input id="paymentValue" required minlength="5" maxlength="250">':`<select id="paymentValue" required>${V4.options(methods,'Cod_Medio','Nomb_Medio')}</select>`}</div><div class="form-actions"><button class="btn btn-primary" type="submit">${reverse?'Guardar anulación':'Registrar pago'}</button></div></form>`);
      const form=$('confirmPayment');form.onsubmit=e=>{e.preventDefault();V4.submit(form,async()=>{await api(`/pagos/${p.Cod_Pago}/${reverse?'anular':'confirmar'}`,{method:'POST',body:JSON.stringify({[reverse?'motivo':'medio']:$('paymentValue').value})});closeModal();toast(reverse?'Anulación registrada en el historial.':'Pago confirmado.');await refresh();});};
    }catch(e){toast(e.message,true);}
  },
  async auditModal(entity,code){
    try{const d=await api(`/auditoria/${encodeURIComponent(entity)}/${encodeURIComponent(code)}`);
      modal('Historial de operaciones',code,`<div class="v4-form-panel">${d.rows.length?d.rows.map(r=>`<article class="v4-audit"><strong>${esc(r.Accion)}</strong><p>${fmtDate(r.Fecha)} · ${esc(String(r.Fecha).slice(11,19))} UTC · Administrador ${esc(r.Usuario_Cod_Usuario)}</p><p>${esc(r.Motivo||'')}</p><details><summary>Ver registro anterior y posterior</summary><pre>${esc(JSON.stringify({anterior:r.Anterior?JSON.parse(r.Anterior):null,nuevo:r.Nuevo?JSON.parse(r.Nuevo):null},null,2))}</pre></details></article>`).join(''):'<p>Sin operaciones V4. Los registros anteriores a la actualización se conservan.</p>'}</div>`);
    }catch(e){toast(e.message,true);}
  },
  async methodsModal(){
    try{const d=await api('/pagos/medios');modal('Medios de pago','Los medios desactivados se conservan en el historial.',`<div class="v4-form-panel">${panel('Medios configurados','Crea o actualiza utilizando su código',[['Cod_Medio','Código'],['Nomb_Medio','Nombre'],['Activo','Activo']],d.rows)}<form id="methodForm"><div class="form-grid"><div class="field"><label for="methodCode">Código *</label><input id="methodCode" required maxlength="10" pattern="[A-Z0-9_-]+"></div><div class="field"><label for="methodName">Nombre *</label><input id="methodName" required maxlength="60"></div><div class="field"><label for="methodActive">Activo</label><select id="methodActive"><option value="true">Sí</option><option value="false">No</option></select></div></div><div class="form-actions"><button type="submit" class="btn btn-primary">Guardar medio</button></div></form></div>`);
      const form=$('methodForm');form.onsubmit=e=>{e.preventDefault();V4.submit(form,async()=>{await api('/pagos/medios',{method:'POST',body:JSON.stringify({codigo:$('methodCode').value,nombre:$('methodName').value,activo:$('methodActive').value==='true'})});await V4.methodsModal();toast('Medio de pago guardado.');});};
    }catch(e){toast(e.message,true);}
  },
  async examsView(){
    header('Académico','Simulacros generales');const d=await api('/simulacros');
    const exams=[...new Map(d.rows.map(r=>[r.Cod_Examen,r])).values()];
    $('content').innerHTML=`<div class="module-header"><div><h2>Simulacros generales</h2><p>Un puntaje total por estudiante. Los resultados se muestran al publicarlos.</p></div><button class="btn btn-primary" id="newExam">Crear simulacro</button></div><div class="v4-exam-grid">${exams.map(ex=>{const groups=d.rows.filter(r=>r.Cod_Examen===ex.Cod_Examen&&r.Cod_examen_grupo);const published=groups.length&&groups.every(g=>g.Publicado);return `<section class="panel v4-exam"><span class="eyebrow">${esc(ex.Cod_Examen)}</span><h3>${esc(ex.Nomb_Examen)}</h3><p>Máximo: ${esc(ex.puntaje_maximo)} puntos</p>${groups.map(g=>`<p>${esc(g.Nomb_Grupo)} · ${fmtDate(g.Fech_programada)} · ${g.Publicado?'Publicado':'Borrador'}</p>`).join('')}<div class="form-actions"><button class="btn btn-secondary" data-score="${esc(ex.Cod_Examen)}">Registrar puntaje por DNI</button><button class="btn btn-primary" data-publish="${esc(ex.Cod_Examen)}" data-value="${!published}">${published?'Retirar publicación':'Publicar resultados'}</button></div></section>`;}).join('')||emptyInline('Crea el primer simulacro general.')}</div>`;
    $('newExam').onclick=()=>V4.examModal();
    $('content').querySelectorAll('[data-score]').forEach(b=>b.onclick=()=>V4.scoreModal(b.dataset.score));
    $('content').querySelectorAll('[data-publish]').forEach(b=>b.onclick=async()=>{b.disabled=true;try{await api(`/simulacros/${encodeURIComponent(b.dataset.publish)}/publicacion`,{method:'POST',body:JSON.stringify({Publicado:b.dataset.value==='true'})});await V4.examsView();toast('Publicación actualizada.');}catch(e){toast(e.message,true);if(b.isConnected)b.disabled=false;}});
  },
  async examModal(){
    try{const ctx=await api('/academic/context');
      modal('Crear simulacro general','Selecciona todos los grupos participantes.',`<form id="examForm" class="v4-form-panel"><div class="form-grid">
      ${[['examCode','Código','text','maxlength="20" pattern="[A-Za-z0-9_-]+"'],['examName','Nombre','text','maxlength="150"'],['examMax','Puntaje máximo','number','min="0.01" max="999999.99" step="0.01"'],['examDate','Fecha','date',''],['examTime','Hora','time',''],['examDuration','Duración (minutos)','number','min="1" max="32767" step="1"']].map(([id,name,type,attrs])=>`<div class="field"><label for="${id}">${name} *</label><input id="${id}" type="${type}" ${attrs} required></div>`).join('')}
      <fieldset class="field full v4-groups"><legend>Grupos participantes *</legend>${ctx.grupos.map(g=>`<label><input type="checkbox" name="examGroup" value="${esc(g.Cod_Grupo)}"> ${esc(g.Nomb_Grupo)} · ${esc(g.Nomb_Ciclo)} · ${esc(g.Nomb_Turno)}</label>`).join('')||'<p>Crea primero un ciclo y un grupo activo.</p>'}</fieldset></div><div class="form-actions"><button class="btn btn-primary" type="submit">Guardar simulacro</button></div></form>`);
      const form=$('examForm');form.onsubmit=e=>{e.preventDefault();V4.submit(form,async()=>{const groups=[...form.querySelectorAll('[name="examGroup"]:checked')].map(el=>el.value);if(!groups.length)throw Error('Selecciona al menos un grupo.');await api('/simulacros',{method:'POST',body:JSON.stringify({Cod_Examen:$('examCode').value,Nomb_Examen:$('examName').value,puntaje_maximo:Number($('examMax').value),Fech_programada:$('examDate').value,Hr_inicio:$('examTime').value,Duracion_minutos:Number($('examDuration').value),grupos:groups})});closeModal();await V4.examsView();toast('Simulacro registrado.');});};
    }catch(e){toast(e.message,true);}
  },
  scoreModal(code){
    modal('Registrar puntaje total',code,`<form id="scoreForm" class="v4-form-panel"><div class="v4-search"><div class="field"><label for="scoreDni">DNI del estudiante *</label><input id="scoreDni" required pattern="[0-9]{8}" inputmode="numeric" minlength="8" maxlength="8"></div><button type="button" class="btn btn-secondary" id="scoreLookup">Consultar estudiante</button></div><div class="helper" id="scoreStudent">Consulta el DNI para comprobar el grupo participante.</div><fieldset id="scoreFields" class="v4-fieldset" disabled><div class="form-grid"><div class="field"><label for="scoreValue">Puntaje total *</label><input id="scoreValue" type="number" min="0" max="999999.99" step="0.01" required></div><div class="field full"><label for="scoreReason">Motivo de corrección</label><input id="scoreReason" minlength="5" maxlength="250"><small>Obligatorio si el alumno ya tiene un puntaje registrado. El resultado anterior se conserva en el historial.</small></div></div><div class="form-actions"><button class="btn btn-primary" type="submit">Guardar puntaje</button></div></fieldset></form>`);
    let checkedDni=null,version=0;const form=$('scoreForm');
    $('scoreDni').oninput=()=>{checkedDni=null;version++;$('scoreFields').disabled=true;$('scoreStudent').textContent='Consulta el DNI para continuar.';};
    $('scoreLookup').onclick=async()=>{
      if(!$('scoreDni').reportValidity())return;const currentVersion=++version,button=$('scoreLookup');button.disabled=true;
      try{const result=await api(`/simulacros/${encodeURIComponent(code)}/alumno/${$('scoreDni').value}`);if(version!==currentVersion||!button.isConnected)return;const student=result.alumno;
        checkedDni=$('scoreDni').value;$('scoreStudent').textContent=`${student.Nomb_Alu} · ${student.Nomb_Grupo} · Máximo: ${student.puntaje_maximo}. ${student.Cod_Nota?'Puntaje registrado: '+student.Puntaje_total+'. Indica un motivo para corregirlo.':'Sin resultado registrado.'}`;
        $('scoreValue').max=student.puntaje_maximo;$('scoreValue').value=student.Puntaje_total??'';$('scoreReason').required=!!student.Cod_Nota;$('scoreReason').value='';$('scoreFields').disabled=false;
      }catch(e){toast(e.message,true);}finally{if(button.isConnected)button.disabled=false;}
    };
    form.onsubmit=e=>{e.preventDefault();V4.submit(form,async()=>{if(!checkedDni||checkedDni!==$('scoreDni').value)throw Error('Consulta el DNI antes de registrar el puntaje.');const result=await api(`/simulacros/${encodeURIComponent(code)}/resultados`,{method:'POST',body:JSON.stringify({DNI_Alu:checkedDni,Puntaje_total:Number($('scoreValue').value),Motivo_Cambio:$('scoreReason').value})});await V4.auditModal('Nota_Examen',result.codigo);toast(result.corregido?'Puntaje corregido con historial.':'Puntaje registrado.');});};
  },
  async scheduleModal(record){
    try{const ctx=await api('/academic/context');let selected=ctx.grupos.find(g=>g.Cod_Grupo===record?.Grupo_Cod_Grupo);
      if(record&&!selected){toast('Este bloque pertenece a un ciclo cerrado. Consulta su historial desde la tabla.',true);return;}
      modal(record?'Editar bloque horario':'Crear bloque horario','El ciclo, turno y aula corresponden al grupo seleccionado.',`<form id="scheduleForm" class="v4-form-panel"><div class="form-grid">
      <div class="field"><label for="scheduleCode">Código del bloque *</label><input id="scheduleCode" maxlength="20" pattern="[A-Za-z0-9_-]+" required value="${esc(record?.Cod_Horario||'')}" ${record?'disabled':''}></div>
      <div class="field"><label for="scheduleCycle">Ciclo *</label><select id="scheduleCycle" required>${V4.options(ctx.ciclos,'Cod_Ciclo','Nomb_Ciclo')}</select></div>
      <div class="field"><label for="scheduleGroup">Grupo y turno *</label><select id="scheduleGroup" required></select></div>
      <div class="field"><label for="scheduleType">Tipo de bloque *</label><select id="scheduleType"><option value="CLASE">Clase</option><option value="RECREO">Recreo</option></select></div>
      <div class="field"><label for="scheduleCourse">Curso *</label><select id="scheduleCourse"></select></div><div class="field"><label for="scheduleTeacher">Docente *</label><select id="scheduleTeacher"></select></div>
      <div class="field"><label for="scheduleDay">Día *</label><select id="scheduleDay">${days.slice(1).map((d,i)=>`<option value="${i+1}">${d}</option>`).join('')}</select></div>
      <div class="field"><label for="scheduleStart">Hora inicial *</label><input id="scheduleStart" type="time" required></div><div class="field"><label for="scheduleEnd">Hora final *</label><input id="scheduleEnd" type="time" required></div>
      <div class="field"><label for="scheduleActive">Activo</label><select id="scheduleActive"><option value="true">Sí</option><option value="false">No</option></select></div></div><div class="helper" id="scheduleInfo"></div><div class="form-actions"><button class="btn btn-primary" type="submit">Guardar bloque</button></div></form>`);
      const courses=[...new Map(ctx.asignaturas.map(a=>[a.CURSOS_Cod_Curso,a])).values()];$('scheduleCourse').innerHTML=V4.options(courses,'CURSOS_Cod_Curso','Nomb_Curso');
      function teachers(){$('scheduleTeacher').innerHTML=V4.options(ctx.asignaturas.filter(a=>a.CURSOS_Cod_Curso===$('scheduleCourse').value),'Docente_DNI_Doc','Nom_Doc');}
      function groupInfo(){selected=ctx.grupos.find(g=>g.Cod_Grupo===$('scheduleGroup').value);$('scheduleInfo').textContent=selected?`${selected.Nomb_Aula} · ${selected.Nomb_Turno} · ${selected.Turno_Cod_Turno==='MANANA'?'07:00 a 13:00':'15:00 a 21:00'}. Se comprueban cruces de grupo, docente y aula.`:'Selecciona el grupo.';}
      function groups(){$('scheduleGroup').innerHTML=V4.options(ctx.grupos.filter(g=>g.Ciclo_Cod_Ciclo===$('scheduleCycle').value),'Cod_Grupo',g=>`${g.Nomb_Grupo} · ${g.Nomb_Turno} · ${g.Nomb_Aula}`);groupInfo();}
      function block(){const required=$('scheduleType').value==='CLASE';for(const id of ['scheduleCourse','scheduleTeacher']){$(id).required=required;$(id).disabled=!required;}}
      $('scheduleCycle').onchange=groups;$('scheduleGroup').onchange=groupInfo;$('scheduleCourse').onchange=teachers;$('scheduleType').onchange=block;
      if(record){$('scheduleCycle').value=selected.Ciclo_Cod_Ciclo;groups();$('scheduleGroup').value=record.Grupo_Cod_Grupo;$('scheduleType').value=record.TIPO_BLOQUE_Cod_Tipo;$('scheduleCourse').value=record.Docente_Asignatura_CURSOS_Cod_Curso||'';teachers();$('scheduleTeacher').value=record.Docente_Asignatura_Docente_DNI_Doc||'';$('scheduleDay').value=record.Dia_Semana;$('scheduleStart').value=fmtTime(record.Hr_Inicio);$('scheduleEnd').value=fmtTime(record.Hr_Fin);$('scheduleActive').value=String(!!record.Activo);groupInfo();}else{groups();teachers();}block();
      const form=$('scheduleForm');form.onsubmit=e=>{e.preventDefault();V4.submit(form,async()=>{const isClass=$('scheduleType').value==='CLASE';const body={Dia_Semana:Number($('scheduleDay').value),Hr_Inicio:$('scheduleStart').value,Hr_Fin:$('scheduleEnd').value,Activo:$('scheduleActive').value==='true',Grupo_Cod_Grupo:$('scheduleGroup').value,TIPO_BLOQUE_Cod_Tipo:$('scheduleType').value,Docente_Asignatura_CURSOS_Cod_Curso:isClass?$('scheduleCourse').value:null,Docente_Asignatura_Docente_DNI_Doc:isClass?$('scheduleTeacher').value:null};if(!record)body.Cod_Horario=$('scheduleCode').value;await api('/records/Horario'+(record?'/'+encodeURIComponent(record._id):''),{method:record?'PUT':'POST',body:JSON.stringify(body)});closeModal();await tableView('Horario');toast('Bloque horario guardado.');});};
    }catch(e){toast(e.message,true);}
  },
  weekly(rows){
    if(!rows.length)return studentEmpty('calendar','Sin horarios publicados','Tus clases aparecerán cuando se registre el horario del grupo.');
    const ranges=[...new Set(rows.map(r=>fmtTime(r.Hr_Inicio)+'–'+fmtTime(r.Hr_Fin)))].sort();
    const cell=r=>`<article class="v4-class ${r.TIPO_BLOQUE_Cod_Tipo==='RECREO'?'v4-break':''}"><strong>${esc(r.TIPO_BLOQUE_Cod_Tipo==='RECREO'?'Recreo':r.Nomb_Curso||'Clase')}</strong><small>${esc(r.TIPO_BLOQUE_Cod_Tipo==='RECREO'?'':r.Nom_Doc||'Docente por confirmar')}</small><small>${esc(r.Nomb_Grupo||'')} · ${esc(r.Nomb_Turno||'')}<br>${esc(r.Nomb_Aula||'')}</small></article>`;
    return `<div class="table-scroll v4-week"><table><caption>Horario semanal · grupo, turno y aula</caption><thead><tr><th>Horas</th>${days.slice(1).map(d=>`<th scope="col">${d}</th>`).join('')}</tr></thead><tbody>${ranges.map(range=>`<tr><th scope="row">${range}</th>${days.slice(1).map((_,i)=>`<td>${rows.filter(r=>Number(r.Dia_Semana)===i+1&&fmtTime(r.Hr_Inicio)+'–'+fmtTime(r.Hr_Fin)===range).map(cell).join('')||'—'}</td>`).join('')}</tr>`).join('')}</tbody></table></div><div class="v4-week-mobile">${days.slice(1).map((d,i)=>{const list=rows.filter(r=>Number(r.Dia_Semana)===i+1);return list.length?`<section><h4>${d}</h4>${list.map(r=>`<p class="class-clock">${fmtTime(r.Hr_Inicio)}–${fmtTime(r.Hr_Fin)}</p>${cell(r)}`).join('')}</section>`:'';}).join('')}</div>`;
  }
};
