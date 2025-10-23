// Audio announcement system for accessibility

/**
 * Audio announcement system for accessibility
 * Provides spoken descriptions of game state and events
 */
export class AudioAnnouncer {
  private _isEnabled = false;
  private _speechSynthesis: SpeechSynthesis | null = null;
  private _voice: SpeechSynthesisVoice | null = null;
  private _rate = 1.0;
  private _volume = 0.8;

  constructor() {
    this._checkSpeechSupport();
    this._loadPreferences();
  }

  // Public API
  setEnabled(enabled: boolean): void {
    this._isEnabled = enabled;
    this._savePreferences();
  }

  isEnabled(): boolean {
    return this._isEnabled;
  }

  isSupported(): boolean {
    return this._speechSynthesis !== null;
  }

  setRate(rate: number): void {
    this._rate = Math.max(0.1, Math.min(2.0, rate));
    this._savePreferences();
  }

  setVolume(volume: number): void {
    this._volume = Math.max(0, Math.min(1, volume));
    this._savePreferences();
  }

  // Game state announcements
  announceGameStart(): void {
    this._speak('Game starting. Wait for the five red lights to appear.');
  }

  announceLightActivated(lightIndex: number, totalLights: number): void {
    const ordinal = this._getOrdinal(lightIndex + 1);
    this._speak(`${ordinal} light activated. ${totalLights - lightIndex - 1} lights remaining.`);
  }

  announceLightsOut(): void {
    this._speak('Lights out! React now!');
  }

  announceResult(reactionTime: number, rating: string): void {
    if (reactionTime < 0) {
      this._speak('False start! You reacted before the lights went out. Try again.');
      return;
    }

    const timeText = `${reactionTime} milliseconds`;
    const ratingText = this._getRatingDescription(rating);
    this._speak(`Reaction time: ${timeText}. Rating: ${ratingText}`);
  }

  announceDriverComparison(fasterThan: number, slowerThan: number): void {
    if (fasterThan === 0) {
      this._speak('You were slower than all Formula 1 drivers.');
    } else if (slowerThan === 0) {
      this._speak('Incredible! You were faster than all Formula 1 drivers!');
    } else {
      this._speak(`You were faster than ${fasterThan} drivers and slower than ${slowerThan} drivers.`);
    }
  }

  announcePercentile(percentile: number): void {
    this._speak(`You performed better than ${percentile}% of all players.`);
  }

  announcePersonalBest(): void {
    this._speak('New personal best! Congratulations!');
  }

  // UI announcements
  announceScreenChange(screenName: string): void {
    this._speak(`Navigated to ${screenName} screen.`);
  }

  announceButtonPress(buttonName: string): void {
    this._speak(`${buttonName} button pressed.`);
  }

  announceError(errorMessage: string): void {
    this._speak(`Error: ${errorMessage}`);
  }

  // Challenge mode announcements
  announceChallengeMode(challengerName: string): void {
    this._speak(`Challenge mode activated. Racing against ${challengerName}.`);
  }

  announceGhostIndicator(ghostTime: number): void {
    this._speak(`Ghost indicator shows opponent reacted in ${ghostTime} milliseconds.`);
  }

  announceChallengeResult(won: boolean, margin: number): void {
    if (won) {
      this._speak(`You won the challenge by ${margin} milliseconds!`);
    } else {
      this._speak(`You lost the challenge by ${margin} milliseconds.`);
    }
  }

  // Leaderboard announcements
  announceLeaderboardPosition(position: number, totalPlayers: number): void {
    const ordinal = this._getOrdinal(position);
    this._speak(`You are ranked ${ordinal} out of ${totalPlayers} players.`);
  }

  announceLeaderboardEntry(position: number, playerName: string, time: number): void {
    const ordinal = this._getOrdinal(position);
    this._speak(`${ordinal} place: ${playerName}, ${time} milliseconds.`);
  }

  // Private methods
  private _speak(text: string): void {
    if (!this._isEnabled || !this._speechSynthesis) {
      return;
    }

    // Cancel any ongoing speech
    this._speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    
    // Configure voice settings
    if (this._voice) {
      utterance.voice = this._voice;
    }
    utterance.rate = this._rate;
    utterance.volume = this._volume;
    utterance.pitch = 1.0;

    // Speak the text
    this._speechSynthesis.speak(utterance);
  }

  private _checkSpeechSupport(): void {
    if ('speechSynthesis' in window) {
      this._speechSynthesis = window.speechSynthesis;
      
      // Wait for voices to load
      const loadVoices = () => {
        const voices = this._speechSynthesis?.getVoices() || [];
        // Prefer English voices
        this._voice = voices.find(voice => voice.lang.startsWith('en')) || voices[0] || null;
      };

      if (this._speechSynthesis.getVoices().length > 0) {
        loadVoices();
      } else {
        this._speechSynthesis.addEventListener('voiceschanged', loadVoices);
      }
    }
  }

  private _getOrdinal(num: number): string {
    const suffixes = ['th', 'st', 'nd', 'rd'];
    const value = num % 100;
    const suffix = suffixes[(value - 20) % 10] || suffixes[value] || suffixes[0] || 'th';
    return num + suffix;
  }

  private _getRatingDescription(rating: string): string {
    switch (rating) {
      case 'perfect':
        return 'Perfect! Lightning fast reflexes!';
      case 'excellent':
        return 'Excellent reaction time!';
      case 'good':
        return 'Good reaction time.';
      case 'fair':
        return 'Fair reaction time.';
      case 'slow':
        return 'Slow reaction time. Try to react faster.';
      case 'false_start':
        return 'False start. Wait for the lights to go out.';
      default:
        return rating;
    }
  }

  private _loadPreferences(): void {
    try {
      const saved = localStorage.getItem('f1-audio-announcer-preferences');
      if (saved) {
        const prefs = JSON.parse(saved);
        this._isEnabled = prefs.enabled ?? false;
        this._rate = prefs.rate ?? 1.0;
        this._volume = prefs.volume ?? 0.8;
      }
    } catch (error) {
      console.warn('Failed to load audio announcer preferences:', error);
    }
  }

  private _savePreferences(): void {
    try {
      const prefs = {
        enabled: this._isEnabled,
        rate: this._rate,
        volume: this._volume,
      };
      localStorage.setItem('f1-audio-announcer-preferences', JSON.stringify(prefs));
    } catch (error) {
      console.warn('Failed to save audio announcer preferences:', error);
    }
  }
}

// Export singleton instance
export const audioAnnouncer = new AudioAnnouncer();