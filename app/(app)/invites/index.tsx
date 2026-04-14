import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  Alert,
  Share,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '@/store/auth';
import { usePoolStore } from '@/store/pool';
import { usePool } from '@/hooks/usePool';
import { generateInviteLink, getActiveInvites } from '@/services/invites';
import { removeMember } from '@/services/pools';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { colors, spacing, typography, radius } from '@/components/ui/theme';
import type { PoolMember, Invite } from '@/types';

export default function InvitesScreen() {
  const { user } = useAuthStore();
  const { currentPool } = usePoolStore();
  const { fetchMembers } = usePool();

  const [members, setMembers] = useState<PoolMember[]>([]);
  const [invites, setInvites] = useState<Invite[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  const isAdmin = currentPool?.admin_id === user?.id;

  async function loadData() {
    if (!currentPool) return;
    setLoading(true);
    const [m, i] = await Promise.all([
      fetchMembers(currentPool.id),
      getActiveInvites(currentPool.id),
    ]);
    setMembers(m);
    setInvites(i);
    setLoading(false);
  }

  useEffect(() => {
    loadData();
  }, [currentPool]);

  async function handleGenerateInvite() {
    if (!user || !currentPool) return;
    setGenerating(true);
    const { link, error } = await generateInviteLink(user.id, currentPool.id);
    setGenerating(false);

    if (error) {
      Alert.alert('Error', error);
      return;
    }

    if (link) {
      await Share.share({
        message: `Join my World Cup 2026 pool "${currentPool.name}"!\n\n${link}`,
        url: link,
      });
      await loadData();
    }
  }

  async function handleRemoveMember(memberId: string, username: string) {
    if (!user || !currentPool) return;

    Alert.alert(
      'Remove Member',
      `Remove ${username} from the pool?`,
      [
        { text: 'Cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            const { error } = await removeMember(user.id, currentPool.id, memberId);
            if (error) Alert.alert('Error', error);
            else await loadData();
          },
        },
      ]
    );
  }

  if (!currentPool) {
    return (
      <View style={styles.centered}>
        <Text style={styles.noPool}>Select a pool from Home to manage invites.</Text>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      {/* Pool header */}
      <View style={styles.poolBar}>
        <Text style={styles.poolName} numberOfLines={1}>{currentPool.name}</Text>
        <Text style={styles.memberCount}>
          {members.length}/{currentPool.max_members}
        </Text>
      </View>

      {/* Generate Invite */}
      {isAdmin && (
        <Card style={styles.inviteCard}>
          <Text style={styles.inviteCardTitle}>Invite Members</Text>
          <Text style={styles.inviteCardSub}>
            Share a link valid for 7 days. Includes 10 members base.
          </Text>
          <Button
            title="Generate Invite Link"
            onPress={handleGenerateInvite}
            loading={generating}
            style={{ marginTop: spacing.md }}
          />
        </Card>
      )}

      {loading ? (
        <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: spacing.xl }} />
      ) : (
        <FlatList
          data={members}
          keyExtractor={(m) => m.id}
          contentContainerStyle={styles.list}
          ListHeaderComponent={
            <Text style={styles.sectionTitle}>Members ({members.length})</Text>
          }
          renderItem={({ item: member }) => (
            <Card style={styles.memberCard}>
              <View style={styles.memberRow}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>
                    {(member.profile?.username?.[0] ?? '?').toUpperCase()}
                  </Text>
                </View>
                <View style={styles.memberInfo}>
                  <Text style={styles.memberName}>
                    {member.profile?.username ?? 'Unknown'}
                  </Text>
                  <View style={styles.roleBadge}>
                    <Text style={styles.roleText}>{member.role}</Text>
                  </View>
                </View>
                {isAdmin && member.user_id !== user?.id && (
                  <TouchableOpacity
                    onPress={() =>
                      handleRemoveMember(
                        member.user_id,
                        member.profile?.username ?? 'this user'
                      )
                    }
                  >
                    <Ionicons name="close-circle" size={24} color={colors.error} />
                  </TouchableOpacity>
                )}
                {member.user_id === user?.id && (
                  <Ionicons name="person" size={20} color={colors.primary} />
                )}
              </View>
            </Card>
          )}
          ListFooterComponent={
            invites.length > 0 ? (
              <View style={{ marginTop: spacing.lg }}>
                <Text style={styles.sectionTitle}>Active Invite Links ({invites.length})</Text>
                {invites.map((inv) => (
                  <Card key={inv.id} style={styles.inviteItem}>
                    <Text style={styles.inviteToken} numberOfLines={1}>
                      Token: {inv.token.slice(0, 16)}...
                    </Text>
                    <Text style={styles.inviteExpiry}>
                      Expires: {new Date(inv.expires_at).toLocaleDateString()}
                    </Text>
                    <Text style={styles.inviteUsed}>
                      {inv.used_by ? 'Used' : 'Available'}
                    </Text>
                  </Card>
                ))}
              </View>
            ) : null
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  noPool: { ...typography.body, color: colors.textMuted },
  poolBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  poolName: { ...typography.label, color: '#fff', fontWeight: '700', flex: 1 },
  memberCount: { ...typography.label, color: colors.accent },
  inviteCard: { margin: spacing.md, marginBottom: 0 },
  inviteCardTitle: { ...typography.h3, color: colors.text },
  inviteCardSub: { ...typography.body, color: colors.textMuted, marginTop: spacing.xs },
  list: { padding: spacing.md, paddingBottom: spacing.xxl },
  sectionTitle: { ...typography.label, color: colors.textMuted, marginBottom: spacing.sm },
  memberCard: { marginBottom: spacing.sm, padding: spacing.sm + 4 },
  memberRow: { flexDirection: 'row', alignItems: 'center' },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: radius.full,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  avatarText: { ...typography.body, color: '#fff', fontWeight: '700' },
  memberInfo: { flex: 1 },
  memberName: { ...typography.body, color: colors.text, fontWeight: '600' },
  roleBadge: {
    alignSelf: 'flex-start',
    backgroundColor: colors.border,
    paddingHorizontal: spacing.xs,
    borderRadius: radius.sm,
    marginTop: 2,
  },
  roleText: { ...typography.caption, color: colors.textMuted },
  inviteItem: { marginBottom: spacing.sm },
  inviteToken: { ...typography.caption, color: colors.text, fontFamily: 'monospace' },
  inviteExpiry: { ...typography.caption, color: colors.textMuted, marginTop: 2 },
  inviteUsed: { ...typography.caption, color: colors.success, marginTop: 2 },
});
