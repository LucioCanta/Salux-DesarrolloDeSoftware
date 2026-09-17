-- AlterTable
ALTER TABLE `Especialidad` ADD UNIQUE INDEX `Especialidad_nombre_key`(`nombre`);

-- AlterTable
ALTER TABLE `Turno` ADD UNIQUE INDEX `Turno_pacienteId_fechaYhora_key`(`pacienteId`, `fechaYhora`);
