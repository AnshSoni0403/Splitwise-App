import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { signupApi } from "../api/auth";

export default function SignupScreen({ navigation }: any) {
  const [username, setUsername] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const onSignup = async () => {
    try {
      setIsLoading(true);
      setError("");
      const res = await signupApi({ username, name, email, password });
      if (res.status === 201) {
        navigation.navigate("Login");
      } else {
        setError('Signup failed');
      }
    } catch (e: any) {
      setError(e.response?.data?.error || "Something went wrong");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <LinearGradient colors={["#f0fdfa", "#ecfeff"]} style={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.keyboard}>
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.card}>
            <Text style={styles.title}>Create account</Text>
            <Text style={styles.subtitle}>Join SplitEasy — split bills with friends</Text>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Username</Text>
              <TextInput placeholder="username" value={username} onChangeText={setUsername} style={styles.input} placeholderTextColor="#9ca3af" />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Full name</Text>
              <TextInput placeholder="Your name" value={name} onChangeText={setName} style={styles.input} placeholderTextColor="#9ca3af" />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Email</Text>
              <TextInput placeholder="you@example.com" value={email} onChangeText={setEmail} style={styles.input} keyboardType="email-address" autoCapitalize="none" placeholderTextColor="#9ca3af" />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Password</Text>
              <TextInput placeholder="Choose a password" secureTextEntry value={password} onChangeText={setPassword} style={styles.input} placeholderTextColor="#9ca3af" />
            </View>

            {error ? <Text style={styles.error}>{error}</Text> : null}

            <TouchableOpacity style={[styles.button, isLoading && styles.buttonDisabled]} onPress={onSignup} disabled={isLoading} activeOpacity={0.9}>
              {isLoading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Create Account</Text>}
            </TouchableOpacity>

            <View style={styles.row}>
              <Text style={styles.small}>Already have an account?</Text>
              <TouchableOpacity onPress={() => navigation.navigate('Login')}>
                <Text style={styles.link}> Login</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  keyboard: { flex: 1 },
  content: { flexGrow: 1, justifyContent: 'center', padding: 20 },
  card: { backgroundColor: '#ffffff', borderRadius: 16, padding: 24, shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 20, elevation: 6 },
  title: { fontSize: 24, fontWeight: '700', color: '#065f46', marginBottom: 6 },
  subtitle: { color: '#065f46', marginBottom: 12 },
  inputGroup: { marginBottom: 12 },
  label: { fontSize: 13, color: '#374151', marginBottom: 6 },
  input: { borderWidth: 1, borderColor: '#e6eeed', borderRadius: 10, paddingHorizontal: 12, height: 48, backgroundColor: '#fff' },
  error: { color: '#dc2626', marginBottom: 8 },
  button: { backgroundColor: '#10b981', paddingVertical: 14, borderRadius: 10, alignItems: 'center', marginTop: 10 },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: '#ffffff', fontWeight: '700' },
  row: { flexDirection: 'row', justifyContent: 'center', marginTop: 14 },
  small: { color: '#6b7280' },
  link: { color: '#059669', fontWeight: '700' },
});
