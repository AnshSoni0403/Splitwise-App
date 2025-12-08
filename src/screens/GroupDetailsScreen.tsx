import React, { useEffect, useState } from "react";
import { View, Text, FlatList, TouchableOpacity, StyleSheet } from "react-native";
import axios from "axios";

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
    <View style={{ padding: 20, flex: 1 }}>
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
    </View>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 24, fontWeight: "700", marginBottom: 20 },
  section: { fontSize: 18, fontWeight: "600", marginBottom: 10 },
  memberCard: {
    padding: 12,
    backgroundColor: "#f5f5f5",
    borderRadius: 8,
    marginBottom: 10,
  },
  memberName: { fontSize: 16, fontWeight: "700" },
  memberEmail: { color: "#666" },
  role: { marginTop: 5, fontSize: 12, fontWeight: "600" },
  addBtn: {
    backgroundColor: "black",
    padding: 15,
    borderRadius: 8,
    marginTop: 20,
    alignItems: "center",
  },
});
