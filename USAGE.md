# Guide d'utilisation - Upload de fichiers PDF

Ce guide explique comment utiliser les endpoints PDF de l'API Tools.

## 📤 Méthode 1 : Via Swagger UI (Interface Web)

1. **Accédez à Swagger UI** : Ouvrez `http://localhost:3000/doc` dans votre navigateur

2. **Trouvez l'endpoint** : 
   - Pour **split** : Cherchez `POST /api/pdf/split`
   - Pour **merge** : Cherchez `POST /api/pdf/merge`

3. **Cliquez sur "Try it out"** pour activer l'endpoint

4. **Upload du fichier** :
   - Dans la section "Request body", vous verrez un champ `file` ou `files`
   - Cliquez sur **"Choose File"** ou **"Browse"** (le bouton peut varier selon votre navigateur)
   - Sélectionnez votre fichier PDF

5. **Exécutez** : Cliquez sur le bouton bleu **"Execute"**

6. **Téléchargez le résultat** :
   - Pour **split** : Vous recevrez un fichier ZIP (`pages.zip`)
   - Pour **merge** : Vous recevrez un PDF fusionné (`merged.pdf`)

## 📤 Méthode 2 : Via cURL (Ligne de commande)

### Split PDF (découper un PDF)

```bash
curl -X POST http://localhost:3000/api/pdf/split \
  -F "file=@/chemin/vers/votre/fichier.pdf" \
  --output pages.zip
```

### Merge PDF (fusionner plusieurs PDFs)

```bash
# Un seul fichier
curl -X POST http://localhost:3000/api/pdf/merge \
  -F "files=@/chemin/vers/fichier1.pdf" \
  --output merged.pdf

# Plusieurs fichiers
curl -X POST http://localhost:3000/api/pdf/merge \
  -F "files=@/chemin/vers/fichier1.pdf" \
  -F "files=@/chemin/vers/fichier2.pdf" \
  -F "files=@/chemin/vers/fichier3.pdf" \
  --output merged.pdf
```

## 📤 Méthode 3 : Via JavaScript/TypeScript (fetch)

### Split PDF

```javascript
const formData = new FormData();
formData.append('file', fileInput.files[0]); // fileInput est un <input type="file">

const response = await fetch('http://localhost:3000/api/pdf/split', {
  method: 'POST',
  body: formData,
});

if (response.ok) {
  const blob = await response.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'pages.zip';
  a.click();
} else {
  const error = await response.json();
  console.error('Erreur:', error);
}
```

### Merge PDF

```javascript
const formData = new FormData();
formData.append('files', file1);
formData.append('files', file2);
formData.append('files', file3);

const response = await fetch('http://localhost:3000/api/pdf/merge', {
  method: 'POST',
  body: formData,
});

if (response.ok) {
  const blob = await response.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'merged.pdf';
  a.click();
}
```

## 📤 Méthode 4 : Via n8n (Workflow Automation)

### Node HTTP Request dans n8n

1. **Ajoutez un node "HTTP Request"**

2. **Configurez pour Split PDF** :
   - **Method** : `POST`
   - **URL** : `http://localhost:3000/api/pdf/split`
   - **Authentication** : None (ou selon votre config)
   - **Body Content Type** : `Multipart-Form Data`
   - **Body Parameters** :
     - **Name** : `file`
     - **Value** : Sélectionnez le fichier depuis un node précédent (ex: `{{ $json.binary.data }}`)
     - **Type** : `File`

3. **Configurez pour Merge PDF** :
   - **Method** : `POST`
   - **URL** : `http://localhost:3000/api/pdf/merge`
   - **Body Content Type** : `Multipart-Form Data`
   - **Body Parameters** : Ajoutez plusieurs entrées
     - **Name** : `files` (pour chaque fichier)
     - **Value** : Le fichier PDF
     - **Type** : `File`

4. **Récupérez le résultat** :
   - Le node HTTP Request retournera le fichier binaire
   - Utilisez un node "Write Binary File" ou "Download File" pour sauvegarder

### Exemple de workflow n8n complet

```
[Trigger] → [Read Binary File] → [HTTP Request: Split PDF] → [Write Binary File]
```

## 📤 Méthode 5 : Via Postman

1. **Créez une nouvelle requête POST**
   - URL : `http://localhost:3000/api/pdf/split` ou `/api/pdf/merge`

2. **Onglet "Body"** :
   - Sélectionnez **"form-data"**
   - Ajoutez une clé `file` (ou `files` pour merge)
   - Changez le type de "Text" à **"File"** (menu déroulant à droite)
   - Cliquez sur **"Select Files"** et choisissez votre PDF

3. **Envoyez la requête**

4. **Téléchargez la réponse** : Postman vous permettra de télécharger le fichier retourné

## ⚠️ Notes importantes

- **Taille des fichiers** : Assurez-vous que vos fichiers PDF ne sont pas trop volumineux (limite dépend de votre configuration serveur)
- **Format** : Seuls les fichiers PDF sont acceptés (`.pdf`)
- **Timeout** : Pour de gros fichiers, le traitement peut prendre du temps
- **Erreurs** : En cas d'erreur, l'API retourne un JSON avec un champ `error`

## 🔍 Dépannage

### Erreur "PDF file is required"
- Vérifiez que le champ s'appelle bien `file` (pour split) ou `files` (pour merge)
- Assurez-vous que le fichier est bien attaché à la requête

### Erreur "File must be a PDF"
- Vérifiez que votre fichier a bien l'extension `.pdf`
- Vérifiez que le type MIME est `application/pdf`

### Swagger UI ne montre pas de bouton "Choose File"
- Essayez de rafraîchir la page
- Vérifiez que vous avez cliqué sur "Try it out"
- Certains navigateurs peuvent avoir des limitations avec Swagger UI

### Le fichier ne se télécharge pas
- Vérifiez les logs du serveur pour voir les erreurs
- Assurez-vous que le Content-Type de la réponse est correct (`application/zip` ou `application/pdf`)

