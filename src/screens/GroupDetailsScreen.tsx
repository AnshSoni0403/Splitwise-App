import React, { useEffect, useState, useContext } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import axios from "axios";
import { useIsFocused } from "@react-navigation/native";
import { AuthContext } from "../context/AuthContext";

const API = "http://192.168.0.194:4000/api";

const COLORS = {
  headerStart: "#f0fdf4",
  headerEnd: "#dcfce7",
  card: "#ffffff",
  primary: "#059669",
  muted: "#6b7280",
  text: "#064e3b",
  youOwe: "#dc2626",
  youGet: "#16a34a",
  settled: "#6b7280",
};

export default function GroupDetailsScreen({ route, navigation }: any) {
  const { groupId } = route.params;
  const { user } = useContext(AuthContext);
  const isFocused = useIsFocused();

  const [group, setGroup] = useState<any>(null);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [balances, setBalances] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isFocused) loadAll();
  }, [isFocused]);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [gRes, eRes, bRes] = await Promise.all([
        axios.get(`${API}/groups/${groupId}`),
        axios.get(`${API}/expenses/group/${groupId}`),
        axios.get(`${API}/expenses/${groupId}/balances`),
      ]);

      setGroup(gRes.data.group);
      setExpenses(eRes.data.expenses || []);
      setBalances(bRes.data.balances || {});
    } catch (err: any) {
      console.log("Load error:", err.response?.data || err);
    } finally {
      setLoading(false);
    }
  };

  // Compute minimal settlements from balances
  const computeMinimalSettlements = () => {
    const entries = Object.entries(balances);
    let debtors: any[] = [];
    let creditors: any[] = [];

    for (const [uid, amount] of entries) {
      if ((amount as number) < 0) debtors.push({ uid, amt: Math.abs(amount as number) });
      if ((amount as number) > 0) creditors.push({ uid, amt: amount as number });
    }

    let i = 0,
      j = 0;
    const settlements: any[] = [];

    while (i < debtors.length && j < creditors.length) {
      let pay = Math.min(debtors[i].amt, creditors[j].amt);

      settlements.push({
        from: debtors[i].uid,
        to: creditors[j].uid,
        amount: Number(pay.toFixed(2)),
      });

      debtors[i].amt -= pay;
      creditors[j].amt -= pay;

      if (debtors[i].amt === 0) i++;
      if (creditors[j].amt === 0) j++;
    }
    return settlements;
  };

  const settlements = computeMinimalSettlements();

  if (loading || !group) {
    return (
      <LinearGradient colors={[COLORS.headerStart, COLORS.headerEnd]} style={{ flex: 1 }}>
        <SafeAreaView style={{ flex: 1, justifyContent: "center", alignItems: "center" }} edges={["top"]}>
          <ActivityIndicator size="large" color={COLORS.text} />
          <Text style={{ marginTop: 12, color: COLORS.text }}>Loading group...</Text>
        </SafeAreaView>
      </LinearGradient>
    );
  }

  const getUserName = (uid: string) => {
    const m = group.members.find((m: any) => m.users.id === uid);
    return m?.users?.name || "Unknown";
  };

  const myBalance = balances[user?.id] || 0;

  const headerComponent = () => (
    <>
      {/* Group Title */}
      <Text style={styles.title}>{group.name}</Text>

      {/* My Summary Card */}
      <View style={styles.card}>
        <Text style={styles.section}>Your Summary</Text>
        <View style={{ marginTop: 8 }}>
          {myBalance > 0 && (
            <Text style={[styles.summary, { color: COLORS.youGet }]}>
              ✓ You should get back ₹{myBalance.toFixed(2)}
            </Text>
          )}
          {myBalance < 0 && (
            <Text style={[styles.summary, { color: COLORS.youOwe }]}>
              ✗ You owe ₹{Math.abs(myBalance).toFixed(2)}
            </Text>
          )}
          {myBalance === 0 && (
            <Text style={[styles.summary, { color: COLORS.settled }]}>
              ✓ You are settled up
            </Text>
          )}
        </View>
      </View>

      {/* Group Balances */}
      <View style={styles.card}>
        <Text style={styles.section}>Group Balances</Text>
        {Object.entries(balances).map(([uid, amt]: any) => (
          <View key={uid} style={styles.balanceRow}>
            <Text style={styles.balanceName}>{getUserName(uid)}</Text>
            <Text
              style={[
                styles.balanceAmount,
                { color: amt > 0 ? COLORS.youGet : amt < 0 ? COLORS.youOwe : COLORS.settled },
              ]}
            >
              {amt > 0 ? `Gets ₹${amt.toFixed(2)}` : amt < 0 ? `Owes ₹${Math.abs(amt).toFixed(2)}` : "Settled"}
            </Text>
          </View>
        ))}
      </View>

      {/* Minimal Settlements */}
      <View style={styles.card}>
        <Text style={styles.section}>Suggested Settlements</Text>
        {settlements.length === 0 ? (
          <Text style={{ color: COLORS.settled, fontSize: 15 }}>✓ Everyone is settled!</Text>
        ) : (
          settlements.map((s, i) => (
            <View key={i} style={styles.settlementRow}>
              <Text style={styles.settlementText}>{getUserName(s.from)}</Text>
              <Text style={styles.settlementArrow}>→</Text>
              <Text style={styles.settlementText}>{getUserName(s.to)}</Text>
              <Text style={styles.settlementAmount}>₹{s.amount.toFixed(2)}</Text>
            </View>
          ))
        )}
      </View>

      {/* Members */}
      <View style={styles.card}>
        <Text style={styles.section}>Members</Text>
        {group.members.map((m: any) => (
          <View key={m.id} style={styles.memberRow}>
            <View>
              <Text style={styles.memberName}>{m.users?.name || "Unknown"}</Text>
              <Text style={styles.memberEmail}>{m.users?.email || m.users?.username}</Text>
            </View>
            <Text style={styles.role}>{m.role === "admin" ? "👑" : "👤"}</Text>
          </View>
        ))}
        <TouchableOpacity
          style={styles.addMemberBtn}
          onPress={() => navigation.navigate("AddMember", { groupId })}
        >
          <Text style={styles.addMemberText}>+ Add Member</Text>
        </TouchableOpacity>
      </View>

      {/* Expenses Header */}
      <Text style={[styles.section, { marginTop: 18 }]}>Expenses</Text>
    </>
  );

  return (
    <LinearGradient colors={[COLORS.headerStart, COLORS.headerEnd]} style={{ flex: 1 }} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
      <SafeAreaView style={{ flex: 1 }} edges={["top", "left", "right"]}>
        <FlatList
          data={expenses}
          keyExtractor={(e) => e.id}
          contentContainerStyle={{ padding: 16, paddingBottom: 20 }}
          ListHeaderComponent={headerComponent}
          renderItem={({ item }) => (
            <View style={styles.expenseCard}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.expenseTitle}>{item.description}</Text>
                  <Text style={styles.paidBy}>Paid by: {getUserName(item.created_by)}</Text>
                  <Text style={styles.small}>
                    {new Date(item.created_at).toLocaleDateString()}
                  </Text>
                </View>
                <Text style={styles.amount}>₹{parseFloat(item.total_amount).toFixed(2)}</Text>
              </View>
            </View>
          )}
          ListEmptyComponent={
            !loading && (
              <View style={{ padding: 20, alignItems: "center" }}>
                <Text style={{ color: COLORS.muted, fontSize: 16 }}>No expenses yet</Text>
              </View>
            )
          }
          ListFooterComponent={
            <View style={{ gap: 10, marginTop: 20 }}>
              <TouchableOpacity
                style={styles.addExpenseBtn}
                onPress={() => navigation.navigate("AddExpense", { groupId })}
              >
                <Text style={styles.buttonText}>+ Add Expense</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.settleBtn}
                onPress={() => navigation.navigate("SettleUp", { groupId })}
              >
                <Text style={styles.buttonText}>Settle Up</Text>
              </TouchableOpacity>
            </View>
          }
        />
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  title: { 
    fontSize: 24, 
    fontWeight: "700", 
    marginBottom: 12, 
    color: COLORS.text, 
    paddingHorizontal: 8 
  },
  section: { 
    fontSize: 18, 
    fontWeight: "600", 
    marginBottom: 10, 
    color: COLORS.text, 
    paddingHorizontal: 8 
  },
  card: {
    padding: 12,
    borderRadius: 8,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: "#eef6ef",
    marginBottom: 12,
  },
  summary: { 
    fontSize: 16, 
    fontWeight: "600", 
    marginVertical: 8 
  },
  balanceRow: { 
    flexDirection: "row", 
    justifyContent: "space-between", 
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  balanceName: { 
    fontSize: 15, 
    fontWeight: "600",
    color: COLORS.text,
  },
  balanceAmount: { 
    fontSize: 15, 
    fontWeight: "700" 
  },
  settlementRow: { 
    flexDirection: "row", 
    justifyContent: "space-between", 
    alignItems: "center",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  settlementText: { 
    fontSize: 14, 
    fontWeight: "600",
    color: COLORS.text,
    flex: 1,
  },
  settlementArrow: { 
    fontSize: 14, 
    fontWeight: "600",
    color: COLORS.muted,
    marginHorizontal: 8,
  },
  settlementAmount: { 
    fontSize: 14, 
    fontWeight: "700",
    color: COLORS.youOwe,
  },
  memberRow: { 
    flexDirection: "row", 
    justifyContent: "space-between", 
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  memberName: { 
    fontSize: 16, 
    fontWeight: "700", 
    color: COLORS.text 
  },
  memberEmail: { 
    color: COLORS.muted,
    fontSize: 13,
    marginTop: 4,
  },
  role: { 
    fontSize: 16,
  },
  addMemberBtn: {
    marginTop: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: "#f0f9ff",
    borderRadius: 8,
    alignItems: "center",
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  addMemberText: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.primary,
  },
  expenseCard: {
    backgroundColor: COLORS.card,
    padding: 12,
    borderRadius: 8,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#eef6ef",
  },
  expenseTitle: { 
    fontSize: 16, 
    fontWeight: "700",
    color: COLORS.text,
  },
  amount: { 
    fontSize: 16, 
    fontWeight: "700", 
    color: COLORS.youOwe 
  },
  paidBy: { 
    marginTop: 6, 
    color: COLORS.muted,
    fontSize: 14,
  },
  small: { 
    marginTop: 4, 
    color: COLORS.muted, 
    fontSize: 12 
  },
  addExpenseBtn: {
    backgroundColor: COLORS.primary,
    padding: 15,
    borderRadius: 10,
    alignItems: "center",
  },
  settleBtn: {
    backgroundColor: COLORS.youGet,
    padding: 15,
    borderRadius: 10,
    alignItems: "center",
  },
  buttonText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#fff",
  },
});
