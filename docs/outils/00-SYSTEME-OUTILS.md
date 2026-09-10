# 00 — LE DOSSIER OUTILS

Des consignes autonomes, à donner à une session ou à un sous-agent pour une
tâche **bornée**. Chaque outil produit un livrable précis et sait quand
s'arrêter.

Pourquoi ils existent : une session longue dérive. Elle accumule du contexte,
perd la hiérarchie des sources et se met à supposer. Un outil borné lit ce
qu'il doit lire, produit une chose, et rend la main.

## Les outils

| fichier | mission | livrable |
|---|---|---|
| `10-AUDIT-ECRAN.md` | juger UN écran depuis l'usage réel | fiche d'audit + verdict d'état |
| `20-COHERENCE-PARAMETRES.md` | vérifier qu'un écran ou un PDF ne code aucune configuration en dur | liste des manques + entrées de réglage à créer |
| `30-VERIF-BASE.md` | savoir ce qui existe déjà avant de construire | inventaire de l'existant + verdict construire/réutiliser |
| `40-LOT-CODE.md` | exécuter un lot de code de bout en bout | fichiers + migrations + tests + zip |

## Le préambule commun

**À placer en tête de chaque outil, sans exception.** C'est ce qui empêche un
sous-agent de reproduire les erreurs déjà payées.

---

### PRÉAMBULE — Dashprod

Tu travailles sur Dashprod, un ERP vertical pour déménageurs belges. Un seul
développeur, un seul propriétaire. Objectif long terme : zéro dette.

**La hiérarchie des sources, dans cet ordre.** Quand deux sources se
contredisent, la première a raison :

1. **la base de données** — c'est elle qui refuse ou accepte, via RLS ;
2. **le dépôt** — le code appliqué ;
3. **`docs/maitre/`** — les décisions arrêtées ;
4. **`docs/roadmap/`** — les intentions. Une intention n'est pas un fait.

**Les six règles de discipline, tirées d'incidents réels.**

1. **Vérifier avant de construire.** Trois fois sur trois, l'infrastructure
   était déjà là et le défaut se trouvait ailleurs qu'annoncé.
2. **Éprouver avant de livrer.** Une politique qui se crée sans erreur n'est
   pas une politique qui fonctionne. Saboter, puis constater le refus.
3. **Prouver avant d'étendre.** Un tiers qui marche et qui se vend vaut mieux
   que trois bancals.
4. **Regarder par les deux bouts.** Certains bugs se dissolvent en changeant
   le modèle plutôt qu'en corrigeant le code.
5. **Signaler ce qu'on n'a pas prouvé.** Une limite énoncée vaut mieux qu'une
   confiance fabriquée.
6. **Une seule saisie.** Toute donnée écrite à deux endroits finira par
   diverger. La vigilance n'y change rien : il faut supprimer la seconde
   saisie.

**Trois pièges spécifiques à cette base.**

- `do $$ ... raise exception 'ROLLBACK' $$` **n'annule pas** via le connecteur
  Supabase : une rétrogradation de test a été committée en production. Aucun
  test mutant sur la production par ce canal. Les tests doivent être purs, en
  lecture seule, ou sur table neuve et vide.
- Les politiques RLS ne se vérifient pas par requête d'administration : le
  rôle de service contourne RLS et `auth.uid()` y est nul. Seul un vrai jeton
  sur une vraie organisation prouve un verrou.
- Une contrainte `check` qui rend `NULL` **passe**. `array_length('{}', 1)`
  rend `NULL` : il faut `coalesce(array_length(x, 1), 0)`.

**Le style attendu.** Français. Commentaires qui expliquent POURQUOI, avec
l'incident quand il y en a un — pas ce que le code fait, ça se lit. Pas de
fichier de notes annexe : ce qui doit être su va dans le commentaire ou dans
`docs/maitre/10-DECISIONS-PRODUIT.md`.

**Ce que tu ne fais pas.** Tu ne renvoies pas une décision technique au
propriétaire quand elle peut être tranchée sur les faits. Tu ne demandes un
arbitrage que si une information légale manque réellement, si une action
externe est requise, ou si deux décisions métier se contredisent vraiment.

---

## La règle d'usage

Un outil = une tâche = un livrable. Si la tâche demande deux livrables, elle
demande deux passages. Un sous-agent qui produit trois choses à moitié coûte
plus cher que trois sous-agents qui en produisent une chacun.
