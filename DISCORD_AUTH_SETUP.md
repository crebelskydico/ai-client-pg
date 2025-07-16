# Discord Authentication Setup

To restrict access to logged-in users, add the following to your `.env` file:

```
AUTH_DISCORD_ID=your-discord-client-id
AUTH_DISCORD_SECRET=your-discord-client-secret
```

You can get these from the Discord Developer Portal: https://discord.com/developers/applications

- The app is already configured to use Discord as a provider in `src/server/auth/config.ts`.
- The login/logout buttons are already wired up in `src/components/auth-button.tsx`.

Next step: Restrict chat API to authenticated users.
