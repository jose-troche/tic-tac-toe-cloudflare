import { homePageCss } from "./home.css";
import { homePageScript } from "./home.js";
import { renderDocument } from "./render";

export function renderHomePage(): string {
  return renderDocument({
    title: "Tic-Tac-Toe",
    css: homePageCss,
    script: homePageScript,
    body: `
      <main>
        <div class="shell">
          <section class="panel">
            <div class="eyebrow">Cloudflare Tic-Tac-Toe</div>
            <h1>Start a match, share a link, watch it live.</h1>
            <p class="lead">Each game now gets three URLs: one for X, one for O, and one read-only spectator link. Players receive live board updates from the backend, so both sides stay in sync without browser polling.</p>
            <button class="primary" id="create-game">Start a new game</button>
            <div class="message" id="message" aria-live="polite"></div>

            <section class="result-grid" id="result" hidden>
              <article class="link-card">
                <strong>Play as X</strong>
                <p>Use this private link to take the first move.</p>
                <div class="link-row">
                  <div class="link-box" id="x-url"></div>
                  <div class="button-row">
                    <button class="secondary" type="button" data-copy-target="x-url">Copy X link</button>
                    <button class="secondary" type="button" data-open-target="x-url">Open X board</button>
                  </div>
                </div>
              </article>

              <article class="link-card">
                <strong>Share with O</strong>
                <p>Send this private link to your opponent.</p>
                <div class="link-row">
                  <div class="link-box" id="o-url"></div>
                  <div class="button-row">
                    <button class="secondary" type="button" data-copy-target="o-url">Copy O link</button>
                    <button class="secondary" type="button" data-open-target="o-url">Open O board</button>
                  </div>
                </div>
              </article>

              <article class="link-card">
                <strong>Spectator view</strong>
                <p>Anyone with this link can watch the game unfold in real time.</p>
                <div class="link-row">
                  <div class="link-box" id="spectator-url"></div>
                  <div class="button-row">
                    <button class="secondary" type="button" data-copy-target="spectator-url">Copy spectator link</button>
                    <button class="secondary" type="button" data-open-target="spectator-url">Open spectator view</button>
                  </div>
                </div>
              </article>
            </section>
          </section>

          <aside class="panel tips">
            <div class="tip">
              <strong>Live updates</strong>
              The board now stays synchronized with a live connection to the backend instead of browser polling.
            </div>
            <div class="tip">
              <strong>Private player links</strong>
              X and O links still act as lightweight private keys. Anyone with one of those links can play that side.
            </div>
            <div class="tip">
              <strong>Quick rematches</strong>
              When a match ends, either player or a spectator can spin up the next round from the game page.
            </div>
          </aside>
        </div>
      </main>
    `,
  });
}
