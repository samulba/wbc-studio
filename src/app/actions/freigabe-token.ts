'use server'

/**
 * @deprecated — ersetzt durch src/app/actions/freigaben.ts (Migration 078).
 *
 * Thin-Wrapper für bestehende Aufrufer. Neue Komponenten sollen direkt
 * `freigabeTokenErstellen` / `freigabeTokenZurueckziehen` / `freigabeMailVersenden`
 * aus `freigaben.ts` importieren.
 */

import {
  freigabeTokenErstellen,
  freigabeTokenZurueckziehen,
  freigabeMailVersenden as freigabeMailVersendenNeu,
} from './freigaben'

export async function tokenGenerieren(
  projektId: string,
): Promise<{ token: string } | { fehler: string }> {
  return freigabeTokenErstellen(projektId, 'projekt', [])
}

export async function tokenDeaktivieren(
  tokenId: string,
  projektId: string,
): Promise<void> {
  await freigabeTokenZurueckziehen(tokenId, projektId)
}

export async function tokenErneuern(
  projektId: string,
  alterTokenId: string,
): Promise<{ token: string } | { fehler: string }> {
  await freigabeTokenZurueckziehen(alterTokenId, projektId)
  return freigabeTokenErstellen(projektId, 'projekt', [])
}

export async function freigabeMailVersenden(
  projektId: string,
): Promise<{ mailGesendet: boolean; fehler?: string }> {
  return freigabeMailVersendenNeu(projektId)
}
