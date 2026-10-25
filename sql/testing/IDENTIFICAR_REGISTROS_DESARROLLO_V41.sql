-- SOLO LECTURA. Los patrones siguientes son pistas, NO prueba de que un registro sea ficticio.
-- Revisar cada identidad con el administrador. No autoriza borrado ni limpieza masiva.
SET NOCOUNT ON;
SELECT DB_NAME() AS BaseSeleccionada,CONVERT(nvarchar(128),SERVERPROPERTY('ServerName')) AS Servidor;
SELECT 'CANDIDATO_NO_CONFIRMADO' AS Revision,a.DNI_Alu,a.Nomb_Alu,
 (SELECT COUNT_BIG(*) FROM dbo.MATRICULA m WHERE m.ALUMNO_DNI_Alu=a.DNI_Alu) AS Matriculas,
 (SELECT COUNT_BIG(*) FROM dbo.Pago p WHERE p.ALUMNO_DNI_Alu=a.DNI_Alu) AS Obligaciones,
 (SELECT COUNT_BIG(*) FROM dbo.Usuario u WHERE u.ALUMNO_DNI_Alu=a.DNI_Alu) AS Cuentas
FROM dbo.ALUMNO a
WHERE a.Nomb_Alu LIKE '%Ficticio%' OR a.Nomb_Alu LIKE '%Prueba%'
ORDER BY a.DNI_Alu;
SELECT 'CANDIDATO_NO_CONFIRMADO' AS Revision,Cod_Curso,Nomb_Curso FROM dbo.CURSOS WHERE Cod_Curso LIKE 'V4-%' OR Cod_Curso LIKE 'V41-%';
SELECT 'CANDIDATO_NO_CONFIRMADO' AS Revision,Cod_Carrera,Nomb_Carrera FROM dbo.CARRERA WHERE Cod_Carrera LIKE 'V4-%' OR Cod_Carrera LIKE 'V41-%';
SELECT 'CANDIDATO_NO_CONFIRMADO' AS Revision,Cod_Aula,Nomb_Aula FROM dbo.Aula WHERE Cod_Aula LIKE 'V4-%' OR Cod_Aula LIKE 'V41-%';
-- Procedimiento: consultar GUIA_MIGRACION_AZURE_V4_1.md, sección de registros de desarrollo.
-- Los catálogos solo pueden eliminarse uno por uno mediante Acciones, sin dependencias y con confirmación.
-- Los alumnos y sus matrículas/pagos/notas conservan historia mediante baja o anulación; nunca se borra su grafo.
