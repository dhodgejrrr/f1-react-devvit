import { context, reddit } from '@devvit/web/server';

export const createPost = async () => {
  const { subredditName } = context;
  if (!subredditName) {
    throw new Error('subredditName is required');
  }

  return await reddit.submitCustomPost({
    splash: {
      // Splash Screen Configuration
      appDisplayName: 'F1 Start Challenge',
      backgroundUri: 'default-splash.png',
      buttonLabel: 'Start Challenge',
      description: 'Test your reaction time against the iconic Formula 1 starting sequence',
      heading: 'F1 Start Challenge',
      appIconUri: 'default-icon.png',
    },
    postData: {
      gameState: 'initial',
      score: 0,
    },
    subredditName: subredditName,
    title: 'F1 Start Challenge',
  });
};
