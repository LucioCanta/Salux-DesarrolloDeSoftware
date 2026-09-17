import { useState, useEffect } from 'react';
import { api } from './api';

const ESTADO_TEXTO = { PENDIENTE: 'Pendiente', CONFIRMADO: 'Confirmado', CANCELADO: 'Cancelado', FINALIZADO: 'Finalizado' };

function formatearTurno(t) {
  const fecha = new Date(t.fechaYhora);
  const fechaTexto = fecha.toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  const horaTexto = fecha.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' }) + ' hs';
  return {
    id: t.idTurno,
    especialidad: t.medico?.especialidades?.[0]?.nombre || 'Consulta general',
    medico: t.medico?.usuario?.nomYape || 'Médico',
    consultorio: t.medico?.consultorio || 'A confirmar',
    fecha: fechaTexto.charAt(0).toUpperCase() + fechaTexto.slice(1),
    hora: horaTexto,
    estado: ESTADO_TEXTO[t.estado] || t.estado,
    fechaISO: t.fechaYhora,
  };
}

function saludoSegunHora() {
  const hora = new Date().getHours();
  if (hora < 12) return 'Buenos días,';
  if (hora < 20) return 'Buenas tardes,';
  return 'Buenas noches,';
}

function iniciales(nombre) {
  if (!nombre) return '??';
  return nombre.trim().split(/\s+/).map((n) => n[0]).join('').slice(0, 2).toUpperCase();
}

function Dashboard({ usuario, onLogout }) {
  const [vistaActual, setVistaActual] = useState('dashboard');
  const [filtroEstado, setFiltroEstado] = useState('Todos');

  // Estados de accesibilidad globales
  const [menuAccesibilidadAbierto, setMenuAccesibilidadAbierto] = useState(false);
  const [menuMobileAbierto, setMenuMobileAbierto] = useState(false);
  const [alertaActiva, setAlertaActiva] = useState(true);
  const [modoOscuro, setModoOscuro] = useState(true);
  const [altoContraste, setAltoContraste] = useState(false);
  const [modoAdultoMayor, setModoAdultoMayor] = useState(false);
  const [reducirAnimaciones, setReducirAnimaciones] = useState(false);

  // Turnos reales del paciente logueado (sección 2.3 del documento)
  const esPaciente = usuario.rol === 'paciente';
  const esAdmin = usuario.rol === 'admin';

  const [listaTurnos, setListaTurnos] = useState([]);
  const [cargandoTurnos, setCargandoTurnos] = useState(() => esPaciente);
  const [errorTurnos, setErrorTurnos] = useState('');
  const [ahora] = useState(() => Date.now());

  useEffect(() => {
    if (!esPaciente) return;
    api.misTurnos()
      .then(({ data }) => setListaTurnos(data.map(formatearTurno)))
      .catch((err) => setErrorTurnos(err.message))
      .finally(() => setCargandoTurnos(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const cancelarTurno = async (id) => {
    try {
      await api.cancelarTurno(id);
      setListaTurnos((prev) => prev.map((t) => (t.id === id ? { ...t, estado: 'Cancelado' } : t)));
    } catch (err) {
      alert(`No se pudo cancelar el turno: ${err.message}`);
    }
  };

  const turnosFiltrados = listaTurnos.filter(turno => {
    if (filtroEstado === 'Todos') return true;
    if (filtroEstado === 'Confirmados') return turno.estado === 'Confirmado';
    if (filtroEstado === 'Pendientes') return turno.estado === 'Pendiente';
    if (filtroEstado === 'Cancelados') return turno.estado === 'Cancelado';
    return true;
  });

  const turnosActivos = listaTurnos.filter(t => t.estado === 'Pendiente' || t.estado === 'Confirmado');
  const proximoTurno = turnosActivos
    .filter(t => new Date(t.fechaISO).getTime() > ahora)
    .sort((a, b) => new Date(a.fechaISO) - new Date(b.fechaISO))[0];
  const diasHastaProximo = proximoTurno
    ? Math.max(0, Math.ceil((new Date(proximoTurno.fechaISO) - ahora) / (1000 * 60 * 60 * 24)))
    : null;

  // ==========================================
  // Estado y datos del Panel de Administración (Sección 2.4)
  // Todavía es mock: el backend no tiene un endpoint para listar turnos de todos los pacientes.
  // ==========================================
  const [turnosAdmin, setTurnosAdmin] = useState([
    { id: 1, paciente: 'María González', especialidad: 'Cardiología', medico: 'Dr. Martín García', fecha: '22/05/2026', hora: '10:30 hs', estado: 'Confirmado' },
    { id: 2, paciente: 'Juan Pérez', especialidad: 'Pediatría', medico: 'Dra. Ana Rodríguez', fecha: '26/05/2026', hora: '14:00 hs', estado: 'Pendiente' },
    { id: 3, paciente: 'Laura Fernández', especialidad: 'Traumatología', medico: 'Dr. Carlos López', fecha: '06/06/2026', hora: '09:15 hs', estado: 'Confirmado' },
    { id: 4, paciente: 'Diego Martínez', especialidad: 'Pediatría', medico: 'Dra. Sofía Gómez', fecha: '10/04/2026', hora: '11:00 hs', estado: 'Cancelado' },
    { id: 5, paciente: 'Camila Torres', especialidad: 'Dermatología', medico: 'Dra. Valeria Suárez', fecha: '02/06/2026', hora: '16:30 hs', estado: 'Pendiente' },
    { id: 6, paciente: 'Roberto Sánchez', especialidad: 'Cardiología', medico: 'Dr. Martín García', fecha: '15/06/2026', hora: '08:45 hs', estado: 'Confirmado' },
    { id: 7, paciente: 'Sofía Ramírez', especialidad: 'Neurología', medico: 'Dr. Emilio Castro', fecha: '18/06/2026', hora: '13:00 hs', estado: 'Pendiente' },
    { id: 8, paciente: 'Martín Álvarez', especialidad: 'Traumatología', medico: 'Dr. Carlos López', fecha: '20/06/2026', hora: '10:00 hs', estado: 'Cancelado' },
  ]);
  const [busquedaAdmin, setBusquedaAdmin] = useState('');
  const [filtroEstadoAdmin, setFiltroEstadoAdmin] = useState('Todos');

  const estadisticasAdmin = {
    total: turnosAdmin.length,
    confirmados: turnosAdmin.filter(t => t.estado === 'Confirmado').length,
    pendientes: turnosAdmin.filter(t => t.estado === 'Pendiente').length,
    cancelados: turnosAdmin.filter(t => t.estado === 'Cancelado').length,
  };

  const turnosAdminFiltrados = turnosAdmin.filter(turno => {
    const coincideEstado = filtroEstadoAdmin === 'Todos' || turno.estado === filtroEstadoAdmin;
    const textoBusqueda = busquedaAdmin.trim().toLowerCase();
    const coincideBusqueda = textoBusqueda === '' ||
      turno.paciente.toLowerCase().includes(textoBusqueda) ||
      turno.medico.toLowerCase().includes(textoBusqueda) ||
      turno.especialidad.toLowerCase().includes(textoBusqueda);
    return coincideEstado && coincideBusqueda;
  });

  const actualizarEstadoTurnoAdmin = (id, nuevoEstado) => {
    setTurnosAdmin(prev => prev.map(t => t.id === id ? { ...t, estado: nuevoEstado } : t));
  };

  // Cierra el menú mobile con la tecla Escape (sección 4.2 del documento)
  useEffect(() => {
    const cerrarConEscape = (e) => {
      if (e.key === 'Escape') setMenuMobileAbierto(false);
    };
    document.addEventListener('keydown', cerrarConEscape);
    return () => document.removeEventListener('keydown', cerrarConEscape);
  }, []);

  const irA = (vista) => {
    setVistaActual(vista);
    setMenuMobileAbierto(false);
  };

  return (
    <div
      style={{ fontSize: modoAdultoMayor ? '20px' : '16px' }}
      className={`min-h-screen transition-colors ${reducirAnimaciones ? 'transition-none' : 'duration-200'} ${
        altoContraste ? 'bg-white text-black high-contrast' :
        modoOscuro ? 'bg-[#0F172A] text-[#F1F5F9]' : 'bg-[#F8FAFC] text-[#1E293B]'
      }`}
    >

      {/* ========================================== */}
      {/* NAVBAR UNIFICADO                          */}
      {/* ========================================== */}
      <header className={`border-b sticky top-0 z-50 backdrop-blur-md ${
        altoContraste ? 'bg-white border-black text-black' :
        modoOscuro ? 'bg-[#0F172A]/90 border-[#334155]' : 'bg-white/90 border-[#E2E8F0]'
      }`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">

          <div className="flex items-center space-x-6">
            <div className="flex items-center space-x-2 cursor-pointer" onClick={() => setVistaActual('dashboard')}>
              <div className="w-9 h-9 rounded-xl bg-[#2563EB] flex items-center justify-center text-white font-bold shadow-sm">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                </svg>
              </div>
              <span className="font-bold tracking-tight text-xl">Salux</span>
            </div>

            <nav className="hidden md:flex items-center space-x-4 font-medium" style={{ fontSize: modoAdultoMayor ? '18px' : '14px' }}>
              <button
                onClick={() => setVistaActual('dashboard')}
                className={`px-3 py-1.5 rounded-lg transition ${vistaActual === 'dashboard' ? 'bg-[#2563EB]/10 text-[#2563EB] font-semibold' : 'hover:text-[#2563EB]'}`}
              >
                Inicio
              </button>
              {esPaciente && (
                <button onClick={() => alert('Wizard de solicitar turno en desarrollo')} className="px-3 py-1.5 rounded-lg hover:text-[#2563EB] transition">
                  Solicitar turno
                </button>
              )}
              {esPaciente && (
                <button
                  onClick={() => setVistaActual('mis-turnos')}
                  className={`px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 ${vistaActual === 'mis-turnos' ? 'bg-[#2563EB]/10 text-[#2563EB] font-semibold' : 'hover:text-[#2563EB]'}`}
                >
                  Mis turnos
                  {turnosActivos.length > 0 && (
                    <span className="bg-[#DC2626] text-white text-[10px] px-1.5 py-0.5 rounded-full font-bold">{turnosActivos.length}</span>
                  )}
                </button>
              )}
              {esAdmin && (
                <button
                  onClick={() => setVistaActual('admin')}
                  className={`px-3 py-1.5 rounded-lg transition ${vistaActual === 'admin' ? 'bg-[#2563EB]/10 text-[#2563EB] font-semibold' : 'hover:text-[#2563EB]'}`}
                >
                  Administración
                </button>
              )}
            </nav>
          </div>

          <div className="hidden md:flex items-center space-x-3">
            {/* Menú de Accesibilidad Desplegable */}
            <div className="relative">
              <button
                onClick={() => setMenuAccesibilidadAbierto(!menuAccesibilidadAbierto)}
                className={`flex items-center space-x-1 px-3 py-1.5 rounded-lg border transition font-medium ${
                  altoContraste ? 'border-black text-black bg-white' : 'border-[#E2E8F0] dark:border-[#334155] hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
                style={{ fontSize: modoAdultoMayor ? '18px' : '14px' }}
                aria-expanded={menuAccesibilidadAbierto}
              >
                <span>♿ Accesibilidad</span>
              </button>

              {menuAccesibilidadAbierto && (
                <div className={`absolute right-0 mt-2 w-72 rounded-xl shadow-2xl p-4 z-50 border ${
                  altoContraste ? 'bg-white border-black text-black' : 'bg-white dark:bg-[#1E293B] border-[#E2E8F0] dark:border-[#334155] text-slate-800 dark:text-[#F1F5F9]'
                }`}>
                  <h3 className="font-bold uppercase tracking-wider text-slate-400 mb-3" style={{ fontSize: modoAdultoMayor ? '14px' : '12px' }}>Accesibilidad</h3>
                  <div className="space-y-3" style={{ fontSize: modoAdultoMayor ? '18px' : '14px' }}>
                    <label className="flex items-center justify-between cursor-pointer">
                      <span>Modo oscuro</span>
                      <input type="checkbox" checked={modoOscuro} onChange={() => { setModoOscuro(!modoOscuro); if(altoContraste) setAltoContraste(false); }} />
                    </label>
                    <label className="flex items-center justify-between cursor-pointer">
                      <span>Alto contraste</span>
                      <input type="checkbox" checked={altoContraste} onChange={() => setAltoContraste(!altoContraste)} />
                    </label>
                    <label className="flex items-center justify-between cursor-pointer">
                      <span>Modo adulto mayor</span>
                      <input type="checkbox" checked={modoAdultoMayor} onChange={() => setModoAdultoMayor(!modoAdultoMayor)} />
                    </label>
                    <label className="flex items-center justify-between cursor-pointer">
                      <span>Reducir animaciones</span>
                      <input type="checkbox" checked={reducirAnimaciones} onChange={() => setReducirAnimaciones(!reducirAnimaciones)} />
                    </label>
                  </div>
                </div>
              )}
            </div>

            {/* Perfil de usuario */}
            <div className={`flex items-center space-x-2 border-l pl-3 ${altoContraste ? 'border-black' : 'border-slate-300 dark:border-slate-700'}`}>
              <div className="w-8 h-8 rounded-full bg-blue-100 text-[#2563EB] font-bold flex items-center justify-center text-xs">{iniciales(usuario.nombre)}</div>
              <span className="font-medium hidden sm:inline" style={{ fontSize: modoAdultoMayor ? '18px' : '14px' }}>{usuario.nombre}</span>
            </div>

            <button onClick={onLogout} className="text-[#DC2626] font-medium hover:underline px-2 py-1" style={{ fontSize: modoAdultoMayor ? '18px' : '14px' }}>Salir</button>
          </div>

          {/* Botón hamburguesa — visible solo en mobile/tablet */}
          <button
            onClick={() => setMenuMobileAbierto(!menuMobileAbierto)}
            className={`md:hidden flex items-center justify-center w-10 h-10 rounded-lg border transition ${
              altoContraste ? 'border-black text-black bg-white' : 'border-[#E2E8F0] dark:border-[#334155] hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
            aria-expanded={menuMobileAbierto}
            aria-controls="menu-mobile"
            aria-label={menuMobileAbierto ? 'Cerrar menú de navegación' : 'Abrir menú de navegación'}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              {menuMobileAbierto ? (
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>

        </div>

        {/* ========================================== */}
        {/* MENÚ MOBILE (drawer con navegación + accesibilidad rápida) */}
        {/* ========================================== */}
        {menuMobileAbierto && (
          <div
            id="menu-mobile"
            className={`md:hidden border-t px-4 py-4 space-y-1 ${
              altoContraste ? 'bg-white border-black text-black' :
              modoOscuro ? 'bg-[#0F172A] border-[#334155] text-[#F1F5F9]' : 'bg-white border-[#E2E8F0] text-[#1E293B]'
            }`}
          >
            <button
              onClick={() => irA('dashboard')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition ${
                vistaActual === 'dashboard'
                  ? (altoContraste ? 'bg-black text-white' : 'bg-[#2563EB]/10 text-[#2563EB]')
                  : (altoContraste ? 'hover:bg-slate-100' : 'hover:bg-slate-800/60')
              }`}
              style={{ fontSize: modoAdultoMayor ? '18px' : '15px' }}
            >
              <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 9.5L12 3l9 6.5V20a1 1 0 01-1 1h-5v-7H9v7H4a1 1 0 01-1-1V9.5z" />
              </svg>
              Inicio
            </button>

            {esPaciente && (
              <button
                onClick={() => { alert('Wizard de solicitar turno en desarrollo'); setMenuMobileAbierto(false); }}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition ${altoContraste ? 'hover:bg-slate-100' : 'hover:bg-slate-800/60'}`}
                style={{ fontSize: modoAdultoMayor ? '18px' : '15px' }}
              >
                <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <rect x="3" y="4" width="18" height="18" rx="2" strokeLinecap="round" strokeLinejoin="round" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16 2v4M8 2v4M3 10h18" />
                </svg>
                Solicitar turno
              </button>
            )}

            {esPaciente && (
              <button
                onClick={() => irA('mis-turnos')}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition ${
                  vistaActual === 'mis-turnos'
                    ? (altoContraste ? 'bg-black text-white' : 'bg-[#2563EB]/10 text-[#2563EB]')
                    : (altoContraste ? 'hover:bg-slate-100' : 'hover:bg-slate-800/60')
                }`}
                style={{ fontSize: modoAdultoMayor ? '18px' : '15px' }}
              >
                <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <circle cx="12" cy="12" r="9" strokeLinecap="round" strokeLinejoin="round" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 7v5l3 2" />
                </svg>
                Mis turnos
                {turnosActivos.length > 0 && (
                  <span className="ml-auto bg-[#DC2626] text-white text-[10px] px-1.5 py-0.5 rounded-full font-bold">{turnosActivos.length}</span>
                )}
              </button>
            )}

            {esAdmin && (
              <button
                onClick={() => irA('admin')}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition ${
                  vistaActual === 'admin'
                    ? (altoContraste ? 'bg-black text-white' : 'bg-[#2563EB]/10 text-[#2563EB]')
                    : (altoContraste ? 'hover:bg-slate-100' : 'hover:bg-slate-800/60')
                }`}
                style={{ fontSize: modoAdultoMayor ? '18px' : '15px' }}
              >
                <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <rect x="3" y="3" width="7" height="7" rx="1" strokeLinecap="round" strokeLinejoin="round" />
                  <rect x="14" y="3" width="7" height="7" rx="1" strokeLinecap="round" strokeLinejoin="round" />
                  <rect x="14" y="14" width="7" height="7" rx="1" strokeLinecap="round" strokeLinejoin="round" />
                  <rect x="3" y="14" width="7" height="7" rx="1" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                Administración
              </button>
            )}

            <div className={`border-t my-2 ${altoContraste ? 'border-black' : 'border-slate-700'}`} />

            {/* Accesos rápidos de accesibilidad (sección 4.4) */}
            <div className="grid grid-cols-3 gap-2 py-1">
              <button
                onClick={() => { setModoOscuro(!modoOscuro); if (!modoOscuro) setAltoContraste(false); }}
                aria-pressed={modoOscuro}
                className={`flex flex-col items-center gap-1.5 px-2 py-3 rounded-xl border font-medium transition ${
                  modoOscuro
                    ? 'border-[#2563EB] text-[#2563EB] bg-[#2563EB]/10'
                    : (altoContraste ? 'border-black text-black' : 'border-slate-700 text-slate-300')
                }`}
                style={{ fontSize: modoAdultoMayor ? '14px' : '12px' }}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" />
                </svg>
                Oscuro
              </button>
              <button
                onClick={() => setAltoContraste(!altoContraste)}
                aria-pressed={altoContraste}
                className={`flex flex-col items-center gap-1.5 px-2 py-3 rounded-xl border font-medium transition ${
                  altoContraste
                    ? 'border-black text-black bg-black/5'
                    : 'border-slate-700 text-slate-300'
                }`}
                style={{ fontSize: modoAdultoMayor ? '14px' : '12px' }}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                  <circle cx="12" cy="12" r="3" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                Contraste
              </button>
              <button
                onClick={() => setModoAdultoMayor(!modoAdultoMayor)}
                aria-pressed={modoAdultoMayor}
                className={`flex flex-col items-center gap-1.5 px-2 py-3 rounded-xl border font-medium transition ${
                  modoAdultoMayor
                    ? 'border-[#2563EB] text-[#2563EB] bg-[#2563EB]/10'
                    : (altoContraste ? 'border-black text-black' : 'border-slate-700 text-slate-300')
                }`}
                style={{ fontSize: modoAdultoMayor ? '14px' : '12px' }}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 7V4h16v3M9 20h6M12 4v16" />
                </svg>
                Mayor
              </button>
            </div>

            <div className={`border-t my-2 ${altoContraste ? 'border-black' : 'border-slate-700'}`} />

            <button
              onClick={onLogout}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition text-[#DC2626] ${altoContraste ? 'hover:bg-slate-100' : 'hover:bg-red-500/10'}`}
              style={{ fontSize: modoAdultoMayor ? '18px' : '15px' }}
            >
              <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M16 17l5-5-5-5" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 12H9" />
              </svg>
              Cerrar sesión
            </button>
          </div>
        )}
      </header>

      {/* ========================================== */}
      {/* VISTA 1: "Mis Turnos"                     */}
      {/* ========================================== */}
      {vistaActual === 'admin' ? (
        // ==========================================
        // VISTA 3: "Panel de Administración" (2.4)
        // ==========================================
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
          <div className={`px-4 py-3 rounded-xl border text-sm ${altoContraste ? 'bg-white border-black text-black' : 'bg-amber-500/10 border-amber-500/30 text-amber-400'}`}>
            ⚠️ Esta vista todavía muestra datos de ejemplo — falta conectar el endpoint de administración en el backend.
          </div>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <span className={`inline-block font-bold uppercase tracking-wider px-2.5 py-1 rounded-full mb-2 ${
                altoContraste ? 'bg-black text-white' : 'bg-[#2563EB]/10 text-[#2563EB]'
              }`} style={{ fontSize: modoAdultoMayor ? '13px' : '11px' }}>
                Panel de Administración
              </span>
              <h1 className="font-bold" style={{ fontSize: modoAdultoMayor ? '32px' : '24px' }}>Gestión de turnos</h1>
            </div>
            <button
              onClick={() => alert('Modal de agregar disponibilidad en desarrollo')}
              className={`font-semibold px-4 py-2.5 rounded-xl shadow transition ${
                altoContraste ? 'bg-black text-white hover:bg-slate-800' : 'bg-blue-600 hover:bg-blue-700 text-white'
              }`}
              style={{ fontSize: modoAdultoMayor ? '18px' : '14px', minHeight: modoAdultoMayor ? '60px' : 'auto' }}
            >
              + Agregar disponibilidad
            </button>
          </div>

          {/* Tarjetas de estadísticas en tiempo real */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: 'Total de turnos', valor: estadisticasAdmin.total, icono: '📊', color: 'text-[#2563EB] bg-[#2563EB]/10' },
              { label: 'Confirmados', valor: estadisticasAdmin.confirmados, icono: '✅', color: 'text-emerald-500 bg-emerald-500/10' },
              { label: 'Pendientes', valor: estadisticasAdmin.pendientes, icono: '🕒', color: 'text-amber-500 bg-amber-500/10' },
              { label: 'Cancelados', valor: estadisticasAdmin.cancelados, icono: '❌', color: 'text-red-500 bg-red-500/10' },
            ].map((stat) => (
              <div
                key={stat.label}
                className={`p-5 rounded-xl border shadow-sm ${
                  altoContraste ? 'bg-white border-black text-black' : 'border-slate-700 bg-slate-800'
                }`}
              >
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center font-bold mb-3 ${altoContraste ? 'bg-black text-white' : stat.color}`}>
                  {stat.icono}
                </div>
                <p className={`${altoContraste ? 'text-black' : 'text-slate-400'}`} style={{ fontSize: modoAdultoMayor ? '15px' : '12px' }}>{stat.label}</p>
                <p className="font-bold" style={{ fontSize: modoAdultoMayor ? '30px' : '24px' }}>{stat.valor}</p>
              </div>
            ))}
          </div>

          {/* Buscador y filtro */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <label htmlFor="busqueda-admin" className="sr-only">Buscar por paciente, médico o especialidad</label>
              <input
                id="busqueda-admin"
                type="text"
                value={busquedaAdmin}
                onChange={(e) => setBusquedaAdmin(e.target.value)}
                placeholder="Buscar por paciente, médico o especialidad..."
                className={`w-full px-4 py-2.5 rounded-lg border transition ${
                  altoContraste ? 'bg-white border-black text-black' : 'bg-slate-800 border-slate-700 text-[#F1F5F9] placeholder:text-slate-500'
                }`}
                style={{ fontSize: modoAdultoMayor ? '18px' : '14px' }}
              />
            </div>
            <div>
              <label htmlFor="filtro-estado-admin" className="sr-only">Filtrar por estado</label>
              <select
                id="filtro-estado-admin"
                value={filtroEstadoAdmin}
                onChange={(e) => setFiltroEstadoAdmin(e.target.value)}
                className={`px-4 py-2.5 rounded-lg border font-medium transition ${
                  altoContraste ? 'bg-white border-black text-black' : 'bg-slate-800 border-slate-700 text-[#F1F5F9]'
                }`}
                style={{ fontSize: modoAdultoMayor ? '18px' : '14px' }}
              >
                {['Todos', 'Confirmado', 'Pendiente', 'Cancelado'].map((opcion) => (
                  <option key={opcion} value={opcion}>{opcion}</option>
                ))}
              </select>
            </div>
          </div>

          <p className={`${altoContraste ? 'text-black' : 'text-slate-400'}`} style={{ fontSize: modoAdultoMayor ? '16px' : '13px' }}>
            Mostrando {turnosAdminFiltrados.length} de {turnosAdmin.length} turnos
          </p>

          {/* Listado de turnos de todos los pacientes */}
          <div className="space-y-4">
            {turnosAdminFiltrados.length === 0 && (
              <div className={`p-8 rounded-xl border text-center ${altoContraste ? 'bg-white border-black text-black' : 'border-slate-700 bg-slate-800 text-slate-400'}`}>
                No se encontraron turnos con los filtros aplicados.
              </div>
            )}
            {turnosAdminFiltrados.map((turno) => {
              const colorBarra =
                turno.estado === 'Confirmado' ? 'border-l-emerald-500' :
                turno.estado === 'Pendiente' ? 'border-l-amber-500' : 'border-l-red-500';

              const badgeColor =
                turno.estado === 'Confirmado' ? 'bg-emerald-100 text-emerald-700' :
                turno.estado === 'Pendiente' ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700';

              return (
                <div
                  key={turno.id}
                  className={`p-5 rounded-xl border-l-4 ${colorBarra} border shadow-md flex flex-col md:flex-row justify-between items-start md:items-center gap-4 ${
                    altoContraste ? 'bg-white border-black text-black' : 'border-slate-700 bg-slate-800 text-[#F1F5F9]'
                  }`}
                >
                  <div className="flex items-start space-x-4">
                    <div className="w-12 h-12 rounded-full bg-blue-600/20 text-blue-400 font-bold flex items-center justify-center shrink-0">
                      {turno.paciente.split(' ').map(n => n[0]).join('').slice(0, 2)}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-bold uppercase tracking-wider text-blue-400">{turno.especialidad}</span>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${badgeColor}`}>{turno.estado}</span>
                      </div>
                      <h3 className="font-bold text-lg">{turno.paciente}</h3>
                      <p className={`text-sm mt-1 ${altoContraste ? 'text-black' : 'text-slate-300'}`}>{turno.medico}</p>
                      <p className={`text-xs mt-0.5 ${altoContraste ? 'text-black' : 'text-slate-400'}`}>📅 {turno.fecha} — <strong>{turno.hora}</strong></p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 w-full md:w-auto justify-end">
                    <button
                      onClick={() => actualizarEstadoTurnoAdmin(turno.id, 'Confirmado')}
                      disabled={turno.estado === 'Confirmado'}
                      className={`border px-4 py-2 rounded-lg text-sm font-semibold transition disabled:opacity-40 disabled:cursor-not-allowed ${
                        altoContraste ? 'border-black text-black hover:bg-slate-100' : 'border-emerald-500 text-emerald-400 hover:bg-emerald-600/10'
                      }`}
                    >
                      Confirmar
                    </button>
                    <button
                      onClick={() => actualizarEstadoTurnoAdmin(turno.id, 'Cancelado')}
                      disabled={turno.estado === 'Cancelado'}
                      className={`border px-4 py-2 rounded-lg text-sm font-semibold transition disabled:opacity-40 disabled:cursor-not-allowed ${
                        altoContraste ? 'border-black text-black hover:bg-slate-100' : 'border-red-500 text-red-400 hover:bg-red-600/10'
                      }`}
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </main>
      ) : vistaActual === 'mis-turnos' ? (
        <main className="max-w-5xl mx-auto px-4 py-8 space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h1 className="font-bold" style={{ fontSize: modoAdultoMayor ? '32px' : '24px' }}>Mis turnos</h1>
              <p className="text-slate-400 text-sm">{turnosActivos.length} turno{turnosActivos.length === 1 ? '' : 's'} activo{turnosActivos.length === 1 ? '' : 's'}</p>
            </div>
            <button
              onClick={() => alert('Wizard de nuevo turno')}
              className={`font-semibold px-4 py-2.5 rounded-xl shadow transition ${
                altoContraste ? 'bg-black text-white hover:bg-slate-800' : 'bg-blue-600 hover:bg-blue-700 text-white'
              }`}
              style={{ fontSize: modoAdultoMayor ? '18px' : '14px', minHeight: modoAdultoMayor ? '60px' : 'auto' }}
            >
              + Nuevo turno
            </button>
          </div>

          {/* Tabs de filtrado */}
          <div className="flex flex-wrap gap-2 border-b border-slate-700 pb-3">
            {['Todos', 'Confirmados', 'Pendientes', 'Cancelados'].map((tab) => (
              <button
                key={tab}
                onClick={() => setFiltroEstado(tab)}
                className={`px-4 py-2 rounded-lg font-medium transition ${
                  filtroEstado === tab
                    ? (altoContraste ? 'bg-black text-white' : 'bg-blue-600 text-white')
                    : (altoContraste ? 'bg-white text-black border border-black' : 'bg-slate-800 text-slate-300 hover:bg-slate-700')
                }`}
                style={{ fontSize: modoAdultoMayor ? '16px' : '14px' }}
              >
                {tab}
              </button>
            ))}
          </div>

          {cargandoTurnos && (
            <div className="text-slate-400 text-sm py-4">Cargando tus turnos...</div>
          )}

          {errorTurnos && !cargandoTurnos && (
            <div className="px-4 py-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
              No se pudieron cargar tus turnos: {errorTurnos}
            </div>
          )}

          {!cargandoTurnos && !errorTurnos && turnosFiltrados.length === 0 && (
            <div className={`p-8 rounded-xl border text-center ${altoContraste ? 'bg-white border-black text-black' : 'border-slate-700 bg-slate-800 text-slate-400'}`}>
              No tenés turnos con este filtro todavía.
            </div>
          )}

          {/* Cards de turno */}
          <div className="space-y-4">
            {turnosFiltrados.map((turno) => {
              const colorBarra =
                turno.estado === 'Confirmado' ? 'border-l-emerald-500' :
                turno.estado === 'Pendiente' ? 'border-l-amber-500' : 'border-l-red-500';

              const badgeColor =
                turno.estado === 'Confirmado' ? 'bg-emerald-100 text-emerald-700' :
                turno.estado === 'Pendiente' ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700';

              const noCancelable = turno.estado === 'Cancelado' || turno.estado === 'Finalizado';

              return (
                <div
                  key={turno.id}
                  className={`p-5 rounded-xl border-l-4 ${colorBarra} border shadow-md flex flex-col md:flex-row justify-between items-start md:items-center gap-4 ${
                    altoContraste ? 'bg-white border-black text-black' : 'border-slate-700 bg-slate-800 text-[#F1F5F9]'
                  }`}
                >
                  <div className="flex items-start space-x-4">
                    <div className="w-12 h-12 rounded-full bg-blue-600/20 text-blue-400 font-bold flex items-center justify-center shrink-0">
                      {turno.medico.split(' ').map(n => n[0]).join('').slice(0, 2)}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-bold uppercase tracking-wider text-blue-400">{turno.especialidad}</span>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${badgeColor}`}>{turno.estado}</span>
                      </div>
                      <h3 className="font-bold text-lg">{turno.medico}</h3>
                      <p className={`text-sm mt-1 ${altoContraste ? 'text-black' : 'text-slate-300'}`}>📅 {turno.fecha} — <strong>{turno.hora}</strong></p>
                      <p className={`text-xs mt-0.5 ${altoContraste ? 'text-black' : 'text-slate-400'}`}>📍 {turno.consultorio}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 w-full md:w-auto justify-end">
                    <button
                      onClick={() => alert('Reprogramar turno en desarrollo')}
                      className={`border px-4 py-2 rounded-lg text-sm font-semibold transition ${
                        altoContraste ? 'border-black text-black hover:bg-slate-100' : 'border-blue-500 text-blue-400 hover:bg-blue-600/10'
                      }`}
                    >
                      Reprogramar
                    </button>
                    <button
                      onClick={() => cancelarTurno(turno.id)}
                      disabled={noCancelable}
                      className={`border px-4 py-2 rounded-lg text-sm font-semibold transition disabled:opacity-40 disabled:cursor-not-allowed ${
                        altoContraste ? 'border-black text-black hover:bg-slate-100' : 'border-red-500 text-red-400 hover:bg-red-600/10'
                      }`}
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </main>
      ) : (
        // ==========================================
        // VISTA 2: "Dashboard Principal"
        // ==========================================
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
          <div>
            <p className={`${altoContraste ? 'text-black font-medium' : 'text-[#64748B]'}`} style={{ fontSize: modoAdultoMayor ? '18px' : '14px' }}>{saludoSegunHora()}</p>
            <h1 className="font-bold" style={{ fontSize: modoAdultoMayor ? '32px' : '24px' }}>{usuario.nombre}</h1>
          </div>

          {esPaciente && alertaActiva && proximoTurno && (
            <div className={`px-4 py-3 rounded-xl flex items-center justify-between border ${
              altoContraste ? 'bg-white border-black text-black font-semibold' : 'bg-[#EFF6FF] border-[#2563EB]/30 text-[#2563EB]'
            }`} style={{ fontSize: modoAdultoMayor ? '18px' : '14px' }}>
              <span>🔔 Recordatorio: tenés un turno en {diasHastaProximo} día{diasHastaProximo === 1 ? '' : 's'} con {proximoTurno.medico}.</span>
              <button onClick={() => setAlertaActiva(false)} className="font-bold hover:opacity-70" style={{ fontSize: modoAdultoMayor ? '22px' : '18px' }}>&times;</button>
            </div>
          )}

          {esPaciente && cargandoTurnos && (
            <div className="text-slate-400 text-sm">Cargando tus turnos...</div>
          )}

          {esPaciente && proximoTurno && (
            <div className={`p-6 rounded-2xl shadow-xl relative overflow-hidden ${
              altoContraste ? 'bg-white border-2 border-black text-black' : 'bg-[#2563EB] text-white'
            }`}>
              <div className={`absolute top-4 right-4 font-semibold px-2.5 py-1 rounded-full ${
                altoContraste ? 'bg-black text-white' : 'bg-white/20'
              }`} style={{ fontSize: modoAdultoMayor ? '15px' : '12px' }}>
                Próximo turno en {diasHastaProximo} día{diasHastaProximo === 1 ? '' : 's'}
              </div>
              <p className={`uppercase tracking-wider font-semibold mb-1 ${altoContraste ? 'text-black' : 'text-blue-200'}`} style={{ fontSize: modoAdultoMayor ? '16px' : '12px' }}>{proximoTurno.especialidad}</p>
              <h2 className="font-bold mb-1" style={{ fontSize: modoAdultoMayor ? '30px' : '24px' }}>{proximoTurno.medico}</h2>
              <p className={`mb-4 ${altoContraste ? 'text-black' : 'text-blue-100'}`} style={{ fontSize: modoAdultoMayor ? '18px' : '14px' }}>📅 {proximoTurno.fecha} — {proximoTurno.hora}</p>
              <button
                onClick={() => setVistaActual('mis-turnos')}
                className={`font-semibold px-4 py-2 rounded-lg shadow transition ${
                  altoContraste ? 'bg-black text-white hover:bg-slate-800' : 'bg-white text-[#2563EB] hover:bg-blue-50'
                }`}
                style={{ fontSize: modoAdultoMayor ? '18px' : '14px' }}
              >
                Ver detalles &gt;
              </button>
            </div>
          )}

          {esPaciente && !cargandoTurnos && !proximoTurno && (
            <div className={`p-6 rounded-2xl border text-center ${altoContraste ? 'bg-white border-black text-black' : 'border-slate-700 bg-slate-800 text-slate-400'}`}>
              No tenés turnos próximos. ¡Solicitá uno cuando quieras!
            </div>
          )}

          {esPaciente && (
            <div>
              <h3 className="font-bold mb-4" style={{ fontSize: modoAdultoMayor ? '24px' : '18px' }}>¿Qué querés hacer hoy?</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div onClick={() => alert('Asistente de solicitar turno')} className={`p-5 rounded-xl border shadow-sm cursor-pointer transition ${altoContraste ? 'bg-white border-black text-black' : 'border-slate-700 bg-slate-800 hover:border-blue-500'}`}>
                  <div className="w-10 h-10 rounded-lg bg-blue-500/20 text-blue-400 flex items-center justify-center font-bold mb-3">📅</div>
                  <h4 className="font-bold mb-1" style={{ fontSize: modoAdultoMayor ? '20px' : '16px' }}>Solicitar turno</h4>
                  <p className="text-slate-400" style={{ fontSize: modoAdultoMayor ? '15px' : '12px' }}>Reserva una nueva cita médica</p>
                </div>

                <div onClick={() => setVistaActual('mis-turnos')} className={`p-5 rounded-xl border shadow-sm cursor-pointer transition relative ${altoContraste ? 'bg-white border-black text-black' : 'border-slate-700 bg-slate-800 hover:border-blue-500'}`}>
                  {turnosActivos.length > 0 && (
                    <span className="absolute top-4 right-4 bg-red-600 text-white text-xs px-2 py-0.5 rounded-full font-bold">{turnosActivos.length}</span>
                  )}
                  <div className="w-10 h-10 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold mb-3">📋</div>
                  <h4 className="font-bold mb-1" style={{ fontSize: modoAdultoMayor ? '20px' : '16px' }}>Mis turnos</h4>
                  <p className="text-slate-400" style={{ fontSize: modoAdultoMayor ? '15px' : '12px' }}>Revisá tus próximas citas</p>
                </div>

                <div onClick={() => setVistaActual('mis-turnos')} className={`p-5 rounded-xl border shadow-sm cursor-pointer transition ${altoContraste ? 'bg-white border-black text-black' : 'border-slate-700 bg-slate-800 hover:border-blue-500'}`}>
                  <div className="w-10 h-10 rounded-lg bg-red-500/20 text-red-400 flex items-center justify-center font-bold mb-3">❌</div>
                  <h4 className="font-bold mb-1" style={{ fontSize: modoAdultoMayor ? '20px' : '16px' }}>Cancelar turno</h4>
                  <p className="text-slate-400" style={{ fontSize: modoAdultoMayor ? '15px' : '12px' }}>Anulá turnos que no necesites</p>
                </div>

                <div onClick={() => alert('Módulo de historial médico')} className={`p-5 rounded-xl border shadow-sm cursor-pointer transition ${altoContraste ? 'bg-white border-black text-black' : 'border-slate-700 bg-slate-800 hover:border-blue-500'}`}>
                  <div className="w-10 h-10 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold mb-3">📁</div>
                  <h4 className="font-bold mb-1" style={{ fontSize: modoAdultoMayor ? '20px' : '16px' }}>Historial</h4>
                  <p className="text-slate-400" style={{ fontSize: modoAdultoMayor ? '15px' : '12px' }}>Historial médico y citas pasadas</p>
                </div>
              </div>
            </div>
          )}

          {!esPaciente && (
            <div className={`p-6 rounded-2xl border text-center ${altoContraste ? 'bg-white border-black text-black' : 'border-slate-700 bg-slate-800 text-slate-400'}`}>
              {esAdmin ? 'Usá el menú "Administración" para gestionar turnos.' : 'La agenda de médico todavía no está conectada — próximamente.'}
            </div>
          )}
        </main>
      )}
    </div>
  );
}

export default Dashboard;
