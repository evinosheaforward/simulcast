# Simulcast

A simultaneous activation card game!

## Running locally

### Install dependencies
You need to run npm install for the packages:
```
npm install
cd frontend && npm install
cd ../backend && npm install
cd ../common && npm install
```

### Firebase
You will also need to setup Firebase Auth. You will need to [create a Firebase project](https://firebase.google.com/docs/auth)
and you will need to turn on the "email and password" authentication method.

You will then need to create `frontend/.env` and `backend/.env` (these are git-ignored) with your firebase credentials for the full application to run correctly.
See `frontend/.env.example` and `backend/.env.example` for examples.

Lastly, you need to run the Firebae emulator to run the application locally.
To run the Firebase Auth emulator as a background process, run:
```
npm run start:auth
```

### Run the Frontend and Backend Services
You can then run the frontend and backend with:
```
npm run all
```

## Ngrok
You can set up the frontend and backend to be available via ngrok. To run with ngrok you'll need something like this in your ngrok config:
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
