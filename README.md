# Simulcast

A simultaneous activation card game!

## Running locally
You need to run npm install for the packages:
```
npm install
cd frontend && npm install
cd ../backend && npm install
```

You can then run the frontend and backend with:

```
npm run all
```

This will only work locally - to run with ngrok you'll need something like this in your ngrok config:
```
tunnels:
  frontend:
    addr: 5173
    proto: http
    request_header:
      add:
        - 'host: localhost'
  backend:
    addr: 5000
    proto: http
```
then you can run:
```
ngrok start --all
```

then grab the ngrok URL that routes to localhost:5000.

Finally, run the game with:
```
VITE_BACKEND_URL=<ngrok-5000-url> npm run all
```

Then you will be able to use the ngrok URL/game to play the game and it will use your localhost on the backend.

## Mobile
Works just okay on mobile!
