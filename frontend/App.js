import React from 'react';
import AlertHost from './src/components/AlertHost';
import AppNavigator from './src/navigation/AppNavigator';

export default function App() {
  return (
    <>
      <AppNavigator />
      {/* Shows every Alert.alert(...) as a styled pop-up card (phone and web) */}
      <AlertHost />
    </>
  );
}
