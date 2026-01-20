import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';

export default function Home() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>WIC Benefits Assistant</Text>
      <Text style={styles.subtitle}>Michigan Edition</Text>

      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={styles.formulaButton}
          onPress={() => router.push('/formula')}
        >
          <Text style={styles.buttonText}>🍼 Find Formula</Text>
          <Text style={styles.buttonSubtext}>Find infant formula nearby</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.primaryButton}
          onPress={() => router.push('/scanner')}
        >
          <Text style={styles.buttonText}>Scan Product</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={() => router.push('/benefits')}
        >
          <Text style={styles.buttonText}>View Benefits</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.cartButton}
          onPress={() => router.push('/cart')}
        >
          <Text style={styles.buttonText}>Shopping Cart</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.footer}>Vertical Slice MVP v0.1</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#2E7D32',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 18,
    color: '#666',
    marginBottom: 40,
  },
  buttonContainer: {
    width: '100%',
    gap: 16,
  },
  primaryButton: {
    backgroundColor: '#2E7D32',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  secondaryButton: {
    backgroundColor: '#1976D2',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  cartButton: {
    backgroundColor: '#FFA000',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  formulaButton: {
    backgroundColor: '#E91E63',
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#AD1457',
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  buttonSubtext: {
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: 13,
    marginTop: 4,
  },
  footer: {
    marginTop: 40,
    fontSize: 12,
    color: '#999',
  },
});
