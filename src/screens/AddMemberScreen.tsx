import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  StyleSheet,
} from "react-native";
import axios from "axios";

export default function AddMemberScreen({ route, navigation }: any) {
  const { groupId } = route.params;

  const [identifier, setIdentifier] = useState("");
  const [loading, setLoading] = useState(false);

  const addMember = async () => {
    if (!identifier.trim()) {
      Alert.alert("Error", "Enter email or username");
      return;
    }

    setLoading(true);
    try {
      const res = await axios.post(
        `http://192.168.0.194:4000/api/groups/${groupId}/members`,
        { identifier }
      );

      Alert.alert("Success", "Member added");
      navigation.goBack();
    } catch (err: any) {
      console.log("Add member error:", err.response?.data || err.message);
      Alert.alert("Error", err.response?.data?.error || "Failed to add member");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Add Member</Text>

      <TextInput
        style={styles.input}
        placeholder="Enter email or username"
        value={identifier}
        onChangeText={setIdentifier}
      />

      <TouchableOpacity style={styles.button} onPress={addMember} disabled={loading}>
        <Text style={styles.buttonText}>
          {loading ? "Adding..." : "Add Member"}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, flex: 1 },
  title: { fontSize: 22, fontWeight: "700", marginBottom: 20 },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    padding: 12,
    borderRadius: 8,
    marginBottom: 20,
  },
  button: {
    backgroundColor: "black",
    padding: 15,
    borderRadius: 8,
    alignItems: "center",
  },
  buttonText: { color: "white", fontSize: 16, fontWeight: "700" },
});
