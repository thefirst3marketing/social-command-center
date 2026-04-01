export type Platform = 'instagram' | 'tiktok'
export type Owner = 'tesia' | 'client'

export interface AccountConfig {
  handle: string
  platform: Platform
  owner: Owner
  clientName?: string
  apifyActorId: string
}

export const ACCOUNTS: AccountConfig[] = [
  // Tesia - Instagram
  { handle: 'tesiakuh',         platform: 'instagram', owner: 'tesia', apifyActorId: 'nH2AHrwxeTRJoN5hX' },
  { handle: 'atetheplate_',     platform: 'instagram', owner: 'tesia', apifyActorId: 'nH2AHrwxeTRJoN5hX' },
  { handle: 'thefirstthree.co', platform: 'instagram', owner: 'tesia', apifyActorId: 'nH2AHrwxeTRJoN5hX' },
  // Tesia - TikTok
  { handle: 'atetheplate_',     platform: 'tiktok',    owner: 'tesia', apifyActorId: 'GdWCkxBtKWOsKjdch' },
  // Client: Zach for Controller
  { handle: 'zachforcontroller', platform: 'instagram', owner: 'client', clientName: 'Zach for Controller', apifyActorId: 'nH2AHrwxeTRJoN5hX' },
  { handle: 'zachforcontroller', platform: 'tiktok',    owner: 'client', clientName: 'Zach for Controller', apifyActorId: 'GdWCkxBtKWOsKjdch' },
]

export const INSTAGRAM_HANDLES = ACCOUNTS
  .filter(a => a.platform === 'instagram')
  .map(a => a.handle)

export const TIKTOK_HANDLES = ACCOUNTS
  .filter(a => a.platform === 'tiktok')
  .map(a => a.handle)
