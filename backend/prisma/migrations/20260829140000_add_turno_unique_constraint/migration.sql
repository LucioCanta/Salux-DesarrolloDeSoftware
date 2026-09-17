-- AlterTable
ALTER TABLE `Turno` ADD UNIQUE INDEX `Turno_medicoId_fechaYhora_key`(`medicoId`, `fechaYhora`);
