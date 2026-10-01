# Contribuer à Sociopo

Merci de votre intérêt ! Sociopo est une rédaction collective et anonyme : les contributions sont publiées sous la signature « Rédaction Sociopo ».

## Signaler une erreur

Ouvrez un ticket (*Issue*) en précisant la page concernée, l'erreur constatée et, si possible, une source (texte officiel, document parlementaire, publication académique, article de presse de référence).

## Proposer une modification

1. Modifiez le fichier Markdown concerné dans `src/content/` (ou le fichier JSON dans `src/_data/`).
2. Lancez `npm run build && npm run check`.
3. Ouvrez une demande de fusion (*pull request*) en résumant la modification et ses sources.

## Ligne éditoriale

- **Notices** : factuelles, neutres, datées, sourcées. Les controverses sont présentées dans un encadré `:::debat` qui expose les positions en présence.
- **Dossiers** : analyses de rapports de forces ; elles exposent les lectures contradictoires et distinguent faits et hypothèses.
- **Vocabulaire** : termes officiels ; équivalents néerlandais et allemands vérifiés dans les textes officiels bilingues ou trilingues.
- **Actualité** : toute information postérieure à la dernière mise à jour doit être recoupée par au moins deux sources indépendantes.
- **Personnes** : uniquement des personnalités publiques, pour leur rôle public.

## Style

- Français de Belgique, typographie française (espaces insécables gérées au rendu, guillemets « »).
- Phrases courtes, définition d'abord, détails ensuite.
- Renvois systématiques par wiki-liens `[[slug|libellé]]`.
