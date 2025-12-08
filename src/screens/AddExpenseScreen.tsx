import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
} from "react-native";
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

    const payload = {
      group_id: groupId,
      description,
      total_amount: Number(totalAmount),
      created_by: selectedPayer,
      payers: [{ user_id: selectedPayer, paid_amount: Number(totalAmount) }],
      participants: selectedParticipants,
      split_type: splitType,
      split_values: null, // equal split for now
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
    <View style={{ flex: 1, padding: 20 }}>
      <Text style={styles.title}>Add Expense</Text>

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
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[
              styles.option,
              selectedPayer === item.users.id && styles.selectedOption,
            ]}
            onPress={() => setSelectedPayer(item.users.id)}
          >
            <Text style={styles.optionText}>{item.users.name}</Text>
          </TouchableOpacity>
        )}
      />

      <Text style={styles.section}>Split Between</Text>
      {members.map((m) => (
        <TouchableOpacity
          key={m.users.id}
          style={styles.participantRow}
          onPress={() => toggleParticipant(m.users.id)}
        >
          <Text>{m.users.name}</Text>
          {selectedParticipants.includes(m.users.id) && <Text>✔</Text>}
        </TouchableOpacity>
      ))}

      <TouchableOpacity style={styles.addBtn} onPress={submitExpense}>
        <Text style={{ color: "white", fontWeight: "700" }}>
          Save Expense
        </Text>
      </TouchableOpacity>
    </View>
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
