-- CreateTable
CREATE TABLE `Usuario` (
    `idUsuario` INTEGER NOT NULL AUTO_INCREMENT,
    `email` VARCHAR(191) NOT NULL,
    `dni` VARCHAR(191) NOT NULL,
    `contrasena` VARCHAR(191) NOT NULL,
    `nomYape` VARCHAR(191) NOT NULL,
    `activo` BOOLEAN NOT NULL DEFAULT true,

    UNIQUE INDEX `Usuario_email_key`(`email`),
    UNIQUE INDEX `Usuario_dni_key`(`dni`),
    PRIMARY KEY (`idUsuario`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Paciente` (
    `idPaciente` INTEGER NOT NULL AUTO_INCREMENT,
    `obraSocial` VARCHAR(191) NULL,
    `telefono` VARCHAR(191) NULL,
    `usuarioId` INTEGER NOT NULL,

    UNIQUE INDEX `Paciente_usuarioId_key`(`usuarioId`),
    PRIMARY KEY (`idPaciente`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Medico` (
    `idMedico` INTEGER NOT NULL AUTO_INCREMENT,
    `matricula` VARCHAR(191) NOT NULL,
    `consultorio` VARCHAR(191) NULL,
    `usuarioId` INTEGER NOT NULL,

    UNIQUE INDEX `Medico_matricula_key`(`matricula`),
    UNIQUE INDEX `Medico_usuarioId_key`(`usuarioId`),
    PRIMARY KEY (`idMedico`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Administrador` (
    `idAdmin` INTEGER NOT NULL AUTO_INCREMENT,
    `usuarioId` INTEGER NOT NULL,

    UNIQUE INDEX `Administrador_usuarioId_key`(`usuarioId`),
    PRIMARY KEY (`idAdmin`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Especialidad` (
    `idEspecialidad` INTEGER NOT NULL AUTO_INCREMENT,
    `nombre` VARCHAR(191) NOT NULL,

    PRIMARY KEY (`idEspecialidad`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Turno` (
    `idTurno` INTEGER NOT NULL AUTO_INCREMENT,
    `fechaYhora` DATETIME(3) NOT NULL,
    `estado` ENUM('PENDIENTE', 'CONFIRMADO', 'CANCELADO', 'FINALIZADO') NOT NULL DEFAULT 'PENDIENTE',
    `pacienteId` INTEGER NOT NULL,
    `medicoId` INTEGER NOT NULL,

    PRIMARY KEY (`idTurno`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `_EspecialidadToMedico` (
    `A` INTEGER NOT NULL,
    `B` INTEGER NOT NULL,

    UNIQUE INDEX `_EspecialidadToMedico_AB_unique`(`A`, `B`),
    INDEX `_EspecialidadToMedico_B_index`(`B`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Paciente` ADD CONSTRAINT `Paciente_usuarioId_fkey` FOREIGN KEY (`usuarioId`) REFERENCES `Usuario`(`idUsuario`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Medico` ADD CONSTRAINT `Medico_usuarioId_fkey` FOREIGN KEY (`usuarioId`) REFERENCES `Usuario`(`idUsuario`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Administrador` ADD CONSTRAINT `Administrador_usuarioId_fkey` FOREIGN KEY (`usuarioId`) REFERENCES `Usuario`(`idUsuario`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Turno` ADD CONSTRAINT `Turno_pacienteId_fkey` FOREIGN KEY (`pacienteId`) REFERENCES `Paciente`(`idPaciente`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Turno` ADD CONSTRAINT `Turno_medicoId_fkey` FOREIGN KEY (`medicoId`) REFERENCES `Medico`(`idMedico`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `_EspecialidadToMedico` ADD CONSTRAINT `_EspecialidadToMedico_A_fkey` FOREIGN KEY (`A`) REFERENCES `Especialidad`(`idEspecialidad`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `_EspecialidadToMedico` ADD CONSTRAINT `_EspecialidadToMedico_B_fkey` FOREIGN KEY (`B`) REFERENCES `Medico`(`idMedico`) ON DELETE CASCADE ON UPDATE CASCADE;
