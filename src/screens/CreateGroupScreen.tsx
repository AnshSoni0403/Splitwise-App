import React, { useState, useContext } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  Alert,
} from "react-native";

import { AuthContext } from "../context/AuthContext";
import axios from "axios";
import { createGroupApi } from "../api/groups";

const LOOKUP_URL = "http://192.168.0.194:4000/api/users/lookup"; // your IP

export default function CreateGroupScreen({ navigation }: any) {
  const { user } = useContext(AuthContext);

  const [groupName, setGroupName] = useState("");
  const [inputValue, setInputValue] = useState("");
  const [suggestion, setSuggestion] = useState<any | null>(null);

  const [members, setMembers] = useState<any[]>([]);
  const [loadingLookup, setLoadingLookup] = useState(false);
  const [creating, setCreating] = useState(false);

  // --------------------------
  // LOOKUP IDENTIFIER
  // --------------------------
  const lookupUser = async () => {
    const text = inputValue.trim();
    if (!text) return;

    setLoadingLookup(true);
    setSuggestion(null);

    try {
      const res = await axios.post(LOOKUP_URL, { identifiers: [text] });
      const users = res.data.users;

      if (users.length === 0) {
        Alert.alert("Not found", "No user found. You may still add them manually.");
        setSuggestion({
          id: null,
          identifier: text,
          name: text,
          placeholder: true,
        });
      } else {
        setSuggestion(users[0]);
      }
    } catch (e: any) {
      Alert.alert("Lookup failed", e.message || "Could not lookup user");
    } finally {
      setLoadingLookup(false);
    }
  };

  // --------------------------
  // ADD FROM SUGGESTION
  // --------------------------
  const addSuggestedUser = () => {
    if (!suggestion) return;

    const exists = members.some(
      (m) =>
        m.user_id === suggestion.id ||
        m.identifier === suggestion.identifier ||
        m.email === suggestion.email
    );

    if (exists) {
      Alert.alert("Already Added");
      return;
    }

    if (suggestion.id) {
      // real user
      setMembers((prev) => [
        ...prev,
        {
          user_id: suggestion.id,
          name: suggestion.name,
          email: suggestion.email,
          role: "member",
        },
      ]);
    } else {
      // placeholder
      setMembers((prev) => [
        ...prev,
        {
          identifier: suggestion.identifier,
          name: suggestion.name,
          role: "member",
        },
      ]);
    }

    setInputValue("");
    setSuggestion(null);
  };

  // --------------------------
  // REMOVE MEMBER
  // --------------------------
  const removeMember = (index: number) => {
    setMembers((prev) => prev.filter((_, i) => i !== index));
  };

  // --------------------------
  // CREATE GROUP
  // --------------------------
  const createGroup = async () => {
    if (!groupName.trim()) {
      Alert.alert("Error", "Group name is required");
      return;
    }

    if (members.length === 0) {
      Alert.alert("Error", "Add at least one member");
      return;
    }

    setCreating(true);

    try {
      // Final payload conversion
      const formattedMembers = members.map((m) => {
        if (m.user_id) return { user_id: m.user_id, role: m.role };
        return { identifier: m.identifier, role: m.role };
      });

      await createGroupApi({
        name: groupName,
        created_by: user.id,
        members: formattedMembers,
      });

      navigation.goBack();
    } catch (e: any) {
      console.log("Group create error", e.response?.data || e.message);
      Alert.alert("Error", e.response?.data?.error || "Could not create group");
    } finally {
      setCreating(false);
    }
  };

  // --------------------------
  // UI
  // --------------------------
  return (
    <View style={{ padding: 20, flex: 1 }}>
      <Text style={styles.title}>Create Group</Text>

      {/* Group Name Input */}
      <TextInput
        style={styles.input}
        placeholder="Group Name"
        value={groupName}
        onChangeText={setGroupName}
      />

      {/* Member Input */}
      <Text style={styles.label}>Add members by email or username</Text>

      <View style={styles.lookupRow}>
        <TextInput
          style={[styles.input, { flex: 1 }]}
          placeholder="Enter email or username"
          value={inputValue}
          onChangeText={setInputValue}
        />

        <TouchableOpacity style={styles.lookupBtn} onPress={lookupUser}>
          <Text style={{ color: "white" }}>{loadingLookup ? "..." : "Find"}</Text>
        </TouchableOpacity>
      </View>

      {/* Suggestion block */}
      {suggestion && (
        <View style={styles.suggestionBox}>
          <Text style={{ fontWeight: "700" }}>
            {suggestion.name || suggestion.username || suggestion.email}
          </Text>
          <Text style={{ color: "#666" }}>
            {suggestion.email || suggestion.identifier}
          </Text>

          <View style={{ flexDirection: "row", marginTop: 10 }}>
            <TouchableOpacity style={styles.addBtn} onPress={addSuggestedUser}>
              <Text style={{ color: "white" }}>Add</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.cancelBtn}
              onPress={() => setSuggestion(null)}
            >
              <Text>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Members List */}
      <Text style={styles.label}>Members Added</Text>
      <FlatList
        data={members}
        keyExtractor={(_, i) => String(i)}
        renderItem={({ item, index }) => (
          <View style={styles.memberRow}>
            <View>
              <Text style={{ fontWeight: "600" }}>{item.name}</Text>
              <Text style={{ color: "#666" }}>
                {item.email || item.identifier}
              </Text>
            </View>

            <TouchableOpacity
              style={styles.removeBtn}
              onPress={() => removeMember(index)}
            >
              <Text style={{ color: "white" }}>Remove</Text>
            </TouchableOpacity>
          </View>
        )}
      />

      {/* Submit */}
      <TouchableOpacity
        style={styles.createBtn}
        onPress={createGroup}
        disabled={creating}
      >
        <Text style={{ color: "white", fontSize: 16, fontWeight: "700" }}>
          {creating ? "Creating..." : "Create Group"}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

// --------------------------
// STYLES
// --------------------------
const styles = StyleSheet.create({
  title: { fontSize: 22, fontWeight: "700", marginBottom: 20 },
  label: { marginTop: 15, fontWeight: "600", fontSize: 14 },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    padding: 12,
    borderRadius: 8,
    marginTop: 10,
  },
  lookupRow: { flexDirection: "row", alignItems: "center", marginTop: 10 },
  lookupBtn: {
    backgroundColor: "#007bff",
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginLeft: 8,
  },
  suggestionBox: {
    backgroundColor: "#f3f3f3",
    padding: 12,
    borderRadius: 8,
    marginTop: 12,
  },
  addBtn: {
    backgroundColor: "#2e7d32",
    padding: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  cancelBtn: { padding: 10, marginLeft: 12 },
  memberRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#eee",
    borderRadius: 8,
    padding: 12,
    marginTop: 10,
  },
  removeBtn: {
    backgroundColor: "#c62828",
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 8,
  },
  createBtn: {
    backgroundColor: "black",
    padding: 15,
    borderRadius: 10,
    marginTop: 20,
    alignItems: "center",
  },
});
