# Behind Asteroids, The Dark Side [![](https://img.shields.io/badge/js13kGames-2015-b12a34.svg)](http://js13kgames.com/entries/behind-asteroids-the-dark-side)

## Synopsis

Ever wondered what is happening under the hood of an Asteroids Arcade machine?
I can tell you: A greedy evil 25¢ money maker engine.

## Context

This is an entry for [js13kGames](http://js13kgames.com/entries/2015), goal is to make a web game in less than 13k zipped of JavaScript.
Theme was **"Reversed"**.

### Inspiration

- The Asteroids original Arcade machine [I've discovered in Brooklyn's Barcade](https://twitter.com/greweb/status/631981745638875137).
- Youtube videos like [this one](https://www.youtube.com/watch?v=w60sfReTsRA).

**Best quote ever**
> ["Not bad for a 35 years old system. 35 years old. Things don't get better than this. They don't get better than this. Look at this picture, you know what, even HD can't be this clear, crystal clear, razor sharp, wonderful vector graphics. Sorry there is nothing like it. *nothing like it*. What a terrific game."](https://youtu.be/i-x_gPxqEMw?t=4m14s)


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

<img src="screenshots/explosion.png" width="360" />
<img src="screenshots/dead.png" width="360" />
<img src="screenshots/newplayer.png" width="360" />
<img src="screenshots/playerlose.png" width="360" />

There are different game mechanism involved, they get introduced in first levels
and get harder and harder to use:

- The Asteroids have an aiming centered in the spaceship that varies the throw velocity
- The Asteroids aiming rotates (Player >2)
- The "RED" area in the aiming that make you fail the throw (Player >3)
- The UFO bonus that you get after sending asteroids without failing to throw an asteroid (Player >4)

<img src="screenshots/ufo.png" width="360" />
<img src="screenshots/player24.png" width="360" />
<img src="screenshots/playerlose2.png" width="360" />
<img src="screenshots/explosion.png" width="360" />

### Game Over

Everytime the player is reaching 10'000 points, he wins a new extra life,
You lose if player reaches 5 lifes.

<img src="screenshots/danger1.png" width="360" />
<img src="screenshots/gameover.png" width="360" />

### Continue

Game is saved every time a player entered and can be continued later.

<img src="screenshots/continue.png" width="360" />


# Tech overview

- Canvas2D for the game primitives drawing
- [WebGL](src/lib/webgl.js) for post processing effects (7 fragment shaders)
- [Web Audio API](src/lib/audio.js) + [jsfxr](src/lib/jsfxr.js) ([14 sounds](src/sounds.js))
- [Asteroid fonts implemented "by hand"](src/lib/asteroids.font.js)
- *... (more to describe later)*

## Under the hood of the effects pipeline

> Here is an non exhaustive summary of what's going on with the WebGL post-processing effects.

### primitives are down on a Canvas
using the 3 color channels (RED, GREEN, BLUE) independently (to split object to process by the pipeline).

![](screenshots/tech/game.png)

### A "laser" shader draws monochrome, extract/accentuate things from channels

and then is blurred

![](screenshots/tech/laser.png)

### the player shader is rendered
The player and it environment (that will be reflected in the screen) is procedurally generated in a shader.

![](screenshots/tech/player_raw.png)

and blurred (multi-pass)

![](screenshots/tech/player.png)

### Glare

Glare is obtained by applying a large linear blur on the blue channel (= bullets) of the initial canvas.
(I have no image for this)

### Result

![](screenshots/tech/result.png)

To combine the final result, 5 textures are used:

```glsl
uniform sampler2D G; // game
uniform sampler2D R; // persistence
uniform sampler2D B; // blur
uniform sampler2D L; // glare
uniform sampler2D E; // env (player)
```

The blur texture is used as a way to make the glowing effect (multiplying with a blue color).
The persistence texture stores the previous blur texture to accumulate motion blur over time.

## Build system

The build system is dedicated to JS13K and made with a few simple [scripts](package.json).
It is able to copy assets, [concat all files](scripts/concat.sh), [minify the GLSL code](scripts/compileglslfiles.sh), minify the JavaScript, zip the result and give size information.

Things are a bit specific to my need but remain very simple, modular and powerful, you could easily fork it.

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
