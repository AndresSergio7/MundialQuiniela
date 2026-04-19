import { TouchableOpacity, View, StyleSheet } from 'react-native';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '@/store/auth';
import { colors, shadows } from '@/components/ui/theme';
import { TEST_MODE } from '@/lib/testMode';

const TAB_BG   = colors.navy;
const TAB_ACT  = colors.accent;
const TAB_INACT = 'rgba(255,255,255,0.40)';
const HDR_BG   = colors.primaryDark;

export default function AppLayout() {
  const { signOut } = useAuthStore();

  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: HDR_BG },
        headerTintColor: '#fff',
        headerTitleStyle: { fontWeight: '800', fontSize: 17, letterSpacing: 0.3 },
        headerShadowVisible: false,
        tabBarActiveTintColor: TAB_ACT,
        tabBarInactiveTintColor: TAB_INACT,
        tabBarStyle: {
          backgroundColor: TAB_BG,
          borderTopWidth: 0,
          height: 62,
          paddingBottom: 8,
          paddingTop: 6,
          ...shadows.lg,
        },
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '700',
          letterSpacing: 0.3,
          marginTop: -2,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Inicio',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home" size={size} color={color} />
          ),
          headerRight: () => (
            <TouchableOpacity onPress={signOut} style={styles.logoutBtn}>
              <Ionicons name="log-out-outline" size={22} color={colors.accent} />
            </TouchableOpacity>
          ),
        }}
      />
      <Tabs.Screen
        name="predictions/index"
        options={{
          title: 'Quiniela',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="football" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="standings/index"
        options={{
          title: 'Tabla',
          tabBarIcon: ({ color, focused }) => (
            <View style={focused ? styles.trophyActive : undefined}>
              <Ionicons name="trophy" size={focused ? 26 : 22} color={color} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="invites/index"
        options={{
          title: 'Invitar',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person-add" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="purchase/index"
        options={{
          title: 'Comprar',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="card" size={size} color={color} />
          ),
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
    </Tabs>
  );
}

const styles = StyleSheet.create({
  logoutBtn: {
    marginRight: 16,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(201,168,76,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  trophyActive: {
    marginBottom: 2,
  },
});
