# World Lab

World Lab est une expérience publique et read-only pour observer un monde logiciel vivant. Elle ne constitue pas un World Kernel de production.

Le serveur utilise uniquement la bibliothèque standard Python. Il anime un monde synthétique, conserve son état dans `/data`, expose une API JSON et sert trois vues de la même réalité.

## Lancer

```bash
python3 app.py
```

Ouvrir `http://localhost:8000`.

## Vérifier

```bash
python3 -m unittest -v
```

## Routes

* `/` : interface vivante.
* `/api/state` : état courant.
* `/api/events?limit=50` : derniers événements.
* `/api/health` : sonde de santé.

La page d’accueil ouvre la vue `Comprendre`. Les variantes visuelles sont accessibles avec `?variant=orbit`, `?variant=atlas` et `?variant=depth`.

## Comprendre le monde

La vue par défaut explique avant de représenter. Elle montre :

* l’étape qui vient de finir et la prochaine action ;
* les huit étapes exactes du cycle ;
* le rôle, les actions codées et les limites de chaque habitant ;
* les huit derniers événements en français courant ;
* la différence entre réalité, connaissance, croyance et possibilité.

Les détails distinguent volontairement le rôle raconté d’un habitant et ce qu’il sait réellement faire dans la simulation actuelle.

## Interface vivante

L'interface traduit l'état au lieu de lui appliquer un décor fixe. La saison choisit le langage et la palette. La pression règle l'ampleur des halos. L'entropie accélère le rythme et densifie le ciel. La vitalité des habitants modifie leur respiration. Les événements récents déterminent si l'Air, l'Eau, le Feu ou la Terre domine la scène.

Un changement de saison, la naissance d'une espèce et un refus du Feu traversent brièvement toutes les vues. La navigation reste libre : l'expression change, mais le visiteur garde le choix entre Orbite, Atlas et Profondeur.
