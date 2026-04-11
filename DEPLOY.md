# Deploy / Server Workflow — RSI_Meta

## Pull latest from server
```bash
ssh -F NUL -m hmac-sha2-512 skeledzi@skeledzi.ssh.cloud.hostpoint.ch
cd ~/projects/RSI_Meta
git pull origin dev
```

## First-time setup on server
```bash
git clone git@github.com:FaSiMaster/RSI_Meta.git ~/projects/RSI_Meta
cd ~/projects/RSI_Meta
git checkout dev
npm install
```

## Build
```bash
npm run build
# dist/ → deploy via Vercel (primary) or GitHub Pages
```

## Note
React/Vite PWA — primary hosting via Vercel (automatic on push to main).
WebXR requires HTTPS — localhost exception applies for local dev only.
ArcPy: not applicable.
