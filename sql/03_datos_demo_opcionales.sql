-- OPCIONAL: datos ficticios para pruebas. Ejecutar DESPUÉS de 02_catalogos_iniciales.sql.
-- Son ejemplos, NO datos oficiales de la academia. No incluye alumnos ni pagos.
SET XACT_ABORT ON;
BEGIN TRAN;
IF NOT EXISTS(SELECT 1 FROM dbo.Aula WHERE Cod_Aula='A001') INSERT dbo.Aula (Cod_Aula,Nomb_Aula,Capacidad) VALUES ('A001','Aula principal',35);
IF NOT EXISTS(SELECT 1 FROM dbo.CARRERA WHERE Cod_Carrera='ING-SIS') INSERT dbo.CARRERA VALUES ('ING-SIS','Ingeniería de Sistemas');
IF NOT EXISTS(SELECT 1 FROM dbo.CARRERA WHERE Cod_Carrera='MED') INSERT dbo.CARRERA VALUES ('MED','Medicina Humana');
IF NOT EXISTS(SELECT 1 FROM dbo.CARRERA WHERE Cod_Carrera='DERECHO') INSERT dbo.CARRERA VALUES ('DERECHO','Derecho');
IF NOT EXISTS(SELECT 1 FROM dbo.CARRERA WHERE Cod_Carrera='ENFER') INSERT dbo.CARRERA VALUES ('ENFER','Enfermería');
IF NOT EXISTS(SELECT 1 FROM dbo.CARRERA WHERE Cod_Carrera='OTRA') INSERT dbo.CARRERA VALUES ('OTRA','Otra carrera');
IF NOT EXISTS(SELECT 1 FROM dbo.CURSOS WHERE Cod_Curso='MAT') INSERT dbo.CURSOS (Cod_Curso,Nomb_Curso) VALUES ('MAT','Matemática');
IF NOT EXISTS(SELECT 1 FROM dbo.CURSOS WHERE Cod_Curso='FIS') INSERT dbo.CURSOS (Cod_Curso,Nomb_Curso) VALUES ('FIS','Física');
IF NOT EXISTS(SELECT 1 FROM dbo.CURSOS WHERE Cod_Curso='QUI') INSERT dbo.CURSOS (Cod_Curso,Nomb_Curso) VALUES ('QUI','Química');
IF NOT EXISTS(SELECT 1 FROM dbo.CURSOS WHERE Cod_Curso='LEN') INSERT dbo.CURSOS (Cod_Curso,Nomb_Curso) VALUES ('LEN','Lenguaje');
IF NOT EXISTS(SELECT 1 FROM dbo.CURSOS WHERE Cod_Curso='BIO') INSERT dbo.CURSOS (Cod_Curso,Nomb_Curso) VALUES ('BIO','Biología');
IF NOT EXISTS(SELECT 1 FROM dbo.CURSOS WHERE Cod_Curso='RAZ-MAT') INSERT dbo.CURSOS (Cod_Curso,Nomb_Curso) VALUES ('RAZ-MAT','Razonamiento matemático');
IF NOT EXISTS(SELECT 1 FROM dbo.CURSOS WHERE Cod_Curso='RAZ-VER') INSERT dbo.CURSOS (Cod_Curso,Nomb_Curso) VALUES ('RAZ-VER','Razonamiento verbal');
COMMIT;
SELECT 'Datos de demostración insertados' AS Resultado;
