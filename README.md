<img src="icon.png" alt="" width="128" align="right">

# Alza Dark Mode

Userscript, který přidá tmavý režim na Alza.cz a Alza.sk. Zapne se jen tehdy, když má systém nastavený tmavý vzhled, takže Alza se chová stejně jako zbytek vašeho Macu, PC nebo telefonu.

| Původní | Tmavý režim |
| --- | --- |
| ![Detail produktu, původní](screenshots/product-light.jpg) | ![Detail produktu, tmavý režim](screenshots/product-dark.jpg) |

![Cena a tlačítka v tmavém režimu](screenshots/buy-box-dark.jpg)

![Výpis kategorie v tmavém režimu](screenshots/category-dark.jpg)

## Instalace

1. Nainstalujte si do prohlížeče správce userscriptů:
   - **Safari** (Mac, iPhone, iPad): [Userscripts](https://apps.apple.com/app/userscripts/id1463298887). Zapněte rozšíření v Safari → Nastavení → Rozšíření a povolte ho pro alza.cz (případně alza.sk).
   - **Chrome, Edge, Brave**: [Tampermonkey](https://www.tampermonkey.net/) nebo [Violentmonkey](https://violentmonkey.github.io/). V Chromu navíc otevřete podrobnosti rozšíření (`chrome://extensions`) a zapněte **Povolit uživatelské skripty**, jinak žádný skript nepoběží.
   - **Firefox**: [Tampermonkey](https://www.tampermonkey.net/) nebo [Violentmonkey](https://violentmonkey.github.io/).
2. Otevřete skript na [Greasy Fork](https://greasyfork.org/cs/scripts/601349-alza-dark-mode) a klikněte na **Instalovat tento skript**, nebo ho otevřete přímo z GitHubu:

   https://raw.githubusercontent.com/kasparek-net/alza-dark-mode/main/alza-dark.user.js

3. Potvrďte instalaci v okně, které správce userscriptů ukáže. V Safari otevřete na té stránce nabídku rozšíření Userscripts a klikněte na **Install**.
4. Obnovte otevřené záložky s Alzou.

## Používání

- Přepněte systém na tmavý vzhled (macOS: Nastavení systému → Vzhled, Windows: Nastavení → Přizpůsobení → Barvy, iOS: Nastavení → Zobrazení a jas). Alza ztmavne, po přepnutí zpět na světlý vzhled se stránka znovu načte v původních barvách.
- Pokud chcete mít Alzu světlou i při tmavém systému, vypněte skript ve správci userscriptů.

## Aktualizace

Tampermonkey a Violentmonkey hledají nové verze samy. Pro okamžitou aktualizaci stačí znovu otevřít odkaz z instalace. Userscripts v Safari nové verze kontroluje průběžně a nabídne je v nabídce rozšíření mezi dostupnými aktualizacemi, kde je potvrdíte. Kopie nainstalované před verzí 2.1 nevědí, odkud se aktualizovat, proto je jednou nainstalujte znovu z odkazu.

## Jak to funguje

Alza tmavý vzhled nemá, takže ho skript dopočítá po načtení stránky: světlá pozadí a rámečky ztmaví, tmavý text a ikony zesvětlí a odstíny zachová, aby odkazy, ceny a štítky zůstaly poznat. Fotky produktů nechává beze změny. Obsah, který se načte později (filtry, nekonečné scrollování, vyskakovací okna), přebarví hned, jak se objeví.

## Známá omezení

- Než skript stránku přebarví, může krátce probliknout světlá verze.
- Některé obrázky s bílým pozadím (fotky produktů, bannery) zůstávají záměrně bílé.
- Pokud je něco nečitelné, založte issue se screenshotem a adresou stránky.

## Odinstalace

Odstraňte **Alza Dark Mode** v přehledu skriptů ve správci userscriptů.
