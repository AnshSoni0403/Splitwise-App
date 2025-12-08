import React, { useState, useContext } from "react";
import { View, Text, TextInput, TouchableOpacity } from "react-native";
import { loginApi } from "../api/auth";
import { AuthContext } from "../context/AuthContext";

export default function LoginScreen({ navigation }: any) {
  const { login } = useContext(AuthContext);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const onLogin = async () => {
    try {
      setError("");
      const res = await loginApi({ email, password });
      login(res.data.user, res.data.token);
    } catch (e: any) {
      setError(e.response?.data?.error || "Invalid login");
    }
  };

  return (
    <View style={{ padding: 20 }}>
      <Text>Login</Text>

      <TextInput placeholder="Email" value={email} onChangeText={setEmail} style={{ borderWidth: 1, marginTop: 10 }} />
      <TextInput placeholder="Password" secureTextEntry value={password} onChangeText={setPassword} style={{ borderWidth: 1, marginTop: 10 }} />

      {error ? <Text style={{ color: "red" }}>{error}</Text> : null}

      <TouchableOpacity style={{ backgroundColor: "black", padding: 15, marginTop: 20 }} onPress={onLogin}>
        <Text style={{ color: "white", textAlign: "center" }}>Login</Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={() => navigation.navigate("Signup")} style={{ marginTop: 20 }}>
        <Text>Create an account</Text>
      </TouchableOpacity>
    </View>
  );
}
