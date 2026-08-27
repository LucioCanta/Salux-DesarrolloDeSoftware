function App() {
  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
      <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md border border-slate-200">
        
        {/* Cabecera / Logo */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-blue-600 tracking-tight">Salux</h1>
          <p className="text-slate-500 text-sm mt-1">Sistema de Gestión de Turnos Médicos</p>
        </div>

        {/* Formulario de Login basado en el Figma */}
        <form className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              DNI o Email *
            </label>
            <input 
              type="text" 
              placeholder="Ej: 30456789 o tu@email.com" 
              className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-600 focus:outline-none text-slate-800"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Contraseña *
            </label>
            <input 
              type="password" 
              placeholder="Ingresá tu contraseña" 
              className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-600 focus:outline-none text-slate-800"
            />
          </div>

          <div className="flex items-center justify-between text-sm">
            <a href="#" className="text-blue-600 hover:underline">¿Olvidaste tu contraseña?</a>
          </div>

          <button 
            type="button" 
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 rounded-lg transition shadow-md"
          >
            Iniciar sesión
          </button>
        </form>

      </div>
    </div>
  )
}

export default App