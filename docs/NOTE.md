# Vague 1, lot D — relances, mention légale, préfixe

**30/08/2026.** **1228 tests verts**, build vert. **Migration 0163** appliquée et
vérifiée. **La vague 1 — fermer la boucle de l'argent — est complète.**

## Trois branchements

### 1. La mention légale s'imprime enfin
Ta mention légale (intérêts de retard, réserve de propriété…) saisie dans les
réglages s'imprime maintenant sur le PDF de facture, juste au-dessus du pied.
Sans elle, pas de recouvrement des intérêts de retard. Le canal existe — reste à
saisir le texte (il est vide aujourd'hui).

### 2. Le préfixe de numérotation est branché
Ton préfixe (« GG ») se prépend au numéro à l'émission : « GG2026-000018 ». Il
n'affecte PAS la communication structurée (l'OGM reste calculée sur
année+séquence), donc le rapprochement bancaire continue de marcher.

**⚠️ Point important — à valider avec ton comptable.** Le préfixe ne touche
jamais tes 17 factures déjà émises (immuabilité). Mais l'appliquer maintenant, en
cours d'année, donnerait une série mélangée : « 2026-000017 » puis
« GG2026-000018 ». Un contrôleur pourrait s'en étonner. Le plus propre est de
poser un préfixe **au début d'un exercice** ou comme **nouvelle série assumée**.
Comme ton préfixe est vide aujourd'hui, rien ne bouge tant que tu ne le mets pas —
le canal est prêt, la décision t'appartient.

### 3. La liste des relances
Dans la Comptabilité, une section « À relancer » : les factures **échues et non
soldées**, triées de la plus en retard à la moins en retard, avec le solde dû et
un total. Elle n'apparaît que s'il y a des retards.

**On signale, on n'envoie rien.** C'est une liste de travail pour décider quand
et comment relancer — jamais un automate qui écrirait à tes clients dans ton dos.

## Éprouvé par sabotage

| Sabotage | Rouges |
|---|---|
| relancer aussi les factures payées | 1 |
| relancer aussi les non échues | 1 |

## La vague 1 est bouclée

- **A** — échéance de paiement ✅
- **B** — communication stockée ✅
- **C** — rapprochement des virements ✅
- **D** — relances + mention légale + préfixe ✅

Tes factures ont maintenant une échéance, une communication rapprochable, un
suivi des retards, un canal de mention légale et un préfixe de série. La boucle
de l'argent est fermée : de l'émission au suivi de l'encaissement.

## À vérifier à l'œil

1. Saisis une mention légale dans les réglages → elle apparaît sur le PDF.
2. La Comptabilité montre « À relancer » si des factures sont échues et impayées.
3. (Optionnel, avec précaution) un préfixe donne « GG2026-… » sur la PROCHAINE
   facture émise — les anciennes ne bougent pas.

## Suite proposée

La vague 1 étant close, la suite naturelle est la **vague 2 (encaisser les
fournitures)** : d'abord le lot E (TVA sur les articles, mission nullable), qui
débloque la vente de cartons. Ou, si tu préfères du visible, R4 (matériel par
véhicule). Je te laisse le choix — à défaut, je pars sur la vague 2.
