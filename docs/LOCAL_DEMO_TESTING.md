# Local access to the legacy demo account

The database contains `demo@huevivu.app` (`user_demo001`) and its existing test trips. Its old shared password and all tokens for that ID are rejected by default.

For testing this exact account in a local development server, set `ALLOW_LEGACY_DEMO_LOGIN=1` in the ignored `.env.local` file, then run `npm run demo:local-reset`. The command creates a random password, stores only its bcrypt hash in the local SQLite database and prints the password once. Start the app bound to loopback with `npm run dev -- --hostname 127.0.0.1 --port 3000` and use the printed credentials at `/onboarding`.

The flag works only when `NODE_ENV=development`. A production server rejects this account even if the flag is present. New development tokens carry a local demo test marker; old demo tokens remain invalid. The demo user retains the ordinary `user` role; the administrator assignment script continues to reject it.

To turn local access off, remove or set `ALLOW_LEGACY_DEMO_LOGIN=0` in `.env.local` and restart the development server. This blocks future logins and use of its existing token on the server. Keep the printed password out of Git and shared logs.
