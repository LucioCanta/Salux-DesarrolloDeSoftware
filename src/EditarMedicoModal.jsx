import { useState, useEffect } from 'react';
import { api } from './api';

const inputClase = 'w-full px-4 py-2.5 rounded-lg bg-slate-950 border border-slate-700 focus:ring-2 focus:ring-blue-600 focus:outline-none text-slate-200 placeholder-slate-500 text-sm';
const labelClase = 'block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1';

function EditarMedicoModal({ medico, onClose, onActualizado }) {
  const [consultorio, setConsultorio] = useState(medico.consultorio || '');
  const [duracionTurnoMinutos, setDuracionTurnoMinutos] = useState(String(medico.duracionTurnoMinutos ?? 30));
  const [especialidadesIds, setEspecialidadesIds] = useState((medico.especialidades || []).map((e) => e.idEspecialidad));
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState('');

  const [especialidades, setEspecialidades] = useState([]);
  const [cargandoEsp, setCargandoEsp] = useState(true);

  useEffect(() => {
    api.especialidades()
      .then(({ data }) => setEspecialidades(data))
      .catch((err) => setError(err.message))
      .finally(() => setCargandoEsp(false));
  }, []);

  const toggleEspecialidad = (id) => {
    setEspecialidadesIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const guardar = async (e) => {
    e.preventDefault();
    setError('');
    if (especialidadesIds.length === 0) {
      setError('El médico tiene que tener al menos una especialidad.');
      return;
    }
    setEnviando(true);
    try {
      const { data } = await api.actualizarMedico(medico.idMedico, { consultorio, duracionTurnoMinutos, especialidadesIds });
      onActualizado(data);
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-md text-slate-100 overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
          <h2 className="font-bold text-lg">Editar médico</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-200 text-xl leading-none">&times;</button>
        </div>

        <form onSubmit={guardar} className="px-6 py-5 space-y-4 max-h-[75vh] overflow-y-auto">
          <p className="text-sm text-slate-400">{medico.usuario?.nomYape}</p>

          {error && <div className="px-4 py-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">{error}</div>}

          <div>
            <label className={labelClase}>Consultorio</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm pointer-events-none">Cons.</span>
              <input type="text" value={consultorio} onChange={(e) => setConsultorio(e.target.value)} placeholder="204" maxLength={10} className={`${inputClase} pl-14`} />
            </div>
          </div>

          <div>
            <label className={labelClase}>Duración del turno (minutos)</label>
            <input type="number" value={duracionTurnoMinutos} onChange={(e) => setDuracionTurnoMinutos(e.target.value)} min={5} max={240} step={5} className={inputClase} />
          </div>

          <div>
            <label className={labelClase}>Especialidades</label>
            {cargandoEsp ? (
              <p className="text-slate-400 text-sm">Cargando especialidades...</p>
            ) : especialidades.length === 0 ? (
              <p className="text-slate-400 text-sm">No hay especialidades activas cargadas.</p>
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
            {enviando ? 'Guardando...' : 'Guardar cambios'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default EditarMedicoModal;
