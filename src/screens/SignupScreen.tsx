import React, { useState, useContext } from "react";
import { View, Text, TextInput, TouchableOpacity } from "react-native";
import { signupApi } from "../api/auth";
import { AuthContext } from "../context/AuthContext";

export default function SignupScreen({ navigation }: any) {
  const { login } = useContext(AuthContext);

  const [username, setUsername] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [error, setError] = useState("");

  const onSignup = async () => {
    try {
      setError("");
      const res = await signupApi({ username, name, email, password });
      navigation.navigate("Login");
    } catch (e: any) {
      setError(e.response?.data?.error || "Something went wrong");
    }
  };

  return (
    <View style={{ padding: 20 }}>
      <Text>Signup</Text>

      <TextInput placeholder="Username" value={username} onChangeText={setUsername} style={{ borderWidth: 1, marginTop: 10 }} />
      <TextInput placeholder="Name" value={name} onChangeText={setName} style={{ borderWidth: 1, marginTop: 10 }} />
      <TextInput placeholder="Email" value={email} onChangeText={setEmail} style={{ borderWidth: 1, marginTop: 10 }} />
      <TextInput placeholder="Password" secureTextEntry value={password} onChangeText={setPassword} style={{ borderWidth: 1, marginTop: 10 }} />

      {error ? <Text style={{ color: "red" }}>{error}</Text> : null}

      <TouchableOpacity style={{ backgroundColor: "black", padding: 15, marginTop: 20 }} onPress={onSignup}>
        <Text style={{ color: "white", textAlign: "center" }}>Create Account</Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={() => navigation.navigate("Login")} style={{ marginTop: 20 }}>
        <Text>Already have an account? Login</Text>
      </TouchableOpacity>
    </View>
  );
}
