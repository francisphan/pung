import { useMemo, useState } from 'react'
import GameOver from './components/GameOver'
import Lobby from './components/Lobby'
import Result from './components/Result'
import RoomLobby from './components/RoomLobby'
import Table from './components/Table'
import { useGame, useSettings } from './hooks/useGame'
import { useRoom } from './hooks/useRoom'
import { useSounds } from './hooks/useSounds'
import { SOLO, WIND_NAME, type Seating } from './names'
import { WINDS } from './engine/tiles'
import { cleanCode, type RoomInfo } from './net/protocol'
import { serverUrl } from './net/serverUrl'
import { SeatingContext } from './seat'

function seatingOf(room: RoomInfo): Seating {
  const names = room.seats.map((s, i) => (s.kind === 'open' ? WIND_NAME[WINDS[i]] : s.name))
  return { me: room.you.seat ?? 0, names }
}

function nameIn(room: RoomInfo, id: string | null): string | null {
  const s = room.seats.find((x) => x.kind === 'human' && x.id === id)
  return s?.kind === 'human' ? s.name : null
}

export default function App() {
  const { settings, setSettings } = useSettings()
  const url = useMemo(() => serverUrl(), [])
  const joinCode = useMemo(() => cleanCode(new URLSearchParams(window.location.search).get('join')), [])
  const solo = useGame()
  const online = useRoom(url, settings.name.trim() || 'Guest')
  // A shared link opens the lobby with its code filled in, even over a solo game in progress.
  const [lobby, setLobby] = useState(() => joinCode !== null)

  const room = online.room
  const inRoom = room !== null || online.busy
  const seating = room ? seatingOf(room) : SOLO
  const state = inRoom ? (room && room.status !== 'lobby' ? online.view : null) : solo.state
  const showLobby = !inRoom && (lobby || !solo.state)
  useSounds(state, settings.sound, seating.me)
  const toggleLog = () => setSettings({ log: !settings.log })
  // A host's browser is the table: leaving ends it for everyone else there.
  const leave = () => {
    const others = room?.seats.some((s) => s.kind === 'human' && s.id !== room.you.id) ?? false
    if (online.hosting && others && !window.confirm('Leaving closes the table for everyone. Leave?')) return
    online.leave()
  }

  let main
  if (inRoom) {
    if (!room) {
      main = (
        <div className="waiting">
          <p>{online.conn === 'lost' ? 'Cannot reach the table server. Trying again…' : 'Finding your table…'}</p>
          <button type="button" className="act" onClick={leave}>
            Cancel
          </button>
        </div>
      )
    } else if (room.status === 'lobby' || room.you.seat === null) {
      main = (
        <RoomLobby
          room={room}
          conn={online.conn}
          error={online.error}
          hosting={online.hosting}
          onSit={online.sit}
          onBot={online.setBot}
          onRules={online.setRules}
          onStart={online.start}
          onLeave={leave}
          onDismiss={online.dismiss}
        />
      )
    } else if (!state) {
      main = (
        <div className="waiting">
          <p>Waiting for the table…</p>
        </div>
      )
    } else {
      main = (
        <SeatingContext.Provider value={seating}>
          {online.conn === 'lost' && (
            <p className="banner" role="status">
              Connection lost. Trying to get back to the table…
            </p>
          )}
          {online.error && (
            <p className="banner" role="alert">
              {online.error}{' '}
              <button type="button" className="link-btn" onClick={online.dismiss}>
                Dismiss
              </button>
            </p>
          )}
          <Table
            state={state}
            log={online.log}
            logOpen={settings.log}
            onToggleLog={toggleLog}
            onDiscard={online.discard}
            onSelfWin={online.selfWin}
            onKong={online.kong}
            onDecide={online.decide}
          />
          {state.phase === 'handEnd' && (
            <Result
              state={state}
              onNext={online.nextHand}
              canAdvance={room.controller === room.you.id}
              waitingFor={nameIn(room, room.controller)}
            />
          )}
          {state.phase === 'gameEnd' && (
            <GameOver
              state={state}
              onNewGame={online.again}
              canRestart={room.host === room.you.id}
              waitingFor={nameIn(room, room.host)}
              onLeave={leave}
            />
          )}
        </SeatingContext.Provider>
      )
    }
  } else if (showLobby) {
    main = (
      <Lobby
        settings={settings}
        inProgress={!!solo.state && solo.state.phase !== 'gameEnd'}
        online={{ available: online.available, busy: online.busy, error: online.error }}
        joinCode={joinCode}
        onStart={(rules) => {
          solo.start(rules)
          setLobby(false)
        }}
        onHost={(rules) => {
          setSettings({ rules })
          online.host(rules)
        }}
        onJoin={online.join}
        onSettings={setSettings}
        onBack={() => setLobby(false)}
      />
    )
  } else if (solo.state) {
    main = (
      <SeatingContext.Provider value={SOLO}>
        <Table
          state={solo.state}
          log={solo.log}
          logOpen={settings.log}
          onToggleLog={toggleLog}
          onDiscard={solo.discard}
          onSelfWin={solo.selfWin}
          onKong={solo.kong}
          onDecide={solo.decide}
        />
        {solo.state.phase === 'handEnd' && <Result state={solo.state} onNext={solo.nextHand} />}
        {solo.state.phase === 'gameEnd' && (
          <GameOver
            state={solo.state}
            onNewGame={() => {
              solo.quit()
              setLobby(true)
            }}
          />
        )}
      </SeatingContext.Provider>
    )
  }

  return (
    <>
      <div className="app">
        <header className="masthead">
          <h1 className="wordmark">
            Pung
            <span className="wordmark-cjk" lang="zh-Hant" aria-hidden="true">
              碰
            </span>
          </h1>
          <nav className="masthead-nav">
            {room && <span className="masthead-code">Table {room.code}</span>}
            <button
              type="button"
              className="link-btn"
              aria-pressed={settings.sound}
              onClick={() => setSettings({ sound: !settings.sound })}
            >
              {settings.sound ? 'Sound off' : 'Sound on'}
            </button>
            {inRoom && room?.status !== 'lobby' && (
              <button type="button" className="link-btn" onClick={leave}>
                Leave table
              </button>
            )}
            {!inRoom && solo.state && !showLobby && (
              <button type="button" className="link-btn" onClick={() => setLobby(true)}>
                New game
              </button>
            )}
            <a className="masthead-link" href="https://github.com/francisphan/pung">
              Source
            </a>
          </nav>
        </header>

        <main>{main}</main>
      </div>
    </>
  )
}
