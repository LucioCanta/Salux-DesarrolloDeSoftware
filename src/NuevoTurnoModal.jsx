import { useState, useEffect } from 'react';
import { api } from './api';

// Formato que espera <input type="datetime-local">, con mínimo "ahora + 1 hora"
function minimoFechaHora() {
  const d = new Date(Date.now() + 60 * 60 * 1000);
  d.setSeconds(0, 0);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function NuevoTurnoModal({ onClose, onCreado }) {
  const [paso, setPaso] = useState(1);
  const [cargandoDatos, setCargandoDatos] = useState(true);
  const [errorCarga, setErrorCarga] = useState('');
  const [especialidades, setEspecialidades] = useState([]);
  const [medicos, setMedicos] = useState([]);

  const [especialidadId, setEspecialidadId] = useState(null);
  const [medicoId, setMedicoId] = useState(null);
  const [fechaHora, setFechaHora] = useState('');

  const [enviando, setEnviando] = useState(false);
  const [errorEnvio, setErrorEnvio] = useState('');

  useEffect(() => {
    Promise.all([api.especialidades(), api.medicos()])
      .then(([resEsp, resMed]) => {
        setEspecialidades(resEsp.data);
        setMedicos(resMed.data);
      })
      .catch((err) => setErrorCarga(err.message))
      .finally(() => setCargandoDatos(false));
  }, []);

  const medicosDeLaEspecialidad = medicos.filter((m) =>
    m.especialidades?.some((e) => e.idEspecialidad === especialidadId)
  );
  const medicoElegido = medicos.find((m) => m.idMedico === medicoId);

  const confirmar = async () => {
    setEnviando(true);
    setErrorEnvio('');
    try {
      const fechaISO = new Date(fechaHora).toISOString();
      await api.crearTurno(medicoId, fechaISO);
      onCreado();
    } catch (err) {
      setErrorEnvio(err.message);
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-lg text-slate-100 overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
          <h2 className="font-bold text-lg">Solicitar turno</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-200 text-xl leading-none">&times;</button>
        </div>

        <div className="px-6 py-5 space-y-5">
          {cargandoDatos && <p className="text-slate-400 text-sm">Cargando especialidades y médicos...</p>}

          {errorCarga && !cargandoDatos && (
            <div className="px-4 py-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
              No se pudo cargar la información: {errorCarga}
            </div>
          )}

          {!cargandoDatos && !errorCarga && paso === 1 && (
            <>
              <p className="text-sm text-slate-400">Paso 1 de 3 — Elegí una especialidad</p>
              {especialidades.length === 0 ? (
                <p className="text-slate-400 text-sm">Todavía no hay especialidades cargadas en el sistema.</p>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  {especialidades.map((esp) => (
                    <button
                      key={esp.idEspecialidad}
                      onClick={() => { setEspecialidadId(esp.idEspecialidad); setMedicoId(null); setPaso(2); }}
                      className="px-4 py-3 rounded-lg border border-slate-700 bg-slate-800 hover:border-blue-500 text-left font-medium transition"
                    >
                      {esp.nombre}
                    </button>
                  ))}
                </div>
              )}
            </>
          )}

          {!cargandoDatos && !errorCarga && paso === 2 && (
            <>
              <p className="text-sm text-slate-400">Paso 2 de 3 — Elegí un médico</p>
              {medicosDeLaEspecialidad.length === 0 ? (
                <p className="text-slate-400 text-sm">No hay médicos cargados para esta especialidad todavía.</p>
              ) : (
                <div className="space-y-2">
                  {medicosDeLaEspecialidad.map((m) => (
                    <button
                      key={m.idMedico}
                      onClick={() => { setMedicoId(m.idMedico); setPaso(3); }}
                      className="w-full px-4 py-3 rounded-lg border border-slate-700 bg-slate-800 hover:border-blue-500 text-left transition"
                    >
                      <p className="font-medium">{m.usuario?.nomYape}</p>
                      <p className="text-xs text-slate-400">{m.consultorio ? `Consultorio ${m.consultorio}` : 'Consultorio a confirmar'}</p>
                    </button>
                  ))}
                </div>
              )}
              <button onClick={() => setPaso(1)} className="text-sm text-blue-400 hover:underline">&larr; Cambiar especialidad</button>
            </>
          )}

          {!cargandoDatos && !errorCarga && paso === 3 && (
            <>
              <p className="text-sm text-slate-400">Paso 3 de 3 — Elegí fecha y hora</p>
              <div className="px-4 py-3 rounded-lg bg-slate-800 border border-slate-700 text-sm">
                <p className="font-medium">{medicoElegido?.usuario?.nomYape}</p>
                <p className="text-slate-400">{especialidades.find((e) => e.idEspecialidad === especialidadId)?.nombre}</p>
              </div>
              <input
                type="datetime-local"
                value={fechaHora}
                min={minimoFechaHora()}
                onChange={(e) => setFechaHora(e.target.value)}
                className="w-full px-4 py-3 rounded-lg bg-slate-950 border border-slate-700 focus:ring-2 focus:ring-blue-600 focus:outline-none text-slate-200"
              />

              {errorEnvio && (
                <div className="px-4 py-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
                  {errorEnvio}
                </div>
              )}

              <div className="flex items-center justify-between pt-2">
                <button onClick={() => setPaso(2)} className="text-sm text-blue-400 hover:underline">&larr; Cambiar médico</button>
                <button
                  onClick={confirmar}
                  disabled={!fechaHora || enviando}
                  className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-medium px-5 py-2.5 rounded-lg transition"
                >
                  {enviando ? 'Reservando...' : 'Confirmar turno'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default NuevoTurnoModal;
