import { DefaultTheme, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import AppTabs from '@/components/app-tabs';
import { PerfilProvider } from '@/components/perfil-provider';
import { T } from '@/constants/tema';

// Tema de Kinetia para la navegación (fondo de las pantallas y de las pestañas).
const TEMA = { ...DefaultTheme, colors: { ...DefaultTheme.colors, background: T.fondo, card: T.superficie, border: T.borde,
  primary: T.acentoTexto, text: T.texto } };

SplashScreen.preventAutoHideAsync();

export default function TabLayout() {
  return (
    <ThemeProvider value={TEMA}>
      <StatusBar style="dark" />
      <AnimatedSplashOverlay />
      <PerfilProvider>
        <AppTabs />
      </PerfilProvider>
    </ThemeProvider>
  );
}
