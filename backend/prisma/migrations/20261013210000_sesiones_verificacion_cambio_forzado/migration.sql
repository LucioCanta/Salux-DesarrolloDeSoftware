-- AlterTable
ALTER TABLE `Usuario`
  ADD COLUMN `debeCambiarContrasena` BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN `emailVerificado` BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN `verificacionToken` VARCHAR(191) NULL,
  ADD COLUMN `verificacionExpira` DATETIME(3) NULL;

-- CreateIndex
CREATE UNIQUE INDEX `Usuario_verificacionToken_key` ON `Usuario`(`verificacionToken`);

-- CreateTable
CREATE TABLE `Sesion` (
    `idSesion` INTEGER NOT NULL AUTO_INCREMENT,
    `usuarioId` INTEGER NOT NULL,
    `creadaEn` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `expiraEn` DATETIME(3) NOT NULL,

    INDEX `Sesion_usuarioId_idx`(`usuarioId`),
    INDEX `Sesion_expiraEn_idx`(`expiraEn`),
    PRIMARY KEY (`idSesion`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Sesion` ADD CONSTRAINT `Sesion_usuarioId_fkey` FOREIGN KEY (`usuarioId`) REFERENCES `Usuario`(`idUsuario`) ON DELETE CASCADE ON UPDATE CASCADE;
