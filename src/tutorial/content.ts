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
  details: readonly string[];
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
      "Les quaternions q et −q codent la même rotation, car (−q) ⊗ (0, v) ⊗ (−q)* = q ⊗ (0, v) ⊗ q*. Les quaternions unitaires sont donc une double couverture des rotations 3D.",
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
      "La rotation la plus proche du vecteur agit en premier: q_B ⊗ (q_A ⊗ v ⊗ q_A*) ⊗ q_B* = (q_B ⊗ q_A) ⊗ v ⊗ (q_B ⊗ q_A)*.",
      "Par exemple, +90° autour de X puis +90° autour de Z envoie le vecteur Y vers Z; l’ordre inverse l’envoie vers −X. Ainsi q_B⊗q_A et q_A⊗q_B ne représentent généralement pas la même attitude.",
      "Il faut aussi nommer les axes. Une rotation supplémentaire q_Δ exprimée autour des axes monde fixes se prémultiplie: q′=q_Δ⊗q. La même rotation exprimée autour des axes corps déjà tournés se postmultiplie: q′=q⊗q_Δ.",
    ],
    pitfalls: [
      "Lire le produit de gauche à droite comme une liste chronologique.",
      "Confondre un axe du monde avec l’axe homonyme déjà tourné du corps.",
    ],
    sources: [
      {
        label: "Solà — Why and How to Avoid the Flipped Quaternion Multiplication",
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
      "Z-Y′-X″ applique le lacet autour de Z, puis le tangage autour de l’axe Y′ déjà tourné, puis le roulis autour de X″ tourné deux fois. C’est la décomposition lacet–tangage–roulis utilisée ici.",
      "À un tangage de +90° ou −90°, les axes de la première et de la troisième rotation deviennent colinéaires. Lacet et roulis sont alors couplés: la décomposition perd un degré de liberté et plusieurs triplets d’Euler décrivent une seule attitude.",
      "L’attitude physique n’est ni perdue ni ambiguë: c’est une singularité de coordonnées de cette paramétrisation d’Euler. Un quaternion unitaire la représente sans cette singularité, mais sa reconversion en angles Z-Y′-X″ rencontre nécessairement le même verrouillage.",
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
      "Les propositions erronées sont diagnostiques: [0,√½,√½,0] omet le changement monde, [0,1,0,0] omet le changement corps, [0,0,0,1] inverse l’ordre des facteurs et [0.5,0.5,0.5,0.5] confond l’ordre scalaire xdyn avec l’ordre Three.js.",
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
