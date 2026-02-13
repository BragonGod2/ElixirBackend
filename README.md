# Elixir Backend Service

This is the backend service for RizingSun Media's Elixir extension suite (AE/Premiere extensions).

**Key Responsibilities:**
1.  **Authentication**: Handles Google OAuth flow and session management.
2.  **User Data Proxy**: Provides user details (Role, Department, Phone) and photos to the extensions via Google Directory API.
3.  **Update Distribution**: Serves the `manifest.json` and `.zxp` update files.

## Project Structure

- `app.js`: Main Express server.
- `src/routes/auth.js`: Google OAuth endpoints (`/auth/google`, `/auth/google/callback`, `/auth/refresh`).
- `src/routes/api.js`: User data endpoints (`/api/user/:email`, `/api/photo/:email`).
- `src/routes/updates.js`: Update endpoints (`/updates/manifest.json`, `/updates/download/:filename`).
- `public/`: Static files (for updates).
- `public/updates/`: Folder to place new `.zxp` files.

## Deployment on Hostinger (Node.js App)

1.  **Upload Code**:
    *   Upload this entire folder to your Hostinger File Manager (via Git or ZIP).
    *   Ensure `public/updates` exists.

2.  **Environment Variables**:
    *   Create a `.env` file in the root based on `.env.example`.
    *   Fill in `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`.
    *   Set `GOOGLE_REDIRECT_URI` to `https://<YOUR_DOMAIN>/auth/google/callback`.

3.  **Install Dependencies**:
    *   Run `npm install` (Hostinger's Node.js setup usually handles this via "npm install" button or terminal).

4.  **Google Cloud Console Setup**:
    *   Go to [console.cloud.google.com](https://console.cloud.google.com).
    *   Select the project linked to `rizingsunmedia.com`.
    *   Go to **APIs & Services > Credentials**.
    *   Edit your OAuth 2.0 Client ID.
    *   Add `https://<YOUR_DOMAIN>/auth/google/callback` to **Authorized redirect URIs**.

5.  **Serve Updates**:
    *   When you have a new update, place the `.zxp` files in `public/updates/`.
    *   Update `public/manifest.json` with the new version number and download URL.

## Authentication Logic

The extension opens a local browser to `http://localhost:<port>/auth/login` (handled by local server) which redirects to:
`https://<YOUR_DOMAIN>/auth/google?callback_url=http://localhost:<port>/callback`

The backend:
1.  Redirects to Google.
2.  Google redirects back to `/auth/google/callback`.
3.  Backend gets user info, verifies domain.
4.  Backend redirects browser back to `http://localhost:<port>/callback` with tokens in URL parameters.
5.  Extension captures tokens and closes browser.
