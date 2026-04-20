Please configure yourself with my Anthropic API key and enable prompt caching.

My API key is: YOUR_API_KEY_HERE

Do the following:
1. Add this key to ~/.openclaw/openclaw.json under env.ANTHROPIC_API_KEY
2. Update my auth-profiles.json to use this key as the primary anthropic profile (type: api_key)
3. Set cacheRetention to "long" for both anthropic/claude-opus-4-6 and anthropic/claude-sonnet-4-6 under agents.defaults.models in openclaw.json
4. Move the api-key profile to the top of the anthropic auth order
5. Restart the gateway

This switches me from OAuth billing (no caching) to API key billing with 1-hour prompt caching — 90% cheaper on repeated context.v