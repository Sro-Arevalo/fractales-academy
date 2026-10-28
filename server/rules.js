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
    if(existing[k] instanceof Date){if(k==='Fech_Matricula')return data[k]!==existing[k].toISOString().slice(0,10);return new Date(String(data[k]).replace(' ','T').replace(/Z?$/,'Z')).getTime()!==existing[k].getTime();}
    return String(data[k])!==String(existing[k]);
  }))throw rule('Este dato forma parte del historial y no se puede reasignar.');};
  if(table==='MATRICULA')unchanged(['ALUMNO_DNI_Alu','Grupo_Cod_Grupo','Fech_Matricula']);
  if(table==='Ciclo'&&Object.hasOwn(data,'Precio_Mensual')&&Number(data.Precio_Mensual)!==250&&await require('./schema-v43').ready(tx))throw rule('La tarifa de las nuevas inscripciones es S/ 250 por mensualidad.');
  if(table==='Nota_Examen')unchanged(['MATRICULA_Cod_Matricula','Examen_Grupo_Cod_examen_grupo','Grupo_Cod_Grupo','Fech_registro']);
  if(table==='Examen_Grupo')unchanged(['Examen_Cod_Examen','Grupo_Cod_Grupo']);
  if(table==='Usuario'){
    if(!['ADMIN','ALUMNO'].includes(v('ROL_Cod_Rol')))throw rule('Solo se permiten los roles ADMIN y ALUMNO.');
    if((v('ROL_Cod_Rol')==='ADMIN'&&v('ALUMNO_DNI_Alu'))||(v('ROL_Cod_Rol')==='ALUMNO'&&!v('ALUMNO_DNI_Alu')))throw rule('El rol y el estudiante asociado no son compatibles.');
    if(!update&&v('ROL_Cod_Rol')==='ALUMNO')throw rule('Las cuentas de alumnos se crean mediante la inscripción.');
    unchanged(['ROL_Cod_Rol','ALUMNO_DNI_Alu','Nomb_Usuario']);
    if(update&&existing.Cod_Usuario===actor.Cod_Usuario&&(v('Activo')===false||v('Activo')===0))throw rule('No puedes desactivar tu propia cuenta.');
  }
  if(table==='Ciclo'&&update&&['Modalidad','Fech_Inicio','Fech_Fin','Nro_Mensualidades','Programa_Cod_Programa'].some(k=>Object.hasOwn(data,k))){
    const used=await first(tx,'SELECT TOP 1 m.Cod_Matricula FROM dbo.MATRICULA m JOIN dbo.Grupo g ON g.Cod_Grupo=m.Grupo_Cod_Grupo WHERE g.Ciclo_Cod_Ciclo=@id',{id:existing.Cod_Ciclo});
    if(used)for(const k of ['Modalidad','Fech_Inicio','Fech_Fin','Nro_Mensualidades','Programa_Cod_Programa']){
      const old=existing[k] instanceof Date?existing[k].toISOString().slice(0,10):existing[k];
      if(Object.hasOwn(data,k)&&String(data[k])!==String(old))throw rule('No cambies la edición de un ciclo con matrículas: registra otro ciclo.');
    }
  }
  if(table==='Examen'&&update&&Object.hasOwn(data,'puntaje_maximo')){
    const invalid=await first(tx,`SELECT TOP 1 n.Cod_Nota FROM dbo.Nota_Examen n JOIN dbo.Examen_Grupo eg ON eg.Cod_examen_grupo=n.Examen_Grupo_Cod_examen_grupo WHERE eg.Examen_Cod_Examen=@exam AND n.Puntaje_total>@max`,{exam:existing.Cod_Examen,max:data.puntaje_maximo});
    if(invalid)throw rule('El máximo no puede ser menor que los puntajes ya registrados.');
  }
  if(table==='Grupo') {
    if(update&&v('Ciclo_Cod_Ciclo')!==existing.Ciclo_Cod_Ciclo){
      const used=await first(tx,'SELECT TOP 1 Cod_Matricula FROM dbo.MATRICULA WHERE Grupo_Cod_Grupo=@group',{group:existing.Cod_Grupo});
      if(used)throw rule('No se puede cambiar el ciclo de un grupo con matrículas.');
    }
    const g=await first(tx,'SELECT Capacidad,Activa FROM dbo.Aula WITH (UPDLOCK,HOLDLOCK) WHERE Cod_Aula=@a',{a:v('Aula_Cod_Aula')});
    if(!g) throw rule('El aula no existe.');
    if(!g.Activa&&v('Activo')!==false&&v('Activo')!==0)throw rule('Selecciona un aula activa para habilitar el grupo.');
    if(Number(v('Cupo_Max'))>g.Capacidad) throw rule('El cupo del grupo supera la capacidad del aula.');
    if(update){const count=await first(tx,`SELECT COUNT_BIG(*) n FROM dbo.MATRICULA WITH (UPDLOCK,HOLDLOCK) WHERE Grupo_Cod_Grupo=@g AND ESTADO_MATRICULA_Cod_Estado_Matricula = 'ACTIVA'`,{g:existing.Cod_Grupo});if(Number(v('Cupo_Max'))<Number(count.n))throw rule('El nuevo cupo no puede ser menor que las matrículas existentes.');}
    if(update && ['Aula_Cod_Aula','Ciclo_Cod_Ciclo','Turno_Cod_Turno'].some(k=>v(k)!==existing[k])){
      const h=await first(tx,'SELECT TOP 1 Cod_Horario FROM dbo.Horario WITH (UPDLOCK,HOLDLOCK) WHERE Grupo_Cod_Grupo=@g',{g:existing.Cod_Grupo});
      if(h)throw rule('No cambies aula ni ciclo de un grupo con horarios registrados: primero reorganiza sus bloques.');
    }
  }
  if(table==='Aula'&&update){
    const tooLarge=await first(tx,'SELECT TOP 1 Cod_Grupo FROM dbo.Grupo WITH (UPDLOCK,HOLDLOCK) WHERE Aula_Cod_Aula=@aula AND Cupo_Max>@capacity',{aula:existing.Cod_Aula,capacity:v('Capacidad')});
    if(tooLarge)throw rule('La capacidad no puede ser menor que el cupo de los grupos asociados.');
  }
  if(table==='MATRICULA') {
    const g=await first(tx,`SELECT g.Cupo_Max,g.Activo,c.ESTADO_CICLO_Cod_Estado FROM dbo.Grupo g WITH (UPDLOCK,HOLDLOCK) JOIN dbo.Ciclo c ON c.Cod_Ciclo=g.Ciclo_Cod_Ciclo WHERE g.Cod_Grupo=@g`,{g:v('Grupo_Cod_Grupo')});
    if(!g || !g.Activo) throw rule('El grupo no está disponible.');
    if(g.ESTADO_CICLO_Cod_Estado==='CANCELADO'||g.ESTADO_CICLO_Cod_Estado==='FINALIZADO') throw rule('No se puede matricular en un ciclo finalizado o cancelado.');
    if((!update || existing.Grupo_Cod_Grupo!==v('Grupo_Cod_Grupo') || existing.ESTADO_MATRICULA_Cod_Estado_Matricula!=='ACTIVA') && v('ESTADO_MATRICULA_Cod_Estado_Matricula')==='ACTIVA') {
      const count=await first(tx,`SELECT COUNT_BIG(*) AS n FROM dbo.MATRICULA WITH (UPDLOCK,HOLDLOCK) WHERE Grupo_Cod_Grupo=@g AND ESTADO_MATRICULA_Cod_Estado_Matricula = 'ACTIVA'`,{g:v('Grupo_Cod_Grupo')});
      if(Number(count.n)>=g.Cupo_Max) throw rule('Este grupo ya alcanzó su cupo máximo.');
    }
  }
  if(table==='Horario' && v('Activo')!==false && v('Activo')!==0) {
    if(v('TIPO_BLOQUE_Cod_Tipo')==='CLASE'){
      const assigned=await first(tx,`SELECT da.CURSOS_Cod_Curso FROM dbo.Docente_Asignatura da JOIN dbo.CURSOS c ON c.Cod_Curso=da.CURSOS_Cod_Curso JOIN dbo.Docente d ON d.DNI_Doc=da.Docente_DNI_Doc WHERE da.CURSOS_Cod_Curso=@course AND da.Docente_DNI_Doc=@teacher AND c.Activa=1 AND d.Activo=1`,{course:v('Docente_Asignatura_CURSOS_Cod_Curso'),teacher:v('Docente_Asignatura_Docente_DNI_Doc')});
      if(!assigned)throw rule('Selecciona un docente activo asignado al curso activo.');
    }
    const g=await first(tx,`SELECT gr.Cod_Grupo,gr.Aula_Cod_Aula,tu.Hr_Inicio,tu.Hr_Fin,ci.Fech_Inicio,ci.Fech_Fin FROM dbo.Grupo gr WITH (UPDLOCK,HOLDLOCK) JOIN dbo.Aula a ON a.Cod_Aula=gr.Aula_Cod_Aula JOIN dbo.Turno tu ON tu.Cod_Turno=gr.Turno_Cod_Turno JOIN dbo.Ciclo ci ON ci.Cod_Ciclo=gr.Ciclo_Cod_Ciclo WHERE gr.Cod_Grupo=@g AND gr.Activo=1 AND a.Activa=1 AND ci.ESTADO_CICLO_Cod_Estado IN ('ACTIVO','PROGRAMADO')`,{g:v('Grupo_Cod_Grupo')});
    if(!g) throw rule('El grupo, aula o ciclo no está disponible.');
    const start=timeHHMM(v('Hr_Inicio')), end=timeHHMM(v('Hr_Fin'));
    const turnStart=timeHHMM(g.Hr_Inicio),turnEnd=timeHHMM(g.Hr_Fin);
    if(start>=end||start<turnStart||end>turnEnd) throw rule('El bloque debe tener duración positiva y estar dentro del turno del grupo.');
    const q=await request(tx);
    q.input('dia',sql.TinyInt,Number(v('Dia_Semana')));
    q.input('ini',sql.VarChar(8),start);
    q.input('fin',sql.VarChar(8),end);
    q.input('id',sql.VarChar(20),existing?.Cod_Horario||'');
    q.input('grupo',sql.VarChar(20),v('Grupo_Cod_Grupo'));
    q.input('aula',sql.VarChar(10),g.Aula_Cod_Aula);
    q.input('docente',sql.VarChar(8),v('Docente_Asignatura_Docente_DNI_Doc')||'');
    q.input('cini',sql.Date,g.Fech_Inicio);
    q.input('cfin',sql.Date,g.Fech_Fin);
    const conflicts=(await q.query(`SELECT TOP (1) h.Cod_Horario, gr.Nomb_Grupo,
      CASE WHEN h.Grupo_Cod_Grupo=@grupo THEN 'GRUPO'
           WHEN gr.Aula_Cod_Aula=@aula THEN 'AULA' ELSE 'DOCENTE' END AS Motivo
      FROM dbo.Horario h WITH (UPDLOCK,HOLDLOCK)
      JOIN dbo.Grupo gr ON gr.Cod_Grupo=h.Grupo_Cod_Grupo
      JOIN dbo.Ciclo ci ON ci.Cod_Ciclo=gr.Ciclo_Cod_Ciclo
      WHERE h.Activo=1 AND h.Cod_Horario<>@id AND h.Dia_Semana=@dia
      AND h.Hr_Inicio < CONVERT(time(0),@fin) AND h.Hr_Fin > CONVERT(time(0),@ini)
      AND ci.Fech_Inicio<=@cfin AND ci.Fech_Fin>=@cini
      AND (h.Grupo_Cod_Grupo=@grupo OR gr.Aula_Cod_Aula=@aula
      OR (@docente<>'' AND h.Docente_Asignatura_Docente_DNI_Doc=@docente))`)).recordset[0];
    if(conflicts) throw rule(`Cruce de horario (${conflicts.Motivo.toLowerCase()}) con «${conflicts.Nomb_Grupo}», bloque ${conflicts.Cod_Horario}.`);
  }
  if(table==='Pago') {
    const concept=v('CONCEPTO_PAGO_Cod_Concepto');
    const dni=v('ALUMNO_DNI_Alu');
    const check=await request(tx);
    check.input('id',sql.VarChar(20),existing?.Cod_Pago||'');
    check.input('dni',sql.VarChar(8),dni);
    check.input('concept',sql.VarChar(20),concept);
    check.input('mat',sql.VarChar(20),v('MATRICULA_Cod_Matricula')||'');
    check.input('n',sql.TinyInt,Number(v('Nro_Mensualidad')||0));
    if(concept==='MATRICULA_INICIAL'||concept==='MATERIALES') {
      // El modelo fija la matrícula inicial en S/ 50 como regla académica.
      // Materiales es configurable; el SQL solo exige monto > 0.
      if(concept==='MATRICULA_INICIAL' && Number(v('Monto'))!==50) throw rule('La matrícula inicial debe ser S/ 50.');
      const duplication=(await check.query(`SELECT TOP 1 Cod_Pago FROM dbo.Pago WITH (UPDLOCK,HOLDLOCK) WHERE ALUMNO_DNI_Alu=@dni AND CONCEPTO_PAGO_Cod_Concepto=@concept AND Cod_Pago<>@id `)).recordset[0];
      if(duplication) throw rule('Este alumno ya tiene registrado ese concepto único (pagado o pendiente).');
    } else if(concept==='MENSUALIDAD') {
      const cycle=await first(tx,`SELECT c.Nro_Mensualidades,c.Precio_Mensual,m.ALUMNO_DNI_Alu FROM dbo.MATRICULA m WITH (UPDLOCK,HOLDLOCK) JOIN dbo.Grupo g ON g.Cod_Grupo=m.Grupo_Cod_Grupo JOIN dbo.Ciclo c ON c.Cod_Ciclo=g.Ciclo_Cod_Ciclo WHERE m.Cod_Matricula=@mat`,{mat:v('MATRICULA_Cod_Matricula')});
      if(!cycle||cycle.ALUMNO_DNI_Alu!==dni) throw rule('La matrícula no corresponde al alumno.');
      if(Number(v('Nro_Mensualidad'))>cycle.Nro_Mensualidades) throw rule('La mensualidad supera la duración del ciclo.');
      if(Number(v('Monto'))!==Number(cycle.Precio_Mensual)) throw rule(`La mensualidad debe ser S/ ${Number(cycle.Precio_Mensual).toFixed(2)}.`);
      const dup=(await check.query(`SELECT TOP 1 Cod_Pago FROM dbo.Pago WITH (UPDLOCK,HOLDLOCK) WHERE MATRICULA_Cod_Matricula=@mat AND CONCEPTO_PAGO_Cod_Concepto='MENSUALIDAD' AND Nro_Mensualidad=@n AND Cod_Pago<>@id`)).recordset[0];
      if(dup) throw rule('Ya existe la mensualidad de ese número para esta matrícula.');
    }
    if(v('ESTADO_PAGO_Cod_Estado')==='PAGADO') {
      // El usuario cobrador nunca se acepta desde el navegador.
      data.Usuario_Cod_Usuario=(update&&existing.ESTADO_PAGO_Cod_Estado==='PAGADO')?existing.Usuario_Cod_Usuario:actor.Cod_Usuario;
      if(!v('Fech_Pago')) data.Fech_Pago=new Date().toISOString().slice(0,19);
      if(!v('Medio_Pago')) throw rule('Indica el medio de pago al marcar PAGADO.');
    } else {
      data.Usuario_Cod_Usuario=null;
      data.Fech_Pago=null;
      data.Medio_Pago=null;
    }
  }
  if(table==='Examen_Grupo') {
    // Mantener el campo legado Estado sincronizado con su catálogo.
    data.Estado=v('ESTADO_EXAMEN_GRUPO_Cod_Estado_Examen')||'PROGRAMADO';
  }
  if(table==='Nota_Examen') {
    if(typeof v('Puntaje_total')!=='number'||v('Puntaje_total')<0)throw rule('El puntaje total no puede ser negativo.');
    const max=await first(tx,`SELECT e.puntaje_maximo FROM dbo.Examen_Grupo eg JOIN dbo.Examen e ON e.Cod_Examen=eg.Examen_Cod_Examen WHERE eg.Cod_examen_grupo=@id`,{id:v('Examen_Grupo_Cod_examen_grupo')});
    if(!max) throw rule('El simulacro asignado no existe.');
    if(Number(v('Puntaje_total'))>Number(max.puntaje_maximo)) throw rule(`La nota supera el puntaje máximo de ${max.puntaje_maximo}.`);
    const membership=await first(tx,`SELECT m.ALUMNO_DNI_Alu,eg.Examen_Cod_Examen FROM dbo.MATRICULA m WITH (UPDLOCK,HOLDLOCK)
      JOIN dbo.Examen_Grupo eg ON eg.Grupo_Cod_Grupo=m.Grupo_Cod_Grupo WHERE m.Cod_Matricula=@mat AND eg.Cod_examen_grupo=@eg
      AND m.Grupo_Cod_Grupo=@group AND m.ESTADO_MATRICULA_Cod_Estado_Matricula<>'ANULADA'`,{mat:v('MATRICULA_Cod_Matricula'),eg:v('Examen_Grupo_Cod_examen_grupo'),group:v('Grupo_Cod_Grupo')});
    if(!membership)throw rule('El estudiante no pertenece al grupo participante del simulacro.');
    const duplicate=await first(tx,`SELECT TOP 1 n.Cod_Nota FROM dbo.Nota_Examen n WITH (UPDLOCK,HOLDLOCK)
      JOIN dbo.MATRICULA m ON m.Cod_Matricula=n.MATRICULA_Cod_Matricula JOIN dbo.Examen_Grupo eg ON eg.Cod_examen_grupo=n.Examen_Grupo_Cod_examen_grupo
      WHERE m.ALUMNO_DNI_Alu=@dni AND eg.Examen_Cod_Examen=@exam AND n.Cod_Nota<>@code`,{dni:membership.ALUMNO_DNI_Alu,exam:membership.Examen_Cod_Examen,code:existing?.Cod_Nota||''});
    if(duplicate)throw rule('Este estudiante ya tiene un puntaje total para el simulacro.');
  }
  if(table==='Usuario' && update && existing.Cod_Usuario===actor.Cod_Usuario && data.Activo===false) throw rule('No puedes desactivar tu propia cuenta.');
}
module.exports={validate,rule};
