import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from "react-native";

import {
  Ionicons,
  MaterialCommunityIcons,
  FontAwesome5,
} from "@expo/vector-icons";

export default function LeaderboardScreen() {
  return (
    <ScrollView style={styles.container}>

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Leaderboard</Text>

        <View style={styles.filterContainer}>
          <TouchableOpacity style={styles.filterBtn}>
            <Text style={styles.filterText}>My State</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.filterBtn}>
            <Text style={styles.filterText}>My City</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.filterBtn}>
            <Text style={styles.filterText}>My School</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Podium */}
      <View style={styles.podiumRow}>

        <View style={[styles.podiumCard, styles.silver]}>
          <Text style={styles.medal}>🥈</Text>
          <View style={styles.avatar} />
          <Text style={styles.name}>Full Name</Text>
          <Text>School</Text>

          <Text style={styles.stat}>🔥 20 Day Streak</Text>
          <Text style={styles.stat}>💎 2000 XP</Text>
        </View>

        <View style={[styles.podiumCard, styles.gold]}>
          <Text style={styles.medal}>🥇</Text>
          <View style={styles.avatar} />
          <Text style={styles.name}>Full Name</Text>
          <Text>School</Text>

          <Text style={styles.stat}>🔥 30 Day Streak</Text>
          <Text style={styles.stat}>💎 3200 XP</Text>
        </View>

        <View style={[styles.podiumCard, styles.bronze]}>
          <Text style={styles.medal}>🥉</Text>
          <View style={styles.avatar} />
          <Text style={styles.name}>Full Name</Text>
          <Text>School</Text>

          <Text style={styles.stat}>🔥 15 Day Streak</Text>
          <Text style={styles.stat}>💎 1000 XP</Text>
        </View>

      </View>

      {/* Rankings */}
      <View style={styles.rankContainer}>
        {[4, 5, 6, 7].map((rank) => (
          <View key={rank} style={styles.rankRow}>
            <Text style={styles.rankNumber}>{rank}</Text>

            <View style={styles.smallAvatar} />

            <View style={{ flex: 1 }}>
              <Text style={styles.rankName}>Full Name</Text>
              <Text>School</Text>
            </View>

            <Text>🔥 10</Text>
            <Text>💎 860</Text>

            <Text style={styles.points}>
              380 pts
            </Text>
          </View>
        ))}
      </View>

      {/* User Card */}
      <View style={styles.userCard}>
        <View>
          <Text style={styles.userRank}>
            #21 Alexandrina B.
          </Text>

          <Text>
            Mount Prospect, IL
          </Text>
        </View>

        <Text style={styles.userPoints}>
          60 pts
        </Text>
      </View>

      <TouchableOpacity>
        <Text style={styles.fullBoard}>
          View Full Leaderboard
        </Text>
      </TouchableOpacity>

      {/* Bottom Cards */}
      <View style={styles.statsRow}>

        <View style={styles.redCard}>
          <Text style={styles.bigIcon}>🔥</Text>

          <View>
            <Text style={styles.bigNumber}>
              8
            </Text>

            <Text style={styles.white}>
              Day Streak
            </Text>

            <Text style={styles.white}>
              x0.2
            </Text>
          </View>
        </View>

        <View style={styles.redCard}>
          <Text style={styles.bigNumber}>
            5
          </Text>

          <View>
            <Text style={styles.white}>
              to beat
            </Text>

            <Text style={styles.whiteBold}>
              Amy D.
            </Text>

            <Text style={styles.white}>
              (#20)
            </Text>
          </View>
        </View>

      </View>

    </ScrollView>
  );
}

const PURPLE = "#7B4DFF";

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },

  header: {
    backgroundColor: PURPLE,
    paddingTop: 70,
    paddingBottom: 35,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 40,
    borderBottomRightRadius: 40,
  },

  title: {
    color: "#fff",
    fontSize: 40,
    fontWeight: "bold",
    marginBottom: 20,
  },

  filterContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
  },

  filterBtn: {
    backgroundColor: "#5E31E6",
    paddingVertical: 12,
    paddingHorizontal: 15,
    borderRadius: 15,
  },

  filterText: {
    color: "white",
    fontWeight: "700",
  },

  podiumRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginTop: 25,
    paddingHorizontal: 10,
  },

  podiumCard: {
    width: 110,
    borderRadius: 25,
    padding: 12,
    alignItems: "center",
  },

  silver: {
    backgroundColor: "#E8E8E8",
  },

  gold: {
    backgroundColor: "#FFD84D",
  },

  bronze: {
    backgroundColor: "#FFC48A",
  },

  medal: {
    fontSize: 35,
  },

  avatar: {
    width: 65,
    height: 65,
    borderRadius: 32,
    backgroundColor: "#fff",
    marginVertical: 10,
  },

  name: {
    fontWeight: "bold",
    fontSize: 16,
  },

  stat: {
    marginTop: 8,
  },

  rankContainer: {
    margin: 20,
    backgroundColor: "#fff",
    borderRadius: 25,
    padding: 10,
    elevation: 5,
  },

  rankRow: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 12,
  },

  rankNumber: {
    fontSize: 28,
    fontWeight: "bold",
    width: 40,
  },

  smallAvatar: {
    width: 45,
    height: 45,
    borderRadius: 25,
    backgroundColor: "#000",
    marginHorizontal: 10,
  },

  rankName: {
    fontWeight: "bold",
  },

  points: {
    fontWeight: "bold",
    marginLeft: 10,
  },

  userCard: {
    backgroundColor: "#DDB9FF",
    marginHorizontal: 20,
    borderRadius: 25,
    padding: 20,
    flexDirection: "row",
    justifyContent: "space-between",
  },

  userRank: {
    color: "#B00000",
    fontSize: 26,
    fontWeight: "bold",
  },

  userPoints: {
    color: PURPLE,
    fontWeight: "bold",
    fontSize: 36,
  },

  fullBoard: {
    color: PURPLE,
    textAlign: "center",
    fontSize: 22,
    fontWeight: "bold",
    marginVertical: 20,
  },

  statsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    marginBottom: 40,
  },

  redCard: {
    backgroundColor: "#D90429",
    width: "48%",
    borderRadius: 25,
    padding: 15,
    flexDirection: "row",
    alignItems: "center",
  },

  bigIcon: {
    fontSize: 50,
    marginRight: 10,
  },

  bigNumber: {
    fontSize: 40,
    fontWeight: "bold",
    color: "#fff",
  },

  white: {
    color: "#fff",
  },

  whiteBold: {
    color: "#fff",
    fontWeight: "bold",
  },
});