const requests = [];
const ports = new Set();

function safeParseUrl(url) {
    try {
        return new URL(url);
    } catch {
        return null;
    }
}

function toQueryParams(url) {
    const parsed = safeParseUrl(url);
    if (!parsed) return [];
    return [...parsed.searchParams.entries()].map(([key, value]) => ({ key, value }));
}

function sanitizeHarEntry(entry) {
    return {
        startedDateTime: entry.startedDateTime,
        time: entry.time,
        request: {
            method: entry.request?.method ?? "",
            url: entry.request?.url ?? "",
            headers: entry.request?.headers ?? [],
            queryString: entry.request?.queryString ?? [],
            postData: entry.request?.postData ?? null,
            headersSize: entry.request?.headersSize ?? -1,
            bodySize: entry.request?.bodySize ?? -1
        },
        response: {
            status: entry.response?.status ?? 0,
            statusText: entry.response?.statusText ?? "",
            headers: entry.response?.headers ?? [],
            content: {
                mimeType: entry.response?.content?.mimeType ?? "",
                size: entry.response?.content?.size ?? 0
            },
            redirectURL: entry.response?.redirectURL ?? "",
            headersSize: entry.response?.headersSize ?? -1,
            bodySize: entry.response?.bodySize ?? -1
        }
    };
}

function broadcast(message) {
    for (const port of ports) {
        try {
            port.postMessage(message);
        } catch (e) {
            console.warn("Failed to post message to panel:", e);
        }
    }
}

chrome.runtime.onConnect.addListener((port) => {
    if (port.name !== "network-panel") return;

    ports.add(port);

    port.onDisconnect.addListener(() => {
        ports.delete(port);
    });

    port.onMessage.addListener((msg) => {
        if (msg?.type === "getAll") {
            port.postMessage({ type: "snapshot", items: requests });
        } else if (msg?.type === "clear") {
            requests.length = 0;
            broadcast({ type: "snapshot", items: requests });
        } else if (msg?.type === "export-json") {
            const payload = JSON.stringify(requests, null, 2);
            const blob = new Blob([payload], { type: "application/json" });
            const url = URL.createObjectURL(blob);
            port.postMessage({
                type: "download-ready",
                url,
                filename: `network-log-${Date.now()}.json`
            });
        }
    });
});

chrome.devtools.panels.create(
    "Net JSON",
    "",
    "panels.html"
);

chrome.devtools.network.onNavigated.addListener(() => {
    requests.length = 0;
    broadcast({ type: "snapshot", items: requests });
});

chrome.devtools.network.onRequestFinished.addListener((request) => {
    const har = sanitizeHarEntry(request);
    const url = har.request.url;
    const parsed = safeParseUrl(url);

    const item = {
        id: crypto.randomUUID(),
        startedDateTime: har.startedDateTime,
        durationMs: har.time,
        method: har.request.method,
        url,
        host: parsed?.host ?? "",
        path: parsed?.pathname ?? "",
        queryParams: toQueryParams(url),
        requestHeaders: har.request.headers,
        requestQueryString: har.request.queryString,
        requestPostData: har.request.postData,
        status: har.response.status,
        statusText: har.response.statusText,
        responseMimeType: har.response.content.mimeType,
        responseSize: har.response.content.size
    };

    requests.push(item);
    broadcast({ type: "append", item });
});
