import { useState, useEffect, useRef } from 'react';
import Lottie from 'lottie-react';
import './App.css';

function App() {
  const [timeInSeconds, setTimeInSeconds] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [minutes, setMinutes] = useState(0);
  const [seconds, setSeconds] = useState(0);
  const [showAlarm, setShowAlarm] = useState(false);
  const [vehicleAnimationData, setVehicleAnimationData] = useState(null);

  const audioContextRef = useRef(null);
  const tickingSourceRef = useRef(null);
  const initialTimeRef = useRef(0);

  // Timer setup handlers

  // Initialize audio context
  useEffect(() => {
    audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
    return () => {
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, []);

  // Fetch the Lottie animation
  useEffect(() => {
    fetch('/vehicleanim.json')
      .then((response) => response.json())
      .then((data) => setVehicleAnimationData(data))
      .catch((error) => console.error('Error loading Lottie animation:', error));
  }, []);

  // Sound handling functions
  const playTickingSound = async () => {
    try {
      const response = await fetch('/sounds/stopwatch.wav');
      const arrayBuffer = await response.arrayBuffer();
      const audioBuffer = await audioContextRef.current.decodeAudioData(arrayBuffer);

      const source = audioContextRef.current.createBufferSource();
      source.buffer = audioBuffer;
      source.playbackRate.value = 0.75; // Start at 0.75x speed
      source.connect(audioContextRef.current.destination);
      source.loop = true;
      tickingSourceRef.current = source;
      source.start();
    } catch (error) {
      console.error('Error loading ticking sound:', error);
    }
  };

  const playSirenSound = async () => {
    try {
      const response = await fetch('/sounds/siren.wav');
      const arrayBuffer = await response.arrayBuffer();
      const audioBuffer = await audioContextRef.current.decodeAudioData(arrayBuffer);

      const source = audioContextRef.current.createBufferSource();
      const gainNode = audioContextRef.current.createGain();

      gainNode.gain.value = 0.3; // Reduced to 30% volume

      source.buffer = audioBuffer;
      source.connect(gainNode);
      gainNode.connect(audioContextRef.current.destination);
      source.start();
    } catch (error) {
      console.error('Error loading siren sound:', error);
    }
  };

  // Timer controls
  const startTimer = () => {
    if (timeInSeconds > 0) {
      initialTimeRef.current = timeInSeconds;
      setIsRunning(true);
      playTickingSound();
    }
  };

  const resetTimer = () => {
    setIsRunning(false);
    setShowAlarm(false);
    setTimeInSeconds(0);
    setMinutes(0);
    setSeconds(0);
    if (tickingSourceRef.current) {
      tickingSourceRef.current.stop();
      tickingSourceRef.current = null;
    }
  };

  // Countdown logic
  useEffect(() => {
    let intervalId;

    if (isRunning && timeInSeconds > 0) {
      intervalId = setInterval(() => {
        setTimeInSeconds((prevTime) => {
          const newTime = prevTime - 1;

          // Update ticking sound speed
          if (tickingSourceRef.current) {
            const timeProgress = 1 - newTime / initialTimeRef.current;
            const newPlaybackRate = 0.75 + timeProgress * 1.25; // From 0.75x to 2x speed
            tickingSourceRef.current.playbackRate.value = newPlaybackRate;
          }

          if (newTime <= 0) {
            setIsRunning(false);
            setShowAlarm(true);
            if (tickingSourceRef.current) {
              tickingSourceRef.current.stop();
              tickingSourceRef.current = null;
            }
            playSirenSound();
            // Reset alarm after animation
            setTimeout(() => setShowAlarm(false), 3000);
            return 0;
          }

          return newTime;
        });
      }, 1000);
    }

    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [isRunning, timeInSeconds]);

  // Custom touch handler functions
  const handleMinutesTouch = (e) => {
    e.preventDefault();
    let startY = e.touches[0].clientY;
    let currentMinutes = minutes;

    const onTouchMove = (moveEvent) => {
      moveEvent.preventDefault();
      const deltaY = startY - moveEvent.touches[0].clientY;
      if (Math.abs(deltaY) > 20) {
        if (deltaY > 0) {
          // Swiping up
          currentMinutes = Math.min(currentMinutes + 1, 59);
        } else {
          // Swiping down
          currentMinutes = Math.max(currentMinutes - 1, 0);
        }
        setMinutes(currentMinutes);
        setTimeInSeconds(currentMinutes * 60 + seconds);
        startY = moveEvent.touches[0].clientY;
      }
    };

    const onTouchEnd = () => {
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onTouchEnd);
    };

    window.addEventListener('touchmove', onTouchMove, { passive: false });
    window.addEventListener('touchend', onTouchEnd);
  };

  const handleSecondsTouch = (e) => {
    e.preventDefault();
    let startY = e.touches[0].clientY;
    let currentSeconds = seconds;

    const onTouchMove = (moveEvent) => {
      moveEvent.preventDefault();
      const deltaY = startY - moveEvent.touches[0].clientY;
      if (Math.abs(deltaY) > 20) {
        if (deltaY > 0) {
          // Swiping up
          currentSeconds = currentSeconds + 1;
          if (currentSeconds > 59) {
            currentSeconds = 0;
          }
        } else {
          // Swiping down
          currentSeconds = currentSeconds - 1;
          if (currentSeconds < 0) {
            currentSeconds = 59;
          }
        }
        setSeconds(currentSeconds);
        setTimeInSeconds(minutes * 60 + currentSeconds);
        startY = moveEvent.touches[0].clientY;
      }
    };

    const onTouchEnd = () => {
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onTouchEnd);
    };

    window.addEventListener('touchmove', onTouchMove, { passive: false });
    window.addEventListener('touchend', onTouchEnd);
  };

  return (
    <div className="App">
      {!isRunning && !showAlarm ? (
        <div className="timer-setup">
          <h1>Set Timer</h1>
          <div className="time-inputs">
            <div className="input-group">
              <label className="input-label">Minutes</label>
              <div
                className="touch-input"
                onTouchStart={handleMinutesTouch}
              >
                <div className="value-display">
                  {minutes < 10 ? '0' : ''}
                  {minutes}
                </div>
              </div>
            </div>
            <div className="input-group">
              <label className="input-label">Seconds</label>
              <div
                className="touch-input"
                onTouchStart={handleSecondsTouch}
              >
                <div className="value-display">
                  {seconds < 10 ? '0' : ''}
                  {seconds}
                </div>
              </div>
            </div>
          </div>
          <button
            className="start-button"
            onClick={startTimer}
            disabled={timeInSeconds === 0}
          >
            Start!
          </button>
        </div>
      ) : (
        <div className={`countdown ${showAlarm ? 'alarm' : ''}`}>
          {isRunning && !showAlarm && vehicleAnimationData && (
            <Lottie
              animationData={vehicleAnimationData}
              loop={true}
              className="background-animation"
            />
          )}
          <div
            className="progress-bar"
            style={
              showAlarm
                ? { animation: 'none' }
                : {
                    animation: `progressBarDecrease ${initialTimeRef.current}s linear forwards`,
                  }
            }
          />
          <div className="time-display">
            <span className="numbers">
              {Math.floor(timeInSeconds / 60)}:
              {timeInSeconds % 60 < 10 ? '0' : ''}
              {timeInSeconds % 60}
            </span>
          </div>
          <button className="cancel-button" onClick={resetTimer}>
            Cancel
          </button>
        </div>
      )}
    </div>
  );
}

export default App;