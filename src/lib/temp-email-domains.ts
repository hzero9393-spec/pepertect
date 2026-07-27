/**
 * Temporary / disposable email domain blacklist.
 * Blocks signups from throwaway email providers to prevent abuse.
 */

const BLOCKED_DOMAINS: Set<string> = new Set([
  // 10minutemail
  '10minutemail.com', '10minutemail.net', '10minutemail.org',
  // Tempmail
  'tempmail.com', 'temp-mail.org', 'tempmail.io', 'tempmail.ninja',
  'temp-mail.io', 'tempmailaddress.com', 'mytemp.email',
  // Guerrilla
  'guerrillamail.com', 'guerrillamailblock.com', 'grr.la', 'sharklasers.com',
  'guerrillamailinfo.com',
  // Mailinator
  'mailinator.com', 'mailinator2.com', 'notmailinator.com', 'mailinator.org',
  // YOPmail
  'yopmail.com', 'yopmail.fr', 'yopmail.net', 'journaldesfemmes.com',
  // Throwaway
  'throwaway.email', 'throwam.com', 'throwawaymail.com',
  // Fake
  'fakeinbox.com', 'fakeinbox.pl', 'mailfake.com', 'mailfake.org', 'mailfaker.com',
  // Burner
  'burnermail.io', 'getairmail.com', 'maildrop.cc', 'mailnesia.com',
  // Mohmal
  'mohmal.com', 'mohmal.org',
  // Tempail
  'tempail.com',
  // Tempaila
  'tempaila.com',
  // Meltmail
  'meltmail.com',
  // MailCatch
  'mailcatch.com', 'mailexpire.com',
  // Dispostable
  'dispostable.com',
  // MintEmail
  'mintemail.com', 'mintemail.com.tr',
  // MailEater
  'maileater.com',
  // HM
  'hmamail.com',
  // Harakirimail
  'harakirimail.com',
  // Mailscrap
  'mailscrap.com', 'mailscrap.org',
  // Shzt
  'shitmail.org', 'crapmail.org', 'damnthespam.com', 'mailblocks.com',
  'spamherelots.com', 'spamgourmet.com', 'trashymail.com', 'wegwerfmail.de',
  // Other common temp domains
  'tempmailo.com', 'tempmails.com', 'disposableemailaddresses.emailmiser.com',
  'mailforspam.com', 'safetymail.info', 'filzmail.com', 'incognitomail.org',
  'ugelik.com', 'tempmaildemo.com', 'guerrillamail.de', 'guerrillamail.net',
  'spam4.me', 'mailnull.com', 'binkmail.com', 'safetypost.de', 'trash-mail.com',
  'rcpt.at', 'trash-mail.at', 'trashmail.at', 'web4mail.at', 'rcpt.de',
  'trashmail.de', 'trashmail.me', 'trashmail.org', 'wegwerfmail.de',
  'mundiomail.com', 'mailcatch.com', 'mailexpire.com', 'instantmail.in',
  // Mail.tm / Mail.gw
  'mail.tm', 'mail.gw',
  // Internxt
  'contabo.de',
  // Skiff (old)
  // Add common patterns
  'tmpmail.net', 'tmpmail.org', 'tmpmail.com',
  'emailondeck.com', 'emailisvalid.com', 'emailtemp.info',
  'guerrillamail.biz', 'spamfree24.org', 'fastmail.us',
  'nada.email', 'nada.com', 'nadas.com',
  'mailnesia.com', 'mytempmail.com',
]);

/**
 * Check if an email domain is a known disposable/temp provider.
 */
export function isDisposableEmail(email: string): boolean {
  const domain = email.split('@')[1]?.toLowerCase();
  if (!domain) return false;

  // Direct match
  if (BLOCKED_DOMAINS.has(domain)) return true;

  // Catch subdomains like test.10minutemail.com
  const parts = domain.split('.');
  for (let i = 0; i < parts.length - 1; i++) {
    const suffix = parts.slice(i).join('.');
    if (BLOCKED_DOMAINS.has(suffix)) return true;
  }

  return false;
}
