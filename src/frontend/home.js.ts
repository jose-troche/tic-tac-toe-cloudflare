export const homePageScript = `
  const button = document.getElementById("create-game");
  const result = document.getElementById("result");
  const message = document.getElementById("message");
  const xUrl = document.getElementById("x-url");
  const oUrl = document.getElementById("o-url");
  const spectatorUrl = document.getElementById("spectator-url");

  for (const copyButton of document.querySelectorAll("[data-copy-target]")) {
    copyButton.addEventListener("click", async () => {
      const target = document.getElementById(copyButton.dataset.copyTarget);
      if (!target?.textContent) {
        return;
      }

      await navigator.clipboard.writeText(target.textContent);
      const label = copyButton.textContent;
      copyButton.textContent = "Copied";
      setTimeout(() => {
        copyButton.textContent = label;
      }, 1200);
    });
  }

  for (const openButton of document.querySelectorAll("[data-open-target]")) {
    openButton.addEventListener("click", () => {
      const target = document.getElementById(openButton.dataset.openTarget);
      if (target?.textContent) {
        window.location.href = target.textContent;
      }
    });
  }

  button.addEventListener("click", async () => {
    button.disabled = true;
    button.textContent = "Creating...";
    message.textContent = "";

    try {
      const response = await fetch("/api/games", { method: "POST" });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Unable to create a game.");
      }

      result.hidden = false;
      xUrl.textContent = data.xUrl;
      oUrl.textContent = data.oUrl;
      spectatorUrl.textContent = data.spectatorUrl;
      message.textContent = "Game created. Open a player board, send one link, and the spectator view will update live.";
    } catch (error) {
      message.textContent = error.message || "Unable to create a game right now.";
    } finally {
      button.disabled = false;
      button.textContent = "Start a new game";
    }
  });
`;
