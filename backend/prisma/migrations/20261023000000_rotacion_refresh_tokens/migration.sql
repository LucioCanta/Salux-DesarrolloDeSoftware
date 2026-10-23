-- Rotación de refresh tokens con detección de reutilización.
-- Cambio ADITIVO (columnas nulas): el código anterior sigue funcionando con estas
-- columnas presentes, por eso la migración se aplica ANTES de desplegar el código nuevo.
--   jtiActual   : identificador del refresh token vigente de la sesión.
--   jtiAnterior : el inmediatamente anterior (se tolera unos segundos por si dos
--                 pestañas renuevan a la vez).
--   rotadaEn    : cuándo se rotó por última vez.
-- Las sesiones que ya existen quedan con jtiActual nulo y empiezan a rotar en su
-- próxima renovación.
ALTER TABLE "Sesion"
  ADD COLUMN "jtiActual" TEXT,
  ADD COLUMN "jtiAnterior" TEXT,
  ADD COLUMN "rotadaEn" TIMESTAMP(3);
