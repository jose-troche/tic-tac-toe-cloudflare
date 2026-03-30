import { gamePageCss } from "./game.css";
import { gamePageScript } from "./game.js";
import { renderDocument } from "./render";

export function renderGamePage(): string {
  return renderDocument({
    title: "Tic-Tac-Toe Game",
    css: gamePageCss,
    script: gamePageScript,
    body: `
      <main>
        <div class="shell">
          <section class="panel">
            <div class="eyebrow">Cloudflare Tic-Tac-Toe</div>
            <h1>Take your turn from any device.</h1>
            <p id="status" class="status">Loading game...</p>
            <div id="result-banner" class="result-banner" aria-live="polite"></div>
            <div class="board" id="board" aria-label="Tic-tac-toe board"></div>
            <p id="error" class="error" aria-live="polite"></p>
          </section>

          <aside class="panel meta">
            <div>
              <h2>Your link</h2>
              <p>This URL identifies your view of the game. Players can make moves, while the spectator link stays read-only.</p>
              <div class="pill"><span>Role</span> <strong id="viewer-role">...</strong></div>
            </div>

            <div>
              <h2>Game ID</h2>
              <code id="game-id">...</code>
            </div>

            <div>
              <h2>State</h2>
              <div class="pill"><span>Turn</span> <strong id="next-player">...</strong></div>
              <div class="pill"><span>Updated</span> <strong id="updated-at">...</strong></div>
              <div class="pill"><span>Expires</span> <strong id="expires-at">...</strong></div>
              <div class="pill"><span>Live</span> <strong id="live-state" class="live-indicator">Connecting...</strong></div>
            </div>

            <div class="actions">
              <button class="copy" id="copy-link" type="button">Copy my link</button>
              <button class="rematch" id="rematch-button" type="button" hidden>Start rematch</button>
            </div>

            <section id="rematch-panel" class="rematch-panel" aria-live="polite">
              <h2>New match links</h2>
              <div class="rematch-card">
                <strong>X</strong>
                <div class="link-box" id="rematch-x"></div>
                <button class="copy" type="button" data-copy-target="rematch-x">Copy X link</button>
              </div>
              <div class="rematch-card">
                <strong>O</strong>
                <div class="link-box" id="rematch-o"></div>
                <button class="copy" type="button" data-copy-target="rematch-o">Copy O link</button>
              </div>
              <div class="rematch-card">
                <strong>Spectator</strong>
                <div class="link-box" id="rematch-spectator"></div>
                <button class="copy" type="button" data-copy-target="rematch-spectator">Copy spectator link</button>
              </div>
              <button class="rematch" id="open-rematch" type="button">Open my next view</button>
            </section>
          </aside>
        </div>
      </main>
    `,
  });
}
