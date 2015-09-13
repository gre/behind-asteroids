# Behind Asteroids — The Dark Side

Ever wondered what is happening under the hood of an Asteroids Arcade machine?
I can tell you: A greedy evil 25¢ money maker engine.

![](400x250.png)

## Game versions

The game both works for mobile and desktop but the gameplay varies.
The desktop version is a [touch typing](https://en.wikipedia.org/wiki/Touch_typing) game
where the mobile version is a simple touch game. If you are not good at typing on keyboards,
just prefer the mobile version.

On mobile (especially for iOS Safari), please use **Add to Home screen** for better experience.

## The game

Behind Asteroids is a game about throwing asteroids to people playing "Asteroids"
on an arcade machine. Like in Asteroids game, player have 3 extra lifes.
The goal is to make the player lose and try to earn as much coins as possible.
When a player lose, another come and put a new coin in the arcade.

The game gets harder and harder over players as the AI improves.
The AI starts to be very good around Player 10
and the game is very challenging from Player 20.

There are different game mechanism involved, they get introduced in first levels
and get harder and harder to use:

- The Asteroids have an aiming centered in the spaceship that varies the throw velocity
- The Asteroids aiming rotates (Player >2)
- The "RED" area in the aiming that make you fail the throw (Player >3)
- The UFO bonus that you get after sending asteroids without failing to throw an asteroid (Player >4)

## Tech overview

- Canvas2D for the game primitives drawing
- [WebGL](src/lib/webgl.js) for post processing effects (7 fragment shaders)
- [Web Audio API](src/lib/audio.js) + [jsfxr](src/lib/jsfxr.js)
- [Asteroid fonts implemented "by hand"](src/lib/asteroids.font.js)
- *... (more to describe later)*

## Build system

The build system is made with a few simple scripts.
It is able to copy assets, concat all files, minify the GLSL code, minify the JavaScript,...

### dev

```
npm run liveserver
```

```
npm run watch
```

### prod

```
npm run build
```
