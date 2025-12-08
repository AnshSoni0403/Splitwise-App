import React, { useEffect, useState } from "react";
import { View, Text, FlatList, TouchableOpacity, StyleSheet } from "react-native";
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import axios from "axios";

const COLORS = {
  headerStart: '#f0fdf4',
  headerEnd: '#dcfce7',
  card: '#ffffff',
  primary: '#059669',
  muted: '#6b7280',
  text: '#064e3b'
};

export default function GroupDetailsScreen({ route, navigation }: any) {
  const { groupId } = route.params;

  const [group, setGroup] = useState<any>(null);

  const loadGroup = async () => {
    try {
      const res = await axios.get(`http://192.168.0.194:4000/api/groups/${groupId}`);
      setGroup(res.data.group);
    } catch (err) {
      console.log("Error loading group:", err);
    }
  };

  useEffect(() => {
    loadGroup();
  }, []);

  if (!group) return <Text style={{ margin: 20 }}>Loading group...</Text>;

  return (
    <LinearGradient colors={[COLORS.headerStart, COLORS.headerEnd]} style={{ flex: 1 }}>
      <SafeAreaView style={{ flex: 1, padding: 20 }} edges={["top"]}>
        <Text style={styles.title}>{group.name}</Text>

        <Text style={styles.section}>Members</Text>

        <FlatList
          data={group.members}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <View style={styles.memberCard}>
              <Text style={styles.memberName}>{item.users?.name || "Unknown"}</Text>
              <Text style={styles.memberEmail}>{item.users?.email}</Text>
              <Text style={styles.role}>
                {item.role === "admin" ? "👑 Admin" : "Member"}
              </Text>
            </View>
          )}
        />

        {/* Add Member Button */}
        <TouchableOpacity
          style={styles.addBtn}
          onPress={() => navigation.navigate("AddMember", { groupId })}
        >
          <Text style={{ color: "white", fontWeight: "700" }}>Add Member</Text>
        </TouchableOpacity>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 24, fontWeight: "700", marginBottom: 12, color: COLORS.text },
  section: { fontSize: 18, fontWeight: "600", marginBottom: 10, color: COLORS.text },
  memberCard: {
    padding: 12,
    backgroundColor: COLORS.card,
    borderRadius: 8,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#eef6ef'
  },
  memberName: { fontSize: 16, fontWeight: "700", color: COLORS.text },
  memberEmail: { color: COLORS.muted },
  role: { marginTop: 5, fontSize: 12, fontWeight: "600", color: COLORS.muted },
  addBtn: {
    backgroundColor: COLORS.primary,
    padding: 15,
    borderRadius: 8,
    marginTop: 20,
    alignItems: "center",
  },
});
