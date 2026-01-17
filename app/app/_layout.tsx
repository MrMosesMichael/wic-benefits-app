import { Stack } from 'expo-router';

export default function RootLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: {
          backgroundColor: '#2E7D32',
        },
        headerTintColor: '#fff',
        headerTitleStyle: {
          fontWeight: 'bold',
        },
      }}
    >
      <Stack.Screen name="index" options={{ title: 'WIC Benefits' }} />
      <Stack.Screen
        name="scanner/index"
        options={{
          title: 'Scan Product',
          headerShown: false, // Hide header for fullscreen camera
        }}
      />
      <Stack.Screen
        name="scanner/result"
        options={{ title: 'Scan Result' }}
      />
      <Stack.Screen name="benefits/index" options={{ title: 'My Benefits' }} />
    </Stack>
  );
}
