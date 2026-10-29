-- V5: normaliza CR en AMBOS lados de la comparacion, porque el editor de Azure puede incorporar CRLF en literales multilínea.
-- FRACTALES ACADEMY V4.5 - DIAGNOSTICO PREVIO A RENOMBRAR (SOLO LECTURA)
-- Comprueba las 19 definiciones esperadas, quitando CR de CRLF y los comentarios
-- de cabecera que solo existian en el script esperado. NO altera objetos ni registros.
-- Si alguna fila sale DISTINTO o FALTA, no ejecutar 03; compartir resultados.
SET NOCOUNT ON;
DECLARE @ESPERADOS TABLE (NOMBRE sysname PRIMARY KEY, DEFINICION nvarchar(max));
INSERT INTO @ESPERADOS (NOMBRE, DEFINICION) VALUES (N'TR_Horario_Sin_Cruces', N'CREATE   TRIGGER dbo.TR_Horario_Sin_Cruces ON dbo.Horario AFTER INSERT,UPDATE AS
  BEGIN SET NOCOUNT ON;
   IF EXISTS(SELECT 1 FROM inserted i JOIN dbo.Grupo g ON g.Cod_Grupo=i.Grupo_Cod_Grupo JOIN dbo.Turno t ON t.Cod_Turno=g.Turno_Cod_Turno
    WHERE (i.Hr_Inicio<t.Hr_Inicio OR i.Hr_Fin>t.Hr_Fin) AND
    (i.Excepcion_Turno=0 OR NOT EXISTS(SELECT 1 FROM dbo.Usuario u WHERE u.Cod_Usuario=i.Autorizado_Por AND u.ROL_Cod_Rol=''ADMIN'' AND u.Activo=1)))
    THROW 54430,''Bloque fuera del turno sin excepcion administradora autorizada.'',1;
   IF EXISTS(SELECT 1 FROM inserted i JOIN dbo.Grupo gi ON gi.Cod_Grupo=i.Grupo_Cod_Grupo JOIN dbo.Ciclo ci ON ci.Cod_Ciclo=gi.Ciclo_Cod_Ciclo
    JOIN dbo.Horario h WITH(UPDLOCK,HOLDLOCK) ON h.Cod_Horario<>i.Cod_Horario AND h.Dia_Semana=i.Dia_Semana AND i.Hr_Inicio<h.Hr_Fin AND h.Hr_Inicio<i.Hr_Fin
    JOIN dbo.Grupo gh ON gh.Cod_Grupo=h.Grupo_Cod_Grupo JOIN dbo.Ciclo ch ON ch.Cod_Ciclo=gh.Ciclo_Cod_Ciclo
    WHERE (i.Grupo_Cod_Grupo=h.Grupo_Cod_Grupo OR (i.Activo=1 AND h.Activo=1 AND gi.Activo=1 AND gh.Activo=1
      AND ci.Fech_Inicio<=ch.Fech_Fin AND ch.Fech_Inicio<=ci.Fech_Fin AND
      (gi.Aula_Cod_Aula=gh.Aula_Cod_Aula OR i.Docente_Asignatura_Docente_DNI_Doc=h.Docente_Asignatura_Docente_DNI_Doc))))
    THROW 54431,''Cruce de horario: conjunto academico, aula o docente ocupado.'',1;
  END;');
INSERT INTO @ESPERADOS (NOMBRE, DEFINICION) VALUES (N'TR_Matricula_CupoMaximo', N'CREATE   TRIGGER TR_Matricula_CupoMaximo
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
              AND m.ESTADO_MATRICULA_Cod_Estado_Matricula = ''ACTIVA''
        ) AS ocupacion
        WHERE ocupacion.Cantidad > g.Cupo_Max
    )
        THROW 51005, ''La cantidad de matriculas activas supera el cupo del grupo.'', 1;
END;');
INSERT INTO @ESPERADOS (NOMBRE, DEFINICION) VALUES (N'TR_Nota_Examen_Puntaje', N'CREATE   TRIGGER TR_Nota_Examen_Puntaje
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
        THROW 51004, ''La nota supera el puntaje maximo del simulacro.'', 1;
END;');
INSERT INTO @ESPERADOS (NOMBRE, DEFINICION) VALUES (N'TR_Pago_Mes_Valido', N'CREATE   TRIGGER TR_Pago_Mes_Valido
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
        WHERE p.CONCEPTO_PAGO_Cod_Concepto = ''MENSUALIDAD''
          AND p.Nro_Mensualidad > c.Nro_Mensualidades
    )
    BEGIN
        THROW 51001, ''Numero de mensualidad fuera del ciclo del alumno.'', 1;
    END
END;');
INSERT INTO @ESPERADOS (NOMBRE, DEFINICION) VALUES (N'TR_V4_Auditoria_Inmutable', N'CREATE   TRIGGER dbo.TR_V4_Auditoria_Inmutable ON dbo.Auditoria_V4 INSTEAD OF UPDATE,DELETE AS
BEGIN SET NOCOUNT ON; THROW 54037,''El historial de auditoria no se puede modificar ni eliminar.'',1; END;');
INSERT INTO @ESPERADOS (NOMBRE, DEFINICION) VALUES (N'TR_V4_Ciclo_Historial', N'CREATE   TRIGGER dbo.TR_V4_Ciclo_Historial ON dbo.Ciclo AFTER UPDATE AS
BEGIN SET NOCOUNT ON;
 IF EXISTS (SELECT 1 FROM inserted i JOIN deleted d ON d.Cod_Ciclo=i.Cod_Ciclo WHERE (i.Programa_Cod_Programa<>d.Programa_Cod_Programa OR i.Modalidad<>d.Modalidad OR i.Fech_Inicio<>d.Fech_Inicio OR i.Fech_Fin<>d.Fech_Fin OR i.Nro_Mensualidades<>d.Nro_Mensualidades)
 AND EXISTS (SELECT 1 FROM dbo.Grupo g WHERE g.Ciclo_Cod_Ciclo=i.Cod_Ciclo AND (EXISTS (SELECT 1 FROM dbo.MATRICULA m WHERE m.Grupo_Cod_Grupo=g.Cod_Grupo) OR EXISTS (SELECT 1 FROM dbo.Horario h WHERE h.Grupo_Cod_Grupo=g.Cod_Grupo))))
 THROW 54055,''No se puede redefinir una edicion con matriculas u horarios.'',1;
END;');
INSERT INTO @ESPERADOS (NOMBRE, DEFINICION) VALUES (N'TR_V4_Examen_Maximo', N'CREATE   TRIGGER dbo.TR_V4_Examen_Maximo ON dbo.Examen AFTER UPDATE AS
BEGIN SET NOCOUNT ON;
 IF EXISTS (SELECT 1 FROM inserted e JOIN dbo.Examen_Grupo eg ON eg.Examen_Cod_Examen=e.Cod_Examen JOIN dbo.Nota_Examen n ON n.Examen_Grupo_Cod_examen_grupo=eg.Cod_examen_grupo WHERE n.Puntaje_total>e.puntaje_maximo)
 THROW 54044,''El nuevo maximo es menor que un puntaje registrado.'',1;
END;');
INSERT INTO @ESPERADOS (NOMBRE, DEFINICION) VALUES (N'TR_V4_Grupo_Historial', N'CREATE   TRIGGER dbo.TR_V4_Grupo_Historial ON dbo.Grupo AFTER UPDATE AS
BEGIN SET NOCOUNT ON;
 IF EXISTS (SELECT 1 FROM inserted i JOIN deleted d ON d.Cod_Grupo=i.Cod_Grupo WHERE i.Ciclo_Cod_Ciclo<>d.Ciclo_Cod_Ciclo AND EXISTS (SELECT 1 FROM dbo.MATRICULA m WHERE m.Grupo_Cod_Grupo=i.Cod_Grupo))
 THROW 54052,''No se puede cambiar el ciclo de un grupo con matriculas.'',1;
 IF EXISTS (SELECT 1 FROM inserted i JOIN deleted d ON d.Cod_Grupo=i.Cod_Grupo WHERE (i.Aula_Cod_Aula<>d.Aula_Cod_Aula OR i.Turno_Cod_Turno<>d.Turno_Cod_Turno OR i.Ciclo_Cod_Ciclo<>d.Ciclo_Cod_Ciclo) AND EXISTS (SELECT 1 FROM dbo.Horario h WHERE h.Grupo_Cod_Grupo=i.Cod_Grupo))
 THROW 54053,''Reorganice los bloques antes de cambiar aula, turno o ciclo.'',1;
 IF EXISTS (SELECT 1 FROM inserted i JOIN dbo.Aula a ON a.Cod_Aula=i.Aula_Cod_Aula WHERE i.Cupo_Max>a.Capacidad OR i.Cupo_Max<(SELECT COUNT_BIG(*) FROM dbo.MATRICULA m WHERE m.Grupo_Cod_Grupo=i.Cod_Grupo AND m.ESTADO_MATRICULA_Cod_Estado_Matricula=''ACTIVA''))
 THROW 54054,''Cupo incompatible con aula o matriculas activas.'',1;
END;');
INSERT INTO @ESPERADOS (NOMBRE, DEFINICION) VALUES (N'TR_V4_Matricula_Historial', N'CREATE   TRIGGER dbo.TR_V4_Matricula_Historial ON dbo.MATRICULA AFTER INSERT,UPDATE AS
BEGIN
 SET NOCOUNT ON;
 IF EXISTS (SELECT 1 FROM inserted i JOIN deleted d ON d.Cod_Matricula=i.Cod_Matricula WHERE i.ALUMNO_DNI_Alu<>d.ALUMNO_DNI_Alu OR i.Grupo_Cod_Grupo<>d.Grupo_Cod_Grupo OR i.Fech_Matricula<>d.Fech_Matricula)
 THROW 54022,''No se permite reasignar alumno, grupo o fecha de una matricula historica.'',1;
 IF EXISTS (SELECT m.ALUMNO_DNI_Alu,g.Ciclo_Cod_Ciclo FROM dbo.MATRICULA m WITH (UPDLOCK,HOLDLOCK) JOIN dbo.Grupo g ON g.Cod_Grupo=m.Grupo_Cod_Grupo
 JOIN (SELECT DISTINCT ALUMNO_DNI_Alu FROM inserted) i ON i.ALUMNO_DNI_Alu=m.ALUMNO_DNI_Alu GROUP BY m.ALUMNO_DNI_Alu,g.Ciclo_Cod_Ciclo HAVING COUNT_BIG(*)>1)
 THROW 54023,''El alumno ya tiene matricula en este ciclo.'',1;
END;');
INSERT INTO @ESPERADOS (NOMBRE, DEFINICION) VALUES (N'TR_V4_Nota_Unica', N'CREATE   TRIGGER dbo.TR_V4_Nota_Unica ON dbo.Nota_Examen AFTER INSERT,UPDATE AS
BEGIN
 SET NOCOUNT ON;
 IF EXISTS (SELECT 1 FROM inserted i JOIN deleted d ON d.Cod_Nota=i.Cod_Nota WHERE i.MATRICULA_Cod_Matricula<>d.MATRICULA_Cod_Matricula OR i.Examen_Grupo_Cod_examen_grupo<>d.Examen_Grupo_Cod_examen_grupo OR i.Grupo_Cod_Grupo<>d.Grupo_Cod_Grupo OR i.Fech_registro<>d.Fech_registro)
 THROW 54042,''La correccion de puntaje no puede reasignar su historial.'',1;
 IF EXISTS (SELECT m.ALUMNO_DNI_Alu,eg.Examen_Cod_Examen FROM dbo.Nota_Examen n WITH (UPDLOCK,HOLDLOCK) JOIN dbo.MATRICULA m ON m.Cod_Matricula=n.MATRICULA_Cod_Matricula
 JOIN dbo.Examen_Grupo eg ON eg.Cod_examen_grupo=n.Examen_Grupo_Cod_examen_grupo
 WHERE eg.Examen_Cod_Examen IN (SELECT e.Examen_Cod_Examen FROM inserted i JOIN dbo.Examen_Grupo e ON e.Cod_examen_grupo=i.Examen_Grupo_Cod_examen_grupo)
 GROUP BY m.ALUMNO_DNI_Alu,eg.Examen_Cod_Examen HAVING COUNT_BIG(*)>1)
 THROW 54043,''Solo se permite un puntaje total por alumno y simulacro.'',1;
END;');
INSERT INTO @ESPERADOS (NOMBRE, DEFINICION) VALUES (N'TR_V4_Pago_Obligacion', N'CREATE   TRIGGER dbo.TR_V4_Pago_Obligacion ON dbo.Pago AFTER INSERT,UPDATE AS
BEGIN
 SET NOCOUNT ON;
 IF EXISTS (SELECT 1 FROM inserted i JOIN deleted d ON d.Cod_Pago=i.Cod_Pago
 WHERE i.ALUMNO_DNI_Alu<>d.ALUMNO_DNI_Alu OR i.CONCEPTO_PAGO_Cod_Concepto<>d.CONCEPTO_PAGO_Cod_Concepto OR i.Monto<>d.Monto
 OR ISNULL(i.MATRICULA_Cod_Matricula,'''')<>ISNULL(d.MATRICULA_Cod_Matricula,'''') OR ISNULL(i.Nro_Mensualidad,0)<>ISNULL(d.Nro_Mensualidad,0)
 OR ISNULL(i.Fech_Vencimiento,CONVERT(date,''00010101''))<>ISNULL(d.Fech_Vencimiento,CONVERT(date,''00010101'')))
 THROW 54034,''Las obligaciones conservan alumno, concepto, matricula, cuota, importe y vencimiento originales.'',1;
 IF EXISTS (SELECT 1 FROM inserted i LEFT JOIN deleted d ON d.Cod_Pago=i.Cod_Pago
 WHERE d.Cod_Pago IS NULL AND i.CONCEPTO_PAGO_Cod_Concepto IN (''MATRICULA_INICIAL'',''MATERIALES'') AND
 (SELECT COUNT_BIG(*) FROM dbo.Pago p WITH (UPDLOCK,HOLDLOCK) WHERE p.ALUMNO_DNI_Alu=i.ALUMNO_DNI_Alu AND p.CONCEPTO_PAGO_Cod_Concepto IN (''MATRICULA_INICIAL'',''MATERIALES''))>1)
 THROW 54035,''El alumno ya tiene un cargo inicial; no duplicar matricula y materiales.'',1;
 IF EXISTS (SELECT 1 FROM inserted i LEFT JOIN deleted d ON d.Cod_Pago=i.Cod_Pago WHERE d.Cod_Pago IS NULL AND i.CONCEPTO_PAGO_Cod_Concepto=''MATRICULA_INICIAL'' AND i.Monto<>50)
 THROW 54036,''El cargo de inscripcion inicial nuevo debe ser S/ 50.'',1;
END;');
INSERT INTO @ESPERADOS (NOMBRE, DEFINICION) VALUES (N'TR_V41_Alumno_Contacto', N'CREATE   TRIGGER dbo.TR_V41_Alumno_Contacto ON dbo.ALUMNO AFTER UPDATE AS
BEGIN SET NOCOUNT ON;
 UPDATE c SET Activo=0 FROM dbo.Contacto_Verificado_V41 c JOIN inserted i ON i.DNI_Alu=c.ALUMNO_DNI_Alu
 WHERE c.Activo=1 AND ((c.Tipo=''EMAIL'' AND (i.Correo_Alu IS NULL OR c.Destino<>i.Correo_Alu)) OR (c.Tipo=''SMS'' AND (i.Cel_Alu IS NULL OR c.Destino<>i.Cel_Alu)));
END;');
INSERT INTO @ESPERADOS (NOMBRE, DEFINICION) VALUES (N'TR_V43_MarcaPrueba', N'CREATE   TRIGGER dbo.TR_V43_MarcaPrueba ON dbo.ALUMNO AFTER UPDATE AS
  BEGIN SET NOCOUNT ON;
   IF EXISTS(SELECT 1 FROM inserted i JOIN deleted d ON d.DNI_Alu=i.DNI_Alu WHERE i.Es_Prueba<>d.Es_Prueba)
    THROW 54305,''La identificacion de prueba solo se establece al crear el estudiante.'',1;
  END;');
INSERT INTO @ESPERADOS (NOMBRE, DEFINICION) VALUES (N'TR_V43_Tarifa_Ciclo', N'CREATE   TRIGGER dbo.TR_V43_Tarifa_Ciclo ON dbo.Ciclo AFTER INSERT,UPDATE AS
  BEGIN SET NOCOUNT ON;
   IF EXISTS(SELECT 1 FROM inserted i LEFT JOIN deleted d ON d.Cod_Ciclo=i.Cod_Ciclo WHERE i.Precio_Mensual<>250 AND (d.Cod_Ciclo IS NULL OR d.Precio_Mensual<>i.Precio_Mensual))
    THROW 54309,''La tarifa nueva debe ser S/250 por mensualidad. Las obligaciones historicas se conservan.'',1;
  END;');
INSERT INTO @ESPERADOS (NOMBRE, DEFINICION) VALUES (N'TR_V43_Usuario_Correo', N'CREATE   TRIGGER dbo.TR_V43_Usuario_Correo ON dbo.Usuario AFTER UPDATE AS
  BEGIN SET NOCOUNT ON;
   IF EXISTS(SELECT 1 FROM inserted i JOIN deleted d ON d.Cod_Usuario=i.Cod_Usuario
     WHERE (ISNULL(i.Correo_Recuperacion,'''')<>ISNULL(d.Correo_Recuperacion,'''') OR d.Correo_Verificado=0) AND i.Correo_Verificado=1
     AND NOT EXISTS(SELECT 1 FROM dbo.Cuenta_Codigo_V41 c WHERE c.Usuario_Cod_Usuario=i.Cod_Usuario AND c.Proposito=''VERIFICAR_CONTACTO'' AND c.Canal=''EMAIL'' AND c.Destino=i.Correo_Recuperacion AND c.Consumido=1 AND c.Expira>SYSUTCDATETIME()))
    THROW 54309,''El correo de recuperacion debe verificarse con un codigo vigente.'',1;
  END;');
INSERT INTO @ESPERADOS (NOMBRE, DEFINICION) VALUES (N'TR_V44_Grupo_Publicacion', N'CREATE   TRIGGER dbo.TR_V44_Grupo_Publicacion ON dbo.Grupo AFTER UPDATE AS
  BEGIN SET NOCOUNT ON;
   UPDATE h SET Activo=CASE WHEN i.Estado_Horario=''PUBLICADO'' THEN 1 ELSE 0 END
   FROM dbo.Horario h JOIN inserted i ON i.Cod_Grupo=h.Grupo_Cod_Grupo JOIN deleted d ON d.Cod_Grupo=i.Cod_Grupo
   WHERE i.Activo<>d.Activo OR i.Estado_Horario<>d.Estado_Horario;
  END;');
INSERT INTO @ESPERADOS (NOMBRE, DEFINICION) VALUES (N'TR_V44_Matricula_Publicada', N'CREATE   TRIGGER dbo.TR_V44_Matricula_Publicada ON dbo.MATRICULA AFTER INSERT,UPDATE AS
  BEGIN SET NOCOUNT ON;
   IF EXISTS(SELECT 1 FROM inserted i LEFT JOIN deleted d ON d.Cod_Matricula=i.Cod_Matricula JOIN dbo.Grupo g ON g.Cod_Grupo=i.Grupo_Cod_Grupo
   WHERE i.ESTADO_MATRICULA_Cod_Estado_Matricula=''ACTIVA'' AND (d.Cod_Matricula IS NULL OR d.ESTADO_MATRICULA_Cod_Estado_Matricula<>''ACTIVA'') AND (g.Estado_Horario<>''PUBLICADO'' OR g.Activo=0))
    THROW 54432,''El horario debe estar activo y publicado para matricular o restaurar la matricula.'',1;
  END;');
INSERT INTO @ESPERADOS (NOMBRE, DEFINICION) VALUES (N'TR_V44_Nota_Eliminar', N'CREATE   TRIGGER dbo.TR_V44_Nota_Eliminar ON dbo.Nota_Examen AFTER DELETE AS
  BEGIN SET NOCOUNT ON;
   IF EXISTS(SELECT 1 FROM deleted n JOIN dbo.MATRICULA m ON m.Cod_Matricula=n.MATRICULA_Cod_Matricula JOIN dbo.ALUMNO a ON a.DNI_Alu=m.ALUMNO_DNI_Alu WHERE a.Es_Prueba=0)
    THROW 54433,''Las notas de personas reales se conservan; utiliza correccion o anulacion auditada.'',1;
  END;');
INSERT INTO @ESPERADOS (NOMBRE, DEFINICION) VALUES (N'TR_V44_Pago_Eliminar', N'CREATE   TRIGGER dbo.TR_V44_Pago_Eliminar ON dbo.Pago AFTER DELETE AS
  BEGIN SET NOCOUNT ON;
   IF EXISTS(SELECT 1 FROM deleted d WHERE d.ESTADO_PAGO_Cod_Estado<>''PENDIENTE'' OR d.Fech_Pago IS NOT NULL OR d.Medio_Pago IS NOT NULL OR d.Usuario_Cod_Usuario IS NOT NULL
    OR EXISTS(SELECT 1 FROM dbo.Auditoria_V4 a WHERE a.Entidad=''Pago'' AND a.Codigo=d.Cod_Pago AND a.Accion IN(''CONFIRMAR_PAGO'',''ANULAR_CONFIRMACION'')))
    THROW 54434,''Se conserva todo cobro realizado, incluso si fue revertido.'',1;
  END;');
SELECT e.NOMBRE AS TRIGGER_SQL,
       OBJECT_NAME(t.parent_id) AS TABLA_ASOCIADA,
       CASE
         WHEN t.object_id IS NULL THEN 'FALTA'
         WHEN t.is_disabled = 1 THEN 'DESACTIVADO'
         WHEN m.definition IS NULL THEN 'DEFINICION_NO_VISIBLE'
         WHEN REPLACE(m.definition, NCHAR(13), N'') COLLATE Latin1_General_100_BIN2 = REPLACE(e.DEFINICION, NCHAR(13), N'') COLLATE Latin1_General_100_BIN2 THEN 'COINCIDE'
         ELSE 'DISTINTO'
       END AS DIAGNOSTICO,
       LEN(m.definition) AS LONGITUD_AZURE,
       LEN(e.DEFINICION) AS LONGITUD_ESPERADA
FROM @ESPERADOS e
LEFT JOIN sys.triggers t ON t.object_id=OBJECT_ID(N'dbo.' + e.NOMBRE, N'TR')
LEFT JOIN sys.sql_modules m ON m.object_id=t.object_id
ORDER BY DIAGNOSTICO, e.NOMBRE;
