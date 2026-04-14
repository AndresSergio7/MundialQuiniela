import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, FlatList, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MatchRow } from '@/components/MatchRow';
import { Button } from '@/components/ui/Button';
import { colors, spacing, typography } from '@/components/ui/theme';
import { useAuth } from '@/hooks/useAuth';
import { listMatches } from '@/services/matches';
import { getPredictions, savePrediction, submitPredictions } from '@/services/predictions';
import type { Match, Prediction } from '@/types';

const GROUPS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L'];

export default function PredictionsScreen() {
  const { user } = useAuth();
  const [matches, setMatches] = useState<Match[]>([]);
  const [predictions, setPredictions] = useState<Record<string, { home: string; away: string }>>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [isLocked, setIsLocked] = useState(false);

  useEffect(() => {
    loadData();
  }, [user?.id]);

  async function loadData() {
    if (!user?.id) return;

    try {
      setLoading(true);

      const [matchesData, userPredictions] = await Promise.all([
        listMatches(),
        getPredictions(user.id),
      ]);

      setMatches(matchesData);

      const mapped: Record<string, { home: string; away: string }> = {};
      userPredictions.forEach((p: Prediction) => {
        mapped[p.match_id] = {
          home: String(p.home_score),
          away: String(p.away_score),
        };
      });
      setPredictions(mapped);
    } catch (error) {
      console.error(error);
      Alert.alert('Error', 'Could not load predictions.');
    } finally {
      setLoading(false);
    }
  }

  function handleScoreChange(matchId: string, side: 'home' | 'away', value: string) {
    const cleanValue = value.replace(/[^0-9]/g, '');

    setPredictions((prev) => ({
      ...prev,
      [matchId]: {
        home: side === 'home' ? cleanValue : prev[matchId]?.home ?? '',
        away: side === 'away' ? cleanValue : prev[matchId]?.away ?? '',
      },
    }));
  }

  async function handleSubmit() {
    if (!user?.id) return;

    try {
      setSubmitting(true);

      for (const match of matches) {
        const pred = predictions[match.id];
        if (!pred || pred.home === '' || pred.away === '') continue;

        await savePrediction({
          user_id: user.id,
          match_id: match.id,
          home_score: Number(pred.home),
          away_score: Number(pred.away),
        });
      }

      await submitPredictions(user.id);
      setIsLocked(true);
      Alert.alert('Success', 'Your predictions were submitted.');
    } catch (error) {
      console.error(error);
      Alert.alert('Error', 'Could not submit predictions.');
    } finally {
      setSubmitting(false);
    }
  }

  const groupedMatches = useMemo(
    () =>
      GROUPS.map((group) => ({
        group,
        matches: matches.filter((m) => m.group_name === group),
      })).filter((item) => item.matches.length > 0),
    [matches]
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.container}>
          <Text style={styles.loadingText}>Loading predictions...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <Text style={styles.title}>My Predictions</Text>
        <Text style={styles.subtitle}>Predict the exact score for each match</Text>

        <FlatList
          data={groupedMatches}
          keyExtractor={(item) => item.group}
          contentContainerStyle={styles.matchList}
          renderItem={({ item }) => (
            <View style={styles.groupSection}>
              <View style={styles.groupHeader}>
                <View style={styles.groupDot} />
                <Text style={styles.groupHeaderText}>GRUPO {item.group}</Text>
              </View>

              {item.matches.map((match) => {
                const pred = predictions[match.id];

                return (
                  <MatchRow
                    key={match.id}
                    match={match}
                    homeScore={pred?.home ?? ''}
                    awayScore={pred?.away ?? ''}
                    locked={isLocked || match.status !== 'scheduled'}
                    onHomeChange={(val) => handleScoreChange(match.id, 'home', val)}
                    onAwayChange={(val) => handleScoreChange(match.id, 'away', val)}
                  />
                );
              })}
            </View>
          )}
          ListFooterComponent={
            !isLocked ? (
              <Button
                title="Submit Quiniela"
                onPress={handleSubmit}
                loading={submitting}
                style={styles.submitButton}
              />
            ) : null
          }
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    flex: 1,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
  },
  title: {
    ...typography.h2,
    color: colors.text,
    marginBottom: 4,
  },
  subtitle: {
    ...typography.body,
    color: colors.textMuted,
    marginBottom: spacing.md,
  },
  loadingText: {
    ...typography.body,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: 40,
  },
  matchList: {
    paddingBottom: 24,
  },
  groupSection: {
    marginBottom: spacing.md,
  },
  groupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
    marginTop: spacing.xs,
  },
  groupDot: {
    width: 10,
    height: 10,
    borderRadius: 999,
    backgroundColor: colors.primary,
    marginRight: 8,
  },
  groupHeaderText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textMuted,
    letterSpacing: 0.6,
  },
  submitButton: {
    marginTop: spacing.md,
  },
});
