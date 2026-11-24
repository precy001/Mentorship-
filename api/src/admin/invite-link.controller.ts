import { Controller, Get, Param, Res } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Response } from 'express';

const TOKEN_PATTERN = /^[A-Za-z0-9_-]{20,200}$/;

/**
 * Public web page behind a counsellor invitation shared on WhatsApp. WhatsApp only makes https links tappable,
 * so the message points here, and this page hands over to the app (guidanceplus://counsellor-invite?token=…).
 * It never reveals anything about the invitation itself.
 */
@Controller('invite')
export class InviteLinkController {
  constructor(private readonly config: ConfigService) {}

  @Get(':token')
  page(@Param('token') token: string, @Res() res: Response) {
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('Referrer-Policy', 'no-referrer');
    res.setHeader('X-Robots-Tag', 'noindex');
    if (!TOKEN_PATTERN.test(token)) {
      res.status(404).type('html').send(renderPage(null));
      return;
    }
    const base = (this.config.get<string>('AUTH_COUNSELLOR_INVITATION_URL') || 'guidanceplus://counsellor-invite').replace(/\/$/, '');
    const appLink = `${base}${base.includes('?') ? '&' : '?'}token=${encodeURIComponent(token)}`;
    res.status(200).type('html').send(renderPage(appLink));
  }
}

const escapeHtml = (value: string) => value.replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char] as string);

export function renderPage(appLink: string | null): string {
  const body = appLink
    ? `<h1>You're invited to join Mentorship+ as a mentor</h1>
       <p>Tap the button on the phone where Mentorship+ is installed.</p>
       <a class="button" href="${escapeHtml(appLink)}">Open in Mentorship+</a>
       <ol>
         <li>Install Mentorship+ if you haven't (ask the person who invited you for the download link).</li>
         <li>Create an account or sign in.</li>
         <li>Come back to this message, tap the link again, then tap <b>Accept invitation</b>.</li>
       </ol>
       <p class="note">Invitations come from Mentorship+ administrators and expire after seven days.</p>`
    : `<h1>This invitation link isn't valid</h1><p>Ask the person who invited you to send a new invitation.</p>`;
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Mentorship+ invitation</title>
<style>
  body{margin:0;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;background:#F7F8FA;color:#111827}
  main{max-width:440px;margin:0 auto;padding:40px 22px}
  .logo{width:56px;height:56px;border-radius:16px;background:#2133FF;color:#fff;font-weight:800;font-size:26px;display:flex;align-items:center;justify-content:center}
  h1{font-size:24px;line-height:1.25;margin:22px 0 8px}
  p,li{color:#475569;line-height:1.55;font-size:15px}
  .button{display:block;text-align:center;background:#2937F5;color:#fff;text-decoration:none;font-weight:800;padding:16px;border-radius:16px;margin:22px 0}
  ol{padding-left:20px}
  .note{font-size:13px;color:#64748B}
</style></head><body><main><div class="logo">M+</div>${body}</main></body></html>`;
}
