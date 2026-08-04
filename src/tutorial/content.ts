export type TutorialScreen = Readonly<{
  id:
    | "frames"
    | "anatomy"
    | "axis-angle"
    | "composition"
    | "gimbal-lock"
    | "lotusim-xdyn"
    | "challenge";
  title: string;
  tryIt: string;
  summary: string;
  takeaway: string;
  details: readonly [definition: string, derivation: string, example: string];
  pitfalls: readonly string[];
  sources: readonly Readonly<{ label: string; url: string }>[];
}>;

export const TUTORIAL_SCREENS = [
  {
    id: "frames",
    title: "Repères : monde ENU, corps FLU",
    tryIt:
      "Cliquez sur Rejouer et observez les deux repères : le grand repère du monde reste fixe pendant que le repère du bateau tourne avec lui. Repérez quels axes suivent le bateau et quels axes ne bougent pas.",
    summary:
      "Vous venez de voir deux repères. Le repère monde ENU (East–North–Up : X vers l'est, Y vers le nord, Z vers le haut) est fixe. Le repère corps FLU (Forward–Left–Up : X vers l'avant, Y vers la gauche, Z vers le haut) est solidaire du bateau. L'orientation du bateau est la rotation qui fait passer du repère corps au repère monde — et un quaternion est l'outil qui décrit cette rotation avec quatre nombres liés.",
    takeaway:
      "Orientation ≠ position : pendant toute la démonstration, le bateau n'a pas changé de place.",
    details: [
      "Le repère monde ENU est fixe : ses trois directions servent de référence. Le repère corps FLU est attaché au bateau : ses axes Forward, Left et Up tournent avec lui. L'orientation est la rotation qui fait passer du repère corps au repère monde. ENU/FLU est la convention de LOTUSim et de Gazebo; xdyn, lui, parle NED/FRD — la conversion arrive à l'étape 6.",
      "Pour un quaternion unitaire Hamilton actif corps-vers-monde, un vecteur du bateau v devient v′ = q ⊗ (0,v) ⊗ q*, où q* est le conjugué — et donc l'inverse — de q. Le symbole ⊗ est le produit de quaternions, défini à l'étape 2.",
      "Au départ, le bateau pointe vers l'est (X du monde). La démonstration le tourne vers le nord : sa position ne change pas, seule son orientation et les axes qui lui sont attachés tournent.",
    ],
    pitfalls: [
      "Confondre l’orientation, qui décrit une rotation, avec la position du bateau.",
    ],
    sources: [
      {
        label: "ROS 2 — Quaternion fundamentals",
        url: "https://docs.ros.org/en/jazzy/Tutorials/Intermediate/Tf2/Quaternion-Fundamentals.html",
      },
    ],
  },
  {
    id: "anatomy",
    title: "Anatomie : [w, x, y, z], quatre nombres liés",
    tryIt:
      "Faites glisser θ et suivez le point sur le cercle : w est son abscisse, ‖(x,y,z)‖ son ordonnée — le cosinus et le sinus du même demi-angle θ/2. Quelle que soit la valeur, w² + ‖(x,y,z)‖² = 1 : le point ne quitte jamais le cercle.",
    summary:
      "Vous savez déjà décrire une rotation avec quatre nombres : un axe unitaire (uₓ, uᵧ, u_z) et un angle θ. Le quaternion réencode exactement ces quatre-là — l'axe devient (x,y,z) = u·sin(θ/2), l'angle devient w = cos(θ/2) — aucune information nouvelle. L'intérêt du réencodage : composer deux rotations deviendra une simple multiplication (étape 4). À axe fixé, q est un point sur un cercle de rayon 1 ; « norme 1 » veut juste dire « sur le cercle ». Et c'est le format scalaire d'abord, l'ordre (qr, qi, qj, qk) qu'xdyn transmet.",
    takeaway:
      "Quaternion = (axe, angle) réencodés : w = cos(θ/2), (x,y,z) = u·sin(θ/2). w n'est pas un angle, et aucune composante ne se lit isolément.",
    details: [
      "Réencodage exact de l'axe unitaire u et de l'angle θ : (x,y,z) = u·sin(θ/2) et w = cos(θ/2), d'où ‖q‖² = cos²(θ/2) + ‖u‖²·sin²(θ/2) = 1. Le produit qui rend ce format utile est ⊗ : (w₁, v₁) ⊗ (w₂, v₂) = (w₁w₂ − v₁·v₂, w₁v₂ + w₂v₁ + v₁ × v₂) — non commutatif à cause du produit vectoriel. C'est lui qui apparaît dans v′ = q ⊗ (0,v) ⊗ q* et dans toute composition.",
      "D'où vient le demi-angle ? Une rotation d'angle θ est la composition de deux réflexions dont les plans contiennent l'axe et forment entre eux un angle de θ/2 ; le quaternion q est le produit des normales unitaires des deux plans, et le sandwich q ⊗ (0,v) ⊗ q* enchaîne exactement ces deux réflexions. L'analogie 2D éclaire le cercle : un complexe unitaire e^(iθ) = cos θ + i sin θ paramètre le cercle unité et tourne le plan par simple multiplication ; en 3D l'axe peut bouger, le cercle devient une sphère unité en 4D et la multiplication simple devient le sandwich.",
      "θ = 60° autour de z : θ/2 = 30°, le point est à 30° sur le cercle, donc w = cos 30° = √3/2 ≈ 0.866 et la composante z vaut sin 30° = 1/2. Vérification : 0.866² + 0.500² = 0.750 + 0.250 = 1. À θ = 180°, le point atteint (0, 1) : w s'annule sans que la rotation disparaisse.",
    ],
    pitfalls: [
      "Lire w, x, y et z comme quatre angles indépendants.",
      "Utiliser θ à la place de θ/2 dans les fonctions trigonométriques.",
      "Confondre la matrice de rotation 3×3 (attitude seule) avec la matrice homogène 4×4 (attitude et position).",
    ],
    sources: [
      {
        label: "NASA TM-74839 — Euler angles, quaternions, and transformation matrices",
        url: "https://ntrs.nasa.gov/citations/19770024290",
      },
      {
        label: "ROS 2 — Quaternion fundamentals",
        url: "https://docs.ros.org/en/jazzy/Tutorials/Intermediate/Tf2/Quaternion-Fundamentals.html",
      },
    ],
  },
  {
    id: "axis-angle",
    title: "q et −q : une rotation, deux écritures",
    tryIt:
      "Cliquez sur « Afficher −q » : les quatre composantes changent de signe et l'attitude du bateau ne bouge pas d'un degré. Les deux écritures décrivent exactement la même rotation.",
    summary:
      "Le quaternion couvre chaque rotation deux fois : q et −q donnent la même attitude, car les deux signes s'annulent dans q ⊗ (0,v) ⊗ q*. C'est la double couverture — et la raison pour laquelle comparer deux quaternions composante par composante peut conclure à tort que deux attitudes diffèrent.",
    takeaway:
      "q et −q décrivent la même orientation ; ne comparez jamais deux quaternions composante par composante sans y penser.",
    details: [
      "Pour q = (cos(θ/2), u sin(θ/2)), l'opposé −q = (cos((2π−θ)/2), −u sin((2π−θ)/2)) représente la rotation de 2π−θ autour de −u : le même mouvement physique, lu dans l'autre sens. Sur le cercle de l'étape 2 — la sphère en 4D —, q et −q sont deux points diamétralement opposés qui codent la même rotation.",
      "(−q) ⊗ (0,v) ⊗ (−q)* = q ⊗ (0,v) ⊗ q* : les deux signes se compensent dans l'action bilatérale, quel que soit le vecteur v. Aucune mesure physique ne distingue q de −q.",
      "Ici u=(0,0,1) et θ=60°, donc q=(cos 30°,0,0,sin 30°)=(√3/2,0,0,1/2). Son opposé (−√3/2,0,0,−1/2) produit la même attitude, car les deux signes s’annulent dans q ⊗ (0,v) ⊗ q*.",
    ],
    pitfalls: [
      "Comparer q et −q composante par composante au lieu de comparer leur orientation.",
      "Croire que la forme canonique (w ≥ 0) supprime la double couverture : à w = 0, les deux signes restent possibles.",
    ],
    sources: [
      {
        label: "NASA TM-74839 — Euler angles, quaternions, and transformation matrices",
        url: "https://ntrs.nasa.gov/citations/19770024290",
      },
      {
        label: "ROS 2 — Quaternion fundamentals",
        url: "https://docs.ros.org/en/jazzy/Tutorials/Intermediate/Tf2/Quaternion-Fundamentals.html",
      },
    ],
  },
  {
    id: "composition",
    title: "Composer des rotations : l'ordre compte",
    tryIt:
      "Cliquez sur « Permuter l'ordre » et observez le bateau : appliquer A puis B ne donne pas la même attitude que B puis A. Le bateau fantôme marque la fin de la première rotation.",
    summary:
      "Vous venez de voir que les rotations ne commutent pas : roulis de 90° puis lacet de 90° ne donnent pas la même attitude que lacet puis roulis. La composition s'écrit avec le produit de quaternions : appliquer A puis B donne q_B ⊗ q_A — la première rotation appliquée se lit à droite.",
    takeaway:
      "q_B ⊗ q_A signifie « d'abord A, puis B » : l'ordre de lecture est l'inverse de l'ordre chronologique.",
    details: [
      "v′ = (q_B ⊗ q_A) ⊗ v ⊗ (q_B ⊗ q_A)*. Pour des quaternions Hamilton actifs corps-vers-monde, appliquer A puis B signifie q = q_B ⊗ q_A : la rotation la plus proche du vecteur agit en premier.",
      "Avec A = roulis +90° et B = lacet +90°, q_A = (√½, √½, 0, 0) et q_B = (√½, 0, 0, √½). Ainsi q_B ⊗ (q_A ⊗ v ⊗ q_A*) ⊗ q_B* = (q_B ⊗ q_A) ⊗ v ⊗ (q_B ⊗ q_A)*.",
      "Dans la démo de référence, q_B ⊗ q_A = (1/2, 1/2, 1/2, 1/2). En permutant, q_A ⊗ q_B = (1/2, 1/2, −1/2, 1/2) : le signe de y change et le bateau prend une autre attitude.",
    ],
    pitfalls: [
      "Lire le produit de gauche à droite comme une liste chronologique.",
      "Confondre un axe du monde avec l’axe homonyme déjà tourné du corps.",
    ],
    sources: [
      {
        label: "Sommer et al. — Why and How to Avoid the Flipped Quaternion Multiplication",
        url: "https://arxiv.org/abs/1801.07478",
      },
      {
        label: "ROS 2 — Quaternion fundamentals",
        url: "https://docs.ros.org/en/jazzy/Tutorials/Intermediate/Tf2/Quaternion-Fundamentals.html",
      },
    ],
  },
  {
    id: "gimbal-lock",
    title: "Euler angles et gimbal lock",
    tryIt:
      "Cliquez sur « Déclencher 90° » : les anneaux de lacet et de roulis s'alignent. Faites ensuite glisser le roulis ou le lacet : plusieurs couples de valeurs donnent exactement la même attitude, et la décomposition affichée saute à sa forme canonique.",
    summary:
      "Vous venez de voir le gimbal lock (verrouillage de cardan) : à ±90° de tangage, les axes de lacet et de roulis s'alignent et les deux angles ne sont plus indépendants. C'est une singularité des Euler angles — une représentation en trois angles — pas de l'orientation elle-même : le quaternion, lui, décrit toujours l'attitude sans singularité.",
    takeaway:
      "Le gimbal lock est un défaut des Euler angles, pas du quaternion.",
    details: [
      "R = R_Z(lacet) R_Y(tangage) R_X(roulis). La convention intrinsèque Z-Y′-X″ applique le lacet autour de Z, le tangage autour de Y′ déjà tourné, puis le roulis autour de X″. C'est la seule convention d'Euler supportée par xdyn ([psi, theta′, phi″]). À ±90° de tangage, Z et X″ deviennent colinéaires: la décomposition perd un degré de liberté.",
      "Roulis 20°, tangage 90° et lacet 35° est une décomposition valide: les anneaux de lacet et de roulis s’alignent et la matrice ne conserve que leur différence 35°−20°=15°. Pour un affichage déterministe, le laboratoire choisit la représentation canonique équivalente roulis 0°, tangage 90°, lacet 15°.",
      "Plusieurs triplets d’Euler donnent donc la même rotation: c’est une singularité de représentation, pas une disparition du mouvement. À ce point, l'orientation physique existe toujours et le quaternion unitaire la décrit sans singularité interne.",
    ],
    pitfalls: [
      "Attribuer le verrouillage au quaternion plutôt qu’aux coordonnées d’Euler.",
      "Croire qu’une formule de conversion quaternion-vers-Euler peut rendre la décomposition unique à ±90°.",
    ],
    sources: [
      {
        label: "NASA TM-74839 — Euler angles, quaternions, and transformation matrices",
        url: "https://ntrs.nasa.gov/citations/19770024290",
      },
      {
        label: "SciPy — Rotation",
        url: "https://docs.scipy.org/doc/scipy/reference/generated/scipy.spatial.transform.Rotation.html",
      },
    ],
  },
  {
    id: "lotusim-xdyn",
    title: "Conversion xdyn ↔ LOTUSim : NED/FRD vers ENU/FLU",
    tryIt:
      "Cliquez sur « Monde » ou « Corps » : le bateau LOTUSim prend l'attitude — fausse — obtenue en n'appliquant que ce facteur, pendant que le bateau xdyn garde l'attitude physique de référence. « Conversion complète » rétablit la bonne orientation : les deux bateaux se réalignent.",
    summary:
      "xdyn parle NED/FRD (North–East–Down / Forward–Right–Down) ; LOTUSim et Gazebo parlent ENU/FLU. Passer de l'un à l'autre exige deux changements de base — un côté monde, un côté corps — et, à la frontière Three.js, un simple réordonnancement des composantes de (w,x,y,z) vers (x,y,z,w).",
    takeaway:
      "Deux changements de base (monde et corps) plus un réordonnancement : oublier l'un des trois est l'erreur classique.",
    details: [
      "q_ENU_FLU = Q_NED_TO_ENU ⊗ q_NED_FRD ⊗ Q_FLU_TO_FRD, avec Q_NED_TO_ENU=(0,1/√2,1/√2,0) et Q_FLU_TO_FRD=(0,1,0,0). Le facteur de gauche change les coordonnées du repère monde ; celui de droite change celles du repère corps. Omettre l'un des deux ne conserve pas l'attitude complète.",
      "xdyn transmet des quaternions Hamilton corps-vers-monde dans l’ordre scalaire d’abord (qr,qi,qj,qk)=(w,x,y,z). LOTUSim/Gazebo utilise ENU/FLU; à la seule frontière Three.js, les mêmes composantes sont réordonnées en (x,y,z,w). Ce réordonnancement n’est pas une rotation.",
      "Cap xdyn 0°: q_NED_FRD=(1,0,0,0), donc q_ENU_FLU=(1/√2,0,0,1/√2), soit un lacet ENU de +90°. Cap xdyn +90°: q_NED_FRD=(1/√2,0,0,1/√2), et le produit vaut une identité à un signe près, soit un lacet ENU de 0°.",
    ],
    pitfalls: [
      "Appliquer seulement le passage NED vers ENU et laisser le corps en FRD.",
      "Passer (qr,qi,qj,qk) directement au constructeur Three.js qui attend (x,y,z,w).",
      "Reconstruire le quaternion reçu dans le mauvais ordre de composantes : un lacet revient alors en roulis, et l'erreur reste invisible tant que l'orientation est proche de l'identité.",
    ],
    sources: [
      {
        label: "ROS 2 — Quaternion fundamentals",
        url: "https://docs.ros.org/en/jazzy/Tutorials/Intermediate/Tf2/Quaternion-Fundamentals.html",
      },
      {
        label: "Three.js — Quaternion",
        url: "https://threejs.org/docs/pages/Quaternion.html",
      },
    ],
  },
  {
    id: "challenge",
    title: "Défi : diagnostic de convention",
    tryIt:
      "Choisissez l'attitude ENU/FLU équivalente au quaternion xdyn [√½, 0, 0, √½]. Chaque mauvaise proposition correspond à une erreur de convention précise : lisez le feedback après chaque essai.",
    summary:
      "Les propositions [1,0,0,0] et [−1,0,0,0] sont toutes deux correctes — la double couverture, vue à l'étape 3. Chaque distracteur isole une erreur : changement monde omis, changement corps omis, facteurs inversés, ou ordre scalaire xdyn lu comme l'ordre Three.js.",
    takeaway:
      "En cas de doute sur une convention, refaites le produit dans l'ordre annoncé plutôt que de juger à la proximité des composantes.",
    details: [
      "Q_NED_TO_ENU ⊗ [√½,0,0,√½] ⊗ Q_FLU_TO_FRD = [−1,0,0,0] ≡ [1,0,0,0]. L'entrée correspond à un cap NED de +90° ; après les changements monde et corps, le bateau pointe vers +X ENU avec ses axes FLU alignés : l'orientation ENU/FLU est l'identité, dont le quaternion opposé représente exactement la même rotation.",
      "En remplaçant les valeurs, (0, √½, √½, 0) ⊗ (√½, 0, 0, √½) ⊗ (0, 1, 0, 0) = (−1, 0, 0, 0). La double couverture autorise ensuite la forme canonique opposée (1, 0, 0, 0).",
      "Numériquement, [1,0,0,0] et [−1,0,0,0] sont corrects. Les autres propositions isolent une erreur: changement monde ou corps omis, facteurs inversés, ou ordre scalaire xdyn lu comme l’ordre Three.js.",
    ],
    pitfalls: [
      "Refuser [−1,0,0,0] alors que q et −q ont la même action sur tout vecteur.",
      "Choisir une réponse par proximité des composantes sans refaire le produit dans l’ordre annoncé.",
    ],
    sources: [
      {
        label: "ROS 2 — Quaternion fundamentals",
        url: "https://docs.ros.org/en/jazzy/Tutorials/Intermediate/Tf2/Quaternion-Fundamentals.html",
      },
      {
        label: "Three.js — Quaternion",
        url: "https://threejs.org/docs/pages/Quaternion.html",
      },
    ],
  },
] as const satisfies readonly TutorialScreen[];
