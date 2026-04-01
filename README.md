# devtool-network-controls

Chrome DevTools extension for inspecting network requests, checking query parameters, replaying requests, and exporting captured data as JSON.

## Features

- Capture requests from the DevTools Network API in real time.
- Show a filterable request list by URL.
- Display request details such as method, status, host, path, MIME type, duration, and raw JSON.
- Show parsed query parameters for each request.
- Copy a query parameter value with the `Copy` button placed next to its key.
- Replay a selected request by right-clicking a row and confirming the dialog.
- Export the current captured request list as a JSON file.
- Clear the current captured requests when needed.

## How It Works

### 1. DevTools entry point

`src/devtools.js` registers a custom DevTools panel and listens to `chrome.devtools.network.onRequestFinished`.

What it does:

- Creates the `Request Analysis` panel.
- Normalizes each HAR entry into a smaller request object.
- Parses the request URL into host, path, and query parameter data.
- Keeps captured requests in memory.
- Sends snapshots and incremental updates to the panel UI through a runtime port.
- Handles `clear` and `export-json` messages from the panel.

### 2. Panel UI

`src/panels.html` defines the panel layout.

What it contains:

- Toolbar with URL filter input.
- `Clear` button.
- `Export JSON` button.
- Request list area.
- Detail area for the selected request.

### 3. Panel behavior

`src/panel.js` controls the panel UI and user actions.

What it does:

- Connects to the DevTools page with `chrome.runtime.connect`.
- Receives request snapshots and append events.
- Filters requests by URL substring.
- Renders the selected request details.
- Adds `Copy` buttons for query parameter values.
- Replays a request on right-click after confirmation.
- Starts JSON download when export is requested.

## Replay Request Behavior

Right-clicking a request row opens a confirmation dialog. If confirmed, the extension replays the same request from the inspected page context using `fetch(...)`.

Replay behavior:

- Reuses the original request URL.
- Reuses the original HTTP method.
- Reuses request body when available.
- Reuses request headers except browser-restricted headers such as `cookie`, `host`, `content-length`, and `sec-*`.
- Sends the request with `credentials: "include"`.

Notes:

- Some requests cannot be replayed exactly because browsers block certain headers.
- Replay runs from the inspected page context, so CSP, CORS, authentication state, and page environment still matter.

## Installation

1. Open Chrome and go to `chrome://extensions/`.
2. Enable `Developer mode`.
3. Click `Load unpacked`.
4. Select the `src` directory.
5. Open DevTools on any page.
6. Open the `Request Analysis` panel.

## Usage

1. Open a page and keep DevTools open.
2. Use the `Request Analysis` panel.
3. Trigger network activity on the page.
4. Filter the list by typing part of the URL.
5. Click a row to inspect the request details.
6. Click `Copy` next to a query parameter key to copy its value.
7. Right-click a row to replay that request.
8. Click `Export JSON` to save all captured requests.
9. Click `Clear` to reset the captured list.

## Captured Data Shape

Each captured item includes values like:

- `id`
- `startedDateTime`
- `durationMs`
- `method`
- `url`
- `host`
- `path`
- `queryParams`
- `requestHeaders`
- `requestQueryString`
- `requestPostData`
- `status`
- `statusText`
- `responseMimeType`
- `responseSize`

## Project Structure

- `src/manifest.json`: Extension manifest.
- `src/devtools.html`: DevTools page bootstrap.
- `src/devtools.js`: Network capture and panel messaging.
- `src/panels.html`: Panel markup and layout.
- `src/panel.js`: Panel rendering and interactions.

## Limitations

- Captured requests are stored only in memory.
- Reloading the extension or closing DevTools clears the request list.
- Replay is best-effort and may differ from the original browser request.
- Exported JSON contains only the fields stored by this extension, not the full HAR response body.

## License

This project is licensed under the Apache License 2.0.  
See [LICENSE](LICENSE) for details.
