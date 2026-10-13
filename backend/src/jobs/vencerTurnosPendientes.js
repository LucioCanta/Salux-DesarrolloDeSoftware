const prisma = require('../config/prisma');

const CADA_MINUTOS = 10;

// Un turno que sigue PENDIENTE cuando llega su horario nunca fue confirmado
// por el médico: lo damos de baja para que no quede "colgado" en las listas
// (y para liberar el horario). Los CONFIRMADO vencidos NO se tocan: los
// cierra el médico con "Finalizar".
async function vencerTurnosPendientes() {
  try {
    const { count } = await prisma.turno.updateMany({
      where: { estado: 'PENDIENTE', fechaYhora: { lt: new Date() } },
      data: { estado: 'CANCELADO' },
    });
    if (count > 0) {
      console.log(`[turnos] ${count} turno(s) pendiente(s) vencido(s) pasaron a CANCELADO`);
    }
    return count;
  } catch (error) {
    console.error('[turnos] No se pudieron vencer los turnos pendientes:', error.message);
    return 0;
  }
}

// Las sesiones (inicios de sesión) vencidas ya no sirven: se borran para que la tabla no crezca.
async function purgarSesionesVencidas() {
  try {
    await prisma.sesion.deleteMany({ where: { expiraEn: { lt: new Date() } } });
  } catch (error) {
    console.error('[sesiones] No se pudieron purgar las sesiones vencidas:', error.message);
  }
}

function iniciarVencimientoDeTurnos() {
  const tarea = () => {
    vencerTurnosPendientes();
    purgarSesionesVencidas();
  };
  tarea();
  // unref: el temporizador no impide que el proceso termine al apagar el servidor
  setInterval(tarea, CADA_MINUTOS * 60 * 1000).unref();
}

module.exports = { vencerTurnosPendientes, iniciarVencimientoDeTurnos };
