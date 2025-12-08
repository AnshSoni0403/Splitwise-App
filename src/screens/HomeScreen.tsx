import React, { useContext, useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { AuthContext } from "../context/AuthContext";
import { getUserGroups } from "../api/groups";
import { Ionicons } from "@expo/vector-icons";

const COLORS = {
  headerStart: '#ecfdf5',
  headerEnd: '#bbf7d0',
  card: '#ffffff',
  primary: '#16a34a',
  text: '#064e3b',
  muted: '#6b7280'
};

export default function HomeScreen({ navigation }: any) {
  const { user, logout } = useContext(AuthContext);
  const [groups, setGroups] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const loadGroups = async () => {
    try {
      const res = await getUserGroups(user.id);
      setGroups(res.data.groups || []);
    } catch (err) {
      console.log("Error loading groups", err);
    }
  };

  useEffect(() => {
    loadGroups();
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadGroups();
    setRefreshing(false);
  }, []);

  const renderItem = ({ item }: { item: any }) => (
    <TouchableOpacity
      style={styles.groupCard}
      onPress={() => navigation.navigate("GroupDetails", { groupId: item.id })}
    >
      <View style={styles.groupRow}>
        <View style={styles.avatarPlaceholder}>
          <Text style={styles.avatarText}>{(item.name || 'G').charAt(0)}</Text>
        </View>

        <View style={{ flex: 1 }}>
          <Text style={styles.groupName}>{item.name}</Text>
          <Text style={styles.groupSub}>{item.members?.length || 0} members</Text>
        </View>

        <Ionicons name="chevron-forward" size={20} color={COLORS.muted} />
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={{ flex: 1 }} edges={["top"]}>
      <LinearGradient colors={[COLORS.headerStart, COLORS.headerEnd]} style={styles.header}>
        <Text style={styles.greeting}>Hi, {user?.name}</Text>
        <Text style={styles.small}>Quick summary of your groups</Text>
      </LinearGradient>

      <View style={styles.container}>
        <Text style={styles.section}>Your Groups</Text>

        <FlatList
          data={groups}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
          ListEmptyComponent={() => (
            <View style={styles.emptyBox}>
              <Text style={styles.emptyText}>No groups yet — create one to get started.</Text>
            </View>
          )}
        />

        <TouchableOpacity
          style={styles.fab}
          onPress={() => navigation.navigate("CreateGroup")}
          accessibilityLabel="Create group"
        >
          <Ionicons name="add" size={28} color="white" />
        </TouchableOpacity>

        <TouchableOpacity onPress={logout} style={styles.logoutBtn}>
          <Text style={{ color: "white", textAlign: "center" }}>Logout</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: { padding: 20, paddingTop: 28 },
  greeting: { fontSize: 20, fontWeight: '700', color: COLORS.text },
  small: { color: '#14532d', marginTop: 6 },
  container: { flex: 1, padding: 20 },
  section: { fontSize: 18, fontWeight: '600', marginBottom: 12, color: COLORS.text },
  groupCard: {
    padding: 14,
    backgroundColor: COLORS.card,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 2,
  },
  groupRow: { flexDirection: 'row', alignItems: 'center' },
  avatarPlaceholder: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#d1fae5',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: { color: COLORS.primary, fontWeight: '700' },
  groupName: { fontSize: 16, fontWeight: '700', color: COLORS.text },
  groupSub: { color: COLORS.muted, marginTop: 4 },
  fab: {
    position: 'absolute',
    bottom: 80,
    right: 20,
    backgroundColor: COLORS.primary,
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 6,
  },
  logoutBtn: {
    backgroundColor: '#374151',
    padding: 12,
    borderRadius: 10,
    marginTop: 20,
  },
  emptyBox: { padding: 24, alignItems: 'center' },
  emptyText: { color: COLORS.muted }
});
