# Lot R9 — « Envoyé » et « Confirmé » enfin distincts

**30/08/2026.** **1209 tests verts**, build vert. Premier lot issu de tes
remarques d'atelier — rapide, à valeur immédiate.

## Ta remarque (liste, 27/08)

> « Envoyé » a le même code couleur que « Confirmé » alors que ce sont deux
> états distincts. « Confirmé » devrait avoir une autre couleur, et être atténué
> tant que la confirmation n'a pas été prononcée par le code du client.

## Ce que j'ai fait

- **« Envoyé » a maintenant sa propre couleur** (ambre par défaut = en attente),
  distincte du bleu de « Confirmé ». Fini la confusion entre les deux.
- **« Envoyé » s'affiche en contour** (fond transparent, texte coloré), pas en
  pastille pleine : visuellement, il est « en suspens », pas acté. « Confirmé »,
  lui, reste plein — c'est un état acquis.
- La couleur d'« Envoyé » est **réglable** comme les autres, dans les apparences
  (« Envoyé (en attente) ») — tu peux la changer à ta main.

## Une nuance que je te soumets

Ta remarque dit « Confirmé atténué tant que le client n'a pas validé ». Dans
l'app, l'état « Confirmé » signifie déjà que le client a validé — c'est
« Envoyé » qui est le moment d'attente. J'ai donc atténué « Envoyé » (en
attente), et gardé « Confirmé » plein (acté). Si tu voulais dire autre chose par
« le code du client » (un mécanisme de validation à part), dis-le-moi et
j'ajuste.

## Éprouvé par sabotage

| Sabotage | Rouges |
|---|---|
| « Envoyé » repointe vers la couleur de « Confirmé » | 1 |

## À vérifier à l'œil

Dans la liste des dossiers : un dossier « Envoyé » apparaît en ambre, en contour ;
un « Confirmé » en bleu plein. Les deux ne se confondent plus.
