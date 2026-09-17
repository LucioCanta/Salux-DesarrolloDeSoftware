const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

const TOKEN_KEY = 'salux_token';
const USUARIO_KEY = 'salux_usuario';

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function getUsuarioGuardado() {
  const raw = localStorage.getItem(USUARIO_KEY);
  return raw ? JSON.parse(raw) : null;
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

  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  let data;
  try {
    data = await res.json();
  } catch {
    data = null;
  }

  if (!res.ok) {
    const mensaje = data?.message || data?.error || 'Error de conexión con el servidor';
    throw new Error(mensaje);
  }

  return data;
}

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
  crearMedico: (datos) =>
    request('/medicos', { method: 'POST', body: datos }),
};
