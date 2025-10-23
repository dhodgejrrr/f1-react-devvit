import React, { useState } from 'react';
import { clsx } from 'clsx';
import { useAccessibility } from '../../hooks/useAccessibility.js';
import { Button } from './Button.js';
import { Modal } from './Modal.js';
import { FocusTrap, KeyboardNavigation } from './Accessibility.js';
import { AudioPreferences } from './AudioPreferences.js';

interface AccessibilityPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AccessibilityPanel: React.FC<AccessibilityPanelProps> = ({
  isOpen,
  onClose
}) => {
  const { settings, updateSettings, announce } = useAccessibility();
  const [activeTab, setActiveTab] = useState<'visual' | 'audio' | 'interaction'>('visual');

  const handleSettingChange = (setting: keyof typeof settings, value: boolean) => {
    updateSettings({ [setting]: value });
    announce(`${setting.replace(/([A-Z])/g, ' $1').toLowerCase()} ${value ? 'enabled' : 'disabled'}`);
  };

  const tabs = [
    { id: 'visual' as const, label: 'VISUAL', icon: '👁️' },
    { id: 'audio' as const, label: 'AUDIO', icon: '🔊' },
    { id: 'interaction' as const, label: 'INTERACTION', icon: '⌨️' },
  ];

  const renderVisualSettings = () => (
    <div className="space-y-4">
      <AccessibilityToggle
        label="HIGH CONTRAST MODE"
        description="Increases contrast and adds visual patterns for better visibility"
        checked={settings.highContrast}
        onChange={(value) => handleSettingChange('highContrast', value)}
      />
      
      <AccessibilityToggle
        label="LARGE TEXT"
        description="Increases text size throughout the application"
        checked={settings.largeText}
        onChange={(value) => handleSettingChange('largeText', value)}
      />
      
      <AccessibilityToggle
        label="REDUCED MOTION"
        description="Reduces animations and transitions"
        checked={settings.reducedMotion}
        onChange={(value) => handleSettingChange('reducedMotion', value)}
      />
    </div>
  );

  const renderAudioSettings = () => (
    <div className="space-y-6">
      <AudioPreferences />
      
      <div className="border-t-2 border-white pt-4">
        <AccessibilityToggle
          label="AUDIO-ONLY MODE"
          description="Provides audio cues and descriptions for all visual elements"
          checked={settings.audioOnly}
          onChange={(value) => handleSettingChange('audioOnly', value)}
        />
      </div>
    </div>
  );

  const renderInteractionSettings = () => (
    <div className="space-y-4">
      <AccessibilityToggle
        label="KEYBOARD NAVIGATION"
        description="Enhanced keyboard navigation with visible focus indicators"
        checked={settings.keyboardNavigation}
        onChange={(value) => handleSettingChange('keyboardNavigation', value)}
      />
      
      <div className="text-arcade text-small color-white opacity-75">
        <div className="mb-2">KEYBOARD SHORTCUTS:</div>
        <div>• SPACEBAR or ENTER: React to lights</div>
        <div>• TAB: Navigate between elements</div>
        <div>• ESCAPE: Close dialogs</div>
        <div>• ARROW KEYS: Navigate menus</div>
      </div>
    </div>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="ACCESSIBILITY SETTINGS"
      size="large"
    >
      <FocusTrap isActive={isOpen} onEscape={onClose}>
        <div className="flex flex-col h-full">
          {/* Tab Navigation */}
          <KeyboardNavigation
            onArrowLeft={() => {
              const currentIndex = tabs.findIndex(tab => tab.id === activeTab);
              const prevIndex = currentIndex > 0 ? currentIndex - 1 : tabs.length - 1;
              const prevTab = tabs[prevIndex];
              if (prevTab) {
                setActiveTab(prevTab.id);
              }
            }}
            onArrowRight={() => {
              const currentIndex = tabs.findIndex(tab => tab.id === activeTab);
              const nextIndex = currentIndex < tabs.length - 1 ? currentIndex + 1 : 0;
              const nextTab = tabs[nextIndex];
              if (nextTab) {
                setActiveTab(nextTab.id);
              }
            }}
          >
            <div 
              className="flex border-b-2 border-white mb-6"
              role="tablist"
              aria-label="Accessibility settings categories"
            >
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  className={clsx(
                    'flex-1 px-4 py-3 text-arcade text-medium arcade-focus',
                    'border-b-2 transition-none',
                    activeTab === tab.id
                      ? 'color-yellow border-yellow'
                      : 'color-white border-transparent hover:color-yellow'
                  )}
                  onClick={() => setActiveTab(tab.id)}
                  role="tab"
                  aria-selected={activeTab === tab.id}
                  aria-controls={`panel-${tab.id}`}
                  tabIndex={activeTab === tab.id ? 0 : -1}
                >
                  <span className="mr-2" aria-hidden="true">{tab.icon}</span>
                  {tab.label}
                </button>
              ))}
            </div>
          </KeyboardNavigation>

          {/* Tab Panels */}
          <div className="flex-1 overflow-y-auto">
            <div
              id="panel-visual"
              role="tabpanel"
              aria-labelledby="tab-visual"
              hidden={activeTab !== 'visual'}
            >
              {activeTab === 'visual' && renderVisualSettings()}
            </div>

            <div
              id="panel-audio"
              role="tabpanel"
              aria-labelledby="tab-audio"
              hidden={activeTab !== 'audio'}
            >
              {activeTab === 'audio' && renderAudioSettings()}
            </div>

            <div
              id="panel-interaction"
              role="tabpanel"
              aria-labelledby="tab-interaction"
              hidden={activeTab !== 'interaction'}
            >
              {activeTab === 'interaction' && renderInteractionSettings()}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-4 mt-6 pt-4 border-t-2 border-white">
            <Button
              variant="secondary"
              onClick={() => {
                // Reset to defaults
                updateSettings({
                  highContrast: false,
                  reducedMotion: false,
                  audioOnly: false,
                  largeText: false,
                  keyboardNavigation: false,
                });
                announce('Accessibility settings reset to defaults');
              }}
              className="flex-1"
            >
              RESET TO DEFAULTS
            </Button>
            
            <Button
              variant="primary"
              onClick={onClose}
              className="flex-1"
            >
              DONE
            </Button>
          </div>
        </div>
      </FocusTrap>
    </Modal>
  );
};

interface AccessibilityToggleProps {
  label: string;
  description: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}

const AccessibilityToggle: React.FC<AccessibilityToggleProps> = ({
  label,
  description,
  checked,
  onChange
}) => {
  const toggleId = `toggle-${label.toLowerCase().replace(/\s+/g, '-')}`;
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
        onClick={() => onChange(!checked)}
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
          className="text-arcade text-medium color-white cursor-pointer block"
        >
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