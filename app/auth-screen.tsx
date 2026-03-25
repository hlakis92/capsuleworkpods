import { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  Animated,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@/contexts/AuthContext';
import { AnimatedPressable } from '@/components/AnimatedPressable';
import { Mail, Lock, User, Eye, EyeOff, ChevronDown } from 'lucide-react-native';

export default function AuthScreen() {
  const { user, loading, signInWithEmail, signUpWithEmail, signInWithApple, signInWithGoogle } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [emailExpanded, setEmailExpanded] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const emailHeight = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }).start();
  }, [fadeAnim]);

  useEffect(() => {
    if (!loading && user) {
      console.log('[AuthScreen] User already signed in, redirecting to tabs');
      router.replace('/(tabs)');
    }
  }, [user, loading, router]);

  const toggleEmail = () => {
    const toValue = emailExpanded ? 0 : mode === 'signup' ? 220 : 160;
    setEmailExpanded(!emailExpanded);
    Animated.spring(emailHeight, { toValue, useNativeDriver: false, speed: 14, bounciness: 4 }).start();
    console.log('[AuthScreen] Email form toggled:', !emailExpanded);
  };

  const handleEmailAuth = async () => {
    if (!email || !password) {
      setError('Please fill in all fields');
      return;
    }
    setError('');
    setSubmitting(true);
    console.log(`[AuthScreen] ${mode} with email:`, email);
    try {
      if (mode === 'signup') {
        await signUpWithEmail(email, password, name);
      } else {
        await signInWithEmail(email, password);
      }
    } catch (e: unknown) {
      const err = e as { message?: string };
      console.error('[AuthScreen] Email auth error:', e);
      setError(err?.message || 'Authentication failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleApple = async () => {
    console.log('[AuthScreen] Apple sign in pressed');
    setError('');
    try {
      await signInWithApple();
    } catch (e: unknown) {
      const err = e as { message?: string };
      if (!String(err?.message).includes('cancel')) {
        setError(err?.message || 'Apple sign in failed');
      }
    }
  };

  const handleGoogle = async () => {
    console.log('[AuthScreen] Google sign in pressed');
    setError('');
    try {
      await signInWithGoogle();
    } catch (e: unknown) {
      const err = e as { message?: string };
      if (!String(err?.message).includes('cancel')) {
        setError(err?.message || 'Google sign in failed');
      }
    }
  };

  const switchMode = () => {
    const newMode = mode === 'signin' ? 'signup' : 'signin';
    setMode(newMode);
    console.log('[AuthScreen] Switched to mode:', newMode);
    if (emailExpanded) {
      const toValue = newMode === 'signup' ? 220 : 160;
      Animated.spring(emailHeight, { toValue, useNativeDriver: false, speed: 14, bounciness: 4 }).start();
    }
    setError('');
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <LinearGradient
        colors={['#1A56DB', '#0F2D6B', '#060E24']}
        style={{ flex: 1 }}
        start={{ x: 0.2, y: 0 }}
        end={{ x: 0.8, y: 1 }}
      >
        <ScrollView
          contentContainerStyle={{
            flexGrow: 1,
            paddingTop: insets.top + 60,
            paddingBottom: insets.bottom + 40,
            paddingHorizontal: 24,
          }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Animated.View style={{ opacity: fadeAnim, gap: 8, marginBottom: 56 }}>
            {/* Logo */}
            <View
              style={{
                width: 64,
                height: 64,
                borderRadius: 18,
                backgroundColor: 'rgba(255,255,255,0.15)',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 8,
                borderWidth: 1,
                borderColor: 'rgba(255,255,255,0.2)',
              }}
            >
              <Text style={{ fontSize: 28, fontWeight: '800', color: '#FFFFFF', fontFamily: 'DMSans_700Bold', letterSpacing: -1 }}>
                C
              </Text>
            </View>
            <Text
              style={{
                fontSize: 36,
                fontWeight: '800',
                color: '#FFFFFF',
                fontFamily: 'DMSans_700Bold',
                letterSpacing: -1,
              }}
            >
              Capsule
            </Text>
            <Text
              style={{
                fontSize: 17,
                color: 'rgba(255,255,255,0.65)',
                fontFamily: 'DMSans_400Regular',
                lineHeight: 24,
              }}
            >
              Your private space, anywhere.
            </Text>
          </Animated.View>

          <Animated.View style={{ opacity: fadeAnim, gap: 12 }}>
            {/* Apple Sign In — FIRST per App Store requirement */}
            <AnimatedPressable
              onPress={handleApple}
              style={{
                backgroundColor: '#FFFFFF',
                borderRadius: 14,
                paddingVertical: 16,
                paddingHorizontal: 20,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 10,
              }}
            >
              <Text style={{ fontSize: 18, lineHeight: 22 }}>🍎</Text>
              <Text
                style={{
                  fontSize: 16,
                  fontWeight: '600',
                  color: '#0D1117',
                  fontFamily: 'DMSans_600SemiBold',
                }}
              >
                Continue with Apple
              </Text>
            </AnimatedPressable>

            {/* Google Sign In */}
            <AnimatedPressable
              onPress={handleGoogle}
              style={{
                backgroundColor: 'transparent',
                borderRadius: 14,
                paddingVertical: 16,
                paddingHorizontal: 20,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 10,
                borderWidth: 1.5,
                borderColor: 'rgba(255,255,255,0.35)',
              }}
            >
              <Text style={{ fontSize: 18, lineHeight: 22 }}>G</Text>
              <Text
                style={{
                  fontSize: 16,
                  fontWeight: '600',
                  color: '#FFFFFF',
                  fontFamily: 'DMSans_600SemiBold',
                }}
              >
                Continue with Google
              </Text>
            </AnimatedPressable>

            {/* Divider */}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginVertical: 4 }}>
              <View style={{ flex: 1, height: 1, backgroundColor: 'rgba(255,255,255,0.2)' }} />
              <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13, fontFamily: 'DMSans_400Regular' }}>
                or
              </Text>
              <View style={{ flex: 1, height: 1, backgroundColor: 'rgba(255,255,255,0.2)' }} />
            </View>

            {/* Email toggle */}
            <AnimatedPressable
              onPress={toggleEmail}
              style={{
                backgroundColor: 'rgba(255,255,255,0.1)',
                borderRadius: 14,
                paddingVertical: 16,
                paddingHorizontal: 20,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                borderWidth: 1,
                borderColor: 'rgba(255,255,255,0.15)',
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <Mail size={20} color="rgba(255,255,255,0.8)" />
                <Text
                  style={{
                    fontSize: 16,
                    fontWeight: '600',
                    color: '#FFFFFF',
                    fontFamily: 'DMSans_600SemiBold',
                  }}
                >
                  Continue with Email
                </Text>
              </View>
              <Animated.View
                style={{
                  transform: [
                    {
                      rotate: emailExpanded ? '180deg' : '0deg',
                    },
                  ],
                }}
              >
                <ChevronDown size={18} color="rgba(255,255,255,0.6)" />
              </Animated.View>
            </AnimatedPressable>

            {/* Email form */}
            <Animated.View style={{ height: emailHeight, overflow: 'hidden' }}>
              <View style={{ gap: 10, paddingTop: 4 }}>
                {mode === 'signup' && (
                  <View style={{ gap: 6 }}>
                    <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13, fontFamily: 'DMSans_500Medium' }}>
                      Full name
                    </Text>
                    <View
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        backgroundColor: 'rgba(255,255,255,0.1)',
                        borderRadius: 12,
                        paddingHorizontal: 14,
                        borderWidth: 1,
                        borderColor: 'rgba(255,255,255,0.15)',
                        gap: 10,
                      }}
                    >
                      <User size={18} color="rgba(255,255,255,0.5)" />
                      <TextInput
                        value={name}
                        onChangeText={setName}
                        placeholder="Your name"
                        placeholderTextColor="rgba(255,255,255,0.35)"
                        style={{
                          flex: 1,
                          paddingVertical: 14,
                          color: '#FFFFFF',
                          fontSize: 15,
                          fontFamily: 'DMSans_400Regular',
                        }}
                        autoCapitalize="words"
                      />
                    </View>
                  </View>
                )}

                <View style={{ gap: 6 }}>
                  <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13, fontFamily: 'DMSans_500Medium' }}>
                    Email address
                  </Text>
                  <View
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      backgroundColor: 'rgba(255,255,255,0.1)',
                      borderRadius: 12,
                      paddingHorizontal: 14,
                      borderWidth: 1,
                      borderColor: 'rgba(255,255,255,0.15)',
                      gap: 10,
                    }}
                  >
                    <Mail size={18} color="rgba(255,255,255,0.5)" />
                    <TextInput
                      value={email}
                      onChangeText={setEmail}
                      placeholder="you@example.com"
                      placeholderTextColor="rgba(255,255,255,0.35)"
                      style={{
                        flex: 1,
                        paddingVertical: 14,
                        color: '#FFFFFF',
                        fontSize: 15,
                        fontFamily: 'DMSans_400Regular',
                      }}
                      keyboardType="email-address"
                      autoCapitalize="none"
                      autoCorrect={false}
                    />
                  </View>
                </View>

                <View style={{ gap: 6 }}>
                  <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13, fontFamily: 'DMSans_500Medium' }}>
                    Password
                  </Text>
                  <View
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      backgroundColor: 'rgba(255,255,255,0.1)',
                      borderRadius: 12,
                      paddingHorizontal: 14,
                      borderWidth: 1,
                      borderColor: 'rgba(255,255,255,0.15)',
                      gap: 10,
                    }}
                  >
                    <Lock size={18} color="rgba(255,255,255,0.5)" />
                    <TextInput
                      value={password}
                      onChangeText={setPassword}
                      placeholder="••••••••"
                      placeholderTextColor="rgba(255,255,255,0.35)"
                      secureTextEntry={!showPassword}
                      style={{
                        flex: 1,
                        paddingVertical: 14,
                        color: '#FFFFFF',
                        fontSize: 15,
                        fontFamily: 'DMSans_400Regular',
                      }}
                      autoCapitalize="none"
                    />
                    <AnimatedPressable onPress={() => setShowPassword(!showPassword)}>
                      {showPassword
                        ? <EyeOff size={18} color="rgba(255,255,255,0.5)" />
                        : <Eye size={18} color="rgba(255,255,255,0.5)" />
                      }
                    </AnimatedPressable>
                  </View>
                </View>

                {error ? (
                  <Text style={{ color: '#FCA5A5', fontSize: 13, fontFamily: 'DMSans_400Regular' }}>
                    {error}
                  </Text>
                ) : null}

                <AnimatedPressable
                  onPress={handleEmailAuth}
                  disabled={submitting}
                  style={{
                    backgroundColor: '#FFFFFF',
                    borderRadius: 12,
                    paddingVertical: 15,
                    alignItems: 'center',
                    marginTop: 4,
                  }}
                >
                  {submitting ? (
                    <ActivityIndicator color="#1A56DB" />
                  ) : (
                    <Text
                      style={{
                        color: '#1A56DB',
                        fontSize: 16,
                        fontWeight: '700',
                        fontFamily: 'DMSans_700Bold',
                      }}
                    >
                      {mode === 'signin' ? 'Sign in' : 'Create account'}
                    </Text>
                  )}
                </AnimatedPressable>

                <AnimatedPressable onPress={switchMode} style={{ alignItems: 'center', paddingVertical: 8 }}>
                  <Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: 14, fontFamily: 'DMSans_400Regular' }}>
                    {mode === 'signin' ? "Don't have an account? " : 'Already have an account? '}
                    <Text style={{ color: '#FFFFFF', fontFamily: 'DMSans_600SemiBold' }}>
                      {mode === 'signin' ? 'Sign up' : 'Sign in'}
                    </Text>
                  </Text>
                </AnimatedPressable>
              </View>
            </Animated.View>
          </Animated.View>
        </ScrollView>
      </LinearGradient>
    </KeyboardAvoidingView>
  );
}
