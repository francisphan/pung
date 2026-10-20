import { useMemo, useState } from 'react'
import { gameOverNote, guide, resultNote } from './coach'
import Friends from './components/Friends'
import GameOver from './components/GameOver'
import Learn from './components/Learn'
import Lesson from './components/Lesson'
import Link from './components/Link'
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
import { NavContext, usePage } from './router'
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
  // A shared link lands on the friends page with its code, whatever path it used.
  const [page, go] = usePage(joinCode ? 'friends' : undefined, joinCode ? `?join=${joinCode}` : '')
  const solo = useGame()
  const online = useRoom(url, settings.name.trim() || 'Guest')
  // "New game" over a solo game in progress shows the front page again.
  const [lobby, setLobby] = useState(false)

  const room = online.room
  const inRoom = room !== null || online.busy
  const guided = !!solo.state && solo.tutorial
  const soloPlaying = !!solo.state && !solo.tutorial && !lobby
  // The table this page shows, if any: the room on the friends page, the guided round on learn, a solo game at home.
  let state: typeof solo.state
  if (page === 'friends') state = room && room.status !== 'lobby' && room.you.seat !== null ? online.view : null
  else if (page === 'learn') state = guided ? solo.state : null
  else state = soloPlaying ? solo.state : null
  const seating = page === 'friends' && room ? seatingOf(room) : SOLO
  useSounds(state, settings.sound, seating.me)
  const toggleLog = () => setSettings({ log: !settings.log })
  // A host's browser is the table: leaving ends it for everyone else there.
  const leave = () => {
    const others = room?.seats.some((s) => s.kind === 'human' && s.id !== room.you.id) ?? false
    if (online.hosting && others && !window.confirm('Leaving closes the table for everyone. Leave?')) return
    online.leave()
  }
  const coached = page === 'learn' && guided && solo.state ? guide(solo.state, SOLO.me, SOLO) : null
  const lesson = page === 'learn' && guided ? solo.lesson : null

  // A solo table, plain or guided.
  const soloTable = (s: NonNullable<typeof solo.state>) => (
    <SeatingContext.Provider value={SOLO}>
      <Table
        state={s}
        log={solo.log}
        logOpen={settings.log}
        onToggleLog={toggleLog}
        onDiscard={solo.discard}
        onSelfWin={solo.selfWin}
        onKong={solo.kong}
        onDecide={solo.decide}
        guide={coached}
      />
      {lesson && <Lesson title={lesson.title} body={lesson.body(s, SOLO.me, SOLO)} onDone={() => solo.finishLesson(lesson.id)} />}
      {s.phase === 'handEnd' && <Result state={s} onNext={solo.nextHand} note={guided ? resultNote(s, SOLO.me, SOLO) : undefined} />}
      {s.phase === 'gameEnd' && (
        <GameOver
          state={s}
          note={guided ? gameOverNote() : undefined}
          onNewGame={() => {
            solo.quit()
            if (guided) go('home')
            else setLobby(true)
          }}
        />
      )}
    </SeatingContext.Provider>
  )

  let main
  if (page === 'friends') {
    if (!inRoom) {
      main = (
        <Friends
          settings={settings}
          online={{ available: online.available, busy: online.busy, error: online.error }}
          joinCode={joinCode}
          onHost={() => online.host(settings.rules)}
          onJoin={online.join}
          onSettings={setSettings}
        />
      )
    } else if (!room) {
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
  } else if (page === 'learn') {
    main = guided && solo.state ? soloTable(solo.state) : <Learn inProgress={!!solo.state && !solo.tutorial} onStart={solo.startTutorial} />
  } else if (soloPlaying && solo.state) {
    main = soloTable(solo.state)
  } else {
    main = (
      <Lobby
        settings={settings}
        inProgress={!!solo.state && !solo.tutorial && solo.state.phase !== 'gameEnd'}
        onStart={(rules) => {
          solo.start(rules)
          setLobby(false)
        }}
        onSettings={setSettings}
        onBack={() => setLobby(false)}
      />
    )
  }

  const atTable = state !== null
  return (
    <NavContext.Provider value={go}>
      <div className="app">
        <header className="masthead">
          <h1 className="wordmark">
            Pung
            <span className="wordmark-cjk" lang="zh-Hant" aria-hidden="true">
              碰
            </span>
          </h1>
          <nav className="masthead-nav" aria-label="Table">
            {room && page === 'friends' && <span className="masthead-code">Table {room.code}</span>}
            {room && page !== 'friends' && (
              <Link page="friends" className="masthead-code">
                Table {room.code}
              </Link>
            )}
            {guided && page === 'learn' && <span className="masthead-code masthead-note">Guided round</span>}
            <button
              type="button"
              className="link-btn"
              aria-pressed={settings.sound}
              onClick={() => setSettings({ sound: !settings.sound })}
            >
              {settings.sound ? 'Sound off' : 'Sound on'}
            </button>
            {page === 'friends' && inRoom && room?.status !== 'lobby' && (
              <button type="button" className="link-btn" onClick={leave}>
                Leave table
              </button>
            )}
            {page === 'home' && soloPlaying && (
              <button type="button" className="link-btn" onClick={() => setLobby(true)}>
                New game
              </button>
            )}
            {page === 'learn' && guided && (
              <button
                type="button"
                className="link-btn"
                onClick={() => {
                  if (window.confirm('End the guided round? You can start another any time.')) solo.quit()
                }}
              >
                End round
              </button>
            )}
          </nav>
        </header>
        {!atTable && (
          <nav className="pages" aria-label="Pages">
            <Link page="home" current={page === 'home'} className="page-link">
              Solo game
            </Link>
            <Link page="friends" current={page === 'friends'} className="page-link">
              With friends
            </Link>
            <Link page="learn" current={page === 'learn'} className="page-link">
              Learn to play
            </Link>
          </nav>
        )}

        <main>{main}</main>
      </div>
    </NavContext.Provider>
  )
}
