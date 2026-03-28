const port = chrome.runtime.connect({ name: "network-panel" });

let allItems = [];
let filteredItems = [];
let selectedId = null;

const filterInput = document.getElementById("filterInput");
const clearBtn = document.getElementById("clearBtn");
const exportBtn = document.getElementById("exportBtn");
const rowsEl = document.getElementById("rows");
const detailEl = document.getElementById("detail");
const countEl = document.getElementById("count");

function escapeHtml(value) {
    return String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#39;");
}

function applyFilter() {
    const keyword = filterInput.value.trim().toLowerCase();

    filteredItems = allItems.filter((item) => {
        if (!keyword) return true;
        return item.url.toLowerCase().includes(keyword);
    });

    renderList();

    if (!filteredItems.find((x) => x.id === selectedId)) {
        selectedId = filteredItems[0]?.id ?? null;
    }
    renderDetail();
}

function renderList() {
    rowsEl.innerHTML = filteredItems.map((item) => `
    <tr class="item-row" data-id="${escapeHtml(item.id)}">
      <td>${escapeHtml(item.method)}</td>
      <td>${escapeHtml(item.status)}</td>
      <td>
        <div>${escapeHtml(item.url)}</div>
        <div class="muted">${escapeHtml(item.responseMimeType || "")}</div>
      </td>
    </tr>
  `).join("");

    countEl.textContent = `${filteredItems.length} items`;

    for (const tr of rowsEl.querySelectorAll("tr.item-row")) {
        tr.addEventListener("click", () => {
            selectedId = tr.dataset.id;
            renderDetail();
        });

        // 一覧行上での右クリック案内
        tr.addEventListener("contextmenu", (event) => {
            event.preventDefault();
            selectedId = tr.dataset.id;
            renderDetail();
            alert("Network 項目の右クリック操作は未実装です。この一覧上で右クリック機能を追加できます。");
        });
    }
}

function renderDetail() {
    const item = filteredItems.find((x) => x.id === selectedId);

    if (!item) {
        detailEl.innerHTML = `<div class="empty">対象がありません。</div>`;
        return;
    }

    const qpRows = item.queryParams.length
        ? item.queryParams.map(({ key, value }) => `
        <tr>
          <td>${escapeHtml(key)}</td>
          <td>${escapeHtml(value)}</td>
        </tr>
      `).join("")
        : `<tr><td colspan="2" class="muted">クエリパラメータなし</td></tr>`;

    detailEl.innerHTML = `
    <div style="padding: 10px;">
      <h3 style="margin-top: 0;">Request Detail</h3>

      <table>
        <tr><th style="width: 140px;">Method</th><td>${escapeHtml(item.method)}</td></tr>
        <tr><th>Status</th><td>${escapeHtml(item.status)} ${escapeHtml(item.statusText || "")}</td></tr>
        <tr><th>URL</th><td><pre>${escapeHtml(item.url)}</pre></td></tr>
        <tr><th>Host</th><td>${escapeHtml(item.host)}</td></tr>
        <tr><th>Path</th><td>${escapeHtml(item.path)}</td></tr>
        <tr><th>MIME</th><td>${escapeHtml(item.responseMimeType || "")}</td></tr>
        <tr><th>Duration</th><td>${escapeHtml(item.durationMs)} ms</td></tr>
      </table>

      <h4>Query Parameters</h4>
      <table>
        <thead>
          <tr><th style="width: 180px;">Key</th><th>Value</th></tr>
        </thead>
        <tbody>${qpRows}</tbody>
      </table>

      <h4>JSON Preview</h4>
      <pre>${escapeHtml(JSON.stringify(item, null, 2))}</pre>
    </div>
  `;
}

filterInput.addEventListener("input", applyFilter);

clearBtn.addEventListener("click", () => {
    selectedId = null;
    port.postMessage({ type: "clear" });
});

exportBtn.addEventListener("click", () => {
    port.postMessage({ type: "export-json" });
});

port.onMessage.addListener((msg) => {
    if (msg.type === "snapshot") {
        allItems = msg.items;
        applyFilter();
        return;
    }

    if (msg.type === "append") {
        allItems.push(msg.item);
        applyFilter();
        return;
    }

    if (msg.type === "download-ready") {
        const a = document.createElement("a");
        a.href = msg.url;
        a.download = msg.filename;
        a.click();

        setTimeout(() => URL.revokeObjectURL(msg.url), 10000);
    }
});

port.postMessage({ type: "getAll" });
