import { TouchableOpacity, View, Text, StyleSheet } from 'react-native';
import { useState, useEffect } from 'react';
import { Tabs, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '@/store/auth';
import { supabase } from '@/lib/supabase';
import { colors, shadows } from '@/components/ui/theme';
import { TEST_MODE } from '@/lib/testMode';

const TAB_BG = '#FFFFFF';
const TAB_ACT = colors.primaryDark;
const TAB_INACT = '#8EA098';
const HDR_BG = colors.primaryDark;

const HEADER_META: Record<string, { title: string; subtitle: string; icon: keyof typeof Ionicons.glyphMap }> = {
  index: { title: 'Inicio', subtitle: 'Tu centro de quinielas', icon: 'home' },
  'predictions/index': { title: 'Quiniela', subtitle: 'Captura tus marcadores', icon: 'football' },
  'live/index':    { title: 'En Vivo', subtitle: 'Partidos de hoy', icon: 'radio' },
  'standings/index': { title: 'Tabla', subtitle: 'Clasificacion en tiempo real', icon: 'podium' },
  'invites/index': { title: 'Liga', subtitle: 'Tu grupo', icon: 'people' },
  'purchase/index': { title: 'Comprar', subtitle: 'Planes y acceso', icon: 'card' },
  'debug/index': { title: 'Debug', subtitle: 'Herramientas tecnicas', icon: 'construct' },
  'profile/index': { title: 'Mi perfil', subtitle: 'Cuenta y metodos de pago', icon: 'person-circle' },
};

function TabGlyph({ icon, color, focused }: { icon: keyof typeof Ionicons.glyphMap; color: string; focused: boolean }) {
  return (
    <View style={[styles.tabGlyphWrap, focused && styles.tabGlyphWrapActive]}>
      {focused && <View style={styles.tabActiveGlow} />}
      <Ionicons name={icon} size={20} color={focused ? TAB_ACT : color} />
    </View>
  );
}

function ProfileInitial() {
  const { user } = useAuthStore();
  const [initial, setInitial] = useState('?');

  useEffect(() => {
    if (!user) return;
    supabase
      .from('profiles')
      .select('username')
      .eq('id', user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data?.username) setInitial(data.username[0].toUpperCase());
      });
  }, [user?.id]);

  return (
    <View style={styles.avatarCircle}>
      <Text style={styles.avatarInitial}>{initial}</Text>
    </View>
  );
}


export default function AppLayout() {
  const router = useRouter();

  return (
    <Tabs
      screenOptions={({ route }) => {
        const meta = HEADER_META[route.name] ?? {
          title: String(route.name),
          subtitle: 'Mundial Quiniela',
          icon: 'apps',
        };

        return {
        headerShown: false,
        headerStyle: {
          backgroundColor: HDR_BG,
          borderBottomWidth: 0,
        },
        headerTintColor: '#fff',
        headerTitle: () => (
          <View style={styles.headerTitleWrap}>
            <View style={styles.headerIconBadge}>
              <Ionicons name={meta.icon} size={13} color={colors.accent} />
            </View>
            <View>
              <Text style={styles.headerTitleText}>{meta.title}</Text>
              <Text style={styles.headerSubtitle}>{meta.subtitle}</Text>
            </View>
          </View>
        ),
        headerShadowVisible: false,
        headerBackground: () => (
          <View style={styles.headerBg} />
        ),
        headerRight: () => (
          <View style={styles.headerActions}>
            <TouchableOpacity style={styles.headerIconBtn}>
              <Ionicons name="notifications-outline" size={20} color={colors.accent} />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => router.push('/(app)/profile')} style={styles.avatarBtn}>
              <ProfileInitial />
            </TouchableOpacity>
          </View>
        ),
        tabBarActiveTintColor: TAB_ACT,
        tabBarInactiveTintColor: TAB_INACT,
        tabBarStyle: {
          backgroundColor: TAB_BG,
          borderTopWidth: 1,
          borderTopColor: '#E6ECE8',
          height: 78,
          paddingBottom: 10,
          paddingTop: 8,
          ...shadows.sm,
        },
        tabBarLabelStyle: {
          fontSize: 9,
          fontWeight: '700',
          letterSpacing: 0.25,
          marginTop: 1,
          lineHeight: 10,
          maxWidth: 72,
          textAlign: 'center',
        },
        tabBarItemStyle: {
          paddingHorizontal: 0,
        },
      };
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Inicio',
          tabBarIcon: ({ color, focused }) => (
            <TabGlyph icon="home" color={color} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="predictions/index"
        options={{
          title: 'Quiniela',
          tabBarIcon: ({ color, focused }) => (
            <TabGlyph icon="football" color={color} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="live/index"
        options={{
          title: 'En Vivo',
          tabBarIcon: ({ color, focused }) => (
            <TabGlyph icon="radio" color={color} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="standings/index"
        options={{
          title: 'Tabla',
          tabBarIcon: ({ color, focused }) => (
            <TabGlyph icon="podium" color={color} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="invites/index"
        options={{
          title: 'Liga',
          tabBarIcon: ({ color, focused }) => (
            <TabGlyph icon="people" color={color} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="purchase/index"
        options={{
          title: 'Comprar',
          href: null,
        }}
      />
      <Tabs.Screen
        name="debug/index"
        options={{
          title: 'Debug',
          href: TEST_MODE ? undefined : null,
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="construct" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile/index"
        options={{
          title: 'Mi perfil',
          href: null,
        }}
      />
      <Tabs.Screen
        name="rules"
        options={{
          href: null,
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  headerBg: {
    flex: 1,
    backgroundColor: HDR_BG,
    overflow: 'hidden',
  },
  headerGlowA: {
    position: 'absolute',
    right: -12,
    top: -32,
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  headerGlowB: {
    position: 'absolute',
    left: 110,
    top: 16,
    width: 82,
    height: 82,
    borderRadius: 41,
    backgroundColor: 'rgba(201,168,76,0.10)',
  },
  headerTitleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerIconBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(201,168,76,0.16)',
    borderWidth: 1,
    borderColor: 'rgba(201,168,76,0.40)',
  },
  headerTitleText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 17,
    letterSpacing: 0.3,
    lineHeight: 19,
  },
  headerSubtitle: {
    color: 'rgba(225,236,252,0.72)',
    fontSize: 10,
    marginTop: 1,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  headerActions: {
    marginRight: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerIconBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(201,168,76,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarBtn: { marginLeft: 6 },
  avatarCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: { fontSize: 14, fontWeight: '800', color: colors.navy },
  tabGlyphWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 34,
    height: 26,
    borderRadius: 13,
  },
  tabGlyphWrapActive: {
    transform: [{ translateY: -1 }],
  },
  tabActiveGlow: {
    position: 'absolute',
    width: 34,
    height: 26,
    borderRadius: 13,
    backgroundColor: 'rgba(10,107,53,0.12)',
  },
});
