# Guía rápida: ¿por qué `git status` dice que todo está al día si no he sincronizado?

Si ves un mensaje de "up to date" en local aunque no hayas traído cambios recientes del remoto, suele deberse a que Git solo compara contra la referencia _local_ del remoto (por ejemplo `origin/work`) que tenías guardada la última vez que hiciste `fetch` o `pull`. Hasta que no actualices esa referencia, Git no puede saber que hay commits nuevos en el servidor.

## Pasos para comprobar y sincronizar

1. **Actualizar las referencias remotas sin alterar tu árbol de trabajo**:
   ```bash
   git fetch origin
   ```
   Esto descarga los punteros actualizados del remoto. A partir de aquí, `git status` puede indicarte si tu rama local está por detrás.

2. **Ver si tu rama está desactualizada respecto al remoto**:
   ```bash
   git status -sb
   ```
   o, de forma explícita:
   ```bash
   git log --oneline HEAD..origin/$(git rev-parse --abbrev-ref HEAD)
   ```
   Si aparecen commits listados, significa que el remoto tiene cambios nuevos.

3. **Traer los cambios** (elige el método según tu flujo):
   - Rebase rápido manteniendo historial lineal:
     ```bash
     git pull --rebase origin $(git rev-parse --abbrev-ref HEAD)
     ```
   - Merge (si prefieres conservar merges automáticos):
     ```bash
     git pull origin $(git rev-parse --abbrev-ref HEAD)
     ```

## Otras causas frecuentes

- **Estás en otra rama**: verifica con `git branch --show-current` que trabajas en la rama esperada.
- **Repositorio clonado sin remoto configurado**: comprueba `git remote -v`. Si no aparece `origin`, añade el remoto:
  ```bash
  git remote add origin <url-del-repo>
  git fetch origin
  ```
- **Ramas divergentes**: si ves mensajes de "have diverged", revisa antes de rebase/merge para evitar sobrescribir cambios.

Siguiendo estos pasos podrás detectar y sincronizar los commits faltantes aunque `git status` inicialmente indique que todo está al día.
