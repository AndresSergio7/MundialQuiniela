import React from 'react';
import { ScrollView, View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { colors, spacing, radius, shadows } from '@/components/ui/theme';

const SCORE_RULES = [
  {
    title: '6 puntos',
    subtitle: 'Marcador exacto',
    body: 'Adivinas el resultado, los goles de ambos equipos y el marcador final exacto.',
    tone: 'gold',
  },
  {
    title: '4 puntos',
    subtitle: 'Resultado correcto + 1 gol exacto',
    body: 'Adivinas el resultado del partido y aciertas los goles de uno de los equipos.',
    tone: 'accent',
  },
  {
    title: '4 puntos',
    subtitle: 'Empate correcto',
    body: 'Predijiste empate y el partido terminó empatado, aunque el marcador no coincida exactamente.',
    tone: 'soft',
  },
  {
    title: '3 puntos',
    subtitle: 'Solo resultado correcto',
    body: 'Adivinas quién gana pero no aciertas ningún marcador exacto.',
    tone: 'soft',
  },
  {
    title: '1 punto',
    subtitle: '1 gol exacto',
    body: 'No aciertas el resultado, pero sí los goles de uno de los equipos.',
    tone: 'soft',
  },
  {
    title: '0 puntos',
    subtitle: 'Sin aciertos',
    body: 'No aciertas ni el resultado ni los goles.',
    tone: 'soft',
  },
];

const EXAMPLES = [
  'Predicción: 2-1 | Resultado real: 2-1 -> 6 pts',
  'Predicción: 2-1 | Resultado real: 3-1 -> 4 pts',
  'Predicción: 1-1 | Resultado real: 2-2 -> 4 pts',
  'Predicción: 2-1 | Resultado real: 1-0 -> 3 pts',
];

export default function RulesScreen() {
  const router = useRouter();

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.container}>
      <View style={styles.hero}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={18} color={colors.accent} />
          <Text style={styles.backText}>Volver</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Reglas de la quiniela</Text>
        <Text style={styles.subtitle}>
          Aquí está el sistema de puntuación y las reglas de envío para la fase de grupos.
        </Text>
      </View>

      <View style={styles.card}>
        <View style={styles.sectionHeader}>
          <Ionicons name="football-outline" size={18} color={colors.primary} />
          <Text style={styles.sectionTitle}>Predicciones</Text>
        </View>
        <Text style={styles.paragraph}>
          Cada participante debe predecir el marcador exacto de los 72 partidos de la fase de grupos.
        </Text>
        <Text style={styles.paragraph}>
          Todas las predicciones deben enviarse antes de que inicie el torneo.
        </Text>
        <Text style={styles.paragraph}>
          Una vez cerrado el periodo de predicciones, no se podrán hacer cambios.
        </Text>
        <Text style={styles.paragraph}>
          Tus predicciones se guardan automáticamente. Puedes salir y continuar más tarde antes de la fecha límite.
        </Text>
        <Text style={styles.paragraph}>
          Para participar, debes completar el 100% de tu quiniela antes de la fecha límite. Si tu quiniela queda incompleta, no podrás participar.
        </Text>
      </View>

      <View style={styles.card}>
        <View style={styles.sectionHeader}>
          <Ionicons name="trophy-outline" size={18} color={colors.primary} />
          <Text style={styles.sectionTitle}>Sistema de puntuación</Text>
        </View>
        {SCORE_RULES.map((rule) => (
          <View
            key={rule.subtitle}
            style={[
              styles.ruleItem,
              rule.tone === 'gold' && styles.ruleGold,
              rule.tone === 'accent' && styles.ruleAccent,
              rule.tone === 'soft' && styles.ruleSoft,
            ]}
          >
            <Text style={styles.ruleScore}>{rule.title}</Text>
            <Text style={styles.ruleSubtitle}>{rule.subtitle}</Text>
            <Text style={styles.ruleBody}>{rule.body}</Text>
          </View>
        ))}
      </View>

      <View style={styles.card}>
        <View style={styles.sectionHeader}>
          <Ionicons name="git-branch-outline" size={18} color={colors.primary} />
          <Text style={styles.sectionTitle}>Desempate</Text>
        </View>
        <Text style={styles.paragraph}>
          En caso de empate en puntos totales, gana quien tenga más marcadores exactos de 6 puntos.
        </Text>
        <Text style={styles.paragraph}>
          Si el empate continúa, se comparte la posición.
        </Text>
      </View>

      <View style={styles.card}>
        <View style={styles.sectionHeader}>
          <Ionicons name="bulb-outline" size={18} color={colors.primary} />
          <Text style={styles.sectionTitle}>Ejemplos rápidos</Text>
        </View>
        {EXAMPLES.map((example) => (
          <View key={example} style={styles.exampleRow}>
            <Text style={styles.exampleText}>{example}</Text>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  container: { padding: spacing.md, paddingBottom: spacing.xxl * 2, gap: spacing.md },
  hero: {
    backgroundColor: colors.primaryDark,
    borderRadius: radius.xl,
    padding: spacing.lg,
    ...shadows.md,
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 4,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: radius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    marginBottom: spacing.md,
  },
  backText: { color: colors.accent, fontWeight: '800', fontSize: 12 },
  title: { color: '#fff', fontSize: 26, fontWeight: '900', marginBottom: spacing.xs },
  subtitle: { color: 'rgba(238,244,239,0.78)', fontSize: 14, lineHeight: 20 },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: '#E2E8E5',
    ...shadows.sm,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },
  sectionTitle: { fontSize: 16, fontWeight: '800', color: colors.text },
  paragraph: { fontSize: 14, color: colors.textMuted, lineHeight: 21, marginBottom: spacing.xs },
  ruleItem: {
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: '#E3E9E5',
    padding: spacing.sm,
    marginBottom: spacing.sm,
  },
  ruleGold: { backgroundColor: '#FFF8E8', borderColor: 'rgba(201,168,76,0.45)' },
  ruleAccent: { backgroundColor: '#F2FBF3', borderColor: 'rgba(25,128,75,0.18)' },
  ruleSoft: { backgroundColor: '#F7FAF8' },
  ruleScore: { fontSize: 18, fontWeight: '900', color: colors.primaryDark, marginBottom: 2 },
  ruleSubtitle: { fontSize: 14, fontWeight: '800', color: colors.text, marginBottom: 4 },
  ruleBody: { fontSize: 13, lineHeight: 19, color: colors.textMuted },
  exampleRow: {
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: '#EDF2EF',
  },
  exampleText: { fontSize: 13, color: colors.text, fontWeight: '700' },
});