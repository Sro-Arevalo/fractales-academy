-- Comprobación final de instalación/actualización
SELECT DB_NAME() AS BaseActual,
  (SELECT COUNT(*) FROM sys.tables WHERE schema_id=SCHEMA_ID('dbo')) AS Tablas,
  (SELECT COUNT(*) FROM sys.foreign_keys WHERE schema_id=SCHEMA_ID('dbo')) AS ClavesForaneas,
  (SELECT COUNT(*) FROM sys.triggers WHERE name IN ('TR_Pago_Mes_Valido','TR_Horario_Sin_Cruces','TR_Nota_Examen_Puntaje','TR_Matricula_CupoMaximo')) AS TriggersNuevos,
  (SELECT COUNT(*) FROM sys.indexes WHERE name IN ('UX_Usuario_UnicaCuentaAlumno','UX_Pago_ConceptoUnicoAlumno','UX_Pago_MensualidadMatricula')) AS IndicesNuevos;
GO
