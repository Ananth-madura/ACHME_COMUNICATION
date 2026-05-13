# Backend Port Conflict Fix

## Problem
The backend failed to start because the configured port was already in use.

### Error message
`Error: listen EADDRINUSE: address already in use :::3000`

This means another process was already listening on port `3000`, so the Node.js Express server could not bind to that port.

## Fix applied
1. Changed the backend environment port from `3000` to `3001` in `backend/.env`.
2. Added a `server.on("error", ...)` handler in `backend/server.js` to detect `EADDRINUSE` and print a clear explanation instead of crashing without context.

## Files updated
- `backend/.env`
- `backend/server.js`
- `backend/PORT_CONFLICT_FIX.md`

## How to verify
1. Start the backend again with `npm run dev` inside `backend/`
2. Confirm the console prints:
   - `✅ Server running: http://localhost:3001`

If port `3001` is also occupied, update `PORT` in `backend/.env` to another free port.
