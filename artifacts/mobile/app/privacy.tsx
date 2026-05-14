import { ScrollView, Text, View, StyleSheet, Linking, TouchableOpacity } from "react-native";
import { Stack } from "expo-router";

export default function PrivacyPolicy() {
  return (
    <>
      <Stack.Screen options={{ title: "Privacy Policy", headerShown: false }} />
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <Text style={styles.title}>VORTREXYN Bubble Pop</Text>
        <Text style={styles.subtitle}>Privacy Policy</Text>
        <Text style={styles.updated}>Last updated: April 28, 2026</Text>

        <Text style={styles.body}>
          This Privacy Policy describes how VORTREXYN Bubble Pop ("we", "us", or "our")
          collects, uses, and shares information when you use our mobile game.
        </Text>

        <Text style={styles.heading}>Information We Collect</Text>
        <Text style={styles.body}>
          <Text style={styles.bold}>Account information: </Text>
          If you sign in, we collect your email address and display name through Firebase
          Authentication to identify you on the leaderboard.
        </Text>
        <Text style={styles.body}>
          <Text style={styles.bold}>Gameplay data: </Text>
          We store your high scores and game statistics in Firebase Firestore to power the
          global leaderboard.
        </Text>


        <Text style={styles.heading}>How We Use Your Information</Text>
        <Text style={styles.body}>– Display your name and score on the global leaderboard</Text>
        <Text style={styles.body}>– Track your personal best scores</Text>
        <Text style={styles.body}>– Improve app performance and fix bugs</Text>

        <Text style={styles.heading}>Data Sharing</Text>
        <Text style={styles.body}>
          We do not sell your personal information. We use Google Firebase (Auth and
          Firestore) to store and process your data.{" "}
          <Text
            style={styles.link}
            onPress={() =>
              Linking.openURL("https://firebase.google.com/support/privacy")
            }
          >
            Firebase Privacy Policy
          </Text>
        </Text>

        <Text style={styles.heading}>Data Retention</Text>
        <Text style={styles.body}>
          We retain your account and score data for as long as you use the app. You may
          request deletion of your data at any time by contacting us.
        </Text>

        <Text style={styles.heading}>Children's Privacy</Text>
        <Text style={styles.body}>
          VORTREXYN Bubble Pop is not directed at children under the age of 13. We do not
          knowingly collect personal information from children under 13.
        </Text>

        <Text style={styles.heading}>Your Rights</Text>
        <Text style={styles.body}>
          Depending on your location, you may have the right to access, correct, or delete
          your personal data. To exercise these rights, contact us at the email below.
        </Text>

        <Text style={styles.heading}>Changes to This Policy</Text>
        <Text style={styles.body}>
          We may update this Privacy Policy from time to time. We will notify you of any
          significant changes by updating the date at the top of this page.
        </Text>

        <View style={styles.divider} />

        <Text style={styles.heading}>Contact</Text>
        <Text style={styles.body}>For privacy questions or data requests, email us at:</Text>
        <TouchableOpacity
          onPress={() => Linking.openURL("mailto:farhan141549@gmail.com")}
        >
          <Text style={styles.link}>farhan141549@gmail.com</Text>
        </TouchableOpacity>

        <View style={styles.spacer} />
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#070718",
  },
  content: {
    padding: 24,
    paddingTop: 60,
  },
  title: {
    fontSize: 28,
    fontWeight: "800",
    color: "#a78bfa",
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#60a5fa",
    marginBottom: 4,
  },
  updated: {
    fontSize: 13,
    color: "#6b7280",
    marginBottom: 28,
  },
  heading: {
    fontSize: 15,
    fontWeight: "700",
    color: "#a78bfa",
    marginTop: 24,
    marginBottom: 8,
  },
  body: {
    fontSize: 14,
    color: "#c4c4d8",
    lineHeight: 22,
    marginBottom: 8,
  },
  bold: {
    fontWeight: "700",
    color: "#e0e0ff",
  },
  link: {
    color: "#60a5fa",
    fontSize: 14,
  },
  divider: {
    borderTopWidth: 1,
    borderTopColor: "#1e1e3a",
    marginVertical: 32,
  },
  spacer: {
    height: 60,
  },
});
