// mobile/src/screens/GroupDetailsScreen.tsx
import React, { useEffect, useState, useContext } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import axios from "axios";
import { useIsFocused } from "@react-navigation/native";
import { AuthContext } from "../context/AuthContext";

const API_BASE = "http://192.168.0.194:4000/api"; // <-- replace with your IP if needed

const COLORS = {
  headerStart: "#f0fdf4",
  headerEnd: "#dcfce7",
  card: "#ffffff",
  primary: "#059669",
  muted: "#6b7280",
  text: "#064e3b",
};

export default function GroupDetailsScreen({ route, navigation }: any) {
  const { groupId } = route.params;
  const isFocused = useIsFocused();

  const [group, setGroup] = useState<any | null>(null);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [balances, setBalances] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [settlements, setSettlements] = useState<any[]>([]);

  const { user } = useContext(AuthContext);

  const loadGroup = async () => {
    try {
      const res = await axios.get(`${API_BASE}/groups/${groupId}`);
      setGroup(res.data.group);
    } catch (err) {
      console.log("Error loading group:", err);
    }
  };

  const loadExpenses = async () => {
    try {
      const res = await axios.get(`${API_BASE}/expenses/group/${groupId}`);
      setExpenses(res.data.expenses || []);
    } catch (err) {
      console.log("Error loading expenses:", err);
    }
  };

  const loadBalances = async () => {
    try {
      // backend exposes balances under /api/expenses/:id/balances
      const res = await axios.get(`${API_BASE}/expenses/${groupId}/balances`);
      setBalances(res.data.balances || {});
    } catch (err) {
      console.log("Error loading balances:", err);
    }
  };

  // compute pairwise settlements from balances map
  const computeSettlements = (balancesMap: Record<string, number>) => {
    const creditors: { user_id: string; amount: number }[] = [];
    const debtors: { user_id: string; amount: number }[] = [];

    Object.keys(balancesMap).forEach((uid) => {
      const v = Number(balancesMap[uid] || 0);
      if (v > 0.005) creditors.push({ user_id: uid, amount: v });
      else if (v < -0.005) debtors.push({ user_id: uid, amount: -v }); // store positive owed amount
    });

    // sort creditors desc, debtors desc
    creditors.sort((a, b) => b.amount - a.amount);
    debtors.sort((a, b) => b.amount - a.amount);

    const res: { from: string; to: string; amount: number }[] = [];

    let i = 0;
    let j = 0;
    while (i < debtors.length && j < creditors.length) {
      const owe = debtors[i];
      const recv = creditors[j];
      const settle = Math.min(owe.amount, recv.amount);
      res.push({ from: owe.user_id, to: recv.user_id, amount: Number(settle.toFixed(2)) });

      owe.amount = Number((owe.amount - settle).toFixed(2));
      recv.amount = Number((recv.amount - settle).toFixed(2));

      if (owe.amount <= 0.005) i++;
      if (recv.amount <= 0.005) j++;
    }

    return res;
  };

  const loadAll = async () => {
    setLoading(true);
    await Promise.all([loadGroup(), loadExpenses(), loadBalances()]);
    setLoading(false);
  };

  useEffect(() => {
    if (isFocused) loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isFocused]);

  // recompute settlements whenever balances change
  useEffect(() => {
    setSettlements(computeSettlements(balances || {}));
  }, [balances]);

  if (loading || !group) {
    return (
      <LinearGradient colors={[COLORS.headerStart, COLORS.headerEnd]} style={{ flex: 1 }}>
        <SafeAreaView style={{ flex: 1, justifyContent: "center", alignItems: "center" }} edges={["top"]}>
          <ActivityIndicator size="large" />
          <Text style={{ marginTop: 12, color: COLORS.text }}>Loading group...</Text>
        </SafeAreaView>
      </LinearGradient>
    );
  }

  // helper: find member object by user_id
  const findMemberByUserId = (userId: string) =>
    group.members?.find((m: any) => (m.user_id || m.users?.id) === userId) || null;

  return (
    <LinearGradient colors={[COLORS.headerStart, COLORS.headerEnd]} style={{ flex: 1 }}>
      <SafeAreaView style={{ flex: 1 }} edges={["top"]}>
        <ScrollView contentContainerStyle={{ padding: 20 }}>
          <Text style={styles.title}>{group.name}</Text>

          <Text style={styles.section}>Members</Text>
          <FlatList
            data={group.members}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <View style={styles.memberCard}>
                <View>
                  <Text style={styles.memberName}>{item.users?.name || "Unknown"}</Text>
                  <Text style={styles.memberEmail}>{item.users?.email || item.users?.username}</Text>
                </View>
                <Text style={styles.role}>{item.role === "admin" ? "👑 Admin" : "Member"}</Text>
              </View>
            )}
            scrollEnabled={false}
          />

          {/* Add Member Button */}
          <TouchableOpacity
            style={styles.addBtn}
            onPress={() => navigation.navigate("AddMember", { groupId })}
          >
            <Text style={{ color: "white", fontWeight: "700" }}>Add Member</Text>
          </TouchableOpacity>

          {/* BALANCES */}
          <Text style={[styles.section, { marginTop: 22 }]}>Balances</Text>
          <View style={styles.card}>
            {Object.keys(balances).length === 0 ? (
              <Text style={{ color: COLORS.muted }}>No balances yet</Text>
            ) : (
              Object.keys(balances).map((uid) => {
                const member = findMemberByUserId(uid) || {};
                const name = member.users?.name || member.users?.username || uid.slice(0, 6);
                const bal = balances[uid] ?? 0;
                const balText = bal >= 0 ? `+₹${bal}` : `-₹${Math.abs(bal)}`;
                return (
                  <View key={uid} style={styles.balanceRow}>
                    <Text style={styles.balanceName}>{name}</Text>
                    <Text style={[styles.balanceAmount, { color: bal >= 0 ? "green" : "red" }]}>{balText}</Text>
                  </View>
                );
              })
            )}
          </View>

          {/* Settlements for current user */}
          <Text style={[styles.section, { marginTop: 22 }]}>Settlements (for you)</Text>
          <View style={styles.card}>
            {(!settlements || settlements.length === 0) ? (
              <Text style={{ color: COLORS.muted }}>No settlements required</Text>
            ) : (
              // show only transactions that involve current user
              settlements.filter(s => s.from === user?.id || s.to === user?.id).map((s, idx) => {
                const fromMember = findMemberByUserId(s.from) || {};
                const toMember = findMemberByUserId(s.to) || {};
                const fromName = fromMember.users?.name || s.from.slice(0, 6);
                const toName = toMember.users?.name || s.to.slice(0, 6);
                if (s.from === user?.id) {
                  return (
                    <View key={idx} style={styles.balanceRow}>
                      <Text style={styles.balanceName}>You → {toName}</Text>
                      <Text style={[styles.balanceAmount, { color: '#b91c1c' }]}>-₹{s.amount.toFixed(2)}</Text>
                    </View>
                  );
                }
                return (
                  <View key={idx} style={styles.balanceRow}>
                    <Text style={styles.balanceName}>{fromName} → You</Text>
                    <Text style={[styles.balanceAmount, { color: '#065f46' }]}>+₹{s.amount.toFixed(2)}</Text>
                  </View>
                );
              })
            )}
          </View>

          {/* EXPENSES */}
          <Text style={[styles.section, { marginTop: 22 }]}>Expenses</Text>
          {expenses.length === 0 ? (
            <Text style={{ color: COLORS.muted }}>No expenses yet</Text>
          ) : (
            <FlatList
              data={expenses}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => {
                // format payer names
                const payerNames = (item.payers || []).map((p: any) => {
                  const mem = findMemberByUserId(p.user_id);
                  return mem?.users?.name || p.user_id;
                });
                return (
                  <View style={styles.expenseCard}>
                    <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                      <Text style={styles.expenseTitle}>{item.description || "Expense"}</Text>
                      <Text style={styles.amount}>₹{item.total_amount}</Text>
                    </View>

                    <Text style={styles.paidBy}>Paid by: {payerNames.join(", ")}</Text>

                    <Text style={styles.small}>
                      {new Date(item.created_at).toLocaleString()}
                    </Text>

                    <TouchableOpacity
  style={[styles.addBtn, { backgroundColor: "#0f172a", marginTop: 20 }]}
  onPress={() => navigation.navigate("AddExpense", { groupId })}
>
  <Text style={{ color: "white", fontWeight: "700" }}>Add Expense</Text>
</TouchableOpacity>

                  </View>
                );
              }}
            />
          )}

          {/* Add Expense Button */}
          <TouchableOpacity
            style={[styles.addBtn, { backgroundColor: "#0f172a", marginTop: 20 }]}
            onPress={() => navigation.navigate("AddExpense", { groupId })}
          >
            <Text style={{ color: "white", fontWeight: "700" }}>Add Expense</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 24, fontWeight: "700", marginBottom: 12, color: COLORS.text, paddingHorizontal: 8 },
  section: { fontSize: 18, fontWeight: "600", marginBottom: 10, color: COLORS.text, paddingHorizontal: 8 },
  memberCard: {
    padding: 12,
    backgroundColor: COLORS.card,
    borderRadius: 8,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#eef6ef",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  memberName: { fontSize: 16, fontWeight: "700", color: COLORS.text },
  memberEmail: { color: COLORS.muted },
  role: { marginTop: 5, fontSize: 12, fontWeight: "600", color: COLORS.muted },

  addBtn: {
    backgroundColor: COLORS.primary,
    padding: 12,
    borderRadius: 8,
    marginTop: 12,
    alignItems: "center",
    alignSelf: "flex-start",
  },

  card: {
    padding: 12,
    borderRadius: 8,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: "#eef6ef",
  },

  balanceRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 8 },
  balanceName: { fontSize: 16, fontWeight: "600" },
  balanceAmount: { fontSize: 16, fontWeight: "700" },

  expenseCard: {
    backgroundColor: COLORS.card,
    padding: 12,
    borderRadius: 8,
    marginTop: 10,
    borderWidth: 1,
    borderColor: "#eef6ef",
  },
  expenseTitle: { fontSize: 16, fontWeight: "700" },
  amount: { fontSize: 16, fontWeight: "700", color: "#064e3b" },
  paidBy: { marginTop: 8, color: COLORS.muted },
  small: { marginTop: 8, color: COLORS.muted, fontSize: 12 },
});
