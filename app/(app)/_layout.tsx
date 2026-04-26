import { TouchableOpacity, View, Text, StyleSheet, Animated } from 'react-native';
import { useRef, useEffect } from 'react';
import { Tabs, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/hooks/useAuth';
import { colors, shadows } from '@/components/ui/theme';
import { TEST_MODE } from '@/lib/testMode';

const TAB_BG = '#081522';
const TAB_ACT = '#F1C75B';
const TAB_INACT = 'rgba(223,235,255,0.56)';
const HDR_BG = colors.primaryDark;

const HEADER_META: Record<string, { title: string; subtitle: string; icon: keyof typeof Ionicons.glyphMap }> = {
  index: { title: 'Inicio', subtitle: 'Tu centro de quinielas', icon: 'home' },
  'predictions/index': { title: 'Quiniela', subtitle: 'Captura tus marcadores', icon: 'football' },
  'live/index': { title: 'En Vivo', subtitle: 'Seguimiento minuto a minuto', icon: 'radio' },
  'standings/index': { title: 'Tabla', subtitle: 'Clasificacion en tiempo real', icon: 'podium' },
  'invites/index': { title: 'Invitar', subtitle: 'Comparte tu liga', icon: 'person-add' },
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

function LiveTabButton({ children, onPress, accessibilityState }: any) {
  const focused = accessibilityState?.selected;
  const pulse1 = useRef(new Animated.Value(0)).current;
  const pulse2 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    let active = true;

    const runPulse = (anim: Animated.Value, delay: number) => {
      const cycle = () => {
        if (!active) return;
        anim.setValue(0);
        Animated.timing(anim, { toValue: 1, duration: 1600, useNativeDriver: true }).start(({ finished }) => {
          if (finished && active) cycle();
        });
      };
      setTimeout(cycle, delay);
    };

    runPulse(pulse1, 0);
    runPulse(pulse2, 800);

    return () => { active = false; };
  }, []);

  const makeRingStyle = (anim: Animated.Value) => ({
    transform: [{ scale: anim.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1.8] }) }],
    opacity: anim.interpolate({ inputRange: [0, 0.25, 1], outputRange: [0, 0.55, 0] }),
  });

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.88}
      style={[styles.liveButton, focused && styles.liveButtonActive]}
    >
      <View style={styles.livePulseContainer}>
        <Animated.View style={[styles.pulseRing, makeRingStyle(pulse1)]} />
        <Animated.View style={[styles.pulseRing, makeRingStyle(pulse2)]} />
        {children}
      </View>
      <Text style={styles.liveLabel}>EN VIVO</Text>
    </TouchableOpacity>
  );
}

export default function AppLayout() {
  const { signOut } = useAuth();
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
            <TouchableOpacity onPress={() => router.push('/(app)/profile')} style={styles.profileBtn}>
              <Ionicons name="person-circle-outline" size={20} color={colors.accent} />
            </TouchableOpacity>
            <TouchableOpacity onPress={signOut} style={styles.logoutBtn}>
              <Ionicons name="log-out-outline" size={20} color={colors.accent} />
            </TouchableOpacity>
          </View>
        ),
        tabBarActiveTintColor: TAB_ACT,
        tabBarInactiveTintColor: TAB_INACT,
        tabBarStyle: {
          backgroundColor: TAB_BG,
          borderTopWidth: 0,
          height: 78,
          paddingBottom: 12,
          paddingTop: 10,
          ...shadows.lg,
        },
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '700',
          letterSpacing: 0.45,
          marginTop: 2,
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
          title: '',
          tabBarButton: (props) => <LiveTabButton {...props} />,
          tabBarIcon: ({ focused }) => (
            <View style={styles.liveIconWrap}>
              <Ionicons name={focused ? 'radio' : 'radio-outline'} size={24} color="#fff" />
            </View>
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
          title: 'Invitar',
          tabBarIcon: ({ color, focused }) => (
            <TabGlyph icon="person-add" color={color} focused={focused} />
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
  profileBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(201,168,76,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoutBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(201,168,76,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
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
    backgroundColor: 'rgba(241,199,91,0.18)',
  },
  liveButton: {
    top: -26,
    alignItems: 'center',
    justifyContent: 'center',
    width: 86,
  },
  liveButtonActive: {
    transform: [{ scale: 1.04 }],
  },
  livePulseContainer: {
    width: 56,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pulseRing: {
    position: 'absolute',
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#E53935',
  },
  liveIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#E53935',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#fff',
    ...shadows.gold,
  },
  liveLabel: {
    marginTop: 3,
    color: '#E9EEF8',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.9,
  },
});
