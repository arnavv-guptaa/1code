import { atom } from "jotai"
import { atomFamily, atomWithStorage } from "jotai/utils"
import type { TerminalInstance } from "./types"

// Storage atom for persisting per-chat terminal sidebar state
const terminalSidebarOpenStorageAtom = atomWithStorage<Record<string, boolean>>(
  "terminal-sidebar-open-by-chat",
  {},
  undefined,
  { getOnInit: true },
)

// Per-chat terminal sidebar open state (like diffSidebarOpenAtomFamily)
export const terminalSidebarOpenAtomFamily = atomFamily((chatId: string) =>
  atom(
    (get) => get(terminalSidebarOpenStorageAtom)[chatId] ?? false,
    (get, set, isOpen: boolean) => {
      const current = get(terminalSidebarOpenStorageAtom)
      set(terminalSidebarOpenStorageAtom, { ...current, [chatId]: isOpen })
    },
  ),
)

// Deprecated: Keep for backwards compatibility, but should not be used
// Use terminalSidebarOpenAtomFamily(chatId) instead
export const terminalSidebarOpenAtom = atom(false)

export const terminalSidebarWidthAtom = atomWithStorage<number>(
  "terminal-sidebar-width",
  500,
  undefined,
  { getOnInit: true },
)

// Terminal cwd tracking - maps paneId to current working directory
export const terminalCwdAtom = atomWithStorage<Record<string, string>>(
  "terminal-cwds",
  {},
  undefined,
  { getOnInit: true },
)

// Terminal search open state - maps paneId to search visibility
export const terminalSearchOpenAtom = atom<Record<string, boolean>>({})

// ============================================================================
// Multi-Terminal State Management
// ============================================================================

/**
 * Map of chatId -> terminal instances.
 * Each chat can have multiple terminal instances.
 */
export const terminalsAtom = atomWithStorage<
  Record<string, TerminalInstance[]>
>("terminals-by-chat", {}, undefined, { getOnInit: true })

/**
 * Map of chatId -> active terminal id.
 * Tracks which terminal is currently active for each chat.
 */
export const activeTerminalIdAtom = atomWithStorage<
  Record<string, string | null>
>("active-terminal-by-chat", {}, undefined, { getOnInit: true })
