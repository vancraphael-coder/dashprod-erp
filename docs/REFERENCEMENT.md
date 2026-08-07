# Référencement Google — ce qui est fait, ce qui reste

Domaine : **dashprod.com**

## Fait (dans le code)
- Titre et description propres dans `apps/web/index.html`.
- Balises de partage (og:) → joli aperçu quand on colle le lien.
- `apps/web/public/robots.txt` : vitrine + pages légales indexables,
  application (societe/client/connexion) exclue.
- `apps/web/public/sitemap.xml` : les 4 pages publiques.

## Ce que tu dois faire, DANS L'ORDRE

1. **Déployer d'abord.** Rien n'est indexable tant que dashprod.com ne
   répond pas. (Voir MISE-EN-PROD.md.)

2. **Google Search Console** (https://search.google.com/search-console)
   - Ajouter la propriété `dashprod.com`.
   - Vérifier (Google donne un enregistrement DNS TXT à poser chez ton
     registrar — le même endroit que les DNS Vercel).
   - Soumettre le sitemap : `https://dashprod.com/sitemap.xml`.
   - « Inspection de l'URL » sur l'accueil → Demander l'indexation.

3. **Patienter.** Quelques jours à quelques semaines. Rien ne l'accélère.

## La limite à garder en tête
Dashprod est une app React (rendu navigateur). Titre et description seront
lus, mais le CONTENU de la vitrine est construit en JavaScript et Google
l'indexe mal. Un vrai référencement de contenu demanderait une vitrine
rendue côté serveur — chantier V2, pas lancement. Pour un pilote fermé, pas
bloquant.

## Facultatif, plus tard
- Image de partage `public/partage.png` (1200×630) + décommenter la balise
  og:image déjà préparée dans index.html.
