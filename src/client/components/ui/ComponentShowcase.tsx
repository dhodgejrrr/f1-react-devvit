import React, { useState } from 'react';
import {
  Button,
  HUDDisplay,
  HUDItem,
  ScoreDisplay,
  TimeDisplay,
  StatusIndicator,
  ProgressBar,
  Counter,
  Modal,
  InstructionsModal,
  ErrorModal,
  ConfirmModal,
  SettingsModal,
  LoadingSpinner,
  LoadingButton,
  EmptyState,
  Skeleton,
  LoadingDots,
  Grid,
  ResponsiveContainer,
  Flex,
  Stack,
  Center,
  Spacer,
  AspectRatio
} from './index';

interface ComponentShowcaseProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ComponentShowcase: React.FC<ComponentShowcaseProps> = ({
  isOpen,
  onClose
}) => {
  const [activeSection, setActiveSection] = useState('buttons');
  const [showModal, setShowModal] = useState(false);
  const [showError, setShowError] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [loading, setLoading] = useState(false);
  const [counter, setCounter] = useState(5);
  const [progress] = useState(65);
  const [settings, setSettings] = useState({
    audioEnabled: true,
    difficulty: 'normal',
    accessibility: false
  });

  const sections = [
    { id: 'buttons', label: 'BUTTONS' },
    { id: 'hud', label: 'HUD COMPONENTS' },
    { id: 'modals', label: 'MODALS' },
    { id: 'loading', label: 'LOADING STATES' },
    { id: 'layout', label: 'LAYOUT SYSTEM' }
  ];

  const renderButtons = () => (
    <Stack spacing="large">
      <div className="text-arcade text-large color-white">BUTTON VARIANTS</div>
      
      <Grid columns={2} gap="medium">
        <Button variant="primary">PRIMARY</Button>
        <Button variant="secondary">SECONDARY</Button>
        <Button variant="danger">DANGER</Button>
        <Button variant="success">SUCCESS</Button>
        <Button variant="ghost">GHOST</Button>
        <Button variant="outline">OUTLINE</Button>
      </Grid>

      <div className="text-arcade text-large color-white">BUTTON SIZES</div>
      
      <Stack spacing="medium">
        <Button size="small">SMALL BUTTON</Button>
        <Button size="medium">MEDIUM BUTTON</Button>
        <Button size="large">LARGE BUTTON</Button>
        <Button size="hero">HERO BUTTON</Button>
      </Stack>

      <div className="text-arcade text-large color-white">BUTTON STATES</div>
      
      <Grid columns={2} gap="medium">
        <Button loading loadingText="LOADING...">LOADING</Button>
        <Button disabled>DISABLED</Button>
        <Button icon="🎮" iconPosition="left">WITH ICON</Button>
        <Button icon="⚡" iconPosition="right">ICON RIGHT</Button>
      </Grid>
    </Stack>
  );

  const renderHUD = () => (
    <Stack spacing="large">
      <div className="text-arcade text-large color-white">HUD COMPONENTS</div>
      
      <HUDDisplay>
        <Flex justify="between" align="center">
          <HUDItem label="LEVEL" value="5" color="yellow" />
          <HUDItem label="LIVES" value="3" color="red" />
          <HUDItem label="BONUS" value="1000" color="green" />
        </Flex>
      </HUDDisplay>

      <Grid columns={2} gap="medium">
        <ScoreDisplay score={125000} label="HIGH SCORE" color="gold" />
        <TimeDisplay time={186} label="BEST TIME" color="green" />
      </Grid>

      <div className="text-arcade text-medium color-white">STATUS INDICATORS</div>
      <Grid columns={3} gap="small">
        <StatusIndicator status="ready" animated />
        <StatusIndicator status="perfect" />
        <StatusIndicator status="false-start" />
      </Grid>

      <div className="text-arcade text-medium color-white">PROGRESS & COUNTER</div>
      <Stack spacing="medium">
        <ProgressBar 
          value={progress} 
          label="PROGRESS" 
          color="yellow" 
          showPercentage 
        />
        <Center>
          <Counter
            value={counter}
            label="ATTEMPTS"
            increment={() => setCounter(c => c + 1)}
            decrement={() => setCounter(c => Math.max(0, c - 1))}
            min={0}
            max={10}
          />
        </Center>
      </Stack>
    </Stack>
  );

  const renderModals = () => (
    <Stack spacing="large">
      <div className="text-arcade text-large color-white">MODAL SYSTEM</div>
      
      <Grid columns={2} gap="medium">
        <Button onClick={() => setShowModal(true)}>INSTRUCTIONS</Button>
        <Button variant="danger" onClick={() => setShowError(true)}>ERROR MODAL</Button>
        <Button variant="secondary" onClick={() => setShowConfirm(true)}>CONFIRM</Button>
        <Button onClick={() => setShowSettings(true)}>SETTINGS</Button>
      </Grid>

      <InstructionsModal isOpen={showModal} onClose={() => setShowModal(false)} />
      
      <ErrorModal
        isOpen={showError}
        onClose={() => setShowError(false)}
        message="SOMETHING WENT WRONG!"
        onAction={() => setShowError(false)}
      />
      
      <ConfirmModal
        isOpen={showConfirm}
        onClose={() => setShowConfirm(false)}
        onConfirm={() => setShowConfirm(false)}
        message="ARE YOU SURE YOU WANT TO RESET?"
        variant="danger"
      />
      
      <SettingsModal
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        settings={settings}
        onSettingsChange={setSettings}
      />
    </Stack>
  );

  const renderLoading = () => (
    <Stack spacing="large">
      <div className="text-arcade text-large color-white">LOADING STATES</div>
      
      <Grid columns={3} gap="medium">
        <Center>
          <LoadingSpinner size="small" color="white" />
        </Center>
        <Center>
          <LoadingSpinner size="medium" color="yellow" />
        </Center>
        <Center>
          <LoadingSpinner size="large" color="green" />
        </Center>
      </Grid>

      <div className="text-arcade text-medium color-white">LOADING PATTERNS</div>
      <Grid columns={2} gap="medium">
        <Center>
          <LoadingDots size="medium" color="yellow" />
        </Center>
        <LoadingButton
          isLoading={loading}
          onClick={() => {
            setLoading(true);
            setTimeout(() => setLoading(false), 2000);
          }}
        >
          CLICK ME
        </LoadingButton>
      </Grid>

      <div className="text-arcade text-medium color-white">SKELETON LOADING</div>
      <Stack spacing="small">
        <Skeleton height="2rem" />
        <Skeleton height="1rem" width="60%" />
        <Skeleton height="1rem" width="80%" />
      </Stack>

      <div className="text-arcade text-medium color-white">EMPTY STATES</div>
      <AspectRatio ratio="16:9">
        <EmptyState
          title="NO DATA FOUND"
          message="TRY PLAYING A GAME FIRST"
          actionLabel="START GAME"
          variant="default"
        />
      </AspectRatio>
    </Stack>
  );

  const renderLayout = () => (
    <Stack spacing="large">
      <div className="text-arcade text-large color-white">LAYOUT SYSTEM</div>
      
      <div className="text-arcade text-medium color-white">RESPONSIVE GRID</div>
      <Grid columns={3} gap="medium">
        <div className="arcade-container p-4 text-center">
          <div className="text-arcade text-small color-yellow">GRID ITEM 1</div>
        </div>
        <div className="arcade-container p-4 text-center">
          <div className="text-arcade text-small color-yellow">GRID ITEM 2</div>
        </div>
        <div className="arcade-container p-4 text-center">
          <div className="text-arcade text-small color-yellow">GRID ITEM 3</div>
        </div>
      </Grid>

      <div className="text-arcade text-medium color-white">FLEX LAYOUTS</div>
      <Stack spacing="medium">
        <Flex justify="between" align="center" className="arcade-container p-4">
          <div className="text-arcade text-small color-white">LEFT</div>
          <div className="text-arcade text-small color-yellow">CENTER</div>
          <div className="text-arcade text-small color-white">RIGHT</div>
        </Flex>
        
        <Flex justify="center" gap="medium" wrap className="arcade-container p-4">
          <Button size="small">ITEM 1</Button>
          <Button size="small">ITEM 2</Button>
          <Button size="small">ITEM 3</Button>
          <Button size="small">ITEM 4</Button>
        </Flex>
      </Stack>

      <div className="text-arcade text-medium color-white">ASPECT RATIOS</div>
      <Grid columns={2} gap="medium">
        <AspectRatio ratio="1:1">
          <div className="arcade-container w-full h-full flex items-center justify-center">
            <div className="text-arcade text-small color-yellow">1:1 SQUARE</div>
          </div>
        </AspectRatio>
        <AspectRatio ratio="16:9">
          <div className="arcade-container w-full h-full flex items-center justify-center">
            <div className="text-arcade text-small color-yellow">16:9 VIDEO</div>
          </div>
        </AspectRatio>
      </Grid>
    </Stack>
  );

  const renderContent = () => {
    switch (activeSection) {
      case 'buttons': return renderButtons();
      case 'hud': return renderHUD();
      case 'modals': return renderModals();
      case 'loading': return renderLoading();
      case 'layout': return renderLayout();
      default: return renderButtons();
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="COMPONENT SHOWCASE" size="large">
      <div className="space-y-6">
        {/* Navigation */}
        <Flex gap="small" wrap>
          {sections.map((section) => (
            <Button
              key={section.id}
              variant={activeSection === section.id ? 'primary' : 'outline'}
              size="small"
              onClick={() => setActiveSection(section.id)}
            >
              {section.label}
            </Button>
          ))}
        </Flex>

        <Spacer size="medium" />

        {/* Content */}
        <ResponsiveContainer maxWidth="full" padding="none">
          {renderContent()}
        </ResponsiveContainer>
      </div>
    </Modal>
  );
};