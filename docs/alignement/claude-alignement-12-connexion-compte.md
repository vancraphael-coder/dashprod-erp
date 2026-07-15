# Page 12 — Connexion / Compte / Accueil

Référence modèle : `appMode launch` (choix Bureau/Terrain), pas d'auth réelle.
Dashprod : `Connexion.jsx`, `NonInvite.jsx`, `Compte` (main.jsx).

## État : Dashprod est SUPÉRIEUR — peu à faire

### 1. Connexion
- **Modèle** : aucun compte ; écran launch avec deux tuiles Bureau/Terrain ;
  terrain = choisir son nom dans une liste. Zéro sécurité (assumé prototype).
- **Dashprod** : ✅ OAuth Google sur invitation + email/mdp + refus propre des
  non-invités + hook JWT + RLS. RIEN à copier du modèle. RAS.

### 2. Accueil / launcher
- **Modèle** : page d'accueil avec deux gros boutons.
- **Dashprod** : le routage par CAPACITÉS remplace le choix manuel : un
  terrain n'a pas à « choisir » — il ne peut voir QUE le terrain. La direction
  voit tout. → pas de launcher ; **P2** : un utilisateur mixte (direction qui
  part en chantier) pourrait vouloir un toggle « vue terrain » — plus tard.

### 3. Compte
- **Dashprod** : ✅ identité, capacités, déconnexion, diagnostic.
- **À ajouter (P1)** : les **Réglages organisation** (IBAN, adresse, tél,
  email, BCE) nécessaires aux rendus offre/facture/mail — réservés à
  `gerer_referentiels`. C'est le seul vrai manque de cette page.

## Récap priorités page 12
| Élément | Priorité |
|---|---|
| Réglages organisation (IBAN, adresse, tél, mail) | **P1 (P0 de fait pour pages 05/08)** |
| Toggle « vue terrain » pour la direction | P2 |
| Tout le reste | ✅ RAS |
