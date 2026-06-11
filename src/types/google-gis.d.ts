// Google Identity Services (GIS) type declarations

interface CredentialResponse {
  credential: string
  select_by: string
  client_id: string
}

interface IdConfiguration {
  client_id: string
  callback: (response: CredentialResponse) => void
  auto_select?: boolean
  cancel_on_tap_outside?: boolean
  context?: 'signin' | 'signup' | 'use'
  nonce?: string
}

interface GsiButtonConfiguration {
  theme?: 'outline' | 'filled_blue' | 'filled_black'
  size?: 'large' | 'medium' | 'small'
  text?: 'signin_with' | 'signup_with' | 'continue_with' | 'signin'
  shape?: 'rectangular' | 'pill' | 'circle' | 'square'
  logo_alignment?: 'left' | 'center'
  width?: string | number
  local?: string
}

interface GoogleAccountsId {
  initialize: (config: IdConfiguration) => void
  prompt: (momentListener?: (notification: { isNotDisplayed: () => boolean; isSkippedMoment: () => boolean; getNotDisplayedReason: () => string; getSkippedReason: () => string }) => void) => void
  renderButton: (parent: HTMLElement, options: GsiButtonConfiguration) => void
  disableAutoSelect: () => void
  revoke: (hint: string, callback: (done: { successful: boolean }) => void) => void
}

interface GoogleAccounts {
  id: GoogleAccountsId
  oauth2: {
    initTokenClient: (config: { client_id: string; scope: string; callback: (response: { access_token: string }) => void }) => void
  }
}

interface Window {
  google?: {
    accounts: GoogleAccounts
  }
}
