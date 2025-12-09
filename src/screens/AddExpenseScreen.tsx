// src/screens/AddExpenseScreen.tsx
import React, { useEffect, useState, useCallback } from "react";
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
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import axios from "axios";

const API_BASE = "http://192.168.0.194:4000/api";

export default function AddExpenseScreen({ route, navigation }: any) {
  const { groupId } = route.params;

  const [members, setMembers] = useState<any[]>([]);
  const [description, setDescription] = useState("");
  const [totalAmount, setTotalAmount] = useState("");
  const [selectedPayer, setSelectedPayer] = useState<string>("");
  const [selectedParticipants, setSelectedParticipants] = useState<string[]>([]);
  const [splitType, setSplitType] = useState<"equal" | "unequal" | "percentage">("equal");
  const [manualAmounts, setManualAmounts] = useState<Record<string, string>>({}); // userId -> string amount

  useEffect(() => {
    loadMembers();
  }, []);

  // Load group members
  const loadMembers = async () => {
    try {
      const res = await axios.get(`${API_BASE}/groups/${groupId}`);
      setMembers(res.data.group.members || []);
    } catch (err) {
      console.log("Error loading members:", err);
      Alert.alert("Error", "Failed to load group members");
    }
  };

  // stable helper: add participant (if not exists)
  const addParticipantIfMissing = useCallback((id: string) => {
    setSelectedParticipants((prev) => {
      if (!prev.includes(id)) return [...prev, id];
      return prev;
    });
  }, []);

  // When a payer is selected, auto-include them into participants
  const onSelectPayer = (id: string) => {
    setSelectedPayer(id);
    addParticipantIfMissing(id);
  };

  // Toggle participant selection (safe updater)
  const toggleParticipant = (id: string) => {
    setSelectedParticipants((prev) => {
      const exists = prev.includes(id);
      const next = exists ? prev.filter((p) => p !== id) : [...prev, id];
      // drop manual amount if removed
      setManualAmounts((m) => {
        if (exists) {
          const copy = { ...m };
          delete copy[id];
          return copy;
        }
        return m;
      });
      return next;
    });
  };

  const onManualAmountChange = (userId: string, val: string) => {
    // allow only digits and dot
    const cleaned = val.replace(/[^0-9.]/g, "");
    setManualAmounts((m) => ({ ...m, [userId]: cleaned }));
  };

  const parseNumber = (v: string) => {
    if (!v && v !== "0") return 0;
    const n = Number(v);
    return isNaN(n) ? 0 : n;
  };

  // Build participants array with payer ensured
  const buildFinalParticipants = () => {
    const final = selectedParticipants.includes(selectedPayer)
      ? [...selectedParticipants]
      : selectedPayer
        ? [...selectedParticipants, selectedPayer]
        : [...selectedParticipants];
    return Array.from(new Set(final));
  };

  const validateAndBuildPayload = () => {
    const finalParticipants = buildFinalParticipants();
    if (!selectedPayer) {
      Alert.alert("Validation", "Choose the person who paid");
      return null;
    }
    if (finalParticipants.length === 0) {
      Alert.alert("Validation", "Select at least one participant");
      return null;
    }
    const total = Number(totalAmount);
    if (!total || total <= 0) {
      Alert.alert("Validation", "Enter a valid total amount");
      return null;
    }

    const payloadBase: any = {
      group_id: groupId,
      description,
      total_amount: Number(total),
      created_by: selectedPayer,
      payers: [{ user_id: selectedPayer, paid_amount: Number(total) }],
      participants: finalParticipants,
      split_between: finalParticipants,
      split_type: splitType,
      split_values: null, // will set for unequal if available
    };

    // Unequal/manual case -> build split_values from manualAmounts in finalParticipants order
    if (splitType === "unequal") {
      const vals = finalParticipants.map((uid) => parseNumber(manualAmounts[uid] || "0"));
      const sum = vals.reduce((a, b) => a + b, 0);

      if (sum === 0) {
        Alert.alert("Validation", "Enter manual amounts for selected participants");
        return null;
      }

      // If sum exactly equals total, send these values as split_values
      if (Math.abs(sum - total) < 0.01) {
        payloadBase.split_values = vals.map((v) => Number(v.toFixed(2)));
        return { payload: payloadBase };
      }

      // sum != total — return object instructing submitExpense to prompt scaling / submit-as-is
      return { payload: payloadBase, manual: { vals, sum, finalParticipants } };
    }

    // equal/percentage default behaviour (no split_values)
    return { payload: payloadBase };
  };

  const submitExpense = async () => {
    const built = validateAndBuildPayload();
    if (!built) return;

    // If manual amounts had mismatch, prompt user to scale or submit-as-is
    if ((built as any).manual) {
      const { vals, sum, finalParticipants } = (built as any).manual;
      Alert.alert(
        "Manual split mismatch",
        `Manual amounts sum to ${sum.toFixed(2)} but total is ${Number(totalAmount).toFixed(2)}.\nDo you want to scale the entered amounts proportionally to match the total?`,
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Scale & Submit",
            onPress: async () => {
              const total = Number(totalAmount);
              // scale and round to 2 decimals
              let scaled = vals.map((v: number) => (v / sum) * total);
              scaled = scaled.map((v) => Number(v.toFixed(2)));

              // distribute cent-difference deterministically
              let ssum = scaled.reduce((a, b) => a + b, 0);
              let diff = Number((total - ssum).toFixed(2));
              let idx = 0;
              while (Math.abs(diff) >= 0.01) {
                scaled[idx % scaled.length] = Number((scaled[idx % scaled.length] + (diff > 0 ? 0.01 : -0.01)).toFixed(2));
                ssum = scaled.reduce((a, b) => a + b, 0);
                diff = Number((total - ssum).toFixed(2));
                idx++;
                if (idx > 1000) break;
              }

              const payload = (built as any).payload;
              payload.split_values = scaled;
              await sendPayload(payload);
            }
          },
          {
            text: "Submit As-Is",
            onPress: async () => {
              const payload = (built as any).payload;
              payload.split_values = vals.map((v) => Number(Number(v).toFixed(2)));
              await sendPayload(payload);
            }
          }
        ]
      );
      return;
    }

    // Normal path: payload ready
    const payload = (built as any).payload;
    await sendPayload(payload);
  };

  const sendPayload = async (payload: any) => {
    try {
      // Debug log so you can confirm split_values present for unequal
      console.log("Submitting expense payload:", JSON.stringify(payload, null, 2));
      const res = await axios.post(`${API_BASE}/expenses`, payload, { timeout: 20000 });
      console.log("Create expense response:", res.data);
      Alert.alert("Success", "Expense added");
      navigation.goBack();
    } catch (err: any) {
      console.error("Create expense failed:", err.response?.data || err.message || err);
      Alert.alert("Error", err.response?.data?.error || "Failed to add expense");
    }
  };

  // Render participant row (keeps TouchableOpacity single tap area)
  const renderParticipantRow = ({ item }: { item: any }) => {
    const uid = item.users.id;
    const selected = selectedParticipants.includes(uid);
    return (
      <View
        key={uid}
        style={[
          styles.participantRow,
          selected && styles.participantRowSelected,
        ]}
      >
        <TouchableOpacity
          onPress={() => toggleParticipant(uid)}
          style={{ flex: 1, flexDirection: "row", alignItems: "center" }}
          activeOpacity={0.7}
        >
          <View style={styles.smallAvatar}><Text style={{ color: "white", fontWeight: "700" }}>{(item.users.name || "?").slice(0,1)}</Text></View>
          <Text style={{ marginLeft: 10 }}>{item.users.name}</Text>
        </TouchableOpacity>

        <View style={{ flexDirection: "row", alignItems: "center" }}>
          {splitType === "unequal" && selected && (
            <TextInput
              value={manualAmounts[uid] || ""}
              onChangeText={(val) => onManualAmountChange(uid, val)}
              placeholder="0.00"
              keyboardType="numeric"
              style={styles.manualInput}
            />
          )}

          <TouchableOpacity onPress={() => toggleParticipant(uid)} style={{ paddingHorizontal: 8 }}>
            <Text style={{ marginLeft: 10 }}>{selected ? "Selected" : "Tap to select"}</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#f8faf9" }}>
      <LinearGradient colors={["#f0fdf4", "#dcfce7"]} style={styles.header}>
        <Text style={styles.headerTitle}>Add an expense</Text>
      </LinearGradient>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView contentContainerStyle={{ padding: 20 }}>
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
                onPress={() => onSelectPayer(item.users.id)}
                activeOpacity={0.8}
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

          <View style={{ marginTop: 14 }}>
            <Text style={styles.section}>Split Type</Text>
            <View style={{ flexDirection: "row", marginTop: 8 }}>
              {["equal", "unequal", "percentage"].map((t) => (
                <TouchableOpacity
                  key={t}
                  style={[styles.typeBtn, splitType === t && styles.typeBtnActive]}
                  onPress={() => setSplitType(t as any)}
                >
                  <Text style={[styles.typeText, splitType === t && { color: "white" }]}>{t.toUpperCase()}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <Text style={styles.section}>Split Between</Text>
          <FlatList
            data={members}
            keyExtractor={(item) => item.users.id}
            renderItem={renderParticipantRow}
            scrollEnabled={false}
          />

          <TouchableOpacity style={styles.addBtn} onPress={submitExpense}>
            <Text style={{ color: "white", fontWeight: "700" }}>
              Save Expense
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
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
  manualInput: { width: 90, backgroundColor: "#fff", borderRadius: 6, padding: 8, marginLeft: 8, borderWidth: 1, borderColor: "#ddd" },
  addBtn: {
    backgroundColor: "black",
    padding: 15,
    borderRadius: 10,
    marginTop: 20,
    alignItems: "center",
  },
});
