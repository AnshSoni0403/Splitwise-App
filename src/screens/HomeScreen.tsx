import React, { useContext } from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { AuthContext } from "../context/AuthContext";

export default function HomeScreen() {
  const { user, logout } = useContext(AuthContext);

  return (
    <View style={{ padding: 20, marginTop: 40 }}>
      <Text style={{ fontSize: 24 }}>Welcome, {user?.name}</Text>

      <TouchableOpacity onPress={logout} style={{ marginTop: 30, padding: 15, backgroundColor: "black" }}>
        <Text style={{ color: "white", textAlign: "center" }}>Logout</Text>
      </TouchableOpacity>
    </View>
  );
}
