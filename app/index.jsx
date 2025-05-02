import React, { useEffect, useState, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  Dimensions,
  Animated,
  ImageBackground,
  Alert,
} from "react-native";
import { Audio } from "expo-av";
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppRegistry } from 'react-native';
import { UnderwaterBackground } from './assets/underwater-bg';

const SCREEN_WIDTH = Dimensions.get("window").width;
const SCREEN_HEIGHT = Dimensions.get("window").height;

// Game Constants
const GRAVITY = 0.25;
const PIPE_WIDTH = 60;
const PIPE_HEIGHT = 300;
const PIPE_GAP = 300;
const PIPE_SPEED = 2;
const JUMP_FORCE = 8;
const FISH_SIZE = 40;
const POWERUP_TYPES = {
  SLOW: 'slow',
  SHIELD: 'shield',
  DOUBLE_POINTS: 'doublePoints',
  BUBBLE: 'bubble'
};

// Single entry point for the fish
const ENTRY_POINT = { x: SCREEN_WIDTH / 2, y: SCREEN_HEIGHT / 2 };

function Game() {
  // Game States
  const [gameStarted, setGameStarted] = useState(false);
  const [playerName, setPlayerName] = useState("");
  const [birdY, setBirdY] = useState(SCREEN_HEIGHT / 2);
  const [velocity, setVelocity] = useState(0);
  const [pipes, setPipes] = useState([]);
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [leaderboard, setLeaderboard] = useState([]);
  const [sound, setSound] = useState(null);
  const [powerUps, setPowerUps] = useState([]);
  const [activePowerUp, setActivePowerUp] = useState(null);
  const [powerUpTimer, setPowerUpTimer] = useState(null);
  const [difficulty, setDifficulty] = useState(1);
  const [particles, setParticles] = useState([]);
  const [bubbles, setBubbles] = useState([]);

  // Refs
  const gameLoopRef = useRef(null);
  const birdRotation = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    loadLeaderboard();
    setupSound();
    return () => {
      if (sound) {
        sound.unloadAsync();
      }
      if (gameLoopRef.current) {
        clearInterval(gameLoopRef.current);
      }
      if (powerUpTimer) {
        clearTimeout(powerUpTimer);
      }
    };
  }, []);

  const setupSound = async () => {
    try {
      // Skip sound loading for now since the file is not available
      setSound(null);
    } catch (error) {
      console.error('Error loading sound:', error);
      setSound(null);
    }
  };

  const loadLeaderboard = async () => {
    try {
      const savedLeaderboard = await AsyncStorage.getItem("leaderboard");
      if (savedLeaderboard) {
        setLeaderboard(JSON.parse(savedLeaderboard));
      }
    } catch (error) {
      console.error("Error loading leaderboard:", error);
    }
  };

  const saveLeaderboard = async (newScore) => {
    try {
      const newEntry = { name: playerName, score: newScore };
      const updatedLeaderboard = [...leaderboard, newEntry]
        .sort((a, b) => b.score - a.score)
        .slice(0, 10);
      await AsyncStorage.setItem("leaderboard", JSON.stringify(updatedLeaderboard));
      setLeaderboard(updatedLeaderboard);
    } catch (error) {
      console.error("Error saving leaderboard:", error);
    }
  };

  const startGame = () => {
    if (!playerName.trim()) {
      Alert.alert("Error", "Please enter your name to start the game");
      return;
    }
    setGameStarted(true);
    setBirdY(ENTRY_POINT.y);
    setVelocity(0);
    birdRotation.setValue(0);
    setPipes([
      { x: SCREEN_WIDTH, y: Math.random() * (SCREEN_HEIGHT - PIPE_GAP - 200) + 100 },
      { x: SCREEN_WIDTH + SCREEN_WIDTH / 2, y: Math.random() * (SCREEN_HEIGHT - PIPE_GAP - 200) + 100 },
    ]);
    setScore(0);
    setGameOver(false);
    setDifficulty(1);
    setPowerUps([]);
    setActivePowerUp(null);
    setParticles([]);
    setBubbles([]);
  };

  const createParticles = (x, y) => {
    const newParticles = Array(10).fill().map(() => ({
      x,
      y,
      vx: (Math.random() - 0.5) * 4,
      vy: (Math.random() - 0.5) * 4,
      size: Math.random() * 4 + 2,
      color: `rgb(${Math.random() * 255}, ${Math.random() * 255}, ${Math.random() * 255})`,
      life: 30
    }));
    setParticles(prev => [...prev, ...newParticles]);
  };

  const spawnPowerUp = () => {
    if (Math.random() < 0.02) {
      const powerUpTypes = Object.values(POWERUP_TYPES);
      const type = powerUpTypes[Math.floor(Math.random() * powerUpTypes.length)];
      setPowerUps(prev => [...prev, {
        x: SCREEN_WIDTH,
        y: Math.random() * (SCREEN_HEIGHT - 100) + 50,
        type,
        width: 30,
        height: 30
      }]);
    }
  };

  const activatePowerUp = (powerUp) => {
    setActivePowerUp(powerUp.type);
    setPowerUps(prev => prev.filter(p => p !== powerUp));
    
    if (powerUpTimer) {
      clearTimeout(powerUpTimer);
    }

    const timer = setTimeout(() => {
      setActivePowerUp(null);
    }, 5000);

    setPowerUpTimer(timer);
  };

  const createBubble = () => {
    if (Math.random() < 0.1) {
      setBubbles(prev => [...prev, {
        x: Math.random() * SCREEN_WIDTH,
        y: SCREEN_HEIGHT,
        size: Math.random() * 20 + 10,
        speed: Math.random() * 2 + 1
      }]);
    }
  };

  const updateBubbles = () => {
    setBubbles(prev => 
      prev.map(bubble => ({
        ...bubble,
        y: bubble.y - bubble.speed
      })).filter(bubble => bubble.y > -bubble.size)
    );
  };

  useEffect(() => {
    if (!gameStarted || gameOver) return;

    const gameLoop = setInterval(() => {
      // Update bird position with smoother movement
      setBirdY((prev) => {
        const newY = prev + velocity;
        return Math.max(0, Math.min(newY, SCREEN_HEIGHT - FISH_SIZE));
      });
      setVelocity((prev) => prev + GRAVITY);

      // Update particles
      setParticles(prev => 
        prev.map(p => ({
          ...p,
          x: p.x + p.vx,
          y: p.y + p.vy,
          life: p.life - 1
        })).filter(p => p.life > 0)
      );

      // Rotate bird based on velocity with smoother animation
      Animated.timing(birdRotation, {
        toValue: velocity > 0 ? 0.2 : -0.2,
        duration: 200,
        useNativeDriver: true,
      }).start();

      // Move pipes
      setPipes((prev) =>
        prev.map((pipe) => ({ 
          x: pipe.x - PIPE_SPEED * (activePowerUp === POWERUP_TYPES.SLOW ? 0.5 : 1), 
          y: pipe.y 
        }))
      );

      // Move power-ups
      setPowerUps(prev =>
        prev.map(powerUp => ({
          ...powerUp,
          x: powerUp.x - PIPE_SPEED
        })).filter(powerUp => powerUp.x > -powerUp.width)
      );

      // Generate new pipes and power-ups
      if (pipes[0]?.x < -PIPE_WIDTH) {
        setPipes((prev) => [
          ...prev.slice(1),
          { 
            x: SCREEN_WIDTH, 
            y: Math.random() * (SCREEN_HEIGHT - PIPE_GAP - 200) + 100 
          },
        ]);
        // Add exactly 1 point for passing obstacle
        setScore(prev => prev + 1);
        createParticles(pipes[0].x + PIPE_WIDTH/2, pipes[0].y + PIPE_HEIGHT/2);
      }

      // Spawn power-ups
      spawnPowerUp();

      // Increase difficulty gradually
      if (score % 15 === 0 && score > 0) {
        setDifficulty(prev => Math.min(prev + 0.05, 1.5));
      }

      // Check power-up collision
      powerUps.forEach(powerUp => {
        const birdBox = {
          top: birdY + 5,
          bottom: birdY + FISH_SIZE - 5,
          left: SCREEN_WIDTH / 2 - FISH_SIZE / 2 + 5,
          right: SCREEN_WIDTH / 2 + FISH_SIZE / 2 - 5,
        };

        if (
          birdBox.right > powerUp.x &&
          birdBox.left < powerUp.x + powerUp.width &&
          birdBox.bottom > powerUp.y &&
          birdBox.top < powerUp.y + powerUp.height
        ) {
          // Add points based on power-up type
          if (powerUp.type === POWERUP_TYPES.BUBBLE) {
            setScore(prev => prev + 2); // White bubble: +2 points
          } else {
            setScore(prev => prev + 5); // Yellow power-up: +5 points
          }
          activatePowerUp(powerUp);
        }
      });

      // Check for collisions with seaweed (obstacles)
      const birdBox = {
        top: birdY,
        bottom: birdY + FISH_SIZE,
        left: SCREEN_WIDTH / 2 - FISH_SIZE / 2,
        right: SCREEN_WIDTH / 2 + FISH_SIZE / 2,
      };

      const hasCollision = pipes.some(pipe => {
        // Check collision with top seaweed
        const topSeaweedCollision = 
          birdBox.right > pipe.x &&
          birdBox.left < pipe.x + PIPE_WIDTH &&
          birdBox.top < pipe.y;

        // Check collision with bottom seaweed
        const bottomSeaweedCollision = 
          birdBox.right > pipe.x &&
          birdBox.left < pipe.x + PIPE_WIDTH &&
          birdBox.bottom > pipe.y + PIPE_GAP;

        return topSeaweedCollision || bottomSeaweedCollision;
      });

      // Only check if bird is completely out of bounds or has collision
      const isOutOfBounds = birdY < -50 || birdY + FISH_SIZE > SCREEN_HEIGHT + 50;

      if ((isOutOfBounds || hasCollision) && activePowerUp !== POWERUP_TYPES.SHIELD) {
        clearInterval(gameLoop);
        setGameOver(true);
        saveLeaderboard(score);
      }

      // Update bubbles
      createBubble();
      updateBubbles();
    }, 16);

    gameLoopRef.current = gameLoop;

    return () => {
      clearInterval(gameLoop);
    };
  }, [gameStarted, gameOver, pipes, powerUps, activePowerUp, powerUpTimer]);

  const jump = async () => {
    if (gameOver) return;
    setVelocity(-JUMP_FORCE);
    if (sound) {
      try {
        await sound.replayAsync();
      } catch (error) {
        console.error('Error playing sound:', error);
      }
    }
  };

  const resetGame = () => {
    setGameStarted(false);
    setGameOver(false);
  };

  if (!gameStarted) {
    return (
      <View style={styles.container}>
        <UnderwaterBackground />
        <View style={styles.startScreen}>
          <Text style={styles.title}>Flappy Fish</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter your name"
            value={playerName}
            onChangeText={setPlayerName}
          />
          <TouchableOpacity style={styles.button} onPress={startGame}>
            <Text style={styles.buttonText}>Start Game</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <UnderwaterBackground />
      <TouchableOpacity 
        style={styles.gameArea} 
        activeOpacity={1} 
        onPress={jump}
      >
        {/* Fish */}
        <Animated.View
          style={[
            styles.fish,
            {
              top: birdY,
              left: SCREEN_WIDTH / 2 - FISH_SIZE / 2,
              transform: [{ rotate: birdRotation.interpolate({
                inputRange: [-0.3, 0.3],
                outputRange: ['-30deg', '30deg']
              })}]
            }
          ]}
        >
          <View style={styles.fishBody} />
          <View style={styles.fishTail} />
        </Animated.View>

        {/* Pipes (seaweed) */}
        {pipes.map((pipe, index) => (
          <View key={index}>
            <View
              style={[
                styles.seaweed,
                {
                  left: pipe.x,
                  top: pipe.y - PIPE_HEIGHT,
                  height: PIPE_HEIGHT,
                },
              ]}
            />
            <View
              style={[
                styles.seaweed,
                {
                  left: pipe.x,
                  top: pipe.y + PIPE_GAP,
                  height: PIPE_HEIGHT,
                },
              ]}
            />
          </View>
        ))}

        {/* Bubbles */}
        {bubbles.map((bubble, index) => (
          <View
            key={index}
            style={[
              styles.bubble,
              {
                left: bubble.x,
                top: bubble.y,
                width: bubble.size,
                height: bubble.size,
              },
            ]}
          />
        ))}

        {/* Power-ups */}
        {powerUps.map((powerUp, index) => (
          <View
            key={index}
            style={[
              styles.powerUp,
              {
                left: powerUp.x,
                top: powerUp.y,
                backgroundColor: powerUp.type === POWERUP_TYPES.BUBBLE ? '#87CEEB' : '#FFD700',
              },
            ]}
          />
        ))}

        {/* Score */}
        <Text style={styles.score}>Score: {score}</Text>
      </TouchableOpacity>

      {gameOver && (
        <View style={styles.gameOver}>
          <Text style={styles.gameOverText}>Game Over!</Text>
          <Text style={styles.finalScore}>Final Score: {score}</Text>
          <TouchableOpacity style={styles.button} onPress={resetGame}>
            <Text style={styles.buttonText}>Play Again</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  gameArea: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  fish: {
    position: 'absolute',
    width: FISH_SIZE,
    height: FISH_SIZE,
    zIndex: 10,
  },
  fishBody: {
    width: FISH_SIZE * 0.8,
    height: FISH_SIZE * 0.6,
    backgroundColor: '#FF6B6B',
    borderRadius: FISH_SIZE * 0.3,
    position: 'absolute',
    left: FISH_SIZE * 0.1,
    top: FISH_SIZE * 0.2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  fishTail: {
    width: 0,
    height: 0,
    borderTopWidth: FISH_SIZE * 0.3,
    borderBottomWidth: FISH_SIZE * 0.3,
    borderLeftWidth: FISH_SIZE * 0.4,
    borderTopColor: 'transparent',
    borderBottomColor: 'transparent',
    borderLeftColor: '#FF6B6B',
    position: 'absolute',
    right: -FISH_SIZE * 0.2,
    top: FISH_SIZE * 0.1,
  },
  seaweed: {
    position: 'absolute',
    width: PIPE_WIDTH,
    backgroundColor: '#2E8B57',
    borderTopLeftRadius: PIPE_WIDTH / 2,
    borderTopRightRadius: PIPE_WIDTH / 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  bubble: {
    position: 'absolute',
    backgroundColor: 'rgba(255, 255, 255, 0.6)',
    borderRadius: 50,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.8)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 3,
  },
  powerUp: {
    position: 'absolute',
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  startScreen: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  title: {
    fontSize: 48,
    fontWeight: "bold",
    color: "#FFFFFF",
    marginBottom: 30,
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 5,
  },
  input: {
    backgroundColor: "rgba(255, 255, 255, 0.9)",
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderRadius: 25,
    width: "80%",
    marginBottom: 20,
    fontSize: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  button: {
    backgroundColor: "#4CAF50",
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 25,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  buttonText: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "bold",
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  score: {
    position: "absolute",
    top: 50,
    alignSelf: "center",
    fontSize: 32,
    fontWeight: "bold",
    color: "#FFFFFF",
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 5,
    zIndex: 20,
  },
  gameOver: {
    position: "absolute",
    top: SCREEN_HEIGHT / 2 - 100,
    left: SCREEN_WIDTH / 2 - 150,
    backgroundColor: "rgba(0, 0, 0, 0.9)",
    padding: 20,
    borderRadius: 15,
    width: 300,
    alignItems: "center",
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
    elevation: 8,
    zIndex: 30,
  },
  gameOverText: {
    color: "#FFFFFF",
    fontSize: 32,
    fontWeight: "bold",
    marginBottom: 20,
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 5,
  },
  finalScore: {
    color: "#FFFFFF",
    fontSize: 24,
    marginBottom: 20,
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
});

export default Game;
