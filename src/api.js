const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

const TOKEN_KEY = 'salux_token';
const USUARIO_KEY = 'salux_usuario';

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function getUsuarioGuardado() {
  const raw = localStorage.getItem(USUARIO_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    // localStorage corrupto/de un esquema viejo: lo descartamos en vez de
    // romper el primer render de toda la app.
    localStorage.removeItem(USUARIO_KEY);
    return null;
  }
}

export function guardarSesion(token, usuario) {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USUARIO_KEY, JSON.stringify(usuario));
}

export function borrarSesion() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USUARIO_KEY);
}

async function request(path, { method = 'GET', body, auth = true } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (auth) {
    const token = getToken();
    if (token) headers['Authorization'] = `Bearer ${token}`;
  }

  let res;
  try {
    res = await fetch(`${API_URL}${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new Error('No se pudo conectar con el servidor. Revisá tu conexión.');
  }

  let data;
  try {
    data = await res.json();
  } catch {
    data = null;
  }

  if (!res.ok) {
    // Una petición autenticada que vuelve 401 significa que el token venció
    // o dejó de ser válido: cerramos la sesión local para no dejar al
    // usuario "logueado" en una app que ya no puede hacer nada.
    if (res.status === 401 && auth) {
      borrarSesion();
      window.location.reload();
    }

    // Los errores de validación de Zod vienen en un array `errores`
    // ({campo, mensaje}) además del mensaje genérico "Datos inválidos".
    const detalleCampos = Array.isArray(data?.errores)
      ? data.errores.map((e) => `${e.campo}: ${e.mensaje}`).join(' — ')
      : null;
    const mensaje = detalleCampos || data?.message || data?.error || 'Error de conexión con el servidor';
    throw new Error(mensaje);
  }

  return data;
}

// OJO al leer el nombre de una persona en la respuesta: login/perfil lo
// devuelven como `usuario.nombre`, pero cualquier objeto turno (misTurnos,
// agendaMedico, todosLosTurnos) trae el nombre del médico/paciente como
// `usuario.nomYape` (el nombre real de la columna en la base). Son dos
// convenciones distintas para el mismo concepto — no asumas cuál es sin
// mirar el controller correspondiente.
export const api = {
  login: (email, contrasena) =>
    request('/auth/login', { method: 'POST', body: { email, contrasena }, auth: false }),
  register: (datos) =>
    request('/auth/register', { method: 'POST', body: datos, auth: false }),
  perfil: () => request('/auth/perfil'),
  misTurnos: () => request('/turnos/mis-turnos'),
  cancelarTurno: (idTurno) =>
    request(`/turnos/${idTurno}`, { method: 'PATCH', body: { estado: 'CANCELADO' } }),
  todosLosTurnos: () => request('/turnos'),
  actualizarEstadoTurno: (idTurno, estado) =>
    request(`/turnos/${idTurno}`, { method: 'PATCH', body: { estado } }),
  agendaMedico: () => request('/turnos/agenda-medico'),
  especialidades: () => request('/especialidades'),
  medicos: () => request('/medicos'),
  crearTurno: (medicoId, fechaYhora) =>
    request('/turnos', { method: 'POST', body: { medicoId, fechaYhora } }),
  crearEspecialidad: (nombre) =>
    request('/especialidades', { method: 'POST', body: { nombre } }),
  eliminarEspecialidad: (idEspecialidad) =>
    request(`/especialidades/${idEspecialidad}`, { method: 'DELETE' }),
  crearMedico: (datos) =>
    request('/medicos', { method: 'POST', body: datos }),
};
