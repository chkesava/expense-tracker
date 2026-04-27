---
description: Build and push the application to the main branch
---
This workflow performs a build check before pushing current changes to the main branch.

1. Ensure all changes are staged.
// turbo
2. Run the build script to ensure no errors.
```powershell
npm run build
```

3. Add all changes.
// turbo
```powershell
git add .
```

4. Commit the changes.
// turbo
```powershell
git commit -m "build and deploy: $(get-date -format 'yyyy-MM-dd HH:mm:ss')"
```

5. Push to the main branch.
// turbo
```powershell
git push origin main
```
