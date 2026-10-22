# Microfrontends con Module Federation (día 11)

Dos apps Vite + Vue independientes, cada una con su `package.json`:

- `remote/`: el catálogo, que expone `./mfe` (contrato `mount`/`unmount`) en `remoteEntry.js`, puerto 5001.
- `host/`: el shell, que carga el catálogo en runtime y escucha el evento `cart:add`, puerto 5000.

```bash
cd mfe/remote && npm ci && npm run build && npm run preview   # terminal 1
cd mfe/host   && npm ci && npm run build && npm run preview   # terminal 2
# abrir http://localhost:5000
```

Si el remote está apagado, el host igual levanta y muestra "El catálogo no está disponible".
