export type MallcopFlag = boolean

declare module 'claude-code' {
  interface PluginState {
    'mallcop-segway': { isBusy: MallcopFlag; isEnabled: MallcopFlag }
  }
}
