import React, { useRef } from 'react';
import {
  Animated,
  PanResponder,
  StyleSheet,
  TouchableOpacity,
  View,
  Dimensions,
  Image
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { Colors, Shadows } from '../theme/colors';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const BUTTON_SIZE = 60;

export default function DraggableChatbot() {
  const navigation = useNavigation();
  
  // Starting position at the bottom right
  const pan = useRef(new Animated.ValueXY({
    x: SCREEN_WIDTH - BUTTON_SIZE - 20,
    y: SCREEN_HEIGHT - BUTTON_SIZE - 100 
  })).current;

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      // We only want to take over if they move their finger a bit (distinguish drag vs tap)
      onMoveShouldSetPanResponder: (_, gestureState) => {
        const { dx, dy } = gestureState;
        return (Math.abs(dx) > 5 || Math.abs(dy) > 5);
      },
      onPanResponderGrant: () => {
        pan.setOffset({
          x: pan.x._value,
          y: pan.y._value
        });
      },
      onPanResponderMove: Animated.event(
        [
          null,
          { dx: pan.x, dy: pan.y }
        ],
        { useNativeDriver: false }
      ),
      onPanResponderRelease: (e, gesture) => {
        pan.flattenOffset();
        
        // Prevent button from going completely off screen vertically
        let newY = pan.y._value;
        if (newY < 50) newY = 50;
        if (newY > SCREEN_HEIGHT - BUTTON_SIZE - 120) newY = SCREEN_HEIGHT - BUTTON_SIZE - 120;

        // Snap to left or right edge
        const centerPoint = SCREEN_WIDTH / 2;
        const currentX = pan.x._value + (BUTTON_SIZE / 2); // Center of the button
        
        let newX = currentX < centerPoint ? 10 : SCREEN_WIDTH - BUTTON_SIZE - 10;

        Animated.spring(pan, {
          toValue: { x: newX, y: newY },
          useNativeDriver: false,
          friction: 6,
          tension: 40
        }).start();
      }
    })
  ).current;

  return (
    <Animated.View
      style={[
        pan.getLayout(),
        styles.container
      ]}
      {...panResponder.panHandlers}
    >
      <TouchableOpacity 
        style={styles.button}
        activeOpacity={0.8}
        onPress={() => navigation.navigate('Chatbot')}
      >
        <Image 
          source={require('../../assets/dog-chathead.png')} 
          style={styles.chatheadImg}
        />
        <View style={styles.badge} />
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    zIndex: 9999, // Float above everything
  },
  button: {
    width: BUTTON_SIZE,
    height: BUTTON_SIZE,
    borderRadius: BUTTON_SIZE / 2,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    ...Shadows.lg,
    borderWidth: 2,
    borderColor: Colors.primary,
    overflow: 'hidden',
    backgroundColor: '#fff'
  },
  chatheadImg: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover'
  },
  badge: {
    position: 'absolute',
    top: 5,
    right: 5,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: Colors.success,
    borderWidth: 2,
    borderColor: '#fff',
  }
});
