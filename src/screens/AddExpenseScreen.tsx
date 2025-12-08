import React, { useState, useEffect, useContext } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  Alert,
} from "react-native";
import axios from "axios";
import { AuthContext } from "../context/AuthContext";

export default function AddExpenseScreen({ route, navigation }: any) {
  const { groupId } = route.params;

  const { user } = useContext(AuthContext);

  const API_BASE = "http://192.168.0.194:4000/api"; // keep same host as other screens

  const [groupMembers, setGroupMembers] = useState([]);
  const [description, setDescription] = useState("");
  const [totalAmount, setTotalAmount] = useState("");

  const [payers, setPayers] = useState<any[]>([]);
  const [participants, setParticipants] = useState<any[]>([]);
  const [splitType, setSplitType] = useState("equal");
  const [unequalSplits, setUnequalSplits] = useState<any[]>([]);
  const [percentSplits, setPercentSplits] = useState<any[]>([]);

  useEffect(() => {
    loadMembers();
  }, []);

  const loadMembers = async () => {
    try {
      const res = await axios.get(`${API_BASE}/groups/${groupId}`);
      const members = res.data.group.members.map((m: any) => m.users);
      setGroupMembers(members);
      setParticipants(members.map((m: any) => m.id));
    } catch (err) {
      console.log(err);
    }
  };

  const submitExpense = async () => {
    if (!description || !totalAmount) {
      Alert.alert("Error", "Description and amount are required");
      return;
    }

    try {
      const payload: any = {
        group_id: groupId,
        created_by: user?.id,
        description,
        total_amount: Number(totalAmount),
        payers,
        participants,
        split_type: splitType,
      };

      if (splitType === "unequal") payload.split_values = unequalSplits;
      if (splitType === "percentage") payload.split_values = percentSplits;

      const res = await axios.post(`${API_BASE}/expenses`, payload);
      console.log('create expense success', res.data);
      Alert.alert("Success", "Expense added!");
      navigation.goBack();
    } catch (err: any) {
      console.log('create expense error:', err.response?.data || err.message || err);
      Alert.alert("Error", err.response?.data?.error || JSON.stringify(err.response?.data) || "Failed to add expense");
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Add Expense</Text>

      <TextInput
        placeholder="Description"
        style={styles.input}
        value={description}
        onChangeText={setDescription}
      />

      <TextInput
        placeholder="Total Amount"
        style={styles.input}
        keyboardType="numeric"
        value={totalAmount}
        onChangeText={setTotalAmount}
      />

      <Text style={styles.section}>Payers</Text>

      <FlatList
        data={groupMembers}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.memberRow}
            onPress={() =>
              setPayers([...payers, { user_id: item.id, paid_amount: Number(totalAmount) }])
            }
          >
            <Text>{item.name}</Text>
          </TouchableOpacity>
        )}
      />

      <Text style={styles.section}>Split Type</Text>

      <View style={styles.row}>
        {["equal", "unequal", "percentage"].map((type) => (
          <TouchableOpacity
            key={type}
            style={[
              styles.splitBtn,
              splitType === type && { backgroundColor: "black" },
            ]}
            onPress={() => setSplitType(type)}
          >
            <Text style={{ color: splitType === type ? "white" : "black" }}>
              {type.toUpperCase()}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <TouchableOpacity style={styles.addBtn} onPress={submitExpense}>
        <Text style={{ color: "white", fontWeight: "700" }}>Add Expense</Text>
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
    marginTop: 10,
    borderRadius: 8,
  },
  section: { marginTop: 20, fontSize: 18, fontWeight: "600" },
  memberRow: {
    padding: 12,
    backgroundColor: "#eee",
    marginTop: 10,
    borderRadius: 8,
  },
  splitBtn: {
    padding: 10,
    borderWidth: 1,
    margin: 5,
    borderRadius: 6,
  },
  row: { flexDirection: "row", marginTop: 10 },
  addBtn: {
    backgroundColor: "black",
    padding: 15,
    marginTop: 20,
    borderRadius: 10,
    alignItems: "center",
  },
});
