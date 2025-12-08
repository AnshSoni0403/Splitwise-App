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
  const [participants, setParticipants] = useState<any[]>([]); // selected participant ids
  const [splitType, setSplitType] = useState("equal");
  const [unequalSplits, setUnequalSplits] = useState<any[]>([]);
  const [percentSplits, setPercentSplits] = useState<any[]>([]);
  const [splitInputs, setSplitInputs] = useState<Record<string, string>>({});
  const [percentInputs, setPercentInputs] = useState<Record<string, string>>({});

  useEffect(() => {
    loadMembers();
  }, []);

  const loadMembers = async () => {
    try {
      const res = await axios.get(`${API_BASE}/groups/${groupId}`);
      const members = res.data.group.members.map((m: any) => m.users);
      setGroupMembers(members);
      // default: include all members as participants
      const ids = members.map((m: any) => m.id);
      setParticipants(ids);
      // initialize split/percent inputs
      const sInputs: Record<string, string> = {};
      const pInputs: Record<string, string> = {};
      ids.forEach((id: string) => {
        sInputs[id] = '';
        pInputs[id] = '';
      });
      setSplitInputs(sInputs);
      setPercentInputs(pInputs);
    } catch (err) {
      console.log(err);
    }
  };

  const toggleParticipant = (member: any) => {
    setParticipants((prev) => {
      if (prev.includes(member.id)) {
        // clear inputs
        setSplitInputs((si) => {
          const copy = { ...si };
          delete copy[member.id];
          return copy;
        });
        setPercentInputs((pi) => {
          const copy = { ...pi };
          delete copy[member.id];
          return copy;
        });
        return prev.filter((id) => id !== member.id);
      }
      // add new
      setSplitInputs((si) => ({ ...si, [member.id]: '' }));
      setPercentInputs((pi) => ({ ...pi, [member.id]: '' }));
      return [...prev, member.id];
    });
  };

  const setPayerAmount = (userId: string, amountText: string) => {
    const amount = Number(amountText) || 0;
    setPayers((prev) => prev.map((p) => (p.user_id === userId ? { ...p, paid_amount: amount } : p)));
  };

  const togglePayer = (member: any) => {
    const exists = payers.find((p) => p.user_id === member.id);
    if (exists) {
      setPayers((prev) => prev.filter((p) => p.user_id !== member.id));
    } else {
      setPayers((prev) => [
        ...prev,
        { user_id: member.id, paid_amount: Number(totalAmount) || 0 },
      ]);
    }
  };

  const submitExpense = async () => {
    if (!description || !totalAmount) {
      Alert.alert("Error", "Description and amount are required");
      return;
    }
    try {
      // Ensure participants include any payers
      const payerIds = payers.map((p) => p.user_id);
      const finalParticipants = Array.from(new Set([...participants, ...payerIds]));

      // Validate paid amounts: if sum is zero and there is only one payer, assign the payer the total amount
      const sumPaid = payers.reduce((s, p) => s + (Number(p.paid_amount) || 0), 0);
      let finalPayers = [...payers];

      if (sumPaid === 0) {
        if (finalPayers.length === 1) {
          finalPayers = finalPayers.map((p) => ({ ...p, paid_amount: Number(totalAmount) }));
        } else {
          Alert.alert("Error", "Please enter paid amounts for payers or select a single payer who paid the full amount.");
          return;
        }
      }

      // Build split_values according to splitType
      if (splitType === 'unequal') {
        // collect owed amounts from splitInputs for participants
        const finalSplits = finalParticipants.map((uid) => ({
          user_id: uid,
          owed_amount: Number(splitInputs[uid] || 0),
        }));
        const sumOwed = finalSplits.reduce((s, f) => s + (Number(f.owed_amount) || 0), 0);
        if (Math.abs(sumOwed - Number(totalAmount)) > 0.01) {
          Alert.alert('Error', `Sum of owed amounts (${sumOwed}) does not match total (${totalAmount}).`);
          return;
        }
        payload.split_values = finalSplits;
      }

      if (splitType === 'percentage') {
        const finalSplits = finalParticipants.map((uid) => ({
          user_id: uid,
          percent: Number(percentInputs[uid] || 0),
        }));
        const sumPercent = finalSplits.reduce((s, f) => s + (Number(f.percent) || 0), 0);
        if (Math.abs(sumPercent - 100) > 0.5) {
          Alert.alert('Error', `Sum of percentages (${sumPercent}) must be 100.`);
          return;
        }
        payload.split_values = finalSplits;
      }

      const payload: any = {
        group_id: groupId,
        created_by: user?.id,
        description,
        total_amount: Number(totalAmount),
        payers: finalPayers,
        participants: finalParticipants,
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
        renderItem={({ item }) => {
          const isPayer = payers.some((p) => p.user_id === item.id);
          const isParticipant = participants.includes(item.id);
          const payerEntry = payers.find((p) => p.user_id === item.id) || { paid_amount: 0 };
          return (
            <View style={styles.memberRow}>
              <TouchableOpacity onPress={() => toggleParticipant(item)} style={[styles.checkbox, isParticipant && styles.checkboxSelected]}>
                {isParticipant ? <Text style={styles.checkMark}>✓</Text> : null}
              </TouchableOpacity>

              <Text style={{ marginLeft: 10, flex: 1 }}>{item.name}</Text>

              <TouchableOpacity onPress={() => togglePayer(item)} style={[styles.payerToggle, isPayer && styles.payerToggleActive]}>
                <Text style={{ color: isPayer ? 'white' : '#064e3b' }}>{isPayer ? 'Payer' : 'Make payer'}</Text>
              </TouchableOpacity>

              {isPayer ? (
                <TextInput
                  value={String(payerEntry.paid_amount || '')}
                  onChangeText={(t) => setPayerAmount(item.id, t)}
                  placeholder="amt"
                  keyboardType="numeric"
                  style={styles.paidInput}
                />
              ) : null}
            </View>
          );
        }}
      />

      {/* Split detail inputs for unequal/percentage */}
      {splitType === 'unequal' && (
        <View style={{ marginTop: 16 }}>
          <Text style={{ fontWeight: '700' }}>Enter owed amounts for selected participants</Text>
          {participants.map((pid) => {
            const member = groupMembers.find((m: any) => m.id === pid) || { name: pid };
            return (
              <View key={pid} style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8 }}>
                <Text style={{ flex: 1 }}>{member.name}</Text>
                <TextInput
                  style={[styles.paidInput, { width: 120 }]}
                  placeholder="owed amount"
                  keyboardType="numeric"
                  value={splitInputs[pid] ?? ''}
                  onChangeText={(t) => setSplitInputs((s) => ({ ...s, [pid]: t }))}
                />
              </View>
            );
          })}
        </View>
      )}

      {splitType === 'percentage' && (
        <View style={{ marginTop: 16 }}>
          <Text style={{ fontWeight: '700' }}>Enter percentage for selected participants (sum must be 100)</Text>
          {participants.map((pid) => {
            const member = groupMembers.find((m: any) => m.id === pid) || { name: pid };
            return (
              <View key={pid} style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8 }}>
                <Text style={{ flex: 1 }}>{member.name}</Text>
                <TextInput
                  style={[styles.paidInput, { width: 120 }]}
                  placeholder="%"
                  keyboardType="numeric"
                  value={percentInputs[pid] ?? ''}
                  onChangeText={(t) => setPercentInputs((s) => ({ ...s, [pid]: t }))}
                />
              </View>
            );
          })}
        </View>
      )}
            </View>
          );
        }}
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
  payerToggle: {
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#064e3b',
    marginLeft: 8,
  },
  payerToggleActive: { backgroundColor: '#064e3b' },
  paidInput: {
    width: 70,
    height: 36,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 6,
    paddingHorizontal: 8,
    marginLeft: 8,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#999',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'white'
  },
  checkboxSelected: {
    backgroundColor: '#064e3b',
    borderColor: '#064e3b'
  },
  checkMark: { color: 'white', fontWeight: '700' }
});
