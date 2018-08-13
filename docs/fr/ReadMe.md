# Documentation de l'adaptateur KLF-200

Cet adaptateur permet de contrôler une interface VELUX® KLF-200. Cet adaptateur n'est ni un produit officiel VELUX, ni pris en charge par la société propriétaire des produits VELUX.

L'objectif principal de cet adaptateur est de contrôler les fenêtres de toit électriques et/ou les stores électriques ou les volets roulants.
Bien que l’interface KLF-200 puisse se connecter à d’autres appareils tels que des lumières, des commutateurs, des stores, etc., je n’ai pas développé l’adaptateur pour l’utiliser avec ce type de périphérique. Ainsi, il est possible que ces périphériques puissent également être contrôlés par cet adaptateur.

L'adaptateur fonctionne avec l'API REST interne de l'interface KLF-200 et vous n'avez pas besoin de câbler les entrées et les sorties de la boîte, bien qu'il soit toujours possible de les utiliser en parallèle.

---

## Préparez votre interface KLF-200

Pour utiliser cet adaptateur, vous devez configurer votre boîte KLF-200 en **mode d’interface**. Cela ne fonctionne pas si vous utilisez votre boîte comme un répéteur.

> Pour une explication détaillée de la façon d'accomplir les tâches suivantes, veuillez lire les manuels fournis avec votre boîte.
> Il est supposé que vous vous êtes connecté avec succès à votre boîte dans un navigateur Web.

### Produits de configuration

Chaque produit que vous souhaitez contrôler par cet adaptateur doit être enregistré sur la page "Mes produits".
Vous pouvez enregistrer de nouveaux produits soit par

- Copier depuis une autre télécommande
- Rechercher des produits

Si tous vos produits sont enregistrés, vous devriez voir une liste comme celle-ci:

![Screenshot of "My products" of the KLF-200 interface](../en/img/ProductList.PNG)

### Configuration des scènes

Pour enregistrer une scène, il faut cliquer sur le bouton

![Record program button](../en/img/RecordProgramButton.PNG)

Cela ouvrira la fenêtre *Enregistrement en cours*. Maintenant, utilisez votre télécommande fournie avec votre produit pour changer quelque chose, par exemple ouvrez la fenêtre à 40%. Saisissez ensuite un nom pour le programme et cliquez sur *Enregistrer programme*.

![Screenshot of Recording in progress](../en/img/RecordingInProgress.PNG)

> ALLUSION:
> - Nommez votre programme après le produit et le niveau d'ouverture, par ex. Window bathroom 40%, bien que l'adaptateur n'utilise aucune convention de nommage.
> - Si votre fenêtre est fermée, commencez avec un niveau d'ouverture de 100% et descendez avec chaque programme suivant jusqu'à ce que vous atteigniez 0%.
> - Vous pouvez enregistrer jusqu'à 32 programmes dans la boîte.Par conséquent, planifiez le nombre d'étapes car il n'y a pas de différence réelle dans une fenêtre ouverte à 30% ou à 40%.

Si vous avez fini d’enregistrer des programmes, vous finirez avec une liste comme celle-ci:

![Screenshot of the program list](../en/img/ProgramList.PNG)

### Configuration des connexions

Cette dernière étape est facultative. Si vous n'utilisez pas les fils d'entrée et de sortie, vous avez peut-être remarqué que la minuscule DEL de la boîte clignote tout le temps.
Pour vous débarrasser du clignotement ennuyeux, vous devez configurer au moins une connexion.

Vous n'avez qu'à le configurer dans la boîte, vous n'avez pas besoin de câbler quoi que ce soit! Choisissez simplement ce que vous voulez.

---

## Configurez l'adaptateur

![Screenshot of the adapter configuration](../en/img/AdapterConfiguration.PNG)

### Hôte

Nom d'hôte de votre interface KLF-200. C'est la même chose que vous tapez dans la barre d'adresse de votre navigateur Web pour vous connecter à votre boîte.

### Mot de passe

Le mot de passe dont vous avez besoin pour vous connecter à votre interface KLF-200. C'est la même chose que lorsque vous vous connectez à votre boîte dans votre navigateur Web.

> Le mot de passe par défaut du KLF-200 est `velux123`, mais vous devriez l'avoir changé, de toute façon!

### Intervalle d'interrogation en minutes

<span style="color: #ff0000"><strong><em>Cette option est prévue pour une version ultérieure. Si vous souhaitez recharger la configuration, vous devez redémarrer l'adaptateur.</em></strong></span>

Nombre de minutes après lesquelles l'adaptateur recharge à nouveau la configuration depuis l'interface KLF-200.

---

## Utilisez l'adaptateur

Une fois que l'adaptateur a lu les métadonnées de l'interface KLF-200, vous trouverez les états suivants dans l'arborescence d'objets:

Dispositif | Canal | État | Type de données | Description
--- | --- | --- | --- | ---
products |  |  |  | Possède une sous-entrée pour chaque produit trouvé dans la liste de produits du KLF-200.
products |  | productsFound | value | Le nombre de produits dans la liste. Lecture seulement.
products | 0..n | category | text | Catégorie du produit. Lecture seulement.
products | 0..n | level | level | Niveau actuel du produit. Définir pour exécuter la scène correspondante. Lire écrire.
products | 0..n | scenesCount | value | Nombre de scènes dans lesquelles le produit est utilisé. Lecture seulement.
scenes |  |  |  | Possède une sous-entrée pour chaque scène trouvée dans la liste de programmes du KLF-200.
scenes |  | scenesFound | value | Le nombre de scènes dans la liste. Lecture seulement.
scenes | 0..n | productsCount | value | Nombre de produits dans cette scène. Lecture seulement.
scenes | 0..n | run | button.play | Indique si la scène est en cours d'exécution. Définir pour exécuter la scène. Lire écrire.
scenes | 0..n | silent | indicator.silent | Indique si la scène est exécutée en mode silencieux (si elle est prise en charge par les produits de la scène). Lecture seulement.

> **IMPORTANT:**
> Les identifiants utilisés dans les canaux sont les identifiants provenant de l'interface KLF-200. Si vous apportez des modifications à la liste des produits ou à la liste des programmes de votre KLF-200, les ID peuvent changer.

Pour exécuter une scène, vous pouvez définir l'état `run` de la scène sur `true` ou définir l'état `level` du produit sur une valeur. cela correspond à une scène qui définit le produit à ce niveau.

### Exemple

En supposant que la fenêtre de votre salle de bain est le canal `0`. Vous avez une scène sur la chaîne `10` qui ouvre la fenêtre de la salle de bainà 40%.

```javascript
// Variant 1: Open the bathroom window at 40% using the scenes run state:
setState('klf200.0.scenes.10.run', true);
/* 
    The following will happen:
    1. Your window will start to move to 40% opening level.
    2. After your window has stopped, klf200.0.scenes.10.run will be set to 'false' again.
    3. klf200.0.products.0.level will be set to 40%.
*/

// Variant 2: Open the bathroom window at 40% using the products level state:
setState('klf200.0.products.0.level', 40);
/*
    The following will happen:
    1. Your window will start to move to 40% opening level.
    2. klf200.0.scenes.10.run will be set to true.
    3. After your window has stopped, klf200.0.scenes.10.run will be set to 'false' again.
*/

// What happens, if we don't have a scene for that level?
setState('klf200.0.products.0.level', 41);
/*
    The following will happen:
    1. Your window won't move at all!
    2. klf200.0.products.0.level will be reset to the previous value, e.g. 40
*/

```

---

## Limites connues

L'adaptateur contrôle le KLF-200 à l'aide de l'API REST interne utilisée par l'interface Web de la boîte.
Bien que nous n'utilisions qu'un sous-ensemble de l'API, il existe certaines restrictions:

- L'adaptateur ne peut pas lire le niveau d'ouverture actuel d'une fenêtre. Si vous le contrôlez à l'aide de votre télécommande ou si celle-ci est fermée à cause de la pluie, l'adaptateur ne le sait pas et affichera toujours la dernière valeur connue.
- L'interface KLF-200 est limitée à 32 scènes maximum.
- L'adaptateur ne sait pas quand une action est terminée. L'état en cours restera `true` pendant au moins 30 secondes.
- Ne lancez pas de scènes les unes après les autres. Le KLF-200 peut lancer des erreurs. (Vous trouverez les erreurs dans le journal.)

---

VELUX et le logo VELUX sont des marques déposées de VKR Holding A/S.
