import React, { useEffect, useMemo } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";

import { useAuth } from "../../../components/AuthProvider";
import ScanHistoryCard from "../../../components/ScanHistoryCard";
import { useInfiniteMyScans, useMyScanStats } from "../../../hooks/useScans";

export default function ScanHistoryScreen() {
  const router = useRouter();
  const { token, user, loading: authLoading } = useAuth();
  const enabled = Boolean(token && user);
  const scansQuery = useInfiniteMyScans(enabled, 20);
  const statsQuery = useMyScanStats(enabled);

  const scans = useMemo(
    () => scansQuery.data?.pages.flatMap((page) => page.items) ?? [],
    [scansQuery.data],
  );

  useEffect(() => {
    if (!authLoading && !token) {
      router.replace("/(tabs)/(auth)/login");
    }
  }, [authLoading, router, token]);

  useEffect(() => {
    const scansStatus = (scansQuery.error as { status?: number } | null)?.status;
    const statsStatus = (statsQuery.error as { status?: number } | null)?.status;

    if (token && (scansStatus === 401 || statsStatus === 401)) {
      router.replace("/(tabs)/(auth)/login");
    }
  }, [router, scansQuery.error, statsQuery.error, token]);

  if (authLoading || !enabled) {
    return (
      <View style={styles.center}>
        {authLoading ? <ActivityIndicator color="#3F3B37" /> : null}
      </View>
    );
  }

  return (
    <View style={styles.page}>
      <View style={styles.topBar}>
        <Pressable
          onPress={() => router.back()}
          style={styles.iconButton}
          accessibilityRole="button"
          accessibilityLabel="Retour"
        >
          <Ionicons name="chevron-back" size={25} color="#3F3B37" />
        </Pressable>
        <Text style={styles.topTitle}>Historique des scans</Text>
        <View style={styles.topBarSpacer} />
      </View>

      <FlatList
        data={scans}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        onEndReachedThreshold={0.4}
        onEndReached={() => {
          if (scansQuery.hasNextPage && !scansQuery.isFetchingNextPage) {
            void scansQuery.fetchNextPage();
          }
        }}
        refreshing={scansQuery.isRefetching && !scansQuery.isFetchingNextPage}
        onRefresh={() => {
          void Promise.all([scansQuery.refetch(), statsQuery.refetch()]);
        }}
        ListHeaderComponent={
          <View style={styles.statsCard}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>
                {statsQuery.data?.totalScans ??
                  scansQuery.data?.pages[0]?.totalScans ??
                  0}
              </Text>
              <Text style={styles.statLabel}>scans</Text>
            </View>
            <View style={styles.statDivider} />
            {/* <View style={styles.statItem}>
              <Text style={styles.statValue}>
                {statsQuery.data?.uniqueProducts ?? 0}
              </Text>
              <Text style={styles.statLabel}>produits différents</Text>
            </View> */}
          </View>
        }
        ListEmptyComponent={
          scansQuery.isLoading ? (
            <View style={styles.emptyState}>
              <ActivityIndicator color="#3F3B37" />
              <Text style={styles.emptyText}>Chargement de vos scans...</Text>
            </View>
          ) : scansQuery.isError ? (
            <View style={styles.emptyState}>
              <Ionicons name="cloud-offline-outline" size={34} color="#A55B69" />
              <Text style={styles.errorText}>
                Votre historique n’a pas pu être chargé. Tirez vers le bas pour
                réessayer.
              </Text>
            </View>
          ) : (
            <View style={styles.emptyState}>
              <Ionicons name="scan-outline" size={38} color="#687C79" />
              <Text style={styles.emptyTitle}>Aucun scan pour le moment</Text>
              <Text style={styles.emptyText}>
                Les produits scannés avec la caméra apparaîtront ici.
              </Text>
            </View>
          )
        }
        ListFooterComponent={
          scansQuery.isFetchingNextPage ? (
            <ActivityIndicator style={styles.footerLoader} color="#3F3B37" />
          ) : null
        }
        renderItem={({ item }) => (
          <ScanHistoryCard
            scan={item}
            onPress={() =>
              router.push({
                pathname: "/product/[ean]",
                params: { ean: item.product.ean },
              })
            }
          />
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    paddingTop: 32,
    backgroundColor: "#FBF8F4",
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FBF8F4",
  },
  topBar: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  topTitle: {
    color: "#3F3B37",
    fontSize: 21,
    fontWeight: "900",
  },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.04)",
  },
  topBarSpacer: {
    width: 44,
  },
  listContent: {
    padding: 16,
    paddingBottom: 40,
    gap: 14,
  },
  statsCard: {
    minHeight: 112,
    marginBottom: 4,
    padding: 18,
    borderRadius: 22,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#DFF1EA",
  },
  statItem: {
    flex: 1,
    alignItems: "center",
    gap: 4,
  },
  statValue: {
    color: "#203A42",
    fontSize: 28,
    fontWeight: "900",
    fontVariant: ["tabular-nums"],
  },
  statLabel: {
    color: "#69716F",
    fontSize: 12,
    textAlign: "center",
  },
  statDivider: {
    width: 1,
    height: 54,
    backgroundColor: "rgba(63,59,55,0.14)",
  },
  emptyState: {
    minHeight: 280,
    paddingHorizontal: 24,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  emptyTitle: {
    color: "#3F3B37",
    fontSize: 19,
    fontWeight: "900",
    textAlign: "center",
  },
  emptyText: {
    color: "#69716F",
    fontSize: 14,
    lineHeight: 20,
    textAlign: "center",
  },
  errorText: {
    color: "#A55B69",
    fontSize: 14,
    lineHeight: 20,
    textAlign: "center",
  },
  footerLoader: {
    paddingVertical: 18,
  },
});
