import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar
} from 'react-native';
import {
  TextInput,
  Button,
  Text,
  Surface,
  HelperText,
  Avatar
} from 'react-native-paper';
import { useAuth } from '../context/AuthContext';

export default function LoginScreen() {
  const { login } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordVisible, setPasswordVisible] = useState(false);

  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Basic validation state
  const [emailTouched, setEmailTouched] = useState(false);
  const [passwordTouched, setPasswordTouched] = useState(false);

  const isEmailInvalid = () => {
    if (!emailTouched) return false;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return !emailRegex.test(email.trim());
  };

  const isPasswordInvalid = () => {
    if (!passwordTouched) return false;
    return password.length < 6;
  };

  const handleLogin = async () => {
    setEmailTouched(true);
    setPasswordTouched(true);

    if (email.trim() === '' || password === '') {
      setErrorMessage('Please fill in all fields.');
      return;
    }

    if (isEmailInvalid() || isPasswordInvalid()) {
      setErrorMessage('Please enter a valid email and at least 6 characters for the password.');
      return;
    }

    try {
      setErrorMessage(null);
      setLoading(true);
      await login(email, password);
    } catch (error: any) {
      console.error('Login error:', error);
      let friendlyMessage = 'An unexpected error occurred. Please try again.';

      if (error.code === 'auth/invalid-credential' || error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
        friendlyMessage = 'Invalid email or password. Please verify your credentials.';
      } else if (error.code === 'auth/invalid-email') {
        friendlyMessage = 'The email address is invalid.';
      } else if (error.code === 'auth/user-disabled') {
        friendlyMessage = 'This account has been disabled. Please contact the administrator.';
      } else if (error.code === 'auth/too-many-requests') {
        friendlyMessage = 'Too many failed login attempts. Please try again later.';
      } else if (error.message) {
        friendlyMessage = error.message;
      }

      setErrorMessage(friendlyMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <StatusBar barStyle="light-content" backgroundColor="#1E3A8A" />
      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.topDecoration} />

        <Surface style={styles.card} elevation={4}>
          {/* Logo / Icon */}
          <View style={styles.logoContainer}>
            <Avatar.Icon
              size={70}
              icon="warehouse"
              style={styles.avatarLogo}
              color="#ffffff"
            />
            <Text variant="headlineMedium" style={styles.title}>
              Inventory Management
            </Text>
            <Text variant="bodyMedium" style={styles.subtitle}>
              Log in to Manage Operations
            </Text>
          </View>

          {/* Form */}
          <View style={styles.form}>
            <TextInput
              label="Email Address"
              value={email}
              onChangeText={(text) => {
                setEmail(text);
                if (errorMessage) setErrorMessage(null);
              }}
              onBlur={() => setEmailTouched(true)}
              mode="outlined"
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              style={styles.input}
              left={<TextInput.Icon icon="email" />}
              error={isEmailInvalid()}
              outlineStyle={styles.outline}
            />
            <HelperText type="error" visible={isEmailInvalid()} style={styles.helper}>
              Please enter a valid email address.
            </HelperText>

            <TextInput
              label="Password"
              value={password}
              onChangeText={(text) => {
                setPassword(text);
                if (errorMessage) setErrorMessage(null);
              }}
              onBlur={() => setPasswordTouched(true)}
              mode="outlined"
              secureTextEntry={!passwordVisible}
              autoCapitalize="none"
              style={styles.input}
              outlineStyle={styles.outline}
              left={<TextInput.Icon icon="lock" />}
              right={
                <TextInput.Icon
                  icon={passwordVisible ? "eye-off" : "eye"}
                  onPress={() => setPasswordVisible(!passwordVisible)}
                />
              }
              error={isPasswordInvalid()}
            />
            <HelperText type="error" visible={isPasswordInvalid()} style={styles.helper}>
              Password must be at least 6 characters.
            </HelperText>

            {/* Error Display */}
            {errorMessage && (
              <Surface style={styles.errorSurface} elevation={1}>
                <Avatar.Icon
                  size={24}
                  icon="alert-circle"
                  color="#ef4444"
                  style={styles.errorIcon}
                />
                <Text style={styles.errorText}>
                  {errorMessage}
                </Text>
              </Surface>
            )}

            {/* Submit Button */}
            <Button
              mode="contained"
              onPress={handleLogin}
              loading={loading}
              disabled={loading}
              style={styles.button}
              labelStyle={styles.buttonLabel}
              contentStyle={styles.buttonContent}
            >
              Sign In
            </Button>
          </View>
        </Surface>

        {/* Footer info (since only admins can create accounts) */}
        <Text style={styles.footerText}>
          Don't have an account? Contact your system administrator to get registered.
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc', // Soft premium off-white slate
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 20,
  },
  topDecoration: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 180,
    backgroundColor: '#1E3A8A', // Dynamic brand accent stripe
    borderBottomLeftRadius: 100,
    borderBottomRightRadius: 100,
    opacity: 0.1,
  },
  card: {
    backgroundColor: '#ffffff', // High-contrast clean pure white card
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    alignSelf: 'center',
    elevation: 3, // Premium card shadow
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  avatarLogo: {
    backgroundColor: '#F59E0B',
    marginBottom: 16,
    elevation: 3,
    shadowColor: '#F59E0B',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
  },
  title: {
    color: '#0f172a', // Dark elegant slate text
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  subtitle: {
    color: '#64748b', // Highly readable grey subtitle
    marginTop: 4,
  },
  form: {
    width: '100%',
  },
  input: {
    backgroundColor: '#ffffff', // Pure white background inside textfields
    marginBottom: 4,
  },
  outline: {
    borderColor: '#cbd5e1', // Elegant grey borders
  },
  helper: {
    marginTop: -4,
    marginBottom: 4,
  },
  errorSurface: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fef2f2', // Soft red warning block
    borderColor: '#fee2e2',
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  errorIcon: {
    backgroundColor: 'transparent',
    marginRight: 8,
  },
  errorText: {
    color: '#b91c1c', // Clear, vibrant red warning text
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
  },
  button: {
    marginTop: 8,
    borderRadius: 8,
    backgroundColor: '#1E3A8A',
    elevation: 2,
  },
  buttonContent: {
    height: 48,
  },
  buttonLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  footerText: {
    color: '#64748b', // Highly readable slate footer text
    textAlign: 'center',
    fontSize: 13,
    marginTop: 24,
    paddingHorizontal: 20,
    lineHeight: 18,
  },
});
