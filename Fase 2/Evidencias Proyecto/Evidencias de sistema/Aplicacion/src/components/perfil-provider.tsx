import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';

import {
  actualizarPerfil,
  crearPerfil,
  eliminarPerfil,
  leerPerfil,
  type DatosPerfil,
  type Perfil,
} from '@/lib/perfil';

type PerfilContextValue = {
  perfil: Perfil | null;
  cargando: boolean;
  guardando: boolean;
  error: string | null;
  recargar: () => Promise<void>;
  crear: (datos: DatosPerfil) => Promise<void>;
  actualizar: (datos: DatosPerfil) => Promise<void>;
  eliminar: () => Promise<void>;
};

const PerfilContext = createContext<PerfilContextValue | null>(null);

// Un estado compartido mantiene Perfil y Configurar sincronizados.
export function PerfilProvider({ children }: { children: ReactNode }) {
  const [perfil, setPerfil] = useState<Perfil | null>(null);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const operacionEnCurso = useRef(false);

  const recargar = useCallback(async () => {
    if (operacionEnCurso.current) return;
    operacionEnCurso.current = true;
    setCargando(true);
    setError(null);
    try {
      setPerfil(await leerPerfil());
    } catch (fallo) {
      setError(fallo instanceof Error ? fallo.message : 'No pudimos leer tu perfil. Intenta cargarlo nuevamente.');
    } finally {
      operacionEnCurso.current = false;
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    void recargar();
  }, [recargar]);

  async function modificar(operacion: () => Promise<Perfil | null>) {
    if (operacionEnCurso.current || cargando || error) {
      throw new Error('Espera a que termine la carga del perfil e inténtalo nuevamente.');
    }
    operacionEnCurso.current = true;
    setGuardando(true);
    try {
      const guardado = await operacion();
      // Solo reflejar el cambio después de que SQLite lo confirme.
      setPerfil(guardado);
    } finally {
      operacionEnCurso.current = false;
      setGuardando(false);
    }
  }

  return (
    <PerfilContext.Provider value={{
      perfil,
      cargando,
      guardando,
      error,
      recargar,
      crear: (datos) => modificar(() => crearPerfil(datos)),
      actualizar: (datos) => modificar(() => actualizarPerfil(datos)),
      eliminar: () => modificar(async () => {
        await eliminarPerfil();
        return null;
      }),
    }}>
      {children}
    </PerfilContext.Provider>
  );
}

export function usePerfil() {
  const contexto = useContext(PerfilContext);
  if (!contexto) throw new Error('usePerfil necesita estar dentro de PerfilProvider.');
  return contexto;
}
