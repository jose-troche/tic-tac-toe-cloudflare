export const gamePageCss = `
  :root {
    color-scheme: light;
    --bg: #f3efe5;
    --paper: rgba(255, 250, 242, 0.94);
    --ink: #1f2933;
    --muted: #5f6c7b;
    --x: #0f766e;
    --o: #c2410c;
    --line: #d9c7b4;
    --shadow: rgba(27, 31, 35, 0.15);
  }

  * { box-sizing: border-box; }

  body {
    margin: 0;
    min-height: 100vh;
    font-family: Georgia, serif;
    color: var(--ink);
    background:
      radial-gradient(circle at top left, rgba(15, 118, 110, 0.16), transparent 34%),
      radial-gradient(circle at bottom right, rgba(194, 65, 12, 0.14), transparent 28%),
      linear-gradient(180deg, #faf6ef 0%, var(--bg) 100%);
    padding: 20px;
  }

  main {
    max-width: 960px;
    margin: 0 auto;
    display: grid;
    gap: 20px;
  }

  .shell {
    display: grid;
    gap: 20px;
  }

  .panel {
    background: var(--paper);
    border: 1px solid rgba(217, 199, 180, 0.9);
    border-radius: 28px;
    box-shadow: 0 24px 60px var(--shadow);
    padding: 24px;
    backdrop-filter: blur(10px);
  }

  h1, h2, p {
    margin-top: 0;
  }

  h1 {
    font-size: clamp(2.2rem, 7vw, 4rem);
    line-height: 0.95;
    margin-bottom: 12px;
  }

  .eyebrow {
    color: var(--muted);
    text-transform: uppercase;
    letter-spacing: 0.16em;
    font-size: 0.78rem;
    margin-bottom: 12px;
  }

  .board {
    display: grid;
    grid-template-columns: repeat(3, minmax(84px, 1fr));
    gap: 12px;
  }

  .cell {
    aspect-ratio: 1;
    border: 0;
    border-radius: 22px;
    background: rgba(255, 255, 255, 0.82);
    box-shadow: inset 0 0 0 1px var(--line);
    font-family: inherit;
    font-size: clamp(2rem, 12vw, 4rem);
    font-weight: 700;
    color: var(--ink);
    cursor: pointer;
    transition: transform 140ms ease, box-shadow 140ms ease, background 140ms ease;
  }

  .cell:hover:enabled {
    transform: translateY(-2px);
    box-shadow: inset 0 0 0 1px var(--line), 0 12px 24px rgba(31, 41, 51, 0.08);
  }

  .cell:disabled {
    cursor: default;
  }

  .cell.x {
    color: var(--x);
  }

  .cell.o {
    color: var(--o);
  }

  .status {
    font-size: 1.15rem;
    line-height: 1.5;
    color: var(--ink);
    min-height: 2.5em;
  }

  .meta {
    display: grid;
    gap: 12px;
    color: var(--muted);
  }

  .pill {
    display: inline-flex;
    align-items: center;
    gap: 10px;
    padding: 10px 14px;
    border-radius: 999px;
    background: rgba(255, 255, 255, 0.74);
    border: 1px solid var(--line);
    width: fit-content;
  }

  .actions {
    display: flex;
    gap: 12px;
    flex-wrap: wrap;
  }

  button.copy,
  button.rematch {
    border: 0;
    border-radius: 999px;
    padding: 12px 18px;
    font: inherit;
    font-weight: 700;
    color: white;
    background: #1f2933;
    cursor: pointer;
  }

  button.rematch {
    background: #0f766e;
  }

  button.rematch[hidden] {
    display: none;
  }

  code {
    font-size: 0.95rem;
    word-break: break-all;
  }

  .error {
    color: #9f1239;
    min-height: 1.5em;
  }

  .result-banner {
    display: none;
    padding: 16px 18px;
    border-radius: 20px;
    font-weight: 700;
    background: rgba(255, 255, 255, 0.8);
    border: 1px solid var(--line);
  }

  .result-banner.visible {
    display: block;
  }

  .result-banner.win {
    color: var(--x);
    background: rgba(15, 118, 110, 0.1);
  }

  .result-banner.loss {
    color: var(--o);
    background: rgba(194, 65, 12, 0.1);
  }

  .result-banner.draw {
    color: #475569;
  }

  .rematch-panel {
    display: none;
    gap: 12px;
    margin-top: 16px;
    padding: 18px;
    border-radius: 22px;
    background: rgba(255, 255, 255, 0.74);
    border: 1px solid var(--line);
  }

  .rematch-panel.visible {
    display: grid;
  }

  .rematch-card {
    padding: 14px;
    border-radius: 18px;
    background: white;
    border: 1px solid var(--line);
  }

  .rematch-card strong {
    display: block;
    margin-bottom: 8px;
  }

  .link-box {
    margin: 8px 0 12px;
    padding: 12px 14px;
    border-radius: 16px;
    background: #f9f4ee;
    border: 1px solid var(--line);
    word-break: break-word;
  }

  .live-indicator {
    color: #0f766e;
    font-weight: 700;
  }

  @media (min-width: 860px) {
    .shell {
      grid-template-columns: 1.2fr 0.8fr;
      align-items: start;
    }
  }
`;
