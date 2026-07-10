import React from 'react';
import { SocketProvider, useSocket } from './context/SocketContext';
import { Home } from './pages/Home';
import { Lobby } from './pages/Lobby';
import { GameBoard } from './components/GameBoard';
import { WinnerScreen } from './components/WinnerScreen';

function AppContent() {
  const { gameState } = useSocket();

  if (!gameState) {
    return <Home />;
  }

  if (gameState.status === 'lobby') {
    return <Lobby />;
  }

  // playing or gameover states
  return (
    <>
      <GameBoard />
      <WinnerScreen />
    </>
  );
}

function App() {
  return (
    <SocketProvider>
      <AppContent />
    </SocketProvider>
  );
}

export default App;
