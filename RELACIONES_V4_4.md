# Relaciones de Fractales Academy V4.4

35 tablas y 41 claves foráneas en el esquema estándar, comprobadas en SQL Server local. El diagrama incluye los catálogos y las seis tablas de seguridad V4.1. Las dos tablas técnicas sin FK aparecen como entidades independientes.

```mermaid
erDiagram
    CARRERA ||--o{ ALUMNO : CARRERA_Cod_Carrera
    PARENTESCO o|--o{ ALUMNO : PARENTESCO_Cod_Paren
    Programa ||--o{ Ciclo : Programa_Cod_Programa
    ESTADO_CICLO ||--o{ Ciclo : ESTADO_CICLO_Cod_Estado
    Aula ||--o{ Grupo : Aula_Cod_Aula
    Ciclo ||--o{ Grupo : Ciclo_Cod_Ciclo
    Turno ||--o{ Grupo : Turno_Cod_Turno
    CURSOS ||--o{ Docente_Asignatura : CURSOS_Cod_Curso
    Docente ||--o{ Docente_Asignatura : Docente_DNI_Doc
    Docente_Asignatura o|--o{ Horario : curso_y_docente
    Grupo ||--o{ Horario : Grupo_Cod_Grupo
    Usuario o|--o{ Horario : Autorizado_Por
    TIPO_BLOQUE ||--o{ Horario : TIPO_BLOQUE_Cod_Tipo
    ALUMNO ||--o{ MATRICULA : ALUMNO_DNI_Alu
    ESTADO_MATRICULA ||--o{ MATRICULA : estado
    Grupo ||--o{ MATRICULA : Grupo_Cod_Grupo
    ALUMNO o|--o| Usuario : ALUMNO_DNI_Alu
    ROL ||--o{ Usuario : ROL_Cod_Rol
    ALUMNO ||--o{ Pago : ALUMNO_DNI_Alu
    MATRICULA o|--o{ Pago : matricula_y_alumno
    CONCEPTO_PAGO ||--o{ Pago : concepto
    ESTADO_PAGO ||--o{ Pago : estado
    MEDIO_PAGO o|--o{ Pago : Medio_Pago
    Usuario o|--o{ Pago : cajero
    ESTADO_EXAMEN_GRUPO ||--o{ Examen_Grupo : estado
    Examen ||--o{ Examen_Grupo : Examen_Cod_Examen
    Grupo ||--o{ Examen_Grupo : Grupo_Cod_Grupo
    Examen_Grupo ||--o{ Nota_Examen : examen_y_grupo
    MATRICULA ||--o{ Nota_Examen : matricula_y_grupo
    Usuario ||--o{ Auditoria_V4 : actor
    Usuario ||--o| Usuario_Seguridad_V41 : cuenta
    Usuario ||--o{ Cuenta_Codigo_V41 : cuenta
    ALUMNO ||--o{ Contacto_Verificado_V41 : alumno
    Usuario ||--o{ Contacto_Verificado_V41 : verificador
    ALUMNO ||--o{ Solicitud_Contacto_V41 : alumno
    Cuenta_Codigo_V41 o|--o{ Solicitud_Contacto_V41 : codigo
    Usuario o|--o{ Solicitud_Contacto_V41 : administrador
    ALUMNO ||--o| Alumno_Estado_V41 : alumno
    Usuario ||--o{ Alumno_Estado_V41 : administrador
    Nota_Examen ||--o| Nota_Estado_V41 : nota
    Usuario ||--o{ Nota_Estado_V41 : administrador

    Grupo {
        varchar20 Cod_Grupo PK
        varchar60 Nomb_Grupo
        varchar20 Ciclo_Cod_Ciclo FK
        varchar10 Turno_Cod_Turno FK
        varchar10 Aula_Cod_Aula FK
        smallint Cupo_Max
        varchar10 Estado_Horario
        int Version_Horario
        bit Activo
    }
    Horario {
        varchar20 Cod_Horario PK
        varchar20 Grupo_Cod_Grupo FK
        tinyint Dia_Semana
        time Hr_Inicio
        time Hr_Fin
        bit Excepcion_Turno
        nvarchar250 Motivo_Excepcion
        varchar20 Autorizado_Por FK
    }
    ALUMNO {
        varchar8 DNI_Alu PK
        varchar120 Nomb_Alu
        varchar8 DNI_Apoderado
        bit Es_Prueba
    }
    Usuario {
        varchar20 Cod_Usuario PK
        varchar8 ALUMNO_DNI_Alu FK
        varchar150 Correo_Recuperacion
        bit Correo_Verificado
    }
    Control_Migracion_V4 {
        varchar100 Script PK
        datetime2 Fecha
    }
    Linea_Base_V4 {
        sysname Tabla PK
        nvarchar200 Clave PK
        varbinary32 Huella
    }
```

Grupo es la cabecera del horario académico y Horario contiene sus bloques. Matrículas y simulacros conservan las mismas claves. Modalidad y fechas se obtienen de Ciclo; no se duplican en cada bloque. Las FK compuestas de Nota_Examen garantizan la pertenencia al mismo conjunto; la FK compuesta de Pago protege al alumno de la matrícula.

El contacto de apoderado permanece en ALUMNO: DNI sin FK ni UNIQUE, nombre/celular/correo opcionales y parentesco mediante FK nullable. APODERADO ya no existe; su respaldo histórico se conserva en Auditoria_V4. La nueva FK Horario.Autorizado_Por identifica al administrador que autoriza una excepción de turno.

Unicidad publicada: ciclo + turno + aula, con Activo=1 y Estado_Horario=PUBLICADO. Los borradores no reservan recursos. No se introduce ON DELETE CASCADE. Consultar 00 y 05 de sql/migrations/v4_4 para inventario efectivo, nombres de restricciones y extensiones particulares de la base.
