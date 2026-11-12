import { expect, test } from 'claude-code/testing'

const BAND = {
  plugin: 'mallcop-segway',
  component: 'AbovePrompt',
  requestId: 'band',
  props: { hasSurvey: false },
} as const

test('he patrols only while a main turn runs, on every surface', async ($, on) => {
  on('command.register', () => ({ value: { command: 'mallcop' } }))
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  on('turn.start', (_, e) => ({ turnId: e.turnId }))
  on('turn.complete', () => ({ text: '' }))

  await $.session.start({ cwd: '/', surface: 'desktop', isInteractive: true })

  for (const surface of ['terminal', 'desktop', 'vscode', 'mobile'] as const) {
    const type = surface === 'terminal' ? 'Raster' : 'Svg'

    const idle = await $.ui.mount({ ...BAND, surface })
    expect(await idle.find({ type })).toBeFalsy()
    await idle.unmount()

    await $.turn.start({ text: 'hi', turnId: 't1' })
    const busy = await $.ui.mount({ ...BAND, surface })
    expect(await busy.find({ type })).toBeTruthy()
    await busy.unmount()

    // A subagent finishing does not end the main turn's patrol.
    await $.turn.complete({ turnId: 't2', agentId: 'a1', reason: 'answer' } as never)
    const still = await $.ui.mount({ ...BAND, surface })
    expect(await still.find({ type })).toBeTruthy()
    await still.unmount()

    await $.turn.complete({ turnId: 't1', reason: 'aborted' } as never)
    const done = await $.ui.mount({ ...BAND, surface })
    expect(await done.find({ type })).toBeFalsy()
    await done.unmount()
  }
})
