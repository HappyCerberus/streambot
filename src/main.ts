import * as backbone from "./backbone/backbone"
import * as twitch_chat from "./platforms/twitch/chat"
import * as greeter from "./demo/greeter"
import * as twitch_stats from "./platforms/twitch/steady_state"
import * as obs_export from "./obs/stream_stats"

backbone.run();
//twitch_chat.run("twitch_chat", "tcp://127.0.0.1:6001");
//greeter.run("greeter", "tcp://127.0.0.1:6002");
//twitch_stats.run("twitch_stats", "tcp://127.0.0.1:6003");
obs_export.run("obs_export", "tcp://127.0.0.1:6004");