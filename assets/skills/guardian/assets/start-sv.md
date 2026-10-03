# Guardian Wrapper

Initiera projektet med `guardian-wrapper init <projektmapp>`. Välj hela Matt-samlingen med `--groups all`, en grupp med `--groups engineering` eller enskilda skills med `--groups core --skills tdd,code-review`.

AGENTS.md är gemensam källa och CLAUDE.md importerar den. Skills installeras projektlokalt för Claude Code och Codex. Globala skills ändras inte; verifiera rätt provider i en ny session.

Kontrollera med `node .guardian/bin/guardian.mjs doctor .`. Läs Guardian-skillen för adopt, change, fix, status och verify. Init installerar verktygen; adoption bygger granskad projektorientering.

ADHD-format är aktivt från start. `stop adhd mode` stänger av det i aktuell session. `node .guardian/bin/guardian.mjs config . adhd off` ändrar projektets standard.

Graft bygger en lokal strukturgraf utan LLM-nyckel. Kör `node .guardian/bin/guardian.mjs graft . build` för kort och `... graft . ask "uppgift"` för retrieval. `--deep` är ett uttryckligt tillval med egna providerinställningar. CLI:n kan kontrollera nya graft-versioner via nätverket; wrappern stänger av graft-telemetri.

Domänspråket finns i GLOSSARY.md. ICM:s operativa kontrakt och granskade orientering finns under docs/map/. Skapa endast dokument med verkligt innehåll.
