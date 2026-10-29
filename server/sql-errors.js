'use strict';
function details(error){const number=error.number||error.originalError?.info?.number;const raw=String(error.message||'');const constraint=(raw.match(/["'«]((?:FK|CK|PK|UQ|UX|IX)_[A-Za-z0-9_]{1,125})["'»]/i)||[])[1]||null;return {code:error.code||null,number:number||null,constraint,operation:error.sqlContext?.operation||null,table:error.sqlContext?.table||null};}
async function step(operation,table,work){try{return await work();}catch(e){e.sqlContext={operation,table};throw e;}}
function friendly(error){
 const d=details(error),c=d.constraint||'';
 if(d.number===547){
  if(/PARENTESCO/.test(c))return 'El parentesco seleccionado ya no está disponible. Actualiza el formulario.';
  if(/CARRERA/.test(c))return 'La carrera seleccionada ya no está disponible.';
  if(/HORARIO_ACADEMICO/.test(c))return 'El horario académico seleccionado ya no está disponible.';
  if(/CONCEPTO|ESTADO_PAGO/.test(c))return 'La configuración de conceptos o estados de pago está incompleta. Solicita revisión administrativa.';
  if(/CELULAR/.test(c))return 'El celular debe contener nueve dígitos.';
  if(/DNI/.test(c))return 'Revisa el DNI del estudiante y el DNI opcional del apoderado.';
  if(/ROL|ESTADO_MATRICULA/.test(c))return 'La configuración de roles o matrícula está incompleta.';
  return error.sqlContext?'No se pudo completar la matrícula porque un dato seleccionado no cumple las reglas vigentes. Actualiza el formulario y consulta la referencia del error.':'Los datos no cumplen una relación vigente. Revisa las opciones seleccionadas.';
 }
 if([2627,2601].includes(d.number))return /ALUMNO|USUARIO/.test(c)?'Este DNI o cuenta ya está registrado. Consulta al estudiante antes de matricular.':'Ya existe un registro con ese identificador o combinación de valores.';
 if([8152,2628].includes(d.number))return 'Uno de los campos supera la longitud permitida. Revisa los datos ingresados.';
 return null;
}
module.exports={details,step,friendly};
