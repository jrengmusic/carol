declare module 'claude-code' {
  interface PluginState {
    carol: {
      promptCount: number
      armedAtMs: number
      isNoGateArmed: boolean
      isGitInstructed: boolean
      sessionAgentType: string
      contractReads: string[]
      excerptReceipts: Record<string, Record<string, string[]>>
    }
  }
}
