export const gamePageScript = `
  const statusEl = document.getElementById("status");
  const boardEl = document.getElementById("board");
  const errorEl = document.getElementById("error");
  const viewerRoleEl = document.getElementById("viewer-role");
  const gameIdEl = document.getElementById("game-id");
  const nextPlayerEl = document.getElementById("next-player");
  const updatedAtEl = document.getElementById("updated-at");
  const expiresAtEl = document.getElementById("expires-at");
  const copyButton = document.getElementById("copy-link");
  const resultBannerEl = document.getElementById("result-banner");
  const rematchButton = document.getElementById("rematch-button");
  const rematchPanel = document.getElementById("rematch-panel");
  const rematchXEl = document.getElementById("rematch-x");
  const rematchOEl = document.getElementById("rematch-o");
  const rematchSpectatorEl = document.getElementById("rematch-spectator");
  const openRematchButton = document.getElementById("open-rematch");
  const liveStateEl = document.getElementById("live-state");

  const segments = window.location.pathname.split("/").filter(Boolean);
  const routeType = segments[0];
  const gameId = segments[1];
  const token = segments[2] || "";
  let game = null;
  let socket = null;
  let reconnectTimer = null;
  let submitting = false;
  let rematch = null;

  for (const copyTargetButton of document.querySelectorAll("[data-copy-target]")) {
    copyTargetButton.addEventListener("click", async () => {
      const target = document.getElementById(copyTargetButton.dataset.copyTarget);
      if (!target?.textContent) {
        return;
      }

      await navigator.clipboard.writeText(target.textContent);
      const label = copyTargetButton.textContent;
      copyTargetButton.textContent = "Copied";
      setTimeout(() => {
        copyTargetButton.textContent = label;
      }, 1200);
    });
  }

  if (!gameId || !token) {
    statusEl.textContent = "This game link is invalid.";
    liveStateEl.textContent = "Unavailable";
  } else {
    gameIdEl.textContent = gameId;
    copyButton.addEventListener("click", async () => {
      await navigator.clipboard.writeText(window.location.href);
      copyButton.textContent = "Copied";
      setTimeout(() => {
        copyButton.textContent = "Copy my link";
      }, 1200);
    });

    rematchButton.addEventListener("click", createRematch);
    openRematchButton.addEventListener("click", () => {
      if (!rematch) {
        return;
      }

      const nextUrl = game?.viewer === "X"
        ? rematch.xUrl
        : game?.viewer === "O"
          ? rematch.oUrl
          : rematch.spectatorUrl;
      window.location.href = nextUrl;
    });

    awaitInitialState();
  }

  async function awaitInitialState() {
    await loadGame();
    connectLive();
  }

  async function loadGame() {
    try {
      const response = await fetch("/api/games/" + gameId + "?token=" + encodeURIComponent(token));
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Unable to load game.");
      }

      game = data;
      errorEl.textContent = "";
      render();
    } catch (error) {
      errorEl.textContent = error.message || "Unable to load game.";
    }
  }

  function connectLive() {
    if (socket) {
      socket.close();
    }

    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const url = protocol + "//" + window.location.host + "/api/games/" + gameId + "/live?token=" + encodeURIComponent(token);
    liveStateEl.textContent = "Connecting...";
    socket = new WebSocket(url);

    socket.addEventListener("open", () => {
      liveStateEl.textContent = "Connected";
    });

    socket.addEventListener("message", (event) => {
      try {
        const payload = JSON.parse(event.data);
        if (payload.type === "state") {
          game = payload.game;
          errorEl.textContent = "";
          render();
        }
      } catch (error) {
        console.error("Invalid live payload", error);
      }
    });

    socket.addEventListener("close", () => {
      liveStateEl.textContent = "Reconnecting...";
      socket = null;
      reconnectTimer = setTimeout(() => {
        loadGame();
        connectLive();
      }, 1500);
    });

    socket.addEventListener("error", () => {
      liveStateEl.textContent = "Interrupted";
    });
  }

  async function makeMove(cell) {
    if (!game || submitting) {
      return;
    }

    submitting = true;
    errorEl.textContent = "";
    render();

    try {
      const response = await fetch("/api/games/" + gameId + "/move", {
        method: "POST",
        headers: {
          "content-type": "application/json"
        },
        body: JSON.stringify({ token, cell })
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Unable to make move.");
      }

      game = data;
      render();
    } catch (error) {
      errorEl.textContent = error.message || "Unable to make move.";
    } finally {
      submitting = false;
      render();
    }
  }

  async function createRematch() {
    rematchButton.disabled = true;
    errorEl.textContent = "";

    try {
      const response = await fetch("/api/games/" + gameId + "/rematch", {
        method: "POST"
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Unable to create rematch.");
      }

      rematch = data;
      rematchXEl.textContent = data.xUrl;
      rematchOEl.textContent = data.oUrl;
      rematchSpectatorEl.textContent = data.spectatorUrl;
      rematchPanel.classList.add("visible");
    } catch (error) {
      errorEl.textContent = error.message || "Unable to create rematch.";
    } finally {
      rematchButton.disabled = false;
    }
  }

  function render() {
    if (!game) {
      return;
    }

    viewerRoleEl.textContent = routeType === "s" ? "spectator" : game.viewer;
    nextPlayerEl.textContent = game.nextPlayer;
    updatedAtEl.textContent = new Date(game.updatedAt).toLocaleString();
    expiresAtEl.textContent = new Date(game.expiresAt).toLocaleString();
    statusEl.textContent = getStatusText(game);
    renderResultBanner(game);
    rematchButton.hidden = game.status === "active";

    boardEl.replaceChildren(...game.board.map((value, index) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "cell" + (value ? " " + value.toLowerCase() : "");
      button.textContent = value || "";
      button.disabled = !canPlayCell(index);
      button.setAttribute("aria-label", value ? "Cell " + (index + 1) + " contains " + value : "Play cell " + (index + 1));
      button.addEventListener("click", () => makeMove(index));
      return button;
    }));
  }

  function renderResultBanner(game) {
    resultBannerEl.className = "result-banner";
    resultBannerEl.textContent = "";

    if (game.status === "won") {
      const won = game.viewer !== "spectator" && game.winner === game.viewer;
      resultBannerEl.classList.add("visible", won ? "win" : "loss");
      resultBannerEl.textContent = won
        ? "Match complete. You won."
        : game.winner + " won this match.";
      return;
    }

    if (game.status === "draw") {
      resultBannerEl.classList.add("visible", "draw");
      resultBannerEl.textContent = "Match complete. Nobody found a winning line.";
    }
  }

  function canPlayCell(index) {
    return Boolean(
      game &&
      !submitting &&
      game.status === "active" &&
      game.viewer !== "spectator" &&
      routeType === "p" &&
      game.viewer === game.nextPlayer &&
      game.board[index] === null
    );
  }

  function getStatusText(game) {
    if (game.status === "won") {
      return game.winner === game.viewer
        ? "You won this round."
        : game.winner + " won this round.";
    }

    if (game.status === "draw") {
      return "The board is full. This game ended in a draw.";
    }

    if (routeType === "s" || game.viewer === "spectator") {
      return game.nextPlayer + " is up next.";
    }

    if (game.viewer === game.nextPlayer) {
      return "Your turn. Pick an open square.";
    }

    return "Waiting for " + game.nextPlayer + " to move.";
  }

  window.addEventListener("beforeunload", () => {
    if (reconnectTimer) {
      clearTimeout(reconnectTimer);
    }
    if (socket) {
      socket.close();
    }
  });
`;
