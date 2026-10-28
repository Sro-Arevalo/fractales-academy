-- V4.3: estructura completa para una base NUEVA y VACIA, previamente creada.
-- Generado por scripts/build-v43-sql.js. No ejecutar sobre una base existente.
-- Confirmar servidor y sustituir @BaseEsperada. El conjunto se ejecuta en una sola transaccion.
SET NOCOUNT ON; SET XACT_ABORT ON;
SET ANSI_NULLS ON; SET QUOTED_IDENTIFIER ON; SET ANSI_PADDING ON; SET ANSI_WARNINGS ON;
SET ARITHABORT ON; SET CONCAT_NULL_YIELDS_NULL ON; SET NUMERIC_ROUNDABORT OFF;
DECLARE @BaseEsperada sysname=N'FractalesAcademy';
IF DB_NAME()<>@BaseEsperada OR DB_NAME() IN ('master','model','msdb','tempdb') THROW 54300,'Confirma servidor y base de destino.',1;
IF EXISTS(SELECT 1 FROM sys.tables WHERE is_ms_shipped=0) THROW 54308,'La base debe estar vacia. Usa las migraciones incrementales para datos existentes.',1;
BEGIN TRY
BEGIN TRAN;
EXEC sys.sp_executesql N'-- FRACTALES ACADEMY — Azure SQL Database — nueva base vacía
-- Derivado del SQL definitivo proporcionado por el usuario (24/10/2026).
-- IMPORTANTE: Primero crea la base desde Azure Portal; en SSMS selecciona
-- EXPLICITAMENTE ESA base en la conexión (Options > Connection Properties).
-- NO ejecutar en master ni contra una base que contenga tablas.
-- NO crea ni borra bases de datos; NO contiene contraseñas ni datos personales.
SET ANSI_NULLS ON;
SET ANSI_PADDING ON;
SET ANSI_WARNINGS ON;
SET ARITHABORT ON;
SET CONCAT_NULL_YIELDS_NULL ON;
SET QUOTED_IDENTIFIER ON;
SET NUMERIC_ROUNDABORT OFF;';
EXEC sys.sp_executesql N'IF DB_NAME() IN (N''master'',N''model'',N''msdb'',N''tempdb'')
    THROW 53100, ''Conectate a la base de la academia; no ejecutes en master.'', 1;
IF EXISTS (SELECT 1 FROM sys.tables WHERE schema_id=SCHEMA_ID(''dbo''))
    THROW 53101, ''Esta base ya tiene tablas. No ejecutes el modelo completo: usa el script 02 para actualizar.'', 1;';
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
EXEC sys.sp_executesql N'-- 4) COMPROBACION FINAL. VALORES ESPERADOS: 25 TABLAS, 27 FK, 3 INDICES, 4 TRIGGERS.
SELECT DB_NAME() AS BaseDatos,
       (SELECT COUNT(*) FROM sys.tables WHERE schema_id=SCHEMA_ID(''dbo'')) AS Tablas,
       (SELECT COUNT(*) FROM sys.foreign_keys WHERE schema_id=SCHEMA_ID(''dbo'')) AS RelacionesFK,
       (SELECT COUNT(*) FROM sys.triggers WHERE parent_class=1 AND name IN
        (''TR_Pago_Mes_Valido'',''TR_Horario_Sin_Cruces'',''TR_Nota_Examen_Puntaje'',''TR_Matricula_CupoMaximo'')) AS Triggers,
       (SELECT COUNT(*) FROM sys.indexes WHERE name IN
        (''UX_Usuario_UnicaCuentaAlumno'',''UX_Pago_ConceptoUnicoAlumno'',''UX_Pago_MensualidadMatricula'')) AS IndicesAdicionales;';
EXEC sys.sp_executesql N'PRINT ''MODELO CREADO. Pruebe con 01_Insertar_Datos_Prueba.sql de los scripts de pruebas.'';';
-- sql/migrations/v4/00A_PREPARACION_Y_LINEA_BASE.sql
EXEC sys.sp_executesql N'-- V4: ejecutar manualmente, en mantenimiento, después de respaldo verificado.
-- Cambiar SOLO @BaseEsperada por el nombre de la base independiente al ensayar.
SET NOCOUNT ON; SET XACT_ABORT ON;
SET ANSI_NULLS ON; SET QUOTED_IDENTIFIER ON; SET ANSI_PADDING ON;
SET ANSI_WARNINGS ON; SET ARITHABORT ON; SET CONCAT_NULL_YIELDS_NULL ON; SET NUMERIC_ROUNDABORT OFF;
DECLARE @BaseEsperada sysname=DB_NAME();
IF DB_NAME()<>@BaseEsperada OR DB_NAME() IN (''master'',''model'',''msdb'',''tempdb'')
    THROW 54000, ''Base incorrecta. Verifique servidor y @BaseEsperada; no se hizo ningun cambio.'', 1;
BEGIN TRY
BEGIN TRAN;
DECLARE @Columnas TABLE (Tabla sysname, Columna sysname, Tipo sysname, Longitud int, PrecisionNum int, Escala int, AdmiteNull bit);
INSERT @Columnas VALUES
(''ALUMNO'',''DNI_Alu'',''varchar'',8,NULL,NULL,0),
(''ALUMNO'',''Nomb_Alu'',''varchar'',120,NULL,NULL,0),
(''ALUMNO'',''Correo_Alu'',''varchar'',150,NULL,NULL,1),
(''ALUMNO'',''Fech_Nac'',''date'',NULL,NULL,NULL,1),
(''ALUMNO'',''Cel_Alu'',''varchar'',9,NULL,NULL,1),
(''ALUMNO'',''Dir_Alu'',''varchar'',200,NULL,NULL,1),
(''ALUMNO'',''Nomb_Apoderado'',''varchar'',120,NULL,NULL,0),
(''ALUMNO'',''DNI_Apoderado'',''varchar'',8,NULL,NULL,1),
(''ALUMNO'',''Cel_Apoderado'',''varchar'',9,NULL,NULL,1),
(''ALUMNO'',''Correo_Apoderado'',''varchar'',150,NULL,NULL,1),
(''ALUMNO'',''PARENTESCO_Cod_Paren'',''varchar'',5,NULL,NULL,0),
(''ALUMNO'',''CARRERA_Cod_Carrera'',''varchar'',10,NULL,NULL,0),
(''Aula'',''Cod_Aula'',''varchar'',10,NULL,NULL,0),
(''Aula'',''Nomb_Aula'',''varchar'',60,NULL,NULL,0),
(''Aula'',''Capacidad'',''smallint'',NULL,NULL,NULL,0),
(''Aula'',''Activa'',''bit'',NULL,NULL,NULL,0),
(''CARRERA'',''Cod_Carrera'',''varchar'',10,NULL,NULL,0),
(''CARRERA'',''Nomb_Carrera'',''varchar'',120,NULL,NULL,0),
(''CONCEPTO_PAGO'',''Cod_Concepto'',''varchar'',20,NULL,NULL,0),
(''CONCEPTO_PAGO'',''Nomb_Concepto'',''varchar'',60,NULL,NULL,0),
(''CURSOS'',''Cod_Curso'',''varchar'',10,NULL,NULL,0),
(''CURSOS'',''Nomb_Curso'',''varchar'',100,NULL,NULL,0),
(''CURSOS'',''Activa'',''bit'',NULL,NULL,NULL,0),
(''Ciclo'',''Cod_Ciclo'',''varchar'',20,NULL,NULL,0),
(''Ciclo'',''Programa_Cod_Programa'',''varchar'',20,NULL,NULL,0),
(''Ciclo'',''Nomb_Ciclo'',''varchar'',100,NULL,NULL,0),
(''Ciclo'',''Modalidad'',''varchar'',12,NULL,NULL,0),
(''Ciclo'',''Fech_Inicio'',''date'',NULL,NULL,NULL,0),
(''Ciclo'',''Fech_Fin'',''date'',NULL,NULL,NULL,0),
(''Ciclo'',''Nro_Mensualidades'',''tinyint'',NULL,NULL,NULL,0),
(''Ciclo'',''Precio_Mensual'',''decimal'',NULL,10,2,0),
(''Ciclo'',''ESTADO_CICLO_Cod_Estado'',''varchar'',15,NULL,NULL,0),
(''Docente'',''DNI_Doc'',''varchar'',8,NULL,NULL,0),
(''Docente'',''Nom_Doc'',''varchar'',120,NULL,NULL,0),
(''Docente'',''Cel_Doc'',''varchar'',9,NULL,NULL,0),
(''Docente'',''Especialidad'',''varchar'',120,NULL,NULL,1),
(''Docente'',''Activo'',''bit'',NULL,NULL,NULL,0),
(''Docente_Asignatura'',''CURSOS_Cod_Curso'',''varchar'',10,NULL,NULL,0),
(''Docente_Asignatura'',''Docente_DNI_Doc'',''varchar'',8,NULL,NULL,0),
(''ESTADO_CICLO'',''Cod_Estado_Ciclo'',''varchar'',15,NULL,NULL,0),
(''ESTADO_CICLO'',''Nomb_Estado_Ciclo'',''varchar'',60,NULL,NULL,0),
(''ESTADO_EXAMEN_GRUPO'',''Cod_Estado_Examen'',''varchar'',15,NULL,NULL,0),
(''ESTADO_EXAMEN_GRUPO'',''Nomb_Estado_Examen'',''varchar'',60,NULL,NULL,0),
(''ESTADO_MATRICULA'',''Cod_Estado_Matricula'',''varchar'',15,NULL,NULL,0),
(''ESTADO_MATRICULA'',''Nomb_Estado_Matricula'',''varchar'',60,NULL,NULL,0),
(''ESTADO_PAGO'',''Cod_Estado'',''varchar'',10,NULL,NULL,0),
(''ESTADO_PAGO'',''Nomb_Estado'',''varchar'',60,NULL,NULL,0),
(''Examen'',''Cod_Examen'',''varchar'',20,NULL,NULL,0),
(''Examen'',''Nomb_Examen'',''nvarchar'',300,NULL,NULL,0),
(''Examen'',''Descripcion'',''nvarchar'',600,NULL,NULL,1),
(''Examen'',''puntaje_maximo'',''decimal'',NULL,8,2,0),
(''Examen'',''activo'',''bit'',NULL,NULL,NULL,0),
(''Examen_Grupo'',''Cod_examen_grupo'',''varchar'',20,NULL,NULL,0),
(''Examen_Grupo'',''Fech_programada'',''date'',NULL,NULL,NULL,0),
(''Examen_Grupo'',''Hr_inicio'',''time'',NULL,NULL,NULL,0),
(''Examen_Grupo'',''Duracion_minutos'',''smallint'',NULL,NULL,NULL,0),
(''Examen_Grupo'',''Estado'',''varchar'',15,NULL,NULL,0),
(''Examen_Grupo'',''Publicado'',''bit'',NULL,NULL,NULL,0),
(''Examen_Grupo'',''Examen_Cod_Examen'',''varchar'',20,NULL,NULL,0),
(''Examen_Grupo'',''Grupo_Cod_Grupo'',''varchar'',20,NULL,NULL,0),
(''Examen_Grupo'',''ESTADO_EXAMEN_GRUPO_Cod_Estado_Examen'',''varchar'',15,NULL,NULL,0),
(''Grupo'',''Cod_Grupo'',''varchar'',20,NULL,NULL,0),
(''Grupo'',''Nomb_Grupo'',''varchar'',60,NULL,NULL,0),
(''Grupo'',''Cupo_Max'',''smallint'',NULL,NULL,NULL,0),
(''Grupo'',''Activo'',''bit'',NULL,NULL,NULL,0),
(''Grupo'',''Turno_Cod_Turno'',''varchar'',10,NULL,NULL,0),
(''Grupo'',''Aula_Cod_Aula'',''varchar'',10,NULL,NULL,0),
(''Grupo'',''Ciclo_Cod_Ciclo'',''varchar'',20,NULL,NULL,0),
(''Horario'',''Cod_Horario'',''varchar'',20,NULL,NULL,0),
(''Horario'',''Dia_Semana'',''tinyint'',NULL,NULL,NULL,0),
(''Horario'',''Hr_Inicio'',''time'',NULL,NULL,NULL,0),
(''Horario'',''Hr_Fin'',''time'',NULL,NULL,NULL,0),
(''Horario'',''Activo'',''bit'',NULL,NULL,NULL,0),
(''Horario'',''Grupo_Cod_Grupo'',''varchar'',20,NULL,NULL,0),
(''Horario'',''TIPO_BLOQUE_Cod_Tipo'',''varchar'',10,NULL,NULL,0),
(''Horario'',''Docente_Asignatura_CURSOS_Cod_Curso'',''varchar'',10,NULL,NULL,1),
(''Horario'',''Docente_Asignatura_Docente_DNI_Doc'',''varchar'',8,NULL,NULL,1),
(''MATRICULA'',''ALUMNO_DNI_Alu'',''varchar'',8,NULL,NULL,0),
(''MATRICULA'',''Cod_Matricula'',''varchar'',20,NULL,NULL,0),
(''MATRICULA'',''ESTADO_MATRICULA_Cod_Estado_Matricula'',''varchar'',15,NULL,NULL,0),
(''MATRICULA'',''Fech_Matricula'',''date'',NULL,NULL,NULL,0),
(''MATRICULA'',''Observaciones'',''varchar'',250,NULL,NULL,1),
(''MATRICULA'',''Grupo_Cod_Grupo'',''varchar'',20,NULL,NULL,0),
(''Nota_Examen'',''Cod_Nota'',''varchar'',20,NULL,NULL,0),
(''Nota_Examen'',''Puntaje_total'',''decimal'',NULL,8,2,0),
(''Nota_Examen'',''Fech_registro'',''datetime2'',NULL,NULL,NULL,0),
(''Nota_Examen'',''MATRICULA_Cod_Matricula'',''varchar'',20,NULL,NULL,0),
(''Nota_Examen'',''Examen_Grupo_Cod_examen_grupo'',''varchar'',20,NULL,NULL,0),
(''Nota_Examen'',''Grupo_Cod_Grupo'',''varchar'',20,NULL,NULL,0),
(''PARENTESCO'',''Cod_Paren'',''varchar'',5,NULL,NULL,0),
(''PARENTESCO'',''Tipo_Paren'',''varchar'',40,NULL,NULL,0),
(''Pago'',''Cod_Pago'',''varchar'',20,NULL,NULL,0),
(''Pago'',''CONCEPTO_PAGO_Cod_Concepto'',''varchar'',20,NULL,NULL,0),
(''Pago'',''Nro_Mensualidad'',''tinyint'',NULL,NULL,NULL,1),
(''Pago'',''Monto'',''decimal'',NULL,10,2,0),
(''Pago'',''Fech_Vencimiento'',''date'',NULL,NULL,NULL,1),
(''Pago'',''ESTADO_PAGO_Cod_Estado'',''varchar'',10,NULL,NULL,0),
(''Pago'',''Fech_Pago'',''datetime2'',NULL,NULL,NULL,1),
(''Pago'',''Medio_Pago'',''varchar'',10,NULL,NULL,1),
(''Pago'',''Usuario_Cod_Usuario'',''varchar'',20,NULL,NULL,1),
(''Pago'',''ALUMNO_DNI_Alu'',''varchar'',8,NULL,NULL,0),
(''Pago'',''MATRICULA_Cod_Matricula'',''varchar'',20,NULL,NULL,1),
(''Programa'',''Cod_Programa'',''varchar'',20,NULL,NULL,0),
(''Programa'',''Nomb_Programa'',''varchar'',100,NULL,NULL,0),
(''Programa'',''Descripcion'',''varchar'',250,NULL,NULL,1),
(''Programa'',''Activo'',''bit'',NULL,NULL,NULL,0),
(''ROL'',''Cod_Rol'',''varchar'',10,NULL,NULL,0),
(''ROL'',''Nomb_Rol'',''varchar'',60,NULL,NULL,0),
(''TIPO_BLOQUE'',''Cod_Tipo'',''varchar'',10,NULL,NULL,0),
(''TIPO_BLOQUE'',''Nomb_Tipo'',''varchar'',60,NULL,NULL,0),
(''Turno'',''Cod_Turno'',''varchar'',10,NULL,NULL,0),
(''Turno'',''Nomb_Turno'',''varchar'',15,NULL,NULL,0),
(''Turno'',''Hr_Inicio'',''time'',NULL,NULL,NULL,0),
(''Turno'',''Hr_Fin'',''time'',NULL,NULL,NULL,0),
(''Usuario'',''Cod_Usuario'',''varchar'',20,NULL,NULL,0),
(''Usuario'',''Nomb_Usuario'',''varchar'',80,NULL,NULL,0),
(''Usuario'',''Clave_Hash'',''varchar'',255,NULL,NULL,0),
(''Usuario'',''ROL_Cod_Rol'',''varchar'',10,NULL,NULL,0),
(''Usuario'',''Activo'',''bit'',NULL,NULL,NULL,0),
(''Usuario'',''Debe_Cambiar_Clave'',''bit'',NULL,NULL,NULL,0),
(''Usuario'',''ALUMNO_DNI_Alu'',''varchar'',8,NULL,NULL,1);

IF EXISTS (SELECT e.*,ty.name AS TipoReal,c.max_length AS LongitudReal,c.is_nullable AS NullReal
 FROM @Columnas e LEFT JOIN sys.tables t ON t.name=e.Tabla AND t.schema_id=SCHEMA_ID(''dbo'')
 LEFT JOIN sys.columns c ON c.object_id=t.object_id AND c.name=e.Columna LEFT JOIN sys.types ty ON ty.user_type_id=c.user_type_id
 WHERE c.column_id IS NULL OR ty.name<>e.Tipo OR c.is_nullable<>e.AdmiteNull
 OR (e.Longitud IS NOT NULL AND c.max_length<>e.Longitud AND NOT (e.Columna LIKE ''Cel[_]%'' AND c.max_length IN (9,15)))
 OR (e.PrecisionNum IS NOT NULL AND (c.precision<>e.PrecisionNum OR c.scale<>e.Escala))) BEGIN
 SELECT e.*,ty.name AS TipoReal,c.max_length AS LongitudReal,c.is_nullable AS NullReal
 FROM @Columnas e LEFT JOIN sys.tables t ON t.name=e.Tabla AND t.schema_id=SCHEMA_ID(''dbo'')
 LEFT JOIN sys.columns c ON c.object_id=t.object_id AND c.name=e.Columna LEFT JOIN sys.types ty ON ty.user_type_id=c.user_type_id
 WHERE c.column_id IS NULL OR ty.name<>e.Tipo OR c.is_nullable<>e.AdmiteNull
 OR (e.Longitud IS NOT NULL AND c.max_length<>e.Longitud AND NOT (e.Columna LIKE ''Cel[_]%'' AND c.max_length IN (9,15)))
 OR (e.PrecisionNum IS NOT NULL AND (c.precision<>e.PrecisionNum OR c.scale<>e.Escala));
 THROW 54002,''El esquema difiere del modelo local. Compare el diagnostico antes de continuar.'',1;
END;
IF NOT EXISTS (SELECT 1 FROM sys.indexes i WHERE i.object_id=OBJECT_ID(''dbo.ALUMNO'') AND i.is_primary_key=1 AND
 (SELECT STRING_AGG(CONVERT(nvarchar(max),c.name),'','') WITHIN GROUP (ORDER BY ic.key_ordinal) FROM sys.index_columns ic JOIN sys.columns c ON c.object_id=ic.object_id AND c.column_id=ic.column_id WHERE ic.object_id=i.object_id AND ic.index_id=i.index_id AND ic.key_ordinal>0)=''DNI_Alu'')
 THROW 54003,''Clave primaria inesperada en ALUMNO.'',1;
IF NOT EXISTS (SELECT 1 FROM sys.indexes i WHERE i.object_id=OBJECT_ID(''dbo.Aula'') AND i.is_primary_key=1 AND
 (SELECT STRING_AGG(CONVERT(nvarchar(max),c.name),'','') WITHIN GROUP (ORDER BY ic.key_ordinal) FROM sys.index_columns ic JOIN sys.columns c ON c.object_id=ic.object_id AND c.column_id=ic.column_id WHERE ic.object_id=i.object_id AND ic.index_id=i.index_id AND ic.key_ordinal>0)=''Cod_Aula'')
 THROW 54003,''Clave primaria inesperada en Aula.'',1;
IF NOT EXISTS (SELECT 1 FROM sys.indexes i WHERE i.object_id=OBJECT_ID(''dbo.CARRERA'') AND i.is_primary_key=1 AND
 (SELECT STRING_AGG(CONVERT(nvarchar(max),c.name),'','') WITHIN GROUP (ORDER BY ic.key_ordinal) FROM sys.index_columns ic JOIN sys.columns c ON c.object_id=ic.object_id AND c.column_id=ic.column_id WHERE ic.object_id=i.object_id AND ic.index_id=i.index_id AND ic.key_ordinal>0)=''Cod_Carrera'')
 THROW 54003,''Clave primaria inesperada en CARRERA.'',1;
IF NOT EXISTS (SELECT 1 FROM sys.indexes i WHERE i.object_id=OBJECT_ID(''dbo.CONCEPTO_PAGO'') AND i.is_primary_key=1 AND
 (SELECT STRING_AGG(CONVERT(nvarchar(max),c.name),'','') WITHIN GROUP (ORDER BY ic.key_ordinal) FROM sys.index_columns ic JOIN sys.columns c ON c.object_id=ic.object_id AND c.column_id=ic.column_id WHERE ic.object_id=i.object_id AND ic.index_id=i.index_id AND ic.key_ordinal>0)=''Cod_Concepto'')
 THROW 54003,''Clave primaria inesperada en CONCEPTO_PAGO.'',1;
IF NOT EXISTS (SELECT 1 FROM sys.indexes i WHERE i.object_id=OBJECT_ID(''dbo.CURSOS'') AND i.is_primary_key=1 AND
 (SELECT STRING_AGG(CONVERT(nvarchar(max),c.name),'','') WITHIN GROUP (ORDER BY ic.key_ordinal) FROM sys.index_columns ic JOIN sys.columns c ON c.object_id=ic.object_id AND c.column_id=ic.column_id WHERE ic.object_id=i.object_id AND ic.index_id=i.index_id AND ic.key_ordinal>0)=''Cod_Curso'')
 THROW 54003,''Clave primaria inesperada en CURSOS.'',1;
IF NOT EXISTS (SELECT 1 FROM sys.indexes i WHERE i.object_id=OBJECT_ID(''dbo.Ciclo'') AND i.is_primary_key=1 AND
 (SELECT STRING_AGG(CONVERT(nvarchar(max),c.name),'','') WITHIN GROUP (ORDER BY ic.key_ordinal) FROM sys.index_columns ic JOIN sys.columns c ON c.object_id=ic.object_id AND c.column_id=ic.column_id WHERE ic.object_id=i.object_id AND ic.index_id=i.index_id AND ic.key_ordinal>0)=''Cod_Ciclo'')
 THROW 54003,''Clave primaria inesperada en Ciclo.'',1;
IF NOT EXISTS (SELECT 1 FROM sys.indexes i WHERE i.object_id=OBJECT_ID(''dbo.Docente'') AND i.is_primary_key=1 AND
 (SELECT STRING_AGG(CONVERT(nvarchar(max),c.name),'','') WITHIN GROUP (ORDER BY ic.key_ordinal) FROM sys.index_columns ic JOIN sys.columns c ON c.object_id=ic.object_id AND c.column_id=ic.column_id WHERE ic.object_id=i.object_id AND ic.index_id=i.index_id AND ic.key_ordinal>0)=''DNI_Doc'')
 THROW 54003,''Clave primaria inesperada en Docente.'',1;
IF NOT EXISTS (SELECT 1 FROM sys.indexes i WHERE i.object_id=OBJECT_ID(''dbo.Docente_Asignatura'') AND i.is_primary_key=1 AND
 (SELECT STRING_AGG(CONVERT(nvarchar(max),c.name),'','') WITHIN GROUP (ORDER BY ic.key_ordinal) FROM sys.index_columns ic JOIN sys.columns c ON c.object_id=ic.object_id AND c.column_id=ic.column_id WHERE ic.object_id=i.object_id AND ic.index_id=i.index_id AND ic.key_ordinal>0)=''CURSOS_Cod_Curso,Docente_DNI_Doc'')
 THROW 54003,''Clave primaria inesperada en Docente_Asignatura.'',1;
IF NOT EXISTS (SELECT 1 FROM sys.indexes i WHERE i.object_id=OBJECT_ID(''dbo.ESTADO_CICLO'') AND i.is_primary_key=1 AND
 (SELECT STRING_AGG(CONVERT(nvarchar(max),c.name),'','') WITHIN GROUP (ORDER BY ic.key_ordinal) FROM sys.index_columns ic JOIN sys.columns c ON c.object_id=ic.object_id AND c.column_id=ic.column_id WHERE ic.object_id=i.object_id AND ic.index_id=i.index_id AND ic.key_ordinal>0)=''Cod_Estado_Ciclo'')
 THROW 54003,''Clave primaria inesperada en ESTADO_CICLO.'',1;
IF NOT EXISTS (SELECT 1 FROM sys.indexes i WHERE i.object_id=OBJECT_ID(''dbo.ESTADO_EXAMEN_GRUPO'') AND i.is_primary_key=1 AND
 (SELECT STRING_AGG(CONVERT(nvarchar(max),c.name),'','') WITHIN GROUP (ORDER BY ic.key_ordinal) FROM sys.index_columns ic JOIN sys.columns c ON c.object_id=ic.object_id AND c.column_id=ic.column_id WHERE ic.object_id=i.object_id AND ic.index_id=i.index_id AND ic.key_ordinal>0)=''Cod_Estado_Examen'')
 THROW 54003,''Clave primaria inesperada en ESTADO_EXAMEN_GRUPO.'',1;
IF NOT EXISTS (SELECT 1 FROM sys.indexes i WHERE i.object_id=OBJECT_ID(''dbo.ESTADO_MATRICULA'') AND i.is_primary_key=1 AND
 (SELECT STRING_AGG(CONVERT(nvarchar(max),c.name),'','') WITHIN GROUP (ORDER BY ic.key_ordinal) FROM sys.index_columns ic JOIN sys.columns c ON c.object_id=ic.object_id AND c.column_id=ic.column_id WHERE ic.object_id=i.object_id AND ic.index_id=i.index_id AND ic.key_ordinal>0)=''Cod_Estado_Matricula'')
 THROW 54003,''Clave primaria inesperada en ESTADO_MATRICULA.'',1;
IF NOT EXISTS (SELECT 1 FROM sys.indexes i WHERE i.object_id=OBJECT_ID(''dbo.ESTADO_PAGO'') AND i.is_primary_key=1 AND
 (SELECT STRING_AGG(CONVERT(nvarchar(max),c.name),'','') WITHIN GROUP (ORDER BY ic.key_ordinal) FROM sys.index_columns ic JOIN sys.columns c ON c.object_id=ic.object_id AND c.column_id=ic.column_id WHERE ic.object_id=i.object_id AND ic.index_id=i.index_id AND ic.key_ordinal>0)=''Cod_Estado'')
 THROW 54003,''Clave primaria inesperada en ESTADO_PAGO.'',1;
IF NOT EXISTS (SELECT 1 FROM sys.indexes i WHERE i.object_id=OBJECT_ID(''dbo.Examen'') AND i.is_primary_key=1 AND
 (SELECT STRING_AGG(CONVERT(nvarchar(max),c.name),'','') WITHIN GROUP (ORDER BY ic.key_ordinal) FROM sys.index_columns ic JOIN sys.columns c ON c.object_id=ic.object_id AND c.column_id=ic.column_id WHERE ic.object_id=i.object_id AND ic.index_id=i.index_id AND ic.key_ordinal>0)=''Cod_Examen'')
 THROW 54003,''Clave primaria inesperada en Examen.'',1;
IF NOT EXISTS (SELECT 1 FROM sys.indexes i WHERE i.object_id=OBJECT_ID(''dbo.Examen_Grupo'') AND i.is_primary_key=1 AND
 (SELECT STRING_AGG(CONVERT(nvarchar(max),c.name),'','') WITHIN GROUP (ORDER BY ic.key_ordinal) FROM sys.index_columns ic JOIN sys.columns c ON c.object_id=ic.object_id AND c.column_id=ic.column_id WHERE ic.object_id=i.object_id AND ic.index_id=i.index_id AND ic.key_ordinal>0)=''Cod_examen_grupo'')
 THROW 54003,''Clave primaria inesperada en Examen_Grupo.'',1;
IF NOT EXISTS (SELECT 1 FROM sys.indexes i WHERE i.object_id=OBJECT_ID(''dbo.Grupo'') AND i.is_primary_key=1 AND
 (SELECT STRING_AGG(CONVERT(nvarchar(max),c.name),'','') WITHIN GROUP (ORDER BY ic.key_ordinal) FROM sys.index_columns ic JOIN sys.columns c ON c.object_id=ic.object_id AND c.column_id=ic.column_id WHERE ic.object_id=i.object_id AND ic.index_id=i.index_id AND ic.key_ordinal>0)=''Cod_Grupo'')
 THROW 54003,''Clave primaria inesperada en Grupo.'',1;
IF NOT EXISTS (SELECT 1 FROM sys.indexes i WHERE i.object_id=OBJECT_ID(''dbo.Horario'') AND i.is_primary_key=1 AND
 (SELECT STRING_AGG(CONVERT(nvarchar(max),c.name),'','') WITHIN GROUP (ORDER BY ic.key_ordinal) FROM sys.index_columns ic JOIN sys.columns c ON c.object_id=ic.object_id AND c.column_id=ic.column_id WHERE ic.object_id=i.object_id AND ic.index_id=i.index_id AND ic.key_ordinal>0)=''Cod_Horario'')
 THROW 54003,''Clave primaria inesperada en Horario.'',1;
IF NOT EXISTS (SELECT 1 FROM sys.indexes i WHERE i.object_id=OBJECT_ID(''dbo.MATRICULA'') AND i.is_primary_key=1 AND
 (SELECT STRING_AGG(CONVERT(nvarchar(max),c.name),'','') WITHIN GROUP (ORDER BY ic.key_ordinal) FROM sys.index_columns ic JOIN sys.columns c ON c.object_id=ic.object_id AND c.column_id=ic.column_id WHERE ic.object_id=i.object_id AND ic.index_id=i.index_id AND ic.key_ordinal>0)=''Cod_Matricula'')
 THROW 54003,''Clave primaria inesperada en MATRICULA.'',1;
IF NOT EXISTS (SELECT 1 FROM sys.indexes i WHERE i.object_id=OBJECT_ID(''dbo.Nota_Examen'') AND i.is_primary_key=1 AND
 (SELECT STRING_AGG(CONVERT(nvarchar(max),c.name),'','') WITHIN GROUP (ORDER BY ic.key_ordinal) FROM sys.index_columns ic JOIN sys.columns c ON c.object_id=ic.object_id AND c.column_id=ic.column_id WHERE ic.object_id=i.object_id AND ic.index_id=i.index_id AND ic.key_ordinal>0)=''Cod_Nota'')
 THROW 54003,''Clave primaria inesperada en Nota_Examen.'',1;
IF NOT EXISTS (SELECT 1 FROM sys.indexes i WHERE i.object_id=OBJECT_ID(''dbo.PARENTESCO'') AND i.is_primary_key=1 AND
 (SELECT STRING_AGG(CONVERT(nvarchar(max),c.name),'','') WITHIN GROUP (ORDER BY ic.key_ordinal) FROM sys.index_columns ic JOIN sys.columns c ON c.object_id=ic.object_id AND c.column_id=ic.column_id WHERE ic.object_id=i.object_id AND ic.index_id=i.index_id AND ic.key_ordinal>0)=''Cod_Paren'')
 THROW 54003,''Clave primaria inesperada en PARENTESCO.'',1;
IF NOT EXISTS (SELECT 1 FROM sys.indexes i WHERE i.object_id=OBJECT_ID(''dbo.Pago'') AND i.is_primary_key=1 AND
 (SELECT STRING_AGG(CONVERT(nvarchar(max),c.name),'','') WITHIN GROUP (ORDER BY ic.key_ordinal) FROM sys.index_columns ic JOIN sys.columns c ON c.object_id=ic.object_id AND c.column_id=ic.column_id WHERE ic.object_id=i.object_id AND ic.index_id=i.index_id AND ic.key_ordinal>0)=''Cod_Pago'')
 THROW 54003,''Clave primaria inesperada en Pago.'',1;
IF NOT EXISTS (SELECT 1 FROM sys.indexes i WHERE i.object_id=OBJECT_ID(''dbo.Programa'') AND i.is_primary_key=1 AND
 (SELECT STRING_AGG(CONVERT(nvarchar(max),c.name),'','') WITHIN GROUP (ORDER BY ic.key_ordinal) FROM sys.index_columns ic JOIN sys.columns c ON c.object_id=ic.object_id AND c.column_id=ic.column_id WHERE ic.object_id=i.object_id AND ic.index_id=i.index_id AND ic.key_ordinal>0)=''Cod_Programa'')
 THROW 54003,''Clave primaria inesperada en Programa.'',1;
IF NOT EXISTS (SELECT 1 FROM sys.indexes i WHERE i.object_id=OBJECT_ID(''dbo.ROL'') AND i.is_primary_key=1 AND
 (SELECT STRING_AGG(CONVERT(nvarchar(max),c.name),'','') WITHIN GROUP (ORDER BY ic.key_ordinal) FROM sys.index_columns ic JOIN sys.columns c ON c.object_id=ic.object_id AND c.column_id=ic.column_id WHERE ic.object_id=i.object_id AND ic.index_id=i.index_id AND ic.key_ordinal>0)=''Cod_Rol'')
 THROW 54003,''Clave primaria inesperada en ROL.'',1;
IF NOT EXISTS (SELECT 1 FROM sys.indexes i WHERE i.object_id=OBJECT_ID(''dbo.TIPO_BLOQUE'') AND i.is_primary_key=1 AND
 (SELECT STRING_AGG(CONVERT(nvarchar(max),c.name),'','') WITHIN GROUP (ORDER BY ic.key_ordinal) FROM sys.index_columns ic JOIN sys.columns c ON c.object_id=ic.object_id AND c.column_id=ic.column_id WHERE ic.object_id=i.object_id AND ic.index_id=i.index_id AND ic.key_ordinal>0)=''Cod_Tipo'')
 THROW 54003,''Clave primaria inesperada en TIPO_BLOQUE.'',1;
IF NOT EXISTS (SELECT 1 FROM sys.indexes i WHERE i.object_id=OBJECT_ID(''dbo.Turno'') AND i.is_primary_key=1 AND
 (SELECT STRING_AGG(CONVERT(nvarchar(max),c.name),'','') WITHIN GROUP (ORDER BY ic.key_ordinal) FROM sys.index_columns ic JOIN sys.columns c ON c.object_id=ic.object_id AND c.column_id=ic.column_id WHERE ic.object_id=i.object_id AND ic.index_id=i.index_id AND ic.key_ordinal>0)=''Cod_Turno'')
 THROW 54003,''Clave primaria inesperada en Turno.'',1;
IF NOT EXISTS (SELECT 1 FROM sys.indexes i WHERE i.object_id=OBJECT_ID(''dbo.Usuario'') AND i.is_primary_key=1 AND
 (SELECT STRING_AGG(CONVERT(nvarchar(max),c.name),'','') WITHIN GROUP (ORDER BY ic.key_ordinal) FROM sys.index_columns ic JOIN sys.columns c ON c.object_id=ic.object_id AND c.column_id=ic.column_id WHERE ic.object_id=i.object_id AND ic.index_id=i.index_id AND ic.key_ordinal>0)=''Cod_Usuario'')
 THROW 54003,''Clave primaria inesperada en Usuario.'',1;
IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys fk WHERE fk.parent_object_id=OBJECT_ID(''dbo.ALUMNO'') AND fk.referenced_object_id=OBJECT_ID(''dbo.CARRERA'') AND fk.is_disabled=0 AND fk.is_not_trusted=0 AND
 (SELECT STRING_AGG(CONVERT(nvarchar(max),c.name+''>''+rc.name),'','') WITHIN GROUP (ORDER BY fc.constraint_column_id) FROM sys.foreign_key_columns fc JOIN sys.columns c ON c.object_id=fc.parent_object_id AND c.column_id=fc.parent_column_id JOIN sys.columns rc ON rc.object_id=fc.referenced_object_id AND rc.column_id=fc.referenced_column_id WHERE fc.constraint_object_id=fk.object_id)=''CARRERA_Cod_Carrera>Cod_Carrera'')
 THROW 54004,''Relacion ausente o inesperada: ALUMNO a CARRERA.'',1;
IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys fk WHERE fk.parent_object_id=OBJECT_ID(''dbo.ALUMNO'') AND fk.referenced_object_id=OBJECT_ID(''dbo.PARENTESCO'') AND fk.is_disabled=0 AND fk.is_not_trusted=0 AND
 (SELECT STRING_AGG(CONVERT(nvarchar(max),c.name+''>''+rc.name),'','') WITHIN GROUP (ORDER BY fc.constraint_column_id) FROM sys.foreign_key_columns fc JOIN sys.columns c ON c.object_id=fc.parent_object_id AND c.column_id=fc.parent_column_id JOIN sys.columns rc ON rc.object_id=fc.referenced_object_id AND rc.column_id=fc.referenced_column_id WHERE fc.constraint_object_id=fk.object_id)=''PARENTESCO_Cod_Paren>Cod_Paren'')
 THROW 54004,''Relacion ausente o inesperada: ALUMNO a PARENTESCO.'',1;
IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys fk WHERE fk.parent_object_id=OBJECT_ID(''dbo.Ciclo'') AND fk.referenced_object_id=OBJECT_ID(''dbo.ESTADO_CICLO'') AND fk.is_disabled=0 AND fk.is_not_trusted=0 AND
 (SELECT STRING_AGG(CONVERT(nvarchar(max),c.name+''>''+rc.name),'','') WITHIN GROUP (ORDER BY fc.constraint_column_id) FROM sys.foreign_key_columns fc JOIN sys.columns c ON c.object_id=fc.parent_object_id AND c.column_id=fc.parent_column_id JOIN sys.columns rc ON rc.object_id=fc.referenced_object_id AND rc.column_id=fc.referenced_column_id WHERE fc.constraint_object_id=fk.object_id)=''ESTADO_CICLO_Cod_Estado>Cod_Estado_Ciclo'')
 THROW 54004,''Relacion ausente o inesperada: Ciclo a ESTADO_CICLO.'',1;
IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys fk WHERE fk.parent_object_id=OBJECT_ID(''dbo.Ciclo'') AND fk.referenced_object_id=OBJECT_ID(''dbo.Programa'') AND fk.is_disabled=0 AND fk.is_not_trusted=0 AND
 (SELECT STRING_AGG(CONVERT(nvarchar(max),c.name+''>''+rc.name),'','') WITHIN GROUP (ORDER BY fc.constraint_column_id) FROM sys.foreign_key_columns fc JOIN sys.columns c ON c.object_id=fc.parent_object_id AND c.column_id=fc.parent_column_id JOIN sys.columns rc ON rc.object_id=fc.referenced_object_id AND rc.column_id=fc.referenced_column_id WHERE fc.constraint_object_id=fk.object_id)=''Programa_Cod_Programa>Cod_Programa'')
 THROW 54004,''Relacion ausente o inesperada: Ciclo a Programa.'',1;
IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys fk WHERE fk.parent_object_id=OBJECT_ID(''dbo.Docente_Asignatura'') AND fk.referenced_object_id=OBJECT_ID(''dbo.Docente'') AND fk.is_disabled=0 AND fk.is_not_trusted=0 AND
 (SELECT STRING_AGG(CONVERT(nvarchar(max),c.name+''>''+rc.name),'','') WITHIN GROUP (ORDER BY fc.constraint_column_id) FROM sys.foreign_key_columns fc JOIN sys.columns c ON c.object_id=fc.parent_object_id AND c.column_id=fc.parent_column_id JOIN sys.columns rc ON rc.object_id=fc.referenced_object_id AND rc.column_id=fc.referenced_column_id WHERE fc.constraint_object_id=fk.object_id)=''Docente_DNI_Doc>DNI_Doc'')
 THROW 54004,''Relacion ausente o inesperada: Docente_Asignatura a Docente.'',1;
IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys fk WHERE fk.parent_object_id=OBJECT_ID(''dbo.Docente_Asignatura'') AND fk.referenced_object_id=OBJECT_ID(''dbo.CURSOS'') AND fk.is_disabled=0 AND fk.is_not_trusted=0 AND
 (SELECT STRING_AGG(CONVERT(nvarchar(max),c.name+''>''+rc.name),'','') WITHIN GROUP (ORDER BY fc.constraint_column_id) FROM sys.foreign_key_columns fc JOIN sys.columns c ON c.object_id=fc.parent_object_id AND c.column_id=fc.parent_column_id JOIN sys.columns rc ON rc.object_id=fc.referenced_object_id AND rc.column_id=fc.referenced_column_id WHERE fc.constraint_object_id=fk.object_id)=''CURSOS_Cod_Curso>Cod_Curso'')
 THROW 54004,''Relacion ausente o inesperada: Docente_Asignatura a CURSOS.'',1;
IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys fk WHERE fk.parent_object_id=OBJECT_ID(''dbo.Examen_Grupo'') AND fk.referenced_object_id=OBJECT_ID(''dbo.ESTADO_EXAMEN_GRUPO'') AND fk.is_disabled=0 AND fk.is_not_trusted=0 AND
 (SELECT STRING_AGG(CONVERT(nvarchar(max),c.name+''>''+rc.name),'','') WITHIN GROUP (ORDER BY fc.constraint_column_id) FROM sys.foreign_key_columns fc JOIN sys.columns c ON c.object_id=fc.parent_object_id AND c.column_id=fc.parent_column_id JOIN sys.columns rc ON rc.object_id=fc.referenced_object_id AND rc.column_id=fc.referenced_column_id WHERE fc.constraint_object_id=fk.object_id)=''ESTADO_EXAMEN_GRUPO_Cod_Estado_Examen>Cod_Estado_Examen'')
 THROW 54004,''Relacion ausente o inesperada: Examen_Grupo a ESTADO_EXAMEN_GRUPO.'',1;
IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys fk WHERE fk.parent_object_id=OBJECT_ID(''dbo.Examen_Grupo'') AND fk.referenced_object_id=OBJECT_ID(''dbo.Examen'') AND fk.is_disabled=0 AND fk.is_not_trusted=0 AND
 (SELECT STRING_AGG(CONVERT(nvarchar(max),c.name+''>''+rc.name),'','') WITHIN GROUP (ORDER BY fc.constraint_column_id) FROM sys.foreign_key_columns fc JOIN sys.columns c ON c.object_id=fc.parent_object_id AND c.column_id=fc.parent_column_id JOIN sys.columns rc ON rc.object_id=fc.referenced_object_id AND rc.column_id=fc.referenced_column_id WHERE fc.constraint_object_id=fk.object_id)=''Examen_Cod_Examen>Cod_Examen'')
 THROW 54004,''Relacion ausente o inesperada: Examen_Grupo a Examen.'',1;
IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys fk WHERE fk.parent_object_id=OBJECT_ID(''dbo.Examen_Grupo'') AND fk.referenced_object_id=OBJECT_ID(''dbo.Grupo'') AND fk.is_disabled=0 AND fk.is_not_trusted=0 AND
 (SELECT STRING_AGG(CONVERT(nvarchar(max),c.name+''>''+rc.name),'','') WITHIN GROUP (ORDER BY fc.constraint_column_id) FROM sys.foreign_key_columns fc JOIN sys.columns c ON c.object_id=fc.parent_object_id AND c.column_id=fc.parent_column_id JOIN sys.columns rc ON rc.object_id=fc.referenced_object_id AND rc.column_id=fc.referenced_column_id WHERE fc.constraint_object_id=fk.object_id)=''Grupo_Cod_Grupo>Cod_Grupo'')
 THROW 54004,''Relacion ausente o inesperada: Examen_Grupo a Grupo.'',1;
IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys fk WHERE fk.parent_object_id=OBJECT_ID(''dbo.Grupo'') AND fk.referenced_object_id=OBJECT_ID(''dbo.Aula'') AND fk.is_disabled=0 AND fk.is_not_trusted=0 AND
 (SELECT STRING_AGG(CONVERT(nvarchar(max),c.name+''>''+rc.name),'','') WITHIN GROUP (ORDER BY fc.constraint_column_id) FROM sys.foreign_key_columns fc JOIN sys.columns c ON c.object_id=fc.parent_object_id AND c.column_id=fc.parent_column_id JOIN sys.columns rc ON rc.object_id=fc.referenced_object_id AND rc.column_id=fc.referenced_column_id WHERE fc.constraint_object_id=fk.object_id)=''Aula_Cod_Aula>Cod_Aula'')
 THROW 54004,''Relacion ausente o inesperada: Grupo a Aula.'',1;
IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys fk WHERE fk.parent_object_id=OBJECT_ID(''dbo.Grupo'') AND fk.referenced_object_id=OBJECT_ID(''dbo.Ciclo'') AND fk.is_disabled=0 AND fk.is_not_trusted=0 AND
 (SELECT STRING_AGG(CONVERT(nvarchar(max),c.name+''>''+rc.name),'','') WITHIN GROUP (ORDER BY fc.constraint_column_id) FROM sys.foreign_key_columns fc JOIN sys.columns c ON c.object_id=fc.parent_object_id AND c.column_id=fc.parent_column_id JOIN sys.columns rc ON rc.object_id=fc.referenced_object_id AND rc.column_id=fc.referenced_column_id WHERE fc.constraint_object_id=fk.object_id)=''Ciclo_Cod_Ciclo>Cod_Ciclo'')
 THROW 54004,''Relacion ausente o inesperada: Grupo a Ciclo.'',1;
IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys fk WHERE fk.parent_object_id=OBJECT_ID(''dbo.Grupo'') AND fk.referenced_object_id=OBJECT_ID(''dbo.Turno'') AND fk.is_disabled=0 AND fk.is_not_trusted=0 AND
 (SELECT STRING_AGG(CONVERT(nvarchar(max),c.name+''>''+rc.name),'','') WITHIN GROUP (ORDER BY fc.constraint_column_id) FROM sys.foreign_key_columns fc JOIN sys.columns c ON c.object_id=fc.parent_object_id AND c.column_id=fc.parent_column_id JOIN sys.columns rc ON rc.object_id=fc.referenced_object_id AND rc.column_id=fc.referenced_column_id WHERE fc.constraint_object_id=fk.object_id)=''Turno_Cod_Turno>Cod_Turno'')
 THROW 54004,''Relacion ausente o inesperada: Grupo a Turno.'',1;
IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys fk WHERE fk.parent_object_id=OBJECT_ID(''dbo.Horario'') AND fk.referenced_object_id=OBJECT_ID(''dbo.Docente_Asignatura'') AND fk.is_disabled=0 AND fk.is_not_trusted=0 AND
 (SELECT STRING_AGG(CONVERT(nvarchar(max),c.name+''>''+rc.name),'','') WITHIN GROUP (ORDER BY fc.constraint_column_id) FROM sys.foreign_key_columns fc JOIN sys.columns c ON c.object_id=fc.parent_object_id AND c.column_id=fc.parent_column_id JOIN sys.columns rc ON rc.object_id=fc.referenced_object_id AND rc.column_id=fc.referenced_column_id WHERE fc.constraint_object_id=fk.object_id)=''Docente_Asignatura_CURSOS_Cod_Curso>CURSOS_Cod_Curso,Docente_Asignatura_Docente_DNI_Doc>Docente_DNI_Doc'')
 THROW 54004,''Relacion ausente o inesperada: Horario a Docente_Asignatura.'',1;
IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys fk WHERE fk.parent_object_id=OBJECT_ID(''dbo.Horario'') AND fk.referenced_object_id=OBJECT_ID(''dbo.Grupo'') AND fk.is_disabled=0 AND fk.is_not_trusted=0 AND
 (SELECT STRING_AGG(CONVERT(nvarchar(max),c.name+''>''+rc.name),'','') WITHIN GROUP (ORDER BY fc.constraint_column_id) FROM sys.foreign_key_columns fc JOIN sys.columns c ON c.object_id=fc.parent_object_id AND c.column_id=fc.parent_column_id JOIN sys.columns rc ON rc.object_id=fc.referenced_object_id AND rc.column_id=fc.referenced_column_id WHERE fc.constraint_object_id=fk.object_id)=''Grupo_Cod_Grupo>Cod_Grupo'')
 THROW 54004,''Relacion ausente o inesperada: Horario a Grupo.'',1;
IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys fk WHERE fk.parent_object_id=OBJECT_ID(''dbo.Horario'') AND fk.referenced_object_id=OBJECT_ID(''dbo.TIPO_BLOQUE'') AND fk.is_disabled=0 AND fk.is_not_trusted=0 AND
 (SELECT STRING_AGG(CONVERT(nvarchar(max),c.name+''>''+rc.name),'','') WITHIN GROUP (ORDER BY fc.constraint_column_id) FROM sys.foreign_key_columns fc JOIN sys.columns c ON c.object_id=fc.parent_object_id AND c.column_id=fc.parent_column_id JOIN sys.columns rc ON rc.object_id=fc.referenced_object_id AND rc.column_id=fc.referenced_column_id WHERE fc.constraint_object_id=fk.object_id)=''TIPO_BLOQUE_Cod_Tipo>Cod_Tipo'')
 THROW 54004,''Relacion ausente o inesperada: Horario a TIPO_BLOQUE.'',1;
IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys fk WHERE fk.parent_object_id=OBJECT_ID(''dbo.MATRICULA'') AND fk.referenced_object_id=OBJECT_ID(''dbo.ALUMNO'') AND fk.is_disabled=0 AND fk.is_not_trusted=0 AND
 (SELECT STRING_AGG(CONVERT(nvarchar(max),c.name+''>''+rc.name),'','') WITHIN GROUP (ORDER BY fc.constraint_column_id) FROM sys.foreign_key_columns fc JOIN sys.columns c ON c.object_id=fc.parent_object_id AND c.column_id=fc.parent_column_id JOIN sys.columns rc ON rc.object_id=fc.referenced_object_id AND rc.column_id=fc.referenced_column_id WHERE fc.constraint_object_id=fk.object_id)=''ALUMNO_DNI_Alu>DNI_Alu'')
 THROW 54004,''Relacion ausente o inesperada: MATRICULA a ALUMNO.'',1;
IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys fk WHERE fk.parent_object_id=OBJECT_ID(''dbo.MATRICULA'') AND fk.referenced_object_id=OBJECT_ID(''dbo.ESTADO_MATRICULA'') AND fk.is_disabled=0 AND fk.is_not_trusted=0 AND
 (SELECT STRING_AGG(CONVERT(nvarchar(max),c.name+''>''+rc.name),'','') WITHIN GROUP (ORDER BY fc.constraint_column_id) FROM sys.foreign_key_columns fc JOIN sys.columns c ON c.object_id=fc.parent_object_id AND c.column_id=fc.parent_column_id JOIN sys.columns rc ON rc.object_id=fc.referenced_object_id AND rc.column_id=fc.referenced_column_id WHERE fc.constraint_object_id=fk.object_id)=''ESTADO_MATRICULA_Cod_Estado_Matricula>Cod_Estado_Matricula'')
 THROW 54004,''Relacion ausente o inesperada: MATRICULA a ESTADO_MATRICULA.'',1;
IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys fk WHERE fk.parent_object_id=OBJECT_ID(''dbo.MATRICULA'') AND fk.referenced_object_id=OBJECT_ID(''dbo.Grupo'') AND fk.is_disabled=0 AND fk.is_not_trusted=0 AND
 (SELECT STRING_AGG(CONVERT(nvarchar(max),c.name+''>''+rc.name),'','') WITHIN GROUP (ORDER BY fc.constraint_column_id) FROM sys.foreign_key_columns fc JOIN sys.columns c ON c.object_id=fc.parent_object_id AND c.column_id=fc.parent_column_id JOIN sys.columns rc ON rc.object_id=fc.referenced_object_id AND rc.column_id=fc.referenced_column_id WHERE fc.constraint_object_id=fk.object_id)=''Grupo_Cod_Grupo>Cod_Grupo'')
 THROW 54004,''Relacion ausente o inesperada: MATRICULA a Grupo.'',1;
IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys fk WHERE fk.parent_object_id=OBJECT_ID(''dbo.Nota_Examen'') AND fk.referenced_object_id=OBJECT_ID(''dbo.Examen_Grupo'') AND fk.is_disabled=0 AND fk.is_not_trusted=0 AND
 (SELECT STRING_AGG(CONVERT(nvarchar(max),c.name+''>''+rc.name),'','') WITHIN GROUP (ORDER BY fc.constraint_column_id) FROM sys.foreign_key_columns fc JOIN sys.columns c ON c.object_id=fc.parent_object_id AND c.column_id=fc.parent_column_id JOIN sys.columns rc ON rc.object_id=fc.referenced_object_id AND rc.column_id=fc.referenced_column_id WHERE fc.constraint_object_id=fk.object_id)=''Examen_Grupo_Cod_examen_grupo>Cod_examen_grupo,Grupo_Cod_Grupo>Grupo_Cod_Grupo'')
 THROW 54004,''Relacion ausente o inesperada: Nota_Examen a Examen_Grupo.'',1;
IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys fk WHERE fk.parent_object_id=OBJECT_ID(''dbo.Nota_Examen'') AND fk.referenced_object_id=OBJECT_ID(''dbo.MATRICULA'') AND fk.is_disabled=0 AND fk.is_not_trusted=0 AND
 (SELECT STRING_AGG(CONVERT(nvarchar(max),c.name+''>''+rc.name),'','') WITHIN GROUP (ORDER BY fc.constraint_column_id) FROM sys.foreign_key_columns fc JOIN sys.columns c ON c.object_id=fc.parent_object_id AND c.column_id=fc.parent_column_id JOIN sys.columns rc ON rc.object_id=fc.referenced_object_id AND rc.column_id=fc.referenced_column_id WHERE fc.constraint_object_id=fk.object_id)=''MATRICULA_Cod_Matricula>Cod_Matricula,Grupo_Cod_Grupo>Grupo_Cod_Grupo'')
 THROW 54004,''Relacion ausente o inesperada: Nota_Examen a MATRICULA.'',1;
IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys fk WHERE fk.parent_object_id=OBJECT_ID(''dbo.Pago'') AND fk.referenced_object_id=OBJECT_ID(''dbo.ALUMNO'') AND fk.is_disabled=0 AND fk.is_not_trusted=0 AND
 (SELECT STRING_AGG(CONVERT(nvarchar(max),c.name+''>''+rc.name),'','') WITHIN GROUP (ORDER BY fc.constraint_column_id) FROM sys.foreign_key_columns fc JOIN sys.columns c ON c.object_id=fc.parent_object_id AND c.column_id=fc.parent_column_id JOIN sys.columns rc ON rc.object_id=fc.referenced_object_id AND rc.column_id=fc.referenced_column_id WHERE fc.constraint_object_id=fk.object_id)=''ALUMNO_DNI_Alu>DNI_Alu'')
 THROW 54004,''Relacion ausente o inesperada: Pago a ALUMNO.'',1;
IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys fk WHERE fk.parent_object_id=OBJECT_ID(''dbo.Pago'') AND fk.referenced_object_id=OBJECT_ID(''dbo.CONCEPTO_PAGO'') AND fk.is_disabled=0 AND fk.is_not_trusted=0 AND
 (SELECT STRING_AGG(CONVERT(nvarchar(max),c.name+''>''+rc.name),'','') WITHIN GROUP (ORDER BY fc.constraint_column_id) FROM sys.foreign_key_columns fc JOIN sys.columns c ON c.object_id=fc.parent_object_id AND c.column_id=fc.parent_column_id JOIN sys.columns rc ON rc.object_id=fc.referenced_object_id AND rc.column_id=fc.referenced_column_id WHERE fc.constraint_object_id=fk.object_id)=''CONCEPTO_PAGO_Cod_Concepto>Cod_Concepto'')
 THROW 54004,''Relacion ausente o inesperada: Pago a CONCEPTO_PAGO.'',1;
IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys fk WHERE fk.parent_object_id=OBJECT_ID(''dbo.Pago'') AND fk.referenced_object_id=OBJECT_ID(''dbo.ESTADO_PAGO'') AND fk.is_disabled=0 AND fk.is_not_trusted=0 AND
 (SELECT STRING_AGG(CONVERT(nvarchar(max),c.name+''>''+rc.name),'','') WITHIN GROUP (ORDER BY fc.constraint_column_id) FROM sys.foreign_key_columns fc JOIN sys.columns c ON c.object_id=fc.parent_object_id AND c.column_id=fc.parent_column_id JOIN sys.columns rc ON rc.object_id=fc.referenced_object_id AND rc.column_id=fc.referenced_column_id WHERE fc.constraint_object_id=fk.object_id)=''ESTADO_PAGO_Cod_Estado>Cod_Estado'')
 THROW 54004,''Relacion ausente o inesperada: Pago a ESTADO_PAGO.'',1;
IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys fk WHERE fk.parent_object_id=OBJECT_ID(''dbo.Pago'') AND fk.referenced_object_id=OBJECT_ID(''dbo.MATRICULA'') AND fk.is_disabled=0 AND fk.is_not_trusted=0 AND
 (SELECT STRING_AGG(CONVERT(nvarchar(max),c.name+''>''+rc.name),'','') WITHIN GROUP (ORDER BY fc.constraint_column_id) FROM sys.foreign_key_columns fc JOIN sys.columns c ON c.object_id=fc.parent_object_id AND c.column_id=fc.parent_column_id JOIN sys.columns rc ON rc.object_id=fc.referenced_object_id AND rc.column_id=fc.referenced_column_id WHERE fc.constraint_object_id=fk.object_id)=''MATRICULA_Cod_Matricula>Cod_Matricula,ALUMNO_DNI_Alu>ALUMNO_DNI_Alu'')
 THROW 54004,''Relacion ausente o inesperada: Pago a MATRICULA.'',1;
IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys fk WHERE fk.parent_object_id=OBJECT_ID(''dbo.Pago'') AND fk.referenced_object_id=OBJECT_ID(''dbo.Usuario'') AND fk.is_disabled=0 AND fk.is_not_trusted=0 AND
 (SELECT STRING_AGG(CONVERT(nvarchar(max),c.name+''>''+rc.name),'','') WITHIN GROUP (ORDER BY fc.constraint_column_id) FROM sys.foreign_key_columns fc JOIN sys.columns c ON c.object_id=fc.parent_object_id AND c.column_id=fc.parent_column_id JOIN sys.columns rc ON rc.object_id=fc.referenced_object_id AND rc.column_id=fc.referenced_column_id WHERE fc.constraint_object_id=fk.object_id)=''Usuario_Cod_Usuario>Cod_Usuario'')
 THROW 54004,''Relacion ausente o inesperada: Pago a Usuario.'',1;
IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys fk WHERE fk.parent_object_id=OBJECT_ID(''dbo.Usuario'') AND fk.referenced_object_id=OBJECT_ID(''dbo.ALUMNO'') AND fk.is_disabled=0 AND fk.is_not_trusted=0 AND
 (SELECT STRING_AGG(CONVERT(nvarchar(max),c.name+''>''+rc.name),'','') WITHIN GROUP (ORDER BY fc.constraint_column_id) FROM sys.foreign_key_columns fc JOIN sys.columns c ON c.object_id=fc.parent_object_id AND c.column_id=fc.parent_column_id JOIN sys.columns rc ON rc.object_id=fc.referenced_object_id AND rc.column_id=fc.referenced_column_id WHERE fc.constraint_object_id=fk.object_id)=''ALUMNO_DNI_Alu>DNI_Alu'')
 THROW 54004,''Relacion ausente o inesperada: Usuario a ALUMNO.'',1;
IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys fk WHERE fk.parent_object_id=OBJECT_ID(''dbo.Usuario'') AND fk.referenced_object_id=OBJECT_ID(''dbo.ROL'') AND fk.is_disabled=0 AND fk.is_not_trusted=0 AND
 (SELECT STRING_AGG(CONVERT(nvarchar(max),c.name+''>''+rc.name),'','') WITHIN GROUP (ORDER BY fc.constraint_column_id) FROM sys.foreign_key_columns fc JOIN sys.columns c ON c.object_id=fc.parent_object_id AND c.column_id=fc.parent_column_id JOIN sys.columns rc ON rc.object_id=fc.referenced_object_id AND rc.column_id=fc.referenced_column_id WHERE fc.constraint_object_id=fk.object_id)=''ROL_Cod_Rol>Cod_Rol'')
 THROW 54004,''Relacion ausente o inesperada: Usuario a ROL.'',1;
IF OBJECT_ID(''dbo.CK_ALUMNO_DNI'',''C'') IS NULL THROW 54009,''Falta restriccion original: CK_ALUMNO_DNI. Comparar el diagnostico antes de continuar.'',1;
IF OBJECT_ID(''dbo.CK_ALUMNO_DNI_Apoderado'',''C'') IS NULL THROW 54009,''Falta restriccion original: CK_ALUMNO_DNI_Apoderado. Comparar el diagnostico antes de continuar.'',1;
IF OBJECT_ID(''dbo.UQ_Aula_Nombre'',''UQ'') IS NULL THROW 54009,''Falta restriccion original: UQ_Aula_Nombre. Comparar el diagnostico antes de continuar.'',1;
IF OBJECT_ID(''dbo.CK_Aula_Capacidad'',''C'') IS NULL THROW 54009,''Falta restriccion original: CK_Aula_Capacidad. Comparar el diagnostico antes de continuar.'',1;
IF OBJECT_ID(''dbo.UQ_CARRERA_Nombre'',''UQ'') IS NULL THROW 54009,''Falta restriccion original: UQ_CARRERA_Nombre. Comparar el diagnostico antes de continuar.'',1;
IF OBJECT_ID(''dbo.UQ_CONCEPTO_PAGO_Nombre'',''UQ'') IS NULL THROW 54009,''Falta restriccion original: UQ_CONCEPTO_PAGO_Nombre. Comparar el diagnostico antes de continuar.'',1;
IF OBJECT_ID(''dbo.CK_CONCEPTO_PAGO_Codigos'',''C'') IS NULL THROW 54009,''Falta restriccion original: CK_CONCEPTO_PAGO_Codigos. Comparar el diagnostico antes de continuar.'',1;
IF OBJECT_ID(''dbo.UQ_CURSOS_Nombre'',''UQ'') IS NULL THROW 54009,''Falta restriccion original: UQ_CURSOS_Nombre. Comparar el diagnostico antes de continuar.'',1;
IF OBJECT_ID(''dbo.UQ_Ciclo_Edicion'',''UQ'') IS NULL THROW 54009,''Falta restriccion original: UQ_Ciclo_Edicion. Comparar el diagnostico antes de continuar.'',1;
IF OBJECT_ID(''dbo.CK_Ciclo_Modalidad'',''C'') IS NULL THROW 54009,''Falta restriccion original: CK_Ciclo_Modalidad. Comparar el diagnostico antes de continuar.'',1;
IF OBJECT_ID(''dbo.CK_Ciclo_Fechas'',''C'') IS NULL THROW 54009,''Falta restriccion original: CK_Ciclo_Fechas. Comparar el diagnostico antes de continuar.'',1;
IF OBJECT_ID(''dbo.CK_Ciclo_Precio'',''C'') IS NULL THROW 54009,''Falta restriccion original: CK_Ciclo_Precio. Comparar el diagnostico antes de continuar.'',1;
IF OBJECT_ID(''dbo.CK_Docente_DNI'',''C'') IS NULL THROW 54009,''Falta restriccion original: CK_Docente_DNI. Comparar el diagnostico antes de continuar.'',1;
IF OBJECT_ID(''dbo.UQ_ESTADO_CICLO_Nombre'',''UQ'') IS NULL THROW 54009,''Falta restriccion original: UQ_ESTADO_CICLO_Nombre. Comparar el diagnostico antes de continuar.'',1;
IF OBJECT_ID(''dbo.CK_ESTADO_CICLO_Codigos'',''C'') IS NULL THROW 54009,''Falta restriccion original: CK_ESTADO_CICLO_Codigos. Comparar el diagnostico antes de continuar.'',1;
IF OBJECT_ID(''dbo.UQ_ESTADO_EXAMEN_GRUPO_Nombre'',''UQ'') IS NULL THROW 54009,''Falta restriccion original: UQ_ESTADO_EXAMEN_GRUPO_Nombre. Comparar el diagnostico antes de continuar.'',1;
IF OBJECT_ID(''dbo.CK_ESTADO_EXAMEN_GRUPO_Codigos'',''C'') IS NULL THROW 54009,''Falta restriccion original: CK_ESTADO_EXAMEN_GRUPO_Codigos. Comparar el diagnostico antes de continuar.'',1;
IF OBJECT_ID(''dbo.UQ_ESTADO_MATRICULA_Nombre'',''UQ'') IS NULL THROW 54009,''Falta restriccion original: UQ_ESTADO_MATRICULA_Nombre. Comparar el diagnostico antes de continuar.'',1;
IF OBJECT_ID(''dbo.CK_ESTADO_MATRICULA_Codigos'',''C'') IS NULL THROW 54009,''Falta restriccion original: CK_ESTADO_MATRICULA_Codigos. Comparar el diagnostico antes de continuar.'',1;
IF OBJECT_ID(''dbo.UQ_ESTADO_PAGO_Nombre'',''UQ'') IS NULL THROW 54009,''Falta restriccion original: UQ_ESTADO_PAGO_Nombre. Comparar el diagnostico antes de continuar.'',1;
IF OBJECT_ID(''dbo.CK_ESTADO_PAGO_Codigos'',''C'') IS NULL THROW 54009,''Falta restriccion original: CK_ESTADO_PAGO_Codigos. Comparar el diagnostico antes de continuar.'',1;
IF OBJECT_ID(''dbo.CK_Examen_Puntaje'',''C'') IS NULL THROW 54009,''Falta restriccion original: CK_Examen_Puntaje. Comparar el diagnostico antes de continuar.'',1;
IF OBJECT_ID(''dbo.UQ_ExamenGrupo_ExamenGrupo'',''UQ'') IS NULL THROW 54009,''Falta restriccion original: UQ_ExamenGrupo_ExamenGrupo. Comparar el diagnostico antes de continuar.'',1;
IF OBJECT_ID(''dbo.UQ_ExamenGrupo_IdGrupo'',''UQ'') IS NULL THROW 54009,''Falta restriccion original: UQ_ExamenGrupo_IdGrupo. Comparar el diagnostico antes de continuar.'',1;
IF OBJECT_ID(''dbo.CK_ExamenGrupo_Duracion'',''C'') IS NULL THROW 54009,''Falta restriccion original: CK_ExamenGrupo_Duracion. Comparar el diagnostico antes de continuar.'',1;
IF OBJECT_ID(''dbo.CK_ExamenGrupo_Estado'',''C'') IS NULL THROW 54009,''Falta restriccion original: CK_ExamenGrupo_Estado. Comparar el diagnostico antes de continuar.'',1;
IF OBJECT_ID(''dbo.UQ_Grupo_Ciclo_Nombre'',''UQ'') IS NULL THROW 54009,''Falta restriccion original: UQ_Grupo_Ciclo_Nombre. Comparar el diagnostico antes de continuar.'',1;
IF OBJECT_ID(''dbo.CK_Grupo_Cupo'',''C'') IS NULL THROW 54009,''Falta restriccion original: CK_Grupo_Cupo. Comparar el diagnostico antes de continuar.'',1;
IF OBJECT_ID(''dbo.CK_Horario_Dia'',''C'') IS NULL THROW 54009,''Falta restriccion original: CK_Horario_Dia. Comparar el diagnostico antes de continuar.'',1;
IF OBJECT_ID(''dbo.CK_Horario_Horas'',''C'') IS NULL THROW 54009,''Falta restriccion original: CK_Horario_Horas. Comparar el diagnostico antes de continuar.'',1;
IF OBJECT_ID(''dbo.CK_Horario_Bloque'',''C'') IS NULL THROW 54009,''Falta restriccion original: CK_Horario_Bloque. Comparar el diagnostico antes de continuar.'',1;
IF OBJECT_ID(''dbo.UQ_Matricula_IdAlumno'',''UQ'') IS NULL THROW 54009,''Falta restriccion original: UQ_Matricula_IdAlumno. Comparar el diagnostico antes de continuar.'',1;
IF OBJECT_ID(''dbo.UQ_Matricula_IdGrupo'',''UQ'') IS NULL THROW 54009,''Falta restriccion original: UQ_Matricula_IdGrupo. Comparar el diagnostico antes de continuar.'',1;
IF OBJECT_ID(''dbo.UQ_Matricula_Alumno_Grupo'',''UQ'') IS NULL THROW 54009,''Falta restriccion original: UQ_Matricula_Alumno_Grupo. Comparar el diagnostico antes de continuar.'',1;
IF OBJECT_ID(''dbo.UQ_Nota_ExamenMatricula'',''UQ'') IS NULL THROW 54009,''Falta restriccion original: UQ_Nota_ExamenMatricula. Comparar el diagnostico antes de continuar.'',1;
IF OBJECT_ID(''dbo.CK_Nota_Puntaje'',''C'') IS NULL THROW 54009,''Falta restriccion original: CK_Nota_Puntaje. Comparar el diagnostico antes de continuar.'',1;
IF OBJECT_ID(''dbo.UQ_PARENTESCO_Tipo'',''UQ'') IS NULL THROW 54009,''Falta restriccion original: UQ_PARENTESCO_Tipo. Comparar el diagnostico antes de continuar.'',1;
IF OBJECT_ID(''dbo.CK_Parentesco_Lista'',''C'') IS NULL THROW 54009,''Falta restriccion original: CK_Parentesco_Lista. Comparar el diagnostico antes de continuar.'',1;
IF OBJECT_ID(''dbo.CK_Pago_Monto'',''C'') IS NULL THROW 54009,''Falta restriccion original: CK_Pago_Monto. Comparar el diagnostico antes de continuar.'',1;
IF OBJECT_ID(''dbo.CK_Pago_Concepto'',''C'') IS NULL THROW 54009,''Falta restriccion original: CK_Pago_Concepto. Comparar el diagnostico antes de continuar.'',1;
IF OBJECT_ID(''dbo.CK_Pago_Medio'',''C'') IS NULL AND OBJECT_ID(''dbo.FK_V4_Pago_Medio'',''F'') IS NULL THROW 54009,''Falta restriccion original: CK_Pago_Medio. Comparar el diagnostico antes de continuar.'',1;
IF OBJECT_ID(''dbo.CK_Pago_Estado'',''C'') IS NULL THROW 54009,''Falta restriccion original: CK_Pago_Estado. Comparar el diagnostico antes de continuar.'',1;
IF OBJECT_ID(''dbo.UQ_Programa_Nombre'',''UQ'') IS NULL THROW 54009,''Falta restriccion original: UQ_Programa_Nombre. Comparar el diagnostico antes de continuar.'',1;
IF OBJECT_ID(''dbo.CK_Programa_SoloDos'',''C'') IS NULL THROW 54009,''Falta restriccion original: CK_Programa_SoloDos. Comparar el diagnostico antes de continuar.'',1;
IF OBJECT_ID(''dbo.UQ_ROL_Nombre'',''UQ'') IS NULL THROW 54009,''Falta restriccion original: UQ_ROL_Nombre. Comparar el diagnostico antes de continuar.'',1;
IF OBJECT_ID(''dbo.CK_ROL_Codigos'',''C'') IS NULL THROW 54009,''Falta restriccion original: CK_ROL_Codigos. Comparar el diagnostico antes de continuar.'',1;
IF OBJECT_ID(''dbo.UQ_TIPO_BLOQUE_Nombre'',''UQ'') IS NULL THROW 54009,''Falta restriccion original: UQ_TIPO_BLOQUE_Nombre. Comparar el diagnostico antes de continuar.'',1;
IF OBJECT_ID(''dbo.CK_TIPO_BLOQUE_Codigos'',''C'') IS NULL THROW 54009,''Falta restriccion original: CK_TIPO_BLOQUE_Codigos. Comparar el diagnostico antes de continuar.'',1;
IF OBJECT_ID(''dbo.UQ_Turno_Nombre'',''UQ'') IS NULL THROW 54009,''Falta restriccion original: UQ_Turno_Nombre. Comparar el diagnostico antes de continuar.'',1;
IF OBJECT_ID(''dbo.CK_Turno_DosOpciones'',''C'') IS NULL THROW 54009,''Falta restriccion original: CK_Turno_DosOpciones. Comparar el diagnostico antes de continuar.'',1;
IF OBJECT_ID(''dbo.UQ_Usuario_Nombre'',''UQ'') IS NULL THROW 54009,''Falta restriccion original: UQ_Usuario_Nombre. Comparar el diagnostico antes de continuar.'',1;
IF OBJECT_ID(''dbo.CK_Usuario_Rol'',''C'') IS NULL THROW 54009,''Falta restriccion original: CK_Usuario_Rol. Comparar el diagnostico antes de continuar.'',1;
IF EXISTS (SELECT 1 FROM sys.check_constraints WHERE is_disabled=1 OR is_not_trusted=1)
 THROW 54005,''Hay restricciones deshabilitadas o no confiables. Revisar manualmente.'',1;
IF OBJECT_ID(''dbo.Control_Migracion_V4'') IS NULL
 CREATE TABLE dbo.Control_Migracion_V4 (Script varchar(100) NOT NULL CONSTRAINT PK_Control_Migracion_V4 PRIMARY KEY,Fecha datetime2(0) NOT NULL CONSTRAINT DF_Control_V4_Fecha DEFAULT SYSUTCDATETIME());
IF OBJECT_ID(''dbo.Linea_Base_V4'') IS NULL
 CREATE TABLE dbo.Linea_Base_V4 (Tabla sysname NOT NULL,Clave nvarchar(200) NOT NULL,Huella varbinary(32) NOT NULL,CONSTRAINT PK_Linea_Base_V4 PRIMARY KEY (Tabla,Clave));
IF OBJECT_ID(''dbo.Auditoria_V4'') IS NULL
 CREATE TABLE dbo.Auditoria_V4 (Id bigint IDENTITY(1,1) NOT NULL CONSTRAINT PK_Auditoria_V4 PRIMARY KEY,
 Entidad varchar(20) NOT NULL,Codigo varchar(20) NOT NULL,Accion varchar(30) NOT NULL,Anterior nvarchar(max) NULL,Nuevo nvarchar(max) NULL,
 Usuario_Cod_Usuario varchar(20) NOT NULL,Motivo varchar(250) NULL,Fecha datetime2(0) NOT NULL CONSTRAINT DF_Auditoria_V4_Fecha DEFAULT SYSUTCDATETIME(),
 CONSTRAINT FK_Auditoria_V4_Usuario FOREIGN KEY (Usuario_Cod_Usuario) REFERENCES dbo.Usuario(Cod_Usuario),
 CONSTRAINT CK_Auditoria_V4_JSON CHECK ((Anterior IS NULL OR ISJSON(Anterior)=1) AND (Nuevo IS NULL OR ISJSON(Nuevo)=1)));
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id=OBJECT_ID(''dbo.Auditoria_V4'') AND name=''IX_Auditoria_V4_Referencia'')
 CREATE INDEX IX_Auditoria_V4_Referencia ON dbo.Auditoria_V4(Entidad,Codigo,Id);
IF OBJECT_ID(''dbo.Seq_Operacion_V4'',''SO'') IS NULL
BEGIN
 DECLARE @Max bigint;
 SELECT @Max=ISNULL(MAX(TRY_CONVERT(bigint,SUBSTRING(Codigo,3,18))),0) FROM (
 SELECT Cod_Matricula AS Codigo FROM dbo.MATRICULA UNION ALL SELECT Cod_Pago FROM dbo.Pago UNION ALL SELECT Cod_Usuario FROM dbo.Usuario UNION ALL SELECT Cod_Nota FROM dbo.Nota_Examen UNION ALL SELECT Cod_examen_grupo FROM dbo.Examen_Grupo) x
 WHERE DATALENGTH(Codigo)=20 AND LEFT(Codigo,2) IN (''M4'',''P4'',''U4'',''N4'',''E4'') AND SUBSTRING(Codigo,3,18) NOT LIKE ''%[^0-9]%'';
 IF @Max>=999999999999999999 THROW 54006,''Espacio de identificadores agotado.'',1;
 DECLARE @SeqSQL nvarchar(max)=N''CREATE SEQUENCE dbo.Seq_Operacion_V4 AS bigint START WITH ''+CONVERT(nvarchar(20),@Max+1)+N'' INCREMENT BY 1 MINVALUE 1 MAXVALUE 999999999999999999 NO CYCLE CACHE 50'';
 EXEC sys.sp_executesql @SeqSQL;
END;
IF NOT EXISTS (SELECT 1 FROM dbo.Control_Migracion_V4 WHERE Script=''00A_PREPARACION_Y_LINEA_BASE'')
BEGIN
 -- No sobrescribir la línea base en reejecuciones. Captura el contenido completo de las 25 tablas.
 INSERT dbo.Linea_Base_V4 (Tabla,Clave,Huella)
 SELECT ''ALUMNO'',(SELECT t.[DNI_Alu] FOR JSON PATH,WITHOUT_ARRAY_WRAPPER,INCLUDE_NULL_VALUES),
 HASHBYTES(''SHA2_256'',CONVERT(varbinary(max),(SELECT t.* FOR JSON PATH,WITHOUT_ARRAY_WRAPPER,INCLUDE_NULL_VALUES))) FROM dbo.[ALUMNO] t;
INSERT dbo.Linea_Base_V4 (Tabla,Clave,Huella)
 SELECT ''Aula'',(SELECT t.[Cod_Aula] FOR JSON PATH,WITHOUT_ARRAY_WRAPPER,INCLUDE_NULL_VALUES),
 HASHBYTES(''SHA2_256'',CONVERT(varbinary(max),(SELECT t.* FOR JSON PATH,WITHOUT_ARRAY_WRAPPER,INCLUDE_NULL_VALUES))) FROM dbo.[Aula] t;
INSERT dbo.Linea_Base_V4 (Tabla,Clave,Huella)
 SELECT ''CARRERA'',(SELECT t.[Cod_Carrera] FOR JSON PATH,WITHOUT_ARRAY_WRAPPER,INCLUDE_NULL_VALUES),
 HASHBYTES(''SHA2_256'',CONVERT(varbinary(max),(SELECT t.* FOR JSON PATH,WITHOUT_ARRAY_WRAPPER,INCLUDE_NULL_VALUES))) FROM dbo.[CARRERA] t;
INSERT dbo.Linea_Base_V4 (Tabla,Clave,Huella)
 SELECT ''CONCEPTO_PAGO'',(SELECT t.[Cod_Concepto] FOR JSON PATH,WITHOUT_ARRAY_WRAPPER,INCLUDE_NULL_VALUES),
 HASHBYTES(''SHA2_256'',CONVERT(varbinary(max),(SELECT t.* FOR JSON PATH,WITHOUT_ARRAY_WRAPPER,INCLUDE_NULL_VALUES))) FROM dbo.[CONCEPTO_PAGO] t;
INSERT dbo.Linea_Base_V4 (Tabla,Clave,Huella)
 SELECT ''CURSOS'',(SELECT t.[Cod_Curso] FOR JSON PATH,WITHOUT_ARRAY_WRAPPER,INCLUDE_NULL_VALUES),
 HASHBYTES(''SHA2_256'',CONVERT(varbinary(max),(SELECT t.* FOR JSON PATH,WITHOUT_ARRAY_WRAPPER,INCLUDE_NULL_VALUES))) FROM dbo.[CURSOS] t;
INSERT dbo.Linea_Base_V4 (Tabla,Clave,Huella)
 SELECT ''Ciclo'',(SELECT t.[Cod_Ciclo] FOR JSON PATH,WITHOUT_ARRAY_WRAPPER,INCLUDE_NULL_VALUES),
 HASHBYTES(''SHA2_256'',CONVERT(varbinary(max),(SELECT t.* FOR JSON PATH,WITHOUT_ARRAY_WRAPPER,INCLUDE_NULL_VALUES))) FROM dbo.[Ciclo] t;
INSERT dbo.Linea_Base_V4 (Tabla,Clave,Huella)
 SELECT ''Docente'',(SELECT t.[DNI_Doc] FOR JSON PATH,WITHOUT_ARRAY_WRAPPER,INCLUDE_NULL_VALUES),
 HASHBYTES(''SHA2_256'',CONVERT(varbinary(max),(SELECT t.* FOR JSON PATH,WITHOUT_ARRAY_WRAPPER,INCLUDE_NULL_VALUES))) FROM dbo.[Docente] t;
INSERT dbo.Linea_Base_V4 (Tabla,Clave,Huella)
 SELECT ''Docente_Asignatura'',(SELECT t.[CURSOS_Cod_Curso],t.[Docente_DNI_Doc] FOR JSON PATH,WITHOUT_ARRAY_WRAPPER,INCLUDE_NULL_VALUES),
 HASHBYTES(''SHA2_256'',CONVERT(varbinary(max),(SELECT t.* FOR JSON PATH,WITHOUT_ARRAY_WRAPPER,INCLUDE_NULL_VALUES))) FROM dbo.[Docente_Asignatura] t;
INSERT dbo.Linea_Base_V4 (Tabla,Clave,Huella)
 SELECT ''ESTADO_CICLO'',(SELECT t.[Cod_Estado_Ciclo] FOR JSON PATH,WITHOUT_ARRAY_WRAPPER,INCLUDE_NULL_VALUES),
 HASHBYTES(''SHA2_256'',CONVERT(varbinary(max),(SELECT t.* FOR JSON PATH,WITHOUT_ARRAY_WRAPPER,INCLUDE_NULL_VALUES))) FROM dbo.[ESTADO_CICLO] t;
INSERT dbo.Linea_Base_V4 (Tabla,Clave,Huella)
 SELECT ''ESTADO_EXAMEN_GRUPO'',(SELECT t.[Cod_Estado_Examen] FOR JSON PATH,WITHOUT_ARRAY_WRAPPER,INCLUDE_NULL_VALUES),
 HASHBYTES(''SHA2_256'',CONVERT(varbinary(max),(SELECT t.* FOR JSON PATH,WITHOUT_ARRAY_WRAPPER,INCLUDE_NULL_VALUES))) FROM dbo.[ESTADO_EXAMEN_GRUPO] t;
INSERT dbo.Linea_Base_V4 (Tabla,Clave,Huella)
 SELECT ''ESTADO_MATRICULA'',(SELECT t.[Cod_Estado_Matricula] FOR JSON PATH,WITHOUT_ARRAY_WRAPPER,INCLUDE_NULL_VALUES),
 HASHBYTES(''SHA2_256'',CONVERT(varbinary(max),(SELECT t.* FOR JSON PATH,WITHOUT_ARRAY_WRAPPER,INCLUDE_NULL_VALUES))) FROM dbo.[ESTADO_MATRICULA] t;
INSERT dbo.Linea_Base_V4 (Tabla,Clave,Huella)
 SELECT ''ESTADO_PAGO'',(SELECT t.[Cod_Estado] FOR JSON PATH,WITHOUT_ARRAY_WRAPPER,INCLUDE_NULL_VALUES),
 HASHBYTES(''SHA2_256'',CONVERT(varbinary(max),(SELECT t.* FOR JSON PATH,WITHOUT_ARRAY_WRAPPER,INCLUDE_NULL_VALUES))) FROM dbo.[ESTADO_PAGO] t;
INSERT dbo.Linea_Base_V4 (Tabla,Clave,Huella)
 SELECT ''Examen'',(SELECT t.[Cod_Examen] FOR JSON PATH,WITHOUT_ARRAY_WRAPPER,INCLUDE_NULL_VALUES),
 HASHBYTES(''SHA2_256'',CONVERT(varbinary(max),(SELECT t.* FOR JSON PATH,WITHOUT_ARRAY_WRAPPER,INCLUDE_NULL_VALUES))) FROM dbo.[Examen] t;
INSERT dbo.Linea_Base_V4 (Tabla,Clave,Huella)
 SELECT ''Examen_Grupo'',(SELECT t.[Cod_examen_grupo] FOR JSON PATH,WITHOUT_ARRAY_WRAPPER,INCLUDE_NULL_VALUES),
 HASHBYTES(''SHA2_256'',CONVERT(varbinary(max),(SELECT t.* FOR JSON PATH,WITHOUT_ARRAY_WRAPPER,INCLUDE_NULL_VALUES))) FROM dbo.[Examen_Grupo] t;
INSERT dbo.Linea_Base_V4 (Tabla,Clave,Huella)
 SELECT ''Grupo'',(SELECT t.[Cod_Grupo] FOR JSON PATH,WITHOUT_ARRAY_WRAPPER,INCLUDE_NULL_VALUES),
 HASHBYTES(''SHA2_256'',CONVERT(varbinary(max),(SELECT t.* FOR JSON PATH,WITHOUT_ARRAY_WRAPPER,INCLUDE_NULL_VALUES))) FROM dbo.[Grupo] t;
INSERT dbo.Linea_Base_V4 (Tabla,Clave,Huella)
 SELECT ''Horario'',(SELECT t.[Cod_Horario] FOR JSON PATH,WITHOUT_ARRAY_WRAPPER,INCLUDE_NULL_VALUES),
 HASHBYTES(''SHA2_256'',CONVERT(varbinary(max),(SELECT t.* FOR JSON PATH,WITHOUT_ARRAY_WRAPPER,INCLUDE_NULL_VALUES))) FROM dbo.[Horario] t;
INSERT dbo.Linea_Base_V4 (Tabla,Clave,Huella)
 SELECT ''MATRICULA'',(SELECT t.[Cod_Matricula] FOR JSON PATH,WITHOUT_ARRAY_WRAPPER,INCLUDE_NULL_VALUES),
 HASHBYTES(''SHA2_256'',CONVERT(varbinary(max),(SELECT t.* FOR JSON PATH,WITHOUT_ARRAY_WRAPPER,INCLUDE_NULL_VALUES))) FROM dbo.[MATRICULA] t;
INSERT dbo.Linea_Base_V4 (Tabla,Clave,Huella)
 SELECT ''Nota_Examen'',(SELECT t.[Cod_Nota] FOR JSON PATH,WITHOUT_ARRAY_WRAPPER,INCLUDE_NULL_VALUES),
 HASHBYTES(''SHA2_256'',CONVERT(varbinary(max),(SELECT t.* FOR JSON PATH,WITHOUT_ARRAY_WRAPPER,INCLUDE_NULL_VALUES))) FROM dbo.[Nota_Examen] t;
INSERT dbo.Linea_Base_V4 (Tabla,Clave,Huella)
 SELECT ''PARENTESCO'',(SELECT t.[Cod_Paren] FOR JSON PATH,WITHOUT_ARRAY_WRAPPER,INCLUDE_NULL_VALUES),
 HASHBYTES(''SHA2_256'',CONVERT(varbinary(max),(SELECT t.* FOR JSON PATH,WITHOUT_ARRAY_WRAPPER,INCLUDE_NULL_VALUES))) FROM dbo.[PARENTESCO] t;
INSERT dbo.Linea_Base_V4 (Tabla,Clave,Huella)
 SELECT ''Pago'',(SELECT t.[Cod_Pago] FOR JSON PATH,WITHOUT_ARRAY_WRAPPER,INCLUDE_NULL_VALUES),
 HASHBYTES(''SHA2_256'',CONVERT(varbinary(max),(SELECT t.* FOR JSON PATH,WITHOUT_ARRAY_WRAPPER,INCLUDE_NULL_VALUES))) FROM dbo.[Pago] t;
INSERT dbo.Linea_Base_V4 (Tabla,Clave,Huella)
 SELECT ''Programa'',(SELECT t.[Cod_Programa] FOR JSON PATH,WITHOUT_ARRAY_WRAPPER,INCLUDE_NULL_VALUES),
 HASHBYTES(''SHA2_256'',CONVERT(varbinary(max),(SELECT t.* FOR JSON PATH,WITHOUT_ARRAY_WRAPPER,INCLUDE_NULL_VALUES))) FROM dbo.[Programa] t;
INSERT dbo.Linea_Base_V4 (Tabla,Clave,Huella)
 SELECT ''ROL'',(SELECT t.[Cod_Rol] FOR JSON PATH,WITHOUT_ARRAY_WRAPPER,INCLUDE_NULL_VALUES),
 HASHBYTES(''SHA2_256'',CONVERT(varbinary(max),(SELECT t.* FOR JSON PATH,WITHOUT_ARRAY_WRAPPER,INCLUDE_NULL_VALUES))) FROM dbo.[ROL] t;
INSERT dbo.Linea_Base_V4 (Tabla,Clave,Huella)
 SELECT ''TIPO_BLOQUE'',(SELECT t.[Cod_Tipo] FOR JSON PATH,WITHOUT_ARRAY_WRAPPER,INCLUDE_NULL_VALUES),
 HASHBYTES(''SHA2_256'',CONVERT(varbinary(max),(SELECT t.* FOR JSON PATH,WITHOUT_ARRAY_WRAPPER,INCLUDE_NULL_VALUES))) FROM dbo.[TIPO_BLOQUE] t;
INSERT dbo.Linea_Base_V4 (Tabla,Clave,Huella)
 SELECT ''Turno'',(SELECT t.[Cod_Turno] FOR JSON PATH,WITHOUT_ARRAY_WRAPPER,INCLUDE_NULL_VALUES),
 HASHBYTES(''SHA2_256'',CONVERT(varbinary(max),(SELECT t.* FOR JSON PATH,WITHOUT_ARRAY_WRAPPER,INCLUDE_NULL_VALUES))) FROM dbo.[Turno] t;
INSERT dbo.Linea_Base_V4 (Tabla,Clave,Huella)
 SELECT ''Usuario'',(SELECT t.[Cod_Usuario] FOR JSON PATH,WITHOUT_ARRAY_WRAPPER,INCLUDE_NULL_VALUES),
 HASHBYTES(''SHA2_256'',CONVERT(varbinary(max),(SELECT t.* FOR JSON PATH,WITHOUT_ARRAY_WRAPPER,INCLUDE_NULL_VALUES))) FROM dbo.[Usuario] t;
 INSERT dbo.Control_Migracion_V4 (Script) VALUES (''00A_PREPARACION_Y_LINEA_BASE'');
END;
COMMIT;
END TRY
BEGIN CATCH
 IF XACT_STATE()<>0 ROLLBACK;
 THROW;
END CATCH;
SELECT Script,Fecha FROM dbo.Control_Migracion_V4;
';
-- sql/migrations/v4/01_ACTUALIZACION_CELULARES.sql
EXEC sys.sp_executesql N'-- V4: ejecutar manualmente, en mantenimiento, después de respaldo verificado.
-- Cambiar SOLO @BaseEsperada por el nombre de la base independiente al ensayar.
SET NOCOUNT ON; SET XACT_ABORT ON;
SET ANSI_NULLS ON; SET QUOTED_IDENTIFIER ON; SET ANSI_PADDING ON;
SET ANSI_WARNINGS ON; SET ARITHABORT ON; SET CONCAT_NULL_YIELDS_NULL ON; SET NUMERIC_ROUNDABORT OFF;
DECLARE @BaseEsperada sysname=DB_NAME();
IF DB_NAME()<>@BaseEsperada OR DB_NAME() IN (''master'',''model'',''msdb'',''tempdb'')
    THROW 54000, ''Base incorrecta. Verifique servidor y @BaseEsperada; no se hizo ningun cambio.'', 1;
IF OBJECT_ID(''dbo.Control_Migracion_V4'') IS NULL OR OBJECT_ID(''dbo.Linea_Base_V4'') IS NULL OR OBJECT_ID(''dbo.Auditoria_V4'') IS NULL OR OBJECT_ID(''dbo.Seq_Operacion_V4'',''SO'') IS NULL THROW 54001, ''Ejecute primero 00A_PREPARACION_Y_LINEA_BASE.sql.'',1;
IF NOT EXISTS(SELECT 1 FROM dbo.Control_Migracion_V4 WHERE Script=''00A_PREPARACION_Y_LINEA_BASE'') THROW 54001,''Preparacion V4 incompleta.'',1;
BEGIN TRY
BEGIN TRAN;
IF EXISTS (SELECT 1 FROM dbo.[ALUMNO] WHERE [Cel_Alu] IS NOT NULL AND (DATALENGTH(CONVERT(varchar(max),[Cel_Alu]))<>9 OR CONVERT(varchar(max),[Cel_Alu]) COLLATE Latin1_General_100_BIN2 LIKE ''%[^0-9]%''))
 BEGIN
 SELECT ''ALUMNO.Cel_Alu'' AS Campo,[DNI_Alu] AS DNI,[Cel_Alu] AS Valor FROM dbo.[ALUMNO] WHERE [Cel_Alu] IS NOT NULL AND (DATALENGTH(CONVERT(varchar(max),[Cel_Alu]))<>9 OR CONVERT(varchar(max),[Cel_Alu]) COLLATE Latin1_General_100_BIN2 LIKE ''%[^0-9]%'');
SELECT ''ALUMNO.Cel_Apoderado'' AS Campo,[DNI_Alu] AS DNI,[Cel_Apoderado] AS Valor FROM dbo.[ALUMNO] WHERE [Cel_Apoderado] IS NOT NULL AND (DATALENGTH(CONVERT(varchar(max),[Cel_Apoderado]))<>9 OR CONVERT(varchar(max),[Cel_Apoderado]) COLLATE Latin1_General_100_BIN2 LIKE ''%[^0-9]%'');
SELECT ''Docente.Cel_Doc'' AS Campo,[DNI_Doc] AS DNI,[Cel_Doc] AS Valor FROM dbo.[Docente] WHERE ([Cel_Doc] IS NULL OR DATALENGTH(CONVERT(varchar(max),[Cel_Doc]))<>9 OR CONVERT(varchar(max),[Cel_Doc]) COLLATE Latin1_General_100_BIN2 LIKE ''%[^0-9]%'');
 THROW 54010,''Celulares incompatibles. No se truncaron ni corrigieron valores; solicitar correccion autorizada.'',1;
 END;
IF COL_LENGTH(''dbo.ALUMNO'',''Cel_Alu'')<>9 ALTER TABLE dbo.[ALUMNO] ALTER COLUMN [Cel_Alu] varchar(9) NULL;
IF OBJECT_ID(''dbo.CK_V4_ALUMNO_Cel_Alu'',''C'') IS NULL
 ALTER TABLE dbo.[ALUMNO] WITH CHECK ADD CONSTRAINT [CK_V4_ALUMNO_Cel_Alu] CHECK ([Cel_Alu] IS NULL OR (DATALENGTH([Cel_Alu])=9 AND [Cel_Alu] COLLATE Latin1_General_100_BIN2 NOT LIKE ''%[^0-9]%''));
ALTER TABLE dbo.[ALUMNO] WITH CHECK CHECK CONSTRAINT [CK_V4_ALUMNO_Cel_Alu];
IF EXISTS (SELECT 1 FROM dbo.[ALUMNO] WHERE [Cel_Apoderado] IS NOT NULL AND (DATALENGTH(CONVERT(varchar(max),[Cel_Apoderado]))<>9 OR CONVERT(varchar(max),[Cel_Apoderado]) COLLATE Latin1_General_100_BIN2 LIKE ''%[^0-9]%''))
 BEGIN
 SELECT ''ALUMNO.Cel_Alu'' AS Campo,[DNI_Alu] AS DNI,[Cel_Alu] AS Valor FROM dbo.[ALUMNO] WHERE [Cel_Alu] IS NOT NULL AND (DATALENGTH(CONVERT(varchar(max),[Cel_Alu]))<>9 OR CONVERT(varchar(max),[Cel_Alu]) COLLATE Latin1_General_100_BIN2 LIKE ''%[^0-9]%'');
SELECT ''ALUMNO.Cel_Apoderado'' AS Campo,[DNI_Alu] AS DNI,[Cel_Apoderado] AS Valor FROM dbo.[ALUMNO] WHERE [Cel_Apoderado] IS NOT NULL AND (DATALENGTH(CONVERT(varchar(max),[Cel_Apoderado]))<>9 OR CONVERT(varchar(max),[Cel_Apoderado]) COLLATE Latin1_General_100_BIN2 LIKE ''%[^0-9]%'');
SELECT ''Docente.Cel_Doc'' AS Campo,[DNI_Doc] AS DNI,[Cel_Doc] AS Valor FROM dbo.[Docente] WHERE ([Cel_Doc] IS NULL OR DATALENGTH(CONVERT(varchar(max),[Cel_Doc]))<>9 OR CONVERT(varchar(max),[Cel_Doc]) COLLATE Latin1_General_100_BIN2 LIKE ''%[^0-9]%'');
 THROW 54010,''Celulares incompatibles. No se truncaron ni corrigieron valores; solicitar correccion autorizada.'',1;
 END;
IF COL_LENGTH(''dbo.ALUMNO'',''Cel_Apoderado'')<>9 ALTER TABLE dbo.[ALUMNO] ALTER COLUMN [Cel_Apoderado] varchar(9) NULL;
IF OBJECT_ID(''dbo.CK_V4_ALUMNO_Cel_Apoderado'',''C'') IS NULL
 ALTER TABLE dbo.[ALUMNO] WITH CHECK ADD CONSTRAINT [CK_V4_ALUMNO_Cel_Apoderado] CHECK ([Cel_Apoderado] IS NULL OR (DATALENGTH([Cel_Apoderado])=9 AND [Cel_Apoderado] COLLATE Latin1_General_100_BIN2 NOT LIKE ''%[^0-9]%''));
ALTER TABLE dbo.[ALUMNO] WITH CHECK CHECK CONSTRAINT [CK_V4_ALUMNO_Cel_Apoderado];
IF EXISTS (SELECT 1 FROM dbo.[Docente] WHERE ([Cel_Doc] IS NULL OR DATALENGTH(CONVERT(varchar(max),[Cel_Doc]))<>9 OR CONVERT(varchar(max),[Cel_Doc]) COLLATE Latin1_General_100_BIN2 LIKE ''%[^0-9]%''))
 BEGIN
 SELECT ''ALUMNO.Cel_Alu'' AS Campo,[DNI_Alu] AS DNI,[Cel_Alu] AS Valor FROM dbo.[ALUMNO] WHERE [Cel_Alu] IS NOT NULL AND (DATALENGTH(CONVERT(varchar(max),[Cel_Alu]))<>9 OR CONVERT(varchar(max),[Cel_Alu]) COLLATE Latin1_General_100_BIN2 LIKE ''%[^0-9]%'');
SELECT ''ALUMNO.Cel_Apoderado'' AS Campo,[DNI_Alu] AS DNI,[Cel_Apoderado] AS Valor FROM dbo.[ALUMNO] WHERE [Cel_Apoderado] IS NOT NULL AND (DATALENGTH(CONVERT(varchar(max),[Cel_Apoderado]))<>9 OR CONVERT(varchar(max),[Cel_Apoderado]) COLLATE Latin1_General_100_BIN2 LIKE ''%[^0-9]%'');
SELECT ''Docente.Cel_Doc'' AS Campo,[DNI_Doc] AS DNI,[Cel_Doc] AS Valor FROM dbo.[Docente] WHERE ([Cel_Doc] IS NULL OR DATALENGTH(CONVERT(varchar(max),[Cel_Doc]))<>9 OR CONVERT(varchar(max),[Cel_Doc]) COLLATE Latin1_General_100_BIN2 LIKE ''%[^0-9]%'');
 THROW 54010,''Celulares incompatibles. No se truncaron ni corrigieron valores; solicitar correccion autorizada.'',1;
 END;
IF COL_LENGTH(''dbo.Docente'',''Cel_Doc'')<>9 ALTER TABLE dbo.[Docente] ALTER COLUMN [Cel_Doc] varchar(9) NOT NULL;
IF OBJECT_ID(''dbo.CK_V4_Docente_Cel_Doc'',''C'') IS NULL
 ALTER TABLE dbo.[Docente] WITH CHECK ADD CONSTRAINT [CK_V4_Docente_Cel_Doc] CHECK ((DATALENGTH([Cel_Doc])=9 AND [Cel_Doc] COLLATE Latin1_General_100_BIN2 NOT LIKE ''%[^0-9]%''));
ALTER TABLE dbo.[Docente] WITH CHECK CHECK CONSTRAINT [CK_V4_Docente_Cel_Doc];
IF NOT EXISTS (SELECT 1 FROM dbo.Control_Migracion_V4 WHERE Script=''01_ACTUALIZACION_CELULARES'')
 INSERT dbo.Control_Migracion_V4 (Script) VALUES (''01_ACTUALIZACION_CELULARES'');
COMMIT;
END TRY
BEGIN CATCH
 IF XACT_STATE()<>0 ROLLBACK;
 THROW;
END CATCH;
SELECT OBJECT_NAME(object_id) AS Tabla,name,max_length,is_nullable FROM sys.columns WHERE name IN (''Cel_Alu'',''Cel_Apoderado'',''Cel_Doc'');
';
-- sql/migrations/v4/02_ACTUALIZACION_MATRICULAS.sql
EXEC sys.sp_executesql N'-- V4: ejecutar manualmente, en mantenimiento, después de respaldo verificado.
-- Cambiar SOLO @BaseEsperada por el nombre de la base independiente al ensayar.
SET NOCOUNT ON; SET XACT_ABORT ON;
SET ANSI_NULLS ON; SET QUOTED_IDENTIFIER ON; SET ANSI_PADDING ON;
SET ANSI_WARNINGS ON; SET ARITHABORT ON; SET CONCAT_NULL_YIELDS_NULL ON; SET NUMERIC_ROUNDABORT OFF;
DECLARE @BaseEsperada sysname=DB_NAME();
IF DB_NAME()<>@BaseEsperada OR DB_NAME() IN (''master'',''model'',''msdb'',''tempdb'')
    THROW 54000, ''Base incorrecta. Verifique servidor y @BaseEsperada; no se hizo ningun cambio.'', 1;
IF OBJECT_ID(''dbo.Control_Migracion_V4'') IS NULL OR OBJECT_ID(''dbo.Linea_Base_V4'') IS NULL OR OBJECT_ID(''dbo.Auditoria_V4'') IS NULL OR OBJECT_ID(''dbo.Seq_Operacion_V4'',''SO'') IS NULL THROW 54001, ''Ejecute primero 00A_PREPARACION_Y_LINEA_BASE.sql.'',1;
IF NOT EXISTS(SELECT 1 FROM dbo.Control_Migracion_V4 WHERE Script=''00A_PREPARACION_Y_LINEA_BASE'') THROW 54001,''Preparacion V4 incompleta.'',1;
IF NOT EXISTS(SELECT 1 FROM dbo.Control_Migracion_V4 WHERE Script=''01_ACTUALIZACION_CELULARES'') THROW 54008,''Falta una migracion anterior. Respetar el orden de la guia.'',1;
BEGIN TRY
BEGIN TRAN;

-- MATRICULA ya conserva alumno, grupo y fecha; Grupo ya relaciona ciclo, turno y aula.
-- No se duplican estas columnas. Se usa Seq_Operacion_V4 (00A) para los códigos nuevos.
IF EXISTS (SELECT m.ALUMNO_DNI_Alu,g.Ciclo_Cod_Ciclo FROM dbo.MATRICULA m JOIN dbo.Grupo g ON g.Cod_Grupo=m.Grupo_Cod_Grupo GROUP BY m.ALUMNO_DNI_Alu,g.Ciclo_Cod_Ciclo HAVING COUNT_BIG(*)>1)
 THROW 54020,''Hay matriculas repetidas de un alumno en el mismo ciclo. Revisar sin borrar historiales.'',1;
IF EXISTS (SELECT 1 FROM dbo.Grupo g WHERE (SELECT COUNT_BIG(*) FROM dbo.MATRICULA m WHERE m.Grupo_Cod_Grupo=g.Cod_Grupo AND m.ESTADO_MATRICULA_Cod_Estado_Matricula=''ACTIVA'')>g.Cupo_Max)
 THROW 54021,''Hay grupos con cupo excedido; requiere revision.'',1;
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id=OBJECT_ID(''dbo.MATRICULA'') AND name=''IX_V4_Matricula_GrupoEstado'')
 CREATE INDEX IX_V4_Matricula_GrupoEstado ON dbo.MATRICULA(Grupo_Cod_Grupo,ESTADO_MATRICULA_Cod_Estado_Matricula);
IF OBJECT_ID(''dbo.TR_Matricula_CupoMaximo'',''TR'') IS NULL EXEC sys.sp_executesql N''CREATE OR ALTER TRIGGER TR_Matricula_CupoMaximo
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
              AND m.ESTADO_MATRICULA_Cod_Estado_Matricula = ''''ACTIVA''''
        ) AS ocupacion
        WHERE ocupacion.Cantidad > g.Cupo_Max
    )
        THROW 51005, ''''La cantidad de matriculas activas supera el cupo del grupo.'''', 1;
END;
'';
IF EXISTS (SELECT 1 FROM sys.triggers WHERE object_id=OBJECT_ID(''dbo.TR_Matricula_CupoMaximo'') AND is_disabled=1) THROW 54007,''Trigger original deshabilitado: TR_Matricula_CupoMaximo. Revisar manualmente.'',1;
EXEC sys.sp_executesql N''CREATE OR ALTER TRIGGER dbo.TR_V4_Matricula_Historial ON dbo.MATRICULA AFTER INSERT,UPDATE AS
BEGIN
 SET NOCOUNT ON;
 IF EXISTS (SELECT 1 FROM inserted i JOIN deleted d ON d.Cod_Matricula=i.Cod_Matricula WHERE i.ALUMNO_DNI_Alu<>d.ALUMNO_DNI_Alu OR i.Grupo_Cod_Grupo<>d.Grupo_Cod_Grupo OR i.Fech_Matricula<>d.Fech_Matricula)
 THROW 54022,''''No se permite reasignar alumno, grupo o fecha de una matricula historica.'''',1;
 IF EXISTS (SELECT m.ALUMNO_DNI_Alu,g.Ciclo_Cod_Ciclo FROM dbo.MATRICULA m WITH (UPDLOCK,HOLDLOCK) JOIN dbo.Grupo g ON g.Cod_Grupo=m.Grupo_Cod_Grupo
 JOIN (SELECT DISTINCT ALUMNO_DNI_Alu FROM inserted) i ON i.ALUMNO_DNI_Alu=m.ALUMNO_DNI_Alu GROUP BY m.ALUMNO_DNI_Alu,g.Ciclo_Cod_Ciclo HAVING COUNT_BIG(*)>1)
 THROW 54023,''''El alumno ya tiene matricula en este ciclo.'''',1;
END;'';

IF NOT EXISTS (SELECT 1 FROM dbo.Control_Migracion_V4 WHERE Script=''02_ACTUALIZACION_MATRICULAS'')
 INSERT dbo.Control_Migracion_V4 (Script) VALUES (''02_ACTUALIZACION_MATRICULAS'');
COMMIT;
END TRY
BEGIN CATCH
 IF XACT_STATE()<>0 ROLLBACK;
 THROW;
END CATCH;
SELECT name,is_disabled FROM sys.triggers WHERE parent_id=OBJECT_ID(''dbo.MATRICULA'');
';
-- sql/migrations/v4/03_ACTUALIZACION_PAGOS.sql
EXEC sys.sp_executesql N'-- V4: ejecutar manualmente, en mantenimiento, después de respaldo verificado.
-- Cambiar SOLO @BaseEsperada por el nombre de la base independiente al ensayar.
SET NOCOUNT ON; SET XACT_ABORT ON;
SET ANSI_NULLS ON; SET QUOTED_IDENTIFIER ON; SET ANSI_PADDING ON;
SET ANSI_WARNINGS ON; SET ARITHABORT ON; SET CONCAT_NULL_YIELDS_NULL ON; SET NUMERIC_ROUNDABORT OFF;
DECLARE @BaseEsperada sysname=DB_NAME();
IF DB_NAME()<>@BaseEsperada OR DB_NAME() IN (''master'',''model'',''msdb'',''tempdb'')
    THROW 54000, ''Base incorrecta. Verifique servidor y @BaseEsperada; no se hizo ningun cambio.'', 1;
IF OBJECT_ID(''dbo.Control_Migracion_V4'') IS NULL OR OBJECT_ID(''dbo.Linea_Base_V4'') IS NULL OR OBJECT_ID(''dbo.Auditoria_V4'') IS NULL OR OBJECT_ID(''dbo.Seq_Operacion_V4'',''SO'') IS NULL THROW 54001, ''Ejecute primero 00A_PREPARACION_Y_LINEA_BASE.sql.'',1;
IF NOT EXISTS(SELECT 1 FROM dbo.Control_Migracion_V4 WHERE Script=''00A_PREPARACION_Y_LINEA_BASE'') THROW 54001,''Preparacion V4 incompleta.'',1;
IF NOT EXISTS(SELECT 1 FROM dbo.Control_Migracion_V4 WHERE Script=''02_ACTUALIZACION_MATRICULAS'') THROW 54008,''Falta una migracion anterior. Respetar el orden de la guia.'',1;
BEGIN TRY
BEGIN TRAN;

-- Pago es la obligación y conserva su importe original; no se crea otra tabla de deudas.
IF EXISTS (SELECT MATRICULA_Cod_Matricula,Nro_Mensualidad FROM dbo.Pago WHERE CONCEPTO_PAGO_Cod_Concepto=''MENSUALIDAD'' GROUP BY MATRICULA_Cod_Matricula,Nro_Mensualidad HAVING COUNT_BIG(*)>1)
 THROW 54030,''Hay mensualidades duplicadas. No se realizo ninguna conciliacion automatica.'',1;
IF EXISTS (SELECT ALUMNO_DNI_Alu,CONCEPTO_PAGO_Cod_Concepto FROM dbo.Pago WHERE CONCEPTO_PAGO_Cod_Concepto IN (''MATRICULA_INICIAL'',''MATERIALES'') GROUP BY ALUMNO_DNI_Alu,CONCEPTO_PAGO_Cod_Concepto HAVING COUNT_BIG(*)>1)
 THROW 54031,''Hay conceptos unicos duplicados.'',1;
IF EXISTS (SELECT 1 FROM dbo.Pago p JOIN dbo.MATRICULA m ON m.Cod_Matricula=p.MATRICULA_Cod_Matricula JOIN dbo.Grupo g ON g.Cod_Grupo=m.Grupo_Cod_Grupo JOIN dbo.Ciclo c ON c.Cod_Ciclo=g.Ciclo_Cod_Ciclo WHERE p.CONCEPTO_PAGO_Cod_Concepto=''MENSUALIDAD'' AND p.Nro_Mensualidad>c.Nro_Mensualidades)
 THROW 54032,''Existen mensualidades incompatibles con su ciclo.'',1;
IF EXISTS (SELECT 1 FROM dbo.Pago WHERE Medio_Pago IS NOT NULL AND Medio_Pago NOT IN (''YAPE'',''EFECTIVO'',''TARJETA''))
 AND OBJECT_ID(''dbo.MEDIO_PAGO'') IS NULL
 THROW 54033,''Hay medios de pago ajenos al modelo original. Catalogarlos mediante una migracion revisada.'',1;
IF OBJECT_ID(''dbo.MEDIO_PAGO'') IS NULL
 CREATE TABLE dbo.MEDIO_PAGO (Cod_Medio varchar(10) NOT NULL CONSTRAINT PK_MEDIO_PAGO PRIMARY KEY,Nomb_Medio varchar(60) NOT NULL,
 Activo bit NOT NULL CONSTRAINT DF_MEDIO_PAGO_Activo DEFAULT (1),CONSTRAINT UQ_MEDIO_PAGO_Nombre UNIQUE(Nomb_Medio),
 CONSTRAINT CK_MEDIO_PAGO_Codigo CHECK (DATALENGTH(Cod_Medio) BETWEEN 1 AND 10 AND Cod_Medio COLLATE Latin1_General_100_BIN2 NOT LIKE ''%[^A-Z0-9_-]%''));
IF NOT EXISTS(SELECT 1 FROM dbo.MEDIO_PAGO WHERE Cod_Medio=''EFECTIVO'') INSERT dbo.MEDIO_PAGO(Cod_Medio,Nomb_Medio) VALUES(''EFECTIVO'',''Efectivo'');
IF NOT EXISTS(SELECT 1 FROM dbo.MEDIO_PAGO WHERE Cod_Medio=''YAPE'') INSERT dbo.MEDIO_PAGO(Cod_Medio,Nomb_Medio) VALUES(''YAPE'',''Yape'');
IF NOT EXISTS(SELECT 1 FROM dbo.MEDIO_PAGO WHERE Cod_Medio=''TARJETA'') INSERT dbo.MEDIO_PAGO(Cod_Medio,Nomb_Medio) VALUES(''TARJETA'',''Tarjeta'');
IF NOT EXISTS(SELECT 1 FROM sys.foreign_keys WHERE parent_object_id=OBJECT_ID(''dbo.Pago'') AND name=''FK_V4_Pago_Medio'')
 ALTER TABLE dbo.Pago WITH CHECK ADD CONSTRAINT FK_V4_Pago_Medio FOREIGN KEY(Medio_Pago) REFERENCES dbo.MEDIO_PAGO(Cod_Medio);
-- Reemplazo atómico del CHECK cerrado por una FK validada; ningún dato se elimina.
IF OBJECT_ID(''dbo.CK_Pago_Medio'',''C'') IS NOT NULL ALTER TABLE dbo.Pago DROP CONSTRAINT CK_Pago_Medio;
ALTER TABLE dbo.Pago WITH CHECK CHECK CONSTRAINT FK_V4_Pago_Medio;
IF NOT EXISTS(SELECT 1 FROM sys.indexes WHERE object_id=OBJECT_ID(''dbo.Pago'') AND name=''UX_Pago_ConceptoUnicoAlumno'')
 CREATE UNIQUE INDEX UX_Pago_ConceptoUnicoAlumno ON dbo.Pago(ALUMNO_DNI_Alu,CONCEPTO_PAGO_Cod_Concepto) WHERE CONCEPTO_PAGO_Cod_Concepto IN (''MATRICULA_INICIAL'',''MATERIALES'');
IF NOT EXISTS(SELECT 1 FROM sys.indexes WHERE object_id=OBJECT_ID(''dbo.Pago'') AND name=''UX_Pago_MensualidadMatricula'')
 CREATE UNIQUE INDEX UX_Pago_MensualidadMatricula ON dbo.Pago(MATRICULA_Cod_Matricula,Nro_Mensualidad) WHERE CONCEPTO_PAGO_Cod_Concepto=''MENSUALIDAD'';
IF OBJECT_ID(''dbo.TR_Pago_Mes_Valido'',''TR'') IS NULL EXEC sys.sp_executesql N''CREATE OR ALTER TRIGGER TR_Pago_Mes_Valido
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
        WHERE p.CONCEPTO_PAGO_Cod_Concepto = ''''MENSUALIDAD''''
          AND p.Nro_Mensualidad > c.Nro_Mensualidades
    )
    BEGIN
        THROW 51001, ''''Numero de mensualidad fuera del ciclo del alumno.'''', 1;
    END
END;
'';
IF EXISTS (SELECT 1 FROM sys.triggers WHERE object_id=OBJECT_ID(''dbo.TR_Pago_Mes_Valido'') AND is_disabled=1) THROW 54007,''Trigger original deshabilitado: TR_Pago_Mes_Valido. Revisar manualmente.'',1;
EXEC sys.sp_executesql N''CREATE OR ALTER TRIGGER dbo.TR_V4_Pago_Obligacion ON dbo.Pago AFTER INSERT,UPDATE AS
BEGIN
 SET NOCOUNT ON;
 IF EXISTS (SELECT 1 FROM inserted i JOIN deleted d ON d.Cod_Pago=i.Cod_Pago
 WHERE i.ALUMNO_DNI_Alu<>d.ALUMNO_DNI_Alu OR i.CONCEPTO_PAGO_Cod_Concepto<>d.CONCEPTO_PAGO_Cod_Concepto OR i.Monto<>d.Monto
 OR ISNULL(i.MATRICULA_Cod_Matricula,'''''''')<>ISNULL(d.MATRICULA_Cod_Matricula,'''''''') OR ISNULL(i.Nro_Mensualidad,0)<>ISNULL(d.Nro_Mensualidad,0)
 OR ISNULL(i.Fech_Vencimiento,CONVERT(date,''''00010101''''))<>ISNULL(d.Fech_Vencimiento,CONVERT(date,''''00010101'''')))
 THROW 54034,''''Las obligaciones conservan alumno, concepto, matricula, cuota, importe y vencimiento originales.'''',1;
 IF EXISTS (SELECT 1 FROM inserted i LEFT JOIN deleted d ON d.Cod_Pago=i.Cod_Pago
 WHERE d.Cod_Pago IS NULL AND i.CONCEPTO_PAGO_Cod_Concepto IN (''''MATRICULA_INICIAL'''',''''MATERIALES'''') AND
 (SELECT COUNT_BIG(*) FROM dbo.Pago p WITH (UPDLOCK,HOLDLOCK) WHERE p.ALUMNO_DNI_Alu=i.ALUMNO_DNI_Alu AND p.CONCEPTO_PAGO_Cod_Concepto IN (''''MATRICULA_INICIAL'''',''''MATERIALES''''))>1)
 THROW 54035,''''El alumno ya tiene un cargo inicial; no duplicar matricula y materiales.'''',1;
 IF EXISTS (SELECT 1 FROM inserted i LEFT JOIN deleted d ON d.Cod_Pago=i.Cod_Pago WHERE d.Cod_Pago IS NULL AND i.CONCEPTO_PAGO_Cod_Concepto=''''MATRICULA_INICIAL'''' AND i.Monto<>50)
 THROW 54036,''''El cargo de inscripcion inicial nuevo debe ser S/ 50.'''',1;
END;'';
EXEC sys.sp_executesql N''CREATE OR ALTER TRIGGER dbo.TR_V4_Auditoria_Inmutable ON dbo.Auditoria_V4 INSTEAD OF UPDATE,DELETE AS
BEGIN SET NOCOUNT ON; THROW 54037,''''El historial de auditoria no se puede modificar ni eliminar.'''',1; END;'';

IF NOT EXISTS (SELECT 1 FROM dbo.Control_Migracion_V4 WHERE Script=''03_ACTUALIZACION_PAGOS'')
 INSERT dbo.Control_Migracion_V4 (Script) VALUES (''03_ACTUALIZACION_PAGOS'');
COMMIT;
END TRY
BEGIN CATCH
 IF XACT_STATE()<>0 ROLLBACK;
 THROW;
END CATCH;
SELECT * FROM dbo.MEDIO_PAGO; SELECT name,is_disabled,is_not_trusted FROM sys.foreign_keys WHERE name=''FK_V4_Pago_Medio'';
';
-- sql/migrations/v4/04_ACTUALIZACION_SIMULACROS.sql
EXEC sys.sp_executesql N'-- V4: ejecutar manualmente, en mantenimiento, después de respaldo verificado.
-- Cambiar SOLO @BaseEsperada por el nombre de la base independiente al ensayar.
SET NOCOUNT ON; SET XACT_ABORT ON;
SET ANSI_NULLS ON; SET QUOTED_IDENTIFIER ON; SET ANSI_PADDING ON;
SET ANSI_WARNINGS ON; SET ARITHABORT ON; SET CONCAT_NULL_YIELDS_NULL ON; SET NUMERIC_ROUNDABORT OFF;
DECLARE @BaseEsperada sysname=DB_NAME();
IF DB_NAME()<>@BaseEsperada OR DB_NAME() IN (''master'',''model'',''msdb'',''tempdb'')
    THROW 54000, ''Base incorrecta. Verifique servidor y @BaseEsperada; no se hizo ningun cambio.'', 1;
IF OBJECT_ID(''dbo.Control_Migracion_V4'') IS NULL OR OBJECT_ID(''dbo.Linea_Base_V4'') IS NULL OR OBJECT_ID(''dbo.Auditoria_V4'') IS NULL OR OBJECT_ID(''dbo.Seq_Operacion_V4'',''SO'') IS NULL THROW 54001, ''Ejecute primero 00A_PREPARACION_Y_LINEA_BASE.sql.'',1;
IF NOT EXISTS(SELECT 1 FROM dbo.Control_Migracion_V4 WHERE Script=''00A_PREPARACION_Y_LINEA_BASE'') THROW 54001,''Preparacion V4 incompleta.'',1;
IF NOT EXISTS(SELECT 1 FROM dbo.Control_Migracion_V4 WHERE Script=''03_ACTUALIZACION_PAGOS'') THROW 54008,''Falta una migracion anterior. Respetar el orden de la guia.'',1;
BEGIN TRY
BEGIN TRAN;

-- Examen, Examen_Grupo y Nota_Examen YA representan simulacros generales.
-- No hay asignatura ni curso en estas tablas. Las dos FK compuestas garantizan pertenencia al grupo.
IF EXISTS (SELECT 1 FROM dbo.Nota_Examen n JOIN dbo.Examen_Grupo eg ON eg.Cod_examen_grupo=n.Examen_Grupo_Cod_examen_grupo JOIN dbo.Examen e ON e.Cod_Examen=eg.Examen_Cod_Examen WHERE n.Puntaje_total<0 OR n.Puntaje_total>e.puntaje_maximo)
 THROW 54040,''Hay puntajes fuera de rango; requiere revision autorizada.'',1;
IF EXISTS (SELECT m.ALUMNO_DNI_Alu,eg.Examen_Cod_Examen FROM dbo.Nota_Examen n JOIN dbo.MATRICULA m ON m.Cod_Matricula=n.MATRICULA_Cod_Matricula JOIN dbo.Examen_Grupo eg ON eg.Cod_examen_grupo=n.Examen_Grupo_Cod_examen_grupo GROUP BY m.ALUMNO_DNI_Alu,eg.Examen_Cod_Examen HAVING COUNT_BIG(*)>1)
 THROW 54041,''Hay varios resultados del mismo alumno para un simulacro.'',1;
IF OBJECT_ID(''dbo.TR_Nota_Examen_Puntaje'',''TR'') IS NULL EXEC sys.sp_executesql N''CREATE OR ALTER TRIGGER TR_Nota_Examen_Puntaje
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
        THROW 51004, ''''La nota supera el puntaje maximo del simulacro.'''', 1;
END;
'';
IF EXISTS (SELECT 1 FROM sys.triggers WHERE object_id=OBJECT_ID(''dbo.TR_Nota_Examen_Puntaje'') AND is_disabled=1) THROW 54007,''Trigger original deshabilitado: TR_Nota_Examen_Puntaje. Revisar manualmente.'',1;
EXEC sys.sp_executesql N''CREATE OR ALTER TRIGGER dbo.TR_V4_Nota_Unica ON dbo.Nota_Examen AFTER INSERT,UPDATE AS
BEGIN
 SET NOCOUNT ON;
 IF EXISTS (SELECT 1 FROM inserted i JOIN deleted d ON d.Cod_Nota=i.Cod_Nota WHERE i.MATRICULA_Cod_Matricula<>d.MATRICULA_Cod_Matricula OR i.Examen_Grupo_Cod_examen_grupo<>d.Examen_Grupo_Cod_examen_grupo OR i.Grupo_Cod_Grupo<>d.Grupo_Cod_Grupo OR i.Fech_registro<>d.Fech_registro)
 THROW 54042,''''La correccion de puntaje no puede reasignar su historial.'''',1;
 IF EXISTS (SELECT m.ALUMNO_DNI_Alu,eg.Examen_Cod_Examen FROM dbo.Nota_Examen n WITH (UPDLOCK,HOLDLOCK) JOIN dbo.MATRICULA m ON m.Cod_Matricula=n.MATRICULA_Cod_Matricula
 JOIN dbo.Examen_Grupo eg ON eg.Cod_examen_grupo=n.Examen_Grupo_Cod_examen_grupo
 WHERE eg.Examen_Cod_Examen IN (SELECT e.Examen_Cod_Examen FROM inserted i JOIN dbo.Examen_Grupo e ON e.Cod_examen_grupo=i.Examen_Grupo_Cod_examen_grupo)
 GROUP BY m.ALUMNO_DNI_Alu,eg.Examen_Cod_Examen HAVING COUNT_BIG(*)>1)
 THROW 54043,''''Solo se permite un puntaje total por alumno y simulacro.'''',1;
END;'';
EXEC sys.sp_executesql N''CREATE OR ALTER TRIGGER dbo.TR_V4_Examen_Maximo ON dbo.Examen AFTER UPDATE AS
BEGIN SET NOCOUNT ON;
 IF EXISTS (SELECT 1 FROM inserted e JOIN dbo.Examen_Grupo eg ON eg.Examen_Cod_Examen=e.Cod_Examen JOIN dbo.Nota_Examen n ON n.Examen_Grupo_Cod_examen_grupo=eg.Cod_examen_grupo WHERE n.Puntaje_total>e.puntaje_maximo)
 THROW 54044,''''El nuevo maximo es menor que un puntaje registrado.'''',1;
END;'';

IF NOT EXISTS (SELECT 1 FROM dbo.Control_Migracion_V4 WHERE Script=''04_ACTUALIZACION_SIMULACROS'')
 INSERT dbo.Control_Migracion_V4 (Script) VALUES (''04_ACTUALIZACION_SIMULACROS'');
COMMIT;
END TRY
BEGIN CATCH
 IF XACT_STATE()<>0 ROLLBACK;
 THROW;
END CATCH;
SELECT name,is_disabled FROM sys.triggers WHERE parent_id IN (OBJECT_ID(''dbo.Nota_Examen''),OBJECT_ID(''dbo.Examen''));
';
-- sql/migrations/v4/05_ACTUALIZACION_HORARIOS.sql
EXEC sys.sp_executesql N'-- V4: ejecutar manualmente, en mantenimiento, después de respaldo verificado.
-- Cambiar SOLO @BaseEsperada por el nombre de la base independiente al ensayar.
SET NOCOUNT ON; SET XACT_ABORT ON;
SET ANSI_NULLS ON; SET QUOTED_IDENTIFIER ON; SET ANSI_PADDING ON;
SET ANSI_WARNINGS ON; SET ARITHABORT ON; SET CONCAT_NULL_YIELDS_NULL ON; SET NUMERIC_ROUNDABORT OFF;
DECLARE @BaseEsperada sysname=DB_NAME();
IF DB_NAME()<>@BaseEsperada OR DB_NAME() IN (''master'',''model'',''msdb'',''tempdb'')
    THROW 54000, ''Base incorrecta. Verifique servidor y @BaseEsperada; no se hizo ningun cambio.'', 1;
IF OBJECT_ID(''dbo.Control_Migracion_V4'') IS NULL OR OBJECT_ID(''dbo.Linea_Base_V4'') IS NULL OR OBJECT_ID(''dbo.Auditoria_V4'') IS NULL OR OBJECT_ID(''dbo.Seq_Operacion_V4'',''SO'') IS NULL THROW 54001, ''Ejecute primero 00A_PREPARACION_Y_LINEA_BASE.sql.'',1;
IF NOT EXISTS(SELECT 1 FROM dbo.Control_Migracion_V4 WHERE Script=''00A_PREPARACION_Y_LINEA_BASE'') THROW 54001,''Preparacion V4 incompleta.'',1;
IF NOT EXISTS(SELECT 1 FROM dbo.Control_Migracion_V4 WHERE Script=''04_ACTUALIZACION_SIMULACROS'') THROW 54008,''Falta una migracion anterior. Respetar el orden de la guia.'',1;
BEGIN TRY
BEGIN TRAN;

-- Se conservan la FK compuesta docente/curso y los CHECK de turnos, días y recreos.
IF EXISTS (SELECT 1 FROM dbo.Horario h JOIN dbo.Grupo g ON g.Cod_Grupo=h.Grupo_Cod_Grupo JOIN dbo.Turno t ON t.Cod_Turno=g.Turno_Cod_Turno WHERE h.Activo=1 AND (h.Hr_Inicio<t.Hr_Inicio OR h.Hr_Fin>t.Hr_Fin))
 THROW 54050,''Hay bloques fuera de turno. Revisar antes de continuar.'',1;
IF EXISTS (SELECT 1 FROM dbo.Horario i JOIN dbo.Grupo gi ON gi.Cod_Grupo=i.Grupo_Cod_Grupo JOIN dbo.Ciclo ci ON ci.Cod_Ciclo=gi.Ciclo_Cod_Ciclo
 JOIN dbo.Horario h ON h.Cod_Horario>i.Cod_Horario AND h.Activo=1 AND h.Dia_Semana=i.Dia_Semana AND h.Hr_Inicio<i.Hr_Fin AND i.Hr_Inicio<h.Hr_Fin
 JOIN dbo.Grupo gh ON gh.Cod_Grupo=h.Grupo_Cod_Grupo JOIN dbo.Ciclo ch ON ch.Cod_Ciclo=gh.Ciclo_Cod_Ciclo
 WHERE i.Activo=1 AND ci.Fech_Inicio<=ch.Fech_Fin AND ch.Fech_Inicio<=ci.Fech_Fin AND (i.Grupo_Cod_Grupo=h.Grupo_Cod_Grupo OR gi.Aula_Cod_Aula=gh.Aula_Cod_Aula OR i.Docente_Asignatura_Docente_DNI_Doc=h.Docente_Asignatura_Docente_DNI_Doc))
 THROW 54051,''Hay cruces de grupo, aula o docente en los datos actuales.'',1;
IF OBJECT_ID(''dbo.TR_Horario_Sin_Cruces'',''TR'') IS NULL EXEC sys.sp_executesql N''CREATE OR ALTER TRIGGER TR_Horario_Sin_Cruces
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
        THROW 51002, ''''Clase o recreo fuera del turno asignado al grupo.'''', 1;

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
        THROW 51003, ''''Cruce de horario: grupo, aula o docente ocupado.'''', 1;
END;
'';
IF EXISTS (SELECT 1 FROM sys.triggers WHERE object_id=OBJECT_ID(''dbo.TR_Horario_Sin_Cruces'') AND is_disabled=1) THROW 54007,''Trigger original deshabilitado: TR_Horario_Sin_Cruces. Revisar manualmente.'',1;
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id=OBJECT_ID(''dbo.Horario'') AND name=''IX_V4_Horario_DiaGrupo'')
 CREATE INDEX IX_V4_Horario_DiaGrupo ON dbo.Horario(Dia_Semana,Grupo_Cod_Grupo,Hr_Inicio) INCLUDE (Hr_Fin,Activo,Docente_Asignatura_Docente_DNI_Doc);
EXEC sys.sp_executesql N''CREATE OR ALTER TRIGGER dbo.TR_V4_Grupo_Historial ON dbo.Grupo AFTER UPDATE AS
BEGIN SET NOCOUNT ON;
 IF EXISTS (SELECT 1 FROM inserted i JOIN deleted d ON d.Cod_Grupo=i.Cod_Grupo WHERE i.Ciclo_Cod_Ciclo<>d.Ciclo_Cod_Ciclo AND EXISTS (SELECT 1 FROM dbo.MATRICULA m WHERE m.Grupo_Cod_Grupo=i.Cod_Grupo))
 THROW 54052,''''No se puede cambiar el ciclo de un grupo con matriculas.'''',1;
 IF EXISTS (SELECT 1 FROM inserted i JOIN deleted d ON d.Cod_Grupo=i.Cod_Grupo WHERE (i.Aula_Cod_Aula<>d.Aula_Cod_Aula OR i.Turno_Cod_Turno<>d.Turno_Cod_Turno OR i.Ciclo_Cod_Ciclo<>d.Ciclo_Cod_Ciclo) AND EXISTS (SELECT 1 FROM dbo.Horario h WHERE h.Grupo_Cod_Grupo=i.Cod_Grupo))
 THROW 54053,''''Reorganice los bloques antes de cambiar aula, turno o ciclo.'''',1;
 IF EXISTS (SELECT 1 FROM inserted i JOIN dbo.Aula a ON a.Cod_Aula=i.Aula_Cod_Aula WHERE i.Cupo_Max>a.Capacidad OR i.Cupo_Max<(SELECT COUNT_BIG(*) FROM dbo.MATRICULA m WHERE m.Grupo_Cod_Grupo=i.Cod_Grupo AND m.ESTADO_MATRICULA_Cod_Estado_Matricula=''''ACTIVA''''))
 THROW 54054,''''Cupo incompatible con aula o matriculas activas.'''',1;
END;'';
EXEC sys.sp_executesql N''CREATE OR ALTER TRIGGER dbo.TR_V4_Ciclo_Historial ON dbo.Ciclo AFTER UPDATE AS
BEGIN SET NOCOUNT ON;
 IF EXISTS (SELECT 1 FROM inserted i JOIN deleted d ON d.Cod_Ciclo=i.Cod_Ciclo WHERE (i.Programa_Cod_Programa<>d.Programa_Cod_Programa OR i.Modalidad<>d.Modalidad OR i.Fech_Inicio<>d.Fech_Inicio OR i.Fech_Fin<>d.Fech_Fin OR i.Nro_Mensualidades<>d.Nro_Mensualidades)
 AND EXISTS (SELECT 1 FROM dbo.Grupo g WHERE g.Ciclo_Cod_Ciclo=i.Cod_Ciclo AND (EXISTS (SELECT 1 FROM dbo.MATRICULA m WHERE m.Grupo_Cod_Grupo=g.Cod_Grupo) OR EXISTS (SELECT 1 FROM dbo.Horario h WHERE h.Grupo_Cod_Grupo=g.Cod_Grupo))))
 THROW 54055,''''No se puede redefinir una edicion con matriculas u horarios.'''',1;
END;'';

IF NOT EXISTS (SELECT 1 FROM dbo.Control_Migracion_V4 WHERE Script=''05_ACTUALIZACION_HORARIOS'')
 INSERT dbo.Control_Migracion_V4 (Script) VALUES (''05_ACTUALIZACION_HORARIOS'');
COMMIT;
END TRY
BEGIN CATCH
 IF XACT_STATE()<>0 ROLLBACK;
 THROW;
END CATCH;
SELECT name,is_disabled FROM sys.triggers WHERE parent_id=OBJECT_ID(''dbo.Horario'');
';
-- sql/migrations/v4/06_ACTUALIZACION_USUARIOS.sql
EXEC sys.sp_executesql N'-- V4: ejecutar manualmente, en mantenimiento, después de respaldo verificado.
-- Cambiar SOLO @BaseEsperada por el nombre de la base independiente al ensayar.
SET NOCOUNT ON; SET XACT_ABORT ON;
SET ANSI_NULLS ON; SET QUOTED_IDENTIFIER ON; SET ANSI_PADDING ON;
SET ANSI_WARNINGS ON; SET ARITHABORT ON; SET CONCAT_NULL_YIELDS_NULL ON; SET NUMERIC_ROUNDABORT OFF;
DECLARE @BaseEsperada sysname=DB_NAME();
IF DB_NAME()<>@BaseEsperada OR DB_NAME() IN (''master'',''model'',''msdb'',''tempdb'')
    THROW 54000, ''Base incorrecta. Verifique servidor y @BaseEsperada; no se hizo ningun cambio.'', 1;
IF OBJECT_ID(''dbo.Control_Migracion_V4'') IS NULL OR OBJECT_ID(''dbo.Linea_Base_V4'') IS NULL OR OBJECT_ID(''dbo.Auditoria_V4'') IS NULL OR OBJECT_ID(''dbo.Seq_Operacion_V4'',''SO'') IS NULL THROW 54001, ''Ejecute primero 00A_PREPARACION_Y_LINEA_BASE.sql.'',1;
IF NOT EXISTS(SELECT 1 FROM dbo.Control_Migracion_V4 WHERE Script=''00A_PREPARACION_Y_LINEA_BASE'') THROW 54001,''Preparacion V4 incompleta.'',1;
IF NOT EXISTS(SELECT 1 FROM dbo.Control_Migracion_V4 WHERE Script=''05_ACTUALIZACION_HORARIOS'') THROW 54008,''Falta una migracion anterior. Respetar el orden de la guia.'',1;
BEGIN TRY
BEGIN TRAN;

-- Los campos de hash y cambio obligatorio ya existen: NO se cambian hashes, claves ni usuarios antiguos.
IF EXISTS (SELECT ALUMNO_DNI_Alu FROM dbo.Usuario WHERE ALUMNO_DNI_Alu IS NOT NULL GROUP BY ALUMNO_DNI_Alu HAVING COUNT_BIG(*)>1)
 THROW 54060,''Hay cuentas de alumno duplicadas. Requiere conciliacion manual.'',1;
IF EXISTS (SELECT 1 FROM dbo.Usuario WHERE ROL_Cod_Rol NOT IN (''ADMIN'',''ALUMNO'') OR (ROL_Cod_Rol=''ALUMNO'' AND ALUMNO_DNI_Alu IS NULL) OR (ROL_Cod_Rol=''ADMIN'' AND ALUMNO_DNI_Alu IS NOT NULL))
 THROW 54061,''Hay cuentas incompatibles con los roles ADMIN/ALUMNO.'',1;
IF EXISTS (SELECT 1 FROM dbo.ROL WHERE Cod_Rol NOT IN (''ADMIN'',''ALUMNO'')) THROW 54062,''Hay roles fuera del modelo acordado; revisar sin eliminarlos.'',1;
IF NOT EXISTS (SELECT 1 FROM dbo.ROL WHERE Cod_Rol=''ADMIN'') OR NOT EXISTS (SELECT 1 FROM dbo.ROL WHERE Cod_Rol=''ALUMNO'') THROW 54063,''Faltan los roles originales. Revisar los catalogos antes de continuar.'',1;
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id=OBJECT_ID(''dbo.Usuario'') AND name=''UX_Usuario_UnicaCuentaAlumno'')
 CREATE UNIQUE INDEX UX_Usuario_UnicaCuentaAlumno ON dbo.Usuario(ALUMNO_DNI_Alu) WHERE ALUMNO_DNI_Alu IS NOT NULL;
-- Nomb_Usuario mantiene UNIQUE; las cuentas NUEVAS usan DNI, las anteriores conservan su acceso.

IF NOT EXISTS (SELECT 1 FROM dbo.Control_Migracion_V4 WHERE Script=''06_ACTUALIZACION_USUARIOS'')
 INSERT dbo.Control_Migracion_V4 (Script) VALUES (''06_ACTUALIZACION_USUARIOS'');
COMMIT;
END TRY
BEGIN CATCH
 IF XACT_STATE()<>0 ROLLBACK;
 THROW;
END CATCH;
SELECT Cod_Rol,Nomb_Rol FROM dbo.ROL; SELECT name,is_unique,filter_definition FROM sys.indexes WHERE object_id=OBJECT_ID(''dbo.Usuario'');
';
-- sql/migrations/v4_1/01_RECUPERACION_CUENTAS.sql
EXEC sys.sp_executesql N'-- V4.1 incremental. Revisar respaldo, mantenimiento y servidor antes de ejecutar.
SET NOCOUNT ON; SET XACT_ABORT ON; SET ANSI_NULLS ON; SET QUOTED_IDENTIFIER ON;
SET ANSI_PADDING ON; SET ANSI_WARNINGS ON; SET ARITHABORT ON; SET CONCAT_NULL_YIELDS_NULL ON; SET NUMERIC_ROUNDABORT OFF;
DECLARE @BaseEsperada sysname=DB_NAME();
IF DB_NAME()<>@BaseEsperada OR DB_NAME() IN (''master'',''model'',''msdb'',''tempdb'') THROW 54100,''Base incorrecta. Confirme @BaseEsperada y el servidor.'',1;
IF OBJECT_ID(''dbo.Control_Migracion_V4'') IS NULL OR OBJECT_ID(''dbo.Auditoria_V4'') IS NULL OR OBJECT_ID(''dbo.MEDIO_PAGO'') IS NULL
 THROW 54101,''Se requiere completar primero V4. No reconstruya la base.'',1;
IF (SELECT COUNT(*) FROM dbo.Control_Migracion_V4 WHERE Script IN (''00A_PREPARACION_Y_LINEA_BASE'',''01_ACTUALIZACION_CELULARES'',''02_ACTUALIZACION_MATRICULAS'',''03_ACTUALIZACION_PAGOS'',''04_ACTUALIZACION_SIMULACROS'',''05_ACTUALIZACION_HORARIOS'',''06_ACTUALIZACION_USUARIOS''))<>7
 THROW 54102,''El registro de migraciones V4 esta incompleto.'',1;
IF EXISTS(SELECT 1 FROM sys.foreign_keys WHERE is_disabled=1 OR is_not_trusted=1) THROW 54103,''Hay relaciones deshabilitadas o no confiables. Revisar antes de continuar.'',1;
IF EXISTS(SELECT 1 FROM sys.check_constraints WHERE is_disabled=1 OR is_not_trusted=1) THROW 54109,''Hay restricciones CHECK deshabilitadas o no confiables. Revisar sin omitir validaciones.'',1;
IF NOT EXISTS(SELECT 1 FROM dbo.Control_Migracion_V4 WHERE Script=''V41_01_RECUPERACION_CUENTAS'') AND (OBJECT_ID(''dbo.Usuario_Seguridad_V41'') IS NOT NULL OR OBJECT_ID(''dbo.Cuenta_Codigo_V41'') IS NOT NULL) THROW 54105,''Existe un objeto V4.1 sin registro de esta migracion. Revisar; no se asume propiedad ni se reconstruye.'',1;
IF EXISTS(SELECT 1 FROM dbo.Control_Migracion_V4 WHERE Script=''V41_01_RECUPERACION_CUENTAS'') AND (OBJECT_ID(''dbo.Usuario_Seguridad_V41'') IS NULL OR OBJECT_ID(''dbo.Cuenta_Codigo_V41'') IS NULL) THROW 54106,''Falta un objeto de una migracion ya aplicada. Revisar recuperacion; no se reconstruye una tabla que pudo tener datos.'',1;
BEGIN TRY
 BEGIN TRAN;

-- Estructuras laterales: no cambian claves, nombres ni sesiones de las cuentas existentes.
IF EXISTS(SELECT 1 FROM dbo.Usuario WHERE ROL_Cod_Rol NOT IN (''ADMIN'',''ALUMNO'')) THROW 54110,''Hay roles ajenos a ADMIN/ALUMNO; revisar sin eliminarlos.'',1;
IF OBJECT_ID(''dbo.Usuario_Seguridad_V41'') IS NULL
 CREATE TABLE dbo.Usuario_Seguridad_V41 (
 Usuario_Cod_Usuario varchar(20) NOT NULL CONSTRAINT PK_Usuario_Seguridad_V41 PRIMARY KEY,
 Version_Sesion int NOT NULL CONSTRAINT DF_Seguridad_V41_Version DEFAULT(0),
 Activacion_Requerida bit NOT NULL CONSTRAINT DF_Seguridad_V41_Activacion DEFAULT(0),
 CONSTRAINT FK_Seguridad_V41_Usuario FOREIGN KEY(Usuario_Cod_Usuario) REFERENCES dbo.Usuario(Cod_Usuario),
 CONSTRAINT CK_Seguridad_V41_Version CHECK(Version_Sesion>=0));
ELSE IF COL_LENGTH(''dbo.Usuario_Seguridad_V41'',''Version_Sesion'') IS NULL OR COL_LENGTH(''dbo.Usuario_Seguridad_V41'',''Activacion_Requerida'') IS NULL
 THROW 54111,''Usuario_Seguridad_V41 tiene una estructura inesperada.'',1;
IF OBJECT_ID(''dbo.Cuenta_Codigo_V41'') IS NULL
 CREATE TABLE dbo.Cuenta_Codigo_V41 (
 Id uniqueidentifier NOT NULL CONSTRAINT PK_Cuenta_Codigo_V41 PRIMARY KEY,
 Usuario_Cod_Usuario varchar(20) NOT NULL,Proposito varchar(20) NOT NULL,Canal varchar(7) NOT NULL,Destino varchar(150) NULL,
 Nonce char(32) NOT NULL,Codigo_Hash char(64) NOT NULL,Desafio_Hash char(64) NULL,
 Expira datetime2(0) NOT NULL,Intentos tinyint NOT NULL CONSTRAINT DF_Codigo_V41_Intentos DEFAULT(0),
 Consumido bit NOT NULL CONSTRAINT DF_Codigo_V41_Consumido DEFAULT(0),Creado datetime2(0) NOT NULL CONSTRAINT DF_Codigo_V41_Creado DEFAULT SYSUTCDATETIME(),
 CONSTRAINT FK_Codigo_V41_Usuario FOREIGN KEY(Usuario_Cod_Usuario) REFERENCES dbo.Usuario(Cod_Usuario),
 CONSTRAINT CK_Codigo_V41_Proposito CHECK(Proposito IN (''ACTIVACION'',''RECUPERACION'',''VERIFICAR_CONTACTO'')),
 CONSTRAINT CK_Codigo_V41_Canal CHECK(Canal IN (''EMAIL'',''SMS'',''DIRECTO'')),
 CONSTRAINT CK_Codigo_V41_Intentos CHECK(Intentos<=5),
 CONSTRAINT CK_Codigo_V41_Hash CHECK(DATALENGTH(Codigo_Hash)=64 AND Codigo_Hash COLLATE Latin1_General_100_BIN2 NOT LIKE ''%[^0-9a-f]%'' AND DATALENGTH(Nonce)=32 AND Nonce COLLATE Latin1_General_100_BIN2 NOT LIKE ''%[^0-9a-f]%''
 AND (Desafio_Hash IS NULL OR (DATALENGTH(Desafio_Hash)=64 AND Desafio_Hash COLLATE Latin1_General_100_BIN2 NOT LIKE ''%[^0-9a-f]%''))),
 CONSTRAINT CK_Codigo_V41_Fechas CHECK(Expira>Creado));
ELSE IF COL_LENGTH(''dbo.Cuenta_Codigo_V41'',''Codigo_Hash'')<>64 OR COL_LENGTH(''dbo.Cuenta_Codigo_V41'',''Nonce'')<>32 OR COL_LENGTH(''dbo.Cuenta_Codigo_V41'',''Desafio_Hash'') IS NULL
 THROW 54112,''Cuenta_Codigo_V41 tiene una estructura inesperada.'',1;
IF NOT EXISTS(SELECT 1 FROM sys.indexes WHERE object_id=OBJECT_ID(''dbo.Cuenta_Codigo_V41'') AND name=''UX_Codigo_V41_Pendiente'')
 CREATE UNIQUE INDEX UX_Codigo_V41_Pendiente ON dbo.Cuenta_Codigo_V41(Usuario_Cod_Usuario,Proposito) WHERE Consumido=0;
IF NOT EXISTS(SELECT 1 FROM sys.indexes WHERE object_id=OBJECT_ID(''dbo.Cuenta_Codigo_V41'') AND name=''IX_Codigo_V41_Limites'')
 CREATE INDEX IX_Codigo_V41_Limites ON dbo.Cuenta_Codigo_V41(Usuario_Cod_Usuario,Proposito,Creado) INCLUDE(Expira,Intentos,Consumido);
-- No se insertan codigos ni filas para cuentas antiguas.

DECLARE @Esperadas TABLE(Tabla sysname,Columna sysname,Tipo sysname,Longitud int,AdmiteNull bit,Identidad bit,Escala int);
INSERT @Esperadas VALUES (''Usuario_Seguridad_V41'',''Usuario_Cod_Usuario'',''varchar'',20,0,0,NULL),
(''Usuario_Seguridad_V41'',''Version_Sesion'',''int'',NULL,0,0,NULL),
(''Usuario_Seguridad_V41'',''Activacion_Requerida'',''bit'',NULL,0,0,NULL),
(''Cuenta_Codigo_V41'',''Id'',''uniqueidentifier'',NULL,0,0,NULL),
(''Cuenta_Codigo_V41'',''Usuario_Cod_Usuario'',''varchar'',20,0,0,NULL),
(''Cuenta_Codigo_V41'',''Proposito'',''varchar'',20,0,0,NULL),
(''Cuenta_Codigo_V41'',''Canal'',''varchar'',7,0,0,NULL),
(''Cuenta_Codigo_V41'',''Destino'',''varchar'',150,1,0,NULL),
(''Cuenta_Codigo_V41'',''Nonce'',''char'',32,0,0,NULL),
(''Cuenta_Codigo_V41'',''Codigo_Hash'',''char'',64,0,0,NULL),
(''Cuenta_Codigo_V41'',''Desafio_Hash'',''char'',64,1,0,NULL),
(''Cuenta_Codigo_V41'',''Expira'',''datetime2'',NULL,0,0,0),
(''Cuenta_Codigo_V41'',''Consumido'',''bit'',NULL,0,0,NULL),
(''Cuenta_Codigo_V41'',''Creado'',''datetime2'',NULL,0,0,0);
IF EXISTS(SELECT 1 FROM @Esperadas e LEFT JOIN sys.columns c ON c.object_id=OBJECT_ID(''dbo.''+e.Tabla) AND c.name=e.Columna LEFT JOIN sys.types ty ON ty.user_type_id=c.user_type_id WHERE c.column_id IS NULL OR ty.name<>e.Tipo OR c.is_nullable<>e.AdmiteNull OR c.is_identity<>e.Identidad OR (e.Longitud IS NOT NULL AND c.max_length<>e.Longitud) OR (e.Escala IS NOT NULL AND c.scale<>e.Escala))
 THROW 54107,''Tipos, longitudes, nulabilidad o identidad inesperados en las tablas V4.1. No se alteraron datos.'',1;
IF OBJECT_ID(''dbo.PK_Usuario_Seguridad_V41'',''PK'') IS NULL THROW 54108,''Falta la restriccion V4.1 PK_Usuario_Seguridad_V41. Revisar antes de continuar.'',1;
IF OBJECT_ID(''dbo.FK_Seguridad_V41_Usuario'',''F'') IS NULL THROW 54108,''Falta la restriccion V4.1 FK_Seguridad_V41_Usuario. Revisar antes de continuar.'',1;
IF OBJECT_ID(''dbo.CK_Seguridad_V41_Version'',''C'') IS NULL THROW 54108,''Falta la restriccion V4.1 CK_Seguridad_V41_Version. Revisar antes de continuar.'',1;
IF OBJECT_ID(''dbo.PK_Cuenta_Codigo_V41'',''PK'') IS NULL THROW 54108,''Falta la restriccion V4.1 PK_Cuenta_Codigo_V41. Revisar antes de continuar.'',1;
IF OBJECT_ID(''dbo.FK_Codigo_V41_Usuario'',''F'') IS NULL THROW 54108,''Falta la restriccion V4.1 FK_Codigo_V41_Usuario. Revisar antes de continuar.'',1;
IF OBJECT_ID(''dbo.CK_Codigo_V41_Proposito'',''C'') IS NULL THROW 54108,''Falta la restriccion V4.1 CK_Codigo_V41_Proposito. Revisar antes de continuar.'',1;
IF OBJECT_ID(''dbo.CK_Codigo_V41_Canal'',''C'') IS NULL THROW 54108,''Falta la restriccion V4.1 CK_Codigo_V41_Canal. Revisar antes de continuar.'',1;
IF OBJECT_ID(''dbo.CK_Codigo_V41_Intentos'',''C'') IS NULL THROW 54108,''Falta la restriccion V4.1 CK_Codigo_V41_Intentos. Revisar antes de continuar.'',1;
IF OBJECT_ID(''dbo.CK_Codigo_V41_Hash'',''C'') IS NULL THROW 54108,''Falta la restriccion V4.1 CK_Codigo_V41_Hash. Revisar antes de continuar.'',1;
IF OBJECT_ID(''dbo.CK_Codigo_V41_Fechas'',''C'') IS NULL THROW 54108,''Falta la restriccion V4.1 CK_Codigo_V41_Fechas. Revisar antes de continuar.'',1;
 IF NOT EXISTS(SELECT 1 FROM dbo.Control_Migracion_V4 WHERE Script=''V41_01_RECUPERACION_CUENTAS'') INSERT dbo.Control_Migracion_V4(Script) VALUES (''V41_01_RECUPERACION_CUENTAS'');
 COMMIT;
END TRY
BEGIN CATCH
 IF XACT_STATE()<>0 ROLLBACK;
 THROW;
END CATCH;
SELECT Script,Fecha FROM dbo.Control_Migracion_V4 WHERE Script LIKE ''V41[_]%'' ORDER BY Script;
';
-- sql/migrations/v4_1/02_VERIFICACION_CONTACTOS.sql
EXEC sys.sp_executesql N'-- V4.1 incremental. Revisar respaldo, mantenimiento y servidor antes de ejecutar.
SET NOCOUNT ON; SET XACT_ABORT ON; SET ANSI_NULLS ON; SET QUOTED_IDENTIFIER ON;
SET ANSI_PADDING ON; SET ANSI_WARNINGS ON; SET ARITHABORT ON; SET CONCAT_NULL_YIELDS_NULL ON; SET NUMERIC_ROUNDABORT OFF;
DECLARE @BaseEsperada sysname=DB_NAME();
IF DB_NAME()<>@BaseEsperada OR DB_NAME() IN (''master'',''model'',''msdb'',''tempdb'') THROW 54100,''Base incorrecta. Confirme @BaseEsperada y el servidor.'',1;
IF OBJECT_ID(''dbo.Control_Migracion_V4'') IS NULL OR OBJECT_ID(''dbo.Auditoria_V4'') IS NULL OR OBJECT_ID(''dbo.MEDIO_PAGO'') IS NULL
 THROW 54101,''Se requiere completar primero V4. No reconstruya la base.'',1;
IF (SELECT COUNT(*) FROM dbo.Control_Migracion_V4 WHERE Script IN (''00A_PREPARACION_Y_LINEA_BASE'',''01_ACTUALIZACION_CELULARES'',''02_ACTUALIZACION_MATRICULAS'',''03_ACTUALIZACION_PAGOS'',''04_ACTUALIZACION_SIMULACROS'',''05_ACTUALIZACION_HORARIOS'',''06_ACTUALIZACION_USUARIOS''))<>7
 THROW 54102,''El registro de migraciones V4 esta incompleto.'',1;
IF EXISTS(SELECT 1 FROM sys.foreign_keys WHERE is_disabled=1 OR is_not_trusted=1) THROW 54103,''Hay relaciones deshabilitadas o no confiables. Revisar antes de continuar.'',1;
IF EXISTS(SELECT 1 FROM sys.check_constraints WHERE is_disabled=1 OR is_not_trusted=1) THROW 54109,''Hay restricciones CHECK deshabilitadas o no confiables. Revisar sin omitir validaciones.'',1;
IF NOT EXISTS(SELECT 1 FROM dbo.Control_Migracion_V4 WHERE Script=''V41_01_RECUPERACION_CUENTAS'') THROW 54104,''Falta la migracion V4.1 anterior.'',1;
IF NOT EXISTS(SELECT 1 FROM dbo.Control_Migracion_V4 WHERE Script=''V41_02_VERIFICACION_CONTACTOS'') AND (OBJECT_ID(''dbo.Contacto_Verificado_V41'') IS NOT NULL OR OBJECT_ID(''dbo.Solicitud_Contacto_V41'') IS NOT NULL) THROW 54105,''Existe un objeto V4.1 sin registro de esta migracion. Revisar; no se asume propiedad ni se reconstruye.'',1;
IF EXISTS(SELECT 1 FROM dbo.Control_Migracion_V4 WHERE Script=''V41_02_VERIFICACION_CONTACTOS'') AND (OBJECT_ID(''dbo.Contacto_Verificado_V41'') IS NULL OR OBJECT_ID(''dbo.Solicitud_Contacto_V41'') IS NULL) THROW 54106,''Falta un objeto de una migracion ya aplicada. Revisar recuperacion; no se reconstruye una tabla que pudo tener datos.'',1;
BEGIN TRY
 BEGIN TRAN;

IF OBJECT_ID(''dbo.Contacto_Verificado_V41'') IS NULL
 CREATE TABLE dbo.Contacto_Verificado_V41 (
 Id bigint IDENTITY(1,1) NOT NULL CONSTRAINT PK_Contacto_Verificado_V41 PRIMARY KEY,
 ALUMNO_DNI_Alu varchar(8) NOT NULL,Tipo varchar(7) NOT NULL,Destino varchar(150) NOT NULL,
 Activo bit NOT NULL CONSTRAINT DF_Contacto_V41_Activo DEFAULT(1),Metodo varchar(12) NOT NULL,
 Usuario_Cod_Usuario varchar(20) NOT NULL,Verificado datetime2(0) NOT NULL CONSTRAINT DF_Contacto_V41_Fecha DEFAULT SYSUTCDATETIME(),
 CONSTRAINT FK_Contacto_V41_Alumno FOREIGN KEY(ALUMNO_DNI_Alu) REFERENCES dbo.ALUMNO(DNI_Alu),
 CONSTRAINT FK_Contacto_V41_Usuario FOREIGN KEY(Usuario_Cod_Usuario) REFERENCES dbo.Usuario(Cod_Usuario),
 CONSTRAINT CK_Contacto_V41_Tipo CHECK(Tipo IN (''EMAIL'',''SMS'')),
 CONSTRAINT CK_Contacto_V41_Metodo CHECK(Metodo IN (''CODIGO'',''PRESENCIAL'')),
 CONSTRAINT CK_Contacto_V41_Destino CHECK((Tipo=''SMS'' AND DATALENGTH(Destino)=9 AND Destino COLLATE Latin1_General_100_BIN2 NOT LIKE ''%[^0-9]%'') OR (Tipo=''EMAIL'' AND Destino LIKE ''%_@_%._%'' AND Destino NOT LIKE ''% %'')));
ELSE IF COL_LENGTH(''dbo.Contacto_Verificado_V41'',''Destino'')<>150 OR COL_LENGTH(''dbo.Contacto_Verificado_V41'',''Activo'') IS NULL
 THROW 54120,''Contacto_Verificado_V41 tiene una estructura inesperada.'',1;
IF NOT EXISTS(SELECT 1 FROM sys.indexes WHERE object_id=OBJECT_ID(''dbo.Contacto_Verificado_V41'') AND name=''UX_Contacto_V41_Actual'')
 CREATE UNIQUE INDEX UX_Contacto_V41_Actual ON dbo.Contacto_Verificado_V41(ALUMNO_DNI_Alu,Tipo) WHERE Activo=1;
IF OBJECT_ID(''dbo.Solicitud_Contacto_V41'') IS NULL
 CREATE TABLE dbo.Solicitud_Contacto_V41 (
 Id uniqueidentifier NOT NULL CONSTRAINT PK_Solicitud_Contacto_V41 PRIMARY KEY,ALUMNO_DNI_Alu varchar(8) NOT NULL,
 Tipo varchar(7) NOT NULL,Destino varchar(150) NOT NULL,Estado varchar(20) NOT NULL,Codigo_Id uniqueidentifier NULL,
 Creado datetime2(0) NOT NULL CONSTRAINT DF_Solicitud_V41_Creado DEFAULT SYSUTCDATETIME(),Resuelto datetime2(0) NULL,
 Usuario_Cod_Usuario varchar(20) NULL,Motivo varchar(250) NULL,
 CONSTRAINT FK_Solicitud_V41_Alumno FOREIGN KEY(ALUMNO_DNI_Alu) REFERENCES dbo.ALUMNO(DNI_Alu),
 CONSTRAINT FK_Solicitud_V41_Codigo FOREIGN KEY(Codigo_Id) REFERENCES dbo.Cuenta_Codigo_V41(Id),
 CONSTRAINT FK_Solicitud_V41_Usuario FOREIGN KEY(Usuario_Cod_Usuario) REFERENCES dbo.Usuario(Cod_Usuario),
 CONSTRAINT CK_Solicitud_V41_Tipo CHECK(Tipo IN (''EMAIL'',''SMS'')),
 CONSTRAINT CK_Solicitud_V41_Estado CHECK(Estado IN (''PENDIENTE'',''PENDIENTE_ADMIN'',''VERIFICADA'',''APROBADA'',''RECHAZADA'',''REEMPLAZADA'')));
ELSE IF COL_LENGTH(''dbo.Solicitud_Contacto_V41'',''Codigo_Id'') IS NULL OR COL_LENGTH(''dbo.Solicitud_Contacto_V41'',''Estado'')<>20
 THROW 54121,''Solicitud_Contacto_V41 tiene una estructura inesperada.'',1;
IF NOT EXISTS(SELECT 1 FROM sys.indexes WHERE object_id=OBJECT_ID(''dbo.Solicitud_Contacto_V41'') AND name=''IX_Solicitud_V41_AlumnoFecha'')
 CREATE INDEX IX_Solicitud_V41_AlumnoFecha ON dbo.Solicitud_Contacto_V41(ALUMNO_DNI_Alu,Creado) INCLUDE(Estado);
-- La lectura de contactos exige coincidencia con ALUMNO. Este trigger invalida verificaciones al editar contactos por cualquier ruta.
EXEC sys.sp_executesql N''CREATE OR ALTER TRIGGER dbo.TR_V41_Alumno_Contacto ON dbo.ALUMNO AFTER UPDATE AS
BEGIN SET NOCOUNT ON;
 UPDATE c SET Activo=0 FROM dbo.Contacto_Verificado_V41 c JOIN inserted i ON i.DNI_Alu=c.ALUMNO_DNI_Alu
 WHERE c.Activo=1 AND ((c.Tipo=''''EMAIL'''' AND (i.Correo_Alu IS NULL OR c.Destino<>i.Correo_Alu)) OR (c.Tipo=''''SMS'''' AND (i.Cel_Alu IS NULL OR c.Destino<>i.Cel_Alu)));
END;'';
-- No se marca ningun contacto preexistente como verificado.

DECLARE @Esperadas TABLE(Tabla sysname,Columna sysname,Tipo sysname,Longitud int,AdmiteNull bit,Identidad bit,Escala int);
INSERT @Esperadas VALUES (''Contacto_Verificado_V41'',''Id'',''bigint'',NULL,0,1,NULL),
(''Contacto_Verificado_V41'',''ALUMNO_DNI_Alu'',''varchar'',8,0,0,NULL),
(''Contacto_Verificado_V41'',''Tipo'',''varchar'',7,0,0,NULL),
(''Contacto_Verificado_V41'',''Destino'',''varchar'',150,0,0,NULL),
(''Contacto_Verificado_V41'',''Activo'',''bit'',NULL,0,0,NULL),
(''Contacto_Verificado_V41'',''Metodo'',''varchar'',12,0,0,NULL),
(''Contacto_Verificado_V41'',''Usuario_Cod_Usuario'',''varchar'',20,0,0,NULL),
(''Contacto_Verificado_V41'',''Verificado'',''datetime2'',NULL,0,0,0),
(''Solicitud_Contacto_V41'',''Id'',''uniqueidentifier'',NULL,0,0,NULL),
(''Solicitud_Contacto_V41'',''ALUMNO_DNI_Alu'',''varchar'',8,0,0,NULL),
(''Solicitud_Contacto_V41'',''Tipo'',''varchar'',7,0,0,NULL),
(''Solicitud_Contacto_V41'',''Destino'',''varchar'',150,0,0,NULL),
(''Solicitud_Contacto_V41'',''Estado'',''varchar'',20,0,0,NULL),
(''Solicitud_Contacto_V41'',''Codigo_Id'',''uniqueidentifier'',NULL,1,0,NULL),
(''Solicitud_Contacto_V41'',''Creado'',''datetime2'',NULL,0,0,0),
(''Solicitud_Contacto_V41'',''Resuelto'',''datetime2'',NULL,1,0,0),
(''Solicitud_Contacto_V41'',''Usuario_Cod_Usuario'',''varchar'',20,1,0,NULL),
(''Solicitud_Contacto_V41'',''Motivo'',''varchar'',250,1,0,NULL);
IF EXISTS(SELECT 1 FROM @Esperadas e LEFT JOIN sys.columns c ON c.object_id=OBJECT_ID(''dbo.''+e.Tabla) AND c.name=e.Columna LEFT JOIN sys.types ty ON ty.user_type_id=c.user_type_id WHERE c.column_id IS NULL OR ty.name<>e.Tipo OR c.is_nullable<>e.AdmiteNull OR c.is_identity<>e.Identidad OR (e.Longitud IS NOT NULL AND c.max_length<>e.Longitud) OR (e.Escala IS NOT NULL AND c.scale<>e.Escala))
 THROW 54107,''Tipos, longitudes, nulabilidad o identidad inesperados en las tablas V4.1. No se alteraron datos.'',1;
IF OBJECT_ID(''dbo.PK_Contacto_Verificado_V41'',''PK'') IS NULL THROW 54108,''Falta la restriccion V4.1 PK_Contacto_Verificado_V41. Revisar antes de continuar.'',1;
IF OBJECT_ID(''dbo.FK_Contacto_V41_Alumno'',''F'') IS NULL THROW 54108,''Falta la restriccion V4.1 FK_Contacto_V41_Alumno. Revisar antes de continuar.'',1;
IF OBJECT_ID(''dbo.FK_Contacto_V41_Usuario'',''F'') IS NULL THROW 54108,''Falta la restriccion V4.1 FK_Contacto_V41_Usuario. Revisar antes de continuar.'',1;
IF OBJECT_ID(''dbo.CK_Contacto_V41_Tipo'',''C'') IS NULL THROW 54108,''Falta la restriccion V4.1 CK_Contacto_V41_Tipo. Revisar antes de continuar.'',1;
IF OBJECT_ID(''dbo.CK_Contacto_V41_Metodo'',''C'') IS NULL THROW 54108,''Falta la restriccion V4.1 CK_Contacto_V41_Metodo. Revisar antes de continuar.'',1;
IF OBJECT_ID(''dbo.CK_Contacto_V41_Destino'',''C'') IS NULL THROW 54108,''Falta la restriccion V4.1 CK_Contacto_V41_Destino. Revisar antes de continuar.'',1;
IF OBJECT_ID(''dbo.PK_Solicitud_Contacto_V41'',''PK'') IS NULL THROW 54108,''Falta la restriccion V4.1 PK_Solicitud_Contacto_V41. Revisar antes de continuar.'',1;
IF OBJECT_ID(''dbo.FK_Solicitud_V41_Alumno'',''F'') IS NULL THROW 54108,''Falta la restriccion V4.1 FK_Solicitud_V41_Alumno. Revisar antes de continuar.'',1;
IF OBJECT_ID(''dbo.FK_Solicitud_V41_Codigo'',''F'') IS NULL THROW 54108,''Falta la restriccion V4.1 FK_Solicitud_V41_Codigo. Revisar antes de continuar.'',1;
IF OBJECT_ID(''dbo.FK_Solicitud_V41_Usuario'',''F'') IS NULL THROW 54108,''Falta la restriccion V4.1 FK_Solicitud_V41_Usuario. Revisar antes de continuar.'',1;
IF OBJECT_ID(''dbo.CK_Solicitud_V41_Tipo'',''C'') IS NULL THROW 54108,''Falta la restriccion V4.1 CK_Solicitud_V41_Tipo. Revisar antes de continuar.'',1;
IF OBJECT_ID(''dbo.CK_Solicitud_V41_Estado'',''C'') IS NULL THROW 54108,''Falta la restriccion V4.1 CK_Solicitud_V41_Estado. Revisar antes de continuar.'',1;
 IF NOT EXISTS(SELECT 1 FROM dbo.Control_Migracion_V4 WHERE Script=''V41_02_VERIFICACION_CONTACTOS'') INSERT dbo.Control_Migracion_V4(Script) VALUES (''V41_02_VERIFICACION_CONTACTOS'');
 COMMIT;
END TRY
BEGIN CATCH
 IF XACT_STATE()<>0 ROLLBACK;
 THROW;
END CATCH;
SELECT Script,Fecha FROM dbo.Control_Migracion_V4 WHERE Script LIKE ''V41[_]%'' ORDER BY Script;
';
-- sql/migrations/v4_1/03_ESTADOS_Y_ANULACIONES.sql
EXEC sys.sp_executesql N'-- V4.1 incremental. Revisar respaldo, mantenimiento y servidor antes de ejecutar.
SET NOCOUNT ON; SET XACT_ABORT ON; SET ANSI_NULLS ON; SET QUOTED_IDENTIFIER ON;
SET ANSI_PADDING ON; SET ANSI_WARNINGS ON; SET ARITHABORT ON; SET CONCAT_NULL_YIELDS_NULL ON; SET NUMERIC_ROUNDABORT OFF;
DECLARE @BaseEsperada sysname=DB_NAME();
IF DB_NAME()<>@BaseEsperada OR DB_NAME() IN (''master'',''model'',''msdb'',''tempdb'') THROW 54100,''Base incorrecta. Confirme @BaseEsperada y el servidor.'',1;
IF OBJECT_ID(''dbo.Control_Migracion_V4'') IS NULL OR OBJECT_ID(''dbo.Auditoria_V4'') IS NULL OR OBJECT_ID(''dbo.MEDIO_PAGO'') IS NULL
 THROW 54101,''Se requiere completar primero V4. No reconstruya la base.'',1;
IF (SELECT COUNT(*) FROM dbo.Control_Migracion_V4 WHERE Script IN (''00A_PREPARACION_Y_LINEA_BASE'',''01_ACTUALIZACION_CELULARES'',''02_ACTUALIZACION_MATRICULAS'',''03_ACTUALIZACION_PAGOS'',''04_ACTUALIZACION_SIMULACROS'',''05_ACTUALIZACION_HORARIOS'',''06_ACTUALIZACION_USUARIOS''))<>7
 THROW 54102,''El registro de migraciones V4 esta incompleto.'',1;
IF EXISTS(SELECT 1 FROM sys.foreign_keys WHERE is_disabled=1 OR is_not_trusted=1) THROW 54103,''Hay relaciones deshabilitadas o no confiables. Revisar antes de continuar.'',1;
IF EXISTS(SELECT 1 FROM sys.check_constraints WHERE is_disabled=1 OR is_not_trusted=1) THROW 54109,''Hay restricciones CHECK deshabilitadas o no confiables. Revisar sin omitir validaciones.'',1;
IF NOT EXISTS(SELECT 1 FROM dbo.Control_Migracion_V4 WHERE Script=''V41_02_VERIFICACION_CONTACTOS'') THROW 54104,''Falta la migracion V4.1 anterior.'',1;
IF NOT EXISTS(SELECT 1 FROM dbo.Control_Migracion_V4 WHERE Script=''V41_03_ESTADOS_Y_ANULACIONES'') AND (OBJECT_ID(''dbo.Alumno_Estado_V41'') IS NOT NULL OR OBJECT_ID(''dbo.Nota_Estado_V41'') IS NOT NULL) THROW 54105,''Existe un objeto V4.1 sin registro de esta migracion. Revisar; no se asume propiedad ni se reconstruye.'',1;
IF EXISTS(SELECT 1 FROM dbo.Control_Migracion_V4 WHERE Script=''V41_03_ESTADOS_Y_ANULACIONES'') AND (OBJECT_ID(''dbo.Alumno_Estado_V41'') IS NULL OR OBJECT_ID(''dbo.Nota_Estado_V41'') IS NULL) THROW 54106,''Falta un objeto de una migracion ya aplicada. Revisar recuperacion; no se reconstruye una tabla que pudo tener datos.'',1;
BEGIN TRY
 BEGIN TRAN;

-- MATRICULA y Examen_Grupo ya tienen ANULADA/CANCELADO; Pago conserva su anulacion de confirmacion V4.
-- Las dos tablas laterales preservan las claves y el contenido original de alumnos/notas.
IF OBJECT_ID(''dbo.Alumno_Estado_V41'') IS NULL
 CREATE TABLE dbo.Alumno_Estado_V41 (
 ALUMNO_DNI_Alu varchar(8) NOT NULL CONSTRAINT PK_Alumno_Estado_V41 PRIMARY KEY,
 Activo bit NOT NULL,Usuario_Activo_Anterior bit NULL,Motivo varchar(250) NOT NULL,Usuario_Cod_Usuario varchar(20) NOT NULL,
 Fecha datetime2(0) NOT NULL CONSTRAINT DF_Alumno_Estado_V41_Fecha DEFAULT SYSUTCDATETIME(),
 CONSTRAINT FK_Alumno_Estado_V41_Alumno FOREIGN KEY(ALUMNO_DNI_Alu) REFERENCES dbo.ALUMNO(DNI_Alu),
 CONSTRAINT FK_Alumno_Estado_V41_Usuario FOREIGN KEY(Usuario_Cod_Usuario) REFERENCES dbo.Usuario(Cod_Usuario));
ELSE IF COL_LENGTH(''dbo.Alumno_Estado_V41'',''Usuario_Activo_Anterior'') IS NULL THROW 54130,''Alumno_Estado_V41 tiene una estructura inesperada.'',1;
IF OBJECT_ID(''dbo.Nota_Estado_V41'') IS NULL
 CREATE TABLE dbo.Nota_Estado_V41 (
 Nota_Examen_Cod_Nota varchar(20) NOT NULL CONSTRAINT PK_Nota_Estado_V41 PRIMARY KEY,
 Anulada bit NOT NULL,Motivo varchar(250) NOT NULL,Usuario_Cod_Usuario varchar(20) NOT NULL,
 Fecha datetime2(0) NOT NULL CONSTRAINT DF_Nota_Estado_V41_Fecha DEFAULT SYSUTCDATETIME(),
 CONSTRAINT FK_Nota_Estado_V41_Nota FOREIGN KEY(Nota_Examen_Cod_Nota) REFERENCES dbo.Nota_Examen(Cod_Nota),
 CONSTRAINT FK_Nota_Estado_V41_Usuario FOREIGN KEY(Usuario_Cod_Usuario) REFERENCES dbo.Usuario(Cod_Usuario));
ELSE IF COL_LENGTH(''dbo.Nota_Estado_V41'',''Anulada'') IS NULL THROW 54131,''Nota_Estado_V41 tiene una estructura inesperada.'',1;
-- No se desactiva, anula ni restaura ningun registro durante la migracion.

DECLARE @Esperadas TABLE(Tabla sysname,Columna sysname,Tipo sysname,Longitud int,AdmiteNull bit,Identidad bit,Escala int);
INSERT @Esperadas VALUES (''Alumno_Estado_V41'',''ALUMNO_DNI_Alu'',''varchar'',8,0,0,NULL),
(''Alumno_Estado_V41'',''Activo'',''bit'',NULL,0,0,NULL),
(''Alumno_Estado_V41'',''Usuario_Activo_Anterior'',''bit'',NULL,1,0,NULL),
(''Alumno_Estado_V41'',''Motivo'',''varchar'',250,0,0,NULL),
(''Alumno_Estado_V41'',''Usuario_Cod_Usuario'',''varchar'',20,0,0,NULL),
(''Alumno_Estado_V41'',''Fecha'',''datetime2'',NULL,0,0,0),
(''Nota_Estado_V41'',''Nota_Examen_Cod_Nota'',''varchar'',20,0,0,NULL),
(''Nota_Estado_V41'',''Anulada'',''bit'',NULL,0,0,NULL),
(''Nota_Estado_V41'',''Motivo'',''varchar'',250,0,0,NULL),
(''Nota_Estado_V41'',''Usuario_Cod_Usuario'',''varchar'',20,0,0,NULL),
(''Nota_Estado_V41'',''Fecha'',''datetime2'',NULL,0,0,0);
IF EXISTS(SELECT 1 FROM @Esperadas e LEFT JOIN sys.columns c ON c.object_id=OBJECT_ID(''dbo.''+e.Tabla) AND c.name=e.Columna LEFT JOIN sys.types ty ON ty.user_type_id=c.user_type_id WHERE c.column_id IS NULL OR ty.name<>e.Tipo OR c.is_nullable<>e.AdmiteNull OR c.is_identity<>e.Identidad OR (e.Longitud IS NOT NULL AND c.max_length<>e.Longitud) OR (e.Escala IS NOT NULL AND c.scale<>e.Escala))
 THROW 54107,''Tipos, longitudes, nulabilidad o identidad inesperados en las tablas V4.1. No se alteraron datos.'',1;
IF OBJECT_ID(''dbo.PK_Alumno_Estado_V41'',''PK'') IS NULL THROW 54108,''Falta la restriccion V4.1 PK_Alumno_Estado_V41. Revisar antes de continuar.'',1;
IF OBJECT_ID(''dbo.FK_Alumno_Estado_V41_Alumno'',''F'') IS NULL THROW 54108,''Falta la restriccion V4.1 FK_Alumno_Estado_V41_Alumno. Revisar antes de continuar.'',1;
IF OBJECT_ID(''dbo.FK_Alumno_Estado_V41_Usuario'',''F'') IS NULL THROW 54108,''Falta la restriccion V4.1 FK_Alumno_Estado_V41_Usuario. Revisar antes de continuar.'',1;
IF OBJECT_ID(''dbo.PK_Nota_Estado_V41'',''PK'') IS NULL THROW 54108,''Falta la restriccion V4.1 PK_Nota_Estado_V41. Revisar antes de continuar.'',1;
IF OBJECT_ID(''dbo.FK_Nota_Estado_V41_Nota'',''F'') IS NULL THROW 54108,''Falta la restriccion V4.1 FK_Nota_Estado_V41_Nota. Revisar antes de continuar.'',1;
IF OBJECT_ID(''dbo.FK_Nota_Estado_V41_Usuario'',''F'') IS NULL THROW 54108,''Falta la restriccion V4.1 FK_Nota_Estado_V41_Usuario. Revisar antes de continuar.'',1;
 IF NOT EXISTS(SELECT 1 FROM dbo.Control_Migracion_V4 WHERE Script=''V41_03_ESTADOS_Y_ANULACIONES'') INSERT dbo.Control_Migracion_V4(Script) VALUES (''V41_03_ESTADOS_Y_ANULACIONES'');
 COMMIT;
END TRY
BEGIN CATCH
 IF XACT_STATE()<>0 ROLLBACK;
 THROW;
END CATCH;
SELECT Script,Fecha FROM dbo.Control_Migracion_V4 WHERE Script LIKE ''V41[_]%'' ORDER BY Script;
';
-- sql/migrations/v4_1/04_AUDITORIA_ADMINISTRATIVA.sql
EXEC sys.sp_executesql N'-- V4.1 incremental. Revisar respaldo, mantenimiento y servidor antes de ejecutar.
SET NOCOUNT ON; SET XACT_ABORT ON; SET ANSI_NULLS ON; SET QUOTED_IDENTIFIER ON;
SET ANSI_PADDING ON; SET ANSI_WARNINGS ON; SET ARITHABORT ON; SET CONCAT_NULL_YIELDS_NULL ON; SET NUMERIC_ROUNDABORT OFF;
DECLARE @BaseEsperada sysname=DB_NAME();
IF DB_NAME()<>@BaseEsperada OR DB_NAME() IN (''master'',''model'',''msdb'',''tempdb'') THROW 54100,''Base incorrecta. Confirme @BaseEsperada y el servidor.'',1;
IF OBJECT_ID(''dbo.Control_Migracion_V4'') IS NULL OR OBJECT_ID(''dbo.Auditoria_V4'') IS NULL OR OBJECT_ID(''dbo.MEDIO_PAGO'') IS NULL
 THROW 54101,''Se requiere completar primero V4. No reconstruya la base.'',1;
IF (SELECT COUNT(*) FROM dbo.Control_Migracion_V4 WHERE Script IN (''00A_PREPARACION_Y_LINEA_BASE'',''01_ACTUALIZACION_CELULARES'',''02_ACTUALIZACION_MATRICULAS'',''03_ACTUALIZACION_PAGOS'',''04_ACTUALIZACION_SIMULACROS'',''05_ACTUALIZACION_HORARIOS'',''06_ACTUALIZACION_USUARIOS''))<>7
 THROW 54102,''El registro de migraciones V4 esta incompleto.'',1;
IF EXISTS(SELECT 1 FROM sys.foreign_keys WHERE is_disabled=1 OR is_not_trusted=1) THROW 54103,''Hay relaciones deshabilitadas o no confiables. Revisar antes de continuar.'',1;
IF EXISTS(SELECT 1 FROM sys.check_constraints WHERE is_disabled=1 OR is_not_trusted=1) THROW 54109,''Hay restricciones CHECK deshabilitadas o no confiables. Revisar sin omitir validaciones.'',1;
IF NOT EXISTS(SELECT 1 FROM dbo.Control_Migracion_V4 WHERE Script=''V41_03_ESTADOS_Y_ANULACIONES'') THROW 54104,''Falta la migracion V4.1 anterior.'',1;
BEGIN TRY
 BEGIN TRAN;

-- Reutiliza Auditoria_V4 y su FK a Usuario. No cambia su estructura ni borra historia.
IF OBJECT_ID(''dbo.TR_V4_Auditoria_Inmutable'',''TR'') IS NULL OR EXISTS(SELECT 1 FROM sys.triggers WHERE object_id=OBJECT_ID(''dbo.TR_V4_Auditoria_Inmutable'') AND is_disabled=1)
 THROW 54140,''La proteccion de auditoria V4 debe estar instalada y activa.'',1;
IF NOT EXISTS(SELECT 1 FROM sys.indexes WHERE object_id=OBJECT_ID(''dbo.Auditoria_V4'') AND name=''IX_Auditoria_V41_Fecha'')
 CREATE INDEX IX_Auditoria_V41_Fecha ON dbo.Auditoria_V4(Fecha DESC,Id DESC) INCLUDE(Entidad,Codigo,Accion,Usuario_Cod_Usuario);
-- El backend registra cambios y eliminaciones de catalogos en la misma transaccion.
-- Nunca registra contrasenas, OTP, hashes de claves ni desafios de activacion en Auditoria_V4.


 IF NOT EXISTS(SELECT 1 FROM dbo.Control_Migracion_V4 WHERE Script=''V41_04_AUDITORIA_ADMINISTRATIVA'') INSERT dbo.Control_Migracion_V4(Script) VALUES (''V41_04_AUDITORIA_ADMINISTRATIVA'');
 COMMIT;
END TRY
BEGIN CATCH
 IF XACT_STATE()<>0 ROLLBACK;
 THROW;
END CATCH;
SELECT Script,Fecha FROM dbo.Control_Migracion_V4 WHERE Script LIKE ''V41[_]%'' ORDER BY Script;
';
-- sql/migrations/v4_3/01_APODERADOS_Y_PRUEBAS.sql
EXEC sys.sp_executesql N'-- Incremental y no destructivo. Revisar respaldo y ejecutar 00_DIAGNOSTICO.sql primero.
SET NOCOUNT ON; SET XACT_ABORT ON;
SET ANSI_NULLS ON; SET QUOTED_IDENTIFIER ON; SET ANSI_PADDING ON; SET ANSI_WARNINGS ON;
SET ARITHABORT ON; SET CONCAT_NULL_YIELDS_NULL ON; SET NUMERIC_ROUNDABORT OFF;
DECLARE @BaseEsperada sysname=DB_NAME();
IF DB_NAME()<>@BaseEsperada OR DB_NAME() IN (''master'',''model'',''msdb'',''tempdb'') THROW 54300,''Confirma servidor y @BaseEsperada antes de migrar.'',1;
IF OBJECT_ID(''dbo.Control_Migracion_V4'') IS NULL THROW 54301,''Completa V4 y V4.1 antes de V4.3.'',1;
IF NOT EXISTS(SELECT 1 FROM dbo.Control_Migracion_V4 WHERE Script=''V41_04_AUDITORIA_ADMINISTRATIVA'') THROW 54301,''Completa V4.1 antes de V4.3.'',1;
IF EXISTS(SELECT 1 FROM sys.foreign_keys WHERE is_disabled=1 OR is_not_trusted=1) OR EXISTS(SELECT 1 FROM sys.check_constraints WHERE is_disabled=1 OR is_not_trusted=1) THROW 54302,''Revisa restricciones deshabilitadas o no confiables.'',1;
BEGIN TRY
 BEGIN TRAN;
 IF NOT EXISTS(SELECT 1 FROM dbo.Control_Migracion_V4 WITH (UPDLOCK,HOLDLOCK) WHERE Script=''V43_01_APODERADOS_Y_PRUEBAS'')
 BEGIN
  IF OBJECT_ID(''dbo.APODERADO'') IS NOT NULL OR COL_LENGTH(''dbo.ALUMNO'',''Es_Prueba'') IS NOT NULL OR COL_LENGTH(''dbo.Usuario'',''Correo_Recuperacion'') IS NOT NULL OR COL_LENGTH(''dbo.Usuario'',''Correo_Verificado'') IS NOT NULL THROW 54303,''Hay objetos V4.3 sin registro de migracion. No se asume su propiedad.'',1;
  IF EXISTS(SELECT 1 FROM dbo.ALUMNO WHERE DNI_Apoderado IS NOT NULL GROUP BY DNI_Apoderado
   HAVING COUNT(DISTINCT Nomb_Apoderado)>1 OR COUNT(DISTINCT ISNULL(Cel_Apoderado,''''))>1 OR COUNT(DISTINCT ISNULL(Correo_Apoderado,''''))>1)
   THROW 54304,''Hay apoderados con el mismo DNI y datos distintos. Revisa el diagnostico sin sobrescribir personas.'',1;
  CREATE TABLE dbo.APODERADO(
   DNI_Apoderado varchar(8) NOT NULL CONSTRAINT PK_APODERADO PRIMARY KEY,
   Nomb_Apoderado varchar(120) NOT NULL,
   Cel_Apoderado varchar(9) NULL,
   Correo_Apoderado varchar(150) NULL,
   CONSTRAINT CK_APODERADO_DNI CHECK(DATALENGTH(DNI_Apoderado)=8 AND DNI_Apoderado COLLATE Latin1_General_100_BIN2 NOT LIKE ''%[^0-9]%''),
   CONSTRAINT CK_APODERADO_Cel CHECK(Cel_Apoderado IS NULL OR (DATALENGTH(Cel_Apoderado)=9 AND Cel_Apoderado COLLATE Latin1_General_100_BIN2 NOT LIKE ''%[^0-9]%'')),
   CONSTRAINT CK_APODERADO_Nombre CHECK(LEN(LTRIM(RTRIM(Nomb_Apoderado)))>0));
  INSERT dbo.APODERADO(DNI_Apoderado,Nomb_Apoderado,Cel_Apoderado,Correo_Apoderado)
   SELECT DNI_Apoderado,MAX(Nomb_Apoderado),MAX(Cel_Apoderado),MAX(Correo_Apoderado) FROM dbo.ALUMNO WHERE DNI_Apoderado IS NOT NULL GROUP BY DNI_Apoderado;
  -- Los alumnos antiguos sin DNI de apoderado permanecen sin vinculo, sin inventar identidad.
  ALTER TABLE dbo.ALUMNO WITH CHECK ADD CONSTRAINT FK_ALUMNO_APODERADO FOREIGN KEY(DNI_Apoderado) REFERENCES dbo.APODERADO(DNI_Apoderado);
  CREATE INDEX IX_ALUMNO_APODERADO ON dbo.ALUMNO(DNI_Apoderado);
  ALTER TABLE dbo.ALUMNO ADD Es_Prueba bit NOT NULL CONSTRAINT DF_ALUMNO_EsPrueba DEFAULT(0) WITH VALUES;
  ALTER TABLE dbo.Usuario ADD Correo_Recuperacion varchar(150) NULL,
   Correo_Verificado bit NOT NULL CONSTRAINT DF_Usuario_CorreoVerificado DEFAULT(0) WITH VALUES;
  EXEC sys.sp_executesql N''ALTER TABLE dbo.Usuario WITH CHECK ADD CONSTRAINT CK_Usuario_CorreoVerificado CHECK(Correo_Verificado=0 OR Correo_Recuperacion IS NOT NULL);'';
  EXEC sys.sp_executesql N''CREATE OR ALTER TRIGGER dbo.TR_V43_Usuario_Correo ON dbo.Usuario AFTER UPDATE AS
  BEGIN SET NOCOUNT ON;
   IF EXISTS(SELECT 1 FROM inserted i JOIN deleted d ON d.Cod_Usuario=i.Cod_Usuario
     WHERE (ISNULL(i.Correo_Recuperacion,'''''''')<>ISNULL(d.Correo_Recuperacion,'''''''') OR d.Correo_Verificado=0) AND i.Correo_Verificado=1
     AND NOT EXISTS(SELECT 1 FROM dbo.Cuenta_Codigo_V41 c WHERE c.Usuario_Cod_Usuario=i.Cod_Usuario AND c.Proposito=''''VERIFICAR_CONTACTO'''' AND c.Canal=''''EMAIL'''' AND c.Destino=i.Correo_Recuperacion AND c.Consumido=1 AND c.Expira>SYSUTCDATETIME()))
    THROW 54309,''''El correo de recuperacion debe verificarse con un codigo vigente.'''',1;
  END;'';
  -- La marca solo se establece al crear el registro; no convertir personas reales en pruebas.
  EXEC sys.sp_executesql N''CREATE OR ALTER TRIGGER dbo.TR_V43_MarcaPrueba ON dbo.ALUMNO AFTER UPDATE AS
  BEGIN SET NOCOUNT ON;
   IF EXISTS(SELECT 1 FROM inserted i JOIN deleted d ON d.DNI_Alu=i.DNI_Alu WHERE i.Es_Prueba<>d.Es_Prueba)
    THROW 54305,''''La identificacion de prueba solo se establece al crear el estudiante.'''',1;
  END;'';
  -- Las columnas antiguas se mantienen sincronizadas para los clientes anteriores.
  EXEC sys.sp_executesql N''CREATE OR ALTER TRIGGER dbo.TR_V43_Apoderado_Alumno ON dbo.ALUMNO AFTER INSERT,UPDATE AS
  BEGIN SET NOCOUNT ON;
   IF EXISTS(SELECT 1 FROM inserted i JOIN dbo.APODERADO p ON p.DNI_Apoderado=i.DNI_Apoderado
    WHERE i.Nomb_Apoderado<>p.Nomb_Apoderado OR ISNULL(i.Cel_Apoderado,'''''''')<>ISNULL(p.Cel_Apoderado,'''''''') OR ISNULL(i.Correo_Apoderado,'''''''')<>ISNULL(p.Correo_Apoderado,''''''''))
    THROW 54306,''''Edita los datos compartidos desde Apoderados.'''',1;
  END;'';
  EXEC sys.sp_executesql N''CREATE OR ALTER TRIGGER dbo.TR_V43_Apoderado_Compartido ON dbo.APODERADO AFTER UPDATE AS
  BEGIN SET NOCOUNT ON;
   UPDATE a SET Nomb_Apoderado=i.Nomb_Apoderado,Cel_Apoderado=i.Cel_Apoderado,Correo_Apoderado=i.Correo_Apoderado
   FROM dbo.ALUMNO a JOIN inserted i ON i.DNI_Apoderado=a.DNI_Apoderado;
  END;'';
  -- Conservar tarifas históricas; nuevas ediciones o cambios de tarifa deben respetar S/250.
  EXEC sys.sp_executesql N''CREATE OR ALTER TRIGGER dbo.TR_V43_Tarifa_Ciclo ON dbo.Ciclo AFTER INSERT,UPDATE AS
  BEGIN SET NOCOUNT ON;
   IF EXISTS(SELECT 1 FROM inserted i LEFT JOIN deleted d ON d.Cod_Ciclo=i.Cod_Ciclo WHERE i.Precio_Mensual<>250 AND (d.Cod_Ciclo IS NULL OR d.Precio_Mensual<>i.Precio_Mensual))
    THROW 54309,''''La tarifa nueva debe ser S/250 por mensualidad. Las obligaciones historicas se conservan.'''',1;
  END;'';
  INSERT dbo.Control_Migracion_V4(Script) VALUES(''V43_01_APODERADOS_Y_PRUEBAS'');
 END;
 IF OBJECT_ID(''dbo.PK_APODERADO'',''PK'') IS NULL OR OBJECT_ID(''dbo.FK_ALUMNO_APODERADO'',''F'') IS NULL OR COL_LENGTH(''dbo.ALUMNO'',''Es_Prueba'') IS NULL
  THROW 54307,''El esquema V4.3 esta incompleto. Restaura o revisa; no reconstruyas tablas con historia.'',1;
 IF EXISTS(SELECT 1 FROM (VALUES(''DNI_Apoderado'',''varchar'',8,0),(''Nomb_Apoderado'',''varchar'',120,0),(''Cel_Apoderado'',''varchar'',9,1),(''Correo_Apoderado'',''varchar'',150,1)) e(Nombre,Tipo,Longitud,Nulo)
  LEFT JOIN sys.columns c ON c.object_id=OBJECT_ID(''dbo.APODERADO'') AND c.name=e.Nombre LEFT JOIN sys.types t ON t.user_type_id=c.user_type_id
  WHERE c.column_id IS NULL OR t.name<>e.Tipo OR c.max_length<>e.Longitud OR c.is_nullable<>e.Nulo)
  THROW 54307,''Tipos o nulabilidad inesperados en APODERADO.'',1;
 IF NOT EXISTS(SELECT 1 FROM sys.columns c JOIN sys.types t ON t.user_type_id=c.user_type_id WHERE c.object_id=OBJECT_ID(''dbo.ALUMNO'') AND c.name=''Es_Prueba'' AND t.name=''bit'' AND c.is_nullable=0)
  THROW 54307,''La identificacion de pruebas tiene una estructura inesperada.'',1;
 IF COL_LENGTH(''dbo.Usuario'',''Correo_Recuperacion'')<>150 OR COL_LENGTH(''dbo.Usuario'',''Correo_Verificado'') IS NULL THROW 54307,''Faltan campos de recuperacion de administradores.'',1;
 IF EXISTS(SELECT 1 FROM (VALUES(''TR_V43_MarcaPrueba''),(''TR_V43_Apoderado_Alumno''),(''TR_V43_Apoderado_Compartido''),(''TR_V43_Tarifa_Ciclo''),(''TR_V43_Usuario_Correo'')) e(Nombre)
  LEFT JOIN sys.triggers t ON t.object_id=OBJECT_ID(''dbo.''+e.Nombre) WHERE t.object_id IS NULL OR t.is_disabled=1)
  THROW 54307,''Falta una proteccion V4.3 o esta deshabilitada.'',1;
 IF EXISTS(SELECT 1 FROM (VALUES(''CK_APODERADO_DNI''),(''CK_APODERADO_Cel''),(''CK_APODERADO_Nombre'')) e(Nombre)
  LEFT JOIN sys.check_constraints c ON c.object_id=OBJECT_ID(''dbo.''+e.Nombre) WHERE c.object_id IS NULL OR c.is_disabled=1 OR c.is_not_trusted=1)
  THROW 54307,''Falta una restriccion validada de APODERADO.'',1;
 COMMIT;
END TRY
BEGIN CATCH
 IF XACT_STATE()<>0 ROLLBACK;
 THROW;
END CATCH;
';
COMMIT;
END TRY
BEGIN CATCH
 IF XACT_STATE()<>0 ROLLBACK;
 THROW;
END CATCH;
