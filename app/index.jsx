import React, { useEffect, useState } from "react";
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
  AsyncStorage,
} from "react-native";
import { Audio } from "expo-av";

const SCREEN_WIDTH = Dimensions.get("window").width;
const SCREEN_HEIGHT = Dimensions.get("window").height;

// Game Constants
const GRAVITY = 0.6;
const PIPE_WIDTH = 60;
const PIPE_HEIGHT = 300;
const PIPE_GAP = 200;
const PIPE_SPEED = 3;
const JUMP_FORCE = 12;
const BIRD_SIZE = 40;

export default function App() {
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

  // Animations
  const birdRotation = new Animated.Value(0);

  useEffect(() => {
    loadLeaderboard();
    setupSound();
    return () => {
      if (sound) {
        sound.unloadAsync();
      }
    };
  }, []);

  const setupSound = async () => {
    const { sound } = await Audio.Sound.createAsync(
      require("./assets")
    );
    setSound(sound);
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
    setBirdY(SCREEN_HEIGHT / 2);
    setVelocity(0);
    setPipes([
      { x: SCREEN_WIDTH, y: Math.random() * (SCREEN_HEIGHT - PIPE_GAP) },
      { x: SCREEN_WIDTH + SCREEN_WIDTH / 2, y: Math.random() * (SCREEN_HEIGHT - PIPE_GAP) },
    ]);
    setScore(0);
    setGameOver(false);
  };

  useEffect(() => {
    if (!gameStarted || gameOver) return;

    const gameLoop = setInterval(() => {
      setBirdY((prev) => prev + velocity);
      setVelocity((prev) => prev + GRAVITY);

      // Rotate bird based on velocity
      Animated.timing(birdRotation, {
        toValue: velocity > 0 ? 0.3 : -0.3,
        duration: 100,
        useNativeDriver: true,
      }).start();

      // Move pipes
      setPipes((prev) =>
        prev.map((pipe) => ({ x: pipe.x - PIPE_SPEED, y: pipe.y }))
      );

      // Generate new pipes
      if (pipes[0]?.x < -PIPE_WIDTH) {
        setPipes((prev) => [
          ...prev.slice(1),
          { x: SCREEN_WIDTH, y: Math.random() * (SCREEN_HEIGHT - PIPE_GAP) },
        ]);
        setScore((prev) => prev + 1);
      }

      // Check collision
      const birdBox = {
        top: birdY,
        bottom: birdY + BIRD_SIZE,
        left: SCREEN_WIDTH / 2 - BIRD_SIZE / 2,
        right: SCREEN_WIDTH / 2 + BIRD_SIZE / 2,
      };

      const collision = pipes.some((pipe) => {
        const pipeBox = {
          top: pipe.y,
          bottom: pipe.y + PIPE_HEIGHT,
          left: pipe.x,
          right: pipe.x + PIPE_WIDTH,
        };

        return (
          birdBox.right > pipeBox.left &&
          birdBox.left < pipeBox.right &&
          (birdBox.top < pipeBox.top + PIPE_HEIGHT || birdBox.bottom > pipeBox.top + PIPE_GAP)
        );
      });

      if (birdBox.bottom > SCREEN_HEIGHT || birdBox.top < 0 || collision) {
        setGameOver(true);
        saveLeaderboard(score);
      }
    }, 30);

    return () => clearInterval(gameLoop);
  }, [gameStarted, gameOver, pipes, birdY, velocity]);

  const jump = async () => {
    if (gameOver) return;
    setVelocity(-JUMP_FORCE);
    if (sound) {
      await sound.replayAsync();
    }
  };

  const resetGame = () => {
    setGameStarted(false);
    setGameOver(false);
  };

  if (!gameStarted) {
    return (
      <ImageBackground
        source={require("./assets/background.png")}
        style={styles.container}
      >
        <View style={styles.startContainer}>
          <Text style={styles.title}>FlappyBall</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter your name"
            value={playerName}
            onChangeText={setPlayerName}
          />
          <TouchableOpacity style={styles.startButton} onPress={startGame}>
            <Text style={styles.buttonText}>Start Game</Text>
          </TouchableOpacity>
          {leaderboard.length > 0 && (
            <View style={styles.leaderboard}>
              <Text style={styles.leaderboardTitle}>Leaderboard</Text>
              {leaderboard.map((entry, index) => (
                <Text key={index} style={styles.leaderboardEntry}>
                  {index + 1}. {entry.name}: {entry.score}
                </Text>
              ))}
            </View>
          )}
        </View>
      </ImageBackground>
    );
  }

  return (
    <ImageBackground
      source={require("./assets/background.png")}
      style={styles.container}
    >
      <TouchableOpacity
        style={styles.gameContainer}
        activeOpacity={1}
        onPress={jump}
      >
        {pipes.map((pipe, index) => (
          <View key={index}>
            <View
              style={[
                styles.pipe,
                {
                  left: pipe.x,
                  height: pipe.y,
                  top: 0,
                },
              ]}
            />
            <View
              style={[
                styles.pipe,
                {
                  left: pipe.x,
                  height: SCREEN_HEIGHT - pipe.y - PIPE_GAP,
                  top: pipe.y + PIPE_GAP,
                },
              ]}
            />
          </View>
        ))}
        <Animated.View
          style={[
            styles.bird,
            {
              top: birdY,
              left: SCREEN_WIDTH / 2 - BIRD_SIZE / 2,
              transform: [{ rotate: birdRotation.interpolate({
                inputRange: [-0.3, 0.3],
                outputRange: ["-30deg", "30deg"]
              })}],
            },
          ]}
        />
        <Text style={styles.score}>{score}</Text>
        {gameOver && (
          <View style={styles.gameOverContainer}>
            <Text style={styles.gameOverText}>Game Over!</Text>
            <Text style={styles.finalScore}>Score: {score}</Text>
            <TouchableOpacity style={styles.restartButton} onPress={resetGame}>
              <Text style={styles.buttonText}>Play Again</Text>
            </TouchableOpacity>
          </View>
        )}
      </TouchableOpacity>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#87CEEB",
  },
  startContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  title: {
    fontSize: 48,
    fontWeight: "bold",
    color: "#FFFFFF",
    marginBottom: 30,
    textShadowColor: "rgba(0, 0, 0, 0.75)",
    textShadowOffset: { width: -1, height: 1 },
    textShadowRadius: 10,
  },
  input: {
    width: "80%",
    height: 50,
    backgroundColor: "rgba(255, 255, 255, 0.8)",
    borderRadius: 25,
    paddingHorizontal: 20,
    marginBottom: 20,
    fontSize: 18,
  },
  startButton: {
    backgroundColor: "#4CAF50",
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 25,
    marginBottom: 30,
  },
  buttonText: {
    color: "#FFFFFF",
    fontSize: 20,
    fontWeight: "bold",
  },
  leaderboard: {
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    padding: 20,
    borderRadius: 15,
    width: "80%",
  },
  leaderboardTitle: {
    color: "#FFFFFF",
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 10,
    textAlign: "center",
  },
  leaderboardEntry: {
    color: "#FFFFFF",
    fontSize: 16,
    marginBottom: 5,
  },
  gameContainer: {
    flex: 1,
  },
  bird: {
    position: "absolute",
    width: BIRD_SIZE,
    height: BIRD_SIZE,
    backgroundColor: "#FFD700",
    borderRadius: BIRD_SIZE / 2,
    borderWidth: 2,
    borderColor: "#FFA500",
  },
  pipe: {
    position: "absolute",
    width: PIPE_WIDTH,
    backgroundColor: "#2E8B57",
    borderWidth: 2,
    borderColor: "#228B22",
  },
  score: {
    position: "absolute",
    top: 50,
    fontSize: 36,
    fontWeight: "bold",
    color: "#FFFFFF",
    textShadowColor: "rgba(0, 0, 0, 0.75)",
    textShadowOffset: { width: -1, height: 1 },
    textShadowRadius: 10,
    alignSelf: "center",
  },
  gameOverContainer: {
    position: "absolute",
    top: SCREEN_HEIGHT / 2 - 100,
    left: SCREEN_WIDTH / 2 - 150,
    width: 300,
    backgroundColor: "rgba(0, 0, 0, 0.8)",
    padding: 20,
    borderRadius: 15,
    alignItems: "center",
  },
  gameOverText: {
    color: "#FF0000",
    fontSize: 32,
    fontWeight: "bold",
    marginBottom: 10,
  },
  finalScore: {
    color: "#FFFFFF",
    fontSize: 24,
    marginBottom: 20,
  },
  restartButton: {
    backgroundColor: "#4CAF50",
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 25,
  },
});
