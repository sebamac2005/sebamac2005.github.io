# Custom game sounds
can
Drop your audio files directly into this folder. Use the exact lowercase filenames below, then refresh the game. No code edits or playlist file needed. Missing or unreadable files keep the original generated sound/music. MP3 files must contain actual MP3 audio: renaming a different format does not convert it.

## Mission songs (loop for the entire mission)

| Filename | When it plays |
| --- | --- |
| `prologue.mp3` | Full prologue: basement, raid, escape and arrival |
| `mission2.mp3` | Operation RAM: gun-shopping objective through installation at the barn |
| `mission3.mp3` | Access Denied: network puzzle through return and installation |
| `free_roam.mp3` | Free roam / barn between missions |

Songs loop automatically until the mission ends. Pause menus and the weapon wheel pause them. A new mission starts its song from the beginning. The radio is disabled throughout every mission, including the prologue, in both cars and Kukirins. Mission songs keep playing while you drive. In free roam, background music pauses at its current position while the radio is actually playing and resumes when you switch it off or exit. An empty/broken radio playlist does not silence background music. Radio songs stay in the separate `../radio/` folder and can have any names.

## Effects (one sound per event)

| Filename | Replaces |
| --- | --- |
| `bullet.mp3` | Gunshot (player and police, all weapon types) |
| `reload.mp3` | Reload sound; put the whole reload sequence in one file |
| `hit.mp3` | Hit confirmation |
| `hurt.mp3` | Player getting hurt |
| `crash.mp3` | Vehicle collision |
| `footstep.mp3` | One footstep (not a whole walking loop) |
| `mission_fail.mp3` | Death / mission failure cue |
| `objective.mp3` | Objective transition cue |
| `birds.mp3` | Occasional outdoor ambience cue |
| `siren.mp3` | Occasional police alert cue |

## Continuous loops

| Filename | Replaces |
| --- | --- |
| `engine.mp3` | Car engine loop (pitch rises with speed) |
| `kukirin.mp3` | Kukirin motor loop (pitch rises with speed) |
| `wind.mp3` | Wind / background air loop |
| `tire_screech.mp3` | Tire screech loop while drifting |

Use short, seamless loops for engines/wind/tires and short clips for effects. Keep recordings at comparable loudness. Existing master/music/effects/radio volume sliders still apply. Any subset of files works; deleting a replacement and refreshing restores the built-in audio. Changes are loaded when you start/continue gameplay after a page refresh.

Gunshots automatically vary in pitch by up to ±3% per shot; footsteps by up to ±5% per step. This also applies to `bullet.mp3` and `footstep.mp3`. Other effects and music keep their original pitch.

Mission songs fade in over 1.4 seconds and fade out over 1.2 seconds. Changing missions crossfades custom songs. Pausing or turning on the free-roam radio fades the song out, preserving its playback position for resume.

## Empire missions and the final choice

| Filename | Use |
| --- | --- |
| `mission5.mp3` | Upadek Kopernika — loops for mission 5 |
| `mission6.mp3` | Wąskie Gardło — loops for mission 6 |
| `mission7.mp3` | Odbicie Ekonomu — loops for mission 7 |
| `lastsong.mp3` | Koniec Zmiany — loops for the epilogue |
| `final_choice.mp3` | Macioszek's betrayal line: “To co panowie, wychodzimy na przerwę” |

`final_choice.mp3` is a one-shot voice clip, played only when choosing **Jeden Król**, at its original pitch. The explosion waits at least four seconds, or the full decoded voice clip duration if longer. Missing voice files leave the subtitle visible. Mission tracks use the existing fades; radio stays disabled during missions.


## Finale scene

`lastsong.mp3` loops during the final mission, including the barn party. Join the crew by holding F at the bottle table, or hold F in the barn centre to place the fictional bomb. Call the toast, walk outside through the front entrance, then hold F at the outside marker to trigger the voice line and detonation.

| Filename | Trigger |
| --- | --- |
| `explosion.mp3` | Barn explosion, one shot |
| `fire.mp3` | Burning barn, seamless loop |
| `fire_crackle.mp3` | Short crackles during the fire |
| `bomb_plant.mp3` | Placing the bomb |
| `detonator.mp3` | Detonator click |
| `bottle_pickup.mp3` | Grabbing a bottle |
| `drink.mp3` | Taking the drink |
| `toast.mp3` | Joining the toast |
| `toast_call.mp3` | Calling the crew to the centre |
| `party_cheer.mp3` | Crew cheering when the party starts |
| `mission_start.mp3` | Starting an empire mission |
| `mission_complete.mp3` | Completing a mission |
| `glass_break.mp3` | Kopernik entry breach |
| `stun.mp3` | Stun attack |
| `baton.mp3` | Baton attack |
| `terminal.mp3` | Director terminal interaction |
| `ram_pickup.mp3` | Recovering mission equipment |
| `spikes.mp3` | Deploying spikes |
| `convoy_stop.mp3` | Convoy crash |
| `radio_switch.mp3` | ZSEH broadcast interaction |
| `cash_pickup.mp3` | Collecting dropped cash |
| `shop_buy.mp3` | Buying a weapon |
| `weapon_draw.mp3` | Equipping a weapon |
| `pistol.mp3` | Glock shot |
| `rifle.mp3` | Rifle shot |
| `shotgun.mp3` | Shotgun shot |
| `sniper.mp3` | Sniper shot |
| `smg.mp3` | SMG shot |

Individual weapon clips override `bullet.mp3`; missing individual clips fall back to `bullet.mp3`, then generated audio. Voice clips and celebration clips are silent if not provided. The explosion and crackles have generated fallbacks. All filenames are case sensitive. Existing master/effects/music sliders apply.

Additional replacements: `door_breach.mp3` plays at police/school entry; `forklift.mp3` loops while driving the forklift.
