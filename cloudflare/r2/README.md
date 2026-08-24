# Cloudflare R2 — documente și media

R2 păstrează corpurile binare; D1 păstrează metadata, proprietarul, proiectul și
starea business. Binding-urile și mediile sunt:

| Binding | Producție | Preview | Conținut |
| --- | --- | --- | --- |
| `FILES` | `avyron-files` | `avyron-files-preview` | atașamente/documente private |
| `MEDIA` | `avyron-media` | `avyron-media-preview` | avataruri și media proiecte |

## Prefixe canonice

```text
FILES/leads/<lead-id>/<filename>
MEDIA/projects/<project-id>/<media-id>-<filename>
MEDIA/avatars/<user-id>
```

Workerul construiește cheile și normalizează segmentele; browserul nu poate
alege un path arbitrar. Uploadurile sunt validate și bufferizate o singură dată,
iar dimensiunea reală maximă este 15 MiB pentru fluxurile implementate acum.

## Acces și consistență

- bucket-urile rămân private; nu se activează `r2.dev` sau Custom Domain pentru
  documente și media de cont;
- descărcarea trece prin autentificare și verificarea rolului/proprietarului;
- `ETag`, byte ranges și lungimea răspunsului sunt propagate din obiectul R2;
- dacă insertul metadata D1 eșuează, obiectul R2 nou este șters;
- la delete, obiectul R2 se șterge înaintea metadata D1, evitând linkuri către un
  fișier eliminat doar parțial.

Regulile lifecycle pentru atașamente și documente se stabilesc după politica de
retenție GDPR. Nu se șterg automat documente de producție fără o durată aprobată.
