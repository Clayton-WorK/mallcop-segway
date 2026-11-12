# mallcop-segway

A Claude Code plugin: **while Claude is thinking**, a mustachioed mall cop patrols above the prompt, riding his segway in a tight, endless circle in front of the food court. When the turn ends (answered, interrupted or errored) he rolls off.

- In the Claude desktop app (and VS Code) he is an animated drawing: he orbits, shrinks as he rounds the back of the loop, turns around, bobs, and the wheel spins.
- In a terminal he is colored pixel art, animated only while Claude is working.

## Install

At the prompt of a Claude Code terminal session:

```
/plugin install mallcop-segway --marketplace Clayton-WorK/mallcop-segway
```

Answer `y` to add the marketplace, then pick a scope (user scope puts him in every project). Restart Claude Code, send any message, and he'll roll out while Claude works on it.

From a shell instead:

```
claude plugin install mallcop-segway --marketplace Clayton-WorK/mallcop-segway
```

If your Claude Code version doesn't know `--marketplace`, use the two-step form:

```
/plugin marketplace add Clayton-WorK/mallcop-segway
/plugin install mallcop-segway@mallcop
```

## Use

There is nothing to do: he appears whenever Claude is working on a reply in the main conversation. Type `/mallcop` to send him off duty, and `/mallcop` again to bring him back.

## Uninstall

```
/plugin uninstall mallcop-segway@mallcop
```

## Notes

- Needs a recent Claude Code version that supports plugin hooks modules (`hooks/register.tsx`).
- In a terminal, use one with true color (Windows Terminal, iTerm2, most modern terminals) for him to look right.
