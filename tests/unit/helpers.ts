import type { StoragePort } from '../../app/domain/storage'
import type { Note } from '../../app/domain/notes'

export class MemoryStorage implements StoragePort {
  data = new Map<string, string>()
  writes = 0
  get length(): number {
    return this.data.size
  }
  key(index: number): string | null {
    return [...this.data.keys()][index] ?? null
  }
  getItem(key: string): string | null {
    return this.data.get(key) ?? null
  }
  setItem(key: string, value: string): void {
    this.writes++
    this.data.set(key, value)
  }
  removeItem(key: string): void {
    this.data.delete(key)
  }
}
export function makeNote(id = 'n1'): Note {
  return {
    id,
    title: 'Планы',
    todos: [{ id: 't1', text: 'Начать', done: false }],
    updatedAt: '2026-11-07T10:00:00.000Z',
    revision: 'r1',
  }
}
