export type TutorialScreen = Readonly<{
  id:
    | "frames"
    | "axis-angle"
    | "composition"
    | "gimbal-lock"
    | "lotusim-xdyn"
    | "challenge";
  title: string;
  summary: string;
  observe: string;
  formula?: string;
  details: readonly [definition: string, derivation: string, example: string];
  pitfalls: readonly string[];
  sources: readonly Readonly<{ label: string; url: string }>[];
}>;

export const TUTORIAL_SCREENS = [
  {
    id: "frames",
    title: "Repères monde et corps",
    summary:
      "Un quaternion décrit l’orientation du corps par rapport à un repère monde : ses quatre composantes ne sont pas quatre angles indépendants.",
    observe:
      "Comparez les axes du bateau aux axes du monde, puis changez de convention sans déplacer physiquement le bateau.",
    formula: "v_world = q ⊗ v_body ⊗ q*",
    details: [
      "NED fixe x vers le Nord, y vers l’Est et z vers le bas; FRD lie x à l’avant, y à droite et z vers le bas. ENU fixe x vers l’Est, y vers le Nord et z vers le haut; FLU lie x à l’avant, y à gauche et z vers le haut.",
      "Pour un quaternion unitaire Hamilton actif corps-vers-monde, v_body désigne le vecteur corps plongé dans le quaternion pur (0, v). Son image est v_world=q ⊗ v_body ⊗ q*, où q* est le conjugué et donc l’inverse de q.",
      "Un changement de convention ne modifie pas l’attitude physique, mais il modifie généralement ses composantes. Après le changement complet NED/FRD vers ENU/FLU, l’identité NED représente un bateau pointant au Nord et devient un lacet ENU de +90°.",
    ],
    pitfalls: [
      "Lire w, x, y et z comme quatre angles.",
      "Changer seulement le repère monde en oubliant le repère corps.",
    ],
    sources: [
      {
        label: "ROS 2 — Quaternion fundamentals",
        url: "https://docs.ros.org/en/rolling/Tutorials/Intermediate/Tf2/Quaternion-Fundamentals.html",
      },
    ],
  },
  {
    id: "axis-angle",
    title: "Angle–axe et quaternion unitaire",
    summary:
      "Une rotation est définie par un axe unitaire u et un angle θ; le quaternion place le demi-angle entre sa partie scalaire et sa partie vectorielle.",
    observe:
      "Faites varier θ et l’axe lumineux : la partie vectorielle reste colinéaire à u tandis que sa norme suit sin(θ/2).",
    formula: "q = (cos(θ/2), u sin(θ/2)), avec ‖u‖ = 1",
    details: [
      "Si u=(uₓ,uᵧ,u_z) est unitaire, alors q=(cos(θ/2), uₓsin(θ/2), uᵧsin(θ/2), u_zsin(θ/2)). Sa norme au carré vaut cos²(θ/2)+‖u‖²sin²(θ/2)=1.",
      "Le demi-angle vient de l’action bilatérale q ⊗ (0, v) ⊗ q*: les deux facteurs quaternion conjugués produisent sur le vecteur la rotation physique d’angle θ. C’est aussi l’écriture exponentielle q=exp((0,u)θ/2).",
      "Ici u=(0,0,1) et θ=60°, donc q=(cos 30°,0,0,sin 30°)=(√3/2,0,0,1/2). Son opposé (−√3/2,0,0,−1/2) produit la même attitude, car les deux signes s’annulent dans q ⊗ (0,v) ⊗ q*.",
    ],
    pitfalls: [
      "Utiliser θ à la place de θ/2 dans les fonctions trigonométriques.",
      "Comparer q et −q composante par composante au lieu de comparer leur orientation.",
    ],
    sources: [
      {
        label: "NASA TM-74839 — Euler angles, quaternions, and transformation matrices",
        url: "https://ntrs.nasa.gov/citations/19770024290",
      },
      {
        label: "ROS 2 — Quaternion fundamentals",
        url: "https://docs.ros.org/en/rolling/Tutorials/Intermediate/Tf2/Quaternion-Fundamentals.html",
      },
    ],
  },
  {
    id: "composition",
    title: "Composer des rotations",
    summary:
      "Avec des rotations actives corps-vers-monde, appliquer A puis B donne q_B ⊗ q_A; inverser les facteurs inverse donc l’ordre des actions.",
    observe:
      "Regardez le bateau fantôme après A, puis permutez A et B : l’attitude finale change dès que les rotations ne commutent pas.",
    formula: "v′ = (q_B ⊗ q_A) ⊗ v ⊗ (q_B ⊗ q_A)*",
    details: [
      "Pour des quaternions Hamilton actifs corps-vers-monde, appliquer A puis B signifie q=q_B⊗q_A: la rotation la plus proche du vecteur agit en premier.",
      "Avec A=roulis +90° et B=lacet +90°, q_A=(√½,√½,0,0) et q_B=(√½,0,0,√½). Ainsi q_B⊗(q_A⊗v⊗q_A*)⊗q_B*=(q_B⊗q_A)⊗v⊗(q_B⊗q_A)*.",
      "Dans la démo de référence, q_B⊗q_A=(1/2,1/2,1/2,1/2). En permutant, q_A⊗q_B=(1/2,1/2,−1/2,1/2): le signe de y change et le bateau prend une autre attitude.",
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
        url: "https://docs.ros.org/en/rolling/Tutorials/Intermediate/Tf2/Quaternion-Fundamentals.html",
      },
    ],
  },
  {
    id: "gimbal-lock",
    title: "Angles d’Euler et verrouillage de cardan",
    summary:
      "Dans la convention intrinsèque Z-Y′-X″, un tangage de ±90° aligne les premier et troisième axes et rend lacet et roulis indissociables.",
    observe:
      "Placez le tangage à +90° puis modifiez lacet et roulis : plusieurs couples de valeurs conservent exactement la même attitude.",
    formula: "R = R_Z(lacet) R_Y(tangage) R_X(roulis)",
    details: [
      "La convention intrinsèque Z-Y′-X″ applique le lacet autour de Z, le tangage autour de Y′ déjà tourné, puis le roulis autour de X″. À ±90° de tangage, Z et X″ deviennent colinéaires: la décomposition perd un degré de liberté.",
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
    title: "Conversion LOTUSim / xdyn",
    summary:
      "Passer de xdyn NED/FRD à LOTUSim/Gazebo ENU/FLU exige deux changements de base, l’un côté monde et l’autre côté corps.",
    observe:
      "Animez séparément l’échange du monde NED vers ENU puis celui du corps FLU vers FRD, avant d’afficher leur produit complet.",
    formula:
      "q_ENU_FLU = Q_NED_TO_ENU ⊗ q_NED_FRD ⊗ Q_FLU_TO_FRD",
    details: [
      "Les quaternions de changement sont Q_NED_TO_ENU=(0,1/√2,1/√2,0) et Q_FLU_TO_FRD=(0,1,0,0). Le facteur de gauche change les coordonnées du repère monde; celui de droite change les coordonnées du repère corps. Omettre l’un des deux ne conserve pas l’attitude complète.",
      "xdyn transmet des quaternions Hamilton corps-vers-monde dans l’ordre scalaire d’abord (qr,qi,qj,qk)=(w,x,y,z). LOTUSim/Gazebo utilise ENU/FLU; à la seule frontière Three.js, les mêmes composantes sont réordonnées en (x,y,z,w). Ce réordonnancement n’est pas une rotation.",
      "Cap xdyn 0°: q_NED_FRD=(1,0,0,0), donc q_ENU_FLU=(1/√2,0,0,1/√2), soit un lacet ENU de +90°. Cap xdyn +90°: q_NED_FRD=(1/√2,0,0,1/√2), et le produit vaut une identité à un signe près, soit un lacet ENU de 0°.",
    ],
    pitfalls: [
      "Appliquer seulement le passage NED vers ENU et laisser le corps en FRD.",
      "Passer (qr,qi,qj,qk) directement au constructeur Three.js qui attend (x,y,z,w).",
    ],
    sources: [
      {
        label: "ROS 2 — Quaternion fundamentals",
        url: "https://docs.ros.org/en/rolling/Tutorials/Intermediate/Tf2/Quaternion-Fundamentals.html",
      },
      {
        label: "Three.js — Quaternion",
        url: "https://threejs.org/docs/pages/Quaternion.html",
      },
    ],
  },
  {
    id: "challenge",
    title: "Défi diagnostic",
    summary:
      "Trouvez la représentation ENU/FLU du quaternion xdyn NED/FRD [√½,0,0,√½], puis reliez chaque mauvaise proposition à son erreur de convention.",
    observe:
      "Choisissez l’attitude LOTUSim équivalente; l’identité [1,0,0,0] et son opposé [−1,0,0,0] sont toutes deux correctes.",
    formula:
      "Q_NED_TO_ENU ⊗ [√½,0,0,√½] ⊗ Q_FLU_TO_FRD = [−1,0,0,0] ≡ [1,0,0,0]",
    details: [
      "L’entrée correspond à un cap NED de +90°. Après les changements monde et corps, le bateau pointe vers +x ENU avec ses axes FLU alignés: l’orientation ENU/FLU est l’identité, dont le quaternion opposé représente exactement la même rotation.",
      "En remplaçant les valeurs, (0,√½,√½,0)⊗(√½,0,0,√½)⊗(0,1,0,0)=(−1,0,0,0). La double couverture autorise ensuite la forme canonique opposée (1,0,0,0).",
      "Numériquement, [1,0,0,0] et [−1,0,0,0] sont corrects. Les autres propositions isolent une erreur: changement monde ou corps omis, facteurs inversés, ou ordre scalaire xdyn lu comme l’ordre Three.js.",
    ],
    pitfalls: [
      "Refuser [−1,0,0,0] alors que q et −q ont la même action sur tout vecteur.",
      "Choisir une réponse par proximité des composantes sans refaire le produit dans l’ordre annoncé.",
    ],
    sources: [
      {
        label: "ROS 2 — Quaternion fundamentals",
        url: "https://docs.ros.org/en/rolling/Tutorials/Intermediate/Tf2/Quaternion-Fundamentals.html",
      },
      {
        label: "Three.js — Quaternion",
        url: "https://threejs.org/docs/pages/Quaternion.html",
      },
    ],
  },
] as const satisfies readonly TutorialScreen[];
