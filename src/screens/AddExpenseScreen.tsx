import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import axios from "axios";

export default function AddExpenseScreen({ route, navigation }: any) {
  const { groupId } = route.params;

  const [members, setMembers] = useState<any[]>([]);
  const [description, setDescription] = useState("");
  const [totalAmount, setTotalAmount] = useState("");
  const [selectedPayer, setSelectedPayer] = useState("");
  const [selectedParticipants, setSelectedParticipants] = useState<string[]>([]);
  const [splitType, setSplitType] = useState("equal");

  const loadMembers = async () => {
    try {
      const res = await axios.get(
        `http://192.168.0.194:4000/api/groups/${groupId}`
      );
      setMembers(res.data.group.members);
    } catch (err) {
      console.log("Error loading members:", err);
    }
  };

  useEffect(() => {
    loadMembers();
  }, []);

  const toggleParticipant = (id: string) => {
    setSelectedParticipants((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]
    );
  };

  const submitExpense = async () => {
  if (!selectedPayer) {
    alert("Choose the person who paid!");
    return;
  }

  if (selectedParticipants.length === 0) {
    alert("Select at least one participant!");
    return;
  }

  // FIX — Payer must also be a participant
  const finalParticipants = selectedParticipants.includes(selectedPayer)
    ? selectedParticipants
    : [...selectedParticipants, selectedPayer];

  const payload = {
  group_id: groupId,
  description,
  total_amount: Number(totalAmount),
  created_by: selectedPayer,

  payers: [
    {
      user_id: selectedPayer,
      paid_amount: Number(totalAmount)
    }
  ],

  // required by backend
  split_between: finalParticipants,  // IMPORTANT ✔✔✔

  // keep participants (backend stores all members)
  participants: finalParticipants,

  split_type: splitType,
  split_values: null,
};


  try {
    const res = await axios.post(
      "http://192.168.0.194:4000/api/expenses",
      payload
    );

    alert("Expense added successfully!");
    navigation.goBack();
  } catch (err: any) {
    console.log("Error creating expense:", err.response?.data || err);
    alert("Error adding expense");
  }
};


  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#f8faf9" }}>
      <LinearGradient colors={["#f0fdf4", "#dcfce7"]} style={styles.header}>
        <Text style={styles.headerTitle}>Add an expense</Text>
      </LinearGradient>
      <View style={{ flex: 1, padding: 20 }}>

      <TextInput
        placeholder="Description"
        value={description}
        onChangeText={setDescription}
        style={styles.input}
      />

      <TextInput
        placeholder="Total Amount"
        value={totalAmount}
        onChangeText={setTotalAmount}
        keyboardType="numeric"
        style={styles.input}
      />

      <Text style={styles.section}>Who Paid?</Text>
      <FlatList
        data={members}
        horizontal
        keyExtractor={(item) => item.users.id}
        showsHorizontalScrollIndicator={false}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[
              styles.option,
              selectedPayer === item.users.id && styles.selectedOption,
            ]}
            onPress={() => setSelectedPayer(item.users.id)}
          >
            <View style={styles.payerItem}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{(item.users.name || "?").slice(0, 1)}</Text>
              </View>
              <Text style={styles.optionText}>{item.users.name}</Text>
            </View>
          </TouchableOpacity>
        )}
      />

      {/* Selected participants chips */}
      <View style={{ marginTop: 12, flexDirection: "row", flexWrap: "wrap" }}>
        {selectedParticipants.map((id) => {
          const m = members.find((x) => x.users.id === id);
          const name = m?.users?.name || id.slice(0, 6);
          return (
            <View key={id} style={styles.chip}>
              <Text style={styles.chipText}>{name}</Text>
              <TouchableOpacity onPress={() => toggleParticipant(id)}>
                <Text style={styles.chipRemove}>✕</Text>
              </TouchableOpacity>
            </View>
          );
        })}
      </View>

      {/* Split type selector */}
      <View style={{ marginTop: 14 }}>
        <Text style={styles.section}>Split Type</Text>
        <View style={{ flexDirection: "row", marginTop: 8 }}>
          {["equal", "unequal", "percentage"].map((t) => (
            <TouchableOpacity
              key={t}
              style={[styles.typeBtn, splitType === t && styles.typeBtnActive]}
              onPress={() => setSplitType(t)}
            >
              <Text style={[styles.typeText, splitType === t && { color: "white" }]}>{t.toUpperCase()}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <Text style={styles.section}>Split Between</Text>
      {members.map((m) => (
        <TouchableOpacity
          key={m.users.id}
          style={[styles.participantRow, selectedParticipants.includes(m.users.id) && styles.participantRowSelected]}
          onPress={() => toggleParticipant(m.users.id)}
        >
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <View style={styles.smallAvatar}><Text style={{ color: "white", fontWeight: "700" }}>{(m.users.name || "?").slice(0,1)}</Text></View>
            <Text style={{ marginLeft: 10 }}>{m.users.name}</Text>
          </View>
          {selectedParticipants.includes(m.users.id) ? <Text style={{ color: "#065f46", fontWeight: "700" }}>Selected</Text> : <Text style={{ color: "#6b7280" }}>Tap to select</Text>}
        </TouchableOpacity>
      ))}

      <TouchableOpacity style={styles.addBtn} onPress={submitExpense}>
        <Text style={{ color: "white", fontWeight: "700" }}>
          Save Expense
        </Text>
      </TouchableOpacity>
    </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 24, fontWeight: "700", marginBottom: 20 },
  input: {
    backgroundColor: "#f0f0f0",
    padding: 12,
    borderRadius: 8,
    marginBottom: 15,
  },
  section: { fontSize: 18, fontWeight: "600", marginVertical: 10 },
  option: {
    padding: 10,
    backgroundColor: "#eee",
    borderRadius: 8,
    marginRight: 10,
  },
  selectedOption: { backgroundColor: "#4ade80" },
  optionText: { fontWeight: "600" },
  header: { padding: 14, alignItems: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#064e3b' },
  payerItem: { alignItems: 'center' },
  avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#064e3b', justifyContent: 'center', alignItems: 'center', marginBottom: 6 },
  avatarText: { color: 'white', fontWeight: '700' },
  chip: { paddingHorizontal: 10, paddingVertical: 6, backgroundColor: '#eef2ff', borderRadius: 20, marginRight: 8, marginBottom: 8, flexDirection: 'row', alignItems: 'center' },
  chipText: { color: '#0f172a', marginRight: 8 },
  chipRemove: { color: '#6b7280', fontWeight: '700' },
  typeBtn: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, borderWidth: 1, borderColor: '#e5e7eb', marginRight: 8 },
  typeBtnActive: { backgroundColor: '#064e3b', borderColor: '#064e3b' },
  typeText: { fontWeight: '700' },
  smallAvatar: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#064e3b', justifyContent: 'center', alignItems: 'center' },
  participantRowSelected: { borderColor: '#bbf7d0', backgroundColor: '#f0fff4' },
  participantRow: {
    padding: 12,
    backgroundColor: "#f3f3f3",
    borderRadius: 8,
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  addBtn: {
    backgroundColor: "black",
    padding: 15,
    borderRadius: 10,
    marginTop: 20,
    alignItems: "center",
  },
});
