-- AlterTable
ALTER TABLE `Turno` ADD COLUMN `confirmadoPorPaciente` BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE `Usuario` ADD COLUMN `resetPasswordExpira` DATETIME(3) NULL,
    ADD COLUMN `resetPasswordToken` VARCHAR(191) NULL;

-- CreateTable
CREATE TABLE `AusenciaMedico` (
    `idAusencia` INTEGER NOT NULL AUTO_INCREMENT,
    `fechaInicio` DATETIME(3) NOT NULL,
    `fechaFin` DATETIME(3) NOT NULL,
    `motivo` VARCHAR(191) NULL,
    `medicoId` INTEGER NOT NULL,

    PRIMARY KEY (`idAusencia`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE UNIQUE INDEX `Usuario_resetPasswordToken_key` ON `Usuario`(`resetPasswordToken`);

-- AddForeignKey
ALTER TABLE `AusenciaMedico` ADD CONSTRAINT `AusenciaMedico_medicoId_fkey` FOREIGN KEY (`medicoId`) REFERENCES `Medico`(`idMedico`) ON DELETE RESTRICT ON UPDATE CASCADE;

