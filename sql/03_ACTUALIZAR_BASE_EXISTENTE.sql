-- FRACTALES ACADEMY — SOLO BASE EXISTENTE DEL MODELO ORIGINAL (25 TABLAS)
-- No hace DROP, TRUNCATE ni CREATE TABLE. Respeta datos y relaciones existentes.
-- ANTES: crea respaldo de la base y confirma que corresponde al esquema original.
-- No ejecutes simultáneamente con la aplicación atendiendo usuarios.
SET ANSI_NULLS ON;
SET ANSI_PADDING ON;
SET ANSI_WARNINGS ON;
SET ARITHABORT ON;
SET CONCAT_NULL_YIELDS_NULL ON;
SET QUOTED_IDENTIFIER ON;
SET NUMERIC_ROUNDABORT OFF;
GO
IF DB_NAME() IN ('master','model','msdb','tempdb')
    THROW 53120, 'Debes conectarte a la base de la academia.', 1;
IF (SELECT COUNT(*) FROM sys.tables WHERE schema_id=SCHEMA_ID('dbo')) <> 25
    THROW 53121, 'Se esperaban 25 tablas; revisa antes de migrar.', 1;
IF (SELECT COUNT(*) FROM sys.foreign_keys WHERE schema_id=SCHEMA_ID('dbo')) <> 27
    THROW 53122, 'Se esperaban 27 claves foráneas; revisa el modelo.', 1;
IF COL_LENGTH('dbo.Pago','Nro_Mensualidad') IS NULL
 OR COL_LENGTH('dbo.Nota_Examen','Grupo_Cod_Grupo') IS NULL
 OR COL_LENGTH('dbo.Horario','Docente_Asignatura_Docente_DNI_Doc') IS NULL
    THROW 53123, 'El esquema existente no coincide con la versión anterior; no se puede actualizar automáticamente.', 1;
-- Previo a índices: datos duplicados impedirían crear las nuevas restricciones.
IF EXISTS (SELECT ALUMNO_DNI_Alu FROM dbo.Usuario WHERE ALUMNO_DNI_Alu IS NOT NULL GROUP BY ALUMNO_DNI_Alu HAVING COUNT(*)>1)
    THROW 53124, 'Hay varias cuentas por alumno; corregir antes de migrar.', 1;
IF EXISTS (SELECT ALUMNO_DNI_Alu,CONCEPTO_PAGO_Cod_Concepto FROM dbo.Pago
           WHERE CONCEPTO_PAGO_Cod_Concepto IN ('MATRICULA_INICIAL','MATERIALES')
           GROUP BY ALUMNO_DNI_Alu,CONCEPTO_PAGO_Cod_Concepto HAVING COUNT(*)>1)
    THROW 53125, 'Hay cobros iniciales o de materiales duplicados; corregir antes de migrar.', 1;
IF EXISTS (SELECT MATRICULA_Cod_Matricula,Nro_Mensualidad FROM dbo.Pago
           WHERE CONCEPTO_PAGO_Cod_Concepto='MENSUALIDAD'
           GROUP BY MATRICULA_Cod_Matricula,Nro_Mensualidad HAVING COUNT(*)>1)
    THROW 53126, 'Hay mensualidades duplicadas; corregir antes de migrar.', 1;
GO

-- Catálogos (idempotentes, sin duplicaciones)
SET XACT_ABORT ON;
BEGIN TRAN;
IF NOT EXISTS (SELECT 1 FROM dbo.ROL WHERE Cod_Rol='ADMIN') INSERT dbo.ROL VALUES ('ADMIN','Administrador');
IF NOT EXISTS (SELECT 1 FROM dbo.ROL WHERE Cod_Rol='ALUMNO') INSERT dbo.ROL VALUES ('ALUMNO','Estudiante');
IF NOT EXISTS (SELECT 1 FROM dbo.Programa WHERE Cod_Programa='REFUERZO') INSERT dbo.Programa (Cod_Programa,Nomb_Programa,Descripcion) VALUES ('REFUERZO','Reforzamiento de colegio','Apoyo y reforzamiento escolar');
IF NOT EXISTS (SELECT 1 FROM dbo.Programa WHERE Cod_Programa='PREUNIV') INSERT dbo.Programa (Cod_Programa,Nomb_Programa,Descripcion) VALUES ('PREUNIV','Preparación preuniversitaria','Preparación para exámenes de admisión');
IF NOT EXISTS (SELECT 1 FROM dbo.Turno WHERE Cod_Turno='MANANA') INSERT dbo.Turno VALUES ('MANANA','MANANA','07:00','13:00');
IF NOT EXISTS (SELECT 1 FROM dbo.Turno WHERE Cod_Turno='TARDE') INSERT dbo.Turno VALUES ('TARDE','TARDE','15:00','21:00');
IF NOT EXISTS (SELECT 1 FROM dbo.PARENTESCO WHERE Cod_Paren='PADRE') INSERT dbo.PARENTESCO VALUES ('PADRE','Padre');
IF NOT EXISTS (SELECT 1 FROM dbo.PARENTESCO WHERE Cod_Paren='MADRE') INSERT dbo.PARENTESCO VALUES ('MADRE','Madre');
IF NOT EXISTS (SELECT 1 FROM dbo.PARENTESCO WHERE Cod_Paren='TIO') INSERT dbo.PARENTESCO VALUES ('TIO','Tío o tía');
IF NOT EXISTS (SELECT 1 FROM dbo.PARENTESCO WHERE Cod_Paren='HERM') INSERT dbo.PARENTESCO VALUES ('HERM','Hermano o hermana');
IF NOT EXISTS (SELECT 1 FROM dbo.PARENTESCO WHERE Cod_Paren='ABUEL') INSERT dbo.PARENTESCO VALUES ('ABUEL','Abuelo o abuela');
IF NOT EXISTS (SELECT 1 FROM dbo.PARENTESCO WHERE Cod_Paren='TUTOR') INSERT dbo.PARENTESCO VALUES ('TUTOR','Tutor legal');
IF NOT EXISTS (SELECT 1 FROM dbo.PARENTESCO WHERE Cod_Paren='OTRO') INSERT dbo.PARENTESCO VALUES ('OTRO','Otro');
IF NOT EXISTS (SELECT 1 FROM dbo.ESTADO_CICLO WHERE Cod_Estado_Ciclo='PROGRAMADO') INSERT dbo.ESTADO_CICLO VALUES ('PROGRAMADO','Programado');
IF NOT EXISTS (SELECT 1 FROM dbo.ESTADO_CICLO WHERE Cod_Estado_Ciclo='ACTIVO') INSERT dbo.ESTADO_CICLO VALUES ('ACTIVO','Activo');
IF NOT EXISTS (SELECT 1 FROM dbo.ESTADO_CICLO WHERE Cod_Estado_Ciclo='FINALIZADO') INSERT dbo.ESTADO_CICLO VALUES ('FINALIZADO','Finalizado');
IF NOT EXISTS (SELECT 1 FROM dbo.ESTADO_CICLO WHERE Cod_Estado_Ciclo='CANCELADO') INSERT dbo.ESTADO_CICLO VALUES ('CANCELADO','Cancelado');
IF NOT EXISTS (SELECT 1 FROM dbo.ESTADO_MATRICULA WHERE Cod_Estado_Matricula='ACTIVA') INSERT dbo.ESTADO_MATRICULA VALUES ('ACTIVA','Activa');
IF NOT EXISTS (SELECT 1 FROM dbo.ESTADO_MATRICULA WHERE Cod_Estado_Matricula='FINALIZADA') INSERT dbo.ESTADO_MATRICULA VALUES ('FINALIZADA','Finalizada');
IF NOT EXISTS (SELECT 1 FROM dbo.ESTADO_MATRICULA WHERE Cod_Estado_Matricula='RETIRADA') INSERT dbo.ESTADO_MATRICULA VALUES ('RETIRADA','Retirada');
IF NOT EXISTS (SELECT 1 FROM dbo.ESTADO_MATRICULA WHERE Cod_Estado_Matricula='ANULADA') INSERT dbo.ESTADO_MATRICULA VALUES ('ANULADA','Anulada');
IF NOT EXISTS (SELECT 1 FROM dbo.ESTADO_PAGO WHERE Cod_Estado='PENDIENTE') INSERT dbo.ESTADO_PAGO VALUES ('PENDIENTE','Pendiente');
IF NOT EXISTS (SELECT 1 FROM dbo.ESTADO_PAGO WHERE Cod_Estado='PAGADO') INSERT dbo.ESTADO_PAGO VALUES ('PAGADO','Pagado');
IF NOT EXISTS (SELECT 1 FROM dbo.ESTADO_EXAMEN_GRUPO WHERE Cod_Estado_Examen='PROGRAMADO') INSERT dbo.ESTADO_EXAMEN_GRUPO VALUES ('PROGRAMADO','Programado');
IF NOT EXISTS (SELECT 1 FROM dbo.ESTADO_EXAMEN_GRUPO WHERE Cod_Estado_Examen='RENDIDO') INSERT dbo.ESTADO_EXAMEN_GRUPO VALUES ('RENDIDO','Rendido');
IF NOT EXISTS (SELECT 1 FROM dbo.ESTADO_EXAMEN_GRUPO WHERE Cod_Estado_Examen='CANCELADO') INSERT dbo.ESTADO_EXAMEN_GRUPO VALUES ('CANCELADO','Cancelado');
IF NOT EXISTS (SELECT 1 FROM dbo.CONCEPTO_PAGO WHERE Cod_Concepto='MATRICULA_INICIAL') INSERT dbo.CONCEPTO_PAGO VALUES ('MATRICULA_INICIAL','Matrícula inicial (una sola vez)');
IF NOT EXISTS (SELECT 1 FROM dbo.CONCEPTO_PAGO WHERE Cod_Concepto='MATERIALES') INSERT dbo.CONCEPTO_PAGO VALUES ('MATERIALES','Materiales (una sola vez)');
IF NOT EXISTS (SELECT 1 FROM dbo.CONCEPTO_PAGO WHERE Cod_Concepto='MENSUALIDAD') INSERT dbo.CONCEPTO_PAGO VALUES ('MENSUALIDAD','Pensión mensual');
IF NOT EXISTS (SELECT 1 FROM dbo.TIPO_BLOQUE WHERE Cod_Tipo='CLASE') INSERT dbo.TIPO_BLOQUE VALUES ('CLASE','Clase');
IF NOT EXISTS (SELECT 1 FROM dbo.TIPO_BLOQUE WHERE Cod_Tipo='RECREO') INSERT dbo.TIPO_BLOQUE VALUES ('RECREO','Recreo');
COMMIT;
SELECT 'Catálogos inicializados' AS Resultado;

GO
-- Índices nuevos; son repetibles (no duplican los índices ya creados).
IF NOT EXISTS(SELECT 1 FROM sys.indexes WHERE object_id=OBJECT_ID('dbo.Usuario') AND name='UX_Usuario_UnicaCuentaAlumno')
    CREATE UNIQUE INDEX UX_Usuario_UnicaCuentaAlumno ON dbo.Usuario(ALUMNO_DNI_Alu) WHERE ALUMNO_DNI_Alu IS NOT NULL;
IF NOT EXISTS(SELECT 1 FROM sys.indexes WHERE object_id=OBJECT_ID('dbo.Pago') AND name='UX_Pago_ConceptoUnicoAlumno')
    CREATE UNIQUE INDEX UX_Pago_ConceptoUnicoAlumno ON dbo.Pago(ALUMNO_DNI_Alu,CONCEPTO_PAGO_Cod_Concepto) WHERE CONCEPTO_PAGO_Cod_Concepto IN ('MATRICULA_INICIAL','MATERIALES');
IF NOT EXISTS(SELECT 1 FROM sys.indexes WHERE object_id=OBJECT_ID('dbo.Pago') AND name='UX_Pago_MensualidadMatricula')
    CREATE UNIQUE INDEX UX_Pago_MensualidadMatricula ON dbo.Pago(MATRICULA_Cod_Matricula,Nro_Mensualidad) WHERE CONCEPTO_PAGO_Cod_Concepto='MENSUALIDAD';
GO
CREATE OR ALTER TRIGGER TR_Pago_Mes_Valido
ON Pago AFTER INSERT, UPDATE
AS
BEGIN
    SET NOCOUNT ON;
    IF EXISTS (
        SELECT 1
        FROM inserted AS p
        INNER JOIN MATRICULA AS m ON m.Cod_Matricula = p.MATRICULA_Cod_Matricula
        INNER JOIN Grupo AS g ON g.Cod_Grupo = m.Grupo_Cod_Grupo
        INNER JOIN Ciclo AS c ON c.Cod_Ciclo = g.Ciclo_Cod_Ciclo
        WHERE p.CONCEPTO_PAGO_Cod_Concepto = 'MENSUALIDAD'
          AND p.Nro_Mensualidad > c.Nro_Mensualidades
    )
    BEGIN
        THROW 51001, 'Numero de mensualidad fuera del ciclo del alumno.', 1;
    END
END;
GO

-- Horarios validos por turno y sin cruces entre grupo, aula o docente.
-- Se comprueba el solapamiento de ciclos para permitir reutilizar el aula en otros periodos.
CREATE OR ALTER TRIGGER TR_Horario_Sin_Cruces
ON Horario AFTER INSERT, UPDATE
AS
BEGIN
    SET NOCOUNT ON;

    IF EXISTS (
        SELECT 1 FROM inserted AS i
        JOIN Grupo AS g ON g.Cod_Grupo = i.Grupo_Cod_Grupo
        JOIN Turno AS t ON t.Cod_Turno = g.Turno_Cod_Turno
        WHERE i.Activo = 1
          AND (i.Hr_Inicio < t.Hr_Inicio OR i.Hr_Fin > t.Hr_Fin)
    )
        THROW 51002, 'Clase o recreo fuera del turno asignado al grupo.', 1;

    IF EXISTS (
        SELECT 1
        FROM inserted AS i
        JOIN Grupo AS gi ON gi.Cod_Grupo = i.Grupo_Cod_Grupo
        JOIN Ciclo AS ci ON ci.Cod_Ciclo = gi.Ciclo_Cod_Ciclo
        JOIN Horario AS h ON h.Cod_Horario <> i.Cod_Horario
            AND h.Activo = 1
            AND h.Dia_Semana = i.Dia_Semana
            AND i.Hr_Inicio < h.Hr_Fin
            AND h.Hr_Inicio < i.Hr_Fin
        JOIN Grupo AS gh ON gh.Cod_Grupo = h.Grupo_Cod_Grupo
        JOIN Ciclo AS ch ON ch.Cod_Ciclo = gh.Ciclo_Cod_Ciclo
        WHERE i.Activo = 1
          AND ci.Fech_Inicio <= ch.Fech_Fin
          AND ch.Fech_Inicio <= ci.Fech_Fin
          AND (
               i.Grupo_Cod_Grupo = h.Grupo_Cod_Grupo
            OR gi.Aula_Cod_Aula = gh.Aula_Cod_Aula
            OR (i.Docente_Asignatura_Docente_DNI_Doc IS NOT NULL
                AND i.Docente_Asignatura_Docente_DNI_Doc = h.Docente_Asignatura_Docente_DNI_Doc)
          )
    )
        THROW 51003, 'Cruce de horario: grupo, aula o docente ocupado.', 1;
END;
GO

-- La nota debe estar dentro del maximo permitido por el examen.
CREATE OR ALTER TRIGGER TR_Nota_Examen_Puntaje
ON Nota_Examen AFTER INSERT, UPDATE
AS
BEGIN
    SET NOCOUNT ON;
    IF EXISTS (
        SELECT 1 FROM inserted AS n
        JOIN Examen_Grupo AS eg ON eg.Cod_examen_grupo = n.Examen_Grupo_Cod_examen_grupo
        JOIN Examen AS e ON e.Cod_Examen = eg.Examen_Cod_Examen
        WHERE n.Puntaje_total > e.puntaje_maximo
    )
        THROW 51004, 'La nota supera el puntaje maximo del simulacro.', 1;
END;
GO

-- Restringe cupos en matriculas ACTIVAS.
CREATE OR ALTER TRIGGER TR_Matricula_CupoMaximo
ON MATRICULA AFTER INSERT, UPDATE
AS
BEGIN
    SET NOCOUNT ON;
    IF EXISTS (
        SELECT 1
        FROM (SELECT DISTINCT Grupo_Cod_Grupo FROM inserted) AS gr
        JOIN Grupo AS g ON g.Cod_Grupo = gr.Grupo_Cod_Grupo
        CROSS APPLY (
            SELECT COUNT_BIG(*) AS Cantidad
            FROM MATRICULA AS m
            WHERE m.Grupo_Cod_Grupo = g.Cod_Grupo
              AND m.ESTADO_MATRICULA_Cod_Estado_Matricula = 'ACTIVA'
        ) AS ocupacion
        WHERE ocupacion.Cantidad > g.Cupo_Max
    )
        THROW 51005, 'La cantidad de matriculas activas supera el cupo del grupo.', 1;
END;
GO


-- Comprobación final de instalación/actualización
SELECT DB_NAME() AS BaseActual,
  (SELECT COUNT(*) FROM sys.tables WHERE schema_id=SCHEMA_ID('dbo')) AS Tablas,
  (SELECT COUNT(*) FROM sys.foreign_keys WHERE schema_id=SCHEMA_ID('dbo')) AS ClavesForaneas,
  (SELECT COUNT(*) FROM sys.triggers WHERE name IN ('TR_Pago_Mes_Valido','TR_Horario_Sin_Cruces','TR_Nota_Examen_Puntaje','TR_Matricula_CupoMaximo')) AS TriggersNuevos,
  (SELECT COUNT(*) FROM sys.indexes WHERE name IN ('UX_Usuario_UnicaCuentaAlumno','UX_Pago_ConceptoUnicoAlumno','UX_Pago_MensualidadMatricula')) AS IndicesNuevos;
GO
