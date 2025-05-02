import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import { StyleSheet, Dimensions } from 'react-native';

const { width, height } = Dimensions.get('window');

export const UnderwaterBackground = () => {
  return (
    <LinearGradient
      colors={['#1E90FF', '#00BFFF', '#87CEEB']}
      style={styles.background}
      start={{ x: 0, y: 0 }}
      end={{ x: 0, y: 1 }}
    />
  );
};

const styles = StyleSheet.create({
  background: {
    width,
    height,
    position: 'absolute',
  },
}); 