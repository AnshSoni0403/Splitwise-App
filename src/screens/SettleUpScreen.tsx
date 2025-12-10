import React, { useEffect, useState, useContext } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import axios from "axios";
import { SafeAreaView } from "react-native-safe-area-context";
// If you have AuthContext to get current user id:
import { AuthContext } from "../context/AuthContext";

const API_BASE = "http://192.168.0.194:4000/api";

export default function SettleUpScreen({ route, navigation }: any) {
  const { groupId, defaultToUser } = route.params || {};
  const { user } = useContext(AuthContext); // expects user.id or similar
  const [members, setMembers] = useState<any[]>([]);
  const [toUser, setToUser] = useState<string | null>(defaultToUser || null);
  const [amount, setAmount] = useState<string>("");
  const [note, setNote] = useState("");

  useEffect(() => {
    loadMembers();
  }, []);

  const loadMembers = async () => {
    try {
      const res = await axios.get(`${API_BASE}/groups/${groupId}`);
      // members objects are like { id, users: { id, name, email } } in your app
      setMembers(res.data.group.members || []);
    } catch (err) {
      console.error("loadMembers error", err);
      Alert.alert("Error", "Failed to load members");
    }
  };

  const submitSettlement = async () => {
    if (!user?.id && !user?.id) {
      Alert.alert("Error", "You must be logged in");
      return;
    }
    const fromUser = user.id; // adapt if your auth stores user.id differently
    if (!toUser) {
      Alert.alert("Validation", "Select recipient (who will receive money)");
      return;
    }
    const amt = Number(amount);
    if (!amt || amt <= 0) {
      Alert.alert("Validation", "Enter a valid amount");
      return;
    }
    if (fromUser === toUser) {
      Alert.alert("Validation", "Cannot settle with yourself");
      return;
    }

    try {
      const payload = {
        group_id: groupId,
        from_user: fromUser,
        to_user: toUser,
        amount: Number(amt.toFixed(2)),
        note: note || null,
        created_by: fromUser,
      };

      console.log("[SettleUp] payload:", payload);
      const res = await axios.post(`${API_BASE}/settlements`, payload);
      console.log("Settle create response:", res.data);
      Alert.alert("Success", "Settlement recorded");

      // Optionally refresh previous screen / balances.
      // You can pass a param to tell previous screen to reload (or use an event bus)
      navigation.goBack();
    } catch (err: any) {
      console.error("create settlement error", err.response?.data || err.message || err);
      Alert.alert("Error", err.response?.data?.error || "Failed to create settlement");
    }
  };

  function renderMember({ item }: { item: any }) {
    const uid = item.users.id;
    const name = item.users?.name || item.users?.email || uid.slice(0, 6);
    const selected = toUser === uid;

    return (
      <TouchableOpacity
        style={[styles.memberRow, selected && styles.memberRowSelected]}
        onPress={() => setToUser(uid)}
      >
        <Text style={{ fontWeight: "600" }}>{name}</Text>
        {selected && <Text style={{ color: "#064e3b", fontWeight: "700" }}>Selected</Text>}
      </TouchableOpacity>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView contentContainerStyle={{ padding: 20 }}>
          <Text style={styles.title}>Settle up</Text>

          <Text style={styles.label}>Who will receive money?</Text>
          <FlatList
            data={members}
            keyExtractor={(it) => it.users.id}
            renderItem={renderMember}
            scrollEnabled={false}
          />

          <Text style={[styles.label, { marginTop: 16 }]}>Amount</Text>
          <TextInput
            value={amount}
            onChangeText={setAmount}
            keyboardType="numeric"
            placeholder="Enter amount (e.g., 250)"
            style={styles.input}
          />

          <Text style={[styles.label, { marginTop: 12 }]}>Note (optional)</Text>
          <TextInput
            value={note}
            onChangeText={setNote}
            placeholder="e.g., paid for dinner"
            style={[styles.input, { height: 80 }]}
            multiline
          />

          <TouchableOpacity onPress={submitSettlement} style={styles.submitBtn}>
            <Text style={{ color: "white", fontWeight: "700" }}>Confirm Settle</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 20, fontWeight: "700", marginBottom: 12 },
  label: { fontWeight: "600", marginBottom: 6 },
  input: { backgroundColor: "#f0f0f0", padding: 10, borderRadius: 8, marginBottom: 12 },
  memberRow: { padding: 12, backgroundColor: "#fafafa", borderRadius: 8, marginBottom: 8, flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  memberRowSelected: { backgroundColor: "#e6f7f3", borderColor: "#bbf7d0" },
  submitBtn: { backgroundColor: "#064e3b", padding: 14, borderRadius: 8, marginTop: 16, alignItems: "center" },
});
