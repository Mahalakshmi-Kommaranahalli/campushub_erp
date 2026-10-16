# CampusHub-ERP — Fresh Docker Setup for a Friend

## What this package does
This runs the CampusHub Node.js/Express app in Docker on the local computer.
The app listens inside the container on port 3000 and is exposed on the computer at port 3001.
It can connect to an existing Railway MySQL database. It does not create or migrate a database.

## Requirements
- Windows 10/11
- Docker Desktop installed and running
- Authorized access to the Railway database connection details

## Steps
1. Extract this ZIP.
2. Open the extracted folder `CampusHub-ERP-Docker-Ready\CampusHub-ERP`.
3. Copy `.env.example` and rename the copy to `.env`.
   - In File Explorer, enable View > Show > File name extensions if needed.
   - Make sure the filename is exactly `.env`, not `.env.txt`.
4. Open `.env` in Notepad.
5. Set `DATABASE_URL` to the current authorized Railway MySQL public connection URL.
6. Replace `SESSION_SECRET` with a long, random private value.
7. Save `.env`. Do not upload or share this file.
8. Open PowerShell in this folder. The folder must contain `compose.yaml`.
9. Run:
   ```powershell
   docker compose up -d --build
   ```
10. Open http://localhost:3001
11. Check container status:
   ```powershell
   docker compose ps
   ```
12. View logs if the site fails:
   ```powershell
   docker compose logs -f
   ```
   Press Ctrl+C to stop viewing logs; this does not stop the app.
13. Stop the app when needed:
   ```powershell
   docker compose down
   ```
14. Start it again later:
   ```powershell
   docker compose up -d
   ```

## Important
- If port 3001 is already in use, change `HOST_PORT=3001` in `.env` to another free port, such as `3002`, then run:
  `docker compose up -d --force-recreate`
  Open the corresponding local URL, e.g. http://localhost:3002.
- The `DATABASE_URL` must be the Railway public connection URL, not a private/internal URL that is reachable only from Railway.
- Your friend must be authorized to use the database. Anyone with the connection URL may be able to access database contents, so share it privately and only with a trusted person.
- The app and database are separate. This Compose setup runs only the app; it does not start MySQL locally.
- `.env` is excluded from Git by `.gitignore`. Never remove that protection.
- The database dump in `database/` is for reference/local setup; importing it is not required when connecting to the existing Railway database.
- The app currently uses Express's in-memory session store, which is suitable for local testing but not ideal for production hosting.
