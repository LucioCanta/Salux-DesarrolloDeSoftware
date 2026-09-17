import { useState, useEffect } from 'react';
import Dashboard from './Dashboard';
import { api, getToken, getUsuarioGuardado, guardarSesion, borrarSesion } from './api';

function App() {
  const [usuario, setUsuario] = useState(() => getUsuarioGuardado());
  const [verificandoSesion, setVerificandoSesion] = useState(() => !!getToken() && !getUsuarioGuardado());
  const [modoAdultoMayor, setModoAdultoMayor] = useState(false);
  const [mostrarPassword, setMostrarPassword] = useState(false);
  const [modo, setModo] = useState('login'); // 'login' | 'registro'
  const [email, setEmail] = useState('');
  const [contrasena, setContrasena] = useState('');
  const [nomYape, setNomYape] = useState('');
  const [dni, setDni] = useState('');
  const [error, setError] = useState('');
  const [enviando, setEnviando] = useState(false);

  // Al cargar la app, si ya había un token guardado, lo validamos contra el backend
  // en vez de forzar un nuevo login cada vez que se refresca la página.
  useEffect(() => {
    const token = getToken();
    if (!token) return;

    api.perfil()
      .then(({ usuario: usuarioActual }) => {
        setUsuario(usuarioActual);
        guardarSesion(token, usuarioActual);
      })
      .catch(() => {
        borrarSesion();
        setUsuario(null);
      })
      .finally(() => setVerificandoSesion(false));
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setEnviando(true);
    try {
      const { token, usuario: usuarioLogueado } = await api.login(email, contrasena);
      guardarSesion(token, usuarioLogueado);
      setUsuario(usuarioLogueado);
    } catch (err) {
      setError(err.message);
    } finally {
      setEnviando(false);
    }
  };

  const handleRegistro = async (e) => {
    e.preventDefault();
    setError('');
    setEnviando(true);
    try {
      await api.register({ email, dni, contrasena, nomYape });
      const { token, usuario: usuarioLogueado } = await api.login(email, contrasena);
      guardarSesion(token, usuarioLogueado);
      setUsuario(usuarioLogueado);
    } catch (err) {
      setError(err.message);
    } finally {
      setEnviando(false);
    }
  };

  const cambiarModo = (nuevoModo) => {
    setModo(nuevoModo);
    setError('');
  };

  const handleLogout = () => {
    borrarSesion();
    setUsuario(null);
    setEmail('');
    setContrasena('');
    setNomYape('');
    setDni('');
    setModo('login');
  };

  if (verificandoSesion) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400">
        Cargando...
      </div>
    );
  }

  if (usuario) {
    return <Dashboard usuario={usuario} onLogout={handleLogout} />;
  }

  return (
    <div className={`min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 transition-all ${modoAdultoMayor ? 'text-[20px]' : 'text-base'}`}>

      {/* Tarjeta principal de Login (Modo oscuro por defecto #0F172A / #1E293B) */}
      <div className={`bg-slate-900 p-8 rounded-2xl shadow-2xl w-full border border-slate-800 text-slate-100 transition-all ${modoAdultoMayor ? 'max-w-xl p-10' : 'max-w-md'}`}>

        {/* Logo / Ícono superior: Corazón con pulso médico */}
        <div className="flex justify-center mb-4">
          <div className="w-14 h-14 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-500">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h2l1-1.5 2 3L15 12h2" />
            </svg>
          </div>
        </div>

        {/* Cabecera / Título */}
        <div className="text-center mb-6">
          <h1 className={`font-bold tracking-tight text-white ${modoAdultoMayor ? 'text-4xl' : 'text-2xl'}`}>Salux</h1>
          <p className={`text-slate-400 mt-1 ${modoAdultoMayor ? 'text-sm' : 'text-xs'}`}>Sistema de Gestión de Turnos Médicos</p>
        </div>

        {error && (
          <div className="mb-4 px-4 py-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
            {error}
          </div>
        )}

        {/* Formulario */}
        <form className={`space-y-4 ${modoAdultoMayor ? 'space-y-6' : ''}`} onSubmit={modo === 'login' ? handleLogin : handleRegistro}>
          {modo === 'registro' && (
            <>
              <div>
                <label className={`block font-semibold uppercase tracking-wider text-slate-400 mb-1 ${modoAdultoMayor ? 'text-sm' : 'text-xs'}`}>
                  Nombre completo <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={nomYape}
                  onChange={(e) => setNomYape(e.target.value)}
                  required
                  placeholder="Ej: Juan Pérez"
                  className={`w-full rounded-lg bg-slate-950 border border-slate-700 focus:ring-2 focus:ring-blue-600 focus:outline-none text-slate-200 placeholder-slate-500 ${modoAdultoMayor ? 'px-5 py-4 text-lg min-h-[56px]' : 'px-4 py-3 text-sm'}`}
                />
              </div>
              <div>
                <label className={`block font-semibold uppercase tracking-wider text-slate-400 mb-1 ${modoAdultoMayor ? 'text-sm' : 'text-xs'}`}>
                  DNI <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={dni}
                  onChange={(e) => setDni(e.target.value)}
                  required
                  placeholder="Ej: 30456789"
                  className={`w-full rounded-lg bg-slate-950 border border-slate-700 focus:ring-2 focus:ring-blue-600 focus:outline-none text-slate-200 placeholder-slate-500 ${modoAdultoMayor ? 'px-5 py-4 text-lg min-h-[56px]' : 'px-4 py-3 text-sm'}`}
                />
              </div>
            </>
          )}

          <div>
            <label className={`block font-semibold uppercase tracking-wider text-slate-400 mb-1 ${modoAdultoMayor ? 'text-sm' : 'text-xs'}`}>
              {modo === 'login' ? 'DNI o Email' : 'Email'} <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder={modo === 'login' ? 'Ej: 30456789 o nombre@email.com' : 'Ej: nombre@email.com'}
              className={`w-full rounded-lg bg-slate-950 border border-slate-700 focus:ring-2 focus:ring-blue-600 focus:outline-none text-slate-200 placeholder-slate-500 ${modoAdultoMayor ? 'px-5 py-4 text-lg min-h-[56px]' : 'px-4 py-3 text-sm'}`}
            />
          </div>

          <div>
            <label className={`block font-semibold uppercase tracking-wider text-slate-400 mb-1 ${modoAdultoMayor ? 'text-sm' : 'text-xs'}`}>
              Contraseña <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <input
                type={mostrarPassword ? "text" : "password"}
                value={contrasena}
                onChange={(e) => setContrasena(e.target.value)}
                required
                minLength={modo === 'registro' ? 8 : undefined}
                placeholder={modo === 'login' ? 'Ingresá tu contraseña' : 'Mínimo 8 caracteres'}
                className={`w-full rounded-lg bg-slate-950 border border-slate-700 focus:ring-2 focus:ring-blue-600 focus:outline-none text-slate-200 placeholder-slate-500 pr-10 ${modoAdultoMayor ? 'px-5 py-4 text-lg min-h-[56px]' : 'px-4 py-3 text-sm'}`}
              />
              {/* Botón del ícono de visibilidad (ojo) */}
              <button
                type="button"
                onClick={() => setMostrarPassword(!mostrarPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-200"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  {mostrarPassword ? (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                  ) : (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  )}
                </svg>
              </button>
            </div>
          </div>

          {modo === 'login' && (
            <div className="flex items-center justify-end">
              <a href="#" className={`text-blue-500 hover:underline ${modoAdultoMayor ? 'text-base' : 'text-xs'}`}>¿Olvidaste tu contraseña?</a>
            </div>
          )}

          <button
            type="submit"
            disabled={enviando}
            className={`w-full bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition shadow-md flex items-center justify-center disabled:opacity-60 ${modoAdultoMayor ? 'py-4 text-lg min-h-[60px]' : 'py-3 text-sm min-h-[52px]'}`}
          >
            {enviando ? (modo === 'login' ? 'Ingresando...' : 'Creando cuenta...') : (modo === 'login' ? 'Iniciar sesión' : 'Crear cuenta')}
          </button>

          <button
            type="button"
            onClick={() => cambiarModo(modo === 'login' ? 'registro' : 'login')}
            className={`w-full bg-transparent hover:bg-slate-800 text-slate-300 border border-slate-700 font-medium rounded-lg transition flex items-center justify-center ${modoAdultoMayor ? 'py-4 text-lg min-h-[60px]' : 'py-3 text-sm min-h-[52px]'}`}
          >
            {modo === 'login' ? 'Crear una cuenta' : 'Ya tengo una cuenta'}
          </button>
        </form>

        {/* Toggle de Modo Adulto Mayor centrado y abajo en la tarjeta (según PDF) */}
        <div className="mt-6 pt-4 border-t border-slate-800 flex flex-col items-center justify-center space-y-2">
          <span className={`text-slate-400 font-medium ${modoAdultoMayor ? 'text-sm text-blue-400' : 'text-xs'}`}>
            Modo adulto mayor
          </span>
          <button
            type="button"
            onClick={() => setModoAdultoMayor(!modoAdultoMayor)}
            className={`w-14 h-8 flex items-center rounded-full p-1 transition-colors duration-300 ${modoAdultoMayor ? 'bg-blue-600' : 'bg-slate-700'}`}
          >
            <div className={`bg-white w-6 h-6 rounded-full shadow-md transform transition-transform duration-300 ${modoAdultoMayor ? 'translate-x-6' : 'translate-x-0'}`} />
          </button>
        </div>

      </div>

      {/* Footer / Copyright según el documento */}
      <div className="mt-6 text-center text-slate-500 text-xs">
        © 2026 Salux — Sistema Médico Accesible
      </div>

    </div>
  );
}

export default App;
