import { isSupabaseConfigured } from '@/lib/supabase'
import { localRepo } from './localRepo'
import { supabaseRepo } from './supabaseRepo'
import type { Repo } from './repo'

/**
 * Az app egyetlen adat-belépési pontja.
 * Ha a .env ki van töltve → Supabase. Ha nem → localStorage, hogy az app
 * a Supabase projekt elkészülte előtt is kipróbálható legyen.
 */
export const repo: Repo = isSupabaseConfigured ? supabaseRepo : localRepo

export const isLocalMode = !isSupabaseConfigured

export type { Repo } from './repo'
