import React, { useState, useContext } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from "react-native";
import { createGroupApi } from "../api/groups";
import { AuthContext } from "../context/AuthContext";

export default function CreateGroupScreen({ navigation }: any) {
  const { user } = useContext(AuthContext);

  const [name, setName] = useState("");
  const [error, setError] = useState("");

  const onCreate = async () => {
    try {
      setError("");

      const payload = {
        name,
        created_by: user.id,
        members: [{ user_id: user.id, role: "admin" }]
      };

      await createGroupApi(payload);

      navigation.goBack(); // return to Home
    } catch (e: any) {
      setError(e.response?.data?.error || "Something went wrong");
    }
  };

  return (
    <View style={{ padding: 20 }}>
      <Text style={styles.title}>Create Group</Text>

      <TextInput
        placeholder="Group Name"
        value={name}
        onChangeText={setName}
        style={styles.input}
      />

      {error ? <Text style={{ color: "red" }}>{error}</Text> : null}

      <TouchableOpacity style={styles.btn} onPress={onCreate}>
        <Text style={styles.btnText}>Create</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 22, fontWeight: "700", marginBottom: 20 },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    padding: 12,
    borderRadius: 8,
    marginBottom: 20,
  },
  btn: {
    backgroundColor: "black",
    padding: 15,
    borderRadius: 8,
  },
  btnText: {
    color: "white",
    textAlign: "center",
    fontWeight: "700",
    fontSize: 16,
  },
});
