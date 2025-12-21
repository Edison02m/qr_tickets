import React, { useState, useEffect } from 'react';

interface ConfigRelay {
  id: number;
  ip: string;
  port: number;
  timeout: number;
  reintentos: number;
  fecha_actualizacion: string;
}

interface ConfigFormData {
  ip: string;
  port: number;
  timeout: number;
  reintentos: number;
}

interface FormErrors {
  ip?: string;
  port?: string;
  timeout?: string;
  reintentos?: string;
}

const ConfigRelayAdmin: React.FC = () => {
  const [config, setConfig] = useState<ConfigRelay | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  
  const [formData, setFormData] = useState<ConfigFormData>({
    ip: '192.168.3.200',
    port: 80,
    timeout: 3000,
    reintentos: 3,
  });
  
  const [formErrors, setFormErrors] = useState<FormErrors>({});

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    try {
      setLoading(true);
      setError('');
      if (window.electronAPI) {
        const data = await window.electronAPI.getConfigRelay();
        setConfig(data);
        setFormData({
          ip: data.ip,
          port: data.port,
          timeout: data.timeout,
          reintentos: data.reintentos,
        });
      }
    } catch (err) {
      console.error('Error loading relay config:', err);
      setError('Error al cargar la configuración del relay');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    
    // Convertir a número para campos numéricos
    if (name === 'port' || name === 'timeout' || name === 'reintentos') {
      setFormData(prev => ({
        ...prev,
        [name]: value === '' ? 0 : parseInt(value, 10),
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value,
      }));
    }
    
    // Limpiar error del campo al editar
    if (formErrors[name as keyof FormErrors]) {
      setFormErrors(prev => ({ ...prev, [name]: undefined }));
    }
  };

  const validateForm = (): boolean => {
    const errors: FormErrors = {};

    // Validar IP
    if (!formData.ip || formData.ip.trim() === '') {
      errors.ip = 'La IP es requerida';
    } else {
      const ipRegex = /^(\d{1,3}\.){3}\d{1,3}$/;
      if (!ipRegex.test(formData.ip.trim())) {
        errors.ip = 'Formato de IP inválido (ej: 192.168.1.100)';
      } else {
        // Validar rangos de cada octeto
        const octetos = formData.ip.trim().split('.');
        const valido = octetos.every(o => {
          const num = parseInt(o, 10);
          return num >= 0 && num <= 255;
        });
        if (!valido) {
          errors.ip = 'Los valores de IP deben estar entre 0-255';
        }
      }
    }

    // Validar puerto
    if (!formData.port || formData.port < 1 || formData.port > 65535) {
      errors.port = 'El puerto debe estar entre 1 y 65535';
    }

    // Validar timeout
    if (!formData.timeout || formData.timeout < 100 || formData.timeout > 30000) {
      errors.timeout = 'El timeout debe estar entre 100 y 30000 ms';
    }

    // Validar reintentos
    if (!formData.reintentos || formData.reintentos < 1 || formData.reintentos > 10) {
      errors.reintentos = 'Los reintentos deben estar entre 1 y 10';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    setError('');
    setSuccessMessage('');
    
    if (!validateForm()) {
      return;
    }

    try {
      setSaving(true);
      if (window.electronAPI) {
        const updatedConfig = await window.electronAPI.updateConfigRelay(formData);
        setConfig(updatedConfig);
        setSuccessMessage('✅ Configuración del relay X-410 actualizada correctamente');
        
        // Limpiar mensaje de éxito después de 5 segundos
        setTimeout(() => setSuccessMessage(''), 5000);
      }
    } catch (err: any) {
      console.error('Error updating relay config:', err);
      setError(err.message || 'Error al actualizar la configuración del relay');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    if (config) {
      setFormData({
        ip: config.ip,
        port: config.port,
        timeout: config.timeout,
        reintentos: config.reintentos,
      });
      setFormErrors({});
      setError('');
      setSuccessMessage('');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="flex items-center gap-3">
          <div className="animate-spin rounded-full h-8 w-8 border-4 border-[#457373] border-t-transparent"></div>
          <span className="text-[#1D324D] text-lg">Cargando configuración...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="mb-6">
        <div className="w-8 h-0.5 bg-[#457373] mb-3 rounded-full"></div>
        <h1 className="text-xl font-light text-[#1D324D] tracking-tight">Configuración del Relay X-410</h1>
        <p className="text-[#7C4935]/70 text-xs font-light mt-1">
          Configura la conexión con el relay ControlByWeb X-410
        </p>
      </div>

      {/* Mensajes de error/éxito */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <svg className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-sm text-red-800">{error}</p>
          </div>
        </div>
      )}

      {successMessage && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <svg className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-sm text-green-800">{successMessage}</p>
          </div>
        </div>
      )}

      {/* Configuración actual */}
      {config && (
        <div className="bg-gradient-to-br from-[#F1EADC]/30 to-[#DFE4E4]/30 backdrop-blur-sm rounded-2xl p-6 border border-white/50">
          <div className="flex items-center gap-2 mb-4">
            <svg className="w-5 h-5 text-[#457373]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h3 className="text-sm font-medium text-[#1D324D]">Estado Actual del Relay</h3>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white/60 rounded-xl p-3 border border-[#DFE4E4]/50">
              <div className="text-xs text-[#7C4935]/70 mb-1">IP del Relay</div>
              <div className="text-sm font-mono font-semibold text-[#1D324D]">{config.ip}</div>
            </div>
            <div className="bg-white/60 rounded-xl p-3 border border-[#DFE4E4]/50">
              <div className="text-xs text-[#7C4935]/70 mb-1">Puerto</div>
              <div className="text-sm font-semibold text-[#1D324D]">{config.port}</div>
            </div>
            <div className="bg-white/60 rounded-xl p-3 border border-[#DFE4E4]/50">
              <div className="text-xs text-[#7C4935]/70 mb-1">Timeout</div>
              <div className="text-sm font-semibold text-[#1D324D]">{config.timeout} ms</div>
            </div>
            <div className="bg-white/60 rounded-xl p-3 border border-[#DFE4E4]/50">
              <div className="text-xs text-[#7C4935]/70 mb-1">Reintentos</div>
              <div className="text-sm font-semibold text-[#1D324D]">{config.reintentos}</div>
            </div>
          </div>
          
          <div className="mt-4 flex items-center gap-2 text-xs text-[#7C4935]/60">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Última actualización: {new Date(config.fecha_actualizacion).toLocaleString('es-ES')}
          </div>
        </div>
      )}

      {/* Formulario de configuración */}
      <div className="bg-white/90 backdrop-blur-sm rounded-3xl shadow-2xl border border-white/50 p-8">
        <div className="flex items-center gap-2 mb-6">
          <svg className="w-5 h-5 text-[#457373]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          <h3 className="text-lg font-medium text-[#1D324D]">Configurar Relay X-410</h3>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* IP del Relay */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-[#1D324D] mb-2">
                Dirección IP del Relay X-410 *
              </label>
              <input
                type="text"
                name="ip"
                value={formData.ip}
                onChange={handleInputChange}
                className={`w-full px-4 py-3 bg-[#F1EADC]/30 border ${
                  formErrors.ip ? 'border-red-500' : 'border-[#DFE4E4]'
                } rounded-xl text-[#1D324D] focus:outline-none focus:ring-2 focus:ring-[#457373] focus:border-transparent transition-all duration-300 font-mono`}
                placeholder="192.168.3.200"
              />
              {formErrors.ip && (
                <p className="mt-1 text-xs text-red-500">{formErrors.ip}</p>
              )}
              <p className="mt-1 text-xs text-[#7C4935]/70">
                Dirección IP del dispositivo ControlByWeb X-410 en tu red local
              </p>
            </div>

            {/* Puerto */}
            <div>
              <label className="block text-sm font-medium text-[#1D324D] mb-2">
                Puerto *
              </label>
              <input
                type="number"
                name="port"
                value={formData.port}
                onChange={handleInputChange}
                min="1"
                max="65535"
                className={`w-full px-4 py-3 bg-[#F1EADC]/30 border ${
                  formErrors.port ? 'border-red-500' : 'border-[#DFE4E4]'
                } rounded-xl text-[#1D324D] focus:outline-none focus:ring-2 focus:ring-[#457373] focus:border-transparent transition-all duration-300`}
              />
              {formErrors.port && (
                <p className="mt-1 text-xs text-red-500">{formErrors.port}</p>
              )}
              <p className="mt-1 text-xs text-[#7C4935]/70">
                Puerto HTTP del X-410 (generalmente 80)
              </p>
            </div>

            {/* Timeout */}
            <div>
              <label className="block text-sm font-medium text-[#1D324D] mb-2">
                Timeout (ms) *
              </label>
              <input
                type="number"
                name="timeout"
                value={formData.timeout}
                onChange={handleInputChange}
                min="100"
                max="30000"
                step="100"
                className={`w-full px-4 py-3 bg-[#F1EADC]/30 border ${
                  formErrors.timeout ? 'border-red-500' : 'border-[#DFE4E4]'
                } rounded-xl text-[#1D324D] focus:outline-none focus:ring-2 focus:ring-[#457373] focus:border-transparent transition-all duration-300`}
              />
              {formErrors.timeout && (
                <p className="mt-1 text-xs text-red-500">{formErrors.timeout}</p>
              )}
              <p className="mt-1 text-xs text-[#7C4935]/70">
                Tiempo máximo de espera para respuesta (100-30000 ms)
              </p>
            </div>

            {/* Reintentos */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-[#1D324D] mb-2">
                Número de Reintentos *
              </label>
              <input
                type="number"
                name="reintentos"
                value={formData.reintentos}
                onChange={handleInputChange}
                min="1"
                max="10"
                className={`w-full px-4 py-3 bg-[#F1EADC]/30 border ${
                  formErrors.reintentos ? 'border-red-500' : 'border-[#DFE4E4]'
                } rounded-xl text-[#1D324D] focus:outline-none focus:ring-2 focus:ring-[#457373] focus:border-transparent transition-all duration-300`}
              />
              {formErrors.reintentos && (
                <p className="mt-1 text-xs text-red-500">{formErrors.reintentos}</p>
              )}
              <p className="mt-1 text-xs text-[#7C4935]/70">
                Cantidad de intentos antes de reportar error (1-10)
              </p>
            </div>
          </div>

          {/* Información adicional */}
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <svg className="w-5 h-5 text-blue-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div className="flex-1">
                <p className="text-sm text-blue-900 font-medium mb-1">Importante</p>
                <p className="text-xs text-blue-700">
                  Asegúrate de que el relay X-410 esté conectado a la misma red y sea accesible desde esta computadora.
                  Los cambios afectarán todas las puertas configuradas que usen este relay.
                </p>
              </div>
            </div>
          </div>

          {/* Botones */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={handleReset}
              className="flex-1 px-6 py-3 bg-[#DFE4E4]/50 text-[#1D324D] rounded-xl hover:bg-[#DFE4E4] transition-all duration-300 font-medium text-sm"
              disabled={saving}
            >
              Cancelar Cambios
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 px-6 py-3 bg-gradient-to-r from-[#1D324D] to-[#457373] text-white rounded-xl hover:from-[#457373] hover:to-[#1D324D] transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-[1.02] font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center justify-center gap-2"
            >
              {saving ? (
                <>
                  <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Guardando...
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                  </svg>
                  Guardar Configuración
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ConfigRelayAdmin;
