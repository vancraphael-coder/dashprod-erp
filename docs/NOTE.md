# R10 (confirmation d'émission) + plan de déploiement PWA

**01/09/2026.** **1253 tests verts**, build vert. Un correctif de sécurité
d'usage, et un plan pour plus tard.

## R10 — Émettre une facture demande maintenant confirmation

Émettre une facture est **irréversible** : elle reçoit un numéro légal et devient
immuable (seul un avoir peut la corriger). Or, jusqu'ici, un simple clic
l'émettait. Désormais, le bouton ouvre une **confirmation** qui rappelle le
montant et l'enjeu :

> « Émettre cette facture pour X € TVAC ? Elle reçoit un numéro légal, une
> échéance et une communication, et devient IMMUABLE. »

C'est exactement ce que demandait ta remarque R10 (« figé par émettre la facture
→ avec confirmation, êtes-vous sûr ? oui/non »). La clôture de dossier avait déjà
sa confirmation ; l'émission de facture l'a enfin aussi.

**Le reste de R10** (la facture d'un devis tarifaire ne se met à jour qu'avec le
calcul définitif, celle d'un forfait suit l'estimation) touche la logique de
mise à jour scénario → facture ; elle croise ta remarque R11 (l'estimation en
temps). Je la garde pour un lot dédié, pour la traiter proprement.

## Plan PWA — prévu, positionné après les travaux

Comme demandé, j'ai écrit le plan de déploiement PWA dans la roadmap
(70-ROADMAP), placé **après** les travaux prévus — car une PWA met en cache la
coquille de l'app, et on ne fige pas une coquille qui bouge encore.

En résumé :
- **Ce qui est déjà là** : HTTPS (Vercel), interface mobile, theme-color, icône
  Apple. **Ce qui manque** : manifest, icônes multi-tailles, service worker.
- **P1 — installable** : manifest + icônes + service worker (Vite/Workbox). Règle
  de sécurité non négociable : **réseau d'abord, jamais de cache pour les données
  Supabase** (fraîcheur + isolation des organisations).
- **P2 — hors-ligne par degrés** : lecture des derniers dossiers d'abord, puis
  une file différée pour les gestes terrain (pointage, constats, photos).
  **L'émission de facture reste en ligne** — la numérotation légale ne se
  bricole pas côté client.
- **P3 — stores** : PWA web d'abord (« ajouter à l'écran »), puis Google Play via
  TWA si tu veux une présence boutique ; App Store natif seulement si un vrai
  besoin apparaît.

C'est un plan, pas du code : rien n'est déployé, tout est prêt à l'être le moment
venu.

## À vérifier à l'œil

Sur une facture prête : clique « Émettre » → une confirmation apparaît avec le
montant. Annuler ne fait rien ; confirmer émet. Les anciennes factures et le reste
sont inchangés.

## Suite proposée

Il reste des remarques (R11 estimation en temps, R13/R14 onglets liste, R15
centres dans l'équipe, R4 matériel par véhicule) et les vagues de fond (V3 compta
— bloquée par la question engagement/trésorerie à poser au comptable, V4
garde-meubles). Dis-moi le cap, ou je continue dans l'ordre le plus utile.
