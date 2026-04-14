import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  Share,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '@/store/auth';
import { usePoolStore } from '@/store/pool';
import { usePool } from '@/hooks/usePool';
import { generateInviteLink, getActiveInvites } from '@/services/invites';
import { removeMember } from '@/services/pools';
import { PoolSelectorBar } from '@/components/PoolSelectorBar';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { colors, spacing, typography, radius } from '@/components/ui/theme';
import type { PoolMember, Invite, Pool } from '@/types';

export default function InvitesScreen() {
  const { user } = useAuthStore();
  const { currentPool } = usePoolStore();
  const { fetchMembers } = usePool();

  const [members, setMembers] = useState<PoolMember[]>([]);
  const [invites, setInvites] = useState<Invite[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [shareSuccess, setShareSuccess] = useState(false);
  const [confirmRemoveId, setConfirmRemoveId] = useState<string | null>(null);
  const [removing, setRemoving] = useState<string | null>(null);
  const [removeError, setRemoveError] = useState<string | null>(null);

  const isAdmin = currentPool?.admin_id === user?.id;

  async function loadData(pool?: Pool) {
    const activePool = pool ?? currentPool;
    if (!activePool) return;
    setLoading(true);
    setError(null);
    const [m, i] = await Promise.all([
      fetchMembers(activePool.id),
      getActiveInvites(activePool.id),
    ]);
    setMembers(m);
    setInvites(i);
    setLoading(false);
  }

  useEffect(() => {
    loadData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPool?.id]);

  async function handleGenerateInvite() {
    if (!user || !currentPool) return;
    setGenerating(true);
    setError(null);
    setShareSuccess(false);

    const { link, error: linkError } = await generateInviteLink(user.id, currentPool.id);
    setGenerating(false);

    if (linkError || !link) {
      setError(linkError ?? 'Failed to generate invite link.');
      return;
    }

    const message = `Join my World Cup 2026 pool "${currentPool.name}"!\n\n${link}`;

    if (Platform.OS === 'web') {
      // Web: try native share API, fall back to clipboard
      if (typeof navigator !== 'undefined' && navigator.share) {
        try {
          await navigator.share({ title: `Join "${currentPool.name}"`, text: message, url: link });
          setShareSuccess(true);
        } catch {
          // User cancelled or not supported — try clipboard
          await copyToClipboard(link, message);
        }
      } else {
        await copyToClipboard(link, message);
      }
    } else {
      try {
        await Share.share({ message, url: link });
        setShareSuccess(true);
      } catch {
        setError('Could not open share sheet.');
      }
    }

    await loadData();
  }

  async function copyToClipboard(link: string, message: string) {
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard) {
        await navigator.clipboard.writeText(message);
        setShareSuccess(true);
      } else {
        setError(`Copy this link manually:\n${link}`);
      }
    } catch {
      setError(`Copy this link manually:\n${link}`);
    }
  }

  async function handleConfirmRemove(memberId: string) {
    if (!user || !currentPool) return;
    setRemoving(memberId);
    setRemoveError(null);
    const { error: removeErr } = await removeMember(user.id, currentPool.id, memberId);
    setRemoving(null);
    setConfirmRemoveId(null);
    if (removeErr) {
      setRemoveError(removeErr);
    } else {
      await loadData();
    }
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
      <PoolSelectorBar onPoolChange={(pool) => loadData(pool)} />

      {/* Invite card */}
      {isAdmin && (
        <Card style={styles.inviteCard}>
          <Text style={styles.inviteCardTitle}>Invite Members</Text>
          <Text style={styles.inviteCardSub}>
            Share a link valid for 7 days. Pool supports up to {currentPool.max_members} members.
          </Text>

          {error && (
            <View style={styles.errorBanner}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          {shareSuccess && (
            <View style={styles.successBanner}>
              <Text style={styles.successText}>
                {Platform.OS === 'web' ? 'Link copied to clipboard!' : 'Invite shared!'}
              </Text>
            </View>
          )}

          {removeError && (
            <View style={styles.errorBanner}>
              <Text style={styles.errorText}>{removeError}</Text>
            </View>
          )}

          <Button
            title={generating ? 'Generating...' : 'Generate & Share Invite'}
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
            <View style={styles.listHeader}>
              <Text style={styles.sectionTitle}>
                Members ({members.length}/{currentPool.max_members})
              </Text>
            </View>
          }
          renderItem={({ item: member }) => {
            const isPendingRemove = confirmRemoveId === member.user_id;
            const isRemoving = removing === member.user_id;

            return (
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
                  {member.user_id === user?.id ? (
                    <Ionicons name="person" size={20} color={colors.primary} />
                  ) : isAdmin ? (
                    <TouchableOpacity
                      onPress={() => setConfirmRemoveId(
                        isPendingRemove ? null : member.user_id
                      )}
                    >
                      <Ionicons
                        name={isPendingRemove ? 'chevron-up' : 'close-circle'}
                        size={24}
                        color={isPendingRemove ? colors.textMuted : colors.error}
                      />
                    </TouchableOpacity>
                  ) : null}
                </View>

                {/* Inline remove confirm */}
                {isPendingRemove && (
                  <View style={styles.confirmRow}>
                    <Text style={styles.confirmText}>
                      Remove {member.profile?.username ?? 'this member'}?
                    </Text>
                    <View style={styles.confirmBtns}>
                      <TouchableOpacity
                        style={styles.confirmCancel}
                        onPress={() => setConfirmRemoveId(null)}
                      >
                        <Text style={styles.confirmCancelText}>Cancel</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.confirmRemove}
                        onPress={() => handleConfirmRemove(member.user_id)}
                        disabled={isRemoving}
                      >
                        <Text style={styles.confirmRemoveText}>
                          {isRemoving ? 'Removing...' : 'Remove'}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}
              </Card>
            );
          }}
          ListFooterComponent={
            invites.length > 0 ? (
              <View style={{ marginTop: spacing.lg }}>
                <Text style={[styles.sectionTitle, { marginBottom: spacing.sm }]}>
                  Active Invite Links ({invites.length})
                </Text>
                {invites.map((inv) => (
                  <Card key={inv.id} style={styles.inviteItem}>
                    <Text style={styles.inviteToken} numberOfLines={1}>
                      Token: {inv.token.slice(0, 16)}…
                    </Text>
                    <Text style={styles.inviteExpiry}>
                      Expires: {new Date(inv.expires_at).toLocaleDateString()}
                    </Text>
                    <Text style={[styles.inviteUsed, inv.used_by ? styles.inviteUsedDone : styles.inviteUsedAvail]}>
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
  inviteCard: { margin: spacing.md, marginBottom: 0 },
  inviteCardTitle: { ...typography.h3, color: colors.text },
  inviteCardSub: { ...typography.body, color: colors.textMuted, marginTop: spacing.xs },
  errorBanner: {
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: colors.error,
    borderRadius: radius.sm,
    padding: spacing.sm,
    marginTop: spacing.sm,
  },
  errorText: { ...typography.caption, color: colors.error },
  successBanner: {
    backgroundColor: '#f0fdf4',
    borderWidth: 1,
    borderColor: colors.success,
    borderRadius: radius.sm,
    padding: spacing.sm,
    marginTop: spacing.sm,
  },
  successText: { ...typography.caption, color: colors.success, fontWeight: '600' },
  listHeader: { marginBottom: spacing.xs },
  list: { padding: spacing.md, paddingBottom: spacing.xxl },
  sectionTitle: { ...typography.label, color: colors.textMuted },
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
  confirmRow: {
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  confirmText: { ...typography.caption, color: colors.text, marginBottom: spacing.xs },
  confirmBtns: { flexDirection: 'row', gap: spacing.sm },
  confirmCancel: {
    flex: 1,
    paddingVertical: spacing.xs,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
  },
  confirmCancelText: { ...typography.caption, color: colors.textMuted },
  confirmRemove: {
    flex: 1,
    paddingVertical: spacing.xs,
    alignItems: 'center',
    backgroundColor: colors.error,
    borderRadius: radius.sm,
  },
  confirmRemoveText: { ...typography.caption, color: '#fff', fontWeight: '600' },
  inviteItem: { marginBottom: spacing.sm },
  inviteToken: { ...typography.caption, color: colors.text, fontFamily: 'monospace' },
  inviteExpiry: { ...typography.caption, color: colors.textMuted, marginTop: 2 },
  inviteUsed: { ...typography.caption, marginTop: 2 },
  inviteUsedAvail: { color: colors.success },
  inviteUsedDone: { color: colors.textMuted },
});
