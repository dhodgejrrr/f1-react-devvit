import type { AudioSystem } from '../types/interfaces.js';

/**
 * Web Audio API integration for authentic F1 Start Challenge arcade sounds
 * Implements browser compatibility and mobile support for iOS Safari
 */
export class F1AudioSystem implements AudioSystem {
  private _audioContext: AudioContext | null = null;
  private _isInitialized = false;
  private _isMuted = false;
  private _masterGain: GainNode | null = null;
  private _isSupported = false;

  // Audio preferences
  private _volume = 0.7;
  private _lightSoundVolume = 0.8;
  private _resultSoundVolume = 0.9;
  private _uiSoundVolume = 0.5;

  // Haptic feedback
  private _hapticEnabled = true;

  // Frequency mappings for F1 light sequence
  private readonly _lightFrequencies = [440, 493.88, 523.25, 587.33, 659.25]; // A4 to E5

  constructor() {
    this._checkBrowserSupport();
    this._loadPreferences();
  }

  // Public API
  async initialize(): Promise<void> {
    if (this._isInitialized) {
      return;
    }

    if (!this._isSupported) {
      console.warn('Web Audio API not supported in this browser');
      return;
    }

    try {
      // Create audio context - must be done on user interaction
      await this._createAudioContext();
      
      // Set up master gain node
      this._setupMasterGain();
      
      this._isInitialized = true;
      console.log('F1 Audio System initialized successfully');
    } catch (error) {
      console.error('Failed to initialize audio system:', error);
      throw new Error('Audio initialization failed');
    }
  }

  playLightSound(lightIndex: number): void {
    if (!this._canPlayAudio() || lightIndex < 0 || lightIndex >= this._lightFrequencies.length) {
      return;
    }

    const frequency = this._lightFrequencies[lightIndex];
    if (frequency !== undefined) {
      this._playTone(frequency, 0.15, this._lightSoundVolume); // 150ms beep
    }
    
    // Add haptic feedback for mobile
    this._triggerHaptic('light');
  }

  playResultSound(type: 'perfect' | 'excellent' | 'good' | 'fair' | 'slow' | 'false_start'): void {
    if (!this._canPlayAudio()) {
      return;
    }

    switch (type) {
      case 'perfect':
        this._playPerfectSound();
        this._triggerHaptic('success');
        break;
      case 'excellent':
        this._playGoodSound();
        this._triggerHaptic('success');
        break;
      case 'good':
        this._playGoodSound();
        this._triggerHaptic('light');
        break;
      case 'fair':
        this._playOkaySound();
        this._triggerHaptic('light');
        break;
      case 'slow':
        this._playSlowSound();
        this._triggerHaptic('warning');
        break;
      case 'false_start':
        this._playFalseStartSound();
        this._triggerHaptic('error');
        break;
    }
  }

  playUISound(type: 'button_click' | 'navigation' | 'error' | 'success'): void {
    if (!this._canPlayAudio()) {
      return;
    }

    switch (type) {
      case 'button_click':
        this._playTone(800, 0.05, this._uiSoundVolume);
        this._triggerHaptic('light');
        break;
      case 'navigation':
        this._playTone(600, 0.08, this._uiSoundVolume);
        this._triggerHaptic('light');
        break;
      case 'error':
        this._playTone(200, 0.3, this._uiSoundVolume);
        this._triggerHaptic('error');
        break;
      case 'success':
        this._playChord([523.25, 659.25, 783.99], 0.4, this._uiSoundVolume); // C-E-G major chord
        this._triggerHaptic('success');
        break;
    }
  }

  playGhostSound(): void {
    if (!this._canPlayAudio()) {
      return;
    }

    // Subtle "ping" sound for ghost indicator - higher pitched, shorter duration
    this._playTone(1000, 0.08, this._uiSoundVolume * 0.6); // Softer than regular UI sounds
  }

  setMuted(muted: boolean): void {
    this._isMuted = muted;
    this._savePreferences();
    
    if (this._masterGain) {
      this._masterGain.gain.setValueAtTime(
        muted ? 0 : this._volume,
        this._audioContext?.currentTime ?? 0
      );
    }
  }

  setVolume(volume: number): void {
    this._volume = Math.max(0, Math.min(1, volume));
    this._savePreferences();
    
    if (this._masterGain && !this._isMuted) {
      this._masterGain.gain.setValueAtTime(
        this._volume,
        this._audioContext?.currentTime ?? 0
      );
    }
  }

  setCategoryVolume(category: 'lights' | 'results' | 'ui', volume: number): void {
    const clampedVolume = Math.max(0, Math.min(1, volume));
    
    switch (category) {
      case 'lights':
        this._lightSoundVolume = clampedVolume;
        break;
      case 'results':
        this._resultSoundVolume = clampedVolume;
        break;
      case 'ui':
        this._uiSoundVolume = clampedVolume;
        break;
    }
    
    this._savePreferences();
  }

  // Getters
  isSupported(): boolean {
    return this._isSupported;
  }

  getContext(): AudioContext | null {
    return this._audioContext;
  }

  isMuted(): boolean {
    return this._isMuted;
  }

  getVolume(): number {
    return this._volume;
  }

  getCategoryVolume(category: 'lights' | 'results' | 'ui'): number {
    switch (category) {
      case 'lights':
        return this._lightSoundVolume;
      case 'results':
        return this._resultSoundVolume;
      case 'ui':
        return this._uiSoundVolume;
      default:
        return 0.5;
    }
  }

  isInitialized(): boolean {
    return this._isInitialized;
  }

  // Haptic feedback controls
  setHapticEnabled(enabled: boolean): void {
    this._hapticEnabled = enabled;
    this._savePreferences();
  }

  getHapticEnabled(): boolean {
    return this._hapticEnabled;
  }

  isHapticSupported(): boolean {
    return 'vibrate' in navigator;
  }

  // Audio mixing system - get all volume levels
  getAllVolumes(): {
    master: number;
    lights: number;
    results: number;
    ui: number;
  } {
    return {
      master: this._volume,
      lights: this._lightSoundVolume,
      results: this._resultSoundVolume,
      ui: this._uiSoundVolume,
    };
  }

  // Audio mixing system - set all volume levels at once
  setAllVolumes(volumes: {
    master?: number;
    lights?: number;
    results?: number;
    ui?: number;
  }): void {
    if (volumes.master !== undefined) {
      this.setVolume(volumes.master);
    }
    if (volumes.lights !== undefined) {
      this.setCategoryVolume('lights', volumes.lights);
    }
    if (volumes.results !== undefined) {
      this.setCategoryVolume('results', volumes.results);
    }
    if (volumes.ui !== undefined) {
      this.setCategoryVolume('ui', volumes.ui);
    }
  }

  // Reset all volumes to defaults
  resetVolumes(): void {
    this._volume = 0.7;
    this._lightSoundVolume = 0.8;
    this._resultSoundVolume = 0.9;
    this._uiSoundVolume = 0.5;
    this._savePreferences();
    
    if (this._masterGain && !this._isMuted) {
      this._masterGain.gain.setValueAtTime(
        this._volume,
        this._audioContext?.currentTime ?? 0
      );
    }
  }

  // Get detailed system status for debugging
  getSystemStatus(): {
    isSupported: boolean;
    isInitialized: boolean;
    contextState: string | null;
    isMuted: boolean;
    volume: number;
    hapticSupported: boolean;
    browserInfo: string;
    volumes: {
      master: number;
      lights: number;
      results: number;
      ui: number;
    };
  } {
    return {
      isSupported: this._isSupported,
      isInitialized: this._isInitialized,
      contextState: this._audioContext?.state || null,
      isMuted: this._isMuted,
      volume: this._volume,
      hapticSupported: this.isHapticSupported(),
      browserInfo: navigator.userAgent.substring(0, 100), // Truncated for privacy
      volumes: this.getAllVolumes(),
    };
  }

  // Audio context recovery
  async resumeAudioContext(): Promise<boolean> {
    if (!this._audioContext) {
      return false;
    }

    try {
      const currentState = this._audioContext.state;
      if (currentState === 'suspended') {
        await this._audioContext.resume();
        return this._audioContext.state === 'running';
      }
      return currentState === 'running';
    } catch (error) {
      console.warn('Failed to resume audio context:', error);
      return false;
    }
  }

  // Check if audio context needs recovery
  needsRecovery(): boolean {
    return !!this._audioContext && this._audioContext.state !== 'running';
  }

  // Cleanup
  destroy(): void {
    if (this._audioContext) {
      try {
        this._audioContext.close();
      } catch (error) {
        console.warn('Error closing audio context:', error);
      }
      this._audioContext = null;
    }
    this._isInitialized = false;
  }

  // Private methods
  private _checkBrowserSupport(): void {
    // Check for Web Audio API support with comprehensive browser compatibility
    this._isSupported = !!(
      window.AudioContext || 
      (window as any).webkitAudioContext ||
      (window as any).mozAudioContext ||
      (window as any).msAudioContext
    );

    // Additional checks for mobile browsers
    if (this._isSupported) {
      try {
        // Test if we can actually create an AudioContext
        const TestAudioContext = window.AudioContext || (window as any).webkitAudioContext;
        const testContext = new TestAudioContext();
        testContext.close();
      } catch (error) {
        console.warn('AudioContext creation test failed:', error);
        this._isSupported = false;
      }
    }
  }

  private async _createAudioContext(): Promise<void> {
    if (this._audioContext) {
      return;
    }

    try {
      // Create audio context with comprehensive browser compatibility
      const AudioContextClass = window.AudioContext || 
                               (window as any).webkitAudioContext ||
                               (window as any).mozAudioContext ||
                               (window as any).msAudioContext;
      
      if (!AudioContextClass) {
        throw new Error('No AudioContext implementation found');
      }

      this._audioContext = new AudioContextClass();

      // Handle iOS Safari and other mobile browsers requirement for user interaction
      if (this._audioContext.state === 'suspended') {
        await this._audioContext.resume();
      }

      // Verify the context is actually working
      if (this._audioContext.state === 'closed') {
        throw new Error('AudioContext is in closed state');
      }

    } catch (error) {
      console.error('Failed to create AudioContext:', error);
      this._audioContext = null;
      throw new Error(`AudioContext creation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private _setupMasterGain(): void {
    if (!this._audioContext) {
      return;
    }

    this._masterGain = this._audioContext.createGain();
    this._masterGain.connect(this._audioContext.destination);
    this._masterGain.gain.setValueAtTime(
      this._isMuted ? 0 : this._volume,
      this._audioContext.currentTime
    );
  }

  private _canPlayAudio(): boolean {
    return this._isInitialized && 
           !!this._audioContext && 
           this._audioContext.state === 'running' && 
           !!this._masterGain;
  }

  private _playTone(frequency: number, duration: number, volume: number): void {
    if (!this._audioContext || !this._masterGain) {
      return;
    }

    try {
      // Validate parameters
      if (frequency <= 0 || duration <= 0 || volume < 0 || volume > 1) {
        console.warn('Invalid audio parameters:', { frequency, duration, volume });
        return;
      }

      const oscillator = this._audioContext.createOscillator();
      const gainNode = this._audioContext.createGain();

      // Connect nodes
      oscillator.connect(gainNode);
      gainNode.connect(this._masterGain);

      // Configure oscillator with error handling
      oscillator.frequency.setValueAtTime(frequency, this._audioContext.currentTime);
      oscillator.type = 'square'; // Authentic arcade sound

      // Configure envelope (quick attack, quick release)
      const now = this._audioContext.currentTime;
      gainNode.gain.setValueAtTime(0, now);
      gainNode.gain.linearRampToValueAtTime(volume, now + 0.01); // 10ms attack
      gainNode.gain.exponentialRampToValueAtTime(0.001, now + duration); // Exponential decay

      // Add error handling for oscillator lifecycle
      oscillator.addEventListener('ended', () => {
        try {
          oscillator.disconnect();
          gainNode.disconnect();
        } catch (error) {
          // Ignore disconnect errors - nodes may already be disconnected
        }
      });

      // Start and stop with error handling
      oscillator.start(now);
      oscillator.stop(now + duration);

    } catch (error) {
      console.warn('Failed to play tone:', error);
    }
  }

  private _playChord(frequencies: number[], duration: number, volume: number): void {
    frequencies.forEach(freq => {
      this._playTone(freq, duration, volume * 0.6); // Reduce volume for chord
    });
  }

  private _playPerfectSound(): void {
    // Perfect: Ascending major chord
    const frequencies = [523.25, 659.25, 783.99]; // C-E-G
    frequencies.forEach((freq, index) => {
      setTimeout(() => {
        this._playTone(freq, 0.2, this._resultSoundVolume);
      }, index * 50);
    });
  }

  private _playGoodSound(): void {
    // Good: Two-tone success
    this._playTone(659.25, 0.15, this._resultSoundVolume); // E5
    setTimeout(() => {
      this._playTone(783.99, 0.15, this._resultSoundVolume); // G5
    }, 100);
  }

  private _playOkaySound(): void {
    // Okay: Single tone
    this._playTone(523.25, 0.2, this._resultSoundVolume); // C5
  }

  private _playSlowSound(): void {
    // Slow: Descending tone
    this._playTone(400, 0.3, this._resultSoundVolume);
  }

  private _playFalseStartSound(): void {
    // False start: Harsh buzzer
    this._playTone(150, 0.5, this._resultSoundVolume);
  }

  private _loadPreferences(): void {
    try {
      const saved = localStorage.getItem('f1-audio-preferences');
      if (saved) {
        const prefs = JSON.parse(saved);
        this._isMuted = prefs.muted ?? false;
        this._volume = prefs.volume ?? 0.7;
        this._lightSoundVolume = prefs.lightVolume ?? 0.8;
        this._resultSoundVolume = prefs.resultVolume ?? 0.9;
        this._uiSoundVolume = prefs.uiVolume ?? 0.5;
        this._hapticEnabled = prefs.hapticEnabled ?? true;
      }
    } catch (error) {
      console.warn('Failed to load audio preferences:', error);
    }
  }

  private _savePreferences(): void {
    try {
      const prefs = {
        muted: this._isMuted,
        volume: this._volume,
        lightVolume: this._lightSoundVolume,
        resultVolume: this._resultSoundVolume,
        uiVolume: this._uiSoundVolume,
        hapticEnabled: this._hapticEnabled,
      };
      localStorage.setItem('f1-audio-preferences', JSON.stringify(prefs));
    } catch (error) {
      console.warn('Failed to save audio preferences:', error);
    }
  }

  private _triggerHaptic(type: 'light' | 'warning' | 'error' | 'success'): void {
    if (!this._hapticEnabled || !this.isHapticSupported()) {
      return;
    }

    try {
      switch (type) {
        case 'light':
          navigator.vibrate(50); // Short pulse
          break;
        case 'warning':
          navigator.vibrate([100, 50, 100]); // Double pulse
          break;
        case 'error':
          navigator.vibrate([200, 100, 200, 100, 200]); // Long error pattern
          break;
        case 'success':
          navigator.vibrate([50, 25, 50, 25, 100]); // Success pattern
          break;
      }
    } catch (error) {
      console.warn('Haptic feedback failed:', error);
    }
  }
}

// Export singleton instance
export const audioSystem = new F1AudioSystem();