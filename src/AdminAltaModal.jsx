import { useState, useEffect } from 'react';
import { api } from './api';

const inputClase = 'w-full px-4 py-2.5 rounded-lg bg-slate-950 border border-slate-700 focus:ring-2 focus:ring-blue-600 focus:outline-none text-slate-200 placeholder-slate-500 text-sm';
const labelClase = 'block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1';

function AdminAltaModal({ onClose }) {
  const [tab, setTab] = useState('especialidad');

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-lg text-slate-100 overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
          <h2 className="font-bold text-lg">Agregar al sistema</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-200 text-xl leading-none">&times;</button>
        </div>

        <div className="flex border-b border-slate-800">
          <button
            onClick={() => setTab('especialidad')}
            className={`flex-1 px-4 py-3 text-sm font-medium transition ${tab === 'especialidad' ? 'text-blue-400 border-b-2 border-blue-500' : 'text-slate-400 hover:text-slate-200'}`}
          >
            Especialidad
          </button>
          <button
            onClick={() => setTab('medico')}
            className={`flex-1 px-4 py-3 text-sm font-medium transition ${tab === 'medico' ? 'text-blue-400 border-b-2 border-blue-500' : 'text-slate-400 hover:text-slate-200'}`}
          >
            Médico
          </button>
        </div>

        <div className="px-6 py-5">
          {tab === 'especialidad' ? <FormEspecialidad /> : <FormMedico />}
        </div>
      </div>
    </div>
  );
}

function FormEspecialidad() {
  const [nombre, setNombre] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState('');
  const [exito, setExito] = useState('');

  const [especialidades, setEspecialidades] = useState([]);
  const [cargandoLista, setCargandoLista] = useState(true);
  const [errorLista, setErrorLista] = useState('');
  const [eliminandoId, setEliminandoId] = useState(null);
  const [espAConfirmar, setEspAConfirmar] = useState(null);

  const cargarEspecialidades = () => {
    api.especialidades()
      .then(({ data }) => setEspecialidades(data))
      .catch((err) => setErrorLista(err.message))
      .finally(() => setCargandoLista(false));
  };

  useEffect(() => {
    cargarEspecialidades();
  }, []);

  const enviar = async (e) => {
    e.preventDefault();
    setError('');
    setExito('');
    setEnviando(true);
    try {
      const { data } = await api.crearEspecialidad(nombre);
      setExito(`Especialidad "${data.nombre}" creada con éxito.`);
      setNombre('');
      setEspecialidades((prev) => [...prev, data]);
    } catch (err) {
      setError(err.message);
    } finally {
      setEnviando(false);
    }
  };

  // Antes de eliminar mostramos quiénes se ven afectados (el admin confirma
  // desde el modal, ver <ModalConfirmarEliminar /> más abajo).
  const eliminar = (esp) => setEspAConfirmar(esp);

  const confirmarEliminacion = async (esp) => {
    setError('');
    setExito('');
    setEspAConfirmar(null);
    setEliminandoId(esp.idEspecialidad);
    try {
      await api.eliminarEspecialidad(esp.idEspecialidad);
      setEspecialidades((prev) => prev.filter((e) => e.idEspecialidad !== esp.idEspecialidad));
      setExito(`Especialidad "${esp.nombre}" eliminada.`);
    } catch (err) {
      setError(err.message);
    } finally {
      setEliminandoId(null);
    }
  };

  return (
    <div className="space-y-5">
      <form onSubmit={enviar} className="space-y-4">
        {exito && <div className="px-4 py-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-sm">{exito}</div>}
        {error && <div className="px-4 py-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">{error}</div>}
        <div>
          <label className={labelClase}>Nombre de la especialidad <span className="text-red-500">*</span></label>
          <input type="text" value={nombre} onChange={(e) => setNombre(e.target.value)} required placeholder="Ej: Cardiología" className={inputClase} />
        </div>
        <button type="submit" disabled={enviando} className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-medium py-2.5 rounded-lg transition">
          {enviando ? 'Creando...' : 'Crear especialidad'}
        </button>
      </form>

      <div>
        <p className={labelClase}>Especialidades existentes</p>
        {cargandoLista && <p className="text-slate-400 text-sm">Cargando...</p>}
        {errorLista && !cargandoLista && <p className="text-red-400 text-sm">No se pudo cargar la lista: {errorLista}</p>}
        {!cargandoLista && !errorLista && especialidades.length === 0 && (
          <p className="text-slate-400 text-sm">Todavía no hay ninguna cargada.</p>
        )}
        <ul className="space-y-2 max-h-40 overflow-y-auto pr-1">
          {especialidades.map((esp) => (
            <li key={esp.idEspecialidad} className="flex items-center justify-between px-3 py-2 rounded-lg border border-slate-700 bg-slate-800 text-sm">
              <span>{esp.nombre}</span>
              <button
                type="button"
                onClick={() => eliminar(esp)}
                disabled={eliminandoId === esp.idEspecialidad}
                className="text-red-400 hover:text-red-300 disabled:opacity-50 text-xs font-semibold"
              >
                {eliminandoId === esp.idEspecialidad ? 'Eliminando...' : 'Eliminar'}
              </button>
            </li>
          ))}
        </ul>
      </div>

      {espAConfirmar && (
        <ModalConfirmarEliminar
          especialidad={espAConfirmar}
          onCancelar={() => setEspAConfirmar(null)}
          onConfirmar={() => confirmarEliminacion(espAConfirmar)}
        />
      )}
    </div>
  );
}

// Cartel de confirmación que se muestra ARRIBA del modal de alta (z-index
// mayor) al presionar "Eliminar" sobre una especialidad. Lista los médicos
// que se van a ver afectados antes de que el admin confirme el borrado lógico.
function ModalConfirmarEliminar({ especialidad, onCancelar, onConfirmar }) {
  const medicos = especialidad.medicos || [];

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/70">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-sm text-slate-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-800">
          <h3 className="font-bold text-lg">¿Eliminar "{especialidad.nombre}"?</h3>
        </div>
        <div className="px-6 py-5 space-y-4">
          {medicos.length > 0 ? (
            <>
              <p className="text-sm text-amber-400">
                {medicos.length} médico{medicos.length > 1 ? 's tienen' : ' tiene'} esta especialidad asignada. Van a seguir teniéndola en su perfil, pero la especialidad deja de estar disponible para nuevos turnos.
              </p>
              <ul className="space-y-1 max-h-32 overflow-y-auto text-sm text-slate-300 list-disc list-inside">
                {medicos.map((m) => (
                  <li key={m.idMedico}>{m.usuario?.nomYape}</li>
                ))}
              </ul>
            </>
          ) : (
            <p className="text-sm text-slate-400">No hay médicos asignados a esta especialidad.</p>
          )}
          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onCancelar}
              className="flex-1 border border-slate-600 text-slate-300 hover:bg-slate-800 font-medium py-2.5 rounded-lg transition"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={onConfirmar}
              className="flex-1 bg-red-600 hover:bg-red-700 text-white font-medium py-2.5 rounded-lg transition"
            >
              Eliminar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function FormMedico() {
  const [especialidades, setEspecialidades] = useState([]);
  const [cargandoEsp, setCargandoEsp] = useState(true);

  const [email, setEmail] = useState('');
  const [dni, setDni] = useState('');
  const [contrasena, setContrasena] = useState('');
  const [nombre, setNombre] = useState('');
  const [apellido, setApellido] = useState('');
  const [matricula, setMatricula] = useState('');
  const [consultorio, setConsultorio] = useState('');
  const [duracionTurnoMinutos, setDuracionTurnoMinutos] = useState('30');
  const [especialidadesIds, setEspecialidadesIds] = useState([]);

  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState('');
  const [exito, setExito] = useState('');

  useEffect(() => {
    api.especialidades()
      .then(({ data }) => setEspecialidades(data))
      .catch((err) => setError(err.message))
      .finally(() => setCargandoEsp(false));
  }, []);

  const toggleEspecialidad = (id) => {
    setEspecialidadesIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const enviar = async (e) => {
    e.preventDefault();
    setError('');
    setExito('');
    if (especialidadesIds.length === 0) {
      setError('Elegí al menos una especialidad para el médico.');
      return;
    }
    setEnviando(true);
    try {
      const nomYape = `${nombre.trim()} ${apellido.trim()}`.trim();
      const { data } = await api.crearMedico({ email, dni, contrasena, nomYape, matricula, consultorio, especialidadesIds, duracionTurnoMinutos });
      setExito(`Médico "${data.nomYape}" creado con éxito.`);
      setEmail(''); setDni(''); setContrasena(''); setNombre(''); setApellido(''); setMatricula(''); setConsultorio(''); setDuracionTurnoMinutos('30'); setEspecialidadesIds([]);
    } catch (err) {
      setError(err.message);
    } finally {
      setEnviando(false);
    }
  };

  if (cargandoEsp) return <p className="text-slate-400 text-sm">Cargando especialidades...</p>;

  return (
    <form onSubmit={enviar} className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
      {exito && <div className="px-4 py-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-sm">{exito}</div>}
      {error && <div className="px-4 py-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">{error}</div>}

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelClase}>Nombre <span className="text-red-500">*</span></label>
          <input type="text" value={nombre} onChange={(e) => setNombre(e.target.value)} required placeholder="Ana" className={inputClase} />
        </div>
        <div>
          <label className={labelClase}>Apellido <span className="text-red-500">*</span></label>
          <input type="text" value={apellido} onChange={(e) => setApellido(e.target.value)} required placeholder="Rodríguez" className={inputClase} />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelClase}>Email <span className="text-red-500">*</span></label>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="medico@salux.com" className={inputClase} />
        </div>
        <div>
          <label className={labelClase}>DNI <span className="text-red-500">*</span></label>
          <input type="text" value={dni} onChange={(e) => setDni(e.target.value)} required placeholder="30456789" className={inputClase} />
        </div>
      </div>
      <div>
        <label className={labelClase}>Contraseña inicial <span className="text-red-500">*</span></label>
        <input type="password" value={contrasena} onChange={(e) => setContrasena(e.target.value)} required minLength={8} placeholder="Mínimo 8 caracteres" className={inputClase} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelClase}>Matrícula <span className="text-red-500">*</span></label>
          <input type="text" value={matricula} onChange={(e) => setMatricula(e.target.value)} required placeholder="MP-12345" className={inputClase} />
        </div>
        <div>
          <label className={labelClase}>Consultorio</label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm pointer-events-none">Cons.</span>
            <input
              type="text"
              value={consultorio}
              onChange={(e) => setConsultorio(e.target.value)}
              placeholder="204"
              maxLength={10}
              className={`${inputClase} pl-14`}
            />
          </div>
          <p className="text-slate-500 text-xs mt-1">Solo el número/letra, ej: "A" o "204" — no escribas la palabra "Consultorio"</p>
        </div>
      </div>

      <div>
        <label className={labelClase}>Duración del turno (minutos)</label>
        <input
          type="number"
          value={duracionTurnoMinutos}
          onChange={(e) => setDuracionTurnoMinutos(e.target.value)}
          min={5}
          max={240}
          step={5}
          className={inputClase}
        />
        <p className="text-slate-500 text-xs mt-1">Cuánto dura cada turno de este médico. Se usa para generar los horarios disponibles en el wizard.</p>
      </div>

      <div>
        <label className={labelClase}>Especialidades <span className="text-red-500">*</span></label>
        {especialidades.length === 0 ? (
          <p className="text-slate-400 text-sm">No hay especialidades cargadas. Creá una primero en la otra pestaña.</p>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            {especialidades.map((esp) => (
              <label key={esp.idEspecialidad} className="flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-700 bg-slate-800 text-sm cursor-pointer">
                <input type="checkbox" checked={especialidadesIds.includes(esp.idEspecialidad)} onChange={() => toggleEspecialidad(esp.idEspecialidad)} />
                {esp.nombre}
              </label>
            ))}
          </div>
        )}
      </div>

      <button type="submit" disabled={enviando} className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-medium py-2.5 rounded-lg transition">
        {enviando ? 'Creando...' : 'Crear médico'}
      </button>
    </form>
  );
}

export default AdminAltaModal;
