import { useState } from 'react'
import GameOver from './components/GameOver'
import Lobby from './components/Lobby'
import Result from './components/Result'
import Table from './components/Table'
import { useGame } from './hooks/useGame'

export default function App() {
  const game = useGame()
  const { state } = game
  const [lobby, setLobby] = useState(false)
  const showLobby = lobby || !state

  return (
    <div className="app">
      <header className="masthead">
        <h1 className="wordmark">
          Pung
          <span className="wordmark-cjk" lang="zh-Hant" aria-hidden="true">
            碰
          </span>
        </h1>
        <nav className="masthead-nav">
          {state && !showLobby && (
            <button type="button" className="link-btn" onClick={() => setLobby(true)}>
              New game
            </button>
          )}
          <a className="masthead-link" href="https://github.com/francisphan/pung">
            Source
          </a>
        </nav>
      </header>

      <main>
        {showLobby ? (
          <Lobby
            settings={game.settings}
            inProgress={!!state && state.phase !== 'gameEnd'}
            onStart={(rules) => {
              game.start(rules)
              setLobby(false)
            }}
            onSettings={game.setSettings}
            onBack={() => setLobby(false)}
          />
        ) : (
          state && (
            <>
              <Table
                state={state}
                onDiscard={game.discard}
                onSelfWin={game.selfWin}
                onKong={game.kong}
                onDecide={game.decide}
              />
              {state.phase === 'handEnd' && <Result state={state} onNext={game.nextHand} />}
              {state.phase === 'gameEnd' && (
                <GameOver
                  state={state}
                  onNewGame={() => {
                    game.quit()
                    setLobby(true)
                  }}
                />
              )}
            </>
          )
        )}
      </main>
    </div>
  )
}
