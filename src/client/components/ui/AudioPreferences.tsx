import React, { useState, useEffect } from 'react';
import { clsx } from 'clsx';
import { audioSystem } from '../../services/AudioSystem.js';

interface AudioPreferencesProps {
  className?: string;
}

// Simple audio settings state management
const AUDIO_STORAGE_KEY = 'f1-audio-settings';

interface AudioSettings {
  audioEnabled: boolean;
  masterVolume: number;
  lightVolume: number;
  resultVolume: number;
  uiVolume: number;
}

const defaultSettings: AudioSettings = {
  audioEnabled: true,
  masterVolume: 0.7,
  lightVolume: 0.8,
  resultVolume: 0.9,
  uiVolume: 0.5,
};

const loadAudioSettings = (): AudioSettings => {
  try {
    const stored = localStorage.getItem(AUDIO_STORAGE_KEY);
    return stored ? { ...defaultSettings, ...JSON.parse(stored) } : defaultSettings;
  } catch {
    return defaultSettings;
  }
};

const saveAudioSettings = (settings: AudioSettings) => {
  try {
    localStorage.setItem(AUDIO_STORAGE_KEY, JSON.stringify(settings));
  } catch (error) {
    console.warn('Failed to save audio settings:', error);
  }
};

export const AudioPreferences: React.FC<AudioPreferencesProps> = ({ className }) => {
  const [settings, setSettings] = useState<AudioSettings>(loadAudioSettings);

  // Save settings when they change
  useEffect(() => {
    saveAudioSettings(settings);
  }, [settings]);

  const handleMuteToggle = () => {
    setSettings(prev => ({ ...prev, audioEnabled: !prev.audioEnabled }));
  };

  const handleVolumeChange = (category: 'master' | 'lights' | 'results' | 'ui', value: number) => {
    setSettings(prev => ({
      ...prev,
      [`${category}Volume`]: value
    }));
  };

  if (!audioSystem.isSupported()) {
    return (
      <div className={clsx('text-center p-6', className)}>
        <div className="text-arcade text-medium color-white opacity-75">
          🔇 AUDIO NOT SUPPORTED
        </div>
        <div className="text-arcade text-small color-white opacity-50 mt-2">
          Your browser does not support Web Audio API
        </div>
      </div>
    );
  }

  return (
    <div className={clsx('space-y-6', className)}>
      {/* Master Audio Toggle */}
      <AudioToggle
        label="ENABLE AUDIO"
        description="Turn game audio on or off"
        checked={settings.audioEnabled}
        onChange={handleMuteToggle}
        icon="🔊"
      />

      {/* Volume Controls */}
      {settings.audioEnabled && (
        <div className="space-y-4 pl-4 border-l-2 border-white opacity-75">
          <VolumeSlider
            label="MASTER VOLUME"
            description="Overall audio volume"
            value={settings.masterVolume}
            onChange={(value) => handleVolumeChange('master', value)}
            icon="🎚️"
          />

          <VolumeSlider
            label="LIGHT SOUNDS"
            description="F1 starting light beeps"
            value={settings.lightVolume}
            onChange={(value) => handleVolumeChange('lights', value)}
            icon="🚦"
          />

          <VolumeSlider
            label="RESULT SOUNDS"
            description="Reaction time feedback sounds"
            value={settings.resultVolume}
            onChange={(value) => handleVolumeChange('results', value)}
            icon="🏁"
          />

          <VolumeSlider
            label="UI SOUNDS"
            description="Button clicks and navigation"
            value={settings.uiVolume}
            onChange={(value) => handleVolumeChange('ui', value)}
            icon="🔘"
          />
        </div>
      )}

      {/* Haptic Feedback */}
      {audioSystem.isHapticSupported() && (
        <div className="border-t-2 border-white pt-4">
          <AudioToggle
            label="HAPTIC FEEDBACK"
            description="Vibration feedback on mobile devices"
            checked={audioSystem.getHapticEnabled()}
            onChange={() => audioSystem.setHapticEnabled(!audioSystem.getHapticEnabled())}
            icon="📳"
          />
        </div>
      )}

      {/* Audio-Only Mode Info */}
      <div className="p-4 border-2 border-white opacity-50">
        <div className="text-arcade text-small color-white">
          <div className="mb-2">🎧 AUDIO-ONLY MODE</div>
          <div className="opacity-75">
            When enabled, provides comprehensive audio descriptions of all game elements
            for visually impaired users. Includes timing announcements, light sequence
            descriptions, and detailed result feedback.
          </div>
        </div>
      </div>
    </div>
  );
};

interface AudioToggleProps {
  label: string;
  description: string;
  checked: boolean;
  onChange: () => void;
  icon?: string;
}

const AudioToggle: React.FC<AudioToggleProps> = ({
  label,
  description,
  checked,
  onChange,
  icon
}) => {
  const toggleId = `audio-toggle-${label.toLowerCase().replace(/\s+/g, '-')}`;
  const descId = `${toggleId}-desc`;

  return (
    <div className="flex items-start gap-4">
      <button
        id={toggleId}
        className={clsx(
          'w-8 h-8 flex-shrink-0',
          'border-2',
          'arcade-focus',
          'flex items-center justify-center',
          'transition-none',
          'touch-target',
          checked ? 'bg-yellow border-yellow' : 'bg-black border-white'
        )}
        onClick={onChange}
        aria-checked={checked}
        aria-describedby={descId}
        role="switch"
      >
        {checked && (
          <span className="color-black text-medium" aria-hidden="true">✓</span>
        )}
      </button>
      
      <div className="flex-1 min-w-0">
        <label 
          htmlFor={toggleId}
          className="text-arcade text-medium color-white cursor-pointer block flex items-center gap-2"
        >
          {icon && <span aria-hidden="true">{icon}</span>}
          {label}
        </label>
        <div 
          id={descId}
          className="text-arcade text-small color-white opacity-75 mt-1"
        >
          {description}
        </div>
      </div>
    </div>
  );
};

interface VolumeSliderProps {
  label: string;
  description: string;
  value: number;
  onChange: (value: number) => void;
  icon?: string;
}

const VolumeSlider: React.FC<VolumeSliderProps> = ({
  label,
  description,
  value,
  onChange,
  icon
}) => {
  const sliderId = `volume-${label.toLowerCase().replace(/\s+/g, '-')}`;
  const descId = `${sliderId}-desc`;
  const percentage = Math.round(value * 100);

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = parseFloat(event.target.value);
    onChange(newValue);
  };

  return (
    <div className="space-y-2">
      <label 
        htmlFor={sliderId}
        className="text-arcade text-small color-white flex items-center justify-between"
      >
        <span className="flex items-center gap-2">
          {icon && <span aria-hidden="true">{icon}</span>}
          {label}
        </span>
        <span className="color-yellow">{percentage}%</span>
      </label>
      
      <div className="relative">
        <input
          id={sliderId}
          type="range"
          min="0"
          max="1"
          step="0.1"
          value={value}
          onChange={handleChange}
          aria-describedby={descId}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={percentage}
          aria-valuetext={`${percentage} percent`}
          className={clsx(
            'w-full h-2 bg-black border-2 border-white',
            'arcade-focus',
            'appearance-none cursor-pointer',
            '[&::-webkit-slider-thumb]:appearance-none',
            '[&::-webkit-slider-thumb]:w-4',
            '[&::-webkit-slider-thumb]:h-4',
            '[&::-webkit-slider-thumb]:bg-yellow',
            '[&::-webkit-slider-thumb]:border-2',
            '[&::-webkit-slider-thumb]:border-white',
            '[&::-webkit-slider-thumb]:cursor-pointer',
            '[&::-moz-range-thumb]:w-4',
            '[&::-moz-range-thumb]:h-4',
            '[&::-moz-range-thumb]:bg-yellow',
            '[&::-moz-range-thumb]:border-2',
            '[&::-moz-range-thumb]:border-white',
            '[&::-moz-range-thumb]:cursor-pointer',
            '[&::-moz-range-thumb]:border-radius-0'
          )}
        />
        
        {/* Visual volume indicator */}
        <div 
          className="absolute top-0 left-0 h-full bg-yellow opacity-50 pointer-events-none"
          style={{ width: `${percentage}%` }}
          aria-hidden="true"
        />
      </div>
      
      <div 
        id={descId}
        className="text-arcade text-xs color-white opacity-50"
      >
        {description}
      </div>
    </div>
  );
};