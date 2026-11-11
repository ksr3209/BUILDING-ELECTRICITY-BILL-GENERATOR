# Set up Google Drive backups

Building Ledger saves complete ledger snapshots in your Google account's private **app-data folder**. Each backup creates a new version. Local edits do not upload automatically.

The app controls are implemented. Your Google Cloud project and public Web OAuth client ID are still required. A real Google account connection, upload and restore have not been verified with this package.

Google setup is optional. **Guest mode** lets you use billing, payments, history, printing and local JSON export/import without an account or internet. **Use guest mode** in Settings disconnects this tab, keeps your current ledger and Google backups, and remembers your choice on this device. Future visits avoid automatically loading Google sign-in until you choose Connect Google account again. Guest records remain in the same browser storage, so keep local JSON exports before clearing browser data or changing devices.

## 1. Prepare your Google project

1. Open [Google Cloud Console](https://console.cloud.google.com/) and create or select a project for Building Ledger.
2. In **APIs & Services → Library**, find **Google Drive API** and enable it. [Google's API setup guide](https://developers.google.com/workspace/drive/api/quickstart/js#set_up_your_environment).
3. Open **Google Auth Platform → Branding**. Enter the app name, support email and required contact details. Under **Audience**, choose the appropriate audience. For a personal Google account, use External; while the project is in Testing, add your own Google email and any allowed accounts to **Test users**. [Google's consent-screen instructions](https://developers.google.com/workspace/guides/configure-oauth-consent).
4. Under **Data Access**, add and save this scope:

   ```text
   https://www.googleapis.com/auth/drive.appdata
   ```

   This non-sensitive scope allows access to this app's hidden data rather than your normal Drive documents. [Google's app-data guide](https://developers.google.com/workspace/drive/api/guides/appdata).

## 2. Create a Web OAuth client

1. Open **Google Auth Platform → Clients → Create client** and choose **Web application**.
2. Add the origin displayed in **Settings → Google Drive backup → Google connection setup** to **Authorized JavaScript origins**. The supplied launcher uses:

   ```text
   http://127.0.0.1:8765
   ```

   Include the scheme, host and port only; omit `/index.html`. Google's rules permit HTTP localhost IP origins. [Origin validation rules](https://developers.google.com/identity/protocols/oauth2/javascript-implicit-flow#js-origin-validation).

3. For an HTTPS installation, add its exact origin to the same client. If testing with localhost too, Google's setup guide calls for both `http://localhost` and `http://localhost:8765`. This popup token integration does not need an app redirect/callback URL. [Google's Web client setup](https://developers.google.com/identity/oauth2/web/guides/get-google-api-clientid).
4. Copy the **Client ID**, which ends in `.apps.googleusercontent.com`. Only this public ID belongs in the app. Keep any client secret out of the app, its files and backups.

Keep using `http://127.0.0.1:8765` for the existing local ledger: `localhost` and `127.0.0.1` have separate browser storage. Export before changing address. Use the same client ID and Google account on each device to access the same backup collection.

## 3. Connect in Building Ledger

1. Run `start-app.cmd`, or open your HTTPS installation. A `file://` page cannot use this connection.
2. In **Settings → Google Drive backup**, expand **Google connection setup**.
3. Paste the ID into **Google OAuth client ID**, then press **Save client ID**.
4. Press **Connect Google account**, choose your account and allow app-data access. Allow the popup. If sign-in is still loading, press Connect again when the panel says ready.
5. The panel should say **Connected for this tab** and show saved versions. A new account/configuration may have none yet.

The public ID is saved separately from ledger records. Access tokens remain in the current tab's memory, outside localStorage, sessionStorage and JSON backups. Reloading or token expiry requires another explicit connection. **Use guest mode** clears this tab's token and list; it keeps local records and Google backups and does not revoke the account's app grant. [Google's token-model guide](https://developers.google.com/identity/oauth2/web/guides/use-token-model).

## 4. Back up and restore

**Save:** finish local edits, then press **Back up to Google Drive** and wait for success. Each backup contains all saved months, readings, charges, tenant details and payments. Existing versions are not overwritten or pruned.

**Restore:** connect with the same client ID and account, press **Refresh backups**, then **Review & restore** beside a version. Check the building name, month count and date. Confirm **Download local copy & restore** to request a recovery JSON download before replacing the device's ledger. Keep that file. Restore replaces local records without merging them or changing the Drive version. Changed local records or a changed/expired Google connection require a fresh review.

On another device, restore before working and back up when finished. Avoid editing separate copies simultaneously: there is no automatic multi-device synchronization or conflict merge.

App-data files do not appear in your normal Drive list; view and restore them through this app. Google allows users to delete an app's hidden data, so retain occasional independent JSON exports too. [About app-data storage](https://developers.google.com/workspace/drive/api/guides/appdata).

## Limits and troubleshooting

- Backups must be **10 MB or smaller**. The app lists up to **1,000 newest versions**, showing 20 at a time with **Show older backups**. No remote delete or automatic cleanup control is included.
- **Client/origin error:** confirm Web application type, the project with Drive API enabled, the correct client ID, and the exact displayed authorized origin.
- **Access denied:** add your account as an allowed test user while the project is in Testing and grant app-data access. A Workspace administrator may also restrict third-party access.
- **Popup blocked:** allow the Google popup. If an HTTPS host sets Cross-Origin-Opener-Policy, support popup communication using `same-origin-allow-popups`. [Google's hosting guidance](https://developers.google.com/identity/oauth2/web/guides/get-google-api-clientid#content_security_policy_and_coop).
- **Offline/network failure:** local billing continues to work. Drive operations require internet. Google's sign-in library loads from Google when configured and is not included in offline caching.
- **Restore rejected:** keep the local ledger, export JSON if needed, and choose a valid Building Ledger backup. Reload newer saved records to resolve a local save conflict first.

Check that the intended backup appears in the app's list before clearing browser storage.
