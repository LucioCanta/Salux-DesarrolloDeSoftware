const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

const USUARIO_KEY = 'salux_usuario';

// El Access Token vive SOLO en memoria (nunca en localStorage): así lo pide
// la Entrega 3, para que no quede expuesto a un XSS que lea localStorage.
// Como consecuencia, se pierde al recargar la página — por eso existe
// refrescarSesion(), que lo repone usando el Refresh Token de la cookie
// httpOnly (esa sí sobrevive un F5).
let accessToken = null;

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
  accessToken = token;
  localStorage.setItem(USUARIO_KEY, JSON.stringify(usuario));
}

export function borrarSesion() {
  accessToken = null;
  localStorage.removeItem(USUARIO_KEY);
}

// Actualiza solo el usuario cacheado en localStorage (ej: cambió su nombre
// desde la Vista de Perfil), sin tocar el Access Token en memoria.
export function actualizarUsuarioGuardado(usuario) {
  localStorage.setItem(USUARIO_KEY, JSON.stringify(usuario));
}

async function fetchJson(path, { method = 'GET', body, credentialsInclude = false, headers = {} } = {}) {
  let res;
  try {
    res = await fetch(`${API_URL}${path}`, {
      method,
      headers,
      credentials: credentialsInclude ? 'include' : 'same-origin',
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

  return { res, data };
}

function armarError(data) {
  // Los errores de validación de Zod vienen en un array `errores`
  // ({campo, mensaje}) además del mensaje genérico "Datos inválidos".
  const detalleCampos = Array.isArray(data?.errores)
    ? data.errores.map((e) => `${e.campo}: ${e.mensaje}`).join(' — ')
    : null;
  return new Error(detalleCampos || data?.message || data?.error || 'Error de conexión con el servidor');
}

// Pide un Access Token nuevo usando el Refresh Token de la cookie httpOnly
// (credentials:'include' es lo que hace que el navegador mande esa cookie).
async function refrescarSesion() {
  const { res, data } = await fetchJson('/auth/refresh', { method: 'POST', credentialsInclude: true });
  if (!res.ok) {
    accessToken = null;
    throw armarError(data);
  }
  accessToken = data.token;
  return data;
}

async function request(path, { method = 'GET', body, auth = true, _reintentado = false } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (auth && accessToken) headers['Authorization'] = `Bearer ${accessToken}`;

  const { res, data } = await fetchJson(path, { method, body, headers, credentialsInclude: true });

  if (res.status === 401 && auth && !_reintentado) {
    // El Access Token venció (dura 15 min) o es inválido: intentamos
    // renovarlo UNA vez con el refresh token y reintentamos la petición
    // original, todo transparente para quien llamó a esto.
    try {
      await refrescarSesion();
      return request(path, { method, body, auth, _reintentado: true });
    } catch {
      borrarSesion();
      window.location.reload();
      // La recarga corta la ejecución; esto nunca debería resolverse.
      return new Promise(() => {});
    }
  }

  if (!res.ok) {
    throw armarError(data);
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
  refrescarSesion,
  logout: () => request('/auth/logout', { method: 'POST', auth: false }),
  perfil: () => request('/auth/perfil'),
  actualizarPerfil: (nomYape) => request('/auth/perfil', { method: 'PATCH', body: { nomYape } }),
  actualizarPerfilPaciente: (datos) => request('/pacientes/perfil', { method: 'PATCH', body: datos }),
  cambiarContrasena: (contrasenaActual, contrasenaNueva) =>
    request('/auth/perfil/contrasena', { method: 'PATCH', body: { contrasenaActual, contrasenaNueva } }),
  misTurnos: () => request('/turnos/mis-turnos'),
  cancelarTurno: (idTurno) =>
    request(`/turnos/${idTurno}`, { method: 'PATCH', body: { estado: 'CANCELADO' } }),
  todosLosTurnos: () => request('/turnos'),
  actualizarEstadoTurno: (idTurno, estado) =>
    request(`/turnos/${idTurno}`, { method: 'PATCH', body: { estado } }),
  agendaMedico: () => request('/turnos/agenda-medico'),
  especialidades: () => request('/especialidades'),
  medicos: () => request('/medicos'),
  todosLosMedicos: () => request('/medicos/todos'),
  cambiarEstadoMedico: (idMedico, activo) =>
    request(`/medicos/${idMedico}/estado`, { method: 'PATCH', body: { activo } }),
  crearTurno: (medicoId, fechaYhora) =>
    request('/turnos', { method: 'POST', body: { medicoId, fechaYhora } }),
  crearEspecialidad: (nombre) =>
    request('/especialidades', { method: 'POST', body: { nombre } }),
  eliminarEspecialidad: (idEspecialidad) =>
    request(`/especialidades/${idEspecialidad}`, { method: 'DELETE' }),
  crearMedico: (datos) =>
    request('/medicos', { method: 'POST', body: datos }),
};
