# Speaking Studio for Grok

A 30-day English speaking program with everyday conversation, OPIc-style drills, and workplace role-play. It is a standalone companion to [SpeakForward OPIc](https://maincora44-wq.github.io/speakforward-opic/).

[Open Speaking Studio](https://maincora44-wq.github.io/speakforward-opic/grok/). If an earlier SpeakForward installation opens the original home screen, visit SpeakForward and apply its offered update, then reopen the studio.

## Practice a session

1. Choose a day and read or listen to the question. You can hide the text to practice listening.
2. Start the one-minute timer and answer out loud. Record and replay your answer if you want to review it.
3. Copy the session prompt and paste it into [Grok](https://grok.com/). You can include a typed answer to get feedback first.
4. Mark the session complete and review your weekly progress as you go.

## Use a Grok bot

Copy [the coaching instructions](bot-instructions.txt) into a Grok chat or a bot’s instruction field if available. Ask for Speaking Studio, OPIc, or Business English. The same instructions work across all 30 practice sessions.

The page runs without an API key. Your answer is included in the text you copy when you add it to the optional transcript field. Drafts and recordings are temporary. Completion is saved in this browser.

## Run locally

Serve this directory with any static HTTP server. To use the microphone, open the page over HTTPS or localhost.

```sh
python3 -m http.server 4173
```
