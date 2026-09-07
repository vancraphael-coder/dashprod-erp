# A3 en base + capteurs KPI + fix messagerie

**01/09/2026.** **1314 tests verts**, build vert. Migrations 0169 + 0170.

## 1. A3 branché : tes contrats produisent enfin de l'argent

Deux commandes en base :
- **Générer les échéances** d'un contrat (ou de tous) : chaque période commencée
  devient une échéance, au prorata si elle est partielle. **Un index d'unicité
  en base** garantit qu'on ne crée jamais deux fois la même période — c'est un
  rempart réel, pas un contrôle applicatif contournable. Un contrat sans tarif ne
  génère rien.
- **Facturer les échéances** : elles deviennent UNE facture, non émise, avec un
  libellé daté (« Location Box A12 — du 15/01 au 15/02 ») pour que le client
  puisse rapprocher. L'émission passe ensuite par le circuit habituel : numéro,
  échéance de paiement, communication.

Cohérent avec le verrou de la semaine : impossible de créer une facture vide.

## 2. Les capteurs KPI, posés AVANT le tableau de bord

Tu as raison de vouloir éviter la dette : un indicateur branché après coup oblige
à retrouver une donnée souvent perdue. J'ai donc déclaré **plus de 20 capteurs**
— argent, activité, terrain, conformité, **réseau** — chacun avec son unité, son
sens (une hausse est-elle bonne ?), sa **source réelle** et les secteurs
concernés.

Deux conséquences immédiates :
- **Le dashboard par secteur est déjà cadré** : un garde-meubles verra taux
  d'occupation et revenu récurrent, jamais « heures réelles vs estimées » qu'il
  n'a pas.
- **Les branchements futurs sont déclarés** : chaque capteur dit s'il s'expose à
  une **API de conformité** et/ou au **pilotage MCP**. Un agent pourra lire le
  catalogue des mesures sans qu'on lui écrive un adaptateur sur mesure. Les
  capteurs **réseau** existent déjà, prêts à être alimentés le jour où il ouvre.

C'est exactement la dette de structure que tu voulais éviter.

## 3. Le bug d'affichage des messages

Trouvé : en pleine hauteur, la liste passait en hauteur libre et débordement
visible — elle **poussait la page** au lieu de défiler dans son cadre. Corrigé,
avec deux détails qui comptent : `minHeight:0` (sans quoi un enfant flex refuse
de défiler) et un retour à la ligne forcé pour qu'**un lien ou un mot long
n'élargisse plus la bulle**.

**Le test que tu demandes est posé** — et il protégera aussi le futur espace
« équipe » : toute nouvelle surface de discussion devra tenir les mêmes règles.
Sabotage vérifié.

## Ce qui reste de ta liste (je ne l'oublie pas)

1. **Cartes des offres harmonisées** avec celles du déménagement (même type,
   même structure de texte).
2. **Prix et parrainage** — refonte selon ta doctrine du casino (voir ma réponse
   en message).
3. **Interface PC** à consolider.
4. **Test « indépendant manutention »** avec Roovers donneur d'ordre pilote.
5. **Espace équipe** (messagerie interne, invité = code, permissions du donneur
   d'ordre).

Je les prends dans cet ordre aux prochains tours, sauf indication contraire.
