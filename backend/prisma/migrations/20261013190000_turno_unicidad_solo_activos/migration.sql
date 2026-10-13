-- La unicidad de horario debe aplicar solo a turnos activos: un turno
-- cancelado no puede seguir bloqueando ese horario para siempre.
-- Columnas generadas: valen el id mientras el turno NO está cancelado y NULL
-- al cancelarse (MySQL admite varios NULL en un índice único).
ALTER TABLE `Turno`
  ADD COLUMN `medicoSlotActivo` INTEGER GENERATED ALWAYS AS (IF(`estado` = 'CANCELADO', NULL, `medicoId`)) VIRTUAL,
  ADD COLUMN `pacienteSlotActivo` INTEGER GENERATED ALWAYS AS (IF(`estado` = 'CANCELADO', NULL, `pacienteId`)) VIRTUAL;

-- Las claves foráneas se apoyaban en los únicos viejos: primero índices propios.
CREATE INDEX `Turno_medicoId_idx` ON `Turno`(`medicoId`);
CREATE INDEX `Turno_pacienteId_idx` ON `Turno`(`pacienteId`);

DROP INDEX `Turno_medicoId_fechaYhora_key` ON `Turno`;
DROP INDEX `Turno_pacienteId_fechaYhora_key` ON `Turno`;

CREATE UNIQUE INDEX `Turno_medicoSlotActivo_fechaYhora_key` ON `Turno`(`medicoSlotActivo`, `fechaYhora`);
CREATE UNIQUE INDEX `Turno_pacienteSlotActivo_fechaYhora_key` ON `Turno`(`pacienteSlotActivo`, `fechaYhora`);
