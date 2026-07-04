import React, { useState } from 'react';
import a from "../../screens/Login/back.png"
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Image,
  SafeAreaView
} from 'react-native';
//Designed Via Human; Copr. John Sencion 2026
export default function LoginScreen() {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton}>
          <Image source={require('../../screens/Login/back.png')} style={styles.backIcon} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Welcome back</Text>
      </View>


      <View style={styles.mainContent}>


        <View style={[styles.floaty, styles.floatyCyan]} />
        <View style={[styles.floaty, styles.floatyRed]} />


        <View style={styles.box}>
          <View style={styles.form}>


            <Text style={styles.label}>email</Text>
            <TextInput style={styles.input} placeholder="rainey@example.com" keyboardType="email-address" autoCapitalize="none" />


            <View style={styles.passwordHeader}>
              <Text style={styles.label}>password</Text>
              <TouchableOpacity>
                <Text style={styles.forgotText}>Forgot Password?</Text>
              </TouchableOpacity>
            </View>


            <View style={styles.passwordRow}>
              <TextInput style={[styles.input, styles.passwordInput]} placeholder="••••••••" secureTextEntry={!showPassword} />
              <TouchableOpacity style={styles.checkbox} onPress={() => setShowPassword(!showPassword)} >

                <Text style={styles.checkboxText}>{showPassword ? 'Hide' : 'Show'}</Text>
              </TouchableOpacity>
            </View>


            <TouchableOpacity style={styles.loginButton}>
              <Text style={styles.loginButtonText}>Login</Text>
            </TouchableOpacity>

            <View style={styles.divider} />


            <View style={styles.footerRow}>
              <Text style={styles.footerText}>Don't have an account yet? then </Text>
              <TouchableOpacity>
                <Text style={styles.linkText}>make one here</Text>
              </TouchableOpacity>
              <Text style={styles.footerText}>!</Text>
            </View>

          </View>
        </View>

      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#e0e0e0',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'whitesmoke',
    borderBottomWidth: 5,
    borderBottomColor: 'black',
    paddingVertical: 15,
    paddingHorizontal: 10,
    shadowColor: 'black',
    shadowOffset: { width: 5, height: 5 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 5,
    zIndex: 10,
  },
  backButton: {
    marginRight: 15,
  },
  backIcon: {
    width: 24,
    height: 24,
    resizeMode: 'contain',
  },
  headerTitle: {
    fontSize: 24,
    color: 'rgba(136, 0, 222, 1)',
    fontWeight: 'bold',
  },
  mainContent: {
    flex: 1,
    padding: 16,
    position: 'relative',
  },
  floaty: {
    position: 'absolute',
    width: 64,
    height: 64,
    zIndex: -1,
  },
  floatyCyan: {
    backgroundColor: 'cyan',
    left: '70%',
    top: 64,
    transform: [{ rotate: '20deg' }],
  },
  floatyRed: {
    backgroundColor: 'red',
    left: 20,
    top: 246,
    transform: [{ rotate: '42deg' }],
  },
  box: {
    backgroundColor: 'whitesmoke',
    marginHorizontal: 'auto',
    marginTop: 48,
    width: '100%',
    maxWidth: 448,
    borderWidth: 5,
    borderColor: 'black',
    shadowColor: 'black',
    shadowOffset: { width: 10, height: 10 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 10,
    transform: [{ rotate: '-2deg' }],
    padding: 15,
  },
  form: {
    transform: [{ rotate: '2deg' }],
  },
  label: {
    fontWeight: 'bold',
    marginTop: 10,
    marginBottom: 5,
  },
  input: {
    height: 40,
    borderWidth: 2,
    borderColor: 'black',
    paddingHorizontal: 10,
    backgroundColor: 'white',
    marginBottom: 15,
  },
  passwordHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  forgotText: {
    color: 'rgb(247, 177, 65)',
    fontWeight: '800',
    fontStyle: 'italic',
    marginBottom: 5,
  },
  passwordRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  passwordInput: {
    flex: 1,
    marginRight: 10,
  },
  checkbox: {
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'black',
    paddingHorizontal: 10,
    backgroundColor: 'white',
    marginBottom: 15,
  },
  checkboxText: {
    fontWeight: 'bold',
  },
  loginButton: {
    height: 50,
    backgroundColor: 'rgba(0, 107, 10, 1)',
    borderWidth: 5,
    borderColor: 'black',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 20,
    shadowColor: 'black',
    shadowOffset: { width: 10, height: 10 },
    shadowOpacity: 1,
    shadowRadius: 0,
  },
  loginButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 18,
  },
  divider: {
    height: 2,
    backgroundColor: 'black',
    marginVertical: 15,
  },
  footerRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  footerText: {
    fontSize: 14,
  },
  linkText: {
    fontSize: 14,
    color: 'blue',
    textDecorationLine: 'underline',
  }
});