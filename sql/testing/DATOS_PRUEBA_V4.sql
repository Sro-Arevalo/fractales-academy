-- Datos completamente ficticios, solo para la base independiente de pruebas.
-- Puede ejecutarse después de crear el esquema original y antes o después de migrar.
SET NOCOUNT ON; SET XACT_ABORT ON;
SET ANSI_NULLS ON; SET QUOTED_IDENTIFIER ON; SET ANSI_PADDING ON; SET ANSI_WARNINGS ON;
SET ARITHABORT ON; SET CONCAT_NULL_YIELDS_NULL ON; SET NUMERIC_ROUNDABORT OFF;
IF DB_NAME() NOT LIKE N'FractalesAcademy[_]Pruebas[_]V4%' OR DB_NAME()=N'FractalesAcademy'
 THROW 54910,'Datos ficticios permitidos exclusivamente en FractalesAcademy_Pruebas_V4...',1;
IF OBJECT_ID('dbo.MATRICULA') IS NULL THROW 54911,'Prepare primero el esquema de pruebas.',1;
BEGIN TRY
 BEGIN TRAN;
 IF NOT EXISTS(SELECT 1 FROM dbo.CARRERA WHERE Cod_Carrera='V4-TEST') INSERT dbo.CARRERA VALUES ('V4-TEST','Carrera ficticia V4');
 IF NOT EXISTS(SELECT 1 FROM dbo.Aula WHERE Cod_Aula='V4-AULA') INSERT dbo.Aula(Cod_Aula,Nomb_Aula,Capacidad) VALUES ('V4-AULA','Aula ficticia V4',100);
 IF NOT EXISTS(SELECT 1 FROM dbo.Aula WHERE Cod_Aula='V4-AULA2') INSERT dbo.Aula(Cod_Aula,Nomb_Aula,Capacidad) VALUES ('V4-AULA2','Segunda aula ficticia V4',100);
 IF NOT EXISTS(SELECT 1 FROM dbo.CURSOS WHERE Cod_Curso='V4-MAT') INSERT dbo.CURSOS(Cod_Curso,Nomb_Curso) VALUES ('V4-MAT','Matemática ficticia V4');
 IF NOT EXISTS(SELECT 1 FROM dbo.Docente WHERE DNI_Doc='00000003') INSERT dbo.Docente(DNI_Doc,Nom_Doc,Cel_Doc) VALUES ('00000003','Docente Ficticio V4','900000003');
 IF NOT EXISTS(SELECT 1 FROM dbo.Docente_Asignatura WHERE CURSOS_Cod_Curso='V4-MAT' AND Docente_DNI_Doc='00000003') INSERT dbo.Docente_Asignatura VALUES ('V4-MAT','00000003');
 IF NOT EXISTS(SELECT 1 FROM dbo.Ciclo WHERE Cod_Ciclo='V4-REGULAR') INSERT dbo.Ciclo(Cod_Ciclo,Programa_Cod_Programa,Nomb_Ciclo,Modalidad,Fech_Inicio,Fech_Fin,Nro_Mensualidades,Precio_Mensual,ESTADO_CICLO_Cod_Estado)
 VALUES ('V4-REGULAR','PREUNIV','Regular ficticio V4','REGULAR','20270131','20270530',4,250,'PROGRAMADO');
 IF NOT EXISTS(SELECT 1 FROM dbo.Ciclo WHERE Cod_Ciclo='V4-ACELERADO') INSERT dbo.Ciclo(Cod_Ciclo,Programa_Cod_Programa,Nomb_Ciclo,Modalidad,Fech_Inicio,Fech_Fin,Nro_Mensualidades,Precio_Mensual,ESTADO_CICLO_Cod_Estado)
 VALUES ('V4-ACELERADO','PREUNIV','Acelerado ficticio V4','ACELERADO','20270630','20270829',2,250,'PROGRAMADO');
 IF NOT EXISTS(SELECT 1 FROM dbo.Grupo WHERE Cod_Grupo='V4-GR') INSERT dbo.Grupo(Cod_Grupo,Nomb_Grupo,Cupo_Max,Turno_Cod_Turno,Aula_Cod_Aula,Ciclo_Cod_Ciclo) VALUES ('V4-GR','Regular ficticio A',100,'MANANA','V4-AULA','V4-REGULAR');
 IF NOT EXISTS(SELECT 1 FROM dbo.Grupo WHERE Cod_Grupo='V4-GR2') INSERT dbo.Grupo(Cod_Grupo,Nomb_Grupo,Cupo_Max,Turno_Cod_Turno,Aula_Cod_Aula,Ciclo_Cod_Ciclo) VALUES ('V4-GR2','Regular ficticio B',100,'MANANA','V4-AULA2','V4-REGULAR');
 IF NOT EXISTS(SELECT 1 FROM dbo.Grupo WHERE Cod_Grupo='V4-GA') INSERT dbo.Grupo(Cod_Grupo,Nomb_Grupo,Cupo_Max,Turno_Cod_Turno,Aula_Cod_Aula,Ciclo_Cod_Ciclo) VALUES ('V4-GA','Acelerado ficticio A',100,'TARDE','V4-AULA','V4-ACELERADO');
 IF NOT EXISTS(SELECT 1 FROM dbo.ALUMNO WHERE DNI_Alu='00000001') INSERT dbo.ALUMNO(DNI_Alu,Nomb_Alu,Cel_Alu,Nomb_Apoderado,Cel_Apoderado,PARENTESCO_Cod_Paren,CARRERA_Cod_Carrera)
 VALUES ('00000001','Estudiante Ficticio Legado V4','900000001','Apoderado Ficticio V4','900000002','TUTOR','V4-TEST');
 IF NOT EXISTS(SELECT 1 FROM dbo.MATRICULA WHERE Cod_Matricula='V4-MAT-LEGADO') INSERT dbo.MATRICULA(Cod_Matricula,ALUMNO_DNI_Alu,Grupo_Cod_Grupo,ESTADO_MATRICULA_Cod_Estado_Matricula)
 VALUES ('V4-MAT-LEGADO','00000001','V4-GR','ACTIVA');
 IF NOT EXISTS(SELECT 1 FROM dbo.Pago WHERE Cod_Pago='V4-PAGO-LEGADO') INSERT dbo.Pago(Cod_Pago,CONCEPTO_PAGO_Cod_Concepto,Monto,ESTADO_PAGO_Cod_Estado,ALUMNO_DNI_Alu)
 VALUES ('V4-PAGO-LEGADO','MATRICULA_INICIAL',50,'PENDIENTE','00000001');
 COMMIT;
END TRY
BEGIN CATCH
 IF XACT_STATE()<>0 ROLLBACK;
 THROW;
END CATCH;
SELECT 'Datos ficticios disponibles: ciclos Regular/Acelerado, 3 grupos, docente/curso, alumno legado, matrícula y obligación pendiente.' AS Resultado;
-- Verificar inscripción nueva desde la aplicación; ella creará la cuenta y sus cuotas.
-- No se incluye ninguna contraseña compartida ni se copian personas de producción.
