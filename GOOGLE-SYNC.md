# Google-account backup and restore

The selected implementation uses **Google Drive's private app-data folder**. Firebase is not required. Open **Settings → Google Drive backup** to connect, save a new version, or review and restore one.

Complete the [Google Drive setup guide](GOOGLE-DRIVE-SETUP.md) first: enable Drive API in your Google Cloud project, configure consent for `drive.appdata`, create a Web OAuth client with the app's exact origin, and paste its public client ID into Settings. The supplied launcher stays at `http://127.0.0.1:8765` to preserve existing browser storage.

This is manual backup/restore. Local autosave does not upload, and connecting never replaces the ledger. Each backup creates a new full snapshot; restore validates it, asks for confirmation, requests a local recovery JSON download, then replaces local records. It does not merge simultaneous edits. Use the same client ID and Google account on each device, restore before working, and back up afterward.

App-data files are hidden from the normal Drive list and accessed through this app. The scope is limited to app-data access. [Google's app-data documentation](https://developers.google.com/workspace/drive/api/guides/appdata).

The public client ID is saved separately on the device. Tokens remain in the current tab's memory. Disconnecting forgets the connection without deleting cloud backups or revoking the account's app grant. Reloading or expiry requires another explicit connection. [Google's token-model documentation](https://developers.google.com/identity/oauth2/web/guides/use-token-model).

Files are limited to 10 MB. Up to 1,000 newest versions can be listed; no remote pruning control is included. Keep independent local JSON exports as well.

The integration code is included, but a real Google project/client ID has not been supplied. Live authorization, uploads and restores remain unverified. No Google account data was uploaded during local mock testing.
