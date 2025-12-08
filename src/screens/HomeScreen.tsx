import React, { useContext, useEffect, useState } from "react";
import { View, Text, TouchableOpacity, FlatList, StyleSheet } from "react-native";
import { AuthContext } from "../context/AuthContext";
import { getAllGroups } from "../api/groups";
import { Ionicons } from "@expo/vector-icons";

export default function HomeScreen({ navigation }: any) {
  const { user, logout } = useContext(AuthContext);
  const [groups, setGroups] = useState<any[]>([]);

  const loadGroups = async () => {
    try {
      const res = await getAllGroups();
      setGroups(res.data.groups);
    } catch (err) {
      console.log("Error loading groups", err);
    }
  };

  useEffect(() => {
    loadGroups();
  }, []);

  return (
    <View style={{ flex: 1, padding: 20 }}>
      <Text style={styles.title}>Welcome, {user?.name}</Text>

      <Text style={styles.section}>Your Groups</Text>

      <FlatList
        data={groups}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.groupCard}
            onPress={() => navigation.navigate("GroupDetails", { groupId: item.id })}
          >
            <Text style={styles.groupName}>{item.name}</Text>
          </TouchableOpacity>
        )}
      />

      {/* Floating Add Button */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate("CreateGroup")}
      >
        <Ionicons name="add" size={32} color="white" />
      </TouchableOpacity>

      {/* Logout */}
      <TouchableOpacity onPress={logout} style={styles.logoutBtn}>
        <Text style={{ color: "white", textAlign: "center" }}>Logout</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 24, fontWeight: "700", marginBottom: 20 },
  section: { fontSize: 18, fontWeight: "600", marginBottom: 10 },
  groupCard: {
    padding: 15,
    backgroundColor: "#f3f3f3",
    borderRadius: 10,
    marginBottom: 10,
  },
  groupName: { fontSize: 18, fontWeight: "600" },
  fab: {
    position: "absolute",
    bottom: 80,
    right: 20,
    backgroundColor: "#000",
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: "center",
    alignItems: "center",
    elevation: 4,
  },
  logoutBtn: {
    backgroundColor: "#444",
    padding: 12,
    borderRadius: 10,
    marginTop: 20,
  },
});
