# LOTUSim Quaternion Lab

Laboratoire statique pour visualiser une attitude, apprendre les quaternions Hamilton et convertir les conventions xdyn NED/FRD vers LOTUSim/Gazebo ENU/FLU.

## Lancer localement

Bun est le seul gestionnaire, runtime et lanceur de tests requis.

```bash
bun install
bun run dev
bun test
bun run typecheck
bun run build
bun run preview
```

`bun run dev` ouvre le laboratoire de développement; `bun run preview` sert le build statique produit dans `dist/`.

## Utilisation

Le tutoriel démarre immédiatement. **Passer au bac à sable** masque la leçon sans perdre l'attitude courante; **Reprendre le tutoriel** la réaffiche pendant la même session; **Recommencer** la ramène à sa première étape. La caméra du bateau s'orbite à la souris et son bouton de réinitialisation restaure la vue.

Le bac à sable conserve une seule attitude ENU/FLU et synchronise quaternion, angle-axe et angles d'Euler intrinsèques Z-Y′-X″. Les messages signalent les valeurs invalides, la normalisation et le verrouillage de cardan. Les libellés d'axes restent présents dans le texte, en plus des couleurs.

## Convention mathématique

Les quaternions métier sont Hamilton, actifs corps-vers-monde et **scalaire d'abord** : `[w, x, y, z]`. Ils agissent selon :

```text
v_world = q ⊗ v_body ⊗ q*
```

xdyn transmet `(qr, qi, qj, qk) = (w, x, y, z)` en NED/FRD. La conversion complète, avec les deux changements de base, est :

```text
q_ENU_FLU = Q_NED_TO_ENU ⊗ q_NED_FRD ⊗ Q_FLU_TO_FRD
Q_NED_TO_ENU = [0, √½, √½, 0]
Q_FLU_TO_FRD = [0, 1, 0, 0]
```

Les exemples de cap vérifiés sont `heading_NED = 0° → yaw_ENU = +90°` et `heading_NED = +90° → yaw_ENU = 0°`. Three.js est la seule frontière qui attend le même quaternion réordonné en `(x, y, z, w)`.

## Sources

- [ROS 2 — Quaternion fundamentals](https://docs.ros.org/en/rolling/Tutorials/Intermediate/Tf2/Quaternion-Fundamentals.html)
- [NASA TM-74839 — Euler angles, quaternions, and transformation matrices](https://ntrs.nasa.gov/citations/19770024290)
- [Sommer et al. — Why and How to Avoid the Flipped Quaternion Multiplication](https://arxiv.org/abs/1801.07478)
- [SciPy — Rotation](https://docs.scipy.org/doc/scipy/reference/generated/scipy.spatial.transform.Rotation.html)
- [Three.js — Quaternion](https://threejs.org/docs/pages/Quaternion.html)

## Hors périmètre V1

Cette V1 locale n'importe pas de logs, ne se connecte pas à une simulation en direct, ne persiste pas l'état de la leçon et n'ajoute ni backend ni synchronisation réseau.
