# Relaciones de Fractales Academy V4.3

Esquema resultante: 36 tablas y 41 claves foráneas. Se conservan las 25 tablas originales, las diez extensiones ya existentes y sus tipos. Se incorpora APODERADO como única tabla funcional nueva. Los catálogos de estado y las tablas de seguridad son parte del modelo aunque no todas tengan una pantalla propia.

```mermaid
erDiagram
    CARRERA ||--o{ ALUMNO : CARRERA_Cod_Carrera
    PARENTESCO ||--o{ ALUMNO : PARENTESCO_Cod_Paren
    APODERADO o|--o{ ALUMNO : DNI_Apoderado
    Programa ||--o{ Ciclo : Programa_Cod_Programa
    ESTADO_CICLO ||--o{ Ciclo : ESTADO_CICLO_Cod_Estado
    Aula ||--o{ Grupo : Aula_Cod_Aula
    Ciclo ||--o{ Grupo : Ciclo_Cod_Ciclo
    Turno ||--o{ Grupo : Turno_Cod_Turno
    CURSOS ||--o{ Docente_Asignatura : CURSOS_Cod_Curso
    Docente ||--o{ Docente_Asignatura : Docente_DNI_Doc
    Docente_Asignatura o|--o{ Horario : curso_y_docente
    Grupo ||--o{ Horario : Grupo_Cod_Grupo
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

    APODERADO {
        varchar8 DNI_Apoderado PK
        varchar120 Nomb_Apoderado
        varchar9 Cel_Apoderado
        varchar150 Correo_Apoderado
    }
    ALUMNO {
        varchar8 DNI_Alu PK
        varchar120 Nomb_Alu
        varchar8 DNI_Apoderado FK
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

`Control_Migracion_V4` y `Linea_Base_V4` son las dos tablas técnicas sin FK. Las notas tienen FK compuestas para asegurar que matrícula y simulacro pertenecen al mismo grupo. La FK de Pago a matrícula también protege la identidad del alumno. Una matrícula nueva no almacena ciclo/modalidad duplicados: se obtienen desde su grupo y ciclo.

`DNI_Apoderado` sigue siendo nullable para conservar estudiantes antiguos sin ese documento. Toda nueva alta V4.3 exige un apoderado identificado. El parentesco se conserva en ALUMNO porque corresponde a la relación con ese estudiante. Las columnas antiguas de nombre/celular/correo del apoderado se conservan y sincronizan mediante triggers, evitando pérdida de datos o ruptura de clientes anteriores.

El inventario y las definiciones efectivas se revisan con `00_DIAGNOSTICO.sql` y `99_VERIFICAR.sql`. La presencia de una tabla adicional en una base existente exige revisar sus FK antes de eliminar registros; la API inspecciona las relaciones reales y bloquea dependencias no contempladas.
