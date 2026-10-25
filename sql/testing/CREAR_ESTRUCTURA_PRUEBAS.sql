-- SOLO PRUEBAS. La base vacía debe existir y estar seleccionada previamente.
-- No abre conexiones. No crea bases. No usar los antiguos scripts de base nueva en producción.
SET NOCOUNT ON; SET XACT_ABORT ON;
SET ANSI_NULLS ON; SET QUOTED_IDENTIFIER ON; SET ANSI_PADDING ON; SET ANSI_WARNINGS ON;
SET ARITHABORT ON; SET CONCAT_NULL_YIELDS_NULL ON; SET NUMERIC_ROUNDABORT OFF;
IF DB_NAME() NOT LIKE N'FractalesAcademy[_]Pruebas[_]V4%' OR DB_NAME()=N'FractalesAcademy'
 THROW 54900,'Solo se admite una base llamada FractalesAcademy_Pruebas_V4... previamente creada y seleccionada.',1;
IF EXISTS (SELECT 1 FROM sys.tables WHERE is_ms_shipped=0) THROW 54901,'La base de pruebas debe estar vacia.',1;
BEGIN TRY
 BEGIN TRAN;
 EXEC sys.sp_executesql N'-- 1) ESQUEMA CON PK, UNIQUE, CHECK, FK.
-- tables
-- Table: ALUMNO
CREATE TABLE ALUMNO (
    DNI_Alu varchar(8)  NOT NULL,
    Nomb_Alu varchar(120)  NOT NULL,
    Correo_Alu varchar(150)  NULL,
    Fech_Nac date  NULL,
    Cel_Alu varchar(15)  NULL,
    Dir_Alu varchar(200)  NULL,
    Nomb_Apoderado varchar(120)  NOT NULL,
    DNI_Apoderado varchar(8)  NULL,
    Cel_Apoderado varchar(15)  NULL,
    Correo_Apoderado varchar(150)  NULL,
    PARENTESCO_Cod_Paren varchar(5)  NOT NULL,
    CARRERA_Cod_Carrera varchar(10)  NOT NULL,
    CONSTRAINT CK_ALUMNO_DNI CHECK (( DNI_Alu LIKE ''[0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9]'' )),
    CONSTRAINT CK_ALUMNO_DNI_Apoderado CHECK (( DNI_Apoderado IS NULL OR DNI_Apoderado LIKE ''[0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9]'' )),
    CONSTRAINT PK_ALUMNO PRIMARY KEY  (DNI_Alu)
);

-- Table: Aula
CREATE TABLE Aula (
    Cod_Aula varchar(10)  NOT NULL,
    Nomb_Aula varchar(60)  NOT NULL,
    Capacidad smallint  NOT NULL,
    Activa bit  NOT NULL CONSTRAINT DF_Aula_Activa DEFAULT (1),
    CONSTRAINT UQ_Aula_Nombre UNIQUE (Nomb_Aula),
    CONSTRAINT CK_Aula_Capacidad CHECK (( Capacidad > 0 )),
    CONSTRAINT PK_Aula PRIMARY KEY  (Cod_Aula)
);

-- Table: CARRERA
CREATE TABLE CARRERA (
    Cod_Carrera varchar(10)  NOT NULL,
    Nomb_Carrera varchar(120)  NOT NULL,
    CONSTRAINT UQ_CARRERA_Nombre UNIQUE (Nomb_Carrera),
    CONSTRAINT PK_CARRERA PRIMARY KEY  (Cod_Carrera)
);

-- Table: CONCEPTO_PAGO
CREATE TABLE CONCEPTO_PAGO (
    Cod_Concepto varchar(20)  NOT NULL,
    Nomb_Concepto varchar(60)  NOT NULL,
    CONSTRAINT UQ_CONCEPTO_PAGO_Nombre UNIQUE (Nomb_Concepto),
    CONSTRAINT CK_CONCEPTO_PAGO_Codigos CHECK (Cod_Concepto IN (''MATRICULA_INICIAL'', ''MATERIALES'', ''MENSUALIDAD'')),
    CONSTRAINT PK_CONCEPTO_PAGO PRIMARY KEY  (Cod_Concepto)
);

-- Table: CURSOS
CREATE TABLE CURSOS (
    Cod_Curso varchar(10)  NOT NULL,
    Nomb_Curso varchar(100)  NOT NULL,
    Activa bit  NOT NULL CONSTRAINT DF_Cursos_Activa DEFAULT (1),
    CONSTRAINT UQ_CURSOS_Nombre UNIQUE (Nomb_Curso),
    CONSTRAINT PK_CURSOS PRIMARY KEY  (Cod_Curso)
);

-- Table: Ciclo
CREATE TABLE Ciclo (
    Cod_Ciclo varchar(20)  NOT NULL,
    Programa_Cod_Programa varchar(20)  NOT NULL,
    Nomb_Ciclo varchar(100)  NOT NULL,
    Modalidad varchar(12)  NOT NULL,
    Fech_Inicio date  NOT NULL,
    Fech_Fin date  NOT NULL,
    Nro_Mensualidades tinyint  NOT NULL,
    Precio_Mensual decimal(10,2)  NOT NULL CONSTRAINT DF_Ciclo_Precio DEFAULT (250.00),
    ESTADO_CICLO_Cod_Estado varchar(15)  NOT NULL,
    CONSTRAINT UQ_Ciclo_Edicion UNIQUE (Programa_Cod_Programa, Modalidad, Fech_Inicio),
    CONSTRAINT CK_Ciclo_Modalidad CHECK (( ( Modalidad = ''REGULAR'' AND Nro_Mensualidades = 4 ) OR ( Modalidad = ''ACELERADO'' AND Nro_Mensualidades = 2 ) )),
    CONSTRAINT CK_Ciclo_Fechas CHECK (( Fech_Fin > Fech_Inicio )),
    CONSTRAINT CK_Ciclo_Precio CHECK (( Precio_Mensual > 0 )),
    CONSTRAINT PK_Ciclo PRIMARY KEY  (Cod_Ciclo)
);

-- Table: Docente
CREATE TABLE Docente (
    DNI_Doc varchar(8)  NOT NULL,
    Nom_Doc varchar(120)  NOT NULL,
    Cel_Doc varchar(15)  NOT NULL,
    Especialidad varchar(120)  NULL,
    Activo bit  NOT NULL CONSTRAINT DF_Docente_Activo DEFAULT (1),
    CONSTRAINT CK_Docente_DNI CHECK (( DNI_Doc LIKE ''[0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9]'' )),
    CONSTRAINT PK_Docente PRIMARY KEY  (DNI_Doc)
);

-- Table: Docente_Asignatura
CREATE TABLE Docente_Asignatura (
    CURSOS_Cod_Curso varchar(10)  NOT NULL,
    Docente_DNI_Doc varchar(8)  NOT NULL,
    CONSTRAINT PK_Docente_Asignatura PRIMARY KEY (CURSOS_Cod_Curso, Docente_DNI_Doc)
);

-- Table: ESTADO_CICLO
CREATE TABLE ESTADO_CICLO (
    Cod_Estado_Ciclo varchar(15)  NOT NULL,
    Nomb_Estado_Ciclo varchar(60)  NOT NULL,
    CONSTRAINT UQ_ESTADO_CICLO_Nombre UNIQUE (Nomb_Estado_Ciclo),
    CONSTRAINT CK_ESTADO_CICLO_Codigos CHECK (Cod_Estado_Ciclo IN (''PROGRAMADO'', ''ACTIVO'', ''FINALIZADO'', ''CANCELADO'')),
    CONSTRAINT PK_ESTADO_CICLO PRIMARY KEY  (Cod_Estado_Ciclo)
);

-- Table: ESTADO_EXAMEN_GRUPO
CREATE TABLE ESTADO_EXAMEN_GRUPO (
    Cod_Estado_Examen varchar(15)  NOT NULL,
    Nomb_Estado_Examen varchar(60)  NOT NULL,
    CONSTRAINT UQ_ESTADO_EXAMEN_GRUPO_Nombre UNIQUE (Nomb_Estado_Examen),
    CONSTRAINT CK_ESTADO_EXAMEN_GRUPO_Codigos CHECK (Cod_Estado_Examen IN (''PROGRAMADO'', ''RENDIDO'', ''CANCELADO'')),
    CONSTRAINT PK_ESTADO_EXAMEN_GRUPO PRIMARY KEY  (Cod_Estado_Examen)
);

-- Table: ESTADO_MATRICULA
CREATE TABLE ESTADO_MATRICULA (
    Cod_Estado_Matricula varchar(15)  NOT NULL,
    Nomb_Estado_Matricula varchar(60)  NOT NULL,
    CONSTRAINT UQ_ESTADO_MATRICULA_Nombre UNIQUE (Nomb_Estado_Matricula),
    CONSTRAINT CK_ESTADO_MATRICULA_Codigos CHECK (Cod_Estado_Matricula IN (''ACTIVA'', ''FINALIZADA'', ''RETIRADA'', ''ANULADA'')),
    CONSTRAINT PK_ESTADO_MATRICULA PRIMARY KEY  (Cod_Estado_Matricula)
);

-- Table: ESTADO_PAGO
CREATE TABLE ESTADO_PAGO (
    Cod_Estado varchar(10)  NOT NULL,
    Nomb_Estado varchar(60)  NOT NULL,
    CONSTRAINT UQ_ESTADO_PAGO_Nombre UNIQUE (Nomb_Estado),
    CONSTRAINT CK_ESTADO_PAGO_Codigos CHECK (Cod_Estado IN (''PENDIENTE'', ''PAGADO'')),
    CONSTRAINT PK_ESTADO_PAGO PRIMARY KEY  (Cod_Estado)
);

-- Table: Examen
CREATE TABLE Examen (
    Cod_Examen varchar(20)  NOT NULL,
    Nomb_Examen nvarchar(150)  NOT NULL,
    Descripcion nvarchar(300)  NULL,
    puntaje_maximo decimal(8,2)  NOT NULL,
    activo bit  NOT NULL CONSTRAINT DF_Examen_Activo DEFAULT (1),
    CONSTRAINT CK_Examen_Puntaje CHECK (( puntaje_maximo > 0 )),
    CONSTRAINT PK_Examen PRIMARY KEY  (Cod_Examen)
);

-- Table: Examen_Grupo
CREATE TABLE Examen_Grupo (
    Cod_examen_grupo varchar(20)  NOT NULL,
    Fech_programada date  NOT NULL,
    Hr_inicio time(0)  NOT NULL,
    Duracion_minutos smallint  NOT NULL,
    Estado varchar(15)  NOT NULL CONSTRAINT DF_ExamenGrupo_Estado DEFAULT (''PROGRAMADO''),
    Publicado bit  NOT NULL CONSTRAINT DF_ExamenGrupo_Publicado DEFAULT (0),
    Examen_Cod_Examen varchar(20)  NOT NULL,
    Grupo_Cod_Grupo varchar(20)  NOT NULL,
    ESTADO_EXAMEN_GRUPO_Cod_Estado_Examen varchar(15)  NOT NULL,
    CONSTRAINT UQ_ExamenGrupo_ExamenGrupo UNIQUE (Examen_Cod_Examen, Grupo_Cod_Grupo),
    CONSTRAINT UQ_ExamenGrupo_IdGrupo UNIQUE (Cod_examen_grupo, Grupo_Cod_Grupo),
    CONSTRAINT CK_ExamenGrupo_Duracion CHECK (( duracion_minutos > 0 )),
    CONSTRAINT CK_ExamenGrupo_Estado CHECK (( Estado = ESTADO_EXAMEN_GRUPO_Cod_Estado_Examen )),
    CONSTRAINT PK_Examen_Grupo PRIMARY KEY  (Cod_examen_grupo)
);

-- Table: Grupo
CREATE TABLE Grupo (
    Cod_Grupo varchar(20)  NOT NULL,
    Nomb_Grupo varchar(60)  NOT NULL,
    Cupo_Max smallint  NOT NULL,
    Activo bit  NOT NULL CONSTRAINT DF_Grupo_Activo DEFAULT (1),
    Turno_Cod_Turno varchar(10)  NOT NULL,
    Aula_Cod_Aula varchar(10)  NOT NULL,
    Ciclo_Cod_Ciclo varchar(20)  NOT NULL,
    CONSTRAINT UQ_Grupo_Ciclo_Nombre UNIQUE (Ciclo_Cod_Ciclo, Nomb_Grupo),
    CONSTRAINT CK_Grupo_Cupo CHECK (( Cupo_Max > 0 )),
    CONSTRAINT PK_Grupo PRIMARY KEY  (Cod_Grupo)
);

-- Table: Horario
CREATE TABLE Horario (
    Cod_Horario varchar(20)  NOT NULL,
    Dia_Semana tinyint  NOT NULL,
    Hr_Inicio time(0)  NOT NULL,
    Hr_Fin time(0)  NOT NULL,
    Activo bit  NOT NULL CONSTRAINT DF_Horario_Activo DEFAULT (1),
    Grupo_Cod_Grupo varchar(20)  NOT NULL,
    TIPO_BLOQUE_Cod_Tipo varchar(10)  NOT NULL,
    Docente_Asignatura_CURSOS_Cod_Curso varchar(10)  NULL,
    Docente_Asignatura_Docente_DNI_Doc varchar(8)  NULL,
    CONSTRAINT CK_Horario_Dia CHECK (( Dia_Semana BETWEEN 1 AND 7 )),
    CONSTRAINT CK_Horario_Horas CHECK (( Hr_Fin > Hr_Inicio )),
    CONSTRAINT CK_Horario_Bloque CHECK (( ( TIPO_BLOQUE_Cod_Tipo = ''CLASE'' AND Docente_Asignatura_Docente_DNI_Doc IS NOT NULL AND Docente_Asignatura_CURSOS_Cod_Curso IS NOT NULL ) OR ( TIPO_BLOQUE_Cod_Tipo = ''RECREO'' AND Docente_Asignatura_Docente_DNI_Doc IS NULL AND Docente_Asignatura_CURSOS_Cod_Curso IS NULL ) )),
    CONSTRAINT PK_Horario PRIMARY KEY  (Cod_Horario)
);

-- Table: MATRICULA
CREATE TABLE MATRICULA (
    ALUMNO_DNI_Alu varchar(8)  NOT NULL,
    Cod_Matricula varchar(20)  NOT NULL,
    ESTADO_MATRICULA_Cod_Estado_Matricula varchar(15)  NOT NULL,
    Fech_Matricula date  NOT NULL CONSTRAINT DF_Matricula_Fecha DEFAULT (convert ( date , getdate ( ) )),
    Observaciones varchar(250)  NULL,
    Grupo_Cod_Grupo varchar(20)  NOT NULL,
    CONSTRAINT UQ_Matricula_IdAlumno UNIQUE (Cod_Matricula, ALUMNO_DNI_Alu),
    CONSTRAINT UQ_Matricula_IdGrupo UNIQUE (Cod_Matricula, Grupo_Cod_Grupo),
    CONSTRAINT UQ_Matricula_Alumno_Grupo UNIQUE (ALUMNO_DNI_Alu, Grupo_Cod_Grupo),
    CONSTRAINT PK_MATRICULA PRIMARY KEY  (Cod_Matricula)
);

-- Table: Nota_Examen
CREATE TABLE Nota_Examen (
    Cod_Nota varchar(20)  NOT NULL,
    Puntaje_total decimal(8,2)  NOT NULL,
    Fech_registro datetime2(0)  NOT NULL CONSTRAINT DF_Nota_Fecha DEFAULT (sysdatetime ( )),
    MATRICULA_Cod_Matricula varchar(20)  NOT NULL,
    Examen_Grupo_Cod_examen_grupo varchar(20)  NOT NULL,
    Grupo_Cod_Grupo varchar(20) NOT NULL,
    CONSTRAINT UQ_Nota_ExamenMatricula UNIQUE (Examen_Grupo_Cod_examen_grupo, MATRICULA_Cod_Matricula),
    CONSTRAINT CK_Nota_Puntaje CHECK (( puntaje_total >= 0 )),
    CONSTRAINT PK_Nota_Examen PRIMARY KEY  (Cod_Nota)
);

-- Table: PARENTESCO
CREATE TABLE PARENTESCO (
    Cod_Paren varchar(5)  NOT NULL,
    Tipo_Paren varchar(40)  NOT NULL,
    CONSTRAINT UQ_PARENTESCO_Tipo UNIQUE (Tipo_Paren),
    CONSTRAINT CK_Parentesco_Lista CHECK (( Cod_Paren IN ( ''PADRE'' , ''MADRE'' , ''TIO'' , ''HERM'' , ''ABUEL'' , ''TUTOR'' , ''OTRO'' ) )),
    CONSTRAINT PK_PARENTESCO PRIMARY KEY  (Cod_Paren)
);

-- Table: Pago
CREATE TABLE Pago (
    Cod_Pago varchar(20)  NOT NULL,
    CONCEPTO_PAGO_Cod_Concepto varchar(20)  NOT NULL,
    Nro_Mensualidad tinyint  NULL,
    Monto decimal(10,2)  NOT NULL,
    Fech_Vencimiento date  NULL,
    ESTADO_PAGO_Cod_Estado varchar(10)  NOT NULL,
    Fech_Pago datetime2(0)  NULL,
    Medio_Pago varchar(10)  NULL,
    Usuario_Cod_Usuario varchar(20)  NULL,
    ALUMNO_DNI_Alu varchar(8)  NOT NULL,
    MATRICULA_Cod_Matricula varchar(20)  NULL,
    CONSTRAINT CK_Pago_Monto CHECK (( Monto > 0 )),
    CONSTRAINT CK_Pago_Concepto CHECK (( ( CONCEPTO_PAGO_Cod_Concepto IN ( ''MATRICULA_INICIAL'' , ''MATERIALES'' ) AND MATRICULA_Cod_Matricula IS NULL AND Nro_Mensualidad IS NULL ) OR ( CONCEPTO_PAGO_Cod_Concepto = ''MENSUALIDAD'' AND MATRICULA_Cod_Matricula IS NOT NULL AND Nro_Mensualidad BETWEEN 1 AND 4 ) )),
    CONSTRAINT CK_Pago_Medio CHECK (( Medio_Pago IS NULL OR Medio_Pago IN ( ''YAPE'' , ''EFECTIVO'' , ''TARJETA'' ) )),
    CONSTRAINT CK_Pago_Estado CHECK (( ( ESTADO_PAGO_Cod_Estado = ''PENDIENTE'' AND Fech_Pago IS NULL AND Medio_Pago IS NULL AND Usuario_Cod_Usuario IS NULL ) OR ( ESTADO_PAGO_Cod_Estado = ''PAGADO'' AND Fech_Pago IS NOT NULL AND Medio_Pago IS NOT NULL AND Usuario_Cod_Usuario IS NOT NULL ) )),
    CONSTRAINT PK_Pago PRIMARY KEY  (Cod_Pago)
);

-- Table: Programa
CREATE TABLE Programa (
    Cod_Programa varchar(20)  NOT NULL,
    Nomb_Programa varchar(100)  NOT NULL,
    Descripcion varchar(250)  NULL,
    Activo bit  NOT NULL CONSTRAINT DF_Programa_Activo DEFAULT (1),
    CONSTRAINT UQ_Programa_Nombre UNIQUE (Nomb_Programa),
    CONSTRAINT CK_Programa_SoloDos CHECK (( Cod_Programa IN ( ''REFUERZO'' , ''PREUNIV'' ) )),
    CONSTRAINT PK_Programa PRIMARY KEY  (Cod_Programa)
);

-- Table: ROL
CREATE TABLE ROL (
    Cod_Rol varchar(10)  NOT NULL,
    Nomb_Rol varchar(60)  NOT NULL,
    CONSTRAINT UQ_ROL_Nombre UNIQUE (Nomb_Rol),
    CONSTRAINT CK_ROL_Codigos CHECK (Cod_Rol IN (''ADMIN'', ''ALUMNO'')),
    CONSTRAINT PK_ROL PRIMARY KEY  (Cod_Rol)
);

-- Table: TIPO_BLOQUE
CREATE TABLE TIPO_BLOQUE (
    Cod_Tipo varchar(10)  NOT NULL,
    Nomb_Tipo varchar(60)  NOT NULL,
    CONSTRAINT UQ_TIPO_BLOQUE_Nombre UNIQUE (Nomb_Tipo),
    CONSTRAINT CK_TIPO_BLOQUE_Codigos CHECK (Cod_Tipo IN (''CLASE'', ''RECREO'')),
    CONSTRAINT PK_TIPO_BLOQUE PRIMARY KEY  (Cod_Tipo)
);

-- Table: Turno
CREATE TABLE Turno (
    Cod_Turno varchar(10)  NOT NULL,
    Nomb_Turno varchar(15)  NOT NULL,
    Hr_Inicio time(0)  NOT NULL,
    Hr_Fin time(0)  NOT NULL,
    CONSTRAINT UQ_Turno_Nombre UNIQUE (Nomb_Turno),
    CONSTRAINT CK_Turno_DosOpciones CHECK (( ( Cod_Turno = ''MANANA'' AND Nomb_Turno = ''MANANA'' AND Hr_Inicio = ''07:00'' AND Hr_Fin = ''13:00'' ) OR ( Cod_Turno = ''TARDE'' AND Nomb_Turno = ''TARDE'' AND Hr_Inicio = ''15:00'' AND Hr_Fin = ''21:00'' ) )),
    CONSTRAINT PK_Turno PRIMARY KEY  (Cod_Turno)
);

-- Table: Usuario
CREATE TABLE Usuario (
    Cod_Usuario varchar(20)  NOT NULL,
    Nomb_Usuario varchar(80)  NOT NULL,
    Clave_Hash varchar(255)  NOT NULL,
    ROL_Cod_Rol varchar(10)  NOT NULL,
    Activo bit  NOT NULL CONSTRAINT DF_Usuario_Activo DEFAULT (1),
    Debe_Cambiar_Clave bit  NOT NULL CONSTRAINT DF_Usuario_Cambiar DEFAULT (1),
    ALUMNO_DNI_Alu varchar(8)  NULL,
    CONSTRAINT UQ_Usuario_Nombre UNIQUE (Nomb_Usuario),
    CONSTRAINT CK_Usuario_Rol CHECK (( ( ROL_Cod_Rol = ''ADMIN'' AND ALUMNO_DNI_Alu IS NULL ) OR ( ROL_Cod_Rol = ''ALUMNO'' AND ALUMNO_DNI_Alu IS NOT NULL ) )),
    CONSTRAINT PK_Usuario PRIMARY KEY  (Cod_Usuario)
);

-- foreign keys
-- Reference: Ciclo_ESTADO_CICLO (table: Ciclo)
ALTER TABLE Ciclo ADD CONSTRAINT Ciclo_ESTADO_CICLO
    FOREIGN KEY (ESTADO_CICLO_Cod_Estado)
    REFERENCES ESTADO_CICLO (Cod_Estado_Ciclo);

-- Reference: Docente_Asignatura_Docente (table: Docente_Asignatura)
ALTER TABLE Docente_Asignatura ADD CONSTRAINT Docente_Asignatura_Docente
    FOREIGN KEY (Docente_DNI_Doc)
    REFERENCES Docente (DNI_Doc);

-- Reference: Examen_Grupo_ESTADO_EXAMEN_GRUPO (table: Examen_Grupo)
ALTER TABLE Examen_Grupo ADD CONSTRAINT Examen_Grupo_ESTADO_EXAMEN_GRUPO
    FOREIGN KEY (ESTADO_EXAMEN_GRUPO_Cod_Estado_Examen)
    REFERENCES ESTADO_EXAMEN_GRUPO (Cod_Estado_Examen);

-- Reference: Examen_Grupo_Examen (table: Examen_Grupo)
ALTER TABLE Examen_Grupo ADD CONSTRAINT Examen_Grupo_Examen
    FOREIGN KEY (Examen_Cod_Examen)
    REFERENCES Examen (Cod_Examen);

-- Reference: Examen_Grupo_Grupo (table: Examen_Grupo)
ALTER TABLE Examen_Grupo ADD CONSTRAINT Examen_Grupo_Grupo
    FOREIGN KEY (Grupo_Cod_Grupo)
    REFERENCES Grupo (Cod_Grupo);

-- Reference: FK_Alumno_Carrera (table: ALUMNO)
ALTER TABLE ALUMNO ADD CONSTRAINT FK_Alumno_Carrera
    FOREIGN KEY (CARRERA_Cod_Carrera)
    REFERENCES CARRERA (Cod_Carrera);

-- Reference: FK_Alumno_Parentesco (table: ALUMNO)
ALTER TABLE ALUMNO ADD CONSTRAINT FK_Alumno_Parentesco
    FOREIGN KEY (PARENTESCO_Cod_Paren)
    REFERENCES PARENTESCO (Cod_Paren);

-- Reference: FK_Ciclo_Programa (table: Ciclo)
ALTER TABLE Ciclo ADD CONSTRAINT FK_Ciclo_Programa
    FOREIGN KEY (Programa_Cod_Programa)
    REFERENCES Programa (Cod_Programa);

-- Reference: FK_DA_Curso (table: Docente_Asignatura)
ALTER TABLE Docente_Asignatura ADD CONSTRAINT FK_DA_Curso
    FOREIGN KEY (CURSOS_Cod_Curso)
    REFERENCES CURSOS (Cod_Curso);

-- Reference: Grupo_Aula (table: Grupo)
ALTER TABLE Grupo ADD CONSTRAINT Grupo_Aula
    FOREIGN KEY (Aula_Cod_Aula)
    REFERENCES Aula (Cod_Aula);

-- Reference: Grupo_Ciclo (table: Grupo)
ALTER TABLE Grupo ADD CONSTRAINT Grupo_Ciclo
    FOREIGN KEY (Ciclo_Cod_Ciclo)
    REFERENCES Ciclo (Cod_Ciclo);

-- Reference: Grupo_Turno (table: Grupo)
ALTER TABLE Grupo ADD CONSTRAINT Grupo_Turno
    FOREIGN KEY (Turno_Cod_Turno)
    REFERENCES Turno (Cod_Turno);

-- Reference: Horario_Docente_Asignatura (table: Horario)
ALTER TABLE Horario ADD CONSTRAINT Horario_Docente_Asignatura
    FOREIGN KEY (Docente_Asignatura_CURSOS_Cod_Curso, Docente_Asignatura_Docente_DNI_Doc)
    REFERENCES Docente_Asignatura (CURSOS_Cod_Curso, Docente_DNI_Doc);

-- Reference: Horario_Grupo (table: Horario)
ALTER TABLE Horario ADD CONSTRAINT Horario_Grupo
    FOREIGN KEY (Grupo_Cod_Grupo)
    REFERENCES Grupo (Cod_Grupo);

-- Reference: Horario_TIPO_BLOQUE (table: Horario)
ALTER TABLE Horario ADD CONSTRAINT Horario_TIPO_BLOQUE
    FOREIGN KEY (TIPO_BLOQUE_Cod_Tipo)
    REFERENCES TIPO_BLOQUE (Cod_Tipo);

-- Reference: MATRICULA_ALUMNO (table: MATRICULA)
ALTER TABLE MATRICULA ADD CONSTRAINT MATRICULA_ALUMNO
    FOREIGN KEY (ALUMNO_DNI_Alu)
    REFERENCES ALUMNO (DNI_Alu);

-- Reference: MATRICULA_ESTADO_MATRICULA (table: MATRICULA)
ALTER TABLE MATRICULA ADD CONSTRAINT MATRICULA_ESTADO_MATRICULA
    FOREIGN KEY (ESTADO_MATRICULA_Cod_Estado_Matricula)
    REFERENCES ESTADO_MATRICULA (Cod_Estado_Matricula);

-- Reference: MATRICULA_Grupo (table: MATRICULA)
ALTER TABLE MATRICULA ADD CONSTRAINT MATRICULA_Grupo
    FOREIGN KEY (Grupo_Cod_Grupo)
    REFERENCES Grupo (Cod_Grupo);

-- Reference: Nota_Examen_Examen_Grupo (table: Nota_Examen)
ALTER TABLE Nota_Examen ADD CONSTRAINT Nota_Examen_Examen_Grupo
    FOREIGN KEY (Examen_Grupo_Cod_examen_grupo, Grupo_Cod_Grupo)
    REFERENCES Examen_Grupo (Cod_examen_grupo, Grupo_Cod_Grupo);

-- Reference: Nota_Examen_MATRICULA (table: Nota_Examen)
ALTER TABLE Nota_Examen ADD CONSTRAINT Nota_Examen_MATRICULA
    FOREIGN KEY (MATRICULA_Cod_Matricula, Grupo_Cod_Grupo)
    REFERENCES MATRICULA (Cod_Matricula, Grupo_Cod_Grupo);

-- Reference: Pago_ALUMNO (table: Pago)
ALTER TABLE Pago ADD CONSTRAINT Pago_ALUMNO
    FOREIGN KEY (ALUMNO_DNI_Alu)
    REFERENCES ALUMNO (DNI_Alu);

-- Reference: Pago_CONCEPTO_PAGO (table: Pago)
ALTER TABLE Pago ADD CONSTRAINT Pago_CONCEPTO_PAGO
    FOREIGN KEY (CONCEPTO_PAGO_Cod_Concepto)
    REFERENCES CONCEPTO_PAGO (Cod_Concepto);

-- Reference: Pago_ESTADO_PAGO (table: Pago)
ALTER TABLE Pago ADD CONSTRAINT Pago_ESTADO_PAGO
    FOREIGN KEY (ESTADO_PAGO_Cod_Estado)
    REFERENCES ESTADO_PAGO (Cod_Estado);

-- Reference: Pago_MATRICULA (table: Pago)
ALTER TABLE Pago ADD CONSTRAINT Pago_MATRICULA
    FOREIGN KEY (MATRICULA_Cod_Matricula, ALUMNO_DNI_Alu)
    REFERENCES MATRICULA (Cod_Matricula, ALUMNO_DNI_Alu);

-- Reference: Pago_Usuario (table: Pago)
ALTER TABLE Pago ADD CONSTRAINT Pago_Usuario
    FOREIGN KEY (Usuario_Cod_Usuario)
    REFERENCES Usuario (Cod_Usuario);

-- Reference: Usuario_ALUMNO (table: Usuario)
ALTER TABLE Usuario ADD CONSTRAINT Usuario_ALUMNO
    FOREIGN KEY (ALUMNO_DNI_Alu)
    REFERENCES ALUMNO (DNI_Alu);

-- Reference: Usuario_ROL (table: Usuario)
ALTER TABLE Usuario ADD CONSTRAINT Usuario_ROL
    FOREIGN KEY (ROL_Cod_Rol)
    REFERENCES ROL (Cod_Rol);';
EXEC sys.sp_executesql N'-- 2) VALORES DE LOS CATALOGOS PARA COMBOS
-- FRACTALES ACADEMY - LISTAS QUE APARECERAN EN EL FRONTEND
-- Ejecutar despues de crear tablas (archivo 01). Tipos VARCHAR preservados.
-- Valores controlados por CHECK y FK. No son datos personales ni simulados.

INSERT INTO PARENTESCO (Cod_Paren, Tipo_Paren) VALUES
 (''PADRE'',''Padre''), (''MADRE'',''Madre''), (''TIO'',''Tio o tia''),
 (''HERM'',''Hermano o hermana''), (''ABUEL'',''Abuelo o abuela''),
 (''TUTOR'',''Tutor legal''), (''OTRO'',''Otro'');

INSERT INTO Programa (Cod_Programa, Nomb_Programa, Descripcion, Activo) VALUES
 (''REFUERZO'',''Reforzamiento de Colegio'', NULL, 1),
 (''PREUNIV'',''Preparacion preuniversitaria'', NULL, 1);

INSERT INTO Turno (Cod_Turno, Nomb_Turno, Hr_Inicio, Hr_Fin) VALUES
 (''MANANA'',''MANANA'',''07:00'',''13:00''),
 (''TARDE'',''TARDE'',''15:00'',''21:00'');

INSERT INTO ROL (Cod_Rol, Nomb_Rol) VALUES
 (''ADMIN'',''Administrador''), (''ALUMNO'',''Alumno'');

INSERT INTO CONCEPTO_PAGO (Cod_Concepto, Nomb_Concepto) VALUES
 (''MATRICULA_INICIAL'',''Matricula inicial''),
 (''MATERIALES'',''Materiales y libros''),
 (''MENSUALIDAD'',''Mensualidad'');

INSERT INTO ESTADO_PAGO (Cod_Estado, Nomb_Estado) VALUES
 (''PENDIENTE'',''Pendiente''), (''PAGADO'',''Pagado'');

INSERT INTO ESTADO_MATRICULA (Cod_Estado_Matricula, Nomb_Estado_Matricula) VALUES
 (''ACTIVA'',''Activa''), (''FINALIZADA'',''Finalizada''),
 (''RETIRADA'',''Retirada''), (''ANULADA'',''Anulada'');

INSERT INTO ESTADO_CICLO (Cod_Estado_Ciclo, Nomb_Estado_Ciclo) VALUES
 (''PROGRAMADO'',''Programado''), (''ACTIVO'',''Activo''),
 (''FINALIZADO'',''Finalizado''), (''CANCELADO'',''Cancelado'');

INSERT INTO ESTADO_EXAMEN_GRUPO (Cod_Estado_Examen, Nomb_Estado_Examen) VALUES
 (''PROGRAMADO'',''Programado''), (''RENDIDO'',''Rendido''),
 (''CANCELADO'',''Cancelado'');

INSERT INTO TIPO_BLOQUE (Cod_Tipo, Nomb_Tipo) VALUES
 (''CLASE'',''Clase''), (''RECREO'',''Recreo'');

-- CARRERA, CURSOS y Aula son catalogos configurables; agrega sus opciones reales.
-- En ALUMNO se escribe informacion personal, y se selecciona Carrera y Parentesco.';
EXEC sys.sp_executesql N'-- 3) INDICES Y TRIGGERS DE REGLAS DE NEGOCIO
-- Un alumno solo puede tener una cuenta propia; muchas cuentas ADMIN tienen DNI de alumno NULL.
CREATE UNIQUE INDEX UX_Usuario_UnicaCuentaAlumno
    ON Usuario (ALUMNO_DNI_Alu)
    WHERE ALUMNO_DNI_Alu IS NOT NULL;';
EXEC sys.sp_executesql N'-- Matricula inicial y materiales se cobran una sola vez por alumno.
CREATE UNIQUE INDEX UX_Pago_ConceptoUnicoAlumno
    ON Pago (ALUMNO_DNI_Alu, CONCEPTO_PAGO_Cod_Concepto)
    WHERE CONCEPTO_PAGO_Cod_Concepto IN (''MATRICULA_INICIAL'', ''MATERIALES'');';
EXEC sys.sp_executesql N'-- Impide duplicar una mensualidad de la misma matricula.
CREATE UNIQUE INDEX UX_Pago_MensualidadMatricula
    ON Pago (MATRICULA_Cod_Matricula, Nro_Mensualidad)
    WHERE CONCEPTO_PAGO_Cod_Concepto = ''MENSUALIDAD'';';
EXEC sys.sp_executesql N'-- Evita registrar mensualidad 3 o 4 cuando un ciclo acelerado dura solo 2 meses.
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
        WHERE p.CONCEPTO_PAGO_Cod_Concepto = ''MENSUALIDAD''
          AND p.Nro_Mensualidad > c.Nro_Mensualidades
    )
    BEGIN
        THROW 51001, ''Numero de mensualidad fuera del ciclo del alumno.'', 1;
    END
END;';
EXEC sys.sp_executesql N'-- Horarios validos por turno y sin cruces entre grupo, aula o docente.
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
        THROW 51002, ''Clase o recreo fuera del turno asignado al grupo.'', 1;

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
        THROW 51003, ''Cruce de horario: grupo, aula o docente ocupado.'', 1;
END;';
EXEC sys.sp_executesql N'-- La nota debe estar dentro del maximo permitido por el examen.
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
        THROW 51004, ''La nota supera el puntaje maximo del simulacro.'', 1;
END;';
EXEC sys.sp_executesql N'-- Restringe cupos en matriculas ACTIVAS.
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
              AND m.ESTADO_MATRICULA_Cod_Estado_Matricula = ''ACTIVA''
        ) AS ocupacion
        WHERE ocupacion.Cantidad > g.Cupo_Max
    )
        THROW 51005, ''La cantidad de matriculas activas supera el cupo del grupo.'', 1;
END;';
 COMMIT;
END TRY
BEGIN CATCH
 IF XACT_STATE()<>0 ROLLBACK;
 THROW;
END CATCH;
SELECT DB_NAME() AS BasePruebas,COUNT(*) AS Tablas FROM sys.tables WHERE schema_id=SCHEMA_ID('dbo');
