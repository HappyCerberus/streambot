# Interactive Stream Bot

![streambot](https://socialify.git.ci/HappyCerberus/streambot/image?description=1&descriptionEditable=Streambot%20for%20Twitch%20%26%20Youtube.&font=KoHo&forks=1&language=1&owner=1&pattern=Signal&stargazers=1&theme=Light)

## Goal

- multi-stream, multi-platform support
- easy to plug into external software
- support for steady-state information (number of subscribers, viewers, etc...)

## Past streams

### Early design and exploration


- [Interactive Stream Bot in C++ | Episode 1 | Design and exploration (Twitch & Youtube)](https://www.youtube.com/watch?v=0GfTwS-zsso)
- [Interactive Stream Bot in C++ | Episode 2 | Youtube chat integration](https://www.youtube.com/watch?v=Y9bR5im_Hxk)
- [Interactive Stream Bot in C++ | Episode 3 | Second Attempt at Youtube](https://www.youtube.com/watch?v=Y6mWE8CQuG8)
- [Interactive Stream Bot in C++/JS | Episode 4 | Exploring alternative solutions for REST / OAUTH](https://www.youtube.com/watch?v=57uAjF1FDeE)

### Intermission - Learning Javascript

- [Senior C++ Dev learns Javascript | Ep 01 | Typescript](https://www.youtube.com/watch?v=okP18N7dBJE)
- [Senior C++ Dev learns Javascript | Ep 02 | Typescript](https://www.youtube.com/watch?v=QtsVOVAHyjE)
- [Senior C++ Dev learns Javascript | Ep 03 | Asynchronous operations](https://www.youtube.com/watch?v=VxYZ6Y_pDGo)

### Typescript 

- [Interactive Stream Bot in Typescript | Episode 5 | Proof of concept using Typescript](https://www.youtube.com/watch?v=rD6dTGWvwgQ)
- [Interactive Stream Bot in Typescript | Episode 6 | Follower / Sub information](https://www.youtube.com/watch?v=6qanh0VQIzw)
- [Interactive Stream Bot in Typescript | Episode 7 | OBS Overlay with Vue.js](https://www.youtube.com/watch?v=ZQpJoS1LXAs)
- [Interactive Stream Bot in Typescript | Episode 8 | Vue3 & Websockets](https://www.youtube.com/watch?v=4ym4SC4-NVg)
- [Interactive Stream Bot in Typescript | Episode 9 | Youtube integration](https://www.youtube.com/watch?v=sAsyLO5XjbE)
- [Interactive Stream Bot in Typescript | Episode 10 | Text to Speech & Youtube chat](https://www.youtube.com/watch?v=arzceM61GO4)

## Design Notes

The goal of the architecture is to abstract the modules that consume specific information (such as a chat message) from the details for interacting with a specific platform.

Moreover the architecture aims to be language agnostic, allowing for modules to be easily written in various languages and used as game mods.

* Inbound modules announce themselves to the backbone on port `tcp://127.0.0.1:6666`, with their pubsub endpoint as the content of the message.
* Backbone will then connect to this pubsub endpoint and re-transmit all messages on its own pubsub endpoint on port `tcp://127.0.0.1:6667`.
* Outbound modules simply connect to the backbone pubsub endpoint and react to messages accordingly.
