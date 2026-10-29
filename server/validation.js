'use strict';
const {rule}=require('./rules');
const operational=new Set(['MATRICULA','PAGO','USUARIO','RESULTADO_SIMULACRO','SIMULACRO_HORARIO']);
function autoCode(m,col){return operational.has(m.name)&&m.pk.length===1&&col.pk&&/^ID_/i.test(col.name);}
function validDate(value){return typeof value==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(value)&&!isNaN(Date.parse(value+'T00:00:00Z'))&&new Date(value+'T00:00:00Z').toISOString().slice(0,10)===value;}
function validateFields(m,data){
  for(const c of m.columns){
    const v=data[c.name];if(v===undefined)continue;
    if(v===null){if(c.required)throw rule(`${c.name}: campo obligatorio.`);continue;}
    if(['varchar','nvarchar'].includes(c.type)){
      if(typeof v!=='string'||!v.trim()||v.length>c.length)throw rule(`${c.name}: texto obligatorio de hasta ${c.length} caracteres.`);
      if(/^CELULAR/.test(c.name)&&!/^\d{9}$/.test(v))throw rule(`${c.name}: el celular debe contener exactamente nueve dígitos, sin espacios ni símbolos.`);
      if(/^DNI_|^DNI_ALUMNO$|^DNI_DOCENTE$/.test(c.name)&&!/^\d{8}$/.test(v))throw rule(`${c.name}: el DNI debe contener ocho dígitos.`);
      if(c.pk&&!c.references&&!/^DNI_/.test(c.name)&&!autoCode(m,c)&&! /^[A-Za-z0-9_-]+$/.test(v))throw rule(`${c.name}: usa letras, números, guion o guion bajo, hasta ${c.length} caracteres.`);
      if(/^CORREO/.test(c.name)&&! /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v))throw rule(`${c.name}: correo inválido.`);
    }
    if(c.type==='date'&&!validDate(v))throw rule(`${c.name}: fecha inválida.`);
    if(c.type==='time'&&!/^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/.test(v))throw rule(`${c.name}: hora inválida.`);
    if(['decimal','tinyint','smallint'].includes(c.type)){
      if(typeof v!=='number'||!Number.isFinite(v)||v<0)throw rule(`${c.name}: número inválido.`);
      const factor=10**(c.scale||0);
      if(Math.abs(v*factor-Math.round(v*factor))>0.000001)throw rule(`${c.name}: precisión decimal inválida.`);
      if(c.type==='decimal'&&v>=10**(c.length-c.scale))throw rule(`${c.name}: número fuera de rango.`);
      if(c.type==='tinyint'&&v>255||c.type==='smallint'&&v>32767)throw rule(`${c.name}: número fuera de rango.`);
    }
    if(c.type==='bit'&&![true,false,0,1].includes(v))throw rule(`${c.name}: valor booleano inválido.`);
  }
}
module.exports={autoCode,validDate,validateFields};
