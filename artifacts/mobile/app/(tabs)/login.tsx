/**
 * login.tsx — Authentication Screen
 *
 * Handles all user authentication flows in a single screen with three modes:
 *
 *   "signin"  — Email + password sign-in. Optional "Remember Me" toggle.
 *               If Remember Me is OFF, a flag is stored in AsyncStorage and
 *               AuthContext signs the user out on the next app start.
 *
 *   "signup"  — Creates a new Firebase account with email, password, and a
 *               display name (shown on the leaderboard). Validates that the
 *               name is >3 chars and the password is >8 chars before submitting.
 *
 *   "forgot"  — Sends a Firebase password reset email. Shows a success/error
 *               message in place and lets the user return to sign-in.
 *
 * Visual features:
 *   - VortexLogo (3 spinning orbital ellipses with a glowing V) in the header
 *   - Space background: static star field + animated floating bubbles
 *   - Card slides in from below on mount (cardAnim)
 *   - SIGN IN button has a sweeping shimmer animation (shimmerAnim)
 *   - Input fields glow cyan on focus
 *   - Firebase error codes are mapped to friendly English messages (formatError)
 */

import { Ionicons } from "@expo/vector-icons";
import {
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  updateProfile,
} from "firebase/auth";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  Easing,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import AsyncStorage from "@react-native-async-storage/async-storage";

import { auth } from "@/lib/firebase";
import { NO_REMEMBER_KEY } from "@/context/AuthContext";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const { width: SW, height: SH } = Dimensions.get("window");

const FLOAT_BUBBLES = [
  { x: 0.06, size: 90,  color: "rgba(0,229,255,0.07)",   speed: 9000,  delay: 0    },
  { x: 0.85, size: 60,  color: "rgba(124,58,237,0.10)",  speed: 11000, delay: 1500 },
  { x: 0.25, size: 110, color: "rgba(255,45,134,0.05)",  speed: 13000, delay: 400  },
  { x: 0.70, size: 75,  color: "rgba(48,209,88,0.06)",   speed: 10000, delay: 2200 },
  { x: 0.48, size: 50,  color: "rgba(10,132,255,0.09)",  speed: 7500,  delay: 900  },
  { x: 0.93, size: 95,  color: "rgba(0,229,255,0.055)",  speed: 14000, delay: 200  },
  { x: 0.14, size: 65,  color: "rgba(124,58,237,0.08)",  speed: 12000, delay: 1900 },
  { x: 0.60, size: 40,  color: "rgba(255,214,10,0.065)", speed: 8500,  delay: 2800 },
  { x: 0.38, size: 80,  color: "rgba(255,45,134,0.045)", speed: 11500, delay: 700  },
];

const STARS = Array.from({ length: 40 }, (_, i) => ({
  x:       (Math.sin(i * 137.5) * 0.5 + 0.5),
  y:       (Math.cos(i * 97.3)  * 0.5 + 0.5),
  size:    1 + (i % 3),
  opacity: 0.2 + (i % 5) * 0.1,
}));

function BubbleLogo({ size = 88 }: { size?: number }) {
  const spinAnim  = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.loop(
      Animated.timing(spinAnim, {
        toValue: 1,
        duration: 7000,
        easing: Easing.linear,
        useNativeDriver: false,
      })
    ).start();
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.07, duration: 2200, easing: Easing.inOut(Easing.ease), useNativeDriver: false }),
        Animated.timing(pulseAnim, { toValue: 1,    duration: 2200, easing: Easing.inOut(Easing.ease), useNativeDriver: false }),
      ])
    ).start();
  }, []);

  const spinInterp = spinAnim.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "360deg"] });

  const s   = size;
  const rW  = s * 0.9;
  const rH  = s * 0.3;
  const rBR = s * 0.15;
  const rBW = Math.max(1.5, s * 0.026);
  const rL  = (s - rW) / 2;
  const rT  = (s - rH) / 2;
  const dot = Math.max(4, s * 0.1);

  return (
    <Animated.View
      style={{
        width: s,
        height: s,
        borderRadius: s / 2,
        alignItems: "center",
        justifyContent: "center",
        transform: [{ scale: pulseAnim }],
        shadowColor: "#00E5FF",
        shadowOffset: { width: 0, height: 0 },
        shadowRadius: s * 0.38,
        shadowOpacity: 0.9,
        elevation: 22,
      }}
    >
      {/* Dark core */}
      <View style={{
        position: "absolute",
        width: s * 0.74, height: s * 0.74,
        borderRadius: s * 0.37,
        backgroundColor: "#02021A",
        top: s * 0.13, left: s * 0.13,
      }} />

      {/* Three spinning orbital ellipses */}
      <Animated.View style={{
        position: "absolute",
        width: s, height: s,
        transform: [{ rotate: spinInterp }],
      }}>
        <View style={{
          position: "absolute",
          width: rW, height: rH, borderRadius: rBR,
          borderWidth: rBW, borderColor: "#00E5FF",
          backgroundColor: "transparent",
          left: rL, top: rT, opacity: 0.9,
        }} />
        <View style={{
          position: "absolute",
          width: rW, height: rH, borderRadius: rBR,
          borderWidth: rBW, borderColor: "#9B5DE5",
          backgroundColor: "transparent",
          left: rL, top: rT, opacity: 0.85,
          transform: [{ rotate: "60deg" }],
        }} />
        <View style={{
          position: "absolute",
          width: rW, height: rH, borderRadius: rBR,
          borderWidth: rBW, borderColor: "#0A84FF",
          backgroundColor: "transparent",
          left: rL, top: rT, opacity: 0.85,
          transform: [{ rotate: "-60deg" }],
        }} />
      </Animated.View>

      {/* Glowing V */}
      <Text style={{
        position: "absolute",
        color: "#00E5FF",
        fontSize: s * 0.44,
        fontWeight: "900",
        letterSpacing: -1,
        textShadowColor: "#00E5FF",
        textShadowOffset: { width: 0, height: 0 },
        textShadowRadius: s * 0.15,
        top: s * 0.21,
        left: 0, right: 0,
        textAlign: "center",
      }}>V</Text>

      {/* Center dot */}
      <View style={{
        position: "absolute",
        width: dot, height: dot,
        borderRadius: dot / 2,
        backgroundColor: "#FFFFFF",
        top: s * 0.555 - dot / 2,
        left: s / 2 - dot / 2,
        shadowColor: "#00E5FF",
        shadowOffset: { width: 0, height: 0 },
        shadowRadius: 6,
        shadowOpacity: 1,
      }} />

      {/* Outer glow ring */}
      <View style={{
        position: "absolute",
        width: s, height: s,
        borderRadius: s / 2,
        borderWidth: 1,
        borderColor: "rgba(0,229,255,0.28)",
      }} />
    </Animated.View>
  );
}

type Mode = "signin" | "signup" | "forgot";

export default function LoginScreen() {
  const insets = useSafeAreaInsets();
  const [mode, setMode] = useState<Mode>("signin");
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const floatAnims  = useRef(FLOAT_BUBBLES.map(() => new Animated.Value(SH + 120))).current;
  const shimmerAnim = useRef(new Animated.Value(-1)).current;
  const cardAnim    = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(cardAnim, { toValue: 1, duration: 700, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start();

    const timers: ReturnType<typeof setTimeout>[] = [];
    const loops = FLOAT_BUBBLES.map((b, i) => {
      const anim = floatAnims[i];
      const loop = Animated.loop(
        Animated.sequence([
          Animated.timing(anim, { toValue: -(b.size + 120), duration: b.speed, easing: Easing.linear, useNativeDriver: false }),
          Animated.timing(anim, { toValue: SH + 120, duration: 0, useNativeDriver: false }),
        ])
      );
      timers.push(setTimeout(() => loop.start(), b.delay));
      return loop;
    });

    Animated.loop(
      Animated.sequence([
        Animated.timing(shimmerAnim, { toValue: 1, duration: 1800, easing: Easing.inOut(Easing.ease), useNativeDriver: false }),
        Animated.delay(2200),
        Animated.timing(shimmerAnim, { toValue: -1, duration: 0, useNativeDriver: false }),
        Animated.delay(800),
      ])
    ).start();

    return () => {
      timers.forEach(clearTimeout);
      loops.forEach((l) => l.stop());
    };
  }, []);

  const shimmerLeft = shimmerAnim.interpolate({ inputRange: [-1, 1], outputRange: ["-100%", "110%"] });
  const cardOpacity = cardAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 1] });
  const cardTranslateY = cardAnim.interpolate({ inputRange: [0, 1], outputRange: [30, 0] });

  const switchMode = (m: Mode) => {
    setMode(m);
    setError("");
    setSuccess("");
    setShowPassword(false);
  };

  const formatError = (code: string) => {
    const map: Record<string, string> = {
      "auth/user-not-found":        "No account found with this email.",
      "auth/wrong-password":        "Incorrect password.",
      "auth/invalid-credential":    "Invalid email or password.",
      "auth/email-already-in-use":  "An account with this email already exists.",
      "auth/weak-password":         "Password must be more than 8 characters.",
      "auth/invalid-email":         "Please enter a valid email address.",
      "auth/too-many-requests":     "Too many attempts. Try again later.",
      "auth/network-request-failed":"Network error. Check your connection.",
    };
    return map[code] ?? "Something went wrong. Please try again.";
  };

  const handleSubmit = async () => {
    setError(""); setSuccess("");
    const trimEmail = email.trim();
    const trimName  = displayName.trim();

    if (mode === "forgot") {
      if (!trimEmail) { setError("Please enter your email address."); return; }
      setLoading(true);
      try {
        await sendPasswordResetEmail(auth, trimEmail);
        setSuccess("Reset link sent! Check your inbox.");
      } catch (e: any) { setError(formatError(e.code)); }
      finally { setLoading(false); }
      return;
    }

    if (!trimEmail || !password) { setError("Please fill in all fields."); return; }
    if (!EMAIL_REGEX.test(trimEmail)) { setError("Please enter a valid email address (e.g. you@example.com)."); return; }
    if (mode === "signup" && trimName.length <= 3) { setError("Display name must be more than 3 characters."); return; }
    if (mode === "signup" && password.length <= 8) { setError("Password must be more than 8 characters."); return; }

    setLoading(true);
    try {
      if (mode === "signin") {
        await signInWithEmailAndPassword(auth, trimEmail, password);
        if (!rememberMe) {
          await AsyncStorage.setItem(NO_REMEMBER_KEY, "true");
        }
      } else {
        const { user } = await createUserWithEmailAndPassword(auth, trimEmail, password);
        await updateProfile(user, { displayName: trimName });
      }
      router.replace("/(tabs)/");
    } catch (e: any) { setError(formatError(e.code)); }
    finally { setLoading(false); }
  };

  const topPad = Platform.OS === "web" ? Math.max(insets.top, 67) : insets.top;
  const botPad = Platform.OS === "web" ? Math.max(insets.bottom, 34) : insets.bottom || 20;

  const inputStyle = (field: string) => [
    styles.input,
    focusedField === field && styles.inputFocused,
  ];

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={["#010108", "#040318", "#080628", "#0C0930"]}
        style={StyleSheet.absoluteFill}
        start={{ x: 0.3, y: 0 }}
        end={{ x: 0.7, y: 1 }}
      />

      {STARS.map((s, i) => (
        <View key={i} style={{
          position: "absolute",
          left: s.x * SW, top: s.y * SH,
          width: s.size, height: s.size,
          borderRadius: s.size / 2,
          backgroundColor: `rgba(255,255,255,${s.opacity})`,
        }} />
      ))}

      {FLOAT_BUBBLES.map((b, i) => (
        <Animated.View key={i} style={{
          position: "absolute",
          left: b.x * SW - b.size / 2,
          top: floatAnims[i],
          width: b.size, height: b.size,
          borderRadius: b.size / 2,
          backgroundColor: b.color,
        }} />
      ))}

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
        <ScrollView
          contentContainerStyle={[styles.scroll, { paddingTop: topPad + 20, paddingBottom: botPad + 20 }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.logoSection}>
            <BubbleLogo size={88} />
            <Text style={styles.brand}>VORTREXYN</Text>
            <View style={styles.titleRow}>
              <View style={styles.titleLine} />
              <Text style={styles.gameTitle}>BUBBLE POP</Text>
              <View style={styles.titleLine} />
            </View>
            <Text style={styles.tagline}>Pop. Score. Dominate.</Text>
          </View>

          <Animated.View style={[styles.cardWrapper, { opacity: cardOpacity, transform: [{ translateY: cardTranslateY }] }]}>
            <LinearGradient
              colors={["rgba(0,229,255,0.25)", "rgba(124,58,237,0.12)", "rgba(0,0,0,0)"]}
              style={styles.cardBorder}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            />
            <View style={styles.card}>
              {mode !== "forgot" ? (
                <View style={styles.modeToggle}>
                  {(["signin", "signup"] as Mode[]).map((m) => (
                    <TouchableOpacity
                      key={m}
                      style={[styles.modeBtn, mode === m && styles.modeBtnActive]}
                      onPress={() => switchMode(m)}
                    >
                      {mode === m && (
                        <LinearGradient
                          colors={["rgba(0,229,255,0.18)", "rgba(124,58,237,0.12)"]}
                          style={StyleSheet.absoluteFill}
                          borderRadius={12}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 1 }}
                        />
                      )}
                      <Text style={[styles.modeBtnText, mode === m && styles.modeBtnTextActive]}>
                        {m === "signin" ? "SIGN IN" : "SIGN UP"}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              ) : (
                <View style={styles.forgotHeader}>
                  <TouchableOpacity onPress={() => switchMode("signin")} style={styles.backBtn}>
                    <LinearGradient colors={["rgba(0,229,255,0.15)", "rgba(0,229,255,0.05)"]} style={StyleSheet.absoluteFill} borderRadius={10} />
                    <Ionicons name="arrow-back" size={17} color="#00E5FF" />
                  </TouchableOpacity>
                  <Text style={styles.forgotTitle}>RESET PASSWORD</Text>
                </View>
              )}

              {mode === "signup" && (
                <View style={styles.fieldGroup}>
                  <Text style={styles.fieldLabel}>Display Name</Text>
                  <TextInput
                    style={inputStyle("displayName")}
                    placeholder="Your in-game name"
                    placeholderTextColor="rgba(80,80,140,0.8)"
                    value={displayName}
                    onChangeText={setDisplayName}
                    onFocus={() => setFocusedField("displayName")}
                    onBlur={() => setFocusedField(null)}
                    autoCapitalize="words"
                    maxLength={24}
                  />
                </View>
              )}

              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>Email</Text>
                <TextInput
                  style={inputStyle("email")}
                  placeholder="you@example.com"
                  placeholderTextColor="rgba(80,80,140,0.8)"
                  value={email}
                  onChangeText={setEmail}
                  onFocus={() => setFocusedField("email")}
                  onBlur={() => setFocusedField(null)}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>

              {mode !== "forgot" && (
                <View style={styles.fieldGroup}>
                  <Text style={styles.fieldLabel}>Password</Text>
                  <View style={styles.passwordRow}>
                    <TextInput
                      style={[inputStyle("password"), styles.passwordInput]}
                      placeholder={mode === "signup" ? "More than 8 characters" : "Your password"}
                      placeholderTextColor="rgba(80,80,140,0.8)"
                      value={password}
                      onChangeText={setPassword}
                      onFocus={() => setFocusedField("password")}
                      onBlur={() => setFocusedField(null)}
                      secureTextEntry={!showPassword}
                    />
                    {focusedField === "password" && (
                      <View style={styles.focusGlow} pointerEvents="none" />
                    )}
                    <TouchableOpacity style={styles.eyeBtn} onPress={() => setShowPassword(!showPassword)}>
                      <Ionicons name={showPassword ? "eye-off" : "eye"} size={19} color={focusedField === "password" ? "#00E5FF" : "rgba(80,80,160,0.9)"} />
                    </TouchableOpacity>
                  </View>
                </View>
              )}

              {mode === "forgot" && (
                <Text style={styles.forgotHint}>
                  Enter your email and we'll send you a link to reset your password.
                </Text>
              )}

              {mode === "signin" && (
                <TouchableOpacity
                  style={styles.rememberRow}
                  onPress={() => setRememberMe(!rememberMe)}
                  activeOpacity={0.7}
                >
                  <View style={[styles.checkbox, rememberMe && styles.checkboxActive]}>
                    {rememberMe && (
                      <Ionicons name="checkmark" size={13} color="#000" />
                    )}
                  </View>
                  <Text style={styles.rememberText}>Remember me</Text>
                </TouchableOpacity>
              )}

              {!!error && (
                <View style={styles.errorBox}>
                  <Ionicons name="alert-circle" size={15} color="#FF453A" style={{ marginRight: 6 }} />
                  <Text style={styles.errorText}>{error}</Text>
                </View>
              )}
              {!!success && (
                <View style={styles.successBox}>
                  <Ionicons name="checkmark-circle" size={15} color="#30D158" style={{ marginRight: 6 }} />
                  <Text style={styles.successText}>{success}</Text>
                </View>
              )}

              <TouchableOpacity
                style={styles.submitBtn}
                onPress={handleSubmit}
                disabled={loading}
                activeOpacity={0.88}
              >
                <LinearGradient
                  colors={["#00BFFF", "#0099EE", "#0066CC"]}
                  style={StyleSheet.absoluteFill}
                  borderRadius={16}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                />
                <Animated.View style={[styles.shimmer, { left: shimmerLeft }]} />
                {loading
                  ? <ActivityIndicator color="#fff" />
                  : <Text style={styles.submitText}>
                      {mode === "signin" ? "SIGN IN" : mode === "signup" ? "CREATE ACCOUNT" : "SEND RESET LINK"}
                    </Text>
                }
              </TouchableOpacity>

              {mode === "signin" && (
                <TouchableOpacity style={styles.forgotLink} onPress={() => switchMode("forgot")}>
                  <Text style={styles.forgotLinkText}>Forgot your password?</Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity
                style={styles.guestLink}
                onPress={() => router.replace({ pathname: "/(tabs)/", params: { guest: "1" } })}
                activeOpacity={0.7}
              >
                <Text style={styles.guestLinkText}>Continue as Guest</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: 22,
    justifyContent: "center",
  },

  logoSection: {
    alignItems: "center",
    marginBottom: 28,
  },
  brand: {
    fontSize: 10,
    fontWeight: "900",
    color: "#00E5FF",
    letterSpacing: 7,
    marginTop: 6,
    marginBottom: 8,
    opacity: 0.9,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 8,
  },
  titleLine: {
    flex: 1,
    height: 1,
    backgroundColor: "rgba(0,229,255,0.15)",
    maxWidth: 40,
  },
  gameTitle: {
    fontSize: 28,
    fontWeight: "900",
    color: "#FFFFFF",
    letterSpacing: 5,
    textShadowColor: "rgba(0,229,255,0.5)",
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 18,
  },
  tagline: {
    color: "rgba(80,80,150,0.9)",
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: 3,
  },

  cardWrapper: {
    position: "relative",
    borderRadius: 28,
  },
  cardBorder: {
    position: "absolute",
    inset: -1,
    borderRadius: 29,
    padding: 1,
  },
  card: {
    backgroundColor: "rgba(6,8,30,0.92)",
    borderRadius: 28,
    padding: 22,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
    overflow: "hidden",
  },

  modeToggle: {
    flexDirection: "row",
    backgroundColor: "rgba(255,255,255,0.03)",
    borderRadius: 14,
    padding: 4,
    marginBottom: 22,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
    gap: 4,
  },
  modeBtn: {
    flex: 1,
    paddingVertical: 11,
    borderRadius: 12,
    alignItems: "center",
    overflow: "hidden",
  },
  modeBtnActive: {
    borderWidth: 1,
    borderColor: "rgba(0,229,255,0.35)",
  },
  modeBtnText: {
    color: "rgba(80,80,160,0.9)",
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 1.5,
  },
  modeBtnTextActive: { color: "#00E5FF" },

  forgotHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 18,
  },
  backBtn: {
    width: 36, height: 36, borderRadius: 10,
    alignItems: "center", justifyContent: "center",
    overflow: "hidden",
    borderWidth: 1, borderColor: "rgba(0,229,255,0.2)",
  },
  forgotTitle: {
    color: "#00E5FF",
    fontSize: 13,
    fontWeight: "900",
    letterSpacing: 2.5,
  },
  forgotHint: {
    color: "rgba(80,80,150,0.9)",
    fontSize: 13,
    lineHeight: 20,
    marginBottom: 20,
  },

  fieldGroup: { marginBottom: 16 },
  fieldLabel: {
    color: "rgba(0,229,255,0.7)",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 2.5,
    textTransform: "uppercase",
    marginBottom: 8,
  },
  input: {
    backgroundColor: "rgba(255,255,255,0.035)",
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 15,
    color: "#E8E8FF",
    fontSize: 15,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.07)",
  },
  inputFocused: {
    borderColor: "rgba(0,229,255,0.55)",
    backgroundColor: "rgba(0,229,255,0.04)",
    shadowColor: "#00E5FF",
    shadowOffset: { width: 0, height: 0 },
    shadowRadius: 12,
    shadowOpacity: 0.35,
    elevation: 4,
  },
  passwordRow: {
    position: "relative",
    justifyContent: "center",
  },
  passwordInput: { paddingRight: 50 },
  focusGlow: {
    position: "absolute",
    inset: 0, borderRadius: 14,
    borderWidth: 1, borderColor: "rgba(0,229,255,0.55)",
    shadowColor: "#00E5FF", shadowRadius: 12, shadowOpacity: 0.35, shadowOffset: { width: 0, height: 0 },
  },
  eyeBtn: {
    position: "absolute", right: 14,
    top: 0, bottom: 0,
    justifyContent: "center", paddingHorizontal: 4,
  },

  errorBox: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: "rgba(255,69,58,0.1)",
    borderRadius: 12, padding: 12, marginBottom: 14,
    borderWidth: 1, borderColor: "rgba(255,69,58,0.25)",
  },
  errorText: {
    color: "#FF453A", fontSize: 13, fontWeight: "600", flex: 1,
  },
  successBox: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: "rgba(48,209,88,0.1)",
    borderRadius: 12, padding: 12, marginBottom: 14,
    borderWidth: 1, borderColor: "rgba(48,209,88,0.28)",
  },
  successText: {
    color: "#30D158", fontSize: 13, fontWeight: "600", flex: 1,
  },

  submitBtn: {
    height: 56, borderRadius: 16,
    alignItems: "center", justifyContent: "center",
    overflow: "hidden",
    shadowColor: "#00BFFF",
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 20, shadowOpacity: 0.55, elevation: 14,
    marginTop: 4,
  },
  shimmer: {
    position: "absolute",
    top: 0, bottom: 0,
    width: "35%",
    backgroundColor: "rgba(255,255,255,0.18)",
    transform: [{ skewX: "-20deg" }],
  },
  submitText: {
    color: "#fff",
    fontSize: 14, fontWeight: "900", letterSpacing: 2.5,
    textShadowColor: "rgba(0,0,0,0.3)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },

  rememberRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 18,
    marginTop: 4,
  },
  checkbox: {
    width: 22, height: 22, borderRadius: 6,
    borderWidth: 1.5, borderColor: "rgba(255,255,255,0.15)",
    backgroundColor: "rgba(255,255,255,0.04)",
    alignItems: "center", justifyContent: "center",
  },
  checkboxActive: {
    backgroundColor: "#00E5FF",
    borderColor: "#00E5FF",
  },
  rememberText: {
    color: "rgba(140,140,200,0.9)",
    fontSize: 13,
    fontWeight: "600",
  },

  forgotLink: {
    marginTop: 18, alignItems: "center",
  },
  forgotLinkText: {
    color: "rgba(80,80,160,0.9)",
    fontSize: 13, fontWeight: "600",
  },
  guestLink: {
    marginTop: 24,
    alignItems: "center",
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(0,229,255,0.2)",
    backgroundColor: "rgba(0,229,255,0.05)",
  },
  guestLinkText: {
    color: "#00E5FF",
    fontSize: 15,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
});
