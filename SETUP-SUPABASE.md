# Gestion de la flotte via Supabase — Guide d'installation

Ce projet utilise **Supabase** (base de données + stockage des photos) pour gérer
les voitures depuis une page admin (`/admin`) — plus besoin de modifier `src/data.js`.

Tant que les étapes ci-dessous ne sont pas faites, le site fonctionne quand même :
il affiche les 6 voitures de `src/data.js` en secours.

---

## 1. Créer un projet Supabase (gratuit)

1. Aller sur https://supabase.com → **Start your project** → se connecter.
2. **New project** → donner un nom (ex. `yassir-cars`), choisir une région proche
   (Europe/Paris), définir un mot de passe de base de données → **Create**.
3. Attendre ~1 minute que le projet soit prêt.

## 2. Créer les tables + le stockage

1. Dans le projet : menu de gauche → **SQL Editor** → **New query**.
2. Ouvrir le fichier [`supabase/schema.sql`](supabase/schema.sql), copier **tout** son
   contenu, le coller, puis **Run**.
3. (Optionnel mais recommandé) Faire pareil avec [`supabase/seed.sql`](supabase/seed.sql)
   pour importer vos 6 voitures actuelles → la page admin ne sera pas vide.

## 3. Créer votre compte admin

1. Menu de gauche → **Authentication** → **Users** → **Add user** → **Create new user**.
2. Entrer un **email** + **mot de passe** (c'est votre login pour `/admin`).
3. Cochez « Auto Confirm User » si proposé.

## 4. Récupérer les clés et les mettre dans `.env`

1. Menu de gauche → **Project Settings** (roue dentée) → **API**.
2. Copier :
   - **Project URL**  → va dans `VITE_SUPABASE_URL`
   - **anon public** key → va dans `VITE_SUPABASE_ANON_KEY`
3. Ouvrir le fichier `.env` à la racine du projet et coller les valeurs :

   ```
   VITE_SUPABASE_URL=https://xxxxx.supabase.co
   VITE_SUPABASE_ANON_KEY=eyJhbGci...
   ```

   > La clé **anon** est faite pour être côté navigateur — pas de souci de sécurité.
   > Ne jamais utiliser la clé `service_role` ici.

## 5. Lancer

```
npm run dev
```

- Site public : http://localhost:5173/
- Espace admin : http://localhost:5173/admin

Connectez-vous avec l'email/mot de passe de l'étape 3.

---

## Utiliser l'admin

- **Ajouter** : bouton « ➕ Ajouter » → remplir le nom, choisir la catégorie,
  **📷 Choisir une photo** (l'image est envoyée dans Supabase), prix, etc. → Enregistrer.
- **Modifier / Supprimer** : boutons sur chaque voiture.
- **Bloquer des dates** : sur chaque voiture, section « 🚫 Périodes indisponibles » →
  choisir début → fin → « + Bloquer ». La voiture apparaîtra **❌ Non disponible**
  sur la page résultats quand la recherche tombe dans cette période.

La page de recherche (`/resultats`) compare les dates demandées avec les périodes
bloquées : c'est désormais une **vraie** disponibilité (l'ancienne formule fictive a été retirée).

---

## Mise en ligne (production)

Quand vous déployez (Vercel / Netlify), ajoutez les **deux mêmes variables**
`VITE_SUPABASE_URL` et `VITE_SUPABASE_ANON_KEY` dans les variables d'environnement
de l'hébergeur. Pensez aussi à protéger l'accès à `/admin` — il l'est déjà par le
login Supabase, donc seul votre compte peut écrire.
