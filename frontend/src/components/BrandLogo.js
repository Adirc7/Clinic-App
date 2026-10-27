import React from 'react';
import { Image, StyleSheet, View } from 'react-native';

/** The MediCare Clinic logo mark (cross + dove), in a rounded white tile. */
export default function BrandLogo({ size = 40, style }) {
  return (
    <View style={[styles.tile, { width: size, height: size, borderRadius: size * 0.28 }, style]}>
      <Image
        source={require('../../assets/images/logo-mark.png')}
        style={{ width: size, height: size }}
        resizeMode="cover"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  tile: {
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
});
