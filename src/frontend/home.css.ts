export const homePageCss = `
  :root {
    color-scheme: light;
    --bg: #f4eadf;
    --panel: rgba(255, 250, 243, 0.9);
    --ink: #1e293b;
    --muted: #5f6c7b;
    --accent: #c2410c;
    --accent-strong: #9a3412;
    --accent-alt: #0f766e;
    --border: rgba(222, 203, 182, 0.95);
  }

  * { box-sizing: border-box; }

  body {
    margin: 0;
    font-family: Georgia, serif;
    background:
      radial-gradient(circle at top left, rgba(194, 65, 12, 0.18), transparent 32%),
      radial-gradient(circle at bottom right, rgba(15, 118, 110, 0.16), transparent 28%),
      linear-gradient(180deg, #fbf5ee 0%, var(--bg) 100%);
    color: var(--ink);
    min-height: 100vh;
    padding: 24px;
  }

  main {
    max-width: 1040px;
    margin: 0 auto;
  }

  .shell {
    display: grid;
    gap: 20px;
  }

  .panel {
    width: 100%;
    background: var(--panel);
    border: 1px solid var(--border);
    border-radius: 28px;
    padding: 32px;
    box-shadow: 0 24px 70px rgba(31, 41, 51, 0.12);
    backdrop-filter: blur(10px);
  }

  h1 {
    margin-top: 0;
    margin-bottom: 16px;
    font-size: clamp(2.8rem, 9vw, 5.6rem);
    line-height: 0.95;
  }

  p {
    font-size: 1.05rem;
    line-height: 1.6;
  }

  .eyebrow {
    color: var(--muted);
    text-transform: uppercase;
    letter-spacing: 0.16em;
    font-size: 0.78rem;
    margin-bottom: 12px;
  }

  .lead {
    max-width: 48rem;
    color: #334155;
  }

  .primary {
    border: 0;
    border-radius: 999px;
    padding: 14px 22px;
    font: inherit;
    font-weight: 700;
    background: var(--accent);
    color: white;
    cursor: pointer;
  }

  .primary:hover {
    background: var(--accent-strong);
  }

  .result-grid {
    display: grid;
    gap: 16px;
    margin-top: 22px;
  }

  .link-card {
    display: grid;
    gap: 12px;
    padding: 18px;
    border-radius: 22px;
    background: #fff;
    border: 1px solid var(--border);
  }

  .link-card strong {
    font-size: 1.1rem;
  }

  .link-card p {
    margin: 0;
    color: var(--muted);
  }

  .link-row {
    display: grid;
    gap: 10px;
  }

  .link-box {
    padding: 14px 16px;
    border-radius: 18px;
    background: #f9f4ee;
    border: 1px solid var(--border);
    font-size: 0.95rem;
    word-break: break-word;
  }

  .button-row {
    display: flex;
    gap: 10px;
    flex-wrap: wrap;
  }

  .secondary {
    border: 1px solid #d7c2ac;
    border-radius: 999px;
    padding: 12px 18px;
    font: inherit;
    font-weight: 700;
    color: var(--ink);
    background: white;
    cursor: pointer;
  }

  .secondary:hover {
    border-color: #bfa386;
  }

  .tips {
    display: grid;
    gap: 12px;
  }

  .tip {
    padding: 16px 18px;
    border-radius: 20px;
    background: rgba(255, 255, 255, 0.76);
    border: 1px solid var(--border);
  }

  .tip strong {
    display: block;
    margin-bottom: 6px;
  }

  .message {
    margin-top: 16px;
    min-height: 1.5em;
    color: var(--accent-alt);
    font-weight: 700;
  }

  @media (min-width: 900px) {
    .shell {
      grid-template-columns: 1.2fr 0.8fr;
      align-items: start;
    }
  }
`;
