// =============================================================================
// Pages légales publiques — CGU, confidentialité, mentions.
//
// ⚠️ IDENTITÉ DE L'ÉDITEUR À COMPLÉTER. La raison sociale, le numéro BCE, le
// siège et le contact du délégué ne sont pas encore arrêtés (voir docs/TODO :
// « avocat belge, relecture CGV/DPA »). Inventer ces mentions serait faux, et
// juridiquement pire qu'une absence. Elles sont donc balisées {{À COMPLÉTER}}
// et ressortent visuellement, pour qu'aucune ne parte en production oubliée.
//
// Ce contenu est une base honnête, pas un avis juridique. Il doit passer sous
// les yeux d'un avocat belge avant la commercialisation. Il suffit néanmoins
// au pilote fermé (Roovers + invités), où l'éditeur connaît personnellement
// chaque société.
// =============================================================================

import React from "react";
import { V, DISPLAY, CORPS, Logo, PiedPublic } from "./theme-vitrine.jsx";

// À remplacer partout avant l'ouverture commerciale. Un seul endroit à éditer.
const EDITEUR = {
  raisonSociale: "{{À COMPLÉTER — raison sociale de l'éditeur}}",
  formeJuridique: "{{SRL / SA / …}}",
  bce: "{{BE 0XXX.XXX.XXX}}",
  siege: "{{adresse du siège social}}",
  emailContact: "{{contact@dashprod.be}}",
  emailDpo: "{{privacy@dashprod.be}}",
  hebergeur: "Supabase (bases de données) et Vercel (application), infrastructures situées dans l'Union européenne",
};

const MAJ = "7 août 2026";

function Marqueur({ children }) {
  return (
    <mark style={{ background: "#FEF3C7", color: "#92400E", padding: "1px 5px",
                   borderRadius: 4, fontWeight: 600, fontSize: "0.95em" }}>
      {children}
    </mark>
  );
}

function estAComenter(v) { return typeof v === "string" && v.includes("{{"); }
function Champ({ children }) {
  return estAComenter(children) ? <Marqueur>{children}</Marqueur> : <>{children}</>;
}

const styles = {
  page: { minHeight: "100vh", background: "#fff", color: V.encre,
          fontFamily: CORPS, display: "flex", flexDirection: "column" },
  wrap: { maxWidth: 760, margin: "0 auto", padding: "clamp(20px,4vw,40px) 20px 60px",
          width: "100%", boxSizing: "border-box" },
  h1: { fontFamily: DISPLAY, fontSize: "clamp(26px,4vw,36px)", margin: "18px 0 4px",
        fontWeight: 800, letterSpacing: "-.02em" },
  maj: { fontSize: 12.5, color: V.muet, marginBottom: 28 },
  h2: { fontFamily: DISPLAY, fontSize: 19, fontWeight: 800, margin: "30px 0 8px" },
  p: { fontSize: 14.5, lineHeight: 1.68, color: "#26344B", margin: "0 0 12px" },
  li: { fontSize: 14.5, lineHeight: 1.6, color: "#26344B", margin: "0 0 6px" },
  retour: { background: "none", border: "none", cursor: "pointer", color: V.route,
            fontSize: 13.5, fontWeight: 600, padding: 0 },
};

function Coquille({ titre, aller, children }) {
  return (
    <div style={styles.page}>
      <div style={styles.wrap}>
        <div style={{ display: "flex", justifyContent: "space-between",
                      alignItems: "center", marginBottom: 8 }}>
          <button style={styles.retour} onClick={() => aller("accueil")}>← Accueil</button>
          <Logo taille={24} />
        </div>
        <h1 style={styles.h1}>{titre}</h1>
        <div style={styles.maj}>Dernière mise à jour : {MAJ}</div>
        {children}
      </div>
      <PiedPublic aller={aller} />
    </div>
  );
}

// -----------------------------------------------------------------------------
// Mentions légales
// -----------------------------------------------------------------------------
export function MentionsLegales({ aller }) {
  return (
    <Coquille titre="Mentions légales" aller={aller}>
      <p style={styles.p}>
        Le présent site et l'application Dashprod sont édités par{" "}
        <Champ>{EDITEUR.raisonSociale}</Champ> (<Champ>{EDITEUR.formeJuridique}</Champ>),
        immatriculée à la Banque-Carrefour des Entreprises sous le numéro{" "}
        <Champ>{EDITEUR.bce}</Champ>, dont le siège est situé{" "}
        <Champ>{EDITEUR.siege}</Champ>.
      </p>
      <h2 style={styles.h2}>Contact</h2>
      <p style={styles.p}>
        Pour toute question : <Champ>{EDITEUR.emailContact}</Champ>.
      </p>
      <h2 style={styles.h2}>Hébergement</h2>
      <p style={styles.p}>
        L'application et les données sont hébergées par {EDITEUR.hebergeur}.
      </p>
      <p style={{ ...styles.p, fontSize: 12.5, color: V.muet, marginTop: 30 }}>
        Les éléments signalés en surbrillance restent à compléter avant
        l'ouverture commerciale.
      </p>
    </Coquille>
  );
}

// -----------------------------------------------------------------------------
// Conditions générales d'utilisation
// -----------------------------------------------------------------------------
export function CGU({ aller }) {
  return (
    <Coquille titre="Conditions générales d'utilisation" aller={aller}>
      <p style={styles.p}>
        Ces conditions régissent l'accès et l'usage de Dashprod, logiciel de
        gestion destiné aux entreprises de déménagement et de transport, et à
        leurs clients particuliers. En créant un compte ou en utilisant le
        service, vous les acceptez.
      </p>

      <h2 style={styles.h2}>1. Objet</h2>
      <p style={styles.p}>
        Dashprod fournit un outil de gestion des devis, du planning, des
        chantiers, de la facturation et du suivi client. L'éditeur fournit
        l'outil ; il n'intervient pas dans l'exécution des déménagements, qui
        relève de la seule responsabilité de l'entreprise cliente.
      </p>

      <h2 style={styles.h2}>2. Accès sur invitation</h2>
      <p style={styles.p}>
        Durant la phase de lancement, la création d'une société est réservée aux
        entreprises disposant d'un code d'invitation. L'éditeur peut suspendre ou
        clôturer un accès en cas d'usage contraire aux présentes conditions.
      </p>

      <h2 style={styles.h2}>3. Séparation des données entre entreprises</h2>
      <p style={styles.p}>
        Chaque entreprise dispose d'un espace strictement cloisonné. Les données
        d'une société ne sont jamais accessibles à une autre. L'espace des
        clients particuliers est lui-même séparé de celui des entreprises.
      </p>

      <h2 style={styles.h2}>4. Responsabilités de l'utilisateur</h2>
      <ul style={{ paddingLeft: 20, margin: "0 0 12px" }}>
        <li style={styles.li}>Fournir des informations exactes lors de l'inscription.</li>
        <li style={styles.li}>Préserver la confidentialité de ses accès.</li>
        <li style={styles.li}>Respecter ses propres obligations légales et fiscales
          (facturation, TVA, droit du travail, assurances).</li>
        <li style={styles.li}>N'utiliser le service que dans le cadre d'une activité
          professionnelle licite.</li>
      </ul>

      <h2 style={styles.h2}>5. Disponibilité</h2>
      <p style={styles.p}>
        L'éditeur met en œuvre les moyens raisonnables pour assurer la
        disponibilité du service, sans pouvoir la garantir sans interruption.
        Des maintenances peuvent être programmées.
      </p>

      <h2 style={styles.h2}>6. Limitation de responsabilité</h2>
      <p style={styles.p}>
        Dans les limites permises par le droit belge, la responsabilité de
        l'éditeur ne saurait être engagée pour les conséquences d'une mauvaise
        utilisation du service, d'une erreur de saisie, ou d'un préjudice
        indirect. Les données saisies restent la propriété et la responsabilité
        de l'entreprise cliente. <Marqueur>Clause à valider par un avocat belge
        avant l'ouverture commerciale.</Marqueur>
      </p>

      <h2 style={styles.h2}>7. Droit applicable</h2>
      <p style={styles.p}>
        Les présentes conditions sont régies par le droit belge. Tout litige
        relève des juridictions compétentes du siège de l'éditeur.
      </p>
    </Coquille>
  );
}

// -----------------------------------------------------------------------------
// Politique de confidentialité
// -----------------------------------------------------------------------------
export function Confidentialite({ aller }) {
  return (
    <Coquille titre="Politique de confidentialité" aller={aller}>
      <p style={styles.p}>
        Cette politique explique quelles données personnelles Dashprod traite,
        pourquoi, et quels sont vos droits, conformément au Règlement général sur
        la protection des données (RGPD).
      </p>

      <h2 style={styles.h2}>Responsable du traitement</h2>
      <p style={styles.p}>
        Pour les données du site et des comptes éditeur :{" "}
        <Champ>{EDITEUR.raisonSociale}</Champ>, contact{" "}
        <Champ>{EDITEUR.emailDpo}</Champ>.
      </p>
      <p style={styles.p}>
        Pour les données saisies dans un espace entreprise (clients, chantiers,
        salariés), l'entreprise utilisatrice est responsable du traitement et
        l'éditeur agit comme sous-traitant, au sens du RGPD. Un accord de
        sous-traitance (DPA) encadre cette relation.
      </p>

      <h2 style={styles.h2}>Données traitées</h2>
      <ul style={{ paddingLeft: 20, margin: "0 0 12px" }}>
        <li style={styles.li}>Identité et contact (nom, e-mail, téléphone).</li>
        <li style={styles.li}>Données de déménagement (adresses, inventaire, dates).</li>
        <li style={styles.li}>Données de facturation.</li>
        <li style={styles.li}>Pour les salariés : heures pointées et éléments de paie.</li>
      </ul>

      <h2 style={styles.h2}>Finalités et base légale</h2>
      <p style={styles.p}>
        Les données servent à fournir le service (exécution du contrat), à
        respecter des obligations légales (conservation comptable), et à assurer
        la sécurité du service (intérêt légitime).
      </p>

      <h2 style={styles.h2}>Durées de conservation</h2>
      <p style={styles.p}>
        Les données opérationnelles (inventaire, adresses de chantier) sont
        purgées après le délai de conservation opérationnelle. Les documents à
        valeur comptable sont conservés pendant le délai légal belge, puis
        supprimés. L'application intègre un outil de purge assisté à cet effet.
      </p>

      <h2 style={styles.h2}>Sous-traitants</h2>
      <p style={styles.p}>
        Dashprod recourt à des sous-traitants techniques (hébergement, envoi
        d'e-mails) situés dans l'Union européenne. La liste à jour est
        consultable sur demande à <Champ>{EDITEUR.emailDpo}</Champ>.
      </p>

      <h2 style={styles.h2}>Vos droits</h2>
      <p style={styles.p}>
        Vous disposez d'un droit d'accès, de rectification, d'effacement, de
        limitation et de portabilité. Pour l'exercer, écrivez à{" "}
        <Champ>{EDITEUR.emailDpo}</Champ>. Si vos données sont détenues dans
        l'espace d'une entreprise cliente, cette demande est transmise à
        l'entreprise responsable. Vous pouvez aussi introduire une réclamation
        auprès de l'Autorité de protection des données (Belgique).
      </p>

      <h2 style={styles.h2}>Sécurité</h2>
      <p style={styles.p}>
        L'accès aux données est cloisonné par société au niveau de la base, les
        échanges sont chiffrés, et les accès internes sont contrôlés par un
        système de rôles et de capacités.
      </p>

      <p style={{ ...styles.p, fontSize: 12.5, color: V.muet, marginTop: 30 }}>
        Les éléments en surbrillance restent à compléter, et ce document doit
        être relu par un conseil juridique avant l'ouverture commerciale.
      </p>
    </Coquille>
  );
}
