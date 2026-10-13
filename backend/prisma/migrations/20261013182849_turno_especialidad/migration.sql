-- AlterTable
ALTER TABLE `Turno` ADD COLUMN `especialidadId` INTEGER NULL;

-- AddForeignKey
ALTER TABLE `Turno` ADD CONSTRAINT `Turno_especialidadId_fkey` FOREIGN KEY (`especialidadId`) REFERENCES `Especialidad`(`idEspecialidad`) ON DELETE SET NULL ON UPDATE CASCADE;
