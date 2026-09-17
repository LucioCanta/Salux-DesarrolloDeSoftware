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

  const enviar = async (e) => {
    e.preventDefault();
    setError('');
    setExito('');
    setEnviando(true);
    try {
      const { data } = await api.crearEspecialidad(nombre);
      setExito(`Especialidad "${data.nombre}" creada con éxito.`);
      setNombre('');
    } catch (err) {
      setError(err.message);
    } finally {
      setEnviando(false);
    }
  };

  return (
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
  );
}

function FormMedico() {
  const [especialidades, setEspecialidades] = useState([]);
  const [cargandoEsp, setCargandoEsp] = useState(true);

  const [email, setEmail] = useState('');
  const [dni, setDni] = useState('');
  const [contrasena, setContrasena] = useState('');
  const [nomYape, setNomYape] = useState('');
  const [matricula, setMatricula] = useState('');
  const [consultorio, setConsultorio] = useState('');
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
      const { data } = await api.crearMedico({ email, dni, contrasena, nomYape, matricula, consultorio, especialidadesIds });
      setExito(`Médico "${data.nomYape}" creado con éxito.`);
      setEmail(''); setDni(''); setContrasena(''); setNomYape(''); setMatricula(''); setConsultorio(''); setEspecialidadesIds([]);
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

      <div>
        <label className={labelClase}>Nombre completo <span className="text-red-500">*</span></label>
        <input type="text" value={nomYape} onChange={(e) => setNomYape(e.target.value)} required placeholder="Ej: Dra. Ana Rodríguez" className={inputClase} />
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
        <input type="text" value={contrasena} onChange={(e) => setContrasena(e.target.value)} required minLength={8} placeholder="Mínimo 8 caracteres" className={inputClase} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelClase}>Matrícula <span className="text-red-500">*</span></label>
          <input type="text" value={matricula} onChange={(e) => setMatricula(e.target.value)} required placeholder="MP-12345" className={inputClase} />
        </div>
        <div>
          <label className={labelClase}>Consultorio</label>
          <input type="text" value={consultorio} onChange={(e) => setConsultorio(e.target.value)} placeholder="Consultorio 204" className={inputClase} />
        </div>
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
