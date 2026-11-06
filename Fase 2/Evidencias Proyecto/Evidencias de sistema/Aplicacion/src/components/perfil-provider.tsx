import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';

import type { RespuestasCuestionario } from '@/lib/cuestionario';
import {
  actualizarPerfil,
  crearPerfil,
  eliminarPerfil,
  guardarPerfilYCuestionario,
  guardarSesion,
  leerCuestionario,
  leerEjerciciosHechos,
  leerHistorialSesiones,
  leerPerfil,
  type DatosPerfil,
  type Perfil,
} from '@/lib/perfil';
import type { RegistroSesion } from '@/lib/sesion';

type PerfilContextValue = {
  perfil: Perfil | null;
  /** null = cuestionario inicial pendiente. */
  cuestionario: RespuestasCuestionario | null;
  cargando: boolean;
  guardando: boolean;
  error: string | null;
  recargar: () => Promise<void>;
  crear: (datos: DatosPerfil) => Promise<void>;
  actualizar: (datos: DatosPerfil) => Promise<void>;
  eliminar: () => Promise<void>;
  completarCuestionario: (datos: DatosPerfil, respuestas: RespuestasCuestionario) => Promise<void>;
  ultimaSesion: RegistroSesion | null;
  /** Hasta 5, de la más reciente a la más antigua. */
  sesionesRecientes: RegistroSesion[];
  totalSesiones: number;
  /** Ejercicios que ya hizo alguna vez: la técnica se abre sola cuando uno es nuevo. */
  ejerciciosHechos: string[];
  registrarSesion: (registro: RegistroSesion) => Promise<void>;
};

const PerfilContext = createContext<PerfilContextValue | null>(null);

// Un estado compartido mantiene Perfil y Configurar sincronizados.
export function PerfilProvider({ children }: { children: ReactNode }) {
  const [perfil, setPerfil] = useState<Perfil | null>(null);
  const [cuestionario, setCuestionario] = useState<RespuestasCuestionario | null>(null);
  const [sesionesRecientes, setSesionesRecientes] = useState<RegistroSesion[]>([]);
  const [totalSesiones, setTotalSesiones] = useState(0);
  const [ejerciciosHechos, setEjerciciosHechos] = useState<string[]>([]);
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
      const leido = await leerPerfil();
      setPerfil(leido);
      setCuestionario(leido ? await leerCuestionario() : null);
      const historial = leido ? await leerHistorialSesiones() : { recientes: [], total: 0 };
      setSesionesRecientes(historial.recientes);
      setTotalSesiones(historial.total);
      setEjerciciosHechos(leido ? await leerEjerciciosHechos() : []);
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
      if (!guardado) {
        setCuestionario(null);
        setSesionesRecientes([]);
        setTotalSesiones(0);
        setEjerciciosHechos([]);
      }
    } finally {
      operacionEnCurso.current = false;
      setGuardando(false);
    }
  }

  return (
    <PerfilContext.Provider value={{
      perfil,
      cuestionario,
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
      completarCuestionario: (datos, respuestas) => modificar(async () => {
        const guardado = await guardarPerfilYCuestionario(datos, respuestas);
        setCuestionario(guardado.cuestionario);
        return guardado.perfil;
      }),
      ultimaSesion: sesionesRecientes[0] ?? null,
      sesionesRecientes,
      totalSesiones,
      ejerciciosHechos,
      // No pasa por `modificar`: guardar una sesión no cambia el perfil ni reinicia la pantalla de inicio.
      registrarSesion: async (registro) => {
        const guardado = await guardarSesion(registro);
        setSesionesRecientes((r) => [guardado, ...r].slice(0, 5));
        setTotalSesiones((n) => n + 1);
        setEjerciciosHechos((a) => [...new Set([...a, ...guardado.ejercicios.filter((e) => e.hechas > 0).map((e) => e.id)])]);
      },
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
