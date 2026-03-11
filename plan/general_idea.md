# AI Novel Architect, backlog v2 structuré

## 1. Positionnement produit

AI Novel Architect est un environnement de rédaction et d’édition narrative assisté par IA, conçu pour les auteurs de fiction longue. Le produit ne doit pas agir comme un générateur opaque de texte, mais comme un système d’analyse, de diagnostic, de proposition de corrections et de pilotage du canon narratif.

Le cœur du produit repose sur quatre principes.

1. La vérité du projet doit rester déterministe.
2. L’IA doit interpréter, diagnostiquer et proposer, mais ne pas imposer silencieusement de vérité.
3. Toute évolution sémantique importante doit passer par un mécanisme de delta proposé, vérifié et approuvé.
4. Chaque vue métier doit être lisible chapitre par chapitre, scène par scène, point de vue par point de vue.

## 2. Principes d’architecture produit

### 2.1. Modèle canonique

Le projet doit être représenté comme un graphe narratif temporel.

Les nœuds principaux sont :

* projet
* manuscrit
* actes
* chapitres
* scènes
* personnages
* lieux
* objets
* factions
* éléments de lore
* événements de timeline
* promesses narratives
* payoffs
* croyances
* connaissances
* relations
* contraintes de style
* issues éditoriales

Les arêtes sont typées et historisées. Elles doivent pouvoir porter des états, des dates de validité, des niveaux d’intensité, des sources d’évidence et des statuts d’approbation.

### 2.2. État narratif par chapitre

Pour chaque entité suivie, le système doit exposer cinq couches.

* état de début de chapitre
* évidence détectée dans le chapitre
* delta proposé
* delta validé
* état de fin de chapitre

Cette logique s’applique à tous les objets suivis : personnages, relations, lieux, objets, lore, connaissances, croyances, timeline, sous-intrigues, promesses, statuts narratifs.

### 2.3. Règle de gouvernance IA

L’IA peut produire des propositions structurées. Elle ne peut jamais muter directement le canon officiel. Le canon n’évolue qu’après validation explicite du delta.

### 2.4. Séparation des responsabilités

Les user stories ne doivent pas être assimilées à des workers IA unitaires. L’orchestration doit reposer sur des assistants spécialisés par responsabilité sémantique.

## 3. Glossaire métier

### Canon

L’ensemble des faits validés et considérés comme vérité interne du projet.

### Delta narratif

Une proposition de changement d’état détectée ou inférée à partir d’un chapitre ou d’une scène.

### Évidence

Le ou les extraits textuels, annotations ou éléments du bible qui motivent une proposition.

### Connaissance

Ce qu’un personnage sait factuellement à un point donné de l’histoire.

### Croyance

Ce qu’un personnage pense vrai, y compris si c’est faux.

### Fuite de point de vue

Moment où la narration révèle une information indisponible pour le point de vue actif.

### Statut narratif

État d’un élément du monde à un instant donné, par exemple ouvert, détruit, inaccessible, secret révélé, relation rompue.

## 4. Catégories de backlog

Le backlog est structuré en six familles.

1. DOMAIN, cœur métier et modèle narratif
2. UI, composants et écrans
3. UX, parcours, lisibilité, interaction et sécurité d’usage
4. AI, assistants spécialisés et orchestration
5. SYS, plateforme, import, export, offline, persistance, observabilité
6. GOV, règles de confiance, audit, validation, conformité fonctionnelle

---

# 5. DOMAIN USER STORIES

## Epic D1. Projet et métadonnées

### D-US-01

En tant qu’auteur, je peux créer un projet à partir d’une idée libre, d’un template, d’un outline structuré ou d’un import, afin d’initialiser rapidement un environnement de travail cohérent.

**Notes produit**

* Le mode de création doit produire le même modèle interne final.
* Les données minimales du projet sont le titre provisoire, la langue principale et le type de structure choisi.
* Le système ne doit jamais créer de faux contenus pour remplir les sections vides.

### D-US-02

En tant qu’auteur, je peux définir les métadonnées du projet, notamment titre, genre, audience, tonalité, cible de longueur, statut éditorial et objectifs, afin de cadrer les diagnostics et les suggestions.

**Notes produit**

* Les métadonnées influencent les rubriques de scoring, les seuils de lisibilité et les suggestions IA.
* Les métadonnées doivent être historisées si elles changent en cours de projet.

### D-US-03

En tant qu’auteur, je peux configurer une langue globale et une langue par projet, afin d’isoler les règles linguistiques, les prompts et les diagnostics associés.

**Notes produit**

* La langue du manuscrit et la langue de l’interface sont deux paramètres distincts.
* Les suggestions linguistiques doivent toujours respecter la langue du projet ciblé.

## Epic D2. Bible et graphe narratif

### D-US-04

En tant qu’auteur, je peux construire une bible de projet comprenant prémisse, thèmes, enjeux, règles du monde, contraintes de narration et conventions de style, afin d’établir le cadre canonique initial.

### D-US-05

En tant qu’auteur, je peux créer et maintenir des fiches de personnages avec identité, motivations, arc, voix, objectifs, blessures, contradictions internes et relations, afin de centraliser la matière narrative vivante.

### D-US-06

En tant qu’auteur, je peux créer et maintenir des fiches de lieux, d’objets, de factions, d’éléments de lore et d’événements de timeline, afin de structurer le monde narratif au-delà du texte du manuscrit.

### D-US-07

En tant qu’auteur, je peux gérer un graphe de relations typées entre personnages, lieux, objets, factions, lore et événements, afin de modéliser les interactions et dépendances du récit.

**Notes produit**

* Une relation doit avoir au minimum un type, une source, un statut, une portée temporelle et une intensité optionnelle.
* Une relation peut être factuelle, sociale, causale, spatiale, symbolique, politique, historique ou narrative.

### D-US-08

En tant qu’auteur, je peux visualiser l’évolution d’une entité ou d’une relation à l’échelle de l’histoire, du chapitre ou de la scène, afin de comprendre sa trajectoire narrative complète.

## Epic D3. Structure narrative

### D-US-09

En tant qu’auteur, je peux structurer le manuscrit en actes, chapitres et scènes avec réordonnancement, afin de piloter l’architecture du récit.

### D-US-10

En tant qu’auteur, je peux définir pour chaque chapitre et chaque scène un objectif, un conflit, un point de bascule, un hook, un statut et une cible de rythme, afin d’évaluer leur fonction dramatique.

### D-US-11

En tant qu’auteur, je peux suivre les promesses narratives, indices, setups, payoffs et questions ouvertes, afin de prévenir les fils oubliés ou mal résolus.

### D-US-12

En tant qu’auteur, je peux suivre les sous-intrigues avec leurs moments d’introduction, montée, ralentissement et résolution, afin de contrôler leur répartition dans le récit.

## Epic D4. États chapitre par chapitre

### D-US-13

En tant qu’auteur, je peux inspecter, pour toute entité suivie, son état de début de chapitre, afin de voir exactement ce qui est considéré comme acquis au moment où le chapitre commence.

### D-US-14

En tant qu’auteur, je peux voir les évidences textuelles détectées dans le chapitre courant, afin de comprendre quels passages motivent les changements proposés.

### D-US-15

En tant qu’auteur, je peux consulter les deltas proposés pour le chapitre courant, afin de comprendre ce que le système estime modifié par ce chapitre.

### D-US-16

En tant qu’auteur, je peux voir l’état de fin de chapitre prévisionnel après application des deltas validables, afin de mesurer immédiatement l’impact du chapitre sur le système narratif.

### D-US-17

En tant qu’auteur, je peux approuver, modifier ou rejeter chaque delta, afin de garder le contrôle sur l’évolution du canon.

### D-US-18

En tant qu’auteur, je peux distinguer les changements explicitement énoncés dans le texte, les inférences fortes, les inférences faibles, les conflits et les changements sans preuve suffisante, afin d’évaluer la fiabilité de chaque proposition.

### D-US-19

En tant qu’auteur, je peux visualiser l’évolution chapitre par chapitre d’une connaissance, d’une croyance, d’un objet, d’une relation ou d’un statut narratif, afin de suivre la progression réelle du récit sans relire tout le manuscrit.

## Epic D5. Point de vue et connaissance

### D-US-20

En tant qu’auteur, je peux définir le point de vue narratif actif pour chaque scène, afin de contextualiser les audits de connaissance et les diagnostics de voix.

### D-US-21

En tant qu’auteur, je peux suivre ce que chaque personnage sait, ignore, croit, suspecte ou interprète mal à chaque point du récit, afin de maîtriser les mystères, l’ironie dramatique et l’unreliable narration.

### D-US-22

En tant qu’auteur, je peux comparer la vérité canonique et l’état mental d’un personnage à un instant donné, afin de détecter les écarts utiles ou problématiques.

### D-US-23

En tant qu’auteur, je peux suivre les inventaires, blessures, secrets, accès, interdictions et autres états portés par les personnages ou les lieux, afin de sécuriser la continuité factuelle du récit.

### D-US-24

En tant qu’auteur, je peux gérer le statut narratif de chaque lieu, objet ou ressource au fil du récit, afin de refléter les changements matériels du monde.

---

# 6. UI USER STORIES

## Epic UI1. Workspace projet

### UI-US-01

En tant qu’auteur, je peux accéder à un tableau de bord projet présentant la structure du manuscrit, les états récents, les problèmes ouverts et les prochains points de travail, afin d’entrer immédiatement dans le bon contexte.

### UI-US-02

En tant qu’auteur, je peux passer rapidement d’un projet à un autre sans perdre mon contexte de lecture ou de travail, afin de gérer plusieurs manuscrits avec fluidité.

### UI-US-03

En tant qu’auteur, je peux dupliquer, archiver, supprimer et restaurer visuellement un projet depuis des interfaces explicites, afin de gérer mon portefeuille de manuscrits sans ambiguïté.

## Epic UI2. Éditeur et navigation

### UI-US-04

En tant qu’auteur, je peux écrire dans un éditeur riche centré sur le chapitre ou la scène, avec navigation latérale contextuelle, afin de rédiger sans perdre la structure globale.

### UI-US-05

En tant qu’auteur, je peux naviguer entre texte, bible, timeline, graphes de relations, issues et diagnostics depuis un même espace de travail, afin d’éviter les ruptures cognitives.

### UI-US-06

En tant qu’auteur, je peux afficher les cartes de scènes et les convertir en scènes réelles du manuscrit, afin de passer facilement du plan à la rédaction.

### UI-US-07

En tant qu’auteur, je peux afficher des panneaux comparatifs avant, pendant et après chapitre pour toute entité suivie, afin de voir l’évolution sans changer d’écran.

### UI-US-08

En tant qu’auteur, je peux ouvrir pour chaque suggestion IA un panneau de diff, d’évidence, de confiance et d’impact, afin d’évaluer visuellement la proposition avant toute approbation.

## Epic UI3. Visualisations analytiques

### UI-US-09

En tant qu’auteur, je peux consulter une matrice chapitres par dimensions, par exemple POV, tension, longueur, objectifs, threads ouverts et risques, afin de repérer rapidement les déséquilibres du récit.

### UI-US-10

En tant qu’auteur, je peux visualiser une carte de présence des personnages, lieux, objets et sous-intrigues par chapitre et par scène, afin de repérer les absences, surcharges ou ruptures.

### UI-US-11

En tant qu’auteur, je peux visualiser une frise des connaissances, croyances et révélations, afin de contrôler la distribution de l’information au lecteur et aux personnages.

### UI-US-12

En tant qu’auteur, je peux visualiser un graphe des relations avec filtre par type, intensité, période et entité, afin d’inspecter le système narratif sans surcharge.

### UI-US-13

En tant qu’auteur, je peux consulter un tableau de santé du manuscrit regroupant continuité, rythme, répétition, threads non résolus et qualité de scène, afin de prioriser mes efforts de révision.

## Epic UI4. Accessibilité et ergonomie visuelle

### UI-US-14

En tant qu’auteur, je peux utiliser un mode sombre et un mode clair cohérents sur toutes les vues, afin de travailler confortablement sur de longues sessions.

### UI-US-15

En tant qu’auteur, je peux utiliser l’application au clavier avec une hiérarchie visuelle compatible avec les lecteurs d’écran, afin de disposer d’une interface accessible.

### UI-US-16

En tant qu’auteur, je peux utiliser l’interface sur desktop et sur mobile sans perte de compréhension des données critiques, afin de consulter le projet dans différents contextes.

**Notes produit**

* La production profonde de texte reste un cas d’usage prioritairement desktop.
* Le mobile doit privilégier consultation, annotation et validation légère.

---

# 7. UX USER STORIES

## Epic UX1. Lisibilité métier

### UX-US-01

En tant qu’auteur, je vois toujours clairement si une information affichée relève du canon validé, d’une proposition IA, d’une inférence ou d’une simple donnée de travail, afin de ne jamais confondre vérité et hypothèse.

### UX-US-02

En tant qu’auteur, je peux comprendre immédiatement pourquoi une alerte, un conflit ou une suggestion existe, grâce à des évidences et des explications lisibles, afin de ne pas subir une boîte noire.

### UX-US-03

En tant qu’auteur, je peux filtrer les diagnostics par niveau de gravité, confiance, domaine narratif et zone du manuscrit, afin de traiter les problèmes dans un ordre utile.

### UX-US-04

En tant qu’auteur, je peux passer d’une vue macro du manuscrit à une vue micro du passage incriminé sans rupture de contexte, afin de réviser avec continuité mentale.

## Epic UX2. Sécurité d’usage

### UX-US-05

En tant qu’auteur, aucune action IA modifiant le texte ou le canon n’est appliquée sans aperçu diff et validation explicite, afin d’éviter toute mutation silencieuse.

### UX-US-06

En tant qu’auteur, je peux verrouiller des sections, des personnages, des règles du monde, des styles ou des champs de bible contre certaines classes d’actions IA, afin de protéger l’intention créative.

### UX-US-07

En tant qu’auteur, je peux annuler toute acceptation de delta ou d’édition IA et revenir à un état antérieur traçable, afin de préserver la réversibilité des décisions.

### UX-US-08

En tant qu’auteur, je ne vois jamais de faux chargements, de suggestions inventées faute de données ou de placeholders trompeurs, afin de pouvoir faire confiance à l’outil.

## Epic UX3. Parcours de révision

### UX-US-09

En tant qu’auteur, je peux lancer un parcours de révision ciblé, par exemple continuité, tension, dialogues, POV, copy edit ou répétitions, afin de travailler une seule dimension à la fois.

### UX-US-10

En tant qu’auteur, je peux sauvegarder et réutiliser des parcours de révision avec paramètres, rubriques et seuils, afin de standardiser mon process éditorial.

### UX-US-11

En tant qu’auteur, je peux comparer côte à côte plusieurs stratégies de révision sur un même passage, afin de choisir la meilleure sans perdre le contrôle.

### UX-US-12

En tant qu’auteur, je peux voir l’impact potentiel d’une suggestion sur les chapitres suivants, les entités liées et les threads narratifs, afin d’éviter les corrections locales qui cassent le reste.

## Epic UX4. Productivité saine

### UX-US-13

En tant qu’auteur, je peux travailler en mode focus, lecture, annotation ou validation selon mon intention du moment, afin de réduire les distractions cognitives.

### UX-US-14

En tant qu’auteur, je peux définir des objectifs de session, de jour, de chapitre ou de révision et voir leur progression, afin de transformer le travail long en trajectoire mesurable.

### UX-US-15

En tant qu’auteur, je peux rechercher et remplacer à l’échelle du manuscrit tout en voyant les impacts sémantiques éventuels sur canon, style ou continuité, afin de ne pas casser le texte par une action de masse naïve.

---

# 8. AI ASSISTANT USER STORIES

## Epic AI1. Orchestration globale

### AI-US-01

En tant qu’auteur, je peux lancer un orchestrateur narratif qui appelle les assistants spécialisés dans un ordre déterministe selon l’objectif demandé, afin d’obtenir un résultat de qualité plutôt qu’un traitement monolithique opaque.

**Notes produit**

* L’orchestrateur ne doit jamais appeler plusieurs assistants sans contrat d’entrée et de sortie structuré.
* Chaque assistant retourne des objets structurés, pas seulement du texte libre.

### AI-US-02

En tant qu’auteur, je peux configurer des politiques d’orchestration par action, projet ou contexte, afin de contrôler le niveau d’analyse, la profondeur et les vérifications requises.

### AI-US-03

En tant qu’auteur, je peux voir quels assistants ont été appelés, dans quel ordre, avec quelles entrées résumées, afin de comprendre le pipeline de décision.

## Epic AI2. Extraction et réconciliation

### AI-US-04

En tant qu’auteur, je peux utiliser un assistant d’extraction canonique qui identifie les faits, entités, relations, statuts, connaissances, croyances et événements contenus dans un chapitre ou une scène, afin de transformer le texte en signal exploitable.

### AI-US-05

En tant qu’auteur, je peux utiliser un assistant de réconciliation qui compare les extractions du chapitre courant avec le canon validé et l’état de début de chapitre, afin de produire des deltas structurés.

### AI-US-06

En tant qu’auteur, je peux utiliser un assistant de classification des deltas qui distingue explicite, inférence forte, inférence faible, conflit et absence de preuve, afin d’évaluer la fiabilité des changements proposés.

## Epic AI3. Continuité et POV

### AI-US-07

En tant qu’auteur, je peux utiliser un assistant d’audit de continuité qui vérifie personnages, timeline, lieux, objets, blessures, secrets, accès, règles du monde et statuts narratifs, afin de détecter les incohérences globales.

### AI-US-08

En tant qu’auteur, je peux utiliser un assistant d’audit de point de vue qui vérifie la disponibilité de l’information pour le narrateur ou le focalisateur actif, afin de détecter les fuites de point de vue.

### AI-US-09

En tant qu’auteur, je peux utiliser un assistant de suivi de connaissance et de croyance qui met à jour des propositions d’état mental par personnage, afin de piloter mystères, tromperies et ironie dramatique.

## Epic AI4. Diagnostic éditorial

### AI-US-10

En tant qu’auteur, je peux utiliser un assistant de diagnostic de scène qui évalue objectif, conflit, bascule, conséquence, hook et pression narrative, afin de mesurer la fonction dramatique réelle de la scène.

### AI-US-11

En tant qu’auteur, je peux utiliser un assistant de pacing qui détecte exposition excessive, scènes plates, ralentissements, suraccélérations et mauvaise distribution de la tension, afin d’améliorer le rythme global.

### AI-US-12

En tant qu’auteur, je peux utiliser un assistant de fils narratifs qui suit setups, payoffs, promesses, sous-intrigues et questions ouvertes, afin d’identifier les oublis ou déséquilibres.

### AI-US-13

En tant qu’auteur, je peux utiliser un assistant de causalité qui vérifie que les conséquences importantes disposent de causes, préparations et transitions suffisantes, afin d’éviter les sauts logiques.

## Epic AI5. Voix et prose

### AI-US-14

En tant qu’auteur, je peux utiliser un assistant d’analyse de prose qui détecte répétitions, filtres, tics, redondances, surcharges, formulations vagues et constructions configurables, afin de nettoyer le texte sans uniformiser ma voix.

### AI-US-15

En tant qu’auteur, je peux utiliser un assistant d’analyse de dialogues qui compare la différenciation des voix des personnages, afin de détecter les dialogues interchangeables.

### AI-US-16

En tant qu’auteur, je peux utiliser un assistant de conformité stylistique qui compare le texte à une feuille de style projet, afin de préserver mes conventions d’écriture.

## Epic AI6. Réparation et proposition

### AI-US-17

En tant qu’auteur, je peux utiliser un assistant de plan de réparation qui propose des corrections structurées, localisées et justifiées, afin de résoudre les problèmes identifiés sans générer des réécritures gratuites.

### AI-US-18

En tant qu’auteur, je peux utiliser un assistant de réécriture contrôlée qui opère sur un passage donné avec contraintes de voix, de style, de canon et de cible éditoriale, afin d’obtenir une proposition utile et contenue.

### AI-US-19

En tant qu’auteur, je peux utiliser un assistant de brainstorming ciblé pour enrichir une scène, un conflit, un enjeu ou une solution de continuité, afin de débloquer la création sans brouiller le canon.

### AI-US-20

En tant qu’auteur, je peux comparer plusieurs propositions d’assistants ou plusieurs variantes de réécriture avant acceptation, afin de choisir consciemment la meilleure option.

## Epic AI7. Vérification et confiance

### AI-US-21

En tant qu’auteur, je peux utiliser un assistant vérificateur qui contre-évalue les sorties des autres assistants et refuse celles qui ne disposent pas d’évidence ou de cohérence suffisante, afin de renforcer la qualité globale.

### AI-US-22

En tant qu’auteur, je peux voir pour chaque proposition IA le niveau de confiance, les éléments de preuve et les zones d’incertitude, afin de calibrer ma validation.

### AI-US-23

En tant qu’auteur, je peux noter les suggestions IA selon leur utilité, leur fidélité à la voix et leur exactitude, afin d’ajuster les comportements futurs.

---

# 9. SYS USER STORIES

## Epic SYS1. Paramétrage et configuration

### SYS-US-01

En tant qu’auteur, je peux configurer les fournisseurs et modèles IA de façon agnostique, afin de ne pas lier le produit à un seul acteur technique.

### SYS-US-02

En tant qu’auteur, je peux définir des règles de configuration avec précédence claire entre override d’exécution, feature, projet, global et valeurs par défaut, afin d’éviter les comportements implicites.

### SYS-US-03

En tant qu’auteur, je peux réinitialiser sélectivement certains domaines de réglages sans affecter le contenu du projet, afin de corriger une configuration devenue instable.

## Epic SYS2. Persistance, versions, sécurité locale

### SYS-US-04

En tant qu’auteur, je peux bénéficier d’autosave, d’undo redo et de snapshots restaurables, afin de ne jamais perdre mon travail.

### SYS-US-05

En tant qu’auteur, je peux comparer des versions et restaurer sélectivement des fragments, afin de récupérer une solution sans écraser tout un chapitre.

### SYS-US-06

En tant qu’auteur, je peux sauvegarder et restaurer un projet via un pack local complet, afin d’assurer portabilité et résilience hors ligne.

## Epic SYS3. Import, export et assembly

### SYS-US-07

En tant qu’auteur, je peux importer Markdown, TXT et JSON vers le modèle structuré du projet, afin de reprendre un travail existant sans repartir de zéro.

### SYS-US-08

En tant qu’auteur, je peux exporter le projet et le manuscrit en Markdown et JSON, afin de conserver des formats ouverts et exploitables.

### SYS-US-09

En tant qu’auteur, je peux compiler un manuscrit à partir d’une sélection de scènes ou de versions approuvées, afin de générer une vue de sortie cohérente.

### SYS-US-10

En tant qu’auteur, je peux générer des artefacts de publication, de soumission ou de préparation éditoriale à partir de l’état approuvé du projet, afin de capitaliser sur le travail validé.

## Epic SYS4. Offline, file d’attente, robustesse

### SYS-US-11

En tant qu’auteur, je peux utiliser l’application hors ligne pour toutes les fonctions locales et voir clairement les tâches IA en attente, afin de travailler sans ambiguïté de connectivité.

### SYS-US-12

En tant qu’auteur, je peux reprendre proprement une opération IA interrompue sans corrompre le texte ni le canon, afin de préserver l’intégrité du projet.

### SYS-US-13

En tant qu’auteur, je peux installer l’application en PWA avec persistance locale fiable, afin d’utiliser l’outil comme un poste de travail réel.

## Epic SYS5. Observabilité

### SYS-US-14

En tant qu’auteur, je peux consulter les logs d’actions IA avec horodatage, contexte, coût éventuel, fournisseur, modèle, statut et résumé des entrées sorties, afin de garder une visibilité opérationnelle.

### SYS-US-15

En tant qu’auteur, je peux inspecter les données sources ayant alimenté une action IA, afin de comprendre le périmètre exact du raisonnement effectué.

---

# 10. GOV USER STORIES

## Epic GOV1. Contrôle et audit

### GOV-US-01

En tant qu’auteur, aucune mutation du canon ou du texte ne peut être considérée comme valide sans trace d’approbation ou d’acceptation explicite, afin de garantir l’auditabilité.

### GOV-US-02

En tant qu’auteur, je peux voir la provenance d’une proposition, notamment extraits, fiches de bible, règles de style et paramètres de l’action, afin de vérifier sa légitimité.

### GOV-US-03

En tant qu’auteur, je peux exiger qu’une proposition IA cite les éléments internes du projet qui la motivent, afin de réduire les suggestions arbitraires.

## Epic GOV2. Qualité et critères

### GOV-US-04

En tant qu’auteur, je peux définir des rubriques de scoring et des checklists obligatoires avant certaines étapes, afin d’industrialiser mes critères de qualité sans les dénaturer.

### GOV-US-05

En tant qu’auteur, je peux empêcher l’export ou la génération de certains artefacts tant que des issues bloquantes restent ouvertes, afin d’éviter une sortie prématurée.

### GOV-US-06

En tant qu’auteur, je peux classifier les issues par domaine, gravité, statut, propriétaire éditorial et dépendances, afin de piloter les révisions comme un vrai flux de travail.

## Epic GOV3. Transparence de l’incertitude

### GOV-US-07

En tant qu’auteur, je peux voir clairement les zones où le système manque de données, hésite ou s’appuie sur une inférence fragile, afin de ne jamais attribuer à la machine une certitude qu’elle n’a pas.

### GOV-US-08

En tant qu’auteur, je peux imposer des seuils minimum de confiance ou d’évidence avant qu’une suggestion soit affichée comme exploitable, afin d’ajuster le niveau d’exigence à mon usage.

---

# 11. Rôles d’assistants recommandés

Le système ne doit pas avoir un assistant par user story. Il doit avoir un ensemble stable d’assistants spécialisés.

## A. Extracteur canonique

Transforme le texte et les notes en faits, entités, statuts, relations, connaissances et croyances candidates.

## B. Réconciliateur d’état

Compare les extractions au canon validé et à l’état de début de chapitre pour produire des deltas.

## C. Auditeur de continuité

Contrôle timeline, objets, blessures, lieux, règles du monde et statuts narratifs.

## D. Auditeur POV et connaissance

Contrôle ce qui est accessible au point de vue et reconstruit les états mentaux par personnage.

## E. Diagnosticien éditorial

Évalue scènes, tension, structure, exposition, causalité, threads et sous-intrigues.

## F. Analyste prose et voix

Évalue conformité stylistique, répétitions, filtres, dialogues et signature textuelle.

## G. Planificateur de réparation

Produit des corrections proposées sous forme de plans ou de diffs localisés.

## H. Vérificateur

Contre-évalue les sorties des autres assistants, signale les faiblesses et filtre les sorties non robustes.

## I. Orchestrateur

Sélectionne les assistants, impose l’ordre, collecte les sorties, consolide le résultat et prépare les objets d’interface.

---

# 12. Workflow de référence, analyse d’un chapitre

1. Chargement de l’état validé de début de chapitre.
2. Extraction canonique du chapitre courant.
3. Réconciliation avec le canon et production de deltas.
4. Classification explicite, inférence forte, inférence faible, conflit, absence de preuve.
5. Audit de continuité.
6. Audit POV et connaissance.
7. Diagnostic éditorial.
8. Vérification des résultats.
9. Agrégation UI avec vues avant, pendant, après, évidence, confiance et impacts.
10. Validation manuelle par l’auteur.
11. Mise à jour du canon et génération de l’état de fin de chapitre.

## Règles de cadrage

* Aucun assistant ne doit écrire directement dans le canon.
* Aucun diagnostic ne doit être affiché sans domaine, sévérité et justification.
* Toute sortie de réécriture doit référencer le passage source et la contrainte éditoriale visée.
* Toute évolution chapitre par chapitre doit être reconstructible rétrospectivement.

---

# 13. Règles de rédaction des futures US

Pour éviter l’ambiguïté, toute future user story doit préciser, lorsque c’est pertinent :

* le niveau d’application, global, projet, chapitre, scène, entité ou passage
* l’objet métier concerné
* le type de sortie attendu, vue, delta, diagnostic, suggestion, export ou log
* le niveau de contrôle utilisateur attendu
* si la donnée produite relève du canon, d’une proposition IA ou d’un artefact temporaire
* le mode de preuve ou de justification attendu

---

# 14. Risques de conception à éviter

## 14.1. Confondre vérité et suggestion

Si une proposition IA est rendue indistincte du canon validé, la confiance produit s’effondre.

## 14.2. Trop de pairwise stories relationnelles

Multiplier les US de type personnage vers lieu, personnage vers lore, lieu vers timeline produit une dette conceptuelle. Le modèle relationnel doit rester générique et typé.

## 14.3. Réécriture avant diagnostic

La valeur produit vient d’abord du diagnostic et de la lisibilité des impacts. La réécriture vient ensuite.

## 14.4. Mobile first sur la rédaction profonde

Le mobile doit être utile, mais le cœur du produit reste la rédaction longue et la révision analytique sur desktop.

## 14.5. Assistants trop nombreux ou trop fins

Un assistant par US est une mauvaise granularité. La bonne granularité est la responsabilité sémantique.

---

# 15. Priorisation recommandée

## V1, fondation robuste

* D-US-01 à D-US-18
* D-US-20 à D-US-24
* UI-US-01 à UI-US-08
* UX-US-01 à UX-US-09
* AI-US-01 à AI-US-09
* AI-US-17 à AI-US-22
* SYS-US-01 à SYS-US-09
* SYS-US-11 à SYS-US-15
* GOV-US-01 à GOV-US-08

## V2, différenciation forte

* UI-US-09 à UI-US-13
* UX-US-10 à UX-US-15
* AI-US-10 à AI-US-16
* AI-US-23
* SYS-US-10
* SYS-US-12 à SYS-US-13

## V3, extension avancée

* collaboration externe
* soumission complète multi format
* scoring éditorial avancé personnalisable
* boucles d’apprentissage par feedback utilisateur plus fines

---

# 16. Décisions structurantes proposées

1. Le produit doit être pensé comme un système d’état narratif, pas comme un simple éditeur avec IA.
2. La maille principale d’analyse doit être le chapitre, avec descente vers la scène et remontée vers l’arc global.
3. Toute donnée suivie doit pouvoir être vue en avant chapitre, pendant chapitre et après chapitre.
4. Les assistants doivent travailler sur contrats structurés et non sur prompts ad hoc non bornés.
5. La confiance utilisateur prime sur la vitesse perçue.

---

# 17. Prochaine étape recommandée

Transformer ce backlog v2 en backlog de delivery avec, pour chaque US prioritaire :

* critères d’acceptation
* données d’entrée minimales
* objets de sortie attendus
* dépendances fonctionnelles
* risques d’ambiguïté
* stratégie de test

C’est cette étape qui permettra ensuite de découper proprement les tickets produit, design et implémentation.
