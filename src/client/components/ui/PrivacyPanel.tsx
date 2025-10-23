import React, { useState } from 'react';
import { useUserSession } from '../../hooks/useUserSession.js';
import { Button } from './Button.js';
import { Modal } from './Modal.js';

interface PrivacyPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

/**
 * Privacy compliance panel for user data management
 * Allows users to view, export, and delete their data
 */
export const PrivacyPanel: React.FC<PrivacyPanelProps> = ({ isOpen, onClose }) => {
  const { 
    userSession, 
    getActivityHistory, 
    deleteUserData, 
    isAnonymous,
    loading 
  } = useUserSession();
  
  const [activeTab, setActiveTab] = useState<'overview' | 'activity' | 'delete'>('overview');
  const [activityHistory, setActivityHistory] = useState<any[]>([]);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const handleViewActivity = async () => {
    try {
      const activities = await getActivityHistory();
      setActivityHistory(activities);
      setActiveTab('activity');
    } catch (error) {
      console.error('Failed to load activity history:', error);
    }
  };

  const handleDeleteData = async () => {
    try {
      setDeleteLoading(true);
      await deleteUserData();
      setShowDeleteConfirm(false);
      onClose();
      // Optionally show success message
    } catch (error) {
      console.error('Failed to delete user data:', error);
      // Show error message to user
    } finally {
      setDeleteLoading(false);
    }
  };

  const formatActivityType = (type: string) => {
    switch (type) {
      case 'game_start': return 'Game Started';
      case 'game_complete': return 'Game Completed';
      case 'leaderboard_view': return 'Viewed Leaderboard';
      case 'challenge_create': return 'Created Challenge';
      case 'challenge_accept': return 'Accepted Challenge';
      default: return type;
    }
  };

  const formatTimestamp = (timestamp: number) => {
    return new Date(timestamp).toLocaleString();
  };

  if (!isOpen) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="PRIVACY & DATA">
      <div style={{ 
        display: 'flex', 
        flexDirection: 'column', 
        gap: 'var(--spacing-md)',
        maxHeight: '70vh',
        overflow: 'hidden'
      }}>
        
        {/* Tab Navigation */}
        <div style={{ 
          display: 'flex', 
          gap: 'var(--spacing-sm)',
          borderBottom: '2px solid var(--color-white)',
          paddingBottom: 'var(--spacing-sm)'
        }}>
          <Button
            variant={activeTab === 'overview' ? 'primary' : 'secondary'}
            size="small"
            onClick={() => setActiveTab('overview')}
          >
            OVERVIEW
          </Button>
          <Button
            variant={activeTab === 'activity' ? 'primary' : 'secondary'}
            size="small"
            onClick={handleViewActivity}
            disabled={isAnonymous()}
          >
            ACTIVITY
          </Button>
          <Button
            variant={activeTab === 'delete' ? 'primary' : 'secondary'}
            size="small"
            onClick={() => setActiveTab('delete')}
            disabled={isAnonymous()}
          >
            DELETE DATA
          </Button>
        </div>

        {/* Tab Content */}
        <div style={{ 
          flex: 1, 
          overflowY: 'auto',
          padding: 'var(--spacing-sm)'
        }}>
          
          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
              <div className="text-arcade text-large color-yellow">DATA OVERVIEW</div>
              
              {isAnonymous() ? (
                <div className="text-arcade color-white">
                  You are playing anonymously. No personal data is stored on our servers.
                  Only local browser storage is used for preferences and session data.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-sm)' }}>
                  <div className="text-arcade color-white">
                    <strong>User ID:</strong> {userSession?.userId}
                  </div>
                  <div className="text-arcade color-white">
                    <strong>Username:</strong> {userSession?.username}
                  </div>
                  <div className="text-arcade color-white">
                    <strong>Session Start:</strong> {userSession?.sessionStart ? formatTimestamp(userSession.sessionStart) : 'N/A'}
                  </div>
                  <div className="text-arcade color-white">
                    <strong>Games Played:</strong> {userSession?.sessionStats.gamesPlayed || 0}
                  </div>
                  <div className="text-arcade color-white">
                    <strong>Personal Best:</strong> {userSession?.personalBest ? `${userSession.personalBest}ms` : 'None'}
                  </div>
                </div>
              )}

              <div className="text-arcade text-small color-white" style={{ 
                marginTop: 'var(--spacing-md)',
                padding: 'var(--spacing-sm)',
                border: '1px solid var(--color-white)'
              }}>
                <strong>Data Collection:</strong><br/>
                • Reaction times and game statistics<br/>
                • User preferences (audio, difficulty)<br/>
                • Activity logs (game starts, completions)<br/>
                • No personal information beyond Reddit username<br/>
                • No location or device tracking<br/>
                • Data is used for leaderboards and anti-cheat only
              </div>
            </div>
          )}

          {/* Activity Tab */}
          {activeTab === 'activity' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
              <div className="text-arcade text-large color-yellow">ACTIVITY HISTORY</div>
              
              {loading ? (
                <div className="text-arcade color-white">Loading activity history...</div>
              ) : activityHistory.length === 0 ? (
                <div className="text-arcade color-white">No activity history found.</div>
              ) : (
                <div style={{ 
                  display: 'flex', 
                  flexDirection: 'column', 
                  gap: 'var(--spacing-xs)',
                  maxHeight: '300px',
                  overflowY: 'auto'
                }}>
                  {activityHistory.map((activity, index) => (
                    <div 
                      key={index}
                      className="text-arcade text-small color-white"
                      style={{ 
                        padding: 'var(--spacing-xs)',
                        border: '1px solid var(--color-white)',
                        display: 'flex',
                        justifyContent: 'space-between'
                      }}
                    >
                      <span>{formatActivityType(activity.type)}</span>
                      <span>{formatTimestamp(activity.timestamp)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Delete Data Tab */}
          {activeTab === 'delete' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
              <div className="text-arcade text-large color-red">DELETE ALL DATA</div>
              
              <div className="text-arcade color-white">
                This will permanently delete all your data including:
              </div>
              
              <div className="text-arcade text-small color-white" style={{ 
                padding: 'var(--spacing-sm)',
                border: '1px solid var(--color-red)'
              }}>
                • All reaction times and game statistics<br/>
                • Personal best records<br/>
                • User preferences and settings<br/>
                • Activity history and logs<br/>
                • Leaderboard entries<br/>
                <br/>
                <strong>This action cannot be undone!</strong>
              </div>

              {!showDeleteConfirm ? (
                <Button
                  variant="danger"
                  onClick={() => setShowDeleteConfirm(true)}
                  disabled={deleteLoading}
                >
                  DELETE MY DATA
                </Button>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-sm)' }}>
                  <div className="text-arcade color-red">
                    Are you sure? This cannot be undone.
                  </div>
                  <div style={{ display: 'flex', gap: 'var(--spacing-sm)' }}>
                    <Button
                      variant="danger"
                      onClick={handleDeleteData}
                      disabled={deleteLoading}
                    >
                      {deleteLoading ? 'DELETING...' : 'YES, DELETE'}
                    </Button>
                    <Button
                      variant="secondary"
                      onClick={() => setShowDeleteConfirm(false)}
                      disabled={deleteLoading}
                    >
                      CANCEL
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Close Button */}
        <div style={{ 
          borderTop: '2px solid var(--color-white)',
          paddingTop: 'var(--spacing-sm)'
        }}>
          <Button variant="secondary" onClick={onClose} fullWidth>
            CLOSE
          </Button>
        </div>
      </div>
    </Modal>
  );
};