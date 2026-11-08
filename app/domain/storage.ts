import { isNote, type Note, type NoteContent } from './notes'

export const NOTE_PREFIX = 'quiet-notes:note:'
export const SCHEMA_VERSION = 1
export interface StoragePort {
  readonly length: number
  key(index: number): string | null
  getItem(key: string): string | null
  setItem(key: string, value: string): void
  removeItem(key: string): void
}
export type SaveResult = 'saved' | 'missing' | 'conflict'

function decodeNote(raw: string | null): Note | null {
  if (!raw) return null
  const value: unknown = JSON.parse(raw)
  if (!value || typeof value !== 'object') throw new Error('Invalid envelope')
  const envelope = value as Record<string, unknown>
  if (envelope.version !== SCHEMA_VERSION || !isNote(envelope.note))
    throw new Error('Unsupported or invalid note')
  return envelope.note
}

export class NotesRepository {
  constructor(private storage: StoragePort) {}
  load(): { notes: Note[]; damaged: boolean } {
    const notes: Note[] = []
    let damaged = false
    for (let i = 0; i < this.storage.length; i++) {
      const key = this.storage.key(i)
      if (!key?.startsWith(NOTE_PREFIX)) continue
      try {
        const note = decodeNote(this.storage.getItem(key))
        if (note && key === NOTE_PREFIX + note.id) notes.push(note)
        else damaged = true
      } catch {
        damaged = true
      }
    }
    return { notes: notes.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)), damaged }
  }
  save(note: Note, baseRevision: string | null): SaveResult {
    this.storage.setItem(NOTE_PREFIX + note.id, JSON.stringify({ version: SCHEMA_VERSION, note }))
    return 'saved'
  }
  delete(id: string): void {
    this.storage.removeItem(NOTE_PREFIX + id)
  }
}
