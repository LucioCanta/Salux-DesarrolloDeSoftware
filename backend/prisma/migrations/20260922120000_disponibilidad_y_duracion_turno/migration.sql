-- AlterTable
ALTER TABLE `Medico` ADD COLUMN `duracionTurnoMinutos` INTEGER NOT NULL DEFAULT 30;

-- CreateTable
CREATE TABLE `Disponibilidad` (
    `idDisponibilidad` INTEGER NOT NULL AUTO_INCREMENT,
    `diaSemana` INTEGER NOT NULL,
    `horaInicioMinutos` INTEGER NOT NULL,
    `horaFinMinutos` INTEGER NOT NULL,
    `medicoId` INTEGER NOT NULL,

    UNIQUE INDEX `Disponibilidad_medicoId_diaSemana_horaInicioMinutos_key`(`medicoId`, `diaSemana`, `horaInicioMinutos`),
    PRIMARY KEY (`idDisponibilidad`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Disponibilidad` ADD CONSTRAINT `Disponibilidad_medicoId_fkey` FOREIGN KEY (`medicoId`) REFERENCES `Medico`(`idMedico`) ON DELETE RESTRICT ON UPDATE CASCADE;
