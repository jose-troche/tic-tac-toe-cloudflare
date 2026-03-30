export function renderDocument({
  title,
  css,
  body,
  script,
}: {
  title: string;
  css: string;
  body: string;
  script: string;
}): string {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${title}</title>
    <style>${css}</style>
  </head>
  <body>
    ${body}
    <script type="module">${script}</script>
  </body>
</html>`;
}
