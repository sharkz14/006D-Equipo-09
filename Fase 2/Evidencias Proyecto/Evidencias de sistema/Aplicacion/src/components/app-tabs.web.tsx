import {
  Tabs,
  TabList,
  TabTrigger,
  TabSlot,
  TabTriggerSlotProps,
  TabListProps,
} from 'expo-router/ui';
import { Pressable, Text, View, StyleSheet } from 'react-native';

import { T } from '@/constants/tema';
import { MaxContentWidth, Spacing } from '@/constants/theme';

export default function AppTabs() {
  return (
    <Tabs>
      {/* Barra arriba y contenido debajo: así la barra no tapa los títulos de cada pantalla. */}
      <TabList asChild>
        <CustomTabList>
          <TabTrigger name="index" href="/" asChild>
            <TabButton>Rutina</TabButton>
          </TabTrigger>
          <TabTrigger name="perfil" href="/perfil" asChild>
            <TabButton>Perfil</TabButton>
          </TabTrigger>
          <TabTrigger name="explore" href="/explore" asChild>
            <TabButton>Cómo funciona</TabButton>
          </TabTrigger>
        </CustomTabList>
      </TabList>
      <TabSlot style={{ flex: 1 }} />
    </Tabs>
  );
}

export function TabButton({ children, isFocused, ...props }: TabTriggerSlotProps) {
  return (
    <Pressable {...props} style={({ pressed }) => pressed && styles.pressed}>
      <View style={[styles.tabButtonView, isFocused && styles.tabElegida]}>
        <Text style={[styles.textoTab, isFocused && styles.textoTabElegida]}>{children}</Text>
      </View>
    </Pressable>
  );
}

export function CustomTabList(props: TabListProps) {
  return (
    <View {...props} style={styles.tabListContainer}>
      <View style={styles.innerContainer}>
        {props.children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  tabListContainer: {
    width: '100%',
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    backgroundColor: T.fondo,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
  },
  innerContainer: {
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.five,
    borderRadius: Spacing.five,
    backgroundColor: T.superficie,
    borderWidth: 1,
    borderColor: T.borde,
    flexDirection: 'row',
    alignItems: 'center',
    flexGrow: 1,
    justifyContent: 'center',
    gap: Spacing.two,
    maxWidth: MaxContentWidth,
  },
  brandText: {
    marginRight: 'auto',
    fontSize: 16,
    fontWeight: '800',
    color: T.acentoTexto,
  },
  textoTab: { fontSize: 14, fontWeight: '600', color: T.suave },
  textoTabElegida: { color: T.texto },
  tabElegida: { backgroundColor: T.acentoSuave },
  pressed: {
    opacity: 0.7,
  },
  tabButtonView: {
    paddingVertical: Spacing.one,
    paddingHorizontal: Spacing.three,
    borderRadius: Spacing.three,
  },
});
