'use strict';
const {sql,request}=require('./db');
function timeHHMM(value){if(value instanceof Date)return value.toISOString().slice(11,16);return String(value).slice(0,5);}
function rule(message){ const err=new Error(message);err.status=400;err.public=true;return err; }
async function first(req,statement,inputs={}) {
  const q=await request(req);
  for(const [k,v] of Object.entries(inputs)) q.input(k,v);
  return (await q.query(statement)).recordset[0];
}
// Reglas intertablas que SQL Server no puede expresar con CHECK simples.
// Llamar dentro de una transacción SERIALIZABLE antes de INSERT/UPDATE.
async function validate(table,data,existing,tx,actor) {
  const v=k=>Object.prototype.hasOwnProperty.call(data,k)?data[k]:existing?.[k];
  const update = Boolean(existing);
  const unchanged=keys=>{if(update&&keys.some(k=>{
    if(!Object.hasOwn(data,k))return false;
    if(existing[k] instanceof Date){if(k==='FECHA_MATRICULA')return data[k]!==existing[k].toISOString().slice(0,10);return new Date(String(data[k]).replace(' ','T').replace(/Z?$/,'Z')).getTime()!==existing[k].getTime();}
    return String(data[k])!==String(existing[k]);
  }))throw rule('Este dato forma parte del historial y no se puede reasignar.');};
  if(table==='MATRICULA')unchanged(['DNI_ALUMNO','ID_HORARIO_ACADEMICO','FECHA_MATRICULA']);
  if(table==='CICLO'&&Object.hasOwn(data,'PRECIO_MENSUAL')&&Number(data.PRECIO_MENSUAL)!==250&&await require('./schema-v43').ready(tx))throw rule('La tarifa de las nuevas inscripciones es S/ 250 por mensualidad.');
  if(table==='RESULTADO_SIMULACRO')unchanged(['ID_MATRICULA','ID_SIMULACRO_HORARIO','ID_HORARIO_ACADEMICO','FECHA_REGISTRO']);
  if(table==='SIMULACRO_HORARIO')unchanged(['ID_SIMULACRO','ID_HORARIO_ACADEMICO']);
  if(table==='USUARIO'){
    if(!['ADMIN','ALUMNO'].includes(v('ID_ROL')))throw rule('Solo se permiten los roles ADMIN y ALUMNO.');
    if((v('ID_ROL')==='ADMIN'&&v('DNI_ALUMNO'))||(v('ID_ROL')==='ALUMNO'&&!v('DNI_ALUMNO')))throw rule('El rol y el estudiante asociado no son compatibles.');
    if(!update&&v('ID_ROL')==='ALUMNO')throw rule('Las cuentas de alumnos se crean mediante la inscripción.');
    unchanged(['ID_ROL','DNI_ALUMNO','NOMBRE_USUARIO']);
    if(update&&existing.ID_USUARIO===actor.ID_USUARIO&&(v('ACTIVO')===false||v('ACTIVO')===0))throw rule('No puedes desactivar tu propia cuenta.');
    if(update&&existing.ID_ROL==='ADMIN'&&existing.ACTIVO&&(v('ACTIVO')===false||v('ACTIVO')===0)){
      const n=await first(tx,"SELECT COUNT_BIG(*) n FROM dbo.USUARIO WITH(UPDLOCK,HOLDLOCK) WHERE ID_ROL='ADMIN' AND ACTIVO=1");
      if(Number(n.n)<=1)throw rule('Debe conservarse al menos una cuenta administradora activa.');
    }
  }
  if(table==='CICLO'&&update&&['MODALIDAD','FECHA_INICIO','FECHA_FIN','NUMERO_MENSUALIDADES','ID_PROGRAMA'].some(k=>Object.hasOwn(data,k))){
    const used=await first(tx,'SELECT TOP 1 m.ID_MATRICULA FROM dbo.MATRICULA m JOIN dbo.HORARIO_ACADEMICO g ON g.ID_HORARIO_ACADEMICO=m.ID_HORARIO_ACADEMICO WHERE g.ID_CICLO=@id',{id:existing.ID_CICLO});
    if(used)for(const k of ['MODALIDAD','FECHA_INICIO','FECHA_FIN','NUMERO_MENSUALIDADES','ID_PROGRAMA']){
      const old=existing[k] instanceof Date?existing[k].toISOString().slice(0,10):existing[k];
      if(Object.hasOwn(data,k)&&String(data[k])!==String(old))throw rule('No cambies la edición de un ciclo con matrículas: registra otro ciclo.');
    }
  }
  if(table==='SIMULACRO'&&update&&Object.hasOwn(data,'PUNTAJE_MAXIMO')){
    const invalid=await first(tx,`SELECT TOP 1 n.ID_RESULTADO FROM dbo.RESULTADO_SIMULACRO n JOIN dbo.SIMULACRO_HORARIO eg ON eg.ID_SIMULACRO_HORARIO=n.ID_SIMULACRO_HORARIO WHERE eg.ID_SIMULACRO=@exam AND n.PUNTAJE_TOTAL>@max`,{exam:existing.ID_SIMULACRO,max:data.PUNTAJE_MAXIMO});
    if(invalid)throw rule('El máximo no puede ser menor que los puntajes ya registrados.');
  }
  if(table==='HORARIO_ACADEMICO') {
    if(update&&v('ID_CICLO')!==existing.ID_CICLO){
      const used=await first(tx,'SELECT TOP 1 ID_MATRICULA FROM dbo.MATRICULA WHERE ID_HORARIO_ACADEMICO=@group',{group:existing.ID_HORARIO_ACADEMICO});
      if(used)throw rule('No se puede cambiar el ciclo de un grupo con matrículas.');
    }
    const g=await first(tx,'SELECT CAPACIDAD,ACTIVO FROM dbo.AULA WITH (UPDLOCK,HOLDLOCK) WHERE ID_AULA=@a',{a:v('ID_AULA')});
    if(!g) throw rule('El aula no existe.');
    if(!g.ACTIVO&&v('ACTIVO')!==false&&v('ACTIVO')!==0)throw rule('Selecciona un aula activa para habilitar el grupo.');
    if(Number(v('CAPACIDAD_MAXIMA'))>g.CAPACIDAD) throw rule('El cupo del grupo supera la capacidad del aula.');
    if(update){const count=await first(tx,`SELECT COUNT_BIG(*) n FROM dbo.MATRICULA WITH (UPDLOCK,HOLDLOCK) WHERE ID_HORARIO_ACADEMICO=@g AND ID_ESTADO_MATRICULA = 'ACTIVA'`,{g:existing.ID_HORARIO_ACADEMICO});if(Number(v('CAPACIDAD_MAXIMA'))<Number(count.n))throw rule('El nuevo cupo no puede ser menor que las matrículas existentes.');}
    if(update && ['ID_AULA','ID_CICLO','ID_TURNO'].some(k=>v(k)!==existing[k])){
      const h=await first(tx,'SELECT TOP 1 ID_BLOQUE_HORARIO FROM dbo.BLOQUE_HORARIO WITH (UPDLOCK,HOLDLOCK) WHERE ID_HORARIO_ACADEMICO=@g',{g:existing.ID_HORARIO_ACADEMICO});
      if(h)throw rule('No cambies aula ni ciclo de un grupo con horarios registrados: primero reorganiza sus bloques.');
    }
  }
  if(table==='AULA'&&update){
    const tooLarge=await first(tx,'SELECT TOP 1 ID_HORARIO_ACADEMICO FROM dbo.HORARIO_ACADEMICO WITH (UPDLOCK,HOLDLOCK) WHERE ID_AULA=@aula AND CAPACIDAD_MAXIMA>@capacity',{aula:existing.ID_AULA,capacity:v('CAPACIDAD')});
    if(tooLarge)throw rule('La capacidad no puede ser menor que el cupo de los grupos asociados.');
  }
  if(table==='MATRICULA') {
    const g=await first(tx,`SELECT g.CAPACIDAD_MAXIMA,g.ACTIVO,c.ID_ESTADO_CICLO FROM dbo.HORARIO_ACADEMICO g WITH (UPDLOCK,HOLDLOCK) JOIN dbo.CICLO c ON c.ID_CICLO=g.ID_CICLO WHERE g.ID_HORARIO_ACADEMICO=@g`,{g:v('ID_HORARIO_ACADEMICO')});
    if(!g || !g.ACTIVO) throw rule('El grupo no está disponible.');
    if(g.ID_ESTADO_CICLO==='CANCELADO'||g.ID_ESTADO_CICLO==='FINALIZADO') throw rule('No se puede matricular en un ciclo finalizado o cancelado.');
    if((!update || existing.ID_HORARIO_ACADEMICO!==v('ID_HORARIO_ACADEMICO') || existing.ID_ESTADO_MATRICULA!=='ACTIVA') && v('ID_ESTADO_MATRICULA')==='ACTIVA') {
      const count=await first(tx,`SELECT COUNT_BIG(*) AS n FROM dbo.MATRICULA WITH (UPDLOCK,HOLDLOCK) WHERE ID_HORARIO_ACADEMICO=@g AND ID_ESTADO_MATRICULA = 'ACTIVA'`,{g:v('ID_HORARIO_ACADEMICO')});
      if(Number(count.n)>=g.CAPACIDAD_MAXIMA) throw rule('Este grupo ya alcanzó su cupo máximo.');
    }
  }
  if(table==='BLOQUE_HORARIO' && v('ACTIVO')!==false && v('ACTIVO')!==0) {
    if(v('ID_TIPO_BLOQUE')==='CLASE'){
      const assigned=await first(tx,`SELECT da.ID_CURSO FROM dbo.CURSO_DOCENTE da JOIN dbo.CURSO c ON c.ID_CURSO=da.ID_CURSO JOIN dbo.DOCENTE d ON d.DNI_DOCENTE=da.DNI_DOCENTE WHERE da.ID_CURSO=@course AND da.DNI_DOCENTE=@teacher AND c.ACTIVO=1 AND d.ACTIVO=1`,{course:v('ID_CURSO'),teacher:v('DNI_DOCENTE')});
      if(!assigned)throw rule('Selecciona un docente ACTIVO asignado al curso ACTIVO.');
    }
    const g=await first(tx,`SELECT gr.ID_HORARIO_ACADEMICO,gr.ID_AULA,tu.HORA_INICIO,tu.HORA_FIN,ci.FECHA_INICIO,ci.FECHA_FIN FROM dbo.HORARIO_ACADEMICO gr WITH (UPDLOCK,HOLDLOCK) JOIN dbo.AULA a ON a.ID_AULA=gr.ID_AULA JOIN dbo.TURNO tu ON tu.ID_TURNO=gr.ID_TURNO JOIN dbo.CICLO ci ON ci.ID_CICLO=gr.ID_CICLO WHERE gr.ID_HORARIO_ACADEMICO=@g AND gr.ACTIVO=1 AND a.ACTIVO=1 AND ci.ID_ESTADO_CICLO IN ('ACTIVO','PROGRAMADO')`,{g:v('ID_HORARIO_ACADEMICO')});
    if(!g) throw rule('El grupo, aula o ciclo no está disponible.');
    const start=timeHHMM(v('HORA_INICIO')), end=timeHHMM(v('HORA_FIN'));
    const turnStart=timeHHMM(g.HORA_INICIO),turnEnd=timeHHMM(g.HORA_FIN);
    if(start>=end||start<turnStart||end>turnEnd) throw rule('El bloque debe tener duración positiva y estar dentro del turno del grupo.');
    const q=await request(tx);
    q.input('dia',sql.TinyInt,Number(v('DIA_SEMANA')));
    q.input('ini',sql.VarChar(8),start);
    q.input('fin',sql.VarChar(8),end);
    q.input('id',sql.VarChar(20),existing?.ID_BLOQUE_HORARIO||'');
    q.input('grupo',sql.VarChar(20),v('ID_HORARIO_ACADEMICO'));
    q.input('aula',sql.VarChar(10),g.ID_AULA);
    q.input('docente',sql.VarChar(8),v('DNI_DOCENTE')||'');
    q.input('cini',sql.Date,g.FECHA_INICIO);
    q.input('cfin',sql.Date,g.FECHA_FIN);
    const conflicts=(await q.query(`SELECT TOP (1) h.ID_BLOQUE_HORARIO, gr.NOMBRE_HORARIO,
      CASE WHEN h.ID_HORARIO_ACADEMICO=@grupo THEN 'GRUPO'
           WHEN gr.ID_AULA=@aula THEN 'AULA' ELSE 'DOCENTE' END AS MOTIVO
      FROM dbo.BLOQUE_HORARIO h WITH (UPDLOCK,HOLDLOCK)
      JOIN dbo.HORARIO_ACADEMICO gr ON gr.ID_HORARIO_ACADEMICO=h.ID_HORARIO_ACADEMICO
      JOIN dbo.CICLO ci ON ci.ID_CICLO=gr.ID_CICLO
      WHERE h.ACTIVO=1 AND h.ID_BLOQUE_HORARIO<>@id AND h.DIA_SEMANA=@dia
      AND h.HORA_INICIO < CONVERT(time(0),@fin) AND h.HORA_FIN > CONVERT(time(0),@ini)
      AND ci.FECHA_INICIO<=@cfin AND ci.FECHA_FIN>=@cini
      AND (h.ID_HORARIO_ACADEMICO=@grupo OR gr.ID_AULA=@aula
      OR (@docente<>'' AND h.DNI_DOCENTE=@docente))`)).recordset[0];
    if(conflicts) throw rule(`Cruce de horario (${conflicts.MOTIVO.toLowerCase()}) con «${conflicts.NOMBRE_HORARIO}», bloque ${conflicts.ID_BLOQUE_HORARIO}.`);
  }
  if(table==='PAGO') {
    const concept=v('ID_CONCEPTO');
    const dni=v('DNI_ALUMNO');
    const check=await request(tx);
    check.input('id',sql.VarChar(20),existing?.ID_PAGO||'');
    check.input('dni',sql.VarChar(8),dni);
    check.input('concept',sql.VarChar(20),concept);
    check.input('mat',sql.VarChar(20),v('ID_MATRICULA')||'');
    check.input('n',sql.TinyInt,Number(v('NUMERO_MENSUALIDAD')||0));
    if(concept==='MATRICULA_INICIAL'||concept==='MATERIALES') {
      // El modelo fija la matrícula inicial en S/ 50 como regla académica.
      // Materiales es configurable; el SQL solo exige monto > 0.
      if(concept==='MATRICULA_INICIAL' && Number(v('MONTO'))!==50) throw rule('La matrícula inicial debe ser S/ 50.');
      const duplication=(await check.query(`SELECT TOP 1 ID_PAGO FROM dbo.PAGO WITH (UPDLOCK,HOLDLOCK) WHERE DNI_ALUMNO=@dni AND ID_CONCEPTO=@concept AND ID_PAGO<>@id `)).recordset[0];
      if(duplication) throw rule('Este alumno ya tiene registrado ese concepto único (pagado o pendiente).');
    } else if(concept==='MENSUALIDAD') {
      const cycle=await first(tx,`SELECT c.NUMERO_MENSUALIDADES,c.PRECIO_MENSUAL,m.DNI_ALUMNO FROM dbo.MATRICULA m WITH (UPDLOCK,HOLDLOCK) JOIN dbo.HORARIO_ACADEMICO g ON g.ID_HORARIO_ACADEMICO=m.ID_HORARIO_ACADEMICO JOIN dbo.CICLO c ON c.ID_CICLO=g.ID_CICLO WHERE m.ID_MATRICULA=@mat`,{mat:v('ID_MATRICULA')});
      if(!cycle||cycle.DNI_ALUMNO!==dni) throw rule('La matrícula no corresponde al alumno.');
      if(Number(v('NUMERO_MENSUALIDAD'))>cycle.NUMERO_MENSUALIDADES) throw rule('La mensualidad supera la duración del ciclo.');
      if(Number(v('MONTO'))!==Number(cycle.PRECIO_MENSUAL)) throw rule(`La mensualidad debe ser S/ ${Number(cycle.PRECIO_MENSUAL).toFixed(2)}.`);
      const dup=(await check.query(`SELECT TOP 1 ID_PAGO FROM dbo.PAGO WITH (UPDLOCK,HOLDLOCK) WHERE ID_MATRICULA=@mat AND ID_CONCEPTO='MENSUALIDAD' AND NUMERO_MENSUALIDAD=@n AND ID_PAGO<>@id`)).recordset[0];
      if(dup) throw rule('Ya existe la mensualidad de ese número para esta matrícula.');
    }
    if(v('ID_ESTADO_PAGO')==='PAGADO') {
      // El usuario cobrador nunca se acepta desde el navegador.
      data.ID_USUARIO_RESPONSABLE=(update&&existing.ID_ESTADO_PAGO==='PAGADO')?existing.ID_USUARIO_RESPONSABLE:actor.ID_USUARIO;
      if(!v('FECHA_PAGO')) data.FECHA_PAGO=new Date().toISOString().slice(0,19);
      if(!v('ID_MEDIO_PAGO')) throw rule('Indica el medio de pago al marcar PAGADO.');
    } else {
      data.ID_USUARIO_RESPONSABLE=null;
      data.FECHA_PAGO=null;
      data.ID_MEDIO_PAGO=null;
    }
  }
  if(table==='SIMULACRO_HORARIO') {
    // Mantener el campo legado ESTADO sincronizado con su catálogo.
    data.ESTADO=v('ID_ESTADO_SIMULACRO')||'PROGRAMADO';
  }
  if(table==='RESULTADO_SIMULACRO') {
    if(typeof v('PUNTAJE_TOTAL')!=='number'||v('PUNTAJE_TOTAL')<0)throw rule('El puntaje total no puede ser negativo.');
    const max=await first(tx,`SELECT e.PUNTAJE_MAXIMO FROM dbo.SIMULACRO_HORARIO eg JOIN dbo.SIMULACRO e ON e.ID_SIMULACRO=eg.ID_SIMULACRO WHERE eg.ID_SIMULACRO_HORARIO=@id`,{id:v('ID_SIMULACRO_HORARIO')});
    if(!max) throw rule('El simulacro asignado no existe.');
    if(Number(v('PUNTAJE_TOTAL'))>Number(max.PUNTAJE_MAXIMO)) throw rule(`La nota supera el puntaje máximo de ${max.PUNTAJE_MAXIMO}.`);
    const membership=await first(tx,`SELECT m.DNI_ALUMNO,eg.ID_SIMULACRO FROM dbo.MATRICULA m WITH (UPDLOCK,HOLDLOCK)
      JOIN dbo.SIMULACRO_HORARIO eg ON eg.ID_HORARIO_ACADEMICO=m.ID_HORARIO_ACADEMICO WHERE m.ID_MATRICULA=@mat AND eg.ID_SIMULACRO_HORARIO=@eg
      AND m.ID_HORARIO_ACADEMICO=@group AND m.ID_ESTADO_MATRICULA<>'ANULADA'`,{mat:v('ID_MATRICULA'),eg:v('ID_SIMULACRO_HORARIO'),group:v('ID_HORARIO_ACADEMICO')});
    if(!membership)throw rule('El estudiante no pertenece al grupo participante del simulacro.');
    const duplicate=await first(tx,`SELECT TOP 1 n.ID_RESULTADO FROM dbo.RESULTADO_SIMULACRO n WITH (UPDLOCK,HOLDLOCK)
      JOIN dbo.MATRICULA m ON m.ID_MATRICULA=n.ID_MATRICULA JOIN dbo.SIMULACRO_HORARIO eg ON eg.ID_SIMULACRO_HORARIO=n.ID_SIMULACRO_HORARIO
      WHERE m.DNI_ALUMNO=@dni AND eg.ID_SIMULACRO=@exam AND n.ID_RESULTADO<>@code`,{dni:membership.DNI_ALUMNO,exam:membership.ID_SIMULACRO,code:existing?.ID_RESULTADO||''});
    if(duplicate)throw rule('Este estudiante ya tiene un puntaje total para el simulacro.');
  }
  if(table==='USUARIO' && update && existing.ID_USUARIO===actor.ID_USUARIO && data.ACTIVO===false) throw rule('No puedes desactivar tu propia cuenta.');
}
module.exports={validate,rule,timeHHMM};
