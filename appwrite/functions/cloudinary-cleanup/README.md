# cloudinary-cleanup (Appwrite Function)

Performs signed Cloudinary asset deletion. This has to run server-side
because Cloudinary's destroy API requires your API secret, which must never
ship in browser code.

## Deploy (Appwrite CLI)

From the project root:

```bash
appwrite functions create \
  --functionId=cloudinary-cleanup \
  --name="Cloudinary Cleanup" \
  --runtime=node-18.0 \
  --execute=users \
  --entrypoint="src/main.js"

appwrite deploy function
```

If you use the Console instead: Functions -> Create function -> Node.js 18.0
-> Entrypoint `src/main.js` -> Execute Access: **Users** (not Any — this
keeps anonymous visitors from spamming deletes).

## Environment variables

Set these on the function itself (Console -> Functions -> cloudinary-cleanup
-> Settings -> Variables), not in the frontend `.env`:

| Variable                | Value                                      |
|--------------------------|---------------------------------------------|
| `CLOUDINARY_CLOUD_NAME`  | Your Cloudinary cloud name                 |
| `CLOUDINARY_API_KEY`     | Your Cloudinary API key                    |
| `CLOUDINARY_API_SECRET`  | Your Cloudinary API secret                 |

## Request format

```json
{ "publicId": "socialpulse/videos/abc123", "resourceType": "video" }
```

`resourceType` is one of `image`, `video`, `raw` (defaults to `image`).

## Frontend wiring

Already wired up in `src/services/media.js` (`deleteMedia`). If you deploy
under a different function ID, set `VITE_APPWRITE_CLOUDINARY_FUNCTION_ID` in
the app's `.env` to match.
