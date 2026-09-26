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

Les variantes visuelles sont accessibles avec `?variant=orbit`, `?variant=atlas` et `?variant=depth`.

