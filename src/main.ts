import * as backbone from "./backbone/backbone"
import * as twitch_chat from "./platforms/twitch/chat"
import * as greeter from "./demo/greeter"
import * as twitch_stats from "./platforms/twitch/steady_state"
import * as obs_export from "./obs/stream_stats"
import * as youtube_stats from "./platforms/youtube/steady_state"
import * as youtube_chat from "./platforms/youtube/chat"
import * as text_to_speech from "./logic/text_to_speech"

backbone.run();
twitch_chat.run("twitch_chat", "tcp://127.0.0.1:6001");
youtube_chat.run("youtube_chat", "tcp://127.0.0.1:6007")

twitch_stats.run("twitch_stats", "tcp://127.0.0.1:6003");
youtube_stats.run("youtube_stats", "tcp://127.0.0.1:6005");

greeter.run("greeter", "tcp://127.0.0.1:6002");
obs_export.run("obs_export", "tcp://127.0.0.1:6004");
//text_to_speech.run("text_to_speech", "tcp://127.0.0.1:6006");
