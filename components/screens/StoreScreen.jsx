import React from "react";
import { View, Text, StyleSheet, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import PressableScale from "../PressableScale";
import { COLORS, RADIUS, FONTS, clay } from "../../constants/theme";

const ITEMS = [
  { icon: "shirt", name: "LYC T-Shirt", cost: 1200, color: COLORS.purpleLight },
  { icon: "cafe", name: "Coffee Card", cost: 600, color: COLORS.goldDark },
  { icon: "headset", name: "Earbuds", cost: 3500, color: COLORS.pink },
  { icon: "book", name: "Career Guide", cost: 400, color: COLORS.greenDark },
  { icon: "ticket", name: "Movie Ticket", cost: 900, color: COLORS.red },
  { icon: "gift", name: "Mystery Box", cost: 2000, color: COLORS.purple },
];

export default function StoreScreen() {
  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        {/* Balance header */}
        <View style={styles.header}>
          <Text style={styles.title}>Store</Text>

          <View style={styles.balances}>
            <View style={styles.balanceChip}>
              <Ionicons name="diamond" size={18} color={COLORS.purpleLight} />
              <Text style={styles.balanceText}>860</Text>
            </View>
            <View style={styles.balanceChip}>
              <Ionicons name="star" size={18} color={COLORS.goldDark} />
              <Text style={styles.balanceText}>60 pts</Text>
            </View>
          </View>
        </View>

        {/* Item grid */}
        <View style={styles.grid}>
          {ITEMS.map((item) => (
            <View key={item.name} style={styles.card}>
              <View style={[styles.iconWrap, { backgroundColor: item.color }]}>
                <Ionicons name={item.icon} size={38} color={COLORS.white} />
              </View>
              <Text style={styles.itemName}>{item.name}</Text>

              <PressableScale style={styles.redeemButton} onPress={() => {}}>
                <Ionicons name="diamond" size={14} color={COLORS.ink} />
                <Text style={styles.redeemText}>{item.cost}</Text>
              </PressableScale>
            </View>
          ))}
        </View>

        <Text style={styles.footnote}>
          Earn diamonds by completing daily missions and keeping your streak
          alive.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },

  container: {
    flex: 1,
  },

  header: {
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 6,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  title: {
    fontSize: 40,
    fontFamily: FONTS.heading,
    color: COLORS.ink,
  },

  balances: {
    gap: 8,
  },

  balanceChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: COLORS.card,
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: RADIUS.md,
    ...clay("#000", 3),
  },

  balanceText: {
    fontFamily: FONTS.heading,
    fontSize: 15,
    color: COLORS.ink,
  },

  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: 14,
    paddingTop: 12,
    justifyContent: "space-between",
  },

  card: {
    width: "47.5%",
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.lg,
    padding: 16,
    alignItems: "center",
    marginBottom: 16,
    ...clay("#000", 5),
  },

  iconWrap: {
    width: 74,
    height: 74,
    borderRadius: RADIUS.lg,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
    transform: [{ rotate: "-4deg" }],
  },

  itemName: {
    fontWeight: "800",
    fontSize: 16,
    color: COLORS.ink,
    marginBottom: 12,
    textAlign: "center",
  },

  redeemButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: COLORS.gold,
    paddingVertical: 9,
    paddingHorizontal: 20,
    borderRadius: RADIUS.md,
    ...clay(COLORS.goldDark, 3),
  },

  redeemText: {
    fontFamily: FONTS.heading,
    fontSize: 15,
    color: COLORS.ink,
  },

  footnote: {
    textAlign: "center",
    color: COLORS.muted,
    fontSize: 13,
    marginHorizontal: 40,
    marginBottom: 30,
    lineHeight: 19,
  },
});
