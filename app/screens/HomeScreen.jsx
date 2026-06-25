import React from "react";
import {
  SafeAreaView,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from "react-native";

export default function HomeScreen() {
  return (
    <SafeAreaView style={styles.container}>
      {/* HEADER */}
      <View style={styles.header}>
        <View>
          <Text style={styles.goodMorning}>Good Morning</Text>
          <Text style={styles.username}>Name</Text>
        </View>

        <View style={styles.streakCard}>
          <Text style={styles.fire}>🔥</Text>
          <Text style={styles.streakDays}>7 Days</Text>
        </View>
      </View>

      {/* MISSION CARD */}
      <View style={styles.missionOuter}>
        <View style={styles.missionInner}>
          <Text style={styles.missionTitle}>Today's Mission</Text>

          <Text style={styles.question}>
            Which planet is known as the Red Planet?
          </Text>

          <Text style={styles.countdown}>
            ⏰ Ends in 14h 22m
          </Text>

          <TouchableOpacity style={styles.startButton}>
            <Text style={styles.startText}>Start Mission</Text>
            <Text style={styles.buttonFire}>🔥</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* RANKING CARD */}
      <View style={styles.rankCard}>
        <Text style={styles.rankTitle}>Your Ranking</Text>

        <View style={styles.rankRow}>
          <Text style={styles.rankNumber}>#22</Text>

          <View>
            <Text style={styles.rankInfo}>
              in the state • 50 pts
            </Text>
          </View>
        </View>

        <View style={styles.progressBackground}>
          <View style={styles.progressFill} />
        </View>

        <Text style={styles.rankMessage}>
          15 pts away from Top 20
        </Text>
      </View>


      {/* BOTTOM NAV */}
      <View style={styles.bottomNav}>
        <View style={styles.activeTab}>
          <Text style={styles.navIcon}>🏠</Text>
          <Text style={styles.activeLabel}>Home</Text>
        </View>

        <View style={styles.navTab}>
          <Text style={styles.navIcon}>🏆</Text>
          <Text style={styles.navLabel}>Rank</Text>
        </View>

        <View style={styles.navTab}>
          <Text style={styles.navIcon}>🛍️</Text>
          <Text style={styles.navLabel}>Store</Text>
        </View>

        <View style={styles.navTab}>
          <Text style={styles.navIcon}>👤</Text>
          <Text style={styles.navLabel}>Profile</Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const PURPLE = "#8A00E6";
const GREEN = "#52F04A";
const GOLD = "#FFD93D";
const PINK = "#C70F52";

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8F8F8",
  },

  header: {
    backgroundColor: PURPLE,
    margin: 12,
    padding: 20,
    borderRadius: 25,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",

    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 12,
  },

  goodMorning: {
    color: GOLD,
    fontSize: 24,
    fontStyle: "italic",
  },

  username: {
    color: "#fff",
    fontSize: 58,
    fontWeight: "900",
  },

  streakCard: {
    width: 110,
    height: 110,
    backgroundColor: GOLD,
    borderRadius: 30,
    justifyContent: "center",
    alignItems: "center",
  },

  fire: {
    fontSize: 28,
  },

  streakNumber: {
    fontSize: 28,
    fontWeight: "bold",
  },

  streakDays: {
    fontSize: 18,
    fontWeight: "bold",
  },

  missionOuter: {
    backgroundColor: "#119600",
    marginHorizontal: 20,
    marginTop: 15,
    borderRadius: 30,
    padding: 14,

    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 12,
  },

  missionInner: {
    backgroundColor: GREEN,
    borderRadius: 20,
    padding: 20,
  },

  missionTitle: {
    color: "#fff",
    fontSize: 36,
    fontWeight: "900",
    textAlign: "center",
    marginBottom: 15,
  },

  question: {
    color: "#fff",
    fontSize: 18,
    textAlign: "center",
    marginBottom: 10,
    fontWeight: "600",
  },

  countdown: {
    textAlign: "center",
    marginBottom: 20,
    color: "#fff",
    fontWeight: "700",
  },

  startButton: {
    backgroundColor: GOLD,
    borderRadius: 20,
    paddingVertical: 18,
    paddingHorizontal: 25,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",

    shadowColor: "#000",
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.25,
    shadowRadius: 5,
    elevation: 8,
  },

  startText: {
    fontSize: 24,
    fontWeight: "900",
    color: "#000",
  },

  buttonFire: {
    fontSize: 34,
  },

  rankCard: {
    backgroundColor: PINK,
    marginHorizontal: 20,
    marginTop: 25,
    borderRadius: 30,
    padding: 20,

    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 12,
  },

  rankTitle: {
    color: "#fff",
    textAlign: "center",
    fontSize: 28,
    fontWeight: "900",
    marginBottom: 10,
  },

  rankRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 15,
  },

  rankNumber: {
    color: "#fff",
    fontSize: 72,
    fontWeight: "900",
    marginRight: 15,
  },

  rankInfo: {
    color: "#fff",
    fontSize: 22,
    fontWeight: "700",
  },

  progressBackground: {
    backgroundColor: "#E5E5E5",
    height: 24,
    borderRadius: 30,
    overflow: "hidden",
    marginBottom: 10,
  },

  progressFill: {
    width: "72%",
    height: "100%",
    backgroundColor: GREEN,
    borderRadius: 30,
  },

  rankMessage: {
    textAlign: "center",
    color: "#fff",
    fontWeight: "800",
    fontSize: 18,
  },

  prizeCard: {
    backgroundColor: GOLD,
    marginHorizontal: 20,
    marginTop: 20,
    borderRadius: 25,
    padding: 20,
  },

  prizeTitle: {
    fontSize: 20,
    fontWeight: "800",
  },

  prizeAmount: {
    fontSize: 42,
    fontWeight: "900",
    marginVertical: 8,
  },

  prizeText: {
    fontSize: 15,
    lineHeight: 22,
  },

  bottomNav: {
    marginTop: "auto",
    flexDirection: "row",
    height: 75,
    backgroundColor: "#EAEAEA",
  },

  activeTab: {
    flex: 1,
    backgroundColor: PURPLE,
    justifyContent: "center",
    alignItems: "center",
  },

  navTab: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },

  navIcon: {
    fontSize: 22,
  },

  activeLabel: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 16,
  },

  navLabel: {
    color: "#666",
    fontWeight: "bold",
    fontSize: 16,
  },
});
